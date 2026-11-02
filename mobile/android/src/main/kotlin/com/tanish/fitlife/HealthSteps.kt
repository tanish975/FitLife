package com.tanish.fitlife

import androidx.activity.ComponentActivity
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.request.AggregateRequest
import androidx.health.connect.client.time.TimeRangeFilter
import androidx.lifecycle.lifecycleScope
import com.google.firebase.auth.FirebaseAuth
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId

/** Reads only step aggregates, and only during this account's explicit opt-in
 * windows. Health Connect itself resolves overlapping data sources. */
class HealthSteps(private val activity: ComponentActivity) {
    fun interface ConnectResult { fun done(ok: Boolean, message: String) }
    fun interface ReadResult { fun done(rows: JSONArray?, state: String) }
    private val permission = HealthPermission.getReadPermission(StepsRecord::class)
    private var pendingUid: String? = null
    private var pendingResult: ConnectResult? = null
    private val launcher = activity.registerForActivityResult(PermissionController.createRequestPermissionResultContract()) { granted ->
        val uid = pendingUid
        val callback = pendingResult
        pendingUid = null; pendingResult = null
        if (uid == null || callback == null) return@registerForActivityResult
        if (!current(uid)) { callback.done(false, "Account changed. Try again."); return@registerForActivityResult }
        if (!granted.contains(permission)) { callback.done(false, "Health Connect step permission was not granted."); return@registerForActivityResult }
        try { StepLedger.beginHealth(activity, uid); callback.done(true, "Health Connect connected.") }
        catch (_: SecurityException) { callback.done(false, "Health Connect is linked to another FitLife account on this Android profile. Use the phone sensor or a separate Android profile.") }
        catch (_: Exception) { callback.done(false, "Could not save tracking settings.") }
    }
    private fun current(uid: String) = FirebaseAuth.getInstance().currentUser?.uid == uid
    fun availability(): String = try {
        when (HealthConnectClient.getSdkStatus(activity)) {
            HealthConnectClient.SDK_AVAILABLE -> "available"
            HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED -> "install"
            else -> "unsupported"
        }
    } catch (_: Exception) { "unsupported" }

    fun connect(uid: String, callback: ConnectResult) {
        if (!current(uid)) { callback.done(false, "Sign in to enable tracking."); return }
        try { StepLedger.checkExistingHealthOwner(activity, uid) }
        catch (_: SecurityException) { callback.done(false, "Health Connect is linked to another FitLife account on this Android profile. Use the phone sensor or a separate Android profile."); return }
        catch (_: Exception) { callback.done(false, "Health Connect ownership needs recovery. No data was changed."); return }
        if (availability() != "available") { callback.done(false, "Health Connect is unavailable or needs installation."); return }
        if (pendingResult != null) { callback.done(false, "A permission request is already open."); return }
        activity.lifecycleScope.launch {
            try {
                val client = HealthConnectClient.getOrCreate(activity)
                if (!current(uid)) { callback.done(false, "Account changed. Try again."); return@launch }
                if (client.permissionController.getGrantedPermissions().contains(permission)) {
                    try { StepLedger.beginHealth(activity, uid); callback.done(true, "Health Connect connected.") }
                    catch (_: SecurityException) { callback.done(false, "Health Connect is linked to another FitLife account on this Android profile. Use the phone sensor or a separate Android profile.") }
                } else {
                    pendingUid = uid; pendingResult = callback
                    try { launcher.launch(setOf(permission)) }
                    catch (_: Exception) { pendingUid = null; pendingResult = null; callback.done(false, "Could not open Health Connect permissions.") }
                }
            } catch (_: Exception) { callback.done(false, "Health Connect is unavailable. Try again.") }
        }
    }

    fun disconnect(uid: String) {
        try { StepLedger.endHealth(activity, uid) } catch (_: Exception) { }
    }
    fun read(uid: String, deviceId: String, days: Int, callback: ReadResult) {
        if (!current(uid)) { callback.done(null, "account_changed"); return }
        val available = availability()
        if (available != "available") { callback.done(null, available); return }
        activity.lifecycleScope.launch {
            try {
                if (!StepLedger.healthEnabled(activity, uid)) { callback.done(null, "disabled"); return@launch }
                val client = HealthConnectClient.getOrCreate(activity)
                if (!client.permissionController.getGrantedPermissions().contains(permission)) {
                    StepLedger.endHealth(activity, uid); callback.done(null, "permission"); return@launch
                }
                val segments = StepLedger.healthSegments(activity, uid)
                val now = Instant.now()
                val zone = ZoneId.systemDefault()
                val today = LocalDate.now(zone)
                val earliest = now.minusSeconds(29L * 24 * 3600) // stays within the ordinary Health Connect history window
                val result = JSONArray()
                for (offset in (days.coerceIn(1, 30) - 1) downTo 0) {
                    if (!current(uid)) { callback.done(null, "account_changed"); return@launch }
                    val day = today.minusDays(offset.toLong())
                    val dayStart = day.atStartOfDay(zone).toInstant()
                    val dayEnd = minOf(day.plusDays(1).atStartOfDay(zone).toInstant(), now)
                    // A Health Connect record can span a long interval and be
                    // prorated at a query boundary. To avoid importing a prior
                    // FitLife account's activity, only read days this account
                    // has owned continuously since local midnight. Phone sensor
                    // fallback starts immediately when enabled.
                    if (dayStart.isBefore(earliest)) continue
                    var ownsDay = false
                    for (i in 0 until segments.length()) {
                        val entry = segments.getJSONObject(i)
                        val start = Instant.ofEpochMilli(entry.getLong("start"))
                        val rawEnd = entry.getLong("end")
                        val end = if (rawEnd == 0L) now else Instant.ofEpochMilli(rawEnd)
                        if (!start.isAfter(dayStart) && !end.isBefore(dayEnd)) { ownsDay = true; break }
                    }
                    if (!ownsDay) continue
                    val response = client.aggregate(AggregateRequest(metrics = setOf(StepsRecord.COUNT_TOTAL), timeRangeFilter = TimeRangeFilter.between(dayStart, dayEnd)))
                    val count = response[StepsRecord.COUNT_TOTAL]
                    if (count != null) {
                        if (count < 0 || count > 1_000_000) throw IllegalStateException("Invalid step aggregate")
                        result.put(JSONObject().put("deviceId", deviceId).put("dateKey", day.toString()).put("source", "health")
                            .put("count", count).put("partial", false).put("updatedAt", System.currentTimeMillis()))
                    }
                }
                if (!current(uid)) { callback.done(null, "account_changed"); return@launch }
                callback.done(result, if (result.length() == 0) "no_data" else "ready")
            } catch (_: SecurityException) {
                try { StepLedger.endHealth(activity, uid) } catch (_: Exception) { }
                callback.done(null, "permission")
            } catch (_: Exception) { callback.done(null, "error") }
        }
    }
}
