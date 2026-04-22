/**
 * Comprehensive Service Usage Logger
 * Tracks which AI/TTS services are used for each request with detailed metrics
 */

class ServiceLogger {
    constructor() {
        this.sessionLogs = new Map(); // CallSid -> session data
        this.globalStats = {
            llm: { azure: 0, groq: 0, ollama: 0, openai: 0, fallback: 0 },
            tts: { cartesia: 0, google: 0, azure: 0, elevenlabs: 0, fallback: 0 },
            stt: { twilio: 0, azure: 0, google: 0, deepgram: 0 },
            total_calls: 0,
            total_turns: 0
        };
        this.startTime = Date.now();
    }

    /**
     * Initialize a new call session
     */
    initSession(callSid, callerPhone = null) {
        const session = {
            callSid,
            callerPhone,
            startTime: Date.now(),
            turnCount: 0,
            services: {
                llm: [],
                tts: [],
                stt: []
            },
            totalCost: 0,
            errors: []
        };
        
        this.sessionLogs.set(callSid, session);
        this.globalStats.total_calls++;
        
        console.log(`\n${"═".repeat(80)}`);
        console.log(`📞 [SESSION START] ${callSid} | Phone: ${callerPhone || 'Unknown'}`);
        console.log(`🕐 Started at: ${new Date().toLocaleString()}`);
        console.log(`${"═".repeat(80)}\n`);
        
        return session;
    }

    /**
     * Log LLM service usage
     */
    logLLM(callSid, service, model, prompt, response, metrics = {}) {
        const session = this.sessionLogs.get(callSid);
        if (!session) return;

        const logEntry = {
            service: service.toLowerCase(),
            model,
            timestamp: Date.now(),
            turn: session.turnCount + 1,
            prompt_length: prompt?.length || 0,
            response_length: response?.length || 0,
            latency_ms: metrics.latency || 0,
            tokens_used: metrics.tokens || 0,
            cost_estimate: metrics.cost || 0,
            success: !!response,
            error: metrics.error || null
        };

        session.services.llm.push(logEntry);
        session.totalCost += logEntry.cost_estimate;
        
        // Update global stats
        const serviceKey = this.normalizeServiceName(service);
        if (this.globalStats.llm[serviceKey] !== undefined) {
            this.globalStats.llm[serviceKey]++;
        } else {
            this.globalStats.llm.fallback++;
        }

        // Enhanced console logging
        const status = logEntry.success ? '✅' : '❌';
        const latency = logEntry.latency_ms ? `${logEntry.latency_ms}ms` : 'N/A';
        const tokens = logEntry.tokens_used ? `${logEntry.tokens_used}t` : 'N/A';
        const cost = logEntry.cost_estimate ? `₹${logEntry.cost_estimate.toFixed(4)}` : 'N/A';
        
        console.log(`🧠 [LLM] ${status} ${service.toUpperCase()} | Model: ${model} | Turn: ${logEntry.turn}`);
        console.log(`   📊 Latency: ${latency} | Tokens: ${tokens} | Cost: ${cost}`);
        console.log(`   📝 Prompt: ${this.truncateText(prompt, 100)}`);
        console.log(`   💬 Response: ${this.truncateText(response, 100)}`);
        if (logEntry.error) {
            console.log(`   ⚠️  Error: ${logEntry.error}`);
        }
        console.log('');
    }

    /**
     * Log TTS service usage
     */
    logTTS(callSid, service, voice, text, audioData, metrics = {}) {
        const session = this.sessionLogs.get(callSid);
        if (!session) return;

        const logEntry = {
            service: service.toLowerCase(),
            voice,
            timestamp: Date.now(),
            turn: session.turnCount + 1,
            text_length: text?.length || 0,
            audio_bytes: audioData?.length || 0,
            latency_ms: metrics.latency || 0,
            cost_estimate: metrics.cost || 0,
            success: !!audioData,
            error: metrics.error || null,
            emotion: metrics.emotion || 'professional',
            context: metrics.context || 'general'
        };

        session.services.tts.push(logEntry);
        session.totalCost += logEntry.cost_estimate;
        
        // Update global stats
        const serviceKey = this.normalizeServiceName(service);
        if (this.globalStats.tts[serviceKey] !== undefined) {
            this.globalStats.tts[serviceKey]++;
        } else {
            this.globalStats.tts.fallback++;
        }

        // Enhanced console logging
        const status = logEntry.success ? '✅' : '❌';
        const latency = logEntry.latency_ms ? `${logEntry.latency_ms}ms` : 'N/A';
        const audioSize = logEntry.audio_bytes ? `${(logEntry.audio_bytes / 1024).toFixed(1)}KB` : 'N/A';
        const cost = logEntry.cost_estimate ? `₹${logEntry.cost_estimate.toFixed(4)}` : 'N/A';
        
        console.log(`🎤 [TTS] ${status} ${service.toUpperCase()} | Voice: ${voice} | Turn: ${logEntry.turn}`);
        console.log(`   📊 Latency: ${latency} | Audio: ${audioSize} | Cost: ${cost}`);
        console.log(`   🎭 Emotion: ${logEntry.emotion} | Context: ${logEntry.context}`);
        console.log(`   📝 Text: ${this.truncateText(text, 100)}`);
        if (logEntry.error) {
            console.log(`   ⚠️  Error: ${logEntry.error}`);
        }
        console.log('');
    }

