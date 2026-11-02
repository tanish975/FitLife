package com.tanish.fitlife;

import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.provider.Settings;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;
import org.json.JSONObject;
import java.nio.charset.StandardCharsets;

/** User-set local reminders; no remote messaging, SMS, or paid scheduler. */
final class ReminderBridge {
    private static final int NOTIFICATION_PERMISSION = 19302;
    private final MainActivity activity;
    private final WebView view;
    private String pendingRequest, pendingUid, pendingKind;
    private int pendingHour, pendingMinute;
    private boolean destroyed;
    ReminderBridge(MainActivity activity, WebView view) { this.activity = activity; this.view = view; }
    private static boolean validRequest(String s) { return s != null && s.matches("[A-Za-z0-9_-]{1,80}"); }
    private boolean current(String uid) {
        FirebaseUser user = FirebaseAuth.getInstance().getCurrentUser();
        return uid != null && uid.matches("[A-Za-z0-9_-]{1,128}") && user != null && uid.equals(user.getUid());
    }
    private void emit(String request, boolean ok, JSONObject result, String error) {
        if (!validRequest(request) || destroyed) return;
        try {
            JSONObject detail = new JSONObject().put("requestId", request).put("ok", ok);
            if (ok) detail.put("result", result == null ? JSONObject.NULL : result); else detail.put("error", error == null ? "Please try again." : error);
            String b64 = Base64.encodeToString(detail.toString().getBytes(StandardCharsets.UTF_8), Base64.NO_WRAP);
            String js = "window.dispatchEvent(new CustomEvent('fitlife-reminder-result',{detail:JSON.parse(new TextDecoder().decode(Uint8Array.from(atob("
                    + JSONObject.quote(b64) + "),c=>c.charCodeAt(0))))}));";
            activity.runOnUiThread(() -> { if (!destroyed && !activity.isDestroyed()) view.evaluateJavascript(js, null); });
        } catch (Exception ignored) { }
    }
    private JSONObject snapshotFor(String uid) throws Exception {
        JSONObject result = StepLedger.reminders(activity, uid);
        result.put("notificationsEnabled", ReminderScheduler.notificationsEnabled(activity));
        return result;
    }
    @JavascriptInterface public void snapshot(String request, String uid) {
        if (!validRequest(request)) return;
        activity.runOnUiThread(() -> {
            if (!current(uid)) { emit(request, false, null, "Account changed. Reminders were not accessed."); return; }
            try { emit(request, true, snapshotFor(uid), null); }
            catch (Exception e) { emit(request, false, null, "Could not read reminder settings."); }
        });
    }
    @JavascriptInterface public void configure(String request, String uid, String kind, boolean enabled, int hour, int minute) {
        if (!validRequest(request) || !("workout".equals(kind) || "water".equals(kind)) || hour < 0 || hour > 23 || minute < 0 || minute > 59) return;
        activity.runOnUiThread(() -> {
            if (!current(uid)) { emit(request, false, null, "Account changed. Reminders were not changed."); return; }
            if (enabled && Build.VERSION.SDK_INT >= 33 && activity.checkSelfPermission("android.permission.POST_NOTIFICATIONS") != PackageManager.PERMISSION_GRANTED) {
                if (pendingRequest != null) { emit(request, false, null, "A permission request is already open."); return; }
                pendingRequest=request; pendingUid=uid; pendingKind=kind; pendingHour=hour; pendingMinute=minute;
                try { activity.requestPermissions(new String[]{"android.permission.POST_NOTIFICATIONS"}, NOTIFICATION_PERMISSION); }
                catch (Exception e) { pendingRequest=null; pendingUid=null; pendingKind=null; emit(request,false,null,"Could not request notification permission."); }
                return;
            }
            apply(request,uid,kind,enabled,hour,minute);
        });
    }
    private void apply(String request, String uid, String kind, boolean enabled, int hour, int minute) {
        if (!current(uid)) { emit(request,false,null,"Account changed. Reminders were not changed."); return; }
        if (enabled && !ReminderScheduler.notificationsEnabled(activity)) { emit(request,false,null,"Notifications are off in Android settings. Turn them on to use reminders."); return; }
        try {
            JSONObject old = StepLedger.reminders(activity, uid).getJSONObject(kind);
            StepLedger.setReminder(activity, uid, kind, enabled, hour, minute);
            try { if (enabled) ReminderScheduler.schedule(activity,uid,kind,hour,minute); else ReminderScheduler.cancel(activity,uid,kind); }
            catch (Exception e) {
                StepLedger.setReminder(activity,uid,kind,old.getBoolean("enabled"),old.getInt("hour"),old.getInt("minute"));
                throw e;
            }
            emit(request,true,snapshotFor(uid),null);
        } catch (Exception e) { emit(request,false,null,"Could not save the reminder. Try again."); }
    }
    boolean onPermissionResult(int code, int[] grants) {
        if (code != NOTIFICATION_PERMISSION) return false;
        String request=pendingRequest, uid=pendingUid, kind=pendingKind; int hour=pendingHour, minute=pendingMinute;
        pendingRequest=null; pendingUid=null; pendingKind=null;
        if (request != null) {
            if (grants.length > 0 && grants[0] == PackageManager.PERMISSION_GRANTED) apply(request,uid,kind,true,hour,minute);
            else emit(request,false,null,"Notification permission was not granted.");
        }
        return true;
    }
    @JavascriptInterface public void openSettings(String request, String uid) {
        if (!validRequest(request)) return;
        activity.runOnUiThread(() -> {
            if (!current(uid)) { emit(request,false,null,"Account changed."); return; }
            try {
                Intent intent = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, activity.getPackageName());
                activity.startActivity(intent); emit(request,true,new JSONObject(),null);
            } catch (Exception e) { emit(request,false,null,"Open Android app settings to manage notifications."); }
        });
    }
    void stopForSignOut(String uid) { if (uid != null) ReminderScheduler.cancelAll(activity,uid); }
    void destroy() { destroyed=true; }
}
