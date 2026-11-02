package com.tanish.fitlife;

public final class StepCounterMathTest {
    private static void check(long before, String beforeDay, long after, String day, long expected, boolean partial, String name) {
        StepCounterMath.Result value = StepCounterMath.between(before,beforeDay,after,day);
        if (value.added != expected || value.partial != partial) throw new AssertionError(name + ": " + value.added + ", " + value.partial);
    }
    public static void main(String[] args) {
        check(-1,null,402,"2026-11-02",0,true,"registration establishes a baseline");
        check(402,"2026-11-02",409,"2026-11-02",7,false,"ordinary same-day steps");
        check(409,"2026-11-02",2,"2026-11-02",0,true,"counter reset is not a negative count");
        check(409,"2026-11-02",410,"2026-11-03",1,false,"one known step after midnight");
        check(409,"2026-11-02",419,"2026-11-03",0,true,"unsplittable midnight interval is not guessed");
        check(409,"2026-11-03",419,"2026-11-02",0,true,"clock moving backwards");
        check(1,"2026-11-02",1_000_002,"2026-11-02",0,true,"implausible jump rejected");
        check(1,"2026-11-02",-5,"2026-11-02",0,true,"invalid sensor value");
        System.out.println("PASS: sensor baselines, counter resets, midnight and clock changes fail conservatively.");
    }
}
