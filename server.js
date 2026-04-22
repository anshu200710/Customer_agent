import 'dotenv/config';
import express from 'express';
import bodyParser from 'body-parser';
import audioCache from './utils/audio_cache.js';
import performanceLogger from './utils/performance_logger.js';

import outboundRoutes from './routes/outbound.js';
import voiceAiRoutes from './routes/voice_simple.js';
import voiceRoutes from './routes/voiceRoutes.js';


const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// THIS LINE IS MUST FOR TWILIO
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.use('/voice', voiceRoutes);
app.use('/outbound', outboundRoutes);
app.use("/audio", express.static("public/audio"));

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🎵 CARTESIA AUDIO STREAMING ENDPOINT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.get('/stream-audio/:audioId', (req, res) => {
    const { audioId } = req.params;
    
    console.log(`🎵 [AUDIO STREAM] Request for audio: ${audioId}`);
    console.log(`   🌐 User-Agent: ${req.get('User-Agent') || 'Unknown'}`);
    console.log(`   📍 IP: ${req.ip || req.connection.remoteAddress}`);
    
    // Retrieve audio from cache
    const audioData = audioCache.get(audioId);
    
    if (!audioData) {
        console.log(`❌ [AUDIO STREAM] Audio not found: ${audioId}`);
        return res.status(404).json({
            error: 'Audio not found',
            message: 'The requested audio file does not exist or has expired'
        });
    }
    
    const { buffer, metadata } = audioData;
    
    console.log(`✅ [AUDIO STREAM] Serving audio: ${audioId}`);
    console.log(`   📊 Size: ${buffer.length} bytes (${(buffer.length / 1024).toFixed(1)}KB)`);
    console.log(`   🎭 Voice: ${metadata.voice}`);
    console.log(`   ⏱️  Duration: ${metadata.duration?.toFixed(2) || 'unknown'}s`);
    console.log(`   📝 Text: "${(metadata.text || '').substring(0, 50)}${metadata.text && metadata.text.length > 50 ? '...' : ''}"`);
    
    // Set appropriate headers for WAV audio
    res.set({
        'Content-Type': 'audio/wav',
        'Content-Length': buffer.length,
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
        'Accept-Ranges': 'bytes',
        'X-Audio-Voice': metadata.voice || 'unknown',
        'X-Audio-Duration': metadata.duration?.toFixed(2) || '0',
        'X-Audio-Emotion': metadata.emotion || 'professional'
    });
    
    // Handle range requests for audio streaming
    const range = req.get('Range');
    if (range) {
        console.log(`📡 [AUDIO STREAM] Range request: ${range}`);
        
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : buffer.length - 1;
        const chunksize = (end - start) + 1;
        
        if (start >= buffer.length || end >= buffer.length) {
            console.log(`❌ [AUDIO STREAM] Invalid range: ${start}-${end} (size: ${buffer.length})`);
            return res.status(416).send('Requested Range Not Satisfiable');
        }
        
        const chunk = buffer.slice(start, end + 1);
        
        res.status(206);
        res.set({
            'Content-Range': `bytes ${start}-${end}/${buffer.length}`,
            'Content-Length': chunksize
        });
        
        console.log(`📡 [AUDIO STREAM] Serving range: ${start}-${end}/${buffer.length} (${chunksize} bytes)`);
        res.end(chunk);
    } else {
        // Serve complete file
        console.log(`📡 [AUDIO STREAM] Serving complete file (${buffer.length} bytes)`);
        res.end(buffer);
    }
});

// Audio cache statistics endpoint (for debugging)
app.get('/audio-stats', (req, res) => {
    const stats = audioCache.getStats();
    console.log(`📊 [AUDIO STATS] Request from ${req.ip}`);
    audioCache.printStats();
    
    res.json({
        success: true,
        cache: stats,
        timestamp: new Date().toISOString()
    });
});

// Performance statistics endpoint
app.get('/performance-stats', (req, res) => {
    const stats = performanceLogger.getGlobalStats();
    console.log(`📈 [PERFORMANCE STATS] Request from ${req.ip}`);
    performanceLogger.printGlobalStats();
    
    res.json({
        success: true,
        performance: stats,
        timestamp: new Date().toISOString()
    });
});

// Detailed session data endpoint
app.get('/session-data/:callSid', (req, res) => {
    const { callSid } = req.params;
    const sessionData = performanceLogger.exportSessionData(callSid);
    
    if (!sessionData) {
        return res.status(404).json({
            success: false,
            error: 'Session not found',
            callSid
        });
    }
    
    console.log(`📋 [SESSION DATA] Request for ${callSid} from ${req.ip}`);
    
    res.json({
        success: true,
        session: sessionData,
        timestamp: new Date().toISOString()
    });
});




const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
