const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

/**
 * PATH STRIPPING OLMAMASI İÇİN:
 * app.use('/api', ...) yerine app.use(createProxyMiddleware({ pathFilter: '/api', ... })) 
 * kullanıyoruz. Bu sayede Express path'i kırpmaz ve Backend /api/ prefix'ini olduğu gibi alır.
 */

// 1. Backend API Rotaları
const CORE_API_URL = process.env.CORE_API_URL || 'http://localhost:8000';
app.use(createProxyMiddleware({
    pathFilter: '/api',
    target: CORE_API_URL,
    changeOrigin: true,
    onProxyReq: (proxyReq) => {
        proxyReq.setHeader('ngrok-skip-browser-warning', 'true');
    }
}));

// 2. Statik Dosyalar (Uploads)
app.use(createProxyMiddleware({
    pathFilter: '/uploads',
    target: CORE_API_URL,
    changeOrigin: true,
}));

// 3. Socket.IO (Websocket desteği ile)
const SOCKET_API_URL = process.env.SOCKET_API_URL || 'http://localhost:3001';
app.use(createProxyMiddleware({
    pathFilter: '/socket.io',
    target: SOCKET_API_URL,
    ws: true,
    changeOrigin: true,
    logLevel: 'debug'
}));

const path = require('path');

// 4. Frontend (Statik Dosyalar - Production Build)
// Eğer 'dist' dizini varsa oradan sun, yoksa (gelistirme asamasindaysak) proxy yapmaya devam et.
const frontendPath = path.join(__dirname, 'frontend', 'dist');
if (require('fs').existsSync(frontendPath)) {
    console.log(`✨ Frontend Dist dizini bulundu, statik olarak sunuluyor: ${frontendPath}`);
    app.use(express.static(frontendPath));
    // SPA desteği için her şeyi index.html'e yönlendir (API/Socket rotaları hariç)
    app.use((req, res, next) => {
        if (req.method !== 'GET') return next();
        if (!req.url.startsWith('/api') && !req.url.startsWith('/socket.io') && !req.url.startsWith('/uploads')) {
            res.sendFile(path.join(frontendPath, 'index.html'));
        } else {
            next();
        }
    });
} else {
    app.use(createProxyMiddleware({
        pathFilter: '/',
        target: 'http://localhost:5173',
        changeOrigin: true,
    }));
}

const PORT = process.env.PORT || 9000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 FROGCORD GATEWAY ÇALIŞIYOR!`);
    console.log(`-------------------------------`);
    console.log(`👉 Link: http://localhost:${PORT}`);
    console.log(`-------------------------------\n`);
});
