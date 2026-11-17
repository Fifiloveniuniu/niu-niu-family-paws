import { isValidDateOnly } from './date-utils.ts';
/** In-memory planning records only. No payment, purchase, reservation or deduction API. */
export type BalanceService = 'boarding';
export type BalanceHistory = {
  id: string;
  delta: number;
  reason: string;
  at: string;
  after: number;
  signature: string;
};
export type PetBalance = {
  pet: string;
  service: BalanceService;
  days: number;
  validFrom: string;
  validThrough: string;
  version: number;
  history: BalanceHistory[];
};
export type PlannedCoverage = {
  id: string;
  pet: string;
  service: BalanceService;
  days: number;
  startDate: string;
  endDate: string;
};
export type CoverageCode = 'ok' | 'missing' | 'required' | 'dates' | 'coverage' | 'insufficient';
export const balanceKey = (pet: string, service: BalanceService) => JSON.stringify([pet, service]);
export function plannedDays(
  plans: PlannedCoverage[],
  pet: string,
  service: BalanceService,
  excludeId?: string,
) {
  return plans
    .filter((plan) => plan.pet === pet && plan.service === service && plan.id !== excludeId)
    .reduce((totalDays, plan) => totalDays + plan.days, 0);
}
export function validatePetCoverage(
  account: PetBalance | undefined,
  pet: string,
  service: BalanceService,
  days: number,
  startDate: string,
  endDate: string,
  plans: PlannedCoverage[] = [],
  excludeId?: string,
): { code: CoverageCode; available: number; after: number } {
  const matchesAccount = account?.pet === pet && account.service === service;
  const available = matchesAccount ? account.days - plannedDays(plans, pet, service, excludeId) : 0;
  const result = (code: CoverageCode) => ({ code, available, after: available - days });
  if (!account || account.pet !== pet || account.service !== service) return result('missing');
  if (!Number.isSafeInteger(days) || days <= 0) return result('required');
  if (!isValidDateOnly(startDate) || !isValidDateOnly(endDate) || endDate < startDate)
    return result('dates');
  if (
    !isValidDateOnly(account.validFrom) ||
    !isValidDateOnly(account.validThrough) ||
    account.validFrom > startDate ||
    account.validThrough < endDate
  )
    return result('coverage');
  if (available < days) return result('insufficient');
  return result('ok');
}
export type BalanceChange = {
  id: string;
  pet: string;
  service: BalanceService;
  version: number;
  delta: number;
  reason: string;
  validFrom: string;
  validThrough: string;
};
export function changePetBalance(
  current: PetBalance | undefined,
  change: BalanceChange,
  plans: PlannedCoverage[],
  at: string,
): PetBalance {
  const signature = JSON.stringify(change);
  const previousOperation = current?.history.find((entry) => entry.id === change.id);
  if (previousOperation) {
    if (previousOperation.signature !== signature) throw Error('operation');
    return current!;
  }
  if ((current?.version || 0) !== change.version) throw Error('version');
  if (current && (current.pet !== change.pet || current.service !== change.service))
    throw Error('identity');
  if (!Number.isSafeInteger(change.delta) || (!current && change.delta <= 0))
    throw Error('adjustment');
  if (
    !isValidDateOnly(change.validFrom) ||
    !isValidDateOnly(change.validThrough) ||
    change.validThrough < change.validFrom
  )
    throw Error('terms');
  const days = (current?.days || 0) + change.delta;
  if (!Number.isSafeInteger(days) || days < 0) throw Error('negative');
  const account: PetBalance = {
    pet: change.pet,
    service: change.service,
    days,
    validFrom: change.validFrom,
    validThrough: change.validThrough,
    version: change.version + 1,
    history: [
      ...(current?.history || []),
      {
        id: change.id,
        delta: change.delta,
        reason: change.reason.trim(),
        at,
        after: days,
        signature,
      },
    ],
  };
  if (days < plannedDays(plans, change.pet, change.service)) throw Error('planned');
  if (
    plans
      .filter((plan) => plan.pet === change.pet && plan.service === change.service)
      .some(
        (plan) =>
          validatePetCoverage(
            account,
            plan.pet,
            plan.service,
            plan.days,
            plan.startDate,
            plan.endDate,
            plans,
            plan.id,
          ).code !== 'ok',
      )
  )
    throw Error('planned');
  return account;
}

export type BalancePolicyTemplate = {
  id: string;
  name: string;
  service: BalanceService;
  validFrom: string;
  validThrough: string;
};
export function validBalanceDates(from: string, through: string) {
  return isValidDateOnly(from) && isValidDateOnly(through) && through >= from;
}
