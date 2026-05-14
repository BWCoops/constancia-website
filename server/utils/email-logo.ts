import { TYPE_LOGO_WHITE_SMALL_BASE64, TYPE_LOGO_TURQUOISE_SMALL_BASE64 } from "../pdf-logo-base64";

type LogoVariant = "white" | "turquoise";

interface EmailLogoOptions {
  variant: LogoVariant;
  marginBottom?: number;
  maxWidth?: number;
}

export function getEmailLogoHtml(options: EmailLogoOptions): string {
  const { variant, marginBottom = 0, maxWidth } = options;
  
  const logoSrc = variant === "white" 
    ? TYPE_LOGO_WHITE_SMALL_BASE64 
    : TYPE_LOGO_TURQUOISE_SMALL_BASE64;
  
  const marginStyle = marginBottom > 0 ? `margin-bottom: ${marginBottom}px;` : "";
  const maxWidthStyle = maxWidth ? `max-width: ${maxWidth}px;` : "";
  
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
  <tr>
    <td align="center" style="padding: 0;">
      <img src="${logoSrc}" alt="1QG" border="0" style="display: block; ${maxWidthStyle} height: auto; ${marginStyle}" />
    </td>
  </tr>
</table>`;
}
