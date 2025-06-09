import React, { useState, useRef, useEffect } from "react";
import { Clock } from "lucide-react";
import timeStyles from "@/app/styles/forms/TimePicker.module.css";

const TimePicker = ({
  selectedDate,
  onSelect,
  roundToMinutes = 0,
}) => {
  const [hours, setHours] = useState("06");
  const [minutes, setMinutes] = useState("00");
  const [period, setPeriod] = useState("PM");
  const [isInitialized, setIsInitialized] = useState(false);
  const timePickerRef = useRef(null);

  const currentDate = new Date();

  const roundMinutes = (mins, interval) => {
    if (!interval) return mins;
    return Math.round(mins / interval) * interval;
  };

  useEffect(() => {
    if (
      selectedDate &&
      (!isInitialized ||
        (timePickerRef.current &&
          selectedDate.getTime() !== timePickerRef.current.getTime()))
    ) {
      const hrs = selectedDate.getHours();
      let mins = selectedDate.getMinutes();

      if (roundToMinutes > 0) {
        mins = roundMinutes(mins, roundToMinutes);
      }

      const isPM = hrs >= 12;
      const updatedHours = (hrs % 12 || 12).toString().padStart(2, "0");
      const updatedMinutes = mins.toString().padStart(2, "0");
      const updatedPeriod = isPM ? "PM" : "AM";

      setHours(updatedHours);
      setMinutes(updatedMinutes);
      setPeriod(updatedPeriod);
      setIsInitialized(true);
      timePickerRef.current = new Date(selectedDate.getTime());
    }
  }, [selectedDate, isInitialized, roundToMinutes]);

  const updateTime = (hrs, mins, per) => {
    if (hrs && mins) {
      const date = new Date(selectedDate || currentDate);
      let hour = parseInt(hrs);
      if (per === "PM" && hour !== 12) hour += 12;
      else if (per === "AM" && hour === 12) hour = 0;

      let adjustedMins = parseInt(mins);
      if (roundToMinutes > 0) {
        adjustedMins = roundMinutes(adjustedMins, roundToMinutes);
      }

      date.setHours(hour, adjustedMins, 0, 0);
      onSelect(date);
    }
  };

  const handleInputChange = (value, setter, isMinutes = false) => {
    if (isMinutes) {
      const numericValue = value.replace(/\D/g, "");
      const num = parseInt(numericValue);
      if (!isNaN(num) && num < 60) {
        setter(numericValue);
      } else if (value === "") {
        setter("");
      }
    } else {
      const numericValue = value.replace(/\D/g, "");
      if (numericValue === "" || parseInt(numericValue) <= 12) {
        setter(numericValue);
      }
    }
  };

  const handleHoursBlur = () => {
    const numericValue = hours.replace(/\D/g, "");
    const num = parseInt(numericValue);

    if (!isNaN(num) && num >= 1 && num <= 12) {
      const formattedHours = num.toString().padStart(2, "0");
      setHours(formattedHours);
      updateTime(formattedHours, minutes, period);
    } else {
      setHours("12");
      updateTime("12", minutes, period);
    }
  };

  const handleMinutesBlur = () => {
    const numericValue = minutes.replace(/\D/g, "");
    let num = parseInt(numericValue);

    if (!isNaN(num)) {
      if (num >= 60) num = 59;
      if (roundToMinutes > 0) {
        num = roundMinutes(num, roundToMinutes);
      }

      const formattedMinutes = num.toString().padStart(2, "0");
      setMinutes(formattedMinutes);
      updateTime(hours, formattedMinutes, period);

    } else {
      setMinutes("00");
      updateTime(hours, "00", period);
    }
  };

  const handlePeriodChange = (newPeriod) => {
    setPeriod(newPeriod);
    updateTime(hours, minutes, newPeriod);
  };

  return (
    <div className={timeStyles.timePickerContainer} ref={timePickerRef}>
      <div className={timeStyles.timeInput}>
        <Clock size={16} />
        <div className={timeStyles.timeInputFields}>
          <input
            type="text"
            value={hours}
            onChange={(e) => handleInputChange(e.target.value, setHours)}
            onBlur={handleHoursBlur}
            className={timeStyles.timeValue}
            maxLength={2}
            placeholder="12"
          />

          <span>:</span>

          <input
            type="text"
            value={minutes}
            onChange={(e) =>
              handleInputChange(e.target.value, setMinutes, true)
            }
            onBlur={handleMinutesBlur}
            className={timeStyles.timeValue}
            maxLength={2}
            placeholder="00"
          />

          <select
            value={period}
            onChange={(e) => handlePeriodChange(e.target.value)}
            className={timeStyles.periodSelect}
          >
            <option value="AM">AM</option>
            <option value="PM">PM</option>
          </select>
          
        </div>
      </div>
    </div>
  );
};

export default TimePicker;
