package com.atsrs.app;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.Gravity;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import androidx.core.view.WindowCompat;
import androidx.webkit.WebViewCompat;

public final class LauncherActivity extends Activity {
    private static final int MINIMUM_WEBVIEW_MAJOR = 100;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        String versionName = currentWebViewVersion();
        if (majorVersion(versionName) >= MINIMUM_WEBVIEW_MAJOR) {
            startActivity(new Intent(this, MainActivity.class));
            finish();
            return;
        }
        showCompatibilityNotice(versionName);
    }

    private String currentWebViewVersion() {
        try {
            android.content.pm.PackageInfo webViewPackage = WebViewCompat.getCurrentWebViewPackage(this);
            return webViewPackage == null ? "unknown" : webViewPackage.versionName;
        } catch (Exception ignored) {
            return "unknown";
        }
    }

    static int majorVersion(String versionName) {
        if (versionName == null) return 0;
        try { return Integer.parseInt(versionName.split("\\.")[0]); }
        catch (RuntimeException ignored) { return 0; }
    }

    @SuppressWarnings("deprecation")
    private void showCompatibilityNotice(String detectedVersion) {
        getWindow().setStatusBarColor(Color.rgb(238, 244, 251));
        WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView()).setAppearanceLightStatusBars(true);

        int padding = Math.round(28 * getResources().getDisplayMetrics().density);
        LinearLayout content = new LinearLayout(this);
        content.setOrientation(LinearLayout.VERTICAL);
        content.setGravity(Gravity.CENTER_VERTICAL);
        content.setPadding(padding, padding, padding, padding);
        content.setBackgroundColor(Color.rgb(238, 244, 251));

        TextView title = new TextView(this);
        title.setText("ATSRS needs a WebView update");
        title.setTextSize(26);
        title.setTextColor(Color.rgb(8, 38, 87));
        title.setTypeface(title.getTypeface(), android.graphics.Typeface.BOLD);

        TextView message = new TextView(this);
        message.setText("The ATSRS APK is installed, but this device's Android System WebView or Chrome is too old to display it securely. Update that system component, then open ATSRS again.\n\nDetected WebView: " + detectedVersion + "\nRequired version: 100 or newer");
        message.setTextSize(17);
        message.setTextColor(Color.rgb(69, 91, 124));
        message.setPadding(0, padding / 2, 0, padding);

        Button update = new Button(this);
        update.setText("Update WebView / Chrome");
        update.setAllCaps(false);
        update.setOnClickListener(view -> openWebViewUpdate());

        content.addView(title, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));
        content.addView(message, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));
        content.addView(update, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));
        setContentView(content);
    }

    private void openWebViewUpdate() {
        Uri marketUri = Uri.parse("market://details?id=com.google.android.webview");
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, marketUri));
        } catch (ActivityNotFoundException ignored) {
            Uri webUri = Uri.parse("https://play.google.com/store/apps/details?id=com.google.android.webview");
            startActivity(new Intent(Intent.ACTION_VIEW, webUri));
        }
    }
}
