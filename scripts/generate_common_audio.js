// generate_common_audio.js
// Pre-generate common audio files for instant playback
// Run: node scripts/generate_common_audio.js

import { generateSpeech } from '../utils/cartesia_tts.js';
import fs from 'fs/promises';
import path from 'path';

const OUTPUT_DIR = path.join(process.cwd(), 'public', 'greetings');

const COMMON_PHRASES = [
  // Greetings
  {
    file: 'greeting_new_customer.wav',
    text: 'Namaste. Machine number bataiye.',
    emotion: 'friendly',
    context: 'greeting',
    description: 'New customer greeting'
  },
  
  // Questions
  {
    file: 'ask_complaint.wav',
    text: 'Kya problem hai?',
    emotion: 'professional',
    context: 'complaint',
    description: 'Ask for complaint'
  },
  {
    file: 'ask_status.wav',
    text: 'Machine band hai ya chal rahi hai?',
    emotion: 'professional',
    context: 'general',
    description: 'Ask machine status'
  },
  {
    file: 'ask_city.wav',
    text: 'Kaunse shahar mein hain?',
    emotion: 'professional',
    context: 'general',
    description: 'Ask for city'
  },
  {
    file: 'ask_phone.wav',
    text: 'Aapka phone number?',
    emotion: 'professional',
    context: 'general',
    description: 'Ask for phone'
  },
  
  // Fillers (most common)
  {
    file: 'filler_theek_hai.wav',
    text: 'Theek hai.',
    emotion: 'professional',
    context: 'general',
    description: 'Acknowledgment filler'
  },
  {
    file: 'filler_achha.wav',
    text: 'Achha.',
    emotion: 'professional',
    context: 'general',
    description: 'Acknowledgment filler'
  },
  {
    file: 'filler_haan.wav',
    text: 'Haan.',
    emotion: 'professional',
    context: 'general',
    description: 'Acknowledgment filler'
  },
  {
    file: 'filler_samajh_gaya.wav',
    text: 'Samajh gaya.',
    emotion: 'professional',
    context: 'general',
    description: 'Understanding acknowledgment'
  },
  
  // Processing
  {
    file: 'processing.wav',
    text: 'Ek second.',
    emotion: 'professional',
    context: 'general',
    description: 'Processing filler'
  },
  
  // Confirmations
  {
    file: 'complaint_saved.wav',
    text: 'Complaint register ho gayi.',
    emotion: 'professional',
    context: 'confirmation',
    description: 'Complaint saved confirmation'
  },
  {
    file: 'final_confirmation.wav',
    text: 'Aur koi problem? Save kar dun?',
    emotion: 'professional',
    context: 'confirmation',
    description: 'Final confirmation question'
  },
  
  // Errors/Recovery
  {
    file: 'repeat_request.wav',
    text: 'Dobara bataiye.',
    emotion: 'professional',
    context: 'general',
    description: 'Ask to repeat'
  },
  {
    file: 'dtmf_fallback.wav',
    text: 'Phone ke button se type karein.',
    emotion: 'professional',
    context: 'general',
    description: 'DTMF fallback prompt'
  },
  
  // Farewell
  {
    file: 'farewell.wav',
    text: 'Engineer jaldi contact karega. Dhanyavaad!',
    emotion: 'professional',
    context: 'farewell',
    description: 'Standard farewell'
  },
];

