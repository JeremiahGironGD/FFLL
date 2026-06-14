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
        // Update checking is handled by the web layer (updateChecker.js)
        // to support custom loading animations and unified behavior.
    }
}
