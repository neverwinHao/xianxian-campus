const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  vm = require("node:vm"),
  path = require("node:path");
const context = { window: {} };
for (const file of ["campuses.js", "walk.js"])
  vm.runInNewContext(
    fs.readFileSync(path.join(__dirname, "../src", file), "utf8"),
    context,
  );
const { CAMPUSES, CampusWalking } = context.window;
const open = {
  id: "north",
  gate: { x: 0, z: 50 },
  boundary: [
    [-50, -50],
    [50, -50],
    [50, 50],
    [-50, 50],
  ],
  buildings: [],
};
test("both real campuses spawn inside their boundary and outside buildings", () => {
  for (const campus of Object.values(CAMPUSES)) {
    const nav = CampusWalking.navigation(campus),
      p = nav.spawn();
    assert.ok(nav.valid(p.x, p.z));
    assert.ok(
      campus.id === "north" ? p.z < campus.gate.z : p.z > campus.gate.z,
    );
  }
});
test("long-running movement cannot tunnel through a wall and slides along it", () => {
  const nav = CampusWalking.navigation({
      ...open,
      buildings: [{ x: 0, z: 0, w: 2, d: 40, h: 20 }],
    }),
    start = { x: -5, z: -10 };
  let p = start;
  for (let i = 0; i < 300; i++) p = nav.move(p, 9.5, 2, 0.033);
  assert.ok(p.x < -1.5);
  assert.ok(p.z > start.z + 15);
  assert.ok(nav.valid(p.x, p.z));
});
test("a resumed frame is bounded rather than teleporting", () => {
  const nav = CampusWalking.navigation(open),
    p = nav.move({ x: 0, z: 0 }, 9.5, 0, 30);
  assert.ok(p.x <= 0.951);
});
test("open movement is independent of render cadence", () => {
  const nav = CampusWalking.navigation(open);
  let a = { x: 0, z: 0 },
    b = { x: 0, z: 0 };
  for (let i = 0; i < 60; i++) a = nav.move(a, 3, 4, 1 / 60);
  for (let i = 0; i < 30; i++) b = nav.move(b, 3, 4, 1 / 30);
  assert.ok(Math.hypot(a.x - b.x, a.z - b.z) < 1e-9);
  assert.ok(Math.abs(Math.hypot(a.x, a.z) - 5) < 1e-9);
});
test("south L-shaped boundary excludes the outside northeast notch", () => {
  const nav = CampusWalking.navigation(CAMPUSES.south);
  assert.equal(nav.valid(50, -125), false);
  assert.equal(nav.valid(-5, -120), true);
  let p = { x: -5, z: -120 };
  for (let i = 0; i < 120; i++) p = nav.move(p, 9.5, 0, 1 / 30);
  assert.ok(p.x < -0.7);
  assert.ok(nav.valid(p.x, p.z));
});
test("courtyard interiors stay open while outer and dividing wings stay solid", () => {
  const nav = CampusWalking.navigation(CAMPUSES.south);
  assert.ok(nav.valid(-95, -62));
  assert.equal(nav.valid(-76, -62), false);
  assert.ok(nav.valid(-84, 6));
  assert.equal(nav.valid(-84, 30), false);
});
test("north connecting buildings and front sculpture cannot be crossed", () => {
  const nav = CampusWalking.navigation(CAMPUSES.north);
  for (const p of [...CAMPUSES.north.connectors, CAMPUSES.north.sculpture])
    assert.equal(nav.valid(p.x, p.z), false);
});
test("uniform switch recolors the jacket and swaps the chest trim", () => {
  const ctx = new Proxy({}, { get: () => () => {} }),
    page = {
      window: {},
      document: { createElement: () => ({ getContext: () => ctx }) },
    };
  for (const file of ["../vendor/three/three.min.js", "../src/walk.js"])
    vm.runInNewContext(
      fs.readFileSync(path.join(__dirname, file), "utf8"),
      page,
    );
  const student = page.window.CampusWalking.avatar(page.THREE);
  let torso;
  student.group.traverse((o) => {
    if (o.material?.vertexColors) torso = o.geometry;
  });
  const ys = torso.attributes.position.array.filter((_, i) => i % 3 === 1),
    top = ys.indexOf(Math.max(...ys)),
    shoulder = () => {
      const c = torso.attributes.color;
      return { r: c.getX(top), g: c.getY(top), b: c.getZ(top) };
    },
    trim = (name) => student.group.getObjectByName("trim-" + name).visible;
  assert.equal(student.uniform, "blue");
  assert.ok(shoulder().b > shoulder().g && trim("blue") && !trim("green"));
  student.setUniform("green");
  assert.equal(student.uniform, "green");
  assert.ok(shoulder().g > shoulder().b && shoulder().g > shoulder().r);
  assert.ok(trim("green") && !trim("blue"));
  student.setUniform("unknown");
  assert.equal(student.uniform, "blue");
});
test("camera retracts before walls and preserves clear views above them", () => {
  const nav = CampusWalking.navigation({
    ...open,
    buildings: [{ x: 0, z: 0, w: 2, d: 20, h: 6 }],
  });
  assert.ok(
    nav.cameraFraction({ x: -8, y: 3, z: 0 }, { x: 8, y: 3, z: 0 }) < 0.5,
  );
  assert.equal(
    nav.cameraFraction({ x: -8, y: 20, z: 0 }, { x: 8, y: 20, z: 0 }),
    1,
  );
});
