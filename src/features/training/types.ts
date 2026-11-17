import type { SportId } from '@/features/athlete/catalog';
import type { PrescriptionGoal } from '@/features/exercises/types';

export type SetKind = 'normal' | 'warmup' | 'drop' | 'failure';

/** One completed set, as stored in public.workout_sets (planned schema). */
export type LoggedSet = {
  exerciseKey: string;
  /** Name snapshot: history survives catalog renames. */
  exerciseName: string;
  /** Exercise order in the workout, 1-based. */
  position: number;
  /** Set order within the exercise, 1-based. */
  setIndex: number;
  kind: SetKind;
  reps: number | null;
  weightKg: number | null;
  durationS: number | null;
  distanceM: number | null;
  restS: number | null;
  rpe: number | null;
  completedAt: string | null;
};

/** A finished workout (public.workouts + its sets). `id` is generated on the device and makes saving idempotent. */
export type Workout = {
  id: string;
  userId: string;
  name: string;
  sport: SportId;
  templateId: string | null;
  startedAt: string;
  endedAt: string;
  rpe: number | null;
  notes: string | null;
  sets: LoggedSet[];
};

/**
 * synced   confirmed by the server (or saved on the device in demo mode)
 * pending  in the device outbox, will be uploaded automatically
 * rejected the server refused it (invalid data); kept so nothing is lost silently
 */
export type SyncState = 'synced' | 'pending' | 'rejected';

export type WorkoutEntry = Workout & { sync: SyncState; syncError?: string };

/* ------------------------------------------------------------------ */
/* Workout in progress (device draft)                                  */
/* ------------------------------------------------------------------ */

export type DraftSet = {
  uid: string;
  kind: SetKind;
  reps: number | null;
  weightKg: number | null;
  durationS: number | null;
  distanceM: number | null;
  restS: number | null;
  rpe: number | null;
  done: boolean;
  completedAt: string | null;
};

export type DraftExercise = {
  uid: string;
  exerciseKey: string;
  exerciseName: string;
  /** Rest after each set of this exercise, seconds (remembers ±15 s adjustments). */
  restS: number;
  sets: DraftSet[];
  /** Round plan from the program (pre-fills the round clock). */
  plannedRounds?: RoundPlan | null;
};

/** Rest countdown after a completed set. Time-based: survives reloads and app kills. */
export type RestTimer = { exUid: string; setUid: string; startedAt: string; durationS: number };

/**
 * Boxing / kickboxing round clock: prep → round → rest → round … → done.
 * Fully derived from startedAt, so the phase is correct after a reload.
 */
export type RoundTimer = { exUid: string; startedAt: string; rounds: number; roundS: number; restS: number; prepS: number };

export type ActiveWorkout = {
  /** Draft format version (bump + migrate if the shape changes). */
  v: 1;
  /** Becomes the workout id: retries and duplicate taps can never create two workouts. */
  id: string;
  userId: string;
  name: string;
  sport: SportId;
  templateId: string | null;
  startedAt: string;
  updatedAt: string;
  exercises: DraftExercise[];
  /** Set while the workout is paused; every clock freezes. */
  pausedAt: string | null;
  /** Total paused time so far (excluded from the workout duration). */
  pausedMs: number;
  rest: RestTimer | null;
  roundTimer: RoundTimer | null;
};

/* ------------------------------------------------------------------ */
/* Programs (workout templates)                                        */
/* ------------------------------------------------------------------ */

export type RoundPlan = { rounds: number; roundS: number; restS: number };

/** A planned set: values are targets, the athlete logs the real ones in the workout. */
export type TemplateSet = {
  kind: SetKind;
  reps: number | null;
  weightKg: number | null;
  durationS: number | null;
  distanceM: number | null;
};

export type TemplateBlock = {
  /** Client-only key (lists, drag & drop); not stored. */
  uid: string;
  exerciseKey: string;
  restS: number;
  sets: TemplateSet[];
  /** Boxing / kickboxing: round-based block. */
  rounds: RoundPlan | null;
};

export type TemplateGoal = PrescriptionGoal;

/** 1 = Monday … 7 = Sunday (ISO). */
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** public.workout_templates (planned schema; blocks as one jsonb document). */
export type WorkoutTemplate = {
  id: string;
  /** null for built-in programs shipped with the app. */
  userId: string | null;
  builtIn: boolean;
  name: string;
  sport: SportId;
  goal: TemplateGoal | null;
  notes: string | null;
  /** Weekly plan: the days this program is scheduled on. */
  days: Weekday[];
  blocks: TemplateBlock[];
  updatedAt: string;
};
