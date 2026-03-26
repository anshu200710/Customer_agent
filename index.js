import 'dotenv/config';
import express from 'express';
import bodyParser from 'body-parser';
import callRoutes from './routes/call.js';
import outboundRoutes from './routes/outbound.js';

const app = express();

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Static audio files
app.use('/audio', express.static('public/audio'));

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Routes
app.use('/voice', callRoutes);
app.use('/outbound', outboundRoutes);

// Global error handler
app.use((err, req, res, next) => {
    console.error('❌ [ERROR]', err.message, err.stack);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📞 Voice webhook: ${process.env.VOICE_WEBHOOK_URL || `http://localhost:${PORT}/voice`}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;