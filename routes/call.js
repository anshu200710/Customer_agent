import express from 'express';
import twilio from 'twilio';
import { getAIResponse, saveCallToDataset } from '../services/llm.js';
import { extractAllData, validateComplaintData, matchServiceCenter, buildCandidates } from '../logic/rules.js';
import { speak, sayRaw } from '../services/tts.js';
import { validateMachineNumber, findMachineByPhone, getExistingComplaint, escalateToEngineer, submitComplaint } from '../services/api.js';
import { sanitizeData, missingField } from '../utils/helpers.js';

const router = express.Router();
const VoiceResponse = twilio.twiml.VoiceResponse;
const activeCalls = new Map();

// Conversation prompts
const ASK = {
    machine_no: "Ji, chassis number ya machine number bata dijiye.",
    complaint_title: "Theek hai. Kya problem aa rahi hai machine mein?",
    machine_status: "Machine abhi chal rahi hai ya bilkul band ho gayi?",
    city: "Kaunse shahar mein hai aapki machine?",
    customer_phone: "Aapka mobile number bata dijiye.",
};

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   📞 INITIAL CALL HANDLER
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
router.post('/', async (req, res) => {
    const { CallSid, From } = req.body;
    const { machine_no: preloadedMachineNo } = req.query;
    const callerPhone = From?.replace(/^\+91/, '').replace(/^\+/, '').slice(-10) || '';

    console.log('\n' + '═'.repeat(70));
    console.log(`📞 [START] ${CallSid} | From:${callerPhone} | Machine:${preloadedMachineNo || '—'}`);
    console.log('═'.repeat(70));

    const twiml = new VoiceResponse();

    try {
        const callData = initializeCallData(CallSid, callerPhone, preloadedMachineNo);

        // Check if repeat caller
        if (callerPhone) {
            const phoneResult = await findMachineByPhone(callerPhone);
            if (phoneResult.valid) {
                callData.isRepeatCaller = true;
                callData._phoneData = phoneResult.data;
                console.log(`   📱 Known caller: ${phoneResult.data.name}`);
            }
        }

        // Validate preloaded machine number
        if (preloadedMachineNo) {
            const validation = await validateMachineNumber(preloadedMachineNo);
            if (validation.valid) {
                callData.customerData = validation.data;
                callData.extractedData.machine_no = validation.data.machineNo;
                callData.extractedData.customer_name = validation.data.name;
                callData.pendingPhoneConfirm = true;
                console.log(`   ✅ Pre-validated: ${validation.data.name}`);
            }
        }

        activeCalls.set(CallSid, callData);

        // Fast greeting - no LLM call
        const greeting = callData.customerData
            ? `Namaste ${callData.customerData.name.split(' ')[0]} ji. Kya problem hai machine mein?`
            : 'Namaste ji. Chassis number ya machine number bata dijiye.';

        speak(twiml, greeting);
        return res.type('text/xml').send(twiml.toString());

    } catch (err) {
        console.error('❌ [START]', err.message);
        sayRaw(twiml, 'Thodi problem aa gayi. Dobara call karein ji.');
        twiml.hangup();
        return res.type('text/xml').send(twiml.toString());
    }
});

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   🗣️ MAIN PROCESSOR
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
router.post('/process', async (req, res) => {
    const { CallSid, SpeechResult } = req.body;
    const twiml = new VoiceResponse();

    try {
        const callData = activeCalls.get(CallSid);
        if (!callData) {
            sayRaw(twiml, 'Dobara call karein ji.');
            twiml.hangup();
            return res.type('text/xml').send(twiml.toString());
        }

        const userInput = SpeechResult?.trim() || '';
        callData.turnCount++;

        console.log(`\n${'─'.repeat(60)}`);
        console.log(`🔄 [T${callData.turnCount}] "${userInput || '[SILENCE]'}"`);

        // Handle silence
        if (await handleSilence(userInput, callData, twiml, res, CallSid)) {
            return;
        }

        // Max turns safety
        if (callData.turnCount > 22) {
            await finalizeCall(callData, twiml, CallSid, 'Engineer ko message kar diya hai. Jaldi call karega. Dhanyavaad!');
            return res.type('text/xml').send(twiml.toString());
        }

        callData.messages.push({ role: 'user', text: userInput, timestamp: new Date() });

        // Handle existing complaint scenario
        if (await handleExistingComplaint(userInput, callData, twiml, res, CallSid)) {
            return;
        }

        // Handle no chassis number scenario
        if (await handleNoChassisNumber(userInput, callData, twiml, res, CallSid)) {
            return;
        }

        // Handle phone confirmation
        if (await handlePhoneConfirmation(userInput, callData, twiml, res, CallSid)) {
            return;
        }

        // Try machine lookup
        if (await handleMachineLookup(userInput, callData, twiml, res, CallSid)) {
            return;
        }

        // Show phone confirm prompt if needed
        if (callData.pendingPhoneConfirm && callData.customerData?.phone) {
            const ph = callData.customerData.phone;
            callData.pendingPhoneConfirm = false;
            callData.awaitingPhoneConfirm = true;
            activeCalls.set(CallSid, callData);
            console.log(`   📞 Phone confirm, last2: ${ph.slice(-2)}`);
            speak(twiml, `Complaint ke liye ye number rakhna hai jisme last mein ${ph.slice(-2)} hai?`);
            return res.type('text/xml').send(twiml.toString());
        }

        // Fast extraction via regex
        const extracted = extractAllData(userInput, callData.extractedData);
        for (const [key, value] of Object.entries(extracted)) {
            if (value && !callData.extractedData[key]) {
                callData.extractedData[key] = value;
            }
        }

        // City matching
        if (callData.extractedData.city && !callData.extractedData.city_id) {
            const cityMatch = matchServiceCenter(callData.extractedData.city);
            if (cityMatch) {
                callData.extractedData.city = cityMatch.city_name;
                callData.extractedData.city_id = cityMatch.branch_code;
                callData.extractedData.branch = cityMatch.branch_name;
                callData.extractedData.outlet = cityMatch.city_name;
                callData.extractedData.lat = cityMatch.lat;
                callData.extractedData.lng = cityMatch.lng;
                console.log(`   🗺️  ${cityMatch.city_name} → ${cityMatch.branch_name}`);
            }
        }

        // Sanitize
        callData.extractedData = sanitizeData(callData.extractedData);

        // Check if ready to submit
        const missing = missingField(callData.extractedData);
        console.log(`   📊 M:${callData.extractedData.machine_no || '❌'} P:${callData.extractedData.complaint_title || '❌'} S:${callData.extractedData.machine_status || '❌'} C:${callData.extractedData.city || '❌'} Ph:${callData.extractedData.customer_phone || '❌'} → ${missing || '✅ SUBMIT'}`);

        if (!missing) {
            return await handleSubmit(callData, twiml, res, CallSid);
        }

        /* 
           ❌ DEPRECATED: Fast Response (Hardcoded layer)
           Removing this to ensure every turn is handled by the Brain (Llama-3.3) 
           for a more human-like, non-robotic experience.
        */
        // const fastResponse = getFastResponse(missing, userInput, callData.extractedData);
        // if (fastResponse) { ... }

        // Use LLM with vector DB context
        const aiResponse = await getAIResponse(callData);
        console.log(`   🤖 AI → "${aiResponse.text.substring(0, 60)}" submit:${aiResponse.readyToSubmit}`);

        callData.messages.push({ role: 'assistant', text: aiResponse.text, timestamp: new Date() });

        if (aiResponse.extractedData) {
            for (const [key, value] of Object.entries(aiResponse.extractedData)) {
                if (value && !callData.extractedData[key]) {
                    callData.extractedData[key] = value;
                }
            }
        }

        // Final check: if the AI says it's ready, or we have all fields, submit.
        const stillMissing = missingField(callData.extractedData);
        if (aiResponse.readyToSubmit || !stillMissing) {
            return await handleSubmit(callData, twiml, res, CallSid);
        }

        activeCalls.set(CallSid, callData);
        speak(twiml, aiResponse.text);
        return res.type('text/xml').send(twiml.toString());

    } catch (err) {
        console.error('❌ [PROCESS]', err.message);
        sayRaw(twiml, 'Thodi dikkat aa gayi. Engineer ko bhej raha hun. Dhanyavaad.');
        twiml.dial(process.env.HUMAN_AGENT_NUMBER || '+919876543210');
        activeCalls.delete(CallSid);
        return res.type('text/xml').send(twiml.toString());
    }
});

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   🔧 HELPER FUNCTIONS
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function initializeCallData(callSid, callerPhone, preloadedMachineNo) {
    return {
        callSid,
        callingNumber: callerPhone,
        messages: [],
        extractedData: {
            machine_no: preloadedMachineNo || null,
            customer_name: null,
            customer_phone: null,
            city: null,
            city_id: null,
            branch: null,
            outlet: null,
            lat: null,
            lng: null,
            complaint_title: null,
            complaint_subtitle: null,
            machine_status: null,
            job_location: null,
            complaint_details: '',
            machine_location_address: null,
        },
        customerData: null,
        turnCount: 0,
        silenceCount: 0,
        pendingPhoneConfirm: false,
        awaitingPhoneConfirm: false,
        machineNotFoundCount: 0,
        isRepeatCaller: false,
        existingComplaintId: null,
        awaitingComplaintAction: false,
    };
}

