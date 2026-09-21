package com.arenax.esports;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.util.Log;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "NativeSettings")
public class NativeSettingsPlugin extends Plugin {
    private static final String TAG = "ArenaX_NativeSettings";

    @PluginMethod
    public void openNotificationSettings(PluginCall call) {
        try {
            String packageName = getContext().getPackageName();
            int uid = getContext().getApplicationInfo().uid;
            Log.d(TAG, "Attempting to open notification settings for: " + packageName + " (UID: " + uid + ")");

            Intent intent = new Intent();
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                intent.setAction(Settings.ACTION_APP_NOTIFICATION_SETTINGS);
                intent.putExtra(Settings.EXTRA_APP_PACKAGE, packageName);
                // Also provide compatibility extras for various Android OEM flavors (MIUI, OneUI, EMUI, ColorOS)
                intent.putExtra("app_package", packageName);
                intent.putExtra("app_uid", uid);
                intent.putExtra("android.provider.extra.APP_PACKAGE", packageName);
            } else {
                intent.setAction("android.settings.APP_NOTIFICATION_SETTINGS");
                intent.putExtra("app_package", packageName);
                intent.putExtra("app_uid", uid);
            }

            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            intent.addFlags(Intent.FLAG_ACTIVITY_NO_HISTORY);
            intent.addFlags(Intent.FLAG_ACTIVITY_EXCLUDE_FROM_RECENTS);

            try {
                getContext().startActivity(intent);
                Log.d(TAG, "Successfully started ACTION_APP_NOTIFICATION_SETTINGS intent.");
                JSObject ret = new JSObject();
                ret.put("opened", true);
                ret.put("type", "notification_settings");
                call.resolve(ret);
            } catch (Exception startEx) {
                Log.w(TAG, "ACTION_APP_NOTIFICATION_SETTINGS failed, falling back to ACTION_APPLICATION_DETAILS_SETTINGS", startEx);
                openAppDetailsSettings(call);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error in openNotificationSettings", e);
            try {
                openAppDetailsSettings(call);
            } catch (Exception fallbackEx) {
                call.reject("Failed to open any settings: " + fallbackEx.getMessage(), fallbackEx);
            }
        }
    }

    @PluginMethod
    public void openAppDetailsSettings(PluginCall call) {
        try {
            String packageName = getContext().getPackageName();
            Log.d(TAG, "Opening App Details Settings for: " + packageName);
            
            Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            intent.setData(Uri.fromParts("package", packageName, null));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            
            getContext().startActivity(intent);
            Log.d(TAG, "Successfully started ACTION_APPLICATION_DETAILS_SETTINGS intent.");
            
            JSObject ret = new JSObject();
            ret.put("opened", true);
            ret.put("type", "app_details_settings");
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Failed to open application details settings", e);
            call.reject("Failed to open app details settings: " + e.getMessage(), e);
        }
    }
}
