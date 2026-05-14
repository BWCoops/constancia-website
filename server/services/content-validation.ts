import { z } from "zod";

// =====================================================
// CONTENT VALIDATION SERVICE
// Enterprise-grade input validation for lead forms
// =====================================================

// Disposable/temporary email domains to block
export const DISPOSABLE_EMAIL_DOMAINS = [
  "tempmail.com", "temp-mail.org", "guerrillamail.com", "guerrillamail.org",
  "10minutemail.com", "10minmail.com", "mailinator.com", "maildrop.cc",
  "throwaway.email", "throwawaymail.com", "fakeinbox.com", "getnada.com",
  "tempail.com", "mohmal.com", "dispostable.com", "mailnesia.com",
  "trashmail.com", "trashmail.net", "spamgourmet.com", "mytrashmail.com",
  "sharklasers.com", "grr.la", "spam4.me", "yopmail.com", "yopmail.fr",
  "mailcatch.com", "meltmail.com", "mintemail.com", "mt2009.com",
  "dropmail.me", "emailondeck.com", "getairmail.com", "tempinbox.com",
  "burnermail.io", "tempr.email", "discard.email", "mailsac.com",
  "harakirimail.com", "33mail.com", "spamex.com", "spamfree24.org",
];

// Explicit/profanity words to detect (family-safe list for filtering)
const PROFANITY_PATTERNS = [
  /\bf+u+c+k+/i, /\bs+h+[i1]+t+/i, /\ba+s+s+(?:h+o+l+e+)?/i, 
  /\bb+[i1]+t+c+h+/i, /\bd+[i1]+c+k+/i, /\bc+u+n+t+/i, 
  /\bp+[i1]+s+s+/i, /\bw+h+o+r+e+/i, /\bd+a+m+n+/i,
  /\bb+a+s+t+a+r+d+/i, /\bc+r+a+p+/i, /\bh+e+l+l+/i,
  /\bn+[i1]+g+g+/i, /\bf+a+g+/i, /\br+e+t+a+r+d+/i,
  /\bs+l+u+t+/i, /\bw+a+n+k+/i, /\bt+w+a+t+/i, /\bp+r+[i1]+c+k+/i,
];

// Spam keywords commonly found in form submissions
const SPAM_KEYWORDS = [
  /\bcasino\b/i, /\bpoker\b/i, /\bgambling\b/i, /\blottery\b/i,
  /\bviagra\b/i, /\bcialis\b/i, /\bprescription\b/i, /\bpharmacy\b/i,
  /\bcrypto\s*currency\b/i, /\bbitcoin\b/i, /\bethereum\b/i, 
  /\binvestment\s*opportunity\b/i, /\bget\s*rich\s*quick\b/i,
  /\bmake\s*money\s*fast\b/i, /\bwork\s*from\s*home\b/i,
  /\bfree\s*money\b/i, /\beasy\s*money\b/i, /\bmillion\s*dollars?\b/i,
  /\bclick\s*here\b/i, /\bact\s*now\b/i, /\blimited\s*time\b/i,
  /\bfree\s*trial\b/i, /\bno\s*obligation\b/i, /\brisk\s*free\b/i,
  /\bcongratulations\b/i, /\byou\s*(?:have\s+)?won\b/i, /\bprize\b/i,
  /\bsex\b/i, /\bporn\b/i, /\bxxx\b/i, /\badult\b/i, /\bnude\b/i,
  /\bdating\b/i, /\bmeet\s*singles\b/i, /\bhookup\b/i,
  /\bweight\s*loss\b/i, /\blose\s*weight\b/i, /\bslim\s*fast\b/i,
  /\bseo\s*services?\b/i, /\blink\s*building\b/i, /\bbacklinks?\b/i,
  /\bweb\s*traffic\b/i, /\bfollowers\b/i, /\blikes\b/i,
];

// URL patterns to detect in names/messages
const URL_PATTERNS = [
  /https?:\/\//i,
  /www\./i,
  /\.[a-z]{2,}\//i,
  /\[url\]/i,
  /\[link\]/i,
  /<a\s+href/i,
  /\.(com|org|net|io|co|uk|de|fr|info|biz)\b/i,
];

// Suspicious patterns in names
const SUSPICIOUS_NAME_PATTERNS = [
  /\d{3,}/,
  /[<>{}[\]\\]/,
  /@/,
  /^\s*$/,
  /^[^a-zA-Z]/,
  /[a-zA-Z]{20,}/,
];

// Phone number validation patterns (UK and international)
const VALID_PHONE_PATTERNS = [
  /^(?:\+44|0044|44)?[0-9\s\-().]{10,14}$/,
  /^\+?[1-9]\d{6,14}$/,
];

