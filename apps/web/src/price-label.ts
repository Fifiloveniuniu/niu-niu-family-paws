import supplied from '../../../packages/pricing/source-rates.json';
import type { PriceRate } from '../../../packages/pricing/calculations';
/** Existing saved rates inherit a supplied translation only while their original label matches. */
export function priceName(rate: PriceRate, language: string) {
  if (language === 'zh') return rate.nameZh;
  if (language === 'es')
    return (
      rate.nameEs ||
      supplied.find((original) => original.id === rate.id && original.name === rate.name)?.nameEs ||
      rate.name
    );
  return rate.name;
}
