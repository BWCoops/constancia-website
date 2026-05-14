import { Loader2 } from "lucide-react";

export function FinanceCompassLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#12161D] via-[#034a5a] to-[#12161D]">
      <div className="h-16 border-b border-white/10 flex items-center px-6">
        <div className="w-20 h-8 bg-white/10 rounded animate-pulse" />
      </div>
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
        <div className="text-center px-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#7FB8A3]/30 mb-4">
            <span className="text-xs text-cyan-400 font-medium">FinanceCompass</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-4">
            AI-Powered EPM Readiness Assessment
          </h1>
          <p className="text-lg text-white/70 mb-8 max-w-2xl mx-auto">
            Preparing your personalised experience...
          </p>
          <Loader2 className="h-8 w-8 animate-spin text-cyan-400 mx-auto" />
        </div>
      </div>
    </div>
  );
}
