import React from "react";
import { CheckCircle, AlertCircle, Clock } from "lucide-react";
import dialogStyles from "@/app/styles/components/dialog/Dialog.module.css";

const SmartSchedulePreview = ({
  isOpen,
  onClose,
  onConfirm,
  originalTasks,
  optimizedSchedule,
}) => {
  if (!isOpen || !optimizedSchedule) return null;

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDuration = (minutes) => {
    if (typeof minutes !== "number") return "";
    const roundedMinutes = Math.round(minutes);
    const hours = Math.floor(roundedMinutes / 60);
    const mins = roundedMinutes % 60;

    if (hours > 0) {
      return `${hours}h ${mins}m`;
    } else {
      return `${mins}m`;
    }
  };

  const changedTasks = optimizedSchedule.tasks.filter((task) => {
    const originalTask = originalTasks.find((t) => t.id === task.id);
    if (!originalTask) return false;

    const originalStartTime =
      originalTask.scheduled_start_time ||
      (originalTask.time_slots && originalTask.time_slots.length > 0
        ? originalTask.time_slots[0].start_time
        : null);

    const originalEndTime =
      originalTask.scheduled_end_time ||
      (originalTask.time_slots && originalTask.time_slots.length > 0
        ? originalTask.time_slots[originalTask.time_slots.length - 1].end_time
        : null);

    return (
      task.scheduled_start_time !== originalStartTime ||
      task.scheduled_end_time !== originalEndTime
    );
  });

  return (
    <div className={dialogStyles.overlay}>
      <div className={dialogStyles.container} style={{ maxWidth: "600px" }}>
        <h2 className={dialogStyles.title}>Smart Schedule Preview</h2>

        <div style={{ marginBottom: "20px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "10px",
            }}
          >
            <CheckCircle size={20} color="#22c55e" />
            <span style={{ marginLeft: "8px", fontWeight: "500" }}>
              Optimized {changedTasks.length} of{" "}
              {optimizedSchedule.tasks.length} tasks
            </span>
          </div>

          <p style={{ fontSize: "14px", color: "#4b5563" }}>
            The system has calculated an optimized schedule based on your tasks'
            priority, deadlines, and available time slots.
          </p>
        </div>

        <div
          style={{
            maxHeight: "300px",
            overflowY: "auto",
            marginBottom: "20px",
          }}
        >
          {optimizedSchedule.tasks.map((task) => {
            const originalTask = originalTasks.find((t) => t.id === task.id);
            const isChanged =
              originalTask &&
              task.scheduled_start_time !==
                (originalTask.scheduled_start_time ||
                  (originalTask.time_slots && originalTask.time_slots.length > 0
                    ? originalTask.time_slots[0].start_time
                    : null));

            return (
              <div
                key={task.id}
                style={{
                  padding: "12px",
                  marginBottom: "8px",
                  borderRadius: "6px",
                  backgroundColor: isChanged ? "#f0f9ff" : "#f9fafb",
                  borderLeft: isChanged
                    ? "3px solid #3b82f6"
                    : "3px solid transparent",
                }}
              >
                <div style={{ fontWeight: "500", marginBottom: "4px" }}>
                  {task.title}
                </div>

                {task.segments && task.segments.length > 0 ? (
                  <div style={{ marginTop: "8px" }}>
                    {task.segments.length > 1 ? (
                      <div
                        style={{
                          fontSize: "13px",
                          color: "#6b7280",
                          marginBottom: "4px",
                        }}
                      >
                        Split into {task.segments.length} segments
                      </div>
                    ) : null}

                    {task.segments.map((segment, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          fontSize: "13px",
                          color: "#374151",
                          marginBottom: "4px",
                        }}
                      >
                        <Clock size={14} style={{ marginRight: "4px" }} />
                        {formatDate(segment.start)} - {formatDate(segment.end)}
                        <span style={{ marginLeft: "4px", color: "#6b7280" }}>
                          ({formatDuration(segment.duration)})
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: "13px", color: "#ef4444" }}>
                    <AlertCircle size={14} style={{ marginRight: "4px" }} />
                    Could not schedule
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className={dialogStyles.actions}>
          <button className={dialogStyles.buttonPrimary} onClick={onConfirm}>
            Apply Schedule
          </button>
          <button className={dialogStyles.buttonSecondary} onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default SmartSchedulePreview;
