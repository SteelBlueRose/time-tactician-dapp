import React, { useState } from "react";
import { Edit, Trash, Play, Check, Plus } from "lucide-react";
import { HelloNearContract } from "@/config";
import { useBatch } from "@/components/layout/BatchContext";

import TaskForm from "./TaskForm";

import errorStyles from "@/app/styles/components/status/Error.module.css";

const TaskOperations = ({
  task,
  onUpdate,
  onDelete,
  onStart,
  onComplete,
  showAddForm,
  onCloseForm,
  isSubtask = false,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showSubtaskForm, setShowSubtaskForm] = useState(false);
  const { addAction } = useBatch();
  const { pendingChanges } = useBatch();

  const handleAddTask = async (
    title,
    description,
    priority,
    deadline,
    estimated_time,
    time_slots = null,
    parent_task_id = null,
    habitInfo = null
  ) => {
    setLoading(true);
    setError(null);
    try {
      const recurrence_pattern = habitInfo || null;

      addAction({
        receiverId: HelloNearContract,
        actions: [
          {
            type: "FunctionCall",
            params: {
              methodName: "add_task",
              args: {
                title,
                description,
                priority,
                deadline,
                estimated_time,
                time_slots,
                parent_task_id,
                recurrence_pattern,
              },
            },
          },
        ],
      });

      onUpdate && onUpdate();
    } catch (error) {
      setError(error.message || "Failed to add task");
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubtask = async (
    title,
    description,
    priority,
    deadline,
    estimated_time,
    time_slots = null,
    parent_task_id = null,
    habitInfo = null
  ) => {
    await handleAddTask(
      title,
      description,
      priority,
      deadline,
      estimated_time,
      null,
      task.id
    );
    setShowSubtaskForm(false);
  };

  const handleUpdateTask = async (
    title,
    description,
    priority,
    deadline,
    estimated_time
  ) => {
    setLoading(true);
    setError(null);
    try {
      addAction({
        receiverId: HelloNearContract,
        actions: [
          {
            type: "FunctionCall",
            params: {
              methodName: "update_task",
              args: {
                task_id: task.id,
                title,
                description,
                priority,
                deadline,
                estimated_time,
              },
            },
          },
        ],
      });

      onUpdate && onUpdate();
      setShowEditForm(false);
    } catch (error) {
      setError(error.message || "Failed to update task");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTask = async () => {
    const hasOverdueAction = pendingChanges.overdue.has(task.id);

    if (
      !window.confirm(
        `Are you sure you want to delete this ${
          task.isHabit ? "habit" : "task"
        }?`
      )
    )
      return;

    setLoading(true);
    setError(null);
    try {
      if (hasOverdueAction) {
        const updatedActions = useBatch().batchActions.filter((action) => {
          const { methodName, args } = action.actions[0].params;
          return !(
            methodName === "mark_task_overdue" && args.task_id === task.id
          );
        });
        useBatch().clearActions();
        updatedActions.forEach((action) => useBatch().addAction(action));
      }

      addAction({
        receiverId: HelloNearContract,
        actions: [
          {
            type: "FunctionCall",
            params: {
              methodName: "delete_task",
              args: { task_id: task.id },
            },
          },
        ],
      });
      onDelete && onDelete(task.id);
    } catch (error) {
      setError(error.message || "Failed to delete task");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: "16px" }}>
      {error && <div className={errorStyles.container}>{error}</div>}

      {showAddForm ? (
        <TaskForm
          isOpen={true}
          onClose={onCloseForm}
          onSubmit={handleAddTask}
        />
      ) : (
        <>
          <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
            {!isSubtask && task.state !== "Completed" && (
              <button
                onClick={() => setShowSubtaskForm(true)}
                disabled={loading || pendingChanges.completions.has(task.id)}
                className="icon-action-button"
                title={`Add ${task.isHabit ? "subhabit" : "subtask"}`}
              >
                <Plus size={16} />
              </button>
            )}

            <button
              onClick={() => setShowEditForm(true)}
              disabled={
                loading ||
                task.state === "Completed" ||
                pendingChanges.completions.has(task.id)
              }
              className="icon-action-button"
              title={`Edit ${task.isHabit ? "habit" : "task"}`}
            >
              <Edit size={16} />
            </button>

            <button
              onClick={handleDeleteTask}
              disabled={loading}
              className="icon-action-button delete"
              title="Delete task"
            >
              <Trash size={16} />
            </button>

            {task.state === "Created" && (
              <button
                onClick={() => onStart(task)}
                disabled={loading || pendingChanges.starts.has(task.id)}
                className="icon-action-button success"
                title={`Start ${task.isHabit ? "habit" : "task"}`}
              >
                <Play size={16} />
              </button>
            )}

            {task.state === "InProgress" && (
              <button
                onClick={() => onComplete(task)}
                disabled={loading || pendingChanges.completions.has(task.id)}
                className="icon-action-button success"
                title={`Complete ${task.isHabit ? "habit" : "task"}`}
              >
                <Check size={16} />
              </button>
            )}
          </div>

          {showEditForm && (
            <TaskForm
              isOpen={showEditForm}
              onClose={() => setShowEditForm(false)}
              onSubmit={handleUpdateTask}
              initialData={task}
            />
          )}

          {showSubtaskForm && (
            <TaskForm
              isOpen={showSubtaskForm}
              onClose={() => setShowSubtaskForm(false)}
              onSubmit={handleAddSubtask}
              isSubtask={true}
              parentTask={task}
            />
          )}
        </>
      )}
    </div>
  );
};

export default TaskOperations;
