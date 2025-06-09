import React from "react";
import dialogStyles from "@/app/styles/components/dialog/Dialog.module.css";

const SortDialog = ({
  isOpen,
  onClose,
  sortType,
  setSortType,
  sortOrder,
  setSortOrder,
  options,
}) => {
  if (!isOpen) return null;

  return (
    <div className={dialogStyles.overlay}>
      <div className={dialogStyles.container}>
        <h2 className={dialogStyles.title}>Sort Items</h2>

        <div className={dialogStyles.inputContainer}>
          <select
            value={sortType}
            onChange={(e) => setSortType(e.target.value)}
            className={dialogStyles.input}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className={dialogStyles.inputTip}>Sort by</p>
        </div>

        <div className={dialogStyles.inputContainer}>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className={dialogStyles.input}
          >
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </select>
          <p className={dialogStyles.inputTip}>Order</p>
        </div>

        <div className={dialogStyles.actions}>
          <button className={dialogStyles.buttonPrimary} onClick={onClose}>
            Apply
          </button>
          <button className={dialogStyles.buttonSecondary} onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default SortDialog;
