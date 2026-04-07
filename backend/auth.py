import os
import logging
from typing import Optional

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, jwk, JWTError
from jose.utils import base64url_decode

logger = logging.getLogger("tradervue.auth")

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://awmvrbkqpadohwbddabn.supabase.co")

# Cache JWKS keys
_jwks_cache: dict = {}

security = HTTPBearer(auto_error=False)


class CurrentUser:
    def __init__(self, id: str, email: str):
        self.id = id
        self.email = email


async def _get_jwks() -> dict:
    global _jwks_cache
    if _jwks_cache:
        return _jwks_cache
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json")
        _jwks_cache = resp.json()
    return _jwks_cache


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> CurrentUser:
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")

    token = credentials.credentials

    try:
        # Get JWKS and find the right key
        jwks_data = await _get_jwks()
        header = jwt.get_unverified_header(token)
        kid = header.get("kid")

        key_data = None
        for k in jwks_data.get("keys", []):
            if k["kid"] == kid:
                key_data = k
                break

        if not key_data:
            logger.error(f"No matching JWK for kid={kid}")
            raise HTTPException(status_code=401, detail="Invalid token")

        # Build the public key and verify
        public_key = jwk.construct(key_data, algorithm="ES256")
        payload = jwt.decode(
            token,
            public_key,
            algorithms=["ES256"],
            audience="authenticated",
        )

        user_id = payload.get("sub")
        email = payload.get("email", "")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")

        return CurrentUser(id=user_id, email=email)

    except JWTError as e:
        logger.error(f"JWT decode failed: {e}")
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    except Exception as e:
        logger.error(f"Auth error: {e}")
        raise HTTPException(status_code=401, detail="Authentication failed")