async function handleSilence(userInput, callData, twiml, res, CallSid) {
    if (!userInput || userInput.length < 2) {
        callData.silenceCount++;
        const hasData = !!(callData.customerData || callData.extractedData.machine_no);

        if (callData.silenceCount >= (hasData ? 5 : 3)) {
            sayRaw(twiml, 'Koi awaaz nahi aa rahi. Dobara call karein ji.');
            twiml.hangup();
            activeCalls.delete(CallSid);
            res.type('text/xml').send(twiml.toString());
            return true;
        }

        const prompts = hasData
            ? ['Ji sun rahi hun.', 'Bataiye ji.', 'Ji zarur.', 'Main hun ji.', 'Bataiye.']
            : ['Ji? Bataiye.', 'Ek baar phir boliye.', 'Hello ji?'];

        speak(twiml, prompts[Math.min(callData.silenceCount - 1, prompts.length - 1)]);
        activeCalls.set(CallSid, callData);
        res.type('text/xml').send(twiml.toString());
        return true;
    }

    callData.silenceCount = 0;
    return false;
}

async function handleExistingComplaint(userInput, callData, twiml, res, CallSid) {
    const lower = userInput.toLowerCase();
    const alreadyComplaintPattern = /(pehle complaint|already complaint|complaint kar di thi|engineer nahi aaya|kab aayega|dobara complaint)/i;

    if (alreadyComplaintPattern.test(lower) && !callData.awaitingComplaintAction) {
        console.log(`   🔄 SCENARIO: Already complaint / engineer not coming`);

        let existingInfo = null;
        const machNo = callData.extractedData.machine_no || callData.customerData?.machineNo;

        if (machNo) {
            existingInfo = await getExistingComplaint(machNo);
        } else if (callData.callingNumber) {
            const phoneResult = await findMachineByPhone(callData.callingNumber);
            if (phoneResult.valid) {
                callData.customerData = phoneResult.data;
                callData.extractedData.machine_no = phoneResult.data.machineNo;
                existingInfo = await getExistingComplaint(phoneResult.data.machineNo);
            }
        }

        if (existingInfo?.found) {
            callData.existingComplaintId = existingInfo.complaintId;
            callData.awaitingComplaintAction = true;
            activeCalls.set(CallSid, callData);
            speak(twiml, `Ji, complaint number ${existingInfo.complaintId} mili. Engineer assign hai. Kya nayi complaint register karein ya engineer ko urgent message bhejein?`);
            res.type('text/xml').send(twiml.toString());
            return true;
        } else {
            callData.awaitingComplaintAction = false;
            activeCalls.set(CallSid, callData);
            speak(twiml, 'Ji samajh gaya. Koi pehli complaint nahi mili. Ek nayi complaint register kar deta hun. Chassis number bata dijiye.');
            res.type('text/xml').send(twiml.toString());
            return true;
        }
    }

    if (callData.awaitingComplaintAction) {
        callData.awaitingComplaintAction = false;
        const wantsNew = /(nayi|naya|new complaint|register|fresh)/i.test(lower);

        if (wantsNew) {
            console.log(`   📝 Customer wants new complaint registration`);
            activeCalls.set(CallSid, callData);
            speak(twiml, `Theek hai ji. Nayi complaint register karta hun. ${ASK.complaint_title}`);
            res.type('text/xml').send(twiml.toString());
            return true;
        } else {
            console.log(`   🚨 Customer wants urgent escalation`);
            await escalateToEngineer(callData.existingComplaintId, callData.callingNumber);
            sayRaw(twiml, 'Ji bilkul. Engineer ko abhi urgent message bhej diya. Jaldi aayega. Dhanyavaad ji!');
            twiml.hangup();
            activeCalls.delete(CallSid);
            res.type('text/xml').send(twiml.toString());
            return true;
        }
    }

    return false;
}

