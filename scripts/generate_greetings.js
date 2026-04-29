import axios from "axios";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cartesia API Configuration
const CARTESIA_API_KEY = process.env.CARTESIA_API_KEY;
const CARTESIA_API_URL = "https://api.cartesia.ai/tts/bytes";
const CARTESIA_VERSION = "2024-11-13";

// Voice Configuration (same as your current setup)
const VOICE_ID = "95d51f79-c397-46f9-b49a-23763d3eaa2d"; // Arushi - Hindi
const MODEL = "sonic-3";
const LANGUAGE = "hi";
const SAMPLE_RATE = 22050;

// Output folder
const OUTPUT_FOLDER = path.join(__dirname, "..", "public", "greetings");

// Greetings to generate
const GREETINGS = [
    {
        id: "default",
        text: "Namaste, Rajesh Motors. Machine number bataiye.",
        filename: "greeting_default.wav",
        emotion: "friendly",
        context: "greeting"
    },
    {
        id: "priya_intro",
        text: "Namaste, main Priya, Rajesh Motors se. Machine number bataiye.",
        filename: "greeting_priya.wav",
        emotion: "friendly",
        context: "greeting"
    },
    {
        id: "short",
        text: "Namaste, Rajesh Motors.",
        filename: "greeting_short.wav",
        emotion: "friendly",
        context: "greeting"
    },
    {
        id: "help",
        text: "Namaste, kaise madad kar sakti hun?",
        filename: "greeting_help.wav",
        emotion: "friendly",
        context: "greeting"
    }
];

/**
 * Convert PCM f32le to WAV format
 */
function pcmToWav(pcmBuffer, sampleRate = 22050, channels = 1) {
    // Convert f32le (32-bit float) to PCM16 (16-bit integer)
    const floatArray = new Float32Array(
        pcmBuffer.buffer,
        pcmBuffer.byteOffset,
        pcmBuffer.byteLength / 4
    );
    
    const pcm16Buffer = Buffer.alloc(floatArray.length * 2);
    for (let i = 0; i < floatArray.length; i++) {
        const sample = Math.max(-1, Math.min(1, floatArray[i]));
        pcm16Buffer.writeInt16LE(Math.round(sample * 32767), i * 2);
    }
    
    // Create WAV header
    const wavHeader = Buffer.alloc(44);
    const dataSize = pcm16Buffer.length;
    const fileSize = dataSize + 36;
    
    // RIFF header
    wavHeader.write("RIFF", 0);
    wavHeader.writeUInt32LE(fileSize, 4);
    wavHeader.write("WAVE", 8);
    
    // fmt chunk
    wavHeader.write("fmt ", 12);
    wavHeader.writeUInt32LE(16, 16); // fmt chunk size
    wavHeader.writeUInt16LE(1, 20); // PCM format
    wavHeader.writeUInt16LE(channels, 22);
    wavHeader.writeUInt32LE(sampleRate, 24);
    wavHeader.writeUInt32LE(sampleRate * channels * 2, 28); // byte rate
    wavHeader.writeUInt16LE(channels * 2, 32); // block align
    wavHeader.writeUInt16LE(16, 34); // bits per sample
    
    // data chunk
    wavHeader.write("data", 36);
    wavHeader.writeUInt32LE(dataSize, 40);
    
    return Buffer.concat([wavHeader, pcm16Buffer]);
}

/**
 * Generate speech using Cartesia API
 */