// Content validation result type
export interface ContentValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  sanitizedContent?: string;
}

// Check for profanity/explicit content
export function containsProfanity(text: string): boolean {
  if (!text) return false;
  return PROFANITY_PATTERNS.some(pattern => pattern.test(text));
}

// Check for spam content
export function containsSpam(text: string): boolean {
  if (!text) return false;
  const spamMatches = SPAM_KEYWORDS.filter(pattern => pattern.test(text));
  return spamMatches.length >= 2;
}

// Check for URLs in text (useful for name fields)
export function containsUrls(text: string): boolean {
  if (!text) return false;
  return URL_PATTERNS.some(pattern => pattern.test(text));
}

// Check if email is from a disposable domain
export function isDisposableEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return false;
  return DISPOSABLE_EMAIL_DOMAINS.includes(domain);
}

// Validate name field (no URLs, special chars, or suspicious patterns)
export function validateName(name: string): ContentValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const trimmed = name?.trim() || "";

  if (!trimmed) {
    errors.push("Name cannot be empty");
    return { isValid: false, errors, warnings };
  }

  if (trimmed.length < 2) {
    errors.push("Name must be at least 2 characters");
  }

  if (trimmed.length > 100) {
    errors.push("Name cannot exceed 100 characters");
  }

  if (containsUrls(trimmed)) {
    errors.push("Name cannot contain URLs or web addresses");
  }

  if (containsProfanity(trimmed)) {
    errors.push("Name contains inappropriate language");
  }

  if (SUSPICIOUS_NAME_PATTERNS.some(p => p.test(trimmed))) {
    warnings.push("Name contains suspicious characters");
  }

  const letterCount = (trimmed.match(/[a-zA-Z]/g) || []).length;
  if (letterCount < trimmed.length * 0.5) {
    warnings.push("Name should primarily contain letters");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    sanitizedContent: trimmed,
  };
}

// Validate message/text content
export function validateMessage(message: string, minLength = 10, maxLength = 5000): ContentValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const trimmed = message?.trim() || "";

  if (!trimmed) {
    errors.push("Message cannot be empty");
    return { isValid: false, errors, warnings };
  }

  if (trimmed.length < minLength) {
    errors.push(`Message must be at least ${minLength} characters`);
  }

  if (trimmed.length > maxLength) {
    errors.push(`Message cannot exceed ${maxLength} characters`);
  }

  if (containsProfanity(trimmed)) {
    errors.push("Message contains inappropriate language");
  }

  if (containsSpam(trimmed)) {
    errors.push("Message appears to contain spam content");
  }

  const linkCount = (trimmed.match(/https?:\/\//gi) || []).length;
  if (linkCount > 3) {
    warnings.push("Message contains many links");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    sanitizedContent: trimmed,
  };
}

// Validate company name
export function validateCompany(company: string): ContentValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const trimmed = company?.trim() || "";

  if (!trimmed) {
    errors.push("Company name cannot be empty");
    return { isValid: false, errors, warnings };
  }

  if (trimmed.length < 2) {
    errors.push("Company name must be at least 2 characters");
  }

  if (trimmed.length > 200) {
    errors.push("Company name cannot exceed 200 characters");
  }

  if (containsProfanity(trimmed)) {
    errors.push("Company name contains inappropriate language");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    sanitizedContent: trimmed,
  };
}

// Validate phone number (optional field)
export function validatePhone(phone: string | null | undefined): ContentValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (!phone) {
    return { isValid: true, errors, warnings };
  }

  const trimmed = phone.trim();
  const digits = trimmed.replace(/\D/g, "");

  if (digits.length < 7) {
    errors.push("Phone number is too short");
  }

  if (digits.length > 15) {
    errors.push("Phone number is too long");
  }

  const isValidFormat = VALID_PHONE_PATTERNS.some(p => p.test(trimmed));
  if (!isValidFormat && digits.length >= 7) {
    warnings.push("Phone number format may be invalid");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    sanitizedContent: trimmed,
  };
}

// Full form validation for contact/lead forms
export interface FormValidationInput {
  firstName: string;
  lastName: string;
  email: string;
  company?: string;
  jobTitle?: string;
  message?: string;
  phone?: string;
}

export interface FormValidationResult {
  isValid: boolean;
  errors: Record<string, string[]>;
  warnings: Record<string, string[]>;
  sanitizedData: FormValidationInput;
}

