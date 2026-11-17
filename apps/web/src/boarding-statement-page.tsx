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
import { PetProfileAvatar, CalendarPhotoCredits } from './calendar-pet-photos';
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
  const translate = (en: string, cn: string) => (isChinese ? cn : en);
  const locale = isChinese ? 'zh-CN' : 'en-US';
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
    added: translate('Balance added', '增加余额'),
    correction: translate('Balance correction', '余额更正'),
    terms: translate('Policy update', '规则更新'),
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
        translate('Recorded at (UTC)', '记录时间（UTC）'),
        translate('Reference', '流水号'),
        translate('Customer', '客户'),
        translate('Pet', '宠物'),
        translate('Activity', '类型'),
        translate('Change (days)', '变动（天）'),
        translate('Before (days)', '变动前（天）'),
        translate('After (days)', '变动后（天）'),
        translate('Note', '备注'),
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
      <div className="hc-title">
        <div>
          {!embedded && <p className="hc-page-eyebrow">{translate('BOARDING', '寄养')}</p>}
          {embedded ? (
            <h2>{translate('Statement', '交易明细')}</h2>
          ) : (
            <h1>{translate('Statement', '交易明细')}</h1>
          )}
          <p>
            {translate(
              'Balance activity for every pet, in one place.',
              '在一个页面查看每只宠物的余额变动。',
            )}
          </p>
        </div>
        <div className="hc-statement-actions">
          <button className="hc-manage" disabled={!rows.length || !valid} onClick={download}>
            {translate('Export CSV', '导出 CSV')}
          </button>
          {!hideFilters && (
            <button
              className="hc-apply"
              onClick={() => onManageBalance(filters.pet === 'all' ? '' : filters.pet)}
            >
              {translate('Boarding balances', '寄养余额')}
            </button>
          )}
        </div>
      </div>
      <p className="hc-statement-note">
        {translate(
          'Local preview · Recorded balance additions and corrections. Booking charges and cancellation restorations are not connected yet.',
          '本地预览 · 显示已记录的余额增加及更正，尚未接入预约扣减与取消返还。',
        )}
      </p>
      {!hideFilters && <StatementFilterPanel pets={pets} filters={filters} onChange={setFilters} />}
      <div className="hc-statement-totals" aria-label={translate('Filtered totals', '筛选后合计')}>
        <div>
          <small>{translate('Added', '增加')}</small>
          <strong>
            {valid ? number(totals.added) : '—'} <span>{translate('days', '天')}</span>
          </strong>
        </div>
        <div>
          <small>{translate('Removed by corrections', '更正减少')}</small>
          <strong>
            {valid ? number(totals.removed) : '—'} <span>{translate('days', '天')}</span>
          </strong>
        </div>
        <div>
          <small>{translate('Net change', '净变动')}</small>
          <strong>
            {valid ? number(totals.net) : '—'} <span>{translate('days', '天')}</span>
          </strong>
        </div>
      </div>
      <div
        className="hc-statement-table-wrap"
        role="region"
        aria-label={translate('Transaction table', '交易明细表')}
        tabIndex={0}
      >
        <div className="hc-statement-table-title">
          <h2>
            {translate('Transaction history', '交易记录')} <span>{rows.length}</span>
          </h2>
          <small>
            {translate('Local time', '当地时间')} ·{' '}
            {Intl.DateTimeFormat().resolvedOptions().timeZone}
          </small>
        </div>
        <table className="hc-statement-table">
          <thead>
            <tr>
              <th>{translate('Recorded', '记录时间')}</th>
              <th>{translate('Pet / customer', '宠物 / 客户')}</th>
              <th>{translate('Activity', '类型')}</th>
              <th>{translate('Change (days)', '变动（天）')}</th>
              <th>{translate('Pet balance after', '该宠物变动后余额')}</th>
              <th>
                <span className="hc-sr-only">{translate('Details', '详情')}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((entry) => (
              <tr className="hc-statement-row" key={entry.pet + entry.id}>
                <td data-label={translate('Recorded', '记录时间')}>
                  <span>{time(entry.at)}</span>
                  <small className="hc-tx-ref" title={entry.id}>
                    {entry.id.slice(0, 8)}
                  </small>
                </td>
                <td data-label={translate('Pet / customer', '宠物 / 客户')}>
                  <div className="hc-statement-pet">
                    <PetProfileAvatar name={entry.pet} className="hc-guest-avatar" />
                    <div>
                      <strong>{entry.pet}</strong>
                      <small>{entry.customerName}</small>
                    </div>
                  </div>
                </td>
                <td data-label={translate('Activity', '类型')}>
                  <span className={'hc-tx-kind ' + entry.kind}>{labels[entry.kind]}</span>
                  {entry.reason && <small className="hc-tx-note">{entry.reason}</small>}
                </td>
                <td
                  data-label={translate('Change (days)', '变动（天）')}
                  className={entry.delta > 0 ? 'hc-tx-positive' : ''}
                >
                  {entry.delta > 0 ? '+' : ''}
                  {number(entry.delta)}
                </td>
                <td data-label={translate('Pet balance after', '该宠物变动后余额')}>
                  {number(entry.after)} {translate('days', '天')}
                </td>
                <td>
                  <button
                    className="hc-manage"
                    aria-label={`${translate('View transaction', '查看交易')}: ${entry.pet} ${entry.id}`}
                    onClick={() => setSelected(entry)}
                  >
                    {translate('View', '查看')}
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
                        ? translate('No matching transactions', '没有符合筛选条件的交易')
                        : translate('No transactions recorded yet', '尚无交易记录')}
                    </h3>
                    <p>
                      {entries.length
                        ? translate(
                            'Change or reset your filters to see other entries.',
                            '调整或重置筛选以查看其他记录。',
                          )
                        : translate(
                            'Add boarding balance to a pet to start their statement.',
                            '为宠物增加寄养余额，即可开始记录明细。',
                          )}
                    </p>
                    {filtered && (
                      <button
                        className="hc-manage"
                        onClick={() => setFilters({ ...emptyStatementFilters })}
                      >
                        {translate('Clear filters', '清除筛选')}
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
        {translate(
          'Totals reflect the filtered entries. Each row keeps that pet’s recorded balance after the transaction; it is not recalculated from the visible rows.',
          '合计仅包含筛选后的记录。每行保留该宠物交易后的原始余额，不会根据当前可见记录重新计算。',
        )}
      </p>
      {selected && (
        <Modal
          className="hc-transaction-dialog"
          title={translate('Transaction details', '交易详情')}
          onClose={() => setSelected(null)}
        >
          <div className="hc-transaction-heading">
            <PetProfileAvatar name={selected.pet} className="hc-guest-avatar" />
            <div>
              <strong>{selected.pet}</strong>
              <small>{selected.customerName}</small>
            </div>
            <span className="hc-draft-badge">{translate('Preview entry', '预览记录')}</span>
          </div>
          <dl className="hc-transaction-details">
            <div>
              <dt>{translate('Activity', '类型')}</dt>
              <dd>{labels[selected.kind]}</dd>
            </div>
            <div>
              <dt>{translate('Recorded', '记录时间')}</dt>
              <dd>{time(selected.at)}</dd>
            </div>
            <div>
              <dt>{translate('Reference', '流水号')}</dt>
              <dd>{selected.id}</dd>
            </div>
            <div>
              <dt>{translate('Change', '变动')}</dt>
              <dd>
                {selected.delta > 0 ? '+' : ''}
                {number(selected.delta)} {translate('days', '天')}
              </dd>
            </div>
            <div>
              <dt>{translate('Before → after', '变动前 → 变动后')}</dt>
              <dd>
                {number(selected.before)} → {number(selected.after)} {translate('days', '天')}
              </dd>
            </div>
            <div>
              <dt>{translate('Note', '备注')}</dt>
              <dd>{selected.reason || translate('No note added', '未填写备注')}</dd>
            </div>
          </dl>
          <p className="hc-balance-preview">
            {translate(
              'Balance adjustment only. This entry has no linked boarding booking or payment.',
              '仅为余额调整，此记录未关联寄养预约或付款。',
            )}
          </p>
        </Modal>
      )}
      <CalendarPhotoCredits />
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
  const translate = (en: string, cn: string) => (isChinese ? cn : en);
  const setFilters = onChange;
  const valid = validStatementRange(filters.from, filters.through);
  const filtered = JSON.stringify(filters) !== JSON.stringify(emptyStatementFilters);
  const labels: Record<StatementKind, string> = {
    added: translate('Balance added', '增加余额'),
    correction: translate('Balance correction', '余额更正'),
    terms: translate('Policy update', '规则更新'),
  };
  return (
    <section
      className="hc-statement-filters"
      aria-label={translate('Statement filters', '明细筛选')}
    >
      <div className="hc-filters-heading">
        <h2>{translate('Filters', '筛选')}</h2>
        <button
          className="hc-clear"
          aria-label={translate('Reset statement filters', '重置明细筛选')}
          title={translate('Reset statement filters', '重置明细筛选')}
          disabled={!filtered}
          onClick={() => setFilters({ ...emptyStatementFilters })}
        >
          <Icon name="reset" />
        </button>
      </div>
      <div>
        <label>
          {translate('Customer', '客户')}
          <select
            aria-label={translate('Statement customer', '明细客户')}
            value={filters.customer}
            onChange={(event) =>
              setFilters({ ...filters, customer: event.target.value, pet: 'all' })
            }
          >
            <option value="all">{translate('All customers', '全部客户')}</option>
            {[...new Map(pets.map((p) => [p.customer, p.customerName])).entries()].map(
              ([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ),
            )}
          </select>
        </label>
        <label>
          {translate('Pet', '宠物')}
          <select
            aria-label={translate('Statement pet', '明细宠物')}
            value={filters.pet}
            onChange={(event) => setFilters({ ...filters, pet: event.target.value })}
          >
            <option value="all">{translate('All pets', '全部宠物')}</option>
            {pets
              .filter((p) => filters.customer === 'all' || p.customer === filters.customer)
              .map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name}
                </option>
              ))}
          </select>
        </label>
        <label>
          {translate('From', '开始日期')}
          <input
            aria-label={translate('Statement from', '明细开始日期')}
            type="date"
            value={filters.from}
            onChange={(event) => setFilters({ ...filters, from: event.target.value })}
          />
        </label>
        <label>
          {translate('Through', '结束日期')}
          <input
            aria-label={translate('Statement through', '明细结束日期')}
            type="date"
            value={filters.through}
            onChange={(event) => setFilters({ ...filters, through: event.target.value })}
          />
        </label>
        <label>
          {translate('Activity', '类型')}
          <select
            aria-label={translate('Statement activity', '明细类型')}
            value={filters.kind}
            onChange={(event) => setFilters({ ...filters, kind: event.target.value })}
          >
            <option value="all">{translate('All activity', '全部类型')}</option>
            {Object.entries(labels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {!valid && (
        <p role="alert" className="hc-range-feedback">
          {translate(
            'Choose a valid date range with the start on or before the end.',
            '请选择有效日期范围，开始日期不能晚于结束日期。',
          )}
        </p>
      )}
    </section>
  );
}
