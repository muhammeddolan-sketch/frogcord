from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from datetime import timedelta
# Removed passlib import
import uuid, os, shutil
from dotenv import load_dotenv

from . import models, schemas, database, auth_utils
from .database import engine, Base
import random
import smtplib
from email.message import EmailMessage

load_dotenv()

# Veritabanı tablolarını oluştur
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Frogcord Core API")

# Statik dosyalar (avatar ve guild ikonları)
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads")
os.makedirs(os.path.join(UPLOAD_DIR, "avatars"), exist_ok=True)
os.makedirs(os.path.join(UPLOAD_DIR, "guilds"), exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
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
    return {"message": "Frogcord Core API Çalışıyor! 🐸"}

# ─── AUTH ──────────────────────────────────────
@app.post("/api/auth/register", response_model=schemas.UserResponse)
def register_user(user: schemas.UserCreate, db: Session = Depends(database.get_db)):
    if db.query(models.User).filter(models.User.email == user.email).first():
        raise HTTPException(400, "Bu email zaten kayıtlı.")
    
    if db.query(models.User).filter(models.User.username.ilike(user.username)).first():
        raise HTTPException(400, "Bu kullanıcı adı zaten alınmış.")
    
    # Yeni Discord tarzı tag (discriminator) üret
    # Aynı kullanıcı adına sahip olanlar arasında benzersiz olmalı
    existing_tags = [u.tag for u in db.query(models.User).filter(models.User.username == user.username).all()]
    tag = None
    for _ in range(10): # 10 deneme
        t = f"{random.randint(1000, 9999)}"
        if t not in existing_tags:
            tag = t
            break
    if not tag:
        raise HTTPException(400, "Bu kullanıcı adı için kapasite doldu.")

    new_user = models.User(
        email=user.email, username=user.username,
        tag=tag,
        display_name=user.display_name or user.username,
        hashed_password=get_password_hash(user.password),
        is_verified=True  # E-posta doğrulamasını devredışı bırakıyoruz
    )
    db.add(new_user); db.commit(); db.refresh(new_user)
    return new_user

def send_verification_email(email_to: str, code: str):
    server = os.getenv("MAIL_SERVER")
    port = os.getenv("MAIL_PORT")
    username = os.getenv("MAIL_USERNAME")
    password = os.getenv("MAIL_PASSWORD")
    sender = os.getenv("MAIL_FROM")
    
    if not all([server, port, username, password]):
        print(f"\n[E-POSTA UYARISI] SMTP Ayarları eksik. Kod: {code}\n")
        return False

    msg = EmailMessage()
    msg.set_content(f"FrogCord'a Hoş Geldin! Doğrulama kodun: {code}")
    msg.add_alternative(f"""
    <html>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #1a1b1e; color: #ffffff; padding: 40px; text-align: center;">
            <div style="background-color: #2b2d31; border-radius: 12px; padding: 30px; border: 1px solid #4e5058; display: inline-block; max-width: 400px;">
                <h1 style="color: #23a559; margin-bottom: 20px; font-size: 24px;">🐸 FrogCord Doğrulama</h1>
                <p style="color: #b5bac1; font-size: 14px; margin-bottom: 30px;">Sunucuya katılmak için son bir adım kaldı! Aşağıdaki kodu kullanarak e-posta adresini doğrula:</p>
                <div style="background-color: #1e1f22; border: 1px dashed #23a559; border-radius: 8px; padding: 15px 30px; font-size: 32px; font-weight: bold; color: #ffffff; letter-spacing: 5px; margin-bottom: 30px;">
                    {code}
                </div>
                <p style="color: #72767d; font-size: 11px;">Bu bir güvenlik otomatıdır. Lütfen bu e-postayı kimseyle paylaşma.</p>
            </div>
        </body>
    </html>
    """, subtype='html')
    
    msg['Subject'] = f"FrogCord Doğrulama Kodun: {code}"
    msg['From'] = f"FrogCord Team <{sender}>"
    msg['To'] = email_to

    try:
        # Use SSL for port 465
        if port == "465":
            with smtplib.SMTP_SSL(server, int(port)) as smtp:
                smtp.login(username, password)
                smtp.send_message(msg)
        else:
            with smtplib.SMTP(server, int(port)) as smtp:
                smtp.starttls()
                smtp.login(username, password)
                smtp.send_message(msg)
        return True
    except Exception as e:
        print(f"\n[E-POSTA HATASI] Gönderilemedi: {str(e)}\n")
        return False

@app.post("/api/auth/verify-request")
def request_verification(req: schemas.VerificationRequest, db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(models.User.email == req.email).first()
    if not user: raise HTTPException(404, "Kullanıcı bulunamadı.")
    
    code = f"{random.randint(100000, 999999)}"
    # Eski kodları sil
    db.query(models.VerificationCode).filter(models.VerificationCode.email == req.email).delete()
    db.add(models.VerificationCode(email=req.email, code=code))
    db.commit()
    
    # Gerçek e-posta gönderimi
    sent = send_verification_email(req.email, code)
    
    if sent:
        return {"msg": f"Doğrulama kodu {req.email} adresine gönderildi."}
    else:
        # E-posta başarısız olsa bile geliştirme için kod konsola yazılmaya devam etsin (fallback)
        print(f"\n[E-POSTA FALLBACK] Kod: {code}\n")
        return {"msg": "E-posta gönderilemedi ancak geliştirici modunda kod konsola yazıldı. Lütfen terminali kontrol edin."}

@app.post("/api/auth/verify-confirm")
def confirm_verification(req: schemas.VerificationConfirm, db: Session = Depends(database.get_db)):
    record = db.query(models.VerificationCode).filter(
        models.VerificationCode.email == req.email,
        models.VerificationCode.code == req.code
    ).first()
    
    # Geliştirme kolaylığı için bypass kodu: 123456
    if not record and req.code != "123456":
        raise HTTPException(400, "Geçersiz veya süresi dolmuş kod.")
    
    user = db.query(models.User).filter(models.User.email == req.email).first()
    if user:
        user.is_verified = True
        if record:
            db.delete(record)
        db.commit()
    return {"msg": "E-posta başarıyla doğrulandı!"}

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
    banner_color: str = Form(None),
    about_me: str = Form(None),
    custom_status: str = Form(None),
    avatar: UploadFile = File(None),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth_utils.get_current_user)
):
    if display_name is not None:
        current_user.display_name = display_name
    if banner_color is not None:
        current_user.banner_color = banner_color
    if about_me is not None:
        current_user.about_me = about_me
    if custom_status is not None:
        current_user.custom_status = custom_status
    if avatar and avatar.filename:
        url = save_upload(avatar, "avatars")
        current_user.avatar_url = url
    db.commit(); db.refresh(current_user)
    return current_user

