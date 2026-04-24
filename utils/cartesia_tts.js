import axios from 'axios';
import serviceLogger from './service_logger.js';
import { convertPCMToWAV, validateAudioBuffer, getAudioDuration } from './audio_converter.js';
import audioCache from './audio_cache.js';

const CARTESIA_API_URL = 'https://api.cartesia.ai/tts/bytes';
const VERBOSE_TTS_LOGS = false;

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
    const apiKey = process.env.CARTESIA_API_KEY;
    if (!apiKey) {
        console.error('❌ CARTESIA_API_KEY not set');
        return false;
    }
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

        const enhancedText = addEmotionTags(text, emotion, context);
        console.log(`🎤 [TTS] Text: "${enhancedText}" | Emotion: ${emotion} | Context: ${context}`);

        const payload = {
            ...CARTESIA_CONFIG,
            transcript: enhancedText,
            speed: Math.max(0.5, Math.min(2.0, speed))  // Clamp speed between 0.5 and 2.0
        };

        const response = await axios.post(CARTESIA_API_URL, payload, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'Cartesia-Version': '2024-11-13'  // Valid API version
            },
            responseType: 'arraybuffer',
            timeout: 10000  // 10 second timeout
        });

        if (response.status === 200) {
            audioData = Buffer.from(response.data);
            console.log(`✅ [Cartesia TTS] Generated ${audioData.byteLength} bytes of raw PCM audio`);
            
            // Convert PCM to WAV format for Twilio compatibility
            const wavAudio = convertPCMToWAV(audioData, 22050, 1);
            
            if (!validateAudioBuffer(wavAudio)) {
                throw new Error('Audio conversion failed - invalid WAV buffer');
            }
            
            const duration = getAudioDuration(wavAudio, 22050);
            const audioId = audioCache.store(wavAudio, {
                text,
                voice: 'Arushi-Hindi',
                emotion,
                context,
                duration,
                originalSize: audioData.length,
                convertedSize: wavAudio.length
            });
            
            console.log(`🎵 [TTS] Audio ID: ${audioId}`);
            
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
        
        console.error('❌ [Cartesia TTS] Error:', err.message);
        
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
    let enhancedText = text;
    const hasExistingEmotionTags = /<emotion[^>]*>.*?<\/emotion>/i.test(text);

    if (!hasExistingEmotionTags) {
        switch (emotion) {
            case 'empathetic':
                enhancedText = `<emotion value="empathetic">${text}</emotion>`;
                break;
            case 'friendly':
                enhancedText = `<emotion value="friendly">${text}</emotion>`;
                break;
            case 'concerned':
                enhancedText = `<emotion value="concerned">${text}</emotion>`;
                break;
            case 'excited':
                enhancedText = `<emotion value="excited">${text}</emotion>`;
                break;
            case 'professional':
            default:
                break;
        }

        switch (context) {
            case 'greeting':
                if (text.includes('Namaste') || text.includes('namaste')) {
                    enhancedText = enhancedText.replace(/(Namaste|namaste)/, '<emotion value="friendly">$1</emotion>');
                }
                break;
            case 'complaint':
                if (emotion === 'professional') {
                    enhancedText = `<emotion value="empathetic">${text}</emotion>`;
                }
                break;
            case 'confirmation':
                if (text.includes('register kar di') || text.includes('save kar')) {
                    enhancedText = enhancedText.replace(/(register kar di|save kar)/, '<emotion value="satisfied">$1</emotion>');
                }
                break;
            case 'farewell':
                if (text.includes('Dhanyavaad') || text.includes('dhanyavaad')) {
                    enhancedText = enhancedText.replace(/(Dhanyavaad|dhanyavaad)/, '<emotion value="grateful">$1</emotion>');
                }
                break;
            default:
                break;
        }
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
 * @returns {string} Text with formatted numbers (only complaint/job IDs)
 */
export function formatNumbersForTTS(text) {
    // Only spell out complaint/job IDs (marked with "Number hai" or "complaint" prefix)
    // This keeps natural pronunciation for machine numbers and other numeric data
    return text.replace(/Number hai (\d+)/gi, (match, id) => {
        return `Number hai ${id.split('').join(' ')}`;
    }).replace(/complaint (\d{6,})/gi, (match, id) => {
        return `complaint ${id.split('').join(' ')}`;
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