from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
import os

# İleride bir .env dosyasına alacağız ama şimdilik geliştirme için localhost
# PostgreSQL kullandığını varsayarak örnek bir bağlantı adresi (URL) ekliyorum
# Eğer PostgreSQL yüklü değilse basit testler için sqlite:///./frogcord.db kullanılabilir
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./frogcord.db")

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    # SQLite kullanıyorsak aynı thread içinde çalışması için bu ayar gerekli
    connect_args={"check_same_thread": False} if "sqlite" in SQLALCHEMY_DATABASE_URL else {}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
