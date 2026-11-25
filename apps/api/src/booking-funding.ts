import { createHash } from 'node:crypto';
import type { Firestore } from 'firebase-admin/firestore';
import type { components } from '../../../packages/contracts/generated.ts';
import type { FundingQuote, TestCard } from '../../../packages/payments/types.ts';
import { initialPricing } from './pricing.ts';
import { estimateBoarding } from '../../../packages/pricing/estimate.ts';
import { boardingRate } from '../../../packages/pricing/calculations.ts';
import type { PricingConfig } from '../../../packages/pricing/calculations.ts';
import { PetInvalid } from './pets.ts';
export function houseDay(instant: string, zone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(instant));
  return ['year', 'month', 'day'].map((key) => parts.find((p) => p.type === key)!.value).join('-');
}
export async function bookingFunding(
  db: Firestore,
  tx: FirebaseFirestore.Transaction,
  input: components['schemas']['BookingWrite'],
  pet: components['schemas']['Pet'],
  timezone: string,
) {
  const accountRef = db.doc(`customers/${input.customerId}/pets/${input.petId}/balances/boarding`);
  const cardRef = db.doc(`customers/${input.customerId}/testPayments/card`);
  const [accountDoc, cardDoc, pricingDoc] = await Promise.all([
    tx.get(accountRef),
    tx.get(cardRef),
    tx.get(db.doc('configuration/pricing')),
  ]);
  const account = accountDoc.exists
    ? (accountDoc.data() as components['schemas']['BoardingAccount'])
    : null;
  const card = cardDoc.exists ? (cardDoc.data() as TestCard) : null;
  const config = pricingDoc.exists ? (pricingDoc.data() as PricingConfig) : initialPricing();
  const first = houseDay(input.arrival, timezone),
    last = houseDay(input.pickup, timezone);
  const estimate = estimateBoarding(config, pet.species ?? '', pet.weightKg, first, last);
  if (!estimate) throw new PetInvalid();
  const eligible =
    account && account.validFrom <= first && account.validThrough >= last ? account.days : 0;
  const balanceDays = Math.min(eligible, estimate.days),
    uncoveredDays = estimate.days - balanceDays;
  // A single saved pet rate applies to every base day; holiday fees remain separate.
  const rate = pet.weightKg
    ? boardingRate(
        config.rates,
        pet.species ?? '',
        Math.round(pet.weightKg * 2.2046226218 * 1e6) / 1e6,
      )
    : null;
  const baseCard =
    uncoveredDays === 0
      ? 0
      : rate
        ? Number((rate.numerator * BigInt(uncoveredDays)) / rate.denominator)
        : null;
  const holidayCents = estimate.holidayDays === 0 ? 0 : estimate.surchargeCents;
  const cardCents = baseCard === null || holidayCents === null ? null : baseCard + holidayCents;
  const issue: FundingQuote['issue'] =
    cardCents === null
      ? 'price_missing'
      : cardCents > 0 && (!card || card.scenario === 'none')
        ? 'payment_required'
        : null;
  const fields = {
    testMode: true as const,
    pricingVersion: config.version,
    rate: rate?.rate ?? null,
    weightKg: pet.weightKg ?? null,
    firstDay: first,
    lastDay: last,
    holidayDates: config.holidays.filter((day) => day >= first && day <= last),
    balanceValidFrom: account?.validFrom ?? null,
    balanceValidThrough: account?.validThrough ?? null,
    days: estimate.days,
    balanceDays,
    uncoveredDays,
    balanceAfter: (account?.days ?? 0) - balanceDays,
    cardCents,
    holidayCents,
    last4: card?.last4 ?? null,
    issue,
  };
  const token = createHash('sha256')
    .update(
      JSON.stringify([
        input.customerId,
        input.petId,
        input.houseId,
        input.roomId,
        input.arrival,
        input.pickup,
        account?.version ?? 0,
        card?.version ?? 0,
        config.version,
        fields,
      ]),
    )
    .digest('hex');
  const quote: FundingQuote = { ...fields, token };
  return { quote, account, accountRef, cardRef, card, config };
}
