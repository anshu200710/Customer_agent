/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   🔧 AZURE OPENAI FUNCTION HANDLERS - PHASE 1, 2, 3, 4
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   
   Execute function calls from Azure OpenAI and update callData
   
   Phase 1: Core Data Capture Functions
   Phase 2: Update/Correction Functions
   Phase 3: Confirmation Functions
   Phase 4: Validation Functions
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

import { matchServiceCenter } from './ai.js';
import axios from 'axios';

// API configuration (same as voiceRoutes.js)
const BASE_URL = "https://rajesh-motors.g-trac.in/api";
const API_TIMEOUT = 8000;
const API_HEADERS = { "Content-Type": "application/json" };

/**
 * Execute a function call from Azure OpenAI
 * @param {Object} functionCall - Function call object from OpenAI
 * @param {Object} callData - Current call data
 * @returns {Object} Result object with success status and message
 */
export async function executeFunctionCall(functionCall, callData) {
    const { name, arguments: argsString } = functionCall;
    
    console.log(`   🔧 [FUNCTION CALL] ${name}`);
    console.log(`   📝 Arguments: ${argsString}`);
    
    try {
        const args = JSON.parse(argsString);
        
        switch (name) {
            // Phase 1: Core Data Capture
            case 'capture_machine_number':
                return await handleCaptureMachineNumber(args, callData);
            
            case 'capture_complaint':
                return await handleCaptureComplaint(args, callData);
            
            case 'capture_machine_status':
                return await handleCaptureMachineStatus(args, callData);
            
            case 'capture_city':
                return await handleCaptureCity(args, callData);
            
            case 'capture_phone_number':
                return await handleCapturePhoneNumber(args, callData);
            
            // Phase 2: Update/Correction
            case 'update_machine_number':
                return await handleUpdateMachineNumber(args, callData);
            
            case 'update_complaint':
                return await handleUpdateComplaint(args, callData);
            
            case 'update_city':
                return await handleUpdateCity(args, callData);
            
            case 'update_phone_number':
                return await handleUpdatePhoneNumber(args, callData);
            
            case 'update_machine_status':
                return await handleUpdateMachineStatus(args, callData);
            
            // Phase 3: Confirmations
            case 'confirm_phone_number':
                return await handleConfirmPhoneNumber(args, callData);
            
            case 'provide_alternate_phone':
                return await handleProvideAlternatePhone(args, callData);
            
            case 'confirm_city_and_branch':
                return await handleConfirmCityAndBranch(args, callData);
            
            case 'final_confirmation':
                return await handleFinalConfirmation(args, callData);
            
            // Phase 4: Validation
            case 'validate_machine_number':
                return await handleValidateMachineNumber(args, callData);
            
            case 'validate_phone_format':
                return await handleValidatePhoneFormat(args, callData);
            
            case 'validate_city':
                return await handleValidateCity(args, callData);
            
            // Phase 5: Complaint Management
            case 'add_additional_complaint':
                return await handleAddAdditionalComplaint(args, callData);
            
            case 'handle_existing_complaint':
                return await handleExistingComplaint(args, callData);
            
            case 'submit_complaint':
                return await handleSubmitComplaint(args, callData);
            
            default:
                console.warn(`   ⚠️  Unknown function: ${name}`);
                return {
                    success: false,
                    message: `Unknown function: ${name}`
                };
        }
    } catch (error) {
        console.error(`   ❌ [FUNCTION ERROR] ${name}:`, error.message);
        return {
            success: false,
            message: `Error executing ${name}: ${error.message}`
        };
    }
}

/**
 * Handle capture_machine_number function
 */
async function handleCaptureMachineNumber(args, callData) {
    const { machine_no } = args;
    
    // Clean machine number (remove spaces, dashes, and other non-digit characters except digits)
    const cleanMachineNo = machine_no.replace(/[\s\-,।\.]/g, '');
    
    // Validate format (3-7 digits)
    if (!/^\d{3,7}$/.test(cleanMachineNo)) {
        console.warn(`   ⚠️  Invalid machine number format: ${machine_no} (cleaned: ${cleanMachineNo})`);
        return {
            success: false,
            message: `Invalid machine number format. Must be 3-7 digits. Got: ${machine_no}`
        };
    }
    
    // Store cleaned machine number in extractedData
    callData.extractedData.machine_no = cleanMachineNo;
    
    console.log(`   ✅ [CAPTURED] machine_no: ${cleanMachineNo}${machine_no !== cleanMachineNo ? ` (cleaned from: ${machine_no})` : ''}`);
    
    return {
        success: true,
        message: `Machine number ${cleanMachineNo} captured successfully. Will validate against database.`
    };
}

/**
 * Handle capture_complaint function
 */
async function handleCaptureComplaint(args, callData) {
    const { complaint_title, complaint_details } = args;
    
    // Store complaint title
    if (!callData.extractedData.complaint_title) {
        callData.extractedData.complaint_title = complaint_title;
        console.log(`   ✅ [CAPTURED] complaint_title: ${complaint_title}`);
    }
    
    // Store complaint details if provided
    if (complaint_details) {
        // Merge with existing details
        const existing = callData.extractedData.complaint_details
            ? callData.extractedData.complaint_details.split('; ').map(s => s.trim()).filter(Boolean)
            : [];
        
        const incoming = complaint_details.split('; ').map(s => s.trim()).filter(Boolean);
        
        const combined = [...existing];
        for (const item of incoming) {
            if (!combined.includes(item)) {
                combined.push(item);
            }
        }
        
        callData.extractedData.complaint_details = combined.join('; ');
        console.log(`   ✅ [CAPTURED] complaint_details: ${callData.extractedData.complaint_details}`);
    }
    
    return {
        success: true,
        message: `Complaint captured: ${complaint_title}${complaint_details ? ' with additional details' : ''}`
    };
}