@app.patch("/api/users/me/status")
def update_status(data: dict = Body(...), db: Session = Depends(database.get_db),
                  current_user: models.User = Depends(auth_utils.get_current_user)):
    current_user.custom_status = data.get("custom_status", None)
    db.commit()
    return {"ok": True, "custom_status": current_user.custom_status}

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
                         invite_code=invite_code, icon_url=icon_url, region="derin-gol", verification_level=0)
    db.add(guild); db.flush()
    
    # Varsayılan @everyone rolü oluştur
    everyone_role = models.Role(name="@everyone", guild_id=guild.id, position=0, permissions=1600)
    db.add(everyone_role)
    
    # Kanalları oluştur
    genel_text = models.Channel(name="genel", channel_type="text", guild_id=guild.id)
    genel_voice = models.Channel(name="Genel Ses", channel_type="voice", guild_id=guild.id)
    db.add(genel_text); db.add(genel_voice); db.flush()
    
    # Varsayılan sistem kanalı olarak metin kanalını ata
    guild.system_channel_id = genel_text.id
    
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
    region: str = Form(None),
    system_channel_id: int = Form(None),
    afk_channel_id: int = Form(None),
    afk_timeout: int = Form(None),
    verification_level: int = Form(None),
    icon: UploadFile = File(None),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth_utils.get_current_user)
):
    guild = db.query(models.Guild).filter(models.Guild.id == guild_id).first()
    if not guild or guild.owner_id != current_user.id:
        raise HTTPException(403, "Yalnızca sunucu sahibi düzenleyebilir.")
    if name: guild.name = name
    if description is not None: guild.description = description
    if region: guild.region = region
    if system_channel_id is not None: guild.system_channel_id = system_channel_id
    if afk_channel_id is not None: guild.afk_channel_id = afk_channel_id
    if afk_timeout is not None: guild.afk_timeout = afk_timeout
    if verification_level is not None: guild.verification_level = verification_level
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
    
    # Otomatik Hoş Geldin Mesajı
    if guild.system_channel_id:
        welcome_msg = models.Message(
            content=f"🐸 Vık vık! **{current_user.display_name or current_user.username}** göle atladı! Hoş geldin!",
            channel_id=guild.system_channel_id,
            author_id=1 # Sistem/Bot kullanıcısı (id=1 varsayımı ile)
        )
        db.add(welcome_msg)
        
    db.commit(); db.refresh(guild)
    return guild

# ─── KANAL ────────────────────────────────────
@app.post("/api/guilds/{guild_id}/channels", response_model=schemas.ChannelResponse)
def create_channel(guild_id: int, channel_data: schemas.ChannelCreate,
                   db: Session = Depends(database.get_db),
                   current_user: models.User = Depends(auth_utils.get_current_user)):
    member = db.query(models.GuildMember).filter(models.GuildMember.guild_id == guild_id, models.GuildMember.user_id == current_user.id).first()
    if not member or not check_permission(member, 4, db): # 4: MANAGE_CHANNELS
        raise HTTPException(403, "Kanal oluşturma yetkiniz yok.")
    channel = models.Channel(name=channel_data.name, channel_type=channel_data.channel_type, guild_id=guild_id)
    db.add(channel); db.commit(); db.refresh(channel)
    return channel

@app.delete("/api/channels/{channel_id}")
def delete_channel(channel_id: int, db: Session = Depends(database.get_db),
                   current_user: models.User = Depends(auth_utils.get_current_user)):
    channel = db.query(models.Channel).filter(models.Channel.id == channel_id).first()
    if not channel:
        raise HTTPException(404, "Kanal bulunamadı.")
    member = db.query(models.GuildMember).filter(models.GuildMember.guild_id == channel.guild_id, models.GuildMember.user_id == current_user.id).first()
    if not member or not check_permission(member, 4, db): # 4: MANAGE_CHANNELS
        raise HTTPException(403, "Kanal silme yetkiniz yok.")
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

# ─── ROLES (YETKİLER) ──────────────────────────
def get_member_permissions(member: models.GuildMember, db: Session) -> int:
    if member.guild.owner_id == member.user_id:
        return 0xFFFFFF # Admin perms
    
    total_perms = 0
    for role in member.roles:
        total_perms |= role.permissions
    
    everyone_role = db.query(models.Role).filter(models.Role.guild_id == member.guild_id, models.Role.name == "@everyone").first()
    if everyone_role:
        total_perms |= everyone_role.permissions
    return total_perms

def check_permission(member: models.GuildMember, permission: int, db: Session):
    return (get_member_permissions(member, db) & permission) == permission

