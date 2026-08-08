// Ported from hermetica-forge/base44/functions/runValidation/entry.ts
import { registerFunction } from '../registry.js';

registerFunction('runValidation', async (req, res, base44) => {
  try {
    const user = await base44.auth.me();
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const body = req.body;
    const { project_id, name, description, category, target_audience, revenue_model, problem_statement, solution_summary } = body;

    // 1. Get or create project
    let project: any;
    if (project_id) {
      project = await base44.entities.Project.get(project_id);
    } else {
      project = await base44.entities.Project.create({
        name, description, category: category || 'saas',
        target_audience, revenue_model,
        problem_statement, solution_summary,
        status: 'research',
      });
    }

    // 2. Create in-progress report
    const report: any = await base44.entities.ValidationReport.create({
      project_id: project.id,
      report_type: 'full_validation',
      status: 'in_progress',
      drive_archive_status: 'pending',
    });

    const startTime = Date.now();

    // 3. Run LLM validation with structured SWOT
    const prompt = `You are Hermetica Forge's Apex Validation Engine. Perform a COMPREHENSIVE business validation for:

IDEA: ${project.name}
DESCRIPTION: ${project.description || 'Not provided'}
CATEGORY: ${project.category}
TARGET AUDIENCE: ${project.target_audience || 'Not specified'}
REVENUE MODEL: ${project.revenue_model || 'Not specified'}
PROBLEM: ${project.problem_statement || 'Not specified'}
SOLUTION: ${project.solution_summary || 'Not specified'}

Perform deep analysis including:
1. Market research with TAM/SAM/SOM sizing
2. Competitive landscape (top 5+ competitors with strengths/weaknesses)
3. SWOT analysis (provide 4-6 items per quadrant)
4. Technical feasibility assessment
5. Revenue potential and financial projections
6. Go-to-market strategy recommendations
7. Risk analysis
8. Growth opportunities

Score each dimension 0-100 and provide an overall viability score.
Return JSON with: overall_score, market_score, competition_score, feasibility_score, revenue_score, summary (executive summary 2-3 paragraphs), market_size_tam, market_size_sam, market_size_som, competitors, swot_analysis (formatted text), swot_quadrants (object with strengths/weaknesses/opportunities/threats arrays of strings), recommendations, risks, opportunities, lessons_learned (3-5 key takeaways), reusable_patterns (2-3 patterns applicable to future projects).`;

    // TODO(port): source passed `model: "gemini_3_flash"` to InvokeLLM to pin a specific
    // provider/model. The server-side invokeLLM() compat (src/integrations/llm.ts) always
    // calls Anthropic and has no `model` selection param, so it's kept here (cast through
    // `as any`) for fidelity but has no effect — the compat shim ignores it and always uses
    // ANTHROPIC_MODEL / the default Claude model. add_context_from_internet is accepted by
    // the shim but not implemented (no search provider configured), same as upstream note.
    const llmResult: any = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: true,
      model: 'gemini_3_flash',
      response_json_schema: {
        type: 'object',
        properties: {
          overall_score: { type: 'number' },
          market_score: { type: 'number' },
          competition_score: { type: 'number' },
          feasibility_score: { type: 'number' },
          revenue_score: { type: 'number' },
          summary: { type: 'string' },
          market_size_tam: { type: 'string' },
          market_size_sam: { type: 'string' },
          market_size_som: { type: 'string' },
          competitors: { type: 'string' },
          swot_analysis: { type: 'string' },
          swot_quadrants: {
            type: 'object',
            properties: {
              strengths: { type: 'array', items: { type: 'string' } },
              weaknesses: { type: 'array', items: { type: 'string' } },
              opportunities: { type: 'array', items: { type: 'string' } },
              threats: { type: 'array', items: { type: 'string' } },
            },
          },
          recommendations: { type: 'string' },
          risks: { type: 'string' },
          opportunities: { type: 'string' },
          lessons_learned: { type: 'string' },
          reusable_patterns: { type: 'string' },
        },
      },
    } as any);

    // 4. Update report with all results
    const swotQuadrantsJson = llmResult.swot_quadrants ? JSON.stringify(llmResult.swot_quadrants) : null;
    await base44.entities.ValidationReport.update(report.id, {
      status: 'completed',
      overall_score: llmResult.overall_score,
      market_score: llmResult.market_score,
      competition_score: llmResult.competition_score,
      feasibility_score: llmResult.feasibility_score,
      revenue_score: llmResult.revenue_score,
      summary: llmResult.summary,
      full_report: JSON.stringify(llmResult),
      recommendations: llmResult.recommendations,
      risks: llmResult.risks,
      opportunities: llmResult.opportunities,
      swot_quadrants: swotQuadrantsJson,
    });

    // 5. Update project with scores and market data
    await base44.entities.Project.update(project.id, {
      validation_score: llmResult.overall_score,
      market_size_tam: llmResult.market_size_tam,
      market_size_sam: llmResult.market_size_sam,
      market_size_som: llmResult.market_size_som,
      competitors: llmResult.competitors,
      swot_analysis: llmResult.swot_analysis,
    });

    // 6. Archive to Google Drive
    let driveResult: any = { status: 'skipped' };
    try {
      const { accessToken } = await base44.asServiceRole.connectors.getConnection('googledrive');
      driveResult = await archiveReportToDrive(accessToken, project, report, { ...llmResult, swot_quadrants: swotQuadrantsJson });
      await base44.entities.ValidationReport.update(report.id, {
        drive_file_id: driveResult.fileId,
        drive_file_url: driveResult.fileUrl,
        drive_archive_status: 'archived',
        drive_archived_at: new Date().toISOString(),
        drive_error: null,
      });
    } catch (driveErr: any) {
      driveResult = { status: 'failed', error: driveErr.message };
      await base44.entities.ValidationReport.update(report.id, {
        drive_archive_status: 'failed',
        drive_error: driveErr.message,
      });
    }

    // 7. Capture deduplicated knowledge
    await captureKnowledge(base44, project, report, llmResult);

    // 8. Create task journal
    const elapsed = Date.now() - startTime;
    await base44.entities.AgentTaskJournal.create({
      task_summary: `Full validation for "${project.name}" — overall score ${llmResult.overall_score}/100`,
      agent_name: 'Forge Validation Engine',
      project_id: project.id,
      report_id: report.id,
      sources_used: 'Gemini web search + LLM analysis. Drive archive: ' + driveResult.status,
      assumptions: `Category: ${project.category}. Target audience: ${project.target_audience || 'unspecified'}. Revenue model: ${project.revenue_model || 'unspecified'}.`,
      outputs: llmResult.summary,
      errors: driveResult.status === 'failed' ? driveResult.error : null,
      confidence: Math.min(100, llmResult.overall_score + 10),
      lessons_learned: llmResult.lessons_learned || null,
      reusable_patterns: llmResult.reusable_patterns || null,
      follow_up_actions: llmResult.recommendations,
      status: driveResult.status === 'failed' ? 'partial' : 'success',
      execution_time_ms: elapsed,
      started_at: new Date(startTime).toISOString(),
      completed_at: new Date().toISOString(),
    });

    // 9. Activity log
    await base44.entities.ActivityLog.create({
      action: `Validated "${project.name}" — Score: ${llmResult.overall_score}/100 (Drive: ${driveResult.status})`,
      entity_type: 'ValidationReport',
      entity_id: report.id,
      project_id: project.id,
      actor: 'agent',
    });

    res.json({
      project_id: project.id,
      report_id: report.id,
      ...llmResult,
      drive_archive: driveResult,
    });
    return;
  } catch (error: any) {
    res.status(500).json({ error: error.message });
    return;
  }
});

