import { App } from '@capacitor/app';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { FileOpener } from '@capacitor-community/file-opener';
import { Capacitor } from '@capacitor/core';

// Configuration constants
const CONFIG_COLLECTION = 'app_config';
const CONFIG_DOC_ID = 'version';
const DEFAULT_LATEST_VERSION = '1.1.0';
const DEFAULT_DOWNLOAD_URL = 'https://github.com/kpllahore123-maker/arenaX/releases/latest/download/ArenaX.apk';
const DEFAULT_RELEASE_NOTES = '• One-Tap auto update system with native APK installer integration\n• Enhanced tournament live match sync\n• Performance optimizations & UI polish';

let isDownloading = false;
let downloadListener = null;
let pendingRemoteConfig = null;

/**
 * Parse any version representation (string or number) into numeric segments.
 * Handles numbers, strings, leading 'v'/'V', whitespace, and prerelease/build suffixes.
 * E.g. "1.0.10" -> [1, 0, 10], "v1.2" -> [1, 2, 0], 1.5 -> [1, 5, 0], "1.1.0-beta.1" -> [1, 1, 0]
 */
function parseVersionSegments(v) {
  if (v === null || v === undefined) return [0, 0, 0];
  let s = String(v).trim();
  // Strip leading 'v' or 'V' and non-digit characters
  s = s.replace(/^[vV\s]+/, '');
  // Strip prerelease and build metadata suffixes (e.g. -beta, +build123)
  s = s.split(/[-+]/)[0].trim();
  if (!s) return [0, 0, 0];

  const parts = s.split('.').map(part => {
    const n = parseInt(part.trim(), 10);
    return isNaN(n) ? 0 : n;
  });

  // Guarantee at least 3 segments (major, minor, patch)
  while (parts.length < 3) {
    parts.push(0);
  }
  return parts;
}

/**
 * Compare two semantic version strings segment-by-segment as numbers.
 * Returns:
 *   -1 if v1 < v2  (v1 is strictly older than v2 -> update available)
 *    0 if v1 === v2 (versions are identical)
 *    1 if v1 > v2  (v1 is newer than v2)
 */
function compareSemver(v1, v2) {
  const segs1 = parseVersionSegments(v1);
  const segs2 = parseVersionSegments(v2);
  const maxLen = Math.max(segs1.length, segs2.length);

  for (let i = 0; i < maxLen; i++) {
    const num1 = i < segs1.length ? segs1[i] : 0;
    const num2 = i < segs2.length ? segs2[i] : 0;

    if (num1 < num2) return -1;
    if (num1 > num2) return 1;
  }
  return 0;
}

/**
 * Returns true ONLY if remoteVer is strictly newer than currentVer
 */
function isOlderVersion(currentVer, remoteVer) {
  return compareSemver(currentVer, remoteVer) === -1;
}

/**
 * Retrieve installed app version via @capacitor/app plugin
 * Android OS provides this from `versionName` defined in `android/app/build.gradle`.
 */
async function getInstalledVersion() {
  let rawInstalled = null;
  try {
    if (Capacitor.isNativePlatform()) {
      const info = await App.getInfo();
      console.log('[AutoUpdate] [App.getInfo] Raw payload from Android OS:', JSON.stringify(info));
      if (info) {
        rawInstalled = info.version;
        console.log(`[AutoUpdate] [App.getInfo] versionName: "${info.version}", versionCode (build): "${info.build}", id: "${info.id}"`);
        if (rawInstalled) {
          const cleaned = String(rawInstalled).trim().replace(/^[vV\s]+/, '');
          return cleaned || '1.1.0';
        }
      }
    } else {
      console.log('[AutoUpdate] [getInstalledVersion] Non-native web platform detected.');
    }
  } catch (err) {
    console.warn('[AutoUpdate] Error reading App.getInfo():', err);
  }

  const fallback = window.ARENAX_INSTALLED_VERSION || localStorage.getItem('arenax_installed_version') || '1.1.0';
  const cleanedFallback = String(fallback).trim().replace(/^[vV\s]+/, '');
  console.log('[AutoUpdate] [getInstalledVersion] Fallback installed version:', cleanedFallback);
  return cleanedFallback || '1.1.0';
}

/**
 * Query Firestore app_config/version document
 */
