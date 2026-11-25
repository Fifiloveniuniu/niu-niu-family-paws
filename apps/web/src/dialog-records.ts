import { apiJson } from './api-client';
import { auth } from './auth-client';
import { findCustomerById } from './customer-lookup';
import { dialogIdentifier } from './dialog-routing';
import type { Customer, PetRow, Booking } from './workspace-data';
import type { components } from '../../../packages/contracts/generated';
export async function dialogCustomer(id: string, signal: AbortSignal): Promise<Customer> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw Error('Sign in required');
  return findCustomerById(dialogIdentifier(id), token, signal);
}
export function dialogBooking(id: string, signal: AbortSignal) {
  return apiJson<Booking>('/bookings/' + dialogIdentifier(id), { signal });
}
export async function dialogPet(customerId: string, id: string, signal: AbortSignal) {
  return (await dialogPetRow(dialogIdentifier(customerId) + '/' + dialogIdentifier(id), signal))
    .pet;
}
export async function dialogPetRow(raw: string, signal: AbortSignal): Promise<PetRow> {
  const [cid, pid] = raw.split('/');
  const result = await apiJson<components['schemas']['WorkspacePets']>(
    '/workspace/pets?' +
      new URLSearchParams({ customerId: dialogIdentifier(cid), petId: dialogIdentifier(pid) }),
    { signal },
  );
  const row = result.items.find((item) => item.customer.id === cid && item.pet.id === pid);
  if (!row) throw Error('Pet unavailable');
  return row;
}
export async function dialogHouse(id: string, signal: AbortSignal) {
  const data = await apiJson<components['schemas']['WorkspaceLocations']>('/workspace/locations', {
    signal,
  });
  const house = data.items.find((item) => item.house.id === id)?.house;
  if (!house) throw Error('House unavailable');
  return house;
}
