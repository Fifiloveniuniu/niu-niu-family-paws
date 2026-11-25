import React from 'react';
import Icon from './icons';
import Button from './button';
import SegmentedTabs from './segmented-tabs';
import { useWorkspaceText } from './workspace-text';
import type { CalendarView } from './workspace-calendar';

export default function CalendarControls({
  title,
  view,
  onShift,
  onToday,
  onView,
  timezone,
  disabled = false,
}: {
  title: string;
  view: CalendarView;
  onShift: (direction: number) => void;
  onToday: () => void;
  onView: (view: CalendarView) => void;
  timezone?: React.ReactNode;
  disabled?: boolean;
}) {
  const t = useWorkspaceText();
  return (
    <div
      className="workspace-range-controls calendar-time-controls"
      role="group"
      aria-label={t('period')}
    >
      <div className="hc-range">
        <button
          type="button"
          disabled={disabled}
          aria-label={t('previous')}
          title={t('previous')}
          onClick={() => onShift(-1)}
        >
          <Icon name="chevron-left" />
        </button>
        <Button
          variant="secondary"
          className="calendar-today"
          icon="calendar"
          type="button"
          disabled={disabled}
          onClick={onToday}
        >
          {t('today')}
        </Button>
        <button
          type="button"
          disabled={disabled}
          aria-label={t('next')}
          title={t('next')}
          onClick={() => onShift(1)}
        >
          <Icon name="chevron-right" />
        </button>
        <h2>{title}</h2>
      </div>
      <SegmentedTabs
        label={t('calendarView')}
        value={view}
        disabled={disabled}
        onChange={(value) => onView(value as CalendarView)}
        items={(['day', 'week', 'month', 'year'] as const).map((value) => ({
          value,
          label: t(value),
        }))}
      />
      {timezone}
    </div>
  );
}
