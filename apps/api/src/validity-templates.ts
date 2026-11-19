import { createHash } from 'node:crypto';
import type { Firestore } from 'firebase-admin/firestore';
import type { FastifyInstance } from 'fastify';
import type { components } from '../../../packages/contracts/generated.ts';
import spec from '../../../packages/contracts/openapi.json' with { type: 'json' };
import { Conflict } from './app.ts';
import { PetInvalid } from './pets.ts';
import { validDay } from './balances.ts';
import { requestIdentity } from './request-context.ts';
import { uuidSchema, emptyObjectSchema, containsControlCharacters } from './validation.ts';
type Template = components['schemas']['ValidityTemplate'];
type Write = components['schemas']['ValidityTemplateWrite'];
export interface ValidityTemplateStore {
  list(): Promise<{ items: Template[] }>;
  save(id: string, input: Write, actor: string): Promise<Template>;
}
function project(data: FirebaseFirestore.DocumentData): Template {
  const { id, name, validFrom, validThrough, active, version, createdAt, updatedAt } = data;
  return { id, name, validFrom, validThrough, active, version, createdAt, updatedAt };
}
export function validityTemplateStore(db: Firestore): ValidityTemplateStore {
  return {
    async list() {
      const result = await db.collection('validityTemplates').orderBy('name').get();
      return { items: result.docs.map((doc) => project(doc.data())) };
    },
    async save(id, input, actor) {
      const { operationId, ...fields } = input;
      const signature = createHash('sha256')
        .update(
          JSON.stringify([
            id,
            actor,
            input.version,
            input.name,
            input.validFrom,
            input.validThrough,
            input.active,
          ]),
        )
        .digest('hex');
      return db.runTransaction(async (tx) => {
        const ref = db.doc('validityTemplates/' + id),
          receipt = db.doc('validityTemplateOperations/' + operationId);
        const [old, operation] = await Promise.all([tx.get(ref), tx.get(receipt)]);
        if (operation.exists) {
          if (operation.data()!.signature !== signature) throw new Conflict();
          return project(operation.data()!.result);
        }
        const previous = old.exists ? project(old.data()!) : null;
        if ((previous?.version ?? 0) !== input.version) throw new Conflict();
        const now = new Date().toISOString();
        const next = {
          ...fields,
          id,
          version: input.version + 1,
          createdAt: previous?.createdAt ?? now,
          updatedAt: now,
        };
        tx.set(ref, next);
        tx.create(ref.collection('history').doc(String(next.version)), {
          actor,
          at: now,
          before: previous,
          after: next,
        });
        tx.create(receipt, { signature, actor, at: now, result: next });
        return next;
      });
    },
  };
}
export function validityTemplateRoutes(api: FastifyInstance, store: ValidityTemplateStore) {
  api.register(async (admin) => {
    admin.addHook('onRequest', async (request, reply) => {
      if (requestIdentity(request).admin !== true)
        return reply.code(403).send({ code: 'forbidden' });
    });
    admin.get('/validity-templates', { schema: { querystring: emptyObjectSchema } }, () =>
      store.list(),
    );
    admin.put<{ Params: { id: string }; Body: Write }>(
      '/validity-templates/:id',
      {
        schema: {
          params: {
            type: 'object',
            required: ['id'],
            additionalProperties: false,
            properties: { id: uuidSchema },
          },
          querystring: emptyObjectSchema,
          body: spec.components.schemas.ValidityTemplateWrite,
        },
      },
      (request) => {
        const input = { ...request.body, name: request.body.name.trim() };
        if (
          !input.name ||
          containsControlCharacters(input.name) ||
          !validDay(input.validFrom) ||
          !validDay(input.validThrough) ||
          input.validThrough < input.validFrom
        )
          throw new PetInvalid();
        return store.save(request.params.id, input, requestIdentity(request).uid);
      },
    );
  });
}
