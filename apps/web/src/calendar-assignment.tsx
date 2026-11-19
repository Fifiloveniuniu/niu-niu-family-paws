import { parseWallInput } from './wall-time';
import { petTypes, petTypeChoice, PetTypeIcon } from './pet-type';
import CustomDateInput from './custom-date-input';
import { localeFor, speciesText, uiText } from './i18n.ts';
import CustomSelect from './custom-select';
import CustomAutocomplete from './custom-autocomplete';
import { localDateTimeValue } from './date-utils';
import { sampleDateAtOffset, sampleDayOffset } from './calendar-time';
import React from 'react';
import { useTranslation } from 'react-i18next';
import Modal from './modal';
import { PetProfileAvatar } from './calendar-pet-photos';
import UnsavedChanges, { confirmDiscardChanges } from './unsaved-changes';
import {
  balanceKey,
  plannedDays,
  type PetBalance,
  type BalanceService,
  type PlannedCoverage,
} from './pet-balance';
import {
  placementIssue,
  unavailableRanges,
  availableRanges,
  type Placement,
  type PlacementIssue,
} from './calendar-placement';
export type PlacementHouse = {
  id: number;
  name: string;
  rooms: { id: number; name: string; capacity: string; costs?: Record<string, string> }[];
};
export default function AssignmentDialog({
  houses,
  stays,
  pets,
  customers,
  anchor,
  initial,
  onClose,
  onApply,
  balances,
  balancePlans,
  onManageBalance,
}: {
  houses: PlacementHouse[];
  stays: Placement[];
  pets: { name: string; species: string; customerId: string }[];
  customers: { id: string; name: string }[];
  anchor: Date;
  initial?: { house: number; room: number };
  onClose: () => void;
  onApply: (stay: Placement) => void;
  balances: Record<string, PetBalance>;
  balancePlans: PlannedCoverage[];
  onManageBalance: (pet: string, service: BalanceService) => void;
}) {
  const { i18n } = useTranslation();

  const [customer, setCustomer] = React.useState('');
  const [pet, setPet] = React.useState('');
  const [petType, setPetType] = React.useState('');
  const [start, setStart] = React.useState(localDateTimeValue(sampleDateAtOffset(anchor, 0)));
  const [end, setEnd] = React.useState('');
  const [house, setHouse] = React.useState(initial ? String(initial.house) : '');
  const [room, setRoom] = React.useState(initial ? String(initial.room) : '');
  const service: BalanceService = 'boarding';
  const [step, setStep] = React.useState(1);
  const [week, setWeek] = React.useState(0);
  const [feedback, setFeedback] = React.useState('');

  React.useEffect(() => setWeek(0), [start]);
  const [dirty, setDirty] = React.useState(false);
  const form = React.useRef<HTMLFormElement>(null);
  const selected = pets.find((petProfile) => petProfile.name === pet);
  const dayOffset = (dateValue: string) => sampleDayOffset(anchor, new Date(dateValue));
  const begin = dayOffset(start);
  const finish = dayOffset(end);
  const valid =
    !!selected &&
    !!parseWallInput(start, true) &&
    !!parseWallInput(end, true) &&
    Number.isFinite(begin) &&
    Number.isFinite(finish) &&
    finish > begin;
  const roomIssue = (
    candidateHouse: PlacementHouse,
    candidateRoom: PlacementHouse['rooms'][number],
  ) =>
    !valid
      ? 'dates'
      : placementIssue(
          stays,
          pet,
          selected!.species,
          begin,
          finish,
          candidateHouse.id,
          candidateRoom.id,
          Number(candidateRoom.capacity),
          Number(candidateRoom.costs?.[selected!.species]),
        );
  const reasons: Record<Exclude<PlacementIssue, null>, string> = {
    dates: uiText('ui.calendarAssignment.chooseAPetAndValidTimesFirst'),
    duplicate: uiText('ui.calendarAssignment.petAlreadyHasAStayAtThisTime'),
    species: uiText('ui.calendarAssignment.anotherSpeciesIsStayingHere'),
    overdue: uiText('ui.calendarAssignment.overduePickupAvailabilityNeedsReview'),
    boundary: uiText('ui.calendarAssignment.backToBackStayTurnoverRuleNeeded'),
    capacity: uiText('ui.calendarAssignment.notEnoughCapacityForTheWholeStay'),
    unconfigured: uiText('ui.calendarAssignment.configureRoomCapacityAndPetUsage'),
  };
  const rangeReasons = {
    ...reasons,
    capacity: uiText('ui.calendarAssignment.atCapacity'),
    species: uiText('ui.calendarAssignment.differentPetType'),
    duplicate: uiText('ui.calendarAssignment.petAlreadyScheduled'),
    unconfigured: uiText('ui.calendarAssignment.setupNeeded'),
    overdue: uiText('ui.calendarAssignment.pickupOverdue'),
  };
  const detailsValid = valid && !!service;
  const account = balances[balanceKey(pet, service)];
  const availableDays = account ? account.days - plannedDays(balancePlans, pet, service) : null;
  const chosenHouse = houses.find((candidateHouse) => String(candidateHouse.id) === house);
  const chosenRoom = chosenHouse?.rooms.find((candidateRoom) => String(candidateRoom.id) === room);
  const problem = chosenHouse && chosenRoom ? roomIssue(chosenHouse, chosenRoom) : 'dates';
  const calendarStart = Number.isFinite(new Date(start).getTime())
    ? new Date(start)
    : new Date(anchor);
  calendarStart.setHours(0, 0, 0, 0);
  calendarStart.setDate(calendarStart.getDate() + week * 7);
  const days = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(calendarStart);
    day.setDate(day.getDate() + i);
    return day;
  });
  const locale = localeFor(i18n.language);
  const calendarEnd = new Date(calendarStart);
  calendarEnd.setDate(calendarEnd.getDate() + 7);
  const viewFrom = dayOffset(localDateTimeValue(calendarStart));
  const viewTo = dayOffset(localDateTimeValue(calendarEnd));
  const viewLength = viewTo - viewFrom;
  const position = (value: number) => ((value - viewFrom) / viewLength) * 100;
  const timeFor = (value: number) => sampleDateAtOffset(anchor, value);
  const rangeLabel = (a: number, b: number) =>
    timeFor(a).toLocaleString(locale, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }) +
    ' – ' +
    timeFor(b).toLocaleString(locale, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  function chooseRange(
    candidateHouse: PlacementHouse,
    candidateRoom: PlacementHouse['rooms'][number],
    arrival = begin,
    pickup = finish,
  ) {
    if (!valid) {
      setFeedback(reasons.dates);
      return;
    }
    const reason = placementIssue(
      stays,
      pet,
      selected!.species,
      arrival,
      pickup,
      candidateHouse.id,
      candidateRoom.id,
      Number(candidateRoom.capacity),
      Number(candidateRoom.costs?.[selected!.species]),
    );
    if (reason) {
      setFeedback(reasons[reason]);
      return;
    }
    setStart(localDateTimeValue(timeFor(arrival)));
    setEnd(localDateTimeValue(timeFor(pickup)));
    setHouse(String(candidateHouse.id));
    setRoom(String(candidateRoom.id));
    setDirty(true);
    setFeedback('');
  }
  function chooseTime(
    event: React.MouseEvent<HTMLDivElement>,
    candidateHouse: PlacementHouse,
    candidateRoom: PlacementHouse['rooms'][number],
  ) {
    if (!valid) {
      setFeedback(reasons.dates);
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const arrival =
      Math.round((viewFrom + ((event.clientX - rect.left) / rect.width) * viewLength) * 1440) /
      1440;
    chooseRange(candidateHouse, candidateRoom, arrival, arrival + (finish - begin));
  }
  const close = () => {
    if (confirmDiscardChanges(i18n.language, form.current)) onClose();
  };
  const invalidate = () => {
    setDirty(true);
    setHouse('');
    setRoom('');
    setFeedback('');
  };
  return (
    <Modal
      className={'hc-assignment-dialog hc-wizard-stage-' + step}
      title={uiText('ui.calendarAssignment.addBooking')}
      onClose={close}
    >
      <form
        ref={form}
        className="hc-settings-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (step === 1) {
            if (detailsValid) setStep(2);
            return;
          }
          if (step === 2) {
            if (chosenRoom && !problem) setStep(3);
            return;
          }
          if (!selected || !chosenHouse || !chosenRoom || problem || !service) return;
          onApply({
            id: crypto.randomUUID(),
            name: pet,
            species: selected.species,
            house: chosenHouse.id,
            room: chosenRoom.id,
            start: begin,
            end: finish,
            status: 'upcoming',
            units: Number(chosenRoom.costs?.[selected.species]),
          });
        }}
      >
        <ol
          className="hc-wizard-progress"
          aria-label={uiText('ui.calendarAssignment.schedulingSteps')}
        >
          {[
            uiText('ui.calendarAssignment.stayDetails'),
            uiText('ui.calendarAssignment.chooseRoom'),
            uiText('ui.calendarAssignment.review'),
          ].map((label, index) => (
            <li
              key={index}
              aria-current={step === index + 1 ? 'step' : undefined}
              className={step > index + 1 ? 'complete' : ''}
            >
              <span>{step > index + 1 ? '✓' : index + 1}</span>
              {label}
            </li>
          ))}
        </ol>
        <UnsavedChanges active={dirty} />
        <p className="hc-wizard-caption">
          {uiText('ui.calendarAssignment.timesShownInYourBrowserSTimeZone')}
        </p>
        <section
          className="hc-wizard-step"
          data-booking-step="1"
          hidden={step !== 1}
          aria-label={uiText('ui.calendarAssignment.stayDetails')}
        >
          <div className="hc-step-intro">
            <h3>{uiText('ui.calendarAssignment.whoSStayingAndWhen')}</h3>
            <p>{uiText('ui.calendarAssignment.chooseYourGuestAndTheirPlannedArrivalAndPickup')}</p>
          </div>
          <label>
            {uiText('ui.calendarAssignment.customer')}
            <CustomAutocomplete
              label={uiText('ui.calendarAssignment.customer')}
              required
              value={customer}
              options={customers.map((item) => ({ value: item.id, label: item.name }))}
              onChange={(value) => {
                setCustomer(value);
                setPet('');
                invalidate();
              }}
            />
          </label>
          <label>
            {uiText('ui.houseCalendar.petType')}
            <CustomAutocomplete
              label={uiText('ui.houseCalendar.petType')}
              value={petType}
              disabled={false}
              options={[
                { value: '', label: uiText('ui.houseCalendar.allTypes') },
                ...petTypes.map((species) => ({
                  value: species,
                  label: speciesText(species),
                  content: petTypeChoice(species),
                  adornment: <PetTypeIcon species={species} />,
                })),
              ]}
              onChange={(value) => {
                setPetType(value);
                setPet('');
                invalidate();
              }}
            />
          </label>
          <label>
            {uiText('ui.calendarAssignment.pet')}
            <CustomAutocomplete
              label={uiText('ui.calendarAssignment.pet')}
              required
              disabled={!customer}
              value={pet}
              options={pets
                .filter(
                  (item) => item.customerId === customer && (!petType || item.species === petType),
                )
                .map((item) => ({
                  value: item.name,
                  label: item.name,
                  search: item.name + ' ' + speciesText(item.species),
                  adornment: <PetProfileAvatar name={item.name} />,
                  content: (
                    <span className="custom-autocomplete-pet">
                      <PetProfileAvatar name={item.name} />
                      <span>
                        <strong>{item.name}</strong>
                      </span>
                    </span>
                  ),
                }))}
              onChange={(value) => {
                setPet(value);
                invalidate();
              }}
            />
          </label>
          <div className="hc-time-fields">
            <label>
              {uiText('ui.calendarAssignment.arrival')}
              <CustomDateInput
                type="datetime-local"
                required
                value={start}
                onChange={(value) => {
                  setStart(value);
                  invalidate();
                }}
              />
            </label>
            <label>
              {uiText('ui.calendarAssignment.pickup')}
              <CustomDateInput
                type="datetime-local"
                required
                value={end}
                onChange={(value) => {
                  setEnd(value);
                  invalidate();
                }}
              />
            </label>
          </div>
          {end && finish <= begin && (
            <p className="hc-range-feedback" role="alert">
              {uiText('ui.calendarAssignment.pickupMustBeAfterArrival')}
            </p>
          )}
        </section>
        <section
          className="hc-wizard-step"
          data-booking-step="2"
          hidden={step !== 2}
          aria-label={uiText('ui.calendarAssignment.chooseRoom')}
        >
          <div className="hc-step-stay">
            <PetProfileAvatar name={pet} className="hc-guest-avatar" />
            <div>
              <strong>{pet}</strong>
              <span>{valid ? rangeLabel(begin, finish) : ''}</span>
            </div>
            <button type="button" className="hc-text-button" onClick={() => setStep(1)}>
              {uiText('ui.calendarAssignment.edit')}
            </button>
          </div>
          <section
            className="hc-schedule-picker"
            aria-label={uiText('ui.calendarAssignment.roomAvailabilityCalendar')}
          >
            <div className="hc-schedule-heading">
              <h3>{uiText('ui.calendarAssignment.availableSpace')}</h3>
              <div>
                <button
                  type="button"
                  title={uiText('ui.calendarAssignment.previousWeek')}
                  aria-label={uiText('ui.calendarAssignment.previousWeek')}
                  onClick={() => setWeek(week - 1)}
                >
                  ‹
                </button>
                <span>
                  {days[0].toLocaleDateString(locale, { month: 'short', day: 'numeric' })} –{' '}
                  {days[6].toLocaleDateString(locale, { month: 'short', day: 'numeric' })}
                </span>
                <button
                  type="button"
                  title={uiText('ui.calendarAssignment.nextWeek')}
                  aria-label={uiText('ui.calendarAssignment.nextWeek')}
                  onClick={() => setWeek(week + 1)}
                >
                  ›
                </button>
              </div>
            </div>
            <p className="hc-setup-note">
              {uiText('ui.calendarAssignment.grayBandsShowUnavailableTimeRangesEnterArrivalAnd')}
            </p>
            <div
              className="hc-schedule-scroll"
              tabIndex={0}
              aria-label={uiText('ui.calendarAssignment.scrollRoomAvailabilityCalendar')}
            >
              <div className="hc-range-calendar">
                <div className="hc-range-axis">
                  <div>{uiText('ui.calendarAssignment.houseRoom')}</div>
                  <div className="hc-range-dates">
                    {days.map((day) => (
                      <div
                        key={day.toISOString()}
                        style={{ left: `${position(dayOffset(localDateTimeValue(day)))}%` }}
                      >
                        <small>{day.toLocaleDateString(locale, { weekday: 'short' })}</small>
                        {day.toLocaleDateString(locale, { month: 'numeric', day: 'numeric' })}
                      </div>
                    ))}
                  </div>
                </div>
                {houses.map((candidateHouse) => (
                  <React.Fragment key={candidateHouse.id}>
                    <div className="hc-range-house">{candidateHouse.name}</div>
                    {!candidateHouse.rooms.length && (
                      <p className="hc-room-empty">{uiText('ui.calendarAssignment.noRoomsYet')}</p>
                    )}
                    {candidateHouse.rooms.map((candidateRoom) => {
                      const unavailable = selected
                        ? unavailableRanges(
                            stays,
                            pet,
                            selected.species,
                            viewFrom,
                            viewTo,
                            candidateHouse.id,
                            candidateRoom.id,
                            Number(candidateRoom.capacity),
                            Number(candidateRoom.costs?.[selected.species]),
                          )
                        : [];
                      const problem = roomIssue(candidateHouse, candidateRoom);
                      const picked =
                        String(candidateHouse.id) === house && String(candidateRoom.id) === room;
                      const left = Math.max(0, position(begin));
                      const right = Math.min(100, position(finish));
                      return (
                        <div className="hc-range-room" key={candidateRoom.id}>
                          <div className="hc-range-room-name">
                            <strong>{candidateRoom.name}</strong>
                            <button
                              type="button"
                              disabled={!!problem}
                              title={
                                problem
                                  ? reasons[problem]
                                  : uiText('ui.calendarAssignment.chooseThisRoomForTheEnteredTimes')
                              }
                              aria-label={`${uiText('ui.calendarAssignment.choose')} ${candidateHouse.name} · ${candidateRoom.name}`}
                              onClick={() => chooseRange(candidateHouse, candidateRoom)}
                            >
                              {picked && !problem
                                ? uiText('ui.calendarAssignment.selected')
                                : uiText('ui.calendarAssignment.chooseRoom')}
                            </button>
                          </div>
                          <div
                            className={'hc-time-track' + (!selected ? ' pending' : '')}
                            aria-label={`${candidateHouse.name} · ${candidateRoom.name}`}
                            onClick={(event) => chooseTime(event, candidateHouse, candidateRoom)}
                          >
                            {selected &&
                              availableRanges(viewFrom, viewTo, unavailable).map((range, index) => {
                                const duration = finish - begin;
                                const arrival =
                                  begin >= range.start && finish <= range.end
                                    ? begin
                                    : Math.round(
                                        (range.start + (range.end - range.start - duration) / 2) *
                                          1440,
                                      ) / 1440;
                                const pickup = arrival + duration;
                                const issue =
                                  !valid || arrival < range.start || pickup > range.end
                                    ? 'dates'
                                    : placementIssue(
                                        stays,
                                        pet,
                                        selected.species,
                                        arrival,
                                        pickup,
                                        candidateHouse.id,
                                        candidateRoom.id,
                                        Number(candidateRoom.capacity),
                                        Number(candidateRoom.costs?.[selected.species]),
                                      );
                                return (
                                  <button
                                    type="button"
                                    key={'free-' + index}
                                    className="hc-time-available"
                                    style={{
                                      left: `${position(range.start)}%`,
                                      width: `${position(range.end) - position(range.start)}%`,
                                    }}
                                    disabled={!!issue}
                                    aria-label={`${uiText('ui.calendarAssignment.freeSpace')}: ${candidateHouse.name} · ${candidateRoom.name} · ${rangeLabel(arrival, pickup)}`}
                                    title={issue ? reasons[issue] : rangeLabel(arrival, pickup)}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      chooseRange(candidateHouse, candidateRoom, arrival, pickup);
                                    }}
                                  >
                                    <span>{uiText('ui.calendarAssignment.freeSpace')}</span>
                                  </button>
                                );
                              })}
                            {selected &&
                              unavailable.map((range, i) => (
                                <button
                                  key={i}
                                  type="button"
                                  disabled
                                  className="hc-time-unavailable"
                                  style={{
                                    left: `${position(range.start)}%`,
                                    width: `${position(range.end) - position(range.start)}%`,
                                  }}
                                  title={`${rangeLabel(range.start, range.end)} · ${reasons[range.reason]}`}
                                  aria-label={`${candidateHouse.name} · ${candidateRoom.name} · ${rangeLabel(range.start, range.end)} · ${reasons[range.reason]}`}
                                >
                                  <span>{rangeReasons[range.reason]}</span>
                                </button>
                              ))}
                            {valid && !problem && right > left && (
                              <button
                                type="button"
                                className={'hc-time-request' + (picked ? ' picked' : '')}
                                style={{ left: `${left}%`, width: `${right - left}%` }}
                                aria-label={`${uiText('ui.calendarAssignment.choose')} ${candidateHouse.name} · ${candidateRoom.name} · ${rangeLabel(begin, finish)}`}
                                aria-pressed={picked}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  chooseRange(candidateHouse, candidateRoom);
                                }}
                              >
                                {picked
                                  ? uiText('ui.calendarAssignment.selected')
                                  : uiText('ui.calendarAssignment.choose')}
                              </button>
                            )}
                            {!selected && (
                              <span className="hc-time-placeholder">
                                {uiText('ui.calendarAssignment.selectAPetToSeeAvailability')}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>
            <div className="hc-schedule-legend">
              <span>
                <i />
                {uiText('ui.calendarAssignment.availableTime')}
              </span>
              <span>
                <i className="unavailable" />
                {uiText('ui.calendarAssignment.unavailableTimeRange')}
              </span>
            </div>
            {feedback && (
              <p className="hc-range-feedback" role="alert">
                {feedback}
              </p>
            )}

            {chosenHouse && chosenRoom && !problem && (
              <p className="hc-schedule-selection" role="status">
                {chosenHouse.name} · {chosenRoom.name} · {new Date(start).toLocaleString(locale)} →{' '}
                {new Date(end).toLocaleString(locale)}
              </p>
            )}
          </section>
          {valid && chosenRoom && problem && (
            <p className="hc-setup-note" role="alert">
              {reasons[problem]}
            </p>
          )}
        </section>
        <section
          className="hc-wizard-step"
          data-booking-step="3"
          hidden={step !== 3}
          aria-label={uiText('ui.calendarAssignment.reviewStay')}
        >
          <div className="hc-step-intro">
            <h3>{uiText('ui.calendarAssignment.everythingReadyForTheirStay')}</h3>
            <p>{uiText('ui.calendarAssignment.reviewTheDetailsBeforeAddingThisStayToThe')}</p>
          </div>
          <div className="hc-review-card">
            <div className="hc-review-guest">
              <PetProfileAvatar name={pet} className="hc-guest-avatar" />
              <div>
                <strong>{pet}</strong>
                <small>{selected ? speciesText(selected.species) : ''}</small>
              </div>
            </div>
            <dl>
              <div>
                <dt>{uiText('ui.calendarAssignment.arrival')}</dt>
                <dd>{valid ? new Date(start).toLocaleString(locale) : 'N/A'}</dd>
              </div>
              <div>
                <dt>{uiText('ui.calendarAssignment.pickup')}</dt>
                <dd>{valid ? new Date(end).toLocaleString(locale) : 'N/A'}</dd>
              </div>
              <div>
                <dt>{uiText('ui.calendarAssignment.houseRoom2')}</dt>
                <dd>
                  {chosenHouse?.name} · {chosenRoom?.name}
                </dd>
              </div>
            </dl>
          </div>
          <div className="hc-coverage-card needs-review" aria-live="polite">
            <div>
              <h4>{uiText('ui.calendarAssignment.boardingBalance')}</h4>
            </div>
            <dl>
              <div>
                <dt>{uiText('ui.calendarAssignment.availableToPlan')}</dt>
                <dd>{availableDays ?? 'N/A'}</dd>
              </div>
              <div>
                <dt>{uiText('ui.calendarAssignment.thisStay')}</dt>
                <dd>N/A</dd>
              </div>
              <div>
                <dt>{uiText('ui.calendarAssignment.afterPlanning')}</dt>
                <dd>N/A</dd>
              </div>
            </dl>
            <button
              className="hc-text-button"
              type="button"
              onClick={() => onManageBalance(pet, service)}
            >
              {account
                ? uiText('ui.calendarAssignment.managePetBalance')
                : uiText('ui.calendarAssignment.addBalance')}
            </button>
            <p>{uiText('ui.calendarAssignment.dayUsageAwaitsTheBillingRuleSavingThisSchedule')}</p>
          </div>
          <p className="hc-review-note">
            {uiText('ui.calendarAssignment.thisDoesNotCreateAPaidBookingOrRecord')}
          </p>
        </section>
        <div className="hc-wizard-footer">
          <div className="hc-wizard-secondary">
            {step > 1 && (
              <button className="hc-manage" type="button" onClick={() => setStep(step - 1)}>
                ← {uiText('ui.calendarAssignment.back')}
              </button>
            )}
            <button className="hc-manage" type="button" onClick={close}>
              {uiText('ui.calendarAssignment.cancel')}
            </button>
          </div>
          <span>
            {uiText('ui.calendarAssignment.step')} {step} {uiText('ui.calendarAssignment.of3')}
          </span>
          <button
            className="hc-apply"
            disabled={
              step === 1
                ? !detailsValid
                : step === 2
                  ? !chosenRoom || !!problem
                  : !chosenRoom || !!problem
            }
          >
            {step === 1
              ? uiText('ui.calendarAssignment.chooseARoom')
              : step === 2
                ? uiText('ui.calendarAssignment.reviewStay')
                : uiText('ui.calendarAssignment.addToCalendar')}{' '}
            <span aria-hidden="true">{step === 3 ? '✓' : '→'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
