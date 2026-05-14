import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheckIcon } from "lucide-react";
import logo from "@assets/brand/Constancia-Logo-ML-Transparent.png";

export default function AdminSecurityMfaVerify() {
  const [_location, setLocation] = useLocation();
  const [token, setToken] = useState("");
  const [backupCode, setBackupCode] = useState("");
  const [useBackup, setUseBackup] = useState(false);
  const { toast } = useToast();

  const verifyMfaMutation = useMutation({
    mutationFn: async () => {
      if (!token) throw new Error("Enter TOTP token");
      const csrfToken = await (await import("@/lib/queryClient")).getCsrfToken();
      const res = await fetch("/api/admin/mfa/verify-login", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(csrfToken ? { "x-csrf-token": csrfToken } : {}) },
        body: JSON.stringify({ token }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Invalid TOTP token");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "MFA verified" });
      setLocation("/admin/dashboard" as any);
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const verifyBackupCodeMutation = useMutation({
    mutationFn: async () => {
      if (!backupCode) throw new Error("Enter backup code");
      const csrfToken = await (await import("@/lib/queryClient")).getCsrfToken();
      const res = await fetch("/api/admin/mfa/verify-backup", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(csrfToken ? { "x-csrf-token": csrfToken } : {}) },
        body: JSON.stringify({ code: backupCode }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Invalid backup code");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Backup code verified" });
      setLocation("/admin/dashboard" as any);
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#02205B] to-[#0d4a7c] flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 bg-white shadow-2xl">
        <div className="flex justify-center mb-8">
          <img src={logo} alt="Constancia" className="h-12" />
        </div>

        <h1 className="text-2xl font-bold text-center mb-2 text-[#02205B]">Two-Factor Authentication</h1>
        <p className="text-center text-gray-600 mb-6">Enter your authentication code to continue</p>

        {!useBackup ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">TOTP Code</label>
              <Input
                type="text"
                placeholder="000000"
                value={token}
                onChange={(e) => setToken(e.target.value.slice(0, 6))}
                maxLength={6}
                className="text-center text-2xl font-mono tracking-widest"
                data-testid="input-totp-token"
              />
            </div>

            <Button
              onClick={() => verifyMfaMutation.mutate()}
              disabled={token.length !== 6 || verifyMfaMutation.isPending}
              className="w-full"
              data-testid="button-verify-mfa"
            >
              {verifyMfaMutation.isPending ? "Verifying..." : "Verify"}
            </Button>

            <button
              onClick={() => setUseBackup(true)}
              className="w-full text-sm text-brand-cyan hover:text-brand-teal text-center"
              data-testid="button-use-backup-code"
            >
              Use backup code instead
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Backup Code</label>
              <Input
                type="text"
                placeholder="XXXX-XXXX-XXXX"
                value={backupCode}
                onChange={(e) => setBackupCode(e.target.value)}
                className="font-mono"
                data-testid="input-backup-code"
              />
            </div>

            <Button
              onClick={() => verifyBackupCodeMutation.mutate()}
              disabled={!backupCode || verifyBackupCodeMutation.isPending}
              className="w-full"
              data-testid="button-verify-backup"
            >
              {verifyBackupCodeMutation.isPending ? "Verifying..." : "Verify"}
            </Button>

            <button
              onClick={() => {
                setUseBackup(false);
                setToken("");
              }}
              className="w-full text-sm text-brand-cyan hover:text-brand-teal text-center"
              data-testid="button-back-to-totp"
            >
              Back to TOTP
            </button>
          </div>
        )}

        <div className="mt-8 p-4 bg-blue-50 rounded-md flex gap-3">
          <ShieldCheckIcon className="w-5 h-5 text-[#02205B] flex-shrink-0 mt-0.5" />
          <p className="text-sm text-gray-700">
            Your authentication code is encrypted and never stored. This ensures your account remains secure.
          </p>
        </div>
      </Card>
    </div>
  );
}
