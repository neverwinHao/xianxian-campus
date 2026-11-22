const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
let html = read("index.html");
html = html.replace(
  /<link\s+rel="stylesheet"\s+href="([^"]+)"\s*\/?>/g,
  (_, file) => `<style>${read(file)}</style>`,
);
html = html.replace(
  /<script\s+src="([^"]+)"\s*>\s*<\/script>/g,
  (_, file) =>
    `<script>${read(file).replace(/<\/script/gi, "<\\/script")}</script>`,
);
if (
  /CAMPUS_REFERENCES|CAMPUS_DETAIL_IMAGES|reference-previews|data:image\/(?:jpeg|png|webp|gif)/.test(
    html,
  )
) {
  throw new Error("离线包不应包含实景照片或旧相册。");
}
if (/<script[^>]+src=|<link[^>]+rel="stylesheet"/.test(html)) {
  throw new Error("离线包仍包含外部脚本或样式依赖。");
}
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
scripts.forEach(
  (match, index) => new vm.Script(match[1], { filename: `bundle-${index}.js` }),
);
fs.mkdirSync(path.join(root, "dist"), { recursive: true });
fs.writeFileSync(path.join(root, "dist/index.html"), html);
fs.copyFileSync(
  path.join(root, "vendor/three/LICENSE.txt"),
  path.join(root, "dist/THREE-LICENSE.txt"),
);
console.log(
  `已生成 dist/index.html：${Buffer.byteLength(html)} 字节，${scripts.length} 个内联脚本。`,
);
console.log("可直接打开，或把 dist/ 中的文件部署到静态站点。");