async function getRemoteVersionConfig() {
  try {
    let db = window.db || window.fbDb;
    if (!db) {
      // Small pause if Firebase is still initializing
      await new Promise(r => setTimeout(r, 600));
      db = window.db || window.fbDb;
    }

    if (db && window.doc && window.getDoc) {
      const docRef = window.doc(db, CONFIG_COLLECTION, CONFIG_DOC_ID);
      const snapshot = await window.getDoc(docRef);
      if (snapshot.exists()) {
        const data = snapshot.data();
        console.log('[AutoUpdate] [Firestore] app_config/version raw document data:', JSON.stringify(data));
        
        // Check all common field naming variations (latestVersion, version, latest_version, appVersion)
        const rawLatest = data.latestVersion !== undefined ? data.latestVersion :
          (data.version !== undefined ? data.version :
          (data.latest_version !== undefined ? data.latest_version :
          (data.appVersion !== undefined ? data.appVersion : null)));

        const latestVersion = rawLatest !== null && rawLatest !== undefined
          ? String(rawLatest).trim().replace(/^[vV\s]+/, '')
          : DEFAULT_LATEST_VERSION;

        return {
          latestVersion: latestVersion || DEFAULT_LATEST_VERSION,
          downloadUrl: data.downloadUrl || data.apkUrl || data.url || DEFAULT_DOWNLOAD_URL,
          releaseNotes: data.releaseNotes || data.notes || DEFAULT_RELEASE_NOTES,
          mandatory: !!data.mandatory,
          fromFirestore: true
        };
      } else {
        console.warn('[AutoUpdate] [Firestore] app_config/version document does not exist. Using fallback defaults.');
      }
    } else {
      console.warn('[AutoUpdate] Firestore db or getDoc function not accessible at this moment.');
    }
  } catch (err) {
    console.warn('[AutoUpdate] Failed to query Firestore app_config/version:', err);
  }

  return {
    latestVersion: DEFAULT_LATEST_VERSION,
    downloadUrl: DEFAULT_DOWNLOAD_URL,
    releaseNotes: DEFAULT_RELEASE_NOTES,
    mandatory: false,
    fromFirestore: false
  };
}

/**
 * Display the Update Available modal
 */
function showUpdateModal(currentVer, remoteConfig) {
  // Never show APK update modal in a plain web browser
  if (!Capacitor.isNativePlatform()) {
    console.log('[AutoUpdate] Blocked showUpdateModal: running on web browser.');
    return;
  }

  pendingRemoteConfig = remoteConfig;
  const modal = document.getElementById('apkUpdateModal');
  if (!modal) return;

  const curVerEl = document.getElementById('apkModalCurrentVersion');
  const tgtVerEl = document.getElementById('apkModalTargetVersion');
  const latVerEl = document.getElementById('apkModalLatestVersion');
  const notesEl = document.getElementById('apkModalReleaseNotes');
  const btnLater = document.getElementById('btnApkUpdateLater');
  const btnCross = document.getElementById('bCloseApkModalCross');
  const progressSection = document.getElementById('apkDownloadProgressSection');
  const errorBox = document.getElementById('apkUpdateErrorBox');
  const unknownGuide = document.getElementById('apkUnknownSourcesGuide');
  const btnUpdateNow = document.getElementById('btnApkUpdateNow');
  const btnUpdateNowText = document.getElementById('btnApkUpdateNowText');
  const fallbackLink = document.getElementById('apkDirectBrowserFallback');

  if (curVerEl) curVerEl.textContent = `v${currentVer}`;
  if (tgtVerEl) tgtVerEl.textContent = `v${remoteConfig.latestVersion}`;
  if (latVerEl) latVerEl.textContent = remoteConfig.latestVersion;
  if (notesEl) notesEl.textContent = remoteConfig.releaseNotes || DEFAULT_RELEASE_NOTES;

  if (fallbackLink) {
    fallbackLink.href = remoteConfig.downloadUrl || DEFAULT_DOWNLOAD_URL;
  }

  // Reset progress and error UI states
  if (progressSection) progressSection.classList.add('hidden');
  if (errorBox) errorBox.classList.add('hidden');
  if (unknownGuide) unknownGuide.classList.add('hidden');

  if (btnUpdateNow) {
    btnUpdateNow.disabled = false;
    btnUpdateNow.classList.remove('opacity-75', 'cursor-not-allowed');
  }
  if (btnUpdateNowText) btnUpdateNowText.textContent = 'Update Now';

  // Handle mandatory update flag
  if (remoteConfig.mandatory) {
    if (btnLater) btnLater.classList.add('hidden');
    if (btnCross) btnCross.classList.add('hidden');
  } else {
    if (btnLater) btnLater.classList.remove('hidden');
    if (btnCross) btnCross.classList.remove('hidden');
  }

  modal.classList.remove('hidden');
}

