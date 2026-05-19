/**
 * Unified PDF Design System
 * 
 * Provides consistent colors, typography, spacing, and styling
 * for pixel-perfect PDF generation across all report types.
 */

export const BRAND_COLORS = {
  navy: '#12161D',
  cyan: '#7FB8A3',
  teal: '#8E4F67',
  cream: '#F6F3EE',
  white: '#FFFFFF',
  lightGray: '#F8FAFC',
  mediumGray: '#E2E8F0',
  darkGray: '#334155',
  slateGray: '#64748B',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
};

export const TYPOGRAPHY = {
  fontFamily: "'Inter', Arial, Helvetica, sans-serif",
  fontImport: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap",
  sizes: {
    xs: '8pt',
    sm: '9pt',
    base: '10pt',
    md: '11pt',
    lg: '13pt',
    xl: '16pt',
    '2xl': '20pt',
    '3xl': '28pt',
    '4xl': '36pt',
    hero: '42pt',
  },
  weights: {
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  lineHeights: {
    tight: 1.2,
    snug: 1.35,
    normal: 1.5,
    relaxed: 1.65,
    loose: 1.8,
  },
  letterSpacing: {
    tight: '-0.02em',
    normal: '0',
    wide: '0.05em',
    wider: '0.1em',
  },
};

export const SPACING = {
  px: '1px',
  '0.5': '1mm',
  '1': '2mm',
  '1.5': '3mm',
  '2': '4mm',
  '3': '6mm',
  '4': '8mm',
  '5': '10mm',
  '6': '12mm',
  '8': '16mm',
  '10': '20mm',
  '12': '25mm',
  '16': '32mm',
  '20': '40mm',
};

export const PAGE = {
  width: '210mm',
  height: '297mm',
  margins: {
    top: '25mm',
    right: '20mm',
    bottom: '25mm',
    left: '20mm',
  },
  contentWidth: '170mm',
  headerHeight: '18mm',
  footerHeight: '15mm',
};

export const SHADOWS = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
};

export const BORDERS = {
  radius: {
    none: '0',
    sm: '2mm',
    base: '3mm',
    md: '4mm',
    lg: '6mm',
    full: '50%',
  },
  width: {
    thin: '0.5px',
    base: '1px',
    medium: '2px',
    thick: '3px',
    accent: '4px',
  },
};

export const GRADIENTS = {
  primaryCover: `linear-gradient(145deg, ${BRAND_COLORS.navy} 0%, #041a4a 40%, ${BRAND_COLORS.teal} 100%)`,
  accentLine: `linear-gradient(90deg, ${BRAND_COLORS.cyan} 0%, ${BRAND_COLORS.teal} 100%)`,
  lightFade: `linear-gradient(180deg, ${BRAND_COLORS.lightGray} 0%, ${BRAND_COLORS.white} 100%)`,
  cardHighlight: `linear-gradient(135deg, rgba(2, 32, 91, 0.03) 0%, rgba(8, 132, 170, 0.03) 100%)`,
};

export const CONTACT_INFO = {
  company: 'Constancia Group Limited',
  address: '86-90 Paul Street, London, EC2A 4NE, United Kingdom',
  email: 'info@constancia.com',
  website: 'https://constancia.com',
  linkedin: 'linkedin.com/company/1qg-group-limited',
};

export function generateBaseStyles(): string {
  return `
    @import url('${TYPOGRAPHY.fontImport}');
    
    @page {
      size: A4;
      margin: ${PAGE.margins.top} ${PAGE.margins.right} ${PAGE.margins.bottom} ${PAGE.margins.left};
    }
    
    @page :first {
      margin: 0;
    }
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    html, body {
      font-family: ${TYPOGRAPHY.fontFamily};
      font-size: ${TYPOGRAPHY.sizes.base};
      line-height: ${TYPOGRAPHY.lineHeights.normal};
      color: ${BRAND_COLORS.darkGray};
      background: ${BRAND_COLORS.white};
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      text-rendering: optimizeLegibility;
    }
    
    /* Typography Classes */
    .text-xs { font-size: ${TYPOGRAPHY.sizes.xs}; }
    .text-sm { font-size: ${TYPOGRAPHY.sizes.sm}; }
    .text-base { font-size: ${TYPOGRAPHY.sizes.base}; }
    .text-md { font-size: ${TYPOGRAPHY.sizes.md}; }
    .text-lg { font-size: ${TYPOGRAPHY.sizes.lg}; }
    .text-xl { font-size: ${TYPOGRAPHY.sizes.xl}; }
    .text-2xl { font-size: ${TYPOGRAPHY.sizes['2xl']}; }
    .text-3xl { font-size: ${TYPOGRAPHY.sizes['3xl']}; }
    .text-4xl { font-size: ${TYPOGRAPHY.sizes['4xl']}; }
    
    .font-light { font-weight: ${TYPOGRAPHY.weights.light}; }
    .font-normal { font-weight: ${TYPOGRAPHY.weights.normal}; }
    .font-medium { font-weight: ${TYPOGRAPHY.weights.medium}; }
    .font-semibold { font-weight: ${TYPOGRAPHY.weights.semibold}; }
    .font-bold { font-weight: ${TYPOGRAPHY.weights.bold}; }
    
    .leading-tight { line-height: ${TYPOGRAPHY.lineHeights.tight}; }
    .leading-snug { line-height: ${TYPOGRAPHY.lineHeights.snug}; }
    .leading-normal { line-height: ${TYPOGRAPHY.lineHeights.normal}; }
    .leading-relaxed { line-height: ${TYPOGRAPHY.lineHeights.relaxed}; }
    
    .tracking-tight { letter-spacing: ${TYPOGRAPHY.letterSpacing.tight}; }
    .tracking-wide { letter-spacing: ${TYPOGRAPHY.letterSpacing.wide}; }
    .tracking-wider { letter-spacing: ${TYPOGRAPHY.letterSpacing.wider}; }
    
    /* Color Classes */
    .text-navy { color: ${BRAND_COLORS.navy}; }
    .text-teal { color: ${BRAND_COLORS.teal}; }
    .text-cyan { color: ${BRAND_COLORS.cyan}; }
    .text-cream { color: ${BRAND_COLORS.cream}; }
    .text-gray { color: ${BRAND_COLORS.slateGray}; }
    .text-dark { color: ${BRAND_COLORS.darkGray}; }
    .text-success { color: ${BRAND_COLORS.success}; }
    .text-warning { color: ${BRAND_COLORS.warning}; }
    .text-error { color: ${BRAND_COLORS.error}; }
    
    .bg-navy { background-color: ${BRAND_COLORS.navy}; }
    .bg-teal { background-color: ${BRAND_COLORS.teal}; }
    .bg-light { background-color: ${BRAND_COLORS.lightGray}; }
    .bg-white { background-color: ${BRAND_COLORS.white}; }
    
    /* Utility Classes */
    .uppercase { text-transform: uppercase; }
    .italic { font-style: italic; }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-justify { text-align: justify; }
    
    /* Page Break Control */
    .page-break-before { page-break-before: always; }
    .page-break-after { page-break-after: always; }
    .no-break { page-break-inside: avoid; break-inside: avoid; }
    .keep-with-next { page-break-after: avoid; break-after: avoid; }
    
    /* Print Optimization */
    @media print {
      body {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      
      thead { display: table-header-group; }
      
      tr, .no-break {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      
      h1, h2, h3, h4, h5, h6 {
        page-break-after: avoid !important;
        break-after: avoid !important;
      }
    }
  `;
}
