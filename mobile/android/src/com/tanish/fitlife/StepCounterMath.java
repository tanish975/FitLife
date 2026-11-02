package com.tanish.fitlife;

/** Pure sensor transition. A fresh registration always establishes a baseline;
 * no steps from before that registration/account are attributed to the user. */
final class StepCounterMath {
    static final class Result {
        final long added;
        final boolean partial;
        Result(long added, boolean partial) { this.added = added; this.partial = partial; }
    }
    static Result between(long lastCounter, String lastDay, long counter, String day) {
        if (lastCounter < 0 || lastDay == null || day == null || counter < lastCounter || counter < 0)
            return new Result(0, true);
        long delta = counter - lastCounter;
        // A counter jump while no events were delivered across midnight cannot be
        // split accurately. Keep only a single step known to have happened today.
        if (!lastDay.equals(day)) {
            if (day.compareTo(lastDay) < 0) return new Result(0, true);
            return new Result(delta == 1 ? 1 : 0, delta > 1);
        }
        // Hardware faults or corrupt state must not manufacture enormous totals.
        if (delta > 1_000_000) return new Result(0, true);
        return new Result(delta, false);
    }
}
