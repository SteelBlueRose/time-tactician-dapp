import React, { useState } from "react";
import { Edit, Trash } from "lucide-react";
import { HelloNearContract } from "@/config";
import { useBatch } from "@/components/layout/BatchContext";

import TimeSlotForm from "./TimeSlotForm";

import errorStyles from "@/app/styles/components/status/Error.module.css";

const TimeSlotOperations = ({
  timeSlot,
  onUpdate,
  onDelete,
  showAddForm,
  showEditForm,
  setShowEditForm,
  onCloseForm,
  selectedTime = null,
  popupMode = false,
  onClosePopup,
  hideScheduleTask = false,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { addAction } = useBatch();
  const { pendingChanges } = useBatch();

  const handleAddTimeSlot = async (slotData) => {
    setLoading(true);
    setError(null);
    try {
      addAction({
        receiverId: HelloNearContract,
        actions: [
          {
            type: "FunctionCall",
            params: {
              methodName: "add_time_slot",
              args: {
                start_minutes: slotData.startMinutes,
                end_minutes: slotData.endMinutes,
                slot_type: slotData.slotType,
                recurrence: {
                  frequency: slotData.recurrence.frequency,
                  interval: parseInt(slotData.recurrence.interval),
                  specific_days: slotData.recurrence.specificDays || [],
                },
              },
            },
          },
        ],
      });

      onUpdate && onUpdate();
      onCloseForm && onCloseForm();
    } catch (error) {
      console.error("Error adding time slot:", error);
      setError(error.message || "Failed to add time slot");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTimeSlot = async (slotData) => {
    setLoading(true);
    setError(null);
    try {
      addAction({
        receiverId: HelloNearContract,
        actions: [
          {
            type: "FunctionCall",
            params: {
              methodName: "update_time_slot",
              args: {
                slot_id: timeSlot.id,
                start_minutes: slotData.startMinutes,
                end_minutes: slotData.endMinutes,
                recurrence: {
                  frequency: slotData.recurrence.frequency,
                  interval: parseInt(slotData.recurrence.interval),
                  specific_days: slotData.recurrence.specificDays || [],
                },
              },
            },
          },
        ],
      });
      onUpdate && onUpdate();
      setShowEditForm(false);
      if (popupMode && onClosePopup) {
        onClosePopup();
      }
    } catch (error) {
      console.error("Error updating time slot:", error);
      setError(error.message || "Failed to update time slot");
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = () => {
    setShowEditForm(true);
  };

  const handleDeleteTimeSlot = async () => {
    if (!window.confirm("Are you sure you want to delete this time slot?"))
      return;

    setLoading(true);
    setError(null);
    try {
      addAction({
        receiverId: HelloNearContract,
        actions: [
          {
            type: "FunctionCall",
            params: {
              methodName: "delete_time_slot",
              args: { slot_id: timeSlot.id },
            },
          },
        ],
      });

      if (onDelete) {
        onDelete(timeSlot.id);
      }

      if (popupMode && onClosePopup) {
        onClosePopup();
      }
    } catch (error) {
      console.error("Error deleting time slot:", error);
      setError(error.message || "Failed to delete time slot");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {error && <div className={errorStyles.container}>{error}</div>}

      {showAddForm ? (
        <TimeSlotForm
          isOpen={true}
          onClose={onCloseForm}
          onSubmit={handleAddTimeSlot}
          selectedTime={selectedTime}
        />
      ) : (
        <>
          <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
            <button
              onClick={handleEditClick}
              disabled={loading || pendingChanges.updates.has(timeSlot?.id)}
              className="icon-action-button"
              title="Edit time slot"
            >
              <Edit size={16} />
              {popupMode && <span style={{ marginLeft: "4px" }}>Edit</span>}
            </button>

            <button
              onClick={handleDeleteTimeSlot}
              disabled={loading}
              className="icon-action-button delete"
              title="Delete time slot"
            >
              <Trash size={16} />
              {popupMode && <span style={{ marginLeft: "4px" }}>Delete</span>}
            </button>
          </div>

          {!hideScheduleTask && showEditForm && (
            <TimeSlotForm
              isOpen={true}
              onClose={() => {
                setShowEditForm(false);
                if (popupMode && onCloseForm) {
                  onCloseForm();
                }
              }}
              onSubmit={handleUpdateTimeSlot}
              initialData={timeSlot}
            />
          )}
        </>
      )}
    </div>
  );
};

export default TimeSlotOperations;
