const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

// 1. Backend API Rotaları
app.use('/api', createProxyMiddleware({
    target: 'http://localhost:8000',
    changeOrigin: true,
    onProxyReq: (proxyReq) => {
        proxyReq.setHeader('ngrok-skip-browser-warning', 'true');
    }
}));

// 2. Statik Dosyalar (Uploads)
app.use('/uploads', createProxyMiddleware({
    target: 'http://localhost:8000',
    changeOrigin: true,
}));

// 3. Socket.IO (Websocket desteği ile)
app.use('/socket.io', createProxyMiddleware({
    target: 'http://localhost:3001',
    ws: true,
    changeOrigin: true,
    logLevel: 'debug'
}));

// 4. Frontend (Vite üzerinden)
app.use('/', createProxyMiddleware({
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
