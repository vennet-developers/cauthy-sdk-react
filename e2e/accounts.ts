// The accounts every backend under the end-to-end suite must know (README,
// "The suite against another backend"). Fictitious: Acme only.
export const PASSWORD = 'acme-e2e-password-1'
export const MFA_CODE = '123456'
export const ACCOUNTS = [
  { sub: 'u-member', email: 'member@example.com', name: 'Acme Member', password: PASSWORD, mfa: false },
  { sub: 'u-mfa', email: 'mfa@example.com', name: 'Acme Second Step', password: PASSWORD, mfa: true },
] as const
/** The organization member@example.com owns, with deals:read, deals:write, cauthy:members:* and cauthy:organization:*. */
export const ORGANIZATION = { id: '3b2f6c1e-8d4a-4c7e-9f10-2a6b5c8d9e01', name: 'Acme Sales' } as const