/**
 * Handle capture_machine_status function
 */
async function handleCaptureMachineStatus(args, callData) {
    const { machine_status } = args;
    
    // Validate enum value
    if (!['Breakdown', 'Running With Problem'].includes(machine_status)) {
        console.warn(`   ⚠️  Invalid machine status: ${machine_status}`);
        return {
            success: false,
            message: `Invalid machine status. Must be 'Breakdown' or 'Running With Problem'. Got: ${machine_status}`
        };
    }
    
    // Store in extractedData
    callData.extractedData.machine_status = machine_status;
    
    console.log(`   ✅ [CAPTURED] machine_status: ${machine_status}`);
    
    return {
        success: true,
        message: `Machine status captured: ${machine_status}`
    };
}

/**
 * Handle capture_city function
 */
async function handleCaptureCity(args, callData) {
    const { city } = args;
    
    // CRITICAL: Validate against machine's registered city if available
    if (callData.customerData && callData.customerData.city) {
        const registeredCity = callData.customerData.city.toUpperCase();
        const inputCity = city.toUpperCase();
        
        // Check if input matches registered city (exact or partial match)
        if (registeredCity.includes(inputCity) || inputCity.includes(registeredCity)) {
            // Match found - use registered city data
            const matched = matchServiceCenter(registeredCity);
            if (matched) {
                callData.extractedData.city = matched.city_name;
                callData.extractedData.city_id = matched.branch_code;
                callData.extractedData.branch = matched.branch_name;
                callData.extractedData.outlet = matched.city_name;
                callData.extractedData.lat = matched.lat;
                callData.extractedData.lng = matched.lng;
                
                console.log(`   ✅ [CAPTURED] city: ${matched.city_name} (validated against machine data)`);
                
                return {
                    success: true,
                    message: `City validated: ${matched.city_name} matches machine registration.`
                };
            }
        } else {
            // Input doesn't match registered city - warn but allow
            console.warn(`   ⚠️  City mismatch: User said "${city}" but machine registered in "${registeredCity}"`);
            console.warn(`   ℹ️  Using registered city from machine data`);
            
            // Use registered city instead
            const matched = matchServiceCenter(registeredCity);
            if (matched) {
                callData.extractedData.city = matched.city_name;
                callData.extractedData.city_id = matched.branch_code;
                callData.extractedData.branch = matched.branch_name;
                callData.extractedData.outlet = matched.city_name;
                callData.extractedData.lat = matched.lat;
                callData.extractedData.lng = matched.lng;
                
                console.log(`   ✅ [CAPTURED] city: ${matched.city_name} (from machine registration, ignoring user input)`);
                
                return {
                    success: true,
                    needsConfirmation: true,
                    message: `Machine is registered in ${matched.city_name}. Using registered city instead of "${city}".`
                };
            }
        }
    }
    
    // No machine data or validation failed - STRICT: Only accept valid service center cities
    const matched = matchServiceCenter(city);
    
    if (matched) {
        // Store matched city and related fields
        callData.extractedData.city = matched.city_name;
        callData.extractedData.city_id = matched.branch_code;
        callData.extractedData.branch = matched.branch_name;
        callData.extractedData.outlet = matched.city_name;
        callData.extractedData.lat = matched.lat;
        callData.extractedData.lng = matched.lng;
        
        console.log(`   ✅ [CAPTURED] city: ${matched.city_name} → branch: ${matched.branch_name}`);
        
        return {
            success: true,
            message: `City captured: ${matched.city_name}. Nearest branch: ${matched.branch_name}`
        };
    } else {
        // STRICT REJECTION: City not in service center list
        console.warn(`   ❌ [CITY REJECTED] "${city}" not in service center list`);
        
        return {
            success: false,
            rejected: true,
            message: `"${city}" hamare service center mein nahi aati. Kripya Rajasthan ki sahi city bataiye jahan se service engineer aate hain. Jaise: Jaipur, Kota, Ajmer, Udaipur, Bhilwara, Alwar, Sikar.`
        };
    }
}

/**
 * Handle capture_phone_number function
 */
async function handleCapturePhoneNumber(args, callData) {
    const { customer_phone } = args;
    
    // Clean phone number (remove spaces, dashes, and other non-digit characters)
    const cleanPhone = customer_phone.replace(/[\s\-,।\.]/g, '');
    
    // Validate format (10 digits starting with 6-9)
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
        console.warn(`   ⚠️  Invalid phone number format: ${customer_phone} (cleaned: ${cleanPhone})`);
        return {
            success: false,
            message: `Invalid phone number format. Must be 10 digits starting with 6, 7, 8, or 9. Got: ${customer_phone}`
        };
    }
    
    // Store cleaned phone number in extractedData
    callData.extractedData.customer_phone = cleanPhone;
    
    console.log(`   ✅ [CAPTURED] customer_phone: ${cleanPhone}${customer_phone !== cleanPhone ? ` (cleaned from: ${customer_phone})` : ''}`);
    
    return {
        success: true,
        message: `Phone number ${cleanPhone} captured successfully.`
    };
}


/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   🔄 PHASE 2: UPDATE/CORRECTION FUNCTIONS
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

/**
 * Handle update_machine_number function
 * Two-call pattern: First call without args asks for input, second call with args updates
 */
