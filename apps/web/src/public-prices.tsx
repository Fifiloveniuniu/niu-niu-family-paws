import { priceName } from './price-label';
import Button from './button';
import React from 'react';
import { useTranslation } from 'react-i18next';
import supplied from '../../../packages/pricing/source-rates.json';
import {
  packageSavings,
  type PriceRate,
  type PricingConfig,
} from '../../../packages/pricing/calculations';
import { englishCatalog, localeFor, uiText, uiValue } from './i18n.ts';
export default function PublicPrices() {
  const { i18n } = useTranslation();
  const [rates, setRates] = React.useState<PriceRate[]>(supplied as PriceRate[]);
  const [fee, setFee] = React.useState(20);
  const [status, setStatus] = React.useState<'loading' | 'ready' | 'error'>('loading');
  const [revision, retry] = React.useReducer((value) => value + 1, 0);
  React.useEffect(() => {
    setStatus('loading');
    const abort = new AbortController();
    void fetch('/api/public/pricing', { signal: abort.signal })
      .then(async (response) => {
        if (!response.ok) throw Error();
        const config: PricingConfig = await response.json();
        if (!abort.signal.aborted) {
          setRates(config.rates);
          setFee(config.holidayPercent);
          setStatus('ready');
        }
      })
      .catch(() => {
        if (!abort.signal.aborted) {
          setRates([]);
          setStatus('error');
        }
      });
    return () => abort.abort();
  }, [revision]);
  const t = (key: string, values: Record<string, unknown> = {}) =>
    uiText('ui.publicPrices.' + key, values);
  const money = (cents: number) =>
    new Intl.NumberFormat(localeFor(i18n.language), { style: 'currency', currency: 'USD' }).format(
      cents / 100,
    );
  const groups = [
    ['boarding', 'boarding'],
    ['price2.jpg', 'dogBath'],
    ['price3.jpg', 'dogGrooming'],
    ['price4.jpg', 'catBath'],
    ['package', 'packages'],
    ['other', 'other'],
  ] as const;
  const belongs = (rate: PriceRate, key: string) =>
    key === 'boarding'
      ? rate.kind === 'boarding'
      : key === 'package'
        ? rate.kind === 'package'
        : key === 'other'
          ? ['service', 'addon'].includes(rate.kind) &&
            !['price2.jpg', 'price3.jpg', 'price4.jpg'].includes(rate.source)
          : rate.source === key && rate.kind !== 'boarding' && rate.kind !== 'package';
  return (
    <div className="public-source-prices">
      {status === 'loading' && <p role="status">{t('checking')}</p>}
      {status === 'error' && (
        <p role="alert">
          {t('unavailable')}{' '}
          <Button icon="reset" variant="secondary" onClick={retry}>
            {uiText('ui.workspace.retry')}
          </Button>
        </p>
      )}
      {groups.map(([key, label]) => {
        const rows = rates.filter((rate) => rate.active && belongs(rate, key));
        if (!rows.length) return null;
        return (
          <section key={key} aria-label={t(label)}>
            <h2>{t(label)}</h2>
            <div className="public-price-scroll">
              <table>
                <thead>
                  <tr>
                    <th>{t('service')}</th>
                    <th>{t(key === 'boarding' ? 'daily' : 'price')}</th>
                    {key === 'package' && <th>{t('savings')}</th>}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((rate) => {
                    const savings = packageSavings(rate, rates);
                    return (
                      <tr key={rate.id}>
                        <td>
                          {priceName(rate, i18n.language)}
                          {rate.kind === 'addon' && <small> · {t('addon')}</small>}
                        </td>
                        <td>
                          {money(rate.minCents)}
                          {rate.maxCents !== rate.minCents ? ' – ' + money(rate.maxCents) : ''}
                        </td>
                        {key === 'package' && (
                          <td>
                            {savings
                              ? `${money(savings.savingsCents)} (${savings.percent.toFixed(2)}%)`
                              : uiText('common.notAvailable')}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {['price2.jpg', 'price3.jpg', 'price4.jpg'].includes(key) && (
              <p>
                {(
                  uiValue(
                    ('ui.publicPrices.includes.' + key) as keyof typeof englishCatalog,
                    i18n.language,
                  ) as string[]
                ).join(' · ')}
              </p>
            )}
            {key === 'boarding' && (
              <>
                <p>{t('interpolation')}</p>
                <p>{t('holiday', { percent: fee })}</p>
                <p>{t('eligibility')}</p>
              </>
            )}
          </section>
        );
      })}
    </div>
  );
}
