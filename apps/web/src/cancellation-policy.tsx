import CustomSelect from './custom-select';
import React from 'react';
import { useTranslation } from 'react-i18next';
import Modal from './modal';
import Icon from './icons';
import UnsavedChanges, { confirmDiscardChanges } from './unsaved-changes';
export type CancellationPolicy = {
  name: string;
  fullDays: number;
  halfDays: number;
  shortPercent: string;
  basis: '' | 'hours' | 'calendar';
};
export const initialCancellationPolicy: CancellationPolicy = {
  name: '',
  fullDays: 14,
  halfDays: 7,
  shortPercent: '',
  basis: '',
};
export default function CancellationPolicyPage({
  policy,
  onSave,
}: {
  policy: CancellationPolicy;
  onSave: (value: CancellationPolicy) => void;
}) {
  const { i18n } = useTranslation();
  const isChinese = i18n.language === 'zh';
  const translate = (en: string, cn: string) => (isChinese ? cn : en);
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(policy);
  const [error, setError] = React.useState('');
  const [saved, setSaved] = React.useState(false);
  const form = React.useRef<HTMLFormElement>(null);
  const dirty = JSON.stringify(draft) !== JSON.stringify(policy);
  function close() {
    if (confirmDiscardChanges(i18n.language, form.current)) setEditing(false);
  }
  function save(event: React.FormEvent) {
    event.preventDefault();
    if (
      !Number.isSafeInteger(draft.fullDays) ||
      !Number.isSafeInteger(draft.halfDays) ||
      draft.halfDays < 1 ||
      draft.fullDays <= draft.halfDays ||
      (draft.shortPercent !== '' &&
        (!Number.isFinite(Number(draft.shortPercent)) ||
          Number(draft.shortPercent) < 0 ||
          Number(draft.shortPercent) > 100))
    ) {
      setError(
        translate(
          'Use whole notice days, with the full-refund cutoff later than the half-refund cutoff. Restoration must be 0–100%.',
          '请使用整数提前天数，全额返还期限应大于半额返还期限；返还比例须为 0–100%。',
        ),
      );
      return;
    }
    onSave({ ...draft, name: draft.name.trim() });
    setEditing(false);
    setSaved(true);
  }
  const basis =
    policy.basis === 'hours'
      ? translate('Elapsed time · 24 hours per day', '实际时长 · 每天 24 小时')
      : policy.basis === 'calendar'
        ? translate('Calendar days · house timezone', '日历天 · 房屋时区')
        : translate('Cutoff calculation pending', '截止时间计算方式待确认');
  return (
    <section className="hc-finance-page">
      <div className="hc-page-toolbar">
        <button
          className="hc-apply"
          onClick={() => {
            setDraft(policy);
            setError('');
            setEditing(true);
          }}
        >
          <Icon name="edit" />
          {translate('Edit policy', '编辑政策')}
        </button>
      </div>
      <div className="hc-policy-summary">
        <div>
          <span className="hc-draft-badge">{translate('Draft', '草稿')}</span>
          <h2>{policy.name || translate('Boarding cancellation', '寄养取消规则')}</h2>
          <p>{basis}</p>
        </div>
        <span>{translate('Applies to boarding balance', '适用于寄养余额')}</span>
      </div>
      {saved && (
        <p className="hc-notice" role="status">
          {translate('Policy draft saved.', '政策草稿已保存。')}
        </p>
      )}
      <div className="hc-policy-cards">
        <article>
          <small>{translate('FULL RESTORATION', '全额返还')}</small>
          <strong>
            100<span>%</span>
          </strong>
          <h3>
            {translate(`${policy.fullDays} days before arrival`, `到店前 ${policy.fullDays} 天`)}
          </h3>
          <p>
            {translate('Return the full eligible booking balance.', '返还符合条件的全部预约余额。')}
          </p>
        </article>
        <article>
          <small>{translate('PARTIAL RESTORATION', '部分返还')}</small>
          <strong>
            50<span>%</span>
          </strong>
          <h3>
            {translate(`${policy.halfDays} days before arrival`, `到店前 ${policy.halfDays} 天`)}
          </h3>
          <p>
            {translate(
              'Return half of the eligible booking balance.',
              '返还符合条件的预约余额的一半。',
            )}
          </p>
        </article>
        <article className="hc-policy-pending">
          <small>{translate('SHORT NOTICE', '临近到店')}</small>
          <strong>
            {policy.shortPercent === '' ? 'N/A' : policy.shortPercent}
            <span>{policy.shortPercent === '' ? '' : '%'}</span>
          </strong>
          <h3>
            {translate(
              `Less than ${policy.halfDays} days before arrival`,
              `距到店不足 ${policy.halfDays} 天`,
            )}
          </h3>
          <p>
            {policy.shortPercent === ''
              ? translate('Restoration percentage has not been set.', '返还比例尚未设置。')
              : translate('Draft percentage, awaiting activation.', '草稿比例，尚未启用。')}
          </p>
        </article>
      </div>
      <div className="hc-policy-details">
        <section>
          <h2>{translate('How balance is restored', '余额如何返还')}</h2>
          <p>
            {translate(
              'The intended workflow returns eligible credit to the original pet’s boarding balance and records a cancellation entry in the statement.',
              '目标流程是将符合条件的额度返还至原宠物的寄养余额，并在明细中记录取消返还。',
            )}
          </p>
          <p>
            {translate(
              'This policy does not activate automatic deductions or refunds.',
              '此政策不会启用自动扣减或返还。',
            )}
          </p>
        </section>
        <section>
          <h2>{translate('Still to confirm', '仍需确认')}</h2>
          <ul>
            <li>
              {translate(
                'Balance unit and treatment of fractional refunds',
                '余额单位及非整数返还处理',
              )}
            </li>
            <li>
              {translate(
                'Exact cutoff boundaries and business timezone',
                '准确的截止边界及营业时区',
              )}
            </li>
            <li>
              {translate(
                'No-shows, used credit and expired credit',
                '未到店、已使用及已过期额度的处理',
              )}
            </li>
          </ul>
        </section>
      </div>
      {editing && (
        <Modal
          title={translate('Edit cancellation policy', '编辑取消政策')}
          onClose={close}
          className="hc-policy-dialog"
        >
          <form ref={form} className="hc-settings-form" onSubmit={save}>
            <UnsavedChanges active={dirty} />
            <p className="hc-balance-preview">
              {translate(
                'Save a draft for review. Leaving a field unconfigured keeps that rule pending.',
                '保存供核对的草稿，未配置的规则会保持待确认。',
              )}
            </p>
            {error && (
              <p role="alert" className="hc-range-feedback">
                {error}
              </p>
            )}
            <label>
              {translate('Policy name (optional)', '政策名称（选填）')}
              <input
                maxLength={80}
                value={draft.name}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              />
            </label>
            <div className="hc-time-fields">
              <label>
                {translate('Full restoration notice (days)', '全额返还提前天数')}
                <input
                  required
                  type="number"
                  min="2"
                  step="1"
                  value={draft.fullDays}
                  onChange={(event) => setDraft({ ...draft, fullDays: Number(event.target.value) })}
                />
              </label>
              <label>
                {translate('Half restoration notice (days)', '半额返还提前天数')}
                <input
                  required
                  type="number"
                  min="1"
                  step="1"
                  value={draft.halfDays}
                  onChange={(event) => setDraft({ ...draft, halfDays: Number(event.target.value) })}
                />
              </label>
            </div>
            <label>
              {translate('Short-notice restoration (%)', '临近到店返还比例（%）')}
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                placeholder={translate('Not configured', '尚未配置')}
                value={draft.shortPercent}
                onChange={(event) => setDraft({ ...draft, shortPercent: event.target.value })}
              />
            </label>
            <label>
              {translate('Notice calculation', '提前时间计算')}
              <CustomSelect
                value={draft.basis}
                onChange={(event) =>
                  setDraft({ ...draft, basis: event.target.value as CancellationPolicy['basis'] })
                }
              >
                <option value="">{translate('Not configured', '尚未配置')}</option>
                <option value="hours">
                  {translate('Elapsed time (24 hours per day)', '实际时长（每天 24 小时）')}
                </option>
                <option value="calendar">
                  {translate('Calendar days in the house timezone', '按房屋时区计算日历天')}
                </option>
              </CustomSelect>
            </label>
            <div className="hc-settings-actions">
              <button type="button" className="hc-manage" onClick={close}>
                {translate('Cancel', '取消')}
              </button>
              <button className="hc-apply" type="submit">
                {translate('Save policy draft', '保存政策草稿')}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}