// --- Helpers (inlined, no local imports) ---

async function archiveReportToDrive(accessToken: string | null, project: any, report: any, data: any) {
  const dateStr = new Date().toISOString().split('T')[0];
  const fileName = `Hermetica Forge - Validation - ${project.name} - ${dateStr}.md`;
  const fileContent = formatReportMarkdown(project, report, data);

  // Check for duplicates
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(`name='${fileName.replace(/'/g, "\\'")}'`)}&fields=files(id,name,webViewLink)&trashed=false`;
  const searchRes = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!searchRes.ok) throw new Error(`Drive search failed: ${searchRes.status}`);
  const searchData: any = await searchRes.json();

  let fileId;
  let fileUrl;

  if (searchData.files && searchData.files.length > 0) {
    // Duplicate found — update existing file content
    fileId = searchData.files[0].id;
    const updateUrl = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`;
    const updateRes = await fetch(updateUrl, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'text/markdown',
      },
      body: fileContent,
    });
    if (!updateRes.ok) throw new Error(`Drive update failed: ${updateRes.status}`);
  } else {
    // Upload new file via multipart
    const boundary = 'hermetica_forge_' + Math.random().toString(36).slice(2);
    const metadata = { name: fileName, mimeType: 'text/markdown' };
    const multipartBody =
      `--${boundary}\r\n` +
      `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
      `${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\n` +
      `Content-Type: text/markdown\r\n\r\n` +
      `${fileContent}\r\n` +
      `--${boundary}--`;

    const uploadRes = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: multipartBody,
      }
    );
    if (!uploadRes.ok) throw new Error(`Drive upload failed: ${uploadRes.status}`);
    const uploadData: any = await uploadRes.json();
    fileId = uploadData.id;
  }

  // Verify file exists and get URL
  const verifyRes = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,webViewLink`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!verifyRes.ok) throw new Error(`Drive verification failed: ${verifyRes.status}`);
  const verified: any = await verifyRes.json();
  fileUrl = verified.webViewLink;

  if (!fileId || !fileUrl) throw new Error('Drive upload succeeded but file ID or URL missing');
  return { fileId, fileUrl, status: 'archived' };
}

