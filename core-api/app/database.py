from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
import os

# İleride bir .env dosyasına alacağız ama şimdilik geliştirme için localhost
# PostgreSQL kullandığını varsayarak örnek bir bağlantı adresi (URL) ekliyorum
# Eğer PostgreSQL yüklü değilse basit testler için sqlite:///./discord_clone.db kullanılabilir
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./discord_clone.db")

# SQLAlchemy 1.4+ da postgres:// yerine postgresql:// kullanılması gerekir
if SQLALCHEMY_DATABASE_URL and SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(
    SQLALCHEMY_DATABASE_URL
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
