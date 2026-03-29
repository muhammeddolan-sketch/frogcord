const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

/**
 * PATH STRIPPING OLMAMASI İÇİN:
 * app.use('/api', ...) yerine app.use(createProxyMiddleware({ pathFilter: '/api', ... })) 
 * kullanıyoruz. Bu sayede Express path'i kırpmaz ve Backend /api/ prefix'ini olduğu gibi alır.
 */

// 1. Backend API Rotaları
app.use(createProxyMiddleware({
    pathFilter: '/api',
    target: 'http://localhost:8000',
    changeOrigin: true,
    onProxyReq: (proxyReq) => {
        proxyReq.setHeader('ngrok-skip-browser-warning', 'true');
    }
}));

// 2. Statik Dosyalar (Uploads)
app.use(createProxyMiddleware({
    pathFilter: '/uploads',
    target: 'http://localhost:8000',
    changeOrigin: true,
}));

// 3. Socket.IO (Websocket desteği ile)
app.use(createProxyMiddleware({
    pathFilter: '/socket.io',
    target: 'http://localhost:3001',
    ws: true,
    changeOrigin: true,
    logLevel: 'debug'
}));

// 4. Frontend (Vite)
app.use(createProxyMiddleware({
    pathFilter: '/',
    target: 'http://localhost:5173',
    changeOrigin: true,
}));

const PORT = 9000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 FROGCORD GATEWAY ÇALIŞIYOR!`);
    console.log(`-------------------------------`);
    console.log(`👉 Link: http://localhost:${PORT}`);
    console.log(`-------------------------------\n`);
});
