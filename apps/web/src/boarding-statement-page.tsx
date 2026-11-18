import CustomDateInput from './custom-date-input';
import { localeFor, uiText } from './i18n.ts';
import CustomSelect from './custom-select';
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { PetBalance } from './pet-balance';
import {
  statementEntries,
  filterStatement,
  statementTotals,
  statementCsv,
  validStatementRange,
  emptyStatementFilters,
  type StatementPet,
  type StatementEntry,
  type StatementKind,
  type StatementFilters,
} from './boarding-statement';
import { PetProfileAvatar, CalendarPhotoStatus } from './calendar-pet-photos';
import Icon from './icons';
import Modal from './modal';
export default function BoardingStatement({
  accounts,
  pets,
  initialPet,
  onManageBalance,
  embedded = false,
  sharedFilters,
  onFiltersChange,
  hideFilters = false,
}: {
  sharedFilters?: StatementFilters;
  onFiltersChange?: (filters: StatementFilters) => void;
  hideFilters?: boolean;
  embedded?: boolean;
  accounts: Record<string, PetBalance>;
  pets: StatementPet[];
  initialPet?: string;
  onManageBalance: (pet: string) => void;
}) {
  const { i18n } = useTranslation();
  const isChinese = i18n.language === 'zh';

  const locale = localeFor(i18n.language);
  const [localFilters, setLocalFilters] = React.useState(() => ({
    ...emptyStatementFilters,
    pet: pets.some((p) => p.name === initialPet) ? initialPet! : 'all',
  }));
  const [selected, setSelected] = React.useState<StatementEntry | null>(null);
  const filters = sharedFilters || localFilters;
  const setFilters = onFiltersChange || setLocalFilters;
  const entries = statementEntries(accounts, pets);
  const rows = filterStatement(entries, filters);
  const totals = statementTotals(rows);
  const valid = validStatementRange(filters.from, filters.through);
  const filtered = JSON.stringify(filters) !== JSON.stringify(emptyStatementFilters);
  const labels: Record<StatementKind, string> = {
    added: uiText('ui.boardingStatementPage.balanceAdded'),
    correction: uiText('ui.boardingStatementPage.balanceCorrection'),
    terms: uiText('ui.boardingStatementPage.policyUpdate'),
  };
  const number = (value: number) => value.toLocaleString(locale);
  const time = (value: string) =>
    new Date(value).toLocaleString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  function download() {
    const csv = statementCsv(
      rows,
      [
        uiText('ui.boardingStatementPage.recordedAtUtc'),
        uiText('ui.boardingStatementPage.reference'),
        uiText('ui.boardingStatementPage.customer'),
        uiText('ui.boardingStatementPage.pet'),
        uiText('ui.boardingStatementPage.activity'),
        uiText('ui.boardingStatementPage.changeDays'),
        uiText('ui.boardingStatementPage.beforeDays'),
        uiText('ui.boardingStatementPage.afterDays'),
        uiText('ui.boardingStatementPage.note'),
      ],
      labels,
    );
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'boarding-statement-' + new Date().toISOString().slice(0, 10) + '.csv';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <section className="hc-finance-page hc-statement-page">
      <div className="hc-page-toolbar">
        <div className="hc-statement-actions">
          <button className="hc-manage" disabled={!rows.length || !valid} onClick={download}>
            {uiText('ui.boardingStatementPage.exportCsv')}
          </button>
          {!hideFilters && (
            <button
              className="hc-apply"
              onClick={() => onManageBalance(filters.pet === 'all' ? '' : filters.pet)}
            >
              {uiText('ui.boardingStatementPage.boardingBalances')}
            </button>
          )}
        </div>
      </div>
      <p className="hc-statement-note">
        {uiText(
          'ui.boardingStatementPage.recordedBalanceAdditionsAndCorrectionsBookingChargesAndCancellation',
        )}
      </p>
      {!hideFilters && <StatementFilterPanel pets={pets} filters={filters} onChange={setFilters} />}
      <div
        className="hc-statement-totals"
        aria-label={uiText('ui.boardingStatementPage.filteredTotals')}
      >
        <div>
          <small>{uiText('ui.boardingStatementPage.added')}</small>
          <strong>
            {valid ? number(totals.added) : 'N/A'}{' '}
            <span>{uiText('ui.boardingStatementPage.days')}</span>
          </strong>
        </div>
        <div>
          <small>{uiText('ui.boardingStatementPage.removedByCorrections')}</small>
          <strong>
            {valid ? number(totals.removed) : 'N/A'}{' '}
            <span>{uiText('ui.boardingStatementPage.days')}</span>
          </strong>
        </div>
        <div>
          <small>{uiText('ui.boardingStatementPage.netChange')}</small>
          <strong>
            {valid ? number(totals.net) : 'N/A'}{' '}
            <span>{uiText('ui.boardingStatementPage.days')}</span>
          </strong>
        </div>
      </div>
      <div
        className="hc-statement-table-wrap"
        role="region"
        aria-label={uiText('ui.boardingStatementPage.transactionTable')}
        tabIndex={0}
      >
        <div className="hc-statement-table-title">
          <h2>
            {uiText('ui.boardingStatementPage.transactionHistory')} <span>{rows.length}</span>
          </h2>
          <small>
            {uiText('ui.boardingStatementPage.localTime')} ·{' '}
            {Intl.DateTimeFormat().resolvedOptions().timeZone}
          </small>
        </div>
        <table className="hc-statement-table">
          <thead>
            <tr>
              <th>{uiText('ui.boardingStatementPage.recorded')}</th>
              <th>{uiText('ui.boardingStatementPage.petCustomer')}</th>
              <th>{uiText('ui.boardingStatementPage.activity')}</th>
              <th>{uiText('ui.boardingStatementPage.changeDays')}</th>
              <th>{uiText('ui.boardingStatementPage.petBalanceAfter')}</th>
              <th>
                <span className="hc-sr-only">{uiText('ui.boardingStatementPage.details')}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((entry) => (
              <tr className="hc-statement-row" key={entry.pet + entry.id}>
                <td data-label={uiText('ui.boardingStatementPage.recorded')}>
                  <span>{time(entry.at)}</span>
                  <small className="hc-tx-ref" title={entry.id}>
                    {entry.id.slice(0, 8)}
                  </small>
                </td>
                <td data-label={uiText('ui.boardingStatementPage.petCustomer')}>
                  <div className="hc-statement-pet">
                    <PetProfileAvatar name={entry.pet} className="hc-guest-avatar" />
                    <div>
                      <strong>{entry.pet}</strong>
                      <small>{entry.customerName}</small>
                    </div>
                  </div>
                </td>
                <td data-label={uiText('ui.boardingStatementPage.activity')}>
                  <span className={'hc-tx-kind ' + entry.kind}>{labels[entry.kind]}</span>
                  {entry.reason && <small className="hc-tx-note">{entry.reason}</small>}
                </td>
                <td
                  data-label={uiText('ui.boardingStatementPage.changeDays')}
                  className={entry.delta > 0 ? 'hc-tx-positive' : ''}
                >
                  {entry.delta > 0 ? '+' : ''}
                  {number(entry.delta)}
                </td>
                <td data-label={uiText('ui.boardingStatementPage.petBalanceAfter')}>
                  {number(entry.after)} {uiText('ui.boardingStatementPage.days')}
                </td>
                <td>
                  <button
                    className="hc-manage"
                    aria-label={`${uiText('ui.boardingStatementPage.viewTransaction')}: ${entry.pet} ${entry.id}`}
                    onClick={() => setSelected(entry)}
                  >
                    {uiText('ui.boardingStatementPage.view')}
                  </button>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={6}>
                  <div className="hc-statement-empty">
                    <h3>
                      {entries.length
                        ? uiText('ui.boardingStatementPage.noMatchingTransactions')
                        : uiText('ui.boardingStatementPage.noTransactionsRecordedYet')}
                    </h3>
                    <p>
                      {entries.length
                        ? uiText(
                            'ui.boardingStatementPage.changeOrResetYourFiltersToSeeOtherEntries',
                          )
                        : uiText('ui.boardingStatementPage.addBoardingBalanceToAPetToStartTheir')}
                    </p>
                    {filtered && (
                      <button
                        className="hc-manage"
                        onClick={() => setFilters({ ...emptyStatementFilters })}
                      >
                        {uiText('ui.boardingStatementPage.clearFilters')}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="hc-statement-footnote">
        {uiText('ui.boardingStatementPage.totalsReflectTheFilteredEntriesEachRowKeepsThat')}
      </p>
      {selected && (
        <Modal
          className="hc-transaction-dialog"
          title={uiText('ui.boardingStatementPage.transactionDetails')}
          onClose={() => setSelected(null)}
        >
          <div className="hc-transaction-heading">
            <PetProfileAvatar name={selected.pet} className="hc-guest-avatar" />
            <div>
              <strong>{selected.pet}</strong>
              <small>{selected.customerName}</small>
            </div>
          </div>
          <dl className="hc-transaction-details">
            <div>
              <dt>{uiText('ui.boardingStatementPage.activity')}</dt>
              <dd>{labels[selected.kind]}</dd>
            </div>
            <div>
              <dt>{uiText('ui.boardingStatementPage.recorded')}</dt>
              <dd>{time(selected.at)}</dd>
            </div>
            <div>
              <dt>{uiText('ui.boardingStatementPage.reference')}</dt>
              <dd>{selected.id}</dd>
            </div>
            <div>
              <dt>{uiText('ui.boardingStatementPage.change')}</dt>
              <dd>
                {selected.delta > 0 ? '+' : ''}
                {number(selected.delta)} {uiText('ui.boardingStatementPage.days')}
              </dd>
            </div>
            <div>
              <dt>{uiText('ui.boardingStatementPage.beforeAfter')}</dt>
              <dd>
                {number(selected.before)} → {number(selected.after)}{' '}
                {uiText('ui.boardingStatementPage.days')}
              </dd>
            </div>
            <div>
              <dt>{uiText('ui.boardingStatementPage.note')}</dt>
              <dd>{selected.reason || uiText('ui.boardingStatementPage.noNoteAdded')}</dd>
            </div>
          </dl>
          <p className="hc-balance-preview">
            {uiText('ui.boardingStatementPage.balanceAdjustmentOnlyThisEntryHasNoLinkedBoarding')}
          </p>
        </Modal>
      )}
      <CalendarPhotoStatus />
    </section>
  );
}

export function StatementFilterPanel({
  pets,
  filters,
  onChange,
}: {
  pets: StatementPet[];
  filters: StatementFilters;
  onChange: (filters: StatementFilters) => void;
}) {
  const { i18n } = useTranslation();
  const isChinese = i18n.language === 'zh';

  const setFilters = onChange;
  const valid = validStatementRange(filters.from, filters.through);
  const filtered = JSON.stringify(filters) !== JSON.stringify(emptyStatementFilters);
  const labels: Record<StatementKind, string> = {
    added: uiText('ui.boardingStatementPage.balanceAdded'),
    correction: uiText('ui.boardingStatementPage.balanceCorrection'),
    terms: uiText('ui.boardingStatementPage.policyUpdate'),
  };
  return (
    <section
      className="hc-statement-filters"
      aria-label={uiText('ui.boardingStatementPage.statementFilters')}
    >
      <div className="hc-filters-heading">
        <h2>{uiText('ui.boardingStatementPage.filters')}</h2>
        <button
          className="hc-clear"
          aria-label={uiText('ui.boardingStatementPage.resetStatementFilters')}
          title={uiText('ui.boardingStatementPage.resetStatementFilters')}
          disabled={!filtered}
          onClick={() => setFilters({ ...emptyStatementFilters })}
        >
          <Icon name="reset" />
        </button>
      </div>
      <div>
        <label>
          {uiText('ui.boardingStatementPage.customer')}
          <CustomSelect
            aria-label={uiText('ui.boardingStatementPage.statementCustomer')}
            value={filters.customer}
            onChange={(event) =>
              setFilters({ ...filters, customer: event.target.value, pet: 'all' })
            }
          >
            <option value="all">{uiText('ui.boardingStatementPage.allCustomers')}</option>
            {[...new Map(pets.map((p) => [p.customer, p.customerName])).entries()].map(
              ([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ),
            )}
          </CustomSelect>
        </label>
        <label>
          {uiText('ui.boardingStatementPage.pet')}
          <CustomSelect
            aria-label={uiText('ui.boardingStatementPage.statementPet')}
            value={filters.pet}
            onChange={(event) => setFilters({ ...filters, pet: event.target.value })}
          >
            <option value="all">{uiText('ui.boardingStatementPage.allPets')}</option>
            {pets
              .filter((p) => filters.customer === 'all' || p.customer === filters.customer)
              .map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name}
                </option>
              ))}
          </CustomSelect>
        </label>
        <label>
          {uiText('ui.boardingStatementPage.from')}
          <CustomDateInput
            aria-label={uiText('ui.boardingStatementPage.statementFrom')}
            type="date"
            value={filters.from}
            onChange={(value) => setFilters({ ...filters, from: value })}
          />
        </label>
        <label>
          {uiText('ui.boardingStatementPage.through')}
          <CustomDateInput
            aria-label={uiText('ui.boardingStatementPage.statementThrough')}
            type="date"
            value={filters.through}
            onChange={(value) => setFilters({ ...filters, through: value })}
          />
        </label>
        <label>
          {uiText('ui.boardingStatementPage.activity')}
          <CustomSelect
            aria-label={uiText('ui.boardingStatementPage.statementActivity')}
            value={filters.kind}
            onChange={(event) => setFilters({ ...filters, kind: event.target.value })}
          >
            <option value="all">{uiText('ui.boardingStatementPage.allActivity')}</option>
            {Object.entries(labels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </CustomSelect>
        </label>
      </div>
      {!valid && (
        <p role="alert" className="hc-range-feedback">
          {uiText('ui.boardingStatementPage.chooseAValidDateRangeWithTheStartOn')}
        </p>
      )}
    </section>
  );
}
