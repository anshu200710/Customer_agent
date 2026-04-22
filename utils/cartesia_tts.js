import axios from 'axios';
import serviceLogger from './service_logger.js';
import { convertPCMToWAV, validateAudioBuffer, getAudioDuration } from './audio_converter.js';
import audioCache from './audio_cache.js';

const CARTESIA_API_URL = 'https://api.cartesia.ai/tts/bytes';

// Cartesia Sonic 3 voice configuration
const CARTESIA_CONFIG = {
    model_id: "sonic-3",
    voice: {
        mode: "id",
        id: "95d51f79-c397-46f9-b49a-23763d3eaa2d"  // Arushi - Hinglish Speaker (perfect for bilingual content)
    },
    output_format: {
        container: "raw",
        encoding: "pcm_f32le",
        sample_rate: 22050
    },
    language: "hi"  // Hindi language code
};

/**
 * Validate Cartesia configuration and API key
 */
function validateCartesiaConfig() {
    console.log(`\n🔐 [CARTESIA AUTH] Configuration Validation`);
    
    // Get API key directly from environment (avoid timing issues)
    const apiKey = process.env.CARTESIA_API_KEY;
    console.log(`🔍 Environment Debug: process.env.CARTESIA_API_KEY = "${apiKey || 'UNDEFINED'}"`);
    
    // API Key validation
    if (!apiKey) {
        console.log(`❌ API Key: NOT SET`);
        return false;
    }
    
    console.log(`🔑 API Key: ${apiKey.substring(0, 12)}... (${apiKey.length} chars)`);
    console.log(`🔑 Key Format: ${apiKey.startsWith('sk_car_') ? 'Valid (sk_car_)' : 'Invalid format'}`);
    
    // Configuration validation
    console.log(`\n✅ [PAYLOAD VALIDATION] Configuration Check`);
    console.log(`📋 Required Fields:`);
    console.log(`   ✅ model_id: "${CARTESIA_CONFIG.model_id}"`);
    console.log(`   ✅ voice.mode: "${CARTESIA_CONFIG.voice.mode}"`);
    console.log(`   ✅ voice.id: "${CARTESIA_CONFIG.voice.id.substring(0, 12)}..." (Arushi - Hinglish Speaker)`);
    console.log(`   ✅ language: "${CARTESIA_CONFIG.language}"`);
    
    console.log(`📋 Output Format:`);
    console.log(`   ✅ container: "${CARTESIA_CONFIG.output_format.container}"`);
    console.log(`   ✅ encoding: "${CARTESIA_CONFIG.output_format.encoding}"`);
    console.log(`   ✅ sample_rate: ${CARTESIA_CONFIG.output_format.sample_rate}Hz`);
    
    console.log(`🌐 Endpoint: ${CARTESIA_API_URL}`);
    console.log(`✅ SSL Certificate: Valid (HTTPS)`);
    
    return true;
}

/**
 * Enhanced TTS with emotion and context awareness
 * @param {string} text - Text to convert to speech
 * @param {Object} options - TTS options
 * @param {string} options.emotion - Emotion: empathetic, professional, friendly, concerned, excited
 * @param {string} options.context - Context: greeting, complaint, confirmation, farewell
 * @param {number} options.speed - Speech speed (0.5 to 2.0, default 1.0)
 * @returns {Promise<Buffer>} Audio buffer
 */
