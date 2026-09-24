import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const toDate = (value) => {
  if (!value) return null;
  const [year, month, day] = String(value).split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

const toValue = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatValue = (value) => {
  const date = toDate(value);
  return date ? new Intl.DateTimeFormat('en-GB').format(date) : 'dd/mm/yyyy';
};

const sameDay = (left, right) =>
  Boolean(left && right) &&
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

export default function ThemedDatePicker({ value, onChange, min, max, disabled = false, className = '' }) {
  const selectedDate = toDate(value);
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => selectedDate || new Date());
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0, width: 330 });
  const rootRef = useRef(null);
  const popoverRef = useRef(null);

  useEffect(() => {
    if (selectedDate) setVisibleMonth(selectedDate);
  }, [value]);

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (!rootRef.current?.contains(event.target) && !popoverRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return undefined;

    const updatePosition = () => {
      const anchor = rootRef.current?.getBoundingClientRect();
      if (!anchor) return;

      const edgeGap = 12;
      const popupGap = 7;
      const width = Math.min(330, window.innerWidth - edgeGap * 2);
      const height = popoverRef.current?.offsetHeight || 410;
      const left = Math.min(Math.max(edgeGap, anchor.left), window.innerWidth - width - edgeGap);
      const fitsBelow = anchor.bottom + popupGap + height <= window.innerHeight - edgeGap;
      const top = fitsBelow
        ? anchor.bottom + popupGap
        : Math.max(edgeGap, anchor.top - height - popupGap);

      setPopoverPosition({ top, left, width });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, visibleMonth]);

  const days = useMemo(() => {
    const year = visibleMonth.getFullYear();
    const month = visibleMonth.getMonth();
    const first = new Date(year, month, 1);
    const gridStart = new Date(year, month, 1 - first.getDay());
    return Array.from({ length: 42 }, (_, index) => new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + index));
  }, [visibleMonth]);

  const minDate = toDate(min);
  const maxDate = toDate(max);
  const today = new Date();
  const isDisabledDate = (date) => (minDate && date < minDate) || (maxDate && date > maxDate);
  const selectDate = (date) => {
    if (isDisabledDate(date)) return;
    onChange?.(toValue(date));
    setOpen(false);
  };

  const calendar = open && typeof document !== 'undefined' ? createPortal(
    <div
      ref={popoverRef}
      className="sm-date-picker-popover"
      role="dialog"
      aria-label="Choose date"
      style={{ position: 'fixed', top: popoverPosition.top, left: popoverPosition.left, width: popoverPosition.width }}
    >
      <div className="sm-date-picker-heading">
        <strong>{new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(visibleMonth)}</strong>
        <div className="sm-date-picker-navigation">
          <button type="button" aria-label="Previous month" onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1))}>
            <i className="ti ti-chevron-left" />
          </button>
          <button type="button" aria-label="Next month" onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1))}>
            <i className="ti ti-chevron-right" />
          </button>
        </div>
      </div>
      <div className="sm-date-picker-weekdays" aria-hidden="true">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}
      </div>
      <div className="sm-date-picker-days">
        {days.map((date) => {
          const outside = date.getMonth() !== visibleMonth.getMonth();
          const dateDisabled = isDisabledDate(date);
          return (
            <button
              type="button"
              key={toValue(date)}
              disabled={dateDisabled}
              className={`${outside ? 'is-outside ' : ''}${sameDay(date, today) ? 'is-today ' : ''}${sameDay(date, selectedDate) ? 'is-selected' : ''}`.trim()}
              onClick={() => selectDate(date)}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
      <div className="sm-date-picker-actions">
        <button type="button" onClick={() => { onChange?.(''); setOpen(false); }}>Clear</button>
        <button type="button" disabled={isDisabledDate(today)} onClick={() => selectDate(today)}>Today</button>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div ref={rootRef} className={`sm-date-picker ${className}`.trim()}>
      <button
        type="button"
        className={`form-control sm-date-picker-control${open ? ' is-open' : ''}`}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span className={value ? '' : 'sm-date-picker-placeholder'}>{formatValue(value)}</span>
        <i className="ti ti-calendar" aria-hidden="true" />
      </button>
      {calendar}
    </div>
  );
}
