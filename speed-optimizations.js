// speed-optimizations.js - تحسينات إضافية للسرعة

module.exports = {
    // تحسين إعدادات النظام
    systemOptimizations: {
        // تحسين إعدادات الذاكرة
        memory: {
            maxOldSpaceSize: '4096', // 4GB للذاكرة القديمة
            maxSemiSpaceSize: '128', // 128MB للذاكرة شبه المنفصلة
            maxHeapSize: '2048' // 2GB للـ Heap
        },
        
        // تحسين إعدادات الشبكة
        network: {
            tcpFastOpen: true,
            tcpNoDelay: true,
            keepAlive: true,
            keepAliveInterval: 30000,
            maxSockets: Infinity
        },
        
        // تحسين إعدادات الملفات
        fileSystem: {
            highWaterMark: 64 * 1024 * 1024, // 64MB buffer
            autoClose: true,
            emitClose: true
        }
    },

    // خوارزميات ضغط متقدمة
    compressionAlgorithms: {
        gzip: {
            level: 6, // مستوى ضغط متوازن
            memLevel: 8, // استخدام ذاكرة أكثر للضغط
            windowBits: 15
        },
        
        deflate: {
            level: 6,
            memLevel: 8,
            windowBits: 15
        },
        
        brotli: {
            enabled: false, // يحتاج Node.js 11.7.0+
            quality: 4,
            windowSize: 22
        }
    },

    // تحسينات نقل البيانات
    dataTransfer: {
        // إرسال متوازي
        parallel: {
            maxWorkers: 4,
            chunkSize: {
                small: 64 * 1024, // 64KB للملفات الصغيرة
                medium: 256 * 1024, // 256KB للملفات المتوسطة
                large: 1024 * 1024 // 1MB للملفات الكبيرة
            },
            queueSize: 100
        },
        
        // تجزئة ذكية
        smartChunking: {
            enabled: true,
            minChunkSize: 16 * 1024, // 16KB كحد أدنى
            maxChunkSize: 4 * 1024 * 1024, // 4MB كحد أقصى
            adaptive: true // تكيف تلقائي مع الشبكة
        },
        
        // استئناف النقل
        resumable: {
            enabled: true,
            checkpointInterval: 10, // نقطة تحقق كل 10 قطع
            maxRetries: 3
        }
    },

    // تحسينات التخزين المؤقت
    caching: {
        memory: {
            maxItems: 1000,
            ttl: 5 * 60 * 1000, // 5 دقائق
            updateAgeOnGet: true
        },
        
        disk: {
            enabled: true,
            path: './.cache',
            maxSize: 100 * 1024 * 1024, // 100MB
            ttl: 24 * 60 * 60 * 1000 // 24 ساعة
        },
        
        network: {
            enabled: true,
            maxAge: 3600, // ساعة واحدة
            mustRevalidate: false
        }
    },

    // مراقبة الأداء
    performanceMonitoring: {
        metrics: {
            transferSpeed: true,
            memoryUsage: true,
            cpuUsage: true,
            networkLatency: true
        },
        
        sampling: {
            interval: 1000, // كل ثانية
            retention: 60 // 60 عينة
        },
        
        alerts: {
            slowTransfer: 100 * 1024, // تحذير إذا كانت السرعة < 100KB/s
            highMemory: 0.8, // تحذير إذا استخدمت 80% من الذاكرة
            highCpu: 0.7 // تحذير إذا استخدمت 70% من المعالج
        }
    },

    // تحسينات الأمان مع الحفاظ على السرعة
    security: {
        encryption: {
            enabled: false, // يمكن تفعيله إذا كانت السرعة تسمح
            algorithm: 'aes-256-gcm',
            keySize: 32
        },
        
        validation: {
            checksum: true,
            hashAlgorithm: 'sha256',
            verifyOnReceive: true
        },
        
        limits: {
            maxFileSize: 4 * 1024 * 1024 * 1024, // 4GB
            maxConnections: 100,
            rateLimit: 1000 // 1000 طلب/ثانية
        }
    },

    // نصائح تحسين إضافية
    optimizationTips: [
        'استخدم WebSocket بدلاً من HTTP Long Polling',
        'فعل GZIP للبيانات النصية',
        'استخدم CDN للملفات الثابتة',
        'خزن الملفات المؤقتة في RAM Disk إذا أمكن',
        'استخدم HTTP/2 إذا كان مدعوماً',
        'فعل TCP_NODELAY لتقليل التأخير',
        'استخدم Keep-Alive للاتصالات',
        'خزن النتائج المتوقعة في الذاكرة المؤقتة',
        'استخدم Streams بدلاً من Buffers للملفات الكبيرة',
        'فعل Parallel Processing للمهام المستقلة'
    ]
};