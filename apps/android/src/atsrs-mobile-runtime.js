(function atsrsMobileRuntime() {
  "use strict";

  var capacitor = window.Capacitor;
  if (!capacitor || !capacitor.isNativePlatform || !capacitor.isNativePlatform()) return;

  document.documentElement.classList.add("atsrs-native-android");
  var plugins = capacitor.Plugins || {};
  var App = plugins.App;
  var Browser = plugins.Browser;
  var Network = plugins.Network;
  var StatusBar = plugins.StatusBar;
  var SystemBars = plugins.SystemBars;

  function isTrustedAtsrsUrl(url) {
    return url.protocol === "https:" && (url.hostname === "atsrs.com" || url.hostname.endsWith(".atsrs.com"));
  }

  function openExternal(url) {
    if (url.protocol !== "https:" && url.protocol !== "mailto:" && url.protocol !== "tel:") return;
    if (Browser && url.protocol === "https:") Browser.open({ url: url.href });
    else window.location.href = url.href;
  }

  document.addEventListener("click", function (event) {
    var anchor = event.target && event.target.closest ? event.target.closest("a[href]") : null;
    if (!anchor || anchor.hasAttribute("download")) return;
    var rawHref = anchor.getAttribute("href") || "";
    if (!rawHref || rawHref[0] === "#" || rawHref.toLowerCase().startsWith("javascript:")) return;
    var url;
    try { url = new URL(anchor.href, window.location.href); } catch (_) { return; }

    if (isTrustedAtsrsUrl(url)) {
      event.preventDefault();
      window.location.assign(url.pathname + url.search + url.hash);
      return;
    }
    if (url.origin !== window.location.origin) {
      event.preventDefault();
      openExternal(url);
    }
  }, true);

  if (App) {
    App.addListener("backButton", function (state) {
      if (state && state.canGoBack) window.history.back();
      else App.minimizeApp();
    });
  }

  function setNetworkState(connected) {
    document.documentElement.classList.toggle("atsrs-native-offline", !connected);
    var notice = document.getElementById("atsrsNativeNetworkNotice");
    if (!connected && !notice) {
      notice = document.createElement("div");
      notice.id = "atsrsNativeNetworkNotice";
      notice.setAttribute("role", "status");
      notice.textContent = "No internet connection. ATSRS will reconnect automatically.";
      notice.style.cssText = "position:fixed;left:12px;right:12px;bottom:12px;z-index:2147483647;padding:12px 16px;border-radius:12px;background:#111b18;color:#fff;border:1px solid #39c85a;text-align:center;font:600 14px system-ui,sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.35)";
      document.body.appendChild(notice);
    } else if (connected && notice) notice.remove();
  }

  if (Network) {
    Network.getStatus().then(function (status) { setNetworkState(status.connected); });
    Network.addListener("networkStatusChange", function (status) { setNetworkState(status.connected); });
  }

  function syncSystemBars() {
    var dark = document.documentElement.getAttribute("data-theme") === "dark" || document.body.classList.contains("dark");
    if (StatusBar) {
      StatusBar.setBackgroundColor({ color: dark ? "#030706" : "#eef4fb" });
      StatusBar.setStyle({ style: dark ? "DARK" : "LIGHT" });
    }
    if (SystemBars) SystemBars.setStyle({ style: dark ? "DARK" : "LIGHT" });
  }

  syncSystemBars();
  if (window.MutationObserver) {
    new MutationObserver(syncSystemBars).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"]
    });
  }
})();
