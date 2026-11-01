package org.json;

import java.util.HashMap;
import java.util.Map;

/** Tiny JVM-only stand-in for the Android JSON API used by ReleaseParser. */
public final class JSONObject {
    private final Map<String, Object> values = new HashMap<>();
    public JSONObject put(String key, Object value) { values.put(key, value); return this; }
    public boolean optBoolean(String key) { return Boolean.TRUE.equals(values.get(key)); }
    public String optString(String key, String fallback) {
        Object value = values.get(key); return value instanceof String ? (String) value : fallback;
    }
    public long optLong(String key, long fallback) {
        Object value = values.get(key); return value instanceof Number ? ((Number) value).longValue() : fallback;
    }
    public JSONArray optJSONArray(String key) {
        Object value = values.get(key); return value instanceof JSONArray ? (JSONArray) value : null;
    }
}
