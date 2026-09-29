#!/usr/bin/env node

import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { runInNewContext } from "node:vm";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = join(rootDir, "manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const popupHtml = readFileSync(join(rootDir, "popup.html"), "utf8");
const popupScript = readFileSync(join(rootDir, "popup.js"), "utf8");
const contentScript = readFileSync(join(rootDir, "content.js"), "utf8");
const contentStyles = readFileSync(join(rootDir, "content.css"), "utf8");
const readabilityScript = readFileSync(join(rootDir, "readability.js"), "utf8");
const requiredFiles = [
  "manifest.json",
  "popup.html",
  "popup.css",
  "popup.js",
  "readability.js",
  "content.js",
  "content.css",
];
const requiredDirectories = ["backgrounds", "icons"];

function fail(message) {
  console.error(`Release validation failed: ${message}`);
  process.exit(1);
}

if (!/^\d+\.\d+\.\d+$/.test(manifest.version)) {
  fail(`manifest version "${manifest.version}" is not semantic x.y.z format`);
}
if (manifest.description.length > 132) {
  fail(`manifest description is ${manifest.description.length} characters; maximum is 132`);
}

for (const relativePath of [...requiredFiles, ...requiredDirectories]) {
  if (!existsSync(join(rootDir, relativePath))) {
    fail(`missing required path: ${relativePath}`);
  }
}

const backgrounds = readdirSync(join(rootDir, "backgrounds"))
  .filter((file) => !file.startsWith("."))
  .sort();
const expectedBackgrounds = ["cyber.jpg", "fantasy.jpg", "unicorns.jpg"];
if (JSON.stringify(backgrounds) !== JSON.stringify(expectedBackgrounds)) {
  fail("backgrounds must contain exactly the three optimized JPG assets");
}

for (const background of expectedBackgrounds) {
  if (!popupHtml.includes(`backgrounds/${background}`)) {
    fail(`popup does not reference backgrounds/${background}`);
  }
}

const popupIds = [...popupHtml.matchAll(/id="([^"]+)"/g)].map((match) => match[1]);
const duplicateId = popupIds.find((id, index) => popupIds.indexOf(id) !== index);
if (duplicateId) fail(`popup contains duplicate id: ${duplicateId}`);

const contentMatches = manifest.content_scripts?.flatMap((entry) => entry.matches) || [];
if (contentMatches.includes("https://x.com/*")) {
  fail("X access must stay scoped to the Grok route");
}

for (const group of manifest.web_accessible_resources || []) {
  for (const pattern of group.matches || []) {
    if (!/^https:\/\/[^/]+\/\*$/.test(pattern)) {
      fail(`web-accessible resource matches must use an origin with /*: ${pattern}`);
    }
  }
}

const tests = spawnSync(process.execPath, ["--test", "tests/readability.test.mjs"], {
  cwd: rootDir,
  stdio: "inherit",
});
if (tests.status !== 0) fail("readability regression tests failed");

const contentScriptFiles = manifest.content_scripts?.[0]?.js || [];
if (
  JSON.stringify(contentScriptFiles) !==
  JSON.stringify(["readability.js", "content.js"])
) {
  fail("readability.js must load immediately before content.js");
}
if (
  popupHtml.indexOf('<script src="readability.js"></script>') < 0 ||
  popupHtml.indexOf('<script src="readability.js"></script>') >
    popupHtml.indexOf('<script src="popup.js"></script>')
) {
  fail("readability.js must load immediately before popup.js");
}

const sharedSurfaceBlock = contentScript.match(
  /const SHARED_SECONDARY_SURFACE_SELECTORS = \[([\s\S]*?)\n\];/
)?.[1];
if (!sharedSurfaceBlock?.includes('[role="dialog"]')) {
  fail("secondary surfaces must retain the semantic dialog fallback");
}
if (
  !sharedSurfaceBlock.includes("document-panel") ||
  !sharedSurfaceBlock.includes("file-preview-panel")
) {
  fail("secondary surfaces must retain document and file preview fallbacks");
}

const surfaceContracts = {
  chatgpt: ["canvas-panel", "canvas-viewer"],
  claude: ["artifact-panel", "artifact-viewer"],
  gemini: ["immersive-panel", "canvas-panel"],
  grok: ["file-preview", "document-panel"],
};
for (const [site, fragments] of Object.entries(surfaceContracts)) {
  const block = contentScript.match(
    new RegExp(`\\n  ${site}: \\[([\\s\\S]*?)\\n  \\],`)
  )?.[1];
  if (!block || fragments.some((fragment) => !block.includes(fragment))) {
    fail(`missing ${site} secondary-surface selector contract`);
  }
}

for (const fragment of [
  '[data-chatfaces-surface="secondary"]',
  "--chatfaces-secondary-surface-bg",
  "--chatfaces-secondary-toolbar-bg",
  "--chatfaces-secondary-code-bg",
  "--chatfaces-user-text-color",
  "--chatfaces-assistant-text-color",
  "--chatfaces-secondary-text-color",
]) {
  if (!contentStyles.includes(fragment)) {
    fail(`content styles are missing secondary-surface fragment: ${fragment}`);
  }
}

for (const [file, source] of [
  ["popup.js", popupScript],
  ["content.js", contentScript],
]) {
  if (!source.includes("resolveReadability")) {
    fail(`${file} must use the shared readability guard`);
  }
}
if (!contentScript.includes("opacity.toFixed(3)")) {
  fail("content surfaces must retain three-decimal opacity precision");
}
if (!popupHtml.includes('id="readability-guard-status"')) {
  fail("popup must explain when Readability Guard changes an unsafe style");
}

const readabilityContext = {};
try {
  runInNewContext(readabilityScript, readabilityContext);
} catch (error) {
  fail(`readability guard could not initialize: ${error.message}`);
}

const readability = readabilityContext.ChatFacesReadability;
if (!readability || readability.MIN_TEXT_CONTRAST !== 4.5) {
  fail("readability guard must expose the WCAG 4.5:1 text contrast target");
}

const bubbleColors = [
  "#000000",
  "#ffffff",
  "#227864",
  "#1e1e32",
  "#845ec2",
  "#c34a36",
  "#f9a826",
  "#777777",
];
const textColors = [
  "#000000",
  "#111111",
  "#ffffff",
  "#e8e8ee",
  "#ffe9c7",
  "#777777",
];

for (const userBubbleColor of bubbleColors) {
  for (const assistantBubbleColor of bubbleColors) {
    for (const textColor of textColors) {
      for (const surfaceOpacity of [25, 55, 95]) {
        const result = readability.resolveReadability({
          userBubbleColor,
          assistantBubbleColor,
          textColor,
          surfaceOpacity,
        });

        for (const [surfaceName, surface] of Object.entries(result.surfaces)) {
          if (surface.contrast + 0.0001 < readability.MIN_TEXT_CONTRAST) {
            fail(
              `readability guard returned ${surface.contrast.toFixed(2)}:1 for ${surfaceName}`
            );
          }
          if (surface.opacity < 0 || surface.opacity > 1) {
            fail(`readability guard returned invalid opacity for ${surfaceName}`);
          }
        }
      }
    }
  }
}

const unsafeLightPair = readability.resolveReadableSurface(
  "#ffffff",
  "#ffffff",
  0.25
);
const unsafeDarkPair = readability.resolveReadableSurface(
  "#000000",
  "#000000",
  0.25
);
if (
  unsafeLightPair.textColor !== "#000000" ||
  unsafeDarkPair.textColor !== "#ffffff"
) {
  fail("readability guard must correct same-color text and surfaces");
}

for (const script of ["readability.js", "popup.js", "content.js"]) {
  const check = spawnSync(process.execPath, ["--check", join(rootDir, script)], {
    stdio: "inherit",
  });
  if (check.status !== 0) fail(`${script} did not pass syntax validation`);
}

const releaseRoot = join(rootDir, "release", "chrome-web-store");
const packageName = `my-chat-faces-v${manifest.version}`;
const stagingDir = join(releaseRoot, packageName);
const zipPath = join(releaseRoot, `${packageName}-chrome-web-store.zip`);

mkdirSync(releaseRoot, { recursive: true });
rmSync(stagingDir, { recursive: true, force: true });
rmSync(zipPath, { force: true });
mkdirSync(stagingDir, { recursive: true });

for (const file of requiredFiles) {
  cpSync(join(rootDir, file), join(stagingDir, file));
}
for (const directory of requiredDirectories) {
  cpSync(join(rootDir, directory), join(stagingDir, directory), {
    recursive: true,
  });
}

const zip = spawnSync("zip", ["-qr", zipPath, "."], {
  cwd: stagingDir,
  stdio: "inherit",
});
if (zip.status !== 0) fail("zip command failed");

const verify = spawnSync("unzip", ["-t", zipPath], { encoding: "utf8" });
if (verify.status !== 0) fail("archive integrity verification failed");
const packedManifest = spawnSync("unzip", ["-p", zipPath, "manifest.json"], { encoding: "utf8" });
if (packedManifest.status !== 0 || packedManifest.stdout !== readFileSync(manifestPath, "utf8")) {
  fail("archive manifest does not match the source version");
}

const archive = readFileSync(zipPath);
const checksum = createHash("sha256").update(archive).digest("hex");
const size = statSync(zipPath).size;
writeFileSync(`${zipPath}.sha256`, `${checksum}  ${packageName}-chrome-web-store.zip\n`);

console.log(`Release: ${manifest.version}`);
console.log(`ZIP: ${zipPath}`);
console.log(`Size: ${size} bytes`);
console.log(`SHA-256: ${checksum}`);
