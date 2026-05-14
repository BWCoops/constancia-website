import { lazy, Suspense } from "react";

const InputOTPComponent = lazy(() => 
  import("@/components/ui/input-otp").then(mod => ({
    default: ({ value, onChange, maxLength }: { value: string; onChange: (v: string) => void; maxLength: number }) => (
      <mod.InputOTP maxLength={maxLength} value={value} onChange={onChange}>
        <mod.InputOTPGroup>
          <mod.InputOTPSlot index={0} />
          <mod.InputOTPSlot index={1} />
          <mod.InputOTPSlot index={2} />
          <mod.InputOTPSlot index={3} />
          <mod.InputOTPSlot index={4} />
          <mod.InputOTPSlot index={5} />
        </mod.InputOTPGroup>
      </mod.InputOTP>
    )
  }))
);

function OTPFallback() {
  return (
    <div className="flex gap-2 justify-center">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="w-10 h-12 border rounded-md bg-muted animate-pulse" />
      ))}
    </div>
  );
}

export function LazyInputOTP({ value, onChange, maxLength = 6 }: { value: string; onChange: (v: string) => void; maxLength?: number }) {
  return (
    <Suspense fallback={<OTPFallback />}>
      <InputOTPComponent value={value} onChange={onChange} maxLength={maxLength} />
    </Suspense>
  );
}
