package com.tanish.fitlife;

import org.json.JSONArray;
import org.json.JSONObject;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Collections;
import java.util.List;
import java.util.TimeZone;

/** Validated on-device water schedule. No Android or network APIs are required. */
final class WaterReminderPlan {
    private static final int MAX_TIMES = 12;
    private static final long MAX_DELAY_MS = 60L * 60L * 1000L;
    private WaterReminderPlan() { }

    private static int integer(JSONObject o, String key, int low, int high) throws Exception {
        Object value = o.get(key);
        if (!(value instanceof Number)) throw new IllegalArgumentException("Invalid " + key);
        double number = ((Number)value).doubleValue();
        if (!Double.isFinite(number) || number != Math.rint(number) || number < low || number > high)
            throw new IllegalArgumentException("Invalid " + key);
        return (int)number;
    }
    private static boolean bool(JSONObject o, String key) throws Exception {
        Object value = o.get(key);
        if (!(value instanceof Boolean)) throw new IllegalArgumentException("Invalid " + key);
        return (Boolean)value;
    }
    static JSONObject normalize(JSONObject raw) throws Exception {
        if (raw == null) raw = new JSONObject().put("enabled", false).put("hour", 12).put("minute", 0);
        boolean enabled = bool(raw, "enabled");
        if (!raw.has("mode")) {
            int hour = integer(raw,"hour",0,23), minute = integer(raw,"minute",0,59);
            return create(enabled, "times", new int[]{hour * 60 + minute}, 9 * 60, 19 * 60, 120);
        }
        String mode = raw.getString("mode");
        if (!("times".equals(mode) || "interval".equals(mode))) throw new IllegalArgumentException("Invalid mode");
        JSONArray a = raw.getJSONArray("times");
        if (a.length() < 1 || a.length() > MAX_TIMES) throw new IllegalArgumentException("Choose 1 to 12 times");
        List<Integer> values = new ArrayList<>();
        for (int i=0;i<a.length();i++) {
            Object value = a.get(i);
            if (!(value instanceof Number)) throw new IllegalArgumentException("Invalid time");
            double n = ((Number)value).doubleValue();
            if (!Double.isFinite(n) || n != Math.rint(n) || n < 0 || n > 1439) throw new IllegalArgumentException("Invalid time");
            if (values.contains((int)n)) throw new IllegalArgumentException("Times must be different");
            values.add((int)n);
        }
        Collections.sort(values);
        int start = integer(raw,"startMinute",0,1439), end = integer(raw,"endMinute",0,1439);
        int interval = integer(raw,"intervalMinutes",60,120);
        if (start > end || (interval != 60 && interval != 120)) throw new IllegalArgumentException("Invalid interval window");
        int[] times = new int[values.size()]; for (int i=0;i<values.size();i++) times[i]=values.get(i);
        return create(enabled,mode,times,start,end,interval);
    }
    private static JSONObject create(boolean enabled, String mode, int[] times, int start, int end, int interval) throws Exception {
        JSONArray list = new JSONArray(); for (int t : times) list.put(t);
        // hour/minute retain the old bridge shape for compatible snapshots.
        int first = "interval".equals(mode) ? start : times[0];
        return new JSONObject().put("enabled",enabled).put("hour",first/60).put("minute",first%60)
                .put("mode",mode).put("times",list).put("startMinute",start).put("endMinute",end).put("intervalMinutes",interval);
    }
    private static List<Integer> slots(JSONObject canonical) throws Exception {
        List<Integer> result = new ArrayList<>();
        if ("times".equals(canonical.getString("mode"))) {
            JSONArray times = canonical.getJSONArray("times");
            for (int i=0;i<times.length();i++) result.add(times.getInt(i));
        } else {
            int start=canonical.getInt("startMinute"), end=canonical.getInt("endMinute"), interval=canonical.getInt("intervalMinutes");
            for (int m=start; m<=end; m+=interval) result.add(m);
        }
        return result;
    }
    static long nextAfter(JSONObject raw, long now, TimeZone zone) throws Exception {
        JSONObject row = normalize(raw);
        List<Integer> slots = slots(row);
        Calendar base=Calendar.getInstance(zone); base.setTimeInMillis(now);
        base.set(Calendar.HOUR_OF_DAY,12); base.set(Calendar.MINUTE,0); base.set(Calendar.SECOND,0); base.set(Calendar.MILLISECOND,0);
        long best=Long.MAX_VALUE;
        for (int day=0;day<=2;day++) {
            Calendar date=(Calendar)base.clone(); date.add(Calendar.DAY_OF_YEAR,day);
            for (int m:slots) {
                Calendar candidate=(Calendar)date.clone();
                candidate.set(Calendar.HOUR_OF_DAY,m/60); candidate.set(Calendar.MINUTE,m%60);
                candidate.set(Calendar.SECOND,0); candidate.set(Calendar.MILLISECOND,0);
                long when=candidate.getTimeInMillis();
                // A nonexistent wall-clock time on the spring DST transition is skipped, not shifted.
                if (candidate.get(Calendar.HOUR_OF_DAY)!=m/60 || candidate.get(Calendar.MINUTE)!=m%60) continue;
                if (when>now && when<best) best=when;
            }
            if (best!=Long.MAX_VALUE) return best;
        }
        throw new IllegalStateException("No next reminder found");
    }
    static boolean shouldDeliver(JSONObject raw, long scheduledAt, long now, TimeZone zone) throws Exception {
        JSONObject row=normalize(raw);
        if (!row.getBoolean("enabled") || scheduledAt<=0 || now<scheduledAt || now-scheduledAt>MAX_DELAY_MS) return false;
        Calendar due=Calendar.getInstance(zone), current=Calendar.getInstance(zone);
        due.setTimeInMillis(scheduledAt); current.setTimeInMillis(now);
        if (due.get(Calendar.YEAR)!=current.get(Calendar.YEAR) || due.get(Calendar.DAY_OF_YEAR)!=current.get(Calendar.DAY_OF_YEAR)) return false;
        int dueMinute=due.get(Calendar.HOUR_OF_DAY)*60+due.get(Calendar.MINUTE);
        if (!slots(row).contains(dueMinute)) return false; // An edited schedule invalidates an old pending slot.
        if ("interval".equals(row.getString("mode"))) {
            int minute=current.get(Calendar.HOUR_OF_DAY)*60+current.get(Calendar.MINUTE);
            if (minute<row.getInt("startMinute") || minute>row.getInt("endMinute")) return false;
        }
        return true;
    }
}
