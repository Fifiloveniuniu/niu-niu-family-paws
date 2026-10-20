import Fastify from 'fastify';
import rateLimit from '@fastify/rate-limit';
import spec from '../../../packages/contracts/openapi.json' with { type: 'json' };
import type { components } from '../../../packages/contracts/generated.ts';

type Customer = components['schemas']['Customer'];
type CustomerWrite = components['schemas']['CustomerWrite'];
export type Identity = { uid: string; admin?: unknown; email_verified?: unknown };
export interface CustomerStore {
  list(cursor?: string, search?: string): Promise<{ items: Customer[]; nextCursor: string | null }>;
  save(id: string, input: CustomerWrite, actor: string): Promise<Customer>;
}
export class Conflict extends Error {}
export function buildApp(deps: { verify: (token: string) => Promise<Identity>; store: CustomerStore }) {
  const app = Fastify({ logger: false, bodyLimit: 16_384, ajv: { customOptions: { removeAdditional: false, coerceTypes: false } } });
  app.register(rateLimit, { max: 120, timeWindow: '1 minute' });
  app.addHook('onRequest', async (_request, reply) => {
    reply.header('Cache-Control', 'private, no-store').header('X-Content-Type-Options', 'nosniff');
  });
  app.get('/health', async () => ({ ok: true }));
  app.register(async api => {
    api.decorateRequest('actor', '');
    api.addHook('onRequest', async (request, reply) => {
      const match = /^Bearer ([^\s]+)$/.exec(request.headers.authorization || '');
      if (!match) return reply.code(401).send({ code: 'unauthenticated' });
      let identity: Identity;
      try { identity = await deps.verify(match[1]); }
      catch { return reply.code(401).send({ code: 'unauthenticated' }); }
      if (identity.admin !== true || identity.email_verified !== true) return reply.code(403).send({ code: 'forbidden' });
      (request as typeof request & { actor: string }).actor = identity.uid;
    });
    const uuid = { type: 'string', pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' };
    api.get<{ Querystring: { cursor?: string; search?: string } }>('/customers', {
      schema: { querystring: { type: 'object', additionalProperties: false, properties: { cursor: uuid, search: { type: 'string', maxLength: 254 } } } },
    }, request => deps.store.list(request.query.cursor, request.query.search?.trim().toLowerCase()));
    api.put<{ Params: { id: string }; Body: CustomerWrite }>('/customers/:id', {
      schema: { params: { type: 'object', required: ['id'], additionalProperties: false, properties: { id: uuid } }, body: spec.components.schemas.CustomerWrite },
    }, async (request, reply) => {
      const input = { ...request.body, name: request.body.name.trim(), email: request.body.email.trim(), phone: request.body.phone.trim() };
      if (!input.name || (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) || /[\u0000-\u001f\u007f]/.test(input.name + input.email + input.phone)) {
        return reply.code(400).send({ code: 'invalid_input' });
      }
      return deps.store.save(request.params.id, input, (request as typeof request & { actor: string }).actor);
    });
  }, { prefix: '/api' });
  app.setErrorHandler((error: Error & { validation?: unknown; statusCode?: number }, _request, reply) => {
    if (error instanceof Conflict) return reply.code(409).send({ code: 'conflict' });
    if (error.validation) return reply.code(400).send({ code: 'invalid_input' });
    if (error.statusCode === 429) return reply.code(429).send({ code: 'rate_limited' });
    // Do not log request bodies, credentials, customer records, or raw SDK errors.
    console.error(JSON.stringify({ event: 'api_error', type: 'internal' }));
    return reply.code(500).send({ code: 'unavailable' });
  });
  return app;
}
