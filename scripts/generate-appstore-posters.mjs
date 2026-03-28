#!/usr/bin/env node
/**
 * Generate themed App Store posters from screenshots using NanoBanana API.
 *
 * Docs:
 * - https://docs.nanobananaapi.ai/nanobanana-api/generate-image-2
 * - https://docs.nanobananaapi.ai/nanobanana-api/get-task-details
 *
 * Usage:
 *   NANO_BANANA_API_KEY=xxxx node scripts/generate-appstore-posters.mjs
 *   node scripts/generate-appstore-posters.mjs --input assets/screenshots --output assets/screenshots/posters
 */

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const GENERATE_URL = "https://api.nanobananaapi.ai/api/v1/nanobanana/generate-2";
const TASK_URL = "https://api.nanobananaapi.ai/api/v1/nanobanana/record-info";
const TARGET_WIDTH = 1242;
const TARGET_HEIGHT = 2688;
const TARGET_BG = "0B214A";

const HEADLINES_BY_STEM = {
  IMG_1173: {
    title: "وسيط الآن",
    subtitle: "دخول سريع وآمن برقم الجوال",
    screenType: "login",
    mustKeep: ["مرحبا بعودتك", "وسيط الآن", "+966"],
  },
  IMG_1174: {
    title: "التنازل عن العقود",
    subtitle: "ابحث وتواصل بسهولة ووضوح",
    screenType: "tanazul_list",
    mustKeep: ["التنازل عن العقود", "اضف اعلان"],
  },
  IMG_1175: {
    title: "خدمات التعقيب",
    subtitle: "معاملاتك الحكومية في مكان واحد",
    screenType: "taqib_list",
    mustKeep: ["خدمات التعقيب"],
  },
  IMG_1176: {
    title: "تفاصيل الخدمة",
    subtitle: "كل المعلومات المهمة قبل التواصل",
    screenType: "taqib_details",
    mustKeep: ["خدمات المرور", "تواصل الآن"],
  },
  IMG_1177: {
    title: "تفاصيل التنازل",
    subtitle: "بيانات واضحة واتفاق موثوق",
    screenType: "tanazul_details",
    mustKeep: ["تفاصيل التنازل", "مبلغ التنازل", "تواصل"],
  },
  IMG_1178: {
    title: "الصفحة الرئيسية",
    subtitle: "التنازل والتعقيب والضامن",
    screenType: "home",
    mustKeep: ["خدماتنا", "تنازل", "تعقيب", "الضامن"],
  },
  IMG_1179: {
    title: "الملف الشخصي",
    subtitle: "إدارة حسابك وإعلاناتك بسهولة",
    screenType: "profile",
    mustKeep: ["إعلاناتي", "الحساب", "المعلومات الشخصية"],
  },
};

function parseArgs(argv) {
  const args = {
    input: "assets/screenshots",
    output: "assets/screenshots/posters-raw",
    final: "assets/screenshots/posters-appstore-6.5",
    apiKey: process.env.NANO_BANANA_API_KEY || "",
    ratio: "9:16",
    resolution: "2K",
    timeoutSec: 360,
    pollEverySec: 6,
    dryRun: false,
    include: /^IMG_\d+\.(png|jpg|jpeg)$/i,
    callbackUrl: "",
    uploadProvider: "tmpfiles",
    userAgent: "kafel-appstore-poster-bot/1.0 (contact: mahm0udsaad@icloud.com)",
    textOnly: false,
    skipExisting: true,
    only: "",
  };

  for (let i = 2; i < argv.length; i += 1) {
    const cur = argv[i];
    const next = argv[i + 1];
    if (cur === "--help" || cur === "-h") {
      printHelp();
      process.exit(0);
    }
    if (cur === "--input" && next) {
      args.input = next;
      i += 1;
      continue;
    }
    if (cur === "--output" && next) {
      args.output = next;
      i += 1;
      continue;
    }
    if (cur === "--final" && next) {
      args.final = next;
      i += 1;
      continue;
    }
    if (cur === "--api-key" && next) {
      args.apiKey = next;
      i += 1;
      continue;
    }
    if (cur === "--ratio" && next) {
      args.ratio = next;
      i += 1;
      continue;
    }
    if (cur === "--resolution" && next) {
      args.resolution = next;
      i += 1;
      continue;
    }
    if (cur === "--poll-every-sec" && next) {
      args.pollEverySec = Number(next);
      i += 1;
      continue;
    }
    if (cur === "--timeout-sec" && next) {
      args.timeoutSec = Number(next);
      i += 1;
      continue;
    }
    if (cur === "--callback-url" && next) {
      args.callbackUrl = next;
      i += 1;
      continue;
    }
    if (cur === "--dry-run") {
      args.dryRun = true;
      continue;
    }
    if (cur === "--upload-provider" && next) {
      args.uploadProvider = next;
      i += 1;
      continue;
    }
    if (cur === "--user-agent" && next) {
      args.userAgent = next;
      i += 1;
      continue;
    }
    if (cur === "--text-only") {
      args.textOnly = true;
      continue;
    }
    if (cur === "--skip-existing") {
      args.skipExisting = true;
      continue;
    }
    if (cur === "--no-skip-existing") {
      args.skipExisting = false;
      continue;
    }
    if (cur === "--only" && next) {
      args.only = next;
      i += 1;
      continue;
    }
  }
  return args;
}

