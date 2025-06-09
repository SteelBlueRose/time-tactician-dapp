"use client";

import React, {
  useState,
  useEffect,
  useContext,
  useCallback,
  useRef,
} from "react";

import {
  AlertCircle,
  Clock,
  Calendar,
  ArrowUpDown,
  ChevronRight,
  Play,
  CheckSquare,
  RepeatIcon,
} from "lucide-react";
import { NearContext } from "@/wallets/near";
import { HelloNearContract } from "@/config";
import { useBatch } from "@/components/layout/BatchContext";
import { ResizablePanelLayout } from "@/components/layout/ResizablePanelLayout";

import TaskOperations from "@/components/task/TaskOperations";
import ItemList from "@/components/common/ItemList";
import SortDialog from "@/components/helpers/SortDialog";

import styles from "@/app/styles/features/tasks/Tasks.module.css";
import layoutStyles from "@/app/styles/components/layout/Layout.module.css";
import statusStyles from "@/app/styles/components/status/Status.module.css";
import errorStyles from "@/app/styles/components/status/Error.module.css";
import itemStyles from "@/app/styles/components/layout/ItemLayout.module.css";

export default function TasksPage() {
  const { signedAccountId, wallet } = useContext(NearContext);
  const { pendingChanges, addAction } = useBatch();
  const [tasks, setTasks] = useState([]);
  const [completedTasks, setCompletedTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [loadingList, setLoadingList] = useState(false);
  const [error, setError] = useState(null);
  const [sortType, setSortType] = useState("deadline");
  const [sortOrder, setSortOrder] = useState("asc");
  const processedOverdueTasksRef = useRef(new Set());
  const [showForm, setShowForm] = useState(false);
  const [showHabits, setShowHabits] = useState(true);
  const [showSortDialog, setShowSortDialog] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  const loadTasks = useCallback(async () => {
    if (!wallet || !signedAccountId) return;
    setLoadingList(true);

    try {
      const incompleteResponse = await wallet.viewMethod({
        contractId: HelloNearContract,
        method: "get_incomplete_tasks",
        args: { owner_id: signedAccountId },
      });

      let allTasks = [];
      const tasksProcessedThisRun = new Set();

      if (incompleteResponse.Success) {
        allTasks = incompleteResponse.Success;

        const currentTime = Date.now() * 1000000;
        const overdueTasks = incompleteResponse.Success.filter(
          (task) =>
            task.state !== "Completed" &&
            task.state !== "Overdue" &&
            Number(task.deadline) < currentTime
        );

        overdueTasks.forEach((task) => {
          if (
            !processedOverdueTasksRef.current.has(task.id) &&
            !pendingChanges.overdue.has(task.id) &&
            !tasksProcessedThisRun.has(task.id)
          ) {
            processedOverdueTasksRef.current.add(task.id);
            tasksProcessedThisRun.add(task.id);

            addAction({
              receiverId: HelloNearContract,
              actions: [
                {
                  type: "FunctionCall",
                  params: {
                    methodName: "mark_task_overdue",
                    args: { task_id: task.id },
                  },
                },
              ],
            });
          }
        });
      }

      if (showCompleted) {
        const completedResponse = await wallet.viewMethod({
          contractId: HelloNearContract,
          method: "get_completed_tasks",
          args: { owner_id: signedAccountId },
        });

        if (completedResponse.Success) {
          setCompletedTasks(completedResponse.Success);
        }
      } else {
        setCompletedTasks([]);
      }

      try {
        const habitsResponse = await wallet.viewMethod({
          contractId: HelloNearContract,
          method: "get_habits_by_owner",
          args: { owner_id: signedAccountId },
        });

        if (habitsResponse.Success) {
          const habitsByTaskId = {};
          habitsResponse.Success.forEach((habit) => {
            habitsByTaskId[habit.task_id] = habit;
          });

          allTasks = allTasks.map((task) => {
            const habit = habitsByTaskId[task.id];
            if (habit) {
              return {
                ...task,
                isHabit: true,
                streak: habit.streak,
                habitId: habit.id,
                recurrence: habit.recurrence,
                lastCompleted: habit.last_completed,
                nextDue: habit.last_completed
                  ? Number(habit.last_completed) +
                    (habit.recurrence.interval || 1) * 24 * 60 * 60 * 1000000000
                  : task.deadline,
              };
            }
            return { ...task, isHabit: false };
          });
        }
      } catch (habitError) {
        console.error("Error loading habits:", habitError);
      }

      setTasks(allTasks);
    } catch (error) {
      console.error("Error loading tasks:", error);
      setError("Failed to load tasks");
    } finally {
      setLoadingList(false);
    }
  }, [wallet, signedAccountId, showCompleted, addAction]);

  useEffect(() => {
    if (signedAccountId) {
      loadTasks();
    }
  }, [signedAccountId, loadTasks]);

  const handleTaskSelect = (task) => {
    setSelectedTask(task);
  };

  const handleStartTask = async (task) => {
    if (!window.confirm("Are you sure you want to start this task?")) return;

    setLoadingList(true);
    setError(null);
    try {
      const now = Date.now() * 1000000;

      addAction({
        receiverId: HelloNearContract,
        actions: [
          {
            type: "FunctionCall",
            params: {
              methodName: "start_task",
              args: {
                task_id: task.id,
                scheduled_start_time: now,
              },
            },
          },
        ],
      });
      await loadTasks();
    } catch (error) {
      console.error("Error starting task:", error);
      setError("Failed to start task");

    } finally {
      setLoadingList(false);
    }
  };

  const handleCompleteTask = async (task) => {
    if (
      !window.confirm(
        "Are you sure you want to mark this task as completed? This will also complete all subtasks."
      )
    ) {
      return;
    }

    setLoadingList(true);
    setError(null);

    try {
      addAction({
        receiverId: HelloNearContract,
        actions: [
          {
            type: "FunctionCall",
            params: {
              methodName: "complete_task",
              args: { task_id: task.id },
            },
          },
        ],
      });

      task.subtask_ids?.forEach((subtaskId) => {
        pendingChanges.completions.add(subtaskId);
      });

      await loadTasks();
    } catch (error) {
      console.error("Error completing task:", error);
      setError("Failed to complete task");

    } finally {
      setLoadingList(false);
    }
  };

  const sortTasks = (tasksToSort) => {
    return [...tasksToSort].sort((a, b) => {
      let comparison = 0;

      switch (sortType) {
        case "deadline":
          comparison = Number(a.deadline) - Number(b.deadline);
          break;
        case "estimated_time":
          comparison = a.estimated_time - b.estimated_time;
          break;
        case "reward_points":
          comparison = a.reward_points - b.reward_points;
          break;
        case "priority":
          const priorityOrder = { Low: 0, Medium: 1, High: 2, Critical: 3 };
          comparison = priorityOrder[a.priority] - priorityOrder[b.priority];
          break;
        case "streak":
          comparison = (a.streak || 0) - (b.streak || 0);
          break;
        default:
          comparison = 0;
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });
  };

  const formatRecurrence = (recurrence) => {
    if (!recurrence) return "No recurrence";

    if (recurrence.frequency === "Daily") {
      return "Every day";
    } else if (recurrence.frequency === "Custom") {
      const interval = recurrence.interval;
      const intervalText =
        interval === 7
          ? "Every Week"
          : interval === 14
          ? "Every Two Weeks"
          : interval === 30
          ? "Every Month"
          : `Every ${interval} days`;

      const daysText =
        recurrence.specific_days && recurrence.specific_days.length > 0
          ? `on ${recurrence.specific_days.join(", ")}`
          : "on no specific days";

      return `${intervalText} ${daysText}`;
    }

    return "Unknown recurrence pattern";
  };

  const formatDate = (ns) => {
    if (!ns) return "";
    const date = new Date(Number(ns) / 1000000);
    return date.toLocaleString(undefined, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDuration = (minutes) => {
    if (!minutes) return "";
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hrs}h ${mins}m`;
  };

  const renderTaskPrefix = (task, hasSubtasks, isExpanded, toggleExpanded) => (
    <>
      {hasSubtasks && (
        <button
          className={`${itemStyles.toggleSubItems} ${
            isExpanded ? itemStyles.expanded : ""
          }`}
          onClick={(e) => toggleExpanded(task.id, e)}
        >
          <ChevronRight size={16} />
        </button>
      )}
      
      {task.state !== "Completed" &&
        (task.state === "Created" ? (
          <button
            className="icon-action-button success"
            disabled={pendingChanges.starts.has(task.id)}
            onClick={(e) => {
              e.stopPropagation();
              handleStartTask(task);
            }}
            title="Start task"
          >
            <Play size={16} />
          </button>
        ) : (
          <button
            className="check-button"
            disabled={pendingChanges.completions.has(task.id)}
            onClick={(e) => {
              e.stopPropagation();
              handleCompleteTask(task);
            }}
            title="Mark as completed"
          />
        ))}
    </>
  );

  const renderTaskContent = (task) => (
    <div className={itemStyles.itemInfo}>
      <p className={itemStyles.itemTitle}>
        {task.isHabit && <RepeatIcon size={16} className={styles.habitIcon} />}
        {task.title}
      </p>
    </div>
  );

  const renderTaskBadges = (task) => {
    let statusLabel = task.state;
    let statusClass = `state${task.state}`;
    if (
      task.state === "Created" &&
      task.time_slots &&
      task.time_slots.length > 0
    ) {
      statusLabel = "Scheduled";
      statusClass = "stateCreated";
    }

    return (
      <>
        <span
          className={`${statusStyles.itemState} ${statusStyles[statusClass]}`}
        >
          {statusLabel}
        </span>
        <span
          className={`${statusStyles.badge} ${
            statusStyles[`priority${task.priority}`]
          }`}
        >
          {task.priority}
        </span>
      </>
    );
  };

  const getSubtasks = (task) =>
    task.subtask_ids
      ?.map((id) =>
        [...tasks, ...(showCompleted ? completedTasks : [])].find(
          (t) => t.id === id
        )
      )
      .filter(Boolean);

  const renderLeftPanel = () => (
    <>
      <div className={itemStyles.controlsRow}>
        <button
          className={`control-button ${showCompleted ? "active" : ""}`}
          onClick={() => setShowCompleted(!showCompleted)}
          disabled={loadingList}
          title={showCompleted ? "Hide Completed" : "Show Completed"}
        >
          <CheckSquare size={16} />
        </button>

        <button
          className={`control-button ${showHabits ? "active" : ""}`}
          onClick={() => setShowHabits(!showHabits)}
          disabled={loadingList}
          title={showHabits ? "Hide Habits" : "Show Habits"}
        >
          <RepeatIcon size={16} />
        </button>

        <button
          className="control-button"
          onClick={() => setShowSortDialog(true)}
          title="Sort Tasks"
        >
          <ArrowUpDown size={16} />
        </button>
      </div>

      <button className="action-button" onClick={() => setShowForm(true)}>
        Add Task
      </button>

      {error && (
        <div className={errorStyles.container}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <ItemList
        items={sortTasks(
          tasks
            .concat(showCompleted ? completedTasks : [])
            .filter((task) => showHabits || !task.isHabit)
        )}
        selectedId={selectedTask?.id}
        onSelect={handleTaskSelect}
        pendingChanges={pendingChanges}
        renderBadges={renderTaskBadges}
        renderPrefix={renderTaskPrefix}
        renderContent={renderTaskContent}
        getSubItems={getSubtasks}
        containerClassName={itemStyles.taskContainer}
        itemClassName={itemStyles.itemRow}
        nestedItemClassName={itemStyles.subItemRow}
        subItemsContainerClassName={itemStyles.subItemsContainer}
      />

      <SortDialog
        isOpen={showSortDialog}
        onClose={() => setShowSortDialog(false)}
        sortType={sortType}
        setSortType={setSortType}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
        options={[
          { value: "deadline", label: "Deadline" },
          { value: "estimated_time", label: "Time Estimated" },
          { value: "reward_points", label: "Reward Points" },
          { value: "priority", label: "Priority" },
          { value: "streak", label: "Streak" },
        ]}
      />
    </>
  );

  const renderRightPanel = () =>
    selectedTask && (
      <>
        <div className={itemStyles.selectedItemHeader}>
          <h2 className={itemStyles.selectedItemTitle}>{selectedTask.title}</h2>
          <span
            className={`${statusStyles.itemState} ${
              statusStyles[`state${selectedTask.state}`]
            }`}
          >
            {selectedTask.state}
          </span>
        </div>

        <p className={itemStyles.selectedItemDescription}>
          {selectedTask.description}
        </p>

        <div className={styles.taskInfo}>
          <div className={styles.rewardPoints}>
            <span className={styles.pointsLabel}>
              You will get: {selectedTask.reward_points} Reward Points after
              completion
            </span>
          </div>

          <div className={itemStyles.itemMetadata}>
            <div className={itemStyles.metadataItem}>
              <Calendar size={16} />
              <span>Deadline: {formatDate(selectedTask.deadline)}</span>
            </div>
            <div className={itemStyles.metadataItem}>
              <Clock size={16} />
              <span>
                Estimated time: {formatDuration(selectedTask.estimated_time)}
              </span>
            </div>
            {selectedTask.time_slots && selectedTask.time_slots.length > 0 ? (
              <div className={styles.taskTimeSlots}>
                <h4>Scheduled Time Slots</h4>
                {selectedTask.time_slots.map((slot, index) => (
                  <div key={index} className={styles.taskTimeSlot}>
                    <Calendar size={16} />
                    <span>
                      {formatDate(slot.start_time)} to{" "}
                      {formatDate(slot.end_time)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className={itemStyles.metadataItem}>
                <Calendar size={16} />
                <span>No scheduled times</span>
              </div>
            )}
          </div>
        </div>
        {selectedTask.isHabit && (
          <div className={styles.habitInfo}>
            <h3 className={styles.sectionHeader}>
              <RepeatIcon size={18} />
              <span>Habit Information</span>
            </h3>

            <div className={itemStyles.metadataItem}>
              <div className={styles.streakCounter}>
                <span className={styles.streakValue}>
                  {selectedTask.streak || 0}
                </span>
                <span className={styles.streakLabel}>Day Streak</span>
              </div>
            </div>

            <div className={itemStyles.metadataItem}>
              <Calendar size={16} />
              <span>Next due: {formatDate(selectedTask.nextDue)}</span>
            </div>

            <div className={styles.recurrenceInfo}>
              <Clock size={16} />
              <span>{formatRecurrence(selectedTask.recurrence)}</span>
            </div>
          </div>
        )}

        <TaskOperations
          task={selectedTask}
          onUpdate={async () => {
            await loadTasks();
            const updatedTasks = await wallet.viewMethod({
              contractId: HelloNearContract,
              method: "get_incomplete_tasks",
              args: { owner_id: signedAccountId },
            });
            if (updatedTasks.Success) {
              const updatedTask = updatedTasks.Success.find(
                (t) => t.id === selectedTask.id
              );
              if (updatedTask) {
                setSelectedTask(updatedTask);
              }
            }
          }}
          onDelete={async (taskId) => {
            setSelectedTask(null);
            await loadTasks();
          }}
          onStart={handleStartTask}
          onComplete={handleCompleteTask}
        />
      </>
    );

  if (!signedAccountId) {
    return (
      <div className={layoutStyles.pageContainer}>
        <p>Please login to manage tasks</p>
      </div>
    );
  }

  return (
    <>
      <ResizablePanelLayout
        leftPanel={renderLeftPanel()}
        rightPanel={renderRightPanel()}
        minLeftWidth={300}
        maxLeftWidth={1000}
        minRightWidth={400}
      />

      {showForm && (
        <TaskOperations
          showAddForm={showForm}
          onCloseForm={() => setShowForm(false)}
          onUpdate={async () => {
            await loadTasks();
            setShowForm(false);
          }}
        />
      )}
    </>
  );
}