/**
 * Dismiss the update modal
 */
function hideUpdateModal() {
  if (isDownloading) return;
  const modal = document.getElementById('apkUpdateModal');
  if (modal) modal.classList.add('hidden');
}

/**
 * Download APK file and trigger Android package installer
 */
async function startUpdateDownload(remoteConfig) {
  if (isDownloading) return;
  isDownloading = true;

  const targetConfig = remoteConfig || pendingRemoteConfig || {
    latestVersion: DEFAULT_LATEST_VERSION,
    downloadUrl: DEFAULT_DOWNLOAD_URL,
    releaseNotes: DEFAULT_RELEASE_NOTES
  };

  const progressBar = document.getElementById('apkDownloadProgressBar');
  const progressSection = document.getElementById('apkDownloadProgressSection');
  const statusText = document.getElementById('apkDownloadStatusText');
  const percentText = document.getElementById('apkDownloadPercentText');
  const sizeText = document.getElementById('apkDownloadSizeText');
  const speedText = document.getElementById('apkDownloadSpeedText');
  const btnUpdateNow = document.getElementById('btnApkUpdateNow');
  const btnUpdateNowText = document.getElementById('btnApkUpdateNowText');
  const btnUpdateLater = document.getElementById('btnApkUpdateLater');
  const errorBox = document.getElementById('apkUpdateErrorBox');
  const errorMsg = document.getElementById('apkUpdateErrorMsg');
  const unknownGuide = document.getElementById('apkUnknownSourcesGuide');
  const fallbackLink = document.getElementById('apkDirectBrowserFallback');

  if (errorBox) errorBox.classList.add('hidden');
  if (unknownGuide) unknownGuide.classList.add('hidden');
  if (progressSection) progressSection.classList.remove('hidden');
  if (progressBar) progressBar.style.width = '0%';
  if (percentText) percentText.textContent = '0%';
  if (sizeText) sizeText.textContent = 'Starting download...';
  if (speedText) speedText.textContent = 'Connecting...';
  if (statusText) statusText.innerHTML = '<i class="fas fa-circle-notch fa-spin text-xs text-emerald-400"></i> <span>Initializing download...</span>';

  if (btnUpdateNow) {
    btnUpdateNow.disabled = true;
    btnUpdateNow.classList.add('opacity-75', 'cursor-not-allowed');
  }
  if (btnUpdateNowText) btnUpdateNowText.textContent = 'Downloading...';
  if (btnUpdateLater) btnUpdateLater.classList.add('hidden');

  if (fallbackLink) {
    fallbackLink.href = targetConfig.downloadUrl;
  }

  const isNative = Capacitor.isNativePlatform();

  if (isNative) {
    let lastBytes = 0;
    let lastTime = Date.now();

    try {
      // Proactively show Unknown Sources reminder for Android
      if (unknownGuide) unknownGuide.classList.remove('hidden');

      // Setup download progress listener
      try {
        downloadListener = await Filesystem.addListener('progress', (progress) => {
          if (progress && progress.contentLength > 0) {
            const percent = Math.min(100, Math.round((progress.bytes / progress.contentLength) * 100));
            const curMb = (progress.bytes / (1024 * 1024)).toFixed(1);
            const totalMb = (progress.contentLength / (1024 * 1024)).toFixed(1);
            
            // Calculate speed
            const now = Date.now();
            const timeDiff = (now - lastTime) / 1000;
            if (timeDiff >= 0.5) {
              const speedBytes = (progress.bytes - lastBytes) / timeDiff;
              const speedMb = (speedBytes / (1024 * 1024)).toFixed(1);
              if (speedText) speedText.textContent = `${speedMb} MB/s`;
              lastBytes = progress.bytes;
              lastTime = now;
            }

            if (progressBar) progressBar.style.width = `${percent}%`;
            if (percentText) percentText.textContent = `${percent}%`;
            if (sizeText) sizeText.textContent = `${curMb} MB / ${totalMb} MB`;
            if (statusText) statusText.innerHTML = '<i class="fas fa-arrow-circle-down fa-bounce text-xs text-emerald-400"></i> <span>Downloading ArenaX APK...</span>';
          }
        });
      } catch (listenerErr) {
        console.warn('[AutoUpdate] Progress listener attachment note:', listenerErr);
      }

      // Clean up previous cached APK if present to ensure fresh download
      const fileName = 'ArenaX.apk';
      try {
        await Filesystem.deleteFile({
          path: fileName,
          directory: Directory.Cache
        });
      } catch (cleanupErr) {
        // File may not exist yet in cache, safe to continue
      }

      if (statusText) statusText.innerHTML = '<i class="fas fa-arrow-circle-down fa-bounce text-xs text-emerald-400"></i> <span>Downloading update package...</span>';

      // Construct cache-busted download URL to ensure fresh download from server/CDN
      let apkDownloadUrl = targetConfig.downloadUrl || DEFAULT_DOWNLOAD_URL;
      try {
        const urlObj = new URL(apkDownloadUrl);
        urlObj.searchParams.set('t', Date.now().toString());
        apkDownloadUrl = urlObj.toString();
      } catch (urlErr) {
        // Fallback for relative or malformed URLs
        apkDownloadUrl += (apkDownloadUrl.includes('?') ? '&' : '?') + 't=' + Date.now();
      }

      const downloadRes = await Filesystem.downloadFile({
        url: apkDownloadUrl,
        path: fileName,
        directory: Directory.Cache,
        progress: true
      });

      if (downloadListener && typeof downloadListener.remove === 'function') {
        try {
          await downloadListener.remove();
        } catch (rErr) {
          // ignore
        }
      }

      // Verify file integrity & size
      try {
        const fileStat = await Filesystem.stat({
          path: fileName,
          directory: Directory.Cache
        });
        console.log('[AutoUpdate] Downloaded APK size on device:', fileStat?.size, 'bytes');
        if (fileStat && fileStat.size < 1000000) { // Less than 1MB is almost certainly an error/stub response
          throw new Error(`Downloaded APK appears incomplete or corrupted (${(fileStat.size / 1024).toFixed(0)} KB).`);
        }
      } catch (statErr) {
        console.warn('[AutoUpdate] Stat verification note:', statErr);
      }

      if (progressBar) progressBar.style.width = '100%';
      if (percentText) percentText.textContent = '100%';
      if (statusText) statusText.innerHTML = '<i class="fas fa-check-circle text-emerald-400 text-xs"></i> <span>Download complete. Opening installer...</span>';

      // Brief delay for file write flush
      await new Promise(r => setTimeout(r, 600));

      // Resolve absolute file path for FileOpener
      let installPath = downloadRes.path;
      if (!installPath || !installPath.startsWith('content://')) {
        try {
          const uriResult = await Filesystem.getUri({
            path: fileName,
            directory: Directory.Cache
          });
          if (uriResult?.uri) {
            installPath = uriResult.uri;
          }
        } catch (uriErr) {
          console.warn('[AutoUpdate] getUri fallback note:', uriErr);
        }
      }

      console.log('[AutoUpdate] Triggering FileOpener for APK:', installPath);
      await FileOpener.open({
        filePath: installPath,
        contentType: 'application/vnd.android.package-archive',
        openWithDefault: true
      });

      if (statusText) statusText.innerHTML = '<i class="fas fa-shield-alt text-emerald-400 text-xs"></i> <span>Installer launched! Tap "Install" on Android prompt.</span>';
      if (btnUpdateNowText) btnUpdateNowText.textContent = 'Installer Opened';
      if (btnUpdateNow) {
        btnUpdateNow.disabled = false;
        btnUpdateNow.classList.remove('opacity-75', 'cursor-not-allowed');
      }
      if (btnUpdateLater) btnUpdateLater.classList.remove('hidden');

    } catch (err) {
      console.error('[AutoUpdate] Download or install error:', err);
      if (errorBox) errorBox.classList.remove('hidden');
      if (errorMsg) {
        errorMsg.textContent = `Could not launch package installer automatically: ${err?.message || err}. If prompted, enable "Install Unknown Apps" for ArenaX in Android Settings, or tap below to download via browser.`;
      }
      if (unknownGuide) unknownGuide.classList.remove('hidden');
      if (statusText) statusText.innerHTML = '<i class="fas fa-exclamation-triangle text-amber-400 text-xs"></i> <span>Installation requires manual confirmation</span>';
      if (btnUpdateNowText) btnUpdateNowText.textContent = 'Retry Install';
      if (btnUpdateNow) {
        btnUpdateNow.disabled = false;
        btnUpdateNow.classList.remove('opacity-75', 'cursor-not-allowed');
      }
      if (btnUpdateLater) btnUpdateLater.classList.remove('hidden');
    } finally {
      isDownloading = false;
    }
  } else {
    // Web / PWA browser environment: simulate progress bar & initiate direct browser download
    let simulatedProgress = 0;
    const interval = setInterval(() => {
      simulatedProgress += 15;
      if (simulatedProgress > 100) simulatedProgress = 100;
      if (progressBar) progressBar.style.width = `${simulatedProgress}%`;
      if (percentText) percentText.textContent = `${simulatedProgress}%`;
      if (sizeText) sizeText.textContent = `${((simulatedProgress / 100) * 28.5).toFixed(1)} MB / 28.5 MB`;
      if (speedText) speedText.textContent = '3.5 MB/s';

      if (simulatedProgress >= 100) {
        clearInterval(interval);
        if (statusText) statusText.innerHTML = '<i class="fas fa-check-circle text-emerald-400 text-xs"></i> <span>Downloading APK file via browser...</span>';
        
        // Open download link safely
        window.open(targetConfig.downloadUrl, '_blank', 'noopener,noreferrer');
        
        if (btnUpdateNowText) btnUpdateNowText.textContent = 'Download Started';
        setTimeout(() => {
          if (btnUpdateNow) {
            btnUpdateNow.disabled = false;
            btnUpdateNow.classList.remove('opacity-75', 'cursor-not-allowed');
          }
          if (btnUpdateNowText) btnUpdateNowText.textContent = 'Update Now';
          if (btnUpdateLater) btnUpdateLater.classList.remove('hidden');
          isDownloading = false;
        }, 1500);
      }
    }, 120);
  }
}