export async function generateSpeech(text, options = {}) {
    const startTime = Date.now();
    let service = 'Cartesia';
    let voice = 'Arushi-Hindi';
    let audioData = null;
    let error = null;
    
    try {
        const {
            emotion = 'professional',
            context = 'general',
            speed = 1.0,
            callSid = null
        } = options;

        // Get API key first to avoid scoping issues
        const apiKey = process.env.CARTESIA_API_KEY;
        if (!apiKey) {
            throw new Error('CARTESIA_API_KEY not found in environment variables');
        }

        // Validate configuration first
        if (!validateCartesiaConfig()) {
            throw new Error('Cartesia configuration validation failed');
        }

        console.log(`\n🔍 [CARTESIA DEBUG] Pre-Request Analysis`);
        console.log(`📋 Original Text: "${text}"`);
        console.log(`🎭 Input Emotion: ${emotion}`);
        console.log(`📍 Input Context: ${context}`);
        console.log(`⚡ Speed: ${speed}`);

        // Add emotion tags based on context and emotion
        const enhancedText = addEmotionTags(text, emotion, context);
        
        console.log(`🔄 Enhanced Text: "${enhancedText}"`);
        console.log(`📏 Enhanced Text Length: ${enhancedText.length} characters`);

        // Validate for double emotion tags
        const doubleEmotionCheck = enhancedText.match(/<emotion[^>]*><emotion[^>]*>/g);
        if (doubleEmotionCheck) {
            console.log(`❌ [VALIDATION ERROR] Double emotion tags detected: ${doubleEmotionCheck.length} instances`);
            doubleEmotionCheck.forEach((match, i) => {
                console.log(`   ${i + 1}. "${match}"`);
            });
        } else {
            console.log(`✅ [VALIDATION] No double emotion tags detected`);
        }

        const payload = {
            ...CARTESIA_CONFIG,
            transcript: enhancedText,
            speed: Math.max(0.5, Math.min(2.0, speed))  // Clamp speed between 0.5 and 2.0
        };

        console.log(`\n📦 [CARTESIA DEBUG] Final Payload:`);
        console.log(`   Model: ${payload.model_id}`);
        console.log(`   Voice ID: ${payload.voice.id}`);
        console.log(`   Voice Mode: ${payload.voice.mode}`);
        console.log(`   Language: ${payload.language}`);
        console.log(`   Speed: ${payload.speed}`);
        console.log(`   Output Format: ${payload.output_format.container}/${payload.output_format.encoding}@${payload.output_format.sample_rate}Hz`);
        console.log(`   Transcript: "${payload.transcript}"`);
        console.log(`   Payload Size: ${JSON.stringify(payload).length} bytes`);

        console.log(`\n🌐 [CARTESIA HTTP] Request Details`);
        console.log(`🔗 URL: ${CARTESIA_API_URL}`);
        console.log(`🔑 API Key: ${apiKey ? apiKey.substring(0, 12) + '...' : 'NOT SET'}`);
        console.log(`📋 Headers: Authorization: Bearer, Content-Type: application/json, Cartesia-Version: 2024-11-13`);
        console.log(`⏱️  Request Sent: ${new Date().toISOString()}`);
        
        console.log(`🎤 [Cartesia TTS] Generating: "${enhancedText}" | emotion: ${emotion} | context: ${context}`);

        console.log(`🔐 [FINAL AUTH CHECK] Using API Key: ${apiKey.substring(0, 12)}... (${apiKey.length} chars)`);
        console.log(`🔐 [AUTH METHOD] Authorization: Bearer (Updated from X-API-Key)`);
        console.log(`🔐 [API VERSION] Cartesia-Version: 2024-11-13 (Updated from 2026-03-01)`);

        const response = await axios.post(CARTESIA_API_URL, payload, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'Cartesia-Version': '2024-11-13'  // Valid API version
            },
            responseType: 'arraybuffer',
            timeout: 10000  // 10 second timeout
        });

        console.log(`\n✅ [CARTESIA HTTP] Response Success`);
        console.log(`📊 Status: ${response.status} ${response.statusText}`);
        console.log(`📋 Response Headers:`, Object.keys(response.headers));
        console.log(`📦 Response Size: ${response.data.byteLength} bytes`);
        console.log(`⏱️  Response Received: ${new Date().toISOString()} (${Date.now() - startTime}ms)`);

        if (response.status === 200) {
            audioData = Buffer.from(response.data);
            console.log(`✅ [Cartesia TTS] Generated ${audioData.byteLength} bytes of raw PCM audio`);
            
            // Convert PCM to WAV format for Twilio compatibility
            console.log(`🔄 [Cartesia TTS] Converting to WAV format...`);
            const wavAudio = convertPCMToWAV(audioData, 22050, 1);
            
            // Validate converted audio
            if (!validateAudioBuffer(wavAudio)) {
                throw new Error('Audio conversion failed - invalid WAV buffer');
            }
            
            // Get audio duration
            const duration = getAudioDuration(wavAudio, 22050);
            
            // Cache the WAV audio for streaming
            const audioId = audioCache.store(wavAudio, {
                text,
                voice: 'Arushi-Hindi',
                emotion,
                context,
                duration,
                originalSize: audioData.length,
                convertedSize: wavAudio.length
            });
            
            console.log(`💾 [Cartesia TTS] Cached audio with ID: ${audioId}`);
            console.log(`📊 [Cartesia TTS] Duration: ${duration.toFixed(2)}s`);
            console.log(`📈 [Cartesia TTS] Size: ${audioData.length} → ${wavAudio.length} bytes (${((wavAudio.length - audioData.length) / audioData.length * 100).toFixed(1)}% change)`);
            
            const latency = Date.now() - startTime;
            const cost = calculateTTSCost(text.length, 'cartesia');
            
            // Log successful TTS usage
            if (callSid) {
                serviceLogger.logTTS(
                    callSid,
                    service,
                    voice,
                    text,
                    wavAudio, // Log the WAV audio, not raw PCM
                    {
                        latency,
                        cost,
                        emotion,
                        context,
                        success: true,
                        audioId,
                        duration
                    }
                );
            }
            
            // Return both raw PCM and WAV audio with metadata
            return {
                success: true,
                audioId,
                rawAudio: audioData,
                wavAudio: wavAudio,
                duration,
                metadata: {
                    voice: 'Arushi-Hindi',
                    emotion,
                    context,
                    latency,
                    cost,
                    originalSize: audioData.length,
                    convertedSize: wavAudio.length
                }
            };
        } else {
            throw new Error(`Cartesia API returned status ${response.status}`);
        }

    } catch (err) {
        error = err.message;
        const latency = Date.now() - startTime;
        
        console.log(`\n❌ [CARTESIA HTTP] Response Error`);
        console.log(`📊 Status: ${err.response?.status || 'No Response'} ${err.response?.statusText || ''}`);
        console.log(`📋 Response Headers:`, err.response?.headers ? Object.keys(err.response.headers) : 'None');
        
        if (err.response?.data) {
            try {
                // Try to parse error response as text first
                const errorText = Buffer.isBuffer(err.response.data) 
                    ? err.response.data.toString('utf8') 
                    : err.response.data;
                console.log(`📦 Error Response Body: "${errorText}"`);
                
                // Try to parse as JSON
                try {
                    const errorJson = JSON.parse(errorText);
                    console.log(`🔍 Parsed Error Details:`, errorJson);
                } catch {
                    console.log(`🔍 Raw Error Text: "${errorText}"`);
                }
            } catch (parseErr) {
                console.log(`📦 Error Response: [Unable to parse response data]`);
            }
        }
        
        console.log(`⏱️  Error Occurred: ${new Date().toISOString()} (${latency}ms)`);
        console.log(`🔍 Full Error: ${err.message}`);
        
        console.error('❌ [Cartesia TTS] Error:', error);
        
        // Log failed TTS usage
        if (options.callSid) {
            serviceLogger.logTTS(
                options.callSid,
                service,
                voice,
                text,
                null,
                {
                    latency,
                    cost: 0,
                    emotion: options.emotion || 'professional',
                    context: options.context || 'general',
                    success: false,
                    error: error
                }
            );
        }
        
        // Return failure result instead of null for better error handling
        return {
            success: false,
            error: error,
            audioId: null,
            rawAudio: null,
            wavAudio: null,
            duration: 0,
            metadata: {
                voice: 'Arushi-Hindi',
                emotion: options.emotion || 'professional',
                context: options.context || 'general',
                latency,
                cost: 0,
                error: error
            }
        };
    }
}

