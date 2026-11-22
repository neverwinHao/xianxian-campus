(() => {
  "use strict";
  const $ = (id) => document.getElementById(id),
    T = window.THREE,
    W = 1920,
    H = 1080;
  const output = $("preview"),
    ctx = output.getContext("2d", { alpha: false }),
    status = $("status"),
    shots = [];
  const places = (id) => [
    ...CAMPUSES[id].places,
    ...CAMPUSES[id].buildings,
    ...CAMPUSES[id].fields,
  ];
  function add(campus, id, duration) {
    shots.push({
      campus,
      id,
      duration,
      name:
        id === "overview"
          ? CAMPUSES[campus].name
          : id === "walk"
            ? "徒步逛校园"
            : places(campus).find((p) => p.id === id).name,
    });
  }
  add("north", "overview", 4);
  CAMPUSES.north.tour.forEach((id) => add("north", id, 6.5));
  add("south", "overview", 3);
  CAMPUSES.south.tour.forEach((id) => add("south", id, 6.5));
  add("north", "gate", 3);
  add("north", "walk", 12);
  let duration = 0;
  for (const shot of shots) {
    shot.start = duration;
    duration += shot.duration;
  }
  let shotIndex = 0,
    campus = null,
    running = false,
    start = 0,
    shotStart = 0,
    local = 0,
    base = null,
    held = false,
    recorder,
    chunks = [],
    frames = 0,
    lastNow = 0;
  const smooth = (t) => {
    t = Math.max(0, Math.min(1, t));
    return t * t * (3 - 2 * t);
  };
  const originalCreate = CampusWalking.create;
  CampusWalking.create = (args) => {
    const walker = originalCreate(args),
      tick = walker.tick;
    walker.tick = (dt) => {
      tick(dt * 0.65);
      if (walker.active) {
        const p = walker.state(),
          angle = -Math.PI + Math.PI * smooth((local - 1.2) / 3),
          distance = 10.8;
        args.camera.position.set(
          p.x + Math.sin(angle) * distance,
          5.4,
          p.z + Math.cos(angle) * distance,
        );
        args.controls.target.set(p.x, 1.8, p.z);
        args.camera.lookAt(args.controls.target);
      }
    };
    return walker;
  };
  const scene = createCampusScene(
    $("host"),
    () => {},
    () => {},
  );
  scene.renderer.setPixelRatio(1);
  scene.resize();
  function key(down) {
    if (held === down) return;
    held = down;
    document.dispatchEvent(
      new KeyboardEvent(down ? "keydown" : "keyup", {
        key: "w",
        code: "KeyW",
        bubbles: true,
      }),
    );
  }
  function choose(index, now = performance.now()) {
    key(false);
    shotIndex = index;
    shotStart = now;
    local = 0;
    base = null;
    const s = shots[index];
    if (campus !== s.campus) {
      scene.load(CAMPUSES[s.campus]);
      scene.lighting(false);
      campus = s.campus;
    }
    if (scene.walking) scene.stopWalking();
    if (s.id === "walk") scene.startWalking();
    else if (s.id === "overview") scene.overview(false);
    else scene.choose(s.id);
    scene.controls.enabled = false;
    output.dataset.shot = String(index);
    output.dataset.campus = s.campus;
    output.dataset.place = s.id;
  }
  function round(x, y, w, h, r) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
  }
  function overlay(s) {
    const title = "献县一中 · " + CAMPUSES[s.campus].name;
    ctx.font = '24px "Songti SC",serif';
    ctx.fillStyle = "#fffff3dd";
    round(42, 36, ctx.measureText(title).width + 36, 50, 7);
    ctx.fill();
    ctx.fillStyle = "#4c5b42";
    ctx.fillText(title, 60, 70);
    if (s.id !== "overview") {
      ctx.font = '29px "Songti SC",serif';
      const width = ctx.measureText(s.name).width + 44;
      ctx.fillStyle = "#fffff3e8";
      round(42, H - 98, width, 57, 7);
      ctx.fill();
      ctx.fillStyle = "#3c4b35";
      ctx.fillText(s.name, 64, H - 60);
    }
  }
  scene.onFrame = (now) => {
    lastNow = now;
    const elapsed = running ? (now - start) / 1000 : 0;
    if (running) {
      const next = shots.findIndex(
        (s) => elapsed >= s.start && elapsed < s.start + s.duration,
      );
      if (next >= 0 && next !== shotIndex) choose(next, now);
    }
    const s = shots[shotIndex];
    local = (now - shotStart) / 1000;
    key(running && s.id === "walk" && local >= 4.2 && local < 10);
    if (s.id !== "walk" && local > 1.2) {
      if (!base)
        base = {
          position: scene.camera.position.clone(),
          target: scene.controls.target.clone(),
        };
      const t = smooth((local - 1.2) / Math.max(1, s.duration - 1.2)),
        angle = (shotIndex % 2 ? -1 : 1) * 0.085 * t;
      const offset = base.position
        .clone()
        .sub(base.target)
        .applyAxisAngle(new T.Vector3(0, 1, 0), angle)
        .multiplyScalar(1 - 0.035 * t);
      scene.camera.position.copy(base.target).add(offset);
      scene.controls.target.copy(base.target);
      scene.camera.lookAt(base.target);
    }
    ctx.drawImage(scene.renderer.domElement, 0, 0, W, H);
    overlay(s);
    if (running) {
      let fade = elapsed < 0.6 ? 1 - elapsed / 0.6 : 0;
      for (const cut of [
        shots.find((s) => s.campus === "south").start,
        shots[shots.length - 2].start,
        shots[shots.length - 1].start,
      ])
        if (Math.abs(elapsed - cut) < 0.3)
          fade = Math.max(fade, 1 - Math.abs(elapsed - cut) / 0.3);
      if (elapsed > duration - 0.8)
        fade = Math.max(fade, Math.min(1, (elapsed - duration + 0.8) / 0.8));
      if (fade) {
        ctx.fillStyle = `rgba(229,233,223,${fade})`;
        ctx.fillRect(0, 0, W, H);
      }
      frames++;
      status.textContent = `${CAMPUSES[s.campus].name} · ${s.name} · ${elapsed.toFixed(1)} / ${duration} 秒`;
      if (elapsed >= duration) {
        key(false);
        running = false;
        recorder.stop();
        status.textContent = "正在生成成片";
      }
    }
  };
  shots.forEach((s, i) => {
    const o = document.createElement("option");
    o.value = String(i);
    o.textContent = CAMPUSES[s.campus].name + " · " + s.name;
    $("shot").append(o);
  });
  $("preview-shot").onclick = () => choose(Number($("shot").value));
  $("record").onclick = () => {
    const mimeType = [
      "video/mp4;codecs=avc1.42001f",
      "video/mp4",
      "video/webm;codecs=vp9",
    ].find((t) => MediaRecorder.isTypeSupported(t));
    if (!mimeType) {
      status.textContent = "没有可用视频编码器";
      return;
    }
    choose(0);
    start = performance.now();
    shotStart = start;
    frames = 0;
    chunks = [];
    running = true;
    $("download").hidden = true;
    document
      .querySelectorAll("header button,header select")
      .forEach((e) => (e.disabled = true));
    const stream = output.captureStream(30);
    recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 9000000,
    });
    recorder.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data);
    };
    recorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunks, { type: mimeType }),
        a = $("download");
      a.href = URL.createObjectURL(blob);
      a.download =
        "献县一中校园展示_横屏." + (mimeType.includes("mp4") ? "mp4" : "webm");
      a.hidden = false;
      status.textContent = `完成 · ${((lastNow - start) / 1000).toFixed(1)} 秒 · ${(blob.size / 1048576).toFixed(1)} MB · ${frames} 帧`;
      status.dataset.walk = JSON.stringify(scene.walkState());
      status.dataset.shots = JSON.stringify(shots);
      document
        .querySelectorAll("header button,header select")
        .forEach((e) => (e.disabled = false));
    };
    recorder.onerror = (e) => {
      key(false);
      running = false;
      status.textContent = "录制失败：" + e.error.message;
    };
    recorder.start(1000);
  };
  choose(0);
  status.textContent = `准备就绪 · 完整路线 · ${duration} 秒 · 1920 × 1080`;
})();
