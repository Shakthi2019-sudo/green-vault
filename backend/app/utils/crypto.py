import os
import hashlib
import secrets
from typing import Tuple
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, VerificationError
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from app.config import settings

# Initialize Argon2id password hasher with recommended secure parameters
_ph = PasswordHasher(
    time_cost=2,
    memory_cost=65536,  # 64 MB
    parallelism=2,
    hash_len=32,
    salt_len=16
)

def hash_password(plain_password: str) -> str:
    """Hash password using Argon2id algorithm."""
    return _ph.hash(plain_password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against Argon2id hash."""
    try:
        return _ph.verify(hashed_password, plain_password)
    except (VerifyMismatchError, VerificationError):
        return False

def generate_strong_password(length: int = 16) -> str:
    """Generate cryptographically strong random password for demo accounts."""
    # Alphanumeric with symbols
    alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%^&*"
    return "".join(secrets.choice(alphabet) for _ in range(length))

def compute_sha256(data: bytes) -> str:
    """Compute SHA-256 hex digest for document integrity verification."""
    return hashlib.sha256(data).hexdigest()

def get_aes_key() -> bytes:
    """Get the 256-bit AES Master Key."""
    return bytes.fromhex(settings.AES_MASTER_KEY_HEX)

def encrypt_document_bytes(plaintext: bytes) -> Tuple[bytes, str, str]:
    """
    Encrypt document data using AES-256-GCM.
    Returns: (ciphertext, iv_hex, tag_hex)
    Note: AESGCM.encrypt appends 16-byte authentication tag to ciphertext.
    """
    key = get_aes_key()
    aesgcm = AESGCM(key)
    # Generate standard 12-byte (96-bit) IV nonce for GCM
    iv = os.urandom(12)
    # Encrypt (result contains ciphertext + 16-byte tag at the end)
    ct_with_tag = aesgcm.encrypt(iv, plaintext, None)
    ciphertext = ct_with_tag[:-16]
    tag = ct_with_tag[-16:]
    return ciphertext, iv.hex(), tag.hex()

def decrypt_document_bytes(ciphertext: bytes, iv_hex: str, tag_hex: str) -> bytes:
    """
    Decrypt document data using AES-256-GCM.
    Re-attaches authentication tag and validates integrity.
    """
    key = get_aes_key()
    aesgcm = AESGCM(key)
    iv = bytes.fromhex(iv_hex)
    tag = bytes.fromhex(tag_hex)
    ct_with_tag = ciphertext + tag
    return aesgcm.decrypt(iv, ct_with_tag, None)
