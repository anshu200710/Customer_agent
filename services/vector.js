import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import Groq from 'groq-sdk';
import OpenAI from 'openai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATASET_PATH = path.join(__dirname, '../../data/dataset.json');
const VECTORS_PATH = path.join(__dirname, '../../data/vectors.json');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// In-memory cache to avoid re-reading files constantly
let datasetCache = null;
let vectorsCache = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60000; // 1 minute

/**
 * Load dataset from file with caching
 */
async function loadDataset() {
    const now = Date.now();

    if (datasetCache && (now - cacheTimestamp) < CACHE_TTL) {
        return datasetCache;
    }

    try {
        const data = await fs.readFile(DATASET_PATH, 'utf-8');
        datasetCache = JSON.parse(data);
        cacheTimestamp = now;
        return datasetCache;
    } catch (err) {
        if (err.code === 'ENOENT') {
            // File doesn't exist, create it
            datasetCache = { conversations: [] };
            await saveDataset(datasetCache);
            return datasetCache;
        }
        throw err;
    }
}

/**
 * Save dataset to file
 */
async function saveDataset(dataset) {
    await ensureDataDirectory();
    await fs.writeFile(DATASET_PATH, JSON.stringify(dataset, null, 2), 'utf-8');
    datasetCache = dataset;
    cacheTimestamp = Date.now();
}

/**
 * Load vectors from file with caching
 */
async function loadVectors() {
    const now = Date.now();

    if (vectorsCache && (now - cacheTimestamp) < CACHE_TTL) {
        return vectorsCache;
    }

    try {
        const data = await fs.readFile(VECTORS_PATH, 'utf-8');
        vectorsCache = JSON.parse(data);
        cacheTimestamp = now;
        return vectorsCache;
    } catch (err) {
        if (err.code === 'ENOENT') {
            vectorsCache = { embeddings: [] };
            await saveVectors(vectorsCache);
            return vectorsCache;
        }
        throw err;
    }
}

/**
 * Save vectors to file
 */
async function saveVectors(vectors) {
    await ensureDataDirectory();
    await fs.writeFile(VECTORS_PATH, JSON.stringify(vectors, null, 2), 'utf-8');
    vectorsCache = vectors;
    cacheTimestamp = Date.now();
}

/**
 * Ensure data directory exists
 */
async function ensureDataDirectory() {
    const dataDir = path.join(__dirname, '../../data');
    try {
        await fs.access(dataDir);
    } catch {
        await fs.mkdir(dataDir, { recursive: true });
    }
}

/**
 * Generate embedding for text using OpenAI
 */
async function generateEmbedding(text) {
    try {
        if (!text) return new Array(1536).fill(0); // Standard OpenAI dimension

        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const response = await openai.embeddings.create({
            model: "text-embedding-3-small",
            input: text.toLowerCase().trim(),
        });

        return response.data[0].embedding;
    } catch (err) {
        console.error('❌ [Vector] OpenAI Embedding Error:', err.message);
        // Fallback to a zero-filled array to prevent crashes
        return new Array(1536).fill(0);
    }
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;

    let dotProduct = 0;
    let magA = 0;
    let magB = 0;

    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        magA += vecA[i] * vecA[i];
        magB += vecB[i] * vecB[i];
    }

    magA = Math.sqrt(magA);
    magB = Math.sqrt(magB);

    if (magA === 0 || magB === 0) return 0;

    return dotProduct / (magA * magB);
}

/**
 * Get similar conversations based on user input
 */
export async function getSimilarConversations(userInput, topK = 3) {
    try {
        if (!userInput || userInput.length < 3) {
            return [];
        }

        const vectors = await loadVectors();

        if (!vectors.embeddings || vectors.embeddings.length === 0) {
            return [];
        }

        // Generate embedding for user input
        const queryEmbedding = await generateEmbedding(userInput);

        // Calculate similarities
        const similarities = vectors.embeddings.map(item => ({
            ...item,
            similarity: cosineSimilarity(queryEmbedding, item.embedding)
        }));

        // Sort by similarity and get top K
        const topResults = similarities
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, topK)
            .filter(item => item.similarity > 0.3); // Threshold

        return topResults.map(item => ({
            problem: item.problem,
            response: item.response,
            similarity: item.similarity
        }));

    } catch (err) {
        console.error('❌ [Vector] Error getting similar conversations:', err.message);
        return [];
    }
}

/**
 * Add conversation to dataset and generate embedding
 */
export async function addConversationEmbedding(conversationRecord) {
    try {
        // Load current data
        const dataset = await loadDataset();
        const vectors = await loadVectors();

        // Add to dataset
        dataset.conversations.push(conversationRecord);

        // Keep only last 1000 conversations to avoid file getting too large
        if (dataset.conversations.length > 1000) {
            dataset.conversations = dataset.conversations.slice(-1000);
        }

        // Save dataset
        await saveDataset(dataset);

        // Generate embedding for the conversation
        const problemText = `${conversationRecord.problem} ${conversationRecord.userInput}`;
        const responseText = conversationRecord.agentResponses;

        const embedding = await generateEmbedding(problemText);

        // Add to vectors
        vectors.embeddings.push({
            id: conversationRecord.callSid,
            timestamp: conversationRecord.timestamp,
            problem: conversationRecord.problem,
            response: responseText.split('|')[0]?.trim() || 'Ji', // First response
            embedding
        });

        // Keep only last 1000 embeddings
        if (vectors.embeddings.length > 1000) {
            vectors.embeddings = vectors.embeddings.slice(-1000);
        }

        // Save vectors
        await saveVectors(vectors);

        console.log(`   🧠 [Vector] Added embedding for call ${conversationRecord.callSid}`);

    } catch (err) {
        console.error('❌ [Vector] Error adding conversation:', err.message);
    }
}

/**
 * Get dataset statistics
 */
export async function getDatasetStats() {
    try {
        const dataset = await loadDataset();
        const vectors = await loadVectors();

        return {
            totalConversations: dataset.conversations.length,
            totalEmbeddings: vectors.embeddings.length,
            lastUpdated: cacheTimestamp > 0 ? new Date(cacheTimestamp).toISOString() : null
        };
    } catch (err) {
        console.error('❌ [Vector] Error getting stats:', err.message);
        return { totalConversations: 0, totalEmbeddings: 0, lastUpdated: null };
    }
}

export default { getSimilarConversations, addConversationEmbedding, getDatasetStats };