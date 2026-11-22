(function () {
  "use strict";
  // Navigation is independent of WebGL so the same campus geometry can be tested.
  function navigation(campus, radius = 0.95) {
    const obstacles = [];
    function rect(x, z, w, d, h = 30) {
      obstacles.push({ x, z, w, d, h });
    }
    for (const b of campus.buildings) {
      if (b.courtyard) {
        const wing = b.wing || 10;
        for (const side of [-1, 1]) {
          rect(b.x, b.z + (side * (b.d - wing)) / 2, b.w, wing, b.h);
          rect(b.x + (side * (b.w - wing)) / 2, b.z, wing, b.d - 2 * wing, b.h);
        }
        if (b.profile === "southTeaching") {
          rect(b.x, b.z, 8, b.d - 2 * wing, b.h - 4.5);
          for (const side of [-1, 1])
            rect(
              b.x + (b.w - wing) / 2 + 0.5,
              b.z + (side * (b.d - wing)) / 2,
              wing + 1,
              wing + 4,
              b.h + 1,
            );
        }
      } else if (b.parts) {
        for (const part of b.parts)
          rect(part.x, part.z, part.w, part.d, part.h);
      } else rect(b.x, b.z, b.w, b.d, b.h);
      if (b.endTowers)
        for (const side of [-1, 1])
          rect(b.x + side * (b.w / 2 - 5), b.z + 0.9, 10, b.d + 2, b.h + 1.2);
    }
    for (const b of campus.connectors || []) rect(b.x, b.z, b.w, b.d, b.h);
    if (campus.observatory) {
      const b = campus.observatory;
      rect(b.x, b.z, b.w, b.d, b.h);
    }
    if (campus.sculpture)
      rect(campus.sculpture.x, campus.sculpture.z, 4.5, 4.5, 12.6);
    // The south reviewing stand is solid; the nearby running track remains walkable.
    if (campus.id === "south") rect(15, 48, 9, 28, 6.5);
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    function inside(x, z) {
      let result = false;
      for (
        let i = 0, j = campus.boundary.length - 1;
        i < campus.boundary.length;
        j = i++
      ) {
        const [ax, az] = campus.boundary[i],
          [bx, bz] = campus.boundary[j];
        if (az > z !== bz > z && x < ((bx - ax) * (z - az)) / (bz - az) + ax)
          result = !result;
        const dx = bx - ax,
          dz = bz - az,
          t = clamp(
            ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz),
            0,
            1,
          );
        if (Math.hypot(x - ax - t * dx, z - az - t * dz) < radius + 0.15)
          return false;
      }
      return result;
    }
    function valid(x, z) {
      return (
        Number.isFinite(x) &&
        Number.isFinite(z) &&
        inside(x, z) &&
        !obstacles.some((b) => {
          const dx = x - clamp(x, b.x - b.w / 2, b.x + b.w / 2),
            dz = z - clamp(z, b.z - b.d / 2, b.z + b.d / 2);
          return dx * dx + dz * dz < radius * radius;
        })
      );
    }
    function move(position, vx, vz, seconds) {
      const dt = clamp(seconds, 0, 0.1),
        dx = vx * dt,
        dz = vz * dt,
        steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / (radius * 0.45)));
      let x = position.x,
        z = position.z;
      for (let i = 0; i < steps; i++) {
        if (valid(x + dx / steps, z)) x += dx / steps;
        if (valid(x, z + dz / steps)) z += dz / steps;
      }
      return { x, z };
    }
    function spawn() {
      const direction = campus.id === "north" ? -1 : 1,
        base = { x: campus.gate.x, z: campus.gate.z + direction * 22 };
      if (valid(base.x, base.z)) return base;
      for (let r = 2; r <= 60; r += 2)
        for (let i = 0; i < 32; i++) {
          const x = base.x + Math.cos((i * Math.PI) / 16) * r,
            z = base.z + Math.sin((i * Math.PI) / 16) * r;
          if (valid(x, z)) return { x, z };
        }
      throw new Error("没有找到安全的步行起点。");
    }
    function cameraFraction(from, to) {
      let nearest = 1;
      for (const b of obstacles) {
        let lo = 0,
          hi = 1;
        for (const [key, min, max] of [
          ["x", b.x - b.w / 2 - 0.8, b.x + b.w / 2 + 0.8],
          ["y", -0.5, b.h + 3],
          ["z", b.z - b.d / 2 - 0.8, b.z + b.d / 2 + 0.8],
        ]) {
          const delta = to[key] - from[key];
          if (Math.abs(delta) < 1e-8) {
            if (from[key] < min || from[key] > max) {
              lo = 2;
              break;
            }
          } else {
            const a = (min - from[key]) / delta,
              c = (max - from[key]) / delta;
            lo = Math.max(lo, Math.min(a, c));
            hi = Math.min(hi, Math.max(a, c));
          }
        }
        if (lo <= hi && lo >= 0 && lo <= 1)
          nearest = Math.min(nearest, Math.max(0.06, lo - 0.035));
      }
      return nearest;
    }
    return { valid, move, spawn, cameraFraction, obstacles };
  }

  function avatar(T) {
    const group = new T.Group(),
      body = new T.Group();
    group.add(body);
    const material = (color) =>
      new T.MeshStandardMaterial({
        color: new T.Color(color).convertSRGBToLinear(),
        roughness: 0.85,
      });
    const blue = material(0x1988bd),
      navy = material(0x202e44),
      white = material(0xf1eee4),
      skin = material(0xe1ad8c),
      hair = material(0x222b32);
    function mesh(geometry, mat, parent, x, y, z) {
      const m = new T.Mesh(geometry, mat);
      m.position.set(x, y, z);
      m.castShadow = true;
      m.receiveShadow = true;
      parent.add(m);
      return m;
    }
    function box(w, h, d, mat, parent, x, y, z) {
      return mesh(new T.BoxGeometry(w, h, d), mat, parent, x, y, z);
    }
    function ball(r, mat, parent, x, y, z, sx = 1, sy = 1, sz = 1) {
      const m = mesh(new T.SphereGeometry(r, 12, 8), mat, parent, x, y, z);
      m.scale.set(sx, sy, sz);
      return m;
    }
    const torso = new T.BoxGeometry(0.86, 1.13, 0.47, 1, 16, 1),
      colors = [];
    const low = new T.Color(0xf0eee4).convertSRGBToLinear(),
      mid = new T.Color(0x8dc8d4).convertSRGBToLinear(),
      high = new T.Color(0x148abd).convertSRGBToLinear(),
      position = torso.attributes.position;
    for (let i = 0; i < position.count; i++) {
      const t = (position.getY(i) + 0.565) / 1.13,
        c =
          t < 0.5
            ? low.clone().lerp(mid, t * 2)
            : mid.clone().lerp(high, (t - 0.5) * 2);
      colors.push(c.r, c.g, c.b);
    }
    torso.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
    mesh(
      torso,
      new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }),
      body,
      0,
      1.66,
      0,
    );
    box(0.028, 1.12, 0.024, white, body, 0, 1.67, 0.253);
    box(0.07, 0.1, 0.045, white, body, 0, 2.1, 0.27);
    box(0.34, 0.22, 0.35, white, body, 0, 2.25, 0);
    box(0.18, 0.22, 0.3, skin, body, 0, 2.39, 0);
    for (const side of [-1, 1]) {
      const collar = box(0.3, 0.12, 0.38, blue, body, side * 0.22, 2.21, 0.04);
      collar.rotation.z = side * -0.28;
    }
    const head = ball(0.4, skin, body, 0, 2.76, 0, 1, 1.09, 0.95);
    const cap = mesh(
      new T.SphereGeometry(0.408, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.53),
      hair,
      body,
      0,
      2.79,
      0,
    );
    cap.scale.y = 1.15;
    for (let i = 0; i < 3; i++) {
      const fringe = box(
        0.16,
        0.14,
        0.12,
        hair,
        body,
        -0.2 + i * 0.17,
        2.99,
        0.3,
      );
      fringe.rotation.z = -0.18;
    }
    for (const side of [-1, 1]) {
      ball(0.075, skin, body, side * 0.385, 2.74, 0, 0.65, 1, 0.65);
      box(0.1, 0.15, 0.1, hair, body, side * 0.33, 2.84, 0.04);
      ball(0.035, hair, body, side * 0.135, 2.79, 0.352, 1, 1, 0.4);
      // Simple glasses echo the uniform reference without copying a real face.
      for (const dy of [-0.07, 0.07])
        box(0.22, 0.021, 0.028, hair, body, side * 0.14, 2.79 + dy, 0.37);
      for (const dx of [-0.105, 0.105])
        box(0.021, 0.14, 0.028, hair, body, side * 0.14 + dx, 2.79, 0.37);
    }
    box(0.055, 0.02, 0.032, hair, body, 0, 2.8, 0.382);
    ball(0.05, skin, body, 0, 2.7, 0.373, 0.7, 1, 0.9);
    box(0.1, 0.018, 0.025, material(0xa06c5b), body, 0, 2.58, 0.342);
    const arms = [],
      legs = [];
    for (const side of [-1, 1]) {
      const arm = new T.Group();
      arm.position.set(side * 0.56, 2.1, 0);
      body.add(arm);
      arms.push(arm);
      ball(0.17, blue, arm, 0, 0.04, 0, 1, 0.75, 1);
      mesh(new T.CylinderGeometry(0.17, 0.15, 0.77, 8), blue, arm, 0, -0.32, 0);
      mesh(
        new T.CylinderGeometry(0.15, 0.13, 0.27, 8),
        blue,
        arm,
        0,
        -0.8,
        0.025,
      );
      mesh(
        new T.CylinderGeometry(0.135, 0.13, 0.09, 8),
        white,
        arm,
        0,
        -0.95,
        0.025,
      );
      ball(0.14, skin, arm, 0, -1.09, 0.025, 0.8, 1.1, 0.85);
      const leg = new T.Group();
      leg.position.set(side * 0.235, 1.12, 0);
      body.add(leg);
      legs.push(leg);
      box(0.35, 0.96, 0.38, navy, leg, 0, -0.46, 0);
      box(0.37, 0.15, 0.59, white, leg, 0, -1, 0.075);
      box(0.35, 0.12, 0.48, material(0xc1c7c5), leg, 0, -0.9, 0.055);
      for (let j = 0; j < 3; j++)
        box(0.25, 0.015, 0.025, white, leg, 0, -0.83, 0.15 + j * 0.065);
    }
    // A tiny locally drawn badge; the reference photos are never loaded at runtime.
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#203653";
    ctx.beginPath();
    ctx.arc(64, 64, 61, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f0e6ce";
    ctx.beginPath();
    ctx.arc(64, 60, 47, 0, Math.PI * 2);
    ctx.fill();
    ctx.textAlign = "center";
    ctx.fillStyle = "#ab3840";
    ctx.font = 'bold 65px "Kaiti SC","KaiTi",serif';
    ctx.fillText("献", 64, 78);
    ctx.fillStyle = "#f5ecd7";
    ctx.font = "bold 14px sans-serif";
    ctx.fillText("1948", 64, 117);
    const texture = new T.CanvasTexture(canvas);
    texture.encoding = T.sRGBEncoding;
    mesh(
      new T.PlaneGeometry(0.23, 0.23),
      new T.MeshStandardMaterial({
        map: texture,
        transparent: true,
        roughness: 0.9,
      }),
      body,
      0.235,
      1.91,
      0.245,
    );
    for (const side of [-1, 1])
      for (let i = 0; i < 4; i++) {
        const stripe = box(
          0.13,
          0.012,
          0.01,
          white,
          body,
          side * (0.1 + i * 0.08),
          2.06 - i * 0.025,
          0.247,
        );
        stripe.rotation.z = side * (0.2 + i * 0.09);
      }
    const shadow = mesh(
      new T.CircleGeometry(0.62, 24),
      new T.MeshBasicMaterial({
        color: 0x324234,
        transparent: true,
        opacity: 0.14,
        depthWrite: false,
      }),
      group,
      0,
      0.03,
      0,
    );
    shadow.rotation.x = -Math.PI / 2;
    return {
      group,
      animate(phase, moving, reduced) {
        const swing = moving && !reduced ? Math.sin(phase) : 0;
        legs.forEach(
          (leg, i) => (leg.rotation.x = swing * (i ? 1 : -1) * 0.55),
        );
        arms.forEach(
          (arm, i) => (arm.rotation.x = swing * (i ? -1 : 1) * 0.42),
        );
        body.position.y =
          moving && !reduced ? Math.abs(Math.sin(phase)) * 0.045 : 0;
        head.rotation.z = swing * 0.015;
      },
    };
  }

  function create({ T, campus, parent, camera, controls, canvas }) {
    const nav = navigation(campus),
      student = avatar(T);
    parent.add(student.group);
    student.group.visible = false;
    const pad = document.getElementById("walk-joystick"),
      knob = document.getElementById("walk-knob"),
      fastButton = document.getElementById("walk-fast");
    const keys = new Set(),
      lookPointers = new Map(),
      listeners = [],
      joy = { x: 0, z: 0 };
    let active = false,
      paused = false,
      fast = false,
      padPointer = null,
      pos = nav.spawn(),
      yaw = 0,
      pitch = 0.48,
      distance = 14,
      phase = 0,
      moving = false,
      pulse = null;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches,
      follow = new T.Vector3(),
      desired = new T.Vector3();
    const keyCodes = [
      "KeyW",
      "KeyA",
      "KeyS",
      "KeyD",
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      "ShiftLeft",
      "ShiftRight",
    ];
    function listen(target, event, fn, options) {
      target.addEventListener(event, fn, options);
      listeners.push(() => target.removeEventListener(event, fn, options));
    }
    function clearInput() {
      keys.clear();
      joy.x = joy.z = 0;
      padPointer = null;
      pulse = null;
      lookPointers.clear();
      knob.style.transform = "translate(-50%,-50%)";
      moving = false;
    }
    function editable(target) {
      return target?.closest?.(
        'input,textarea,select,[contenteditable="true"],dialog',
      );
    }
    listen(document, "keydown", (event) => {
      if (
        !active ||
        paused ||
        editable(event.target) ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        !keyCodes.includes(event.code)
      )
        return;
      event.preventDefault();
      keys.add(event.code);
    });
    listen(document, "keyup", (event) => keys.delete(event.code));
    listen(window, "blur", clearInput);
    listen(document, "visibilitychange", clearInput);
    listen(document, "focusin", (event) => {
      if (editable(event.target)) clearInput();
    });
    function joystick(event) {
      const r = pad.getBoundingClientRect(),
        limit = r.width * 0.32,
        dx = event.clientX - r.left - r.width / 2,
        dz = r.top + r.height / 2 - event.clientY,
        len = Math.hypot(dx, dz),
        scale = len > limit ? limit / len : 1;
      joy.x = len < 8 ? 0 : (dx * scale) / limit;
      joy.z = len < 8 ? 0 : (dz * scale) / limit;
      knob.style.transform =
        "translate(calc(-50% + " +
        dx * scale +
        "px),calc(-50% - " +
        dz * scale +
        "px))";
    }
    listen(pad, "pointerdown", (event) => {
      if (!active || paused || padPointer !== null) return;
      event.preventDefault();
      padPointer = event.pointerId;
      pad.setPointerCapture(event.pointerId);
      joystick(event);
    });
    listen(pad, "pointermove", (event) => {
      if (event.pointerId === padPointer) {
        event.preventDefault();
        joystick(event);
      }
    });
    function releasePad(event) {
      if (event.pointerId === padPointer) {
        padPointer = null;
        joy.x = joy.z = 0;
        knob.style.transform = "translate(-50%,-50%)";
      }
    }
    for (const type of ["pointerup", "pointercancel", "lostpointercapture"])
      listen(pad, type, releasePad);
    listen(pad, "click", (event) => {
      const b = event.target.closest("[data-walk-direction]");
      if (active && !paused && b && event.detail === 0) {
        const directions = {
          forward: [0, 1],
          back: [0, -1],
          left: [-1, 0],
          right: [1, 0],
        };
        pulse = {
          direction: directions[b.dataset.walkDirection],
          remaining: 0.18,
        };
      }
    });
    listen(fastButton, "click", () => {
      fast = !fast;
      fastButton.setAttribute("aria-pressed", String(fast));
    });
    listen(canvas, "pointerdown", (event) => {
      if (!active || paused || event.button > 0) return;
      lookPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      canvas.setPointerCapture(event.pointerId);
    });
    listen(canvas, "pointermove", (event) => {
      const prior = lookPointers.get(event.pointerId);
      if (!active || paused || !prior) return;
      if (lookPointers.size === 1) {
        yaw -= (event.clientX - prior.x) * 0.006;
        pitch = Math.max(
          0.18,
          Math.min(1.15, pitch + (event.clientY - prior.y) * 0.004),
        );
      } else {
        const other = [...lookPointers.entries()].find(
            ([id]) => id !== event.pointerId,
          )[1],
          before = Math.hypot(prior.x - other.x, prior.y - other.y),
          after = Math.hypot(event.clientX - other.x, event.clientY - other.y);
        if (after > 4)
          distance = Math.max(7, Math.min(25, (distance * before) / after));
      }
      lookPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    });
    for (const type of ["pointerup", "pointercancel", "lostpointercapture"])
      listen(canvas, type, (event) => lookPointers.delete(event.pointerId));
    listen(
      canvas,
      "wheel",
      (event) => {
        if (active) {
          event.preventDefault();
          distance = Math.max(
            7,
            Math.min(25, distance * Math.exp(event.deltaY * 0.001)),
          );
        }
      },
      { passive: false },
    );
    function placeCamera(snap, dt) {
      follow.set(pos.x, 2.2, pos.z);
      desired.set(
        pos.x + Math.sin(yaw) * Math.cos(pitch) * distance,
        2.2 + Math.sin(pitch) * distance,
        pos.z + Math.cos(yaw) * Math.cos(pitch) * distance,
      );
      const fraction = nav.cameraFraction(follow, desired);
      // At a wall, use a steep overhead view instead of putting the lens in the avatar.
      if (fraction < 0.28)
        desired.set(
          follow.x + Math.sin(yaw) * 0.02,
          follow.y + Math.max(7, distance * 0.5),
          follow.z + Math.cos(yaw) * 0.02,
        );
      else desired.lerpVectors(follow, desired, fraction);
      if (snap || fraction < 1) camera.position.copy(desired);
      else camera.position.lerp(desired, 1 - Math.exp(-12 * dt));
      controls.target.copy(follow);
      camera.lookAt(follow);
    }
    function reset() {
      clearInput();
      pos = nav.spawn();
      yaw = campus.id === "north" ? 0 : Math.PI;
      pitch = 0.48;
      distance = canvas.clientWidth < 600 ? 16 : 14;
      phase = 0;
      student.group.position.set(pos.x, 0.23, pos.z);
      student.group.rotation.y = campus.id === "north" ? Math.PI : 0;
      student.animate(0, false, reduced);
      placeCamera(true, 0);
    }
    function stop() {
      active = false;
      paused = false;
      clearInput();
      fast = false;
      fastButton.setAttribute("aria-pressed", "false");
      student.group.visible = false;
      controls.enabled = true;
      camera.near = 1;
    }
    return {
      get active() {
        return active;
      },
      start() {
        active = true;
        paused = false;
        controls.enabled = false;
        camera.near = 0.15;
        student.group.visible = true;
        reset();
      },
      stop,
      reset,
      pause(value) {
        paused = value;
        if (value) clearInput();
      },
      clearInput,
      tick(seconds) {
        if (!active) return;
        const dt = Math.max(0, Math.min(seconds, 0.1));
        let x =
          joy.x +
          Number(keys.has("KeyD") || keys.has("ArrowRight")) -
          Number(keys.has("KeyA") || keys.has("ArrowLeft"));
        let z =
          joy.z +
          Number(keys.has("KeyW") || keys.has("ArrowUp")) -
          Number(keys.has("KeyS") || keys.has("ArrowDown"));
        if (pulse) {
          x += pulse.direction[0];
          z += pulse.direction[1];
          pulse.remaining -= dt;
          if (pulse.remaining <= 0) pulse = null;
        }
        const length = Math.hypot(x, z);
        if (length > 1) {
          x /= length;
          z /= length;
        }
        if (paused) x = z = 0;
        const speed =
          fast || keys.has("ShiftLeft") || keys.has("ShiftRight") ? 9.5 : 5.2;
        const vx = (Math.cos(yaw) * x - Math.sin(yaw) * z) * speed,
          vz = (-Math.sin(yaw) * x - Math.cos(yaw) * z) * speed;
        const next = nav.move(pos, vx, vz, dt),
          dx = next.x - pos.x,
          dz = next.z - pos.z;
        moving = Math.hypot(dx, dz) > 0.0001;
        if (moving) {
          const angle = Math.atan2(dx, dz),
            delta = Math.atan2(
              Math.sin(angle - student.group.rotation.y),
              Math.cos(angle - student.group.rotation.y),
            );
          student.group.rotation.y += delta * Math.min(1, dt * 13);
          phase += Math.hypot(dx, dz) * 2.8;
        }
        pos = next;
        student.group.position.set(pos.x, 0.23, pos.z);
        student.animate(phase, moving, reduced);
        placeCamera(false, dt);
      },
      state() {
        return {
          active,
          paused,
          x: +pos.x.toFixed(3),
          z: +pos.z.toFixed(3),
          moving,
          fast,
          heading: +student.group.rotation.y.toFixed(3),
        };
      },
      dispose() {
        stop();
        listeners.forEach((remove) => remove());
      },
    };
  }
  window.CampusWalking = { navigation, create };
})();