@app.get("/api/guilds/{guild_id}/roles", response_model=list[schemas.RoleResponse])
def get_roles(guild_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth_utils.get_current_user)):
    return db.query(models.Role).filter(models.Role.guild_id == guild_id).order_by(models.Role.position.desc()).all()

@app.post("/api/guilds/{guild_id}/roles", response_model=schemas.RoleResponse)
def create_role(guild_id: int, role_data: schemas.RoleCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth_utils.get_current_user)):
    member = db.query(models.GuildMember).filter(models.GuildMember.guild_id == guild_id, models.GuildMember.user_id == current_user.id).first()
    if not member or not check_permission(member, 2, db): # 2: MANAGE_ROLES
        raise HTTPException(403, "Rol oluşturma yetkiniz yok.")
    
    role = models.Role(**role_data.dict(), guild_id=guild_id)
    db.add(role); db.commit(); db.refresh(role)
    return role

@app.patch("/api/roles/{role_id}", response_model=schemas.RoleResponse)
def update_role(role_id: int, role_data: schemas.RoleUpdate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth_utils.get_current_user)):
    role = db.query(models.Role).filter(models.Role.id == role_id).first()
    if not role: raise HTTPException(404, "Rol bulunamadı.")
    
    member = db.query(models.GuildMember).filter(models.GuildMember.guild_id == role.guild_id, models.GuildMember.user_id == current_user.id).first()
    if not member or not check_permission(member, 2, db):
        raise HTTPException(403, "Rol düzenleme yetkiniz yok.")
    
    for key, value in role_data.dict(exclude_unset=True).items():
        setattr(role, key, value)
    db.commit(); db.refresh(role)
    return role

@app.delete("/api/roles/{role_id}")
def delete_role(role_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth_utils.get_current_user)):
    role = db.query(models.Role).filter(models.Role.id == role_id).first()
    if not role: raise HTTPException(404, "Rol bulunamadı.")
    if role.name == "@everyone": raise HTTPException(400, "@everyone rolü silinemez.")
    
    member = db.query(models.GuildMember).filter(models.GuildMember.guild_id == role.guild_id, models.GuildMember.user_id == current_user.id).first()
    if not member or not check_permission(member, 2, db):
        raise HTTPException(403, "Rol silme yetkiniz yok.")
    
    db.delete(role); db.commit()
    return {"ok": True}

@app.post("/api/guilds/{guild_id}/members/{user_id}/roles/{role_id}")
def add_member_role(guild_id: int, user_id: int, role_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth_utils.get_current_user)):
    # Yetki kontrolü
    executor_member = db.query(models.GuildMember).filter(models.GuildMember.guild_id == guild_id, models.GuildMember.user_id == current_user.id).first()
    if not executor_member or not check_permission(executor_member, 2, db):
        raise HTTPException(403, "Rol verme yetkiniz yok.")
    
    target_member = db.query(models.GuildMember).filter(models.GuildMember.guild_id == guild_id, models.GuildMember.user_id == user_id).first()
    role = db.query(models.Role).filter(models.Role.id == role_id, models.Role.guild_id == guild_id).first()
    
    if not target_member or not role: raise HTTPException(404, "Üye veya rol bulunamadı.")
    if role in target_member.roles: return {"msg": "Zaten bu role sahip."}
    
    target_member.roles.append(role)
    db.commit()
    return {"ok": True}

@app.delete("/api/guilds/{guild_id}/members/{user_id}/roles/{role_id}")
def remove_member_role(guild_id: int, user_id: int, role_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth_utils.get_current_user)):
    executor_member = db.query(models.GuildMember).filter(models.GuildMember.guild_id == guild_id, models.GuildMember.user_id == current_user.id).first()
    if not executor_member or not check_permission(executor_member, 2, db):
        raise HTTPException(403, "Rol alma yetkiniz yok.")
    
    target_member = db.query(models.GuildMember).filter(models.GuildMember.guild_id == guild_id, models.GuildMember.user_id == user_id).first()
    role = db.query(models.Role).filter(models.Role.id == role_id, models.Role.guild_id == guild_id).first()
    
    if not target_member or not role: raise HTTPException(404, "Üye veya rol bulunamadı.")
    if role not in target_member.roles: return {"msg": "Üye bu role sahip değil."}
    
    target_member.roles.remove(role)
    db.commit()
    return {"ok": True}

@app.patch("/api/guilds/{guild_id}/members/{user_id}")
def update_guild_member(guild_id: int, user_id: int, data: dict = Body(...),
                         db: Session = Depends(database.get_db),
                         current_user: models.User = Depends(auth_utils.get_current_user)):
    member = db.query(models.GuildMember).filter(models.GuildMember.guild_id == guild_id, models.GuildMember.user_id == user_id).first()
    if not member: raise HTTPException(404, "Üye bulunamadı.")
    me = db.query(models.GuildMember).filter(models.GuildMember.guild_id == guild_id, models.GuildMember.user_id == current_user.id).first()
    if not me: raise HTTPException(403, "Yetkiniz yok.")
    
    nickname = data.get("nickname")
    if user_id == current_user.id:
        if not check_permission(me, 64, db): raise HTTPException(403, "İsmini değiştirme yetkin yok.")
    else:
        if not check_permission(me, 128, db): raise HTTPException(403, "Başkasının ismini değiştirme yetkin yok.")
    
    member.nickname = nickname
    db.commit(); db.refresh(member)
    return member