/**
 * Main function: check for update on startup or on demand
 */
async function checkForUpdate(options = { isManual: false }) {
  const isNative = Capacitor.isNativePlatform();

  // CRITICAL REQUIREMENT:
  // On startup/background, update notifications and version checks must ONLY execute inside the native Capacitor APK.
  // If running in a plain web browser (Chrome, Safari on arenax.cyou, etc.), skip automatic background checks.
  if (!isNative && !options.isManual) {
    console.log('[AutoUpdate] Platform is Web / Browser (not native APK) — automatic background version check skipped.');
    return { updateAvailable: false, skipped: true, platform: 'web' };
  }

  try {
    const currentVersion = await getInstalledVersion();
    const remoteConfig = await getRemoteVersionConfig();
    const latestVersion = remoteConfig.latestVersion;

    const cmp = compareSemver(currentVersion, latestVersion);
    const hasNewUpdate = cmp === -1;

    let comparisonReason = '';
    if (cmp === -1) {
      comparisonReason = `Installed version (${currentVersion}) is strictly OLDER than latest version (${latestVersion}) -> UPDATE AVAILABLE`;
    } else if (cmp === 0) {
      comparisonReason = `Installed version (${currentVersion}) is EQUAL to latest version (${latestVersion}) -> ALREADY UP TO DATE`;
    } else {
      comparisonReason = `Installed version (${currentVersion}) is NEWER than latest version (${latestVersion}) -> ALREADY UP TO DATE (Developer/Pre-release build)`;
    }

    // Required Debug Logs:
    // 1) The exact installed version string read from App.getInfo()
    // 2) The exact latestVersion string read from Firestore
    // 3) The result of the comparison (true/false, and why)
    console.log('================== [AutoUpdate] VERSION AUDIT ==================');
    console.log('[AutoUpdate] 1. Installed Version (App.getInfo):', currentVersion);
    console.log('[AutoUpdate] 2. Latest Version (Firestore):     ', latestVersion);
    console.log('[AutoUpdate] 3. Comparison Result (Update?):    ', hasNewUpdate);
    console.log('[AutoUpdate] 4. Detailed Evaluation:            ', comparisonReason);
    console.log('================================================================');

    if (hasNewUpdate) {
      showUpdateModal(currentVersion, remoteConfig);
      return { updateAvailable: true, currentVersion, remoteConfig, comparisonReason };
    } else {
      if (options.isManual) {
        // EXACT MESSAGE REQUIRED: "You are using the latest version"
        if (typeof window.showToastNotification === 'function') {
          window.showToastNotification('ArenaX', 'You are using the latest version');
        } else {
          alert('You are using the latest version');
        }

        const txtSub = document.getElementById('txtCheckAppUpdatesSub');
        if (txtSub) txtSub.textContent = `You are using the latest version (v${currentVersion})`;
        const badge = document.getElementById('badgeCheckAppUpdates');
        if (badge) {
          badge.textContent = 'Latest';
          badge.className = 'text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-semibold border border-emerald-500/30';
        }
      }
      return { updateAvailable: false, currentVersion, remoteConfig, comparisonReason };
    }
  } catch (err) {
    console.error('[AutoUpdate] Error during update check:', err);
    if (options.isManual) {
      if (typeof window.showToastNotification === 'function') {
        window.showToastNotification('Update Check Failed', 'Unable to check for updates. Please verify your connection.');
      } else {
        alert('Unable to check for updates. Please verify your connection.');
      }
    }
    return { updateAvailable: false, error: err };
  }
}

