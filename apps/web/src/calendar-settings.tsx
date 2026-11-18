import React from 'react';
import { useTranslation } from 'react-i18next';
import Modal from './modal';
import UnsavedChanges, { confirmDiscardChanges } from './unsaved-changes';

export type CalendarSettings = {
  name: string;
  address: string;
  timezone: string;
  capacity: string;
  costs?: Record<string, string>;
};
export default function CalendarSettingsDialog({
  room,
  houseName,
  value,
  onApply,
  onClose,
  creating = false,
  onRemove,
  removeReason,
  minimumCapacity = 0,
}: {
  room: boolean;
  houseName: string;
  value: CalendarSettings;
  onApply: (value: CalendarSettings) => void;
  onClose: () => void;
  creating?: boolean;
  onRemove?: () => void;
  removeReason?: string;
  minimumCapacity?: number;
}) {
  const { i18n } = useTranslation();
  const isChinese = i18n.language === 'zh';
  const translate = (en: string, cn: string) => (isChinese ? cn : en);
  const [draft, setDraft] = React.useState(value);
  const form = React.useRef<HTMLFormElement>(null);
  const id = React.useId();
  const dirty = JSON.stringify(draft) !== JSON.stringify(value);
  function close() {
    if (confirmDiscardChanges(i18n.language, form.current)) onClose();
  }
  function field(key: keyof CalendarSettings, value: string) {
    setDraft((previous) => ({ ...previous, [key]: value }));
  }
  return (
    <Modal
      title={
        creating
          ? room
            ? translate('Add room', '添加房间')
            : translate('Add house', '添加房屋')
          : room
            ? translate('Room settings', '房间设置')
            : translate('House settings', '房屋设置')
      }
      onClose={close}
    >
      <form
        ref={form}
        className="hc-settings-form"
        onSubmit={(event) => {
          event.preventDefault();
          onApply({ ...draft, name: draft.name.trim() });
        }}
      >
        <UnsavedChanges active={dirty} />
        {room && <p className="hc-setting-parent">{houseName}</p>}
        <label>
          {room ? translate('Room name', '房间名称') : translate('House name', '房屋名称')}
          <input
            required
            maxLength={120}
            value={draft.name}
            onChange={(event) => field('name', event.target.value)}
            pattern={String.raw`.*\S.*`}
          />
        </label>
        {room ? (
          <>
            <label>
              {translate('Maximum capacity', '最大容量')}
              <input
                type="number"
                min={Math.max(1, minimumCapacity)}
                step="0.01"
                placeholder={translate('Not configured', '尚未配置')}
                value={draft.capacity}
                onChange={(event) => field('capacity', event.target.value)}
              />
            </label>
            {minimumCapacity > 0 && (
              <p className="hc-setup-note">
                {translate('Existing stays need at least', '现有托管至少需要')} {minimumCapacity}{' '}
                {translate('capacity units at peak.', '容量单位（最高同时用量）。')}
              </p>
            )}
            <p className="hc-setup-note">
              {translate(
                'Capacity is weighted, not a pet count. Configure illustrative pet-type consumption below or use a placement override. One species at a time.',
                '容量按规则计算，并非宠物数量。请在下方配置示例种类用量，或使用放置时的覆盖值。同一时段仅容纳一种宠物。',
              )}
            </p>
            {['dog', 'cat', 'rabbit'].map((species, index) => (
              <label key={species}>
                {translate(
                  ['Dog capacity usage', 'Cat capacity usage', 'Rabbit capacity usage'][index],
                  ['狗容量用量', '猫容量用量', '兔容量用量'][index],
                )}
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder={translate('Not configured', '尚未配置')}
                  value={draft.costs?.[species] || ''}
                  onChange={(event) =>
                    setDraft({ ...draft, costs: { ...draft.costs, [species]: event.target.value } })
                  }
                />
              </label>
            ))}
          </>
        ) : (
          <>
            <label>
              {translate('Address (optional)', '地址（选填）')}
              <input
                maxLength={500}
                value={draft.address}
                onChange={(event) => field('address', event.target.value)}
              />
            </label>
            <label>
              {translate('Time zone', '时区')}
              <input
                required
                list={id}
                value={draft.timezone}
                onChange={(event) => field('timezone', event.target.value)}
                onInput={(event) => {
                  try {
                    new Intl.DateTimeFormat('en', { timeZone: event.currentTarget.value });
                    event.currentTarget.setCustomValidity('');
                  } catch {
                    event.currentTarget.setCustomValidity(
                      translate('Choose a valid time zone.', '请选择有效时区。'),
                    );
                  }
                }}
              />
            </label>
            <datalist id={id}>
              {['UTC', ...Intl.supportedValuesOf('timeZone')].map((zone) => (
                <option key={zone} value={zone} />
              ))}
            </datalist>
            <p className="hc-setup-note">
              {translate(
                'The sample timeline uses your browser’s time zone. Per-house timeline conversion is not connected yet.',
                '示例时间轴使用浏览器时区，尚未关联各房屋的时区转换。',
              )}
            </p>
          </>
        )}
        {onRemove && (
          <div className="hc-remove-section">
            <button
              type="button"
              className="hc-danger"
              disabled={!!removeReason}
              onClick={() => {
                if (window.confirm(translate('Remove this empty location?', '移除此空位置？')))
                  onRemove();
              }}
            >
              {room ? translate('Remove room', '移除房间') : translate('Remove house', '移除房屋')}
            </button>
            {removeReason && <p className="hc-setup-note">{removeReason}</p>}
          </div>
        )}
        <div className="hc-settings-actions">
          <button className="hc-apply" type="submit">
            {translate('Apply changes', '应用修改')}
          </button>
          <button className="hc-manage" type="button" onClick={close}>
            {translate('Cancel', '取消')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