@app.delete("/api/guilds/{guild_id}/members/{user_id}")
def kick_member(guild_id: int, user_id: int, db: Session = Depends(database.get_db),
                current_user: models.User = Depends(auth_utils.get_current_user)):
    me = db.query(models.GuildMember).filter(models.GuildMember.guild_id == guild_id, models.GuildMember.user_id == current_user.id).first()
    if not me or not check_permission(me, 8, db): # 8: KICK_MEMBERS
         raise HTTPException(403, "Üyeleri atma yetkiniz yok.")
    
    member = db.query(models.GuildMember).filter(models.GuildMember.guild_id == guild_id, models.GuildMember.user_id == user_id).first()
    if not member: raise HTTPException(404, "Üye bulunamadı.")
    if member.role == "owner": raise HTTPException(403, "Sunucu sahibini atamazsınız.")
    
    db.delete(member); db.commit()
    return {"ok": True}

# ─── MESAJ ────────────────────────────────────
def _build_message_response(msg, current_user_id, db):
    reactions_data = {}
    for r in (msg.reactions or []):
        if r.emoji not in reactions_data:
            reactions_data[r.emoji] = {"emoji": r.emoji, "count": 0, "users": [], "user_reacted": False}
        reactions_data[r.emoji]["count"] += 1
        u = db.query(models.User).filter(models.User.id == r.user_id).first()
        if u: reactions_data[r.emoji]["users"].append(u.display_name or u.username)
        if r.user_id == current_user_id:
            reactions_data[r.emoji]["user_reacted"] = True
    return {
        "id": msg.id, "content": msg.content, "channel_id": msg.channel_id,
        "author_id": msg.author_id, "author": msg.author,
        "reply_to_id": msg.reply_to_id, "is_pinned": msg.is_pinned,
        "is_edited": msg.is_edited, "reactions": list(reactions_data.values()),
        "created_at": msg.created_at
    }

@app.get("/api/channels/{channel_id}/messages", response_model=list[schemas.MessageResponse])
def get_messages(channel_id: int, limit: int = 50,
                 db: Session = Depends(database.get_db),
                 current_user: models.User = Depends(auth_utils.get_current_user)):
    msgs = db.query(models.Message).filter(
        models.Message.channel_id == channel_id
    ).order_by(models.Message.created_at.asc()).limit(limit).all()
    return [_build_message_response(m, current_user.id, db) for m in msgs]

@app.post("/api/channels/{channel_id}/messages", response_model=schemas.MessageResponse)
def send_message(channel_id: int, msg: schemas.MessageCreate,
                 db: Session = Depends(database.get_db),
                 current_user: models.User = Depends(auth_utils.get_current_user)):
    channel = db.query(models.Channel).filter(models.Channel.id == channel_id).first()
    if not channel: raise HTTPException(404, "Kanal bulunamadı.")
    
    if channel.guild_id:
        guild = channel.guild
        # Güvenlik Seviyesi 1: E-posta Doğrulaması
        if guild.verification_level >= 1 and not current_user.is_verified:
            raise HTTPException(403, "Mesaj göndermek için e-posta doğrulaması şart!")
            
        # Güvenlik Seviyesi 2: 10 Dakika Bekleme
        if guild.verification_level >= 2:
            member = db.query(models.GuildMember).filter(
                models.GuildMember.guild_id == channel.guild_id,
                models.GuildMember.user_id == current_user.id
            ).first()
            if member:
                from datetime import datetime, timezone
                delta = (datetime.now(timezone.utc) - member.joined_at.replace(tzinfo=timezone.utc)).total_seconds()
                if delta < 600:
                    raise HTTPException(403, "Gölün sakinleşmesi için 10 dakikadır burada vıklıyor olmalısın.")

    message = models.Message(content=msg.content, channel_id=channel_id, author_id=current_user.id, reply_to_id=msg.reply_to_id)
    db.add(message); db.commit(); db.refresh(message)
    return _build_message_response(message, current_user.id, db)

@app.patch("/api/messages/{message_id}", response_model=schemas.MessageResponse)
def edit_message(message_id: int, data: schemas.MessageEdit,
                 db: Session = Depends(database.get_db),
                 current_user: models.User = Depends(auth_utils.get_current_user)):
    msg = db.query(models.Message).filter(models.Message.id == message_id).first()
    if not msg: raise HTTPException(404, "Mesaj bulunamadı.")
    if msg.author_id != current_user.id: raise HTTPException(403, "Yalnızca kendi mesajınızı düzenleyebilirsiniz.")
    msg.content = data.content
    msg.is_edited = True
    db.commit(); db.refresh(msg)
    return _build_message_response(msg, current_user.id, db)

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

# ─── REAKSİYONLAR ─────────────────────────────
@app.post("/api/messages/{message_id}/reactions/{emoji}")
def toggle_reaction(message_id: int, emoji: str, db: Session = Depends(database.get_db),
                    current_user: models.User = Depends(auth_utils.get_current_user)):
    msg = db.query(models.Message).filter(models.Message.id == message_id).first()
    if not msg: raise HTTPException(404, "Mesaj bulunamadı.")
    existing = db.query(models.MessageReaction).filter(
        models.MessageReaction.message_id == message_id,
        models.MessageReaction.user_id == current_user.id,
        models.MessageReaction.emoji == emoji
    ).first()
    if existing:
        db.delete(existing); db.commit()
    else:
        db.add(models.MessageReaction(message_id=message_id, user_id=current_user.id, emoji=emoji))
        db.commit()
    db.refresh(msg)
    return _build_message_response(msg, current_user.id, db)

# ─── PİNLENMİŞ MESAJLAR ───────────────────────
@app.post("/api/messages/{message_id}/pin")
def toggle_pin(message_id: int, db: Session = Depends(database.get_db),
              current_user: models.User = Depends(auth_utils.get_current_user)):
    msg = db.query(models.Message).filter(models.Message.id == message_id).first()
    if not msg: raise HTTPException(404, "Mesaj bulunamadı.")
    msg.is_pinned = not msg.is_pinned
    db.commit()
    return {"ok": True, "is_pinned": msg.is_pinned}

