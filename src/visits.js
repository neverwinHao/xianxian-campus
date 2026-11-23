(function () {
  "use strict";
  const container = document.getElementById("visit-counter"),
    value = document.getElementById("visit-count");
  // Count only the published campus page; previews and offline copies stay offline.
  if (
    !container ||
    !value ||
    location.hostname !== "neverwinhao.github.io" ||
    !location.pathname.startsWith("/xxyz/")
  )
    return;
  const callback = "campusVisits_" + Math.random().toString(36).slice(2),
    script = document.createElement("script");
  let settled = false;
  function finish() {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    script.remove();
    delete window[callback];
  }
  const timer = setTimeout(finish, 8000);
  window[callback] = (data) => {
    const count = data?.site_pv;
    if (Number.isSafeInteger(count) && count >= 0) {
      value.textContent = count.toLocaleString("zh-CN");
      container.hidden = false;
    }
    finish();
  };
  // Busuanzi keys page_pv by the Referer URL, but WebKit (all iOS browsers, Safari)
  // trims cross-site Referers to the origin, so Apple visits would land on another
  // page. site_pv only needs the host; this page is the only one on it that counts.
  script.async = true;
  script.referrerPolicy = "no-referrer-when-downgrade";
  script.src =
    "https://busuanzi.ibruce.info/busuanzi?jsonpCallback=" + callback;
  script.onerror = finish;
  document.head.append(script);
})();
