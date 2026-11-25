export type HolidayGroup = {
  country: 'US' | 'CN' | 'IN';
  complete: boolean;
  entries: { key: string; date: string; tentative?: boolean }[];
  sources: string[];
};
export type HolidayCatalog = {
  year: number;
  years: number[];
  groups: HolidayGroup[];
  available: boolean;
};