async function generateSpeech(text, emotion = "friendly", context = "greeting") {
    console.log(`📝 Text: "${text}"`);
    console.log(`🎭 Emotion: ${emotion} | Context: ${context}`);
    
    const startTime = Date.now();
    
    try {
        // Prepare payload
        const payload = {
            model_id: MODEL,
            transcript: text,
            voice: {
                mode: "id",
                id: VOICE_ID
            },
            language: LANGUAGE,
            output_format: {
                container: "raw",
                encoding: "pcm_f32le",
                sample_rate: SAMPLE_RATE
            }
        };
        
        // Make API request
        const response = await axios.post(CARTESIA_API_URL, payload, {
            headers: {
                "Authorization": `Bearer ${CARTESIA_API_KEY}`,
                "Content-Type": "application/json",
                "Cartesia-Version": CARTESIA_VERSION
            },
            responseType: "arraybuffer",
            timeout: 30000
        });
        
        const duration = Date.now() - startTime;
        console.log(`⏱️  Cartesia API: ${duration}ms`);
        
        if (response.status === 200 && response.data) {
            const pcmBuffer = Buffer.from(response.data);
            console.log(`✅ Received ${pcmBuffer.length} bytes of PCM audio`);
            
            // Convert to WAV
            console.log(`🔄 Converting to WAV...`);
            const wavBuffer = pcmToWav(pcmBuffer, SAMPLE_RATE, 1);
            
            // Calculate duration
            const samples = pcmBuffer.length / 4; // 4 bytes per f32 sample
            const audioDuration = samples / SAMPLE_RATE;
            
            return {
                success: true,
                audio: wavBuffer,
                duration: audioDuration,
                size: wavBuffer.length
            };
        } else {
            throw new Error(`API returned status ${response.status}`);
        }
        
    } catch (error) {
        console.error(`❌ Error generating speech:`, error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Main function to generate all greetings
 */
async function generateAllGreetings() {
    console.log(`\n🎤 [GREETING GENERATOR] Starting...`);
    console.log(`🔑 Using Cartesia API Key: ${CARTESIA_API_KEY?.substring(0, 12)}...`);
    console.log(`🎭 Voice: Arushi (${VOICE_ID})`);
    console.log(`📁 Output folder: ${OUTPUT_FOLDER}\n`);
    
    // Validate API key
    if (!CARTESIA_API_KEY) {
        console.error(`❌ ERROR: CARTESIA_API_KEY not found in .env file`);
        process.exit(1);
    }
    
    // Create output folder if it doesn't exist
    if (!fs.existsSync(OUTPUT_FOLDER)) {
        console.log(`📁 Creating output folder: ${OUTPUT_FOLDER}`);
        fs.mkdirSync(OUTPUT_FOLDER, { recursive: true });
    }
    
    console.log(`${"━".repeat(60)}\n`);
    
    let successCount = 0;
    let totalSize = 0;
    const startTime = Date.now();
    
    // Generate each greeting
    for (let i = 0; i < GREETINGS.length; i++) {
        const greeting = GREETINGS[i];
        console.log(`[${i + 1}/${GREETINGS.length}] Generating: ${greeting.filename}`);
        
        const result = await generateSpeech(greeting.text, greeting.emotion, greeting.context);
        
        if (result.success) {
            // Save to file
            const outputPath = path.join(OUTPUT_FOLDER, greeting.filename);
            fs.writeFileSync(outputPath, result.audio);
            
            console.log(`✅ Saved: ${outputPath}`);
            console.log(`📊 Duration: ${result.duration.toFixed(2)}s | Size: ${(result.size / 1024).toFixed(1)}KB`);
            
            successCount++;
            totalSize += result.size;
        } else {
            console.log(`❌ Failed: ${greeting.filename}`);
            console.log(`   Error: ${result.error}`);
        }
        
        console.log(`\n${"━".repeat(60)}\n`);
        
        // Small delay between requests to avoid rate limiting
        if (i < GREETINGS.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }
    
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    
    // Summary
    console.log(`\n${"═".repeat(60)}`);
    if (successCount === GREETINGS.length) {
        console.log(`🎉 SUCCESS! Generated ${successCount}/${GREETINGS.length} greeting files`);
    } else {
        console.log(`⚠️  PARTIAL SUCCESS: Generated ${successCount}/${GREETINGS.length} greeting files`);
    }
    console.log(`📁 Location: ${OUTPUT_FOLDER}`);
    console.log(`💾 Total size: ${(totalSize / 1024).toFixed(1)}KB`);
    console.log(`⏱️  Total time: ${totalTime}s`);
    console.log(`${"═".repeat(60)}\n`);
    
    if (successCount === GREETINGS.length) {
        console.log(`✅ Ready to use! Update your code to use these files.`);
        console.log(`📝 Files generated:`);
        GREETINGS.forEach(g => {
            console.log(`   - ${g.filename}`);
        });
    } else {
        console.log(`❌ Some files failed to generate. Check errors above.`);
        process.exit(1);
    }
}

// Run the generator
generateAllGreetings().catch(error => {
    console.error(`\n❌ FATAL ERROR:`, error.message);
    console.error(error.stack);
    process.exit(1);
});
