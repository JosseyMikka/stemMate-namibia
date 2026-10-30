"""Verified family links and deliberately limited home progress, never learner prose."""
import secrets
import time
from typing import Literal
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from modules import accounts

router=APIRouter()
SCHEMA='''
CREATE TABLE IF NOT EXISTS family_invites(learner_id INTEGER PRIMARY KEY, code_hash TEXT UNIQUE, expires REAL);
CREATE TABLE IF NOT EXISTS family_links(id INTEGER PRIMARY KEY, learner_id INTEGER NOT NULL REFERENCES accounts(id), guardian_id INTEGER NOT NULL REFERENCES accounts(id), confirmed INTEGER NOT NULL DEFAULT 0, verified INTEGER NOT NULL DEFAULT 0, share INTEGER NOT NULL DEFAULT 0, UNIQUE(learner_id,guardian_id));
CREATE TABLE IF NOT EXISTS family_verifications(link_id INTEGER PRIMARY KEY REFERENCES family_links(id) ON DELETE CASCADE, reference TEXT NOT NULL, verified_at REAL NOT NULL);
CREATE TABLE IF NOT EXISTS home_tasks(id INTEGER PRIMARY KEY, link_id INTEGER NOT NULL REFERENCES family_links(id) ON DELETE CASCADE, course_id TEXT NOT NULL, grade INTEGER NOT NULL, exam_year INTEGER NOT NULL, topic_id TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS home_progress(link_id INTEGER NOT NULL REFERENCES family_links(id) ON DELETE CASCADE, course_id TEXT NOT NULL, topic_id TEXT NOT NULL, event TEXT NOT NULL, support TEXT NOT NULL, total INTEGER NOT NULL, PRIMARY KEY(link_id,course_id,topic_id,event,support));
'''

def init(c):c.executescript(SCHEMA)

def role(user, expected):
    if user['role']!=expected:raise HTTPException(403,'This action is unavailable for your account role.')

def link(c, ident, user, active=False):
    row=c.execute('SELECT * FROM family_links WHERE id=?',(ident,)).fetchone()
    if not row or user['id'] not in (row['learner_id'],row['guardian_id']):raise HTTPException(404,'Family link not found.')
    if active and not (row['confirmed'] and row['verified']):raise HTTPException(409,'Learner confirmation and administrator verification are required.')
    return row

@router.get('/family')
def listing(user=Depends(accounts.current_user)):
    with accounts.db() as c:
        init(c)
        rows=c.execute('SELECT f.*, a.username AS learner_alias, g.username AS guardian_alias FROM family_links f JOIN accounts a ON a.id=f.learner_id JOIN accounts g ON g.id=f.guardian_id WHERE learner_id=? OR guardian_id=?',(user['id'],user['id'])).fetchall()
        return [dict(r) for r in rows]

@router.post('/family/invitation')
def invitation(user=Depends(accounts.current_user)):
    role(user,'learner');code=secrets.token_hex(16).upper()
    with accounts.db() as c:
        init(c)
        c.execute('INSERT OR REPLACE INTO family_invites VALUES(?,?,?)',(user['id'],accounts.digest(code),time.time()+900))
    return {'code':code,'notice':'Share privately with your guardian. Expires in 15 minutes; legal guardianship must still be verified.'}

class Claim(BaseModel):code:str=Field(min_length=32,max_length=32)
@router.post('/family/claim')
def claim(value:Claim,user=Depends(accounts.current_user)):
    role(user,'guardian')
    with accounts.db() as c:
        init(c);c.execute('BEGIN IMMEDIATE')
        row=c.execute('SELECT * FROM family_invites WHERE code_hash=? AND expires>?',(accounts.digest(value.code.upper()),time.time())).fetchone()
        if not row:raise HTTPException(404,'Invalid or expired invitation.')
        if c.execute('SELECT count(*) FROM family_links WHERE learner_id=?',(row['learner_id'],)).fetchone()[0]>=3:raise HTTPException(409,'Contact the administrator to review family access.')
        c.execute('INSERT OR IGNORE INTO family_links(learner_id,guardian_id) VALUES(?,?)',(row['learner_id'],user['id']))
        c.execute('DELETE FROM family_invites WHERE learner_id=?',(row['learner_id'],))
    return {'pending':True}

