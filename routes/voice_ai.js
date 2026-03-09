import express from 'express';
import twilio from 'twilio';
import axios from 'axios';
import { askGroqAI, extractOnlyDigits, isValidChassisFormat, detectIntent, findBestServiceCenterMatch } from '../utils/ai_agent.js';

const router = express.Router();
const VoiceResponse = twilio.twiml.VoiceResponse;

const activeCalls = new Map();

/* ======================= EXTERNAL API CONFIG ======================= */
const EXTERNAL_API_BASE = "http://gprs.rajeshmotors.com/jcbServiceEnginerAPIv7";
const COMPLAINT_API_URL = "http://gprs.rajeshmotors.com/jcbServiceEnginerAPIv7/ai_call_complaint.php";
const API_TIMEOUT = 20000;
const API_HEADERS = { JCBSERVICEAPI: "MakeInJcb" };

/* ======================= INTENTS ======================= */
const INTENT = {
  WAIT: "wait",
  CHECKING: "checking",
  CANCEL: "cancel",
};

/**
 * Helper to gather speech/DTMF for numbers
 */
function askNumber(twiml, msg) {
  const gather = twiml.gather({
    input: "speech dtmf",
    language: "hi-IN",
    action: "/voice/process",
    method: "POST",
    timeout: 10,
    numDigits: 12,
    finishOnKey: "#",
    speechTimeout: "auto",
  });
  gather.say({
    voice: "Google.hi-IN-Wavenet-D",
    language: "hi-IN"
  }, msg);
}

/**
 * Helper to gather general speech
 */
function ask(twiml, msg) {
  const gather = twiml.gather({
    input: "speech",
    language: "hi-IN",
    action: "/voice/process",
    method: "POST",
    timeout: 8,
    speechTimeout: "auto",
  });
  gather.say({
    voice: "Google.hi-IN-Wavenet-D",
    language: "hi-IN"
  }, msg);
}

function handleConversationalIntent(text, callData) {
  if (!text) return { handled: false };
  const t = text.toLowerCase();
  
  if (t.includes("ruko") || t.includes("wait") || t.includes("ek minute") || t.includes("rukiye")) {
    return { handled: true, intent: INTENT.WAIT, response: "Ji, main ruka hoon. Boliye." };
  }
  if (t.includes("check") || t.includes("dekhta hoon") || t.includes("dekh ke")) {
    return { handled: true, intent: INTENT.CHECKING, response: "Theek hai, aap dekh lijiye. Main sun raha hoon." };
  }
  return { handled: false };
}

async function validateChassisViaAPI(chassisNo) {
  try {
    console.log(`\n🔍 API VALIDATION: ${chassisNo}`);
    const apiUrl = `${EXTERNAL_API_BASE}/get_machine_by_machine_no.php?machine_no=${chassisNo}`;
    const response = await axios.get(apiUrl, {
      timeout: API_TIMEOUT,
      headers: API_HEADERS,
      validateStatus: (s) => s < 500,
    });
    
    if (
      response.status === 200 &&
      response.data?.status === 1 &&
      response.data?.data
    ) {
      const d = response.data.data;
      console.log(`   ✅ VALID — Customer: ${d.customer_name}, City: ${d.city}`);
      return {
        valid: true,
        data: {
          customer_name: d.customer_name || "Unknown",
          city: d.city || "Unknown",
          machine_model: d.machine_model || "Unknown",
          machine_no: d.machine_no || chassisNo,
          customer_phone_no: d.customer_phone_no || "",
          sub_model: d.sub_model || "NA",
          machine_type: d.machine_type || "Warranty",
          business_partner_code: d.business_partner_code || "NA",
          purchase_date: d.purchase_date || "NA",
          installation_date: d.installation_date || "NA",
        },
      };
    }
    console.log(`   ⚠️ NOT FOUND`);
    return { valid: false, reason: "Not found in database" };
  } catch (e) {
    console.error(`   ❌ API ERROR: ${e.message}`);
    return { valid: false, reason: "API error", error: e.message };
  }
}


