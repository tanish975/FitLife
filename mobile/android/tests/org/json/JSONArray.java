package org.json;

import java.util.ArrayList;
import java.util.List;

/** Tiny JVM-only stand-in for the Android JSON API used by ReleaseParser. */
public final class JSONArray {
    private final List<Object> values = new ArrayList<>();
    public JSONArray put(Object value) { values.add(value); return this; }
    public int length() { return values.size(); }
    public JSONObject optJSONObject(int index) {
        Object value = values.get(index); return value instanceof JSONObject ? (JSONObject) value : null;
    }
}
