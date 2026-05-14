import { SUPPORTED_CURRENCIES, getCurrencyConfig, storeCurrency } from "@/lib/currency";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe } from "lucide-react";

interface CurrencySelectorProps {
  value: string;
  onChange: (currency: string) => void;
  compact?: boolean;
  className?: string;
}

export function CurrencySelector({ value, onChange, compact = false, className = "" }: CurrencySelectorProps) {
  const currentCurrency = getCurrencyConfig(value);

  const handleChange = (newValue: string) => {
    storeCurrency(newValue);
    onChange(newValue);
  };

  return (
    <Select value={value} onValueChange={handleChange}>
      <SelectTrigger 
        className={`${compact ? "h-7 w-[90px] text-xs" : "w-[140px]"} ${className}`}
        data-testid="select-currency"
      >
        <div className="flex items-center gap-1.5">
          {!compact && <Globe className="h-3.5 w-3.5 text-muted-foreground" />}
          <SelectValue>
            {compact ? currentCurrency.symbol : `${currentCurrency.symbol} ${currentCurrency.code}`}
          </SelectValue>
        </div>
      </SelectTrigger>
      <SelectContent>
        {SUPPORTED_CURRENCIES.map((currency) => (
          <SelectItem 
            key={currency.code} 
            value={currency.code}
            data-testid={`currency-option-${currency.code.toLowerCase()}`}
          >
            <span className="flex items-center gap-2">
              <span className="w-4 text-center font-medium">{currency.symbol}</span>
              <span>{currency.code}</span>
              {!compact && <span className="text-muted-foreground text-xs">- {currency.name}</span>}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
