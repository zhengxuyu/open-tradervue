import os
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt

# Supabase JWT secret — find in Supabase Dashboard → Settings → API → JWT Secret
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")

security = HTTPBearer(auto_error=False)


class CurrentUser:
    """Represents the authenticated user from Supabase JWT."""
    def __init__(self, id: str, email: str):
        self.id = id
        self.email = email


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> CurrentUser:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    token = credentials.credentials
    import logging
    logger = logging.getLogger("tradervue.auth")
    import logging
    import json
    import base64
    logger = logging.getLogger("tradervue.auth")

    # Decode header to check algorithm
    try:
        header_b64 = token.split('.')[0]
        # Add padding
        header_b64 += '=' * (4 - len(header_b64) % 4)
        header = json.loads(base64.urlsafe_b64decode(header_b64))
        logger.info(f"JWT header: {header}")
    except Exception as e:
        logger.error(f"Failed to decode JWT header: {e}")

    try:
        # Try with the algorithm from the token header
        payload = jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256", "HS384", "HS512"],
            audience="authenticated",
        )
        user_id = payload.get("sub")
        email = payload.get("email", "")
        logger.info(f"Auth success: user={user_id}, email={email}")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        return CurrentUser(id=user_id, email=email)
    except JWTError as e:
        logger.error(f"JWT decode failed: {e}")

        # Fallback: try without audience verification
        try:
            payload = jwt.decode(
                token,
                SUPABASE_JWT_SECRET,
                algorithms=["HS256", "HS384", "HS512"],
                options={"verify_aud": False},
            )
            user_id = payload.get("sub")
            email = payload.get("email", "")
            logger.info(f"Auth success (no aud check): user={user_id}, email={email}")
            if not user_id:
                raise HTTPException(status_code=401, detail="Invalid token")
            return CurrentUser(id=user_id, email=email)
        except JWTError as e2:
            logger.error(f"JWT decode failed (fallback): {e2}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid or expired token",
            )
