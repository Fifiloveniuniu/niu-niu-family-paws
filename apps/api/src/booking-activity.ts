import type { components } from '../../../packages/contracts/generated.ts';
import { houseDay } from './booking-funding.ts';
/** Scheduling is a separate event from its recorded boarding-day ledger charge. */
export function bookingActivity(booking: components['schemas']['Booking']) {
  return {
    delta: 0,
    daysAfter: null,
    validFrom: houseDay(booking.arrival, booking.timezone),
    validThrough: houseDay(booking.pickup, booking.timezone),
    reason: '',
  };
}