async function handleNoChassisNumber(userInput, callData, twiml, res, CallSid) {
    if (callData.customerData || callData.extractedData.machine_no) {
        return false;
    }

    const holdPattern = /\b(ek minute|ek second|ruko|ruk|dhundh|dekh|check kar|hold|thoda|leke aata)\b/i;
    if (holdPattern.test(userInput) && userInput.replace(/[^0-9]/g, '').length < 4) {
        speak(twiml, 'Ji zarur, main hun.');
        activeCalls.set(CallSid, callData);
        res.type('text/xml').send(twiml.toString());
        return true;
    }

    const noChassisPattern = /(pata nahi|nahi pata|nahi hai mere|maloom nahi|yaad nahi|number nahi|chassis nahi)/i;
    if (noChassisPattern.test(userInput.toLowerCase()) && userInput.replace(/[^0-9]/g, '').length < 4) {
        console.log(`   🔍 No chassis — trying phone lookup: ${callData.callingNumber}`);

        const phoneResult = callData._phoneData || (callData.callingNumber ? await findMachineByPhone(callData.callingNumber) : { valid: false });

        if (phoneResult.valid) {
            callData.customerData = phoneResult.data;
            callData.extractedData.machine_no = phoneResult.data.machineNo;
            callData.extractedData.customer_name = phoneResult.data.name;
            callData.pendingPhoneConfirm = true;
            callData.machineNotFoundCount = 0;
            console.log(`   ✅ Phone lookup → ${phoneResult.data.name} (${phoneResult.data.machineNo})`);
            activeCalls.set(CallSid, callData);
            return false; // Continue to phone confirm
        } else {
            activeCalls.set(CallSid, callData);
            speak(twiml, 'Koi baat nahi ji. Machine ke dashboard pe ek metal plate hoti hai, uspe chassis number likha hota hai. Ek baar dekh ke bata dijiye.');
            res.type('text/xml').send(twiml.toString());
            return true;
        }
    }

    return false;
}

