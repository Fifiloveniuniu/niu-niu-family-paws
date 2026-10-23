import Fastify, { type FastifyRequest } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import spec from '../../../packages/contracts/openapi.json' with { type: 'json' };
import type { components } from '../../../packages/contracts/generated.ts';
import { petRoutes, PetAccess, PetMissing, PetInvalid, type PetStore } from './pets.ts';
import { linkRoutes, LinkUnavailable, type LinkStore } from './linking.ts';

type Customer = components['schemas']['Customer'];
type CustomerWrite = components['schemas']['CustomerWrite'];
type ProfileWrite = components['schemas']['ProfileWrite'];
export type Identity = { uid: string; admin?: unknown; email_verified?: unknown; google?: boolean; email?: string };
export type ProfileIdentity = { uid: string; email: string };
const identityOf = (request: FastifyRequest) => (request as FastifyRequest & { identity: Identity }).identity;
export interface CustomerStore {
  list(cursor?: string, search?: string): Promise<{ items: Customer[]; nextCursor: string | null }>;
  save(id: string, input: CustomerWrite, actor: string): Promise<Customer>;
  profile(identity: ProfileIdentity): Promise<Customer | null>;
  saveProfile(identity: ProfileIdentity, input: ProfileWrite): Promise<Customer>;
}
export class Conflict extends Error {}
export function buildApp(deps: { verify: (token: string) => Promise<Identity>; store: CustomerStore; pets?: PetStore; links?: LinkStore }) {
  const app = Fastify({ logger: false, bodyLimit: 16_384, ajv: { customOptions: { removeAdditional: false, coerceTypes: false } } });
  app.register(rateLimit, { max: 120, timeWindow: '1 minute' });
  app.addHook('onRequest', async (_request, reply) => {
    reply.header('Cache-Control', 'private, no-store').header('X-Content-Type-Options', 'nosniff');
  });
  app.get('/health', async () => ({ ok: true }));
  app.register(async api => {
    api.decorateRequest('identity', null);
    api.addHook('onRequest', async (request, reply) => {
      const match = /^Bearer ([^\s]+)$/.exec(request.headers.authorization || '');
      if (!match) return reply.code(401).send({ code: 'unauthenticated' });
      let identity: Identity;
      try { identity = await deps.verify(match[1]); }
      catch { return reply.code(401).send({ code: 'unauthenticated' }); }
      if (identity.email_verified !== true) return reply.code(403).send({ code: 'forbidden' });
      (request as typeof request & { identity: Identity }).identity = identity;
    });
    if (deps.pets) petRoutes(api, deps.pets);
    if (deps.links) linkRoutes(api, deps.links);
    api.register(async own => {
      own.addHook('onRequest', async (request, reply) => {
        const identity = identityOf(request);
        if (identity.google !== true || !identity.email) return reply.code(403).send({ code: 'forbidden' });
      });
      const emptyQuery = { type: 'object', additionalProperties: false, properties: {} };
      const owner = (request: FastifyRequest): ProfileIdentity => ({ uid: identityOf(request).uid, email: identityOf(request).email! });
      own.get('/profile', { schema: { querystring: emptyQuery } }, async (request, reply) => {
        const profile = await deps.store.profile(owner(request));
        return profile ?? reply.code(204).send();
      });
      own.put<{ Body: ProfileWrite }>('/profile', { schema: { querystring: emptyQuery, body: spec.components.schemas.ProfileWrite } }, async (request, reply) => {
        const input = { ...request.body, name: request.body.name.trim() };
        if (!input.name || /[\u0000-\u001f\u007f]/.test(input.name)) return reply.code(400).send({ code: 'invalid_input' });
        return deps.store.saveProfile(owner(request), input);
      });
    });
    api.register(async admin => {
      admin.addHook('onRequest', async (request, reply) => {
        if (identityOf(request).admin !== true) return reply.code(403).send({ code: 'forbidden' });
      });
      const uuid = { type: 'string', pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' };
      admin.get<{ Querystring: { cursor?: string; search?: string } }>('/customers', {
        schema: { querystring: { type: 'object', additionalProperties: false, properties: { cursor: uuid, search: { type: 'string', maxLength: 254 } } } },
      }, request => deps.store.list(request.query.cursor, request.query.search?.trim().toLowerCase()));
      admin.put<{ Params: { id: string }; Body: CustomerWrite }>('/customers/:id', {
        schema: { params: { type: 'object', required: ['id'], additionalProperties: false, properties: { id: uuid } }, body: spec.components.schemas.CustomerWrite },
      }, async (request, reply) => {
        const input = { ...request.body, name: request.body.name.trim(), email: request.body.email.trim(), phone: request.body.phone.trim() };
        if (!input.name || (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) || /[\u0000-\u001f\u007f]/.test(input.name + input.email + input.phone)) {
          return reply.code(400).send({ code: 'invalid_input' });
        }
        return deps.store.save(request.params.id, input, identityOf(request).uid);
      });
    });
  }, { prefix: '/api' });
  app.setErrorHandler((error: Error & { validation?: unknown; statusCode?: number }, _request, reply) => {
    if (error instanceof Conflict || error instanceof LinkUnavailable) return reply.code(409).send({ code: 'conflict' });
    if (error instanceof PetAccess) return reply.code(403).send({ code: 'forbidden' });
    if (error instanceof PetMissing) return reply.code(404).send({ code: 'not_found' });
    if (error instanceof PetInvalid || error.statusCode === 413) return reply.code(400).send({ code: 'invalid_input' });
    if (error.validation) return reply.code(400).send({ code: 'invalid_input' });
    if (error.statusCode === 429) return reply.code(429).send({ code: 'rate_limited' });
    // Do not log request bodies, credentials, customer records, or raw SDK errors.
    console.error(JSON.stringify({ event: 'api_error', type: 'internal' }));
    return reply.code(500).send({ code: 'unavailable' });
  });
  return app;
}
