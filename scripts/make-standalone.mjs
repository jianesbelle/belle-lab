import fs from "node:fs";
import path from "node:path";

const buildDir = "dist-firebase";
let html = fs.readFileSync(path.join(buildDir, "index.html"), "utf8");
const cssTag = html.match(/<link rel="stylesheet" crossorigin href="([^"]+)">/);
const scriptTag = html.match(/<script type="module" crossorigin src="([^"]+)"><\/script>/);

if (!cssTag || !scriptTag) throw new Error("Built CSS or JavaScript was not found.");

const css = fs.readFileSync(path.join(buildDir, cssTag[1]), "utf8");
const script = fs.readFileSync(path.join(buildDir, scriptTag[1]), "utf8");
html = html
  .replace(cssTag[0], () => `<style>${css}</style>`)
  .replace(scriptTag[0], "")
  .replace("</body>", () => `<script>${script.replace(/<\/script/gi, "<\\/script")}</script></body>`)
  .replace('<meta property="og:image" content="/og.png" />', "");

fs.writeFileSync("소리결_민요창작학습실.html", html);
fs.writeFileSync("sorigyeol.html", html);
fs.writeFileSync("sorigyeol-fixed.html", html);
fs.writeFileSync("sorigyeol-ready.html", html);
