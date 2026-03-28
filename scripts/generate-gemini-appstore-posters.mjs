#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import sharp from "sharp";

const execFileAsync = promisify(execFile);
const TARGET_WIDTH = 1242;
const TARGET_HEIGHT = 2688;
const OUTPUT_DIR = "assets/screenshots/appstore-gemini";
const META_FILE = "_metadata.json";
const DEFAULT_MODEL = "gemini-2.5-pro";
const INPUT_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);

const FILE_PRESETS = {
  IMG_1175: {
    title: "التنازل عن العقود",
    subtitle: "ابحث عن العقود المناسبة وتواصل بوضوح قبل الاتفاق",
    footer: "وسيط الآن",
  },
  IMG_1177: {
    title: "خدمات التعقيب",
    subtitle: "أنجز معاملاتك الحكومية بخيارات واضحة ومكاتب معتمدة",
    footer: "وسيط الآن",
  },
};

function parseArgs(argv) {
  const args = {
    input: "assets/screenshots",
    output: OUTPUT_DIR,
    apiKey: process.env.GEMINI_API_KEY || "",
    model: process.env.GEMINI_MODEL || DEFAULT_MODEL,
    offline: false,
    only: "",
    overwrite: false,
  };

  for (let index = 2; index < argv.length; index += 1) {
    const current = argv[index];
    const next = argv[index + 1];

    if (current === "--help" || current === "-h") {
      printHelp();
      process.exit(0);
    }
    if (current === "--input" && next) {
      args.input = next;
      index += 1;
      continue;
    }
    if (current === "--output" && next) {
      args.output = next;
      index += 1;
      continue;
    }
    if (current === "--api-key" && next) {
      args.apiKey = next;
      index += 1;
      continue;
    }
    if (current === "--model" && next) {
      args.model = next;
      index += 1;
      continue;
    }
    if (current === "--only" && next) {
      args.only = next;
      index += 1;
      continue;
    }
    if (current === "--offline") {
      args.offline = true;
      continue;
    }
    if (current === "--overwrite") {
      args.overwrite = true;
    }
  }

  return args;
}

function printHelp() {
  console.log(`
Create App Store listing posters from local screenshots.

Usage:
  GEMINI_API_KEY=xxxx node scripts/generate-gemini-appstore-posters.mjs

Options:
  --input <dir>       Input screenshots directory. Default: assets/screenshots
  --output <dir>      Output directory. Default: ${OUTPUT_DIR}
  --api-key <key>     Gemini API key. Default: GEMINI_API_KEY env var
  --model <name>      Gemini model for metadata generation. Default: ${DEFAULT_MODEL}
  --only <pattern>    Only process files containing the pattern
  --offline           Skip Gemini and use local fallback copy
  --overwrite         Regenerate existing posters

Notes:
  - Final files are exported as 1242x2688 PNGs for App Store portrait listings.
  - Gemini is used only to generate Arabic poster copy and layout hints.
  - The visual composition is rendered locally so the output remains consistent.
`);
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function ensureEven(value) {
  return Math.round(value / 2) * 2;
}

async function readImages(inputDir, onlyPattern) {
  const files = await fs.readdir(inputDir);
  return files
    .filter((name) => INPUT_EXTENSIONS.has(path.extname(name).toLowerCase()))
    .filter((name) => !name.endsWith("-poster.png"))
    .filter((name) => !onlyPattern || name.includes(onlyPattern))
    .sort((left, right) => left.localeCompare(right, "en"));
}

function filenameStem(fileName) {
  return path.parse(fileName).name;
}

function mimeTypeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  return "image/jpeg";
}

async function fileToInlinePart(filePath) {
  const bytes = await fs.readFile(filePath);
  return {
    inline_data: {
      mime_type: mimeTypeFor(filePath),
      data: bytes.toString("base64"),
    },
  };
}

