import fs from 'fs';
import path from 'path';

const API_KEY = 'b68ccc4ed243fe76b00e41250290b64d';
const GENERATE_URL = 'https://api.nanobananaapi.ai/api/v1/nanobanana/generate-2';
const RECORD_INFO_URL = 'https://api.nanobananaapi.ai/api/v1/nanobanana/record-info';

const headers = {
  'Authorization': `Bearer ${API_KEY}`,
  'Content-Type': 'application/json'
};

const imagesToGenerate = [
  {
    name: 'onboarding-hero',
    prompt: "A modern minimal and flat vector illustration representing trust, connection, and full service platform in financial brokerage and contracts. Clean white background, corporate, highly professional, dribbble style UI illustration, red and dark blue accent colors. No text."
  },
  {
    name: 'onboarding-tanazul',
    prompt: "A modern minimal vector illustration of people exchanging a contract document safely. Clean white background, flat design, corporate, highly professional, dribbble style UI illustration, red and dark blue accent colors. No text."
  },
  {
    name: 'onboarding-taqib',
    prompt: "A modern minimal vector illustration of government administrative buildings and a certified agent stamp on a document. Clean white background, flat design, corporate, highly professional, dribbble style UI illustration, red and dark blue accent colors. No text."
  },
  {
    name: 'onboarding-damin',
    prompt: "A modern minimal vector illustration of a secure escrow financial transaction with a handshake, a shield, and a vault holding money. Clean white background, flat design, corporate, highly professional, dribbble style UI illustration, red and dark blue accent colors. No text."
  }
];

async function generateImage(prompt) {
  const response = await fetch(GENERATE_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      prompt,
      aspectRatio: '16:9',
      resolution: '1K',
      outputFormat: 'jpg'
    })
  });
  
  if (!response.ok) {
    throw new Error(`Generate API error: ${response.statusText}`);
  }
  
  const data = await response.json();
  if (data.code !== 200 || !data.data?.taskId) {
    throw new Error(`Failed to generate task: ${JSON.stringify(data)}`);
  }
  
  return data.data.taskId;
}

async function checkTaskStatus(taskId) {
  const url = new URL(RECORD_INFO_URL);
  url.searchParams.append('taskId', taskId);
  
  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`Check task API error: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data;
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function pollTask(taskId, maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    console.log(`Polling task ${taskId} (Attempt ${i + 1}/${maxAttempts})...`);
    const statusData = await checkTaskStatus(taskId);
    
    if (statusData.data?.successFlag === 1) {
      return statusData.data.response.resultImageUrl || statusData.data.response.originImageUrl;
    } else if (statusData.data?.successFlag === 2) {
      throw new Error(`Task failed: ${JSON.stringify(statusData)}`);
    }
    
    await sleep(3000); // Wait 3 seconds before next poll
  }
  
  throw new Error(`Task ${taskId} timed out.`);
}

async function downloadImage(url, destPath) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.statusText}`);
  }
  const buffer = await response.arrayBuffer();
  fs.writeFileSync(destPath, Buffer.from(buffer));
  console.log(`Saved image to ${destPath}`);
}

async function main() {
  const destDir = path.join(process.cwd(), 'assets', 'images', 'onboarding');
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  for (const item of imagesToGenerate) {
    console.log(`Starting generation for: ${item.name}`);
    try {
      const taskId = await generateImage(item.prompt);
      console.log(`Task created with ID: ${taskId}`);
      
      const imageUrl = await pollTask(taskId);
      console.log(`Image generated: ${imageUrl}`);
      
      const destPath = path.join(destDir, `${item.name}.jpg`);
      await downloadImage(imageUrl, destPath);
    } catch (error) {
      console.error(`Error processing ${item.name}:`, error.message);
    }
  }
}

main().catch(console.error);
