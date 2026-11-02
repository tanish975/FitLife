package com.tanish.fitlife;

import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;
import org.json.JSONArray;
import org.json.JSONObject;
import java.nio.charset.StandardCharsets;

/** Narrow, asynchronous account-bound bridge. It exposes no raw Health records. */
final class StepsBridge {
    private static final int ACTIVITY_PERMISSION = 19301;
    private final MainActivity activity;
    private final WebView view;
    private final CloudBridge cloud;
    private final HealthSteps health;
    private String pendingRequest, pendingUid;
    private boolean destroyed;
    StepsBridge(MainActivity activity, WebView view, CloudBridge cloud) {
        this.activity = activity; this.view = view; this.cloud = cloud; this.health = new HealthSteps(activity);
    }
    private static boolean validRequest(String value) { return value != null && value.matches("[A-Za-z0-9_-]{1,80}"); }
    private boolean current(String uid) {
        FirebaseUser user = FirebaseAuth.getInstance().getCurrentUser();
        return uid != null && uid.matches("[A-Za-z0-9_-]{1,128}") && user != null && uid.equals(user.getUid());
    }
    private void emit(String request, boolean ok, JSONObject result, String message) {
        if (!validRequest(request) || destroyed) return;
        try {
            JSONObject detail = new JSONObject().put("requestId", request).put("ok", ok);
            if (ok) detail.put("result", result == null ? JSONObject.NULL : result);
            else detail.put("error", message == null ? "Please try again." : message);
            String encoded = Base64.encodeToString(detail.toString().getBytes(StandardCharsets.UTF_8), Base64.NO_WRAP);
            String script = "window.dispatchEvent(new CustomEvent('fitlife-steps-result',{detail:JSON.parse(new TextDecoder().decode(Uint8Array.from(atob("
                    + JSONObject.quote(encoded) + "),c=>c.charCodeAt(0))))}));";
            activity.runOnUiThread(() -> { if (!destroyed && !activity.isDestroyed()) view.evaluateJavascript(script, null); });
        } catch (Exception ignored) { }
    }
    @JavascriptInterface public void snapshot(String request, String uid, int days) {
        if (!validRequest(request)) return;
        activity.runOnUiThread(() -> {
            if (!current(uid)) { emit(request, false, null, "Account changed. Step reading stopped."); return; }
            try {
                String deviceId = cloud.deviceId();
                JSONArray phone = StepLedger.phoneRows(activity, uid, deviceId);
                boolean sensor = StepSensorService.hasSensor(activity);
                boolean permission = StepSensorService.hasPermission(activity);
                boolean enabled = StepLedger.phoneEnabled(activity, uid);
                boolean running = StepSensorService.isRunningFor(uid);
                String availability = health.availability();
                health.read(uid, deviceId, days, (healthRows, state) -> {
                    if (!current(uid)) { emit(request, false, null, "Account changed. Step reading stopped."); return; }
                    try {
                        JSONArray rows = new JSONArray();
                        for (int i=0; i<phone.length(); i++) rows.put(phone.getJSONObject(i));
                        if (healthRows != null) for (int i=0; i<healthRows.length(); i++) rows.put(healthRows.getJSONObject(i));
                        JSONObject result = new JSONObject().put("deviceId", deviceId).put("phoneAvailable", sensor)
                                .put("phonePermission", permission).put("phoneEnabled", enabled).put("phoneRunning", running)
                                .put("phoneNotificationVisible", StepSensorService.notificationVisible(activity))
                                .put("healthEnabled", StepLedger.healthEnabled(activity, uid))
                                .put("healthAvailability", availability).put("healthState", state).put("records", rows);
                        emit(request, true, result, null);
                    } catch (Exception e) { emit(request, false, null, "Could not read step history safely."); }
                });
            } catch (Exception e) { emit(request, false, null, "Step history needs recovery. No data was overwritten."); }
        });
    }
    @JavascriptInterface public void connectHealth(String request, String uid) {
        if (!validRequest(request)) return;
        activity.runOnUiThread(() -> {
            if (!current(uid)) { emit(request, false, null, "Sign in to connect Health Connect."); return; }
            health.connect(uid, (ok, message) -> emit(request, ok, new JSONObject(), message));
        });
    }
    @JavascriptInterface public void disconnectHealth(String request, String uid) {
        if (!validRequest(request)) return;
        activity.runOnUiThread(() -> {
            if (!current(uid)) { emit(request, false, null, "Account changed."); return; }
            try { StepLedger.endHealth(activity, uid); emit(request, true, new JSONObject(), null); }
            catch (Exception e) { emit(request, false, null, "Could not disconnect safely."); }
        });
    }
    @JavascriptInterface public void connectPhone(String request, String uid) {
        if (!validRequest(request)) return;
        activity.runOnUiThread(() -> {
            if (!current(uid)) { emit(request, false, null, "Sign in to start step tracking."); return; }
            if (!StepSensorService.hasSensor(activity)) { emit(request, false, null, "This phone has no supported step counter."); return; }
            if (!StepSensorService.hasPermission(activity)) {
                if (pendingRequest != null) { emit(request, false, null, "A permission request is already open."); return; }
                pendingRequest = request; pendingUid = uid;
                try { activity.requestPermissions(new String[]{"android.permission.ACTIVITY_RECOGNITION"}, ACTIVITY_PERMISSION); }
                catch (Exception e) { pendingRequest = null; pendingUid = null; emit(request, false, null, "Could not request physical activity permission."); }
            } else startPhone(request, uid);
        });
    }
    private void startPhone(String request, String uid) {
        if (!current(uid)) { emit(request, false, null, "Account changed. Step tracking was not started."); return; }
        try { StepSensorService.start(activity, uid); emit(request, true, new JSONObject(), null); }
        catch (Exception e) { emit(request, false, null, "Could not start phone tracking. Open FitLife and try again."); }
    }
    boolean onPermissionResult(int code, String[] permissions, int[] grants) {
        if (code != ACTIVITY_PERMISSION) return false;
        String request = pendingRequest, uid = pendingUid; pendingRequest = null; pendingUid = null;
        if (request != null) {
            if (grants.length > 0 && grants[0] == PackageManager.PERMISSION_GRANTED) startPhone(request, uid);
            else emit(request, false, null, "Physical activity permission was not granted.");
        }
        return true;
    }
    @JavascriptInterface public void disconnectPhone(String request, String uid) {
        if (!validRequest(request)) return;
        activity.runOnUiThread(() -> {
            if (!current(uid)) { emit(request, false, null, "Account changed."); return; }
            StepSensorService.stop(activity, uid); emit(request, true, new JSONObject(), null);
        });
    }
    void stopForSignOut(String uid) throws Exception {
        if (uid == null) return;
        StepSensorService.stop(activity, uid);
        // Closing the account's Health Connect window is mandatory before a
        // different account can sign in; otherwise its steps might be imported.
        StepLedger.endHealth(activity, uid);
    }
    void destroy() { destroyed = true; }
}
