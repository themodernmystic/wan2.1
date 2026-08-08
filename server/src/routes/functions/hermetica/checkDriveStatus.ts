// Ported from hermetica-forge/base44/functions/checkDriveStatus/entry.ts
import { registerFunction } from '../registry.js';

registerFunction('checkDriveStatus', async (req, res, base44) => {
  const user = await base44.auth.me();
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  let connected = false;
  let error: string | null = null;

  try {
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googledrive');
    if (accessToken) {
      const testRes = await fetch('https://www.googleapis.com/drive/v3/files?pageSize=1&fields=files(id,name)', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (testRes.ok) {
        connected = true;
      } else {
        error = `Drive API returned ${testRes.status}`;
      }
    }
  } catch (e: any) {
    error = e.message;
  }

  const pendingReports = await base44.asServiceRole.entities.ValidationReport.filter({ status: 'completed' });
  const needArchive = pendingReports.filter((r: any) => r.drive_archive_status !== 'archived');

  res.json({
    connected,
    error,
    pending_archive_count: needArchive.length,
    pending_report_ids: needArchive.map((r: any) => r.id),
  });
});
