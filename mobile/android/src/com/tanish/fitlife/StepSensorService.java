package com.tanish.fitlife;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ServiceInfo;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.SystemClock;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/** Optional foreground sensor fallback. Steps are never attributed across users. */
public final class StepSensorService extends Service implements SensorEventListener {
    private static final String CHANNEL = "fitlife_step_tracking";
    private static final int NOTIFICATION = 27001;
    private static volatile String runningUid;
    static boolean isRunningFor(String uid) { return uid != null && uid.equals(runningUid); }
    private final Handler handler = new Handler(Looper.getMainLooper());
    private SensorManager sensors;
    private String uid;
    private long lastCounter = -1, pending = 0;
    private String lastDay, pendingDay;
    private boolean pendingPartial;
    private boolean flushScheduled;
    private final Runnable delayedFlush = () -> { flushScheduled = false; flush(); };

    static boolean hasPermission(Context c) {
        return Build.VERSION.SDK_INT < 29 || c.checkSelfPermission("android.permission.ACTIVITY_RECOGNITION") == PackageManager.PERMISSION_GRANTED;
    }
    static boolean hasSensor(Context c) {
        SensorManager manager = (SensorManager)c.getSystemService(Context.SENSOR_SERVICE);
        return manager != null && manager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER) != null;
    }
    static boolean notificationVisible(Context c) {
        if (!ReminderScheduler.appNotificationsEnabled(c)) return false;
        NotificationManager manager = (NotificationManager)c.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null) return false;
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel channel = manager.getNotificationChannel(CHANNEL);
            if (channel != null && channel.getImportance() == NotificationManager.IMPORTANCE_NONE) return false;
        }
        return true;
    }
    static void start(Context c, String uid) throws Exception {
        if (!hasPermission(c) || !hasSensor(c)) throw new IllegalStateException("Phone step sensor is not available or permission was denied.");
        StepLedger.setPhoneEnabled(c, uid, true); StepLedger.setActiveAccount(c, uid);
        Intent intent = new Intent(c, StepSensorService.class).putExtra("uid", uid);
        try { if (Build.VERSION.SDK_INT >= 26) c.startForegroundService(intent); else c.startService(intent); }
        catch (Exception e) { StepLedger.setPhoneEnabled(c, uid, false); StepLedger.setActiveAccount(c, null); throw e; }
    }
    static void stop(Context c, String uid) {
        try { if (uid != null) StepLedger.setPhoneEnabled(c, uid, false); StepLedger.setActiveAccount(c, null); }
        catch (Exception ignored) { /* do not reopen or overwrite corrupt state */ }
        c.stopService(new Intent(c, StepSensorService.class));
    }
    private boolean authorized() {
        FirebaseUser user = FirebaseAuth.getInstance().getCurrentUser();
        return uid != null && user != null && uid.equals(user.getUid());
    }
    private Notification notification() {
        NotificationManager manager = (NotificationManager)getSystemService(NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel channel = new NotificationChannel(CHANNEL, "Step tracking", NotificationManager.IMPORTANCE_LOW);
            channel.setDescription("Shown while FitLife uses the phone's step sensor."); manager.createNotificationChannel(channel);
        }
        Intent open = new Intent(this, MainActivity.class).setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent target = PendingIntent.getActivity(this, 27001, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Notification.Builder builder = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(this, CHANNEL) : new Notification.Builder(this);
        return builder.setSmallIcon(R.drawable.ic_launcher).setContentTitle("FitLife step tracking")
                .setContentText("Phone sensor is counting while tracking is on.").setContentIntent(target).setOngoing(true).build();
    }
    @Override public int onStartCommand(Intent intent, int flags, int startId) {
        String requested = intent == null ? StepLedger.activeAccount(this) : intent.getStringExtra("uid");
        if (uid != null && uid.equals(requested) && sensors != null) return START_STICKY;
        if (uid != null && !uid.equals(requested)) { stopSelf(); return START_NOT_STICKY; }
        uid = requested;
        if (!authorized() || !StepLedger.phoneEnabled(this, uid) || !hasPermission(this) || !hasSensor(this)) { stopSelf(); return START_NOT_STICKY; }
        try {
            Notification n = notification();
            if (Build.VERSION.SDK_INT >= 34) startForeground(NOTIFICATION, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_HEALTH);
            else startForeground(NOTIFICATION, n);
            sensors = (SensorManager)getSystemService(SENSOR_SERVICE);
            Sensor step = sensors.getDefaultSensor(Sensor.TYPE_STEP_COUNTER);
            if (!sensors.registerListener(this, step, SensorManager.SENSOR_DELAY_NORMAL)) { sensors = null; stopSelf(); return START_NOT_STICKY; }
            runningUid = uid;
            return START_STICKY;
        } catch (Exception e) { sensors = null; stopSelf(); return START_NOT_STICKY; }
    }
    private static String dayFor(long ms) { return new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date(ms)); }
    @Override public void onSensorChanged(SensorEvent event) {
        if (!authorized() || !hasPermission(this)) { stopSelf(); return; }
        if (event.sensor.getType() != Sensor.TYPE_STEP_COUNTER || event.values.length == 0 || !Float.isFinite(event.values[0]) || event.values[0] < 0) return;
        long raw = (long)event.values[0];
        long elapsedNanos = SystemClock.elapsedRealtimeNanos();
        boolean timeUncertain = event.timestamp <= 0 || event.timestamp > elapsedNanos;
        long wall = System.currentTimeMillis() - (timeUncertain ? 0 : (elapsedNanos - event.timestamp) / 1_000_000L);
        String day = dayFor(wall);
        StepCounterMath.Result result = StepCounterMath.between(lastCounter, lastDay, raw, day);
        if (pendingDay != null && !pendingDay.equals(day)) flush();
        pendingDay = day; pending += result.added; pendingPartial |= result.partial || timeUncertain;
        lastCounter = raw; lastDay = day;
        if (pending >= 20) flush();
        else if (!flushScheduled) { flushScheduled = true; handler.postDelayed(delayedFlush, 15_000); }
    }
    private void flush() {
        if (pendingDay == null || uid == null) return;
        String day = pendingDay; long steps = pending; boolean partial = pendingPartial;
        pendingDay = null; pending = 0; pendingPartial = false;
        try { StepLedger.phoneDay(this, uid, day, steps, partial); }
        catch (Exception e) { stopSelf(); } // fail closed; do not invent/reassign data
    }
    @Override public void onAccuracyChanged(Sensor sensor, int accuracy) { }
    @Override public IBinder onBind(Intent intent) { return null; }
    @Override public void onDestroy() {
        handler.removeCallbacksAndMessages(null); flush();
        if (sensors != null) sensors.unregisterListener(this);
        if (uid != null && uid.equals(runningUid)) runningUid = null;
        sensors = null; super.onDestroy();
    }
}
