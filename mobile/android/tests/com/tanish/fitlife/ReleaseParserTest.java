package com.tanish.fitlife;

import org.json.JSONArray;
import org.json.JSONObject;

public final class ReleaseParserTest {
    private static JSONObject asset(String name, String state, long size) {
        return new JSONObject().put("name", name).put("state", state).put("size", size);
    }
    private static JSONObject release(String tag, JSONObject... assets) {
        JSONArray array = new JSONArray();
        for (JSONObject asset : assets) array.put(asset);
        return new JSONObject().put("tag_name", tag).put("assets", array);
    }
    private static void expect(int expected, JSONObject release, String message) {
        int actual = ReleaseParser.installableVersion(release);
        if (actual != expected) throw new AssertionError(message + ": expected " + expected + ", got " + actual);
    }
    public static void main(String[] args) {
        JSONObject good = asset("FitLife.apk", "uploaded", 1234);
        expect(2, release("v1.0.2", good), "valid release tag example");
        expect(3, release("v1.0.3", good), "first release is newer than the local APK");
        expect(42, release("v7.3.42", good), "version code remains monotonic across version names");
        expect(2100000000, release("v1.0.2100000000", good), "Android maximum");
        expect(-1, release("v1.0.2100000001", good), "overflow rejected");
        expect(-1, release("v1.0.0", good), "zero rejected");
        expect(-1, release("1.0.2", good), "unrecognized tag rejected");
        expect(-1, release("v1.0.2-beta", good), "prerelease tag rejected");
        expect(-1, release("v1.0.2", good).put("draft", true), "draft rejected");
        expect(-1, release("v1.0.2", good).put("prerelease", true), "prerelease rejected");
        expect(-1, release("v1.0.2"), "release without APK rejected");
        expect(-1, release("v1.0.2", asset("FitLife.exe", "uploaded", 100)), "wrong asset rejected");
        expect(-1, release("v1.0.2", asset("FitLife.apk", "starter", 100)), "unfinished upload rejected");
        expect(-1, release("v1.0.2", asset("FitLife.apk", "uploaded", 0)), "empty APK rejected");
        expect(-1, null, "null rejected");
        System.out.println("PASS: only a stable uploaded FitLife.apk produces a valid monotonic Android version code.");
    }
}