async function handleUpdateMachineNumber(args, callData) {
    const { new_machine_no, reason } = args;
    
    // PREVENT REDUNDANT UPDATES: If machine is already validated and we're in phone confirmation flow, ignore update
    if (callData.customerData && callData.machineValidated && 
        (callData.awaitingPhoneConfirm || callData.pendingPhoneConfirm || callData.awaitingMachineUpdateConfirm)) {
        console.log(`   ⚠️  [UPDATE BLOCKED] Machine already validated and in confirmation flow - ignoring redundant update`);
        console.log(`   📋 Current machine: ${callData.extractedData.machine_no} (validated)`);
        console.log(`   📋 Customer: ${callData.customerData.name}`);
        return {
            success: true,
            alreadyValidated: true,
            message: `Machine number ${callData.extractedData.machine_no} is already validated. Customer: ${callData.customerData.name}. Ignoring redundant update.`
        };
    }
    
    // FIRST CALL: No new number provided - ask for it
    if (!new_machine_no) {
        console.log(`   📥 [UPDATE REQUEST] Machine number - asking for new value`);
        
        // Save current state before entering update flow
        if (!callData.stateBeforeUpdate) {
            callData.stateBeforeUpdate = callData.stateTracking?.currentState || 'collect_complaint';
            console.log(`   💾 [UPDATE FLOW] Saved state before update: ${callData.stateBeforeUpdate}`);
        }
        
        // Enter update flow
        callData.inUpdateFlow = true;
        callData.awaitingMachineUpdateInput = true;
        
        return {
            success: false,
            needsInput: true,
            enterUpdateState: true, // Signal to route handler to set UPDATE_MACHINE state
            prompt: "Theek hai. Naya machine number bataiye.",
            waitingFor: "machine_number",
            message: "Waiting for new machine number from customer"
        };
    }
    
    // SECOND CALL: New number provided - check if it's the same as current
    const oldValue = callData.extractedData.machine_no;
    
    // Clean machine number (remove spaces, dashes, and other non-digit characters)
    const cleanMachineNo = new_machine_no.replace(/[\s\-,।\.]/g, '');
    
    // CRITICAL: If machine is validated and new number is SHORTER than old (partial extraction), block it
    if (callData.customerData && callData.machineValidated && cleanMachineNo.length < oldValue.length) {
        console.log(`   ⚠️  [UPDATE BLOCKED] Partial number detected - likely speech recognition issue`);
        console.log(`   📋 Current validated: ${oldValue} (${oldValue.length} digits)`);
        console.log(`   📋 Attempted update: ${cleanMachineNo} (${cleanMachineNo.length} digits)`);
        console.log(`   🚫 Blocking partial extraction - keeping validated number`);
        return {
            success: true,
            alreadyValidated: true,
            message: `Partial number "${cleanMachineNo}" detected. Current validated number "${oldValue}" is correct. Ignoring partial extraction.`
        };
    }
    
    // If new number is same as current validated number, don't update
    if (cleanMachineNo === oldValue && callData.customerData && callData.machineValidated) {
        console.log(`   ⚠️  [UPDATE BLOCKED] New number same as current validated number - ignoring`);
        console.log(`   📋 Current machine: ${oldValue} (validated)`);
        return {
            success: true,
            alreadyValidated: true,
            message: `Machine number ${oldValue} is already validated. No update needed.`
        };
    }
    
    // Validate format (3-7 digits)
    if (!/^\d{3,7}$/.test(cleanMachineNo)) {
        console.warn(`   ⚠️  Invalid machine number format: ${new_machine_no} (cleaned: ${cleanMachineNo})`);
        return {
            success: false,
            message: `Invalid machine number format. Must be 3-7 digits. Got: ${new_machine_no}`
        };
    }
    
    // Update the field with cleaned number
    callData.extractedData.machine_no = cleanMachineNo;
    
    // Clear customer data if machine number changed (need to re-validate)
    if (oldValue !== cleanMachineNo && callData.customerData) {
        console.log(`   🔄 [UPDATE] Machine number changed, clearing customer data for re-validation`);
        callData.customerData = null;
        callData.machineValidated = false;
    }
    
    console.log(`   🔄 [UPDATE] machine_no: ${oldValue} → ${cleanMachineNo}${new_machine_no !== cleanMachineNo ? ` (cleaned from: ${new_machine_no})` : ''}`);
    if (reason) console.log(`   📝 Reason: ${reason}`);
    
    // Mark that we're awaiting validation
    callData.awaitingMachineUpdateInput = false;
    callData.pendingMachineUpdateValidation = true;
    
    return {
        success: true,
        needsValidation: true, // Trigger validation and confirmation flow
        inUpdateFlow: true, // Stay in update flow
        continueWithState: false, // Don't continue with state yet - wait for confirmation
        message: `Machine number updated from ${oldValue} to ${new_machine_no}. ${reason || 'Customer corrected the value.'}`
    };
}

/**
 * Handle update_complaint function
 * Two-call pattern: First call without args asks for input, second call with args updates
 */