function printHelp() {
  console.log(`
Generate themed App Store posters using NanoBanana API.

Required:
  --api-key <key> or env NANO_BANANA_API_KEY

Optional:
  --input <dir>          Input screenshots directory (default: assets/screenshots)
  --output <dir>         Raw generated posters directory (default: assets/screenshots/posters-raw)
  --final <dir>          Final 1242x2688 output directory (default: assets/screenshots/posters-appstore-6.5)
  --ratio <value>        API aspect ratio (default: 9:16)
  --resolution <value>   1K | 2K | 4K (default: 2K)
  --poll-every-sec <n>   Poll interval in seconds (default: 6)
  --timeout-sec <n>      Per-image timeout in seconds (default: 360)
  --callback-url <url>   Optional API callback URL
  --upload-provider <p>  Local file uploader: tmpfiles | 0x0 | none (default: tmpfiles)
  --user-agent <ua>      Custom UA used for uploader requests
  --text-only            Force text-to-image mode (no reference screenshot)
  --skip-existing        Skip outputs that already exist (default: true)
  --no-skip-existing     Regenerate even if output file exists
  --only <pattern>       Process only files matching pattern (e.g. IMG_1175)
  --dry-run              Print actions only (no API calls)

Example:
  NANO_BANANA_API_KEY=xxxx node scripts/generate-appstore-posters.mjs
`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isImageFile(name) {
  return /\.(png|jpg|jpeg)$/i.test(name);
}

function mimeFromExt(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  return "application/octet-stream";
}

async function uploadReferenceImage(filePath, provider, userAgent) {
  if (provider === "none") return "";
  if (provider !== "0x0" && provider !== "tmpfiles") {
    throw new Error(`Unsupported upload provider: ${provider}`);
  }

  if (provider === "tmpfiles") {
    // tmpfiles.org API: returns JSON with a public page URL; convert to direct download URL.
    const { stdout, stderr } = await execFileAsync(
      "curl",
      ["-sS", "-A", userAgent, "-F", `file=@${filePath}`, "https://tmpfiles.org/api/v1/upload"],
      {
        encoding: "utf8",
        maxBuffer: 1024 * 1024 * 5,
      }
    );

    let json = {};
    try {
      json = JSON.parse(stdout || "{}");
    } catch {
      // fall through and throw detailed error below
    }

    const pageUrlRaw = String(json?.data?.url || "");
    const pageUrl = pageUrlRaw.replace(/^http:\/\//i, "https://");
    if (!pageUrl.startsWith("https://tmpfiles.org/")) {
      throw new Error(
        `tmpfiles upload failed for ${filePath}. stdout="${String(stdout || "").trim()}" stderr="${String(stderr || "").trim()}"`
      );
    }

    // Convert: https://tmpfiles.org/123/abc.png -> https://tmpfiles.org/dl/123/abc.png
    return pageUrl.replace("https://tmpfiles.org/", "https://tmpfiles.org/dl/");
  }

  // 0x0.st returns a direct URL in plain text.
  const { stdout, stderr } = await execFileAsync(
    "curl",
    ["-sS", "-A", userAgent, "-F", `file=@${filePath}`, "https://0x0.st"],
    {
      encoding: "utf8",
      maxBuffer: 1024 * 1024,
    }
  );
  const out = String(stdout || "").trim();
  if (!out.startsWith("https://")) {
    throw new Error(`0x0 upload failed for ${filePath}. stdout="${out}" stderr="${String(stderr || "").trim()}"`);
  }
  return out;
}

function buildPrompt({ title, subtitle, screenType, mustKeep }) {
  const mustKeepText = Array.isArray(mustKeep) && mustKeep.length
    ? `Mandatory in the final image: preserve these exact Arabic UI words from the reference screenshot: ${mustKeep.map((x) => `"${x}"`).join(", ")}.`
    : "";
  return [
    "Create a premium App Store marketing poster in Arabic for the app \"وسيط الآن\".",
    `This reference is the "${screenType || "app"}" screen. DO NOT change it to any other screen type.`,
    "Reference-lock mode: keep the provided screenshot content and structure exactly as-is.",
    "Do NOT replace any UI texts, do NOT invent new app sections, do NOT swap services between screenshots.",
    "You may improve only visual styling around the screenshot (background, framing, headline area).",
    "If adding overlays, keep all in-screen Arabic labels readable and unchanged.",
    "Style: elegant Saudi-focused fintech/service marketplace, dark navy brand palette, subtle gradients, clean typography.",
    "Add a short Arabic headline and subheadline at the top with strong readability:",
    `Headline: "${title}"`,
    `Subheadline: "${subtitle}"`,
    mustKeepText,
    "Do not add logos of other brands. Do not add watermarks. Keep text error-free Arabic.",
    "Final composition should feel like an App Store poster screenshot, portrait 9:16, high contrast, polished.",
  ].join(" ");
}

async function apiGenerateTask({ apiKey, prompt, imageUrls, ratio, resolution, callbackUrl }) {
  const body = {
    prompt,
    imageUrls: imageUrls || [],
    aspectRatio: ratio,
    resolution,
    googleSearch: false,
    outputFormat: "png",
  };
  if (callbackUrl) body.callBackUrl = callbackUrl;

  const res = await fetch(GENERATE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));

  if (!res.ok || Number(json?.code) !== 200 || !json?.data?.taskId) {
    throw new Error(`Generate request failed: HTTP ${res.status} ${JSON.stringify(json)}`);
  }
  return json.data.taskId;
}

function extractResultUrl(taskJson) {
  const data = taskJson?.data || {};
  const response = data?.response || {};
  const candidates = [
    response.resultImageUrl,
    response.resultUrl,
    response.imageUrl,
    response.url,
    data.resultImageUrl,
    data.imageUrl,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.startsWith("http")) return c;
  }

  const arrays = [
    response.resultImageUrls,
    response.images,
    response.urls,
    data.resultImageUrls,
    data.images,
  ];
  for (const arr of arrays) {
    if (Array.isArray(arr)) {
      const first = arr.find((x) => typeof x === "string" && x.startsWith("http"));
      if (first) return first;
    }
  }
  return "";
}

async function apiPollTask({ apiKey, taskId, timeoutSec, pollEverySec }) {
  const start = Date.now();
  while (Date.now() - start < timeoutSec * 1000) {
    const u = new URL(TASK_URL);
    u.searchParams.set("taskId", taskId);

    const res = await fetch(u.toString(), {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(`Poll failed for ${taskId}: HTTP ${res.status} ${JSON.stringify(json)}`);
    }

    const flag = Number(json?.data?.successFlag);
    if (flag === 1) {
      const resultUrl = extractResultUrl(json);
      if (!resultUrl) {
        throw new Error(`Task ${taskId} succeeded but no result URL found: ${JSON.stringify(json)}`);
      }
      return { task: json, resultUrl };
    }
    if (flag === 2 || flag === 3) {
      throw new Error(
        `Task ${taskId} failed: code=${json?.data?.errorCode} message=${json?.data?.errorMessage || "unknown"}`
      );
    }

    await sleep(pollEverySec * 1000);
  }

  throw new Error(`Task ${taskId} timed out after ${timeoutSec}s`);
}

async function downloadToFile(url, filePath) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Download failed (${res.status}) for ${url}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  await fs.writeFile(filePath, Buffer.from(arrayBuffer));
}

async function normalizeToAppStore65(inputFile, outputFile) {
  const ext = path.extname(outputFile).toLowerCase();
  const format = ext === ".jpg" || ext === ".jpeg" ? "jpeg" : "png";
  const tmp = `${outputFile}.tmp.${format}`;

  await fs.copyFile(inputFile, tmp);

  const dims = await execFileAsync("sips", ["-g", "pixelWidth", "-g", "pixelHeight", tmp], {
    encoding: "utf8",
  });
  const widthMatch = dims.stdout.match(/pixelWidth:\s+(\d+)/);
  const heightMatch = dims.stdout.match(/pixelHeight:\s+(\d+)/);
  const w = Number(widthMatch?.[1]);
  const h = Number(heightMatch?.[1]);
  if (!w || !h) {
    throw new Error(`Could not read image dimensions for ${tmp}`);
  }

  if (w * TARGET_HEIGHT > h * TARGET_WIDTH) {
    await execFileAsync("sips", ["--resampleWidth", String(TARGET_WIDTH), tmp], { encoding: "utf8" });
  } else {
    await execFileAsync("sips", ["--resampleHeight", String(TARGET_HEIGHT), tmp], { encoding: "utf8" });
  }

  await execFileAsync(
    "sips",
    ["--padToHeightWidth", String(TARGET_HEIGHT), String(TARGET_WIDTH), "--padColor", TARGET_BG, tmp],
    { encoding: "utf8" }
  );

  await execFileAsync("sips", ["-s", "format", format, tmp, "--out", outputFile], { encoding: "utf8" });
  await fs.rm(tmp, { force: true });
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.apiKey && !args.dryRun) {
    throw new Error("Missing API key. Provide --api-key or set NANO_BANANA_API_KEY.");
  }

  const inputAbs = path.resolve(args.input);
  const outputAbs = path.resolve(args.output);
  const finalAbs = path.resolve(args.final);
  await fs.mkdir(outputAbs, { recursive: true });
  await fs.mkdir(finalAbs, { recursive: true });

  const all = await fs.readdir(inputAbs);
  const images = all
    .filter((f) => isImageFile(f))
    .filter((f) => args.include.test(f))
    .filter((f) => (args.only ? f.includes(args.only) : true))
    .sort((a, b) => a.localeCompare(b, "en"));

  if (images.length === 0) {
    throw new Error(`No input screenshots found in ${inputAbs}`);
  }

  console.log(`Found ${images.length} input screenshots`);
  for (let i = 0; i < images.length; i += 1) {
    const fileName = images[i];
    const inputPath = path.join(inputAbs, fileName);
    const stem = path.parse(fileName).name;
    const rawOut = path.join(outputAbs, `${stem}-poster.png`);
    const finalOut = path.join(finalAbs, `${stem}-poster-1242x2688.png`);
    if (args.skipExisting && !args.dryRun) {
      try {
        await fs.access(finalOut);
        console.log(`\n[${i + 1}/${images.length}] ${fileName}`);
        console.log(`Skipping existing: ${path.relative(process.cwd(), finalOut)}`);
        continue;
      } catch {
        // file doesn't exist -> proceed
      }
    }

    const text = HEADLINES_BY_STEM[stem] || {
      title: "وسيط الآن",
      subtitle: "منصة موثوقة للخدمات الرقمية",
      screenType: "generic",
      mustKeep: [],
    };
    const prompt = buildPrompt(text);

    console.log(`\n[${i + 1}/${images.length}] ${fileName}`);
    if (args.dryRun) {
      console.log(`Prompt: ${prompt}`);
      console.log(`Upload provider: ${args.uploadProvider}`);
      console.log(`User agent: ${args.userAgent}`);
      continue;
    }

    let hostedImageUrl = "";
    if (!args.textOnly) {
      console.log(`Uploading reference image via ${args.uploadProvider} ...`);
      hostedImageUrl = await uploadReferenceImage(inputPath, args.uploadProvider, args.userAgent);
      if (hostedImageUrl) {
        console.log(`Reference URL: ${hostedImageUrl}`);
      } else {
        console.log("No reference URL (text-only mode)");
      }
    }

    const taskId = await apiGenerateTask({
      apiKey: args.apiKey,
      prompt,
      imageUrls: hostedImageUrl ? [hostedImageUrl] : [],
      ratio: args.ratio,
      resolution: args.resolution,
      callbackUrl: args.callbackUrl,
    });
    console.log(`Task created: ${taskId}`);

    const { resultUrl } = await apiPollTask({
      apiKey: args.apiKey,
      taskId,
      timeoutSec: args.timeoutSec,
      pollEverySec: args.pollEverySec,
    });
    console.log(`Result URL: ${resultUrl}`);

    await downloadToFile(resultUrl, rawOut);
    await normalizeToAppStore65(rawOut, finalOut);
    console.log(`Saved raw:   ${path.relative(process.cwd(), rawOut)}`);
    console.log(`Saved final: ${path.relative(process.cwd(), finalOut)}`);
  }

  console.log("\nDone.");
  console.log(`Raw posters:   ${path.relative(process.cwd(), outputAbs)}`);
  console.log(`App Store set: ${path.relative(process.cwd(), finalAbs)}`);
}

main().catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
