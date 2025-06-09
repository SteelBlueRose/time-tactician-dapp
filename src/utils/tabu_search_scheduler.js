function tabuSearchScheduler(scenario, options = {}) {
  const config = {
    time: {
      useCustomDateTime: false,
      customDateTime: "2025-05-01T08:30:00",
    },
    initialSchedule: {
      useGreedySorting: true,
      timeBufferMinutes: 5,
      roundToMinutes: 5,
    },
    priorityValues: {
      Critical: 4,
      High: 3,
      Medium: 2,
      Low: 1,
    },
    defaultCoefficients: {
      alpha: 0.3, // Фрагментація (30% ваги)
      beta: 0.3, // Пріоритет-час (30% ваги)
      gamma: 0.1, // Часовий діапазон (10% ваги)
      delta: 0.1, // Дедлайни (10% ваги)
      epsilon: 0.1, // Розриви (10% ваги)
    },
  };

  const DAYS_OF_WEEK = {
    Sunday: 0,
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
  };

  const TIME_CONSTANTS = {
    MILLISECONDS_PER_MINUTE: 60 * 1000,
    MILLISECONDS_PER_HOUR: 60 * 60 * 1000,
    FIVE_MINUTES_MS: 5 * 60 * 1000,
  };

  const utils = {
    time: {
      ...TIME_CONSTANTS,

      getCurrentDate() {
        if (config.time && config.time.useCustomDateTime) {
          return new Date(config.time.customDateTime);
        }
        return new Date();
      },

      getCurrentTime() {
        if (config.time && config.time.useCustomDateTime) {
          return new Date(config.time.customDateTime).getTime();
        }
        return Date.now();
      },

      getDurationMinutes(startTime, endTime) {
        return (endTime - startTime) / TIME_CONSTANTS.MILLISECONDS_PER_MINUTE;
      },

      getDurationHours(startTime, endTime) {
        return (endTime - startTime) / TIME_CONSTANTS.MILLISECONDS_PER_HOUR;
      },

      minutesToMillis(minutes) {
        return minutes * TIME_CONSTANTS.MILLISECONDS_PER_MINUTE;
      },

      roundToFiveMinutes(timestamp, roundUp = false) {
        if (roundUp) {
          return (
            Math.ceil(timestamp / TIME_CONSTANTS.FIVE_MINUTES_MS) *
            TIME_CONSTANTS.FIVE_MINUTES_MS
          );
        }
        return (
          Math.floor(timestamp / TIME_CONSTANTS.FIVE_MINUTES_MS) *
          TIME_CONSTANTS.FIVE_MINUTES_MS
        );
      },
    },
  };

  function updateTaskTimes(task) {
    if (!task.segments || task.segments.length === 0) {
      task.scheduled_start_time = null;
      task.scheduled_end_time = null;
      return;
    }
    task.segments.sort((a, b) => a.start - b.start);
    task.scheduled_start_time = task.segments[0].start;
    task.scheduled_end_time = task.segments[task.segments.length - 1].end;
  }

  function expandRecurringTimeSlots(recurringSlots, startTime, endTime) {
    const expandedSlots = [];
    if (!recurringSlots || recurringSlots.length === 0) {
      return expandedSlots;
    }
    for (const slot of recurringSlots) {
      const searchStartDate = new Date(startTime);
      const searchEndDate = new Date(endTime);
      const daysDiff = Math.ceil(
        (searchEndDate - searchStartDate) / (24 * 60 * 60 * 1000)
      );

      for (let dayOffset = 0; dayOffset < daysDiff + 1; dayOffset++) {
        const targetDate = new Date(searchStartDate);
        targetDate.setDate(searchStartDate.getDate() + dayOffset);
        const dayOfWeek = targetDate.getDay();
        const dayName = Object.keys(DAYS_OF_WEEK).find(
          (key) => DAYS_OF_WEEK[key] === dayOfWeek
        );
        let isDayIncluded = false;
        if (slot.recurrence) {
          if (slot.recurrence.frequency === "Daily") {
            isDayIncluded = true;
          } else if (
            slot.recurrence.specific_days &&
            slot.recurrence.specific_days.includes(dayName)
          ) {
            isDayIncluded = true;
          }
        }

        if (isDayIncluded) {
          const slotStart = new Date(targetDate);
          slotStart.setHours(Math.floor(slot.start_minutes / 60));
          slotStart.setMinutes(slot.start_minutes % 60);
          slotStart.setSeconds(0);
          slotStart.setMilliseconds(0);
          const slotEnd = new Date(slotStart);
          slotEnd.setMinutes(slotStart.getMinutes() + slot.duration);
          const slotStartTime = slotStart.getTime();
          const slotEndTime = slotEnd.getTime();
          if (slotEndTime > startTime && slotStartTime < endTime) {
            const adjustedStart = Math.max(slotStartTime, startTime);
            const adjustedEnd = Math.min(slotEndTime, endTime);
            expandedSlots.push({
              start: adjustedStart,
              end: adjustedEnd,
            });
          }
        }
      }
    }
    return expandedSlots;
  }

  function removeOverlappingTimes(baseSlots, overlappingSlots) {
    if (!baseSlots || baseSlots.length === 0) {
      return [];
    }

    if (!overlappingSlots || overlappingSlots.length === 0) {
      return [...baseSlots];
    }

    let result = JSON.parse(JSON.stringify(baseSlots));

    for (const overlap of overlappingSlots) {
      if (!overlap.start || !overlap.end || overlap.start >= overlap.end) {
        continue;
      }
      const newResult = [];
      for (const slot of result) {
        if (slot.end <= overlap.start || slot.start >= overlap.end) {
          newResult.push(slot);
          continue;
        }
        if (slot.start < overlap.start) {
          newResult.push({
            start: slot.start,
            end: overlap.start,
          });
        }
        if (slot.end > overlap.end) {
          newResult.push({
            start: overlap.end,
            end: slot.end,
          });
        }
      }
      result = newResult;
    }

    const minDuration = utils.time.minutesToMillis(5);
    return result.filter((slot) => slot.end - slot.start >= minDuration);
  }

  function findAvailableTimeSlots(
    durationMinutes,
    searchStartTime,
    searchEndTime,
    timeSlots,
    existingSchedule = []
  ) {
    if (
      !timeSlots ||
      !timeSlots.workingHours ||
      timeSlots.workingHours.length === 0
    ) {
      return [];
    }

    const durationMs = utils.time.minutesToMillis(durationMinutes);
    const currentDate = utils.time.getCurrentDate();
    const roundedCurrentTime = utils.time.roundToFiveMinutes(
      currentDate.getTime(),
      true
    );
    const effectiveSearchStart = Math.max(searchStartTime, roundedCurrentTime);
    const workingTimeSlots = expandRecurringTimeSlots(
      timeSlots.workingHours,
      effectiveSearchStart,
      searchEndTime
    );

    if (workingTimeSlots.length === 0) {
      return [];
    }

    const breakTimeSlots = expandRecurringTimeSlots(
      timeSlots.breaks || [],
      effectiveSearchStart,
      searchEndTime
    );

    const existingTaskSlots = existingSchedule.map((task) => ({
      start:
        typeof task.start_time === "number" ? task.start_time : task.start_time,
      end: typeof task.end_time === "number" ? task.end_time : task.end_time,
    }));

    let availableSlots = removeOverlappingTimes(workingTimeSlots, [
      ...breakTimeSlots,
      ...existingTaskSlots,
    ]);

    availableSlots = availableSlots.filter(
      (slot) => slot.end - slot.start >= durationMs
    );

    return availableSlots.sort((a, b) => a.start - b.start);
  }

  function calculateSearchEndTime(
    tasks,
    timeSlots,
    existingSchedule,
    startTime
  ) {
    const totalTaskDuration = tasks.reduce((sum, task) => {
      if (!task.segments || task.segments.length === 0 || task.isPartial) {
        const scheduledDuration = task.segments
          ? task.segments.reduce(
              (total, segment) => total + segment.duration,
              0
            )
          : 0;
        return sum + (task.duration - scheduledDuration);
      }
      return sum;
    }, 0);

    const totalTaskDurationMs = utils.time.minutesToMillis(totalTaskDuration);

    let totalAvailableTimeMs = 0;
    let daysChecked = 0;
    let searchEndTime = startTime;

    const startDate = new Date(startTime);
    startDate.setHours(0, 0, 0, 0);

    while (totalAvailableTimeMs < totalTaskDurationMs && daysChecked < 14) {
      const dayDate = new Date(startDate);
      dayDate.setDate(startDate.getDate() + daysChecked);
      const dayStart = dayDate.getTime();
      const dayEnd = new Date(dayDate).setHours(23, 59, 59, 999);
      const daySearchStart = daysChecked === 0 ? startTime : dayStart;
      const availableSlots = findAvailableTimeSlots(
        0,
        daySearchStart,
        dayEnd,
        timeSlots,
        existingSchedule
      );
      const dayAvailableTime = availableSlots.reduce(
        (sum, slot) => sum + (slot.end - slot.start),
        0
      );
      totalAvailableTimeMs += dayAvailableTime;
      searchEndTime = dayEnd;
      daysChecked++;
    }
    return searchEndTime;
  }

  function rescheduleTasksSequentially(schedule, taskOrder, options = {}) {
    const newSchedule = JSON.parse(JSON.stringify(schedule));
    const tasks = newSchedule.tasks;
    const startTime = utils.time.getCurrentTime();
    const endTime = startTime + 30 * 24 * 60 * 60 * 1000;

    const expandedBreaks = expandRecurringTimeSlots(
      newSchedule.timeSlots.breaks || [],
      startTime,
      endTime
    );

    const expandedWorkingHours = expandRecurringTimeSlots(
      newSchedule.timeSlots.workingHours,
      startTime,
      endTime
    );

    expandedWorkingHours.sort((a, b) => a.start - b.start);
    expandedBreaks.sort((a, b) => a.start - b.start);
    const blockedTimes = [...expandedBreaks];

    if (options.immovableTasks && options.immovableTasks.length > 0) {
      blockedTimes.push(
        ...options.immovableTasks.map((task) => ({
          start: task.start_time || task.scheduled_start_time,
          end: task.end_time || task.scheduled_end_time,
        }))
      );
      blockedTimes.sort((a, b) => a.start - b.start);
    }

    const startOfDay = new Date(startTime);
    startOfDay.setHours(9, 0, 0, 0);

    let currentEndTime = startOfDay.getTime();

    for (const taskIndex of taskOrder) {
      const task = tasks[taskIndex];
      if (!task) continue;

      if (
        options.immovableTasks &&
        options.immovableTasks.some((immovable) => immovable.id === task.id)
      ) {
        continue;
      }

      let remainingDuration = task.duration;
      const newSegments = [];
      let segmentStart = currentEndTime;

      while (remainingDuration > 0) {
        const breakOverlap = blockedTimes.find(
          (block) => segmentStart >= block.start && segmentStart < block.end
        );

        if (breakOverlap) {
          segmentStart = breakOverlap.end;
          continue;
        }

        let workingSlot = expandedWorkingHours.find(
          (slot) => segmentStart >= slot.start && segmentStart < slot.end
        );

        if (!workingSlot) {
          workingSlot = expandedWorkingHours.find(
            (slot) => slot.start > segmentStart
          );
          if (!workingSlot) {
            task.isPartial = true;
            break;
          }
          segmentStart = workingSlot.start;
        }

        const nextBreak = blockedTimes.find(
          (block) => block.start > segmentStart && block.start < workingSlot.end
        );

        const segmentEndTime = nextBreak ? nextBreak.start : workingSlot.end;
        const availableDuration = utils.time.getDurationMinutes(
          segmentStart,
          segmentEndTime
        );
        
        const segmentDuration = Math.min(remainingDuration, availableDuration);
        if (segmentDuration <= 0) {
          segmentStart = workingSlot.end;
          continue;
        }

        const segment = {
          start: segmentStart,
          end: segmentStart + utils.time.minutesToMillis(segmentDuration),
          duration: segmentDuration,
        };

        newSegments.push(segment);
        remainingDuration -= segmentDuration;
        segmentStart = segment.end;

        if (segmentStart >= workingSlot.end) {
          const nextWorkingSlot = expandedWorkingHours.find(
            (slot) => slot.start > segmentStart
          );
          if (nextWorkingSlot) {
            segmentStart = nextWorkingSlot.start;
          } else {
            task.isPartial = true;
            break;
          }
        }
      }

      task.segments = newSegments;
      task.isPartial = remainingDuration > 0;
      updateTaskTimes(task);
      if (task.scheduled_end_time) {
        currentEndTime = task.scheduled_end_time;
      }
    }
    return newSchedule;
  }

  function validateSchedule(schedule) {
    const tasksByTime = {};
    let valid = true;
    for (const task of schedule.tasks) {
      if (!task.segments) continue;
      for (const segment of task.segments) {
        for (let t = segment.start; t < segment.end; t += 60000) {
          const timeKey = Math.floor(t / 60000);
          if (tasksByTime[timeKey]) {
            valid = false;
          }
          tasksByTime[timeKey] = task.id;
        }
      }
    }
    return valid;
  }

  function generateInitialSchedule(scenario, options = {}) {
    const { tasks, timeSlots } = scenario;
    const schedulingOptions = {
      useGreedySorting: config.initialSchedule.useGreedySorting,
      timeBufferMinutes: config.initialSchedule.timeBufferMinutes,
      existingSchedule: options.existingSchedule || [],
      ...options,
    };

    let tasksToSchedule = [...tasks];
    if (schedulingOptions.useGreedySorting) {
      tasksToSchedule.sort((a, b) => {
        const priorityA = config.priorityValues[a.priority] || 0;
        const priorityB = config.priorityValues[b.priority] || 0;
        const priorityDiff = priorityB - priorityA;
        if (priorityDiff !== 0) return priorityDiff;
        return a.deadline - b.deadline;
      });
    }

    const startTime = utils.time.getCurrentTime();
    const bufferTime = utils.time.roundToFiveMinutes(
      startTime +
        utils.time.minutesToMillis(schedulingOptions.timeBufferMinutes),
      true
    );

    const endTime = calculateSearchEndTime(
      tasks,
      timeSlots,
      schedulingOptions.existingSchedule,
      bufferTime
    );

    const schedule = {
      tasks: [],
      timeSlots: timeSlots,
      existingSchedule: schedulingOptions.existingSchedule,
      metadata: {
        generatedAt: new Date().toISOString(),
        schedulingOptions: schedulingOptions,
      },
    };

    let availableSlots = findAvailableTimeSlots(
      5,
      bufferTime,
      endTime,
      timeSlots,
      schedulingOptions.existingSchedule
    );

    let scheduledSegments = [];

    for (const task of tasksToSchedule) {
      const scheduledTask = { ...task, segments: [] };
      let remainingMinutes = task.duration;

      const currentAvailableSlots = removeOverlappingTimes(
        JSON.parse(JSON.stringify(availableSlots)),
        scheduledSegments
      );

      currentAvailableSlots.sort((a, b) => a.start - b.start);

      for (
        let i = 0;
        i < currentAvailableSlots.length && remainingMinutes > 0;
        i++
      ) {
        const slot = currentAvailableSlots[i];
        if (slot.end <= bufferTime) continue;

        const slotDuration = utils.time.getDurationMinutes(
          slot.start,
          slot.end
        );

        if (slotDuration <= 0) continue;

        const minutesToAssign = Math.min(remainingMinutes, slotDuration);
        const segmentEnd =
          slot.start + utils.time.minutesToMillis(minutesToAssign);
        const newSegment = {
          start: slot.start,
          end: segmentEnd,
          duration: minutesToAssign,
        };

        scheduledTask.segments.push(newSegment);
        scheduledSegments.push(newSegment);
        remainingMinutes -= minutesToAssign;
      }

      if (scheduledTask.segments.length > 0) {
        updateTaskTimes(scheduledTask);
        scheduledTask.isPartial = remainingMinutes > 0;
        schedule.tasks.push(scheduledTask);
      }
    }

    return schedule;
  }

  function calculateNormalizationFactors(schedule) {
    const tasks = schedule.tasks;
    const totalDuration = tasks.reduce((sum, task) => sum + task.duration, 0);
    const minSegmentDuration = 5;

    // N1: Максимальна фрагментація
    const maxFragmentation = tasks.reduce((sum, task) => {
      const maxSegments = Math.ceil(task.duration / minSegmentDuration);
      return sum + Math.max(0, maxSegments - 1);
    }, 0);

    // N2: Максимальна пріоритет-час затримка
    const maxPriorityTime = tasks.reduce((sum, task) => {
      const priorityValue = config.priorityValues[task.priority] || 0;
      return sum + priorityValue * totalDuration;
    }, 0);

    // N3: Максимальний часовий діапазон
    const workingHoursPerDay = calculateDailyWorkingHours(schedule.timeSlots);
    const maxDays = Math.ceil(totalDuration / workingHoursPerDay);
    const maxTimeSpan = maxDays * 24 * 60; // 24 години в хвилинах

    // N4: Максимальне прострочення дедлайнів
    let maxDeadlineExceed = 0;
    if (tasks.length > 0) {
      const deadlines = tasks
        .map((task) => Number(task.deadline))
        .filter((d) => d > 0);
      if (deadlines.length > 0) {
        const minDeadline = Math.min(...deadlines);
        const maxDeadline = Math.max(...deadlines);
        maxDeadlineExceed =
          ((maxDeadline - minDeadline) / 60000) * tasks.length; // у хв
      }
    }
    // Fallback якщо всі дедлайни однакові або відсутні
    if (maxDeadlineExceed === 0) {
      maxDeadlineExceed = totalDuration * 2;
    }

    // N5: Максимальні розриви
    const maxGaps = totalDuration;

    return {
      fragmentationFactor: maxFragmentation || 1,
      priorityTimeFactor: maxPriorityTime || 1,
      timeSpanFactor: maxTimeSpan || 1,
      deadlineExceedFactor: maxDeadlineExceed || 1,
      gapsFactor: maxGaps || 1,
    };
  }

  function calculateDailyWorkingHours(timeSlots) {
    return timeSlots.workingHours.reduce((total, slot) => {
      const effectiveDuration =
        slot.recurrence?.frequency === "Daily"
          ? slot.duration
          : (slot.duration * (slot.recurrence?.specific_days?.length || 7)) / 7;
      return total + effectiveDuration;
    }, 0);
  }

  function evaluateSchedule(schedule, coefficients) {
    if (!schedule || !schedule.tasks) {
      return Infinity;
    }
    const { alpha, beta, gamma, delta, epsilon } = coefficients;
    const normFactors = calculateNormalizationFactors(schedule);

    let scheduleStart = Infinity;

    schedule.tasks.forEach((task) => {
      if (
        task.scheduled_start_time &&
        task.scheduled_start_time < scheduleStart
      ) {
        scheduleStart = task.scheduled_start_time;
      }
    });
    if (scheduleStart === Infinity) {
      scheduleStart = utils.time.getCurrentTime();
    }

    const fragmentationPenalty =
      schedule.tasks.reduce((sum, task) => {
        return (
          sum + (task.segments ? Math.max(0, task.segments.length - 1) : 0)
        );
      }, 0) / normFactors.fragmentationFactor;

    const priorityTimePenalty =
      schedule.tasks.reduce((sum, task) => {
        if (!task.scheduled_end_time) return sum;

        const actualCompletionTime = Math.floor(
          (task.scheduled_end_time - scheduleStart) / 60000
        );

        const minPossibleCompletionTime = task.duration;

        const unnecessaryDelay = Math.max(
          0,
          actualCompletionTime - minPossibleCompletionTime
        );

        const priorityValue = config.priorityValues[task.priority] || 0;

        return sum + priorityValue * unnecessaryDelay;
      }, 0) / normFactors.priorityTimeFactor;

    let earliestStart = Infinity;
    let latestEnd = 0;
    schedule.tasks.forEach((task) => {
      if (
        task.scheduled_start_time &&
        task.scheduled_start_time < earliestStart
      ) {
        earliestStart = task.scheduled_start_time;
      }
      if (task.scheduled_end_time && task.scheduled_end_time > latestEnd) {
        latestEnd = task.scheduled_end_time;
      }
    });

    const timeSpanPenalty =
      earliestStart < Infinity
        ? Math.floor((latestEnd - earliestStart) / 60000) /
          normFactors.timeSpanFactor
        : 0;

    const deadlinePenalty =
      schedule.tasks.reduce((sum, task) => {
        if (!task.scheduled_end_time) return sum;
        const minutesPastDeadline = Math.max(
          0,
          Math.floor((task.scheduled_end_time - task.deadline) / 60000)
        );
        return sum + minutesPastDeadline;
      }, 0) / normFactors.deadlineExceedFactor;

    const gapsPenalty =
      schedule.tasks.reduce((sum, task) => {
        if (!task.segments || task.segments.length <= 1) return sum;
        const sortedSegments = [...task.segments].sort(
          (a, b) => a.start - b.start
        );

        let gapSum = 0;

        for (let i = 0; i < sortedSegments.length - 1; i++) {
          const gapMinutes = Math.floor(
            (sortedSegments[i + 1].start - sortedSegments[i].end) / 60000
          );
          gapSum += gapMinutes;
        }
        return sum + gapSum;
      }, 0) / normFactors.gapsFactor;

    return (
      10 * alpha * fragmentationPenalty +
      10 * beta * priorityTimePenalty +
      10 * gamma * timeSpanPenalty +
      10 * delta * deadlinePenalty +
      10 * epsilon * gapsPenalty
    );
  }

  function fastClone(obj) {
    if (obj === null || typeof obj !== "object") {
      return obj;
    }
    if (Array.isArray(obj)) {
      const copy = [];
      for (let i = 0; i < obj.length; i++) {
        copy[i] = fastClone(obj[i]);
      }
      return copy;
    }
    const copy = {};
    const keys = Object.keys(obj);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      copy[key] = fastClone(obj[key]);
    }
    return copy;
  }

  function selectiveClone(schedule, taskIndices) {
    const newSchedule = { ...schedule };
    newSchedule.tasks = [...schedule.tasks];
    if (taskIndices && taskIndices.length > 0) {
      for (const index of taskIndices) {
        if (index >= 0 && index < newSchedule.tasks.length) {
          newSchedule.tasks[index] = fastClone(schedule.tasks[index]);
        }
      }
    }
    return newSchedule;
  }

  function generateNeighborhood(currentSchedule) {
    const taskCount = currentSchedule.tasks.length;
    const moves = [];
    for (let i = 0; i < taskCount - 1; i++) {
      const maxJ = Math.min(i + 3, taskCount - 1);
      for (let j = i + 1; j <= maxJ; j++) {
        moves.push([0, i, j]);
      }
    }
    return moves;
  }

  function createMoveKey(move, currentObjective, taskCount) {
    return (
      move[0] * 1000000 +
      (move[1] * taskCount + move[2]) * 1000 +
      Math.floor(currentObjective % 1000)
    );
  }

  function precomputeExpandedTimeSlots(timeSlots, startTime, searchEndTime) {
    const expandedBreaks = expandRecurringTimeSlots(
      timeSlots.breaks || [],
      startTime,
      searchEndTime
    );

    const expandedWorkingHours = expandRecurringTimeSlots(
      timeSlots.workingHours,
      startTime,
      searchEndTime
    );

    expandedWorkingHours.sort((a, b) => a.start - b.start);
    expandedBreaks.sort((a, b) => a.start - b.start);
    return {
      expandedWorkingHours,
      expandedBreaks,
    };
  }

  function calculateTaskObjectiveContribution(
    task,
    schedule,
    coefficients,
    workDayStartTime,
    normFactors
  ) {
    const { alpha, beta, delta, epsilon } = coefficients;
    let contribution = 0;
    if (task.segments) {
      contribution +=
        (alpha * Math.max(0, task.segments.length - 1)) /
        normFactors.fragmentationFactor;
    }

    if (task.scheduled_start_time) {
      const minutesFromStart = Math.floor(
        (task.scheduled_start_time - workDayStartTime) / 60000
      );
      const priorityValue = config.priorityValues[task.priority] || 0;
      contribution +=
        (beta * priorityValue * minutesFromStart) /
        normFactors.priorityTimeFactor;
    }

    if (task.scheduled_end_time) {
      const minutesPastDeadline = Math.max(
        0,
        Math.floor((task.scheduled_end_time - task.deadline) / 60000)
      );
      contribution +=
        (delta * minutesPastDeadline) / normFactors.deadlineExceedFactor;
    }

    if (task.segments && task.segments.length > 1) {
      const sortedSegments = [...task.segments].sort(
        (a, b) => a.start - b.start
      );
      let gapSum = 0;
      for (let i = 0; i < sortedSegments.length - 1; i++) {
        const gapMinutes = Math.floor(
          (sortedSegments[i + 1].start - sortedSegments[i].end) / 60000
        );
        gapSum += gapMinutes;
      }
      contribution += (epsilon * gapSum) / normFactors.gapsFactor;
    }

    return contribution;
  }

  function calculateTimeSpanContribution(
    tasks,
    taskIndices,
    coefficients,
    normFactors
  ) {
    let earliestStart = Infinity;
    let latestEnd = 0;
    for (const idx of taskIndices) {
      const task = tasks[idx];
      if (
        task.scheduled_start_time &&
        task.scheduled_start_time < earliestStart
      ) {
        earliestStart = task.scheduled_start_time;
      }
      if (task.scheduled_end_time && task.scheduled_end_time > latestEnd) {
        latestEnd = task.scheduled_end_time;
      }
    }
    const timeSpanPenalty =
      earliestStart < Infinity
        ? Math.floor((latestEnd - earliestStart) / 60000)
        : 0;
    return (coefficients.gamma * timeSpanPenalty) / normFactors.timeSpanFactor;
  }

  function calculateIncrementalObjective(
    originalSchedule,
    newSchedule,
    affectedTaskIndices,
    currentObjective,
    coefficients
  ) {
    const normFactors = calculateNormalizationFactors(originalSchedule);
    const workDayStart = new Date(utils.time.getCurrentTime());
    workDayStart.setHours(9, 0, 0, 0);
    const workDayStartTime = workDayStart.getTime();
    let originalContribution = 0;

    for (const idx of affectedTaskIndices) {
      originalContribution += calculateTaskObjectiveContribution(
        originalSchedule.tasks[idx],
        originalSchedule,
        coefficients,
        workDayStartTime,
        normFactors
      );
    }

    originalContribution += calculateTimeSpanContribution(
      originalSchedule.tasks,
      affectedTaskIndices,
      coefficients,
      normFactors
    );

    let newContribution = 0;
    for (const idx of affectedTaskIndices) {
      newContribution += calculateTaskObjectiveContribution(
        newSchedule.tasks[idx],
        newSchedule,
        coefficients,
        workDayStartTime,
        normFactors
      );
    }

    newContribution += calculateTimeSpanContribution(
      newSchedule.tasks,
      affectedTaskIndices,
      coefficients,
      normFactors
    );
    const contributionDifference = newContribution - originalContribution;
    return currentObjective + contributionDifference;
  }

  function rescheduleTaskRange(schedule, affectedRange, cachedTimeSlots) {
    if (!affectedRange || !affectedRange.length) {
      return schedule;
    }

    const newSchedule = selectiveClone(schedule, affectedRange);
    const tasks = newSchedule.tasks;
    const startIdx = Math.min(...affectedRange);

    let startTime;

    if (startIdx > 0 && tasks[startIdx - 1].scheduled_end_time) {
      startTime = tasks[startIdx - 1].scheduled_end_time;
    } else {
      startTime = utils.time.getCurrentTime();
    }

    const expandedWorkingHours = cachedTimeSlots.expandedWorkingHours;
    const expandedBreaks = cachedTimeSlots.expandedBreaks;
    const blockedTimes = [...expandedBreaks];

    for (let i = 0; i < tasks.length; i++) {
      if (
        !affectedRange.includes(i) &&
        tasks[i].segments &&
        tasks[i].segments.length > 0
      ) {
        tasks[i].segments.forEach((segment) => {
          blockedTimes.push({
            start: segment.start,
            end: segment.end,
            isImmovableTask: true,
          });
        });
      }
    }

    blockedTimes.sort((a, b) => a.start - b.start);

    let currentEndTime = startTime;

    for (const taskIndex of affectedRange) {
      const task = tasks[taskIndex];
      let remainingDuration = task.duration;
      const newSegments = [];
      let segmentStart = currentEndTime;

      while (remainingDuration > 0) {
        const blockOverlap = blockedTimes.find(
          (block) => segmentStart >= block.start && segmentStart < block.end
        );

        if (blockOverlap) {
          segmentStart = blockOverlap.end;
          continue;
        }

        let workingSlot = expandedWorkingHours.find(
          (slot) => segmentStart >= slot.start && segmentStart < slot.end
        );

        if (!workingSlot) {
          workingSlot = expandedWorkingHours.find(
            (slot) => slot.start > segmentStart
          );
          if (!workingSlot) {
            task.isPartial = true;
            break;
          }
          segmentStart = workingSlot.start;
        }

        const nextBlock = blockedTimes.find(
          (block) => block.start > segmentStart && block.start < workingSlot.end
        );

        const segmentEndTime = nextBlock ? nextBlock.start : workingSlot.end;
        const availableDuration = utils.time.getDurationMinutes(
          segmentStart,
          segmentEndTime
        );

        const segmentDuration = Math.min(remainingDuration, availableDuration);
        if (segmentDuration <= 0) {
          segmentStart = workingSlot.end;
          continue;
        }

        const segment = {
          start: segmentStart,
          end: segmentStart + utils.time.minutesToMillis(segmentDuration),
          duration: segmentDuration,
        };

        newSegments.push(segment);
        remainingDuration -= segmentDuration;
        segmentStart = segment.end;

        if (segmentStart >= workingSlot.end) {
          const nextWorkingSlot = expandedWorkingHours.find(
            (slot) => slot.start > segmentStart
          );
          if (nextWorkingSlot) {
            segmentStart = nextWorkingSlot.start;
          } else {
            task.isPartial = true;
            break;
          }
        }
      }
      task.segments = newSegments;
      task.isPartial = remainingDuration > 0;
      updateTaskTimes(task);

      if (task.scheduled_end_time) {
        currentEndTime = task.scheduled_end_time;
      }
    }
    return newSchedule;
  }

  function applyMove(schedule, move, cachedTimeSlots) {
    if (move[0] === 0) {
      const minPos = Math.min(move[1], move[2]);
      const maxPos = Math.max(move[1], move[2]);

      const affectedRange = [];
      for (let i = minPos; i <= maxPos; i++) {
        affectedRange.push(i);
      }

      const newSchedule = selectiveClone(schedule, affectedRange);
      const tasks = newSchedule.tasks;
      [tasks[move[1]], tasks[move[2]]] = [tasks[move[2]], tasks[move[1]]];

      return rescheduleTaskRange(newSchedule, affectedRange, cachedTimeSlots);
    }
    const taskOrder = Array.from(
      { length: schedule.tasks.length },
      (_, i) => i
    );

    const newSchedule = selectiveClone(schedule, taskOrder);

    [newSchedule.tasks[move[1]], newSchedule.tasks[move[2]]] = [
      newSchedule.tasks[move[2]],
      newSchedule.tasks[move[1]],
    ];
    return rescheduleTasksSequentially(newSchedule, taskOrder);
  }

  function optimizeSchedule(initialSchedule, options = {}) {
    const maxIterations = options.maxIterations || 10000;
    const tabuTenure = options.tabuTenure || 15;
    const maxNoImprovement = options.maxNoImprovement || 100;
    const coefficients = options.coefficients || config.defaultCoefficients;
    let currentSchedule = fastClone(initialSchedule);
    let bestSchedule = fastClone(currentSchedule);
    const taskCount = currentSchedule.tasks.length;
    const isValidInitial = validateSchedule(currentSchedule);

    if (!isValidInitial) {
      const taskOrder = Array.from({ length: taskCount }, (_, i) => i);
      currentSchedule = rescheduleTasksSequentially(currentSchedule, taskOrder);
      bestSchedule = fastClone(currentSchedule);
    }

    let currentObjective = evaluateSchedule(currentSchedule, coefficients);
    let bestObjective = currentObjective;

    const startTime = utils.time.getCurrentTime();
    const searchEndTime = startTime + 30 * 24 * 60 * 60 * 1000;

    const cachedTimeSlots = precomputeExpandedTimeSlots(
      currentSchedule.timeSlots,
      startTime,
      searchEndTime
    );
    
    const tabuSet = new Set();
    const tabuQueue = new Array(tabuTenure);
    const moveCache = new Map();

    let tabuQueuePosition = 0;
    let tabuQueueFull = false;
    let iterationsWithoutImprovement = 0;
    let iterations = 0;

    for (iterations = 0; iterations < maxIterations; iterations++) {
      if (iterations % 10 === 0) {
        currentObjective = evaluateSchedule(currentSchedule, coefficients);
      }

      const possibleMoves = generateNeighborhood(currentSchedule);

      let bestMove = null;
      let bestMoveSchedule = null;
      let bestMoveValue = currentObjective;

      for (let i = 0; i < possibleMoves.length; i++) {
        const move = possibleMoves[i];
        const moveKey = createMoveKey(move, currentObjective, taskCount);
        let neighborValue;
        let neighborSchedule;

        if (moveCache.has(moveKey)) {
          const cacheEntry = moveCache.get(moveKey);
          neighborValue = cacheEntry.value;
          neighborSchedule = cacheEntry.schedule;
        } else {
          neighborSchedule = applyMove(currentSchedule, move, cachedTimeSlots);

          const minPos = Math.min(move[1], move[2]);
          const maxPos = Math.max(move[1], move[2]);
          const affectedRange = [];

          for (let i = minPos; i <= maxPos; i++) {
            affectedRange.push(i);
          }
          neighborValue = calculateIncrementalObjective(
            currentSchedule,
            neighborSchedule,
            affectedRange,
            currentObjective,
            coefficients
          );
          moveCache.set(moveKey, {
            value: neighborValue,
            schedule: neighborSchedule,
          });

          if (moveCache.size > 1000) {
            let count = 0;
            for (const key of moveCache.keys()) {
              moveCache.delete(key);
              count++;
              if (count >= 500) break;
            }
          }
        }

        const tabuKey = move[1] * taskCount + move[2];
        const moveIsTabu = tabuSet.has(tabuKey);
        const meetsAspiration = neighborValue < bestObjective;

        if (!moveIsTabu || meetsAspiration) {
          if (neighborValue < currentObjective) {
            bestMove = move;
            bestMoveSchedule = neighborSchedule;
            bestMoveValue = neighborValue;
            break;
          }
          if (neighborValue < bestMoveValue) {
            bestMove = move;
            bestMoveSchedule = neighborSchedule;
            bestMoveValue = neighborValue;
          }
        }
      }
      if (!bestMove) {
        break;
      }

      currentSchedule = bestMoveSchedule;
      currentObjective = bestMoveValue;

      const tabuKey = bestMove[1] * taskCount + bestMove[2];

      if (tabuQueueFull) {
        tabuSet.delete(tabuQueue[tabuQueuePosition]);
      }

      tabuQueue[tabuQueuePosition] = tabuKey;
      tabuSet.add(tabuKey);
      tabuQueuePosition = (tabuQueuePosition + 1) % tabuTenure;

      if (!tabuQueueFull && tabuQueuePosition === 0) {
        tabuQueueFull = true;
      }

      if (currentObjective < bestObjective) {
        bestSchedule = fastClone(currentSchedule);
        bestObjective = currentObjective;
        iterationsWithoutImprovement = 0;
      } else {
        iterationsWithoutImprovement++;
      }

      if (iterationsWithoutImprovement >= maxNoImprovement) {
        break;
      }
    }

    const isValidFinal = validateSchedule(bestSchedule);

    if (!isValidFinal) {
      const taskOrder = Array.from({ length: taskCount }, (_, i) => i);
      bestSchedule = rescheduleTasksSequentially(bestSchedule, taskOrder);
    }

    bestObjective = evaluateSchedule(bestSchedule, coefficients);

    return {
      schedule: bestSchedule,
      objectiveValue: bestObjective,
    };
  }

  const initialSchedule = generateInitialSchedule(scenario, {
    includeScheduledTasks: options.includeScheduledTasks || false,
  });

  const optimizedResult = optimizeSchedule(initialSchedule, {
    maxIterations: 1000,
    tabuTenure: 15,
    maxNoImprovement: 100,
    coefficients: options.coefficients || config.defaultCoefficients,
  });

  return optimizedResult.schedule;
}

module.exports = tabuSearchScheduler;
