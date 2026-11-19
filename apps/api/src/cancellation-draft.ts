import { createHash } from 'node:crypto';
import type { Firestore } from 'firebase-admin/firestore';
import type { FastifyInstance } from 'fastify';
import type { components } from '../../../packages/contracts/generated.ts';
import spec from '../../../packages/contracts/openapi.json' with { type: 'json' };
import { Conflict } from './app.ts';
import { PetInvalid } from './pets.ts';
import { requestIdentity } from './request-context.ts';
import { emptyObjectSchema, containsControlCharacters } from './validation.ts';
type Draft = components['schemas']['CancellationDraft'];
type Write = components['schemas']['CancellationDraftWrite'];
export interface CancellationDraftStore {
  read(): Promise<Draft | null>;
  save(input: Write, actor: string): Promise<Draft>;
}
function project(data: FirebaseFirestore.DocumentData): Draft {
  const { name, fullDays, halfDays, shortPercent, basis, version, updatedAt } = data;
  return { name, fullDays, halfDays, shortPercent, basis, version, updatedAt };
}
export function cancellationDraftStore(db: Firestore): CancellationDraftStore {
  const ref = db.doc('businessSettings/cancellationDraft');
  return {
    async read() {
      const doc = await ref.get();
      return doc.exists ? project(doc.data()!) : null;
    },
    async save(input, actor) {
      const signature = createHash('sha256')
        .update(
          JSON.stringify([
            actor,
            input.version,
            input.name,
            input.fullDays,
            input.halfDays,
            input.shortPercent,
            input.basis,
          ]),
        )
        .digest('hex');
      return db.runTransaction(async (tx) => {
        const opRef = db.doc('cancellationDraftOperations/' + input.operationId);
        const [old, op] = await Promise.all([tx.get(ref), tx.get(opRef)]);
        if (op.exists) {
          if (op.data()!.signature !== signature) throw new Conflict();
          return project(op.data()!.result);
        }
        const previous = old.exists ? project(old.data()!) : null;
        if ((previous?.version ?? 0) !== input.version) throw new Conflict();
        const next = {
          name: input.name,
          fullDays: input.fullDays,
          halfDays: input.halfDays,
          shortPercent: input.shortPercent,
          basis: input.basis,
          version: input.version + 1,
          updatedAt: new Date().toISOString(),
        };
        tx.set(ref, next);
        tx.create(ref.collection('history').doc(String(next.version)), {
          actor,
          at: next.updatedAt,
          before: previous,
          after: next,
        });
        tx.create(opRef, { signature, actor, at: next.updatedAt, result: next });
        return next;
      });
    },
  };
}
export function cancellationDraftRoutes(api: FastifyInstance, store: CancellationDraftStore) {
  api.register(async (admin) => {
    admin.addHook('onRequest', async (req, reply) => {
      if (requestIdentity(req).admin !== true) return reply.code(403).send({ code: 'forbidden' });
    });
    admin.get(
      '/settings/cancellation-draft',
      { schema: { querystring: emptyObjectSchema } },
      async (_req, reply) => {
        const draft = await store.read();
        return draft ?? reply.code(204).send();
      },
    );
    admin.put<{ Body: Write }>(
      '/settings/cancellation-draft',
      {
        schema: {
          querystring: emptyObjectSchema,
          body: spec.components.schemas.CancellationDraftWrite,
        },
      },
      (req) => {
        const input = { ...req.body, name: req.body.name.trim() };
        if (containsControlCharacters(input.name) || input.fullDays <= input.halfDays)
          throw new PetInvalid();
        return store.save(input, requestIdentity(req).uid);
      },
    );
  });
}
