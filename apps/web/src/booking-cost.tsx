import { estimateBoarding } from '../../../packages/pricing/estimate';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { apiJson } from './api-client';
import { type PricingConfig } from '../../../packages/pricing/calculations';
import { zonedValue } from './wall-time';
import { localeFor, uiText } from './i18n';
import type { PetRow } from './workspace-data';
export default function BookingCost({
  row,
  arrival,
  pickup,
  zone,
}: {
  row?: PetRow;
  arrival: string;
  pickup: string;
  zone: string;
}) {
  const { i18n } = useTranslation();
  const [config, setConfig] = React.useState<PricingConfig | null>(null);
  const [failed, setFailed] = React.useState(false);
  React.useEffect(() => {
    const abort = new AbortController();
    void apiJson<PricingConfig>('/public/pricing', { signal: abort.signal })
      .then(setConfig)
      .catch(() => {
        if (!abort.signal.aborted) setFailed(true);
      });
    return () => abort.abort();
  }, []);
  const t = (key: string) => uiText('ui.bookingCost.' + key);
  const money = (cents: number) =>
    new Intl.NumberFormat(localeFor(i18n.language), { style: 'currency', currency: 'USD' }).format(
      cents / 100,
    );
  const quote =
    config && arrival && pickup
      ? estimateBoarding(
          config,
          row?.pet.species ?? '',
          row?.pet.weightKg,
          zonedValue(arrival, zone).slice(0, 10),
          zonedValue(pickup, zone).slice(0, 10),
        )
      : null;
  return (
    <section className="booking-cost" aria-label={t('title')}>
      <h3>{t('title')}</h3>
      {!config ? (
        <p role="status">{t(failed ? 'unavailable' : 'loading')}</p>
      ) : (
        <>
          <dl className="workspace-details">
            {[
              [
                t('normal'),
                `${quote?.normalDays ?? 0} × ${quote?.dailyCents != null ? money(quote.dailyCents) : t('unavailable')}`,
                quote?.normalCents,
              ],
              [
                t('holidays'),
                `${quote?.holidayDays ?? 0} × ${quote?.dailyCents != null ? money(quote.dailyCents) : t('unavailable')}`,
                quote?.holidayCents,
              ],
              [t('fee'), `${config.holidayPercent}%`, quote?.surchargeCents],
              [t('total'), `${quote?.days ?? 0} ${t('days')}`, quote?.totalCents],
            ].map(([label, detail, cents]) => (
              <div key={String(label)}>
                <dt>
                  {label}
                  <small>{detail}</small>
                </dt>
                <dd>{typeof cents === 'number' ? money(cents) : t('unavailable')}</dd>
              </div>
            ))}
          </dl>
          <p className="hc-review-note">{t('estimate')}</p>
        </>
      )}
    </section>
  );
}
