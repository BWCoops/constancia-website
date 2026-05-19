import { useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, LogIn } from "lucide-react";
import logo from "@assets/constancia-logo.png";

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(search);
    const errorParam = params.get("error");
    if (errorParam) {
      setError(decodeURIComponent(errorParam));
    }

    const checkSession = async () => {
      try {
        const res = await fetch("/api/admin/auth/session", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated) {
            setLocation("/admin/dashboard");
            return;
          }
        }
      } catch (err) {
        console.error("Session check failed:", err);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, [search, setLocation]);

  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#12161D] via-[#5E8D7A] to-[#8E4F67]">
        <div className="animate-pulse text-white text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#12161D] via-[#5E8D7A] to-[#8E4F67] p-4">
      <Card className="w-full max-w-md" data-testid="login-card">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <img 
              src={logo} 
              alt="1QG Logo" 
              className="h-12 object-contain"
              data-testid="logo-image"
            />
          </div>
          <div>
            <CardTitle className="text-2xl font-semibold" data-testid="text-title">
              Admin Centre
            </CardTitle>
            <CardDescription className="mt-2" data-testid="text-description">
              Sign in to access the 1QG administration dashboard
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive" data-testid="alert-error">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <Button 
            onClick={handleLogin}
            className="w-full h-12 gap-3 bg-brand-navy text-white border-[#12161D]"
            data-testid="button-login"
          >
            <LogIn className="h-5 w-5" />
            Sign in with Replit
          </Button>

          <p className="text-xs text-center text-muted-foreground mt-4" data-testid="text-security-notice">
            Access is restricted to authorized 1QG staff only.
            <br />
            Authentication is handled via Replit authentication.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
