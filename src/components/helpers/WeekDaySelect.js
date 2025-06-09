import React from "react";
import styles from "@/app/styles/forms/WeekDaySelect.module.css";
import dialogStyles from "@/app/styles/components/dialog/Dialog.module.css";

const weekDaysMap = {
  Mon: "Monday",
  Tue: "Tuesday",
  Wed: "Wednesday",
  Thu: "Thursday",
  Fri: "Friday",
  Sat: "Saturday",
  Sun: "Sunday",
};

const WeekDaySelect = ({ selectedDays, onChange, error }) => {
  const days = Object.keys(weekDaysMap);

  const toggleDay = (day) => {
    const fullDay = weekDaysMap[day];
    const newDays = selectedDays.includes(fullDay)
      ? selectedDays.filter((d) => d !== fullDay)
      : [...selectedDays, fullDay];
    onChange(newDays);
  };

  return (
    <div className={styles.weekDaySelector}>
      <div className={styles.dayCircles}>
        {days.map((day) => (
          <button
            key={day}
            className={`${styles.dayCircle} ${
              selectedDays.includes(weekDaysMap[day]) ? styles.selected : ""
            }`}
            onClick={() => toggleDay(day)}
            type="button"
          >
            {day}
          </button>
        ))}
      </div>
      {error && <p className={dialogStyles.errorText}>{error}</p>}
    </div>
  );
};

export default WeekDaySelect;
