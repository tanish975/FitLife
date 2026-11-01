package com.tanish.fitlife;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageInfo;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import javax.net.ssl.HttpsURLConnection;
import org.json.JSONObject;

/** Offline-first WebView wrapper. Remote pages never run inside its JS bridge. */
public final class MainActivity extends Activity {
    private static final String APP_ASSET = "file:///android_asset/index.html";
    private static final String RELEASE_API = "https://api.github.com/repos/tanish975/FitLife/releases/latest";
    private static final String RELEASE_PAGE = "https://github.com/tanish975/FitLife/releases/latest";
    private static final String PREFS = "fitlife_release_updates";
    private static final long AUTO_CHECK_INTERVAL = 6L * 60L * 60L * 1000L;
    private static final int MAX_RESPONSE_BYTES = 256 * 1024;
    private static final int MAX_BACKUP_BYTES = BackupTransfer.MAX_BYTES;
    private static final int BACKUP_CREATE = 19101;
    private static final int BACKUP_OPEN = 19102;

    private WebView webView;
    private CloudBridge cloudBridge;
    private boolean checking;
    private String pendingBackup;
    private final BackupBridge backupBridge = new BackupBridge();
    private final ExecutorService updateExecutor = Executors.newSingleThreadExecutor();
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    @Override protected void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(Color.parseColor("#F5F2EB"));
        getWindow().setNavigationBarColor(Color.parseColor("#F5F2EB"));
        getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | (Build.VERSION.SDK_INT >= 26 ? View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR : 0));

        webView = new WebView(this);
        webView.setBackgroundColor(Color.parseColor("#F5F2EB"));
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true); // needed for the bundled file:///android_asset origin
        settings.setAllowContentAccess(false);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setMediaPlaybackRequiresUserGesture(true);
        webView.setWebChromeClient(new WebChromeClient());
        webView.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if ("file".equalsIgnoreCase(uri.getScheme()) && "/android_asset/index.html".equals(uri.getPath())) return false;
                // HTTPS destinations leave the WebView; untrusted remote content
                // must never receive either of the native JavaScript bridges.
                if (request.isForMainFrame() && "https".equalsIgnoreCase(uri.getScheme())) openExternal(uri);
                return true;
            }
        });
        webView.addJavascriptInterface(new HapticBridge(this), "AndroidHaptics");
        webView.addJavascriptInterface(new UpdateBridge(), "FitLifeAndroid");
        webView.addJavascriptInterface(backupBridge, "FitLifeBackup");
        cloudBridge = new CloudBridge(this, webView);
        webView.addJavascriptInterface(cloudBridge, "FitLifeCloud");
        setContentView(webView);
        webView.loadUrl(APP_ASSET); // same origin as the previous FitLife APK
        mainHandler.postDelayed(() -> checkForUpdates(false), 2500);
    }

    private void openExternal(Uri uri) {
        try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); }
        catch (ActivityNotFoundException ignored) { Toast.makeText(this, "No browser is available.", Toast.LENGTH_LONG).show(); }
    }

    private SharedPreferences updatePrefs() { return getSharedPreferences(PREFS, MODE_PRIVATE); }
    private boolean automaticChecksEnabled() { return updatePrefs().getBoolean("automatic", true); }
    private long installedCode() {
        try {
            PackageInfo info = getPackageManager().getPackageInfo(getPackageName(), 0);
            return Build.VERSION.SDK_INT >= 28 ? info.getLongVersionCode() : info.versionCode;
        } catch (Exception ignored) { return 0; }
    }
    private String installedName() {
        try { return getPackageManager().getPackageInfo(getPackageName(), 0).versionName; }
        catch (Exception ignored) { return "unknown"; }
    }

    private void checkForUpdates(boolean manual) {
        if (checking) {
            if (manual) Toast.makeText(this, "Already checking for updates.", Toast.LENGTH_SHORT).show();
            return;
        }
        if (!manual && !automaticChecksEnabled()) return;
        long now = System.currentTimeMillis();
        long lastAttempt = updatePrefs().getLong("last_attempt", 0);
        if (!manual && now >= lastAttempt && now - lastAttempt < AUTO_CHECK_INTERVAL) return;
        updatePrefs().edit().putLong("last_attempt", now).apply();
        checking = true;
        if (manual) Toast.makeText(this, "Checking GitHub for updates…", Toast.LENGTH_SHORT).show();
        final long currentCode = installedCode();
        updateExecutor.execute(() -> {
            int releaseCode = -1;
            String versionName = "";
            try {
                JSONObject release = fetchLatestRelease();
                releaseCode = ReleaseParser.installableVersion(release);
                if (releaseCode > 0) versionName = release.optString("tag_name", "").substring(1);
            } catch (Exception ignored) { /* Offline, rate-limited or unavailable: leave the app usable. */ }
            final int resultCode = releaseCode;
            final String resultName = versionName;
            mainHandler.post(() -> {
                checking = false;
                if (isFinishing() || isDestroyed()) return;
                if (resultCode > currentCode) {
                    new AlertDialog.Builder(this)
                            .setTitle("FitLife update available")
                            .setMessage("Version " + resultName + " is available on GitHub. Download the APK, then confirm the Android update to keep your local data.")
                            .setPositiveButton("Open GitHub", (dialog, which) -> openExternal(Uri.parse(RELEASE_PAGE)))
                            .setNegativeButton("Later", null).show();
                } else if (manual && resultCode > 0) {
                    new AlertDialog.Builder(this).setTitle("You're up to date")
                            .setMessage("Installed version " + installedName() + ".")
                            .setPositiveButton("OK", null).show();
                } else if (manual) {
                    new AlertDialog.Builder(this).setTitle("Couldn't check for updates")
                            .setMessage("Connect to the internet and try again, or open the FitLife releases page.")
                            .setPositiveButton("Open GitHub", (dialog, which) -> openExternal(Uri.parse(RELEASE_PAGE)))
                            .setNegativeButton("Close", null).show();
                }
            });
        });
    }

    private JSONObject fetchLatestRelease() throws Exception {
        HttpsURLConnection connection = (HttpsURLConnection) new URL(RELEASE_API).openConnection();
        connection.setConnectTimeout(6000);
        connection.setReadTimeout(10000);
        connection.setInstanceFollowRedirects(false);
        connection.setRequestProperty("Accept", "application/vnd.github+json");
        connection.setRequestProperty("User-Agent", "FitLife-Android-Update-Checker");
        try {
            if (connection.getResponseCode() != 200) throw new IllegalStateException("GitHub unavailable");
            try (InputStream input = connection.getInputStream(); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
                byte[] buffer = new byte[4096];
                int count;
                while ((count = input.read(buffer)) != -1) {
                    if (output.size() + count > MAX_RESPONSE_BYTES) throw new IllegalStateException("Response too large");
                    output.write(buffer, 0, count);
                }
                return new JSONObject(new String(output.toByteArray(), StandardCharsets.UTF_8));
            }
        } finally { connection.disconnect(); }
    }

    // Only an encrypted envelope crosses this bridge. Android's document picker
    // grants access to exactly the user-selected file, without filesystem permissions.
    private void backupEvent(String type, String value) {
        if (webView == null || isFinishing() || isDestroyed()) return;
        String js = "window.dispatchEvent(new CustomEvent('fitlife-backup-part',{detail:{type:"
                + JSONObject.quote(type) + ",value:" + JSONObject.quote(value == null ? "" : value) + "}}));";
        webView.evaluateJavascript(js, null);
    }

    private static boolean validEncryptedEnvelope(JSONObject json) {
        if (json.length() != 8 || !"fitlife-encrypted-backup".equals(json.optString("format")) || json.optInt("version") != 1 ||
                !"AES-256-GCM".equals(json.optString("cipher")) || !"PBKDF2-SHA256".equals(json.optString("kdf")) ||
                json.optInt("iterations") != 600000) return false;
        String salt = json.optString("salt"), iv = json.optString("iv"), data = json.optString("data");
        return salt.matches("[A-Za-z0-9+/]{22}==") && iv.matches("[A-Za-z0-9+/]{16}") &&
                data.length() >= 24 && data.length() <= MAX_BACKUP_BYTES && data.matches("[A-Za-z0-9+/]*={0,2}");
    }

    public final class BackupBridge {
        private final BackupTransfer transfer = new BackupTransfer();
        @JavascriptInterface public boolean beginExport(int length) { return transfer.begin(length); }
        @JavascriptInterface public void abortExport() { transfer.abort(); }
        @JavascriptInterface public boolean appendExport(String part) { return transfer.append(part); }
        @JavascriptInterface public boolean finishExport() {
            String value = transfer.finish();
            if (value == null) return false;
            try {
                JSONObject json = new JSONObject(value);
                if (!validEncryptedEnvelope(json)) return false;
            } catch (Exception e) { return false; }
            runOnUiThread(() -> {
                pendingBackup = value;
                Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE)
                        .setType("application/octet-stream").putExtra(Intent.EXTRA_TITLE, "FitLife-backup.fitlife");
                try { startActivityForResult(intent, BACKUP_CREATE); }
                catch (ActivityNotFoundException e) { pendingBackup = null; backupEvent("error", "No file picker is available on this device."); }
            });
            return true;
        }
        @JavascriptInterface public void chooseImport() {
            runOnUiThread(() -> {
                Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("*/*");
                try { startActivityForResult(intent, BACKUP_OPEN); }
                catch (ActivityNotFoundException e) { backupEvent("error", "No file picker is available on this device."); }
            });
        }
    }

    @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != BACKUP_CREATE && requestCode != BACKUP_OPEN) return;
        final String export = pendingBackup; pendingBackup = null;
        if (resultCode != RESULT_OK || data == null || data.getData() == null) { backupEvent("cancel", ""); return; }
        final Uri uri = data.getData();
        if (!"content".equalsIgnoreCase(uri.getScheme())) { backupEvent("error", "Unsupported file location."); return; }
        updateExecutor.execute(() -> {
            try {
                if (requestCode == BACKUP_CREATE) {
                    if (export == null) throw new IllegalStateException("Export expired. Please try again.");
                    try (OutputStream output = getContentResolver().openOutputStream(uri, "w")) {
                        if (output == null) throw new IllegalStateException("Cannot write the selected file.");
                        output.write(export.getBytes(StandardCharsets.UTF_8)); output.flush();
                    }
                    mainHandler.post(() -> backupEvent("saved", "Encrypted backup saved."));
                } else {
                    ByteArrayOutputStream output = new ByteArrayOutputStream();
                    try (InputStream input = getContentResolver().openInputStream(uri)) {
                        if (input == null) throw new IllegalStateException("Cannot read the selected file.");
                        byte[] buffer = new byte[8192]; int count;
                        while ((count = input.read(buffer)) != -1) {
                            if (output.size() + count > MAX_BACKUP_BYTES) throw new IllegalStateException("The selected backup is too large.");
                            output.write(buffer, 0, count);
                        }
                    }
                    final String encrypted = new String(output.toByteArray(), StandardCharsets.UTF_8);
                    for (int i = 0; i < encrypted.length(); i++) if (encrypted.charAt(i) > 127) throw new IllegalStateException("Invalid backup.");
                    if (!validEncryptedEnvelope(new JSONObject(encrypted))) throw new IllegalStateException("Invalid backup.");
                    mainHandler.post(() -> {
                        backupEvent("start", "");
                        for (int offset = 0; offset < encrypted.length(); offset += 32000)
                            backupEvent("chunk", encrypted.substring(offset, Math.min(offset + 32000, encrypted.length())));
                        backupEvent("done", "");
                    });
                }
            } catch (Exception e) { mainHandler.post(() -> backupEvent("error", "Could not access the selected backup file.")); }
        });
    }

    public final class UpdateBridge {
        @JavascriptInterface public String versionName() { return installedName(); }
        @JavascriptInterface public boolean automaticUpdateChecksEnabled() { return automaticChecksEnabled(); }
        @JavascriptInterface public void setAutomaticUpdateChecks(boolean enabled) {
            updatePrefs().edit().putBoolean("automatic", enabled).apply();
        }
        @JavascriptInterface public void checkForUpdates() { runOnUiThread(() -> MainActivity.this.checkForUpdates(true)); }
    }

    public static final class HapticBridge {
        private final Context context;
        HapticBridge(Context context) { this.context = context; }
        @JavascriptInterface public void vibrate(int ms) {
            try {
                Vibrator vibrator = (Vibrator) context.getSystemService(Context.VIBRATOR_SERVICE);
                if (vibrator != null && vibrator.hasVibrator()) {
                    long safeDuration = Math.max(1, Math.min(200, ms));
                    vibrator.vibrate(VibrationEffect.createOneShot(safeDuration, VibrationEffect.DEFAULT_AMPLITUDE));
                }
            } catch (Exception ignored) { /* Haptics are optional. */ }
        }
    }

    @Override public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack(); else super.onBackPressed();
    }

    @Override protected void onDestroy() {
        if (cloudBridge != null) cloudBridge.destroy();
        mainHandler.removeCallbacksAndMessages(null);
        updateExecutor.shutdownNow();
        if (webView != null) {
            webView.removeJavascriptInterface("FitLifeAndroid");
            webView.removeJavascriptInterface("FitLifeBackup");
            webView.removeJavascriptInterface("FitLifeCloud");
            webView.removeJavascriptInterface("AndroidHaptics");
            webView.destroy();
        }
        super.onDestroy();
    }
}
