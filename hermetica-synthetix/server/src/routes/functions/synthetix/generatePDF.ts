// Ported from synthetix-ai/base44/functions/generatePDF/entry.ts
import { registerFunction } from '../registry.js';
// TODO(port): source imported this as `npm:jspdf@4.2.1` (a Deno npm-specifier import).
// The real "jspdf" npm package has an identical API in Node, so this is the direct
// Node-compatible equivalent.
import { jsPDF } from 'jspdf';

registerFunction('generatePDF', async (req, res, base44) => {
  const user = await base44.auth.me();
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const body = req.body || {};
  const { project_id, title, subtitle, author, imprint, manuscript, back_page_content, page_size = 'a4' } = body;

  if (!title) {
    res.status(400).json({ error: 'Missing required field: title' });
    return;
  }
  if (!manuscript || manuscript.length < 20) {
    res.status(400).json({ error: 'Missing required field: manuscript (minimum 20 characters)' });
    return;
  }

  const job = await base44.asServiceRole.entities.RenderJob.create({
    job_name: `PDF: ${title}`,
    job_type: 'pdf_generation',
    status: 'processing',
    project_id,
    provider: 'base44',
    model: 'jspdf',
    request_payload: JSON.stringify({ project_id, title, subtitle, author }),
    started_at: new Date().toISOString(),
    progress_percent: 20
  });

  const GOLD = '#D4AF37';
  const BLACK = '#0B0B0D';
  const PARCHMENT = '#F5E8C7';

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: page_size === 'a4' ? 'a4' : 'letter' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentW = pageW - margin * 2;

  const hexToRgb = (hex: string): [number, number, number] => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];

  // Cover page
  doc.setFillColor(...hexToRgb(BLACK));
  doc.rect(0, 0, pageW, pageH, 'F');
  doc.setDrawColor(...hexToRgb(GOLD));
  doc.setLineWidth(1.5);
  doc.rect(8, 8, pageW - 16, pageH - 16);
  doc.setLineWidth(0.3);
  doc.rect(11, 11, pageW - 22, pageH - 22);

  doc.setFontSize(26);
  doc.setTextColor(...hexToRgb(GOLD));
  const titleLines = doc.splitTextToSize(title.toUpperCase(), contentW - 10);
  doc.text(titleLines, pageW / 2, 60, { align: 'center' });

  if (subtitle) {
    doc.setFontSize(13);
    doc.setTextColor(...hexToRgb(PARCHMENT));
    const subLines = doc.splitTextToSize(subtitle, contentW - 20);
    doc.text(subLines, pageW / 2, 60 + (titleLines.length * 12) + 10, { align: 'center' });
  }

  doc.setDrawColor(...hexToRgb(GOLD));
  doc.setLineWidth(0.5);
  doc.line(margin + 20, pageH / 2, pageW - margin - 20, pageH / 2);
  doc.setFontSize(10);
  doc.setTextColor(...hexToRgb(GOLD));
  doc.text('HERMETICA HOLDINGS', pageW / 2, pageH / 2 + 10, { align: 'center' });

  if (author) {
    doc.setFontSize(12);
    doc.setTextColor(...hexToRgb(PARCHMENT));
    doc.text(`by ${author}`, pageW / 2, pageH - 45, { align: 'center' });
  }
  if (imprint) {
    doc.setFontSize(9);
    doc.setTextColor(...hexToRgb(GOLD));
    doc.text(imprint, pageW / 2, pageH - 30, { align: 'center' });
  }

  // Manuscript pages
  let currentY = margin + 10;
  let isFirstContentPage = true;
  let chapterNum = 0;

  const manuscriptLines = manuscript.split('\n');
  for (let li = 0; li < manuscriptLines.length; li++) {
    const line = manuscriptLines[li];
    if (line.trim().startsWith('#')) {
      doc.addPage();
      doc.setFillColor(...hexToRgb(BLACK));
      doc.rect(0, 0, pageW, pageH, 'F');
      chapterNum++;
      doc.setFillColor(...hexToRgb(GOLD));
      doc.rect(0, 0, pageW, 16, 'F');
      doc.setFontSize(8);
      doc.setTextColor(...hexToRgb(BLACK));
      doc.text(`CHAPTER ${chapterNum}`, margin, 10);
      doc.setFontSize(15);
      doc.setTextColor(...hexToRgb(GOLD));
      const heading = line.replace(/^#+\s*/, '').trim();
      const headingLines = doc.splitTextToSize(heading, contentW);
      doc.text(headingLines, margin, 32);
      currentY = 32 + (headingLines.length * 8) + 14;
      isFirstContentPage = false;
      continue;
    }
    if (!line.trim()) { currentY += 3; continue; }
    if (isFirstContentPage) {
      doc.addPage();
      doc.setFillColor(...hexToRgb(BLACK));
      doc.rect(0, 0, pageW, pageH, 'F');
      currentY = margin + 10;
      isFirstContentPage = false;
    }
    doc.setFontSize(10.5);
    doc.setTextColor(220, 210, 195);
    const wrapped = doc.splitTextToSize(line.trim(), contentW);
    for (const wl of wrapped) {
      if (currentY + 6 > pageH - margin) {
        doc.addPage();
        doc.setFillColor(...hexToRgb(BLACK));
        doc.rect(0, 0, pageW, pageH, 'F');
        currentY = margin + 10;
        doc.setFontSize(8);
        doc.setTextColor(...hexToRgb(GOLD));
        doc.text(`${doc.getNumberOfPages()}`, pageW / 2, pageH - 10, { align: 'center' });
      }
      doc.text(wl, margin, currentY);
      currentY += 6;
    }
    currentY += 2;
  }

  // Back page
  doc.addPage();
  doc.setFillColor(...hexToRgb(BLACK));
  doc.rect(0, 0, pageW, pageH, 'F');
  doc.setDrawColor(...hexToRgb(GOLD));
  doc.setLineWidth(1.5);
  doc.rect(8, 8, pageW - 16, pageH - 16);
  doc.setFontSize(14);
  doc.setTextColor(...hexToRgb(GOLD));
  doc.text('HERMETICA HOLDINGS', pageW / 2, 40, { align: 'center' });
  if (back_page_content) {
    doc.setFontSize(10);
    doc.setTextColor(...hexToRgb(PARCHMENT));
    const backLines = doc.splitTextToSize(back_page_content, contentW - 10);
    doc.text(backLines, pageW / 2, 70, { align: 'center' });
  }
  doc.setFontSize(8);
  doc.setTextColor(...hexToRgb(GOLD));
  doc.text(`© ${new Date().getFullYear()} ${author || 'James Hatcher'} / Hermetica Holdings. All rights reserved.`, pageW / 2, pageH - 25, { align: 'center' });

  const pdfArrayBuffer = doc.output('arraybuffer');
  const pdfBytes = new Uint8Array(pdfArrayBuffer);
  const pageCount = doc.getNumberOfPages();

  // Try to upload
  let fileUrl: string | null = null;
  try {
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const uploadResult = await base44.asServiceRole.integrations.Core.UploadFile({ file: blob });
    fileUrl = uploadResult?.file_url || null;
  } catch (uploadErr) {
    // Will return direct download
  }

  const asset = await base44.asServiceRole.entities.GeneratedAsset.create({
    name: title,
    asset_type: 'pdf',
    status: fileUrl ? 'ready' : 'mock_placeholder',
    project_id,
    prompt: `PDF: ${title}`,
    provider: 'base44',
    model: 'jspdf',
    file_url: fileUrl,
    format: 'PDF',
    render_metadata: JSON.stringify({ page_count: pageCount, size_bytes: pdfBytes.length, page_size }),
    failure_reason: fileUrl ? null : 'File upload failed. PDF rendered correctly but not stored. Use direct download.'
  });

  await base44.asServiceRole.entities.RenderJob.update(job.id, {
    status: 'completed',
    generated_asset_id: asset.id,
    completed_at: new Date().toISOString(),
    progress_percent: 100,
    response_payload: JSON.stringify({ asset_id: asset.id, page_count: pageCount, file_url: fileUrl })
  });

  if (fileUrl) {
    res.json({ success: true, render_job_id: job.id, asset_id: asset.id, file_url: fileUrl, page_count: pageCount, size_bytes: pdfBytes.length, downloadable: true });
    return;
  }

  res
    .status(200)
    .set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${title.replace(/\s+/g, '_')}.pdf"`,
      'X-Render-Job-Id': job.id,
      'X-Asset-Id': asset.id,
      'X-Page-Count': String(pageCount)
    })
    .send(Buffer.from(pdfBytes));
  return;
});
