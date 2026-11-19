import { createHash } from 'node:crypto';
import type { Firestore } from 'firebase-admin/firestore';
import type { Auth, UserRecord } from 'firebase-admin/auth';
import type { FastifyInstance } from 'fastify';
import { requestIdentity } from './request-context.ts';
import { Conflict } from './app.ts';
import { PetInvalid, PetMissing } from './pets.ts';
import { uuidSchema, emptyObjectSchema } from './validation.ts';
export type EmployeeAssignment = {
  uid: string;
  email: string;
  name: string;
  houseIds: string[];
  version: number;
};
type Write = { houseIds: string[]; version: number; operationId: string };
export interface EmployeeAssignmentStore {
  lookup(email: string): Promise<EmployeeAssignment>;
  save(uid: string, input: Write, actor: string): Promise<EmployeeAssignment>;
}
export function employeeAssignmentStore(
  db: Firestore,
  auth: Pick<Auth, 'getUser' | 'getUserByEmail'>,
): EmployeeAssignmentStore {
  async function employee(find: () => Promise<UserRecord>) {
    let user: UserRecord;
    try {
      user = await find();
    } catch (error) {
      if ((error as { code?: string }).code === 'auth/user-not-found') throw new PetMissing();
      throw error;
    }
    if (
      user.disabled ||
      !user.emailVerified ||
      user.customClaims?.employee !== true ||
      !user.providerData.some((provider) => provider.providerId === 'google.com') ||
      !user.email
    )
      throw new PetMissing();
    return user;
  }
  const project = (
    user: UserRecord,
    data?: FirebaseFirestore.DocumentData,
  ): EmployeeAssignment => ({
    uid: user.uid,
    email: user.email!,
    name: user.displayName ?? '',
    houseIds: data?.houseIds ?? [],
    version: data?.version ?? 0,
  });
  return {
    async lookup(email) {
      const user = await employee(() => auth.getUserByEmail(email));
      const record = await db.doc('employeeAssignments/' + user.uid).get();
      return project(user, record.data());
    },
    async save(uid, input, actor) {
      const user = await employee(() => auth.getUser(uid));
      const houseIds = [...input.houseIds].sort();
      if (new Set(houseIds).size !== houseIds.length) throw new PetInvalid();
      const signature = createHash('sha256')
        .update(JSON.stringify([actor, uid, input.version, houseIds]))
        .digest('hex');
      return db.runTransaction(async (tx) => {
        const ref = db.doc('employeeAssignments/' + uid),
          receipt = db.doc('employeeAssignmentOperations/' + input.operationId);
        const [old, operation, ...houses] = await Promise.all([
          tx.get(ref),
          tx.get(receipt),
          ...houseIds.map((id) => tx.get(db.doc('houses/' + id))),
        ]);
        if (operation.exists) {
          if (operation.data()!.signature !== signature) throw new Conflict();
          return operation.data()!.result;
        }
        if ((old.data()?.version ?? 0) !== input.version) throw new Conflict();
        if (houses.some((doc) => !doc.exists)) throw new PetInvalid();
        const next = { houseIds, version: input.version + 1, updatedAt: new Date().toISOString() },
          result = project(user, next);
        tx.set(ref, next);
        tx.create(ref.collection('history').doc(String(next.version)), {
          actor,
          at: next.updatedAt,
          before: old.exists ? old.data() : null,
          after: next,
        });
        tx.create(receipt, { signature, actor, result });
        return result;
      });
    },
  };
}
export function employeeAssignmentRoutes(api: FastifyInstance, store: EmployeeAssignmentStore) {
  api.register(async (admin) => {
    admin.addHook('onRequest', async (request, reply) => {
      if (requestIdentity(request).admin !== true)
        return reply.code(403).send({ code: 'forbidden' });
    });
    admin.get<{ Querystring: { email: string } }>(
      '/employee-assignments',
      {
        schema: {
          querystring: {
            type: 'object',
            additionalProperties: false,
            required: ['email'],
            properties: { email: { type: 'string', format: 'email', maxLength: 254 } },
          },
        },
      },
      (request) => store.lookup(request.query.email.toLowerCase()),
    );
    admin.put<{ Params: { uid: string }; Body: Write }>(
      '/employee-assignments/:uid',
      {
        schema: {
          params: {
            type: 'object',
            additionalProperties: false,
            required: ['uid'],
            properties: {
              uid: { type: 'string', minLength: 1, maxLength: 128, pattern: '^[A-Za-z0-9_-]+$' },
            },
          },
          querystring: emptyObjectSchema,
          body: {
            type: 'object',
            additionalProperties: false,
            required: ['houseIds', 'version', 'operationId'],
            properties: {
              houseIds: { type: 'array', maxItems: 30, uniqueItems: true, items: uuidSchema },
              version: { type: 'integer', minimum: 0, maximum: 9007199254740990 },
              operationId: uuidSchema,
            },
          },
        },
      },
      (request) => store.save(request.params.uid, request.body, requestIdentity(request).uid),
    );
  });
}
