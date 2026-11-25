/** UI-only records. This module never authorizes real accounts or writes to storage. */
export type AccessRole = 'admin' | 'employee' | 'customer';
export type PreviewAccount = {
  id: string;
  name: string;
  email: string;
  roles: AccessRole[];
  houses: number[];
  status: 'active' | 'suspended';
};
export type PreviewInvite = {
  id: string;
  email: string;
  roles: AccessRole[];
  houses: number[];
  status: 'draft' | 'cancelled';
};
export const accessRoles: AccessRole[] = ['admin', 'employee', 'customer'];
export const previewActor = 'example-owner';
export const previewAccounts: PreviewAccount[] = [
  {
    id: previewActor,
    name: 'ownerName',
    email: 'owner@example.invalid',
    roles: ['admin', 'customer'],
    houses: [],
    status: 'active',
  },
  {
    id: 'example-employee',
    name: 'employeeName',
    email: 'care@example.invalid',
    roles: ['employee'],
    houses: [1],
    status: 'active',
  },
  {
    id: 'example-customer',
    name: 'customerName',
    email: 'customer@example.invalid',
    roles: ['customer'],
    houses: [],
    status: 'active',
  },
  {
    id: 'example-inactive',
    name: 'inactiveName',
    email: 'inactive@example.invalid',
    roles: ['employee', 'customer'],
    houses: [2],
    status: 'suspended',
  },
];
export function normalizeAccess<T extends { roles: AccessRole[]; houses: number[] }>(value: T): T {
  const roles = accessRoles.filter((role) => value.roles.includes(role));
  return {
    ...value,
    roles,
    houses: roles.includes('employee') ? [1, 2].filter((id) => value.houses.includes(id)) : [],
  };
}
export function accountChangeError(
  accounts: PreviewAccount[],
  next: PreviewAccount,
): string | null {
  const previous = accounts.find((account) => account.id === next.id);
  if (!previous) return 'unavailable';
  if (!next.roles.length) return 'chooseRole';
  if (next.id === previewActor && (next.status !== 'active' || !next.roles.includes('admin')))
    return 'selfProtection';
  if (
    !accounts.some((account) => {
      const current = account.id === next.id ? next : account;
      return current.status === 'active' && current.roles.includes('admin');
    })
  )
    return 'lastAdmin';
  return null;
}
export function inviteError(
  email: string,
  accounts: PreviewAccount[],
  invites: PreviewInvite[],
): string | null {
  const normalized = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return 'invalidEmail';
  if (
    accounts.some((account) => account.email.toLowerCase() === normalized) ||
    invites.some((invite) => invite.status === 'draft' && invite.email.toLowerCase() === normalized)
  )
    return 'duplicateEmail';
  return null;
}
