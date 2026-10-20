/** Claims are assigned by trusted project tooling, never by the browser. */
export function hasAdminAccess(claims: Record<string, unknown>): boolean {
  return claims.admin === true && claims.email_verified === true;
}

/** Display routing only. Every future business API must independently enforce access. */
export function getPortalAccess(claims: Record<string, unknown>): 'denied' | 'admin' | 'employee' | 'customer' {
  if (claims.email_verified !== true) return 'denied';
  if (hasAdminAccess(claims)) return 'admin';
  if (claims.employee === true) return 'employee';
  return 'customer';
}
