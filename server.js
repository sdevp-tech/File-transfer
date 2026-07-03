const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');
const { networkInterfaces } = require('os');
const net = require('net');
const QRCode = require('qrcode');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { 
    cors: { 
        origin: "*",
        methods: ["GET", "POST"]
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    maxHttpBufferSize: 1e8 // زيادة حجم الـ buffer لتلقي ملفات أكبر
});

// 🔧 الإعدادات
const UPLOAD_DIR = path.join(__dirname, 'downloads');
const CHUNK_DIR = path.join(__dirname, 'temp_chunks');
const PORT = process.env.PORT || 3000;
const PORTAL_PORT = 80;

// 📁 إنشاء المجلدات إذا لم تكن موجودة
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    console.log('✅ تم إنشاء مجلد downloads');
}

if (!fs.existsSync(CHUNK_DIR)) {
    fs.mkdirSync(CHUNK_DIR, { recursive: true });
    console.log('✅ تم إنشاء مجلد temp_chunks');
}

// 🌐 خدمة الملفات الثابتة
app.use(express.static(__dirname));
app.use('/downloads', express.static(UPLOAD_DIR));
app.use('/qrcodes', express.static(path.join(__dirname, 'qrcodes')));

// 🎯 نقطة نهاية لإنشاء QR Code ديناميكي
app.get('/generate-qrcode', async (req, res) => {
    try {
        const { url, size = 300, margin = 2, format = 'html' } = req.query;
        
        if (!url) {
            const nets = networkInterfaces();
            const localIPs = [];
            
            for (const name of Object.keys(nets)) {
                for (const net of nets[name]) {
                    if (net.family === 'IPv4' && !net.internal) {
                        localIPs.push(net.address);
                    }
                }
            }
            
            const ip = localIPs[0] || 'localhost';
            const appUrl = `http://${ip}:${PORT}/client-p2p.html`;
            
            if (format === 'png') {
                // إرجاع صورة PNG مباشرة
                const qrBuffer = await QRCode.toBuffer(appUrl, {
                    width: parseInt(size),
                    margin: parseInt(margin),
                    color: {
                        dark: '#2c3e50',
                        light: '#ffffff'
                    }
                });
                
                res.writeHead(200, {
                    'Content-Type': 'image/png',
                    'Content-Length': qrBuffer.length
                });
                res.end(qrBuffer);
            } else {
                // إرجاع صفحة HTML
                const qrCode = await QRCode.toDataURL(appUrl, {
                    width: parseInt(size),
                    margin: parseInt(margin),
                    color: {
                        dark: '#2c3e50',
                        light: '#ffffff'
                    }
                });
                
                res.send(`
                    <!DOCTYPE html>
                    <html dir="rtl" lang="ar">
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>QR Code - نقل الملفات</title>
                        <style>
                            body {
                                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                                margin: 0;
                                padding: 20px;
                                display: flex;
                                justify-content: center;
                                align-items: center;
                                min-height: 100vh;
                            }
                            .container {
                                background: white;
                                padding: 30px;
                                border-radius: 20px;
                                box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                                text-align: center;
                                max-width: 400px;
                            }
                            .qr-container {
                                margin: 20px 0;
                                padding: 20px;
                                background: #f8f9fa;
                                border-radius: 10px;
                            }
                            .qr-container img {
                                max-width: 100%;
                                height: auto;
                                border: 10px solid white;
                                border-radius: 10px;
                            }
                            .btn {
                                display: inline-block;
                                background: linear-gradient(135deg, #3498db, #2980b9);
                                color: white;
                                padding: 12px 24px;
                                border-radius: 25px;
                                text-decoration: none;
                                font-weight: bold;
                                margin: 10px;
                                transition: all 0.3s ease;
                            }
                            .btn:hover {
                                transform: translateY(-2px);
                                box-shadow: 0 5px 15px rgba(0,0,0,0.2);
                            }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <h1>📱 QR Code للدخول السريع</h1>
                            <div class="qr-container">
                                <img src="${qrCode}" alt="QR Code">
                            </div>
                            <a href="/client-p2p.html" class="btn">فتح التطبيق</a>
                            <a href="/" class="btn" style="background: linear-gradient(135deg, #27ae60, #20c997);">العودة للصفحة الرئيسية</a>
                        </div>
                    </body>
                    </html>
                `);
            }
        } else {
            const qrBuffer = await QRCode.toBuffer(url, {
                width: parseInt(size),
                margin: parseInt(margin),
                color: {
                    dark: '#2c3e50',
                    light: '#ffffff'
                }
            });
            
            res.writeHead(200, {
                'Content-Type': 'image/png',
                'Content-Length': qrBuffer.length
            });
            res.end(qrBuffer);
        }
    } catch (error) {
        console.error('❌ خطأ في إنشاء QR Code:', error);
        res.status(500).send('خطأ في إنشاء QR Code');
    }
});

