import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Loader2, Lock, Bell, Shield, Plus, Trash2, Users } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "./AdminLayout";

interface SecuritySettings {
  ipAllowlistEnabled: boolean;
  notifyOnLogin: boolean;
  notifyEmails: string[];
  sessionTimeout: number;
  mfaRequired: boolean;
}

interface IpAllowlistEntry {
  id: string;
  ipAddress: string;
  isActive: boolean;
  createdAt: string;
}

interface AuthorizedEmailEntry {
  id: string;
  email: string;
  description: string | null;
  addedBy: string;
  isActive: boolean;
  createdAt: string;
}

function AdminSecurityContent() {
  const { toast } = useToast();
  const [newIp, setNewIp] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newEmailDesc, setNewEmailDesc] = useState("");

  const { data: settings, isLoading: settingsLoading } = useQuery<SecuritySettings>({
    queryKey: ["/api/admin/security/settings"],
  });

  const { data: ipAllowlist, isLoading: ipLoading } = useQuery<IpAllowlistEntry[]>({
    queryKey: ["/api/admin/security/ip-allowlist"],
  });

  const { data: authorizedEmails, isLoading: emailsLoading } = useQuery<AuthorizedEmailEntry[]>({
    queryKey: ["/api/admin/security/authorized-emails"],
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: Partial<SecuritySettings>) => {
      const res = await apiRequest("PATCH", "/api/admin/security/settings", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Settings Updated", description: "Security settings have been saved." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/security/settings"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update settings.",
        variant: "destructive",
      });
    },
  });

  const addIpMutation = useMutation({
    mutationFn: async (ipAddress: string) => {
      const res = await apiRequest("POST", "/api/admin/security/ip-allowlist", { ipAddress });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "IP Added", description: "IP address has been added to allowlist." });
      setNewIp("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/security/ip-allowlist"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Add Failed",
        description: error.message || "Failed to add IP address.",
        variant: "destructive",
      });
    },
  });

  const handleAddIp = () => {
    if (!newIp.trim()) {
      toast({ description: "Please enter an IP address", variant: "destructive" });
      return;
    }
    addIpMutation.mutate(newIp.trim());
  };

  const addEmailMutation = useMutation({
    mutationFn: async ({ email, description }: { email: string; description: string }) => {
      const res = await apiRequest("POST", "/api/admin/security/authorized-emails", { email, description });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Email Added", description: "Email address has been added to the whitelist." });
      setNewEmail("");
      setNewEmailDesc("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/security/authorized-emails"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Add Failed",
        description: error.message || "Failed to add email address.",
        variant: "destructive",
      });
    },
  });

  const removeEmailMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/admin/security/authorized-emails/${id}`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Email Removed", description: "Email has been removed from the whitelist." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/security/authorized-emails"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Remove Failed",
        description: error.message || "Failed to remove email.",
        variant: "destructive",
      });
    },
  });

  const handleAddEmail = () => {
    if (!newEmail.trim()) {
      toast({ description: "Please enter an email address", variant: "destructive" });
      return;
    }
    addEmailMutation.mutate({ email: newEmail.trim(), description: newEmailDesc.trim() });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Security Settings</h1>
        <p className="text-muted-foreground mt-2">
          Configure authentication, notifications, and access controls for the admin centre.
        </p>
      </div>

      {/* MFA & Authentication */}
      <Card data-testid="card-authentication">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Authentication
          </CardTitle>
          <CardDescription>
            Manage multi-factor authentication and session settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {settingsLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50">
                <div>
                  <p className="font-medium" data-testid="text-mfa-label">
                    Require Multi-Factor Authentication
                  </p>
                  <p className="text-sm text-muted-foreground">
                    All admin users must use MFA to login
                  </p>
                </div>
                <Badge
                  variant={settings?.mfaRequired ? "default" : "secondary"}
                  data-testid="badge-mfa-status"
                >
                  {settings?.mfaRequired ? "Enabled" : "Disabled"}
                </Badge>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50">
                <div>
                  <p className="font-medium" data-testid="text-timeout-label">
                    Session Timeout
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {settings?.sessionTimeout || 0} minutes of inactivity
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Login Notifications */}
      <Card data-testid="card-notifications">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Login Notifications
          </CardTitle>
          <CardDescription>
            Receive email alerts when admin users login
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {settingsLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50">
                <div>
                  <p className="font-medium" data-testid="text-notify-label">
                    Enable Login Notifications
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Send email alerts on new logins
                  </p>
                </div>
                <Switch
                  checked={settings?.notifyOnLogin ?? false}
                  onCheckedChange={(checked) =>
                    updateSettingsMutation.mutate({ notifyOnLogin: checked })
                  }
                  disabled={updateSettingsMutation.isPending}
                  data-testid="switch-notify"
                />
              </div>

              <div className="p-3 rounded-lg bg-muted/30 border border-border/50 text-sm text-muted-foreground">
                <p>Login notifications are automatically sent to all active admin users (except info@constancia.io)</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* IP Allowlist */}
      <Card data-testid="card-ip-allowlist">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            IP Allowlist
          </CardTitle>
          <CardDescription>
            Restrict admin access to specific IP addresses or CIDR ranges
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {settingsLoading || ipLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50">
                <div>
                  <p className="font-medium" data-testid="text-allowlist-label">
                    Enable IP Allowlist
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Only allow logins from specified IPs
                  </p>
                </div>
                <Switch
                  checked={settings?.ipAllowlistEnabled ?? false}
                  onCheckedChange={(checked) =>
                    updateSettingsMutation.mutate({ ipAllowlistEnabled: checked })
                  }
                  disabled={updateSettingsMutation.isPending}
                  data-testid="switch-allowlist"
                />
              </div>

              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter IP address or CIDR (e.g., 192.168.1.1 or 10.0.0.0/8)"
                    value={newIp}
                    onChange={(e) => setNewIp(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleAddIp()}
                    disabled={addIpMutation.isPending}
                    data-testid="input-ip-address"
                  />
                  <Button
                    onClick={handleAddIp}
                    disabled={addIpMutation.isPending}
                    data-testid="button-add-ip"
                  >
                    {addIpMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Plus className="h-4 w-4 mr-2" />
                    )}
                    Add
                  </Button>
                </div>

                {ipAllowlist && ipAllowlist.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium" data-testid="text-allowlist-entries">
                      Allowed Addresses ({ipAllowlist.length}):
                    </p>
                    <div className="space-y-2">
                      {ipAllowlist.map((entry) => (
                        <div
                          key={entry.id}
                          className="flex items-center justify-between p-2 rounded bg-muted/30 border border-border/50"
                          data-testid={`row-ip-${entry.id}`}
                        >
                          <div>
                            <p className="font-mono text-sm" data-testid={`text-ip-${entry.id}`}>
                              {entry.ipAddress}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Added {new Date(entry.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge
                            variant={entry.isActive ? "default" : "secondary"}
                            data-testid={`badge-ip-status-${entry.id}`}
                          >
                            {entry.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4" data-testid="text-no-ips">
                    No IP addresses in allowlist
                  </p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Authorized Emails Whitelist */}
      <Card data-testid="card-email-whitelist">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Admin Email Whitelist
          </CardTitle>
          <CardDescription>
            Control which email addresses can access the admin centre. Only whitelisted emails can create new admin accounts.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {emailsLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    placeholder="Email address (e.g. user@constancia.io)"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    disabled={addEmailMutation.isPending}
                    data-testid="input-email-address"
                    className="flex-1"
                  />
                  <Input
                    placeholder="Description (optional)"
                    value={newEmailDesc}
                    onChange={(e) => setNewEmailDesc(e.target.value)}
                    disabled={addEmailMutation.isPending}
                    data-testid="input-email-description"
                    className="flex-1"
                  />
                  <Button
                    onClick={handleAddEmail}
                    disabled={addEmailMutation.isPending}
                    data-testid="button-add-email"
                  >
                    {addEmailMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Plus className="h-4 w-4 mr-2" />
                    )}
                    Add
                  </Button>
                </div>

                {authorizedEmails && authorizedEmails.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium" data-testid="text-email-entries">
                      Authorized Emails ({authorizedEmails.length}):
                    </p>
                    <div className="space-y-2">
                      {authorizedEmails.map((entry) => (
                        <div
                          key={entry.id}
                          className="flex items-center justify-between p-3 rounded bg-muted/30 border border-border/50"
                          data-testid={`row-email-${entry.id}`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate" data-testid={`text-email-${entry.id}`}>
                              {entry.email}
                            </p>
                            {entry.description && (
                              <p className="text-xs text-muted-foreground truncate">
                                {entry.description}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              Added {new Date(entry.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 ml-2">
                            <Badge
                              variant={entry.isActive ? "default" : "secondary"}
                              data-testid={`badge-email-status-${entry.id}`}
                            >
                              {entry.isActive ? "Active" : "Inactive"}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeEmailMutation.mutate(entry.id)}
                              disabled={removeEmailMutation.isPending}
                              data-testid={`button-remove-email-${entry.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4" data-testid="text-no-emails">
                    No emails in whitelist. Add emails to allow new admin access.
                  </p>
                )}
              </div>

              <div className="p-3 rounded-lg bg-muted/30 border border-border/50 text-sm text-muted-foreground space-y-2">
                <p>Existing admin users can still login. The whitelist controls who can create new admin accounts.</p>
                <p className="text-xs"><strong>Note:</strong> Once emails are added here, this database whitelist becomes the source of truth. The AUTHORIZED_ADMIN_EMAILS environment variable is only used as a bootstrap fallback when this list is empty.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminSecurity() {
  return (
    <AdminLayout>
      <AdminSecurityContent />
    </AdminLayout>
  );
}
