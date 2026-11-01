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

    private WebView webView;
    private boolean checking;
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
        mainHandler.removeCallbacksAndMessages(null);
        updateExecutor.shutdownNow();
        if (webView != null) {
            webView.removeJavascriptInterface("FitLifeAndroid");
            webView.removeJavascriptInterface("AndroidHaptics");
            webView.destroy();
        }
        super.onDestroy();
    }
}