// 🎯 صفحة QR Code كاملة
app.get('/qrcode-page', async (req, res) => {
    try {
        const nets = networkInterfaces();
        const localIPs = [];
        
        for (const name of Object.keys(nets)) {
            for (const net of nets[name]) {
                if (net.family === 'IPv4' && !net.internal) {
                    localIPs.push(net.address);
                }
            }
        }
        
        const ip = localIPs[0] || 'localhost';
        const appUrl = `http://${ip}:${PORT}/client-p2p.html`;
        
        const qrCode = await QRCode.toDataURL(appUrl, {
            width: 400,
            margin: 2,
            color: {
                dark: '#2c3e50',
                light: '#ffffff'
            }
        });
        
        const html = `
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>QR Code - شبكة نقل الملفات</title>
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    min-height: 100vh;
                    padding: 20px;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                }
                
                .qr-page-container {
                    background: white;
                    border-radius: 25px;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.15);
                    width: 100%;
                    max-width: 500px;
                    overflow: hidden;
                }
                
                .qr-header {
                    background: linear-gradient(135deg, #2c3e50, #1a252f);
                    color: white;
                    padding: 30px;
                    text-align: center;
                }
                
                .qr-header h1 {
                    font-size: 2.2em;
                    margin-bottom: 10px;
                }
                
                .qr-content {
                    padding: 40px 30px;
                    text-align: center;
                }
                
                .qr-code-container {
                    background: #f8f9fa;
                    padding: 30px;
                    border-radius: 20px;
                    margin: 25px 0;
                    display: inline-block;
                    border: 2px dashed #3498db;
                }
                
                .qr-code-container img {
                    width: 250px;
                    height: 250px;
                    border: 15px solid white;
                    border-radius: 15px;
                    box-shadow: 0 10px 20px rgba(0,0,0,0.1);
                }
                
                .url-display {
                    background: #e9ecef;
                    padding: 20px;
                    border-radius: 15px;
                    margin: 25px 0;
                    text-align: right;
                    direction: ltr;
                    word-break: break-all;
                }
                
                .instructions {
                    background: #f0f7ff;
                    border-radius: 15px;
                    padding: 25px;
                    margin: 25px 0;
                    text-align: right;
                    border-right: 5px solid #3498db;
                }
                
                .instructions h3 {
                    color: #2c3e50;
                    margin-bottom: 15px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                
                .instructions ul {
                    list-style: none;
                    padding: 0;
                }
                
                .instructions li {
                    margin: 12px 0;
                    padding: 12px;
                    background: white;
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    gap: 15px;
                }
                
                .action-buttons {
                    display: flex;
                    gap: 15px;
                    justify-content: center;
                    margin-top: 30px;
                    flex-wrap: wrap;
                }
                
                .btn {
                    padding: 15px 30px;
                    border-radius: 25px;
                    text-decoration: none;
                    font-weight: bold;
                    display: inline-flex;
                    align-items: center;
                    gap: 10px;
                    transition: all 0.3s ease;
                    min-width: 180px;
                    justify-content: center;
                }
                
                .btn-primary {
                    background: linear-gradient(135deg, #3498db, #2980b9);
                    color: white;
                }
                
                .btn-success {
                    background: linear-gradient(135deg, #27ae60, #20c997);
                    color: white;
                }
                
                .btn-warning {
                    background: linear-gradient(135deg, #f39c12, #e67e22);
                    color: white;
                }
                
                .btn:hover {
                    transform: translateY(-3px);
                    box-shadow: 0 10px 20px rgba(0,0,0,0.2);
                }
                
                @media (max-width: 600px) {
                    .qr-code-container img {
                        width: 200px;
                        height: 200px;
                    }
                    
                    .action-buttons {
                        flex-direction: column;
                    }
                    
                    .btn {
                        width: 100%;
                    }
                }
            </style>
        </head>
        <body>
            <div class="qr-page-container">
                <div class="qr-header">
                    <h1><i class="fas fa-qrcode"></i> QR Code للدخول السريع</h1>
                    <p>مسح ضوئي سريع للوصول إلى تطبيق نقل الملفات</p>
                </div>
                
                <div class="qr-content">
                    <div class="qr-code-container">
                        <img src="${qrCode}" alt="QR Code لتطبيق نقل الملفات">
                    </div>
                    
                    <div class="url-display">
                        <strong><i class="fas fa-link"></i> رابط التطبيق:</strong><br>
                        <a href="${appUrl}" target="_blank">${appUrl}</a>
                    </div>
                    
                    <div class="instructions">
                        <h3><i class="fas fa-info-circle"></i> كيفية الاستخدام:</h3>
                        <ul>
                            <li>
                                <i class="fas fa-camera"></i>
                                <span>افتح كاميرا هاتفك ووجهها نحو QR Code</span>
                            </li>
                            <li>
                                <i class="fas fa-wifi"></i>
                                <span>تأكد من أن جميع الأجهزة على نفس الشبكة</span>
                            </li>
                            <li>
                                <i class="fas fa-mouse-pointer"></i>
                                <span>اضغط على الرابط الذي يظهر بعد المسح</span>
                            </li>
                        </ul>
                    </div>
                    
                    <div class="action-buttons">
                        <a href="/client-p2p.html" class="btn btn-primary">
                            <i class="fas fa-external-link-alt"></i> فتح التطبيق
                        </a>
                        <a href="/" class="btn btn-success">
                            <i class="fas fa-home"></i> الصفحة الرئيسية
                        </a>
                        <a href="javascript:window.print()" class="btn btn-warning">
                            <i class="fas fa-print"></i> طباعة QR Code
                        </a>
                    </div>
                </div>
            </div>
            
            <script src="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/js/all.min.js"></script>
            <script>
                document.addEventListener('DOMContentLoaded', function() {
                    const urlLink = document.querySelector('.url-display a');
                    urlLink.addEventListener('click', function(e) {
                        if (!e.ctrlKey && !e.metaKey) {
                            e.preventDefault();
                            navigator.clipboard.writeText(this.href).then(() => {
                                const originalText = this.innerHTML;
                                this.innerHTML = '<i class="fas fa-check"></i> تم النسخ!';
                                this.style.color = '#27ae60';
                                
                                setTimeout(() => {
                                    this.innerHTML = originalText;
                                    this.style.color = '#3498db';
                                }, 2000);
                            });
                        }
                    });
                });
            </script>
        </body>
        </html>
        `;
        
        res.send(html);
    } catch (error) {
        console.error('❌ خطأ في إنشاء صفحة QR Code:', error);
        res.status(500).send('خطأ في إنشاء صفحة QR Code');
    }
});

