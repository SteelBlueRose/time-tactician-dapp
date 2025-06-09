import React, { useState } from "react";
import styles from "@/app/styles/forms/DurationPicker.module.css";
import dialogStyles from "@/app/styles/components/dialog/Dialog.module.css";

const DurationPicker = ({ isOpen, onClose, onSelect }) => {
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);

  const handleConfirm = () => {
    const totalMinutes = hours * 60 + minutes;
    onSelect(totalMinutes);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={dialogStyles.nestedOverlay}>
      <div
        className={`${dialogStyles.nestedContainer} ${styles.durationDialog}`}
      >
        <h2 className={dialogStyles.title}>Set Duration</h2>
        <div className={styles.durationInputs}>
          <div className={styles.durationRow}>
            <div className={styles.timeInput}>
              <input
                type="number"
                min="0"
                value={hours}
                onChange={(e) =>
                  setHours(Math.max(0, parseInt(e.target.value) || 0))
                }
                className={styles.numberInput}
              />
              <span>hrs</span>
            </div>
            <div className={styles.timeInput}>
              <input
                type="number"
                min="0"
                max="59"
                value={minutes}
                onChange={(e) =>
                  setMinutes(
                    Math.max(0, Math.min(59, parseInt(e.target.value) || 0))
                  )
                }
                className={styles.numberInput}
              />
              <span>mins</span>
            </div>
          </div>
        </div>
        <div className={dialogStyles.actions}>
          <button className={dialogStyles.buttonSecondary} onClick={onClose}>
            Cancel
          </button>
          <button
            className={dialogStyles.buttonPrimary}
            onClick={handleConfirm}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

export default DurationPicker;
