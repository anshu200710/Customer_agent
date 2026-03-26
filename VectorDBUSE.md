ai-voice-agent/
│
├── src/
│   ├── index.js              # server start
│   │
│   ├── routes/
│   │   └── call.js           # Twilio webhook
│   │
│   ├── services/
│   │   ├── llm.js            # Groq response
│   │   ├── vector.js         # similarity search
│   │   └── tts.js            # Google TTS
│   │
│   ├── logic/
│   │   └── rules.js          # smart handling
│   │
│   └── utils/
│       └── helpers.js
│
├── data/
│   ├── dataset.json
│   └── vectors.json
│
├── .env
├── package.json
└── README.md