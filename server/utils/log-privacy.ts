export function redactEmail(email: string | null | undefined): string {
  if (!email) return '[no email]';
  const atIndex = email.indexOf('@');
  if (atIndex < 0) return '[invalid email]';
  const local = email.slice(0, atIndex);
  const domain = email.slice(atIndex + 1);
  return `${local.slice(0, 2)}***@${domain}`;
}

export function redactIp(ip: string | null | undefined): string {
  if (!ip) return '[no ip]';
  const parts = ip.split('.');
  if (parts.length === 4) return `${parts[0]}.${parts[1]}.*.*`;
  return '[ip redacted]';
}
