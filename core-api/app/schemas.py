from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

# ---- User Schemas ----
class UserCreate(BaseModel):
    email: EmailStr
    username: str
    display_name: Optional[str] = None
    password: str

class UserResponse(BaseModel):
    id: int
    email: EmailStr
    username: str
    tag: str
    display_name: Optional[str]
    custom_status: Optional[str] = None
    avatar_url: Optional[str] = '/logo.png'
    banner_color: Optional[str] = '#5865f2'
    about_me: Optional[str] = None
    is_active: bool
    is_verified: bool
    created_at: datetime
    class Config:
        from_attributes = True

# ---- Auth Schemas ----
class Token(BaseModel):
    access_token: str
    token_type: str

# ---- Channel Schemas ----
class ChannelCreate(BaseModel):
    name: str
    channel_type: Optional[str] = "text"

class ParticipantResponse(BaseModel):
    user_id: int
    user: Optional[UserResponse] = None
    class Config:
        from_attributes = True

class ChannelResponse(BaseModel):
    id: int
    name: str
    channel_type: str
    is_dm: bool = False
    guild_id: Optional[int] = None
    created_at: datetime
    friend: Optional[UserResponse] = None
    class Config:
        from_attributes = True

# ---- Role Schemas ----
class RoleBase(BaseModel):
    name: str
    color: Optional[str] = "#99aab5"
    hoist: Optional[bool] = False
    mentionable: Optional[bool] = False
    permissions: Optional[int] = 0
    position: Optional[int] = 0

class RoleCreate(RoleBase):
    pass

class RoleUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None
    hoist: Optional[bool] = None
    mentionable: Optional[bool] = None
    permissions: Optional[int] = None
    position: Optional[int] = None

class RoleResponse(RoleBase):
    id: int
    guild_id: int
    class Config:
        from_attributes = True

# ---- Guild Member Schema ----
class GuildMemberResponse(BaseModel):
    id: int
    guild_id: int
    user_id: int
    role: str
    nickname: Optional[str] = None
    user: Optional[UserResponse] = None
    roles: List[RoleResponse] = []
    class Config:
        from_attributes = True

# ---- Guild Schemas ----
class GuildCreate(BaseModel):
    name: str
    description: Optional[str] = None

class GuildResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    icon_url: str
    invite_code: str
    owner_id: int
    created_at: datetime
    channels: List[ChannelResponse] = []
    members: List[GuildMemberResponse] = []
    class Config:
        from_attributes = True

# ---- Message Schemas ----
class MessageCreate(BaseModel):
    content: str
    reply_to_id: Optional[int] = None

class MessageEdit(BaseModel):
    content: str

class ReactionResponse(BaseModel):
    emoji: str
    count: int = 0
    users: List[str] = []
    user_reacted: bool = False

class MessageResponse(BaseModel):
    id: int
    content: str
    channel_id: int
    author_id: int
    author: UserResponse
    reply_to_id: Optional[int] = None
    is_pinned: bool = False
    is_edited: bool = False
    reactions: List[ReactionResponse] = []
    created_at: datetime
    class Config:
        from_attributes = True

# ---- Friend Schemas ----
class FriendRequest(BaseModel):
    target_username: str

class FriendshipResponse(BaseModel):
    id: str
    user_id_1: int
    user_id_2: int
    status: str
    created_at: datetime
    friend: Optional[UserResponse] = None
    
    class Config:
        from_attributes = True

# ---- Verification Schemas ----
class VerificationRequest(BaseModel):
    email: EmailStr

class VerificationConfirm(BaseModel):
    email: EmailStr
    code: str

# ---- Task Schemas ----
class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    priority: Optional[str] = "medium"
    assigned_to_id: Optional[int] = None
    due_date: Optional[datetime] = None

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None # todo, in_progress, done
    priority: Optional[str] = None
    assigned_to_id: Optional[int] = None
    due_date: Optional[datetime] = None

class TaskResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    status: str
    priority: str
    channel_id: int
    creator_id: int
    assigned_to_id: Optional[int]
    due_date: Optional[datetime]
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True

# ---- Bookmark Schemas ----
class BookmarkCreate(BaseModel):
    message_id: int
    note: Optional[str] = None

class BookmarkResponse(BaseModel):
    id: int
    user_id: int
    message_id: int
    note: Optional[str]
    created_at: datetime
    message: Optional[MessageResponse] = None
    class Config:
        from_attributes = True

# ---- Poll Schemas ----
class PollOptionCreate(BaseModel):
    text: str

class PollCreate(BaseModel):
    question: str
    options: List[str]
    is_anonymous: Optional[bool] = False
    is_multiple: Optional[bool] = False
    deadline: Optional[datetime] = None

class PollOptionResponse(BaseModel):
    id: int
    text: str
    vote_count: int = 0
    voters: List[str] = []
    class Config:
        from_attributes = True

class PollResponse(BaseModel):
    id: int
    channel_id: int
    creator_id: int
    question: str
    is_anonymous: bool
    is_multiple: bool
    deadline: Optional[datetime]
    created_at: datetime
    options: List[PollOptionResponse] = []
    total_votes: int = 0
    user_voted: bool = False
    class Config:
        from_attributes = True

# ---- Wiki Schemas ----
class WikiPageCreate(BaseModel):
    title: str
    content: Optional[str] = ""
    category: Optional[str] = "genel"

class WikiPageUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None

class WikiPageResponse(BaseModel):
    id: int
    guild_id: int
    title: str
    content: str
    category: str
    author_id: int
    created_at: datetime
    updated_at: Optional[datetime]
    class Config:
        from_attributes = True

# ---- Scheduled Message Schemas ----
class ScheduledMessageCreate(BaseModel):
    content: str
    scheduled_at: datetime

class ScheduledMessageResponse(BaseModel):
    id: int
    channel_id: int
    author_id: int
    content: str
    scheduled_at: datetime
    sent: bool
    created_at: datetime
    class Config:
        from_attributes = True