async function handleUpdateComplaint(args, callData) {
    const { new_complaint_title, new_complaint_details, reason } = args;
    
    // FIRST CALL: No new complaint provided - ask for it
    if (!new_complaint_title) {
        console.log(`   📥 [UPDATE REQUEST] Complaint - asking for new value`);
        return {
            success: false,
            needsInput: true,
            prompt: "Theek hai. Sahi complaint bataiye. Machine mein kya problem hai?",
            waitingFor: "complaint",
            message: "Waiting for new complaint from customer"
        };
    }
    
    // SECOND CALL: New complaint provided - update it
    const oldTitle = callData.extractedData.complaint_title;
    const oldDetails = callData.extractedData.complaint_details;
    
    // Update complaint title
    callData.extractedData.complaint_title = new_complaint_title;
    console.log(`   🔄 [UPDATE] complaint_title: ${oldTitle} → ${new_complaint_title}`);
    
    // Update complaint details if provided
    if (new_complaint_details) {
        callData.extractedData.complaint_details = new_complaint_details;
        console.log(`   🔄 [UPDATE] complaint_details: ${oldDetails || 'none'} → ${new_complaint_details}`);
    }
    
    if (reason) console.log(`   📝 Reason: ${reason}`);
    
    return {
        success: true,
        continueWithState: true, // Pass execution back to current state
        message: `Complaint updated from "${oldTitle}" to "${new_complaint_title}". ${reason || 'Customer corrected the complaint.'}`
    };
}

/**
 * Handle update_city function
 * Two-call pattern: First call without args asks for input, second call with args updates
 */
async function handleUpdateCity(args, callData) {
    const { new_city, reason } = args;
    
    // FIRST CALL: No new city provided - ask for it
    if (!new_city) {
        console.log(`   📥 [UPDATE REQUEST] City - asking for new value`);
        return {
            success: false,
            needsInput: true,
            prompt: "Theek hai. Aap kaunse shahar mein hain? Jaipur, Kota, Ajmer, Udaipur?",
            waitingFor: "city",
            message: "Waiting for new city from customer"
        };
    }
    
    // SECOND CALL: New city provided - update it
    const oldCity = callData.extractedData.city;
    
    // Try to match service center
    const matched = matchServiceCenter(new_city);
    
    if (matched) {
        // Update city and all related fields
        callData.extractedData.city = matched.city_name;
        callData.extractedData.city_id = matched.branch_code;
        callData.extractedData.branch = matched.branch_name;
        callData.extractedData.outlet = matched.city_name;
        callData.extractedData.lat = matched.lat;
        callData.extractedData.lng = matched.lng;
        
        console.log(`   🔄 [UPDATE] city: ${oldCity} → ${matched.city_name}`);
        console.log(`   🔄 [UPDATE] branch: ${matched.branch_name}, city_id: ${matched.branch_code}`);
        if (reason) console.log(`   📝 Reason: ${reason}`);
        
        return {
            success: true,
            continueWithState: true, // Pass execution back to current state
            message: `City updated from ${oldCity} to ${matched.city_name}. Nearest branch: ${matched.branch_name}. ${reason || 'Customer corrected the location.'}`
        };
    } else {
        // Store raw city even if not matched
        callData.extractedData.city = new_city.toUpperCase();
        
        console.warn(`   ⚠️  City not matched in service centers: ${new_city}`);
        console.log(`   🔄 [UPDATE] city: ${oldCity} → ${new_city.toUpperCase()} (not matched)`);
        
        return {
            success: false,
            message: `City '${new_city}' not found in service center list. Please ask customer to provide nearest city from: Jaipur, Kota, Ajmer, Udaipur, Bhilwara, Alwar, Sikar.`
        };
    }
}

/**
 * Handle update_phone_number function
 * Two-call pattern: First call without args asks for input, second call with args updates
 */
async function handleUpdatePhoneNumber(args, callData) {
    const { new_customer_phone, reason } = args;
    
    // FIRST CALL: No new phone provided - ask for it
    if (!new_customer_phone) {
        console.log(`   📥 [UPDATE REQUEST] Phone number - asking for new value`);
        return {
            success: false,
            needsInput: true,
            prompt: "Theek hai. Naya mobile number bataiye. 10 digit ka number.",
            waitingFor: "phone_number",
            message: "Waiting for new phone number from customer"
        };
    }
    
    // SECOND CALL: New phone provided - update it
    const oldPhone = callData.extractedData.customer_phone;
    
    // Clean phone number (remove spaces, dashes, and other non-digit characters)
    const cleanPhone = new_customer_phone.replace(/[\s\-,।\.]/g, '');
    
    // Validate format (10 digits starting with 6-9)
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
        console.warn(`   ⚠️  Invalid phone number format: ${new_customer_phone} (cleaned: ${cleanPhone})`);
        return {
            success: false,
            message: `Invalid phone number format. Must be 10 digits starting with 6, 7, 8, or 9. Got: ${new_customer_phone}`
        };
    }
    
    // Update the field with cleaned phone
    callData.extractedData.customer_phone = cleanPhone;
    
    console.log(`   🔄 [UPDATE] customer_phone: ${oldPhone} → ${cleanPhone}${new_customer_phone !== cleanPhone ? ` (cleaned from: ${new_customer_phone})` : ''}`);
    if (reason) console.log(`   📝 Reason: ${reason}`);
    
    return {
        success: true,
        continueWithState: true, // Pass execution back to current state
        message: `Phone number updated from ${oldPhone} to ${cleanPhone}. ${reason || 'Customer corrected the number.'}`
    };
}

/**
 * Handle update_machine_status function
 * Two-call pattern: First call without args asks for input, second call with args updates
 */