// 🚀 صفحة البوابة التلقائية المحدثة مع QR Code
app.get('/', (req, res) => {
    const nets = networkInterfaces();
    const localIPs = [];
    
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                localIPs.push(net.address);
            }
        }
    }
    
    const ip = localIPs[0] || 'localhost';
    const appUrl = `http://${ip}:${PORT}/client-p2p.html`;
    const qrCodeUrl = `/generate-qrcode?url=${encodeURIComponent(appUrl)}&size=200`;
    
    const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>شبكة نقل الملفات المحلية</title>
        <style>
            :root {
                --primary: #3498db;
                --secondary: #2c3e50;
                --success: #27ae60;
            }
            
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                margin: 0;
                padding: 20px;
                color: white;
                min-height: 100vh;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
            }
            
            .container {
                background: rgba(255, 255, 255, 0.97);
                color: #333;
                padding: 40px;
                border-radius: 25px;
                box-shadow: 0 25px 50px rgba(0,0,0,0.25);
                max-width: 1000px;
                width: 95%;
                text-align: center;
            }
            
            h1 {
                color: var(--secondary);
                margin-bottom: 20px;
                font-size: 2.5em;
                background: linear-gradient(45deg, var(--primary), var(--success));
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
            }
            
            .tagline {
                font-size: 1.3em;
                color: #5a6268;
                margin-bottom: 40px;
            }
            
            .auto-redirect {
                background: linear-gradient(135deg, #d4edda, #c3e6cb);
                color: #155724;
                padding: 20px;
                border-radius: 15px;
                margin: 25px 0;
                border: 2px solid #28a745;
                font-size: 1.1em;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 15px;
            }
            
            .qr-section {
                background: #f8f9fa;
                border-radius: 20px;
                padding: 30px;
                margin: 40px 0;
                border: 3px dashed var(--primary);
            }
            
            .qr-code-container {
                display: inline-block;
                background: white;
                padding: 20px;
                border-radius: 15px;
                margin: 20px 0;
                box-shadow: 0 10px 20px rgba(0,0,0,0.1);
            }
            
            .qr-code-container img {
                width: 200px;
                height: 200px;
                border: 10px solid white;
                border-radius: 10px;
            }
            
            .action-buttons {
                display: flex;
                gap: 20px;
                justify-content: center;
                margin: 30px 0;
                flex-wrap: wrap;
            }
            
            .btn {
                padding: 18px 35px;
                border-radius: 30px;
                text-decoration: none;
                font-weight: bold;
                font-size: 1.1em;
                display: inline-flex;
                align-items: center;
                gap: 12px;
                transition: all 0.3s ease;
                min-width: 200px;
                justify-content: center;
                border: none;
                cursor: pointer;
            }
            
            .btn-primary {
                background: linear-gradient(135deg, var(--primary), #2980b9);
                color: white;
            }
            
            .btn-success {
                background: linear-gradient(135deg, var(--success), #20c997);
                color: white;
            }
            
            .btn-warning {
                background: linear-gradient(135deg, #f39c12, #e67e22);
                color: white;
            }
            
            .btn:hover {
                transform: translateY(-5px);
                box-shadow: 0 15px 25px rgba(0,0,0,0.2);
            }
            
            .features-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 25px;
                margin: 40px 0;
            }
            
            .feature-card {
                background: white;
                padding: 25px;
                border-radius: 15px;
                text-align: center;
                border: 2px solid #e9ecef;
                transition: all 0.3s ease;
            }
            
            .feature-card:hover {
                transform: translateY(-10px);
                border-color: var(--primary);
                box-shadow: 0 15px 30px rgba(52, 152, 219, 0.2);
            }
            
            .feature-icon {
                font-size: 3em;
                margin-bottom: 15px;
                color: var(--primary);
            }
            
            .device-compatibility {
                display: flex;
                justify-content: center;
                gap: 30px;
                margin: 30px 0;
                font-size: 2em;
                color: #6c757d;
            }
            
            .instructions {
                background: #f0f7ff;
                border-radius: 20px;
                padding: 30px;
                margin: 40px 0;
                text-align: right;
                border-right: 8px solid var(--primary);
            }
            
            .instructions ul {
                list-style: none;
                padding: 0;
            }
            
            .instructions li {
                margin: 15px 0;
                padding: 15px;
                background: white;
                border-radius: 12px;
                display: flex;
                align-items: center;
                gap: 20px;
                font-size: 1.1em;
            }
            
            @media (max-width: 768px) {
                .container {
                    padding: 25px;
                }
                
                .action-buttons {
                    flex-direction: column;
                }
                    
                .btn {
                    width: 100%;
                }
            }
        </style>
        <script>
            setTimeout(() => {
                window.location.href = '/client-p2p.html';
            }, 3000);
            
            let seconds = 3;
            const countdownElement = document.getElementById('countdown');
            const countdownInterval = setInterval(() => {
                seconds--;
                countdownElement.textContent = seconds;
                if (seconds <= 0) {
                    clearInterval(countdownInterval);
                }
            }, 1000);
        </script>
    </head>
    <body>
        <div class="container">
            <h1><i class="fas fa-exchange-alt"></i> شبكة نقل الملفات المحلية</h1>
            <p class="tagline">نقل ملفات مباشر بين الأجهزة على نفس الشبكة - بدون إنترنت!</p>
            
            <div class="auto-redirect">
                <i class="fas fa-sync-alt fa-spin"></i>
                <span>جاري توجيهك إلى تطبيق نقل الملفات خلال <span id="countdown">3</span> ثواني...</span>
            </div>
            
            <div class="qr-section">
                <h2 style="color: var(--secondary); margin-bottom: 20px;">
                    <i class="fas fa-qrcode"></i> QR Code للدخول السريع
                </h2>
                <p style="color: #666; margin-bottom: 20px;">قم بمسح هذا الرمز بكاميرا هاتفك للدخول مباشرة</p>
                
                <div class="qr-code-container">
                    <img src="${qrCodeUrl}" alt="QR Code لتطبيق نقل الملفات">
                </div>
            </div>
            
            <div class="action-buttons">
                <a href="/client-p2p.html" class="btn btn-primary">
                    <i class="fas fa-external-link-alt"></i> فتح تطبيق نقل الملفات
                </a>
                <a href="/qrcode-page" class="btn btn-success">
                    <i class="fas fa-qrcode"></i> صفحة QR Code الكاملة
                </a>
                <a href="/generate-qrcode?format=png" class="btn btn-warning">
                    <i class="fas fa-download"></i> تحميل QR Code
                </a>
            </div>
            
            <div class="features-grid">
                <div class="feature-card">
                    <div class="feature-icon"><i class="fas fa-bolt"></i></div>
                    <h3>نقل سريع</h3>
                    <p>نقل ملفات بسرعة عالية على الشبكة المحلية</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon"><i class="fas fa-shield-alt"></i></div>
                    <h3>آمن وخاص</h3>
                    <p>جميع الملفات تبقى على الشبكة المحلية فقط</p>
                </div>
                <div class="feature-card">
                    <div class="feature-icon"><i class="fas fa-users"></i></div>
                    <h3>متعدد الأجهزة</h3>
                    <p>دعم جميع الأجهزة المتصلة بنفس الشبكة</p>
                </div>
            </div>
            
            <div class="instructions">
                <h3 style="color: var(--secondary); margin-bottom: 25px;">
                    <i class="fas fa-graduation-cap"></i> كيفية الاستخدام:
                </h3>
                <ul>
                    <li><i class="fas fa-wifi"></i><span>تأكد من أن جميع الأجهزة على نفس شبكة الواي فاي</span></li>
                    <li><i class="fas fa-qrcode"></i><span>مسح QR Code بكاميرا الهاتف أو فتح الرابط مباشرة</span></li>
                    <li><i class="fas fa-user-friends"></i><span>اختر المستخدم الذي تريد إرسال الملف إليه</span></li>
                    <li><i class="fas fa-file-upload"></i><span>اختر الملف وابدأ عملية النقل المباشرة</span></li>
                </ul>
            </div>
        </div>
        
        <script src="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/js/all.min.js"></script>
    </body>
    </html>`;
    res.send(html);
});

// 🎯 نقاط نهاية Captive Portal Detection
const portalEndpoints = [
    '/generate_204',
    '/hotspot-detect.html',
    '/library/test/success.html',
    '/ncsi.txt',
    '/connecttest.txt',
    '/redirect',
    '/success.txt',
    '/wpad.dat',
    '/connectivitycheck.gstatic.com/generate_204',
    '/captive.apple.com/hotspot-detect.html',
    '/msftconnecttest.com/redirect',
    '/clients3.google.com/generate_204'
];

portalEndpoints.forEach(endpoint => {
    app.get(endpoint, (req, res) => {
        res.redirect('/client-p2p.html');
    });
    
    app.head(endpoint, (req, res) => {
        res.status(302);
        res.set('Location', '/client-p2p.html');
        res.end();
    });
});

// 📊 تخزين المستخدمين المتصلين
const connectedUsers = new Map();
const activeTransfers = new Map();
const userReceivedFiles = new Map();

// 🔌 أحداث Socket.io
io.on('connection', (socket) => {
    console.log('👤 عميل متصل:', socket.id);

    socket.on('register-user', (userData) => {
        const userInfo = {
            id: socket.id,
            username: userData.username,
            device: userData.device,
            ip: socket.handshake.address,
            connectedAt: new Date(),
            avatar: userData.avatar || '👤'
        };
        
        connectedUsers.set(socket.id, userInfo);
        console.log(`✅ ${userData.username} انضم من ${userData.device}`);
        
        broadcastUserList();
        
        const userFiles = userReceivedFiles.get(socket.id) || [];
        socket.emit('user-received-files', userFiles);
        
        socket.emit('registration-complete', {
            userId: socket.id,
            username: userData.username
        });
    });

    socket.on('request-direct-send', (data) => {
        const { targetUserId, fileName, fileSize, fileType } = data;
        const sender = connectedUsers.get(socket.id);
        
        if (!sender) {
            socket.emit('direct-send-error', 'يجب تسجيل الدخول أولاً');
            return;
        }
        
        if (!connectedUsers.has(targetUserId)) {
            socket.emit('direct-send-error', 'المستخدم غير متصل حالياً');
            return;
        }

        const transferId = generateTransferId();
        
        activeTransfers.set(transferId, {
            id: transferId,
            senderId: socket.id,
            receiverId: targetUserId,
            fileName: fileName,
            fileSize: fileSize,
            fileType: fileType,
            status: 'pending',
            startTime: new Date(),
            chunks: []
        });

        socket.to(targetUserId).emit('receive-file-request', {
            transferId: transferId,
            fromUser: sender.username,
            fromUserId: socket.id,
            fileName: fileName,
            fileSize: fileSize,
            fileType: fileType,
            timestamp: new Date().toLocaleTimeString()
        });
        
        console.log(`📤 ${sender.username} يطلب إرسال ${fileName} إلى ${targetUserId}`);
        socket.emit('transfer-request-sent', { transferId: transferId });
    });

    socket.on('accept-file-transfer', (data) => {
        const { transferId } = data;
        const transfer = activeTransfers.get(transferId);
        
        if (!transfer || transfer.receiverId !== socket.id) {
            socket.emit('transfer-error', 'طلب النقل غير صالح');
            return;
        }

        transfer.status = 'accepted';
        transfer.acceptTime = new Date();
        
        console.log(`✅ تم قبول نقل الملف ${transfer.fileName}`);

        socket.to(transfer.senderId).emit('transfer-accepted', {
            transferId: transferId,
            acceptorId: socket.id
        });

        socket.to(transfer.senderId).emit('transfer-ready', {
            transferId: transferId,
            fileName: transfer.fileName
        });
    });

    socket.on('reject-file-transfer', (data) => {
        const { transferId, reason } = data;
        const transfer = activeTransfers.get(transferId);
        
        if (transfer && transfer.receiverId === socket.id) {
            socket.to(transfer.senderId).emit('transfer-rejected', {
                transferId: transferId,
                reason: reason || 'رفض المستخدم الاستقبال'
            });
            
            activeTransfers.delete(transferId);
            console.log(`❌ تم رفض نقل الملف ${transfer.fileName}`);
        }
    });

    socket.on('send-file-chunk', (data) => {
        const { transferId, chunkIndex, totalChunks, chunkData, isLastChunk } = data;
        const transfer = activeTransfers.get(transferId);
        
        if (!transfer) {
            socket.emit('transfer-error', 'النقل غير موجود');
            return;
        }

        if (transfer.status !== 'accepted') {
            socket.emit('transfer-error', 'النقل غير مسموح به - لم يتم القبول بعد');
            return;
        }

        const chunkPath = path.join(CHUNK_DIR, `${transferId}_chunk_${chunkIndex}`);
        fs.writeFileSync(chunkPath, Buffer.from(chunkData, 'base64'));
        transfer.chunks[chunkIndex] = chunkPath;

        socket.to(transfer.receiverId).emit('receive-file-chunk', {
            transferId: transferId,
            chunkIndex: chunkIndex,
            totalChunks: totalChunks,
            chunkData: chunkData,
            isLastChunk: isLastChunk
        });

        const progress = Math.round((chunkIndex / totalChunks) * 100);
        socket.emit('transfer-progress', {
            transferId: transferId,
            progress: progress,
            chunkIndex: chunkIndex,
            totalChunks: totalChunks
        });

        console.log(`📊 تقدم النقل ${transferId}: ${progress}%`);

        if (isLastChunk) {
            assembleFileOnServer(transferId, transfer, socket);
        }
    });

    function assembleFileOnServer(transferId, transfer, socket) {
        const finalPath = path.join(UPLOAD_DIR, transfer.fileName);
        const writeStream = fs.createWriteStream(finalPath);

        function assembleChunk(i) {
            if (i < transfer.chunks.length) {
                const chunkPath = transfer.chunks[i];
                if (chunkPath && fs.existsSync(chunkPath)) {
                    const readStream = fs.createReadStream(chunkPath);
                    
                    readStream.pipe(writeStream, { end: false });
                    readStream.on('end', () => {
                        fs.unlinkSync(chunkPath);
                        assembleChunk(i + 1);
                    });
                    
                    readStream.on('error', (err) => {
                        console.error('❌ خطأ في قراءة القطعة:', err);
                        socket.emit('transfer-error', 'فشل في تجميع الملف');
                    });
                } else {
                    assembleChunk(i + 1);
                }
            } else {
                writeStream.end();
                writeStream.on('finish', () => {
                    transfer.status = 'completed';
                    transfer.endTime = new Date();
                    transfer.filePath = finalPath;
                    
                    const receiverFiles = userReceivedFiles.get(transfer.receiverId) || [];
                    receiverFiles.push({
                        id: generateFileId(),
                        fileName: transfer.fileName,
                        fileSize: transfer.fileSize,
                        fileType: transfer.fileType,
                        filePath: `/downloads/${transfer.fileName}`,
                        sender: connectedUsers.get(transfer.senderId)?.username || 'مستخدم مجهول',
                        receivedAt: new Date(),
                        downloadUrl: `/downloads/${transfer.fileName}`
                    });
                    userReceivedFiles.set(transfer.receiverId, receiverFiles);
                    
                    socket.emit('transfer-complete', { 
                        transferId: transferId,
                        fileName: transfer.fileName,
                        fileUrl: `/downloads/${transfer.fileName}`
                    });
                    
                    socket.to(transfer.receiverId).emit('transfer-complete', { 
                        transferId: transferId,
                        fileName: transfer.fileName,
                        fileUrl: `/downloads/${transfer.fileName}`,
                        fileInfo: {
                            fileName: transfer.fileName,
                            fileSize: transfer.fileSize,
                            sender: connectedUsers.get(transfer.senderId)?.username,
                            receivedAt: new Date()
                        }
                    });

                    socket.to(transfer.receiverId).emit('user-received-files', receiverFiles);
                    
                    console.log(`🎉 تم اكتمال نقل الملف ${transfer.fileName}`);
                    
                    setTimeout(() => {
                        activeTransfers.delete(transferId);
                    }, 60000);
                });
            }
        }
        assembleChunk(0);
    }

    socket.on('cancel-transfer', (data) => {
        const { transferId } = data;
        const transfer = activeTransfers.get(transferId);
        
        if (transfer && transfer.senderId === socket.id) {
            transfer.chunks.forEach(chunkPath => {
                if (chunkPath && fs.existsSync(chunkPath)) {
                    fs.unlinkSync(chunkPath);
                }
            });
            
            socket.to(transfer.receiverId).emit('transfer-cancelled', {
                transferId: transferId,
                reason: 'ألغى المرسل النقل'
            });
            
            activeTransfers.delete(transferId);
            console.log(`🚫 تم إلغاء نقل الملف ${transfer.fileName}`);
        }
    });

    socket.on('get-received-files', () => {
        const userFiles = userReceivedFiles.get(socket.id) || [];
        socket.emit('user-received-files', userFiles);
    });

    socket.on('delete-received-file', (data) => {
        const { fileId } = data;
        const userFiles = userReceivedFiles.get(socket.id) || [];
        const fileIndex = userFiles.findIndex(file => file.id === fileId);
        
        if (fileIndex !== -1) {
            const file = userFiles[fileIndex];
            const filePath = path.join(UPLOAD_DIR, file.fileName);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
            
            userFiles.splice(fileIndex, 1);
            userReceivedFiles.set(socket.id, userFiles);
            
            socket.emit('file-deleted', { fileId: fileId });
            console.log(`🗑️ تم حذف الملف: ${file.fileName}`);
        }
    });

    socket.on('send-direct-message', (data) => {
        const { targetUserId, message } = data;
        const sender = connectedUsers.get(socket.id);
        
        if (sender && connectedUsers.has(targetUserId)) {
            socket.to(targetUserId).emit('receive-direct-message', {
                fromUser: sender.username,
                fromUserId: socket.id,
                message: message,
                timestamp: new Date().toLocaleTimeString()
            });
        }
    });

    socket.on('get-users', () => {
        const usersList = Array.from(connectedUsers.values()).map(user => ({
            id: user.id,
            username: user.username,
            device: user.device,
            avatar: user.avatar,
            connectedAt: user.connectedAt
        }));
        
        socket.emit('users-list', usersList);
    });

    socket.on('disconnect', (reason) => {
        const user = connectedUsers.get(socket.id);
        if (user) {
            console.log(`👋 ${user.username} انقطع - السبب: ${reason}`);
            connectedUsers.delete(socket.id);
            broadcastUserList();
            
            for (const [transferId, transfer] of activeTransfers.entries()) {
                if (transfer.senderId === socket.id || transfer.receiverId === socket.id) {
                    transfer.chunks.forEach(chunkPath => {
                        if (chunkPath && fs.existsSync(chunkPath)) {
                            fs.unlinkSync(chunkPath);
                        }
                    });
                    
                    const otherUserId = transfer.senderId === socket.id ? transfer.receiverId : transfer.senderId;
                    if (connectedUsers.has(otherUserId)) {
                        socket.to(otherUserId).emit('transfer-error', 'انقطع اتصال المستخدم');
                    }
                    activeTransfers.delete(transferId);
                }
            }
        }
    });

    socket.on('error', (error) => {
        console.error('❌ خطأ في السوكت:', error);
    });
});

function broadcastUserList() {
    const usersList = Array.from(connectedUsers.values()).map(user => ({
        id: user.id,
        username: user.username,
        device: user.device,
        avatar: user.avatar,
        connectedAt: user.connectedAt
    }));
    
    io.emit('users-list', usersList);
}

function generateTransferId() {
    return 'transfer_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function generateFileId() {
    return 'file_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

setInterval(() => {
    const now = Date.now();
    const maxAge = 30 * 60 * 1000;
    
    for (const [transferId, transfer] of activeTransfers.entries()) {
        if (now - transfer.startTime.getTime() > maxAge) {
            transfer.chunks.forEach(chunkPath => {
                if (chunkPath && fs.existsSync(chunkPath)) {
                    fs.unlinkSync(chunkPath);
                }
            });
            activeTransfers.delete(transferId);
            console.log(`🧹 تم تنظيف النقل المنتهي: ${transferId}`);
        }
    }
    
    fs.readdir(CHUNK_DIR, (err, files) => {
        if (err) return;
        files.forEach(file => {
            const filePath = path.join(CHUNK_DIR, file);
            fs.stat(filePath, (err, stats) => {
                if (!err && (now - stats.mtime.getTime() > maxAge)) {
                    fs.unlinkSync(filePath);
                    console.log(`🧹 تم تنظيف القطعة المؤقتة: ${file}`);
                }
            });
        });
    });
}, 10 * 60 * 1000);

function startCaptivePortalServer() {
    const portalServer = net.createServer((socket) => {
        const response = 
            'HTTP/1.1 302 Found\r\n' +
            'Location: http://' + getLocalIP() + ':' + PORT + '\r\n' +
            'Connection: close\r\n' +
            '\r\n';
        socket.write(response);
        socket.end();
    });

    portalServer.listen(PORTAL_PORT, '0.0.0.0', () => {
        console.log(`🎯 خادم Captive Portal يعمل على المنفذ ${PORTAL_PORT}`);
    }).on('error', (err) => {
        if (err.code === 'EACCES') {
            console.log('⚠️  لا يمكن تشغيل خادم Captive Portal على المنفذ 80 (يتطلب صلاحيات root)');
            console.log('💡 لتفعيل الميزة الكاملة، قم بتشغيل أحد الأمرين:');
            console.log('   1. sudo node server.js');
            console.log('   2. sudo iptables -t nat -A PREROUTING -p tcp --dport 80 -j REDIRECT --to-port ' + PORT);
        }
    });
}

server.listen(PORT, '0.0.0.0', () => {
    const nets = networkInterfaces();
    const localIPs = [];
    
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                localIPs.push(net.address);
            }
        }
    }
    
    console.log('🚀 تطبيق نقل الملفات المباشر يعمل الآن!');
    console.log('══════════════════════════════════════════════════════════════════');
    console.log(`📍 على جهازك: http://localhost:${PORT}/client-p2p.html`);
    console.log('🌐 على الشبكة المحلية:');
    localIPs.forEach(ip => {
        console.log(`   • http://${ip}:${PORT}/client-p2p.html`);
    });
    console.log('══════════════════════════════════════════════════════════════════');
    console.log('🎯 روابط Captive Portal (للفتح التلقائي):');
    localIPs.forEach(ip => {
        console.log(`   • http://${ip} (سيفتح التطبيق تلقائياً)`);
    });
    console.log('══════════════════════════════════════════════════════════════════');
    console.log('📱 QR Code للدخول السريع:');
    localIPs.forEach(ip => {
        console.log(`   • http://${ip}:${PORT}/qrcode-page (صفحة QR Code كاملة)`);
        console.log(`   • http://${ip}:${PORT}/generate-qrcode (تحميل QR Code)`);
    });
    console.log('══════════════════════════════════════════════════════════════════');
    console.log('📁 مجلد التحميلات:', UPLOAD_DIR);
    console.log('💡 المميزات المتاحة:');
    console.log('   • إرسال مباشر بين الأجهزة (P2P)');
    console.log('   • عرض الملفات المستقبلة تلقائياً');
    console.log('   • Captive Portal Detection');
    console.log('   • QR Code للدخول السريع');
    console.log('   • إدارة الملفات المستقبلة');
    console.log('   • واجهة مستخدم محسنة');
    console.log('══════════════════════════════════════════════════════════════════');
    
    startCaptivePortalServer();
});

function getLocalIP() {
    const nets = networkInterfaces();
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                return net.address;
            }
        }
    }
    return 'localhost';
}

process.on('uncaughtException', (error) => {
    console.error('❌ خطأ غير متوقع:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ رفض وعد غير معالج:', reason);
});