#!/bin/bash

# Renkli çıktı için renkler
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}Frogcord Başlatılıyor...${NC}"

# Dizini belirle
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Eski süreçleri temizle
echo -e "${BLUE}Eski süreçler temizleniyor (Portlar: 8000, 3001, 5173)...${NC}"
fuser -k 8000/tcp 3001/tcp 5173/tcp > /dev/null 2>&1 || true

# Veritabanını yeni tag sistemine göre sıfırla (Bir kerelik)
# .db_migrated dosyası yoksa veritabanını siler ve dosyayı oluşturur.
if [ ! -f .db_migrated ]; then
    echo -e "${RED}Yeni sistem için veritabanı sıfırlanıyor...${NC}"
    rm -f core-api/discord_clone.db
    touch .db_migrated
fi

# 1. Backend
echo -e "${GREEN}1/4 Backend başlatılıyor...${NC}"
cd "$SCRIPT_DIR/core-api"
nohup ./venv/bin/python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 > ../backend.log 2>&1 &
BACKEND_PID=$!

# 2. Socket API
echo -e "${GREEN}2/4 Socket API başlatılıyor...${NC}"
cd "$SCRIPT_DIR/socket-api"
nohup node index.js > ../socket.log 2>&1 &
SOCKET_PID=$!

# 3. Frontend
echo -e "${GREEN}3/4 Frontend başlatılıyor...${NC}"
cd "$SCRIPT_DIR/frontend"
nohup npm run dev -- --host > ../frontend.log 2>&1 &
FRONTEND_PID=$!

cd "$SCRIPT_DIR"

# Servisleri Bekle
echo -e "${BLUE}Servislerin hazır olması bekleniyor (8s)...${NC}"
sleep 10

# 4. Electron
echo -e "${GREEN}4/4 Electron başlatılıyor...${NC}"
npm run electron:start

echo -e "${BLUE}Hepsini kapatmak için: fuser -k 8000/tcp 3001/tcp 5173/tcp${NC}"
