# socket-api/Dockerfile
FROM node:20-slim

WORKDIR /app

# Bağımlılıkları kur
COPY package*.json ./
RUN npm install --production

# Uygulama kodlarını kopyala
COPY . .

# Portu aç (Socket portu 3001 olarak ayarlandı)
EXPOSE 3001

# Uygulamayı başlat
CMD ["node", "index.js"]
