/**
 * Audio Format Converter for Cartesia TTS
 * Converts raw PCM audio to WAV format for Twilio compatibility
 */

/**
 * Convert raw PCM f32le audio to WAV format
 * @param {Buffer} pcmBuffer - Raw PCM audio buffer from Cartesia
 * @param {number} sampleRate - Sample rate (default: 22050)
 * @param {number} channels - Number of channels (default: 1 for mono)
 * @returns {Buffer} WAV formatted audio buffer
 */
export function convertPCMToWAV(pcmBuffer, sampleRate = 22050, channels = 1) {
    console.log(`🔄 [AUDIO CONVERTER] Converting PCM to WAV`);
    console.log(`   📊 Input: ${pcmBuffer.length} bytes PCM f32le`);
    console.log(`   🎵 Sample Rate: ${sampleRate}Hz, Channels: ${channels}`);
    
    // Convert f32le PCM to 16-bit PCM for WAV compatibility
    const pcm16Buffer = convertF32LEtoPCM16(pcmBuffer);
    
    // WAV file header parameters
    const bitsPerSample = 16;
    const byteRate = sampleRate * channels * (bitsPerSample / 8);
    const blockAlign = channels * (bitsPerSample / 8);
    const dataSize = pcm16Buffer.length;
    const fileSize = 36 + dataSize;
    
    // Create WAV header (44 bytes)
    const wavHeader = Buffer.alloc(44);
    let offset = 0;
    
    // RIFF chunk descriptor
    wavHeader.write('RIFF', offset); offset += 4;
    wavHeader.writeUInt32LE(fileSize, offset); offset += 4;
    wavHeader.write('WAVE', offset); offset += 4;
    
    // fmt sub-chunk
    wavHeader.write('fmt ', offset); offset += 4;
    wavHeader.writeUInt32LE(16, offset); offset += 4; // Sub-chunk size
    wavHeader.writeUInt16LE(1, offset); offset += 2;  // Audio format (PCM)
    wavHeader.writeUInt16LE(channels, offset); offset += 2;
    wavHeader.writeUInt32LE(sampleRate, offset); offset += 4;
    wavHeader.writeUInt32LE(byteRate, offset); offset += 4;
    wavHeader.writeUInt16LE(blockAlign, offset); offset += 2;
    wavHeader.writeUInt16LE(bitsPerSample, offset); offset += 2;
    
    // data sub-chunk
    wavHeader.write('data', offset); offset += 4;
    wavHeader.writeUInt32LE(dataSize, offset);
    
    // Combine header and audio data
    const wavBuffer = Buffer.concat([wavHeader, pcm16Buffer]);
    
    console.log(`   ✅ Output: ${wavBuffer.length} bytes WAV`);
    console.log(`   📈 Compression: ${((pcmBuffer.length - wavBuffer.length) / pcmBuffer.length * 100).toFixed(1)}% size change`);
    
    return wavBuffer;
}

/**
 * Convert 32-bit float PCM to 16-bit integer PCM
 * @param {Buffer} f32Buffer - 32-bit float PCM buffer
 * @returns {Buffer} 16-bit integer PCM buffer
 */
function convertF32LEtoPCM16(f32Buffer) {
    console.log(`🔄 [AUDIO CONVERTER] Converting f32le to PCM16`);
    
    const floatArray = new Float32Array(f32Buffer.buffer, f32Buffer.byteOffset, f32Buffer.length / 4);
    const pcm16Buffer = Buffer.alloc(floatArray.length * 2);
    
    for (let i = 0; i < floatArray.length; i++) {
        // Clamp float value to [-1, 1] and convert to 16-bit integer
        const clampedValue = Math.max(-1, Math.min(1, floatArray[i]));
        const intValue = Math.round(clampedValue * 32767);
        pcm16Buffer.writeInt16LE(intValue, i * 2);
    }
    
    console.log(`   📊 Converted ${floatArray.length} float samples to ${pcm16Buffer.length} bytes PCM16`);
    
    return pcm16Buffer;
}

/**
 * Validate audio buffer format and size
 * @param {Buffer} audioBuffer - Audio buffer to validate
 * @returns {boolean} True if valid
 */
export function validateAudioBuffer(audioBuffer) {
    if (!Buffer.isBuffer(audioBuffer)) {
        console.log(`❌ [AUDIO VALIDATOR] Not a buffer`);
        return false;
    }
    
    if (audioBuffer.length === 0) {
        console.log(`❌ [AUDIO VALIDATOR] Empty buffer`);
        return false;
    }
    
    if (audioBuffer.length < 1000) {
        console.log(`⚠️  [AUDIO VALIDATOR] Very small buffer (${audioBuffer.length} bytes)`);
    }
    
    console.log(`✅ [AUDIO VALIDATOR] Valid audio buffer (${audioBuffer.length} bytes)`);
    return true;
}

/**
 * Get audio duration in seconds from WAV buffer
 * @param {Buffer} wavBuffer - WAV audio buffer
 * @param {number} sampleRate - Sample rate
 * @returns {number} Duration in seconds
 */
export function getAudioDuration(wavBuffer, sampleRate = 22050) {
    // WAV data starts at byte 44, each sample is 2 bytes (16-bit)
    const audioDataSize = wavBuffer.length - 44;
    const sampleCount = audioDataSize / 2;
    const duration = sampleCount / sampleRate;
    
    console.log(`📊 [AUDIO INFO] Duration: ${duration.toFixed(2)}s (${sampleCount} samples)`);
    
    return duration;
}

export default {
    convertPCMToWAV,
    validateAudioBuffer,
    getAudioDuration
};