export function validateContactForm(input: FormValidationInput): FormValidationResult {
  const errors: Record<string, string[]> = {};
  const warnings: Record<string, string[]> = {};
  const sanitizedData: FormValidationInput = { ...input };

  const firstNameResult = validateName(input.firstName);
  if (!firstNameResult.isValid) {
    errors.firstName = firstNameResult.errors;
  }
  if (firstNameResult.warnings.length) {
    warnings.firstName = firstNameResult.warnings;
  }
  sanitizedData.firstName = firstNameResult.sanitizedContent || "";

  const lastNameResult = validateName(input.lastName);
  if (!lastNameResult.isValid) {
    errors.lastName = lastNameResult.errors;
  }
  if (lastNameResult.warnings.length) {
    warnings.lastName = lastNameResult.warnings;
  }
  sanitizedData.lastName = lastNameResult.sanitizedContent || "";

  // Validate company (required for lead forms, check for whitespace-only)
  if (input.company !== undefined) {
    const trimmedCompany = input.company.trim();
    if (trimmedCompany.length === 0) {
      errors.company = ["Company name cannot be empty"];
      sanitizedData.company = "";
    } else {
      const companyResult = validateCompany(input.company);
      if (!companyResult.isValid) {
        errors.company = companyResult.errors;
      }
      if (companyResult.warnings.length) {
        warnings.company = companyResult.warnings;
      }
      sanitizedData.company = companyResult.sanitizedContent;
    }
  }

  // Validate job title (check for whitespace-only)
  if (input.jobTitle !== undefined) {
    const trimmedTitle = input.jobTitle.trim();
    if (trimmedTitle.length === 0) {
      errors.jobTitle = ["Job title cannot be empty"];
      sanitizedData.jobTitle = "";
    } else {
      if (trimmedTitle.length < 2) {
        errors.jobTitle = ["Job title must be at least 2 characters"];
      }
      if (containsProfanity(trimmedTitle)) {
        errors.jobTitle = [...(errors.jobTitle || []), "Job title contains inappropriate language"];
      }
      sanitizedData.jobTitle = trimmedTitle;
    }
  }

  // Always validate message if provided (even empty string)
  // If message is required for the form, it will be caught by the calling code or schema
  const messageToValidate = input.message ?? "";
  if (messageToValidate.trim().length === 0 && input.message !== undefined) {
    // Message was provided but is blank/whitespace-only
    errors.message = ["Message cannot be empty"];
    sanitizedData.message = "";
  } else if (input.message) {
    const messageResult = validateMessage(input.message);
    if (!messageResult.isValid) {
      errors.message = messageResult.errors;
    }
    if (messageResult.warnings.length) {
      warnings.message = messageResult.warnings;
    }
    sanitizedData.message = messageResult.sanitizedContent;
  }

  if (input.phone) {
    const phoneResult = validatePhone(input.phone);
    if (!phoneResult.isValid) {
      errors.phone = phoneResult.errors;
    }
    if (phoneResult.warnings.length) {
      warnings.phone = phoneResult.warnings;
    }
    sanitizedData.phone = phoneResult.sanitizedContent;
  }

  const emailTrimmed = input.email?.trim().toLowerCase() || "";
  sanitizedData.email = emailTrimmed;
  
  if (isDisposableEmail(emailTrimmed)) {
    errors.email = ["Disposable email addresses are not accepted"];
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    warnings,
    sanitizedData,
  };
}

// Zod schemas with trimming and validation
export const nameSchema = z.string()
  .transform((s: string) => s.trim())
  .pipe(z.string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name cannot exceed 100 characters")
  )
  .refine((val: string) => !containsUrls(val), "Name cannot contain URLs")
  .refine((val: string) => !containsProfanity(val), "Name contains inappropriate language");

export const companySchema = z.string()
  .transform((s: string) => s.trim())
  .pipe(z.string()
    .min(2, "Company name must be at least 2 characters")
    .max(200, "Company name cannot exceed 200 characters")
  )
  .refine((val: string) => !containsProfanity(val), "Company name contains inappropriate language");

export const messageSchema = z.string()
  .transform((s: string) => s.trim())
  .pipe(z.string()
    .min(10, "Message must be at least 10 characters")
    .max(5000, "Message cannot exceed 5000 characters")
  )
  .refine((val: string) => !containsProfanity(val), "Message contains inappropriate language")
  .refine((val: string) => !containsSpam(val), "Message appears to contain spam content");

export const phoneSchema = z.string().optional().transform((val: string | undefined) => val?.trim() || undefined);

export const businessEmailSchema = z.string()
  .email("Valid email is required")
  .transform((s: string) => s.trim().toLowerCase())
  .refine((val: string) => !isDisposableEmail(val), "Disposable email addresses are not accepted");