@app.get("/api/channels/{channel_id}/pins", response_model=list[schemas.MessageResponse])
def get_pinned_messages(channel_id: int, db: Session = Depends(database.get_db),
                        current_user: models.User = Depends(auth_utils.get_current_user)):
    msgs = db.query(models.Message).filter(
        models.Message.channel_id == channel_id, models.Message.is_pinned == True
    ).order_by(models.Message.created_at.desc()).all()
    return [_build_message_response(m, current_user.id, db) for m in msgs]

# ─── MESAJ ARAMA ───────────────────────────────
@app.get("/api/channels/{channel_id}/search", response_model=list[schemas.MessageResponse])
def search_messages(channel_id: int, q: str = "", db: Session = Depends(database.get_db),
                    current_user: models.User = Depends(auth_utils.get_current_user)):
    if not q.strip(): return []
    msgs = db.query(models.Message).filter(
        models.Message.channel_id == channel_id,
        models.Message.content.ilike(f"%{q}%")
    ).order_by(models.Message.created_at.desc()).limit(20).all()
    return [_build_message_response(m, current_user.id, db) for m in msgs]

# ─── DOSYA PAYLAŞIMI ───────────────────────────
@app.post("/api/channels/{channel_id}/upload", response_model=schemas.MessageResponse)
def upload_file(channel_id: int, file: UploadFile = File(...),
                db: Session = Depends(database.get_db),
                current_user: models.User = Depends(auth_utils.get_current_user)):
    os.makedirs(os.path.join(UPLOAD_DIR, "attachments"), exist_ok=True)
    file_url = save_upload(file, "attachments")
    ext = os.path.splitext(file.filename)[1].lower()
    
    image_exts = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
    video_exts = ['.mp4', '.webm', '.ogg', '.mov']
    
    if ext in image_exts:
        content = f"[image:{file_url}]"
    elif ext in video_exts:
        content = f"[video:{file_url}]"
    else:
        content = f"[file:{file.filename}:{file_url}]"
        
    message = models.Message(content=content, channel_id=channel_id, author_id=current_user.id)
    db.add(message); db.commit(); db.refresh(message)
    return _build_message_response(message, current_user.id, db)

# ─── TASKS (GÖREVLER / KANBAN) ─────────────────
@app.get("/api/channels/{channel_id}/tasks", response_model=list[schemas.TaskResponse])
def get_channel_tasks(channel_id: int, db: Session = Depends(database.get_db),
                      current_user: models.User = Depends(auth_utils.get_current_user)):
    # Kanalın sunucusuna üye mi kontrol et
    channel = db.query(models.Channel).filter(models.Channel.id == channel_id).first()
    if not channel: raise HTTPException(404, "Kanal bulunamadı.")
    member = db.query(models.GuildMember).filter(models.GuildMember.guild_id == channel.guild_id, models.GuildMember.user_id == current_user.id).first()
    if not member: raise HTTPException(403, "Bu kanaldaki görevleri görme yetkiniz yok.")
    
    return db.query(models.Task).filter(models.Task.channel_id == channel_id).all()

@app.post("/api/channels/{channel_id}/tasks", response_model=schemas.TaskResponse)
def create_channel_task(channel_id: int, task_data: schemas.TaskCreate, 
                        db: Session = Depends(database.get_db),
                        current_user: models.User = Depends(auth_utils.get_current_user)):
    channel = db.query(models.Channel).filter(models.Channel.id == channel_id).first()
    if not channel: raise HTTPException(404, "Kanal bulunamadı.")
    member = db.query(models.GuildMember).filter(models.GuildMember.guild_id == channel.guild_id, models.GuildMember.user_id == current_user.id).first()
    if not member: raise HTTPException(403, "Bu kanalda görev oluşturma yetkiniz yok.")
    
    task = models.Task(**task_data.dict(), channel_id=channel_id, creator_id=current_user.id)
    db.add(task); db.commit(); db.refresh(task)
    return task

@app.patch("/api/tasks/{task_id}", response_model=schemas.TaskResponse)
def update_task(task_id: int, task_data: schemas.TaskUpdate,
                db: Session = Depends(database.get_db),
                current_user: models.User = Depends(auth_utils.get_current_user)):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task: raise HTTPException(404, "Görev bulunamadı.")
    
    # Kanalın sunucusuna üye mi kontrol et
    member = db.query(models.GuildMember).filter(models.GuildMember.guild_id == task.channel.guild_id, models.GuildMember.user_id == current_user.id).first()
    if not member: raise HTTPException(403, "Bu görevi güncelleme yetkiniz yok.")
    
    for key, value in task_data.dict(exclude_unset=True).items():
        setattr(task, key, value)
    db.commit(); db.refresh(task)
    return task

@app.delete("/api/tasks/{task_id}")
def delete_task(task_id: int, db: Session = Depends(database.get_db),
                current_user: models.User = Depends(auth_utils.get_current_user)):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task: raise HTTPException(404, "Görev bulunamadı.")
    
    # Creator veya admin ise silsin
    if task.creator_id != current_user.id:
        member = db.query(models.GuildMember).filter(models.GuildMember.guild_id == task.channel.guild_id, models.GuildMember.user_id == current_user.id).first()
        if not member or not check_permission(member, 1, db): # 1: MANAGE_GUILD (admin-ish)
             raise HTTPException(403, "Görevi silme yetkiniz yok.")
    
    db.delete(task); db.commit()
    return {"ok": True}

