import type { components } from '../contracts/generated.ts';
export type AccessAccount = components['schemas']['AccessAccount'];
export type AccessRole = AccessAccount['roles'][number];
export type AccessWrite = components['schemas']['AccessWrite'];
export type AccessInvitation = components['schemas']['AccessInvitation'];
export type InvitationWrite = components['schemas']['InvitationWrite'];
export type AccessHistory = components['schemas']['AccessHistory'];
export type AccessPage<T> = { items: T[]; nextCursor: string | null };
