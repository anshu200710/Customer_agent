/**
 * Check which field is missing from complaint data
 */
export function missingField(data) {
    if (!data.machine_no) return 'machine_no';
    if (!data.complaint_title) return 'complaint_title';
    if (!data.machine_status) return 'machine_status';
    if (!data.city) return 'city';
    if (!data.customer_phone || !/^[6-9]\d{9}$/.test(data.customer_phone)) return 'customer_phone';
    return null;
}

/**
 * Sanitize extracted data
 */
export function sanitizeData(data) {
    const cleaned = { ...data };

    // Validate and clean phone number
    if (cleaned.customer_phone && !/^[6-9]\d{9}$/.test(cleaned.customer_phone)) {
        cleaned.customer_phone = null;
    }

    // Validate and clean machine number
    if (cleaned.machine_no && !/^\d{4,7}$/.test(cleaned.machine_no)) {
        cleaned.machine_no = null;
    }

    // Remove empty or invalid values
    for (const [key, value] of Object.entries(cleaned)) {
        if (value === '' || value === 'NA' || value === 'Unknown') {
            cleaned[key] = null;
        }
    }

    return cleaned;
}

/**
 * Format phone number for display
 */
export function formatPhone(phone) {
    if (!phone || phone.length !== 10) return phone;
    return `${phone.slice(0, 5)} ${phone.slice(5)}`;
}

/**
 * Format date to readable string
 */
export function formatDate(date) {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

/**
 * Log conversation turn with formatting
 */
export function logTurn(turnNumber, userInput, agentResponse) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`🔄 [Turn ${turnNumber}]`);
    console.log(`   User: "${userInput}"`);
    console.log(`   Agent: "${agentResponse}"`);
}

/**
 * Sleep/delay utility
 */
export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (err) {
            if (attempt === maxRetries) throw err;

            const delay = baseDelay * Math.pow(2, attempt - 1);
            console.log(`   ⚠️  Retry ${attempt}/${maxRetries} after ${delay}ms`);
            await sleep(delay);
        }
    }
}

/**
 * Truncate text to max length
 */
export function truncate(text, maxLength = 100) {
    if (!text || text.length <= maxLength) return text;
    return text.slice(0, maxLength - 3) + '...';
}

/**
 * Generate unique ID
 */
export function generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Safe JSON parse
 */
export function safeJsonParse(text, fallback = null) {
    try {
        return JSON.parse(text);
    } catch {
        return fallback;
    }
}

/**
 * Check if string is valid JSON
 */
export function isValidJson(text) {
    try {
        JSON.parse(text);
        return true;
    } catch {
        return false;
    }
}

/**
 * Deep clone object
 */
export function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

/**
 * Merge objects deeply
 */
export function deepMerge(target, source) {
    const output = { ...target };

    if (isObject(target) && isObject(source)) {
        Object.keys(source).forEach(key => {
            if (isObject(source[key])) {
                if (!(key in target)) {
                    Object.assign(output, { [key]: source[key] });
                } else {
                    output[key] = deepMerge(target[key], source[key]);
                }
            } else {
                Object.assign(output, { [key]: source[key] });
            }
        });
    }

    return output;
}

/**
 * Check if value is plain object
 */
function isObject(item) {
    return item && typeof item === 'object' && !Array.isArray(item);
}

/**
 * Convert object to query string
 */
export function toQueryString(obj) {
    return Object.entries(obj)
        .filter(([_, value]) => value !== null && value !== undefined)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&');
}

export default {
    missingField,
    sanitizeData,
    formatPhone,
    formatDate,
    logTurn,
    sleep,
    retryWithBackoff,
    truncate,
    generateId,
    safeJsonParse,
    isValidJson,
    deepClone,
    deepMerge,
    toQueryString,
};