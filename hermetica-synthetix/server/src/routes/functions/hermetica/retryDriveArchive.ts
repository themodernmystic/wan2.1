// Ported from hermetica-forge/base44/functions/retryDriveArchive/entry.ts
import { registerFunction } from '../registry.js';

registerFunction('retryDriveArchive', async (req, res, base44) => {
  try {
    const user: any = await base44.auth.me();
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    if (user.role !== 'admin') {
      res.status(403).json({ error: 'Forbidden — admin only' });
      return;
    }

    const body = req.body;
    const { report_id } = body;
    if (!report_id) {
      res.status(400).json({ error: 'report_id required' });
      return;
    }

    const report: any = await base44.entities.ValidationReport.get(report_id);
    if (!report) {
      res.status(404).json({ error: 'Report not found' });
      return;
    }

    const project: any = await base44.entities.Project.get(report.project_id);
    const data: any = report.full_report ? JSON.parse(report.full_report) : {};

    let driveResult: any;
    try {
      const { accessToken } = await base44.asServiceRole.connectors.getConnection('googledrive');
      driveResult = await archiveReportToDrive(accessToken, project, report, data);
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

    await base44.entities.ActivityLog.create({
      action: `Drive archive retried for report ${report.id} — ${driveResult.status}`,
      entity_type: 'ValidationReport',
      entity_id: report.id,
      project_id: report.project_id,
      actor: 'user',
    });

    res.json({ report_id: report.id, drive_archive: driveResult });
    return;
  } catch (error: any) {
    res.status(500).json({ error: error.message });
    return;
  }
});

async function archiveReportToDrive(accessToken: string | null, project: any, report: any, data: any) {
  const dateStr = new Date().toISOString().split('T')[0];
  const fileName = `Hermetica Forge - Validation - ${project.name} - ${dateStr}.md`;
  const fileContent = formatReportMarkdown(project, report, data);

  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(`name='${fileName.replace(/'/g, "\\'")}'`)}&fields=files(id,name,webViewLink)&trashed=false`;
  const searchRes = await fetch(searchUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!searchRes.ok) throw new Error(`Drive search failed: ${searchRes.status}`);
  const searchData: any = await searchRes.json();

  let fileId;
  let fileUrl;

  if (searchData.files && searchData.files.length > 0) {
    fileId = searchData.files[0].id;
    const updateRes = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'text/markdown' },
      body: fileContent,
    });
    if (!updateRes.ok) throw new Error(`Drive update failed: ${updateRes.status}`);
  } else {
    const boundary = 'hermetica_forge_' + Math.random().toString(36).slice(2);
    const metadata = { name: fileName, mimeType: 'text/markdown' };
    const multipartBody =
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\nContent-Type: text/markdown\r\n\r\n${fileContent}\r\n--${boundary}--`;

    const uploadRes = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink',
      { method: 'POST', headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': `multipart/related; boundary=${boundary}` }, body: multipartBody }
    );
    if (!uploadRes.ok) throw new Error(`Drive upload failed: ${uploadRes.status}`);
    const uploadData: any = await uploadRes.json();
    fileId = uploadData.id;
  }

  const verifyRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,webViewLink`, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!verifyRes.ok) throw new Error(`Drive verification failed: ${verifyRes.status}`);
  const verified: any = await verifyRes.json();
  fileUrl = verified.webViewLink;
  if (!fileId || !fileUrl) throw new Error('Drive upload succeeded but file ID or URL missing');
  return { fileId, fileUrl, status: 'archived' };
}

function formatReportMarkdown(project: any, report: any, data: any) {
  const swotQuads = typeof data.swot_quadrants === 'string' ? JSON.parse(data.swot_quadrants) : data.swot_quadrants;
  const lines = [
    `# Validation Report: ${project.name}`, ``,
    `**Report ID:** ${report.id}`,
    `**Generated:** ${new Date().toISOString()}`,
    `**Project ID:** ${project.id}`, ``,
    `## Scores`, ``, `| Dimension | Score |`, `|---|---|`,
    `| Overall | ${data.overall_score ?? 'N/A'}/100 |`,
    `| Market | ${data.market_score ?? 'N/A'}/100 |`,
    `| Competition | ${data.competition_score ?? 'N/A'}/100 |`,
    `| Feasibility | ${data.feasibility_score ?? 'N/A'}/100 |`,
    `| Revenue | ${data.revenue_score ?? 'N/A'}/100 |`, ``,
    `## Executive Summary`, ``, data.summary || 'N/A', ``,
    `## Market Sizing`, ``,
    `- **TAM:** ${data.market_size_tam || 'N/A'}`,
    `- **SAM:** ${data.market_size_sam || 'N/A'}`,
    `- **SOM:** ${data.market_size_som || 'N/A'}`, ``,
    `## Competitors`, ``, data.competitors || 'N/A', ``,
    `## SWOT Analysis`, ``,
  ];
  if (swotQuads && swotQuads.strengths) {
    lines.push(`### Strengths`, ...swotQuads.strengths.map((s: any) => `- ${s}`), ``);
    lines.push(`### Weaknesses`, ...swotQuads.weaknesses.map((w: any) => `- ${w}`), ``);
    lines.push(`### Opportunities`, ...swotQuads.opportunities.map((o: any) => `- ${o}`), ``);
    lines.push(`### Threats`, ...swotQuads.threats.map((t: any) => `- ${t}`), ``);
  }
  if (data.swot_analysis) { lines.push(`### Raw SWOT Text`, ``, data.swot_analysis, ``); }
  lines.push(`## Recommendations`, ``, data.recommendations || 'N/A', ``);
  lines.push(`## Risks`, ``, data.risks || 'N/A', ``);
  lines.push(`## Opportunities`, ``, data.opportunities || 'N/A', ``);
  if (data.lessons_learned) { lines.push(`## Lessons Learned`, ``, data.lessons_learned, ``); }
  if (data.reusable_patterns) { lines.push(`## Reusable Patterns`, ``, data.reusable_patterns, ``); }
  lines.push(`---`, `*Generated by Hermetica Forge*`);
  return lines.join('\n');
}
