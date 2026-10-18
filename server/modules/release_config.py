"""Fail-closed production configuration; never include secret values in errors."""
import os
from pathlib import Path
from urllib.parse import urlsplit


def origins():
    return [v.strip() for v in os.getenv('STEMMATE_ORIGINS','http://localhost:5173').split(',') if v.strip()]


def positive_limit(name, default):
    try:
        value=int(os.getenv(name,str(default)))
    except ValueError:
        raise RuntimeError(f'{name} must be a positive integer.') from None
    if not 1<=value<=100000:
        raise RuntimeError(f'{name} must be between 1 and 100000.')
    return value


def validate():
    positive_limit('STEMMATE_AI_HOURLY_LIMIT',60)
    positive_limit('STEMMATE_AI_USER_HOURLY_LIMIT',12)
    environment=os.getenv('STEMMATE_ENV','development')
    if environment not in ('development','production'):
        raise RuntimeError('STEMMATE_ENV must be development or production.')
    if environment!='production':
        return
    allowed=origins()
    for value in allowed:
        parsed=urlsplit(value)
        if parsed.scheme!='https' or not parsed.hostname or parsed.hostname in ('localhost','127.0.0.1','::1') or parsed.username or parsed.password or parsed.path or parsed.query or parsed.fragment or '*' in value:
            raise RuntimeError('Production requires exact HTTPS STEMMATE_ORIGINS without paths or wildcards.')
    if not allowed:
        raise RuntimeError('Production requires STEMMATE_ORIGINS.')
    path=Path(os.getenv('STEMMATE_ACCOUNTS_DB',''))
    if not path.is_absolute() or path.name in ('stemmate.db','chroma.sqlite3'):
        raise RuntimeError('Production requires an absolute private STEMMATE_ACCOUNTS_DB path.')
    if len(os.getenv('STEMMATE_TEACHER_INVITE',''))<24:
        raise RuntimeError('Production requires a teacher invitation of at least 24 characters.')
    if os.getenv('STEMMATE_SINGLE_WORKER_ACK')!='1':
        raise RuntimeError('Set STEMMATE_SINGLE_WORKER_ACK=1 and run exactly one worker; sessions and limits are in memory.')

    if os.getenv('GROQ_API_KEY','').strip() and os.getenv('STEMMATE_PROVIDER_REVIEWED')!='1':
        raise RuntimeError('Review provider data controls and school permission, then set STEMMATE_PROVIDER_REVIEWED=1.')
