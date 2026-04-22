/**
 * Audio Cache Manager for Cartesia TTS
 * Manages temporary storage and serving of generated audio files
 */

// Simple UUID generator to avoid external dependencies
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

class AudioCache {
    constructor() {
        this.cache = new Map(); // audioId -> { buffer, timestamp, metadata }
        this.maxCacheSize = 50; // Maximum number of cached audio files
        this.maxAge = 5 * 60 * 1000; // 5 minutes in milliseconds
        
        // Start cleanup interval
        this.startCleanupInterval();
        
        console.log(`🗄️  [AUDIO CACHE] Initialized with max size: ${this.maxCacheSize}, max age: ${this.maxAge / 1000}s`);
    }
    
    /**
     * Store audio buffer in cache
     * @param {Buffer} audioBuffer - WAV audio buffer
     * @param {Object} metadata - Audio metadata
     * @returns {string} Unique audio ID
     */
    store(audioBuffer, metadata = {}) {
        const audioId = generateUUID();
        const timestamp = Date.now();
        
        // Store in cache
        this.cache.set(audioId, {
            buffer: audioBuffer,
            timestamp,
            metadata: {
                size: audioBuffer.length,
                duration: metadata.duration || 0,
                text: metadata.text || '',
                voice: metadata.voice || 'unknown',
                emotion: metadata.emotion || 'professional',
                ...metadata
            }
        });
        
        console.log(`💾 [AUDIO CACHE] Stored audio: ${audioId}`);
        console.log(`   📊 Size: ${audioBuffer.length} bytes`);
        console.log(`   🎭 Voice: ${metadata.voice || 'unknown'}`);
        console.log(`   📝 Text: "${(metadata.text || '').substring(0, 50)}${metadata.text && metadata.text.length > 50 ? '...' : ''}"`);
        console.log(`   🗄️  Cache size: ${this.cache.size}/${this.maxCacheSize}`);
        
        // Clean up if cache is too large
        this.cleanup();
        
        return audioId;
    }
    
    /**
     * Retrieve audio buffer from cache
     * @param {string} audioId - Audio ID
     * @returns {Object|null} Audio data or null if not found
     */
    get(audioId) {
        const audioData = this.cache.get(audioId);
        
        if (!audioData) {
            console.log(`❌ [AUDIO CACHE] Audio not found: ${audioId}`);
            return null;
        }
        
        // Check if expired
        const age = Date.now() - audioData.timestamp;
        if (age > this.maxAge) {
            console.log(`⏰ [AUDIO CACHE] Audio expired: ${audioId} (age: ${Math.round(age / 1000)}s)`);
            this.cache.delete(audioId);
            return null;
        }
        
        console.log(`✅ [AUDIO CACHE] Retrieved audio: ${audioId}`);
        console.log(`   📊 Size: ${audioData.buffer.length} bytes`);
        console.log(`   ⏰ Age: ${Math.round(age / 1000)}s`);
        
        return audioData;
    }
    
    /**
     * Remove expired entries and enforce size limit
     */
    cleanup() {
        const now = Date.now();
        let removedCount = 0;
        
        // Remove expired entries
        for (const [audioId, audioData] of this.cache.entries()) {
            const age = now - audioData.timestamp;
            if (age > this.maxAge) {
                this.cache.delete(audioId);
                removedCount++;
            }
        }
        
        // Remove oldest entries if cache is too large
        if (this.cache.size > this.maxCacheSize) {
            const entries = Array.from(this.cache.entries());
            entries.sort((a, b) => a[1].timestamp - b[1].timestamp); // Sort by timestamp (oldest first)
            
            const toRemove = this.cache.size - this.maxCacheSize;
            for (let i = 0; i < toRemove; i++) {
                this.cache.delete(entries[i][0]);
                removedCount++;
            }
        }
        
        if (removedCount > 0) {
            console.log(`🧹 [AUDIO CACHE] Cleaned up ${removedCount} entries, cache size: ${this.cache.size}`);
        }
    }
    
    /**
     * Start automatic cleanup interval
     */
    startCleanupInterval() {
        setInterval(() => {
            this.cleanup();
        }, 60000); // Clean up every minute
        
        console.log(`⏰ [AUDIO CACHE] Started cleanup interval (60s)`);
    }
    
    /**
     * Get cache statistics
     * @returns {Object} Cache stats
     */
    getStats() {
        const now = Date.now();
        let totalSize = 0;
        let oldestAge = 0;
        let newestAge = Infinity;
        
        for (const audioData of this.cache.values()) {
            totalSize += audioData.buffer.length;
            const age = now - audioData.timestamp;
            oldestAge = Math.max(oldestAge, age);
            newestAge = Math.min(newestAge, age);
        }
        
        return {
            count: this.cache.size,
            totalSize,
            averageSize: this.cache.size > 0 ? Math.round(totalSize / this.cache.size) : 0,
            oldestAge: Math.round(oldestAge / 1000),
            newestAge: newestAge === Infinity ? 0 : Math.round(newestAge / 1000),
            maxCacheSize: this.maxCacheSize,
            maxAge: Math.round(this.maxAge / 1000)
        };
    }
    
    /**
     * Print cache statistics
     */
    printStats() {
        const stats = this.getStats();
        
        console.log(`\n📊 [AUDIO CACHE] Statistics:`);
        console.log(`   🗄️  Entries: ${stats.count}/${stats.maxCacheSize}`);
        console.log(`   📦 Total Size: ${(stats.totalSize / 1024).toFixed(1)}KB`);
        console.log(`   📊 Average Size: ${(stats.averageSize / 1024).toFixed(1)}KB`);
        console.log(`   ⏰ Age Range: ${stats.newestAge}s - ${stats.oldestAge}s (max: ${stats.maxAge}s)`);
    }
    
    /**
     * Clear all cached audio
     */
    clear() {
        const count = this.cache.size;
        this.cache.clear();
        console.log(`🗑️  [AUDIO CACHE] Cleared ${count} entries`);
    }
}

// Create singleton instance
const audioCache = new AudioCache();

export default audioCache;