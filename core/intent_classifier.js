// intent_classifier.js
// Fast (< 10ms) intent classification WITHOUT calling LLM
// Uses weighted pattern matching with context awareness

export class IntentClassifier {
  
  static classify(text, engine) {
    const lo = text.toLowerCase().trim();
    const wordCount = lo.split(/\s+/).length;
    
    // Multi-intent detection — one utterance can have multiple intents
    const intents = [];
    
    // ── SYSTEM INTENTS ────────────────────────────────────────
    if (this.matchesRepeat(lo)) intents.push({ type: 'REPEAT', confidence: 0.95 });
    if (this.matchesWait(lo)) intents.push({ type: 'WAIT', confidence: 0.90 });
    if (this.matchesIdentity(lo)) intents.push({ type: 'IDENTITY_QUESTION', confidence: 0.85 });
    if (this.matchesExistingComplaint(lo)) intents.push({ type: 'EXISTING_COMPLAINT', confidence: 0.80 });
    if (this.matchesEscalation(lo)) intents.push({ type: 'ESCALATION', confidence: 0.85 });
    if (this.matchesNegation(lo)) intents.push({ type: 'NEGATION', confidence: 0.90 });
    if (this.matchesAffirmation(lo)) intents.push({ type: 'AFFIRMATION', confidence: 0.90 });
    
    // ── DATA INTENTS ──────────────────────────────────────────
    if (this.matchesProblemDescription(lo)) intents.push({ type: 'PROBLEM_DESCRIPTION', confidence: 0.85 });
    if (this.matchesLocationInfo(lo)) intents.push({ type: 'LOCATION_INFO', confidence: 0.80 });
    if (this.matchesPhoneNumber(lo)) intents.push({ type: 'PHONE_NUMBER', confidence: 0.95 });
    if (this.matchesMachineNumber(lo)) intents.push({ type: 'MACHINE_NUMBER', confidence: 0.90 });
    
    // ── CONTEXT-AWARE RESOLUTION ──────────────────────────────
    // If only one intent, return it
    if (intents.length === 0) return { type: 'UNKNOWN', confidence: 0.5, all: [] };
    if (intents.length === 1) return { ...intents[0], all: intents };
    
    // Prioritize system intents over data intents
    const systemIntents = ['REPEAT', 'WAIT', 'IDENTITY_QUESTION', 'ESCALATION'];
    const primary = intents.find(i => systemIntents.includes(i.type)) || intents[0];
    
    return { ...primary, all: intents };
  }
  
  // ─── MATCHERS ─────────────────────────────────────────────
  
  static matchesRepeat(lo) {
    return /(dobara|phir se|kya kaha|suna nahi|samjha nahi|repeat|again|baar aur|nahi suna)/i.test(lo);
  }
  
  static matchesWait(lo) {
    return /(ruko|ek minute|ek second|thoda|hold|dekh raha|dhundh raha|\d+\s*(minute|min|sec))/i.test(lo);
  }
  
  static matchesIdentity(lo) {
    return /(aap kaun|tum kaun|tumhara naam|kya karti|kis liye|kyu bataun|who are you)/i.test(lo);
  }
  
  static matchesExistingComplaint(lo) {
    return /(pehle complaint|already|engineer nahi aaya|dobara complaint|phir se complaint|complaint kar di thi|2 din|3 din|kab aayega|bahut der)/i.test(lo);
  }
  
  static matchesEscalation(lo) {
    return /(manager|senior|insaan|real person|human|aadmi se baat|agent se baat|emergency|bahut urgent)/i.test(lo);
  }
  
  static matchesNegation(lo) {
    return /^(nahi|nai|nahin|no|nhi|mat|galat|wrong|nahi chahiye)\b/.test(lo)
      || /\b(nahi|nai|nahin|no)\s*$/.test(lo);
  }
  
  static matchesAffirmation(lo) {
    return /^(haan|han|ha|yes|theek|bilkul|sahi|ok|okay)\b/.test(lo)
      || /\b(haan|theek hai|bilkul|save kar do|kar do|register kar do)\s*$/.test(lo);
  }
  
  static matchesProblemDescription(lo) {
    return /(start nahi|band|kharab|problem|dikkat|nikal|garam|dhak|hydraulic|gear|brake|oil|filter|service|awaaz|khatak)/i.test(lo);
  }
  
  static matchesLocationInfo(lo) {
    return /(jaipur|kota|ajmer|udaipur|alwar|sikar|bhilwara|bikaner|jodhpur|mein hai|mein hain|shahar)/i.test(lo);
  }
  
  static matchesPhoneNumber(lo) {
    return /[6-9]\d{9}/.test(lo.replace(/\s/g, ''));
  }
  
  static matchesMachineNumber(lo) {
    const digits = lo.replace(/\D/g, '');
    return digits.length >= 3 && digits.length <= 7 && !/[6-9]\d{9}/.test(lo.replace(/\s/g, ''));
  }
}
