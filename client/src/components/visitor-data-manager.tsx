import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, User, Mail, Building2, Phone, Briefcase, Trash2, X, Check, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useVisitor } from "@/contexts/VisitorContext";

export function VisitorDataManager() {
  const [isOpen, setIsOpen] = useState(false);
  const { visitor, isLoaded, clearVisitor, setRememberMe, getFirstName, getLastName } = useVisitor();

  if (!isLoaded) {
    return null;
  }

  const hasData = visitor && (visitor.fullName || visitor.email);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-[#F6F3EE]/60 hover:text-[#C77A93] transition-colors text-sm"
        data-testid="button-visitor-settings"
        aria-label="Visitor data settings"
      >
        <Settings className="w-4 h-4" />
        <span>Your Data</span>
        <ChevronUp
          className={`w-3 h-3 transition-transform duration-200 ${isOpen ? "" : "rotate-180"}`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
              className="absolute bottom-full left-0 mb-2 w-72 bg-[#1a1a2e] border border-[#F6F3EE]/10 rounded-lg shadow-xl z-50 overflow-hidden"
              data-testid="dropdown-visitor-data"
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-white">Your Stored Data</h4>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 text-[#F6F3EE]/60 hover:text-white hover:bg-white/10"
                    onClick={() => setIsOpen(false)}
                    data-testid="button-close-visitor-dropdown"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {hasData ? (
                  <>
                    <div className="space-y-2 mb-4">
                      {visitor.fullName && (
                        <DataRow
                          icon={User}
                          label="Name"
                          value={visitor.fullName}
                          testId="text-stored-name"
                        />
                      )}
                      {visitor.email && (
                        <DataRow
                          icon={Mail}
                          label="Email"
                          value={visitor.email}
                          testId="text-stored-email"
                        />
                      )}
                      {visitor.company && (
                        <DataRow
                          icon={Building2}
                          label="Company"
                          value={visitor.company}
                          testId="text-stored-company"
                        />
                      )}
                      {visitor.phone && (
                        <DataRow
                          icon={Phone}
                          label="Phone"
                          value={visitor.phone}
                          testId="text-stored-phone"
                        />
                      )}
                      {visitor.jobTitle && (
                        <DataRow
                          icon={Briefcase}
                          label="Job Title"
                          value={visitor.jobTitle}
                          testId="text-stored-job-title"
                        />
                      )}
                    </div>

                    <div className="flex items-center justify-between py-3 border-t border-[#F6F3EE]/10">
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-[#C77A93]" />
                        <span className="text-sm text-[#F6F3EE]/80">Remember me</span>
                      </div>
                      <Switch
                        checked={visitor.rememberMe !== false}
                        onCheckedChange={setRememberMe}
                        data-testid="switch-remember-me"
                      />
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full mt-2 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      onClick={() => {
                        clearVisitor();
                        setIsOpen(false);
                      }}
                      data-testid="button-clear-data"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Clear my data
                    </Button>
                  </>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-[#F6F3EE]/60 mb-2">
                      No data stored yet
                    </p>
                    <p className="text-xs text-[#F6F3EE]/40">
                      When you fill out a form, your information can be saved for faster access next time.
                    </p>
                  </div>
                )}

                <p className="text-[10px] text-[#F6F3EE]/40 mt-3 pt-3 border-t border-[#F6F3EE]/10">
                  Data is stored locally on your device only. We do not track or store this information on our servers.
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

interface DataRowProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  testId: string;
}

function DataRow({ icon: Icon, label, value, testId }: DataRowProps) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Icon className="w-3.5 h-3.5 text-[#C77A93] flex-shrink-0" />
      <span className="text-[#F6F3EE]/50 flex-shrink-0">{label}:</span>
      <span className="text-[#F6F3EE]/90 truncate" data-testid={testId}>
        {value}
      </span>
    </div>
  );
}
