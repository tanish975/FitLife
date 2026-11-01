package com.tanish.fitlife;

import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.json.JSONArray;
import org.json.JSONObject;

/** Validates the GitHub release before offering an install to the user. */
public final class ReleaseParser {
    // The release workflow places the Android versionCode in the patch part.
    private static final Pattern TAG = Pattern.compile("^v[0-9]{1,4}\\.[0-9]{1,4}\\.([1-9][0-9]{0,9})$");
    private static final long MAX_ANDROID_VERSION = 2100000000L;
    private ReleaseParser() {}

    /** Returns a positive versionCode only for a stable, fully uploaded APK. */
    public static int installableVersion(JSONObject release) {
        if (release == null || release.optBoolean("draft") || release.optBoolean("prerelease")) return -1;
        Matcher match = TAG.matcher(release.optString("tag_name", ""));
        if (!match.matches()) return -1;
        final long version;
        try { version = Long.parseLong(match.group(1)); }
        catch (NumberFormatException ignored) { return -1; }
        if (version <= 0 || version > MAX_ANDROID_VERSION) return -1;
        JSONArray assets = release.optJSONArray("assets");
        if (assets == null) return -1;
        for (int i = 0; i < assets.length(); i++) {
            JSONObject item = assets.optJSONObject(i);
            if (item != null && "FitLife.apk".equals(item.optString("name", ""))
                    && "uploaded".equals(item.optString("state", "")) && item.optLong("size", 0) > 0) {
                return (int) version;
            }
        }
        return -1;
    }
}
