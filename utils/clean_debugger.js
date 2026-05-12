/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   🎨 CLEAN DEBUGGER - Beautiful, Easy-to-Read Logs
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   
   Shows only what matters:
   - User input
   - Agent response
   - Current state
   - Collected data
   - Function calls
   
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

import { determineCurrentState, getCollectionStatus } from './state_manager.js';

/**
 * 💰 COST RATES (Approximate USD)
 */
const COST_RATES = {
    twilio: 0.013,       // per minute
    stt: 0.016,          // per minute (Azure)
    llm_input: 0.00015,  // per 1k tokens (GPT-4o-mini)
    llm_output: 0.0006,  // per 1k tokens (GPT-4o-mini)
    tts_cartesia: 0.05,  // per 1k characters
    tts_eleven: 0.30     // per 1k characters
};

const USD_TO_INR = 83.5;

/**
 * Log a new call start
 */
export function logCallStart(callSid, callerPhone, machineNo) {
    console.log('\n' + '═'.repeat(80));
    console.log(`📞 NEW CALL | SID: ${callSid.slice(-8)} | Phone: ${callerPhone || 'Unknown'} | Machine: ${machineNo || 'None'}`);
    console.log('═'.repeat(80));
}

/**
 * Log a turn (user input + agent response) with timing metrics
 */
export function logTurn(turnNumber, userInput, agentResponse, callData, options = {}) {
    const { functionCalled = null, timings = null } = options;
    
    console.log('\n' + '─'.repeat(80));
    console.log(`🔄 TURN ${turnNumber}`);
    console.log('─'.repeat(80));
    
    // User input
    if (userInput) {
        console.log(`👤 USER: "${userInput}"`);
    } else {
        console.log(`👤 USER: [silence]`);
    }
    
    // Agent response
    if (agentResponse) {
        console.log(`🤖 AGENT: "${agentResponse}"`);
    }
    
    // Current state
    const currentState = determineCurrentState(callData);
    const stateDisplay = currentState.replace(/_/g, ' ').toUpperCase();
    console.log(`📍 STATE: ${stateDisplay}`);
    
    // Collected data
    const collectionStatus = getCollectionStatus(callData.extractedData, callData.customerData);
    const progress = `${collectionStatus.progress.collected}/${collectionStatus.progress.total}`;
    
    if (collectionStatus.collected.length > 0) {
        const collectedList = collectionStatus.collected.map(item => {
            const icon = item.validated ? '✅' : '📝';
            return `${icon} ${item.key}: ${item.value}`;
        }).join(' | ');
        console.log(`📊 DATA (${progress}): ${collectedList}`);
    } else {
        console.log(`📊 DATA (${progress}): [none yet]`);
    }
    
    // Function called
    if (functionCalled) {
        console.log(`🔧 FUNCTION: ${functionCalled}`);
    }

    // Timing breakdown (The "Pinpoint" feature)
    if (timings) {
        console.log('─'.repeat(40));
        console.log(`⏱️  TIMING BREAKDOWN:`);
        if (timings.lookup) console.log(`   🔍 Lookups:  ${timings.lookup.toFixed(0)}ms`);
        if (timings.ai)     console.log(`   🧠 AI/LLM:   ${timings.ai.toFixed(0)}ms`);
        if (timings.tts)    console.log(`   🎤 TTS Gen:  ${timings.tts.toFixed(0)}ms`);
        if (timings.total)  console.log(`   ⚡ TOTAL:    ${timings.total.toFixed(0)}ms`);
        console.log('─'.repeat(40));
    }
    
    console.log('─'.repeat(80));
}

/**
 * Log function execution
 */
export function logFunction(functionName, args, result) {
    const argsStr = typeof args === 'string' ? args : JSON.stringify(args);
    const shortArgs = argsStr.length > 50 ? argsStr.substring(0, 50) + '...' : argsStr;
    
    if (result.success) {
        console.log(`   ✅ ${functionName}(${shortArgs})`);
    } else {
        console.log(`   ❌ ${functionName}(${shortArgs}) - ${result.message || 'Failed'}`);
    }
}

