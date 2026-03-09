import express from 'express';
import twilio from 'twilio';
import axios from 'axios';
import { askGroqAI, extractOnlyDigits, extractMachineNumber, isValidChassisFormat, detectIntent, findBestServiceCenterMatch, translateToEnglish } from '../utils/ai_agent.js';
import { categorizeProblem, validateProblem } from '../utils/complaint_mapper.js';
import {
  handleConversationalIntent,
  handleSilenceOrEmpty,
  getSmartPrompt,
  INTENT,
} from "../utils/conversational_intelligence.js";

const router = express.Router();
const VoiceResponse = twilio.twiml.VoiceResponse;

const activeCalls = new Map();

/* ======================= EXTERNAL API CONFIG ======================= */
const EXTERNAL_API_BASE = "http://gprs.rajeshmotors.com/jcbServiceEnginerAPIv7";
const COMPLAINT_API_URL = "http://gprs.rajeshmotors.com/jcbServiceEnginerAPIv7/ai_call_complaint.php";
const API_TIMEOUT = 20000;
const API_HEADERS = { JCBSERVICEAPI: "MakeInJcb" };

// INTENT is now imported from conversational_intelligence.js

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

// Basic conversational intent handler removed. Using the advanced one from utils.

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

  // Silence / empty input — repeat last question using smart rotate
  if (!rawInput) {
    callData.retries = (callData.retries || 0) + 1;
    const silenceMsg = handleSilenceOrEmpty(callData);
    if (callData.step === "ask_machine_no") {
      askNumber(twiml, silenceMsg);
    } else {
      ask(twiml, silenceMsg);
    }
    activeCalls.set(CallSid, callData);
    return res.type("text/xml").send(twiml.toString());
  }

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

      // BUG FIX: Always clear buffer on fresh start BEFORE appending new digits
      if (callData.machineNoFreshStart) {
        callData.partialMachineNo = "";
        callData.machineNoFreshStart = false;
        console.log(`   🔄 Fresh start: buffer cleared`);
      }

      // Step 1: Fast extraction via digit-word map
      let newDigits = extractOnlyDigits(rawInput);
      console.log(`   🔢 Fast-extract digits: "${newDigits}"`);

      // Step 2: AI fallback when fast-extract gives 0 digits but sentence has some content
      // This handles complex sentences like "मेरे machine का नंबर है ..." with embedded digits
      if (newDigits.length === 0 && rawInput.trim().length > 2) {
        console.log(`   🤖 No digits found — trying AI extraction...`);
        try {
          const aiExtracted = await extractMachineNumber(rawInput);
          if (aiExtracted && aiExtracted !== "NONE" && /^\d+$/.test(aiExtracted)) {
            newDigits = aiExtracted;
            console.log(`   🤖 AI extracted: "${newDigits}"`);
          } else {
            console.log(`   🤖 AI also found no number: "${aiExtracted}"`);
          }
        } catch (e) {
          console.log(`   🤖 AI extraction failed: ${e.message}`);
        }
      }

      console.log(`   🔢 New digits this turn: "${newDigits}"`);

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
          // No digits at all — don't increment failure counter, just patiently re-ask
          // Only count as a retry if user has been told multiple times already
          callData.noDigitCount = (callData.noDigitCount || 0) + 1;
          console.log(`   ⚠️ No digits extracted (noDigitCount=${callData.noDigitCount})`);

          if (callData.noDigitCount >= 3) {
            // After 3 consecutive no-digit turns, try transferring
            callData.retries = (callData.retries || 0) + 1;
          }

          if (callData.retries >= 4) {
            twiml.say(
              { voice: "Google.hi-IN-Wavenet-D", language: "hi-IN" },
              "Machine ka number samajh nahi aaya. Ek agent se connect kar rahe hain.",
            );
            twiml.dial(process.env.HUMAN_AGENT_NUMBER || "+919876543210");
            activeCalls.delete(CallSid);
            return res.type("text/xml").send(twiml.toString());
          }

          // Give a very clear and patient prompt
          const noDigitPrompts = [
            "Kripya sirf machine ka number boliye. Plate par likha hota hai — jaise 3 3 0 5 4 4 7.",
            "Number nahi suna. Ek ek digit clearly boliye — jaise: teen, teen, shunya, paanch, chaar, chaar, saat.",
            "Machine par ek steel plate hoti hai. Woh number dekh ke sirf digits boliye.",
          ];
          callData.lastQuestion = noDigitPrompts[Math.min(callData.noDigitCount - 1, 2)];
          askNumber(twiml, callData.lastQuestion);
          activeCalls.set(CallSid, callData);
          return res.type("text/xml").send(twiml.toString());
        }

        // Got some digits but not enough yet
        callData.noDigitCount = 0; // reset since we got some digits
        console.log(`   ⏳ Only ${accumulated.length} digit(s) — waiting for more`);
        callData.lastQuestion = `${accumulated.split("").join(" ")} aaya. Ab baaki digits boliye.`;
        askNumber(twiml, callData.lastQuestion);
        activeCalls.set(CallSid, callData);
        return res.type("text/xml").send(twiml.toString());
      }

      callData.noDigitCount = 0; // reset when we have enough digits

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
        callData.noDigitCount = 0;

        const formattedNo = matchedCandidate.split('').join(' ');
        callData.lastQuestion = `Shukriya. Machine number ${formattedNo} mil gaya. ${validResult.data.customer_name ? validResult.data.customer_name + ' — ' : ''}Machine mein kya pareshani aa rahi hai?`;

        ask(twiml, callData.lastQuestion);
        activeCalls.set(CallSid, callData);
        return res.type("text/xml").send(twiml.toString());
      }

      callData.retries = (callData.retries || 0) + 1;
      if (callData.retries >= 4) {
        twiml.say(
          { voice: "Google.hi-IN-Wavenet-D", language: "hi-IN" },
          "Machine ka record nahi mila. Ek agent se connect kar rahe hain.",
        );
        twiml.dial(process.env.HUMAN_AGENT_NUMBER || "+919876543210");
        activeCalls.delete(CallSid);
        return res.type("text/xml").send(twiml.toString());
      }

      // Clear buffer for fresh entry on next turn
      callData.partialMachineNo = "";
      callData.machineNoFreshStart = false; // Already cleared, don't double-clear next turn

      callData.lastQuestion = getSmartPrompt("ask_machine_no", callData.retries);
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
          }, getSmartPrompt("ask_complaint", callData.attempts.problem));
          activeCalls.set(CallSid, callData);
          return res.type("text/xml").send(twiml.toString());
        }
      } else {
        // VALIDATE PROBLEM — with attempt limits
        const isValid = await validateProblem(rawInput);
        if (!isValid) {
          callData.attempts.problem = (callData.attempts.problem || 0) + 1;
          console.log(`[Call ${CallSid}] ⚠️ Invalid problem detected (attempt ${callData.attempts.problem}): "${rawInput}"`);

          if (callData.attempts.problem >= 3) {
            // After 3 failed attempts, accept whatever they said
            console.log(`[Call ${CallSid}] 📢 Max problem attempts reached, accepting as-is`);
            callData.problem = rawInput;
            callData.step = "confirm_phone";
            callData.attempts.problem = 0;
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
            }, "Maaf kijiyega. Kripya sirf machine ki samasya batayein, jaise engine chalu nahi ho raha, ya AC kharab hai.");
            activeCalls.set(CallSid, callData);
            return res.type("text/xml").send(twiml.toString());
          }
        } else {
          callData.problem = rawInput;
          callData.step = "confirm_phone";
          callData.attempts.problem = 0;
        }
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
      // CI handling for wait/repeat/confused in phone entry
      const ci = handleConversationalIntent(rawInput, callData);
      if (ci.handled) {
        askNumber(twiml, ci.response);
        activeCalls.set(CallSid, callData);
        return res.type("text/xml").send(twiml.toString());
      }

      // Use extractOnlyDigits to handle Hindi/Hinglish spoken digits too
      const digits = extractOnlyDigits(rawInput);
      console.log(`   📱 Phone digits extracted: "${digits}"`);
      if (digits.length >= 10) {
        const newPhone = digits.slice(-10);
        // Validate Indian mobile: must start with 6,7,8,9
        if (!["6","7","8","9"].includes(newPhone[0])) {
          askNumber(twiml, `Yeh number valid nahi — ${newPhone[0]} se start ho raha hai. 6, 7, 8 ya 9 se shuru hona chahiye. Dobara boliye.`);
          activeCalls.set(CallSid, callData);
          return res.type("text/xml").send(twiml.toString());
        }
        callData.tempPhone = newPhone;
        callData.step = "verify_new_phone";
        const formattedPhone = `${newPhone.slice(0,5)} ${newPhone.slice(5)}`;
        callData.lastQuestion = `Naya number ${formattedPhone} hai. Sahi hai?`;
        ask(twiml, callData.lastQuestion);
        activeCalls.set(CallSid, callData);
        return res.type("text/xml").send(twiml.toString());
      } else {
        // Not enough digits — re-prompt
        askNumber(twiml, digits.length > 0
          ? `Sirf ${digits.length} digit sune. Pura 10 digit wala number ek ek karke boliye.`
          : "Kripya naya 10 ankon ka number boliye. Jaise: 9 8 7 6 5 4 3 2 1 0."
        );
        activeCalls.set(CallSid, callData);
        return res.type("text/xml").send(twiml.toString());
      }
    }

    // ============ STEP 3.5: VERIFY NEW PHONE ============
    else if (callData.step === "verify_new_phone") {
      // CI handling
      const ci = handleConversationalIntent(rawInput, callData);
      if (ci.handled) {
        ask(twiml, ci.response);
        activeCalls.set(CallSid, callData);
        return res.type("text/xml").send(twiml.toString());
      }

      const intent = await detectIntent(rawInput, "verify new phone number confirmation");

      if (intent === "CONFIRM" || intent === "OTHER") {
        callData.finalPhone = callData.tempPhone;
        callData.step = "ask_city";
        callData.lastQuestion = "Theek hai, number save ho gaya. Ab batayein, aapki machine abhi kaunse shehar mein hai?";
        ask(twiml, callData.lastQuestion);
        activeCalls.set(CallSid, callData);
        return res.type("text/xml").send(twiml.toString());
      } else {
        // User said NO — go back to enter new phone
        callData.step = "enter_new_phone";
        callData.lastQuestion = "Kripya apna sahi 10 ankon ka naya mobile number boliye.";
        askNumber(twiml, callData.lastQuestion);
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
          callData.finalCity = matchedCenter.city_name;
        } else {
          callData.attempts.city = (callData.attempts.city || 0) + 1;
          console.log(`[Call ${CallSid}] ⚠️ No city match found (attempt ${callData.attempts.city}) for: "${rawInput}"`);

          if (callData.attempts.city >= 2) {
            // After 2 fails, use customer's registered city or raw input
            const fallbackCity = callData.customerData?.city || rawInput;
            console.log(`[Call ${CallSid}] 📢 Max city attempts reached, using fallback: "${fallbackCity}"`);
            callData.finalCity = fallbackCity;
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
            }, "Maaf kijiye, humein yeh shehar nahi mila. Kripya apna nazdiki bada shehar batayein, jaise Jaipur, Udaipur, Ajmer, ya Kota.");
            activeCalls.set(CallSid, callData);
            return res.type("text/xml").send(twiml.toString());
          }
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
          job_open_lat: 0,
          job_open_lng: 0,
          job_close_lat: 0,
          job_close_lng: 0
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

      // Detect what the user wants to change (Hindi + Hinglish + English)
      const wantsMachineChange = [
        "machine", "नंबर", "number", "chassis", "मशीन", "registration", "machine number",
        "machine no", "no badalna", "number badalna", "machine ka number",
      ].some(k => input.includes(k)) && ![
        "phone", "mobile", "contact", "फोन", "मोबाइल",
      ].some(k => input.includes(k)); // Exclude phone keywords

      const wantsProblemChange = [
        "pareshani", "problem", "shikayat", "complaint", "dikkat", "taklif",
        "समस्या", "परेशानी", "शिकायत", "दिक्कत", "problem badalna",
      ].some(k => input.includes(k));

      const wantsPhoneChange = [
        "phone", "mobile", "contact", "नंबर", "number", "फोन", "मोबाइल",
        "phone number", "mobile number", "contact number", "purana number",
        "phone badalna", "number change", "puraana", "purana", "naya number",
        "phone wala", "number wala",
      ].some(k => input.includes(k)) && !wantsMachineChange;

      const wantsCityChange = [
        "city", "branch", "shehar", "shahar", "location", "jagah",
        "शहर", "सिटी", "ब्रांच", "जगह",
      ].some(k => input.includes(k));

      if (wantsMachineChange) {
        callData.step = "ask_machine_no";
        callData.partialMachineNo = "";
        callData.machineNoFreshStart = false;
        callData.retries = 0;
        callData.lastQuestion = "Theek hai. Apni machine ka number dobara ek ek digit mein boliye.";
        askNumber(twiml, callData.lastQuestion);
      } else if (wantsProblemChange) {
        callData.step = "ask_problem";
        callData.attempts.problem = 0;
        callData.lastQuestion = "Theek hai. Machine mein kya pareshani aa rahi hai, dobara batayein.";
        ask(twiml, callData.lastQuestion);
      } else if (wantsPhoneChange) {
        callData.step = "enter_new_phone";
        callData.lastQuestion = "Theek hai. Apna naya 10 ankon ka mobile number boliye.";
        askNumber(twiml, callData.lastQuestion);
      } else if (wantsCityChange) {
        callData.step = "ask_city";
        callData.attempts.city = 0;
        callData.lastQuestion = "Theek hai. Aapki machine abhi kaunse shehar mein hai?";
        ask(twiml, callData.lastQuestion);
      } else {
        // Use AI to detect intent for ambiguous cases
        const aiIntent = await detectIntent(rawInput,
          "User is responding to: 'Aap kya badalna chahte hain? Machine number, pareshani, phone number, ya city?' — detect which one."
        );
        console.log(`[Call ${CallSid}] ask_what_to_change AI fallback: "${aiIntent}"`);

        // Map AI response to action
        const lower = (aiIntent || "").toLowerCase();
        if (lower.includes("machine") || lower.includes("number") || lower.includes("chassis")) {
          callData.step = "ask_machine_no";
          callData.partialMachineNo = "";
          callData.machineNoFreshStart = false;
          callData.retries = 0;
          callData.lastQuestion = "Apni machine ka number dobara ek ek digit mein boliye.";
          askNumber(twiml, callData.lastQuestion);
        } else if (lower.includes("phone") || lower.includes("mobile") || lower.includes("contact")) {
          callData.step = "enter_new_phone";
          callData.lastQuestion = "Apna naya 10 digit mobile number boliye.";
          askNumber(twiml, callData.lastQuestion);
        } else if (lower.includes("problem") || lower.includes("complaint") || lower.includes("shikayat")) {
          callData.step = "ask_problem";
          callData.attempts.problem = 0;
          callData.lastQuestion = "Machine mein kya pareshani hai, dobara batayein.";
          ask(twiml, callData.lastQuestion);
        } else if (lower.includes("city") || lower.includes("branch") || lower.includes("location")) {
          callData.step = "ask_city";
          callData.attempts.city = 0;
          callData.lastQuestion = "Aapki machine kaunse shehar mein hai?";
          ask(twiml, callData.lastQuestion);
        } else {
          // Still unclear — ask again
          callData.lastQuestion = "Maaf kijiye, samajh nahi aaya. Kya badalna chahte hain? Phone number, machine number, pareshani, ya shehar?";
          ask(twiml, callData.lastQuestion);
        }
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