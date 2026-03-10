from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from datetime import timedelta
# Removed passlib import
import uuid, os, shutil

from . import models, schemas, database, auth_utils

# Tablolar yoksa oluştur
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="Discord Clone Core API")

# Statik dosyalar (avatar ve guild ikonları)
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads")
os.makedirs(os.path.join(UPLOAD_DIR, "avatars"), exist_ok=True)
os.makedirs(os.path.join(UPLOAD_DIR, "guilds"), exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

import bcrypt

def get_password_hash(password: str) -> str:
    pwd_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(pwd_bytes, salt)
    return hashed.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    password_byte_enc = plain_password.encode('utf-8')
    hashed_password_enc = hashed_password.encode('utf-8')
    return bcrypt.checkpw(password_byte_enc, hashed_password_enc)

def save_upload(file: UploadFile, folder: str) -> str:
    ext = os.path.splitext(file.filename)[1].lower() or ".png"
    filename = f"{uuid.uuid4()}{ext}"
    path = os.path.join(UPLOAD_DIR, folder, filename)
    with open(path, "wb") as f:
        shutil.copyfileobj(file.file, f)
    return f"/uploads/{folder}/{filename}"

# ─── Sağlık ────────────────────────────────────
@app.get("/")
def read_root():
    return {"message": "Discord Core API Çalışıyor! 🐸"}

# ─── AUTH ──────────────────────────────────────
@app.post("/api/auth/register", response_model=schemas.UserResponse)
def register_user(user: schemas.UserCreate, db: Session = Depends(database.get_db)):
    if db.query(models.User).filter(models.User.email == user.email).first():
        raise HTTPException(400, "Bu email zaten kayıtlı.")
    if db.query(models.User).filter(models.User.username == user.username).first():
        raise HTTPException(400, "Bu kullanıcı adı alınmış.")
    new_user = models.User(
        email=user.email, username=user.username,
        display_name=user.display_name or user.username,
        hashed_password=get_password_hash(user.password)
    )
    db.add(new_user); db.commit(); db.refresh(new_user)
    return new_user

@app.post("/api/auth/login", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(
        (models.User.username == form_data.username) | (models.User.email == form_data.username)
    ).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Yanlış kullanıcı adı veya şifre")
    token = auth_utils.create_access_token(
        {"sub": user.username}, timedelta(minutes=auth_utils.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return {"access_token": token, "token_type": "bearer"}

@app.get("/api/users/me", response_model=schemas.UserResponse)
def me(current_user: models.User = Depends(auth_utils.get_current_user)):
    return current_user

# ─── KULLANICI PROFİL DÜZENLEME ───────────────
@app.patch("/api/users/me", response_model=schemas.UserResponse)
def update_profile(
    display_name: str = Form(None),
    avatar: UploadFile = File(None),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth_utils.get_current_user)
):
    if display_name:
        current_user.display_name = display_name
    if avatar and avatar.filename:
        url = save_upload(avatar, "avatars")
        current_user.avatar_url = url
    db.commit(); db.refresh(current_user)
    return current_user

# ─── GUILD (SUNUCU) ───────────────────────────
@app.post("/api/guilds", response_model=schemas.GuildResponse)
def create_guild(
    name: str = Form(...),
    description: str = Form(""),
    icon: UploadFile = File(None),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth_utils.get_current_user)
):
    invite_code = str(uuid.uuid4())[:8].upper()
    icon_url = "/logo.png"
    if icon and icon.filename:
        icon_url = save_upload(icon, "guilds")

    guild = models.Guild(name=name, description=description, owner_id=current_user.id,
                         invite_code=invite_code, icon_url=icon_url)
    db.add(guild); db.flush()
    db.add(models.Channel(name="genel", channel_type="text", guild_id=guild.id))
    db.add(models.GuildMember(guild_id=guild.id, user_id=current_user.id, role="owner"))
    db.commit(); db.refresh(guild)
    return guild

@app.get("/api/guilds", response_model=list[schemas.GuildResponse])
def get_my_guilds(db: Session = Depends(database.get_db),
                  current_user: models.User = Depends(auth_utils.get_current_user)):
    memberships = db.query(models.GuildMember).filter(models.GuildMember.user_id == current_user.id).all()
    guild_ids = [m.guild_id for m in memberships]
    return db.query(models.Guild).filter(models.Guild.id.in_(guild_ids)).all()

@app.get("/api/guilds/{guild_id}", response_model=schemas.GuildResponse)
def get_guild(guild_id: int, db: Session = Depends(database.get_db),
              current_user: models.User = Depends(auth_utils.get_current_user)):
    guild = db.query(models.Guild).filter(models.Guild.id == guild_id).first()
    if not guild:
        raise HTTPException(404, "Sunucu bulunamadı.")
    if not db.query(models.GuildMember).filter(
        models.GuildMember.guild_id == guild_id,
        models.GuildMember.user_id == current_user.id
    ).first():
        raise HTTPException(403, "Bu sunucuya erişim izniniz yok.")
    return guild

@app.patch("/api/guilds/{guild_id}", response_model=schemas.GuildResponse)
def update_guild(
    guild_id: int,
    name: str = Form(None),
    description: str = Form(None),
    icon: UploadFile = File(None),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth_utils.get_current_user)
):
    guild = db.query(models.Guild).filter(models.Guild.id == guild_id).first()
    if not guild or guild.owner_id != current_user.id:
        raise HTTPException(403, "Yalnızca sunucu sahibi düzenleyebilir.")
    if name: guild.name = name
    if description is not None: guild.description = description
    if icon and icon.filename:
        guild.icon_url = save_upload(icon, "guilds")
    db.commit(); db.refresh(guild)
    return guild

@app.post("/api/guilds/join/{invite_code}", response_model=schemas.GuildResponse)
def join_guild(invite_code: str, db: Session = Depends(database.get_db),
               current_user: models.User = Depends(auth_utils.get_current_user)):
    guild = db.query(models.Guild).filter(models.Guild.invite_code == invite_code).first()
    if not guild:
        raise HTTPException(404, "Geçersiz davet kodu.")
    if db.query(models.GuildMember).filter(
        models.GuildMember.guild_id == guild.id,
        models.GuildMember.user_id == current_user.id
    ).first():
        raise HTTPException(400, "Zaten bu sunucunun üyesisiniz.")
    db.add(models.GuildMember(guild_id=guild.id, user_id=current_user.id, role="member"))
    db.commit(); db.refresh(guild)
    return guild

# ─── KANAL ────────────────────────────────────
@app.post("/api/guilds/{guild_id}/channels", response_model=schemas.ChannelResponse)
def create_channel(guild_id: int, channel_data: schemas.ChannelCreate,
                   db: Session = Depends(database.get_db),
                   current_user: models.User = Depends(auth_utils.get_current_user)):
    guild = db.query(models.Guild).filter(models.Guild.id == guild_id).first()
    if not guild or guild.owner_id != current_user.id:
        raise HTTPException(403, "Yalnızca sunucu sahibi kanal oluşturabilir.")
    channel = models.Channel(name=channel_data.name, channel_type=channel_data.channel_type, guild_id=guild_id)
    db.add(channel); db.commit(); db.refresh(channel)
    return channel

@app.delete("/api/channels/{channel_id}")
def delete_channel(channel_id: int, db: Session = Depends(database.get_db),
                   current_user: models.User = Depends(auth_utils.get_current_user)):
    channel = db.query(models.Channel).filter(models.Channel.id == channel_id).first()
    if not channel:
        raise HTTPException(404, "Kanal bulunamadı.")
    guild = db.query(models.Guild).filter(models.Guild.id == channel.guild_id).first()
    if not guild or guild.owner_id != current_user.id:
        raise HTTPException(403, "Yalnızca sunucu sahibi kanal silebilir.")
    db.delete(channel); db.commit()
    return {"ok": True}

# ─── SUNUCU SİLME / AYRILMA ───────────────────
@app.delete("/api/guilds/{guild_id}")
def delete_guild(guild_id: int, db: Session = Depends(database.get_db),
                 current_user: models.User = Depends(auth_utils.get_current_user)):
    guild = db.query(models.Guild).filter(models.Guild.id == guild_id).first()
    if not guild:
        raise HTTPException(404, "Sunucu bulunamadı.")
    if guild.owner_id != current_user.id:
        raise HTTPException(403, "Yalnızca sunucu sahibi sunucuyu silebilir.")
    db.delete(guild); db.commit()
    return {"ok": True}

@app.delete("/api/guilds/{guild_id}/leave")
def leave_guild(guild_id: int, db: Session = Depends(database.get_db),
                current_user: models.User = Depends(auth_utils.get_current_user)):
    guild = db.query(models.Guild).filter(models.Guild.id == guild_id).first()
    if not guild:
        raise HTTPException(404, "Sunucu bulunamadı.")
    if guild.owner_id == current_user.id:
        raise HTTPException(400, "Sunucu sahibi sunucudan ayrılamaz. Sunucuyu silin.")
    membership = db.query(models.GuildMember).filter(
        models.GuildMember.guild_id == guild_id,
        models.GuildMember.user_id == current_user.id
    ).first()
    if not membership:
        raise HTTPException(400, "Bu sunucunun üyesi değilsiniz.")
    db.delete(membership); db.commit()
    return {"ok": True}

# ─── MESAJ ────────────────────────────────────
@app.get("/api/channels/{channel_id}/messages", response_model=list[schemas.MessageResponse])
def get_messages(channel_id: int, limit: int = 50,
                 db: Session = Depends(database.get_db),
                 current_user: models.User = Depends(auth_utils.get_current_user)):
    return db.query(models.Message).filter(
        models.Message.channel_id == channel_id
    ).order_by(models.Message.created_at.asc()).limit(limit).all()

@app.post("/api/channels/{channel_id}/messages", response_model=schemas.MessageResponse)
def send_message(channel_id: int, msg: schemas.MessageCreate,
                 db: Session = Depends(database.get_db),
                 current_user: models.User = Depends(auth_utils.get_current_user)):
    message = models.Message(content=msg.content, channel_id=channel_id, author_id=current_user.id)
    db.add(message); db.commit(); db.refresh(message)
    return message

@app.delete("/api/messages/{message_id}")
def delete_message(message_id: int, db: Session = Depends(database.get_db),
                   current_user: models.User = Depends(auth_utils.get_current_user)):
    msg = db.query(models.Message).filter(models.Message.id == message_id).first()
    if not msg:
        raise HTTPException(404, "Mesaj bulunamadı.")
    if msg.author_id != current_user.id:
        raise HTTPException(403, "Yalnızca kendi mesajınızı silebilirsiniz.")
    db.delete(msg); db.commit()
    return {"ok": True}

# ─── DOSYA PAYLAŞIMI ───────────────────────────
@app.post("/api/channels/{channel_id}/upload", response_model=schemas.MessageResponse)
def upload_file(channel_id: int, file: UploadFile = File(...),
                db: Session = Depends(database.get_db),
                current_user: models.User = Depends(auth_utils.get_current_user)):
    os.makedirs(os.path.join(UPLOAD_DIR, "attachments"), exist_ok=True)
    file_url = save_upload(file, "attachments")
    ext = os.path.splitext(file.filename)[1].lower()
    image_exts = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
    if ext in image_exts:
        content = f"[image:{file_url}]"
    else:
        content = f"[file:{file.filename}:{file_url}]"
    message = models.Message(content=content, channel_id=channel_id, author_id=current_user.id)
    db.add(message); db.commit(); db.refresh(message)
    return message

# ─── ARKADAŞLIK SİSTEMİ ───────────────────────
@app.get("/api/friends", response_model=list[schemas.FriendshipResponse])
def get_friends(db: Session = Depends(database.get_db), current_user: models.User = Depends(auth_utils.get_current_user)):
    friendships = db.query(models.Friendship).filter(
        (models.Friendship.user_id_1 == current_user.id) | (models.Friendship.user_id_2 == current_user.id)
    ).all()
    
    result = []
    for f in friendships:
        friend_id = f.user_id_2 if f.user_id_1 == current_user.id else f.user_id_1
        friend_user = db.query(models.User).filter(models.User.id == friend_id).first()
        result.append({
            "id": f.id,
            "user_id_1": f.user_id_1,
            "user_id_2": f.user_id_2,
            "status": f.status,
            "created_at": f.created_at,
            "friend": friend_user
        })
    return result

@app.post("/api/friends/request", response_model=schemas.FriendshipResponse)
def send_friend_request(req: schemas.FriendRequest, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth_utils.get_current_user)):
    target_user = db.query(models.User).filter(models.User.username.ilike(req.target_username)).first()
    if not target_user:
        raise HTTPException(404, "Kullanıcı bulunamadı.")
    if target_user.id == current_user.id:
        raise HTTPException(400, "Kendinize istek gönderemezsiniz.")
        
    existing = db.query(models.Friendship).filter(
        ((models.Friendship.user_id_1 == current_user.id) & (models.Friendship.user_id_2 == target_user.id)) |
        ((models.Friendship.user_id_1 == target_user.id) & (models.Friendship.user_id_2 == current_user.id))
    ).first()
    
    if existing:
        if existing.status == "accepted":
            raise HTTPException(400, "Zaten arkadaşsınız.")
        else:
            raise HTTPException(400, "Zaten bekleyen bir istek var.")
            
    import uuid
    new_request = models.Friendship(
        id=str(uuid.uuid4()),
        user_id_1=current_user.id,
        user_id_2=target_user.id,
        status="pending"
    )
    db.add(new_request); db.commit(); db.refresh(new_request)
    
    return {
        "id": new_request.id,
        "user_id_1": new_request.user_id_1,
        "user_id_2": new_request.user_id_2,
        "status": new_request.status,
        "created_at": new_request.created_at,
        "friend": target_user
    }