/**
 * Log call end with detailed cost breakdown
 */
export function logCallEnd(callSid, reason, callData) {
    console.log('\n' + '═'.repeat(80));
    console.log(`📞 CALL END | SID: ${callSid.slice(-8)} | Reason: ${reason}`);
    
    if (callData && callData.extractedData) {
        const { machine_no, complaint_title, city, customer_phone } = callData.extractedData;
        console.log(`📋 FINAL DATA:`);
        if (machine_no) console.log(`   • Machine: ${machine_no}`);
        if (complaint_title) console.log(`   • Complaint: ${complaint_title}`);
        if (city) console.log(`   • City: ${city}`);
        if (customer_phone) console.log(`   • Phone: ${customer_phone}`);
    }

    // 💰 COST CALCULATION
    if (callData && callData.usage) {
        const u = callData.usage;
        const durationMins = u.durationSeconds / 60;
        
        const twilioCost = durationMins * COST_RATES.twilio;
        const sttCost = durationMins * COST_RATES.stt;
        const llmCost = (u.llmInputTokens / 1000 * COST_RATES.llm_input) + (u.llmOutputTokens / 1000 * COST_RATES.llm_output);
        const ttsCost = u.ttsCharacters / 1000 * (u.ttsService === 'ElevenLabs' ? COST_RATES.tts_eleven : COST_RATES.tts_cartesia);
        
        const totalUSD = twilioCost + sttCost + llmCost + ttsCost;
        const totalINR = totalUSD * USD_TO_INR;

        console.log('\n' + '─'.repeat(40));
        console.log(`💰 COST BREAKDOWN (ESTIMATE)`);
        console.log('─'.repeat(40));
        console.log(`   📞 Twilio:     $${twilioCost.toFixed(4)}`);
        console.log(`   🎤 STT:        $${sttCost.toFixed(4)}`);
        console.log(`   🧠 LLM Tokens: $${llmCost.toFixed(4)} (${u.llmInputTokens + u.llmOutputTokens} tokens)`);
        console.log(`   🔊 TTS:        $${ttsCost.toFixed(4)} (${u.ttsCharacters} chars via ${u.ttsService || 'Cartesia'})`);
        console.log('─'.repeat(40));
        console.log(`   💵 TOTAL USD:  $${totalUSD.toFixed(3)}`);
        console.log(`   🇮🇳 TOTAL INR:  ₹${totalINR.toFixed(2)}`);
        console.log('─'.repeat(40));
    }
    
    console.log('═'.repeat(80) + '\n');
}

/**
 * Log error (only critical errors)
 */
export function logError(context, error) {
    console.log('\n' + '⚠'.repeat(80));
    console.log(`❌ ERROR in ${context}`);
    console.log(`   ${error.message || error}`);
    console.log('⚠'.repeat(80) + '\n');
}

/**
 * Log submission
 */
export function logSubmission(callData, apiResponse) {
    console.log('\n' + '🎉'.repeat(80));
    console.log(`✅ COMPLAINT SUBMITTED`);
    console.log(`   Machine: ${callData.extractedData.machine_no}`);
    console.log(`   Complaint: ${callData.extractedData.complaint_title}`);
    console.log(`   Status: ${callData.extractedData.machine_status}`);
    console.log(`   City: ${callData.extractedData.city}`);
    console.log(`   Phone: ${callData.extractedData.customer_phone}`);
    
    if (apiResponse?.complaint_id) {
        console.log(`   Complaint ID: ${apiResponse.complaint_id}`);
    }
    
    console.log('🎉'.repeat(80) + '\n');
}

export default {
    logCallStart,
    logTurn,
    logFunction,
    logCallEnd,
    logError,
    logSubmission
};
