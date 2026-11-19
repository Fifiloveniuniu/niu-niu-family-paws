import type { FastifyRequest } from 'fastify';

export type Identity = {
  uid: string;
  admin?: unknown;
  employee?: unknown;
  email_verified?: unknown;
  google?: boolean;
  email?: string;
};
export type ProfileIdentity = { uid: string; email: string };

/** Only use after the authenticated API hook has verified and attached the identity. */
export function requestIdentity(request: FastifyRequest): Identity {
  return (request as FastifyRequest & { identity: Identity }).identity;
}
