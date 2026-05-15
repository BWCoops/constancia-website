import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { 
  Compass,
  ClipboardList,
  HelpCircle,
  Brain,
  Building2,
  History,
  BookOpen,
  LineChart,
  LayoutDashboard,
  ChevronLeft,
  BarChart3,
  Shield,
  Calculator,
  TrendingUp,
} from "lucide-react";

interface NavItem {
  title: string;
  url: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { title: "Dashboard", url: "/admin/finance-compass", icon: LayoutDashboard },
  { title: "Assessments", url: "/admin/finance-compass/assessments", icon: ClipboardList },
  { title: "Questions", url: "/admin/finance-compass/questions", icon: HelpCircle },
  { title: "Insights", url: "/admin/finance-compass/insights", icon: TrendingUp },
  { title: "Benchmarks", url: "/admin/finance-compass/benchmarks", icon: BarChart3 },
  { title: "Scoring Logic", url: "/admin/finance-compass/scoring-logic", icon: Calculator },
  { title: "Tenants", url: "/admin/finance-compass/tenants", icon: Building2 },
  { title: "Scenarios", url: "/admin/finance-compass/scenarios", icon: LineChart },
  { title: "Knowledge Base", url: "/admin/finance-compass/knowledge-base", icon: BookOpen },
  { title: "AI Config", url: "/admin/finance-compass/ai-config", icon: Brain },
  { title: "Audit Logs", url: "/admin/finance-compass/audit-logs", icon: History },
  { title: "Beta Access", url: "/admin/finance-compass/beta-access", icon: Shield },
];

export function FCAdminTopNav() {
  const [location] = useLocation();

  return (
    <div className="border-b bg-card/50 backdrop-blur-sm">
      <div className="flex items-center gap-2 sm:gap-4 px-2 sm:px-4">
        <Link 
          href="/admin" 
          className="flex items-center gap-1 py-3 pr-2 sm:pr-3 border-r text-muted-foreground hover:text-foreground transition-colors shrink-0"
          data-testid="link-back-admin-hub"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="text-xs hidden sm:inline">Hub</span>
        </Link>
        <div className="flex items-center gap-1.5 sm:gap-2 py-3 pr-2 sm:pr-4 border-r mr-1 sm:mr-2 shrink-0">
          <motion.div
            initial={{ rotate: 0 }}
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          >
            <Compass className="h-5 w-5 text-[#C77A93]" />
          </motion.div>
          <span className="font-semibold text-xs sm:text-sm hidden xs:inline">FC</span>
          <span className="font-semibold text-sm hidden sm:inline">FinanceCompass</span>
        </div>
        <nav className="flex items-center gap-1 overflow-x-auto py-2 scrollbar-none flex-1 min-w-0" role="navigation" aria-label="FinanceCompass sections">
          {navItems.map((item) => {
            const locationPath = location.split(/[?#]/)[0];
            const isActive = item.url === "/admin/finance-compass" 
              ? locationPath === item.url 
              : locationPath === item.url || locationPath.startsWith(item.url + "/");
            const Icon = item.icon;
            
            return (
              <Link
                key={item.url}
                href={item.url}
                className={`
                  flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium
                  transition-colors whitespace-nowrap shrink-0
                  ${isActive 
                    ? "bg-[#C77A93]/10 text-[#C77A93] border border-[#C77A93]/20" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent"
                  }
                `}
                data-testid={`nav-tab-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline">{item.title}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

export default FCAdminTopNav;
