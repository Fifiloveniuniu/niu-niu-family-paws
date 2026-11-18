import { uiText } from './i18n.ts';
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
            ? uiText('ui.calendarSettings.addRoom')
            : uiText('ui.calendarSettings.addHouse')
          : room
            ? uiText('ui.calendarSettings.roomSettings')
            : uiText('ui.calendarSettings.houseSettings')
      }
      onClose={close}
    >
      <form
        ref={form}
        className="hc-settings-form"
        onSubmit={(event) => {
          event.preventDefault();
          onApply({ ...draft, name: draft.name.trim(), address: draft.address.trim() });
        }}
      >
        <UnsavedChanges active={dirty} />
        {room && <p className="hc-setting-parent">{houseName}</p>}
        <label>
          {room ? uiText('ui.calendarSettings.roomName') : uiText('ui.calendarSettings.houseName')}
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
              {uiText('ui.calendarSettings.maximumCapacity')}
              <input
                type="number"
                min={Math.max(1, minimumCapacity)}
                step="0.01"
                placeholder={uiText('ui.calendarSettings.notConfigured')}
                value={draft.capacity}
                onChange={(event) => field('capacity', event.target.value)}
              />
            </label>
            {minimumCapacity > 0 && (
              <p className="hc-setup-note">
                {uiText('ui.calendarSettings.existingStaysNeedAtLeast')} {minimumCapacity}{' '}
                {uiText('ui.calendarSettings.capacityUnitsAtPeak')}
              </p>
            )}
            <p className="hc-setup-note">
              {uiText('ui.calendarSettings.capacityIsWeightedNotAPetCountConfigurePet')}
            </p>
            {['dog', 'cat', 'rabbit'].map((species, index) => (
              <label key={species}>
                {uiText('ui.calendarSettings.capacityUsage.' + species)}
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder={uiText('ui.calendarSettings.notConfigured')}
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
              {uiText('ui.calendarSettings.addressOptional')}
              <input
                required
                pattern={String.raw`.*\S.*`}
                maxLength={500}
                value={draft.address}
                onChange={(event) => field('address', event.target.value)}
              />
            </label>
            <label>
              {uiText('ui.calendarSettings.timeZone')}
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
                      uiText('ui.calendarSettings.chooseAValidTimeZone'),
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
              {uiText('ui.calendarSettings.theTimelineUsesYourBrowserSTimeZonePer')}
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
                if (window.confirm(uiText('ui.calendarSettings.removeThisEmptyLocation')))
                  onRemove();
              }}
            >
              {room
                ? uiText('ui.calendarSettings.removeRoom')
                : uiText('ui.calendarSettings.removeHouse')}
            </button>
            {removeReason && <p className="hc-setup-note">{removeReason}</p>}
          </div>
        )}
        <div className="hc-settings-actions">
          <button className="hc-apply" type="submit">
            {uiText('ui.calendarSettings.applyChanges')}
          </button>
          <button className="hc-manage" type="button" onClick={close}>
            {uiText('ui.calendarSettings.cancel')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
