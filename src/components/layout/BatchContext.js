import React, { createContext, useState, useContext, useEffect } from "react";

export const BatchContext = createContext();

export const BatchProvider = ({ children }) => {
  const [batchActions, setBatchActions] = useState([]);
  const [pendingChanges, setPendingChanges] = useState({
    deletions: new Set(),
    updates: new Map(),
    completions: new Set(),
    starts: new Set(),
    overdue: new Set(),
  });

  useEffect(() => {
    const deletions = new Set();
    const updates = new Map();
    const completions = new Set();
    const starts = new Set();
    const overdue = new Set();

    batchActions.forEach((action) => {
      const { methodName, args } = action.actions[0].params;
      switch (methodName) {
        case "delete_task":
          deletions.add(args.task_id);
          break;
        case "update_task":
          updates.set(args.task_id, args);
          break;
        case "mark_task_overdue":
          overdue.add(args.task_id);
          break;
        case "complete_task":
          completions.add(args.task_id);
          break;
        case "start_task":
          starts.add(args.task_id);
          break;
        case "delete_reward":
          deletions.add(args.reward_id);
          break;
        case "update_reward":
          updates.set(args.reward_id, args);
          break;
        case "redeem_reward":
          completions.add(args.reward_id);
          break;
        case "delete_time_slot":
          deletions.add(args.slot_id);
          break;
        case "update_time_slot":
          updates.set(args.slot_id, args);
          break;
      }
    });

    setPendingChanges({
      deletions,
      updates,
      completions,
      starts,
      overdue,
    });
  }, [batchActions]);

  const addAction = (action) => {
    setBatchActions((prev) => [...prev, action]);
    const { methodName, args } = action.actions[0].params;
    switch (methodName) {
      case "delete_task":
        setPendingChanges((prev) => ({
          ...prev,
          deletions: new Set([...prev.deletions, args.task_id]),
        }));
        break;
      case "update_task":
        setPendingChanges((prev) => ({
          ...prev,
          updates: new Map(prev.updates.set(args.task_id, args)),
        }));
        break;
      case "mark_task_overdue":
        setPendingChanges((prev) => ({
          ...prev,
          overdue: new Set([...prev.overdue, args.task_id]),
        }));
        break;
      case "complete_task":
        setPendingChanges((prev) => ({
          ...prev,
          completions: new Set([...prev.completions, args.task_id]),
        }));
        break;
      case "start_task":
        setPendingChanges((prev) => ({
          ...prev,
          starts: new Set([...prev.starts, args.task_id]),
        }));
        break;
      case "delete_reward":
        setPendingChanges((prev) => ({
          ...prev,
          deletions: new Set([...prev.deletions, args.reward_id]),
        }));
        break;
      case "update_reward":
        setPendingChanges((prev) => ({
          ...prev,
          updates: new Map(prev.updates.set(args.reward_id, args)),
        }));
        break;
      case "redeem_reward":
        setPendingChanges((prev) => ({
          ...prev,
          completions: new Set([...prev.completions, args.reward_id]),
        }));
        break;
      case "delete_time_slot":
        setPendingChanges((prev) => ({
          ...prev,
          deletions: new Set([...prev.deletions, args.slot_id]),
        }));
        break;
      case "update_time_slot":
        setPendingChanges((prev) => ({
          ...prev,
          updates: new Map(prev.updates.set(args.slot_id, args)),
        }));
        break;
    }
  };

  const clearActions = () => {
    setBatchActions([]);
    setPendingChanges({
      deletions: new Set(),
      updates: new Map(),
      completions: new Set(),
      starts: new Set(),
      overdue: new Set(),
    });
  };

  return (
    <BatchContext.Provider
      value={{
        batchActions,
        addAction,
        clearActions,
        pendingChanges,
      }}
    >
      {children}
    </BatchContext.Provider>
  );
};

export const useBatch = () => {
  const context = useContext(BatchContext);
  if (!context) {
    throw new Error("useBatch must be used within a BatchProvider");
  }
  
  return context;
};
