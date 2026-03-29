#!/bin/bash

# Renkli çıktı için renkler
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Yapılandırma
FRONTEND_ENV="frontend/.env"
FRONTEND_ENV_BAK="frontend/.env.original"
GATEWAY_PORT=9000

echo -e "${BLUE}Frogcord with Ngrok (Gateway Mode) Başlatılıyor...${NC}"

# Çıkış işlemi (Ctrl+C)
cleanup() {
    echo -e "\n${RED}Servisler durduruluyor...${NC}"
    # Süreçleri temizle (Ports: API:8000, Socket:3001, Frontend:5173, Gateway:9000, Ngrok:4040)
    fuser -k 8000/tcp 3001/tcp 5173/tcp 9000/tcp 4040/tcp > /dev/null 2>&1 || true
    
    # .env dosyasını geri yükle
    if [ -f "$FRONTEND_ENV_BAK" ]; then
        mv "$FRONTEND_ENV_BAK" "$FRONTEND_ENV"
        echo -e "${YELLOW}Orijinal .env dosyası geri yüklendi.${NC}"
    fi
    exit
}
trap cleanup SIGINT SIGTERM

# Eski süreçleri temizle
echo -e "${BLUE}Eski süreçler temizleniyor...${NC}"
fuser -k 8000/tcp 3001/tcp 5173/tcp 9000/tcp 4040/tcp > /dev/null 2>&1 || true

# .env yedeğini al
if [ ! -f "$FRONTEND_ENV_BAK" ]; then
    cp "$FRONTEND_ENV" "$FRONTEND_ENV_BAK"
fi

# 1. Ana Servisleri Başlat (Backend, Socket, Frontend)
echo -e "${GREEN}1. Backend, Socket ve Frontend başlatılıyor...${NC}"
cd core-api
source venv/bin/activate
uvicorn app.main:app --port 8000 > ../backend.log 2>&1 &
cd ..
cd socket-api
node index.js > ../socket.log 2>&1 &
cd ..
cd frontend
npm run dev > ../frontend.log 2>&1 &
cd ..

# 2. Gateway Başlat (Tek Port Üzerinden her şeyi yönetir)
echo -e "${GREEN}2. API Gateway başlatılıyor (Port $GATEWAY_PORT)...${NC}"
node gateway.js > gateway.log 2>&1 &

# 3. Ngrok Başlat (Sadece Gateway portuna tünel açar)
echo -e "${GREEN}3. Ngrok başlatılıyor...${NC}"
# User'ın authtoken'ını ngrok_config.yml'den alabiliriz veya direkt kullanabiliriz.
# Free planlarda tek tünel kısıtlaması nedeniyle gateway en garanti yöntemdir.
ngrok http $GATEWAY_PORT --log=stdout > ngrok.log 2>&1 &

echo -e "${YELLOW}URL bekleniyor...${NC}"
sleep 15

# URL'yi al
URL=$(curl -s http://localhost:4040/api/tunnels | jq -r '.tunnels[0].public_url')

if [ -z "$URL" ] || [ "$URL" == "null" ]; then
    echo -e "${RED}Hata: Ngrok URL'si alınamadı. ngrok.log dosyasını kontrol edin.${NC}"
    cat ngrok.log
    cleanup
fi

# 4. .env Dosyasını Güncelle
echo -e "${GREEN}4. Frontend .env güncelleniyor -> $URL${NC}"
echo "VITE_API_BASE_URL=$URL" > "$FRONTEND_ENV"
echo "VITE_SOCKET_URL=$URL" >> "$FRONTEND_ENV"

echo -e "\n${BLUE}==================================================${NC}"
echo -e "${GREEN}TÜM SERVİSLER NGROK ÜZERİNDEN ÇALIŞIYOR!${NC}"
echo -e "${BLUE}Uygulama Linki:${NC} ${YELLOW}$URL${NC}"
echo -e "${BLUE}==================================================${NC}"
echo -e "Kapatmak için Ctrl+C tuşuna basın."

# Bekle
wait
