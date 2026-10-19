/** Claims are assigned by trusted project tooling, never by the browser. */
export function hasAdminAccess(claims: Record<string, unknown>): boolean {
  return claims.admin === true && claims.email_verified === true;
}
