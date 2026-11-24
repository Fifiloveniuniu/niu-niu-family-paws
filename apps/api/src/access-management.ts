import { createHash, timingSafeEqual } from 'node:crypto';
import type { Auth, UserRecord } from 'firebase-admin/auth';
import { FieldPath, type Firestore, type Transaction, type Query } from 'firebase-admin/firestore';
import type { FastifyInstance } from 'fastify';
import type {
  AccessAccount,
  AccessWrite,
  AccessInvitation,
  InvitationWrite,
  AccessRole,
  AccessHistory,
  AccessPage,
} from '../../../packages/access/types.ts';
import { requestIdentity } from './request-context.ts';
import { uuidSchema, emptyObjectSchema, containsControlCharacters } from './validation.ts';
export class AccessError extends Error {
  code: string;
  status: number;
  constructor(code: string, status = 409) {
    super(code);
    this.code = code;
    this.status = status;
  }
}
export const accessKey = (uid: string) => createHash('sha256').update(uid).digest('hex');
const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const google = (user: UserRecord) =>
  !!user.email &&
  user.emailVerified &&
  user.providerData.some((provider) => provider.providerId === 'google.com');
const rolesOf = (user: UserRecord, policy?: FirebaseFirestore.DocumentData): AccessRole[] => [
  ...((policy ? policy.admin === true : user.customClaims?.admin === true)
    ? ['admin' as const]
    : []),
  ...((policy ? policy.employee === true : user.customClaims?.employee === true)
    ? ['employee' as const]
    : []),
  'customer',
];
export function projectAccess(
  user: UserRecord,
  policy?: FirebaseFirestore.DocumentData,
  assignment?: FirebaseFirestore.DocumentData,
): AccessAccount {
  return {
    uid: user.uid,
    name: user.displayName ?? '',
    email: user.email ?? '',
    roles: rolesOf(user, policy),
    houseIds: rolesOf(user, policy).includes('employee') ? (assignment?.houseIds ?? []) : [],
    status: user.disabled
      ? 'disabled'
      : policy && policy.status !== 'active'
        ? 'suspended'
        : 'active',
    version: policy?.version ?? 0,
    assignmentVersion: assignment?.version ?? 0,
  };
}
function normalized(roles: AccessRole[], houseIds: string[]) {
  return {
    roles: (['admin', 'employee', 'customer'] as AccessRole[]).filter(
      (role) => role === 'customer' || roles.includes(role),
    ),
    houseIds: roles.includes('employee') ? [...houseIds].sort() : [],
  };
}
function size(value?: string) {
  const n = Number(value ?? 25);
  if (![25, 50, 100].includes(n)) throw new AccessError('invalid_input', 400);
  return n;
}
function cursor(
  value: string | undefined,
  binding: string,
): { token?: string; offset?: number; at?: string; id?: string } {
  if (!value) return {};
  try {
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString());
    if (parsed.binding !== binding) throw Error();
    return parsed;
  } catch {
    throw new AccessError('invalid_cursor', 400);
  }
}
const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
export function accessManagementStore(
  db: Firestore,
  auth: Pick<Auth, 'getUser' | 'getUserByEmail' | 'listUsers'>,
  clock = Date.now,
) {
  const policyRef = (uid: string) => db.doc('accountAccess/' + accessKey(uid));
  const assignmentRef = (uid: string) => db.doc('employeeAssignments/' + uid);
  const lock = db.doc('accessControl/serialization');
  async function user(uid: string) {
    try {
      const value = await auth.getUser(uid);
      if (!google(value)) throw new AccessError('account_unavailable', 404);
      return value;
    } catch (error) {
      if ((error as { code?: string }).code === 'auth/user-not-found')
        throw new AccessError('account_unavailable', 404);
      throw error;
    }
  }
  async function actor(tx: Transaction, uid: string) {
    const current = await user(uid),
      policy = await tx.get(policyRef(uid));
    const value = projectAccess(current, policy.data());
    if (value.status !== 'active' || !value.roles.includes('admin'))
      throw new AccessError('forbidden', 403);
    return current;
  }
  function audit(tx: Transaction, operationId: string, entry: Omit<AccessHistory, 'id' | 'at'>) {
    tx.create(db.doc('accessHistory/' + operationId), {
      ...entry,
      id: operationId,
      at: new Date(clock()).toISOString(),
    });
  }
  async function validateHouses(tx: Transaction, houseIds: string[]) {
    const docs = await Promise.all(houseIds.map((id) => tx.get(db.doc('houses/' + id))));
    if (docs.some((doc) => !doc.exists)) throw new AccessError('house_unavailable', 400);
  }
  async function protectLastAdmin(tx: Transaction, targetUid: string) {
    // Include unmanaged bootstrap claims and managed policies. All UI writes serialize on lock.
    const managed = await tx.get(db.collection('accountAccess').where('admin', '==', true));
    const candidates = new Set<string>(managed.docs.map((doc) => doc.data().uid));
    let pageToken: string | undefined;
    do {
      const batch = await auth.listUsers(1000, pageToken);
      for (const account of batch.users)
        if (account.customClaims?.admin === true) candidates.add(account.uid);
      pageToken = batch.pageToken;
    } while (pageToken);
    for (const uid of candidates) {
      if (uid === targetUid) continue;
      let current: UserRecord;
      try {
        current = await user(uid);
      } catch (error) {
        if (error instanceof AccessError && error.status === 404) continue;
        throw error;
      }
      const policy = await tx.get(policyRef(uid)),
        account = projectAccess(current, policy.data());
      if (account.status === 'active' && account.roles.includes('admin')) return;
    }
    throw new AccessError('last_admin');
  }
  async function get(uid: string): Promise<AccessAccount> {
    const current = await user(uid);
    const [policy, assignment] = await db.getAll(policyRef(uid), assignmentRef(uid));
    return projectAccess(current, policy.data(), assignment.data());
  }
  async function list(input: {
    cursor?: string;
    search?: string;
    role?: string;
    status?: string;
    pageSize?: string;
  }): Promise<AccessPage<AccessAccount>> {
    const search = (input.search ?? '').trim().toLowerCase(),
      binding = digest([
        'accounts',
        search,
        input.role ?? '',
        input.status ?? '',
        size(input.pageSize),
      ]);
    const start = cursor(input.cursor, binding);
    let token = start.token,
      offset = start.offset ?? 0;
    if (!Number.isInteger(offset) || offset < 0 || offset >= 200)
      throw new AccessError('invalid_cursor', 400);
    const items: AccessAccount[] = [];
    do {
      let batch;
      try {
        batch = await auth.listUsers(200, token);
      } catch (error) {
        if ((error as { code?: string }).code === 'auth/invalid-page-token')
          throw new AccessError('invalid_cursor', 400);
        throw error;
      }
      const eligible = batch.users
        .map((current, index) => ({ current, index }))
        .filter(
          ({ current, index }) =>
            index >= offset &&
            google(current) &&
            /^[A-Za-z0-9_-]{1,128}$/.test(current.uid) &&
            (!search ||
              [current.displayName ?? '', current.email ?? ''].some((value) =>
                value.toLowerCase().includes(search),
              )),
        );
      const snapshots = eligible.length
        ? await db.getAll(
            ...eligible.flatMap(({ current }) => [
              policyRef(current.uid),
              assignmentRef(current.uid),
            ]),
          )
        : [];
      for (let position = 0; position < eligible.length; position++) {
        const { current, index } = eligible[position];
        const policy = snapshots[position * 2],
          assignment = snapshots[position * 2 + 1];
        const value = projectAccess(current, policy.data(), assignment.data());
        if (
          (search &&
            ![value.name, value.email].some((value) => value.toLowerCase().includes(search))) ||
          (input.role && !value.roles.includes(input.role as AccessRole)) ||
          (input.status && value.status !== input.status)
        )
          continue;
        items.push(value);
        if (items.length === size(input.pageSize)) {
          const next =
            index + 1 < batch.users.length
              ? { token, offset: index + 1 }
              : batch.pageToken
                ? { token: batch.pageToken, offset: 0 }
                : null;
          return { items, nextCursor: next ? encode({ ...next, binding }) : null };
        }
      }
      token = batch.pageToken;
      offset = 0;
    } while (token);
    return { items, nextCursor: null };
  }
  async function save(uid: string, input: AccessWrite, actorUid: string) {
    await user(uid);
    const selection = normalized(input.roles, input.houseIds);
    if (
      !input.roles.includes('customer') ||
      !input.reason.trim() ||
      containsControlCharacters(input.reason)
    )
      throw new AccessError('invalid_input', 400);
    const signature = digest([actorUid, uid, input]);
    return db.runTransaction(async (tx) => {
      const acting = await actor(tx, actorUid);
      const current = await user(uid);
      const [policy, assignment, oldLock, receipt] = await Promise.all([
        tx.get(policyRef(uid)),
        tx.get(assignmentRef(uid)),
        tx.get(lock),
        tx.get(db.doc('accessOperations/' + input.operationId)),
      ]);
      if (receipt.exists) {
        if (receipt.data()!.signature !== signature) throw new AccessError('operation_conflict');
        return receipt.data()!.result as AccessAccount;
      }
      const before = projectAccess(current, policy.data(), assignment.data());
      if (current.disabled) throw new AccessError('auth_disabled');
      if (before.version !== input.version || before.assignmentVersion !== input.assignmentVersion)
        throw new AccessError('stale_access');
      if (uid === actorUid && (input.status !== 'active' || !selection.roles.includes('admin')))
        throw new AccessError('self_protection');
      if (
        before.roles.includes('admin') &&
        (input.status !== 'active' || !selection.roles.includes('admin'))
      )
        await protectLastAdmin(tx, uid);
      await validateHouses(tx, selection.houseIds);
      const next = {
        uid,
        admin: selection.roles.includes('admin'),
        employee: selection.roles.includes('employee'),
        status: input.status,
        version: input.version + 1,
      };
      const assigned = {
        houseIds: selection.houseIds,
        version: input.assignmentVersion + 1,
        updatedAt: new Date(clock()).toISOString(),
      };
      const result = projectAccess(current, next, assigned);
      tx.set(policyRef(uid), next);
      tx.set(assignmentRef(uid), assigned);
      tx.set(lock, { version: (oldLock.data()?.version ?? 0) + 1 });
      tx.create(assignmentRef(uid).collection('history').doc(String(assigned.version)), {
        actor: actorUid,
        at: assigned.updatedAt,
        before: assignment.data() ?? null,
        after: assigned,
      });
      audit(tx, input.operationId, {
        actorUid,
        actorEmail: acting.email!,
        action: 'accessChanged',
        email: result.email,
        before,
        after: result,
        reason: input.reason.trim(),
      });
      tx.create(db.doc('accessOperations/' + input.operationId), { signature, result });
      return result;
    });
  }
  const projectInvite = (data: FirebaseFirestore.DocumentData): AccessInvitation => ({
    id: data.id,
    email: data.email,
    roles: data.roles,
    houseIds: data.houseIds,
    status:
      data.status === 'pending' && Date.parse(data.expiresAt) <= clock() ? 'expired' : data.status,
    version: data.version,
    expiresAt: data.expiresAt,
    createdAt: data.createdAt,
  });
  async function page<T>(
    collection: string,
    input: { cursor?: string; pageSize?: string },
    project: (data: FirebaseFirestore.DocumentData) => T,
  ): Promise<AccessPage<T>> {
    const binding = digest([collection, size(input.pageSize)]),
      start = cursor(input.cursor, binding);
    let query: Query = db
      .collection(collection)
      .orderBy('at', 'desc')
      .orderBy(FieldPath.documentId(), 'desc');
    if (input.cursor) {
      if (typeof start.at !== 'string' || typeof start.id !== 'string')
        throw new AccessError('invalid_cursor', 400);
      query = query.startAfter(start.at, start.id);
    }
    const results = await query.limit(size(input.pageSize) + 1).get(),
      docs = results.docs.slice(0, size(input.pageSize)),
      last = docs.at(-1);
    return {
      items: docs.map((doc) => project(doc.data())),
      nextCursor:
        results.size > docs.length && last
          ? encode({ at: last.data().at, id: last.id, binding })
          : null,
    };
  }
  async function createInvitation(
    input: InvitationWrite,
    actorUid: string,
  ): Promise<AccessInvitation> {
    const email = input.email.trim().toLowerCase(),
      selection = normalized(input.roles, input.houseIds);
    if (!input.code.startsWith(input.operationId + '.') || !input.roles.includes('customer'))
      throw new AccessError('invalid_input', 400);
    const signature = digest([actorUid, email, selection, input.operationId, digest(input.code)]);
    return db.runTransaction(async (tx) => {
      const acting = await actor(tx, actorUid),
        ref = db.doc('accessInvitations/' + input.operationId),
        index = db.doc('accessInvitationEmails/' + accessKey(email));
      const [receipt, previous, operation] = await Promise.all([
        tx.get(ref),
        tx.get(index),
        tx.get(db.doc('accessOperations/' + input.operationId)),
      ]);
      if (operation.exists && operation.data()!.signature !== signature)
        throw new AccessError('operation_conflict');
      if (receipt.exists) {
        if (receipt.data()!.signature !== signature) throw new AccessError('operation_conflict');
        return projectInvite(receipt.data()!);
      }
      try {
        await auth.getUserByEmail(email);
        throw new AccessError('duplicate_email');
      } catch (error) {
        if ((error as { code?: string }).code !== 'auth/user-not-found') throw error;
      }
      if (previous.exists) {
        const old = await tx.get(db.doc('accessInvitations/' + previous.data()!.id));
        if (old.exists && projectInvite(old.data()!).status === 'pending')
          throw new AccessError('duplicate_email');
      }
      await validateHouses(tx, selection.houseIds);
      const at = new Date(clock()).toISOString(),
        next = {
          id: input.operationId,
          email,
          ...selection,
          status: 'pending',
          version: 1,
          createdAt: at,
          at,
          expiresAt: new Date(clock() + 86400000).toISOString(),
          digest: digest(input.code),
          actorUid,
          signature,
        };
      const result = projectInvite(next);
      tx.create(ref, next);
      tx.create(db.doc('accessOperations/' + input.operationId), { signature, result });
      tx.set(index, { id: next.id });
      audit(tx, input.operationId, {
        actorUid,
        actorEmail: acting.email!,
        action: 'invitationCreated',
        email,
        before: null,
        after: result,
        reason: '',
      });
      return result;
    });
  }
  async function cancelInvitation(
    id: string,
    input: { version: number; operationId: string },
    actorUid: string,
  ) {
    const signature = digest([actorUid, id, input]);
    return db.runTransaction(async (tx) => {
      const acting = await actor(tx, actorUid),
        ref = db.doc('accessInvitations/' + id);
      const [old, receipt] = await Promise.all([
        tx.get(ref),
        tx.get(db.doc('accessOperations/' + input.operationId)),
      ]);
      if (receipt.exists) {
        if (receipt.data()!.signature !== signature) throw new AccessError('operation_conflict');
        return receipt.data()!.result as AccessInvitation;
      }
      if (!old.exists) throw new AccessError('invitation_unavailable', 404);
      const before = projectInvite(old.data()!);
      if (before.version !== input.version || before.status !== 'pending')
        throw new AccessError('stale_access');
      const after: AccessInvitation = {
        ...before,
        version: before.version + 1,
        status: 'cancelled',
      };
      tx.update(ref, { status: after.status, version: after.version });
      audit(tx, input.operationId, {
        actorUid,
        actorEmail: acting.email!,
        action: 'invitationCancelled',
        email: before.email,
        before,
        after,
        reason: '',
      });
      tx.create(db.doc('accessOperations/' + input.operationId), { signature, result: after });
      return after;
    });
  }
  async function acceptInvitation(
    code: string,
    actorUid: string,
    operationId: string,
  ): Promise<AccessAccount> {
    await user(actorUid);
    const id = code.slice(0, 36),
      signature = digest([actorUid, digest(code), operationId]);
    return db.runTransaction(async (tx) => {
      const current = await user(actorUid);
      if (current.disabled) throw new AccessError('forbidden', 403);
      const ref = db.doc('accessInvitations/' + id);
      const [old, policy, assignment, oldLock, receipt] = await Promise.all([
        tx.get(ref),
        tx.get(policyRef(actorUid)),
        tx.get(assignmentRef(actorUid)),
        tx.get(lock),
        tx.get(db.doc('accessOperations/' + operationId)),
      ]);
      if (receipt.exists) {
        if (receipt.data()!.signature !== signature) throw new AccessError('operation_conflict');
        return receipt.data()!.result as AccessAccount;
      }
      if (!old.exists) throw new AccessError('invitation_unavailable', 404);
      const data = old.data()!,
        invitation = projectInvite(data),
        hash = digest(code);
      if (
        typeof data.digest !== 'string' ||
        data.digest.length !== hash.length ||
        !timingSafeEqual(Buffer.from(data.digest), Buffer.from(hash)) ||
        invitation.status !== 'pending' ||
        current.email!.toLowerCase() !== invitation.email
      )
        throw new AccessError('invitation_unavailable', 404);
      const issuer = await actor(tx, data.actorUid);
      const before = projectAccess(current, policy.data(), assignment.data());
      if (before.status !== 'active' || before.roles.some((role) => role !== 'customer'))
        throw new AccessError('existing_staff_access');
      await validateHouses(tx, invitation.houseIds);
      const next = {
        uid: actorUid,
        admin: invitation.roles.includes('admin'),
        employee: invitation.roles.includes('employee'),
        status: 'active',
        version: before.version + 1,
      };
      const assigned = {
          houseIds: invitation.houseIds,
          version: before.assignmentVersion + 1,
          updatedAt: new Date(clock()).toISOString(),
        },
        result = projectAccess(current, next, assigned);
      tx.set(policyRef(actorUid), next);
      tx.set(assignmentRef(actorUid), assigned);
      tx.set(lock, { version: (oldLock.data()?.version ?? 0) + 1 });
      tx.update(ref, {
        status: 'accepted',
        version: invitation.version + 1,
        acceptedUid: actorUid,
      });
      tx.create(assignmentRef(actorUid).collection('history').doc(String(assigned.version)), {
        actor: actorUid,
        at: assigned.updatedAt,
        before: assignment.data() ?? null,
        after: assigned,
      });
      audit(tx, operationId, {
        actorUid,
        actorEmail: current.email!,
        action: 'invitationAccepted',
        email: result.email,
        before,
        after: result,
        reason: 'issuer:' + issuer.uid,
      });
      tx.create(db.doc('accessOperations/' + operationId), { signature, result });
      return result;
    });
  }
  return {
    get,
    list,
    save,
    createInvitation,
    cancelInvitation,
    acceptInvitation,
    invitation: async (id: string) => {
      const doc = await db.doc('accessInvitations/' + id).get();
      if (!doc.exists) throw new AccessError('invitation_unavailable', 404);
      return projectInvite(doc.data()!);
    },
    invitations: (input: { cursor?: string; pageSize?: string }) =>
      page('accessInvitations', input, projectInvite),
    history: (input: { cursor?: string; pageSize?: string }) =>
      page<AccessHistory>('accessHistory', input, (data) => data as AccessHistory),
  };
}
export type AccessManagementStore = ReturnType<typeof accessManagementStore>;
const rolesSchema = {
  type: 'array',
  minItems: 1,
  maxItems: 3,
  uniqueItems: true,
  items: { enum: ['admin', 'employee', 'customer'] },
};
const housesSchema = { type: 'array', maxItems: 30, uniqueItems: true, items: uuidSchema };
const versionSchema = { type: 'integer', minimum: 0, maximum: 9007199254740990 };
const codeSchema = { type: 'string', pattern: '^[0-9a-f-]{36}\\.[0-9a-f]{48}$', maxLength: 85 };
const pageProperties = {
  cursor: { type: 'string', maxLength: 8192 },
  pageSize: { type: 'string', enum: ['25', '50', '100'] },
};
export function accessManagementRoutes(api: FastifyInstance, store: AccessManagementStore) {
  api.post<{ Body: { code: string; operationId: string } }>(
    '/access/invitations/accept',
    {
      config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
      schema: {
        querystring: emptyObjectSchema,
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['code', 'operationId'],
          properties: { code: codeSchema, operationId: uuidSchema },
        },
      },
    },
    (request) => {
      if (requestIdentity(request).google !== true) throw new AccessError('forbidden', 403);
      return store.acceptInvitation(
        request.body.code,
        requestIdentity(request).uid,
        request.body.operationId,
      );
    },
  );
  api.register(async (admin) => {
    admin.addHook('onRequest', async (request, reply) => {
      if (requestIdentity(request).admin !== true || requestIdentity(request).google !== true)
        return reply.code(403).send({ code: 'forbidden' });
    });
    admin.get<{
      Querystring: {
        cursor?: string;
        pageSize?: string;
        search?: string;
        role?: string;
        status?: string;
      };
    }>(
      '/access/accounts',
      {
        schema: {
          querystring: {
            type: 'object',
            additionalProperties: false,
            properties: {
              ...pageProperties,
              search: { type: 'string', maxLength: 200 },
              role: { enum: ['admin', 'employee', 'customer'] },
              status: { enum: ['active', 'suspended', 'disabled'] },
            },
          },
        },
      },
      (request) => store.list(request.query),
    );
    admin.get<{ Params: { uid: string } }>(
      '/access/accounts/:uid',
      {
        schema: {
          params: {
            type: 'object',
            additionalProperties: false,
            required: ['uid'],
            properties: { uid: { type: 'string', pattern: '^[A-Za-z0-9_-]{1,128}$' } },
          },
          querystring: emptyObjectSchema,
        },
      },
      (request) => store.get(request.params.uid),
    );
    admin.put<{ Params: { uid: string }; Body: AccessWrite }>(
      '/access/accounts/:uid',
      {
        schema: {
          params: {
            type: 'object',
            additionalProperties: false,
            required: ['uid'],
            properties: { uid: { type: 'string', pattern: '^[A-Za-z0-9_-]{1,128}$' } },
          },
          querystring: emptyObjectSchema,
          body: {
            type: 'object',
            additionalProperties: false,
            required: [
              'roles',
              'houseIds',
              'status',
              'version',
              'assignmentVersion',
              'operationId',
              'reason',
            ],
            properties: {
              roles: rolesSchema,
              houseIds: housesSchema,
              status: { enum: ['active', 'suspended'] },
              version: versionSchema,
              assignmentVersion: versionSchema,
              operationId: uuidSchema,
              reason: { type: 'string', minLength: 1, maxLength: 500 },
            },
          },
        },
      },
      (request) => store.save(request.params.uid, request.body, requestIdentity(request).uid),
    );
    for (const path of ['invitations', 'history'] as const)
      admin.get<{ Querystring: { cursor?: string; pageSize?: string } }>(
        '/access/' + path,
        {
          schema: {
            querystring: {
              type: 'object',
              additionalProperties: false,
              properties: pageProperties,
            },
          },
        },
        (request) => store[path](request.query),
      );
    admin.get<{ Params: { id: string } }>(
      '/access/invitations/:id',
      {
        schema: {
          params: {
            type: 'object',
            additionalProperties: false,
            required: ['id'],
            properties: { id: uuidSchema },
          },
          querystring: emptyObjectSchema,
        },
      },
      (request) => store.invitation(request.params.id),
    );
    admin.post<{ Body: InvitationWrite }>(
      '/access/invitations',
      {
        schema: {
          querystring: emptyObjectSchema,
          body: {
            type: 'object',
            additionalProperties: false,
            required: ['email', 'roles', 'houseIds', 'operationId', 'code'],
            properties: {
              email: { type: 'string', format: 'email', maxLength: 254 },
              roles: rolesSchema,
              houseIds: housesSchema,
              operationId: uuidSchema,
              code: codeSchema,
            },
          },
        },
      },
      (request) => store.createInvitation(request.body, requestIdentity(request).uid),
    );
    admin.post<{ Params: { id: string }; Body: { version: number; operationId: string } }>(
      '/access/invitations/:id/cancel',
      {
        schema: {
          params: {
            type: 'object',
            additionalProperties: false,
            required: ['id'],
            properties: { id: uuidSchema },
          },
          querystring: emptyObjectSchema,
          body: {
            type: 'object',
            additionalProperties: false,
            required: ['version', 'operationId'],
            properties: { version: versionSchema, operationId: uuidSchema },
          },
        },
      },
      (request) =>
        store.cancelInvitation(request.params.id, request.body, requestIdentity(request).uid),
    );
  });
}
