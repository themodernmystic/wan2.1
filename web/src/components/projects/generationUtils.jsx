import { base44 } from '@/api/base44Client';

export async function runGeneration(project, type) {
  if (type === 'ebook') {
    await generateEbook(project);
  } else if (type === 'landing_site') {
    await generateLandingSite(project);
  } else {
    // Generic content
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Write comprehensive content for a project called "${project.name}". Description: "${project.description}". Write 3-4 detailed paragraphs.`,
    });
    await base44.entities.ContentPiece.create({
      title: project.name,
      content_type: 'article',
      body: (typeof result === 'string' ? result : JSON.stringify(result)).slice(0, 4000),
      prompt: (project.description || project.name).slice(0, 500),
      status: 'draft',
      project_id: project.id,
    });
    await base44.entities.Project.update(project.id, { progress: 50, status: 'active' });
  }
}

export async function generateLandingSite(project) {
  const heroResult = await base44.integrations.Core.InvokeLLM({
    prompt: `Create a compelling landing page hero section for: "${project.description || project.name}". 
    Return JSON with: headline (max 10 words), subheadline (max 25 words), cta_text (3-5 words), hero_body (2 paragraphs).`,
    response_json_schema: {
      type: 'object',
      properties: {
        headline: { type: 'string' },
        subheadline: { type: 'string' },
        cta_text: { type: 'string' },
        hero_body: { type: 'string' },
      },
    },
  });

  const featuresResult = await base44.integrations.Core.InvokeLLM({
    prompt: `Write a features & benefits section for a landing page about: "${project.description || project.name}".
    Return JSON with: features (array of 4 objects, each with title and description).`,
    response_json_schema: {
      type: 'object',
      properties: {
        features: {
          type: 'array',
          items: { type: 'object', properties: { title: { type: 'string' }, description: { type: 'string' } } },
        },
      },
    },
  });

  const seoResult = await base44.integrations.Core.InvokeLLM({
    prompt: `Write SEO-optimised content for a landing page about: "${project.description || project.name}".
    Return JSON with: meta_title (max 60 chars), meta_description (max 155 chars), faq (array of 3 objects with question and answer).`,
    response_json_schema: {
      type: 'object',
      properties: {
        meta_title: { type: 'string' },
        meta_description: { type: 'string' },
        faq: { type: 'array', items: { type: 'object', properties: { question: { type: 'string' }, answer: { type: 'string' } } } },
      },
    },
  });

  const heroImageResult = await base44.integrations.Core.GenerateImage({
    prompt: `Professional hero image for a landing page: ${project.description || project.name}. Clean, modern, high-quality digital illustration style with vibrant colours.`,
  });

  const featuresList = (featuresResult.features || []).map(f => `### ${f.title}\n${f.description}`).join('\n\n');
  const faqList = (seoResult.faq || []).map(f => `**Q: ${f.question}**\nA: ${f.answer}`).join('\n\n');

  const landingPageBody = `# ${heroResult.headline}\n\n${heroResult.subheadline}\n\n${heroResult.hero_body}\n\n---\n\n## Features & Benefits\n\n${featuresList}\n\n---\n\n## Frequently Asked Questions\n\n${faqList}\n\n---\n\n*CTA: ${heroResult.cta_text}*`;

  await Promise.all([
    base44.entities.ContentPiece.create({
      title: `${project.name} — Landing Page`,
      content_type: 'landing_page',
      body: landingPageBody.slice(0, 4000),
      prompt: (project.description || project.name).slice(0, 500),
      meta_title: (seoResult.meta_title || '').slice(0, 60),
      meta_description: (seoResult.meta_description || '').slice(0, 155),
      status: 'approved',
      project_id: project.id,
      seo_score: 80,
    }),
    base44.entities.MediaAsset.create({
      name: `${project.name} — Hero Image`,
      media_type: 'image',
      file_url: heroImageResult.url,
      prompt: (project.description || project.name).slice(0, 500),
      alt_text: `Hero image for ${project.name}`.slice(0, 125),
      project_id: project.id,
      status: 'ready',
    }),
  ]);

  await base44.entities.Project.update(project.id, { progress: 100, status: 'completed' });
}

export async function generateEbook(project) {
  const outlineResult = await base44.integrations.Core.InvokeLLM({
    prompt: `Create a detailed e-book outline for: "${project.description || project.name}".
    Return JSON with: title, subtitle, introduction (2 paragraphs), chapters (array of 3 objects, each with chapter_title and summary).`,
    response_json_schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        subtitle: { type: 'string' },
        introduction: { type: 'string' },
        chapters: {
          type: 'array',
          items: { type: 'object', properties: { chapter_title: { type: 'string' }, summary: { type: 'string' } } },
        },
      },
    },
  });

  const chapters = outlineResult.chapters || [];

  const [ch1, ch2, ch3] = await Promise.all([
    base44.integrations.Core.InvokeLLM({ prompt: `Write a full chapter for an e-book. Chapter: "${chapters[0]?.chapter_title}". Topic: "${project.description || project.name}". Write 4-5 rich paragraphs.` }),
    base44.integrations.Core.InvokeLLM({ prompt: `Write a full chapter for an e-book. Chapter: "${chapters[1]?.chapter_title}". Topic: "${project.description || project.name}". Write 4-5 rich paragraphs.` }),
    base44.integrations.Core.InvokeLLM({ prompt: `Write a full chapter for an e-book. Chapter: "${chapters[2]?.chapter_title}". Topic: "${project.description || project.name}". Write 4-5 rich paragraphs.` }),
  ]);

  const coverImage = await base44.integrations.Core.GenerateImage({
    prompt: `Professional illustrated e-book cover for "${outlineResult.title || project.name}". ${project.description}. Vibrant digital illustration, bold typography style.`,
  });

  const str = (v) => (typeof v === 'string' ? v : JSON.stringify(v));
  const ebookBody = `# ${outlineResult.title || project.name}\n### ${outlineResult.subtitle || ''}\n\n---\n\n## Introduction\n\n${outlineResult.introduction || ''}\n\n---\n\n## Chapter 1: ${chapters[0]?.chapter_title || ''}\n\n${str(ch1)}\n\n---\n\n## Chapter 2: ${chapters[1]?.chapter_title || ''}\n\n${str(ch2)}\n\n---\n\n## Chapter 3: ${chapters[2]?.chapter_title || ''}\n\n${str(ch3)}`;

  await Promise.all([
    base44.entities.ContentPiece.create({
      title: outlineResult.title || project.name,
      content_type: 'article',
      body: ebookBody.slice(0, 4000),
      prompt: (project.description || project.name).slice(0, 500),
      status: 'approved',
      project_id: project.id,
      word_count: ebookBody.split(' ').length,
    }),
    base44.entities.MediaAsset.create({
      name: `${project.name} — Cover Illustration`,
      media_type: 'illustration',
      file_url: coverImage.url,
      prompt: (project.description || project.name).slice(0, 500),
      alt_text: `Cover illustration for ${project.name}`.slice(0, 125),
      project_id: project.id,
      status: 'ready',
      brand_applied: true,
    }),
  ]);

  await base44.entities.Project.update(project.id, { progress: 100, status: 'completed' });
}