async function handleUpdateMachineStatus(args, callData) {
    const { new_machine_status, reason } = args;
    
    // FIRST CALL: No new status provided - ask for it
    if (!new_machine_status) {
        console.log(`   📥 [UPDATE REQUEST] Machine status - asking for new value`);
        return {
            success: false,
            needsInput: true,
            prompt: "Theek hai. Machine bilkul band hai ya problem ke saath chal rahi hai?",
            waitingFor: "machine_status",
            message: "Waiting for new machine status from customer"
        };
    }
    
    // SECOND CALL: New status provided - update it
    const oldStatus = callData.extractedData.machine_status;
    
    // Validate enum value
    if (!['Breakdown', 'Running With Problem'].includes(new_machine_status)) {
        console.warn(`   ⚠️  Invalid machine status: ${new_machine_status}`);
        return {
            success: false,
            message: `Invalid machine status. Must be 'Breakdown' or 'Running With Problem'. Got: ${new_machine_status}`
        };
    }
    
    // Update the field
    callData.extractedData.machine_status = new_machine_status;
    
    console.log(`   🔄 [UPDATE] machine_status: ${oldStatus} → ${new_machine_status}`);
    if (reason) console.log(`   📝 Reason: ${reason}`);
    
    return {
        success: true,
        continueWithState: true, // Pass execution back to current state
        message: `Machine status updated from ${oldStatus} to ${new_machine_status}. ${reason || 'Customer corrected the status.'}`
    };
}


/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ✅ PHASE 3: CONFIRMATION FUNCTIONS
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

/**
 * Handle confirm_phone_number function
 */
async function handleConfirmPhoneNumber(args, callData) {
    const { confirmed, registered_phone } = args;
    
    console.log(`   ✅ [CONFIRM] Phone confirmation: ${confirmed ? 'ACCEPTED' : 'REJECTED'}`);
    
    if (confirmed) {
        // Customer confirmed the registered phone
        if (callData.customerData?.phone) {
            callData.extractedData.customer_phone = callData.customerData.phone;
            console.log(`   ✅ [CONFIRM] Phone confirmed: ${callData.customerData.phone}`);
        }
        
        // Clear confirmation flags
        callData.awaitingPhoneConfirm = false;
        callData.pendingPhoneConfirm = false;
        
        return {
            success: true,
            message: `Phone number confirmed: ${callData.customerData?.phone || registered_phone}`
        };
    } else {
        // Customer wants to change phone
        console.log(`   🔄 [CONFIRM] Customer wants to change phone number`);
        
        // Set flag to await alternate phone
        callData.awaitingAlternatePhone = true;
        callData.awaitingPhoneConfirm = false;
        callData.pendingPhoneConfirm = false;
        
        return {
            success: true,
            message: `Customer wants to change phone number. Asking for alternate phone.`
        };
    }
}

/**
 * Handle provide_alternate_phone function
 */
async function handleProvideAlternatePhone(args, callData) {
    const { alternate_phone, keep_both } = args;
    
    // Clean phone number (remove spaces, dashes)
    const cleanPhone = alternate_phone.replace(/[\s\-]/g, '');
    
    // Validate format (10 digits starting with 6-9)
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
        console.warn(`   ⚠️  Invalid alternate phone format: ${alternate_phone}`);
        return {
            success: false,
            message: `Invalid phone number format. Must be 10 digits starting with 6, 7, 8, or 9. Got: ${alternate_phone}`
        };
    }
    
    // Store alternate phone
    if (keep_both && callData.customerData?.phone) {
        // Keep both registered and alternate
        const originalPhone = callData.customerData.phone;
        if (originalPhone !== cleanPhone) {
            callData.extractedData.customer_phone = `${originalPhone}, ${cleanPhone}`;
            console.log(`   ✅ [ALTERNATE] Both phones saved: ${originalPhone}, ${cleanPhone}`);
        } else {
            callData.extractedData.customer_phone = cleanPhone;
            console.log(`   ✅ [ALTERNATE] Same phone provided: ${cleanPhone}`);
        }
    } else {
        // Only alternate phone
        callData.extractedData.customer_phone = cleanPhone;
        console.log(`   ✅ [ALTERNATE] Alternate phone saved: ${cleanPhone}`);
    }
    
    // Clear flags
    callData.awaitingAlternatePhone = false;
    
    return {
        success: true,
        message: `Alternate phone number ${cleanPhone} saved successfully.`
    };
}

/**
 * Handle confirm_city_and_branch function
 */
async function handleConfirmCityAndBranch(args, callData) {
    const { confirmed, city, branch } = args;
    
    console.log(`   ✅ [CONFIRM] City/Branch confirmation: ${confirmed ? 'ACCEPTED' : 'REJECTED'}`);
    
    if (confirmed) {
        // Customer confirmed city and branch
        callData.cityConfirmed = true;
        callData.awaitingCityConfirm = false;
        callData.pendingCityConfirm = false;
        
        console.log(`   ✅ [CONFIRM] City confirmed: ${callData.extractedData.city} → ${callData.extractedData.branch}`);
        
        return {
            success: true,
            message: `City and branch confirmed: ${callData.extractedData.city} → ${callData.extractedData.branch}`
        };
    } else {
        // Customer wants to change city
        console.log(`   🔄 [CONFIRM] Customer wants to change city`);
        
        // Clear city data
        callData.extractedData.city = null;
        callData.extractedData.city_id = null;
        callData.extractedData.branch = null;
        callData.extractedData.outlet = null;
        callData.extractedData.lat = null;
        callData.extractedData.lng = null;
        
        // Clear flags
        callData.cityConfirmed = false;
        callData.awaitingCityConfirm = false;
        callData.pendingCityConfirm = false;
        
        return {
            success: true,
            message: `Customer wants to change city. Asking for correct city.`
        };
    }
}

/**
 * Handle final_confirmation function
 */
