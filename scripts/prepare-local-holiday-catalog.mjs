import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { holidayPresets } from '../apps/web/src/holiday-presets.ts';
import { writeFile } from 'node:fs/promises';
if (
  process.env.GCLOUD_PROJECT !== 'demo-niu-niu' ||
  process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8085' ||
  process.env.FIREBASE_AUTH_EMULATOR_HOST !== '127.0.0.1:9099'
)
  throw Error('Demo emulators required for holiday catalog');
const apply = process.argv.includes('--apply');
const india = {
  2025: [
    ['holi', '03-14'],
    ['dussehra', '10-02'],
    ['diwali', '10-20'],
  ],
  2026: [
    ['holi', '03-04'],
    ['ramNavami', '03-26'],
    ['mahavir', '03-31'],
    ['goodFriday', '04-03'],
    ['buddha', '05-01'],
    ['janmashtami', '09-04'],
    ['dussehra', '10-20'],
    ['diwali', '11-08'],
    ['guruNanak', '11-24'],
  ],
  2027: [
    ['holi', '03-23'],
    ['goodFriday', '03-26'],
    ['ramNavami', '04-15'],
    ['mahavir', '04-19'],
    ['buddha', '05-20'],
    ['janmashtami', '08-25'],
    ['dussehra', '10-09'],
    ['diwali', '10-29'],
    ['guruNanak', '11-14'],
  ],
};
const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const years = [2025, 2026, 2027, 2028];
const catalogs = await Promise.all(
  years.map(async (year) => {
    const source = `https://data.weather.gov.hk/weatherAPI/hko_data/calendar/nongli_calendar_${year}.csv`;
    const response = await fetch(source);
    if (!response.ok) throw Error('Official lunar calendar unavailable');
    const rows = (await response.text())
      .trim()
      .split(/\r?\n/)
      .slice(1)
      .map((line) => line.split(','));
    function lunar(m, d) {
      const row = rows.find((row) => row[3] === m && row[4] === d);
      if (!row) throw Error('Lunar date missing');
      const [day, mon] = row[0].split('-');
      return `${year}-${String(month.indexOf(mon) + 1).padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    const spring = lunar('正月', '初一');
    const cn = [
      ['newYear', `${year}-01-01`],
      [
        'springEve',
        new Date(Date.parse(spring + 'T00:00:00Z') - 86400000).toISOString().slice(0, 10),
      ],
      ['springFestival', spring],
      ['lantern', lunar('正月', '十五')],
      ['qingming', `${year}-04-${year === 2025 || year === 2028 ? '04' : '05'}`],
      ['chinaLabor', `${year}-05-01`],
      ['dragonBoat', lunar('五月', '初五')],
      ['midAutumn', lunar('八月', '十五')],
      ['chinaNational', `${year}-10-01`],
    ].map(([key, date]) => ({ key, date }));
    const ind = [
      ['republic', '01-26'],
      ['indiaIndependence', '08-15'],
      ['gandhi', '10-02'],
      ['christmas', '12-25'],
      ...(india[year] ?? []),
    ].map(([key, date]) => ({ key, date: year + '-' + date }));
    return {
      year,
      groups: [
        {
          country: 'US',
          complete: true,
          entries: holidayPresets(year),
          sources: ['https://www.opm.gov/policy-data-oversight/pay-leave/federal-holidays/'],
        },
        {
          country: 'CN',
          complete: true,
          entries: cn.sort((a, b) => a.date.localeCompare(b.date)),
          sources: [source, `https://www.hko.gov.hk/en/gts/time/calendar/pdf/files/${year}e.pdf`],
        },
        {
          country: 'IN',
          complete: !!india[year],
          entries: ind.sort((a, b) => a.date.localeCompare(b.date)),
          sources: [
            year === 2025
              ? 'https://srfmtti.dacnet.nic.in/assets/pdfs/circular/holiday%20list%202025.pdf'
              : 'https://www.iirs.gov.in/holidaycalender',
          ],
        },
      ],
    };
  }),
);
await writeFile(
  new URL('../packages/pricing/reference-holidays.json', import.meta.url),
  JSON.stringify({ years, catalogs }, null, 2) + '\n',
);
if (apply) {
  initializeApp({ projectId: 'demo-niu-niu' });
  const db = getFirestore();
  try {
    const batch = db.batch();
    batch.set(db.doc('configuration/holidayCatalog'), {
      years,
      updatedAt: new Date().toISOString(),
    });
    for (const catalog of catalogs)
      batch.set(db.doc('configuration/holidayCatalog/years/' + catalog.year), catalog);
    await batch.commit();
  } finally {
    await db.terminate();
  }
}
console.log(
  JSON.stringify({
    mode: apply ? 'applied local catalog' : 'prepared reference',
    years,
    countries: ['US', 'CN', 'IN'],
    selectedFeeDatesChanged: false,
  }),
);