# ─── FROGAI (LLM MOCK) ─────────────────────────
@app.get("/api/channels/{channel_id}/summarize")
def summarize_channel(channel_id: int, db: Session = Depends(database.get_db),
                      current_user: models.User = Depends(auth_utils.get_current_user)):
    # Gerçek sistemde burada son 50-100 mesaj alınır ve LLM'e gönderilir
    msgs = db.query(models.Message).filter(models.Message.channel_id == channel_id).order_by(models.Message.created_at.desc()).limit(10).all()
    if not msgs:
        return {"summary": "Bu kanalda henüz yeterli konuşma yok. 🐸"}
    
    # Mock summary logic
    return {
        "summary": "Son konuşmalara göre ekip projenin tasarımı ve veri modelleri üzerinde yoğunlaşmış durumda. Görev listesinin güncellendiğinden ve API entegrasyonuna başlandığından bahsediliyor. En son Muhammet sunucu ayarlarıyla ilgileniyordu. 🐸⚡"
    }


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
    if "#" not in req.target_username:
        raise HTTPException(400, "Format hatalı. Kullanım: kullanıcıadı#1234")
    
    uname, utag = req.target_username.split("#", 1)
    target_user = db.query(models.User).filter(
        models.User.username.ilike(uname),
        models.User.tag == utag
    ).first()

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


# ─── YER İMLERİ (BOOKMARKS) ────────────────────
@app.post("/api/bookmarks", response_model=schemas.BookmarkResponse)
def create_bookmark(data: schemas.BookmarkCreate, db: Session = Depends(database.get_db),
                    current_user: models.User = Depends(auth_utils.get_current_user)):
    msg = db.query(models.Message).filter(models.Message.id == data.message_id).first()
    if not msg:
        raise HTTPException(404, "Mesaj bulunamadı.")
    # Zaten ekli mi?
    existing = db.query(models.Bookmark).filter(
        models.Bookmark.user_id == current_user.id,
        models.Bookmark.message_id == data.message_id
    ).first()
    if existing:
        raise HTTPException(400, "Bu mesaj zaten yer imlerinizde.")
    bookmark = models.Bookmark(user_id=current_user.id, message_id=data.message_id, note=data.note)
    db.add(bookmark); db.commit(); db.refresh(bookmark)
    return bookmark

@app.get("/api/bookmarks", response_model=list[schemas.BookmarkResponse])
def get_bookmarks(db: Session = Depends(database.get_db),
                  current_user: models.User = Depends(auth_utils.get_current_user)):
    bookmarks = db.query(models.Bookmark).filter(
        models.Bookmark.user_id == current_user.id
    ).order_by(models.Bookmark.created_at.desc()).all()
    return bookmarks

@app.delete("/api/bookmarks/{bookmark_id}")
def delete_bookmark(bookmark_id: int, db: Session = Depends(database.get_db),
                    current_user: models.User = Depends(auth_utils.get_current_user)):
    bm = db.query(models.Bookmark).filter(models.Bookmark.id == bookmark_id, models.Bookmark.user_id == current_user.id).first()
    if not bm:
        raise HTTPException(404, "Yer imi bulunamadı.")
    db.delete(bm); db.commit()
    return {"ok": True}


# ─── ANKETLER (POLLS) ──────────────────────────
@app.post("/api/channels/{channel_id}/polls", response_model=schemas.PollResponse)
def create_poll(channel_id: int, poll_data: schemas.PollCreate,
                db: Session = Depends(database.get_db),
                current_user: models.User = Depends(auth_utils.get_current_user)):
    channel = db.query(models.Channel).filter(models.Channel.id == channel_id).first()
    if not channel:
        raise HTTPException(404, "Kanal bulunamadı.")
    if len(poll_data.options) < 2:
        raise HTTPException(400, "En az 2 seçenek gerekli.")
    if len(poll_data.options) > 10:
        raise HTTPException(400, "En fazla 10 seçenek olabilir.")
    
    poll = models.Poll(
        channel_id=channel_id, creator_id=current_user.id,
        question=poll_data.question, is_anonymous=poll_data.is_anonymous,
        is_multiple=poll_data.is_multiple, deadline=poll_data.deadline
    )
    db.add(poll); db.flush()
    
    for opt_text in poll_data.options:
        db.add(models.PollOption(poll_id=poll.id, text=opt_text))
    db.commit(); db.refresh(poll)
    
    return _build_poll_response(poll, current_user.id, db)

@app.get("/api/channels/{channel_id}/polls", response_model=list[schemas.PollResponse])
def get_polls(channel_id: int, db: Session = Depends(database.get_db),
              current_user: models.User = Depends(auth_utils.get_current_user)):
    polls = db.query(models.Poll).filter(models.Poll.channel_id == channel_id).order_by(models.Poll.created_at.desc()).all()
    return [_build_poll_response(p, current_user.id, db) for p in polls]

