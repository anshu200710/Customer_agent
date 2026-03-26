import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from 'url';
import OpenAI from "openai";
import dotenv from "dotenv";
import pLimit from "p-limit";

// Load environment variables from .env
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Paths
const DATASET_PATH = path.join(__dirname, '../data/dataset.json');
const VECTORS_PATH = path.join(__dirname, '../data/vectors.json');

const limit = pLimit(2); // Reduced limit for API rate safety (Tier 1 keys)

async function buildVectors() {
    try {
        console.log("🚀 Starting Vector DB Implementation...");
        
        // 1. Read dataset
        const rawData = await fs.readFile(DATASET_PATH, 'utf-8');
        const dataset = JSON.parse(rawData);
        
        console.log(`📊 Found ${dataset.length} items in dataset.json to index.`);

        const vectorData = {
            embeddings: []
        };

        // 2. Process each item (handles both manual input/output and transcribed data)
        const tasks = dataset.map((item, index) => limit(async () => {
            try {
                // Determine text to embed (source for similarity search)
                const textToEmbed = (item.input || item.transcript || "").toLowerCase().trim();
                
                if (!textToEmbed) {
                    console.log(`⚠️  Skipping item ${index}: No input or transcript found.`);
                    return null;
                }

                const response = await openai.embeddings.create({
                    model: "text-embedding-3-small",
                    input: textToEmbed,
                });

                // Determine what the AI should "learn" from this vector
                const problemText = item.input || item.transcript;
                const responseText = item.output || "[Context from call transcript]";

                console.log(`✅ [${index + 1}/${dataset.length}] Vectorized: ${problemText.substring(0, 40)}...`);

                return {
                    problem: problemText,
                    response: responseText,
                    embedding: response.data[0].embedding,
                    source: item.file ? "transcription" : "manual_entry",
                    timestamp: new Date().toISOString()
                };
            } catch (err) {
                console.error(`❌ Error indexing item ${index}:`, err.message);
                return null;
            }
        }));

        const results = await Promise.all(tasks);
        
        // Filter out nulls and save
        vectorData.embeddings = results.filter(r => r !== null);

        // 3. Save to vectors.json (the format services/vector.js expects)
        await fs.writeFile(VECTORS_PATH, JSON.stringify(vectorData, null, 2), 'utf-8');

        console.log("\n✨ SUCCESS: Vector database is now implemented!");
        console.log(`🏁 Total Embeddings Generated: ${vectorData.embeddings.length}`);
        console.log(`📂 Saved to: data/vectors.json`);

    } catch (err) {
        console.error("💥 Implementation Failed:", err.message);
        if (err.message.includes("API key")) {
            console.log("💡 Tip: Check your OPENAI_API_KEY in the .env file.");
        }
    }
}

buildVectors();