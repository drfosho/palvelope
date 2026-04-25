/* eslint-disable */
// Generates app icon, adaptive icon, and splash PNGs from brand tokens.
// Run with: node scripts/generate-assets.js

const fs = require("fs");
const path = require("path");
const { createCanvas, registerFont } = require("canvas");

const BG = "#FBFAF6";          // paper-0
const ENVELOPE = "#3A7290";    // ocean-5
const WORDMARK = "#1A3A4A";    // ocean-7

const ASSETS_DIR = path.join(__dirname, "..", "assets");
if (!fs.existsSync(ASSETS_DIR)) fs.mkdirSync(ASSETS_DIR, { recursive: true });

// ─── Envelope drawer (matches BrandMark.tsx 24×24 viewBox) ─────────────────
// Outer rect: viewBox (2,5) → (22,19) — 20 wide × 14 tall, corner ~r=2
// Flap: starts (2,7), apex (12,13), ends (22,7) — apex is 8/14 from top
function drawEnvelope(ctx, cx, cy, width, color, strokeWidth) {
  const height = width * (14 / 20);
  const x = cx - width / 2;
  const y = cy - height / 2;
  const r = (2 / 14) * height;

  ctx.strokeStyle = color;
  ctx.lineWidth = strokeWidth;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Rounded rectangle body
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.stroke();

  // Flap (V) — from top-left corner of inner area down to apex and back up
  const flapTopY = y + (2 / 14) * height; // viewBox y=7
  const apexY = y + (8 / 14) * height;    // viewBox y=13
  ctx.beginPath();
  ctx.moveTo(x, flapTopY);
  ctx.lineTo(cx, apexY);
  ctx.lineTo(x + width, flapTopY);
  ctx.stroke();
}

// ─── App icon (1024 × 1024) ────────────────────────────────────────────────
function generateIcon(outPath) {
  const size = 1024;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");

  // Background
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, size, size);

  // Envelope — ~50% of width, lifted slightly above center to leave room for wordmark
  const envWidth = size * 0.5;
  drawEnvelope(ctx, size / 2, size / 2 - size * 0.06, envWidth, ENVELOPE, 28);

  // Wordmark
  ctx.fillStyle = WORDMARK;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.font = "400 110px Georgia";
  ctx.fillText("Palvelope", size / 2, size * 0.78);

  fs.writeFileSync(outPath, canvas.toBuffer("image/png"));
  console.log("wrote", path.relative(process.cwd(), outPath));
}

// ─── Splash (1024 × 1024) ──────────────────────────────────────────────────
// Same layout as icon — Expo `resizeMode: contain` will scale to fit device.
function generateSplash(outPath) {
  const size = 1024;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, size, size);

  // BrandMark-style horizontal layout: envelope + "Palvelope" side by side
  const envWidth = size * 0.18;
  const gap = 24;
  ctx.font = "400 96px Georgia";
  const wordmarkText = "Palvelope";
  const wordmarkWidth = ctx.measureText(wordmarkText).width;
  const totalWidth = envWidth + gap + wordmarkWidth;
  const startX = (size - totalWidth) / 2;
  const cy = size / 2;

  drawEnvelope(ctx, startX + envWidth / 2, cy, envWidth, ENVELOPE, 14);

  ctx.fillStyle = WORDMARK;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(wordmarkText, startX + envWidth + gap, cy + 2);

  fs.writeFileSync(outPath, canvas.toBuffer("image/png"));
  console.log("wrote", path.relative(process.cwd(), outPath));
}

generateIcon(path.join(ASSETS_DIR, "icon.png"));
generateIcon(path.join(ASSETS_DIR, "adaptive-icon.png"));
generateSplash(path.join(ASSETS_DIR, "splash.png"));
console.log("done");