async function generateAllAudio() {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🎤 [AUDIO GENERATION] Pre-generating ${COMMON_PHRASES.length} common phrases`);
  console.log(`📁 Output directory: ${OUTPUT_DIR}`);
  console.log(`${'='.repeat(60)}\n`);
  
  // Ensure output directory exists
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  
  let successCount = 0;
  let failCount = 0;
  const results = [];
  
  for (let i = 0; i < COMMON_PHRASES.length; i++) {
    const phrase = COMMON_PHRASES[i];
    const num = String(i + 1).padStart(2, '0');
    
    console.log(`\n[${num}/${COMMON_PHRASES.length}] Generating: ${phrase.file}`);
    console.log(`   📝 Text: "${phrase.text}"`);
    console.log(`   🎭 Emotion: ${phrase.emotion}`);
    console.log(`   📍 Context: ${phrase.context}`);
    
    try {
      const startTime = Date.now();
      
      // Generate audio
      const audio = await generateSpeech(phrase.text, {
        emotion: phrase.emotion,
        context: phrase.context,
        speed: 1.0,
      });
      
      if (!audio.success) {
        throw new Error(audio.error || 'Generation failed');
      }
      
      // Save to file
      const filePath = path.join(OUTPUT_DIR, phrase.file);
      await fs.writeFile(filePath, audio.wavAudio);
      
      const duration = Date.now() - startTime;
      const sizeKB = (audio.wavAudio.length / 1024).toFixed(2);
      
      console.log(`   ✅ Success!`);
      console.log(`   📊 Size: ${sizeKB} KB`);
      console.log(`   ⏱️  Duration: ${audio.duration.toFixed(2)}s audio, ${duration}ms generation`);
      console.log(`   💾 Saved: ${filePath}`);
      
      successCount++;
      results.push({
        file: phrase.file,
        text: phrase.text,
        description: phrase.description,
        size: sizeKB,
        duration: audio.duration,
        generationTime: duration,
        success: true,
      });
      
    } catch (err) {
      console.error(`   ❌ Failed: ${err.message}`);
      failCount++;
      results.push({
        file: phrase.file,
        text: phrase.text,
        description: phrase.description,
        error: err.message,
        success: false,
      });
    }
  }
  
  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 [SUMMARY] Audio Generation Complete`);
  console.log(`${'='.repeat(60)}`);
  console.log(`✅ Success: ${successCount}/${COMMON_PHRASES.length}`);
  console.log(`❌ Failed:  ${failCount}/${COMMON_PHRASES.length}`);
  
  if (successCount > 0) {
    const totalSize = results
      .filter(r => r.success)
      .reduce((sum, r) => sum + parseFloat(r.size), 0);
    const avgDuration = results
      .filter(r => r.success)
      .reduce((sum, r) => sum + r.duration, 0) / successCount;
    const avgGenTime = results
      .filter(r => r.success)
      .reduce((sum, r) => sum + r.generationTime, 0) / successCount;
    
    console.log(`📦 Total size: ${totalSize.toFixed(2)} KB`);
    console.log(`⏱️  Avg audio duration: ${avgDuration.toFixed(2)}s`);
    console.log(`🚀 Avg generation time: ${avgGenTime.toFixed(0)}ms`);
  }
  
  // Generate manifest file
  const manifest = {
    generated: new Date().toISOString(),
    totalFiles: COMMON_PHRASES.length,
    successCount,
    failCount,
    files: results,
  };
  
  const manifestPath = path.join(OUTPUT_DIR, 'manifest.json');
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`\n📄 Manifest saved: ${manifestPath}`);
  
  // Generate usage guide
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📚 [USAGE GUIDE] How to use pre-generated audio`);
  console.log(`${'='.repeat(60)}`);
  console.log(`
In your voiceRoutes.js, use pre-generated audio for instant playback:

// Instead of:
await speak(twiml, "Namaste. Machine number bataiye.");

// Use:
const audioUrl = \`\${process.env.PUBLIC_URL}/greetings/greeting_new_customer.wav\`;
const gather = twiml.gather({ /* ... */ });
gather.play(audioUrl);

This saves 800-1200ms per call!

Available files:
${results.filter(r => r.success).map(r => `  - ${r.file.padEnd(30)} → "${r.text}"`).join('\n')}
  `);
  
  console.log(`${'='.repeat(60)}\n`);
}

// Run
generateAllAudio().catch(err => {
  console.error('\n❌ [FATAL ERROR]', err);
  process.exit(1);
});