@app.post("/api/polls/{poll_id}/vote/{option_id}")
def vote_poll(poll_id: int, option_id: int, db: Session = Depends(database.get_db),
              current_user: models.User = Depends(auth_utils.get_current_user)):
    poll = db.query(models.Poll).filter(models.Poll.id == poll_id).first()
    if not poll:
        raise HTTPException(404, "Anket bulunamadı.")
    option = db.query(models.PollOption).filter(models.PollOption.id == option_id, models.PollOption.poll_id == poll_id).first()
    if not option:
        raise HTTPException(404, "Seçenek bulunamadı.")
    
    # Deadline kontrolü
    from datetime import datetime, timezone
    if poll.deadline and datetime.now(timezone.utc) > poll.deadline:
        raise HTTPException(400, "Anket süresi dolmuş.")
    
    existing_vote = db.query(models.PollVote).filter(
        models.PollVote.poll_id == poll_id,
        models.PollVote.user_id == current_user.id
    ).first()
    
    if existing_vote and not poll.is_multiple:
        # Tek seçimli: Mevcut oyu güncelle
        existing_vote.option_id = option_id
    elif existing_vote and poll.is_multiple:
        # Çoklu seçim: Aynı seçeneğe oy verdiyse kaldır (toggle)
        same_vote = db.query(models.PollVote).filter(
            models.PollVote.poll_id == poll_id,
            models.PollVote.option_id == option_id,
            models.PollVote.user_id == current_user.id
        ).first()
        if same_vote:
            db.delete(same_vote); db.commit()
            return _build_poll_response(poll, current_user.id, db)
        else:
            db.add(models.PollVote(poll_id=poll_id, option_id=option_id, user_id=current_user.id))
    else:
        db.add(models.PollVote(poll_id=poll_id, option_id=option_id, user_id=current_user.id))
    
    db.commit(); db.refresh(poll)
    return _build_poll_response(poll, current_user.id, db)

def _build_poll_response(poll, user_id, db):
    options = []
    total = 0
    user_voted = False
    for opt in poll.options:
        votes = db.query(models.PollVote).filter(models.PollVote.option_id == opt.id).all()
        count = len(votes)
        total += count
        voters = []
        if not poll.is_anonymous:
            for v in votes:
                u = db.query(models.User).filter(models.User.id == v.user_id).first()
                if u: voters.append(u.display_name or u.username)
        if any(v.user_id == user_id for v in votes):
            user_voted = True
        options.append({"id": opt.id, "text": opt.text, "vote_count": count, "voters": voters})
    return {
        "id": poll.id, "channel_id": poll.channel_id, "creator_id": poll.creator_id,
        "question": poll.question, "is_anonymous": poll.is_anonymous, "is_multiple": poll.is_multiple,
        "deadline": poll.deadline, "created_at": poll.created_at,
        "options": options, "total_votes": total, "user_voted": user_voted
    }

@app.delete("/api/polls/{poll_id}")
def delete_poll(poll_id: int, db: Session = Depends(database.get_db),
                current_user: models.User = Depends(auth_utils.get_current_user)):
    poll = db.query(models.Poll).filter(models.Poll.id == poll_id).first()
    if not poll: raise HTTPException(404, "Anket bulunamadı.")
    if poll.creator_id != current_user.id: raise HTTPException(403, "Yalnızca oluşturan kişi silebilir.")
    db.delete(poll); db.commit()
    return {"ok": True}


# ─── WIKI ──────────────────────────────────────
@app.get("/api/guilds/{guild_id}/wiki", response_model=list[schemas.WikiPageResponse])
def get_wiki_pages(guild_id: int, db: Session = Depends(database.get_db),
                   current_user: models.User = Depends(auth_utils.get_current_user)):
    member = db.query(models.GuildMember).filter(models.GuildMember.guild_id == guild_id, models.GuildMember.user_id == current_user.id).first()
    if not member: raise HTTPException(403, "Bu sunucunun üyesi değilsiniz.")
    return db.query(models.WikiPage).filter(models.WikiPage.guild_id == guild_id).order_by(models.WikiPage.updated_at.desc().nullslast(), models.WikiPage.created_at.desc()).all()

@app.post("/api/guilds/{guild_id}/wiki", response_model=schemas.WikiPageResponse)
def create_wiki_page(guild_id: int, data: schemas.WikiPageCreate,
                     db: Session = Depends(database.get_db),
                     current_user: models.User = Depends(auth_utils.get_current_user)):
    member = db.query(models.GuildMember).filter(models.GuildMember.guild_id == guild_id, models.GuildMember.user_id == current_user.id).first()
    if not member: raise HTTPException(403, "Bu sunucunun üyesi değilsiniz.")
    page = models.WikiPage(guild_id=guild_id, title=data.title, content=data.content, category=data.category, author_id=current_user.id)
    db.add(page); db.commit(); db.refresh(page)
    return page

@app.get("/api/wiki/{page_id}", response_model=schemas.WikiPageResponse)
def get_wiki_page(page_id: int, db: Session = Depends(database.get_db),
                  current_user: models.User = Depends(auth_utils.get_current_user)):
    page = db.query(models.WikiPage).filter(models.WikiPage.id == page_id).first()
    if not page: raise HTTPException(404, "Wiki sayfası bulunamadı.")
    return page

@app.patch("/api/wiki/{page_id}", response_model=schemas.WikiPageResponse)
def update_wiki_page(page_id: int, data: schemas.WikiPageUpdate,
                     db: Session = Depends(database.get_db),
                     current_user: models.User = Depends(auth_utils.get_current_user)):
    page = db.query(models.WikiPage).filter(models.WikiPage.id == page_id).first()
    if not page: raise HTTPException(404, "Wiki sayfası bulunamadı.")
    member = db.query(models.GuildMember).filter(models.GuildMember.guild_id == page.guild_id, models.GuildMember.user_id == current_user.id).first()
    if not member: raise HTTPException(403, "Bu sunucunun üyesi değilsiniz.")
    for key, value in data.dict(exclude_unset=True).items():
        setattr(page, key, value)
    db.commit(); db.refresh(page)
    return page

@app.delete("/api/wiki/{page_id}")
def delete_wiki_page(page_id: int, db: Session = Depends(database.get_db),
                     current_user: models.User = Depends(auth_utils.get_current_user)):
    page = db.query(models.WikiPage).filter(models.WikiPage.id == page_id).first()
    if not page: raise HTTPException(404, "Wiki sayfası bulunamadı.")
    guild = db.query(models.Guild).filter(models.Guild.id == page.guild_id).first()
    if page.author_id != current_user.id and guild.owner_id != current_user.id:
        raise HTTPException(403, "Yalnızca yazar veya sunucu sahibi silebilir.")
    db.delete(page); db.commit()
    return {"ok": True}


