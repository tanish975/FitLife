package com.tanish.fitlife;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;
import org.json.JSONObject;
import java.util.Calendar;
import java.util.TimeZone;

/** Free local, inexact alarms. Android may defer or suppress these for battery policy. */
final class ReminderScheduler {
    private static final String CHANNEL = "fitlife_local_reminders";
    private static int code(String kind) { return "water".equals(kind) ? 27102 : 27101; }
    static boolean appNotificationsEnabled(Context c) {
        if (Build.VERSION.SDK_INT >= 33 && c.checkSelfPermission("android.permission.POST_NOTIFICATIONS") != PackageManager.PERMISSION_GRANTED) return false;
        NotificationManager manager = (NotificationManager)c.getSystemService(Context.NOTIFICATION_SERVICE);
        return manager != null && manager.areNotificationsEnabled();
    }
    static boolean notificationsEnabled(Context c) {
        if (!appNotificationsEnabled(c)) return false;
        NotificationManager manager = (NotificationManager)c.getSystemService(Context.NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel channel = manager.getNotificationChannel(CHANNEL);
            if (channel != null && channel.getImportance() == NotificationManager.IMPORTANCE_NONE) return false;
        }
        return true;
    }
    private static PendingIntent intent(Context c, String uid, String kind, long scheduledAt) {
        Intent i = new Intent(c, ReminderReceiver.class).setAction("com.tanish.fitlife.REMINDER." + kind)
                .putExtra("uid", uid).putExtra("kind", kind).putExtra("scheduledAt", scheduledAt);
        return PendingIntent.getBroadcast(c, code(kind), i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
    static void cancel(Context c, String uid, String kind) {
        AlarmManager alarm = (AlarmManager)c.getSystemService(Context.ALARM_SERVICE);
        if (alarm != null) alarm.cancel(intent(c, uid, kind, 0));
    }
    static void cancelAll(Context c, String uid) { cancel(c, uid, "workout"); cancel(c, uid, "water"); }
    static void schedule(Context c, String uid, String kind, int hour, int minute) {
        if ("water".equals(kind)) {
            try { scheduleWater(c, uid, StepLedger.reminders(c, uid).getJSONObject("water")); }
            catch (Exception e) { throw new IllegalStateException("Invalid water schedule", e); }
            return;
        }
        AlarmManager alarm = (AlarmManager)c.getSystemService(Context.ALARM_SERVICE);
        if (alarm == null) throw new IllegalStateException("Reminders unavailable");
        Calendar next = Calendar.getInstance(); next.set(Calendar.HOUR_OF_DAY, hour); next.set(Calendar.MINUTE, minute); next.set(Calendar.SECOND, 0); next.set(Calendar.MILLISECOND, 0);
        if (next.getTimeInMillis() <= System.currentTimeMillis()) next.add(Calendar.DAY_OF_YEAR, 1);
        long when = next.getTimeInMillis();
        alarm.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, when, intent(c, uid, kind, when));
    }
    static void scheduleWater(Context c, String uid, JSONObject water) throws Exception {
        AlarmManager alarm = (AlarmManager)c.getSystemService(Context.ALARM_SERVICE);
        if (alarm == null) throw new IllegalStateException("Reminders unavailable");
        long when=WaterReminderPlan.nextAfter(water,System.currentTimeMillis(),TimeZone.getDefault());
        // Exactly one future slot is pending. On delivery we recalculate using
        // local wall time, so missed slots aren't replayed in a burst.
        alarm.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, when, intent(c, uid, "water", when));
    }
    static void restoreCurrent(Context c) {
        try {
            FirebaseUser user = FirebaseAuth.getInstance().getCurrentUser();
            if (user == null) return;
            String uid = user.getUid(); JSONObject values = StepLedger.reminders(c, uid);
            for (String kind : new String[]{"workout","water"}) {
                JSONObject row = values.getJSONObject(kind);
                if (row.getBoolean("enabled")) schedule(c, uid, kind, row.getInt("hour"), row.getInt("minute"));
                else cancel(c, uid, kind);
            }
        } catch (Exception ignored) { /* Fail closed; the settings screen can retry. */ }
    }
    static void deliver(Context c, String uid, String kind, long scheduledAt) {
        if (!("workout".equals(kind) || "water".equals(kind))) return;
        try {
            FirebaseUser user = FirebaseAuth.getInstance().getCurrentUser();
            if (user == null || uid == null || !uid.equals(user.getUid())) return;
            JSONObject row = StepLedger.reminders(c, uid).getJSONObject(kind);
            if (!row.getBoolean("enabled")) return;
            long now=System.currentTimeMillis();
            // Recalculate even if notification access was revoked. Very late
            // water alarms, or those outside an interval window, are skipped.
            boolean show= !"water".equals(kind) || WaterReminderPlan.shouldDeliver(row,scheduledAt,now,TimeZone.getDefault());
            schedule(c, uid, kind, row.getInt("hour"), row.getInt("minute"));
            if (!show || !notificationsEnabled(c)) return;
            NotificationManager manager = (NotificationManager)c.getSystemService(Context.NOTIFICATION_SERVICE);
            if (Build.VERSION.SDK_INT >= 26) {
                NotificationChannel channel = new NotificationChannel(CHANNEL, "Workout and water reminders", NotificationManager.IMPORTANCE_DEFAULT);
                channel.setDescription("Optional reminders set in FitLife."); manager.createNotificationChannel(channel);
            }
            PendingIntent open = PendingIntent.getActivity(c, 27100, new Intent(c, MainActivity.class).setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            Notification.Builder builder = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(c, CHANNEL) : new Notification.Builder(c);
            Notification notification = builder.setSmallIcon(R.drawable.ic_launcher).setContentTitle("water".equals(kind) ? "Water check-in" : "Time to move")
                    .setContentText("Open FitLife whenever you're ready.").setContentIntent(open).setAutoCancel(true).build();
            manager.notify(code(kind), notification);
        } catch (Exception ignored) { /* No guessed data or notifications for another account. */ }
    }
}
