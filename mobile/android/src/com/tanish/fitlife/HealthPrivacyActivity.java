package com.tanish.fitlife;

import android.app.Activity;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

/** Privacy rationale linked from the Android Health Connect permissions screen. */
public final class HealthPrivacyActivity extends Activity {
    @Override protected void onCreate(Bundle state) {
        super.onCreate(state);
        int pad = (int)(24 * getResources().getDisplayMetrics().density);
        ScrollView scroll = new ScrollView(this);
        LinearLayout box = new LinearLayout(this); box.setOrientation(LinearLayout.VERTICAL); box.setPadding(pad, pad, pad, pad);
        TextView title = new TextView(this); title.setText("FitLife and your steps"); title.setTextSize(24); title.setTypeface(null, android.graphics.Typeface.BOLD); box.addView(title);
        TextView text = new TextView(this); text.setTextSize(16); text.setLineSpacing(4, 1.08f);
        text.setText("Health Connect is optional. After you connect it, FitLife reads this Android profile's step totals using Health Connect's aggregate API; it does not write health records. These totals can include activity recorded by other apps on this profile. Health Connect is linked to the first FitLife account that connects on this Android profile, not a later account. FitLife reads a day's total only if that account has stayed connected since local midnight; the first day may have no Health Connect reading.\n\n"
                + "If you separately enable the phone sensor, FitLife requests physical activity access and runs a foreground tracking service. Android may hide its notification if notification permission is off. Counts can be incomplete when tracking is interrupted. FitLife does not add overlapping sensor and Health Connect counts.\n\n"
                + "Daily step totals are stored with your FitLife account and synced through Firebase when online. Data is protected in transit and at rest, but is not end-to-end encrypted; the project owner can access it. An optional encrypted backup can be saved on your device.\n\n"
                + "Disconnect either source in FitLife. You can also revoke permissions in Android settings or Health Connect. Signing out stops phone tracking and closes the Health Connect tracking window for that account.");
        box.addView(text);
        Button close = new Button(this); close.setText("Close"); close.setOnClickListener(v -> finish()); box.addView(close);
        scroll.addView(box); setContentView(scroll);
    }
}
