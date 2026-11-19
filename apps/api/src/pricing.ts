import { createHash } from 'node:crypto';
import type { Firestore } from 'firebase-admin/firestore';
import type { FastifyInstance } from 'fastify';
import type { components } from '../../../packages/contracts/generated.ts';
import spec from '../../../packages/contracts/openapi.json' with { type: 'json' };
import supplied from '../../../packages/pricing/source-rates.json' with { type: 'json' };
import {
  boardingRate,
  type PriceRate,
  type PricingConfig,
} from '../../../packages/pricing/calculations.ts';
import { Conflict } from './app.ts';
import { PetInvalid } from './pets.ts';
import { validDay } from './balances.ts';
import { requestIdentity } from './request-context.ts';
import { emptyObjectSchema, containsControlCharacters } from './validation.ts';
type Write = components['schemas']['PricingWrite'];
export const initialPricing = (): PricingConfig => ({
  rates: structuredClone(supplied) as PriceRate[],
  holidays: [],
  holidayPercent: 20,
  version: 0,
  updatedAt: null,
});
export interface PricingStore {
  get(): Promise<PricingConfig>;
  save(input: Write, actor: string): Promise<PricingConfig>;
}
export function validatePricing(input: Write) {
  const ids = new Set<string>();
  for (const rate of input.rates) {
    if (
      ids.has(rate.id) ||
      !rate.name.trim() ||
      !rate.nameZh.trim() ||
      [rate.name, rate.nameZh, rate.source].some(containsControlCharacters) ||
      rate.minCents > rate.maxCents
    )
      throw new PetInvalid();
    ids.add(rate.id);
    if (rate.kind === 'boarding') {
      if (
        rate.minWeightLb === null ||
        rate.maxWeightLb === null ||
        rate.maxWeightLb <= rate.minWeightLb ||
        rate.days !== null
      )
        throw new PetInvalid();
      try {
        boardingRate([rate], rate.species, rate.minWeightLb);
        boardingRate([rate], rate.species, rate.maxWeightLb);
      } catch {
        throw new PetInvalid();
      }
    } else if (
      rate.minWeightLb !== null ||
      rate.maxWeightLb !== null ||
      rate.minCents !== rate.maxCents
    )
      throw new PetInvalid();
    if (rate.kind === 'package') {
      if (!rate.days) throw new PetInvalid();
      if ((rate.comparisonRateId === null) !== (rate.comparisonWeightLb === null))
        throw new PetInvalid();
      if (rate.active && rate.comparisonRateId) {
        let regular;
        try {
          regular = boardingRate(input.rates, rate.species, rate.comparisonWeightLb!);
        } catch {
          throw new PetInvalid();
        }
        if (!regular || regular.rate.id !== rate.comparisonRateId) throw new PetInvalid();
      }
    } else if (
      rate.days !== null ||
      rate.comparisonRateId !== null ||
      rate.comparisonWeightLb !== null
    )
      throw new PetInvalid();
  }
  for (const species of ['dog', 'cat', 'rabbit']) {
    const bands = input.rates
      .filter((rate) => rate.active && rate.kind === 'boarding' && rate.species === species)
      .sort((a, b) => a.minWeightLb! - b.minWeightLb!);
    for (let i = 1; i < bands.length; i++)
      if (bands[i].minWeightLb! < bands[i - 1].maxWeightLb!) throw new PetInvalid();
  }
  if (input.holidays.some((day) => !validDay(day))) throw new PetInvalid();
}
export function pricingStore(db: Firestore): PricingStore {
  const ref = db.doc('configuration/pricing');
  return {
    async get() {
      const doc = await ref.get();
      return doc.exists ? (doc.data() as PricingConfig) : initialPricing();
    },
    async save(input, actor) {
      validatePricing(input);
      const { operationId, ...fields } = input;
      const signature = createHash('sha256')
        .update(JSON.stringify([actor, fields]))
        .digest('hex');
      return db.runTransaction(async (tx) => {
        const receipt = db.doc('pricingOperations/' + operationId);
        const [old, operation] = await Promise.all([tx.get(ref), tx.get(receipt)]);
        if (operation.exists) {
          if (operation.data()!.signature !== signature) throw new Conflict();
          return operation.data()!.result as PricingConfig;
        }
        const previous = old.exists ? (old.data() as PricingConfig) : initialPricing();
        if (previous.version !== input.version) throw new Conflict();
        // Preserve referenced historical rows: archive instead of erasing them from configuration.
        if (previous.rates.some((rate) => !input.rates.some((next) => next.id === rate.id)))
          throw new PetInvalid();
        const next = { ...fields, version: input.version + 1, updatedAt: new Date().toISOString() };
        tx.set(ref, next);
        tx.create(ref.collection('history').doc(String(next.version)), {
          actor,
          at: next.updatedAt,
          before: previous,
          after: next,
        });
        tx.create(receipt, { signature, actor, result: next });
        return next;
      });
    },
  };
}
export function pricingRoutes(api: FastifyInstance, store: PricingStore) {
  api.register(async (admin) => {
    admin.addHook('onRequest', async (request, reply) => {
      if (requestIdentity(request).admin !== true)
        return reply.code(403).send({ code: 'forbidden' });
    });
    admin.get('/pricing', { schema: { querystring: emptyObjectSchema } }, () => store.get());
    admin.put<{ Body: Write }>(
      '/pricing',
      {
        bodyLimit: 262144,
        schema: {
          querystring: emptyObjectSchema,
          body: {
            ...spec.components.schemas.PricingWrite,
            properties: {
              ...spec.components.schemas.PricingWrite.properties,
              rates: {
                ...spec.components.schemas.PricingWrite.properties.rates,
                items: spec.components.schemas.PriceRate,
              },
            },
          },
        },
      },
      (request) => {
        validatePricing(request.body);
        return store.save(request.body, requestIdentity(request).uid);
      },
    );
  });
}
