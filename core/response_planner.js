// response_planner.js
// Controls WHAT to say, HOW MUCH to say, and WHICH STYLE

import { AzureOpenAI } from 'openai';
import { getMaxResponseWords } from '../humanization/filler_engine.js';

const client = new AzureOpenAI({
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview',
  endpoint: process.env.AZURE_OPENAI_ENDPOINT,
});

export class ResponsePlanner {
  
  static async generateResponse(engine, intent, nextSlot) {
    // Handle system intents WITHOUT calling LLM
    const systemResponse = this.handleSystemIntent(engine, intent);
    if (systemResponse) return systemResponse;
    
    // Determine response parameters based on emotion + urgency
    const maxWords = getMaxResponseWords(engine);
    const tone = this.getTone(engine);
    
    // Build minimal, focused prompt
    const prompt = this.buildMinimalPrompt(engine, intent, nextSlot, maxWords, tone);
    
    try {
      const response = await client.chat.completions.create({
        model: process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.user },
        ],
        temperature: 0.2,
        max_tokens: 80, // Short responses only
        top_p: 0.9,
      });
      
      const text = response.choices[0]?.message?.content?.trim() || '';
      const cleaned = this.cleanResponse(text, engine, nextSlot);
      
      return {
        text: cleaned,
        emotion: tone,
        nextSlot,
      };
      
    } catch (err) {
      console.error('LLM error:', err.message);
      // Fallback to hardcoded response
      return {
        text: this.getFallbackResponse(nextSlot, engine),
        emotion: 'professional',
        nextSlot,
      };
    }
  }
  
  // Handle intents that don't need LLM
  static handleSystemIntent(engine, intent) {
    switch (intent.type) {
      case 'REPEAT':
        return {
          text: engine.lastAgentText || 'Dobara bataiye.',
          emotion: 'professional',
          nextSlot: null,
        };
        
      case 'WAIT':
        return {
          text: 'Theek hai, main yahan hoon.',
          emotion: 'patient',
          nextSlot: null,
        };
        
      case 'IDENTITY_QUESTION': {
        const nextSlot = engine.getNextRequiredSlot();
        const suffix = this.getFallbackResponse(nextSlot, engine);
        return {
          text: `Main Priya, Rajesh Motors se. ${suffix}`,
          emotion: 'friendly',
          nextSlot,
        };
      }
        
      case 'AFFIRMATION':
        // If all data collected and user said yes — this is final confirm
        if (!engine.getNextRequiredSlot()) return null; // Let main flow handle it
        return null; // Let main flow process it
        
      default:
        return null; // Needs LLM
    }
  }
  
  // Build minimal LLM prompt — NOT the 200-line monster
  static buildMinimalPrompt(engine, intent, nextSlot, maxWords, tone) {
    const ctx = engine.getLLMContext();
    const lastUserMsg = engine.turns.filter(t => t.role === 'user').slice(-1)[0]?.text || '';
    
    // What we know
    const knownFacts = Object.entries(ctx.filled)
      .map(([k, v]) => `${k}=${v}`)
      .join(', ');
    
    // Recent exchange
    const recentExchange = ctx.recentConversation;
    
    const system = `You are Priya, a warm Indian female support agent at Rajesh Motors JCB service.

PERSONALITY: Natural Hinglish speaker, warm but efficient, like a helpful colleague.
LANGUAGE: Hindi/Hinglish. Never use "ji" at end of every sentence. Vary your language.
LENGTH: MAX ${maxWords} words. Shorter if urgency is high (${ctx.urgencyLevel}/10).
TONE: ${tone}

KNOWN DATA: ${knownFacts || 'nothing yet'}
NEXT REQUIRED: ${nextSlot || 'ALL COLLECTED'}

RULES:
- Answer the customer's question FIRST, then ask for the next slot
- NEVER ask for data you already have
- If customer gave data passively (mentioned city in passing), acknowledge and ask for what's missing
- For ${nextSlot}: ask naturally, don't sound like a form
- Mix acknowledgment + question in ONE response
- Examples of natural style:
  * "Achha, hydraulic problem. Machine bilkul band hai ya chal rahi hai?"
  * "Jaipur mein hain. Phone number bataiye."
  * "Samajh gaya. ${nextSlot === 'machine_no' ? 'Machine number?' : ''}"`;
    
    const user = `Recent exchange:
${recentExchange}

Customer just said: "${lastUserMsg}"
Intent detected: ${intent.type}

Respond naturally in Hindi/Hinglish. ${maxWords} words max. Ask for: ${nextSlot || 'nothing — ready to confirm'}.`;
    
    return { system, user };
  }
  
  // Clean and validate LLM response
  static cleanResponse(text, engine, nextSlot) {
    if (!text || text.length < 3) return this.getFallbackResponse(nextSlot, engine);
    
    // Remove any JSON, markdown, asterisks
    let clean = text
      .replace(/```[\s\S]*?```/g, '')
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/#/g, '')
      .trim();
    
    // Loop detection: if asking for already-filled slot
    const filled = engine.getFilledSlots();
    if (nextSlot && filled[nextSlot] && this.isAskingForSlot(clean, nextSlot)) {
      console.warn(`   ⚠️ LOOP: LLM asked for ${nextSlot} but it's already filled`);
      return this.getFallbackResponse(engine.getNextRequiredSlot(), engine);
    }
    
    return clean;
  }
  
  static isAskingForSlot(text, slot) {
    const lo = text.toLowerCase();
    const patterns = {
      machine_no: /(machine number|chassis number|number bataiye)/i,
      complaint_title: /(kya problem|kya kharaabi|kya ho raha)/i,
      machine_status: /(band hai ya|chal rahi ya)/i,
      city: /(kaunse shahar|city kya|kahan hain)/i,
      customer_phone: /(phone number|mobile number|number boliye)/i,
    };
    return patterns[slot]?.test(lo) || false;
  }
  
  // Hardcoded fallbacks — used when LLM fails or loops
  static getFallbackResponse(nextSlot, engine) {
    const turn = engine.turnCount || 0;
    
    const responses = {
      machine_no: ['Machine number bataiye.', 'Chassis number?', 'Number boliye.'],
      complaint_title: ['Kya problem hai?', 'Kya kharaabi hai?', 'Machine mein kya hua?'],
      machine_status: ['Machine band hai ya chal rahi hai problem ke saath?', 'Completely band ya chal rahi hai?'],
      city: ['Kaunse shahar mein hai machine?', 'City ka naam?', 'Nearest branch kahan hai?'],
      customer_phone: ['Aapka phone number?', '10 digit number bataiye.', 'Mobile number?'],
    };
    
    const options = responses[nextSlot] || ['Aur batayein.'];
    return options[turn % options.length];
  }
  
  static getTone(engine) {
    if (engine.callerEmotion === 'frustrated') return 'empathetic';
    if (engine.urgencyLevel >= 7) return 'urgent';
    if (engine.callerEmotion === 'confused') return 'patient';
    return 'professional';
  }
}