@app.post("/api/friends/accept/{request_id}", response_model=schemas.FriendshipResponse)
def accept_friend_request(request_id: str, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth_utils.get_current_user)):
    req = db.query(models.Friendship).filter(models.Friendship.id == request_id).first()
    if not req:
        raise HTTPException(404, "İstek bulunamadı.")
    if req.user_id_2 != current_user.id:
        raise HTTPException(403, "Bu isteği kabul etme yetkiniz yok.")
    if req.status == "accepted":
        raise HTTPException(400, "İstek zaten kabul edilmiş.")
        
    req.status = "accepted"
    db.commit()
    
    friend_user = db.query(models.User).filter(models.User.id == req.user_id_1).first()
    return {
        "id": req.id,
        "user_id_1": req.user_id_1,
        "user_id_2": req.user_id_2,
        "status": req.status,
        "created_at": req.created_at,
        "friend": friend_user
    }

@app.post("/api/friends/reject/{request_id}")
def reject_friend_request(request_id: str, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth_utils.get_current_user)):
    req = db.query(models.Friendship).filter(models.Friendship.id == request_id).first()
    if not req:
        raise HTTPException(404, "İstek bulunamadı.")
    if req.user_id_1 != current_user.id and req.user_id_2 != current_user.id:
        raise HTTPException(403, "Bu işlemi yapma yetkiniz yok.")
        
    db.delete(req); db.commit()
    return {"ok": True}
