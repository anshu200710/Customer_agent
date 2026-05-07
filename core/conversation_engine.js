// conversation_engine.js
// The central brain. Replaces activeCalls Map + all state flags.

export class ConversationEngine {
  constructor(callSid, callerPhone) {
    this.callSid = callSid;
    this.callerPhone = callerPhone;
    this.startedAt = Date.now();
    
    // Slot map — the only state that matters
    this.slots = {
      machine_no:        { value: null, confidence: 0, validated: false, attempts: 0 },
      complaint_title:   { value: null, confidence: 0, sources: [] },
      complaint_details: { value: null, all_problems: [] },
      machine_status:    { value: null, confidence: 0 },
      city:              { value: null, city_id: null, branch: null, confirmed: false, lat: null, lng: null },
      customer_phone:    { value: null, confirmed: false },
      customer_name:     { value: null },
    };
    
    // Customer data after machine validation
    this.customerData = null;
    
    // Conversation history (rolling, never full dump to LLM)
    this.turns = [];  // { role, text, intent, slots_captured, timestamp }
    this.lastIntent = null;
    this.lastAgentText = null;
    
    // Emotion & style tracking
    this.callerEmotion = 'neutral';    // neutral | frustrated | urgent | confused | elderly
    this.speechStyle = 'standard';     // standard | slow | fast | rural
    this.urgencyLevel = 0;             // 0-10
    
    // Interruption state
    this.isStreaming = false;
    this.streamInterrupted = false;
    this.interruptCount = 0;
    
    // STT recovery
    this.lastSTTConfidence = 1.0;
    this.consecutiveLowConfidence = 0;
    this.sttRecoveryMode = false;
    
    // Turn management
    this.turnCount = 0;
    this.silenceCount = 0;
    this.maxTurns = 30;
    
    // One-time confirmations already done
    this.confirmationsDone = new Set();
    
    // Escalation flags
    this.escalationRequested = false;
    this.existingComplaintId = null;
    
    // Preload
    this.preloadedMachineNo = null;
    this.preloadedCustomerData = null;
    
    // Pending actions
    this.pendingPhoneConfirm = null;
    this.awaitingPhoneConfirm = null;
    this.awaitingNewPhone = false;
    this.awaitingComplaintChoice = false;
    this.awaitingFinalConfirm = false;
    this.clarificationAsked = false;
  }
  
  // Get all collected slot values
  getFilledSlots() {
    return Object.entries(this.slots)
      .filter(([, s]) => s.value !== null)
      .reduce((acc, [k, s]) => { acc[k] = s.value; return acc; }, {});
  }
  
  // Get first missing required slot
  getNextRequiredSlot() {
    const required = ['machine_no', 'complaint_title', 'machine_status', 'city', 'customer_phone'];
    for (const slot of required) {
      const s = this.slots[slot];
      if (!s.value) return slot;
      if (slot === 'machine_no' && !s.validated) return slot; // Have number but not validated
      if (slot === 'city' && !s.city_id) return slot; // Have city name but not matched
    }
    return null; // All collected
  }
  
  // Update a slot
  setSlot(name, value, confidence = 1.0, source = 'regex') {
    if (!this.slots[name]) return;
    if (value && value !== this.slots[name].value) {
      console.log(`   🎯 SLOT SET: ${name} = "${value}" (conf: ${confidence}, src: ${source})`);
      this.slots[name].value = value;
      this.slots[name].confidence = confidence;
      if (this.slots[name].sources) this.slots[name].sources.push(source);
    }
  }
  
  // Add a turn to conversation history
  addTurn(role, text, metadata = {}) {
    this.turns.push({
      role,
      text,
      timestamp: Date.now(),
      intent: metadata.intent || null,
      slotsCaptured: metadata.slotsCaptured || {},
      confidence: metadata.confidence || 1.0,
    });
    
    // Keep only last 10 turns for context
    if (this.turns.length > 10) this.turns.shift();
    
    if (role === 'user') {
      this.turnCount++;
      this.silenceCount = 0;
    }
    if (role === 'agent') {
      this.lastAgentText = text;
    }
  }
  
  // Get LLM-ready conversation context (compact, not full dump)
  getLLMContext() {
    const filled = this.getFilledSlots();
    const nextSlot = this.getNextRequiredSlot();
    const recentTurns = this.turns.slice(-6);
    
    return {
      filled,
      nextSlot,
      customerData: this.customerData,
      recentConversation: recentTurns.map(t => `${t.role === 'user' ? 'C' : 'A'}: ${t.text}`).join('\n'),
      callerEmotion: this.callerEmotion,
      urgencyLevel: this.urgencyLevel,
      speechStyle: this.speechStyle,
      turnCount: this.turnCount,
    };
  }
  
  // Check if all required data is collected
  isReadyToSubmit() {
    const required = ['machine_no', 'complaint_title', 'machine_status', 'city', 'customer_phone'];
    return required.every(k => this.slots[k].value)
      && this.slots.machine_no.validated
      && this.slots.city.city_id;
  }
}

// In-memory store
const activeCalls = new Map();

export function getCall(callSid) { return activeCalls.get(callSid); }
export function setCall(callSid, engine) { activeCalls.set(callSid, engine); }
export function deleteCall(callSid) { activeCalls.delete(callSid); }
