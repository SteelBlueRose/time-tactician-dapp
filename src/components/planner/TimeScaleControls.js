import React from "react";
import styles from "@/app/styles/features/planner/TimeScaleControls.module.css";

const TimeScaleControls = ({ scale, onScaleChange }) => {
  return (
    <select
      value={scale}
      onChange={(e) => onScaleChange(Number(e.target.value))}
      className={styles.scaleSelect}
    >
      <option value={5}>5 min</option>
      <option value={15}>15 min</option>
      <option value={30}>30 min</option>
      <option value={60}>60 min</option>
    </select>
  );
};

export default TimeScaleControls;
