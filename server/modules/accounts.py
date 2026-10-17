"""Pseudonymous accounts and class authorization in a separate private SQLite DB."""
import hashlib
import os
import secrets
import sqlite3
import time
from contextlib import contextmanager
from pathlib import Path
from typing import Literal
from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field
from modules.curricula import course_for

router = APIRouter()
SCHEMA = '''
CREATE TABLE IF NOT EXISTS projects (
 id INTEGER PRIMARY KEY, class_id INTEGER NOT NULL REFERENCES classes(id),
 body TEXT NOT NULL, revision INTEGER NOT NULL, updated REAL NOT NULL);

CREATE TABLE IF NOT EXISTS accounts (
 id INTEGER PRIMARY KEY, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL,
 role TEXT NOT NULL CHECK(role IN ('teacher','learner')));
CREATE TABLE IF NOT EXISTS auth_sessions (
 token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES accounts(id), expires REAL NOT NULL);
CREATE TABLE IF NOT EXISTS classes (
 id INTEGER PRIMARY KEY, teacher_id INTEGER NOT NULL REFERENCES accounts(id), name TEXT NOT NULL,
 grade INTEGER NOT NULL, course_id TEXT NOT NULL, exam_year INTEGER NOT NULL,
 max_hints INTEGER NOT NULL DEFAULT 3, paused INTEGER NOT NULL DEFAULT 0,
 evaluation_enabled INTEGER NOT NULL DEFAULT 0, voice_input_enabled INTEGER NOT NULL DEFAULT 1,
 join_hash TEXT UNIQUE, join_expires REAL NOT NULL);
CREATE TABLE IF NOT EXISTS enrolments (
 class_id INTEGER NOT NULL REFERENCES classes(id), learner_id INTEGER NOT NULL REFERENCES accounts(id),
 PRIMARY KEY(class_id,learner_id));
CREATE TABLE IF NOT EXISTS activity_counts (
 class_id INTEGER NOT NULL REFERENCES classes(id), event TEXT NOT NULL, total INTEGER NOT NULL,
 PRIMARY KEY(class_id,event));
'''

@contextmanager
def db():
    path = Path(os.getenv('STEMMATE_ACCOUNTS_DB', str(Path(__file__).parent.parent / 'private' / 'accounts.sqlite3')))
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    connection = sqlite3.connect(path, timeout=10)
    path.chmod(0o600)
    connection.row_factory = sqlite3.Row
    connection.execute('PRAGMA foreign_keys=ON')
    connection.executescript(SCHEMA)
    try:
        yield connection
        connection.commit()
    finally:
        connection.close()


def digest(value):
    return hashlib.sha256(value.encode()).hexdigest()


def password_hash(password, salt=None):
    salt = salt or secrets.token_hex(16)
    hashed = hashlib.scrypt(password.encode(), salt=bytes.fromhex(salt), n=16384, r=8, p=1).hex()
    return salt + ':' + hashed


def issue_session(connection, user):
    token = secrets.token_urlsafe(32)
    connection.execute('DELETE FROM auth_sessions WHERE expires <= ?', (time.time(),))
    connection.execute('INSERT INTO auth_sessions VALUES (?,?,?)', (digest(token),user['id'],time.time()+8*3600))
    return {'token':token,'user':{'id':user['id'],'username':user['username'],'role':user['role']}}


def current_user(authorization: str = Header(default='')):
    if not authorization.startswith('Bearer '):
        raise HTTPException(401, 'Sign in to continue.')
    token = authorization[7:]
    with db() as connection:
        row = connection.execute('SELECT a.* FROM accounts a JOIN auth_sessions s ON a.id=s.user_id WHERE s.token_hash=? AND s.expires>?', (digest(token),time.time())).fetchone()
    if not row:
        raise HTTPException(401, 'Your sign-in has expired. Sign in again.')
    return {'id':row['id'],'username':row['username'],'role':row['role']}


class Credentials(BaseModel):
    username: str = Field(pattern=r'^[a-zA-Z0-9_-]{3,40}$')
    password: str = Field(min_length=12, max_length=128)