function geminiPrompt(fileName) {
  return [
    "You are designing Arabic App Store screenshot copy for a Saudi services marketplace app called \"وسيط الآن\".",
    `The attached image is the app screenshot named "${fileName}".`,
    "Study the screen and return concise Arabic marketing copy that matches the screen content.",
    "Reference style: premium dark navy background, elegant gold highlight title, centered iPhone mockup, polished App Store presentation.",
    "Do not invent features that are not visible in the screenshot.",
    "Return JSON only with this exact schema:",
    '{"title":"...","subtitle":"...","footer":"...","style_notes":"..."}',
    "Rules:",
    "- title: 2 to 4 Arabic words.",
    "- subtitle: one short Arabic sentence, max 70 characters.",
    "- footer: exactly \"وسيط الآن\" unless the screen strongly suggests another app name.",
    "- style_notes: one short English phrase describing emphasis, max 8 words.",
  ].join(" ");
}

function stripCodeFence(text) {
  return text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

async function generateGeminiMetadata({ apiKey, model, fileName, filePath }) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      generationConfig: {
        temperature: 0.3,
        responseMimeType: "application/json",
      },
      contents: [
        {
          role: "user",
          parts: [
            { text: geminiPrompt(fileName) },
            await fileToInlinePart(filePath),
          ],
        },
      ],
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Gemini request failed for ${fileName}: HTTP ${response.status} ${JSON.stringify(payload)}`);
  }

  const text = payload?.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim();
  if (!text) {
    throw new Error(`Gemini returned no text for ${fileName}`);
  }

  const parsed = JSON.parse(stripCodeFence(text));
  return {
    title: parsed.title,
    subtitle: parsed.subtitle,
    footer: parsed.footer,
    styleNotes: parsed.style_notes || "",
    source: "gemini",
    model,
  };
}

function fallbackMetadata(fileName) {
  const preset = FILE_PRESETS[filenameStem(fileName)];
  if (preset) {
    return {
      ...preset,
      styleNotes: "premium navy and gold",
      source: "fallback-preset",
      model: "none",
    };
  }

  return {
    title: "وسيط الآن",
    subtitle: "تجربة موثوقة لعرض الخدمات والتفاصيل بشكل احترافي",
    footer: "وسيط الآن",
    styleNotes: "premium app store poster",
    source: "fallback-default",
    model: "none",
  };
}

function sanitizeMetadata(metadata) {
  return {
    title: String(metadata.title || "وسيط الآن").trim(),
    subtitle: String(metadata.subtitle || "تجربة موثوقة لعرض الخدمات والتفاصيل بشكل احترافي").trim(),
    footer: String(metadata.footer || "وسيط الآن").trim(),
    styleNotes: String(metadata.styleNotes || "").trim(),
    source: String(metadata.source || "unknown"),
    model: String(metadata.model || ""),
  };
}

function backgroundSvg(metadata) {
  return `
  <svg width="${TARGET_WIDTH}" height="${TARGET_HEIGHT}" viewBox="0 0 ${TARGET_WIDTH} ${TARGET_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#07162F"/>
        <stop offset="48%" stop-color="#0A244A"/>
        <stop offset="100%" stop-color="#071A38"/>
      </linearGradient>
      <radialGradient id="goldGlow" cx="0.5" cy="0.5" r="0.65">
        <stop offset="0%" stop-color="#E6C77A" stop-opacity="0.34"/>
        <stop offset="55%" stop-color="#E6C77A" stop-opacity="0.12"/>
        <stop offset="100%" stop-color="#E6C77A" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="blueGlow" cx="0.5" cy="0.5" r="0.65">
        <stop offset="0%" stop-color="#2D5B9C" stop-opacity="0.32"/>
        <stop offset="100%" stop-color="#2D5B9C" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="goldText" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#B98F44"/>
        <stop offset="50%" stop-color="#E9CF84"/>
        <stop offset="100%" stop-color="#B88A3E"/>
      </linearGradient>
      <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="28"/>
      </filter>
      <filter id="titleShadow" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="0" dy="8" stdDeviation="16" flood-color="#000000" flood-opacity="0.38"/>
      </filter>
    </defs>

    <rect width="${TARGET_WIDTH}" height="${TARGET_HEIGHT}" fill="url(#bg)"/>
    <rect width="${TARGET_WIDTH}" height="250" fill="#102A57"/>
    <rect y="${TARGET_HEIGHT - 258}" width="${TARGET_WIDTH}" height="258" fill="#102A57"/>

    <circle cx="1110" cy="410" r="420" fill="url(#goldGlow)" filter="url(#softGlow)"/>
    <circle cx="170" cy="2010" r="360" fill="url(#goldGlow)" filter="url(#softGlow)"/>
    <circle cx="280" cy="1050" r="440" fill="url(#blueGlow)" filter="url(#softGlow)"/>
    <circle cx="980" cy="1860" r="420" fill="url(#blueGlow)" filter="url(#softGlow)"/>

    <g opacity="0.22" stroke="#B98F44" stroke-width="3" fill="none">
      <path d="M1110 856 l104 104 l-104 104 l-104 -104 z"/>
      <path d="M1144 912 l72 72 l-72 72 l-72 -72 z"/>
      <path d="M128 1840 l112 112 l-112 112 l-112 -112 z"/>
      <path d="M160 1900 l80 80 l-80 80 l-80 -80 z"/>
    </g>
  </svg>`;
}

function phoneFrameSvg({ x, y, width, height, radius }) {
  const outerStroke = 8;
  const innerStroke = 4;
  return `
  <svg width="${TARGET_WIDTH}" height="${TARGET_HEIGHT}" viewBox="0 0 ${TARGET_WIDTH} ${TARGET_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bezel" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#A97B32"/>
        <stop offset="30%" stop-color="#F5E0A0"/>
        <stop offset="52%" stop-color="#D8BC73"/>
        <stop offset="72%" stop-color="#F0DA9A"/>
        <stop offset="100%" stop-color="#A77830"/>
      </linearGradient>
      <linearGradient id="glass" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#98BCE5" stop-opacity="0.20"/>
        <stop offset="100%" stop-color="#091A31" stop-opacity="0.04"/>
      </linearGradient>
      <filter id="shadow" x="-40%" y="-40%" width="180%" height="180%">
        <feDropShadow dx="0" dy="32" stdDeviation="28" flood-color="#000000" flood-opacity="0.45"/>
      </filter>
    </defs>

    <g filter="url(#shadow)">
      <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}" fill="none" stroke="url(#bezel)" stroke-width="${outerStroke}"/>
      <rect x="${x + 16}" y="${y + 16}" width="${width - 32}" height="${height - 32}" rx="${radius - 16}" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="${innerStroke}"/>
      <rect x="${x + 12}" y="${y + 12}" width="${width - 24}" height="${height - 24}" rx="${radius - 14}" fill="url(#glass)" opacity="0.50"/>
    </g>

    <rect x="${x + width - 16}" y="${y + 500}" width="14" height="160" rx="7" fill="#D6BF7F"/>
    <rect x="${x + width - 16}" y="${y + 705}" width="14" height="188" rx="7" fill="#D6BF7F"/>
    <rect x="${x + 2}" y="${y + 680}" width="14" height="150" rx="7" fill="#D6BF7F"/>
  </svg>`;
}

async function roundedDisplayBuffer(imageBuffer, width, height, radius) {
  const roundedSvg = `
  <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${width}" height="${height}" rx="${radius}" ry="${radius}" fill="#ffffff"/>
  </svg>`;

  return sharp(imageBuffer)
    .resize(width, height, {
      fit: "cover",
      position: "centre",
    })
    .composite([
      {
        input: Buffer.from(roundedSvg),
        blend: "dest-in",
      },
    ])
    .png()
    .toBuffer();
}

async function renderNativeTextOverlay(metadata) {
  const swiftScript = path.resolve("scripts/render-appstore-arabic-text.swift");
  const moduleCachePath = path.resolve(".tmp/swift-module-cache");
  await ensureDir(moduleCachePath);
  const { stdout } = await execFileAsync(
    "swift",
    [
      "-module-cache-path",
      moduleCachePath,
      swiftScript,
      metadata.title,
      metadata.subtitle,
      metadata.footer,
      String(TARGET_WIDTH),
      String(TARGET_HEIGHT),
    ],
    {
      encoding: "utf8",
      maxBuffer: 1024 * 1024 * 10,
    }
  );

  return Buffer.from(String(stdout).trim(), "base64");
}

async function renderPoster({ inputPath, outputPath, metadata }) {
  const phoneWidth = 878;
  const phoneHeight = 1796;
  const phoneX = ensureEven((TARGET_WIDTH - phoneWidth) / 2);
  const phoneY = 720;
  const displayInset = 26;
  const displayWidth = phoneWidth - displayInset * 2;
  const displayHeight = phoneHeight - displayInset * 2;
  const displayX = phoneX + displayInset;
  const displayY = phoneY + displayInset;

  const screenshotBuffer = await roundedDisplayBuffer(
    await fs.readFile(inputPath),
    displayWidth,
    displayHeight,
    68
  );
  const nativeTextOverlay = await renderNativeTextOverlay(metadata);

  const grainSvg = `
  <svg width="${TARGET_WIDTH}" height="${TARGET_HEIGHT}" viewBox="0 0 ${TARGET_WIDTH} ${TARGET_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <filter id="noise">
      <feTurbulence type="fractalNoise" baseFrequency="0.95" numOctaves="2" stitchTiles="stitch"/>
      <feColorMatrix type="saturate" values="0"/>
      <feComponentTransfer>
        <feFuncA type="table" tableValues="0 0.035"/>
      </feComponentTransfer>
    </filter>
    <rect width="${TARGET_WIDTH}" height="${TARGET_HEIGHT}" filter="url(#noise)" opacity="0.22"/>
  </svg>`;

  await sharp({
    create: {
      width: TARGET_WIDTH,
      height: TARGET_HEIGHT,
      channels: 4,
      background: "#081C3D",
    },
  })
    .composite([
      { input: Buffer.from(backgroundSvg(metadata)) },
      { input: nativeTextOverlay },
      { input: screenshotBuffer, left: displayX, top: displayY },
      { input: Buffer.from(phoneFrameSvg({ x: phoneX, y: phoneY, width: phoneWidth, height: phoneHeight, radius: 128 })) },
      { input: Buffer.from(grainSvg), blend: "soft-light" },
    ])
    .png()
    .toFile(outputPath);
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const args = parseArgs(process.argv);
  const inputDir = path.resolve(args.input);
  const outputDir = path.resolve(args.output);

  await ensureDir(outputDir);

  const files = await readImages(inputDir, args.only);
  if (files.length === 0) {
    throw new Error(`No screenshots found in ${inputDir}`);
  }

  const metadataSummary = {};

  for (let index = 0; index < files.length; index += 1) {
    const fileName = files[index];
    const stem = filenameStem(fileName);
    const inputPath = path.join(inputDir, fileName);
    const outputPath = path.join(outputDir, `${stem}-poster-1242x2688.png`);

    if (!args.overwrite && await fileExists(outputPath)) {
      console.log(`[${index + 1}/${files.length}] Skip ${fileName} -> already exists`);
      continue;
    }

    console.log(`[${index + 1}/${files.length}] Render ${fileName}`);

    let metadata = fallbackMetadata(fileName);
    if (!args.offline && args.apiKey) {
      try {
        metadata = sanitizeMetadata(
          await generateGeminiMetadata({
            apiKey: args.apiKey,
            model: args.model,
            fileName,
            filePath: inputPath,
          })
        );
        console.log(`  Gemini copy: ${metadata.title} | ${metadata.subtitle}`);
      } catch (error) {
        console.warn(`  Gemini failed, using fallback copy. ${error.message}`);
      }
    } else {
      console.log("  Offline mode: using fallback copy");
    }

    metadataSummary[fileName] = metadata;
    await renderPoster({ inputPath, outputPath, metadata });

    const info = await sharp(outputPath).metadata();
    console.log(`  Saved ${path.relative(process.cwd(), outputPath)} (${info.width}x${info.height})`);
  }

  const metaPath = path.join(outputDir, META_FILE);
  await fs.writeFile(metaPath, `${JSON.stringify(metadataSummary, null, 2)}\n`, "utf8");
  console.log(`Metadata saved to ${path.relative(process.cwd(), metaPath)}`);
}

main().catch((error) => {
  console.error(`Error: ${error.message}`);
  process.exit(1);
});