function formatReportMarkdown(project: any, report: any, data: any) {
  const swotQuads = typeof data.swot_quadrants === 'string' ? JSON.parse(data.swot_quadrants) : data.swot_quadrants;
  const lines = [
    `# Validation Report: ${project.name}`,
    ``,
    `**Report ID:** ${report.id}`,
    `**Generated:** ${new Date().toISOString()}`,
    `**Project ID:** ${project.id}`,
    ``,
    `## Scores`,
    ``,
    `| Dimension | Score |`,
    `|---|---|`,
    `| Overall | ${data.overall_score ?? 'N/A'}/100 |`,
    `| Market | ${data.market_score ?? 'N/A'}/100 |`,
    `| Competition | ${data.competition_score ?? 'N/A'}/100 |`,
    `| Feasibility | ${data.feasibility_score ?? 'N/A'}/100 |`,
    `| Revenue | ${data.revenue_score ?? 'N/A'}/100 |`,
    ``,
    `## Executive Summary`,
    ``,
    data.summary || 'N/A',
    ``,
    `## Market Sizing`,
    ``,
    `- **TAM:** ${data.market_size_tam || 'N/A'}`,
    `- **SAM:** ${data.market_size_sam || 'N/A'}`,
    `- **SOM:** ${data.market_size_som || 'N/A'}`,
    ``,
    `## Competitors`,
    ``,
    data.competitors || 'N/A',
    ``,
    `## SWOT Analysis`,
    ``,
  ];
  if (swotQuads && swotQuads.strengths) {
    lines.push(`### Strengths`, ...swotQuads.strengths.map((s: any) => `- ${s}`), ``);
    lines.push(`### Weaknesses`, ...swotQuads.weaknesses.map((w: any) => `- ${w}`), ``);
    lines.push(`### Opportunities`, ...swotQuads.opportunities.map((o: any) => `- ${o}`), ``);
    lines.push(`### Threats`, ...swotQuads.threats.map((t: any) => `- ${t}`), ``);
  }
  if (data.swot_analysis) {
    lines.push(`### Raw SWOT Text`, ``, data.swot_analysis, ``);
  }
  lines.push(`## Recommendations`, ``, data.recommendations || 'N/A', ``);
  lines.push(`## Risks`, ``, data.risks || 'N/A', ``);
  lines.push(`## Opportunities`, ``, data.opportunities || 'N/A', ``);
  if (data.lessons_learned) {
    lines.push(`## Lessons Learned`, ``, data.lessons_learned, ``);
  }
  if (data.reusable_patterns) {
    lines.push(`## Reusable Patterns`, ``, data.reusable_patterns, ``);
  }
  lines.push(`---`, `*Generated by Hermetica Forge*`);
  return lines.join('\n');
}

async function captureKnowledge(base44: any, project: any, report: any, llmResult: any) {
  const entries: any[] = [];

  if (llmResult.lessons_learned) {
    entries.push({
      title: `Lessons: ${project.name}`,
      content: llmResult.lessons_learned,
      category: 'lesson_learned',
      tags: 'validation, lessons',
    });
  }
  if (llmResult.reusable_patterns) {
    entries.push({
      title: `Patterns: ${project.name}`,
      content: llmResult.reusable_patterns,
      category: 'pattern',
      tags: 'validation, patterns',
    });
  }
  if (llmResult.summary) {
    entries.push({
      title: `Market Validation: ${project.name}`,
      content: llmResult.summary + '\n\nTAM: ' + (llmResult.market_size_tam || 'N/A') + '\nSAM: ' + (llmResult.market_size_sam || 'N/A') + '\nSOM: ' + (llmResult.market_size_som || 'N/A'),
      category: 'market_data',
      tags: 'validation, market',
    });
  }

  for (const entry of entries) {
    const hash = await simpleHash(entry.title + project.id);
    // Check for existing entry with same dedup_hash
    const existing = await base44.asServiceRole.entities.KnowledgeEntry.filter({ dedup_hash: hash });
    if (existing && existing.length > 0) {
      // Update existing entry instead of creating duplicate
      await base44.entities.KnowledgeEntry.update(existing[0].id, {
        content: entry.content,
        source_report_id: report.id,
        source_project_id: project.id,
        relevance_score: llmResult.overall_score,
      });
    } else {
      await base44.entities.KnowledgeEntry.create({
        ...entry,
        source: 'validation',
        project_id: project.id,
        source_project_id: project.id,
        source_report_id: report.id,
        dedup_hash: hash,
        relevance_score: llmResult.overall_score,
      });
    }
  }
}

async function simpleHash(text: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}
