import { useEffect, useState, Fragment, useCallback } from "react";
import { useLocation, Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { preloadAdminRoutes } from "@/lib/preload";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { 
  LogOut,
  Home,
  ChevronDown,
  WifiOff,
  RefreshCw
} from "lucide-react";
import logo from "@assets/brand/Constancia-Logo-PD-Transparent.png";

interface AdminSession {
  authenticated: boolean;
  user?: {
    id: string;
    email: string;
    displayName: string;
    profileImageUrl?: string;
  };
}

interface AdminLayoutProps {
  children: React.ReactNode;
}

const routeLabels: Record<string, string> = {
  "/admin": "Admin Hub",
  "/admin/dashboard": "Dashboard",
  "/admin/leads": "Leads",
  "/admin/blog-posts": "Blog Posts",
  "/admin/resources": "Resources",
  "/admin/downloads": "Downloads",
  "/admin/contact-submissions": "Contact Enquiries",
  "/admin/finance-compass": "FinanceCompass",
  "/admin/finance-compass/assessments": "Assessments",
  "/admin/finance-compass/questions": "Question Configuration",
  "/admin/finance-compass/weightings": "Question Configuration",
  "/admin/finance-compass/benchmarks": "Benchmarks",
  "/admin/finance-compass/scenarios": "Scenarios",
  "/admin/finance-compass/knowledge-base": "Knowledge Base",
  "/admin/finance-compass/ai-configuration": "AI Configuration",
  "/admin/finance-compass/audit-logs": "Audit Logs",
  "/admin/analytics": "Visitor Analytics",
  "/admin/widget-analytics": "Widget Analytics",
  "/admin/funnel-analytics": "Funnel Analytics",
  "/admin/marketing-assets": "Marketing Assets",
  "/admin/ad-fraud": "Ad Fraud",
  "/admin/operations": "Operations",
  "/admin/security": "Security",
  "/admin/feature-flags": "Feature Flags",
  "/admin/guardrails": "Guardrails",
  "/admin/content-checker": "Content Checker",
};

function getBreadcrumbs(path: string): { label: string; href?: string }[] {
  const breadcrumbs: { label: string; href?: string }[] = [
    { label: "Admin", href: "/admin" },
  ];

  if (path === "/admin" || path === "/admin/") {
    return [{ label: "Admin Hub" }];
  }

  const segments = path.replace(/\/$/, "").split("/").filter(Boolean);
  let currentPath = "";

  for (let i = 1; i < segments.length; i++) {
    currentPath = "/" + segments.slice(0, i + 1).join("/");
    const label = routeLabels[currentPath] || segments[i].charAt(0).toUpperCase() + segments[i].slice(1).replace(/-/g, " ");
    
    if (i === segments.length - 1) {
      breadcrumbs.push({ label });
    } else {
      breadcrumbs.push({ label, href: currentPath });
    }
  }

  return breadcrumbs;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [location, setLocation] = useLocation();
  const [isClient, setIsClient] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const queryClient = useQueryClient();

  const { data: session, isLoading, error, refetch } = useQuery<AdminSession>({
    queryKey: ["/api/admin/auth/session"],
    retry: 2,
    retryDelay: 1000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    setIsClient(true);
    preloadAdminRoutes();
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      refetch();
      queryClient.invalidateQueries();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [refetch, queryClient]);

  useEffect(() => {
    if (!isLoading && (!session?.authenticated || error)) {
      if (location !== "/admin/login") {
        setLocation("/admin/login");
      }
    }
  }, [session, isLoading, error, setLocation, location]);

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  if (!isClient || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="space-y-4 w-64">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-8 w-1/2" />
        </div>
      </div>
    );
  }

  if (!session?.authenticated) {
    return null;
  }

  const userInitials = session.user?.displayName
    ? session.user.displayName.split(' ').map(n => n[0]).join('').toUpperCase()
    : session.user?.email?.[0]?.toUpperCase() || 'A';

  const breadcrumbs = getBreadcrumbs(location);

  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  } as React.CSSProperties;

  return (
    <SidebarProvider style={sidebarStyle}>
      <div className="flex min-h-screen w-full">
        <AdminSidebar />
        <SidebarInset className="flex flex-col">
          {!isOnline && (
            <div 
              className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center justify-center gap-2 text-amber-600 dark:text-amber-400 text-sm"
              data-testid="banner-offline"
            >
              <WifiOff className="h-4 w-4" />
              <span data-testid="text-offline-message">You're offline. Some features may be unavailable.</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refetch()}
                data-testid="button-retry-connection"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry
              </Button>
            </div>
          )}
          <header className="sticky top-0 z-50 flex h-14 items-center justify-between gap-2 sm:gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-2 sm:px-4">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
              <SidebarTrigger data-testid="button-sidebar-toggle" className="flex-shrink-0" />
              
              <div className="hidden sm:flex items-center gap-3 flex-shrink-0">
                <Link href="/" className="flex items-center gap-2 group" data-testid="link-website">
                  <img 
                    src={logo} 
                    alt="Constancia" 
                    className="h-5 object-contain transition-opacity group-hover:opacity-70"
                    data-testid="header-logo"
                  />
                  <Home className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </Link>
                
                <div className="h-5 w-px bg-border" />
              </div>

              <Breadcrumb data-testid="breadcrumb-nav" className="hidden md:block min-w-0 flex-1">
                <BreadcrumbList className="flex-wrap">
                  {breadcrumbs.map((crumb, index) => (
                    <Fragment key={index}>
                      {index > 0 && <BreadcrumbSeparator className="hidden sm:block" />}
                      <BreadcrumbItem className="hidden sm:block">
                        {crumb.href ? (
                          <BreadcrumbLink asChild>
                            <Link 
                              href={crumb.href}
                              data-testid={`breadcrumb-link-${crumb.label.toLowerCase().replace(/\s+/g, "-")}`}
                            >
                              {crumb.label}
                            </Link>
                          </BreadcrumbLink>
                        ) : (
                          <BreadcrumbPage data-testid={`breadcrumb-page-${crumb.label.toLowerCase().replace(/\s+/g, "-")}`}>
                            {crumb.label}
                          </BreadcrumbPage>
                        )}
                      </BreadcrumbItem>
                    </Fragment>
                  ))}
                </BreadcrumbList>
              </Breadcrumb>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="flex items-center gap-1 sm:gap-2 px-1 sm:px-2 flex-shrink-0"
                  data-testid="button-user-menu"
                >
                  <Avatar className="h-8 w-8 border border-border flex-shrink-0">
                    <AvatarImage src={session.user?.profileImageUrl} />
                    <AvatarFallback className="bg-[#C77A93]/10 text-brand-cyan text-xs font-semibold">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-medium leading-none" data-testid="text-user-name">
                      {session.user?.displayName || 'Admin User'}
                    </p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground hidden sm:block" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{session.user?.displayName || 'Admin User'}</p>
                    <p className="text-xs text-muted-foreground" data-testid="text-user-email">
                      {session.user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/" className="flex items-center gap-2 cursor-pointer" data-testid="menu-item-website">
                    <Home className="h-4 w-4" />
                    <span>Back to Website</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={handleLogout}
                  className="text-destructive focus:text-destructive cursor-pointer"
                  data-testid="menu-item-logout"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  <span>Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>

          <main className="flex-1 p-3 sm:p-6 w-full overflow-x-hidden" data-testid="admin-content">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
