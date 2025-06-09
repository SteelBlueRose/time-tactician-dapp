import React, { useState, useEffect, useRef } from "react";
import { ChevronDown, ChevronRight, Clock } from "lucide-react";
import { format } from "date-fns";
import { HelloNearContract } from "@/config";
import { useBatch } from "@/components/layout/BatchContext";

import TimePicker from "@/components/helpers/TimePicker";

import dialogStyles from "@/app/styles/components/dialog/Dialog.module.css";
import errorStyles from "@/app/styles/components/status/Error.module.css";

const TaskScheduleForm = ({
  isOpen,
  onClose,
  tasks,
  timeSlots,
  selectedTime,
  onSubmit,
}) => {
  const { addAction } = useBatch();
  const [selectedTask, setSelectedTask] = useState(null);
  const [startTime, setStartTime] = useState(selectedTime || new Date());
  const [endTime, setEndTime] = useState(null);
  const [hoveredParent, setHoveredParent] = useState(null);
  const [deadline, setDeadline] = useState(null);
  const [errors, setErrors] = useState({});
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [submenuPosition, setSubmenuPosition] = useState({ top: 0, left: 0 });
  const [submenuTimeout, setSubmenuTimeout] = useState(null);
  const [potentialSplits, setPotentialSplits] = useState([]);
  const [showSplitPreview, setShowSplitPreview] = useState(false);

  // Group tasks by parent
  const taskTree = tasks.reduce((acc, task) => {
    if (!task.parent_task_id) {
      if (!acc[task.id]) {
        acc[task.id] = { task, subtasks: [] };
      } else {
        acc[task.id].task = task;
      }
    } else {
      if (!acc[task.parent_task_id]) {
        acc[task.parent_task_id] = { subtasks: [task] };
      } else {
        acc[task.parent_task_id].subtasks.push(task);
      }
    }
    return acc;
  }, {});

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (selectedTask && startTime) {
      // If the task already has time slots, pre-fill the form
      if (selectedTask.time_slots && selectedTask.time_slots.length > 0) {

        // Use the first slot for initial values
        const firstSlot = selectedTask.time_slots[0];
        setStartTime(new Date(Number(firstSlot.start_time) / 1000000));
        setEndTime(new Date(Number(firstSlot.end_time) / 1000000));

      } else {

        // Otherwise calculate based on estimated time
        const estimatedMinutes = selectedTask.estimated_time;
        const newEndTime = new Date(startTime.getTime());
        newEndTime.setMinutes(newEndTime.getMinutes() + estimatedMinutes);
        setEndTime(newEndTime);
      }
    }
  }, [selectedTask, startTime]);

  const detectOverlaps = () => {
    if (!selectedTask || !startTime || !endTime) return [];

    const originalDurationMinutes =
      (endTime.getTime() - startTime.getTime()) / (60 * 1000);
    const startMinutes = startTime.getHours() * 60 + startTime.getMinutes();
    const endMinutes = startMinutes + originalDurationMinutes;

    const scheduledDayName = format(startTime, "EEEE");
    const obstacles = [];

    tasks.forEach((task) => {
      if (task.id === selectedTask.id) return;

      if (task.time_slots && task.time_slots.length > 0) {
        task.time_slots.forEach((slot) => {
          const slotStartTime = new Date(Number(slot.start_time) / 1000000);
          const slotEndTime = new Date(Number(slot.end_time) / 1000000);

          if (slotStartTime.toDateString() === startTime.toDateString()) {
            obstacles.push({
              type: "task",
              title: task.title,
              start: slotStartTime.getHours() * 60 + slotStartTime.getMinutes(),
              end: slotEndTime.getHours() * 60 + slotEndTime.getMinutes(),
            });
          }
        });
      }
    });

    timeSlots.forEach((slot) => {
      if (slot.slot_type === "Break") {
        const dayMatch =
          slot.recurrence.frequency === "Daily" ||
          (slot.recurrence.specific_days &&
            slot.recurrence.specific_days.includes(scheduledDayName)) ||
          (slot.recurrence.specificDays &&
            slot.recurrence.specificDays.includes(scheduledDayName));

        if (dayMatch) {
          const slotStartMinutes = slot.start_minutes;
          const slotEndMinutes = slot.start_minutes + slot.duration;

          obstacles.push({
            type: "break",
            title: "Break",
            start: slotStartMinutes,
            end: slotEndMinutes,
          });
        }
      }
    });

    obstacles.sort((a, b) => a.start - b.start);

    const overlaps = obstacles.filter(
      (o) => o.start < endMinutes && o.end > startMinutes
    );

    if (overlaps.length === 0) return [];

    let currentStart = startMinutes;
    let accumulatedDuration = 0;
    const splits = [];

    for (const obstacle of overlaps) {
      if (currentStart < obstacle.start) {
        const segmentDuration = obstacle.start - currentStart;
        splits.push({
          start: new Date(startTime).setHours(
            Math.floor(currentStart / 60),
            currentStart % 60,
            0,
            0
          ),
          end: new Date(startTime).setHours(
            Math.floor(obstacle.start / 60),
            obstacle.start % 60,
            0,
            0
          ),
          duration: segmentDuration,
        });

        accumulatedDuration += segmentDuration;
      }

      currentStart = obstacle.end;
    }

    if (accumulatedDuration < originalDurationMinutes) {
      const remainingDuration = originalDurationMinutes - accumulatedDuration;
      const finalEnd = currentStart + remainingDuration;

      splits.push({
        start: new Date(startTime).setHours(
          Math.floor(currentStart / 60),
          currentStart % 60,
          0,
          0
        ),
        end: new Date(startTime).setHours(
          Math.floor(finalEnd / 60),
          finalEnd % 60,
          0,
          0
        ),
        duration: remainingDuration,
      });
    }

    return splits;
  };

  useEffect(() => {
    if (selectedTask) {
      const taskDeadline = new Date(Number(selectedTask.deadline) / 1000000);
      setDeadline(taskDeadline);

      if (endTime && taskDeadline < endTime) {
        setDeadline(new Date(endTime.getTime()));
      }
    }
  }, [selectedTask, endTime]);

  const validateTimes = () => {
    const newErrors = {};

    if (!startTime) {
      newErrors.startTime = "Start time is required";
    }

    if (!endTime) {
      newErrors.endTime = "End time is required";
    } else if (endTime <= startTime) {
      newErrors.endTime = "End time must be after start time";
    }

    if (!deadline) {
      newErrors.deadline = "Deadline is required";
    } else if (deadline < endTime) {
      newErrors.deadline = "Deadline must be after scheduled end time";
    }

    const splits = detectOverlaps();
    setPotentialSplits(splits);

    if (splits.length > 0) {
      setShowSplitPreview(true);
      return false;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (useSplits = false) => {
    if (!selectedTask) {
      setErrors({ task: "Please select a task" });
      return;
    }

    if (!useSplits) {
      if (!validateTimes()) {
        return;
      }
    }

    const deadlineNs = 1000 + deadline.getTime() * 1000000;
    let time_slots = [];

    if (useSplits && potentialSplits.length > 0) {
      time_slots = potentialSplits.map((split) => ({
        start_time: split.start * 1000000,
        end_time: split.end * 1000000,
      }));
    } else {
      // Single time slot
      const startTimeNs = startTime.getTime() * 1000000;
      const endTimeNs = endTime.getTime() * 1000000;
      time_slots = [{ start_time: startTimeNs, end_time: endTimeNs }];
    }

    const totalDurationMs = time_slots.reduce(
      (total, slot) =>
        total + (Number(slot.end_time) - Number(slot.start_time)) / 1000000,
      0
    );
    const newEstimatedTime = Math.ceil(totalDurationMs / (60 * 1000));

    addAction({
      receiverId: HelloNearContract,
      actions: [
        {
          type: "FunctionCall",
          params: {
            methodName: "update_task",
            args: {
              task_id: selectedTask.id,
              title: selectedTask.title,
              description: selectedTask.description,
              priority: selectedTask.priority,
              deadline: deadlineNs,
              estimated_time: newEstimatedTime,
              time_slots: time_slots,
            },
          },
        },
      ],
    });

    onSubmit && onSubmit();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={dialogStyles.overlay}>
      <div className={dialogStyles.container}>
        <h2 className={dialogStyles.title}>Schedule Task</h2>

        <div
          className={dialogStyles.inputContainer}
          style={{ overflow: "visible" }}
        >
          <div style={{ position: "relative", overflow: "visible" }}>
            <div
              className={`${dialogStyles.input} ${
                errors.task ? dialogStyles.error : ""
              }`}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                cursor: "pointer",
              }}
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              <span>{selectedTask ? selectedTask.title : "Select a task"}</span>
              <ChevronDown size={16} />
            </div>

            {dropdownOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  backgroundColor: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: "4px",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                  zIndex: 20,
                  maxHeight: "200px",
                  overflowY: "auto",
                  overflowX: "visible",
                }}
              >

                {Object.entries(taskTree).map(([taskId, { task, subtasks }]) =>
                  task ? (
                    <div key={taskId}>
                      <div
                        style={{
                          padding: "8px 12px",
                          cursor: "pointer",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          borderBottom: "1px solid #f3f4f6",
                          backgroundColor:
                            hoveredParent === taskId ? "#f9fafb" : "white",
                        }}
                        onClick={() => {
                          setSelectedTask(task);
                          setDropdownOpen(false);
                        }}
                        onMouseEnter={(e) => {
                          if (submenuTimeout) {
                            clearTimeout(submenuTimeout);
                            setSubmenuTimeout(null);
                          }

                          const rect = e.currentTarget.getBoundingClientRect();
                          setSubmenuPosition({
                            top: rect.top,
                            left: rect.right,
                          });
                          setHoveredParent(taskId);
                        }}
                        onMouseLeave={(e) => {
                          const rect = document
                            .querySelector(`.subtasks-menu-${taskId}`)
                            ?.getBoundingClientRect();
                          if (rect) {
                            const { clientX, clientY } = e;
                            if (
                              clientX >= rect.left &&
                              clientX <= rect.right &&
                              clientY >= rect.top &&
                              clientY <= rect.bottom
                            ) {
                              return;
                            }
                          }
                          setHoveredParent(null);
                        }}
                      >
                        <span>{task.title}</span>
                        {subtasks.length > 0 && <ChevronRight size={16} />}
                      </div>

                      {hoveredParent &&
                        taskTree[hoveredParent]?.subtasks?.length > 0 && (
                          <div
                            className={`subtasks-menu-${hoveredParent}`}
                            style={{
                              position: "fixed",
                              top: `${submenuPosition.top}px`,
                              left: `${submenuPosition.left}px`,
                              backgroundColor: "white",
                              border: "1px solid #e5e7eb",
                              borderRadius: "4px",
                              boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
                              zIndex: 10000,
                              minWidth: "200px",
                              padding: "4px 0",
                            }}
                            onMouseEnter={() => setHoveredParent(hoveredParent)}
                            onMouseLeave={() => setHoveredParent(null)}
                          >
                            {taskTree[hoveredParent].subtasks.map((subtask) => (
                              <div
                                key={subtask.id}
                                style={{
                                  padding: "8px 12px",
                                  cursor: "pointer",
                                  backgroundColor: "white",
                                  color: "#000",
                                  margin: "2px 0",
                                  borderRadius: "2px",
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedTask(subtask);
                                  setDropdownOpen(false);
                                  setHoveredParent(null);
                                }}
                                onMouseEnter={() =>
                                  setHoveredParent(hoveredParent)
                                }
                              >
                                {subtask.title}
                              </div>
                            ))}
                          </div>
                        )}
                    </div>
                  ) : null
                )}
              </div>
            )}
          </div>
          {errors.task && (
            <p className={dialogStyles.errorText}>{errors.task}</p>
          )}
          <p className={dialogStyles.inputTip}>Choose task</p>
        </div>

        <div className={dialogStyles.inputContainer}>
          <TimePicker selectedDate={startTime} onSelect={setStartTime} />
          {errors.startTime && (
            <p className={dialogStyles.errorText}>{errors.startTime}</p>
          )}
          <p className={dialogStyles.inputTip}>Scheduled start time</p>
        </div>

        <div className={dialogStyles.inputContainer}>
          <TimePicker selectedDate={endTime} onSelect={setEndTime} />
          {errors.endTime && (
            <p className={dialogStyles.errorText}>{errors.endTime}</p>
          )}
          <p className={dialogStyles.inputTip}>Scheduled end time</p>
        </div>
        {errors.overlap && (
          <div className={errorStyles.container} style={{ marginTop: "8px" }}>
            {errors.overlap}
          </div>
        )}
        <div className={dialogStyles.inputContainer}>
          <TimePicker selectedDate={deadline} onSelect={setDeadline} />
          {errors.deadline && (
            <p className={dialogStyles.errorText}>{errors.deadline}</p>
          )}
          <p className={dialogStyles.inputTip}>Deadline</p>
        </div>
        {showSplitPreview && potentialSplits.length > 0 && (
          <div className={dialogStyles.splitPreview}>
            <h3>Task Split Preview</h3>
            <p>
              Your task will be split into {potentialSplits.length} segments to
              work around other tasks and breaks:
            </p>

            <div className={dialogStyles.splitSegments}>
              {potentialSplits.map((split, index) => (
                <div key={index} className={dialogStyles.splitSegment}>
                  <div className={dialogStyles.segmentTime}>
                    <Clock size={16} />
                    <span>
                      {new Date(split.start).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      -{" "}
                      {new Date(split.end).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div className={dialogStyles.segmentDuration}>
                    {Math.round(split.duration)} minutes
                  </div>
                </div>
              ))}
            </div>

            <div className={dialogStyles.splitActions}>
              <button
                className={dialogStyles.buttonPrimary}
                onClick={() => handleSubmit(true)}
              >
                Accept Split
              </button>
              <button
                className={dialogStyles.buttonSecondary}
                onClick={() => setShowSplitPreview(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        <div className={dialogStyles.actions}>
          <button
            className={dialogStyles.buttonPrimary}
            onClick={() => handleSubmit(false)}
            disabled={!selectedTask || showSplitPreview}
          >
            Schedule Task
          </button>
          <button className={dialogStyles.buttonSecondary} onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskScheduleForm;
