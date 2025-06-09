import React, { useState, useEffect } from "react";
import { Clock } from "lucide-react";
import RecurrenceSelect from "@/components/helpers/RecurrenceSelect";
import DurationPicker from "@/components/helpers/DurationPicker";
import TimePicker from "@/components/helpers/TimePicker";

import dialogStyles from "@/app/styles/components/dialog/Dialog.module.css";

const TimeSlotForm = ({
  isOpen,
  onClose,
  onSubmit,
  initialData = null,
  selectedTime = null,
}) => {
  const getDefaultStartTime = () => {
    const date = selectedTime ? new Date(selectedTime) : new Date();
    date.setHours(9, 0, 0, 0); // Set to 9:00 AM
    return date;
  };

  const getDefaultEndTime = () => {
    const date = selectedTime ? new Date(selectedTime) : new Date();
    date.setHours(17, 0, 0, 0); // Set to 5:00 PM
    return date;
  };

  const convertTimeToMinutes = (date) => {
    return date.getHours() * 60 + date.getMinutes();
  };

  // Initialize state with proper default values
  const [slotData, setSlotData] = useState({
    startTime: getDefaultStartTime(),
    endTime: getDefaultEndTime(),
    duration: "30",
    slotType: "WorkingHours",
    recurrence: {
      frequency: "Daily",
      interval: "1",
      specific_days: [],
    },
  });

  const [errors, setErrors] = useState({});
  const [showDurationPicker, setShowDurationPicker] = useState(false);

  // Reset form to defaults
  const resetForm = () => {
    setSlotData({
      startTime: selectedTime || getDefaultStartTime(),
      endTime: selectedTime
        ? new Date(selectedTime.getTime() + 60 * 60 * 1000)
        : getDefaultEndTime(),
      duration: "30",
      slotType: "WorkingHours",
      recurrence: {
        frequency: "Daily",
        interval: "1",
        specificDays: [],
      },
    });
    setErrors({});
    setShowDurationPicker(false);
  };

  // Initialize form with initialData if provided
  useEffect(() => {
    if (initialData) {
      const startDate = new Date();
      startDate.setHours(
        Math.floor(initialData.start_minutes / 60),
        initialData.start_minutes % 60,
        0,
        0
      );

      const endDate = new Date();
      const endMinutes =
        (initialData.start_minutes + initialData.duration) % 1440;
      endDate.setHours(Math.floor(endMinutes / 60), endMinutes % 60, 0, 0);

      setSlotData({
        startTime: startDate,
        endTime: endDate,
        duration: initialData.duration?.toString() || "30",
        slotType: initialData.slot_type,
        recurrence: {
          frequency: initialData.recurrence.frequency,
          interval: initialData.recurrence.interval?.toString() || "1",
          specificDays: initialData.recurrence.specific_days || [],
        },
      });
    }
  }, [initialData, isOpen]);

  const validateForm = () => {
    const newErrors = {};

    if (!slotData.startTime) {
      newErrors.startTime = "Start time is required";
    }

    if (slotData.slotType === "WorkingHours") {
      if (!slotData.endTime) {
        newErrors.endTime = "End time is required";
      } else {
        const startMs = slotData.startTime.getTime();
        const endMs = slotData.endTime.getTime();
        if (endMs <= startMs) {
          newErrors.endTime = "End time must be after start time";
        }
      }
    } else {
      const durationNum = parseInt(slotData.duration);
      if (!slotData.duration) {
        newErrors.duration = "Duration is required";
      } else if (isNaN(durationNum) || durationNum <= 0) {
        newErrors.duration = "Duration must be greater than 0";
      } else if (durationNum > 24 * 60) {
        newErrors.duration = "Duration cannot exceed 24 hours";
      }
    }

    if (slotData.recurrence.frequency === "Custom") {
      if (!slotData.recurrence.specificDays?.length) {
        newErrors.specificDays =
          "Select at least one day for custom recurrence";
      }

      const intervalNum = parseInt(slotData.recurrence.interval);
      if (!intervalNum || intervalNum <= 0) {
        newErrors.interval = "Interval must be greater than 0";
      } else if (intervalNum > 366) {
        newErrors.interval = "Interval cannot exceed 366 days";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      const startDate = new Date(slotData.startTime);
      const startMinutes = convertTimeToMinutes(startDate);

      let endMinutes;
      if (slotData.slotType === "WorkingHours" && slotData.endTime) {
        // For the WorkingHours
        const endDate = new Date(slotData.endTime);
        endMinutes = convertTimeToMinutes(endDate);
      } else {
        // For Break type
        const durationMinutes = parseInt(slotData.duration);
        endMinutes = (startMinutes + durationMinutes) % 1440;
      }

      const submitData = {
        startMinutes: startMinutes,
        endMinutes: endMinutes,
        slotType: slotData.slotType,
        recurrence: {
          frequency: slotData.recurrence.frequency,
          interval: parseInt(slotData.recurrence.interval),
          specificDays: slotData.recurrence.specificDays,
        },
      };

      onSubmit(submitData);
      onClose();
    }
  };

  const handleTimeSelect = (type, time) => {
    setSlotData((prev) => ({
      ...prev,
      [type]: time,
    }));
  };

  if (!isOpen) return null;

  return (
    <div className={dialogStyles.overlay}>
      <div className={dialogStyles.container}>
        <h2 className={dialogStyles.title}>
          {initialData ? "Edit Time Slot" : "Add Time Slot"}
        </h2>

        <div className={dialogStyles.inputContainer}>
          <select
            value={slotData.slotType}
            onChange={(e) =>
              setSlotData((prev) => ({ ...prev, slotType: e.target.value }))
            }
            className={dialogStyles.input}
            disabled={initialData !== null}
          >
            <option value="WorkingHours">Working Hours</option>
            <option value="Break">Break</option>
          </select>
          <p className={dialogStyles.inputTip}>Slot Type</p>
        </div>

        <div className={dialogStyles.inputContainer}>
          <TimePicker
            selectedDate={slotData.startTime || getDefaultStartTime()}
            onSelect={(time) => handleTimeSelect("startTime", time)}
          />
          {errors.startTime && (
            <p className={dialogStyles.errorText}>{errors.startTime}</p>
          )}
          <p className={dialogStyles.inputTip}>Start Time</p>
        </div>

        {slotData.slotType === "WorkingHours" ? (
          <div className={dialogStyles.inputContainer}>
            <TimePicker
              selectedDate={slotData.endTime || getDefaultEndTime()}
              onSelect={(time) => handleTimeSelect("endTime", time)}
            />
            {errors.endTime && (
              <p className={dialogStyles.errorText}>{errors.endTime}</p>
            )}
            <p className={dialogStyles.inputTip}>End Time</p>
          </div>
        ) : (
          <div className={dialogStyles.inputContainer}>
            <button
              className={`${dialogStyles.input} ${dialogStyles.iconContainer} ${
                errors.duration ? dialogStyles.error : ""
              }`}
              onClick={() => setShowDurationPicker(true)}
            >
              <Clock size={16} />
              {slotData.duration
                ? `${Math.floor(parseInt(slotData.duration) / 60)}h ${
                    parseInt(slotData.duration) % 60
                  }m`
                : "Set duration"}
            </button>
            {errors.duration && (
              <p className={dialogStyles.errorText}>{errors.duration}</p>
            )}
            <p className={dialogStyles.inputTip}>Duration (max 24 hours)</p>
          </div>
        )}

        <DurationPicker
          isOpen={showDurationPicker}
          onClose={() => setShowDurationPicker(false)}
          onSelect={(duration) => {
            setSlotData((prev) => ({ ...prev, duration: duration.toString() }));
            setShowDurationPicker(false);
          }}
        />

        <RecurrenceSelect
          value={slotData.recurrence}
          onChange={(recurrence) =>
            setSlotData((prev) => ({ ...prev, recurrence }))
          }
          error={errors.specificDays || errors.interval}
        />

        <div className={dialogStyles.actions}>
          <button className={dialogStyles.buttonPrimary} onClick={handleSubmit}>
            {initialData ? "Save Changes" : "Add"}
          </button>
          <button
            className={dialogStyles.buttonSecondary}
            onClick={() => {
              resetForm();
              onClose();
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default TimeSlotForm;
