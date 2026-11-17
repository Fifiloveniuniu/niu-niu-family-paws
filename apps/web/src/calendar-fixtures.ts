import type { Placement } from './calendar-placement';

type SampleStay = Omit<Placement, 'id' | 'units'>;
export const initialStays: SampleStay[] = [
  { name: 'Mochi', species: 'dog', house: 1, room: 1, start: -3, end: 3, status: 'in' },
  { name: 'Biscuit', species: 'dog', house: 1, room: 1, start: -1, end: 1, status: 'in' },
  { name: 'Luna', species: 'dog', house: 1, room: 1, start: 2, end: 7, status: 'upcoming' },
  {
    name: 'Oliver',
    species: 'cat',
    house: 1,
    room: 2,
    start: -4,
    end: -0.2,
    status: 'in',
    overdue: true,
  },
  { name: 'Coco', species: 'cat', house: 1, room: 2, start: 1, end: 5, status: 'upcoming' },
  { name: 'Pip', species: 'rabbit', house: 1, room: 3, start: -2, end: 4, status: 'in' },
  { name: 'Maple', species: 'dog', house: 2, room: 1, start: -5, end: -1, status: 'out' },
  { name: 'Teddy', species: 'dog', house: 2, room: 1, start: 0, end: 6, status: 'upcoming' },
  { name: 'Nori', species: 'cat', house: 2, room: 2, start: 4, end: 10, status: 'upcoming' },
];
