import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Cloud, CloudOff, RefreshCw, ExternalLink, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
const retryDriveArchive = (payload) => base44.functions.invoke("retryDriveArchive", payload);
const checkDriveStatus = (payload) => base44.functions.invoke("checkDriveStatus", payload);

export default function DriveStatusBanner() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(null);
  const { toast } = useToast();

  const load = async () => {
    try {
      const res = await checkDriveStatus({});
      setStatus(res.data);
    } catch {
      setStatus({ connected: false, error: "Unable to check Drive status" });
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleRetry = async (reportId) => {
    setRetrying(reportId);
    try {
      const res = await retryDriveArchive({ report_id: reportId });
      toast({
        title: res.data.drive_archive?.status === "archived" ? "Archive successful" : "Archive failed",
        description: res.data.drive_archive?.fileUrl || res.data.drive_archive?.error,
      });
      load();
    } catch (err) {
      toast({ title: "Retry failed", description: err.message, variant: "destructive" });
    }
    setRetrying(null);
  };

  const handleRetryAll = async () => {
    if (!status?.pending_report_ids?.length) return;
    for (const rid of status.pending_report_ids) {
      await handleRetry(rid);
    }
  };

  if (loading) return null;

  const isConnected = status?.connected;
  const pendingCount = status?.pending_archive_count || 0;

  if (isConnected && pendingCount === 0) {
    return (
      <div className="glass-card rounded-xl p-4 flex items-center gap-3 mb-6 border-emerald-500/20">
        <Cloud className="w-5 h-5 text-emerald-400 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-foreground">Google Drive Connected</p>
          <p className="text-xs text-muted-foreground">All validation reports archived successfully.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`glass-card rounded-xl p-4 mb-6 ${isConnected ? "border-amber-500/20" : "border-red-500/20"}`}>
      <div className="flex items-start gap-3">
        {isConnected ? (
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        ) : (
          <CloudOff className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
        )}
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">
            {isConnected ? "Drive connected — pending archives" : "Google Drive not connected"}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isConnected
              ? `${pendingCount} report(s) need archiving. Click retry to archive them now.`
              : "Validation reports cannot be archived to Drive. Contact your admin to connect Google Drive in Settings → Integrations."}
          </p>
          {status?.error && !isConnected && (
            <p className="text-[10px] text-red-400/70 mt-1 font-mono">{status.error}</p>
          )}
          {isConnected && pendingCount > 0 && (
            <Button
              size="sm"
              variant="outline"
              className="mt-3 gap-2 text-xs"
              onClick={handleRetryAll}
              disabled={retrying !== null}
            >
              <RefreshCw className={`w-3 h-3 ${retrying ? "animate-spin" : ""}`} />
              Retry All ({pendingCount})
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}