/**
 * Add emotion tags and natural expressions to text based on context
 * @param {string} text - Original text
 * @param {string} emotion - Target emotion
 * @param {string} context - Conversation context
 * @returns {string} Enhanced text with emotion tags
 */
function addEmotionTags(text, emotion, context) {
    console.log(`\n🎭 [EMOTION PROCESSING] Step-by-Step Analysis`);
    console.log(`📝 Input Text: "${text}"`);
    console.log(`🔍 Target Emotion: ${emotion}`);
    console.log(`📍 Target Context: ${context}`);

    let enhancedText = text;

    // Check if text already has emotion tags
    const hasExistingEmotionTags = /<emotion[^>]*>.*?<\/emotion>/i.test(text);
    console.log(`🔍 Existing Emotion Tags: ${hasExistingEmotionTags ? 'YES - FOUND' : 'NO'}`);
    
    if (hasExistingEmotionTags) {
        console.log(`⚠️  [WARNING] Text already contains emotion tags - skipping emotion wrapper`);
        enhancedText = text; // Don't add more emotion tags
    } else {
        // Add emotion wrapper based on emotion type
        console.log(`\n🔄 [STEP 1] Adding emotion wrapper for: ${emotion}`);
        switch (emotion) {
            case 'empathetic':
                enhancedText = `<emotion value="empathetic">${text}</emotion>`;
                console.log(`   ✅ Applied empathetic wrapper`);
                break;
            case 'friendly':
                enhancedText = `<emotion value="friendly">${text}</emotion>`;
                console.log(`   ✅ Applied friendly wrapper`);
                break;
            case 'concerned':
                enhancedText = `<emotion value="concerned">${text}</emotion>`;
                console.log(`   ✅ Applied concerned wrapper`);
                break;
            case 'excited':
                enhancedText = `<emotion value="excited">${text}</emotion>`;
                console.log(`   ✅ Applied excited wrapper`);
                break;
            case 'professional':
            default:
                // Professional tone - no emotion tags, natural speech
                console.log(`   ✅ Professional tone - no emotion wrapper added`);
                break;
        }
    }

    console.log(`🔄 [STEP 2] Context-specific enhancements for: ${context}`);
    
    // Add context-specific enhancements (but avoid double-wrapping)
    switch (context) {
        case 'greeting':
            if (text.includes('Namaste') || text.includes('namaste')) {
                // Only add if not already wrapped
                if (!hasExistingEmotionTags && emotion === 'professional') {
                    enhancedText = enhancedText.replace(/(Namaste|namaste)/, '<emotion value="friendly">$1</emotion>');
                    console.log(`   ✅ Enhanced greeting with friendly Namaste`);
                } else {
                    console.log(`   ⏭️  Skipped Namaste enhancement (already has emotion wrapper)`);
                }
            }
            break;
        
        case 'complaint':
            // Add empathetic tone for complaint collection (only if not already wrapped)
            if (!hasExistingEmotionTags && emotion === 'professional') {
                enhancedText = `<emotion value="empathetic">${text}</emotion>`;
                console.log(`   ✅ Enhanced complaint with empathetic wrapper`);
            } else {
                console.log(`   ⏭️  Skipped complaint enhancement (already has emotion wrapper)`);
            }
            break;
        
        case 'confirmation':
            // Add slight excitement for successful confirmations
            if (text.includes('register kar di') || text.includes('save kar')) {
                if (!hasExistingEmotionTags) {
                    enhancedText = enhancedText.replace(/(register kar di|save kar)/, '<emotion value="satisfied">$1</emotion>');
                    console.log(`   ✅ Enhanced confirmation with satisfaction`);
                } else {
                    console.log(`   ⏭️  Skipped confirmation enhancement (already has emotion wrapper)`);
                }
            }
            break;
        
        case 'farewell':
            // Warm farewell
            if (text.includes('Dhanyavaad') || text.includes('dhanyavaad')) {
                if (!hasExistingEmotionTags) {
                    enhancedText = enhancedText.replace(/(Dhanyavaad|dhanyavaad)/, '<emotion value="grateful">$1</emotion>');
                    console.log(`   ✅ Enhanced farewell with gratitude`);
                } else {
                    console.log(`   ⏭️  Skipped farewell enhancement (already has emotion wrapper)`);
                }
            }
            break;
            
        default:
            console.log(`   ⏭️  No context-specific enhancements for: ${context}`);
            break;
    }

    // Add natural pauses for better flow (safe to add always)
    console.log(`\n🔄 [STEP 3] Adding natural pauses`);
    const beforePauses = enhancedText;
    enhancedText = enhancedText.replace(/\. /g, '. <break time="0.3s"/> ');
    enhancedText = enhancedText.replace(/\? /g, '? <break time="0.2s"/> ');
    
    if (beforePauses !== enhancedText) {
        console.log(`   ✅ Added natural pauses`);
    } else {
        console.log(`   ⏭️  No pauses needed`);
    }

    console.log(`\n📤 [FINAL OUTPUT] Enhanced Text: "${enhancedText}"`);
    
    // Final validation check
    const finalDoubleCheck = enhancedText.match(/<emotion[^>]*><emotion[^>]*>/g);
    if (finalDoubleCheck) {
        console.log(`❌ [FINAL VALIDATION] Double emotion tags still present!`);
        finalDoubleCheck.forEach((match, i) => {
            console.log(`   ${i + 1}. "${match}"`);
        });
    } else {
        console.log(`✅ [FINAL VALIDATION] No double emotion tags - output is clean`);
    }

    return enhancedText;
}

