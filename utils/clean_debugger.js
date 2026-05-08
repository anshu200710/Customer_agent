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
 * Log a new call start
 */
export function logCallStart(callSid, callerPhone, machineNo) {
    console.log('\n' + '═'.repeat(80));
    console.log(`📞 NEW CALL | SID: ${callSid.slice(-8)} | Phone: ${callerPhone || 'Unknown'} | Machine: ${machineNo || 'None'}`);
    console.log('═'.repeat(80));
}

/**
 * Log a turn (user input + agent response)
 */
export function logTurn(turnNumber, userInput, agentResponse, callData, functionCalled = null) {
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
 * Log call end
 */
export function logCallEnd(callSid, reason, finalData) {
    console.log('\n' + '═'.repeat(80));
    console.log(`📞 CALL END | SID: ${callSid.slice(-8)} | Reason: ${reason}`);
    
    if (finalData) {
        const { machine_no, complaint_title, city, customer_phone } = finalData;
        console.log(`📋 FINAL DATA:`);
        if (machine_no) console.log(`   • Machine: ${machine_no}`);
        if (complaint_title) console.log(`   • Complaint: ${complaint_title}`);
        if (city) console.log(`   • City: ${city}`);
        if (customer_phone) console.log(`   • Phone: ${customer_phone}`);
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
