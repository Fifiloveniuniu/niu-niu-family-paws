import CustomSelect from './custom-select';
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
  pets: { name: string; species: string }[];
  anchor: Date;
  initial?: { house: number; room: number };
  onClose: () => void;
  onApply: (stay: Placement) => void;
  balances: Record<string, PetBalance>;
  balancePlans: PlannedCoverage[];
  onManageBalance: (pet: string, service: BalanceService) => void;
}) {
  const { i18n } = useTranslation();
  const isChinese = i18n.language === 'zh';
  const translate = (en: string, cn: string) => (isChinese ? cn : en);
  const [pet, setPet] = React.useState('');
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
  const valid = !!selected && Number.isFinite(begin) && Number.isFinite(finish) && finish > begin;
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
    dates: translate('Choose a pet and valid times first', '请先选择宠物和有效时间'),
    duplicate: translate('Pet already has a stay at this time', '该宠物在此时段已有安排'),
    species: translate('Another species is staying here', '此时段有其他种类的宠物'),
    overdue: translate('Overdue pickup · availability needs review', '接回逾期 · 可用性需核实'),
    boundary: translate('Back-to-back stay · turnover rule needed', '相邻时段 · 需确认周转规则'),
    capacity: translate('Not enough capacity for the whole stay', '整个托管时段内容量不足'),
    unconfigured: translate('Configure room capacity and pet usage', '请配置房间容量和宠物用量'),
  };
  const rangeReasons = {
    ...reasons,
    capacity: translate('At capacity', '容量已满'),
    species: translate('Different pet type', '其他种类宠物'),
    duplicate: translate('Pet already scheduled', '宠物已有安排'),
    unconfigured: translate('Setup needed', '需要配置'),
    overdue: translate('Pickup overdue', '接回逾期'),
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
  const locale = isChinese ? 'zh-CN' : 'en-US';
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
      title={translate('Add booking', '添加预约')}
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
        <ol className="hc-wizard-progress" aria-label={translate('Scheduling steps', '安排步骤')}>
          {[
            translate('Stay details', '托管详情'),
            translate('Choose room', '选择房间'),
            translate('Review', '确认'),
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
          {translate('Times shown in your browser’s time zone.', '时间按浏览器当地时区显示。')}
        </p>
        <section
          className="hc-wizard-step"
          data-booking-step="1"
          hidden={step !== 1}
          aria-label={translate('Stay details', '托管详情')}
        >
          <div className="hc-step-intro">
            <h3>{translate('Who’s staying, and when?', '哪只宠物，何时托管？')}</h3>
            <p>
              {translate(
                'Choose your guest and their planned arrival and pickup.',
                '选择宠物及计划到店、接回时间。',
              )}
            </p>
          </div>
          <label>
            {translate('Pet', '宠物')}
            <CustomSelect
              aria-label={translate('Pet', '宠物')}
              required
              value={pet}
              onChange={(event) => {
                setPet(event.target.value);
                invalidate();
              }}
            >
              <option value="">{translate('Select a pet', '选择宠物')}</option>
              {pets.map((petProfile) => (
                <option key={petProfile.name} value={petProfile.name}>
                  {petProfile.name} ·{' '}
                  {translate(
                    petProfile.species,
                    { dog: '狗', cat: '猫', rabbit: '兔' }[petProfile.species] ||
                      petProfile.species,
                  )}
                </option>
              ))}
            </CustomSelect>
          </label>
          <div className="hc-time-fields">
            <label>
              {translate('Arrival', '到店时间')}
              <input
                type="datetime-local"
                required
                value={start}
                onChange={(event) => {
                  setStart(event.target.value);
                  invalidate();
                }}
              />
            </label>
            <label>
              {translate('Pickup', '接回时间')}
              <input
                type="datetime-local"
                required
                value={end}
                onChange={(event) => {
                  setEnd(event.target.value);
                  invalidate();
                }}
              />
            </label>
          </div>
          {end && finish <= begin && (
            <p className="hc-range-feedback" role="alert">
              {translate('Pickup must be after arrival.', '接回时间必须晚于到店时间。')}
            </p>
          )}
        </section>
        <section
          className="hc-wizard-step"
          data-booking-step="2"
          hidden={step !== 2}
          aria-label={translate('Choose room', '选择房间')}
        >
          <div className="hc-step-stay">
            <PetProfileAvatar name={pet} className="hc-guest-avatar" />
            <div>
              <strong>{pet}</strong>
              <span>{valid ? rangeLabel(begin, finish) : ''}</span>
            </div>
            <button type="button" className="hc-text-button" onClick={() => setStep(1)}>
              {translate('Edit', '修改')}
            </button>
          </div>
          <section
            className="hc-schedule-picker"
            aria-label={translate('Room availability calendar', '房间可用日历')}
          >
            <div className="hc-schedule-heading">
              <h3>{translate('Choose a room on the calendar', '在日历上选择房间')}</h3>
              <div>
                <button
                  type="button"
                  title={translate('Previous week', '上一周')}
                  aria-label={translate('Previous week', '上一周')}
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
                  title={translate('Next week', '下一周')}
                  aria-label={translate('Next week', '下一周')}
                  onClick={() => setWeek(week + 1)}
                >
                  ›
                </button>
              </div>
            </div>
            <p className="hc-setup-note">
              {translate(
                'Gray bands show unavailable time ranges. Enter arrival and pickup, then choose a room or tap a free starting time. The full stay must fit.',
                '灰色条表示不可用时段。填写到店和接回时间后，选择房间或点击空白处选开始时间。整个托管时段都必须可用。',
              )}
            </p>
            <div
              className="hc-schedule-scroll"
              tabIndex={0}
              aria-label={translate('Scroll room availability calendar', '滚动房间可用日历')}
            >
              <div className="hc-range-calendar">
                <div className="hc-range-axis">
                  <div>{translate('House / room', '房屋 / 房间')}</div>
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
                      <p className="hc-room-empty">{translate('No rooms yet', '暂无房间')}</p>
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
                                  : translate(
                                      'Choose this room for the entered times',
                                      '选择此房间及已填写的时段',
                                    )
                              }
                              aria-label={`${translate('Choose', '选择')} ${candidateHouse.name} · ${candidateRoom.name}`}
                              onClick={() => chooseRange(candidateHouse, candidateRoom)}
                            >
                              {picked && !problem
                                ? translate('Selected', '已选择')
                                : translate('Choose room', '选择房间')}
                            </button>
                          </div>
                          <div
                            className={'hc-time-track' + (!selected ? ' pending' : '')}
                            aria-label={`${candidateHouse.name} · ${candidateRoom.name}`}
                            onClick={(event) => chooseTime(event, candidateHouse, candidateRoom)}
                          >
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
                                aria-label={`${translate('Choose', '选择')} ${candidateHouse.name} · ${candidateRoom.name} · ${rangeLabel(begin, finish)}`}
                                aria-pressed={picked}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  chooseRange(candidateHouse, candidateRoom);
                                }}
                              >
                                {picked
                                  ? translate('Selected', '已选择')
                                  : translate('Choose', '选择')}
                              </button>
                            )}
                            {!selected && (
                              <span className="hc-time-placeholder">
                                {translate(
                                  'Select a pet to see availability',
                                  '选择宠物以查看可用时段',
                                )}
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
                {translate('Available time', '可用时段')}
              </span>
              <span>
                <i className="unavailable" />
                {translate('Unavailable time range', '不可用时段')}
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
          aria-label={translate('Review stay', '确认托管')}
        >
          <div className="hc-step-intro">
            <h3>{translate('Everything ready for their stay?', '托管安排确认好了吗？')}</h3>
            <p>
              {translate(
                'Review the details before adding this stay to the calendar.',
                '添加到日历前，请核对以下详情。',
              )}
            </p>
          </div>
          <div className="hc-review-card">
            <div className="hc-review-guest">
              <PetProfileAvatar name={pet} className="hc-guest-avatar" />
              <div>
                <strong>{pet}</strong>
                <small>
                  {selected
                    ? translate(
                        selected.species,
                        { dog: '狗', cat: '猫', rabbit: '兔' }[selected.species] ||
                          selected.species,
                      )
                    : ''}
                </small>
              </div>
            </div>
            <dl>
              <div>
                <dt>{translate('Arrival', '到店时间')}</dt>
                <dd>{valid ? new Date(start).toLocaleString(locale) : 'N/A'}</dd>
              </div>
              <div>
                <dt>{translate('Pickup', '接回时间')}</dt>
                <dd>{valid ? new Date(end).toLocaleString(locale) : 'N/A'}</dd>
              </div>
              <div>
                <dt>{translate('House & room', '房屋与房间')}</dt>
                <dd>
                  {chosenHouse?.name} · {chosenRoom?.name}
                </dd>
              </div>
            </dl>
          </div>
          <div className="hc-coverage-card needs-review" aria-live="polite">
            <div>
              <h4>{translate('Boarding balance', '寄养余额')}</h4>
            </div>
            <dl>
              <div>
                <dt>{translate('Available to plan', '可计划天数')}</dt>
                <dd>{availableDays ?? 'N/A'}</dd>
              </div>
              <div>
                <dt>{translate('This stay', '本次托管')}</dt>
                <dd>N/A</dd>
              </div>
              <div>
                <dt>{translate('After planning', '计划后剩余')}</dt>
                <dd>N/A</dd>
              </div>
            </dl>
            <button
              className="hc-text-button"
              type="button"
              onClick={() => onManageBalance(pet, service)}
            >
              {account
                ? translate('Manage pet balance', '管理宠物余额')
                : translate('Add balance', '增加余额')}
            </button>
            <p>
              {translate(
                'Day usage awaits the billing rule. Saving this schedule does not deduct or reserve balance days.',
                '使用天数待计费规则确定后计算。保存此安排不会扣减或预留余额天数。',
              )}
            </p>
          </div>
          <p className="hc-review-note">
            {translate(
              'This does not create a paid booking or record a check-in.',
              '不创建付费预约或记录入住。',
            )}
          </p>
        </section>
        <div className="hc-wizard-footer">
          <div className="hc-wizard-secondary">
            {step > 1 && (
              <button className="hc-manage" type="button" onClick={() => setStep(step - 1)}>
                ← {translate('Back', '返回')}
              </button>
            )}
            <button className="hc-manage" type="button" onClick={close}>
              {translate('Cancel', '取消')}
            </button>
          </div>
          <span>
            {translate('Step', '第')} {step} {translate('of 3', '步，共 3 步')}
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
              ? translate('Choose a room', '选择房间')
              : step === 2
                ? translate('Review stay', '确认托管')
                : translate('Add to calendar', '添加到日历')}{' '}
            <span aria-hidden="true">{step === 3 ? '✓' : '→'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
