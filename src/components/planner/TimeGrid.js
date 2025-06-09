import React, { useMemo, useState, useEffect, useRef } from "react";
import { format, addDays, setHours, setMinutes } from "date-fns";

import TimeSlot from "./TimeSlot";
import TaskDisplay from "./TaskDisplay";
import WeekNavigation from "./WeekNavigation";

import styles from "@/app/styles/features/planner/TimeGrid.module.css";

const TimeGrid = ({
  timeSlots,
  tasks = [],
  scale,
  timeRange,
  customRange,
  pendingChanges,
  showTasks,
  onSlotSelect,
  onTimeSelect,
  selectedSlotId,
  currentWeek,
  onPreviousWeek,
  onNextWeek,
  filterBreaks,
  filterWorkingHours,
  showPastTimeNotification,
}) => {
  const gridBodyRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const weekDays = useMemo(() => {
    const days = [];
    const start = currentWeek;

    for (let i = 0; i < 7; i++) {
      const day = addDays(start, i);
      days.push({
        date: day,
        label: format(day, "EEE dd/MM"),
      });
    }
    return days;
  }, [currentWeek]);

  useEffect(() => {}, [timeSlots]);

  const timeIntervals = useMemo(() => {
    const intervals = [];
    const minutes = scale;
    const totalMinutes = 24 * 60;

    for (let i = 0; i < totalMinutes; i += minutes) {
      const hours = Math.floor(i / 60);
      const mins = i % 60;
      intervals.push({
        time: setMinutes(setHours(new Date(), hours), mins),
        label: format(setMinutes(setHours(new Date(), hours), mins), "HH:mm"),
      });
    }
    return intervals;
  }, [scale]);

  const getVisibleTimeRange = () => {
    switch (timeRange) {
      case "working":
        return { start: 9, end: 17 };
      case "custom":
        if (customRange.start && customRange.end) {
          const [startHours, startMinutes] = customRange.start
            .split(":")
            .map(Number);
          const [endHours, endMinutes] = customRange.end.split(":").map(Number);
          return {
            start: startHours + startMinutes / 60,
            end: endHours + endMinutes / 60,
          };
        }
        return { start: 9, end: 17 };
      default:
        return { start: 0, end: 24 };
    }
  };
  const visibleRange = getVisibleTimeRange();

  const visibleIntervals = timeIntervals.filter((interval) => {
    const intervalHours = interval.time.getHours();
    const intervalMinutes = interval.time.getMinutes();
    const intervalTime = intervalHours + intervalMinutes / 60;
    return (
      intervalTime >= visibleRange.start && intervalTime <= visibleRange.end
    );
  });

  const timeIndicatorInterval = useRef(null);

  useEffect(() => {
    setCurrentTime(new Date());

    timeIndicatorInterval.current = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => {
      if (timeIndicatorInterval.current) {
        clearInterval(timeIndicatorInterval.current);
      }
    };
  }, [scale, timeRange, customRange]);

  const calculateTimeIndicatorPosition = () => {
    if (!gridBodyRef.current) return -1000;

    const gridContainer = gridBodyRef.current;
    const containerHeight = gridContainer.offsetHeight || 800;

    const currentMinutes =
      currentTime.getHours() * 60 + currentTime.getMinutes();
    const visibleStartMinutes = visibleRange.start * 60;
    const visibleEndMinutes = visibleRange.end * 60;

    if (
      currentMinutes < visibleStartMinutes ||
      currentMinutes > visibleEndMinutes
    ) {
      return -1000;
    }

    const gridRows = gridContainer.querySelectorAll(
      `.${styles.gridRow}`
    ).length;
    const rowHeight = containerHeight / gridRows;

    const minutesSinceStart = currentMinutes - visibleStartMinutes;
    const exactRows = minutesSinceStart / scale;
    const position = exactRows * rowHeight;

    return position;
  };

  useEffect(() => {
    const scrollToCurrentTime = () => {
      const gridContainer = document.querySelector(`.${styles.gridContainer}`);
      const gridBody = document.querySelector(`.${styles.gridBody}`);
      if (!gridContainer || !gridBody) return;

      const position = calculateTimeIndicatorPosition();

      const containerHeight = gridContainer.clientHeight;
      const newScrollTop = position - containerHeight / 2;

      gridContainer.scrollTo({
        top: newScrollTop,
        behavior: "smooth",
      });
    };

    scrollToCurrentTime();
  }, [scale]);

  const getFilteredTimeSlots = useMemo(() => {
    if (!timeSlots) return [];

    return timeSlots.filter((slot) => {
      if (slot.slot_type === "Break" && !filterBreaks) return false;
      if (slot.slot_type === "WorkingHours" && !filterWorkingHours)
        return false;
      return true;
    });
  }, [timeSlots, filterBreaks, filterWorkingHours]);

  const currentWeekSlots = useMemo(() => {
    return getFilteredTimeSlots;
  }, [getFilteredTimeSlots]);

  const getTasksForCell = (day, interval) => {
    if (!showTasks) return [];

    return tasks.filter((task) => {
      if (!task.time_slots || task.time_slots.length === 0) return false;

      return task.time_slots.some((slot) => {
        const slotStartTime = new Date(Number(slot.start_time) / 1000000);
        const slotEndTime = new Date(Number(slot.end_time) / 1000000);

        const cellTime = new Date(day.date);
        const [hours, minutes] = interval.label.split(":").map(Number);
        cellTime.setHours(hours, minutes, 0, 0);

        const cellEndTime = new Date(cellTime);
        cellEndTime.setMinutes(cellEndTime.getMinutes() + scale);

        return (
          format(slotStartTime, "yyyy-MM-dd") ===
            format(day.date, "yyyy-MM-dd") &&
          slotStartTime < cellEndTime &&
          slotEndTime > cellTime
        );
      });
    });
  };

  const isCurrentDay = (date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const handleCellClick = (day, interval) => {
    if (selectedSlotId) {
      onSlotSelect(null, null, false, null);
    }

    const tasksInCell = getTasksForCell(day, interval);
    if (tasksInCell.length > 0) {
      return;
    }

    const clickedTime = new Date(day.date);
    const [hours, minutes] = interval.label.split(":").map(Number);
    clickedTime.setHours(hours, minutes, 0, 0);

    const now = new Date();
    now.setSeconds(0, 0);

    if (clickedTime.getTime() < now.getTime()) {
      showPastTimeNotification();
      return;
    }

    onTimeSelect(clickedTime);
  };

  const handleSlotClick = (e, slot, day) => {
    e.stopPropagation();

    const slotDate = new Date(day.date);
    slotDate.setHours(
      Math.floor(slot.start_minutes / 60),
      slot.start_minutes % 60,
      0,
      0
    );

    const now = new Date();
    const isPastTime = slotDate < now && slot.slot_type === "WorkingHours";

    onSlotSelect(slot, e, isPastTime, day.date);
  };

  return (
    <div className={styles.gridContainer}>
      <div className={styles.gridHeader}>
        <div className={styles.timeColumn}>
          <WeekNavigation
            onPreviousWeek={onPreviousWeek}
            onNextWeek={onNextWeek}
          />
        </div>
        {weekDays.map((day) => (
          <div
            key={day.label}
            className={`${styles.dayColumn} ${
              isCurrentDay(day.date) ? styles.currentDay : ""
            }`}
          >
            {day.label}
          </div>
        ))}
      </div>

      <div className={styles.gridBody} ref={gridBodyRef}>
        {visibleIntervals.map((interval) => (
          <div key={interval.label} className={styles.gridRow}>
            <div className={styles.timeLabel}>{interval.label}</div>
            {weekDays.map((day) => (
              <div
                key={`${day.label}-${interval.label}`}
                className={`${styles.gridCell} ${
                  isCurrentDay(day.date) ? styles.currentDayCell : ""
                }`}
                onClick={() => handleCellClick(day, interval)}
              >
                {isCurrentDay(day.date) &&
                  interval.label === visibleIntervals[0].label && (
                    <div
                      className={styles.currentTimeIndicator}
                      style={{
                        top: `${calculateTimeIndicatorPosition()}px`,
                      }}
                    >
                      <div className={styles.currentTimeDot} />
                    </div>
                  )}

                {currentWeekSlots
                  .filter((slot) => {
                    const cellDayName = format(day.date, "EEEE");
                    const dayMatch =
                      slot.recurrence.frequency === "Daily" ||
                      slot.recurrence.specific_days?.includes(cellDayName) ||
                      slot.recurrence.specificDays?.includes(cellDayName);

                    if (!dayMatch) return false;

                    const [hourStr, minuteStr] = interval.label.split(":");
                    const hour = parseInt(hourStr);
                    const minute = parseInt(minuteStr);

                    // Minutes since midnight
                    const cellStartMinutes = hour * 60 + minute;
                    const cellEndMinutes = cellStartMinutes + scale;

                    const slotStartMinutes = slot.start_minutes;
                    const slotEndMinutes = slotStartMinutes + slot.duration;

                    // Check if the slot overlaps with this cell
                    return !(
                      slotStartMinutes >= cellEndMinutes ||
                      slotEndMinutes <= cellStartMinutes
                    );
                  })
                  .map((slot) => {
                    const [hourStr, minuteStr] = interval.label.split(":");
                    const hour = parseInt(hourStr);
                    const minute = parseInt(minuteStr);

                    const cellStartMinutes = hour * 60 + minute;
                    const cellEndMinutes = cellStartMinutes + scale;

                    const slotStartMinutes = slot.start_minutes;
                    const slotEndMinutes = slotStartMinutes + slot.duration;

                    const topOffset =
                      (Math.max(0, slotStartMinutes - cellStartMinutes) /
                        scale) *
                      100;
                    const height =
                      Math.min(cellEndMinutes, slotEndMinutes) -
                      Math.max(cellStartMinutes, slotStartMinutes);
                    const heightPercentage = (height / scale) * 100;

                    const slotStyle = {
                      top: `${topOffset}%`,
                      height: `${heightPercentage}%`,
                      minHeight: "3px",
                    };

                    return (
                      <TimeSlot
                        key={slot.id}
                        slot={slot}
                        scale={scale}
                        isSelected={selectedSlotId === slot.id}
                        isPending={pendingChanges.updates.has(slot.id)}
                        onClick={(e) => handleSlotClick(e, slot, day)}
                        style={slotStyle}
                      />
                    );
                  })}

                {showTasks &&
                  tasks
                    .filter((task) => {
                      if (!task.time_slots || task.time_slots.length === 0)
                        return false;

                      return task.time_slots.some((slot) => {
                        const slotDate = new Date(
                          Number(slot.start_time) / 1000000
                        );
                        return (
                          format(slotDate, "yyyy-MM-dd") ===
                          format(day.date, "yyyy-MM-dd")
                        );
                      });
                    })
                    .flatMap((task) => {
                      return task.time_slots
                        .filter((slot) => {
                          const slotDate = new Date(
                            Number(slot.start_time) / 1000000
                          );
                          return (
                            format(slotDate, "yyyy-MM-dd") ===
                            format(day.date, "yyyy-MM-dd")
                          );
                        })
                        .map((slot) => {
                          const [hourStr, minuteStr] =
                            interval.label.split(":");
                          const hour = parseInt(hourStr);
                          const minute = parseInt(minuteStr);

                          const slotStartTime = new Date(
                            Number(slot.start_time) / 1000000
                          );
                          const slotStartHour = slotStartTime.getHours();
                          const slotStartMinutes = slotStartTime.getMinutes();
                          const slotStartInMinutes =
                            slotStartHour * 60 + slotStartMinutes;

                          const slotEndTime = new Date(
                            Number(slot.end_time) / 1000000
                          );
                          const taskDuration =
                            (slotEndTime - slotStartTime) / (60 * 1000);

                          const cellStartMinutes = hour * 60 + minute;
                          const cellEndMinutes = cellStartMinutes + scale;

                          const isFirstCell =
                            slotStartInMinutes >= cellStartMinutes &&
                            slotStartInMinutes < cellEndMinutes;

                          if (
                            slotStartInMinutes >= cellEndMinutes ||
                            slotStartInMinutes + taskDuration <=
                              cellStartMinutes
                          ) {
                            return null;
                          }

                          const topOffset =
                            (Math.max(
                              0,
                              slotStartInMinutes - cellStartMinutes
                            ) /
                              scale) *
                            100;
                          const height =
                            Math.min(
                              cellEndMinutes,
                              slotStartInMinutes + taskDuration
                            ) - Math.max(cellStartMinutes, slotStartInMinutes);
                          const heightPercentage = (height / scale) * 100;

                          const taskStyle = {
                            top: `${topOffset}%`,
                            height: `${heightPercentage}%`,
                            minHeight: "3px",
                          };

                          return (
                            <TaskDisplay
                              key={`${task.id}-${slot.start_time}-${interval.label}`}
                              task={task}
                              timeSlot={slot}
                              style={taskStyle}
                              isFirstCell={isFirstCell}
                            />
                          );
                        });
                    })}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TimeGrid;
