import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let faqCache = null;

/**
 * Load FAQ database from file
 */
function loadFAQDatabase() {
    if (faqCache) return faqCache;
    
    try {
        const faqPath = path.join(__dirname, '../knowledge/faqs.json');
        const data = fs.readFileSync(faqPath, 'utf-8');
        faqCache = JSON.parse(data);
        console.log(`✅ FAQ database loaded: ${faqCache.faqs.length} entries`);
        return faqCache;
    } catch (err) {
        console.error("❌ Failed to load FAQ database:", err.message);
        return { faqs: [], metadata: {} };
    }
}

/**
 * Search FAQ for matching question
 * Returns answer if found, null otherwise
 */
export function searchFAQ(userInput) {
    if (!userInput || userInput.length < 2) return null;
    
    const faqDb = loadFAQDatabase();
    const lo = userInput.toLowerCase().replace(/[।.!?]/g, ' ').trim();
    
    // Try exact pattern matching
    for (const faq of faqDb.faqs) {
        for (const pattern of faq.patterns) {
            if (lo.includes(pattern.toLowerCase())) {
                console.log(`   📚 FAQ matched: ${faq.id}`);
                return {
                    answer: faq.answer,
                    faqId: faq.id,
                    source: 'faq'
                };
            }
        }
    }
    
    return null;
}

/**
 * Get agent metadata
 */
export function getAgentInfo() {
    const faqDb = loadFAQDatabase();
    return faqDb.metadata || {
        agent_name: "Priya",
        company: "Rajesh Motors",
        contact: "Rajesh Motors office"
    };
}

/**
 * Get fallback message when answer not available
 */
export function getUnavailableMessage() {
    const agentInfo = getAgentInfo();
    return `Yeh detail mujhe available nahi hai. Aur information ke liye Rajesh Motors office se contact karein ya engineer ko call karein.`;
}

export default { searchFAQ, getAgentInfo, getUnavailableMessage };