class Registration(Credentials):
    role: Literal['teacher','learner'] = 'learner'
    invitation: str = Field(default='', max_length=200)

class ClassCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    grade: int = Field(ge=10, le=12)
    course_id: str
    exam_year: int = Field(ge=2026, le=2027)

class ClassPolicy(BaseModel):
    max_hints: int = Field(ge=0, le=3)
    paused: bool
    evaluation_enabled: bool
    voice_input_enabled: bool

class Join(BaseModel):
    code: str = Field(min_length=8, max_length=32)


def class_access(class_id, user, teacher_only=False):
    with db() as connection:
        row = connection.execute('SELECT * FROM classes WHERE id=?', (class_id,)).fetchone()
        if not row:
            raise HTTPException(404,'Class not found.')
        owner = user['role']=='teacher' and row['teacher_id']==user['id']
        member = user['role']=='learner' and connection.execute('SELECT 1 FROM enrolments WHERE class_id=? AND learner_id=?',(class_id,user['id'])).fetchone()
    if not owner and (teacher_only or not member):
        raise HTTPException(403,'You do not have access to this class.')
    return public_class(dict(row))


def public_class(row):
    result = {key:row[key] for key in ('id','name','grade','course_id','exam_year','max_hints','paused','evaluation_enabled','voice_input_enabled')}
    for key in ('paused','evaluation_enabled','voice_input_enabled'):
        result[key] = bool(result[key])
    result['course'] = course_for(result['course_id'],result['grade'],result['exam_year'])
    return result


@router.post('/auth/register')
def register(value: Registration):
    if value.role == 'teacher':
        expected = os.getenv('STEMMATE_TEACHER_INVITE','')
        if len(expected)<24 or not secrets.compare_digest(value.invitation.encode(),expected.encode()):
            raise HTTPException(403,'Ask your administrator for a valid teacher invitation.')
    with db() as connection:
        try:
            cursor = connection.execute('INSERT INTO accounts(username,password_hash,role) VALUES(?,?,?)', (value.username.lower(),password_hash(value.password),value.role))
        except sqlite3.IntegrityError:
            raise HTTPException(409,'That username is unavailable. Choose another alias.')
        return issue_session(connection,{'id':cursor.lastrowid,'username':value.username.lower(),'role':value.role})

@router.post('/auth/login')
def login(value: Credentials):
    with db() as connection:
        row = connection.execute('SELECT * FROM accounts WHERE username=?',(value.username.lower(),)).fetchone()
        # Always run the expensive hash, including for unknown aliases.
        stored = row['password_hash'] if row else '0'*32+':'+'0'*128
        candidate = password_hash(value.password,stored.split(':')[0])
        if not row or not secrets.compare_digest(candidate,stored):
            raise HTTPException(401,'Username or password is incorrect.')
        return issue_session(connection,dict(row))

@router.post('/auth/logout')
def logout(user=Depends(current_user),authorization: str = Header(default='')):
    with db() as connection:
        connection.execute('DELETE FROM auth_sessions WHERE token_hash=?',(digest(authorization[7:]),))
    return {'signed_out':True}

@router.get('/auth/me')
def me(user=Depends(current_user)):
    return user

@router.get('/classes')
def classes(user=Depends(current_user)):
    with db() as connection:
        if user['role']=='teacher':
            rows = connection.execute('SELECT * FROM classes WHERE teacher_id=? ORDER BY id',(user['id'],)).fetchall()
        else:
            rows = connection.execute('SELECT c.* FROM classes c JOIN enrolments e ON e.class_id=c.id WHERE e.learner_id=? ORDER BY c.id',(user['id'],)).fetchall()
    return [public_class(dict(row)) for row in rows]


def invite(connection, class_id):
    code = secrets.token_hex(6).upper()
    connection.execute('UPDATE classes SET join_hash=?,join_expires=? WHERE id=?',(digest(code),time.time()+7*86400,class_id))
    return code

