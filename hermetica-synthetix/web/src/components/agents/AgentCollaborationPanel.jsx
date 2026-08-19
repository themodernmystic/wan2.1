import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
const agentCollaboration = (payload) => base44.functions.invoke("agentCollaboration", payload);
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, UserCheck, ArrowRightLeft, Lightbulb, Send, AlertCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { motion } from "framer-motion";

const messageTypeConfig = {
  message: { icon: MessageSquare, color: "text-blue-400", bg: "bg-blue-500/10", label: "Message" },
  help_request: { icon: AlertCircle, color: "text-amber-400", bg: "bg-amber-500/10", label: "Help Request" },
  handoff: { icon: ArrowRightLeft, color: "text-purple-400", bg: "bg-purple-500/10", label: "Handoff" },
  finding: { icon: Lightbulb, color: "text-emerald-400", bg: "bg-emerald-500/10", label: "Finding" },
  status_update: { icon: UserCheck, color: "text-muted-foreground", bg: "bg-secondary", label: "Status" },
  task_claim: { icon: UserCheck, color: "text-blue-400", bg: "bg-blue-500/10", label: "Task Claim" },
};

export default function AgentCollaborationPanel({ projectId }) {
  const [agents, setAgents] = useState([]);
  const [messages, setMessages] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [actionType, setActionType] = useState("send_message");
  const [form, setForm] = useState({ from_agent_id: "", to_agent_id: "", task_id: "", content: "", title: "" });
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const loadData = useCallback(async () => {
    const [a, m, t] = await Promise.all([
      base44.entities.ForgeAgent.list("-created_date", 50),
      base44.entities.AgentMessage.list("-created_date", 30),
      base44.entities.ProjectTask.list("-created_date", 50),
    ]);
    setAgents(a);
    setMessages(projectId ? m.filter(msg => msg.project_id === projectId) : m);
    setTasks(projectId ? t.filter(tk => tk.project_id === projectId) : t);
    setLoading(false);
  }, [projectId]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSubmit = async () => {
    if (!form.from_agent_id || !form.content) return;
    setSubmitting(true);
    try {
      if (actionType === "claim_task") {
        const res = await agentCollaboration({ action: "claim_task", agent_id: form.from_agent_id, task_id: form.task_id });
        if (res.data.already_claimed) {
          toast({ title: "Task already claimed", description: `Current owner: ${res.data.current_owner}`, variant: "destructive" });
        } else {
          toast({ title: "Task claimed", description: `${res.data.agent_name} claimed "${res.data.task_title}"` });
        }
      } else if (actionType === "share_finding") {
        await agentCollaboration({
          action: "share_finding",
          from_agent_id: form.from_agent_id,
          project_id: projectId,
          title: form.title || "Shared Finding",
          content: form.content,
        });
        toast({ title: "Finding shared", description: "Knowledge entry created and broadcast to project agents" });
      } else {
        const collaborationAction = actionType === "request_help" ? "request_help" : actionType === "handoff" ? "handoff" : "send_message";
        await agentCollaboration({
          action: collaborationAction,
          from_agent_id: form.from_agent_id,
          to_agent_id: form.to_agent_id || undefined,
          project_id: projectId,
          task_id: form.task_id || undefined,
          content: form.content,
          message_type: collaborationAction === "send_message" ? "message" : collaborationAction,
        });
        toast({ title: "Message sent" });
      }
      setShowDialog(false);
      setForm({ from_agent_id: "", to_agent_id: "", task_id: "", content: "", title: "" });
      loadData();
    } catch (err) {
      toast({ title: "Action failed", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const openDialog = (type) => {
    setActionType(type);
    setForm({ from_agent_id: "", to_agent_id: "", task_id: "", content: "", title: "" });
    setShowDialog(true);
  };

  const availableTasks = tasks.filter(t => !t.assigned_agent || t.assigned_agent.trim() === "");

  if (loading) {
    return <div className="flex items-center justify-center h-32"><div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => openDialog("claim_task")} className="gap-1.5" disabled={availableTasks.length === 0}>
          <UserCheck className="w-3.5 h-3.5" /> Claim Task
        </Button>
        <Button variant="outline" size="sm" onClick={() => openDialog("request_help")} className="gap-1.5">
          <AlertCircle className="w-3.5 h-3.5" /> Request Help
        </Button>
        <Button variant="outline" size="sm" onClick={() => openDialog("handoff")} className="gap-1.5">
          <ArrowRightLeft className="w-3.5 h-3.5" /> Hand Off
        </Button>
        <Button variant="outline" size="sm" onClick={() => openDialog("share_finding")} className="gap-1.5">
          <Lightbulb className="w-3.5 h-3.5" /> Share Finding
        </Button>
        <Button variant="outline" size="sm" onClick={() => openDialog("send_message")} className="gap-1.5">
          <Send className="w-3.5 h-3.5" /> Send Message
        </Button>
      </div>

      {/* Message feed */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
            No agent messages yet. Start a collaboration above.
          </div>
        ) : (
          messages.map((msg, i) => {
            const config = messageTypeConfig[msg.message_type] || messageTypeConfig.message;
            const Icon = config.icon;
            return (
              <motion.div key={msg.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                className={`glass-card rounded-lg p-3 ${config.bg}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={`w-3.5 h-3.5 ${config.color}`} />
                  <span className="text-xs font-medium text-foreground">{msg.from_agent_name}</span>
                  {msg.to_agent_name && (
                    <>
                      <span className="text-[10px] text-muted-foreground">→</span>
                      <span className="text-xs font-medium text-foreground">{msg.to_agent_name}</span>
                    </>
                  )}
                  <Badge variant="outline" className="text-[9px] py-0 px-1.5 ml-auto">{config.label}</Badge>
                  {msg.requires_response && (
                    <Badge className="text-[9px] py-0 px-1.5 bg-amber-500/20 text-amber-400 border-amber-500/30">Needs Response</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{msg.content}</p>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Collaboration Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-card border-border/50 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground capitalize">
              {actionType.replace(/_/g, " ")}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {actionType === "claim_task" && "Select an agent and an available task to claim."}
              {actionType === "request_help" && "Request help from another agent on a task."}
              {actionType === "handoff" && "Hand off a task to another agent."}
              {actionType === "share_finding" && "Share a finding that will be saved to the knowledge base and broadcast."}
              {actionType === "send_message" && "Send a message to another agent or the project channel."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">From Agent</Label>
              <Select value={form.from_agent_id} onValueChange={(v) => setForm({ ...form, from_agent_id: v })}>
                <SelectTrigger className="mt-1 bg-secondary/50 border-border/50"><SelectValue placeholder="Select agent" /></SelectTrigger>
                <SelectContent>
                  {agents.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {(actionType === "request_help" || actionType === "handoff" || actionType === "send_message") && (
              <div>
                <Label className="text-xs text-muted-foreground">To Agent {actionType === "send_message" && "(optional — blank = broadcast)"}</Label>
                <Select value={form.to_agent_id} onValueChange={(v) => setForm({ ...form, to_agent_id: v })}>
                  <SelectTrigger className="mt-1 bg-secondary/50 border-border/50"><SelectValue placeholder="Select agent" /></SelectTrigger>
                  <SelectContent>
                    {agents.filter(a => a.id !== form.from_agent_id).map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {(actionType === "claim_task" || actionType === "handoff") && (
              <div>
                <Label className="text-xs text-muted-foreground">{actionType === "claim_task" ? "Available Tasks" : "Task to Hand Off"}</Label>
                <Select value={form.task_id} onValueChange={(v) => setForm({ ...form, task_id: v })}>
                  <SelectTrigger className="mt-1 bg-secondary/50 border-border/50"><SelectValue placeholder="Select task" /></SelectTrigger>
                  <SelectContent>
                    {(actionType === "claim_task" ? availableTasks : tasks.filter(t => t.assigned_agent === agents.find(a => a.id === form.from_agent_id)?.name)).map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {actionType === "share_finding" && (
              <div>
                <Label className="text-xs text-muted-foreground">Finding Title</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Short title" className="mt-1 bg-secondary/50 border-border/50" />
              </div>
            )}

            <div>
              <Label className="text-xs text-muted-foreground">{actionType === "share_finding" ? "Finding Content" : "Message"}</Label>
              <Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder={actionType === "share_finding" ? "Describe the finding..." : actionType === "handoff" ? "Handoff context and notes..." : "Type your message..."}
                className="mt-1 bg-secondary/50 border-border/50 min-h-20" />
            </div>

            <Button onClick={handleSubmit} disabled={submitting || !form.from_agent_id || !form.content || (actionType === "claim_task" && !form.task_id) || (actionType === "handoff" && !form.task_id)}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white">
              {submitting ? "Sending..." : "Send"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}