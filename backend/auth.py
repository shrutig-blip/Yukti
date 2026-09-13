import os
import json
from datetime import datetime, timedelta
from typing import Optional, List

from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
import bcrypt
from pydantic import BaseModel, EmailStr

# ---------------------------------------------------------------------------
# Ported from the part1-part2 (Node/Express/MongoDB) branch's
# models/User.js + controllers/authController.js + middleware/authMiddleware.js.
# Same behavior (bcrypt password hashing, JWT bearer tokens, BIDDER /
# PROCUREMENT_OFFICER roles) — reimplemented for THIS repo's actual stack
# (FastAPI + flat-file storage), instead of introducing a second
# backend/database. Users are stored in a JSON file (data/data/users.json)
# rather than MongoDB, consistent with how the rest of this backend
# (bidders, tenders) already reads from flat files, not a database.
# ---------------------------------------------------------------------------

JWT_SECRET = os.environ.get("JWT_SECRET", "dev-only-insecure-secret-change-me")
JWT_ALGORITHM = "HS256"
JWT_EXPIRES_MINUTES = 24 * 60  # 1 day — same as the Node version's "1d"

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
USERS_FILE = os.path.join(BASE_DIR, "..", "data", "data", "users.json")

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password_raw(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
bearer_scheme = HTTPBearer(auto_error=False)


class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    name: str
    email: str
    role: str


class TokenResponse(BaseModel):
    message: str
    token: str
    user: UserOut


def _load_users() -> List[dict]:
    if not os.path.exists(USERS_FILE):
        return []
    with open(USERS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def _save_users(users: List[dict]) -> None:
    os.makedirs(os.path.dirname(USERS_FILE), exist_ok=True)
    with open(USERS_FILE, "w", encoding="utf-8") as f:
        json.dump(users, f, indent=2)


def get_user_by_email(email: str) -> Optional[dict]:
    email = email.strip().lower()
    return next((u for u in _load_users() if u["email"] == email), None)


def create_user(name: str, email: str, password: str, role: str = "BIDDER") -> dict:
    users = _load_users()
    new_id = f"USR{len(users) + 1:04d}"
    user = {
        "id": new_id,
        "name": name.strip(),
        "email": email.strip().lower(),
        "password": hash_password(password),
        "role": role,
    }
    users.append(user)
    _save_users(users)
    return user


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return verify_password_raw(plain_password, hashed_password)


def create_access_token(user: dict) -> str:
    payload = {
        "user_id": user["id"],
        "role": user["role"],
        "exp": datetime.utcnow() + timedelta(minutes=JWT_EXPIRES_MINUTES),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict:
    """FastAPI dependency — equivalent to Node's authMiddleware.protect.
    Use on any route you want login-only: def route(user: dict = Depends(get_current_user))"""
    if credentials is None:
        raise HTTPException(status_code=401, detail="Not authorized. Please login.")
    payload = decode_access_token(credentials.credentials)
    users = _load_users()
    user = next((u for u in users if u["id"] == payload.get("user_id")), None)
    if user is None:
        raise HTTPException(status_code=401, detail="User not found.")
    return user


def to_user_out(user: dict) -> UserOut:
    return UserOut(id=user["id"], name=user["name"], email=user["email"], role=user["role"])