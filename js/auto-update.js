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
 * Parse semver string into array of numbers, e.g. "1.1.0" -> [1, 1, 0]
 */
function parseSemver(v) {
  if (!v || typeof v !== 'string') return [0, 0, 0];
  const cleaned = v.trim().replace(/^[^\d]*/, '');
  const parts = cleaned.split('.').map(p => parseInt(p, 10) || 0);
  while (parts.length < 3) parts.push(0);
  return parts;
}

/**
 * Returns true if remoteVer is strictly newer than currentVer
 */
function isOlderVersion(currentVer, remoteVer) {
  const c = parseSemver(currentVer);
  const r = parseSemver(remoteVer);
  for (let i = 0; i < 3; i++) {
    if (r[i] > c[i]) return true;
    if (r[i] < c[i]) return false;
  }
  return false;
}

/**
 * Retrieve installed app version via @capacitor/app plugin
 */
async function getInstalledVersion() {
  try {
    if (Capacitor.isNativePlatform()) {
      const info = await App.getInfo();
      if (info && info.version) {
        return info.version;
      }
    }
  } catch (err) {
    console.warn('[AutoUpdate] Error reading App.getInfo():', err);
  }
  return window.ARENAX_INSTALLED_VERSION || localStorage.getItem('arenax_installed_version') || '1.0.0';
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
        return {
          latestVersion: data.latestVersion || DEFAULT_LATEST_VERSION,
          downloadUrl: data.downloadUrl || DEFAULT_DOWNLOAD_URL,
          releaseNotes: data.releaseNotes || DEFAULT_RELEASE_NOTES,
          mandatory: !!data.mandatory
        };
      } else {
        console.log('[AutoUpdate] app_config/version not found in Firestore, using default config.');
      }
    }
  } catch (err) {
    console.warn('[AutoUpdate] Failed to query Firestore app_config/version:', err);
  }

  return {
    latestVersion: DEFAULT_LATEST_VERSION,
    downloadUrl: DEFAULT_DOWNLOAD_URL,
    releaseNotes: DEFAULT_RELEASE_NOTES,
    mandatory: false
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

      const downloadRes = await Filesystem.downloadFile({
        url: targetConfig.downloadUrl || DEFAULT_DOWNLOAD_URL,
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

      if (progressBar) progressBar.style.width = '100%';
      if (percentText) percentText.textContent = '100%';
      if (statusText) statusText.innerHTML = '<i class="fas fa-check-circle text-emerald-400 text-xs"></i> <span>Download complete. Opening installer...</span>';

      // Brief delay for file write flush
      await new Promise(r => setTimeout(r, 600));

      console.log('[AutoUpdate] Triggering FileOpener for APK:', downloadRes.path);
      await FileOpener.open({
        filePath: downloadRes.path,
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
  // CRITICAL REQUIREMENT:
  // Update notifications and version checks must ONLY execute inside the native Capacitor APK.
  // If running in a plain web browser (Chrome, Safari on arenax.cyou, etc.), skip the entire
  // version check and update notification logic completely — do not even fetch version info from Firestore.
  if (!Capacitor.isNativePlatform()) {
    console.log('[AutoUpdate] Platform is Web / Browser (not native APK) — skipping version check and update notification completely.');
    if (options.isManual) {
      if (typeof window.showToastNotification === 'function') {
        window.showToastNotification('Web Platform', 'Auto-updates are only available when running inside the ArenaX Android APK.');
      } else {
        alert('Auto-updates are only available inside the ArenaX Android APK.');
      }
    }
    return { updateAvailable: false, skipped: true, platform: 'web' };
  }

  try {
    const currentVersion = await getInstalledVersion();
    const remoteConfig = await getRemoteVersionConfig();

    console.log('[AutoUpdate] Checking update: Installed v' + currentVersion + ' vs Latest v' + remoteConfig.latestVersion);

    const hasNewUpdate = isOlderVersion(currentVersion, remoteConfig.latestVersion);

    if (hasNewUpdate) {
      showUpdateModal(currentVersion, remoteConfig);
      return { updateAvailable: true, currentVersion, remoteConfig };
    } else {
      if (options.isManual) {
        if (typeof window.showToastNotification === 'function') {
          window.showToastNotification('ArenaX Up to Date', `You are already running the latest version (v${currentVersion}).`);
        } else {
          alert(`ArenaX is already up to date (v${currentVersion}).`);
        }
      }
      return { updateAvailable: false, currentVersion, remoteConfig };
    }
  } catch (err) {
    console.error('[AutoUpdate] Error during update check:', err);
    if (options.isManual) {
      if (typeof window.showToastNotification === 'function') {
        window.showToastNotification('Update Check Failed', 'Unable to check for updates. Please verify your connection.');
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
    btnCheckUpdates.addEventListener('click', () => {
      checkForUpdate({ isManual: true });
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
