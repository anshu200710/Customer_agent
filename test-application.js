import 'dotenv/config';
import axios from 'axios';
import mongoose from 'mongoose';

console.log('\n🔍 JCB Voice Call System - End-to-End Test\n');
console.log('='.repeat(60));

// Test 1: Environment Variables
console.log('\n📋 Test 1: Environment Configuration');
console.log('-'.repeat(60));
const requiredEnvVars = [
    'PORT', 'MONGO_URI', 'GROQ_API_KEY', 
    'TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 
    'TWILIO_PHONE_NUMBER', 'PUBLIC_URL'
];

let envPass = true;
requiredEnvVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
        console.log(`✅ ${varName}: ${varName.includes('KEY') || varName.includes('TOKEN') ? '***' : value}`);
    } else {
        console.log(`❌ ${varName}: MISSING`);
        envPass = false;
    }
});

// Test 2: MongoDB Connection
console.log('\n📦 Test 2: MongoDB Connection');
console.log('-'.repeat(60));
try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected successfully');
    console.log(`   Database: ${mongoose.connection.name}`);
    console.log(`   Host: ${mongoose.connection.host}`);
    await mongoose.connection.close();
} catch (error) {
    console.log('❌ MongoDB connection failed:', error.message);
}

// Test 3: Groq AI API
console.log('\n🤖 Test 3: Groq AI API');
console.log('-'.repeat(60));
try {
    const response = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
            model: 'llama-3.1-8b-instant',
            messages: [{ role: 'user', content: 'Say "test successful" in Hindi' }],
            max_tokens: 50
        },
        {
            headers: {
                'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            timeout: 10000
        }
    );
    console.log('✅ Groq AI API working');
    console.log(`   Response: ${response.data.choices[0].message.content}`);
} catch (error) {
    console.log('❌ Groq AI API failed:', error.response?.data?.error?.message || error.message);
}

// Test 4: Twilio Configuration
console.log('\n📞 Test 4: Twilio Configuration');
console.log('-'.repeat(60));
try {
    const twilio = (await import('twilio')).default;
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    
    const account = await client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
    console.log('✅ Twilio credentials valid');
    console.log(`   Account Status: ${account.status}`);
    console.log(`   Phone Number: ${process.env.TWILIO_PHONE_NUMBER}`);
} catch (error) {
    console.log('❌ Twilio validation failed:', error.message);
}

// Test 5: Service Centers Data
console.log('\n🗺️  Test 5: Service Centers Database');
console.log('-'.repeat(60));
try {
    const { SERVICE_CENTERS } = await import('./utils/service_centers.js');
    console.log(`✅ Service centers loaded: ${SERVICE_CENTERS.length} locations`);
    console.log(`   Branches: ${[...new Set(SERVICE_CENTERS.map(c => c.branch_name))].join(', ')}`);
    console.log(`   Sample cities: ${SERVICE_CENTERS.slice(0, 5).map(c => c.city_name).join(', ')}`);
} catch (error) {
    console.log('❌ Service centers load failed:', error.message);
}

// Test 6: AI Extraction Functions
console.log('\n🧠 Test 6: AI Data Extraction');
console.log('-'.repeat(60));
try {
    const { extractAllData } = await import('./utils/ai.js');
    
    const testInput = "Machine number 3305447 hai, engine start nahi ho rahi, Bhilwara mein hai, 9876543210";
    const extracted = extractAllData(testInput, {});
    
    console.log('✅ Data extraction working');
    console.log(`   Input: "${testInput}"`);
    console.log(`   Extracted:`);
    console.log(`     - Machine: ${extracted.machine_no || '❌'}`);
    console.log(`     - Problem: ${extracted.complaint_title || '❌'}`);
    console.log(`     - City: ${extracted.city || '❌'}`);
    console.log(`     - Phone: ${extracted.customer_phone || '❌'}`);
} catch (error) {
    console.log('❌ Data extraction failed:', error.message);
}

// Test 7: Backend API Connectivity
console.log('\n🌐 Test 7: Backend API Connectivity');
console.log('-'.repeat(60));
try {
    const response = await axios.get('http://gprs.rajeshmotors.com/jcbServiceEnginerAPIv7/', {
        timeout: 5000,
        validateStatus: () => true
    });
    console.log(`✅ Backend API reachable (Status: ${response.status})`);
} catch (error) {
    console.log('⚠️  Backend API check:', error.message);
}

// Test 8: Routes Configuration
console.log('\n🛣️  Test 8: Routes Configuration');
console.log('-'.repeat(60));
try {
    const voiceRoutes = await import('./routes/voiceRoutes.js');
    const outboundRoutes = await import('./routes/outbound.js');
    console.log('✅ Voice routes loaded');
    console.log('✅ Outbound routes loaded');
    console.log('   Available endpoints:');
    console.log('     - POST /voice (incoming calls)');
    console.log('     - POST /voice/process (speech processing)');
    console.log('     - POST /outbound/call (outbound calls)');
} catch (error) {
    console.log('❌ Routes load failed:', error.message);
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('📊 Test Summary');
console.log('='.repeat(60));
console.log(`
Environment: ${envPass ? '✅ PASS' : '❌ FAIL'}
MongoDB: Check logs above
Groq AI: Check logs above
Twilio: Check logs above
Service Centers: Check logs above
Data Extraction: Check logs above
Backend API: Check logs above
Routes: Check logs above

🚀 To start the server: npm start
📞 Webhook URL: ${process.env.PUBLIC_URL}/voice
`);

process.exit(0);
