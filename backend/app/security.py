from datetime import datetime, timezone, timedelta

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(subject: int | str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.access_token_expire_minutes
    )
    to_encode = {"sub": str(subject), "exp": expire}
    return jwt.encode(
        to_encode,
        settings.secret_key,
        algorithm=settings.algorithm,
    )


def decode_access_token(token: str) -> int | None:
    try:
        payload = jwt.decode(
            token,
            settings.secret_key,
            algorithms=[settings.algorithm],
        )
        sub = payload.get("sub")
        return int(sub) if sub else None
    except JWTError:
        return None
