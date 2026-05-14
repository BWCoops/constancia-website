import { useRoute, useLocation } from "wouter";
import { ROIWizard } from "@/components/finance-compass/ROIWizard";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { ChatbotWidget } from "@/components/finance-compass/ChatbotWidget";
import { SEOHead } from "@/components/seo-head";

export default function FinanceCompassROI() {
  const [, params] = useRoute("/finance-compass/roi/:id");
  const [, setLocation] = useLocation();
  const assessmentId = params?.id;

  if (!assessmentId) {
    return (
      <div className="container mx-auto py-12 px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[#02205B] dark:text-white mb-4">
            Assessment Not Found
          </h1>
          <p className="text-muted-foreground mb-6">
            Please access this page from your dashboard.
          </p>
          <Button
            onClick={() => setLocation("/finance-compass/dashboard")}
            data-testid="button-back-to-dashboard"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <SEOHead
        title="ROI Analysis | Finance Compass | Constancia"
        description="Review your Finance Compass ROI analysis and investment case for your EPM or ERP transformation."
        canonicalUrl="https://constancia.io/finance-compass/roi"
      />
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => setLocation("/finance-compass/dashboard")}
          className="text-muted-foreground hover:text-foreground"
          data-testid="button-back-to-dashboard"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>
      
      <ROIWizard
        assessmentId={assessmentId}
        onComplete={() => setLocation("/finance-compass/dashboard")}
        onCancel={() => setLocation("/finance-compass/dashboard")}
      />
      
      <ChatbotWidget assessmentId={assessmentId} />
    </div>
  );
}
