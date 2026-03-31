# core-api/Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Bağımlılıkları kur
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Uygulama kodlarını kopyala
COPY . .

# SQLite db dosyasının yazılabilir olduğundan emin ol
RUN chmod 777 .

# Portu aç
EXPOSE 8000

# Uygulamayı başlat
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
