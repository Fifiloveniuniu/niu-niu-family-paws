import { validityTemplateRoutes, type ValidityTemplateStore } from './validity-templates.ts';
import { cancellationDraftRoutes, type CancellationDraftStore } from './cancellation-draft.ts';
import { pricingRoutes, type PricingStore } from './pricing.ts';
import { employeeAssignmentRoutes, type EmployeeAssignmentStore } from './employee-assignments.ts';
import { operationsRoutes, type OperationsStore } from './operations.ts';
import { uuidSchema, emptyObjectSchema, containsControlCharacters } from './validation.ts';
import { requestIdentity, type Identity, type ProfileIdentity } from './request-context.ts';
import Fastify, { type FastifyRequest } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import spec from '../../../packages/contracts/openapi.json' with { type: 'json' };
import type { components } from '../../../packages/contracts/generated.ts';
import { petRoutes, PetAccess, PetMissing, PetInvalid, type PetStore } from './pets.ts';
import { workspaceRoutes, type WorkspaceStore } from './workspace.ts';
import {
  bookingRoutes,
  BookingConflict,
  BookingPolicyMissing,
  type BookingStore,
} from './bookings.ts';
import { balanceRoutes, type BalanceStore } from './balances.ts';
import { roomRoutes, type RoomStore } from './rooms.ts';
import { houseRoutes, type HouseStore } from './houses.ts';
import { linkRoutes, LinkUnavailable, type LinkStore } from './linking.ts';