    /**
     * Log STT service usage
     */
    logSTT(callSid, service, audioInput, transcription, metrics = {}) {
        const session = this.sessionLogs.get(callSid);
        if (!session) return;

        const logEntry = {
            service: service.toLowerCase(),
            timestamp: Date.now(),
            turn: session.turnCount + 1,
            audio_duration: metrics.duration || 0,
            transcription_length: transcription?.length || 0,
            confidence: metrics.confidence || 0,
            latency_ms: metrics.latency || 0,
            cost_estimate: metrics.cost || 0,
            success: !!transcription,
            error: metrics.error || null
        };

        session.services.stt.push(logEntry);
        session.totalCost += logEntry.cost_estimate;
        
        // Update global stats
        const serviceKey = this.normalizeServiceName(service);
        if (this.globalStats.stt[serviceKey] !== undefined) {
            this.globalStats.stt[serviceKey]++;
        } else {
            this.globalStats.stt.fallback++;
        }

        // Enhanced console logging
        const status = logEntry.success ? '✅' : '❌';
        const latency = logEntry.latency_ms ? `${logEntry.latency_ms}ms` : 'N/A';
        const confidence = logEntry.confidence ? `${(logEntry.confidence * 100).toFixed(1)}%` : 'N/A';
        const duration = logEntry.audio_duration ? `${logEntry.audio_duration.toFixed(1)}s` : 'N/A';
        const cost = logEntry.cost_estimate ? `₹${logEntry.cost_estimate.toFixed(4)}` : 'N/A';
        
        console.log(`🎧 [STT] ${status} ${service.toUpperCase()} | Turn: ${logEntry.turn}`);
        console.log(`   📊 Latency: ${latency} | Duration: ${duration} | Confidence: ${confidence} | Cost: ${cost}`);
        console.log(`   📝 Transcription: ${this.truncateText(transcription, 100)}`);
        if (logEntry.error) {
            console.log(`   ⚠️  Error: ${logEntry.error}`);
        }
        console.log('');
    }

    /**
     * Log turn completion
     */
    logTurn(callSid, turnData = {}) {
        const session = this.sessionLogs.get(callSid);
        if (!session) return;

        session.turnCount++;
        this.globalStats.total_turns++;

        console.log(`🔄 [TURN ${session.turnCount}] Completed | Total Cost: ₹${session.totalCost.toFixed(4)}`);
        console.log(`${"─".repeat(60)}\n`);
    }

