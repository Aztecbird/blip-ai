import { parseResponse } from './src/services/ollama.js';

// The exact string the user reported
const rawUserReport = '{"emotion":"curious","text":"Certainly! I\'m checking the weather for Valencia, Spain, for you right now.","action":"weather","value_ms":null,"event_details":null,"tool_params":{"location":"Valencia, Spain"}}';

// 1. Simulate the raw string as it would be processed (sometimes Ollama wraps in markdown)
console.log("--- TEST 1: Clean String ---");
const result1 = parseResponse(rawUserReport);
console.log(JSON.stringify(result1, null, 2));

// 2. Simulate string wrapped in Markdown blocks (common issue)
console.log("\n--- TEST 2: Markdown Wrapped ---");
const markdownWrapped = `\`\`\`json\n${rawUserReport}\n\`\`\``;
const result2 = parseResponse(markdownWrapped);
console.log(JSON.stringify(result2, null, 2));

// 3. Simulate string with leading/trailing text (hallucinations)
console.log("\n--- TEST 3: Extra Text ---");
const extraText = `Here is the response:\n${rawUserReport}\nHope this helps!`;
const result3 = parseResponse(extraText);
console.log(JSON.stringify(result3, null, 2));
