const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const root = path.resolve(__dirname, "..");
let count = 0;
for (const directory of ["src", "tools", "tests"]) {
  for (const file of fs.readdirSync(path.join(root, directory))) {
    if (!/\.(?:js|cjs)$/.test(file)) continue;
    execFileSync(
      process.execPath,
      ["--check", path.join(root, directory, file)],
      { stdio: "inherit" },
    );
    count++;
  }
}
console.log(`语法检查通过：${count} 个源码与工具文件。`);