async function handlePhoneConfirmation(userInput, callData, twiml, res, CallSid) {
    if (!callData.awaitingPhoneConfirm) {
        return false;
    }

    callData.awaitingPhoneConfirm = false;
    const lower = userInput.toLowerCase();
    const isNo = /(nahi|nhi|no|change|badlo|alag|dusra|naya|galat|different)/.test(lower);

    if (isNo) {
        callData.extractedData.customer_phone = null;
        activeCalls.set(CallSid, callData);
        speak(twiml, 'Ji, naya number bata dijiye.');
        res.type('text/xml').send(twiml.toString());
        return true;
    } else {
        callData.extractedData.customer_phone = callData.customerData.phone;
        console.log(`   ✅ Phone confirmed: ${callData.customerData.phone}`);
        activeCalls.set(CallSid, callData);
        return false;
    }
}

async function handleMachineLookup(userInput, callData, twiml, res, CallSid) {
    if (callData.customerData || callData.extractedData.machine_no) {
        return false;
    }

    const thisTurnDigits = userInput.replace(/[^0-9]/g, '');
    const userTurns = callData.messages.filter(m => m.role === 'user');
    const prevDigits = userTurns.length >= 2
        ? userTurns[userTurns.length - 2].text.replace(/[^0-9]/g, '')
        : '';

    const candidates = buildCandidates(thisTurnDigits, prevDigits);

    if (candidates.length > 0) {
        console.log(`   🔍 [${candidates.length}]: ${candidates.join(', ')}`);

        let found = null;
        let foundCandidate = null;

        for (const candidate of candidates) {
            const result = await validateMachineNumber(candidate);
            if (result.valid) {
                found = result;
                foundCandidate = candidate;
                break;
            }
        }

        if (found) {
            callData.customerData = found.data;
            callData.extractedData.machine_no = found.data.machineNo;
            callData.extractedData.customer_name = found.data.name;
            callData.pendingPhoneConfirm = true;
            callData.machineNotFoundCount = 0;
            console.log(`   ✅ [${foundCandidate}] → ${found.data.name}`);
            activeCalls.set(CallSid, callData);
            return false;
        } else if (thisTurnDigits.length >= 4) {
            callData.machineNotFoundCount++;
            console.warn(`   ❌ No match (attempt ${callData.machineNotFoundCount})`);

            if (callData.machineNotFoundCount === 2 && callData.callingNumber) {
                const phoneResult = callData._phoneData || await findMachineByPhone(callData.callingNumber);
                if (phoneResult.valid) {
                    callData.customerData = phoneResult.data;
                    callData.extractedData.machine_no = phoneResult.data.machineNo;
                    callData.extractedData.customer_name = phoneResult.data.name;
                    callData.pendingPhoneConfirm = true;
                    callData.machineNotFoundCount = 0;
                    console.log(`   ✅ Phone fallback → ${phoneResult.data.name}`);
                    activeCalls.set(CallSid, callData);
                    return false;
                } else {
                    sayRaw(twiml, 'Chassis system mein nahi mila. Engineer ko forward kar raha hun. Dhanyavaad ji.');
                    twiml.hangup();
                    activeCalls.delete(CallSid);
                    res.type('text/xml').send(twiml.toString());
                    return true;
                }
            } else if (callData.machineNotFoundCount >= 3) {
                sayRaw(twiml, 'Chassis nahi mila. Engineer ko bhej raha hun. Dhanyavaad ji.');
                twiml.hangup();
                activeCalls.delete(CallSid);
                res.type('text/xml').send(twiml.toString());
                return true;
            } else {
                speak(twiml, 'Ye number nahi mila. Sahi chassis number bata dijiye.');
                activeCalls.set(CallSid, callData);
                res.type('text/xml').send(twiml.toString());
                return true;
            }
        }
    }

    return false;
}

