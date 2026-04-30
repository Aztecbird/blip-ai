import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runCheck() {
  console.log("🏙️  BLIP DESKTOP HEALTH CHECK (ESM)...");
  
  const files = [
    'src/blip-polyphony/core/orchestrator.js',
    'src/blip-polyphony/agents/presence/perception_agent.js',
    'src/blip-polyphony/services/memoryStore.js',
    'src/main.js',
    'index.html',
    '.env.local'
  ];

  let missing = 0;
  files.forEach(f => {
    const fullPath = path.join(process.cwd(), f);
    if (fs.existsSync(fullPath)) {
      console.log(`✅ ${f.padEnd(45)} [FOUND]`);
    } else {
      console.log(`❌ ${f.padEnd(45)} [MISSING]`);
      missing++;
    }
  });

  console.log("\n---");
  if (missing === 0) {
    console.log("🚀 ALL POLYPHONY COMPONENTS ARE IN PLACE ON YOUR DESKTOP.");
  } else {
    console.log(`⚠️  ${missing} COMPONENTS ARE MISSING. PLEASE CHECK SYNC.`);
  }
}

runCheck();
