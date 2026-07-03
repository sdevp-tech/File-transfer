#!/usr/bin/env node
// generate-static-qr.js
// إنشاء QR Code ثابت للتطبيق

const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const { networkInterfaces } = require('os');

console.log('📱 جاري إنشاء QR Code ثابت للتطبيق...');

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

async function generateStaticQR() {
    try {
        const ip = getLocalIP();
        const port = process.env.PORT || 3000;
        const appUrl = `http://${ip}:${port}/client-p2p.html`;
        
        const qrDir = path.join(__dirname, 'qrcodes');
        if (!fs.existsSync(qrDir)) {
            fs.mkdirSync(qrDir, { recursive: true });
            console.log('✅ تم إنشاء مجلد qrcodes');
        }
        
        const qrPath = path.join(qrDir, 'static-qrcode.png');
        await QRCode.toFile(qrPath, appUrl, {
            width: 400,
            margin: 2,
            color: {
                dark: '#2c3e50',
                light: '#ffffff'
            }
        });
        
        console.log('✅ تم إنشاء QR Code ثابت:', qrPath);
        console.log('🔗 الرابط:', appUrl);
        
        const htmlContent = `
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>QR Code - تطبيق نقل الملفات</title>
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
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    padding: 20px;
                }
                
                .container {
                    background: white;
                    padding: 40px;
                    border-radius: 25px;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.15);
                    text-align: center;
                    max-width: 500px;
                }
                
                h1 {
                    color: #2c3e50;
                    margin-bottom: 20px;
                    font-size: 2em;
                }
                
                .qr-image {
                    margin: 30px 0;
                    padding: 20px;
                    background: #f8f9fa;
                    border-radius: 15px;
                    display: inline-block;
                }
                
                .qr-image img {
                    width: 300px;
                    height: 300px;
                    border: 15px solid white;
                    border-radius: 10px;
                }
                
                .url-display {
                    background: #e9ecef;
                    padding: 20px;
                    border-radius: 15px;
                    margin: 25px 0;
                    word-break: break-all;
                    direction: ltr;
                }
                
                .instructions {
                    background: #f0f7ff;
                    border-radius: 15px;
                    padding: 25px;
                    margin: 25px 0;
                    text-align: right;
                }
                
                .btn {
                    display: inline-block;
                    background: linear-gradient(135deg, #3498db, #2980b9);
                    color: white;
                    padding: 15px 30px;
                    border-radius: 25px;
                    text-decoration: none;
                    font-weight: bold;
                    margin: 10px;
                    transition: all 0.3s ease;
                }
                
                .btn:hover {
                    transform: translateY(-3px);
                    box-shadow: 0 10px 20px rgba(0,0,0,0.2);
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1><i class="fas fa-qrcode"></i> QR Code لتطبيق نقل الملفات</h1>
                <p>قم بمسح هذا الرمز بكاميرا هاتفك للدخول إلى التطبيق</p>
                
                <div class="qr-image">
                    <img src="static-qrcode.png" alt="QR Code">
                </div>
                
                <div class="url-display">
                    <strong>الرابط:</strong><br>
                    <a href="${appUrl}">${appUrl}</a>
                </div>
                
                <div class="instructions">
                    <h3>كيفية الاستخدام:</h3>
                    <ul style="list-style: none; padding: 0;">
                        <li style="margin: 10px 0; padding: 10px; background: white; border-radius: 10px;">
                            <i class="fas fa-camera"></i> افتح كاميرا هاتفك ووجهها نحو QR Code
                        </li>
                        <li style="margin: 10px 0; padding: 10px; background: white; border-radius: 10px;">
                            <i class="fas fa-wifi"></i> تأكد من أن الهاتف على نفس شبكة الكمبيوتر
                        </li>
                        <li style="margin: 10px 0; padding: 10px; background: white; border-radius: 10px;">
                            <i class="fas fa-mouse-pointer"></i> اضغط على الرابط الذي يظهر
                        </li>
                    </ul>
                </div>
                
                <a href="${appUrl}" class="btn">
                    <i class="fas fa-external-link-alt"></i> فتح التطبيق
                </a>
                
                <a href="static-qrcode.png" download="file-transfer-qrcode.png" class="btn" style="background: linear-gradient(135deg, #27ae60, #20c997);">
                    <i class="fas fa-download"></i> تحميل QR Code
                </a>
            </div>
            
            <script src="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/js/all.min.js"></script>
        </body>
        </html>
        `;
        
        const htmlPath = path.join(qrDir, 'index.html');
        fs.writeFileSync(htmlPath, htmlContent);
        console.log('📄 تم إنشاء صفحة HTML:', htmlPath);
        
        console.log('\n🎯 QR Code جاهز للاستخدام!');
        console.log('══════════════════════════════════════════════════');
        console.log('📱 افتح ملف index.html في مجلد qrcodes لعرض QR Code');
        console.log('🔗 أو افتح الرابط:', appUrl);
        console.log('══════════════════════════════════════════════════');
        
    } catch (error) {
        console.error('❌ خطأ في إنشاء QR Code:', error);
        process.exit(1);
    }
}

generateStaticQR();