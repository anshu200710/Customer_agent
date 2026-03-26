import Groq from 'groq-sdk';
import { getSimilarConversations, addConversationEmbedding } from './vector.js';
import { sanitizeData } from '../utils/helpers.js';
import { extractAllData, matchServiceCenter } from '../logic/rules.js';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/**
 * Build system prompt with context and rules
 */
function buildSystemPrompt(callData, similarConversations = []) {
    const d = callData.extractedData;
    const customerLine = callData.customerData
        ? `CUSTOMER: ${callData.customerData.name} | Machine:${callData.customerData.machineNo} | Phone:${callData.customerData.phone}`
        : 'CUSTOMER: NOT IDENTIFIED';

    const status = `M:${d.machine_no || '❌'} P:${d.complaint_title || '❌'} S:${d.machine_status || '❌'} C:${d.city || '❌'} Ph:${d.customer_phone || '❌'}`;

    let nextAction = '';
    if (!d.machine_no) nextAction = 'ASK chassis number';
    else if (!d.complaint_title) nextAction = 'ASK kya problem hai';
    else if (!d.machine_status) nextAction = 'ASK band hai ya chal rahi';
    else if (!d.city) nextAction = 'ASK kaunsa shahar';
    else if (!d.customer_phone || !/^[6-9]\d{9}$/.test(d.customer_phone)) nextAction = 'ASK 10 digit number';
    else nextAction = 'SUBMIT → ready_to_submit:true';

    // Add context from similar past conversations
    let contextSection = '';
    if (similarConversations.length > 0) {
        contextSection = '\n\nPAST SIMILAR CONVERSATIONS (for context only):\n' +
            similarConversations.map((conv, i) =>
                `${i + 1}. Problem: "${conv.problem}" → Response: "${conv.response}"`
            ).join('\n');
    }

    return `Tu Rajesh Motors se JCB service agent Priya hai. Ekdum professional aur pyari awaaz mein baat kar.
STRICT RULES:
1. Max 10-12 words per turn. Warm, empathetic tone. Use "Ji", "Zarur", "Bilkul".
2. BE HUMAN: Sirf data collection bot mat bano. User agar puchhe "Kaun bol raha hai?" toh reply do "Main Priya hun Rajesh Motors se, aapki madad ke liye." 
3. DON'T REPEAT: Agar user ne chassis number de diya hai toh dobara mat pucho. 
4. RAJASTHANI/HINDI Dialect ka dhayan rakho.
5. Context based replies: Agar niche PAST CONVERSATIONS di gayi hain, unse seekho ki is problem ko kaise handle karte hain.

CURRENT STATE: ${status}
PENDING ACTION: ${nextAction}
${contextSection}

OUTPUT FORMAT: [Hindi/Hinglish Response] ### {"extracted":{...},"ready_to_submit":false}`;
}

/**
 * Get AI response with vector DB context
 */
export async function getAIResponse(callData) {
    try {
        callData.extractedData = sanitizeData(callData.extractedData);

        // Extract data from all turns using regex
        let accumulated = { ...callData.extractedData };
        for (const msg of callData.messages) {
            if (msg.role === 'user') {
                const extracted = extractAllData(msg.text, accumulated);
                accumulated = { ...accumulated, ...extracted };
            }
        }

        for (const [key, value] of Object.entries(accumulated)) {
            if (value && !callData.extractedData[key]) {
                callData.extractedData[key] = value;
            }
        }
        callData.extractedData = sanitizeData(callData.extractedData);

        // Auto-set machine status based on complaint
        if (callData.extractedData.complaint_title && !callData.extractedData.machine_status) {
            const title = callData.extractedData.complaint_title.toLowerCase();
            callData.extractedData.machine_status = /engine not starting|not starting/.test(title)
                ? 'Breakdown'
                : 'Running With Problem';
        }

        // Get similar conversations from vector DB for context
        const lastUserMessage = callData.messages
            .filter(m => m.role === 'user')
            .slice(-1)[0]?.text || '';

        const similarConversations = await getSimilarConversations(lastUserMessage, 3);

        // Build messages for Groq
        const messages = [
            { role: 'system', content: buildSystemPrompt(callData, similarConversations) },
            ...callData.messages.slice(-4).map(m => ({
                role: m.role === 'user' ? 'user' : 'assistant',
                content: m.text,
            })),
        ];

        if (callData.messages.length === 0) {
            messages.push({ role: 'user', content: '[Call connected]' });
        }

        console.log('🤖 [Groq] Calling API with vector context...');

        const response = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages,
            temperature: 0.1,
            max_tokens: 80,
            top_p: 0.9,
        });

        const aiText = response.choices?.[0]?.message?.content?.trim();
        if (!aiText) throw new Error('Empty response from Groq');

        console.log(`✅ [Groq] "${aiText.substring(0, 80)}"`);

        const parsed = parseAIResponse(aiText, callData);

        // Extract from latest user turn using regex
        const latestExtracted = extractAllData(lastUserMessage, {
            ...callData.extractedData,
            ...parsed.extractedData
        });

        for (const [key, value] of Object.entries(latestExtracted)) {
            if (value && !parsed.extractedData[key]) {
                parsed.extractedData[key] = value;
            }
        }

        // Match city if found
        if (parsed.extractedData.city && !parsed.extractedData.city_id) {
            const cityMatch = matchServiceCenter(parsed.extractedData.city);
            if (cityMatch) {
                parsed.extractedData.city = cityMatch.city_name;
                parsed.extractedData.city_id = cityMatch.branch_code;
                parsed.extractedData.branch = cityMatch.branch_name;
                parsed.extractedData.outlet = cityMatch.city_name;
                parsed.extractedData.lat = cityMatch.lat;
                parsed.extractedData.lng = cityMatch.lng;
                console.log(`   🗺️  ${cityMatch.city_name} → ${cityMatch.branch_name}`);
            }
        }

        // Auto-set status again after parsing
        if (parsed.extractedData.complaint_title && !parsed.extractedData.machine_status) {
            const title = parsed.extractedData.complaint_title.toLowerCase();
            parsed.extractedData.machine_status = /engine not starting|not starting/.test(title)
                ? 'Breakdown'
                : 'Running With Problem';
        }

        return parsed;

    } catch (err) {
        console.error('❌ [Groq]', err.message);
        return {
            text: 'Ji.',
            intent: 'error',
            extractedData: callData.extractedData || {},
            readyToSubmit: false
        };
    }
}

