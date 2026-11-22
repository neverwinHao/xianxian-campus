(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const icon = { building: "▤", sport: "⊙", landscape: "♧" };
  let current,
    places = [],
    selected = null,
    labelsOn = true,
    evening = false,
    scene,
    labels = [],
    mode = "overview",
    tour = null,
    toastTimer;
  const setPressed = (id, value) =>
    $(id).setAttribute("aria-pressed", String(value));
  function toast(text) {
    $("toast").textContent = text;
    $("toast").hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => ($("toast").hidden = true), 3000);
  }
  const mobileQuery = matchMedia("(max-width:760px)");
  function syncPanel() {
    const open = document.body.classList.contains("panel"),
      mobile = mobileQuery.matches;
    $("sidebar").inert = mobile && !open;
    $("stage").inert = mobile && open;
    $("sidebar").setAttribute("aria-hidden", String(mobile && !open));
    if (scene?.walking) scene.pauseWalking(mobile && open);
  }
  function panel(open) {
    document.body.classList.toggle("panel", open);
    $("open-panel").setAttribute("aria-expanded", String(open));
    syncPanel();
    if (mobileQuery.matches) {
      if (open) $("close-panel").focus();
      else if ($("sidebar").contains(document.activeElement))
        $("open-panel").focus();
    }
  }
  mobileQuery.addEventListener("change", syncPanel);
  syncPanel();
  function updateModes(next) {
    mode = next;
    setPressed("overview", next === "overview");
    setPressed("top-view", next === "top");
    setPressed("tour-view", next === "tour");
    setPressed("walk-view", next === "walk");
  }
  function stopWalking() {
    if (!scene?.walking) return;
    scene.stopWalking();
    document.body.classList.remove("walking");
    $("walk-ui").hidden = true;
    if (mode === "walk") updateModes("detail");
  }
  function startWalking() {
    stopTour();
    selected = null;
    document.body.classList.remove("focused");
    renderPlaces();
    labels.forEach((l) => l.button.classList.remove("active"));
    document.body.classList.add("walking");
    $("walk-ui").hidden = false;
    scene.startWalking();
    updateModes("walk");
    panel(false);
    $("walk-nearby").textContent = "校门";
    $("canvas-host").tabIndex = 0;
    $("canvas-host").focus({ preventScroll: true });
  }
  function setOverviewCard() {
    $("place-name").textContent = current.name;
    $("close-place").hidden = true;
    $("building-closeup").hidden = true;
  }
  function renderPlaces() {
    const term = $("search").value.trim().toLowerCase();
    $("places").replaceChildren();
    const matching = places.filter(
      (p) => !term || p.name.toLowerCase().includes(term),
    );
    if (!matching.length) {
      const p = document.createElement("p");
      p.className = "empty";
      p.textContent = "无匹配名称";
      $("places").append(p);
    }
    for (const p of matching) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "place-item";
      button.dataset.place = p.id;
      button.setAttribute("aria-current", String(p.id === selected));
      button.setAttribute("aria-label", "前往" + p.name);
      const symbol = document.createElement("span");
      symbol.className = "place-icon";
      symbol.textContent = icon[p.kind];
      symbol.setAttribute("aria-hidden", "true");
      const text = document.createElement("span"),
        name = document.createElement("strong");
      name.textContent = p.name;
      text.append(name);
      const arrow = document.createElement("span");
      arrow.className = "arrow";
      arrow.textContent = "›";
      arrow.setAttribute("aria-hidden", "true");
      button.append(symbol, text, arrow);
      button.addEventListener("click", () => choose(p.id));
      $("places").append(button);
    }
  }
  function makeLabels() {
    $("labels").replaceChildren();
    labels = [];
    for (const p of places) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "map-label";
      button.dataset.place = p.id;
      button.setAttribute("aria-label", "地图：" + p.name);
      const dot = document.createElement("i");
      dot.setAttribute("aria-hidden", "true");
      button.append(dot, document.createTextNode(p.name));
      button.addEventListener("click", () => choose(p.id));
      $("labels").append(button);
      labels.push({ place: p, button });
    }
  }
  function choose(id, fromTour = false) {
    stopWalking();
    if (!fromTour) stopTour();
    const place = places.find((p) => p.id === id);
    if (!place) return;
    selected = id;
    document.body.classList.add("focused");
    scene.choose(id);
    $("place-name").textContent = place.name;
    $("close-place").hidden = false;
    $("building-closeup").textContent = "近景 ↗";
    $("building-closeup").hidden =
      place.kind !== "building" &&
      ![
        "gate",
        "observatory",
        "ginkgo-court",
        "pavilion",
        "sculpture",
      ].includes(id) &&
      !(current.id === "north" && id === "garden");
    renderPlaces();
    labels.forEach((l) =>
      l.button.classList.toggle("active", l.place.id === selected),
    );
    if (!fromTour) updateModes("detail");
    panel(false);
  }
  function overview() {
    stopWalking();
    stopTour();
    selected = null;
    document.body.classList.remove("focused");
    setOverviewCard();
    scene.overview();
    updateModes("overview");
    renderPlaces();
    labels.forEach((l) => l.button.classList.remove("active"));
    panel(false);
  }
  function loadCampus(id) {
    stopWalking();
    stopTour();
    current = window.CAMPUSES[id] || window.CAMPUSES.north;
    selected = null;
    $("search").value = "";
    document.body.classList.remove("focused");
    places = scene.load(current);
    scene.lighting(evening);
    document
      .querySelectorAll("[data-campus]")
      .forEach((button) =>
        button.setAttribute(
          "aria-pressed",
          String(button.dataset.campus === current.id),
        ),
      );
    $("campus-title").textContent = current.name;
    $("scene-campus").textContent = current.name;
    $("stage").setAttribute(
      "aria-label",
      "献县第一中学" + current.name + "三维校园",
    );
    document.title = "献县第一中学 · " + current.name + "云游校园";
    setOverviewCard();
    updateModes("overview");
    renderPlaces();
    makeLabels();
    try {
      history.replaceState(null, "", "#" + current.id);
    } catch {
      /* file:// browsing still works without URL persistence. */
    }
  }
  function stopTour() {
    if (tour) {
      scene.cancel();
      tour = null;
      document.body.classList.remove("touring");
      $("tour-progress").hidden = true;
      $("start-tour").textContent = "▶";
      $("start-tour").setAttribute("aria-label", "开始校园漫游");
      if (mode === "tour") updateModes("detail");
    }
  }
  function startTour() {
    stopWalking();
    if (tour) {
      stopTour();
      return;
    }
    tour = { index: 0, start: performance.now(), duration: 6500 };
    document.body.classList.add("touring");
    $("tour-progress").hidden = false;
    $("start-tour").textContent = "Ⅱ";
    $("start-tour").setAttribute("aria-label", "暂停校园漫游");
    updateModes("tour");
    tourStep();
    panel(false);
  }
  function tourStep() {
    const id = current.tour[tour.index];
    choose(id, true);
    const p = places.find((p) => p.id === id);
    $("tour-step").textContent = p.name;
  }
  let lastWalkLabel = 0;
  function updateFrame(now) {
    if (tour) {
      const progress = (now - tour.start) / tour.duration;
      $("tour-bar").style.width = Math.min(progress, 1) * 100 + "%";
      if (progress >= 1) {
        tour.index++;
        tour.start = now;
        if (tour.index >= current.tour.length) {
          stopTour();
          overview();
          toast(current.name + "漫游结束");
        } else tourStep();
      }
    }
    const width = $("stage").clientWidth,
      height = $("stage").clientHeight,
      mobile = width < 600;
    if (scene.walking && now - lastWalkLabel > 300) {
      lastWalkLabel = now;
      const p = scene.walkState();
      let closest = null,
        distance = Infinity;
      for (const place of places) {
        const d = Math.hypot(p.x - place.x, p.z - place.z);
        if (d < distance) {
          closest = place;
          distance = d;
        }
      }
      $("walk-nearby").textContent =
        distance < 35 ? closest.name : current.name;
    }
    const used = [];
    let displayed = 0;
    for (const item of [...labels].sort(
      (a, b) =>
        Number(b.place.id === selected) - Number(a.place.id === selected) ||
        (b.place.labelPriority || 0) - (a.place.labelPriority || 0),
    )) {
      const point = scene.project(item.place),
        labelWidth = item.place.name.length * 11 + 23;
      const box = {
        left: point.x - labelWidth / 2,
        right: point.x + labelWidth / 2,
        top: point.y - 29,
        bottom: point.y + 11,
      };
      let visible =
        labelsOn &&
        (!selected || item.place.id === selected) &&
        point.visible &&
        box.left > 10 &&
        box.right < width - 58 &&
        box.top > 65 &&
        box.bottom < height - 90;
      if (selected && box.left < 240 && box.bottom > height - 165)
        visible = false;
      if (
        item.place.id !== selected &&
        (displayed >= (mobile ? 5 : 9) ||
          used.some(
            (r) =>
              r.left < box.right &&
              r.right > box.left &&
              r.top < box.bottom &&
              r.bottom > box.top,
          ))
      )
        visible = false;
      item.button.hidden = !visible;
      if (visible) {
        item.button.style.left = point.x + "px";
        item.button.style.top = point.y + "px";
        used.push(box);
        displayed++;
      }
    }
    $("compass-needle").style.transform =
      "rotate(" +
      (-scene.controls.getAzimuthalAngle() * 180) / Math.PI +
      "deg)";
  }
  $("building-closeup").addEventListener("click", () => {
    if (selected) {
      stopTour();
      scene.choose(selected, true);
      updateModes("detail");
    }
  });
  document
    .querySelectorAll("[data-campus]")
    .forEach((button) =>
      button.addEventListener("click", () => loadCampus(button.dataset.campus)),
    );
  $("search").addEventListener("input", renderPlaces);
  $("overview").addEventListener("click", overview);
  $("close-place").addEventListener("click", overview);
  $("top-view").addEventListener("click", () => {
    stopWalking();
    stopTour();
    scene.top();
    updateModes("top");
    panel(false);
  });
  $("walk-view").addEventListener("click", startWalking);
  $("walk-exit").addEventListener("click", overview);
  $("walk-reset").addEventListener("click", () => scene.resetWalking());
  $("north").addEventListener("click", () => {
    stopTour();
    scene.north();
  });
  $("zoom-in").addEventListener("click", () => {
    stopTour();
    scene.zoom(0.8);
  });
  $("zoom-out").addEventListener("click", () => {
    stopTour();
    scene.zoom(1.25);
  });
  $("toggle-labels").addEventListener("click", () => {
    labelsOn = !labelsOn;
    setPressed("toggle-labels", labelsOn);
  });
  $("lighting").addEventListener("click", () => {
    evening = !evening;
    scene.lighting(evening);
    setPressed("lighting", evening);
    $("lighting-label").textContent = evening ? "夕照" : "日光";
  });
  $("start-tour").addEventListener("click", startTour);
  $("tour-view").addEventListener("click", startTour);
  $("stop-tour").addEventListener("click", stopTour);
  $("open-panel").addEventListener("click", () => panel(true));
  $("close-panel").addEventListener("click", () => panel(false));
  $("fullscreen").addEventListener("click", async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (document.documentElement.requestFullscreen)
        await document.documentElement.requestFullscreen();
      else toast("当前浏览器不支持全屏，可以放大浏览器窗口。");
    } catch {
      toast("当前浏览器无法进入全屏。");
    }
  });
  $("capture").addEventListener("click", () => {
    const source = scene.capture(),
      canvas = document.createElement("canvas");
    canvas.width = source.width;
    canvas.height = source.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(source, 0, 0);
    const scale = canvas.width / $("stage").clientWidth;
    ctx.fillStyle = "#fcfbf7ee";
    ctx.fillRect(22 * scale, 22 * scale, 210 * scale, 45 * scale);
    ctx.fillStyle = "#394732";
    ctx.font = 18 * scale + 'px "Songti SC",serif';
    ctx.fillText(
      selected ? places.find((p) => p.id === selected).name : current.name,
      38 * scale,
      51 * scale,
    );
    canvas.toBlob((blob) => {
      if (!blob) {
        toast("图片生成失败，请重试。");
        return;
      }
      const url = URL.createObjectURL(blob),
        a = document.createElement("a");
      a.href = url;
      a.download = "献县一中-" + current.name + ".png";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast("当前视角已保存");
    }, "image/png");
  });
  $("reload").addEventListener("click", () => location.reload());
  document.addEventListener("keydown", (event) => {
    if (
      event.key === "/" &&
      !["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)
    ) {
      event.preventDefault();
      panel(true);
      $("search").focus();
    }
    if (event.key === "Escape") {
      if (scene.walking && !document.body.classList.contains("panel"))
        overview();
      stopTour();
      panel(false);
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && tour) stopTour();
  });
  window.addEventListener("hashchange", () => {
    const id = location.hash.slice(1);
    if (scene && (!window.CAMPUSES[id] || current.id !== id)) loadCampus(id);
  });
  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (!scene) return;
      if (mode === "overview") scene.overview(false);
      else if (mode === "top") scene.top();
    }, 150);
  });
  try {
    scene = window.createCampusScene($("canvas-host"), choose, () => {
      stopTour();
      if (mode !== "detail" && mode !== "walk") updateModes("free");
    });
    loadCampus(location.hash.slice(1));
    scene.onFrame = updateFrame;
    $("loading").hidden = true;
    startTour();
    // Read-only diagnostics for local acceptance checks.
    window.campusDiagnostics = () => ({
      campus: current.id,
      selected,
      mode,
      touring: Boolean(tour),
      places: places.length,
      labelsOn,
      evening,
      webgl: true,
      drawCalls: scene.renderer.info.render.calls,
      triangles: scene.renderer.info.render.triangles,
      geometries: scene.renderer.info.memory.geometries,
      textures: scene.renderer.info.memory.textures,
    });
  } catch (error) {
    $("loading").hidden = true;
    $("error").hidden = false;
    $("error-detail").textContent = error.message;
    console.error(error);
  }
})();
