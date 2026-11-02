package com.tanish.fitlife;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;

/** Resume only an explicitly enabled sensor for the still-signed-in account. */
public final class StepBootReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context context, Intent intent) {
        if (intent == null) return;
        String action = intent.getAction();
        boolean clockChange = Intent.ACTION_TIME_CHANGED.equals(action) || Intent.ACTION_TIMEZONE_CHANGED.equals(action);
        if (!(clockChange || Intent.ACTION_BOOT_COMPLETED.equals(action) || Intent.ACTION_MY_PACKAGE_REPLACED.equals(action))) return;
        ReminderScheduler.restoreCurrent(context);
        if (clockChange) return;
        try {
            String uid = StepLedger.activeAccount(context);
            FirebaseUser user = FirebaseAuth.getInstance().getCurrentUser();
            if (uid != null && user != null && uid.equals(user.getUid()) && StepLedger.phoneEnabled(context, uid)
                    && StepSensorService.hasPermission(context) && StepSensorService.hasSensor(context)) StepSensorService.start(context, uid);
        } catch (Exception ignored) { /* Android may block automatic starts; opening FitLife can retry. */ }
    }
}
