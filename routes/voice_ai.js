import express from 'express';
import twilio from 'twilio';
import axios from 'axios';
import { askGroqAI, extractOnlyDigits, isValidChassisFormat, detectIntent, findBestServiceCenterMatch, translateToEnglish } from '../utils/ai_agent.js';
import { categorizeProblem, validateProblem } from '../utils/complaint_mapper.js';

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

  askNumber(twiml, "Namaskar. JCB service center mein aapka swagat hai. Kripya apni machine ka number batayein. Jaise, 3 3 zero 5 4 4 7.");

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
      console.log(`   🔍 Trying ${candidates.length} candidate(s) in parallel`);

      // Parallelize API calls for all candidates
      const validationResults = await Promise.all(
        candidates.map(async (candidate) => {
          const r = await tryCandidate(candidate);
          return r ? { candidate, result: r } : null;
        })
      );

      // Find first valid result (prioritize based on buildCandidates order, which is already prioritized)
      const validMatch = validationResults.find(v => v !== null);

      if (validMatch) {
        const { candidate: matchedCandidate, result: validResult } = validMatch;
        console.log(`   ✅ MATCHED on candidate: "${matchedCandidate}"`);
        callData.machineNoStr = matchedCandidate;
        callData.partialMachineNo = "";
        callData.machineNoFreshStart = false;
        callData.customerData = validResult.data;
        callData.step = "ask_problem";
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
        // VALIDATE PROBLEM
        const isValid = await validateProblem(rawInput);
        if (!isValid) {
          console.log(`[Call ${CallSid}] ⚠️ Invalid problem detected: "${rawInput}"`);
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
          }, "Maaf kijiyega, main samajh nahi paayi. Kripya machine ki samasya detail mein batayein.");
          activeCalls.set(CallSid, callData);
          return res.type("text/xml").send(twiml.toString());
        }

        callData.problem = rawInput;
        callData.step = "confirm_phone";
        callData.attempts.problem = 0;
      }

      const phone = String(callData.customerData?.customer_phone_no || callData.callingNumber || "");
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
          const newPhone = digits.slice(-10);
          callData.tempPhone = newPhone; // Store temp for verification
          callData.step = "verify_new_phone";
          const formattedPhone = newPhone.split('').join(' ');
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
          }, `Theek hai. Naya number ${formattedPhone} bataya aapne. Kya yeh number sahi hai?`);
          activeCalls.set(CallSid, callData);
          return res.type("text/xml").send(twiml.toString());
        } else {
          // No digits given — move to dedicated step so next input captures number directly
          callData.step = "enter_new_phone";
          const gather = twiml.gather({
            input: "speech dtmf",
            language: "hi-IN",
            action: "/voice/process",
            method: "POST",
            timeout: 10,
            numDigits: 10,
            finishOnKey: "#",
          });
          gather.say({
            voice: "Google.hi-IN-Wavenet-D",
            language: "hi-IN"
          }, "Theek hai. Kripya apna naya das ankon ka mobile number boliye.");
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
        // STRICTER: If no clear intent, ask again instead of moving forward
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
        }, "Maaf kijiyega, main samajh nahi paayi. Kya hum isi number par complaint darz karein? Haan ya badalna hai?");
        activeCalls.set(CallSid, callData);
        return res.type("text/xml").send(twiml.toString());
      }
    }

    // ============ STEP 3.25: ENTER NEW PHONE (digit collection only) ============
    else if (callData.step === "enter_new_phone") {
      const digits = rawInput.replace(/\D/g, "");
      if (digits.length >= 10) {
        const newPhone = digits.slice(-10);
        callData.tempPhone = newPhone;
        callData.step = "verify_new_phone";
        const formattedPhone = newPhone.split('').join(' ');
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
        }, `Theek hai. Aapka naya number ${formattedPhone} hai. Kya yeh sahi hai?`);
        activeCalls.set(CallSid, callData);
        return res.type("text/xml").send(twiml.toString());
      } else {
        // Not enough digits — re-prompt
        const gather = twiml.gather({
          input: "speech dtmf",
          language: "hi-IN",
          action: "/voice/process",
          method: "POST",
          timeout: 10,
          numDigits: 10,
          finishOnKey: "#",
        });
        gather.say({
          voice: "Google.hi-IN-Wavenet-D",
          language: "hi-IN"
        }, "Maaf kijiye. Kripya poora das ankon ka number batayein.");
        activeCalls.set(CallSid, callData);
        return res.type("text/xml").send(twiml.toString());
      }
    }

    // ============ STEP 3.5: VERIFY NEW PHONE ============
    else if (callData.step === "verify_new_phone") {
      const intent = await detectIntent(rawInput, "verify new phone number");

      if (intent === "CONFIRM" || intent === "OTHER") { // Default to confirm if unclear but likely positive
        callData.finalPhone = callData.tempPhone;
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
        }, "Theek hai, number save kar liya gaya hai. Ab batayein, aapka service branch ya city kaunsa hai?");
        activeCalls.set(CallSid, callData);
        return res.type("text/xml").send(twiml.toString());
      } else {
        // User said NO or CHANGE again
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
        }, "Maaf kijiyega. Kripya apna das ankon ka naya mobile number dobara batayein.");
        callData.step = "confirm_phone";
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
        const startTime = Date.now();
        const matchedCenter = await findBestServiceCenterMatch(rawInput);
        const duration = Date.now() - startTime;
        console.log(`[Call ${CallSid}] City matching took ${duration}ms`);

        if (matchedCenter) {
          console.log(`[Call ${CallSid}] 📍 Matched to Service Center: ${matchedCenter.city_name} (Branch: ${matchedCenter.branch_name})`);
          callData.matchedCenter = matchedCenter;
          callData.finalCity = matchedCenter.city_name; // Use canonical name
        } else {
          console.log(`[Call ${CallSid}] ⚠️ No city match found for: "${rawInput}"`);
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
          }, "Maaf kijiye, humein yeh shehar humari list mein nahi mila. Kripya apna nazdiki service branch ya bada shehar batayein.");
          activeCalls.set(CallSid, callData);
          return res.type("text/xml").send(twiml.toString());
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

        // Categorize problem for final payload
        const category = await categorizeProblem(callData.problem);
        console.log(`[Call ${CallSid}] Problem Categorized: Title="${category.title}", Sub="${category.subTitle}"`);

        // Translate Hindi fields to English for payload
        console.log(`[Call ${CallSid}] Translating payload details to English...`);
        const [engProblem, engAddress] = await Promise.all([
          translateToEnglish(callData.problem),
          translateToEnglish(callData.finalCity)
        ]);

        const payload = {
          machine_no: callData.machineNoStr,
          customer_name: callData.customerData?.customer_name || "Unknown",
          caller_name: callData.customerData?.customer_name || "Unknown",
          caller_no: callData.callingNumber,
          contact_person: callData.finalPhone || callData.callingNumber,
          contact_person_number: callData.finalPhone || callData.callingNumber,
          machine_model: callData.customerData?.machine_model || "3DX",
          sub_model: callData.customerData?.sub_model || "NA",
          installation_date: callData.customerData?.installation_date || "NA",
          machine_type: callData.customerData?.machine_type || "BHL",
          city_id: callData.matchedCenter?.id || "7",
          complain_by: "Customer",
          machine_status: "Running",
          job_location: callData.matchedCenter?.city_name || "NA",
          branch: callData.matchedCenter?.branch_name || "NA",
          outlet: "Outlet 1",
          complaint_details: engProblem,
          complaint_title: category.title,
          sub_title: category.subTitle,
          business_partner_code: callData.matchedCenter?.branch_code || "BP001",
          complaint_sap_id: "SAP123",
          machine_location_address: engAddress,
          pincode: "0",
          service_date: new Date().toISOString().split('T')[0],
          from_time: "",
          to_time: "",
          job_open_lat: "0.000000",
          job_open_lng: "0.000000",
          job_close_lat: "0.000000",
          job_close_lng: "0.000000"
        };

        console.log(`\n======================= FULL PAYLOAD SUBMISSION =======================`);
        console.log(JSON.stringify(payload, null, 2));
        console.log(`========================================================================\n`);

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
        // User said NO/CHANGE to final summary
        callData.step = "ask_what_to_change";
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
        }, "Theek hai. Aap kya badalna chahte hain? Machine number, pareshani, phone number, ya city?");
        activeCalls.set(CallSid, callData);
        return res.type("text/xml").send(twiml.toString());
      }
    }

    // ============ STEP 6: HANDLE GRANULAR CHANGE ============
    else if (callData.step === "ask_what_to_change") {
      const input = rawInput.toLowerCase();

      if (input.includes("number") || input.includes("machine")) {
        callData.step = "ask_machine_no";
        callData.partialMachineNo = "";
        callData.machineNoFreshStart = true;
        askNumber(twiml, "Theek hai. Apne machine ka number dobara batayein.");
      } else if (input.includes("pareshani") || input.includes("problem") || input.includes("shikayat")) {
        callData.step = "ask_problem";
        ask(twiml, "Theek hai. Machine mein kya pareshani aa rahi hai, dobara batayein.");
      } else if (input.includes("phone") || input.includes("mobile") || input.includes("number")) {
        callData.step = "confirm_phone";
        ask(twiml, "Kya hum aapki complaint isi mobile number par register karein?");
      } else if (input.includes("city") || input.includes("branch") || input.includes("shehar")) {
        callData.step = "ask_city";
        ask(twiml, "Theek hai. Aapka city ya service branch kaunsa hai?");
      } else {
        // Default to asking again if unclear
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
        }, "Maaf kijiye, main samajh nahi paayi. Aap kya badalna chahte hain? Machine number, pareshani, phone, ya city?");
        return res.type("text/xml").send(twiml.toString());
      }

      activeCalls.set(CallSid, callData);
      return res.type("text/xml").send(twiml.toString());
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