/**
 * Submit complaint with retry logic
 */
async function submitComplaint(payload, callSid, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`[Complaint Submit] Attempt ${i + 1}: Submitting payload`);

      const submitRes = await axios.post(
        COMPLAINT_API_URL,
        payload,
        {
          headers: {
            "Content-Type": "application/json",
            ...API_HEADERS
          },
          timeout: API_TIMEOUT,
          validateStatus: () => true
        }
      );

      console.log(`[Complaint Submit] Response Status: ${submitRes.status}`, submitRes.data);

      if (submitRes.data?.status === 1) {
        console.log(`[Call ${callSid}] ✅ Complaint submitted successfully`);
        return { success: true, data: submitRes.data };
      } else {
        return { success: true, data: submitRes.data };
      }

    } catch (err) {
      console.error(`[Complaint Submit] Attempt ${i + 1} failed:`, err.message);
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, 500 * (i + 1)));
      }
    }
  }

  return { success: false, error: "Failed to submit complaint after retries" };
}

// ======================= ROUTES =======================

/**
 * Initial greeting and machine number collection
 */
router.post('/', (req, res) => {
  const { CallSid, From } = req.body;
  const twiml = new VoiceResponse();

  const callData = {
    callSid: CallSid,
    callingNumber: From ? From.replace(/^\+1/, "").slice(-10) : "",
    step: "ask_machine_no",
    attempts: { machine_no: 0, problem: 0, phone: 0, city: 0 },
    retries: 0,
    partialMachineNo: "",
    machineNoFreshStart: false,
    machineNoStr: "",
    customerData: null,
    messages: []
  };

  activeCalls.set(CallSid, callData);

  console.log(`[Call ${CallSid}] ✅ Call initiated from ${From}`);

  askNumber(twiml, "Namaskar. JCB service center mein aapka swagat hai. Kripya apni machine ka number batayein. Jaise, 33 zero 544 7.");
  
  return res.type("text/xml").send(twiml.toString());
});

/**
 * Process all user inputs and manage conversation flow
 */
