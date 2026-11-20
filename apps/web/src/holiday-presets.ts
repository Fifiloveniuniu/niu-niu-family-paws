// US calendar dates, not federal-office substitute weekdays.
// Reference: https://www.opm.gov/policy-data-oversight/pay-leave/federal-holidays/
export function holidayPresets(year: number) {
  const date = (month: number, day: number) =>
    `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const nth = (month: number, weekday: number, occurrence: number) =>
    1 +
    ((weekday - new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 7) % 7) +
    (occurrence - 1) * 7;
  const lastMondayMay = 31 - ((new Date(Date.UTC(year, 4, 31)).getUTCDay() + 6) % 7);
  return [
    { date: date(1, 1), key: 'newYear' },
    { date: date(1, nth(1, 1, 3)), key: 'mlk' },
    { date: date(2, nth(2, 1, 3)), key: 'washington' },
    { date: date(5, lastMondayMay), key: 'memorial' },
    { date: date(6, 19), key: 'juneteenth' },
    { date: date(7, 4), key: 'independence' },
    { date: date(9, nth(9, 1, 1)), key: 'labor' },
    { date: date(10, nth(10, 1, 2)), key: 'columbus' },
    { date: date(11, 11), key: 'veterans' },
    { date: date(11, nth(11, 4, 4)), key: 'thanksgiving' },
    { date: date(12, 25), key: 'christmas' },
  ];
}