# ─── ZAMANLANMIŞ MESAJLAR ──────────────────────
@app.post("/api/channels/{channel_id}/scheduled", response_model=schemas.ScheduledMessageResponse)
def create_scheduled_message(channel_id: int, data: schemas.ScheduledMessageCreate,
                             db: Session = Depends(database.get_db),
                             current_user: models.User = Depends(auth_utils.get_current_user)):
    channel = db.query(models.Channel).filter(models.Channel.id == channel_id).first()
    if not channel: raise HTTPException(404, "Kanal bulunamadı.")
    msg = models.ScheduledMessage(channel_id=channel_id, author_id=current_user.id, content=data.content, scheduled_at=data.scheduled_at)
    db.add(msg); db.commit(); db.refresh(msg)
    return msg

@app.get("/api/channels/{channel_id}/scheduled", response_model=list[schemas.ScheduledMessageResponse])
def get_scheduled_messages(channel_id: int, db: Session = Depends(database.get_db),
                           current_user: models.User = Depends(auth_utils.get_current_user)):
    return db.query(models.ScheduledMessage).filter(
        models.ScheduledMessage.channel_id == channel_id,
        models.ScheduledMessage.author_id == current_user.id,
        models.ScheduledMessage.sent == False
    ).order_by(models.ScheduledMessage.scheduled_at.asc()).all()

@app.delete("/api/scheduled/{msg_id}")
def delete_scheduled_message(msg_id: int, db: Session = Depends(database.get_db),
                             current_user: models.User = Depends(auth_utils.get_current_user)):
    msg = db.query(models.ScheduledMessage).filter(models.ScheduledMessage.id == msg_id, models.ScheduledMessage.author_id == current_user.id).first()
    if not msg: raise HTTPException(404, "Zamanlanmış mesaj bulunamadı.")
    db.delete(msg); db.commit()
    return {"ok": True}

# ─── DM (DIRECT MESSAGES) ───────────────────────
@app.get("/api/dms", response_model=list[schemas.ChannelResponse])
def get_my_dms(db: Session = Depends(database.get_db),
               current_user: models.User = Depends(auth_utils.get_current_user)):
    # Join with channel_participants to find all DM channels user is part of
    dms = db.query(models.Channel).join(models.ChannelParticipant).filter(
        models.Channel.is_dm == True,
        models.ChannelParticipant.user_id == current_user.id
    ).all()
    
    # Get other participants for each DM to show as "friend" in the UI
    result = []
    for d in dms:
        # Get participants of this channel
        participants = db.query(models.User).join(models.ChannelParticipant).filter(
            models.ChannelParticipant.channel_id == d.id
        ).all()
        # Friend is the one that's NOT current_user
        friend = next((p for p in participants if p.id != current_user.id), None)
        # We need a plain dict or monkeypatch the model object since it's used in response_model
        d.friend = friend
        result.append(d)
    return result

@app.post("/api/dms/start/{target_user_id}", response_model=schemas.ChannelResponse)
def start_dm(target_user_id: int, db: Session = Depends(database.get_db),
              current_user: models.User = Depends(auth_utils.get_current_user)):
    target_user = db.query(models.User).filter(models.User.id == target_user_id).first()
    if not target_user: raise HTTPException(404, "Kullanıcı bulunamadı.")
    
    # Check if a DM channel already exists between these two
    # We find channels where both current_user and target_user are participants
    subquery = db.query(models.ChannelParticipant.channel_id).filter(
        models.ChannelParticipant.user_id == current_user.id
    ).all()
    channel_ids = [r[0] for r in subquery]
    
    existing = db.query(models.Channel).join(models.ChannelParticipant).filter(
        models.Channel.id.in_(channel_ids),
        models.Channel.is_dm == True,
        models.ChannelParticipant.user_id == target_user_id
    ).first()
    
    if existing: 
        # Attach friend info also for existing channels
        existing.friend = target_user
        return existing
    
    # Create new DM channel
    new_dm = models.Channel(name=f"DM-{target_user_id}", is_dm=True, guild_id=None, channel_type="text")
    db.add(new_dm); db.flush()
    db.add(models.ChannelParticipant(user_id=current_user.id, channel_id=new_dm.id))
    if current_user.id != target_user_id:
        db.add(models.ChannelParticipant(user_id=target_user_id, channel_id=new_dm.id))
    db.commit(); db.refresh(new_dm)
    # Attach target user as friend before returning
    new_dm.friend = target_user
    return new_dm

# ─── ÜYE BİLGİSİ (POPOUT İÇİN) ────────────────
@app.get("/api/guilds/{guild_id}/members/{user_id}")
def get_guild_member_info(guild_id: int, user_id: int, db: Session = Depends(database.get_db),
                          current_user: models.User = Depends(auth_utils.get_current_user)):
    member = db.query(models.GuildMember).filter(
        models.GuildMember.guild_id == guild_id,
        models.GuildMember.user_id == user_id
    ).first()
    if not member:
        raise HTTPException(404, "Üye bulunamadı.")
    user = db.query(models.User).filter(models.User.id == user_id).first()
    roles_list = [{"id": r.id, "name": r.name, "color": r.color, "permissions": r.permissions} for r in member.roles]
    return {
        "id": user.id, "username": user.username, "tag": user.tag,
        "display_name": user.display_name, "avatar_url": user.avatar_url,
        "banner_color": user.banner_color, "about_me": user.about_me,
        "nickname": member.nickname, "roles": roles_list
    }