async function handleFinalConfirmation(args, callData) {
    const { confirmed, additional_complaints, action } = args;
    
    console.log(`   ✅ [FINAL CONFIRM] Action: ${action}, Confirmed: ${confirmed}`);
    
    if (action === 'decline') {
        // Customer declined to save complaint
        console.log(`   ❌ [FINAL CONFIRM] Customer declined to save complaint`);
        
        callData.awaitingFinalConfirm = false;
        
        return {
            success: true,
            message: `Customer declined to save complaint. Call will end.`,
            action: 'decline'
        };
    }
    
    if (action === 'add_more' && additional_complaints) {
        // Customer wants to add more complaints
        console.log(`   📝 [FINAL CONFIRM] Adding more complaints: ${additional_complaints}`);
        
        // Parse additional complaints (semicolon-separated)
        const newComplaints = additional_complaints.split(';').map(s => s.trim()).filter(Boolean);
        
        // Merge with existing complaints
        const existingDetails = callData.extractedData.complaint_details
            ? callData.extractedData.complaint_details.split('; ').map(s => s.trim()).filter(Boolean)
            : [];
        
        const alreadyHave = new Set([callData.extractedData.complaint_title, ...existingDetails]);
        const newOnes = newComplaints.filter(c => !alreadyHave.has(c));
        
        if (newOnes.length > 0) {
            callData.extractedData.complaint_details = [...existingDetails, ...newOnes].join('; ');
            console.log(`   ✅ [FINAL CONFIRM] Added complaints: [${newOnes.join(', ')}]`);
        }
        
        // Clear final confirmation flag (will submit after adding)
        callData.awaitingFinalConfirm = false;
        
        return {
            success: true,
            message: `Added ${newOnes.length} more complaint(s). Ready to submit.`,
            action: 'add_more'
        };
    }
    
    if (action === 'submit' && confirmed) {
        // Customer confirmed to save/submit complaint
        console.log(`   ✅ [FINAL CONFIRM] Customer confirmed - ready to submit`);
        
        // Clear final confirmation flag
        callData.awaitingFinalConfirm = false;
        
        return {
            success: true,
            message: `Final confirmation received. Ready to submit complaint.`,
            action: 'submit'
        };
    }
    
    // Default case - unclear action
    console.warn(`   ⚠️  [FINAL CONFIRM] Unclear action: ${action}`);
    
    return {
        success: false,
        message: `Unclear final confirmation action: ${action}`
    };
}


/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ✅ PHASE 4: VALIDATION FUNCTIONS
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

/**
 * Validate machine number against database (API call)
 */
async function validateMachineNumberAPI(machineNo) {
    try {
        const r = await axios.get(
            `${BASE_URL}/get_machine_by_machine_no.php?machine_no=${machineNo}`,
            { timeout: API_TIMEOUT, headers: API_HEADERS, validateStatus: s => s < 500 }
        );
        if (r.status === 200 && r.data?.status === 1 && r.data?.data) {
            const d = r.data.data;
            return {
                valid: true,
                data: {
                    name: d.customer_name || "Unknown",
                    city: d.city || "Unknown",
                    model: d.machine_model || "Unknown",
                    machineNo: d.machine_no || machineNo,
                    phone: d.customer_phone_no || "Unknown",
                    subModel: d.sub_model || "NA",
                    machineType: d.machine_type || "Warranty",
                    businessPartnerCode: d.business_partner_code || "NA",
                    purchaseDate: d.purchase_date || "NA",
                    installationDate: d.installation_date || "NA",
                },
            };
        }
        return { valid: false };
    } catch (error) {
        console.error(`   ❌ API error validating machine number:`, error.message);
        return { valid: false };
    }
}

/**
 * Handle validate_machine_number function
 */
async function handleValidateMachineNumber(args, callData) {
    const { machine_no } = args;
    
    console.log(`   🔍 [VALIDATE] Validating machine number: ${machine_no}`);
    
    // First validate format (3-7 digits)
    if (!/^\d{3,7}$/.test(machine_no)) {
        console.warn(`   ⚠️  [VALIDATE] Invalid machine number format: ${machine_no}`);
        return {
            success: false,
            message: `Invalid machine number format. Must be 3-7 digits. Got: ${machine_no}`,
            validation_result: 'invalid_format'
        };
    }
    
    // Validate against database
    const result = await validateMachineNumberAPI(machine_no);
    
    if (result.valid) {
        // Machine found in database
        console.log(`   ✅ [VALIDATE] Machine number validated: ${result.data.name} | ${result.data.city} | ${result.data.model}`);
        
        // Update callData with customer information
        callData.customerData = result.data;
        callData.extractedData.machine_no = machine_no;
        callData.extractedData.customer_name = result.data.name;
        callData.machineNumberAttempts = 0; // Reset attempts on success
        
        // Set flag for phone confirmation
        callData.pendingPhoneConfirm = true;
        
        return {
            success: true,
            message: `Machine number ${machine_no} validated successfully. Customer: ${result.data.name}, City: ${result.data.city}, Model: ${result.data.model}`,
            validation_result: 'valid',
            customer_data: result.data
        };
    } else {
        // Machine not found in database
        console.warn(`   ❌ [VALIDATE] Machine number not found in database: ${machine_no}`);
        
        // Increment attempts
        if (!callData.machineNumberAttempts) callData.machineNumberAttempts = 0;
        callData.machineNumberAttempts++;
        
        // Clear machine number for retry
        callData.extractedData.machine_no = null;
        
        return {
            success: false,
            message: `Machine number ${machine_no} not found in database. Please verify and try again. Attempt ${callData.machineNumberAttempts}/3`,
            validation_result: 'not_found',
            attempts: callData.machineNumberAttempts
        };
    }
}

