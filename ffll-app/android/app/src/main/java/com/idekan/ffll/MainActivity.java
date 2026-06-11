package com.idekan.ffll;

import android.app.AlertDialog;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;

public class MainActivity extends BridgeActivity {
    private static final String GITHUB_API_URL = "https://api.github.com/repos/JeremiahGironGD/FFLL/releases/latest";
    private static final String CURRENT_VERSION = "1.0.0";
    private static final String LAST_UPDATE_CHECK_KEY = "ffll_last_update_check_android";
    private static final long UPDATE_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
    }

    @Override
    public void onResume() {
        super.onResume();
        checkForUpdates();
    }

    private void checkForUpdates() {
        SharedPreferences prefs = getSharedPreferences("ffll_app", Context.MODE_PRIVATE);
        long lastCheck = prefs.getLong(LAST_UPDATE_CHECK_KEY, 0);
        long now = System.currentTimeMillis();

        // Check if we've already checked recently
        if (lastCheck > 0 && (now - lastCheck) < UPDATE_CHECK_INTERVAL_MS) {
            return;
        }

        // Update check timestamp immediately to prevent redundant threads
        prefs.edit().putLong(LAST_UPDATE_CHECK_KEY, now).apply();

        // Run the check in a background thread
        new Thread(() -> {
            try {
                URL url = new URL(GITHUB_API_URL);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("GET");

                conn.setRequestProperty("User-Agent", "FFLL-App");
                conn.setConnectTimeout(5000);
                conn.setReadTimeout(5000);

                int responseCode = conn.getResponseCode();
                if (responseCode != HttpURLConnection.HTTP_OK) {
                    return;
                }

                BufferedReader reader = new BufferedReader(new InputStreamReader(conn.getInputStream()));
                StringBuilder response = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null) {
                    response.append(line);
                }
                reader.close();
                conn.disconnect();

                JSONObject json = new JSONObject(response.toString());
                String tagName = json.getString("tag_name");
                String latestVersion = tagName.replaceAll("^v", "");

                if (isNewerVersion(latestVersion, CURRENT_VERSION)) {
                    runOnUiThread(() -> showUpdateNotification(latestVersion, json));
                }
            } catch (Exception e) {
                // Silently fail
            }
        }).start();
    }

    private boolean isNewerVersion(String latestVersion, String currentVersion) {
        int latest = versionToNumber(latestVersion);
        int current = versionToNumber(currentVersion);
        return latest > current;
    }

    private int versionToNumber(String version) {
        try {
            String[] parts = version.split("\\.");
            int major = parts.length > 0 ? Integer.parseInt(parts[0]) : 0;
            int minor = parts.length > 1 ? Integer.parseInt(parts[1]) : 0;
            int patch = parts.length > 2 ? Integer.parseInt(parts[2]) : 0;
            return major * 10000 + minor * 100 + patch;
        } catch (Exception e) {
            return 0;
        }
    }

    private void showUpdateNotification(String latestVersion, JSONObject json) {
        try {
            String downloadUrl = "https://github.com/JeremiahGironGD/FFLL/releases/latest";

            // Try to find APK download URL
            if (json.has("assets")) {
                JSONArray assets = json.getJSONArray("assets");
                for (int i = 0; i < assets.length(); i++) {
                    JSONObject asset = assets.getJSONObject(i);
                    String name = asset.getString("name");
                    if (name.endsWith(".apk")) {
                        downloadUrl = asset.getString("browser_download_url");
                        break;
                    }
                }
            }

            final String finalUrl = downloadUrl;

            AlertDialog.Builder builder = new AlertDialog.Builder(this);
            builder.setTitle("🚀 Update Available")
                    .setIcon(this.getApplicationInfo().icon)
                    .setMessage("A new version (" + latestVersion + ") of FFLL is available! Update now to get the latest features and improvements.")
                    .setPositiveButton("Update Now", (dialog, which) -> {
                        Intent intent = new Intent(Intent.ACTION_VIEW);
                        intent.setData(Uri.parse(finalUrl));
                        startActivity(intent);
                    })
                    .setNegativeButton("Later", (dialog, which) -> dialog.dismiss())
                    .setCancelable(true)
                    .show();
        } catch (Exception e) {
            // Silently fail
        }
    }
}
