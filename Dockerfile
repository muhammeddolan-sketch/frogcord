# -- AŞAMA 1: FRONTEND BUILD --
FROM node:20-slim AS builder
WORKDIR /app/frontend

# Bağımlılıkları kur
COPY frontend/package*.json ./
RUN npm install

# Frontend kodunu kopyala ve build et
COPY frontend/ ./
RUN npm run build

# -- AŞAMA 2: GATEWAY --
FROM node:20-slim
WORKDIR /app

# Gateway bağımlılıklarını kur (Root package.json)
COPY package*.json ./
RUN npm install --production

# Gateway kodunu ve Frontend build çıktılarını kopyala
COPY gateway.js .
COPY --from=builder /app/frontend/dist ./frontend/dist

# Gateway portunu aç
EXPOSE 9000

# Gateway'i başlat
CMD ["node", "gateway.js"]