/**
 * Handle validate_phone_format function
 */
async function handleValidatePhoneFormat(args, callData) {
    const { phone_number } = args;
    
    console.log(`   🔍 [VALIDATE] Validating phone format: ${phone_number}`);
    
    // Clean phone number (remove spaces, dashes)
    const cleanPhone = phone_number.replace(/[\s\-]/g, '');
    
    // Validate format (10 digits starting with 6-9)
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
        console.warn(`   ⚠️  [VALIDATE] Invalid phone format: ${phone_number}`);
        
        // Provide specific error message
        let errorMessage = "Invalid phone number format. ";
        if (cleanPhone.length !== 10) {
            errorMessage += `Must be 10 digits (got ${cleanPhone.length} digits). `;
        }
        if (!/^[6-9]/.test(cleanPhone)) {
            errorMessage += "Must start with 6, 7, 8, or 9. ";
        }
        
        return {
            success: false,
            message: errorMessage + `Got: ${phone_number}`,
            validation_result: 'invalid_format',
            phone_provided: phone_number,
            phone_cleaned: cleanPhone
        };
    }
    
    // Phone format is valid
    console.log(`   ✅ [VALIDATE] Phone format valid: ${cleanPhone}`);
    
    return {
        success: true,
        message: `Phone number ${cleanPhone} has valid format.`,
        validation_result: 'valid',
        phone_validated: cleanPhone
    };
}

/**
 * Handle validate_city function
 */
async function handleValidateCity(args, callData) {
    const { city_name } = args;
    
    console.log(`   🔍 [VALIDATE] Validating city: ${city_name}`);
    
    // Try to match service center
    const matched = matchServiceCenter(city_name);
    
    if (matched) {
        // City found and matched to service center
        console.log(`   ✅ [VALIDATE] City validated: ${matched.city_name} → Branch: ${matched.branch_name}`);
        
        return {
            success: true,
            message: `City ${matched.city_name} validated successfully. Nearest branch: ${matched.branch_name}`,
            validation_result: 'valid',
            matched_city: {
                city_name: matched.city_name,
                branch_name: matched.branch_name,
                branch_code: matched.branch_code,
                lat: matched.lat,
                lng: matched.lng
            }
        };
    } else {
        // City not found in service center list
        console.warn(`   ⚠️  [VALIDATE] City not found in service centers: ${city_name}`);
        
        // Get list of available cities for suggestion
        const availableCities = [
            "Jaipur", "Kota", "Ajmer", "Udaipur", "Bhilwara", 
            "Alwar", "Sikar", "Bikaner", "Jodhpur"
        ];
        
        return {
            success: false,
            message: `City '${city_name}' not found in service center list. Please provide nearest city from: ${availableCities.join(", ")}`,
            validation_result: 'not_found',
            city_provided: city_name,
            available_cities: availableCities
        };
    }
}


/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   📋 PHASE 5: COMPLAINT MANAGEMENT FUNCTIONS
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

/**
 * Handle add_additional_complaint function
 */
async function handleAddAdditionalComplaint(args, callData) {
    const { additional_complaint, complaint_details } = args;
    
    console.log(`   📝 [ADD COMPLAINT] Adding additional complaint: ${additional_complaint}`);
    
    // Get existing complaints
    const existingTitle = callData.extractedData.complaint_title;
    const existingDetails = callData.extractedData.complaint_details
        ? callData.extractedData.complaint_details.split('; ').map(s => s.trim()).filter(Boolean)
        : [];
    
    // Create a set of all existing complaints (including title)
    const allExisting = new Set([existingTitle, ...existingDetails].filter(Boolean));
    
    // Check if this complaint is already in the list
    if (allExisting.has(additional_complaint)) {
        console.log(`   ⚠️  [ADD COMPLAINT] Complaint already exists: ${additional_complaint}`);
        return {
            success: true,
            message: `Complaint "${additional_complaint}" is already in the list. No need to add again.`,
            duplicate: true
        };
    }
    
    // Add the new complaint to the details list
    const updatedDetails = [...existingDetails, additional_complaint];
    
    // Add complaint details if provided
    if (complaint_details) {
        updatedDetails.push(complaint_details);
    }
    
    // Update the complaint_details field
    callData.extractedData.complaint_details = updatedDetails.join('; ');
    
    console.log(`   ✅ [ADD COMPLAINT] Added: ${additional_complaint}`);
    console.log(`   📋 [ADD COMPLAINT] Total complaints: ${allExisting.size + 1}`);
    console.log(`   📝 [ADD COMPLAINT] All complaints: ${existingTitle}; ${callData.extractedData.complaint_details}`);
    
    return {
        success: true,
        message: `Added complaint: ${additional_complaint}. Total complaints: ${allExisting.size + 1}`,
        total_complaints: allExisting.size + 1,
        all_complaints: `${existingTitle}; ${callData.extractedData.complaint_details}`
    };
}

/**
 * Handle handle_existing_complaint function
 */
