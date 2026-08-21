(function atsrsMobileRuntime() {
  "use strict";
  var capacitor = window.Capacitor;
  if (!capacitor || !capacitor.isNativePlatform || !capacitor.isNativePlatform()) return;
  document.documentElement.classList.add("atsrs-native-android");
  var nativeStyle = document.createElement("style");
  nativeStyle.textContent = ".atsrs-native-android .public-android-entry{display:none!important}";
  document.head.appendChild(nativeStyle);
  var plugins = capacitor.Plugins || {};
  var App = plugins.App, Browser = plugins.Browser, Network = plugins.Network;
  var StatusBar = plugins.StatusBar, SystemBars = plugins.SystemBars, Updater = plugins.AtsrsUpdater;
  var RELEASE_MANIFEST = "https://atsrs.com/download/android/android-version.json";

  function isTrustedAtsrsUrl(url) { return url.protocol === "https:" && (url.hostname === "atsrs.com" || url.hostname.endsWith(".atsrs.com")); }
  function openExternal(url) {
    if (url.protocol !== "https:" && url.protocol !== "mailto:" && url.protocol !== "tel:") return;
    if (Browser && url.protocol === "https:") Browser.open({ url: url.href }); else window.location.href = url.href;
  }

  window.atsrsNativeOAuthRedirectUrl = function (intent, mode, attemptId) {
    var url = new URL("com.atsrs.app://login-callback");
    if (intent === "signin" || intent === "signup") url.searchParams.set("atsrs_intent", intent);
    if (intent === "signup" && (mode === "personal" || mode === "company")) url.searchParams.set("atsrs_mode", mode);
    if (attemptId) url.searchParams.set("atsrs_attempt", attemptId);
    return url.toString();
  };
  window.atsrsNativeOpenOAuth = async function (oauthUrl) {
    var url = new URL(oauthUrl);
    if (url.protocol !== "https:" || url.hostname !== "hwtjuqyxzivymofamwxl.supabase.co") throw new Error("Google sign-in returned an untrusted authentication URL.");
    if (!Browser) throw new Error("The secure Android sign-in browser is unavailable.");
    await Browser.open({ url: url.toString(), presentationStyle: "popover" });
  };

  function handleOAuthCallback(rawUrl) {
    var url; try { url = new URL(rawUrl); } catch (_) { return false; }
    if (url.protocol !== "com.atsrs.app:" || url.hostname !== "login-callback") return false;
    var allowed = ["code", "error", "error_code", "error_description", "atsrs_intent", "atsrs_mode", "atsrs_attempt", "sb_flow_id"];
    var internal = new URL("/", window.location.origin);
    allowed.forEach(function (key) { var value = url.searchParams.get(key); if (value) internal.searchParams.set(key, value.slice(0, 2048)); });
    if (!internal.searchParams.has("code") && !internal.searchParams.has("error")) return false;
    if (Browser) Browser.close().catch(function () {});
    window.location.assign(internal.pathname + internal.search); return true;
  }

  document.addEventListener("click", function (event) {
    var anchor = event.target && event.target.closest ? event.target.closest("a[href]") : null;
    if (!anchor || anchor.hasAttribute("download")) return;
    var rawHref = anchor.getAttribute("href") || "";
    if (!rawHref || rawHref[0] === "#" || rawHref.toLowerCase().startsWith("javascript:")) return;
    var url; try { url = new URL(anchor.href, window.location.href); } catch (_) { return; }
    if (isTrustedAtsrsUrl(url)) {
      event.preventDefault();
      if (url.pathname.indexOf("/download/") === 0 || url.pathname.indexOf("/downloads/") === 0) openExternal(url);
      else window.location.assign(url.pathname + url.search + url.hash);
      return;
    }
    if (url.origin !== window.location.origin) { event.preventDefault(); openExternal(url); }
  }, true);

  if (App) {
    App.addListener("appUrlOpen", function (event) { if (event && event.url) handleOAuthCallback(event.url); });
    App.getLaunchUrl().then(function (event) { if (event && event.url) handleOAuthCallback(event.url); });
    App.addListener("backButton", function (state) { if (state && state.canGoBack) window.history.back(); else App.minimizeApp(); });
  }

  function setNetworkState(connected) {
    document.documentElement.classList.toggle("atsrs-native-offline", !connected);
    var notice = document.getElementById("atsrsNativeNetworkNotice");
    if (!connected && !notice) {
      notice = document.createElement("div"); notice.id = "atsrsNativeNetworkNotice"; notice.setAttribute("role", "status");
      notice.textContent = "No internet connection. ATSRS will reconnect automatically.";
      notice.style.cssText = "position:fixed;left:12px;right:12px;bottom:12px;z-index:2147483647;padding:12px 16px;border-radius:12px;background:#111b18;color:#fff;border:1px solid #39c85a;text-align:center;font:600 14px system-ui,sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.35)";
      document.body.appendChild(notice);
    } else if (connected && notice) notice.remove();
  }
  if (Network) {
    Network.getStatus().then(function (status) { setNetworkState(status.connected); });
    Network.addListener("networkStatusChange", function (status) { setNetworkState(status.connected); });
  }

  function validReleaseManifest(manifest) {
    return manifest && Number.isInteger(manifest.versionCode) && manifest.versionCode > 0
      && typeof manifest.versionName === "string" && /^[0-9A-Za-z][0-9A-Za-z.+-]{0,31}$/.test(manifest.versionName)
      && typeof manifest.apkUrl === "string" && manifest.apkUrl.indexOf("https://atsrs.com/downloads/") === 0
      && typeof manifest.sha256 === "string" && /^[0-9a-f]{64}$/i.test(manifest.sha256)
      && Number.isInteger(manifest.fileSize) && manifest.fileSize > 0;
  }
  function showUpdate(manifest) {
    if (document.getElementById("atsrsNativeUpdateNotice")) return;
    var notice = document.createElement("section"); notice.id = "atsrsNativeUpdateNotice"; notice.setAttribute("role", "dialog"); notice.setAttribute("aria-label", "ATSRS Android update");
    notice.style.cssText = "position:fixed;left:12px;right:12px;bottom:12px;z-index:2147483646;max-width:560px;margin:auto;padding:18px;border-radius:16px;background:#0a100e;color:#fff;border:1px solid #39c85a;box-shadow:0 16px 48px rgba(0,0,0,.48);font:14px system-ui,sans-serif";
    notice.innerHTML = '<strong style="display:block;font-size:17px;margin-bottom:6px">ATSRS ' + manifest.versionName + ' is available</strong>'
      + '<span style="display:block;opacity:.8;margin-bottom:14px">Downloaded only from atsrs.com and verified before Android opens the installer.</span>'
      + '<div style="display:flex;gap:8px;justify-content:flex-end"><button type="button" data-later style="padding:9px 13px;border-radius:10px;border:1px solid #41504a;background:transparent;color:#fff">Later</button>'
      + '<button type="button" data-update style="padding:9px 13px;border-radius:10px;border:1px solid #39c85a;background:#39c85a;color:#04120b;font-weight:800">Update</button></div>';
    notice.querySelector("[data-later]").addEventListener("click", function () { notice.remove(); });
    notice.querySelector("[data-update]").addEventListener("click", async function (event) {
      var button = event.currentTarget; button.disabled = true; button.textContent = "Downloading…";
      try { await Updater.downloadAndInstall({ url: manifest.apkUrl, sha256: manifest.sha256, versionCode: manifest.versionCode }); button.textContent = "Verified"; }
      catch (error) {
        button.disabled = false; button.textContent = error && error.code === "INSTALL_PERMISSION_REQUIRED" ? "Continue update" : "Try again";
        var message = notice.querySelector("span"); if (message) message.textContent = error && error.message ? error.message : "The update could not be prepared.";
      }
    });
    document.body.appendChild(notice);
  }
  async function checkForUpdate() {
    if (!Updater) return;
    try {
      var response = await fetch(RELEASE_MANIFEST, { cache: "no-store", credentials: "omit", referrerPolicy: "no-referrer" });
      if (!response.ok) return;
      var manifest = await response.json(); if (!validReleaseManifest(manifest)) return;
      var current = await Updater.getCurrentVersion(); if (manifest.versionCode > Number(current.versionCode || 0)) showUpdate(manifest);
    } catch (_) {}
  }

  function syncSystemBars() {
    var dark = document.documentElement.getAttribute("data-theme") === "dark" || document.body.classList.contains("dark");
    if (StatusBar) { StatusBar.setBackgroundColor({ color: dark ? "#030706" : "#eef4fb" }); StatusBar.setStyle({ style: dark ? "DARK" : "LIGHT" }); }
    if (SystemBars) SystemBars.setStyle({ style: dark ? "DARK" : "LIGHT" });
  }
  syncSystemBars(); setTimeout(checkForUpdate, 5000);
  if (window.MutationObserver) new MutationObserver(syncSystemBars).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
})();
