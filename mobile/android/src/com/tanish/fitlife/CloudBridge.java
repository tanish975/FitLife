package com.tanish.fitlife;

import android.app.Activity;
import android.os.CancellationSignal;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import androidx.annotation.NonNull;
import androidx.credentials.ClearCredentialStateRequest;
import androidx.credentials.Credential;
import androidx.credentials.CredentialManager;
import androidx.credentials.CredentialManagerCallback;
import androidx.credentials.CustomCredential;
import androidx.credentials.GetCredentialRequest;
import androidx.credentials.GetCredentialResponse;
import androidx.credentials.exceptions.ClearCredentialException;
import androidx.credentials.exceptions.GetCredentialException;

import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption;
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;
import com.google.firebase.auth.GoogleAuthProvider;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import javax.net.ssl.HttpsURLConnection;

/**
 * Narrow native boundary: Google and Firebase tokens never enter WebView JS.
 * Firestore requests are bound to the native FirebaseAuth UID, not a JS UID.
 * A server read precedes each JS-managed sync; offline work stays on-device.
 */
final class CloudBridge {
    private static final String PROJECT = "fitlife-b038b";
    private static final int MAX_PAYLOAD_BYTES = 500_000;
    private static final int MAX_RESPONSE_BYTES = 8_000_000;
    private static final int MAX_DEVICES = 10;
    private final Activity activity;
    private final WebView webView;
    private final CredentialManager credentialManager;
    private final ExecutorService network = Executors.newSingleThreadExecutor();
    private boolean authBusy; // confined to the activity's UI thread
    private volatile boolean destroyed;
    private String installationId;

    CloudBridge(Activity activity, WebView webView) {
        this.activity = activity;
        this.webView = webView;
        this.credentialManager = CredentialManager.create(activity);
    }

