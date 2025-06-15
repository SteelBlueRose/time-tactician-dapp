import { useMemo } from "react";
import tabuSearchScheduler from "@/utils/tabu_search_scheduler";

export function useSmartScheduler() {
  const scheduler = useMemo(() => tabuSearchScheduler, []);

  const formatTasksForScheduler = (tasks, timeSlots, options = {}) => {
    const formattedTasks = tasks.map((task) => ({
      id: task.id,
      title: task.title,
      duration: task.estimated_time,
      deadline: Number(task.deadline),
      priority: task.priority,
      scheduled_start_time: task.scheduled_start_time || null,
      scheduled_end_time: task.scheduled_end_time || null,
    }));

    let existingSchedule = [];
    if (!options.includeScheduledTasks) {
      const alreadyScheduledTasks = tasks.filter(
        (task) => task.time_slots && task.time_slots.length > 0
      );

      existingSchedule = alreadyScheduledTasks.flatMap((task) =>
        task.time_slots.map((slot) => ({
          start_time: Number(slot.start_time) / 1000000,
          end_time: Number(slot.end_time) / 1000000,
          task_id: task.id,
        }))
      );
    }

    const formattedTimeSlots = {
      workingHours: timeSlots
        .filter((slot) => slot.slot_type === "WorkingHours")
        .map((slot) => ({
          start_minutes: slot.start_minutes,
          duration: slot.duration,
          recurrence: slot.recurrence,
          slot_type: "WorkingHours",
        })),

      breaks: timeSlots
        .filter((slot) => slot.slot_type === "Break")
        .map((slot) => ({
          start_minutes: slot.start_minutes,
          duration: slot.duration,
          recurrence: slot.recurrence,
          slot_type: "Break",
        })),
    };

    const scenario = {
      tasks: formattedTasks,
      timeSlots: formattedTimeSlots,
      existingSchedule: existingSchedule,
    };

    return scenario;
  };

  const runScheduler = (tasks, timeSlots, options = {}) => {
    const scenario = formatTasksForScheduler(tasks, timeSlots, options);
    if (
      scenario.tasks.length === 0 ||
      !scenario.timeSlots.workingHours.length
    ) {
      return null;
    }

    const schedulerOptions = {
      includeScheduledTasks: options.includeScheduledTasks || false,
      coefficients: options.coefficients,
    };

    return scheduler(scenario, schedulerOptions);
  };

  return { runScheduler };
}
