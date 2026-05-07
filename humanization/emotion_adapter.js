// emotion_adapter.js
// Detects and adapts to caller emotion in real-time

export class EmotionAdapter {
  
  // Detect emotion from text (fast, no LLM)
  static detect(text, engine) {
    const lo = text.toLowerCase();
    const turnHistory = engine.turns.filter(t => t.role === 'user');
    
    // Frustration markers
    if (this.detectFrustration(lo, turnHistory)) {
      engine.callerEmotion = 'frustrated';
      engine.urgencyLevel = Math.min(engine.urgencyLevel + 2, 10);
      return 'frustrated';
    }
    
    // Urgency markers
    if (this.detectUrgency(lo)) {
      engine.callerEmotion = 'urgent';
      engine.urgencyLevel = Math.min(engine.urgencyLevel + 3, 10);
      return 'urgent';
    }
    
    // Confusion markers
    if (this.detectConfusion(lo)) {
      engine.callerEmotion = 'confused';
      return 'confused';
    }
    
    // Elderly/patient markers
    if (this.detectElderly(lo, turnHistory)) {
      engine.speechStyle = 'slow';
      engine.callerEmotion = 'patient';
      return 'patient';
    }
    
    return 'neutral';
  }
  
  static detectFrustration(lo, history) {
    const frustrationWords = ['bahut', 'baar baar', 'pehle bhi', 'phir se', 'nahi aaya', 'der', 'kab tak', 'pagal', 'bakwaas'];
    const hasFrustrationWords = frustrationWords.some(w => lo.includes(w));
    
    // Multiple repeat requests = frustrated
    const repeatCount = history.filter(t => /(dobara|phir se|repeat)/i.test(t.text)).length;
    
    return hasFrustrationWords || repeatCount >= 2;
  }
  
  static detectUrgency(lo) {
    return /(urgent|jaldi|emergency|turant|abhi|immediately|site par kaam band|kaam ruka|loss|nuksan)/i.test(lo);
  }
  
  static detectConfusion(lo) {
    return /(kya matlab|samjha nahi|kya bolu|kaise|guide|batao|explain)/i.test(lo);
  }
  
  static detectElderly(lo, history) {
    // Short, simple responses, formal language
    const avgLength = history.length > 2
      ? history.slice(-3).reduce((s, t) => s + t.text.split(/\s+/).length, 0) / 3
      : 5;
    return avgLength < 4 && history.length > 3;
  }
}