    private static boolean validRequest(String id) {
        return id != null && id.matches("[A-Za-z0-9_-]{1,80}");
    }
    private static boolean validUid(String uid) {
        return uid != null && !"__fitlife_guest_v1__".equals(uid) && uid.matches("[A-Za-z0-9_-]{1,128}");
    }
    private void emit(String request, boolean ok, JSONObject result, String error) {
        if (!validRequest(request) || destroyed) return;
        try {
            JSONObject detail = new JSONObject().put("requestId", request).put("ok", ok);
            if (ok) detail.put("result", result == null ? JSONObject.NULL : result);
            else detail.put("error", error == null ? "Please try again." : error);
            // Base64 keeps JSON data out of the JavaScript program itself. TextDecoder
            // restores UTF-8 names/foods without exposing a token or evaluating content.
            String encoded = Base64.encodeToString(detail.toString().getBytes(StandardCharsets.UTF_8), Base64.NO_WRAP);
            String script = "window.dispatchEvent(new CustomEvent('fitlife-cloud-result',{detail:JSON.parse(new TextDecoder().decode(Uint8Array.from(atob("
                    + JSONObject.quote(encoded) + "),c=>c.charCodeAt(0))))}));";
            activity.runOnUiThread(() -> { if (!destroyed) webView.evaluateJavascript(script, null); });
        } catch (Exception ignored) { /* Do not leak data or tokens into logs. */ }
    }
    private JSONObject describe(FirebaseUser user) throws Exception {
        if (user == null) return new JSONObject().put("signedIn", false);
        if (!validUid(user.getUid())) throw new IllegalStateException("Unsupported account ID.");
        return new JSONObject().put("signedIn", true).put("uid", user.getUid())
                .put("name", user.getDisplayName() == null ? "" : user.getDisplayName())
                .put("email", user.getEmail() == null ? "" : user.getEmail());
    }
    private boolean stillUser(String uid) {
        FirebaseUser current = FirebaseAuth.getInstance().getCurrentUser();
        return current != null && uid.equals(current.getUid());
    }
    @JavascriptInterface public void session(String request) {
        if (!validRequest(request)) return;
        try { emit(request, true, describe(FirebaseAuth.getInstance().getCurrentUser()), null); }
        catch (Exception e) { emit(request, false, null, "Could not restore the Google session."); }
    }
    @JavascriptInterface public void signIn(String request) {
        if (!validRequest(request)) return;
        activity.runOnUiThread(() -> {
            if (destroyed || authBusy) { emit(request, false, null, "Sign-in is already in progress."); return; }
            authBusy = true;
            try {
                GetSignInWithGoogleOption google = new GetSignInWithGoogleOption.Builder(
                        activity.getString(R.string.default_web_client_id)).build();
                GetCredentialRequest authRequest = new GetCredentialRequest.Builder().addCredentialOption(google).build();
                credentialManager.getCredentialAsync(activity, authRequest, new CancellationSignal(),
                        command -> activity.runOnUiThread(command), new CredentialManagerCallback<GetCredentialResponse, GetCredentialException>() {
                    @Override public void onResult(GetCredentialResponse response) {
                        try {
                            Credential credential = response.getCredential();
                            if (!(credential instanceof CustomCredential) || !GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL.equals(credential.getType()))
                                throw new IllegalStateException("Unexpected credential type");
                            String idToken = GoogleIdTokenCredential.createFrom(credential.getData()).getIdToken();
                            FirebaseAuth.getInstance().signInWithCredential(GoogleAuthProvider.getCredential(idToken, null))
                                    .addOnCompleteListener(activity, task -> {
                                        authBusy = false;
                                        if (!task.isSuccessful() || task.getResult() == null) {
                                            emit(request, false, null, "Google sign-in could not be verified. Check your connection and try again."); return;
                                        }
                                        try { emit(request, true, describe(task.getResult().getUser()), null); }
                                        catch (Exception e) { FirebaseAuth.getInstance().signOut(); emit(request, false, null, "Could not use this account."); }
                                    });
                        } catch (Exception e) { authBusy = false; emit(request, false, null, "Google sign-in could not be completed. Please try again."); }
                    }
                    @Override public void onError(@NonNull GetCredentialException e) {
                        authBusy = false;
                        emit(request, false, null, "Google sign-in was cancelled or unavailable. Check Google Play services and try again.");
                    }
                });
            } catch (Exception e) { authBusy = false; emit(request, false, null, "Google sign-in is unavailable on this device."); }
        });
    }
    @JavascriptInterface public void signOut(String request) {
        if (!validRequest(request)) return;
        activity.runOnUiThread(() -> {
            if (authBusy) { emit(request, false, null, "Wait for sign-in to finish first."); return; }
            FirebaseAuth.getInstance().signOut();
            try {
                credentialManager.clearCredentialStateAsync(new ClearCredentialStateRequest(), null, command -> activity.runOnUiThread(command),
                        new CredentialManagerCallback<Void, ClearCredentialException>() {
                    @Override public void onResult(Void ignored) { }
                    @Override public void onError(@NonNull ClearCredentialException ignored) { }
                });
            } catch (Exception ignored) { /* Firebase sign-out already succeeded. */ }
            emit(request, true, new JSONObject(), null);
        });
    }
    private synchronized String deviceId() throws Exception {
        if (installationId != null) return installationId;
        // Excluded from Android's auto-backup: cloning a backup must not create
        // two devices writing the same Firestore document.
        File file = new File(activity.getNoBackupFilesDir(), "fitlife-installation-id");
        if (file.isFile()) {
            try (FileInputStream in = new FileInputStream(file)) {
                byte[] bytes = new byte[64]; int n = in.read(bytes);
                String existing = n > 0 ? new String(bytes, 0, n, StandardCharsets.US_ASCII) : "";
                if (existing.matches("[a-f0-9]{32}")) return installationId = existing;
            }
            throw new IllegalStateException("The installation ID is invalid.");
        }
        byte[] random = new byte[16]; new SecureRandom().nextBytes(random);
        StringBuilder out = new StringBuilder(); for (byte b : random) out.append(String.format(java.util.Locale.ROOT, "%02x", b & 0xff));
        String made = out.toString();
        try (FileOutputStream stream = new FileOutputStream(file)) {
            stream.write(made.getBytes(StandardCharsets.US_ASCII)); stream.getFD().sync();
        }
        return installationId = made;
    }
    private interface AuthenticatedWork { void run(String uid, String token) throws Exception; }
    private void withToken(String request, String expectedUid, AuthenticatedWork work) {
        FirebaseUser user = FirebaseAuth.getInstance().getCurrentUser();
        if (user == null || !validUid(user.getUid())) { emit(request, false, null, "Sign in with Google first."); return; }
        String uid = user.getUid();
        // Bind every request to the account whose local data JS captured. If the
        // native session switches between capture and this call, fail closed.
        if (!validUid(expectedUid) || !uid.equals(expectedUid)) { emit(request, false, null, "Account changed; sync was stopped."); return; }
        user.getIdToken(false).addOnCompleteListener(task -> {
            if (destroyed) return;
            if (!task.isSuccessful() || task.getResult() == null || task.getResult().getToken() == null || !stillUser(uid)) {
                emit(request, false, null, "Could not verify this Google session. Sign in again when online."); return;
            }
            String token = task.getResult().getToken();
            try { network.execute(() -> {
                if (!stillUser(uid)) { emit(request, false, null, "Account changed; sync was stopped."); return; }
                try { work.run(uid, token); }
                catch (CloudException e) { emit(request, false, null, e.getMessage()); }
                catch (Exception e) { emit(request, false, null, "Cloud sync is offline or unavailable. Your data stays on this device."); }
            }); } catch (java.util.concurrent.RejectedExecutionException ignored) { /* Activity was closed. */ }
        });
    }
    private static final class CloudException extends Exception { CloudException(String message) { super(message); } }
    private JSONObject request(String method, String path, String token, JSONObject body) throws Exception {
        String base = "https://firestore.googleapis.com/v1/projects/" + PROJECT + "/databases/(default)/documents";
        URL url = new URL(base + (path.startsWith(":") ? path : "/" + path));
        HttpsURLConnection c = (HttpsURLConnection) url.openConnection();
        c.setRequestMethod(method); c.setConnectTimeout(12000); c.setReadTimeout(20000); c.setInstanceFollowRedirects(false);
        c.setRequestProperty("Authorization", "Bearer " + token); c.setRequestProperty("Accept", "application/json");
        try {
            if (body != null) {
                c.setDoOutput(true); c.setRequestProperty("Content-Type", "application/json; charset=utf-8");
                try (OutputStream out = c.getOutputStream()) { out.write(body.toString().getBytes(StandardCharsets.UTF_8)); }
            }
            int status = c.getResponseCode();
            if (status == 401) throw new CloudException("Your Google session needs to be renewed. Sign in again.");
            if (status == 403) throw new CloudException("Cloud access is denied. Publish FitLife's owner-only Firestore rules first.");
            if (status == 404) throw new CloudException("The Firestore database was not found. Create it before syncing.");
            if (status == 429) throw new CloudException("Cloud quota reached. Data remains on this device; try again later.");
            if (status < 200 || status >= 300) throw new CloudException("Cloud sync is unavailable. Your data stays on this device.");
            try (InputStream in = c.getInputStream(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
                byte[] buf = new byte[8192]; int n, total = 0;
                while ((n = in.read(buf)) != -1) { total += n; if (total > MAX_RESPONSE_BYTES) throw new CloudException("Cloud data is too large to sync safely."); out.write(buf, 0, n); }
                return new JSONObject(out.toString("UTF-8"));
            }
        } finally { c.disconnect(); }
    }
    @JavascriptInterface public void pull(String requestId, String expectedUid) {
        if (!validRequest(requestId)) return;
        withToken(requestId, expectedUid, (uid, token) -> {
            JSONObject response = request("GET", "users/" + uid + "/devices?pageSize=" + (MAX_DEVICES + 1), token, null);
            JSONArray documents = response.optJSONArray("documents");
            if (documents == null) documents = new JSONArray();
            if (documents.length() > MAX_DEVICES || response.has("nextPageToken"))
                throw new CloudException("Too many devices to sync safely. Your data remains on this device.");
            JSONArray snapshots = new JSONArray();
            for (int i = 0; i < documents.length(); i++) {
                JSONObject doc = documents.getJSONObject(i); String name = doc.optString("name", "");
                String prefix = "projects/" + PROJECT + "/databases/(default)/documents/users/" + uid + "/devices/";
                if (!name.startsWith(prefix)) throw new CloudException("Cloud data could not be verified.");
                String device = name.substring(prefix.length());
                JSONObject fields = doc.getJSONObject("fields"); String schema = fields.getJSONObject("schema").optString("integerValue", "");
                String payload = fields.getJSONObject("payload").getString("stringValue");
                if (!device.matches("[a-f0-9]{32}") || !"1".equals(schema) || payload.getBytes(StandardCharsets.UTF_8).length > MAX_PAYLOAD_BYTES)
                    throw new CloudException("Cloud data is invalid or too large; nothing was overwritten.");
                snapshots.put(new JSONObject().put("deviceId", device).put("payload", payload));
            }
            if (!stillUser(uid)) throw new CloudException("Account changed; sync was stopped.");
            emit(requestId, true, new JSONObject().put("uid", uid).put("deviceId", deviceId()).put("snapshots", snapshots), null);
        });
    }
    @JavascriptInterface public void push(String requestId, String expectedUid, String payload) {
        if (!validRequest(requestId)) return;
        if (payload == null || payload.getBytes(StandardCharsets.UTF_8).length > MAX_PAYLOAD_BYTES) {
            emit(requestId, false, null, "This device's data is too large for cloud sync. Keep an encrypted local backup."); return;
        }
        try { if (new JSONObject(payload).optInt("schema", -1) != 1) throw new Exception(); }
        catch (Exception e) { emit(requestId, false, null, "Cloud data is invalid; nothing was uploaded."); return; }
        withToken(requestId, expectedUid, (uid, token) -> {
            JSONObject fields = new JSONObject()
                    .put("schema", new JSONObject().put("integerValue", "1"))
                    .put("payload", new JSONObject().put("stringValue", payload));
            String name = "projects/" + PROJECT + "/databases/(default)/documents/users/" + uid + "/devices/" + deviceId();
            JSONObject document = new JSONObject().put("name", name).put("fields", fields);
            JSONObject commit = new JSONObject().put("writes", new JSONArray().put(new JSONObject().put("update", document)));
            request("POST", ":commit", token, commit);
            if (!stillUser(uid)) throw new CloudException("Account changed; sync was stopped.");
            emit(requestId, true, new JSONObject().put("uid", uid), null);
        });
    }
    void destroy() { destroyed = true; network.shutdownNow(); }
}
