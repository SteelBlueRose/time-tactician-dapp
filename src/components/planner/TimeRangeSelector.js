import React, { useState, useEffect } from "react";
import TimePicker from "../helpers/TimePicker";

import styles from "@/app/styles/features/planner/TimeRangeSelector.module.css";
import dialogStyles from "@/app/styles/components/dialog/Dialog.module.css";

const CustomRangeForm = ({ isOpen, onClose, onSubmit, initialRange }) => {
  const [range, setRange] = useState(initialRange);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());

  useEffect(() => {
    if (isOpen) {
      const parseTime = (timeStr) => {
        const [hours, minutes] = timeStr.split(":").map(Number);
        const date = new Date();
        date.setHours(hours, minutes, 0, 0);
        return date;
      };

      setStartDate(parseTime(initialRange.start));
      setEndDate(parseTime(initialRange.end));
      setRange(initialRange);
    }
  }, [isOpen, initialRange]);

  const handleStartTimeSelect = (date) => {
    setStartDate(date);
    setRange((prevRange) => ({
      ...prevRange,
      start: `${date.getHours().toString().padStart(2, "0")}:${date
        .getMinutes()
        .toString()
        .padStart(2, "0")}`,
    }));
  };

  const handleEndTimeSelect = (date) => {
    setEndDate(date);
    setRange((prevRange) => ({
      ...prevRange,
      end: `${date.getHours().toString().padStart(2, "0")}:${date
        .getMinutes()
        .toString()
        .padStart(2, "0")}`,
    }));
  };

  const isValidRange = () => {
    if (!startDate || !endDate) return false;
    const startTime = startDate.getHours() * 60 + startDate.getMinutes();
    const endTime = endDate.getHours() * 60 + endDate.getMinutes();
    return startTime < endTime;
  };

  if (!isOpen) return null;

  return (
    <div className={dialogStyles.overlay}>
      <div className={dialogStyles.container}>
        <h2 className={dialogStyles.title}>Set Custom Time Range</h2>

        <div className={dialogStyles.inputContainer}>
          <div className={dialogStyles.timePickerContainer}>
            <TimePicker
              selectedDate={startDate}
              onSelect={handleStartTimeSelect}
              roundToMinutes={5}
            />
          </div>
          <p className={dialogStyles.inputTip}>Start Time</p>
        </div>

        <div className={dialogStyles.inputContainer}>
          <div className={dialogStyles.timePickerContainer}>
            <TimePicker
              selectedDate={endDate}
              onSelect={handleEndTimeSelect}
              roundToMinutes={5}
            />
          </div>
          <p className={dialogStyles.inputTip}>End Time</p>
        </div>

        <div className={dialogStyles.actions}>
          <button
            className={dialogStyles.buttonPrimary}
            onClick={() => {
              if (isValidRange()) {
                onSubmit(range);
                onClose();
              }
            }}
            disabled={!isValidRange()}
          >
            Apply
          </button>
          <button className={dialogStyles.buttonSecondary} onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

const TimeRangeSelector = ({
  range,
  onRangeChange,
  customRange,
  onCustomRangeChange,
}) => {
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [selectValue, setSelectValue] = useState(range);

  useEffect(() => {
    setSelectValue(range);
  }, [range]);

  const handleRangeChange = (value) => {
    setSelectValue(value);
    if (value === "custom") {
      setShowCustomForm(true);
    } else {
      onRangeChange(value);
    }
  };

  const handleCustomSubmit = (newRange) => {
    onCustomRangeChange(newRange);
    onRangeChange("custom");
    setShowCustomForm(false);
  };

  const getDisplayText = () => {
    switch (range) {
      case "working":
        return "Working Hours";
      case "full":
        return "24 Hours";
      case "custom":
        return `Custom (${customRange.start} - ${customRange.end})`;
      default:
        return "Select Range";
    }
  };

  return (
    <>
      <select
        value={selectValue}
        onChange={(e) => handleRangeChange(e.target.value)}
        className={styles.rangeSelect}
      >
        <option value="working">Short View</option>
        <option value="full">24 Hours</option>
        <option value="custom">
          {range === "custom" ? getDisplayText() : "Custom Range"}
        </option>
      </select>

      <CustomRangeForm
        isOpen={showCustomForm}
        onClose={() => {
          setShowCustomForm(false);
          setSelectValue(range);
        }}
        onSubmit={handleCustomSubmit}
        initialRange={customRange}
      />
    </>
  );
};

export default TimeRangeSelector;
