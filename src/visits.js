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
    const count = data?.page_pv;
    if (Number.isSafeInteger(count) && count >= 0) {
      value.textContent = count.toLocaleString("zh-CN");
      container.hidden = false;
    }
    finish();
  };
  // Busuanzi page_pv groups visits by page URL; campus hashes share the same page.
  script.async = true;
  script.referrerPolicy = "no-referrer-when-downgrade";
  script.src =
    "https://busuanzi.ibruce.info/busuanzi?jsonpCallback=" + callback;
  script.onerror = finish;
  document.head.append(script);
})();
