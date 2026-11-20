import React from 'react';
import { useTranslation } from 'react-i18next';
import Modal from './modal';
import SegmentedTabs from './segmented-tabs';
import Icon from './icons';
import { PetTypeIcon } from './pet-type';
import { WorkspaceAvatar } from './workspace-photos';
import { apiJson } from './api-client';
import { Pagination, useCursorPage } from './pagination';
import { useWorkspaceText } from './workspace-text';
import { localeFor, uiText, speciesText } from './i18n';
import type { Booking, PetRow, EventRow } from './workspace-data';
export default function PetDetails({
  customerId,
  petId,
  name,
  onClose,
}: {
  customerId: string;
  petId: string;
  name: string;
  onClose: () => void;
}) {
  const t = useWorkspaceText();
  const { i18n } = useTranslation();
  const [tab, setTab] = React.useState('info');
  const [row, setRow] = React.useState<PetRow | null>(null);
  const [error, setError] = React.useState(false);
  const params = new URLSearchParams({ customerId, petId });
  React.useEffect(() => {
    const abort = new AbortController();
    void apiJson<{ items: PetRow[] }>('/workspace/pets?' + params, { signal: abort.signal })
      .then((result) => {
        if (!result.items[0]) throw Error();
        setRow(result.items[0]);
      })
      .catch(() => {
        if (!abort.signal.aborted) setError(true);
      });
    return () => abort.abort();
  }, [customerId, petId]);
  const bookings = useCursorPage<Booking>('/bookings?' + params, undefined, tab === 'bookings');
  const activity = useCursorPage<EventRow>(
    '/workspace/events?' + params,
    undefined,
    tab === 'activity',
  );
  const na = uiText('common.notAvailable');
  const date = (value: string) => new Date(value).toLocaleString(localeFor(i18n.language));
  return (
    <Modal title={name} onClose={onClose} className="pet-details-dialog">
      <SegmentedTabs
        label={t('viewPet')}
        value={tab}
        onChange={setTab}
        items={[
          {
            value: 'info',
            label: (
              <>
                <Icon name="account" />
                {t('petInformation')}
              </>
            ),
          },
          {
            value: 'bookings',
            label: (
              <>
                <Icon name="calendar" />
                {t('bookings')}
              </>
            ),
          },
          {
            value: 'balance',
            label: (
              <>
                <Icon name="balance" />
                {t('balance')}
              </>
            ),
          },
          {
            value: 'activity',
            label: (
              <>
                <Icon name="clock" />
                {t('activity')}
              </>
            ),
          },
        ]}
      />
      {error ? (
        <p role="alert">{t('loadError')}</p>
      ) : !row ? (
        <p role="status">{t('loading')}</p>
      ) : (
        <>
          <div className="pet-details-identity">
            <WorkspaceAvatar row={row} large />
            <PetTypeIcon species={row.pet.species ?? ''} />
            <strong>{row.pet.name}</strong>
          </div>
          {(tab === 'info' || tab === 'balance') && (
            <dl className="workspace-details">
              {(tab === 'info'
                ? [
                    [t('owner'), row.customer.name],
                    [t('type'), row.pet.species ? speciesText(row.pet.species) : na],
                    [
                      t('weight'),
                      row.pet.weightKg == null
                        ? na
                        : uiText('ui.pets.weightValue', { weight: row.pet.weightKg }),
                    ],
                  ]
                : [
                    [t('balance'), row.account ? `${row.account.days} ${t('days')}` : na],
                    [t('validFrom'), row.account?.validFrom ?? na],
                    [t('validThrough'), row.account?.validThrough ?? na],
                  ]
              ).map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          )}
          {tab === 'bookings' && (
            <section aria-label={t('bookings')}>
              {bookings.loading ? (
                <p role="status">{t('loading')}</p>
              ) : bookings.error ? (
                <p role="alert">{t('loadError')}</p>
              ) : !bookings.items.length ? (
                <p>{t('emptyBookings')}</p>
              ) : (
                <ul className="pet-detail-events">
                  {bookings.items.map((booking) => (
                    <li key={booking.id}>
                      <Icon name="calendar" />
                      <div>
                        <strong>{t(booking.status)}</strong>
                        <p>
                          {date(booking.arrival)} – {date(booking.pickup)}
                        </p>
                        <small>{t('unbilled')}</small>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <Pagination page={bookings} label={t('bookings')} />
            </section>
          )}
          {tab === 'activity' && (
            <section aria-label={t('activity')}>
              {activity.loading ? (
                <p role="status">{t('loading')}</p>
              ) : activity.error ? (
                <p role="alert">{t('loadError')}</p>
              ) : !activity.items.length ? (
                <p>{t('emptyActivity')}</p>
              ) : (
                <ul className="pet-detail-events">
                  {activity.items.map(({ event }) => (
                    <li key={(event.kind ?? 'balance') + ':' + event.id}>
                      <Icon name={event.bookingId ? 'calendar' : 'balance'} />
                      <div>
                        <strong>
                          {t(
                            event.kind ??
                              (event.delta > 0
                                ? 'added'
                                : event.delta < 0
                                  ? 'correction'
                                  : 'terms'),
                          )}
                        </strong>
                        <time dateTime={event.at}>{date(event.at)}</time>
                        <p>
                          {event.bookingId
                            ? `${date(event.arrival!)} – ${date(event.pickup!)}`
                            : `${event.delta > 0 ? '+' : ''}${event.delta} ${t('days')} · ${event.daysAfter} ${t('days')}`}
                        </p>
                        {event.reason && <p>{event.reason}</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <Pagination page={activity} label={t('activity')} />
            </section>
          )}
        </>
      )}
    </Modal>
  );
}
