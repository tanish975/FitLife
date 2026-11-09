import React, { useState, useCallback } from 'react';
import { Bell, Clock, Droplets, Scale, CheckCircle, ChevronRight } from 'lucide-react';
import { useFitLife } from '../data/FitLifeStore';
import { hasNativeReminders, minuteTime } from '../domain/Reminders';
import type { HabitReminderPreferences } from '../domain/PersonalFeatures';
import { PressScale } from './PressScale';

const DAYS: { value: number; label: string }[] = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

const WATER_INTERVALS: { value: 60 | 120 | 180; label: string }[] = [
  { value: 60, label: 'Every hour' },
  { value: 120, label: 'Every 2 hours' },
  { value: 180, label: 'Every 3 hours' },
];

interface Props {
  onClose?: () => void;
}

export const HabitRemindersPanel: React.FC<Props> = ({ onClose }) => {
  const {
    settings,
    updateHabitReminders,
    waterTodayMl,
  } = useFitLife();

  const prefs = settings.habitReminders;
  const native = hasNativeReminders();
  const [expanded, setExpanded] = useState(true);
  const [weeklyNotification, setWeeklyNotification] = useState<boolean>(prefs?.weeklySummaryEnabled ?? false);

  const nativeNote = native
    ? 'On Android, workout & water reminders are handled by your phone’s alarm system. Toggle them in Local Reminders below.'
    : 'On this device, FitLife shows in-app reminder cards and (with permission) browser notifications for daily check-ins and the weekly summary.';

  const togglePref = useCallback(
    (key: keyof Omit<HabitReminderPreferences, 'updatedAt'>, value: any) => {
      if (!prefs) return;
      updateHabitReminders({ [key]: value });
    },
    [prefs, updateHabitReminders]
  );

  const toggleWeeklySummary = useCallback(() => {
    if (!prefs) return;
    const next = !weeklyNotification;
    setWeeklyNotification(next);
    updateHabitReminders({ weeklySummaryEnabled: next });
  }, [prefs, weeklyNotification, updateHabitReminders]);

  const toggleMealReminders = useCallback(() => {
    if (!prefs) return;
    updateHabitReminders({ mealsEnabled: !prefs.mealsEnabled });
  }, [prefs, updateHabitReminders]);

  const toggleWeighIn = useCallback(() => {
    if (!prefs) return;
    updateHabitReminders({ weighInEnabled: !prefs.weighInEnabled });
  }, [prefs, updateHabitReminders]);

  const toggleWorkout = useCallback(() => {
    if (!prefs || native) return;
    updateHabitReminders({ workoutEnabled: !prefs.workoutEnabled });
  }, [prefs, native, updateHabitReminders]);

  const toggleWater = useCallback(() => {
    if (!prefs || native) return;
    updateHabitReminders({ waterEnabled: !prefs.waterEnabled });
  }, [prefs, native, updateHabitReminders]);

  const setTimePref = useCallback(
    (key: 'workoutMinute' | 'waterStartMinute' | 'waterEndMinute' | 'breakfastMinute' | 'lunchMinute' | 'dinnerMinute' | 'weighInMinute' | 'weeklySummaryMinute', value: number) => {
      if (!prefs) return;
      updateHabitReminders({ [key]: value });
    },
    [prefs, updateHabitReminders]
  );

  const setWeekdayPref = useCallback((value: number) => {
    if (!prefs) return;
    updateHabitReminders({ weeklySummaryWeekday: value });
  }, [prefs, updateHabitReminders]);

  const setWaterInterval = useCallback((value: 60 | 120 | 180) => {
    if (!prefs) return;
    updateHabitReminders({ waterIntervalMinutes: value });
  }, [prefs, updateHabitReminders]);

  const timeInput = (label: string, minute: number, onChange: (v: number) => void) => {
    const h = Math.floor(minute / 60);
    const m = minute % 60;
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-[#84877F]">{label}</span>
        <input
          type="time"
          value={`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`}
          onChange={(e) => {
            const [hh, mm] = e.target.value.split(':').map(Number);
            if (hh !== undefined && mm !== undefined) onChange(hh * 60 + mm);
          }}
          className="rounded border border-[#2F3A33] bg-[#141916] px-2 py-1.5 text-[0.6875rem] text-[#F4F1EA] outline-none focus:border-[#6BA37E]"
        />
        <span className="text-xs text-[#B8B5AD]">{minuteTime(minute)}</span>
      </div>
    );
  };

  const reminderRow = (
    title: string,
    desc: string,
    icon: React.ReactNode,
    enabled: boolean,
    onToggle: () => void,
    nativeHandled: boolean
  ) => (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-[#2F3A33] bg-[#141916] p-3">
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#2A332D] text-[#7BB38F]">
          {icon}
        </div>
        <div>
          <div className="font-heading text-xs font-semibold text-[#F4F1EA]">{title}</div>
          <div className="text-[0.625rem] text-[#84877F]">{desc}</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {nativeHandled && (
          <span className="rounded-full border border-[#3E634B] bg-[#213026] px-2 py-0.5 text-[0.5625rem] font-semibold text-[#84877F]">
            Native alarm
          </span>
        )}
        <button
          type="button"
          role="switch"
          aria-label={title}
          aria-checked={enabled}
          onClick={onToggle}
          className="relative inline-flex h-7 w-11 shrink-0 items-center"
        >
          <span
            className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors duration-200 ${
              enabled ? 'bg-[#528B67]' : 'bg-[#2F3A33]'
            }`}
          >
            <span
              className={`inline-block h-2.5 w-2.5 transform rounded-full bg-white shadow transition-transform duration-200 ${
                enabled ? 'translate-x-4' : 'translate-x-1'
              }`}
            />
          </span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="rounded-[26px] border border-[#2F3A33] bg-[#1E2520] p-4" data-guide-target="settings-habit-reminders" aria-label="Habit reminders & weekly summary">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-[#7BB38F]" />
          <div>
            <h3 className="font-heading text-sm font-semibold text-[#F4F1EA]">Daily check-ins & weekly summary</h3>
            <p className="text-[0.625rem] text-[#84877F]">
              Gentle nudges for meals, weigh-ins, workouts, water, and your weekly digest.
            </p>
          </div>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} className="rounded-full p-2 hover:bg-[#2F3A33] text-[#B8B5AD]">
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>

      <p className="text-xs text-[#B8B5AD] mb-4">{nativeNote}</p>

      <details className="settings-fold" open={expanded}>
        <summary
          className="cursor-pointer font-semibold text-[#F4F1EA] flex items-center justify-between"
          onClick={() => setExpanded((v) => !v)}
        >
          <span>Daily reminders</span>
          <span aria-hidden="true">⌄</span>
        </summary>
        <div className="settings-fold-body mt-3 space-y-3">
          {native ? (
            reminderRow(
              'Workout reminder',
              'Managed by Android alarms',
              <Clock className="h-4 w-4" />,
              false,
              toggleWorkout,
              true
            )
          ) : (
            reminderRow(
              'Workout reminder',
              `Daily nudge at ${minuteTime(prefs?.workoutMinute ?? 8 * 60)}`,
              <Clock className="h-4 w-4" />,
              prefs?.workoutEnabled ?? false,
              toggleWorkout,
              false
            )
          )}
          {native ? (
            reminderRow(
              'Water reminder',
              'Managed by Android alarms',
              <Droplets className="h-4 w-4" />,
              false,
              toggleWater,
              true
            )
          ) : (
            reminderRow(
              'Water reminder',
              `Every ${prefs?.waterIntervalMinutes ?? 120} min from ${minuteTime(prefs?.waterStartMinute ?? 9 * 60)} to ${minuteTime(prefs?.waterEndMinute ?? 19 * 60)}`,
              <Droplets className="h-4 w-4" />,
              prefs?.waterEnabled ?? false,
              toggleWater,
              false
            )
          )}
          {reminderRow(
            'Breakfast check-in',
            'Log your morning meal',
            <Scale className="h-4 w-4" />,
            prefs?.mealsEnabled ?? false,
            toggleMealReminders,
            false
          )}
          {reminderRow(
            'Morning weigh-in',
            'Track your 7-day weight trend',
            <Scale className="h-4 w-4" />,
            prefs?.weighInEnabled ?? false,
            toggleWeighIn,
            false
          )}
        </div>
      </details>

      <div className="mt-4 rounded-xl border border-[#2F3A33] bg-[#141916] p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-[#D8C39E]" />
            <div>
              <div className="font-heading text-xs font-semibold text-[#F4F1EA]">Weekly Summary Notification</div>
              <div className="text-[0.625rem] text-[#84877F]">
                A Sunday digest of your week: active days, workouts, weight trend, and focus areas.
              </div>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-label="Weekly summary notification"
            aria-checked={weeklyNotification}
            onClick={toggleWeeklySummary}
            className="relative inline-flex h-7 w-11 shrink-0 items-center"
          >
            <span
              className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors duration-200 ${
                weeklyNotification ? 'bg-[#528B67]' : 'bg-[#2F3A33]'
              }`}
            >
              <span
                className={`inline-block h-2.5 w-2.5 transform rounded-full bg-white shadow transition-transform duration-200 ${
                  weeklyNotification ? 'translate-x-4' : 'translate-x-1'
                }`}
              />
            </span>
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[#84877F]">Day</span>
          <select
            value={String(prefs?.weeklySummaryWeekday ?? 0)}
            onChange={(e) => setWeekdayPref(Number(e.target.value))}
            className="rounded border border-[#2F3A33] bg-[#141916] px-2 py-1.5 text-[0.6875rem] text-[#F4F1EA] outline-none focus:border-[#6BA37E]"
          >
            {DAYS.map((d) => (
              <option key={d.value} value={String(d.value)}>
                {d.label}
              </option>
            ))}
          </select>
          <span className="text-xs font-semibold text-[#84877F] ml-2">Time</span>
          {timeInput(
            '',
            prefs?.weeklySummaryMinute ?? 19 * 60,
            (v) => setTimePref('weeklySummaryMinute', v)
          )}
        </div>
        <p className="mt-1.5 text-[0.625rem] text-[#B8B5AD]">
          Delivered as an in-app card and, on browsers that support it, a notification. You can dismiss it anytime.
        </p>
      </div>

      <div className="mt-3 rounded-xl border border-[#2F3A33] bg-[#141916] p-3">
        <div className="flex items-center gap-2 mb-1">
          <CheckCircle className="h-3.5 w-3.5 text-[#7BB38F]" />
          <span className="text-[0.625rem] font-semibold text-[#F4F1EA]">Today so far</span>
        </div>
        <div className="flex items-center justify-between text-xs text-[#84877F]">
          <span>Water logged</span>
          <span className="text-[#F4F1EA]">{Math.round(waterTodayMl / 10) / 100}L / {Math.round(settings.waterGoalMl / 10) / 100}L target</span>
        </div>
      </div>
    </div>
  );
};
