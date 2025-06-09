import React from "react";
import { Circle } from "lucide-react";
import { format } from "date-fns";

import styles from "@/app/styles/features/planner/TimeGrid.module.css";

const TaskDisplay = ({
  task,
  timeSlot,
  style,
  isFirstCell = false,
  scale = 60,
}) => {
  const getStatusColor = () => {
    switch (task.state) {
      case "InProgress":
        return "#eab308"; // yellow
      case "Completed":
        return "#22c55e"; // green
      case "Overdue":
        return "#ef4444"; // red
      default:
        return "#94a3b8"; // gray
    }
  };

  const getPriorityColor = () => {
    switch (task.priority) {
      case "Critical":
        return "#ef4444"; // red
      case "High":
        return "#f97316"; // orange
      case "Medium":
        return "#eab308"; // yellow
      default:
        return "#000033"; // black
    }
  };

  const isTooSmall = () => {
    const startTime = new Date(Number(timeSlot.start_time) / 1000000);
    const endTime = new Date(Number(timeSlot.end_time) / 1000000);
    const durationMinutes = (endTime - startTime) / (60 * 1000);
    const slotRatio = durationMinutes / scale;

    return slotRatio < 0.15;
  };

  const formatTime = (timeNs) => {
    const date = new Date(Number(timeNs) / 1000000);
    return format(date, "HH:mm");
  };

  return (
    <div
      className={styles.timeSlot}
      style={{
        ...style,
        backgroundColor: getStatusColor(),
        border: "1px solid rgba(0, 0, 0, 0.1)",
        zIndex: 5,
      }}
      title={task.title}
    >
      {isFirstCell && !isTooSmall() && (
        <div className={styles.taskDisplay}>
          <Circle
            size={8}
            fill={getPriorityColor()}
            color={getPriorityColor()}
          />
          <span className={styles.taskTitle}>{task.title}</span>
          <span className={styles.taskTime}>
            {formatTime(timeSlot.start_time)}
          </span>
        </div>
      )}
    </div>
  );
};

export default TaskDisplay;
