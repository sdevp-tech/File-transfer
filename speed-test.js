// speed-test.js - اختبار أداء الخادم
const autocannon = require('autocannon');
const { performance } = require('perf_hooks');

async function runSpeedTest() {
    console.log('⚡ بدء اختبار سرعة الخادم...\n');
    
    const testConfig = {
        url: 'http://localhost:3000',
        connections: 10, // 10 اتصالات متوازية
        duration: 10, // 10 ثواني
        pipelining: 1, // 1 طلب لكل اتصال
        workers: 4, // 4 عمال
        headers: {
            'Connection': 'keep-alive'
        }
    };
    
    // اختبار 1: طلبات صغيرة
    console.log('📊 اختبار طلبات صغيرة (1KB)...');
    const smallTest = await autocannon({
        ...testConfig,
        requests: [{
            method: 'GET',
            path: '/generate-qrcode?size=100'
        }]
    });
    printResults('طلبات صغيرة', smallTest);
    
    // اختبار 2: طلبات متوسطة
    console.log('\n📊 اختبار طلبات متوسطة (10KB)...');
    const mediumTest = await autocannon({
        ...testConfig,
        requests: [{
            method: 'GET',
            path: '/qrcode-page'
        }]
    });
    printResults('طلبات متوسطة', mediumTest);
    
    // اختبار 3: نقل ملفات (محاكاة)
    console.log('\n📊 اختبار نقل ملفات (محاكاة)...');
    const fileTransferTest = await autocannon({
        ...testConfig,
        requests: [{
            method: 'POST',
            path: '/api/upload',
            body: JSON.stringify({ test: 'data'.repeat(1000) }),
            headers: {
                'Content-Type': 'application/json'
            }
        }]
    });
    printResults('نقل ملفات', fileTransferTest);
    
    // اختبار 4: حمل عالي
    console.log('\n📊 اختبار حمل عالي (100 اتصال)...');
    const stressTest = await autocannon({
        ...testConfig,
        connections: 100,
        duration: 30
    });
    printResults('حمل عالي', stressTest);
}

function printResults(testName, results) {
    console.log(`\n══════════════════════════════════════`);
    console.log(`نتائج اختبار: ${testName}`);
    console.log(`══════════════════════════════════════`);
    console.log(`🔄 الإنتاجية: ${results.requests.average} طلب/ثانية`);
    console.log(`⏱️  زمن الاستجابة: ${results.latency.average}ms`);
    console.log(`📈 النجاح: ${results['2xx']} طلب ناجح`);
    console.log(`❌ الفشل: ${results.errors} طلب فاشل`);
    console.log(`📤 الإرسال: ${results.throughput.average} بايت/ثانية`);
    console.log(`══════════════════════════════════════\n`);
}

// اختبار نقل البيانات المباشر
async function testDataTransfer() {
    console.log('\n🧪 اختبار نقل البيانات المباشر...');
    
    const sizes = [1024, 10240, 102400, 1048576]; // 1KB, 10KB, 100KB, 1MB
    const results = [];
    
    for (const size of sizes) {
        const start = performance.now();
        
        // محاكاة نقل بيانات
        const data = 'x'.repeat(size);
        const encoded = Buffer.from(data).toString('base64');
        const decoded = Buffer.from(encoded, 'base64').toString();
        
        const end = performance.now();
        const duration = end - start;
        const speed = (size / duration) * 1000; // بايت/ثانية
        
        results.push({
            size: formatBytes(size),
            duration: `${duration.toFixed(2)}ms`,
            speed: `${formatBytes(speed)}/ثانية`,
            throughput: `${(size * 8 / duration / 1000).toFixed(2)} Mbps`
        });
    }
    
    console.table(results);
}

function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' بايت';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

// تشغيل جميع الاختبارات
async function runAllTests() {
    try {
        await runSpeedTest();
        await testDataTransfer();
        
        console.log('\n🎉 اكتملت جميع الاختبارات بنجاح!');
        console.log('📌 توصيات التحسين:');
        console.log('   • زيادة حجم الـ Buffer لـ 128MB');
        console.log('   • استخدام 8 عمال متوازيين');
        console.log('   • تفعيل ضغط GZIP للمحتوى');
        console.log('   • استخدام التخزين المؤقت في الذاكرة');
        console.log('   • تحسين إعدادات TCP');
    } catch (error) {
        console.error('❌ خطأ في الاختبار:', error);
    }
}

// تشغيل الاختبارات إذا تم تشغيل الملف مباشرة
if (require.main === module) {
    runAllTests();
}

module.exports = {
    runSpeedTest,
    testDataTransfer,
    runAllTests
};