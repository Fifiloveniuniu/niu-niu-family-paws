import React from 'react';
import { updateQuery } from './routing';
import { useTranslation } from 'react-i18next';
import PetBalances, { type BalancePet } from './pet-balances';
import BoardingStatement, { StatementFilterPanel } from './boarding-statement-page';
import { emptyStatementFilters, type StatementFilters } from './boarding-statement';
import {
  balanceKey,
  type PetBalance,
  type BalanceChange,
  type BalancePolicyTemplate,
  type PlannedCoverage,
} from './pet-balance';
export default function BalancesPage({
  accounts,
  pets,
  plans,
  templates,
  onSaveTemplate,
  initialPet,
  onSelectPet,
  onSave,
  onManageBalance,
  search = '',
}: {
  accounts: Record<string, PetBalance>;
  pets: BalancePet[];
  plans: PlannedCoverage[];
  templates: BalancePolicyTemplate[];
  onSaveTemplate: (template: BalancePolicyTemplate) => void;
  search?: string;
  initialPet?: string;
  onSelectPet: (pet: string) => void;
  onSave: (change: BalanceChange) => void;
  onManageBalance: (pet: string) => void;
}) {
  const { i18n } = useTranslation();
  const isChinese = i18n.language === 'zh';
  const translate = (en: string, cn: string) => (isChinese ? cn : en);
  function readFilters(): StatementFilters {
    const params = new URLSearchParams(search);
    const pet = params.get('pet') || initialPet || 'all';
    return {
      ...emptyStatementFilters,
      customer: params.get('customer') || 'all',
      pet: pets.some((p) => p.name === pet) ? pet : 'all',
      from: params.get('from') || '',
      through: params.get('through') || '',
      kind: params.get('activity') || 'all',
    };
  }
  const [filters, setFilters] = React.useState<StatementFilters>(readFilters);
  React.useEffect(() => {
    setFilters(readFilters());
  }, [search]);
  function changeFilters(next: StatementFilters) {
    if (
      updateQuery({
        customer: next.customer,
        pet: next.pet,
        from: next.from,
        through: next.through,
        activity: next.kind,
        view: null,
      })
    )
      setFilters(next);
  }
  React.useEffect(() => onSelectPet(filters.pet), [filters.pet, onSelectPet]);
  const scoped = pets.filter((p) => filters.customer === 'all' || p.customer === filters.customer);
  return (
    <section className="hc-balances-workspace">
      <div className="hc-title">
        <div>
          <h1>{translate('Balances', '寄养余额')}</h1>
          <p>
            {translate(
              'Pet credits and their complete statement, together.',
              '在同一页面管理宠物额度及完整交易明细。',
            )}
          </p>
        </div>
      </div>
      <StatementFilterPanel pets={pets} filters={filters} onChange={changeFilters} />
      {new URLSearchParams(search).has('pet') &&
        !pets.some((p) => p.name === new URLSearchParams(search).get('pet')) && (
          <p role="alert">
            {translate('Pet not found in this planning preview.', '在此规划预览中未找到该宠物。')}
          </p>
        )}
      <div className="hc-balance-overview">
        {filters.pet !== 'all' ? (
          <PetBalances
            key={filters.pet}
            embedded
            summaryOnly
            accounts={accounts}
            pets={pets}
            plans={plans}
            templates={templates}
            onSaveTemplate={onSaveTemplate}
            initial={{ pet: filters.pet, service: 'boarding' }}
            onSave={onSave}
            onClose={() => {}}
          />
        ) : (
          <section className="hc-all-balances">
            <h2>{translate('Pet balances', '宠物余额')}</h2>
            <p>
              {translate(
                'Balances belong to each pet. Choose a pet to make an adjustment.',
                '余额归每只宠物所有，选择宠物后可进行调整。',
              )}
            </p>
            <div>
              {scoped.map((p) => {
                const account = accounts[balanceKey(p.name, 'boarding')];
                return (
                  <button
                    className="hc-balance-pick"
                    key={p.name}
                    onClick={() => changeFilters({ ...filters, pet: p.name })}
                  >
                    <strong>{p.name}</strong>
                    <span>{p.customerName}</span>
                    <b>
                      {account
                        ? account.days + ' ' + translate('days', '天')
                        : translate('Not configured', '尚未配置')}
                    </b>
                  </button>
                );
              })}
            </div>
          </section>
        )}
      </div>
      <BoardingStatement
        embedded
        hideFilters
        accounts={accounts}
        pets={pets}
        sharedFilters={filters}
        onFiltersChange={changeFilters}
        onManageBalance={onManageBalance}
      />
    </section>
  );
}