@router.post('/classes')
def create_class(value: ClassCreate,user=Depends(current_user)):
    if user['role']!='teacher':
        raise HTTPException(403,'Only teachers can create classes.')
    course_for(value.course_id,value.grade,value.exam_year)
    if not value.name.strip():
        raise HTTPException(422,'Give the class a name.')
    with db() as connection:
        cursor=connection.execute('INSERT INTO classes(teacher_id,name,grade,course_id,exam_year,join_expires) VALUES(?,?,?,?,?,0)',(user['id'],value.name.strip(),value.grade,value.course_id,value.exam_year))
        code=invite(connection,cursor.lastrowid)
        row=connection.execute('SELECT * FROM classes WHERE id=?',(cursor.lastrowid,)).fetchone()
    return {'classroom':public_class(dict(row)),'join_code':code}

@router.post('/classes/join')
def join_class(value: Join,user=Depends(current_user)):
    if user['role']!='learner':
        raise HTTPException(403,'Learner accounts can join classes. Teachers create their own classes.')
    with db() as connection:
        row=connection.execute('SELECT * FROM classes WHERE join_hash=? AND join_expires>?',(digest(value.code.strip().upper()),time.time())).fetchone()
        if not row:
            raise HTTPException(404,'This class code is invalid or expired. Ask your teacher for a new one.')
        connection.execute('INSERT OR IGNORE INTO enrolments VALUES(?,?)',(row['id'],user['id']))
    return public_class(dict(row))

@router.put('/classes/{class_id}/policy')
def set_policy(class_id: int,value: ClassPolicy,user=Depends(current_user)):
    class_access(class_id,user,True)
    with db() as connection:
        connection.execute('UPDATE classes SET max_hints=?,paused=?,evaluation_enabled=?,voice_input_enabled=? WHERE id=?',(value.max_hints,value.paused,value.evaluation_enabled,value.voice_input_enabled,class_id))
        if not value.evaluation_enabled:
            connection.execute('DELETE FROM activity_counts WHERE class_id=?',(class_id,))
    return class_access(class_id,user,True)

@router.post('/classes/{class_id}/invitation')
def rotate_invitation(class_id:int,user=Depends(current_user)):
    class_access(class_id,user,True)
    with db() as connection:
        code=invite(connection,class_id)
    return {'join_code':code}

@router.get('/classes/{class_id}/members')
def members(class_id:int,user=Depends(current_user)):
    class_access(class_id,user,True)
    with db() as connection:
        rows=connection.execute('SELECT a.id,a.username FROM accounts a JOIN enrolments e ON e.learner_id=a.id WHERE e.class_id=? ORDER BY a.username',(class_id,)).fetchall()
    return [dict(row) for row in rows]

@router.delete('/classes/{class_id}/members/{learner_id}')
def remove_member(class_id:int,learner_id:int,user=Depends(current_user)):
    if not (user['role']=='learner' and user['id']==learner_id):
        class_access(class_id,user,True)
    with db() as connection:
        connection.execute('DELETE FROM enrolments WHERE class_id=? AND learner_id=?',(class_id,learner_id))
    return {'removed':True}


def record(class_id,event):
    with db() as connection:
        connection.execute('INSERT INTO activity_counts VALUES(?,?,1) ON CONFLICT(class_id,event) DO UPDATE SET total=total+1',(class_id,event))

@router.get('/classes/{class_id}/evaluation')
def evaluation(class_id:int,user=Depends(current_user)):
    class_access(class_id,user,True)
    with db() as connection:
        size=connection.execute('SELECT COUNT(*) FROM enrolments WHERE class_id=?',(class_id,)).fetchone()[0]
        rows=connection.execute('SELECT event,total FROM activity_counts WHERE class_id=?',(class_id,)).fetchall()
    return {'counts':{r['event']:r['total'] for r in rows} if size>=5 else {}, 'suppressed':size<5,
            'notice':'Process totals, not learning scores. Counts hidden for classes with fewer than five enrolled learners.'}

@router.delete('/classes/{class_id}/evaluation')
def delete_evaluation(class_id:int,user=Depends(current_user)):
    class_access(class_id,user,True)
    with db() as connection:
        connection.execute('DELETE FROM activity_counts WHERE class_id=?',(class_id,))
    return {'deleted':True}
