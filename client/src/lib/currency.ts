export interface CurrencyConfig {
  code: string;
  symbol: string;
  name: string;
  locales: string[];
}

export const SUPPORTED_CURRENCIES: CurrencyConfig[] = [
  { code: "GBP", symbol: "£", name: "British Pound", locales: ["en-GB"] },
  { code: "USD", symbol: "$", name: "US Dollar", locales: ["en-US", "en-CA", "en-AU"] },
  { code: "EUR", symbol: "€", name: "Euro", locales: ["de-DE", "fr-FR", "es-ES", "it-IT", "nl-NL", "pt-PT"] },
  { code: "ZAR", symbol: "R", name: "South African Rand", locales: ["en-ZA", "af-ZA"] },
];

const CURRENCY_STORAGE_KEY = "constancia_preferred_currency";

export function detectCurrencyFromLocale(): string {
  try {
    const browserLocale = navigator.language || "en-GB";
    
    for (const currency of SUPPORTED_CURRENCIES) {
      if (currency.locales.some(locale => browserLocale.startsWith(locale.split("-")[0]) && browserLocale.includes(locale.split("-")[1] || ""))) {
        return currency.code;
      }
    }
    
    const languageCode = browserLocale.split("-")[0];
    if (languageCode === "de" || languageCode === "fr" || languageCode === "es" || languageCode === "it" || languageCode === "nl" || languageCode === "pt") {
      return "EUR";
    }
    
    if (browserLocale.includes("-ZA")) {
      return "ZAR";
    }
    
    if (browserLocale.includes("-US") || browserLocale.includes("-CA") || browserLocale.includes("-AU")) {
      return "USD";
    }
  } catch {
    // Fallback to GBP if detection fails
  }
  
  return "GBP";
}

export function getStoredCurrency(): string | null {
  try {
    return localStorage.getItem(CURRENCY_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function storeCurrency(currencyCode: string): void {
  try {
    localStorage.setItem(CURRENCY_STORAGE_KEY, currencyCode);
  } catch {
    // Silent fail for localStorage issues
  }
}

export function getPreferredCurrency(): string {
  const stored = getStoredCurrency();
  if (stored && SUPPORTED_CURRENCIES.some(c => c.code === stored)) {
    return stored;
  }
  return detectCurrencyFromLocale();
}

export function getCurrencySymbol(code: string): string {
  const currency = SUPPORTED_CURRENCIES.find(c => c.code === code);
  return currency?.symbol || "£";
}

export function getCurrencyConfig(code: string): CurrencyConfig {
  return SUPPORTED_CURRENCIES.find(c => c.code === code) || SUPPORTED_CURRENCIES[0];
}

export function formatCurrency(value: number, currencyCode: string = "GBP"): string {
  const symbol = getCurrencySymbol(currencyCode);
  return `${symbol}${value.toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function formatCurrencyCompact(value: number, currencyCode: string = "GBP"): string {
  const symbol = getCurrencySymbol(currencyCode);
  if (Math.abs(value) >= 1000000) {
    return `${symbol}${(value / 1000000).toFixed(1)}M`;
  } else if (Math.abs(value) >= 1000) {
    return `${symbol}${(value / 1000).toFixed(0)}K`;
  }
  return `${symbol}${value.toFixed(0)}`;
}

export function formatCurrencyRange(min: number, max: number, currencyCode: string = "GBP"): string {
  return `${formatCurrencyCompact(min, currencyCode)} - ${formatCurrencyCompact(max, currencyCode)}`;
}

// Average exchange rates from GBP (base currency for revenue values)
export const CURRENCY_CONVERSION_RATES: Record<string, number> = {
  GBP: 1,
  USD: 1.27,
  EUR: 1.17,
  ZAR: 23.5,
};

export function convertFromGBP(valueInGBP: number, targetCurrency: string): number {
  const rate = CURRENCY_CONVERSION_RATES[targetCurrency] || 1;
  return Math.round(valueInGBP * rate);
}

export function getConvertedRevenueLabel(baseLabel: string, targetCurrency: string): string {
  if (targetCurrency === "GBP") return baseLabel;
  
  const symbol = getCurrencySymbol(targetCurrency);
  const rate = CURRENCY_CONVERSION_RATES[targetCurrency] || 1;
  
  // Parse and convert revenue values in the label
  return baseLabel
    .replace(/£(\d+(?:\.\d+)?)\s*billion/gi, (_, num) => {
      const converted = parseFloat(num) * rate;
      return `${symbol}${converted.toFixed(1)} billion`;
    })
    .replace(/£(\d+(?:\.\d+)?)\s*million/gi, (_, num) => {
      const converted = parseFloat(num) * rate;
      return `${symbol}${Math.round(converted)} million`;
    })
    .replace(/£(\d+)-(\d+)\s*billion/gi, (_, min, max) => {
      const minConverted = parseFloat(min) * rate;
      const maxConverted = parseFloat(max) * rate;
      return `${symbol}${minConverted.toFixed(0)}-${maxConverted.toFixed(0)} billion`;
    })
    .replace(/£(\d+)-(\d+)\s*million/gi, (_, min, max) => {
      const minConverted = parseFloat(min) * rate;
      const maxConverted = parseFloat(max) * rate;
      return `${symbol}${Math.round(minConverted)}-${Math.round(maxConverted)} million`;
    })
    .replace(/£(\d+)\s*million\s*-\s*£(\d+)\s*billion/gi, (_, minM, maxB) => {
      const minConverted = parseFloat(minM) * rate;
      const maxConverted = parseFloat(maxB) * rate;
      return `${symbol}${Math.round(minConverted)} million - ${symbol}${maxConverted.toFixed(1)} billion`;
    })
    .replace(/Under\s*£(\d+)\s*million/gi, (_, num) => {
      const converted = parseFloat(num) * rate;
      return `Under ${symbol}${Math.round(converted)} million`;
    })
    .replace(/£(\d+)\+\s*billion/gi, (_, num) => {
      const converted = parseFloat(num) * rate;
      return `${symbol}${converted.toFixed(0)}+ billion`;
    });
}
