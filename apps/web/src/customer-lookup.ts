import { apiJson } from './api-client';
import type { components } from '../../../packages/contracts/generated';

type Customer = components['schemas']['Customer'];

/** Follow directory pages using canonical IDs; never infer ownership from names or emails. */
export async function findCustomerById(customerId: string, token: string, signal: AbortSignal) {
  let cursor: string | null = null;
  do {
    const query = new URLSearchParams(cursor ? { cursor } : {});
    const page: components['schemas']['CustomerPage'] = await apiJson('/customers?' + query, {
      token,
      signal,
    });
    const customer = page.items.find((item) => item.id === customerId);
    if (customer) return customer;
    cursor = page.nextCursor;
  } while (cursor);
  throw new Error('Customer not found');
}

export async function findPetCustomer(
  customerId: string,
  petId: string | null | undefined,
  lookup: string,
  token: string,
  signal: AbortSignal,
): Promise<Pick<Customer, 'id' | 'name' | 'loginEmail'>> {
  const page = await apiJson<components['schemas']['PetSearchPage']>(
    '/pet-search?' + new URLSearchParams({ search: lookup }),
    { token, signal },
  );
  const match = page.items.find((item) => item.customer.id === customerId && item.pet.id === petId);
  if (!match) throw new Error('Pet not found');
  return match.customer;
}
