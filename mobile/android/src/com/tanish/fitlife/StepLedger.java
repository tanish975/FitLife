package com.tanish.fitlife;

import android.content.Context;
import android.util.AtomicFile;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Iterator;

/** Private, no-backup, per-account step state. An unreadable ledger fails closed. */
final class StepLedger {
    private static final int LIMIT = 1_000_000;
    private static final Object LOCK = new Object();
    private static String hash(String uid) throws Exception {
        if (uid == null || !uid.matches("[A-Za-z0-9_-]{1,128}")) throw new IllegalArgumentException("Invalid account");
        byte[] digest = MessageDigest.getInstance("SHA-256").digest(uid.getBytes(StandardCharsets.UTF_8));
        StringBuilder out = new StringBuilder(); for (byte b : digest) out.append(String.format(java.util.Locale.ROOT, "%02x", b & 255));
        return out.toString();
    }
    private static AtomicFile file(Context context, String uid) throws Exception {
        return new AtomicFile(new File(context.getNoBackupFilesDir(), "fitlife-steps-" + hash(uid) + ".json"));
    }
    private static JSONObject read(Context context, String uid) throws Exception {
        AtomicFile file = file(context, uid);
        File base = file.getBaseFile();
        if (!base.exists() && !new File(base.getPath() + ".bak").exists() && !new File(base.getPath() + ".new").exists())
            return new JSONObject().put("phoneDays", new JSONObject()).put("segments", new JSONArray());
        try (FileInputStream stream = file.openRead(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            byte[] block = new byte[4096]; int n;
            while ((n = stream.read(block)) != -1) { if (out.size() + n > LIMIT) throw new IllegalStateException("Step data is too large"); out.write(block, 0, n); }
            JSONObject value = new JSONObject(out.toString("UTF-8"));
            if (!(value.opt("phoneDays") instanceof JSONObject) || !(value.opt("segments") instanceof JSONArray)) throw new IllegalStateException("Invalid step data");
            return value;
        }
    }
    private static void write(Context context, String uid, JSONObject value) throws Exception {
        byte[] bytes = value.toString().getBytes(StandardCharsets.UTF_8);
        if (bytes.length > LIMIT) throw new IllegalStateException("Step data is too large");
        AtomicFile file = file(context, uid); FileOutputStream stream = file.startWrite();
        try { stream.write(bytes); file.finishWrite(stream); }
        catch (Exception e) { file.failWrite(stream); throw e; }
    }
    static void setPhoneEnabled(Context c, String uid, boolean enabled) throws Exception {
        synchronized (LOCK) { JSONObject value = read(c, uid); value.put("phoneEnabled", enabled); write(c, uid, value); }
    }
    static boolean phoneEnabled(Context c, String uid) {
        synchronized (LOCK) { try { return read(c, uid).optBoolean("phoneEnabled", false); } catch (Exception e) { return false; } }
    }
    static void phoneDay(Context c, String uid, String day, long addition, boolean partial) throws Exception {
        if (day == null || !day.matches("[0-9]{4}-[0-9]{2}-[0-9]{2}") || addition < 0 || addition > 1_000_000) throw new IllegalArgumentException("Invalid step count");
        synchronized (LOCK) {
            JSONObject root = read(c, uid), days = root.getJSONObject("phoneDays");
            JSONObject existing = days.optJSONObject(day);
            if (existing == null) existing = new JSONObject().put("count", 0).put("partial", partial);
            long total = existing.optLong("count", -1) + addition;
            if (total < 0 || total > 1_000_000) throw new IllegalStateException("Unreasonable step total");
            existing.put("count", total).put("partial", existing.optBoolean("partial", false) || partial);
            days.put(day, existing); root.put("phoneDays", days); write(c, uid, root);
        }
    }
    static JSONArray phoneRows(Context c, String uid, String deviceId) throws Exception {
        synchronized (LOCK) {
            JSONObject days = read(c, uid).getJSONObject("phoneDays"); JSONArray result = new JSONArray();
            Iterator<String> keys = days.keys();
            while (keys.hasNext()) {
                String day = keys.next(); JSONObject row = days.getJSONObject(day);
                long count = row.getLong("count");
                if (!day.matches("[0-9]{4}-[0-9]{2}-[0-9]{2}") || count < 0 || count > 1_000_000) throw new IllegalStateException("Invalid step data");
                result.put(new JSONObject().put("deviceId", deviceId).put("dateKey", day).put("source", "phone")
                        .put("count", count).put("partial", row.optBoolean("partial", true)).put("updatedAt", System.currentTimeMillis()));
            }
            return result;
        }
    }
    static boolean healthEnabled(Context c, String uid) throws Exception {
        synchronized (LOCK) {
            JSONArray list = read(c, uid).getJSONArray("segments");
            return list.length() > 0 && list.getJSONObject(list.length() - 1).optLong("end", -1) == 0;
        }
    }
    /** Health Connect is a device-profile data source, not a FitLife-account
     * source. Bind it to its first FitLife account on this Android profile so a
     * later account cannot import another person's Health history. */
    private static boolean checkHealthOwner(Context c, String uid) throws Exception {
        String expected = hash(uid);
        AtomicFile owner = new AtomicFile(new File(c.getNoBackupFilesDir(), "fitlife-health-owner"));
        File base = owner.getBaseFile();
        if (!(base.exists() || new File(base.getPath()+".bak").exists() || new File(base.getPath()+".new").exists())) return false;
        try (FileInputStream input = owner.openRead(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            byte[] b = new byte[128]; int n;
            while ((n = input.read(b)) != -1) { if (out.size()+n > 128) throw new IllegalStateException("Health owner needs recovery"); out.write(b,0,n); }
            String recorded = out.toString("UTF-8");
            if (!recorded.matches("[a-f0-9]{64}")) throw new IllegalStateException("Health owner needs recovery");
            if (!expected.equals(recorded)) throw new SecurityException("Health Connect is linked to another FitLife account on this Android profile.");
        }
        return true;
    }
    static void checkExistingHealthOwner(Context c, String uid) throws Exception { synchronized (LOCK) { checkHealthOwner(c,uid); } }
    private static void claimHealthOwner(Context c, String uid) throws Exception {
        if (checkHealthOwner(c,uid)) return;
        String expected = hash(uid);
        AtomicFile owner = new AtomicFile(new File(c.getNoBackupFilesDir(), "fitlife-health-owner"));
        FileOutputStream output = owner.startWrite();
        try { output.write(expected.getBytes(StandardCharsets.US_ASCII)); owner.finishWrite(output); }
        catch (Exception e) { owner.failWrite(output); throw e; }
    }
    static void beginHealth(Context c, String uid) throws Exception {
        synchronized (LOCK) {
            claimHealthOwner(c, uid);
            JSONObject root = read(c, uid); JSONArray list = root.getJSONArray("segments");
            if (list.length() > 0 && list.getJSONObject(list.length() - 1).optLong("end", -1) == 0) return;
            if (list.length() >= 500) throw new IllegalStateException("Too many tracking sessions");
            list.put(new JSONObject().put("start", System.currentTimeMillis()).put("end", 0));
            root.put("segments", list); write(c, uid, root);
        }
    }
    static void endHealth(Context c, String uid) throws Exception {
        synchronized (LOCK) {
            JSONObject root = read(c, uid); JSONArray list = root.getJSONArray("segments");
            if (list.length() == 0) return;
            JSONObject last = list.getJSONObject(list.length() - 1);
            if (last.optLong("end", -1) != 0) return;
            last.put("end", Math.max(System.currentTimeMillis(), last.getLong("start") + 1));
            list.put(list.length() - 1, last); root.put("segments", list); write(c, uid, root);
        }
    }
    static JSONArray healthSegments(Context c, String uid) throws Exception {
        synchronized (LOCK) { return new JSONArray(read(c, uid).getJSONArray("segments").toString()); }
    }
    static JSONObject reminders(Context c, String uid) throws Exception {
        synchronized (LOCK) {
            JSONObject root = read(c, uid), saved = root.optJSONObject("reminders");
            JSONObject out = new JSONObject();
            for (String kind : new String[]{"workout", "water"}) {
                JSONObject item = saved == null ? null : saved.optJSONObject(kind);
                int fallbackHour = "workout".equals(kind) ? 8 : 12;
                int hour = item == null ? fallbackHour : item.optInt("hour", fallbackHour);
                int minute = item == null ? 0 : item.optInt("minute", 0);
                if (hour < 0 || hour > 23 || minute < 0 || minute > 59) throw new IllegalStateException("Invalid reminder");
                out.put(kind, new JSONObject().put("enabled", item != null && item.optBoolean("enabled", false)).put("hour", hour).put("minute", minute));
            }
            return out;
        }
    }
    static void setReminder(Context c, String uid, String kind, boolean enabled, int hour, int minute) throws Exception {
        if (!("workout".equals(kind) || "water".equals(kind)) || hour < 0 || hour > 23 || minute < 0 || minute > 59) throw new IllegalArgumentException("Invalid reminder");
        synchronized (LOCK) {
            JSONObject root = read(c, uid), reminders = reminders(c, uid);
            reminders.put(kind, new JSONObject().put("enabled", enabled).put("hour", hour).put("minute", minute));
            root.put("reminders", reminders); write(c, uid, root);
        }
    }
    private static AtomicFile activeFile(Context c) { return new AtomicFile(new File(c.getNoBackupFilesDir(), "fitlife-steps-active")); }
    static void setActiveAccount(Context c, String uid) throws Exception {
        synchronized (LOCK) {
            AtomicFile file = activeFile(c);
            if (uid == null) { file.delete(); return; }
            hash(uid); FileOutputStream stream = file.startWrite();
            try { stream.write(uid.getBytes(StandardCharsets.US_ASCII)); file.finishWrite(stream); }
            catch (Exception e) { file.failWrite(stream); throw e; }
        }
    }
    static String activeAccount(Context c) {
        synchronized (LOCK) { try (FileInputStream stream = activeFile(c).openRead()) {
            byte[] bytes = new byte[129]; int n = stream.read(bytes);
            String uid = n > 0 ? new String(bytes, 0, n, StandardCharsets.US_ASCII) : null;
            hash(uid); return uid;
        } catch (Exception e) { return null; } }
    }
}
