import React, { useState } from "react";

import dialogStyles from "@/app/styles/components/dialog/Dialog.module.css";

const MAX_TITLE_LENGTH = 64;
const MAX_DESCRIPTION_LENGTH = 256;
const MIN_COST = 1;
const MAX_COST = 1000000;

const RewardForm = ({ isOpen, onClose, onSubmit, initialData = null }) => {
  const [rewardData, setRewardData] = useState({
    title: initialData?.title || "",
    description: initialData?.description || "",
    cost: initialData?.cost?.toString() || "",
  });

  const [errors, setErrors] = useState({
    title: "",
    description: "",
    cost: "",
  });

  const validateForm = () => {
    const newErrors = {};

    // Title validation
    if (!rewardData.title.trim()) {
      newErrors.title = "Title is required";
    } else if (rewardData.title.length > MAX_TITLE_LENGTH) {
      newErrors.title = `Title must be ${MAX_TITLE_LENGTH} characters or less`;
    } else if (
      /[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/.test(rewardData.description)
    ) {
      newErrors.description = "Title cannot contain control characters";
    }

    // Description validation
    if (rewardData.description.length > MAX_DESCRIPTION_LENGTH) {
      newErrors.description = `Description must be ${MAX_DESCRIPTION_LENGTH} characters or less`;
    } else if (
      /[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/.test(rewardData.description)
    ) {
      newErrors.description = "Description cannot contain control characters";
    }

    // Cost validation
    const costNum = parseInt(rewardData.cost);
    if (!rewardData.cost) {
      newErrors.cost = "Cost is required";
    } else if (isNaN(costNum) || costNum < MIN_COST) {
      newErrors.cost = `Cost must be at least ${MIN_COST} point`;
    } else if (costNum > MAX_COST) {
      newErrors.cost = `Cost cannot exceed ${MAX_COST} points`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validateForm()) {
      onSubmit(
        rewardData.title.trim(),
        rewardData.description,
        parseInt(rewardData.cost)
      );
      onClose();
    }
  };

  const handleChange = (field, value) => {
    setRewardData((prev) => ({
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

  if (!isOpen) return null;

  return (
    <div className={dialogStyles.overlay}>
      <div className={dialogStyles.container}>
        <h2 className={dialogStyles.title}>
          {initialData ? "Edit Reward" : "Add Reward"}
        </h2>

        <div className={dialogStyles.inputContainer}>
          <input
            type="text"
            placeholder="Title"
            value={rewardData.title}
            onChange={(e) => handleChange("title", e.target.value)}
            className={`${dialogStyles.input} ${dialogStyles.inputContainer} ${
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
            value={rewardData.description}
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
          <input
            type="number"
            placeholder="Cost in points"
            value={rewardData.cost}
            onChange={(e) => handleChange("cost", e.target.value)}
            min={MIN_COST}
            max={MAX_COST}
            className={`${dialogStyles.input} ${
              errors.cost ? dialogStyles.error : ""
            }`}
          />
          {errors.cost && (
            <p className={dialogStyles.errorText}>{errors.cost}</p>
          )}
          <p className={dialogStyles.inputTip}>
            Cost ({MIN_COST} - {MAX_COST} points)
          </p>
        </div>

        <div className={dialogStyles.actions}>
          <button
            className={dialogStyles.buttonPrimary}
            onClick={handleSave}
            disabled={!rewardData.title || !rewardData.cost}
          >
            {initialData ? "Save Changes" : "Add"}
          </button>
          <button className={dialogStyles.buttonSecondary} onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default RewardForm;
