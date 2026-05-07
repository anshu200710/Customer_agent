// stt_recovery.js
// Handles bad STT, noisy audio, network issues, partial speech

export class STTRecovery {
  
  // Analyze STT result and determine if recovery is needed
  static analyze(engine, text, confidence) {
    // Update engine STT tracking
    engine.lastSTTConfidence = confidence;
    
    if (confidence >= 0.75) {
      engine.consecutiveLowConfidence = 0;
      return { needsRecovery: false };
    }
    
    engine.consecutiveLowConfidence++;
    
    // Low confidence but text looks valid (machine number, city name, etc.)
    if (this.looksLikeValidData(text, engine)) {
      // Trust it — it's probably right even with low confidence
      return { needsRecovery: false };
    }
    
    // Very low confidence
    if (confidence < 0.4) {
      return {
        needsRecovery: true,
        reason: 'very_low_confidence',
        partialData: this.extractPartialData(text, engine),
      };
    }
    
    // Borderline — attempt partial understanding
    return {
      needsRecovery: confidence < 0.6 && engine.consecutiveLowConfidence >= 2,
      reason: 'low_confidence',
      partialData: null,
    };
  }
  
  // Check if the text, despite low confidence, contains what we expect
  static looksLikeValidData(text, engine) {
    const nextSlot = engine.getNextRequiredSlot();
    const digits = text.replace(/\D/g, '');
    
    if (nextSlot === 'machine_no') {
      return digits.length >= 3 && digits.length <= 7;
    }
    if (nextSlot === 'customer_phone') {
      return /[6-9]\d{9}/.test(digits);
    }
    if (nextSlot === 'city') {
      const cities = ['jaipur', 'kota', 'ajmer', 'udaipur', 'alwar', 'sikar', 'bhilwara'];
      return cities.some(c => text.toLowerCase().includes(c));
    }
    if (nextSlot === 'complaint_title') {
      return /(start|band|kharab|hydraulic|gear|brake|oil|filter|engine)/i.test(text);
    }
    
    return false;
  }
  
  // Try to extract partial data from low-confidence speech
  static extractPartialData(text, engine) {
    const nextSlot = engine.getNextRequiredSlot();
    const digits = text.replace(/\D/g, '');
    
    if (nextSlot === 'machine_no' && digits.length >= 3) {
      return digits.slice(0, 7); // Best guess at machine number
    }
    
    return null;
  }
  
  // Get recovery prompt based on situation
  static getRecoveryPrompt(engine, reason) {
    const nextSlot = engine.getNextRequiredSlot();
    const consecutiveFails = engine.consecutiveLowConfidence;
    
    if (consecutiveFails >= 3 && nextSlot === 'machine_no') {
      return 'Phone ke button se machine number type karein.';
    }
    
    if (consecutiveFails >= 3) {
      return 'Network thoda weak lag raha hai. Thoda clearly aur loud boliye.';
    }
    
    if (nextSlot === 'machine_no') {
      return 'Number clearly ek ek digit boliye.';
    }
    
    return 'Thoda clearly boliye, awaaz saaf nahi aayi.';
  }
}
