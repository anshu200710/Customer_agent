import 'dotenv/config';
import express from 'express';
import bodyParser from 'body-parser';


import outboundRoutes from './routes/outbound.js';
import voiceAiRoutes from './routes/voice_simple.js';
import voiceRoutes from './routes/voiceRoutes.js';


const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// THIS LINE IS MUST FOR TWILIO
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.use('/voice', voiceRoutes);
app.use('/outbound', outboundRoutes);
app.use("/audio", express.static("public/audio"));




const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
