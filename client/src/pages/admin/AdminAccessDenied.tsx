import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldX, ArrowLeft, Mail } from "lucide-react";
import logo from "@assets/constancia-logo-dark.png";

export default function AdminAccessDenied() {
  const handleBack = () => {
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#12161D] via-[#5E8D7A] to-[#8E4F67] p-4">
      <Card className="w-full max-w-md" data-testid="access-denied-card">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <img 
              src={logo} 
              alt="Constancia Logo" 
              className="h-12 object-contain"
              data-testid="logo-image"
            />
          </div>
          <div className="flex justify-center">
            <div className="p-4 rounded-full bg-destructive/10">
              <ShieldX className="h-12 w-12 text-destructive" />
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl font-semibold" data-testid="text-title">
              Access Denied
            </CardTitle>
            <CardDescription className="mt-2" data-testid="text-description">
              Your account is not authorized to access the Constancia Admin Centre.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-4 rounded-lg text-sm text-muted-foreground" data-testid="info-box">
            <p className="mb-2">
              Access to the Admin Centre is restricted to authorized Constancia team members only.
            </p>
            <p>
              If you believe you should have access, please contact your administrator.
            </p>
          </div>
          
          <div className="flex flex-col gap-2">
            <Button 
              onClick={handleBack}
              variant="outline"
              className="w-full gap-2"
              data-testid="button-back-home"
            >
              <ArrowLeft className="h-4 w-4" />
              Return to Website
            </Button>
            
            <Button 
              variant="ghost"
              className="w-full gap-2 text-muted-foreground"
              onClick={() => window.location.href = "mailto:info@constancia.com"}
              data-testid="button-contact"
            >
              <Mail className="h-4 w-4" />
              Contact Support
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
