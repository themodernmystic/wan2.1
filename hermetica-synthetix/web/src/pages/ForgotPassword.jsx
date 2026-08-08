import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Zap, Mail, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await base44.auth.resetPasswordRequest(email);
    setSent(true);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-amber-400 flex items-center justify-center mx-auto mb-4">
            <Zap className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Reset Password</h1>
          <p className="text-sm text-muted-foreground mt-1">We'll send you a reset link</p>
        </div>

        <div className="glass-card rounded-xl p-6">
          {sent ? (
            <div className="text-center space-y-3">
              <p className="text-sm text-foreground">If an account exists with that email, you'll receive a reset link shortly.</p>
              <Link to="/login" className="text-sm text-primary hover:underline flex items-center justify-center gap-1">
                <ArrowLeft className="w-3 h-3" /> Back to login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">Email</Label>
                <div className="relative mt-1">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" className="pl-9 bg-secondary/50 border-border/50" required />
                </div>
              </div>
              <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white">
                {loading ? "Sending..." : "Send Reset Link"}
              </Button>
              <Link to="/login" className="text-xs text-primary hover:underline flex items-center justify-center gap-1">
                <ArrowLeft className="w-3 h-3" /> Back to login
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}