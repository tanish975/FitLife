package com.tanish.fitlife;

/** Bounded chunk buffer for an encrypted envelope crossing the WebView bridge. */
final class BackupTransfer {
    static final int MAX_BYTES = 4_000_000;
    static final int MAX_CHUNK = 65_536;
    private StringBuilder chunks;
    private int expected;
    synchronized boolean begin(int length) {
        if (length <= 0 || length > MAX_BYTES || chunks != null) return false;
        expected = length; chunks = new StringBuilder(length); return true;
    }
    synchronized void abort() { chunks = null; expected = 0; }
    synchronized boolean append(String part) {
        if (chunks == null || part == null || part.length() > MAX_CHUNK || chunks.length() + part.length() > expected) { abort(); return false; }
        // The encrypted envelope is ASCII; reject other input rather than
        // accidentally sending untrusted Unicode into evaluateJavascript.
        for (int i = 0; i < part.length(); i++) if (part.charAt(i) > 127) { abort(); return false; }
        chunks.append(part); return true;
    }
    synchronized String finish() {
        if (chunks == null || chunks.length() != expected) { abort(); return null; }
        String result = chunks.toString(); abort(); return result;
    }
}
