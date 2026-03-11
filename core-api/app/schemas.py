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
    display_name: Optional[str]
    avatar_url: Optional[str] = '/logo.png'
    banner_color: Optional[str] = '#5865f2'
    about_me: Optional[str] = None
    is_active: bool
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

class ChannelResponse(BaseModel):
    id: int
    name: str
    channel_type: str
    guild_id: int
    created_at: datetime
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
    class Config:
        from_attributes = True

class GuildMemberResponse(BaseModel):
    id: int
    guild_id: int
    user_id: int
    role: str
    class Config:
        from_attributes = True

# ---- Message Schemas ----
class MessageCreate(BaseModel):
    content: str

class MessageResponse(BaseModel):
    id: int
    content: str
    channel_id: int
    author_id: int
    author: UserResponse
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