function getFastResponse(missingFieldName, userInput, data) {
    const lower = userInput.toLowerCase();

    // Needs LLM for phone references
    const needsLLM = /(last mein|end mein|pehle wala|wohi wala|same wala|jo bola|jo bataya|usi ko|wahi number)/i.test(lower) ||
        /\d{2}\s*(hai|wala|se|ka|pe)\b/.test(lower);

    if (needsLLM) return null;

    switch (missingFieldName) {
        case 'machine_no':
            return ASK.machine_no;
        case 'complaint_title':
            if (data.complaint_title) {
                if (data.machine_status && data.city) return `Theek hai ji. ${ASK.customer_phone}`;
                if (data.machine_status) return `Achha ji. ${ASK.city}`;
                return `Samajh gaya ji. ${ASK.machine_status}`;
            }
            return ASK.complaint_title;
        case 'machine_status':
            if (data.machine_status)
                return data.city ? `Theek hai ji. ${ASK.customer_phone}` : `Achha ji. ${ASK.city}`;
            return ASK.machine_status;
        case 'city':
            if (data.city)
                return data.customer_phone ? null : `Achha ji. ${ASK.customer_phone}`;
            return ASK.city;
        case 'customer_phone':
            if (data.customer_phone) return null;
            if (/\d{5,}/.test(userInput.replace(/\s/g, '')))
                return 'Ji, 10 digit ka number chahiye — 6, 7, 8 ya 9 se shuru hona chahiye.';
            return ASK.customer_phone;
    }
    return null;
}

async function handleSubmit(callData, twiml, res, CallSid) {
    console.log('\n🚀 [SUBMIT]');

    // Save conversation to dataset for learning
    await saveCallToDataset(callData);

    const result = await submitComplaint(callData);

    if (result.success) {
        const id = result.sapId || result.jobId || '';
        sayRaw(twiml, id
            ? `Complaint register ho gayi ji. Number hai ${String(id).split('').join(' ')}. Engineer jaldi aayega. Dhanyavaad!`
            : 'Complaint register ho gayi ji. Engineer jaldi aayega. Dhanyavaad!');
    } else {
        sayRaw(twiml, 'Complaint note ho gayi ji. Engineer jaldi aayega. Dhanyavaad!');
    }

    await finalizeCall(callData, twiml, CallSid, null);
    return res.type('text/xml').send(twiml.toString());
}

async function finalizeCall(callData, twiml, CallSid, message) {
    if (message) {
        sayRaw(twiml, message);
    }
    twiml.hangup();
    activeCalls.delete(CallSid);

    // Save to dataset after call ends
    await saveCallToDataset(callData);
}

export default router;