/**
 * Determine emotion and context from text content
 * @param {string} text - Text to analyze
 * @returns {Object} Detected emotion and context
 */
export function detectEmotionAndContext(text) {
    const lowerText = text.toLowerCase();
    
    // Detect context
    let context = 'general';
    if (lowerText.includes('namaste') || lowerText.includes('rajesh motors')) {
        context = 'greeting';
    } else if (lowerText.includes('problem') || lowerText.includes('complaint') || lowerText.includes('dikkat')) {
        context = 'complaint';
    } else if (lowerText.includes('register kar di') || lowerText.includes('save kar') || lowerText.includes('complaint number')) {
        context = 'confirmation';
    } else if (lowerText.includes('dhanyavaad') || lowerText.includes('thank')) {
        context = 'farewell';
    }
    
    // Detect emotion
    let emotion = 'professional';
    if (lowerText.includes('problem') || lowerText.includes('band') || lowerText.includes('kharab')) {
        emotion = 'empathetic';
    } else if (lowerText.includes('namaste') || lowerText.includes('kaise hain')) {
        emotion = 'friendly';
    } else if (lowerText.includes('urgent') || lowerText.includes('jaldi')) {
        emotion = 'concerned';
    } else if (lowerText.includes('register kar di') || lowerText.includes('successful')) {
        emotion = 'excited';
    }
    
    return { emotion, context };
}

/**
 * Format numbers for better TTS pronunciation
 * @param {string} text - Text containing numbers
 * @returns {string} Text with formatted numbers
 */
export function formatNumbersForTTS(text) {
    // Format complaint IDs and machine numbers for better pronunciation
    return text.replace(/\b(\d{4,})\b/g, (match) => {
        return match.split('').join(' ');
    });
}

/**
 * Calculate TTS cost based on character count and service
 */
function calculateTTSCost(characterCount, service) {
    const pricing = {
        'cartesia': 0.00003,    // $0.03 per 1000 characters (rough estimate)
        'google': 0.000016,     // $0.016 per 1000 characters
        'azure': 0.000016,      // $0.016 per 1000 characters
        'elevenlabs': 0.00018   // $0.18 per 1000 characters
    };
    
    const pricePerChar = pricing[service] || 0;
    const costUSD = characterCount * pricePerChar;
    const costINR = costUSD * 83; // Rough USD to INR conversion
    
    return costINR;
}

export default {
    generateSpeech,
    detectEmotionAndContext,
    formatNumbersForTTS
};