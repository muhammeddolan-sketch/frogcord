from sqlalchemy import Boolean, Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    display_name = Column(String, nullable=True)
    hashed_password = Column(String, nullable=False)
    avatar_url = Column(String, default="/logo.png")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    # İlişkiler
    owned_guilds = relationship("Guild", back_populates="owner", foreign_keys="Guild.owner_id")
    memberships = relationship("GuildMember", back_populates="user")
    messages = relationship("Message", back_populates="author")
    
    # Friendship ilişkileri (user_id_1 gönderen, user_id_2 alan olarak düşünebiliriz ama çift yönlü bakılacak)
    friendships_initiated = relationship("Friendship", foreign_keys="Friendship.user_id_1", back_populates="user1")
    friendships_received = relationship("Friendship", foreign_keys="Friendship.user_id_2", back_populates="user2")
    
    # Friendship ilişkileri (user_id_1 gönderen, user_id_2 alan olarak düşünebiliriz ama çift yönlü bakılacak)
    friendships_initiated = relationship("Friendship", foreign_keys="Friendship.user_id_1", back_populates="user1")
    friendships_received = relationship("Friendship", foreign_keys="Friendship.user_id_2", back_populates="user2")


class Guild(Base):
    """Sunucu (Discord'daki Guild/Server)"""
    __tablename__ = "guilds"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    icon_url = Column(String, default="/logo.png")
    invite_code = Column(String, unique=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # İlişkiler
    owner = relationship("User", back_populates="owned_guilds", foreign_keys=[owner_id])
    channels = relationship("Channel", back_populates="guild", cascade="all, delete-orphan")
    members = relationship("GuildMember", back_populates="guild", cascade="all, delete-orphan")


class GuildMember(Base):
    """Sunucu üyeliği (hangi kullanıcı hangi sunucuda)"""
    __tablename__ = "guild_members"

    id = Column(Integer, primary_key=True, index=True)
    guild_id = Column(Integer, ForeignKey("guilds.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    role = Column(String, default="member")  # owner, admin, member
    joined_at = Column(DateTime(timezone=True), server_default=func.now())

    # İlişkiler
    guild = relationship("Guild", back_populates="members")
    user = relationship("User", back_populates="memberships")


class Channel(Base):
    """Kanal (Metin/Ses kanalı)"""
    __tablename__ = "channels"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    channel_type = Column(String, default="text")  # text, voice
    guild_id = Column(Integer, ForeignKey("guilds.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # İlişkiler
    guild = relationship("Guild", back_populates="channels")
    messages = relationship("Message", back_populates="channel", cascade="all, delete-orphan")


class Message(Base):
    """Mesaj"""
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text, nullable=False)
    channel_id = Column(Integer, ForeignKey("channels.id"), nullable=False)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # İlişkiler
    channel = relationship("Channel", back_populates="messages")
    author = relationship("User", back_populates="messages")

class Friendship(Base):
    """Arkadaşlık bağlantısı ve istekleri"""
    __tablename__ = "friendships"

    id = Column(String, primary_key=True, index=True)
    user_id_1 = Column(Integer, ForeignKey("users.id"), nullable=False)
    user_id_2 = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(String, default="pending")  # pending, accepted
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # İlişkiler
    user1 = relationship("User", foreign_keys=[user_id_1], back_populates="friendships_initiated")
    user2 = relationship("User", foreign_keys=[user_id_2], back_populates="friendships_received")