type Customer = components['schemas']['Customer'];
type CustomerWrite = components['schemas']['CustomerWrite'];
type ProfileWrite = components['schemas']['ProfileWrite'];
export type { Identity, ProfileIdentity } from './request-context.ts';
export interface CustomerStore {
  list(
    cursor?: string,
    search?: string,
    pageSize?: string,
  ): Promise<{ items: Customer[]; nextCursor: string | null }>;
  save(id: string, input: CustomerWrite, actor: string): Promise<Customer>;
  profile(identity: ProfileIdentity): Promise<Customer | null>;
  saveProfile(identity: ProfileIdentity, input: ProfileWrite): Promise<Customer>;
}
export class Conflict extends Error {}
export function buildApp(deps: {
  validityTemplates?: ValidityTemplateStore;
  cancellationDraft?: CancellationDraftStore;
  pricing?: PricingStore;
  operations?: OperationsStore;
  employeeAssignments?: EmployeeAssignmentStore;
  verify: (token: string) => Promise<Identity>;
  store: CustomerStore;
  pets?: PetStore;
  links?: LinkStore;
  houses?: HouseStore;
  rooms?: RoomStore;
  balances?: BalanceStore;
  bookings?: BookingStore;
  workspace?: WorkspaceStore;
}) {
  const app = Fastify({
    logger: false,
    bodyLimit: 16_384,
    ajv: { customOptions: { removeAdditional: false, coerceTypes: false } },
  });
  app.register(rateLimit, {
    timeWindow: '1 minute',
    max: (request) => (requestIdentity(request)?.uid ? 600 : 120),
    keyGenerator: (request) =>
      requestIdentity(request)?.uid ? 'user:' + requestIdentity(request).uid : 'ip:' + request.ip,
  });
  app.addHook('onRequest', async (_request, reply) => {
    reply.header('Cache-Control', 'private, no-store').header('X-Content-Type-Options', 'nosniff');
  });
  app.get('/health', async () => ({ ok: true }));
  if (deps.pricing)
    app.get('/api/public/pricing', { schema: { querystring: emptyObjectSchema } }, async () => {
      const config = await deps.pricing!.get();
      return { ...config, rates: config.rates.filter((rate) => rate.active) };
    });
  app.register(
    async (api) => {
      api.decorateRequest('identity', null);
      api.addHook('onRequest', async (request, reply) => {
        const match = /^Bearer ([^\s]+)$/.exec(request.headers.authorization || '');
        if (!match) return reply.code(401).send({ code: 'unauthenticated' });
        let identity: Identity;
        try {
          identity = await deps.verify(match[1]);
        } catch {
          return reply.code(401).send({ code: 'unauthenticated' });
        }
        if (identity.email_verified !== true) return reply.code(403).send({ code: 'forbidden' });
        (request as typeof request & { identity: Identity }).identity = identity;
      });
      if (deps.employeeAssignments) employeeAssignmentRoutes(api, deps.employeeAssignments);
      if (deps.operations) operationsRoutes(api, deps.operations);
      if (deps.pricing) pricingRoutes(api, deps.pricing);
      if (deps.cancellationDraft) cancellationDraftRoutes(api, deps.cancellationDraft);
      if (deps.validityTemplates) validityTemplateRoutes(api, deps.validityTemplates);
      if (deps.workspace) workspaceRoutes(api, deps.workspace);
      if (deps.bookings) bookingRoutes(api, deps.bookings);
      if (deps.balances) balanceRoutes(api, deps.balances);
      if (deps.rooms) roomRoutes(api, deps.rooms);
      if (deps.houses) houseRoutes(api, deps.houses);
      if (deps.pets) petRoutes(api, deps.pets);
      if (deps.links) linkRoutes(api, deps.links);
      api.register(async (own) => {
        own.addHook('onRequest', async (request, reply) => {
          const identity = requestIdentity(request);
          if (identity.google !== true || !identity.email)
            return reply.code(403).send({ code: 'forbidden' });
        });
        const owner = (request: FastifyRequest): ProfileIdentity => ({
          uid: requestIdentity(request).uid,
          email: requestIdentity(request).email!,
        });
        own.get(
          '/profile',
          { schema: { querystring: emptyObjectSchema } },
          async (request, reply) => {
            const profile = await deps.store.profile(owner(request));
            return profile ?? reply.code(204).send();
          },
        );
        own.put<{ Body: ProfileWrite }>(
          '/profile',
          {
            schema: { querystring: emptyObjectSchema, body: spec.components.schemas.ProfileWrite },
          },
          async (request, reply) => {
            const input = { ...request.body, name: request.body.name.trim() };
            if (!input.name || containsControlCharacters(input.name))
              return reply.code(400).send({ code: 'invalid_input' });
            return deps.store.saveProfile(owner(request), input);
          },
        );
      });
      api.register(async (admin) => {
        admin.addHook('onRequest', async (request, reply) => {
          if (requestIdentity(request).admin !== true)
            return reply.code(403).send({ code: 'forbidden' });
        });
        admin.get<{ Querystring: { cursor?: string; search?: string; pageSize?: string } }>(
          '/customers',
          {
            schema: {
              querystring: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  cursor: uuidSchema,
                  search: { type: 'string', maxLength: 254 },
                  pageSize: { type: 'string', enum: ['25', '50', '100'] },
                },
              },
            },
          },
          (request) =>
            deps.store.list(
              request.query.cursor,
              request.query.search?.trim().toLowerCase(),
              request.query.pageSize,
            ),
        );
        admin.put<{ Params: { id: string }; Body: CustomerWrite }>(
          '/customers/:id',
          {
            schema: {
              params: {
                type: 'object',
                required: ['id'],
                additionalProperties: false,
                properties: { id: uuidSchema },
              },
              body: spec.components.schemas.CustomerWrite,
            },
          },
          async (request, reply) => {
            const input = {
              ...request.body,
              name: request.body.name.trim(),
              email: request.body.email.trim(),
              phone: request.body.phone.trim(),
            };
            if (
              !input.name ||
              (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) ||
              containsControlCharacters(input.name + input.email + input.phone)
            ) {
              return reply.code(400).send({ code: 'invalid_input' });
            }
            return deps.store.save(request.params.id, input, requestIdentity(request).uid);
          },
        );
      });
    },
    { prefix: '/api' },
  );
  app.setErrorHandler(
    (
      error: Error & { validation?: unknown; statusCode?: number; code?: number | string },
      _request,
      reply,
    ) => {
      if (error instanceof BookingConflict)
        return reply.code(409).send({ code: 'booking_conflict', issue: error.issue });
      if (error instanceof BookingPolicyMissing)
        return reply.code(409).send({ code: 'booking_policy_unconfigured' });
      if (error instanceof Conflict || error instanceof LinkUnavailable || error.code === 10)
        return reply.code(409).send({ code: 'conflict' });
      if (error instanceof PetAccess) return reply.code(403).send({ code: 'forbidden' });
      if (error instanceof PetMissing) return reply.code(404).send({ code: 'not_found' });
      if (error instanceof PetInvalid || error.statusCode === 413)
        return reply.code(400).send({ code: 'invalid_input' });
      if (error.validation) return reply.code(400).send({ code: 'invalid_input' });
      if (error.statusCode === 429) return reply.code(429).send({ code: 'rate_limited' });
      // Do not log request bodies, credentials, customer records, or raw SDK errors.
      console.error(JSON.stringify({ event: 'api_error', type: 'internal' }));
      return reply.code(500).send({ code: 'unavailable' });
    },
  );
  return app;
}
