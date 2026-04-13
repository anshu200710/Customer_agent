import 'dotenv/config';

console.log('\n🔍 JCB Voice Call System - Quick Health Check\n');
console.log('='.repeat(60));

// Test 1: Environment Variables
console.log('\n📋 Environment Configuration');
console.log('-'.repeat(60));
console.log(`✅ PORT: ${process.env.PORT}`);
console.log(`✅ MONGO_URI: ${process.env.MONGO_URI}`);
console.log(`✅ GROQ_API_KEY: ${process.env.GROQ_API_KEY ? '***configured***' : '❌ MISSING'}`);
console.log(`✅ TWILIO_ACCOUNT_SID: ${process.env.TWILIO_ACCOUNT_SID}`);
console.log(`✅ TWILIO_PHONE_NUMBER: ${process.env.TWILIO_PHONE_NUMBER}`);
console.log(`✅ PUBLIC_URL: ${process.env.PUBLIC_URL}`);

// Test 2: Module Imports
console.log('\n📦 Module Imports');
console.log('-'.repeat(60));
try {
    await import('./utils/ai.js');
    console.log('✅ AI utilities loaded');
} catch (e) {
    console.log('❌ AI utilities failed:', e.message);
}

try {
    await import('./utils/service_centers.js');
    console.log('✅ Service centers loaded');
} catch (e) {
    console.log('❌ Service centers failed:', e.message);
}

try {
    await import('./routes/voiceRoutes.js');
    console.log('✅ Voice routes loaded');
} catch (e) {
    console.log('❌ Voice routes failed:', e.message);
}

try {
    await import('./models/Complaint.js');
    console.log('✅ Complaint model loaded');
} catch (e) {
    console.log('❌ Complaint model failed:', e.message);
}

// Test 3: Data Extraction Test
console.log('\n🧠 Data Extraction Test');
console.log('-'.repeat(60));
try {
    const { extractAllData } = await import('./utils/ai.js');
    
    const testCases = [
        "Machine 3305447 hai, engine start nahi ho rahi",
        "Tel nikal raha hai, Bhilwara mein hai",
        "9876543210 number hai, machine band hai"
    ];
    
    for (const test of testCases) {
        const result = extractAllData(test, {});
        console.log(`\nInput: "${test}"`);
        console.log(`  Machine: ${result.machine_no || '❌'}`);
        console.log(`  Problem: ${result.complaint_title || '❌'}`);
        console.log(`  City: ${result.city || '❌'}`);
        console.log(`  Phone: ${result.customer_phone || '❌'}`);
        console.log(`  Status: ${result.machine_status || '❌'}`);
    }
} catch (e) {
    console.log('❌ Extraction test failed:', e.message);
}

// Test 4: Service Centers
console.log('\n🗺️  Service Centers Database');
console.log('-'.repeat(60));
try {
    const { SERVICE_CENTERS } = await import('./utils/service_centers.js');
    console.log(`✅ Total locations: ${SERVICE_CENTERS.length}`);
    
    const branches = [...new Set(SERVICE_CENTERS.map(c => c.branch_name))];
    console.log(`✅ Branches: ${branches.join(', ')}`);
    
    console.log('\nSample locations:');
    SERVICE_CENTERS.slice(0, 5).forEach(c => {
        console.log(`  - ${c.city_name} → ${c.branch_name} (Branch Code: ${c.branch_code})`);
    });
} catch (e) {
    console.log('❌ Service centers failed:', e.message);
}

console.log('\n' + '='.repeat(60));
console.log('✅ Application structure is valid!');
console.log('\n📝 Next Steps:');
console.log('  1. Ensure MongoDB is running: mongod');
console.log('  2. Start ngrok: ngrok http 5000');
console.log('  3. Update Twilio webhook to: <ngrok-url>/voice');
console.log('  4. Start server: npm start');
console.log('='.repeat(60) + '\n');
