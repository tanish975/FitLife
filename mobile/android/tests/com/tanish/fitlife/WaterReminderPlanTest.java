package com.tanish.fitlife;

import org.json.JSONArray;
import org.json.JSONObject;
import java.util.Calendar;
import java.util.TimeZone;

/** Wall-clock calculations, input validation and migration; not an Android alarm test. */
public final class WaterReminderPlanTest {
    private static void yes(boolean ok, String why) { if (!ok) throw new AssertionError(why); }
    private static long at(TimeZone z,int y,int month,int d,int h,int m) {
        Calendar c=Calendar.getInstance(z); c.clear(); c.set(y,month-1,d,h,m,0); return c.getTimeInMillis();
    }
    private static JSONObject plan(boolean on,String mode,int[] times,int start,int end,int every) throws Exception {
        JSONArray a=new JSONArray(); for(int x:times)a.put(x);
        return new JSONObject().put("enabled",on).put("mode",mode).put("times",a).put("startMinute",start).put("endMinute",end).put("intervalMinutes",every);
    }
    private static void rejected(JSONObject row) throws Exception {
        boolean failed=false; try { WaterReminderPlan.normalize(row); } catch (Exception e) { failed=true; }
        yes(failed,"invalid plan must be rejected: "+row);
    }
    public static void main(String[] args) throws Exception {
        TimeZone india=TimeZone.getTimeZone("Asia/Kolkata");
        JSONObject legacy=WaterReminderPlan.normalize(new JSONObject().put("enabled",true).put("hour",13).put("minute",15));
        yes(legacy.getBoolean("enabled") && legacy.getString("mode").equals("times") && legacy.getJSONArray("times").getInt(0)==795,"legacy time and enabled state preserved");
        yes(WaterReminderPlan.nextAfter(legacy,at(india,2026,11,6,12,0),india)==at(india,2026,11,6,13,15),"legacy next time today");
        yes(WaterReminderPlan.nextAfter(legacy,at(india,2026,11,6,13,15),india)==at(india,2026,11,7,13,15),"at due time schedules tomorrow");
        JSONObject times=WaterReminderPlan.normalize(plan(true,"times",new int[]{1140,660,900},540,1140,120));
        yes(times.getJSONArray("times").getInt(0)==660 && times.getJSONArray("times").getInt(2)==1140,"custom times sorted");
        yes(WaterReminderPlan.nextAfter(times,at(india,2026,11,6,11,20),india)==at(india,2026,11,6,15,0),"multiple times next slot");
        yes(WaterReminderPlan.nextAfter(times,at(india,2026,11,6,20,0),india)==at(india,2026,11,7,11,0),"custom times wrap to next day");
        JSONObject hourly=plan(true,"interval",new int[]{720},540,1140,60);
        JSONObject two=plan(true,"interval",new int[]{720},540,1140,120);
        yes(WaterReminderPlan.nextAfter(hourly,at(india,2026,11,6,9,30),india)==at(india,2026,11,6,10,0),"hourly slot");
        yes(WaterReminderPlan.nextAfter(two,at(india,2026,11,6,9,30),india)==at(india,2026,11,6,11,0),"two-hour slot");
        yes(WaterReminderPlan.nextAfter(two,at(india,2026,11,6,19,1),india)==at(india,2026,11,7,9,0),"no slots overnight");
        yes(WaterReminderPlan.shouldDeliver(two,at(india,2026,11,6,11,0),at(india,2026,11,6,11,30),india),"normal delayed delivery");
        yes(!WaterReminderPlan.shouldDeliver(two,at(india,2026,11,6,19,0),at(india,2026,11,6,19,1),india),"late notification outside chosen window skipped");
        yes(!WaterReminderPlan.shouldDeliver(two,at(india,2026,11,6,11,0),at(india,2026,11,6,12,1),india),"very late notification skipped");
        yes(!WaterReminderPlan.shouldDeliver(two,at(india,2026,11,6,10,0),at(india,2026,11,6,10,5),india),"old edited slot skipped");
        yes(!WaterReminderPlan.shouldDeliver(times,0,at(india,2026,11,6,11,0),india),"missing trigger is not guessed");
        yes(!WaterReminderPlan.shouldDeliver(plan(false,"times",new int[]{660},540,1140,120),at(india,2026,11,6,11,0),at(india,2026,11,6,11,1),india),"disabled never delivers");
        rejected(plan(true,"times",new int[]{660,660},540,1140,120));
        rejected(plan(true,"times",new int[]{},540,1140,120));
        rejected(plan(true,"times",new int[]{1440},540,1140,120));
        rejected(plan(true,"interval",new int[]{720},1200,540,120));
        rejected(plan(true,"interval",new int[]{720},540,1140,90));
        rejected(plan(true,"other",new int[]{720},540,1140,120));
        rejected(new JSONObject().put("enabled",true).put("hour",1.5).put("minute",0));
        TimeZone la=TimeZone.getTimeZone("America/Los_Angeles");
        JSONObject dst=plan(true,"times",new int[]{150},540,1140,120);
        yes(WaterReminderPlan.nextAfter(dst,at(la,2026,3,8,0,0),la)==at(la,2026,3,9,2,30),"nonexistent DST time skipped");
        System.out.println("PASS: water schedule migration, hourly/two-hour/custom slots, stale and overnight suppression, invalid inputs and DST (JVM only).");
    }
}
