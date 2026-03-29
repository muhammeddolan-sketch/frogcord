from sqlalchemy import Boolean, Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    tag = Column(String, index=True, nullable=False) # e.g. 1234
    display_name = Column(String, nullable=True)
    custom_status = Column(String, nullable=True)  # "Oyun oynuyor 🎮"
    hashed_password = Column(String, nullable=False)
    avatar_url = Column(String, default="/logo.png")
    banner_color = Column(String, default="#5865f2")
    about_me = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    # İlişkiler
    owned_guilds = relationship("Guild", back_populates="owner", foreign_keys="Guild.owner_id")
    memberships = relationship("GuildMember", back_populates="user")
    messages = relationship("Message", back_populates="author")
    friendships_initiated = relationship("Friendship", foreign_keys="Friendship.user_id_1", back_populates="user1", cascade="all, delete-orphan")
    friendships_received = relationship("Friendship", foreign_keys="Friendship.user_id_2", back_populates="user2", cascade="all, delete-orphan")
    channels = relationship("Channel", secondary="channel_participants", back_populates="participants")


class Guild(Base):
    """Sunucu (Frogcord'daki Guild/Server)"""
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
    role = Column(String, default="member")  # owner, admin, member (legacy)
    nickname = Column(String, nullable=True)
    joined_at = Column(DateTime(timezone=True), server_default=func.now())

    # İlişkiler
    guild = relationship("Guild", back_populates="members")
    user = relationship("User", back_populates="memberships")
    roles = relationship("Role", secondary="member_roles", back_populates="members")


class Role(Base):
    """Sunucu Rolü (Discord tarzı)"""
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    guild_id = Column(Integer, ForeignKey("guilds.id"), nullable=False)
    name = Column(String, nullable=False)
    color = Column(String, default="#99aab5")
    hoist = Column(Boolean, default=False)  # Üyeleri listede ayrı göster
    mentionable = Column(Boolean, default=False)
    permissions = Column(Integer, default=0) # Bitmask
    position = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # İlişkiler
    members = relationship("GuildMember", secondary="member_roles", back_populates="roles")


class MemberRole(Base):
    """Member <-> Role many-to-many junction table"""
    __tablename__ = "member_roles"

    member_id = Column(Integer, ForeignKey("guild_members.id"), primary_key=True)
    role_id = Column(Integer, ForeignKey("roles.id"), primary_key=True)


class Channel(Base):
    """Kanal (Metin/Ses kanalı)"""
    __tablename__ = "channels"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    channel_type = Column(String, default="text")  # text, voice
    is_dm = Column(Boolean, default=False)
    guild_id = Column(Integer, ForeignKey("guilds.id"), nullable=True) # DMs have no guild
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # İlişkiler
    guild = relationship("Guild", back_populates="channels")
    messages = relationship("Message", back_populates="channel", cascade="all, delete-orphan")
    participants = relationship("User", secondary="channel_participants", back_populates="channels")


class ChannelParticipant(Base):
    """Kanal Katılımcıları (Özellikle DM kanalları için)"""
    __tablename__ = "channel_participants"

    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    channel_id = Column(Integer, ForeignKey("channels.id"), primary_key=True)


class Message(Base):
    """Mesaj"""
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text, nullable=False)
    channel_id = Column(Integer, ForeignKey("channels.id"), nullable=False)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    reply_to_id = Column(Integer, ForeignKey("messages.id"), nullable=True)
    is_pinned = Column(Boolean, default=False)
    is_edited = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # İlişkiler
    channel = relationship("Channel", back_populates="messages")
    author = relationship("User", back_populates="messages")
    reply_to = relationship("Message", remote_side=[id], backref="replies")
    reactions = relationship("MessageReaction", back_populates="message", cascade="all, delete-orphan")

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


class VerificationCode(Base):
    """E-posta doğrulaması için OTP kodları"""
    __tablename__ = "verification_codes"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, index=True, nullable=False)
    code = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Task(Base):
    """Kanal içi görevler (Kanban/Checklist)"""
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String, default="todo") # todo, in_progress, done
    priority = Column(String, default="medium") # low, medium, high
    channel_id = Column(Integer, ForeignKey("channels.id"), nullable=False)
    creator_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    assigned_to_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    due_date = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # İlişkiler
    channel = relationship("Channel", backref="tasks")
    creator = relationship("User", foreign_keys=[creator_id])
    assigned_to = relationship("User", foreign_keys=[assigned_to_id])


class MessageReaction(Base):
    """Mesaj emoji reaksiyonları"""
    __tablename__ = "message_reactions"

    id = Column(Integer, primary_key=True, index=True)
    message_id = Column(Integer, ForeignKey("messages.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    emoji = Column(String, nullable=False)  # "👍", "🐸", "❤️" etc.
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    message = relationship("Message", back_populates="reactions")
    user = relationship("User", backref="reactions")


class Bookmark(Base):
    """Kişisel mesaj yer imleri"""
    __tablename__ = "bookmarks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    message_id = Column(Integer, ForeignKey("messages.id"), nullable=False)
    note = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", backref="bookmarks")
    message = relationship("Message", backref="bookmarks")


class Poll(Base):
    """Gelişmiş anket sistemi"""
    __tablename__ = "polls"

    id = Column(Integer, primary_key=True, index=True)
    channel_id = Column(Integer, ForeignKey("channels.id"), nullable=False)
    creator_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    question = Column(String, nullable=False)
    is_anonymous = Column(Boolean, default=False)
    is_multiple = Column(Boolean, default=False)
    deadline = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    channel = relationship("Channel", backref="polls")
    creator = relationship("User", backref="polls_created")
    options = relationship("PollOption", back_populates="poll", cascade="all, delete-orphan")
    votes = relationship("PollVote", back_populates="poll", cascade="all, delete-orphan")


class PollOption(Base):
    """Anket seçeneği"""
    __tablename__ = "poll_options"

    id = Column(Integer, primary_key=True, index=True)
    poll_id = Column(Integer, ForeignKey("polls.id"), nullable=False)
    text = Column(String, nullable=False)

    poll = relationship("Poll", back_populates="options")
    votes = relationship("PollVote", back_populates="option", cascade="all, delete-orphan")


class PollVote(Base):
    """Anket oyu"""
    __tablename__ = "poll_votes"

    id = Column(Integer, primary_key=True, index=True)
    poll_id = Column(Integer, ForeignKey("polls.id"), nullable=False)
    option_id = Column(Integer, ForeignKey("poll_options.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    poll = relationship("Poll", back_populates="votes")
    option = relationship("PollOption", back_populates="votes")
    user = relationship("User", backref="poll_votes")


class WikiPage(Base):
    """Sunucu Wiki sayfası"""
    __tablename__ = "wiki_pages"

    id = Column(Integer, primary_key=True, index=True)
    guild_id = Column(Integer, ForeignKey("guilds.id"), nullable=False)
    title = Column(String, nullable=False)
    content = Column(Text, default="")
    category = Column(String, default="genel")
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    guild = relationship("Guild", backref="wiki_pages")
    author = relationship("User", backref="wiki_pages")


class ScheduledMessage(Base):
    """Zamanlanmış mesajlar"""
    __tablename__ = "scheduled_messages"

    id = Column(Integer, primary_key=True, index=True)
    channel_id = Column(Integer, ForeignKey("channels.id"), nullable=False)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    scheduled_at = Column(DateTime(timezone=True), nullable=False)
    sent = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    channel = relationship("Channel", backref="scheduled_messages")
    author = relationship("User", backref="scheduled_messages")
