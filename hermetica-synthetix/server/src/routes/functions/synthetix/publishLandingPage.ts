// Ported from synthetix-ai/base44/functions/publishLandingPage/entry.ts
import { registerFunction } from '../registry.js';

registerFunction('publishLandingPage', async (req, res, base44) => {
  const user = await base44.auth.me();
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { landing_page_id, action = 'publish' } = req.body || {};
  if (!landing_page_id) {
    res.status(400).json({ error: 'Missing landing_page_id' });
    return;
  }

  const pages = await base44.asServiceRole.entities.LandingPage.filter({ id: landing_page_id });
  const page: any = pages[0];
  if (!page) {
    res.status(404).json({ error: 'LandingPage not found' });
    return;
  }

  if (action === 'unpublish') {
    await base44.asServiceRole.entities.LandingPage.update(landing_page_id, { status: 'draft', published_url: '' });
    res.json({ success: true, landing_page_id, status: 'draft', message: 'Page unpublished.' });
    return;
  }

  if (!page.generated_html) {
    res.status(422).json({
      success: false,
      error: 'Cannot publish: no generated_html found. Run generateLandingPage first.',
      landing_page_id,
      current_status: page.status
    });
    return;
  }

  // Build full standalone HTML document
  const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${page.seo_title || page.title}</title>
  <meta name="description" content="${page.seo_description || ''}">
  <meta property="og:title" content="${page.seo_title || page.title}">
  <meta property="og:description" content="${page.seo_description || ''}">
  ${page.social_image_url ? `<meta property="og:image" content="${page.social_image_url}">` : ''}
  ${page.generated_css ? `<style>${page.generated_css}</style>` : ''}
</head>
<body>
${page.generated_html}
${page.generated_js ? `<script>${page.generated_js}<\/script>` : ''}
</body>
</html>`;

  // Upload HTML as a file
  let publishedUrl: string | null = null;
  let uploadError: string | null = null;
  try {
    const blob = new Blob([fullHtml], { type: 'text/html' });
    const uploadResult = await base44.asServiceRole.integrations.Core.UploadFile({ file: blob });
    publishedUrl = uploadResult?.file_url || null;
  } catch (e: any) {
    uploadError = e.message;
  }

  if (!publishedUrl) {
    // Mark as preview_ready with a data URL fallback note
    await base44.asServiceRole.entities.LandingPage.update(landing_page_id, {
      status: 'preview_ready',
      last_publish_result: `Upload failed: ${uploadError}. HTML is ready but not publicly hosted. Export HTML manually.`,
      failure_reason: uploadError
    });
    res.status(422).json({
      success: false,
      landing_page_id,
      error: `File upload failed: ${uploadError}`,
      html_ready: true,
      html_length: fullHtml.length,
      note: 'HTML is generated and stored. Use Export HTML to download and host manually.',
      status: 'preview_ready'
    });
    return;
  }

  await base44.asServiceRole.entities.LandingPage.update(landing_page_id, {
    status: 'published',
    published_url: publishedUrl,
    last_publish_result: `Published at ${new Date().toISOString()}`,
    failure_reason: ''
  });

  res.json({
    success: true,
    landing_page_id,
    published_url: publishedUrl,
    status: 'published',
    html_length: fullHtml.length
  });
});
