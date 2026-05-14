import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { 
  LayoutDashboard, 
  Compass, 
  BarChart3, 
  Activity,
  FileText,
  Users,
  FolderOpen,
  Download,
  ShieldCheck,
  Lock,
  ToggleLeft,
  Image,
  MousePointerClick,
  ArrowRight,
  MessageSquare,
  Shield,
  TrendingUp,
  Layers
} from "lucide-react";
import AdminLayout from "./AdminLayout";

interface CategoryCard {
  title: string;
  description: string;
  icon: React.ElementType;
  url: string;
  color: string;
  bgColor: string;
  features: string[];
}

const categories: CategoryCard[] = [
  {
    title: "Core Admin",
    description: "Manage leads, content, blog posts, and downloadable resources",
    icon: LayoutDashboard,
    url: "/admin/dashboard",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    features: ["Leads", "Blog Posts", "Resources", "Downloads", "Enquiries"]
  },
  {
    title: "FinanceCompass",
    description: "AI-powered finance transformation assessment platform",
    icon: Compass,
    url: "/admin/finance-compass",
    color: "text-brand-cyan",
    bgColor: "bg-[#12EBFC]/10",
    features: ["Assessments", "Questions", "AI Config", "Tenants", "Knowledge Base"]
  },
  {
    title: "Analytics & Marketing",
    description: "Track performance, manage marketing assets, and monitor ad fraud",
    icon: BarChart3,
    url: "/admin/analytics",
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
    features: ["Analytics", "Marketing Assets", "Ad Fraud Detection"]
  },
  {
    title: "Operations & Security",
    description: "System operations, security settings, and feature management",
    icon: Activity,
    url: "/admin/operations",
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    features: ["Operations", "Security", "Feature Flags", "Guardrails", "Content Checker"]
  }
];

function CategoryCardComponent({ category }: { category: CategoryCard }) {
  const Icon = category.icon;
  const testId = `link-category-${category.title.toLowerCase().replace(/\s+/g, "-")}`;
  
  return (
    <Link href={category.url} data-testid={testId}>
      <Card 
        className="cursor-pointer transition-all hover:shadow-lg hover:border-[#12EBFC]/30 h-full group"
        data-testid={`card-category-${category.title.toLowerCase().replace(/\s+/g, "-")}`}
      >
        <CardContent className="pt-6 pb-5">
          <div className="flex items-start gap-4">
            <div className={`h-14 w-14 rounded-xl flex items-center justify-center ${category.bgColor} transition-transform group-hover:scale-105`}>
              <Icon className={`h-7 w-7 ${category.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">{category.title}</h3>
                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {category.description}
              </p>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {category.features.map((feature) => (
                  <span 
                    key={feature}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                  >
                    {feature}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function QuickAccessItem({ 
  icon: Icon, 
  title, 
  url 
}: { 
  icon: React.ElementType; 
  title: string; 
  url: string;
}) {
  const testId = `link-quick-${title.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <Link href={url} data-testid={testId}>
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted transition-colors cursor-pointer">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm">{title}</span>
      </div>
    </Link>
  );
}

export default function AdminHub() {
  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Admin Hub</h1>
          <p className="text-muted-foreground mt-2">
            Welcome to the Constancia administration centre. Select a category to get started.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {categories.map((category) => (
            <CategoryCardComponent key={category.title} category={category} />
          ))}
        </div>

        <div className="border-t pt-6">
          <h2 className="text-sm font-medium text-muted-foreground mb-3">Quick Access</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
            <QuickAccessItem icon={Users} title="Leads" url="/admin/leads" />
            <QuickAccessItem icon={FileText} title="Blog Posts" url="/admin/blog-posts" />
            <QuickAccessItem icon={FolderOpen} title="Resources" url="/admin/resources" />
            <QuickAccessItem icon={Download} title="Downloads" url="/admin/downloads" />
            <QuickAccessItem icon={MessageSquare} title="Contact Enquiries" url="/admin/contact-submissions" />
            <QuickAccessItem icon={Image} title="Marketing" url="/admin/marketing-assets" />
            <QuickAccessItem icon={ShieldCheck} title="Content Check" url="/admin/content-checker" />
            <QuickAccessItem icon={BarChart3} title="Analytics" url="/admin/analytics" />
            <QuickAccessItem icon={MousePointerClick} title="Ad Fraud" url="/admin/ad-fraud" />
            <QuickAccessItem icon={ToggleLeft} title="Feature Flags" url="/admin/feature-flags" />
            <QuickAccessItem icon={Shield} title="Guardrails" url="/admin/guardrails" />
            <QuickAccessItem icon={Lock} title="Security" url="/admin/security" />
            <QuickAccessItem icon={Activity} title="Operations" url="/admin/operations" />
            <QuickAccessItem icon={TrendingUp} title="Widget Analytics" url="/admin/widget-analytics" />
            <QuickAccessItem icon={Layers} title="Funnel Analytics" url="/admin/funnel-analytics" />
            <QuickAccessItem icon={Compass} title="FinanceCompass" url="/admin/finance-compass" />
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
