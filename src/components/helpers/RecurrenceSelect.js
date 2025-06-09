import React, { useState } from "react";
import WeekDaySelect from "@/components/helpers/WeekDaySelect";

import styles from "@/app/styles/features/planner/TimeControls.module.css";
import dialogStyles from "@/app/styles/components/dialog/Dialog.module.css";

const RecurrenceSelect = ({ value, onChange, error }) => {
  const [isCustomInput, setIsCustomInput] = useState(false);

  const handleFrequencyChange = (frequency) => {
    onChange({
      ...value,
      frequency,
      specificDays: frequency === "Custom" ? [] : undefined,
      interval: frequency === "Custom" ? "7" : "1",
    });
    setIsCustomInput(false);
  };

  const handleIntervalSelect = (selectedValue) => {
    if (selectedValue === "custom") {
      setIsCustomInput(true);
      onChange({
        ...value,
        interval: "",
      });
    } else {
      setIsCustomInput(false);
      onChange({
        ...value,
        interval: selectedValue,
      });
    }
  };

  const handleCustomIntervalChange = (e) => {
    const newValue = e.target.value;
    if (
      newValue === "" ||
      (/^\d+$/.test(newValue) && parseInt(newValue) <= 366)
    ) {
      onChange({
        ...value,
        interval: newValue,
      });
    }
  };

  const handleDaysChange = (days) => {
    onChange({
      ...value,
      specificDays: days,
    });
  };

  return (
    <div className={styles.recurrenceSection}>
      <div className={dialogStyles.inputContainer}>
        <select
          value={value.frequency}
          onChange={(e) => handleFrequencyChange(e.target.value)}
          className={dialogStyles.input}
        >
          <option value="Daily">Daily</option>
          <option value="Custom">Custom</option>
        </select>
        <p className={dialogStyles.inputTip}>Recurrence Pattern</p>
      </div>

      {value.frequency === "Custom" && (
        <>
          <div className={dialogStyles.inputContainer}>
            <select
              value={isCustomInput ? "custom" : value.interval}
              onChange={(e) => handleIntervalSelect(e.target.value)}
              className={dialogStyles.input}
            >
              <option value="7">Every Week</option>
              <option value="14">Every Two Weeks</option>
              <option value="30">Every Month</option>
              <option value="custom">Custom Interval</option>
            </select>
            <p className={dialogStyles.inputTip}>Repeat Interval</p>
          </div>

          {isCustomInput && (
            <div className={dialogStyles.inputContainer}>
              <input
                type="number"
                value={value.interval}
                onChange={handleCustomIntervalChange}
                className={`${dialogStyles.input} ${
                  error && error.includes("interval") ? dialogStyles.error : ""
                }`}
                min="1"
                max="366"
                placeholder="Enter number of days (1-366)"
              />
              {error && error.includes("interval") && (
                <p className={dialogStyles.errorText}>{error}</p>
              )}
              <p className={dialogStyles.inputTip}>
                Custom Interval (1-366 days)
              </p>
            </div>
          )}

          <WeekDaySelect
            selectedDays={value.specificDays || []}
            onChange={handleDaysChange}
            error={error && !error.includes("interval") ? error : undefined}
          />
        </>
      )}
    </div>
  );
};

export default RecurrenceSelect;
