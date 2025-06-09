import React from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

const WeekNavigation = ({ onPreviousWeek, onNextWeek }) => {
  return (
    <div className="time-nav-container">
      <button
        onClick={onPreviousWeek}
        className="time-nav-button"
        title="Previous week"
      >
        <ArrowLeft size={16} />
      </button>
      <button
        onClick={onNextWeek}
        className="time-nav-button"
        title="Next week"
      >
        <ArrowRight size={16} />
      </button>
    </div>
  );
};

export default WeekNavigation;
