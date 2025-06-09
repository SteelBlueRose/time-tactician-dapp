import React, { useRef } from "react";
import styles from "@/app/styles/features/planner/TimeGrid.module.css";

const TimeSlot = ({ slot, scale, isSelected, isPending, onClick, style }) => {
  const slotRef = useRef(null);

  const formatTimeRange = () => {
    const startHour = Math.floor(slot.start_minutes / 60);
    const startMin = (slot.start_minutes % 60).toString().padStart(2, "0");
    const totalEndMinutes = slot.start_minutes + slot.duration;
    const endHour = Math.floor(totalEndMinutes / 60) % 24;
    const endMin = (totalEndMinutes % 60).toString().padStart(2, "0");
    return `${startHour}:${startMin}-${endHour}:${endMin}`;
  };

  return (
    <div
      ref={slotRef}
      className={`${styles.timeSlot} ${
        slot.slot_type === "Break" ? styles.break : styles.workinghours
      } ${isPending ? styles.pending : ""} ${
        isSelected ? styles.selected : ""
      }`}
      style={{
        ...style,
      }}
      onClick={onClick}
      title={`${formatTimeRange()} ${slot.slot_type}`}
      data-scale={scale}
    ></div>
  );
};

export default TimeSlot;