/**
 * Admin helper to update Firestore version config document
 */
async function setRemoteVersion(config) {
  try {
    const db = window.db || window.fbDb;
    if (!db || !window.doc || !window.setDoc) {
      throw new Error('Firestore not initialized');
    }
    const docRef = window.doc(db, CONFIG_COLLECTION, CONFIG_DOC_ID);
    await window.setDoc(docRef, {
      latestVersion: config.latestVersion,
      downloadUrl: config.downloadUrl,
      releaseNotes: config.releaseNotes || '',
      mandatory: !!config.mandatory,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    console.log('[AutoUpdate] Remote version config updated in Firestore successfully!');
    if (typeof window.showToastNotification === 'function') {
      window.showToastNotification('Version Config Updated', `Latest release is now set to v${config.latestVersion}.`);
    }
    return true;
  } catch (err) {
    console.error('[AutoUpdate] Failed to set remote version config:', err);
    throw err;
  }
}

/**
 * Bind UI buttons and initialize event listeners
 */
function initAutoUpdateUI() {
  const btnUpdateNow = document.getElementById('btnApkUpdateNow');
  if (btnUpdateNow && !btnUpdateNow._bound) {
    btnUpdateNow._bound = true;
    btnUpdateNow.addEventListener('click', () => {
      startUpdateDownload(pendingRemoteConfig);
    });
  }

  const btnLater = document.getElementById('btnApkUpdateLater');
  if (btnLater && !btnLater._bound) {
    btnLater._bound = true;
    btnLater.addEventListener('click', () => {
      hideUpdateModal();
    });
  }

  const btnCross = document.getElementById('bCloseApkModalCross');
  if (btnCross && !btnCross._bound) {
    btnCross._bound = true;
    btnCross.addEventListener('click', () => {
      hideUpdateModal();
    });
  }

  const btnCheckUpdates = document.getElementById('btnCheckAppUpdates');
  if (btnCheckUpdates && !btnCheckUpdates._bound) {
    btnCheckUpdates._bound = true;
    btnCheckUpdates.addEventListener('click', async () => {
      const badge = document.getElementById('badgeCheckAppUpdates');
      const prevText = badge ? badge.textContent : 'Check';
      if (badge) badge.textContent = 'Checking...';
      try {
        await checkForUpdate({ isManual: true });
      } finally {
        if (badge && badge.textContent === 'Checking...') {
          badge.textContent = prevText;
        }
      }
    });
  }
}

// Global exposure on window
window.ArenaXUpdate = {
  checkForUpdate,
  getInstalledVersion,
  getRemoteVersionConfig,
  showUpdateModal,
  hideUpdateModal,
  startUpdateDownload,
  setRemoteVersion,
  isOlderVersion,
  compareSemver,
  parseVersionSegments,
  initAutoUpdateUI
};

// Initialize listeners on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAutoUpdateUI);
} else {
  initAutoUpdateUI();
}

// Background auto-check on startup after app initializes
window.addEventListener('load', () => {
  initAutoUpdateUI();

  // ONLY schedule version check if running inside native Capacitor Android APK
  if (Capacitor.isNativePlatform()) {
    // Run initial version check after 2 seconds
    setTimeout(() => {
      checkForUpdate({ isManual: false });
    }, 2200);

    // Re-check when app returns to foreground on native Android
    try {
      App.addListener('appStateChange', (state) => {
        if (state && state.isActive) {
          checkForUpdate({ isManual: false });
        }
      });
    } catch (e) {
      // ignore
    }
  } else {
    console.log('[AutoUpdate] Web platform detected. Automatic version check disabled.');
  }
});
