/**
 * Centralized Logger with Verbosity Control
 * 
 * Usage:
 * - Set DEBUG_MODE=true in .env for essential logs only (user input, agent response, timing)
 * - Set VERBOSE_LOGS=true in .env for all detailed logs (API calls, validation, etc.)
 * - Set both to false for production (minimal logging)
 */

const DEBUG_MODE = process.env.DEBUG_MODE === 'true';
const VERBOSE_LOGS = process.env.VERBOSE_LOGS === 'true';

class Logger {
    /**
     * Essential logs - Always shown (user conversation, agent responses, timing)
     */
    essential(message, ...args) {
        console.log(message, ...args);
    }

    /**
     * Debug logs - Shown when DEBUG_MODE=true (important flow information)
     */
    debug(message, ...args) {
        if (DEBUG_MODE || VERBOSE_LOGS) {
            console.log(message, ...args);
        }
    }

    /**
     * Verbose logs - Shown when VERBOSE_LOGS=true (detailed technical information)
     */
    verbose(message, ...args) {
        if (VERBOSE_LOGS) {
            console.log(message, ...args);
        }
    }

    /**
     * Error logs - Always shown
     */
    error(message, ...args) {
        console.error(message, ...args);
    }

    /**
     * Warning logs - Always shown
     */
    warn(message, ...args) {
        console.warn(message, ...args);
    }

    /**
     * User input log - Always shown
     */
    userInput(turn, input, method = 'SPEECH') {
        this.essential(`\n${"─".repeat(60)}`);
        this.essential(`🔄 [TURN ${turn}] [${method}]`);
        if (method === 'DTMF') {
            this.essential(`   ⌨️  DTMF Input: "${input}"`);
        } else if (method === 'SPEECH') {
            this.essential(`   🎤 Speech Input: "${input}"`);
        } else {
            this.essential(`   🔇 Silence detected`);
        }
    }

    /**
     * Agent response log - Always shown
     */
    agentResponse(response) {
        this.essential(`   💬 Agent: "${response}"`);
    }

    /**
     * Timing log - Always shown
     */
    timing(label, duration) {
        this.essential(`   ⏱️  ${label}: ${duration.toFixed(0)}ms`);
    }

    /**
     * Turn summary - Always shown
     */
    turnSummary(turn, totalTime, breakdown) {
        this.essential(`\n⏱️  [TURN ${turn} COMPLETE] Total Time: ${totalTime.toFixed(0)}ms`);
        if (breakdown) {
            this.essential(`   🧠 LLM: ${breakdown.llm || 0}ms | 🎤 TTS: ${breakdown.tts || 0}ms`);
        }
        this.essential(`${"─".repeat(60)}\n`);
    }

    /**
     * Session start - Always shown
     */
    sessionStart(callSid, phone) {
        this.essential(`\n${"═".repeat(60)}`);
        this.essential(`📞 [NEW CALL] ${callSid} | ${phone}`);
        this.essential(`${"═".repeat(60)}\n`);
    }

    /**
     * Session end - Always shown
     */
    sessionEnd(callSid, outcome) {
        this.essential(`\n${"═".repeat(60)}`);
        this.essential(`📞 [CALL END] ${callSid} | Outcome: ${outcome.toUpperCase()}`);
        this.essential(`${"═".repeat(60)}\n`);
    }
}

// Export singleton instance
const logger = new Logger();
export default logger;
