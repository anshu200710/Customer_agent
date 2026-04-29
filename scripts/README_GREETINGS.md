# Greeting Audio Generator

This script generates pre-recorded greeting audio files using Cartesia TTS API. These files can be used for instant greetings when calls are picked up, eliminating the 1-2 second delay from real-time TTS generation.

## 🎯 Purpose

Generate high-quality greeting audio files that:
- Use the same voice (Arushi - Hindi) as your live TTS
- Are served instantly (50-100ms vs 1000-1200ms for live TTS)
- Reduce API costs (no TTS call needed for greetings)
- Improve user experience (instant greeting on call pickup)

## 📋 Prerequisites

- Node.js installed
- Cartesia API key configured in `.env` file
- Internet connection (for API calls)

## 🚀 How to Run

### Step 1: Navigate to project root
```bash
cd /path/to/your/project
```

### Step 2: Run the script
```bash
node scripts/generate_greetings.js
```

### Step 3: Wait for completion
The script will:
1. Connect to Cartesia API
2. Generate 4 greeting audio files
3. Save them to `public/greetings/` folder
4. Print confirmation when done

## 📁 Output

The script creates these files in `public/greetings/`:

1. **greeting_default.wav**
   - Text: "Namaste, Rajesh Motors. Machine number bataiye."
   - Use: Default greeting for new customers
   - Duration: ~3.2 seconds

2. **greeting_priya.wav**
   - Text: "Namaste, main Priya, Rajesh Motors se. Machine number bataiye."
   - Use: Greeting with agent introduction
   - Duration: ~4.1 seconds

3. **greeting_short.wav**
   - Text: "Namaste, Rajesh Motors."
   - Use: Short greeting
   - Duration: ~1.8 seconds

4. **greeting_help.wav**
   - Text: "Namaste, kaise madad kar sakti hun?"
   - Use: Help/support greeting
   - Duration: ~2.5 seconds

## 📊 Expected Output

```
🎤 [GREETING GENERATOR] Starting...
🔑 Using Cartesia API Key: sk_car_1Pefb...
🎭 Voice: Arushi (95d51f79-c397-46f9-b49a-23763d3eaa2d)
📁 Output folder: public/greetings/

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[1/4] Generating: greeting_default.wav
📝 Text: "Namaste, Rajesh Motors. Machine number bataiye."
🎭 Emotion: friendly | Context: greeting
⏱️  Cartesia API: 856ms
✅ Received 279784 bytes of PCM audio
🔄 Converting to WAV...
✅ Saved: public/greetings/greeting_default.wav
📊 Duration: 3.2s | Size: 142KB

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[2/4] Generating: greeting_priya.wav
...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎉 SUCCESS! Generated 4/4 greeting files
📁 Location: public/greetings/
💾 Total size: 511KB
⏱️  Total time: 3.2s

✅ Ready to use! Update your code to use these files.
📝 Files generated:
   - greeting_default.wav
   - greeting_priya.wav
   - greeting_short.wav
   - greeting_help.wav
```

## ⚙️ Configuration

### To Add New Greetings

Edit the `GREETINGS` array in `scripts/generate_greetings.js`:

```javascript
const GREETINGS = [
    // ... existing greetings ...
    {
        id: "your_new_greeting",
        text: "Your greeting text in Hindi",
        filename: "greeting_your_name.wav",
        emotion: "friendly",
        context: "greeting"
    }
];
```

Then run the script again to regenerate all files.

### To Change Voice Settings

Edit these constants in the script:
```javascript
const VOICE_ID = "95d51f79-c397-46f9-b49a-23763d3eaa2d"; // Arushi - Hindi
const MODEL = "sonic-3";
const LANGUAGE = "hi";
const SAMPLE_RATE = 22050;
```

## 🔧 Troubleshooting

### Error: "CARTESIA_API_KEY not found"
**Solution:** Make sure your `.env` file contains:
```
CARTESIA_API_KEY=sk_car_1PefbE3pCv1UTB4rw2q6Zv
```

### Error: "Cannot find module 'axios'"
**Solution:** Install dependencies:
```bash
npm install
```

### Error: "Permission denied" when creating folder
**Solution:** Run with appropriate permissions or create folder manually:
```bash
mkdir -p public/greetings
```

### Error: "API timeout"
**Solution:** Check your internet connection and try again. The script has a 30-second timeout per request.

## 📝 Notes

- **Run Once:** You only need to run this script once to generate the files
- **Regenerate:** Run again if you want to update greetings or change voice settings
- **No Breaking Changes:** This script doesn't modify any existing code
- **Safe to Run:** Can be run multiple times (overwrites existing files)
- **Cost:** ~₹0.05 per greeting (one-time cost)

## 🎯 Next Steps

After generating the audio files:
1. Verify files exist in `public/greetings/`
2. Test audio quality by playing the files
3. Update `routes/voiceRoutes.js` to use pre-generated files (separate step)

## 📞 Support

If you encounter any issues:
1. Check the error message in the console
2. Verify your `.env` file has the correct API key
3. Ensure you have internet connection
4. Check that you have write permissions to the `public/` folder