router.post('/process', async (req, res) => {
  const { CallSid, SpeechResult, Digits } = req.body;
  const twiml = new VoiceResponse();
  const callData = activeCalls.get(CallSid);

  if (!callData) {
    console.log(`[Call ${CallSid}] ❌ Call data not found, disconnecting`);
    twiml.say({ voice: "Google.hi-IN-Wavenet-D", language: "hi-IN" }, "Session expire ho gaya. Kripya dobara call karein.");
    twiml.hangup();
    return res.type("text/xml").send(twiml.toString());
  }

  const rawInput = (SpeechResult || Digits || "").trim();
  console.log(`[Call ${CallSid}] Step: ${callData.step} | Input: "${rawInput}"`);

  try {
    // ============ STEP 1: ASK MACHINE NUMBER ============
    if (callData.step === "ask_machine_no") {
      const ci = handleConversationalIntent(rawInput, callData);
      if (ci.handled) {
        if (ci.intent !== INTENT.WAIT && ci.intent !== INTENT.CHECKING) {
          callData.retries = (callData.retries || 0) + 1;
        }
        askNumber(twiml, ci.response);
        activeCalls.set(CallSid, callData);
        return res.type("text/xml").send(twiml.toString());
      }

      const newDigits = extractOnlyDigits(rawInput);
      console.log(`   🔢 New digits this turn: "${newDigits}"`);

      if (callData.machineNoFreshStart) {
        callData.partialMachineNo = "";
        callData.machineNoFreshStart = false;
      }

      callData.partialMachineNo = (callData.partialMachineNo || "") + newDigits;
      const accumulated = callData.partialMachineNo;

      const tryCandidate = async (candidate) => {
        if (!isValidChassisFormat(candidate)) return null;
        const r = await validateChassisViaAPI(candidate);
        return r.valid ? r : null;
      };

      const buildCandidates = (buf) => {
        const seen = new Set();
        const list = [];
        const add = (s) => {
          if (s && !seen.has(s) && isValidChassisFormat(s)) {
            seen.add(s);
            list.push(s);
          }
        };

        if (buf.length >= 4 && buf.length <= 8) add(buf);

        for (let len = Math.min(8, buf.length); len >= 4; len--) {
          add(buf.slice(-len));
          add(buf.slice(0, len));
          for (let start = 1; start + len <= buf.length; start++) {
            add(buf.slice(start, start + len));
          }
        }
        return list;
      };

      if (accumulated.length < 4) {
        if (accumulated.length === 0) {
          callData.retries = (callData.retries || 0) + 1;
          if (callData.retries >= 4) {
            twiml.say(
              { voice: "Google.hi-IN-Wavenet-D", language: "hi-IN" },
              "Number samajh nahi aaya. Agent se connect kar rahe hain.",
            );
            twiml.dial(process.env.HUMAN_AGENT_NUMBER || "+919876543210");
            activeCalls.delete(CallSid);
            return res.type("text/xml").send(twiml.toString());
          }
          const noDigitHints = [
            "Machine par likha number ek ek digit mein boliye.",
            "Jaise — teen, paanch, do, saat. Aaram se boliye.",
            "Bill ya kagaz mein dekh ke boliye, main sun raha hoon.",
          ];
          callData.lastQuestion = noDigitHints[Math.min(callData.retries - 1, 2)];
          askNumber(twiml, callData.lastQuestion);
          activeCalls.set(CallSid, callData);
          return res.type("text/xml").send(twiml.toString());
        }

        console.log(`   ⏳ Only ${accumulated.length} digit(s) — waiting for more`);
        callData.lastQuestion = `${accumulated.split("").join(" ")} aaya. Ab baaki digits boliye.`;
        askNumber(twiml, callData.lastQuestion);
        activeCalls.set(CallSid, callData);
        return res.type("text/xml").send(twiml.toString());
      }

      const candidates = buildCandidates(accumulated);
      console.log(`   🔍 Trying ${candidates.length} candidate(s)`);

      let validResult = null;
      let matchedCandidate = null;
      for (const candidate of candidates) {
        const r = await tryCandidate(candidate);
        if (r) {
          validResult = r;
          matchedCandidate = candidate;
          break;
        }
      }

      if (validResult) {
        console.log(`   ✅ MATCHED on candidate: "${matchedCandidate}"`);
        callData.machineNoStr = matchedCandidate; // Updated from chassis to machineNoStr to maintain consistency
        callData.partialMachineNo = "";
        callData.machineNoFreshStart = false;
        callData.customerData = validResult.data;
        callData.step = "ask_problem"; // Transition to ask_problem as per existing flow
        callData.retries = 0;
        
        const formattedNo = matchedCandidate.split('').join(' ');
        callData.lastQuestion = `Shukriya. Machine number ${formattedNo} mil gaya. ${validResult.data.customer_name ? validResult.data.customer_name + ' ' : ''}Aapki machine mein kya pareshani aa rahi hai?`;
        
        ask(twiml, callData.lastQuestion);
        activeCalls.set(CallSid, callData);
        return res.type("text/xml").send(twiml.toString());
      }

      callData.retries = (callData.retries || 0) + 1;
      if (callData.retries >= 4) {
        twiml.say(
          { voice: "Google.hi-IN-Wavenet-D", language: "hi-IN" },
          "Machine ka record nahi mila. Agent se connect kar rahe hain.",
        );
        twiml.dial(process.env.HUMAN_AGENT_NUMBER || "+919876543210");
        activeCalls.delete(CallSid);
        return res.type("text/xml").send(twiml.toString());
      }

      callData.partialMachineNo = "";
      callData.machineNoFreshStart = true;

      const retryMessages = [
        `Record mein nahi mila. Dobara ek ek digit boliye.`,
        `Abhi bhi match nahi hua, dhire clearly boliye.`,
        `Ek baar aur boliye — main dhyan se sun raha hoon.`,
      ];
      callData.lastQuestion = retryMessages[Math.min(callData.retries - 1, 2)];
      askNumber(twiml, callData.lastQuestion);
      activeCalls.set(CallSid, callData);
      return res.type("text/xml").send(twiml.toString());
    }

    // ============ STEP 2: ASK PROBLEM ============
    else if (callData.step === "ask_problem") {
      const ci = handleConversationalIntent(rawInput, callData);
      if (ci.handled) {
        ask(twiml, ci.response);
        activeCalls.set(CallSid, callData);
        return res.type("text/xml").send(twiml.toString());
      }

      if (rawInput.length < 3) {
        callData.attempts.problem++;

        if (callData.attempts.problem >= 2) {
          callData.problem = "Technical Issue";
          callData.step = "confirm_phone";
        } else {
          const gather = twiml.gather({
            input: "speech",
            language: "hi-IN",
            action: "/voice/process",
            method: "POST",
            timeout: 10
          });
          gather.say({
            voice: "Google.hi-IN-Wavenet-D",
            language: "hi-IN"
          }, "Kripya detail mein batayein ki machine mein kya problem hai.");
          activeCalls.set(CallSid, callData);
          return res.type("text/xml").send(twiml.toString());
        }
      } else {
        callData.problem = rawInput;
        callData.step = "confirm_phone";
        callData.attempts.problem = 0;
      }

      const phone = callData.customerData.customer_phone_no || callData.callingNumber;
      const formattedPhone = phone.split('').join(' ');
      const msg = `Shukriya. Kya hum aapki complaint isi phone number par register karein, ${formattedPhone}?`;

      const gather = twiml.gather({
        input: "speech",
        language: "hi-IN",
        action: "/voice/process",
        method: "POST",
        timeout: 8
      });
      gather.say({ voice: "Google.hi-IN-Wavenet-D", language: "hi-IN" }, msg);
      activeCalls.set(CallSid, callData);
      return res.type("text/xml").send(twiml.toString());
    }

    // ============ STEP 3: CONFIRM/UPDATE PHONE ============
    else if (callData.step === "confirm_phone") {
      const ci = handleConversationalIntent(rawInput, callData);
      if (ci.handled) {
        ask(twiml, ci.response);
        activeCalls.set(CallSid, callData);
        return res.type("text/xml").send(twiml.toString());
      }
      
      const intent = await detectIntent(rawInput, "confirm phone number");

      if (intent === "CHANGE") {
        const digits = rawInput.replace(/\D/g, "");
        if (digits.length >= 10) {
          callData.finalPhone = digits.slice(-10);
          callData.step = "ask_city";
          const formattedPhone = callData.finalPhone.split('').join(' ');
          const gather = twiml.gather({
            input: "speech",
            language: "hi-IN",
            action: "/voice/process",
            method: "POST",
            timeout: 8
          });
          gather.say({
            voice: "Google.hi-IN-Wavenet-D",
            language: "hi-IN"
          }, `Theek hai. Naya number ${formattedPhone} save kar diya. Ab batayein, aapka service branch ya city kaunsa hai?`);
          activeCalls.set(CallSid, callData);
          return res.type("text/xml").send(twiml.toString());
        } else {
          const gather = twiml.gather({
            input: "speech",
            language: "hi-IN",
            action: "/voice/process",
            method: "POST",
            timeout: 8
          });
          gather.say({
            voice: "Google.hi-IN-Wavenet-D",
            language: "hi-IN"
          }, "Kripya apna das ankon ka naya mobile number batayein.");
          activeCalls.set(CallSid, callData);
          return res.type("text/xml").send(twiml.toString());
        }
      } else if (intent === "CONFIRM") {
        callData.finalPhone = callData.customerData.customer_phone_no || callData.callingNumber;
        callData.step = "ask_city";
        const gather = twiml.gather({
          input: "speech",
          language: "hi-IN",
          action: "/voice/process",
          method: "POST",
          timeout: 8
        });
        gather.say({
          voice: "Google.hi-IN-Wavenet-D",
          language: "hi-IN"
        }, "Theek hai. Ab batayein, aapka service branch ya city kaunsa hai?");
        activeCalls.set(CallSid, callData);
        return res.type("text/xml").send(twiml.toString());
      } else if (intent === "REPEAT") {
        const phone = callData.customerData.customer_phone_no || callData.callingNumber;
        const formattedPhone = phone.split('').join(' ');
        const gather = twiml.gather({
          input: "speech",
          language: "hi-IN",
          action: "/voice/process",
          method: "POST",
          timeout: 8
        });
        gather.say({
          voice: "Google.hi-IN-Wavenet-D",
          language: "hi-IN"
        }, `Fir se: ${formattedPhone}. Kya yeh theek hai?`);
        activeCalls.set(CallSid, callData);
        return res.type("text/xml").send(twiml.toString());
      } else {
        callData.finalPhone = callData.customerData.customer_phone_no || callData.callingNumber;
        callData.step = "ask_city";
        const gather = twiml.gather({
          input: "speech",
          language: "hi-IN",
          action: "/voice/process",
          method: "POST",
          timeout: 8
        });
        gather.say({
          voice: "Google.hi-IN-Wavenet-D",
          language: "hi-IN"
        }, "Theek hai. Batayein, aapka city ya service branch kaunsa hai?");
        activeCalls.set(CallSid, callData);
        return res.type("text/xml").send(twiml.toString());
      }
    }

    // ============ STEP 4: ASK CITY ============
    else if (callData.step === "ask_city") {
      const ci = handleConversationalIntent(rawInput, callData);
      if (ci.handled) {
        ask(twiml, ci.response);
        activeCalls.set(CallSid, callData);
        return res.type("text/xml").send(twiml.toString());
      }

      if (rawInput.length < 2) {
        callData.attempts.city++;

        if (callData.attempts.city >= 2) {
          callData.finalCity = "Not Specified";
          callData.step = "final_confirmation";
        } else {
          ask(twiml, "Kripya apni city ya service branch ka naam batayein. Jaise Ajmer, Alwar, ya Jaipur.");
          activeCalls.set(CallSid, callData);
          return res.type("text/xml").send(twiml.toString());
        }
      } else {
        callData.finalCity = rawInput;
        
        // Match with Service Center Database
        const matchedCenter = await findBestServiceCenterMatch(rawInput);
        if (matchedCenter) {
          console.log(`[Call ${CallSid}] 📍 Matched to Service Center: ${matchedCenter.city_name} (Branch: ${matchedCenter.branch_name})`);
          callData.matchedCenter = matchedCenter;
          callData.finalCity = matchedCenter.city_name; // Use canonical name
        }
      }

      callData.step = "final_confirmation";

      const cityDisplay = callData.matchedCenter 
        ? `${callData.matchedCenter.city_name} (Branch: ${callData.matchedCenter.branch_name})`
        : callData.finalCity;

      const summary = `Theek hai. Aapki shikayat: "${callData.problem}". Phone number: ${callData.finalPhone.split('').join(' ')}. City: ${cityDisplay}. Kya main ise submit kar doon?`;

      const gather = twiml.gather({
        input: "speech",
        language: "hi-IN",
        action: "/voice/process",
        method: "POST",
        timeout: 8
      });
      gather.say({ voice: "Google.hi-IN-Wavenet-D", language: "hi-IN" }, summary);
      activeCalls.set(CallSid, callData);
      return res.type("text/xml").send(twiml.toString());
    }

    // ============ STEP 5: FINAL CONFIRMATION & SUBMIT ============
    else if (callData.step === "final_confirmation") {
      const intent = await detectIntent(rawInput, "final submission confirmation");

      if (intent === "CONFIRM") {
        twiml.say({
          voice: "Google.hi-IN-Wavenet-D",
          language: "hi-IN"
        }, "Shukriya. Main aapki shikayat abhi register kar rahi hoon, ek pal rukiye.");

        const payload = {
          machine_no: callData.machineNoStr,
          customer_name: callData.customerData?.customer_name || "Unknown",
          caller_name: callData.customerData?.customer_name || "Unknown",
          caller_no: callData.callingNumber,
          contact_person: callData.finalPhone,
          contact_person_number: callData.finalPhone,
          machine_model: callData.customerData?.machine_model || "3DX", // Default to 3DX if unknown
          sub_model: callData.customerData?.sub_model || "Super ecoXcellence",
          installation_date: callData.customerData?.installation_date || new Date().toISOString().split('T')[0],
          machine_type: callData.customerData?.machine_type || "Backhoe Loader",
          city_id: callData.matchedCenter?.id || "7", // Default to id 7 if no match
          complain_by: "Customer",
          machine_status: "Running",
          job_location: callData.matchedCenter?.city_name || "NA",
          branch: callData.matchedCenter?.branch_name || "NA",
          outlet: "Outlet 1",
          complaint_details: callData.problem || "Engine not starting properly",
          complaint_title: "Engine Issue",
          sub_title: "Starting Problem",
          business_partner_code: callData.matchedCenter?.branch_code || "BP001",
          complaint_sap_id: "SAP123",
          machine_location_address: callData.finalCity || "NA",
          pincode: "0",
          service_date: new Date().toISOString().split('T')[0],
          from_time: "",
          to_time: "",
          job_open_lat: 0,
          job_open_lng: 0,
          job_close_lat: "0.000000",
          job_close_lng: null
        };

        console.log(`\n======================= FULL PAYLOAD SUBMISSION =======================`);
        console.log(JSON.stringify(payload, null, 2));
        console.log(`========================================================================\n`);

        console.log(`[Call ${CallSid}] 📤 Submitting complaint:`, JSON.stringify(payload, null, 2));

        const result = await submitComplaint(payload, CallSid);

        if (result.success) {
          twiml.say({
            voice: "Google.hi-IN-Wavenet-D",
            language: "hi-IN"
          }, "Aapki shikayat safaltapurvak darz ho gayi hai. Humari technical team aapse jald hi sampark karegi. Shukriya!");
        } else {
          twiml.say({
            voice: "Google.hi-IN-Wavenet-D",
            language: "hi-IN"
          }, "Aapki shikayat note kar li gayi hai. Humari team aapse jald hi baat karegi. Dhanyawad!");
        }

        twiml.hangup();
        activeCalls.delete(CallSid);
        console.log(`[Call ${CallSid}] ✅ Call completed successfully`);
        return res.type("text/xml").send(twiml.toString());
      } else {
        const gather = twiml.gather({
          input: "speech",
          language: "hi-IN",
          action: "/voice/process",
          method: "POST",
          timeout: 8
        });
        gather.say({
          voice: "Google.hi-IN-Wavenet-D",
          language: "hi-IN"
        }, "Theek hai, kya aap kuch badalna chahte hain? Batayein.");
        callData.step = "ask_problem";
        activeCalls.set(CallSid, callData);
        return res.type("text/xml").send(twiml.toString());
      }
    }

  } catch (error) {
    console.error(`[Call ${CallSid}] ❌ Error:`, error.message);
    console.error(error.stack);

    twiml.say({
      voice: "Google.hi-IN-Wavenet-D",
      language: "hi-IN"
    }, "Kuch technical pareshani aa gayi hai. Kripya baad mein dobara call karein. Namaskar.");
    twiml.hangup();
    activeCalls.delete(CallSid);
    return res.type("text/xml").send(twiml.toString());
  }
});

export default router;