async function handleExistingComplaint(args, callData) {
    const { action, existing_complaint_id, reason } = args;
    
    console.log(`   🔄 [EXISTING COMPLAINT] Action: ${action}`);
    if (existing_complaint_id) console.log(`   📋 [EXISTING COMPLAINT] ID: ${existing_complaint_id}`);
    if (reason) console.log(`   📝 [EXISTING COMPLAINT] Reason: ${reason}`);
    
    // Store existing complaint information
    if (!callData.existingComplaint) {
        callData.existingComplaint = {};
    }
    
    callData.existingComplaint.action = action;
    if (existing_complaint_id) {
        callData.existingComplaint.id = existing_complaint_id;
    }
    if (reason) {
        callData.existingComplaint.reason = reason;
    }
    
    if (action === 'escalate') {
        // Customer wants to escalate existing complaint
        console.log(`   ⚠️  [EXISTING COMPLAINT] Escalating existing complaint`);
        
        // Set flag for escalation
        callData.existingComplaint.escalate = true;
        
        return {
            success: true,
            message: `Existing complaint will be escalated. ${reason || 'Customer requested escalation.'}`,
            action: 'escalate',
            next_step: 'inform_escalation_process'
        };
    }
    
    if (action === 'register_new') {
        // Customer wants to register a new complaint despite existing one
        console.log(`   ✅ [EXISTING COMPLAINT] Registering new complaint`);
        
        // Clear existing complaint flag
        callData.existingComplaint.registerNew = true;
        
        return {
            success: true,
            message: `Will register new complaint. ${reason || 'Customer wants to register new complaint.'}`,
            action: 'register_new',
            next_step: 'continue_data_collection'
        };
    }
    
    if (action === 'check_status') {
        // Customer wants to check status of existing complaint
        console.log(`   🔍 [EXISTING COMPLAINT] Checking status`);
        
        // Set flag for status check
        callData.existingComplaint.checkStatus = true;
        
        return {
            success: true,
            message: `Will check status of existing complaint. ${existing_complaint_id ? `ID: ${existing_complaint_id}` : 'Please provide complaint ID.'}`,
            action: 'check_status',
            next_step: 'query_complaint_status'
        };
    }
    
    // Unknown action
    console.warn(`   ⚠️  [EXISTING COMPLAINT] Unknown action: ${action}`);
    return {
        success: false,
        message: `Unknown action: ${action}. Valid actions: escalate, register_new, check_status`
    };
}

/**
 * Handle submit_complaint function
 */
async function handleSubmitComplaint(args, callData) {
    const { final_confirmation, submission_notes } = args;
    
    console.log(`   🚀 [SUBMIT] Final confirmation: ${final_confirmation}`);
    if (submission_notes) console.log(`   📝 [SUBMIT] Notes: ${submission_notes}`);
    
    if (!final_confirmation) {
        console.warn(`   ⚠️  [SUBMIT] Final confirmation not received`);
        return {
            success: false,
            message: `Cannot submit without final confirmation. Please confirm with customer first.`
        };
    }
    
    // Validate that all required fields are present
    const data = callData.extractedData;
    const required = ['machine_no', 'complaint_title', 'machine_status', 'city', 'city_id', 'customer_phone'];
    const missing = [];
    
    for (const field of required) {
        if (!data[field] || data[field] === 'NA' || data[field] === 'Unknown') {
            missing.push(field);
        }
    }
    
    if (missing.length > 0) {
        console.warn(`   ⚠️  [SUBMIT] Missing required fields: ${missing.join(', ')}`);
        return {
            success: false,
            message: `Cannot submit complaint. Missing required fields: ${missing.join(', ')}`,
            missing_fields: missing
        };
    }
    
    // Validate machine number format
    if (!/^\d{3,7}$/.test(data.machine_no)) {
        console.warn(`   ⚠️  [SUBMIT] Invalid machine number format: ${data.machine_no}`);
        return {
            success: false,
            message: `Invalid machine number format: ${data.machine_no}. Must be 3-7 digits.`
        };
    }
    
    // Validate phone number format
    if (!/^[6-9]\d{9}(?:,\s*[6-9]\d{9})*$/.test(String(data.customer_phone))) {
        console.warn(`   ⚠️  [SUBMIT] Invalid phone number format: ${data.customer_phone}`);
        return {
            success: false,
            message: `Invalid phone number format: ${data.customer_phone}. Must be 10 digits starting with 6-9.`
        };
    }
    
    // Check if machine is validated
    if (!callData.customerData || !callData.machineValidated) {
        console.warn(`   ⚠️  [SUBMIT] Machine not validated yet`);
        return {
            success: false,
            message: `Machine number ${data.machine_no} must be validated before submission.`,
            validation_required: true
        };
    }
    
    // Add submission notes if provided
    if (submission_notes) {
        const existingDetails = data.complaint_details || '';
        data.complaint_details = existingDetails 
            ? `${existingDetails}; Notes: ${submission_notes}`
            : `Notes: ${submission_notes}`;
    }
    
    // Set ready to submit flag
    callData.readyToSubmit = true;
    callData.awaitingFinalConfirm = false;
    
    console.log(`   ✅ [SUBMIT] All validations passed - ready to submit`);
    console.log(`   📋 [SUBMIT] Machine: ${data.machine_no} | Customer: ${callData.customerData.name}`);
    console.log(`   📋 [SUBMIT] Complaint: ${data.complaint_title}`);
    console.log(`   📋 [SUBMIT] City: ${data.city} | Phone: ${data.customer_phone}`);
    
    return {
        success: true,
        message: `Complaint validated and ready for submission. Machine: ${data.machine_no}, Customer: ${callData.customerData.name}, Complaint: ${data.complaint_title}`,
        ready_to_submit: true,
        complaint_summary: {
            machine_no: data.machine_no,
            customer_name: callData.customerData.name,
            complaint_title: data.complaint_title,
            machine_status: data.machine_status,
            city: data.city,
            phone: data.customer_phone
        }
    };
}

export default { executeFunctionCall };

