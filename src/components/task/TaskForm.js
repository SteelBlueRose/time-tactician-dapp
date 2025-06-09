import React, { useState, useEffect } from "react";
import { Clock, Calendar, Info } from "lucide-react";
import { format, addDays, getDay, isSameDay } from "date-fns";

import DatePicker from "../helpers/DatePicker";
import TimePicker from "../helpers/TimePicker";
import DurationPicker from "../helpers/DurationPicker";
import RecurrenceSelect from "../helpers/RecurrenceSelect";

import dialogStyles from "@/app/styles/components/dialog/Dialog.module.css";
import tooltipStyles from "@/app/styles/components/dialog/Tooltip.module.css";

const MAX_TITLE_LENGTH = 64;
const MAX_DESCRIPTION_LENGTH = 256;
const MAX_MINUTES = 24 * 60;
const MAX_SUBTASKS = 20;

const TaskForm = ({
  isOpen,
  onClose,
  onSubmit,
  initialData = null,
  isSubtask = false,
  parentTask = null,
}) => {
  const [taskData, setTaskData] = useState({
    title: initialData?.title || "",
    description: initialData?.description || "",
    priority: initialData?.priority || "Low",
    deadline: initialData?.deadline
      ? new Date(Number(initialData.deadline) / 1000000)
      : new Date(),
    estimated_time: initialData?.estimated_time || null,
    time_slots: initialData?.time_slots || null,
  });

  const [errors, setErrors] = useState({
    title: "",
    description: "",
    deadline: "",
    estimated_time: "",
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showDurationPicker, setShowDurationPicker] = useState(false);
  const [showDeadlineInfo, setShowDeadlineInfo] = useState(false);
  const [makeHabit, setMakeHabit] = useState(initialData?.isHabit || false);
  const [recurrence, setRecurrence] = useState({
    frequency: initialData?.recurrence?.frequency || "Daily",
    interval: initialData?.recurrence?.interval?.toString() || "1",
    specificDays: initialData?.recurrence?.specific_days || [],
  });

  const validateForm = () => {
    const newErrors = {};

    if (isSubtask && parentTask) {
      if (parentTask.subtask_ids.length >= MAX_SUBTASKS) {
        newErrors.general = `Maximum number of subtasks (${MAX_SUBTASKS}) reached`;
      }
    }

    // Title validation
    if (!taskData.title.trim()) {
      newErrors.title = "Title is required";
    } else if (taskData.title.length > MAX_TITLE_LENGTH) {
      newErrors.title = `Title must be ${MAX_TITLE_LENGTH} characters or less`;
    } else if (/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/.test(taskData.title)) {
      newErrors.title = "Title cannot contain control characters";
    }

    // Description validation
    if (taskData.description.length > MAX_DESCRIPTION_LENGTH) {
      newErrors.description = `Description must be ${MAX_DESCRIPTION_LENGTH} characters or less`;
    } else if (/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/.test(taskData.description)) {
      newErrors.description = "Description cannot contain control characters";
    }

    // Deadline validation
    if (!taskData.deadline) {
      newErrors.deadline = "Deadline is required";
    } else {
      const currentTime = Date.now();
      const oneYearFromNow = currentTime + 365 * 24 * 60 * 60 * 1000;

      if (taskData.deadline.getTime() <= currentTime) {
        newErrors.deadline = "Deadline must be in the future";
      } else if (taskData.deadline.getTime() >= oneYearFromNow) {
        newErrors.deadline =
          "Deadline cannot be more than one year in the future";
      }

      if (
        makeHabit &&
        recurrence.frequency === "Custom" &&
        recurrence.specificDays.length > 0
      ) {
        const deadlineDay = format(taskData.deadline, "EEEE");
        if (!recurrence.specificDays.includes(deadlineDay)) {
          newErrors.deadline = "Deadline day must be one of the selected days";
        }
      }
    }

    // Estimated time validation
    if (!taskData.estimated_time) {
      newErrors.estimated_time = "Estimated time is required";
    } else if (taskData.estimated_time > MAX_MINUTES) {
      newErrors.estimated_time = "Estimated time cannot exceed 24 hours";
    } else if (taskData.estimated_time === 0) {
      newErrors.estimated_time = "Estimated time must be greater than 0";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleDateSelect = (date) => {
    const newDeadline = new Date(taskData.deadline);
    newDeadline.setFullYear(date.getFullYear());
    newDeadline.setMonth(date.getMonth());
    newDeadline.setDate(date.getDate());
    handleChange("deadline", newDeadline);
    setShowDatePicker(false);
  };

  const handleTimeSelect = (time) => {
    const newDeadline = new Date(taskData.deadline);
    newDeadline.setHours(time.getHours());
    newDeadline.setMinutes(time.getMinutes());
    newDeadline.setSeconds(0);
    newDeadline.setMilliseconds(0);
    handleChange("deadline", newDeadline);
  };

  const handleSave = () => {
    if (validateForm()) {
      const deadlineNs = taskData.deadline.getTime() * 1000000;
      if (makeHabit) {
        const formattedRecurrence = {
          frequency: recurrence.frequency,
          interval: parseInt(recurrence.interval),
          specific_days: recurrence.specificDays,
        };

        onSubmit(
          taskData.title.trim(),
          taskData.description,
          taskData.priority,
          deadlineNs,
          taskData.estimated_time,
          taskData.time_slots,
          parentTask?.id,
          formattedRecurrence
        );
      } else {
        onSubmit(
          taskData.title.trim(),
          taskData.description,
          taskData.priority,
          deadlineNs,
          taskData.estimated_time,
          taskData.time_slots,
          parentTask?.id
        );
      }
      onClose();
    }
  };

  const handleChange = (field, value) => {
    setTaskData((prev) => ({
      ...prev,
      [field]: value,
    }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: "",
      }));
    }
  };

  const formatDate = (date) => {
    if (!date) return "";
    const dateObj =
      date instanceof Date ? date : new Date(Number(date) / 1000000);
    return format(dateObj, "MM/dd/yyyy");
  };

  const formatDuration = (minutes) => {
    if (!minutes) return "";
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hrs}h ${mins}m`;
  };

  const findNextValidDay = (
    currentDeadline,
    selectedDays,
    intervalType,
    customInterval = 1
  ) => {
    const dayMapping = {
      Monday: 1,
      Tuesday: 2,
      Wednesday: 3,
      Thursday: 4,
      Friday: 5,
      Saturday: 6,
      Sunday: 0,
    };

    const selectedDayNumbers = selectedDays.map((day) => dayMapping[day]);

    const deadlineDayNumber = getDay(currentDeadline);
    if (selectedDayNumbers.includes(deadlineDayNumber)) {
      return currentDeadline;
    }

    const today = new Date();
    const intervalValue =
      parseInt(intervalType) || parseInt(customInterval) || 1;
    const candidateDates = [];

    for (const dayNumber of selectedDayNumbers) {
      // Calculate days to add to get to the next occurrence of this day
      const currentDayNumber = getDay(today);
      let daysToAdd = (dayNumber - currentDayNumber + 7) % 7;
      if (
        daysToAdd === 0 &&
        today.getHours() >= currentDeadline.getHours() &&
        today.getMinutes() >= currentDeadline.getMinutes()
      ) {
        daysToAdd = 7; // If it's today but time has passed => next week
      }

      const nextOccurrence = addDays(today, daysToAdd);
      if (intervalValue <= 7) {
        candidateDates.push(nextOccurrence);
      } else {
        const daysSinceStart = Math.floor(
          (nextOccurrence - today) / (24 * 60 * 60 * 1000)
        );
        const remainder = daysSinceStart % intervalValue;

        if (remainder === 0) {
          candidateDates.push(nextOccurrence);
        } else {
          const additionalDays = intervalValue - remainder;
          const validIntervalDate = addDays(nextOccurrence, additionalDays);
          candidateDates.push(validIntervalDate);
        }
      }
    }

    // Find the earliest valid date
    if (candidateDates.length > 0) {
      return candidateDates.reduce(
        (earliest, current) => (current < earliest ? current : earliest),
        candidateDates[0]
      );
    }

    return currentDeadline;
  };

  useEffect(() => {
    if (makeHabit && recurrence.frequency === "Custom") {
      if (!recurrence.specificDays || recurrence.specificDays.length === 0) {
        const deadlineDay = format(taskData.deadline, "EEEE");
        setRecurrence((prev) => ({
          ...prev,
          specificDays: [deadlineDay],
        }));
        return;
      }

      const updatedDeadline = findNextValidDay(
        new Date(),
        recurrence.specificDays,
        recurrence.interval
      );

      if (updatedDeadline) {
        const newDeadline = new Date(updatedDeadline);
        newDeadline.setHours(
          taskData.deadline.getHours(),
          taskData.deadline.getMinutes(),
          0,
          0
        );

        if (!isSameDay(newDeadline, taskData.deadline)) {
          setTaskData((prev) => ({
            ...prev,
            deadline: newDeadline,
          }));
        }
      }
    }
  }, [
    makeHabit,
    recurrence.frequency,
    recurrence.specificDays,
    recurrence.interval,
  ]);

  if (!isOpen) return null;

  return (
    <div className={dialogStyles.overlay}>
      <div className={dialogStyles.container}>
        <h2 className={dialogStyles.title}>
          {isSubtask
            ? `Add ${parentTask?.isHabit ? "Subhabit" : "Subtask"}`
            : initialData
            ? `Edit ${initialData.isHabit ? "Habit" : "Task"}`
            : `Add ${makeHabit ? "Habit" : "Task"}`}
        </h2>

        {isSubtask && parentTask && (
          <div className={dialogStyles.parentTaskInfo}>
            <p>Parent Task: {parentTask.title}</p>
            <p>Parent Deadline: {formatDate(parentTask.deadline)}</p>
            <p>
              Subtasks: {parentTask.subtask_ids.length} / {MAX_SUBTASKS}
            </p>
          </div>
        )}

        {errors.general && (
          <div className={dialogStyles.errorText}>{errors.general}</div>
        )}

        <div className={dialogStyles.inputContainer}>
          <input
            type="text"
            placeholder="Title"
            value={taskData.title}
            onChange={(e) => handleChange("title", e.target.value)}
            className={`${dialogStyles.input} ${
              errors.title ? dialogStyles.error : ""
            }`}
          />
          {errors.title && (
            <p className={dialogStyles.errorText}>{errors.title}</p>
          )}
          <p className={dialogStyles.inputTip}>
            Title (max {MAX_TITLE_LENGTH} characters)
          </p>
        </div>

        <div className={dialogStyles.inputContainer}>
          <textarea
            placeholder="Description"
            value={taskData.description}
            onChange={(e) => handleChange("description", e.target.value)}
            className={`${dialogStyles.input} ${dialogStyles.textArea} ${
              errors.description ? dialogStyles.error : ""
            }`}
          />
          {errors.description && (
            <p className={dialogStyles.errorText}>{errors.description}</p>
          )}
          <p className={dialogStyles.inputTip}>
            Description (max {MAX_DESCRIPTION_LENGTH} characters)
          </p>
        </div>

        <div className={dialogStyles.inputContainer}>
          <select
            value={taskData.priority}
            onChange={(e) => handleChange("priority", e.target.value)}
            className={dialogStyles.input}
          >
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Critical">Critical</option>
          </select>
          <p className={dialogStyles.inputTip}>Priority</p>
        </div>

        <div className={dialogStyles.inputContainer}>
          <div className={dialogStyles.deadlineContainer}>
            <div
              className={`${dialogStyles.input} ${
                errors.deadline ? dialogStyles.error : ""
              }`}
            >
              <div
                className={dialogStyles.datePickerContainer}
                onClick={() => setShowDatePicker(true)}
              >
                <Calendar size={16} />
                {formatDate(taskData.deadline)}
              </div>

              {isSubtask && (
                <div className={tooltipStyles.wrapper}>
                  <button
                    className={tooltipStyles.icon}
                    onClick={() => setShowDeadlineInfo(!showDeadlineInfo)}
                    type="button"
                  >
                    <Info size={16} />
                  </button>
                  {showDeadlineInfo && (
                    <div className={tooltipStyles.content}>
                      If subtask deadline is later than parent's, parent
                      deadline will be updated to match
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className={dialogStyles.timePickerContainer}>
              <TimePicker
                selectedDate={taskData.deadline}
                onSelect={handleTimeSelect}
              />
            </div>
          </div>
          {errors.deadline && (
            <p className={dialogStyles.errorText}>{errors.deadline}</p>
          )}
          <p className={dialogStyles.inputTip}>Deadline</p>
        </div>

        <div className={dialogStyles.inputContainer}>
          <button
            className={`${dialogStyles.input} ${dialogStyles.iconContainer} ${
              errors.estimated_time ? dialogStyles.error : ""
            }`}
            onClick={() => setShowDurationPicker(true)}
          >
            <Clock size={16} className={dialogStyles.icon} />
            {taskData.estimated_time
              ? formatDuration(taskData.estimated_time)
              : "Set duration"}
          </button>
          {errors.estimated_time && (
            <p className={dialogStyles.errorText}>{errors.estimated_time}</p>
          )}
          <p className={dialogStyles.inputTip}>
            Estimated duration (max 24 hours)
          </p>
        </div>

        {!initialData?.isHabit && (
          <div className={dialogStyles.inputContainer}>
            <label className={dialogStyles.checkboxContainer}>
              <input
                type="checkbox"
                checked={makeHabit}
                onChange={(e) => setMakeHabit(e.target.checked)}
                className={dialogStyles.checkbox}
              />
              <span className={dialogStyles.checkboxLabel}> Make Habit</span>
            </label>
          </div>
        )}

        {(makeHabit || initialData?.isHabit) && (
          <div className={dialogStyles.recurrenceContainer}>
            <h3 className={dialogStyles.sectionTitle}>Habit Recurrence</h3>
            <RecurrenceSelect
              value={recurrence}
              onChange={setRecurrence}
              error={errors.recurrence}
            />
          </div>
        )}

        <div className={dialogStyles.actions}>
          <button
            className={dialogStyles.buttonPrimary}
            onClick={handleSave}
            disabled={
              !taskData.title ||
              !taskData.deadline ||
              !taskData.estimated_time ||
              (isSubtask && parentTask?.subtask_ids.length >= MAX_SUBTASKS)
            }
          >
            {initialData ? "Save Changes" : "Add"}
          </button>
          <button className={dialogStyles.buttonSecondary} onClick={onClose}>
            Cancel
          </button>
        </div>

        {showDatePicker && (
          <div className={dialogStyles.pickerOverlay}>
            <div className={dialogStyles.pickerContainer}>
              <DatePicker
                selectedDate={taskData.deadline}
                onSelect={handleDateSelect}
              />
              <div className={dialogStyles.pickerActions}>
                <button onClick={() => setShowDatePicker(false)}>Close</button>
              </div>
            </div>
          </div>
        )}

        <DurationPicker
          isOpen={showDurationPicker}
          onClose={() => setShowDurationPicker(false)}
          onSelect={(estimated_time) => {
            handleChange("estimated_time", estimated_time);
            setShowDurationPicker(false);
          }}
        />
      </div>
    </div>
  );
};

export default TaskForm;