/**
 * Parse AI response to extract structured data
 */
function parseAIResponse(aiText, callData) {
    let text = aiText;
    let extractedData = { ...callData.extractedData };
    let readyToSubmit = false;
    let intent = 'continue';

    try {
        const delimiterIndex = aiText.indexOf('###');

        if (delimiterIndex !== -1) {
            text = aiText.substring(0, delimiterIndex).trim();
            const jsonPart = aiText.substring(delimiterIndex + 3).trim()
                .replace(/```json|```/g, '');

            const jsonMatch = jsonPart.match(/\{[\s\S]*\}/);

            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                intent = parsed.intent || 'continue';
                readyToSubmit = !!parsed.ready_to_submit;

                if (parsed.extracted) {
                    // Normalize field names
                    const fieldMapping = {
                        machine: 'machine_no',
                        machine_number: 'machine_no',
                        machineNo: 'machine_no',
                        chassis: 'machine_no',
                        chassis_no: 'machine_no',
                        problem: 'complaint_title',
                        complaint: 'complaint_title',
                        issue: 'complaint_title',
                        status: 'machine_status',
                        location: 'job_location',
                        phone: 'customer_phone',
                        mobile: 'customer_phone',
                        number: 'customer_phone',
                        city_name: 'city',
                        town: 'city',
                        details: 'complaint_details',
                    };

                    for (let [key, value] of Object.entries(parsed.extracted)) {
                        if (!value || value === 'NA' || value === '') continue;

                        key = fieldMapping[key] || key;

                        if (key === 'customer_phone') {
                            const phone = String(value).replace(/[\s\-]/g, '');
                            if (/^[6-9]\d{9}$/.test(phone)) {
                                extractedData[key] = phone;
                            }
                        } else if (key === 'complaint_details' && extractedData.complaint_details) {
                            if (!extractedData.complaint_details.includes(value)) {
                                extractedData.complaint_details += `; ${value}`;
                            }
                        } else {
                            extractedData[key] = value;
                        }
                    }
                }
            }
        }
    } catch (err) {
        console.error('⚠️  [Parse] Error parsing AI response:', err.message);
    }

    // Clean up text
    text = text.replace(/```[\s\S]*?```/g, '').replace(/###[\s\S]*/g, '').trim();

    return { text, intent, extractedData, readyToSubmit };
}

/**
 * Save call conversation to dataset for future learning
 */
export async function saveCallToDataset(callData) {
    try {
        if (!callData.messages || callData.messages.length === 0) {
            return;
        }

        // Extract conversation summary
        const userMessages = callData.messages.filter(m => m.role === 'user');
        const assistantMessages = callData.messages.filter(m => m.role === 'assistant');

        if (userMessages.length === 0) return;

        // Create conversation record
        const conversationRecord = {
            callSid: callData.callSid,
            timestamp: new Date().toISOString(),
            customerName: callData.extractedData.customer_name || 'Unknown',
            machineNo: callData.extractedData.machine_no || 'Unknown',
            problem: callData.extractedData.complaint_title || 'Unknown',
            city: callData.extractedData.city || 'Unknown',
            resolution: callData.extractedData.machine_status || 'Unknown',
            turnCount: callData.turnCount,
            messages: callData.messages,
            // Key learnings for vector search
            userInput: userMessages.map(m => m.text).join(' | '),
            agentResponses: assistantMessages.map(m => m.text).join(' | '),
            extractedData: callData.extractedData,
        };

        // Add to vector database
        await addConversationEmbedding(conversationRecord);

        console.log(`   💾 [Dataset] Saved call ${callData.callSid} to dataset`);

    } catch (err) {
        console.error('❌ [Dataset] Error saving call:', err.message);
    }
}

export default { getAIResponse, saveCallToDataset };