import React, { useState, useMemo } from "react";
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  isSameDay,
  addMonths,
  subMonths,
  getDay,
} from "date-fns";

import styles from "@/app/styles/forms/DatePicker.module.css";

const DatePicker = ({
  selectedDate,
  onSelect,
  highlightDates = [],
  readOnly = false,
}) => {
  const [displayMonth, setDisplayMonth] = useState(selectedDate || new Date());

  const weekDays = useMemo(() => {
    return ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
  }, []);

  const highlights = useMemo(() => {
    return highlightDates.map((date) =>
      date instanceof Date ? date : new Date(Number(date) / 1000000)
    );
  }, [highlightDates]);

  const generateCalendarDays = () => {
    const firstDay = startOfMonth(displayMonth);
    const lastDay = endOfMonth(displayMonth);
    const days = eachDayOfInterval({ start: firstDay, end: lastDay });

    let firstDayOffset = getDay(firstDay) - 1;
    if (firstDayOffset === -1) firstDayOffset = 6;

    const emptyDays = Array(firstDayOffset).fill(null);

    return [...emptyDays, ...days];
  };

  return (
    <div className={styles.datePickerContent}>
      <div className={styles.monthNavigation}>
        <button
          onClick={() => setDisplayMonth((prev) => subMonths(prev, 1))}
          className="time-nav-button"
        >
          &lt;
        </button>
        <span>{format(displayMonth, "MMMM yyyy")}</span>
        <button
          onClick={() => setDisplayMonth((prev) => addMonths(prev, 1))}
          className="time-nav-button"
        >
          &gt;
        </button>
      </div>

      <div className={styles.weekDays}>
        {weekDays.map((day) => (
          <div key={day}>{day}</div>
        ))}
      </div>

      <div className={styles.calendarGrid}>
        {generateCalendarDays().map((day, index) => {
          const isHighlighted =
            day && highlights.some((date) => isSameDay(date, day));

          return (
            <div
              key={day ? format(day, "yyyy-MM-dd") : `empty-${index}`}
              className={`${styles.day} ${day ? "" : styles.emptyDay} 
                ${day && isSameDay(day, selectedDate) ? styles.selectedDay : ""}
                ${day && isHighlighted ? styles.highlightedDay : ""}`}
              onClick={() => day && !readOnly && onSelect(day)}
            >
              {day ? format(day, "d") : ""}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DatePicker;
