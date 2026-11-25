import type { PriceRate } from '../pricing/calculations.ts';
export type TestCard = {
  scenario: 'approved' | 'declined' | 'none';
  last4: string | null;
  version: number;
};
export type FundingQuote = {
  testMode: true;
  days: number;
  balanceDays: number;
  uncoveredDays: number;
  balanceAfter: number;
  cardCents: number | null;
  holidayCents: number | null;
  last4: string | null;
  issue: 'payment_required' | 'price_missing' | null;
  token: string;
  pricingVersion: number;
  rate: PriceRate | null;
  weightKg: number | null;
  firstDay: string;
  lastDay: string;
  holidayDates: string[];
  balanceValidFrom: string | null;
  balanceValidThrough: string | null;
};
export type TestCharge = {
  id: string;
  bookingId: string;
  amountCents: number;
  last4: string;
  at: string;
};
export type TestPaymentRead = { card: TestCard; charges: TestCharge[]; nextCursor: string | null };
