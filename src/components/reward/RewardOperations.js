import React, { useState } from "react";
import { Edit, Trash, Gift } from "lucide-react";
import { HelloNearContract } from "@/config";
import { useBatch } from "@/components/layout/BatchContext";

import RewardForm from "./RewardForm";

import errorStyles from "@/app/styles/components/status/Error.module.css";

const RewardOperations = ({
  reward,
  hasEnoughPoints,
  onUpdate,
  onDelete,
  onRedeem,
  showAddForm,
  onCloseForm,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const { addAction } = useBatch();
  const { pendingChanges } = useBatch();

  const handleAddReward = async (title, description, cost) => {
    setLoading(true);
    setError(null);
    try {
      addAction({
        receiverId: HelloNearContract,
        actions: [
          {
            type: "FunctionCall",
            params: {
              methodName: "add_reward",
              args: { title, description, cost },
            },
          },
        ],
      });

      onUpdate && onUpdate();
    } catch (error) {
      setError(error.message || "Failed to add reward");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateReward = async (title, description, cost) => {
    setLoading(true);
    setError(null);
    try {
      addAction({
        receiverId: HelloNearContract,
        actions: [
          {
            type: "FunctionCall",
            params: {
              methodName: "update_reward",
              args: {
                reward_id: reward.id,
                title,
                description,
                cost,
              },
            },
          },
        ],
      });
      onUpdate && onUpdate();
    } catch (error) {
      setError(error.message || "Failed to update reward");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReward = async () => {
    if (!window.confirm("Are you sure you want to delete this reward?")) return;

    setLoading(true);
    setError(null);
    try {
      addAction({
        receiverId: HelloNearContract,
        actions: [
          {
            type: "FunctionCall",
            params: {
              methodName: "delete_reward",
              args: { reward_id: reward.id },
            },
          },
        ],
      });
      onDelete && onDelete(reward.id);
    } catch (error) {
      setError(error.message || "Failed to delete reward");
    } finally {
      setLoading(false);
    }
  };

  const handleRedeemReward = async () => {
    if (
      !window.confirm(
        `Are you sure you want to redeem this reward for ${reward.cost} points?`
      )
    ) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      addAction({
        receiverId: HelloNearContract,
        actions: [
          {
            type: "FunctionCall",
            params: {
              methodName: "redeem_reward",
              args: { reward_id: reward.id },
            },
          },
        ],
      });
      onRedeem && onRedeem(reward.id);
    } catch (error) {
      if (error.message?.includes("Insufficient points")) {
        setError(
          `Insufficient points available for redemption. Required: ${reward.cost} points`
        );
      } else if (error.message?.includes("overflow")) {
        setError("Points calculation error. Please try again.");
      } else {
        setError(error.message || "Failed to redeem reward");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: "16px" }}>
      {error && <div className={errorStyles.container}>{error}</div>}

      {showAddForm ? (
        // Add mode
        <RewardForm
          isOpen={true}
          onClose={onCloseForm}
          onSubmit={handleAddReward}
        />
      ) : (
        // Edit mode
        <>
          <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
            <button
              onClick={() => setShowEditForm(true)}
              disabled={
                loading ||
                reward.state === "Completed" ||
                pendingChanges.completions.has(reward.id)
              }
              className="icon-action-button"
              title="Edit reward"
            >
              <Edit size={16} />
            </button>

            <button
              onClick={handleDeleteReward}
              disabled={loading}
              className="icon-action-button delete"
              title="Delete reward"
            >
              <Trash size={16} />
            </button>

            <button
              onClick={handleRedeemReward}
              disabled={
                loading ||
                reward.state !== "Active" ||
                pendingChanges.completions.has(reward.id) ||
                !hasEnoughPoints
              }
              className="icon-action-button success"
              title="Redeem reward"
            >
              <Gift size={16} />
            </button>
          </div>

          {showEditForm && (
            <RewardForm
              isOpen={showEditForm}
              onClose={() => setShowEditForm(false)}
              onSubmit={handleUpdateReward}
              initialData={reward}
            />
          )}
        </>
      )}
    </div>
  );
};

export default RewardOperations;