    /**
     * Log session end with comprehensive summary
     */
    endSession(callSid, outcome = 'completed') {
        const session = this.sessionLogs.get(callSid);
        if (!session) return;

        const duration = (Date.now() - session.startTime) / 1000;
        
        console.log(`\n${"═".repeat(80)}`);
        console.log(`📞 [SESSION END] ${callSid} | Outcome: ${outcome.toUpperCase()}`);
        console.log(`🕐 Duration: ${duration.toFixed(1)}s | Turns: ${session.turnCount} | Total Cost: ₹${session.totalCost.toFixed(4)}`);
        console.log(`${"═".repeat(80)}`);
        
        // Service usage summary
        console.log(`\n📊 [SERVICE USAGE SUMMARY]`);
        
        if (session.services.llm.length > 0) {
            const llmServices = this.groupByService(session.services.llm);
            console.log(`🧠 LLM Services:`);
            Object.entries(llmServices).forEach(([service, count]) => {
                console.log(`   ${service.toUpperCase()}: ${count} calls`);
            });
        }
        
        if (session.services.tts.length > 0) {
            const ttsServices = this.groupByService(session.services.tts);
            console.log(`🎤 TTS Services:`);
            Object.entries(ttsServices).forEach(([service, count]) => {
                console.log(`   ${service.toUpperCase()}: ${count} calls`);
            });
        }
        
        if (session.services.stt.length > 0) {
            const sttServices = this.groupByService(session.services.stt);
            console.log(`🎧 STT Services:`);
            Object.entries(sttServices).forEach(([service, count]) => {
                console.log(`   ${service.toUpperCase()}: ${count} calls`);
            });
        }
        
        // Error summary
        if (session.errors.length > 0) {
            console.log(`\n⚠️  [ERRORS] ${session.errors.length} errors occurred:`);
            session.errors.forEach((error, i) => {
                console.log(`   ${i + 1}. ${error}`);
            });
        }
        
        console.log(`${"═".repeat(80)}\n`);
        
        // Keep session for analytics but mark as ended
        session.endTime = Date.now();
        session.outcome = outcome;
    }

    /**
     * Get global statistics
     */
    getGlobalStats() {
        const uptime = (Date.now() - this.startTime) / 1000;
        
        return {
            ...this.globalStats,
            uptime_seconds: uptime,
            avg_turns_per_call: this.globalStats.total_calls > 0 ? 
                (this.globalStats.total_turns / this.globalStats.total_calls).toFixed(2) : 0
        };
    }

    /**
     * Print global statistics
     */
    printGlobalStats() {
        const stats = this.getGlobalStats();
        
        console.log(`\n${"═".repeat(80)}`);
        console.log(`📈 [GLOBAL STATISTICS]`);
        console.log(`🕐 Uptime: ${(stats.uptime_seconds / 60).toFixed(1)} minutes`);
        console.log(`📞 Total Calls: ${stats.total_calls} | Total Turns: ${stats.total_turns}`);
        console.log(`📊 Avg Turns/Call: ${stats.avg_turns_per_call}`);
        console.log(`${"═".repeat(80)}`);
        
        console.log(`\n🧠 [LLM USAGE]`);
        Object.entries(stats.llm).forEach(([service, count]) => {
            if (count > 0) {
                const percentage = ((count / stats.total_turns) * 100).toFixed(1);
                console.log(`   ${service.toUpperCase()}: ${count} calls (${percentage}%)`);
            }
        });
        
        console.log(`\n🎤 [TTS USAGE]`);
        Object.entries(stats.tts).forEach(([service, count]) => {
            if (count > 0) {
                const percentage = ((count / stats.total_turns) * 100).toFixed(1);
                console.log(`   ${service.toUpperCase()}: ${count} calls (${percentage}%)`);
            }
        });
        
        console.log(`\n🎧 [STT USAGE]`);
        Object.entries(stats.stt).forEach(([service, count]) => {
            if (count > 0) {
                const percentage = ((count / stats.total_turns) * 100).toFixed(1);
                console.log(`   ${service.toUpperCase()}: ${count} calls (${percentage}%)`);
            }
        });
        
        console.log(`${"═".repeat(80)}\n`);
    }

    /**
     * Helper methods
     */
    normalizeServiceName(service) {
        const normalized = service.toLowerCase();
        const mapping = {
            'azure openai': 'azure',
            'azure_openai': 'azure',
            'groq': 'groq',
            'ollama': 'ollama',
            'openai': 'openai',
            'cartesia': 'cartesia',
            'google': 'google',
            'elevenlabs': 'elevenlabs',
            'twilio': 'twilio',
            'deepgram': 'deepgram'
        };
        return mapping[normalized] || 'fallback';
    }

    truncateText(text, maxLength = 100) {
        if (!text) return 'N/A';
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }

    groupByService(serviceArray) {
        return serviceArray.reduce((acc, entry) => {
            acc[entry.service] = (acc[entry.service] || 0) + 1;
            return acc;
        }, {});
    }

    /**
     * Export session data for analytics
     */
    exportSessionData(callSid) {
        return this.sessionLogs.get(callSid);
    }

    /**
     * Export all data for analytics
     */
    exportAllData() {
        return {
            sessions: Array.from(this.sessionLogs.values()),
            globalStats: this.getGlobalStats()
        };
    }
}

// Create singleton instance
const serviceLogger = new ServiceLogger();

export default serviceLogger;