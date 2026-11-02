package com.tanish.fitlife;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public final class ReminderReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context context, Intent intent) {
        if (intent == null) return;
        ReminderScheduler.deliver(context, intent.getStringExtra("uid"), intent.getStringExtra("kind"));
    }
}
