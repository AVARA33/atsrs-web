package com.atsrs.app;

import android.app.DownloadManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.Settings;
import androidx.core.content.FileProvider;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileInputStream;
import java.security.MessageDigest;
import java.util.Locale;

@CapacitorPlugin(name = "AtsrsUpdater")
public class AtsrsUpdaterPlugin extends Plugin {
    private static final String RELEASE_HOST = "atsrs.com";
    private static final String RELEASE_PATH_PREFIX = "/downloads/";
    private long activeDownloadId = -1;
    private PluginCall activeCall;
    private File activeFile;
    private String expectedSha256;

    private final BroadcastReceiver downloadReceiver = new BroadcastReceiver() {
        @Override public void onReceive(Context context, Intent intent) {
            long completedId = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1);
            if (completedId == activeDownloadId && activeCall != null) finishDownload();
        }
    };

    @Override public void load() {
        IntentFilter filter = new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE);
        ContextCompat.registerReceiver(getContext(), downloadReceiver, filter, ContextCompat.RECEIVER_NOT_EXPORTED);
    }

    @Override protected void handleOnDestroy() {
        try { getContext().unregisterReceiver(downloadReceiver); } catch (Exception ignored) {}
        super.handleOnDestroy();
    }

    @PluginMethod public void getCurrentVersion(PluginCall call) {
        try {
            PackageManager manager = getContext().getPackageManager();
            var info = manager.getPackageInfo(getContext().getPackageName(), 0);
            long versionCode = Build.VERSION.SDK_INT >= Build.VERSION_CODES.P ? info.getLongVersionCode() : info.versionCode;
            JSObject result = new JSObject();
            result.put("versionName", info.versionName);
            result.put("versionCode", versionCode);
            call.resolve(result);
        } catch (Exception error) { call.reject("Unable to read the installed ATSRS version", error); }
    }

    @PluginMethod public void downloadAndInstall(PluginCall call) {
        if (activeCall != null) { call.reject("An ATSRS update is already downloading", "UPDATE_IN_PROGRESS"); return; }
        String rawUrl = call.getString("url", "");
        String sha256 = call.getString("sha256", "").toLowerCase(Locale.ROOT);
        Integer nextVersionCode = call.getInt("versionCode");
        Uri uri;
        try { uri = Uri.parse(rawUrl); } catch (Exception error) { call.reject("Invalid ATSRS update URL", "INVALID_URL"); return; }
        if (!"https".equals(uri.getScheme()) || !RELEASE_HOST.equals(uri.getHost()) || uri.getPath() == null || !uri.getPath().startsWith(RELEASE_PATH_PREFIX)) {
            call.reject("Updates must come from the official ATSRS download directory", "UNTRUSTED_URL"); return;
        }
        if (!sha256.matches("[0-9a-f]{64}") || nextVersionCode == null || nextVersionCode <= currentVersionCode()) {
            call.reject("The ATSRS update metadata is invalid or is a downgrade", "INVALID_RELEASE"); return;
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !getContext().getPackageManager().canRequestPackageInstalls()) {
            Intent permission = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + getContext().getPackageName()));
            permission.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(permission);
            call.reject("Allow ATSRS to install this approved update, then tap Update again", "INSTALL_PERMISSION_REQUIRED"); return;
        }
        File downloadDirectory = getContext().getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
        if (downloadDirectory == null) { call.reject("Android download storage is unavailable", "STORAGE_UNAVAILABLE"); return; }
        String fileName = uri.getLastPathSegment();
        if (fileName == null || !fileName.matches("atsrs-android-[0-9.]+\\.apk")) { call.reject("The ATSRS release filename is invalid", "INVALID_RELEASE"); return; }
        activeFile = new File(downloadDirectory, fileName);
        if (activeFile.exists() && !activeFile.delete()) { call.reject("The previous update file could not be replaced", "FILE_ERROR"); resetActiveDownload(); return; }
        try {
            DownloadManager.Request request = new DownloadManager.Request(uri)
                .setTitle("ATSRS update").setDescription("Downloading the verified ATSRS Android release")
                .setMimeType("application/vnd.android.package-archive").setAllowedOverMetered(true).setAllowedOverRoaming(false)
                .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED).setDestinationUri(Uri.fromFile(activeFile));
            DownloadManager manager = (DownloadManager) getContext().getSystemService(Context.DOWNLOAD_SERVICE);
            activeCall = call; expectedSha256 = sha256; call.setKeepAlive(true); activeDownloadId = manager.enqueue(request);
        } catch (Exception error) { resetActiveDownload(); call.reject("The ATSRS update download could not start", error); }
    }

    private long currentVersionCode() {
        try {
            var info = getContext().getPackageManager().getPackageInfo(getContext().getPackageName(), 0);
            return Build.VERSION.SDK_INT >= Build.VERSION_CODES.P ? info.getLongVersionCode() : info.versionCode;
        } catch (Exception ignored) { return 0; }
    }

    private void finishDownload() {
        PluginCall call = activeCall;
        try {
            if (activeFile == null || !activeFile.isFile()) throw new IllegalStateException("Downloaded APK is missing");
            String actualSha256 = sha256(activeFile);
            if (!actualSha256.equals(expectedSha256)) { activeFile.delete(); call.reject("ATSRS update verification failed; the file was deleted", "CHECKSUM_MISMATCH"); return; }
            Uri contentUri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", activeFile);
            Intent install = new Intent(Intent.ACTION_VIEW);
            install.setDataAndType(contentUri, "application/vnd.android.package-archive");
            install.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(install);
            JSObject result = new JSObject(); result.put("verified", true); result.put("sha256", actualSha256); call.resolve(result);
        } catch (Exception error) { if (activeFile != null) activeFile.delete(); call.reject("The verified ATSRS installer could not be opened", error); }
        finally { resetActiveDownload(); }
    }

    private String sha256(File file) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256"); byte[] buffer = new byte[8192];
        try (FileInputStream input = new FileInputStream(file)) { int read; while ((read = input.read(buffer)) > 0) digest.update(buffer, 0, read); }
        StringBuilder result = new StringBuilder(); for (byte value : digest.digest()) result.append(String.format(Locale.ROOT, "%02x", value)); return result.toString();
    }

    private void resetActiveDownload() {
        if (activeCall != null) activeCall.setKeepAlive(false);
        activeCall = null; activeDownloadId = -1; activeFile = null; expectedSha256 = null;
    }
}
