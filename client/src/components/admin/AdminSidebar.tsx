import { useLocation, Link } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  LayoutDashboard,
  Users,
  FileText,
  FolderOpen,
  Download,
  MessageSquare,
  Compass,
  ClipboardList,
  HelpCircle,
  BarChart3,
  Image,
  MousePointerClick,
  Activity,
  Shield,
  ToggleLeft,
  ShieldCheck,
  FileSearch,
  ChevronDown,
  Settings,
  Settings2,
  TrendingUp,
  GitCompare,
} from "lucide-react";
import logo from "@assets/1QG - Type Logo (Dark Blue)_1764415487342.png";

interface NavItem {
  title: string;
  url: string;
  icon: React.ElementType;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: "Content Management",
    items: [
      { title: "Leads", url: "/admin/leads", icon: Users },
      { title: "Blog Posts", url: "/admin/blog-posts", icon: FileText },
      { title: "Resources", url: "/admin/resources", icon: FolderOpen },
      { title: "Downloads", url: "/admin/downloads", icon: Download },
      { title: "Contact Enquiries", url: "/admin/contact-submissions", icon: MessageSquare },
    ],
  },
  {
    title: "FinanceCompass",
    items: [
      { title: "Dashboard", url: "/admin/finance-compass", icon: Compass },
      { title: "Assessments", url: "/admin/finance-compass/assessments", icon: ClipboardList },
      { title: "Question Configuration", url: "/admin/finance-compass/weightings", icon: Settings2 },
    ],
  },
  {
    title: "Analytics & Marketing",
    items: [
      { title: "Visitor Analytics", url: "/admin/analytics", icon: BarChart3 },
      { title: "Funnel Analytics", url: "/admin/funnel-analytics", icon: Activity },
      { title: "Widget Analytics", url: "/admin/widget-analytics", icon: TrendingUp },
      { title: "Comparison Tools", url: "/admin/comparison-analytics", icon: GitCompare },
      { title: "Marketing Assets", url: "/admin/marketing-assets", icon: Image },
      { title: "Ad Fraud", url: "/admin/ad-fraud", icon: MousePointerClick },
    ],
  },
  {
    title: "Operations",
    items: [
      { title: "Operations", url: "/admin/operations", icon: Activity },
      { title: "Security", url: "/admin/security", icon: Shield },
      { title: "Feature Flags", url: "/admin/feature-flags", icon: ToggleLeft },
      { title: "Guardrails", url: "/admin/guardrails", icon: ShieldCheck },
      { title: "Content Checker", url: "/admin/content-checker", icon: FileSearch },
    ],
  },
];

export function AdminSidebar() {
  const [location] = useLocation();

  const isActive = (url: string) => {
    if (url === "/admin/dashboard") {
      return location === "/admin/dashboard" || location === "/admin";
    }
    return location === url || location.startsWith(url + "/");
  };

  return (
    <Sidebar collapsible="icon" data-testid="admin-sidebar">
      <SidebarHeader className="border-b border-sidebar-border">
        <Link href="/admin" className="flex items-center gap-2 px-2 py-2" data-testid="link-sidebar-home">
          <Settings className="h-5 w-5 text-[#12EBFC] shrink-0" />
          <span className="font-semibold text-sm truncate group-data-[collapsible=icon]:hidden">
            Admin Console
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isActive("/admin/dashboard")}
                  tooltip="Dashboard"
                  data-testid="link-sidebar-dashboard"
                >
                  <Link href="/admin/dashboard">
                    <LayoutDashboard className="h-4 w-4" />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {navGroups.map((group) => (
          <Collapsible key={group.title} defaultOpen className="group/collapsible">
            <SidebarGroup>
              <SidebarGroupLabel asChild>
                <CollapsibleTrigger 
                  className="flex w-full items-center justify-between gap-2"
                  data-testid={`button-collapse-${group.title.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <span>{group.title}</span>
                  <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                </CollapsibleTrigger>
              </SidebarGroupLabel>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.items.map((item) => (
                      <SidebarMenuItem key={item.url}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive(item.url)}
                          tooltip={item.title}
                          data-testid={`link-sidebar-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                        >
                          <Link href={item.url}>
                            <item.icon className="h-4 w-4" />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