class Confirm(BaseModel):share_progress:bool=False
@router.put('/family/{ident}')
def confirm(ident:int,value:Confirm,user=Depends(accounts.current_user)):
    role(user,'learner')
    with accounts.db() as c:
        init(c);link(c,ident,user)
        c.execute('UPDATE family_links SET confirmed=1, share=? WHERE id=?',(value.share_progress,ident))
        if not value.share_progress:c.execute('DELETE FROM home_progress WHERE link_id=?',(ident,))
    return {'confirmed':True}

@router.delete('/family/{ident}')
def revoke(ident:int,user=Depends(accounts.current_user)):
    with accounts.db() as c:
        init(c);row=link(c,ident,user)
        # Also invalidate research permissions and remove linked learner research records.
        from modules import research
        research.init(c)
        c.execute('DELETE FROM research_permissions WHERE link_id=?',(ident,))
        c.execute('DELETE FROM research_events WHERE user_id=?',(row['learner_id'],))
        c.execute('DELETE FROM research_feedback WHERE user_id=?',(row['learner_id'],))
        c.execute('DELETE FROM home_progress WHERE link_id=?',(ident,))
        c.execute('DELETE FROM home_tasks WHERE link_id=?',(ident,))
        c.execute('DELETE FROM family_links WHERE id=?',(ident,))
    return {'revoked':True}

class Task(BaseModel):
    course_id:str
    grade:int=Field(ge=10,le=12)
    exam_year:int=Field(ge=2026,le=2027)
    topic_id:str=Field(max_length=80)

@router.post('/family/{ident}/practice')
def suggest(ident:int,value:Task,user=Depends(accounts.current_user)):
    role(user,'guardian')
    from modules.curricula import starter_plan,course_for
    course=course_for(value.course_id,value.grade,value.exam_year);starter_plan(course,value.topic_id)
    with accounts.db() as c:
        init(c);link(c,ident,user,True)
        # One replaceable curriculum suggestion per link; never free-form messages.
        c.execute('DELETE FROM home_tasks WHERE link_id=?',(ident,))
        c.execute('INSERT INTO home_tasks(link_id,course_id,grade,exam_year,topic_id) VALUES(?,?,?,?,?)',(ident,value.course_id,value.grade,value.exam_year,value.topic_id))
    return {'suggested':True}

@router.get('/family/{ident}/practice')
def practice(ident:int,user=Depends(accounts.current_user)):
    with accounts.db() as c:
        init(c);link(c,ident,user,True)
        return [dict(r) for r in c.execute('SELECT * FROM home_tasks WHERE link_id=?',(ident,))]

@router.get('/family/{ident}/progress')
def progress(ident:int,user=Depends(accounts.current_user)):
    with accounts.db() as c:
        init(c);r=link(c,ident,user,True)
        return {'sharing':bool(r['share']),'counts':[dict(x) for x in c.execute('SELECT course_id,topic_id,event,support,total FROM home_progress WHERE link_id=?',(ident,))] if r['share'] else [],'notice':'Home activity only, collected after sharing was enabled. Declared support and completion are not mastery scores.'}

def record(s,event):
    if s.class_id or not s.plan.get('_topic_id'):return
    with accounts.db() as c:
        init(c)
        for r in c.execute('SELECT id FROM family_links WHERE learner_id=? AND confirmed=1 AND verified=1 AND share=1',(s.owner_id,)).fetchall():
            c.execute('INSERT INTO home_progress VALUES(?,?,?,?,?,1) ON CONFLICT(link_id,course_id,topic_id,event,support) DO UPDATE SET total=total+1',(r['id'],s.plan['_practice_context']['course']['id'],s.plan['_topic_id'],event,s.plan.get('_support','unknown')))
