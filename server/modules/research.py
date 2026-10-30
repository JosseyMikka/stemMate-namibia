"""Optional study records. Disabled without a complete, operator-reviewed study config."""
import json
import os
import time
from pathlib import Path
from typing import Literal
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, ConfigDict
from modules import accounts,family
router=APIRouter()
SCHEMA='''
CREATE TABLE IF NOT EXISTS research_decisions(id INTEGER PRIMARY KEY,study TEXT NOT NULL,actor_id INTEGER NOT NULL,subject_id INTEGER NOT NULL,version TEXT NOT NULL,decision TEXT NOT NULL,information TEXT NOT NULL,recorded REAL NOT NULL,expires REAL NOT NULL);
CREATE TABLE IF NOT EXISTS research_choices(study TEXT NOT NULL,user_id INTEGER NOT NULL REFERENCES accounts(id),version TEXT NOT NULL,participate INTEGER NOT NULL,survey INTEGER NOT NULL,updated REAL NOT NULL,expires REAL NOT NULL,PRIMARY KEY(study,user_id));
CREATE TABLE IF NOT EXISTS research_permissions(study TEXT NOT NULL,link_id INTEGER NOT NULL REFERENCES family_links(id) ON DELETE CASCADE,version TEXT NOT NULL,allowed INTEGER NOT NULL,updated REAL NOT NULL,expires REAL NOT NULL,PRIMARY KEY(study,link_id));
CREATE TABLE IF NOT EXISTS research_events(id INTEGER PRIMARY KEY,study TEXT NOT NULL,user_id INTEGER NOT NULL REFERENCES accounts(id),code TEXT NOT NULL,course TEXT NOT NULL,topic TEXT NOT NULL,event TEXT NOT NULL,support TEXT NOT NULL,version TEXT NOT NULL,expires REAL NOT NULL);
CREATE TABLE IF NOT EXISTS research_feedback(id INTEGER PRIMARY KEY,study TEXT NOT NULL,user_id INTEGER NOT NULL REFERENCES accounts(id),ease INTEGER,helpfulness INTEGER,version TEXT NOT NULL,expires REAL NOT NULL);
'''
class Study(BaseModel):
    model_config=ConfigDict(extra='forbid')
    enabled:Literal[True]
    study_id:str=Field(min_length=1,max_length=80)
    version:str=Field(min_length=1,max_length=40)
    title:str=Field(min_length=1,max_length=200)
    institution:str=Field(min_length=1,max_length=200)
    approval_reference:str=Field(min_length=1,max_length=200)
    information:str=Field(min_length=100,max_length=20000)
    contact:str=Field(min_length=3,max_length=200)
    independent_contact:str=Field(min_length=3,max_length=200)
    provider_notice:str=Field(min_length=30,max_length=4000)
    withdrawal_notice:str=Field(min_length=30,max_length=4000)
    starts:float
    ends:float
    retention_days:int=Field(ge=1,le=3650)
    researcher_ids:list[int]=Field(min_length=1)
    participant_ids:list[int]=Field(min_length=1)

def config():
    try:
        s=Study.model_validate_json(Path(os.environ['STEMMATE_RESEARCH_CONFIG']).read_text())
        if not s.starts<=time.time()<s.ends:return None
        return s
    except (KeyError,OSError,ValueError):return None

def init(c):
    family.init(c);c.executescript(SCHEMA)
    now=time.time()
    c.execute('DELETE FROM research_events WHERE expires<=?',(now,))
    c.execute('DELETE FROM research_feedback WHERE expires<=?',(now,))
    c.execute('DELETE FROM research_choices WHERE expires<=?',(now,))
    c.execute('DELETE FROM research_permissions WHERE expires<=?',(now,))
    c.execute('DELETE FROM research_decisions WHERE expires<=?',(now,))
    c.commit()

def decision(c,s,actor,subject,value):
    c.execute('INSERT INTO research_decisions(study,actor_id,subject_id,version,decision,information,recorded,expires) VALUES(?,?,?,?,?,?,?,?)',(s.study_id,actor,subject,s.version,value,json.dumps(s.model_dump(exclude={'researcher_ids','participant_ids'})),time.time(),time.time()+s.retention_days*86400))

def required():
    s=config()
    if not s:raise HTTPException(409,'Research collection is disabled. Learning remains available.')
    return s

def eligible(c,s,user,survey=False):
    if user['id'] not in s.participant_ids:return False
    choice=c.execute('SELECT * FROM research_choices WHERE study=? AND user_id=? AND version=?',(s.study_id,user['id'],s.version)).fetchone()
    if not choice or not choice['participate'] or (survey and not choice['survey']):return False
    if user['role']=='guardian':return True
    if user['role']!='learner':return False
    # Conservative first release: every learner follows the guardian+assent route.
    return bool(c.execute('SELECT 1 FROM family_links f JOIN research_permissions p ON p.link_id=f.id WHERE f.learner_id=? AND f.confirmed=1 AND f.verified=1 AND p.study=? AND p.version=? AND p.allowed=1',(user['id'],s.study_id,s.version)).fetchone())

@router.get('/research')
def status(user=Depends(accounts.current_user)):
    s=config()
    with accounts.db() as c:
        init(c)
        choice=dict(c.execute('SELECT * FROM research_choices WHERE study=? AND user_id=?',(s.study_id,user['id'])).fetchone() or {}) if s else {}
        permissions=[dict(r) for r in c.execute('SELECT p.link_id,p.allowed,p.version FROM research_permissions p JOIN family_links f ON f.id=p.link_id WHERE p.study=? AND (f.learner_id=? OR f.guardian_id=?)',(s.study_id,user['id'],user['id']))] if s else []
        public=s.model_dump(exclude={'researcher_ids','participant_ids'}) if s else None
        return {'study':public,'choice':choice,'permissions':permissions,'eligible':bool(s and eligible(c,s,user)),'notice':'Optional research is separate from family access, home progress sharing and teacher activity counts. Learners currently require verified guardian permission and their own assent.'}

class Choice(BaseModel):
    version:str=Field(max_length=40)
    participate:bool
    survey:bool=False

@router.put('/research/choice')
def choose(value:Choice,user=Depends(accounts.current_user)):
    if user['role'] not in ('learner','guardian'):raise HTTPException(403,'This study enrols learners and guardian supporters only.')
    s=required()
    if user['id'] not in s.participant_ids:raise HTTPException(403,'This account has not been invited to the study.')
    if value.version!=s.version:raise HTTPException(409,'Read the current study information before deciding.')
    if value.survey and not value.participate:raise HTTPException(422,'Survey participation requires study participation.')
    with accounts.db() as c:
        init(c)
        c.execute('INSERT OR REPLACE INTO research_choices VALUES(?,?,?,?,?,?,?)',(s.study_id,user['id'],s.version,value.participate,value.survey,time.time(),time.time()+s.retention_days*86400))
        decision(c,s,user['id'],user['id'],json.dumps(value.model_dump()))
        if not value.participate:
            c.execute('DELETE FROM research_events WHERE study=? AND user_id=?',(s.study_id,user['id']))
            c.execute('DELETE FROM research_feedback WHERE study=? AND user_id=?',(s.study_id,user['id']))
        elif not value.survey:c.execute('DELETE FROM research_feedback WHERE study=? AND user_id=?',(s.study_id,user['id']))
    return {'saved':True}

@router.put('/research/permission/{ident}')
def permission(ident:int,value:Choice,user=Depends(accounts.current_user)):
    family.role(user,'guardian');s=required()
    if value.version!=s.version:raise HTTPException(409,'Read the current information first.')
    with accounts.db() as c:
        init(c);r=family.link(c,ident,user,True)
        if r['learner_id'] not in s.participant_ids:raise HTTPException(403,'The learner has not been invited to the study.')
        c.execute('INSERT OR REPLACE INTO research_permissions VALUES(?,?,?,?,?,?)',(s.study_id,ident,s.version,value.participate,time.time(),time.time()+s.retention_days*86400))
        decision(c,s,user['id'],r['learner_id'],json.dumps({'guardian_permission':value.participate}))
        if not value.participate:
            c.execute('DELETE FROM research_events WHERE study=? AND user_id=?',(s.study_id,r['learner_id']))
            c.execute('DELETE FROM research_feedback WHERE study=? AND user_id=?',(s.study_id,r['learner_id']))
    return {'saved':True}

@router.delete('/research')
def withdraw(user=Depends(accounts.current_user)):
    # Withdrawal is possible even after a study is disabled or expires.
    with accounts.db() as c:
        init(c)
        c.execute('UPDATE research_choices SET participate=0,survey=0,updated=? WHERE user_id=?',(time.time(),user['id']))
        c.execute('DELETE FROM research_events WHERE user_id=?',(user['id'],))
        c.execute('DELETE FROM research_feedback WHERE user_id=?',(user['id'],))
    return {'withdrawn':True,'notice':'Research collection stopped and live study records removed. Child permissions are managed separately. Previously downloaded exports and backups require the documented researcher deletion process.'}

@router.delete('/research/permission/{ident}')
def withdraw_permission(ident:int,user=Depends(accounts.current_user)):
    family.role(user,'guardian')
    with accounts.db() as c:
        init(c);r=family.link(c,ident,user)
        c.execute('UPDATE research_permissions SET allowed=0,updated=? WHERE link_id=?',(time.time(),ident))
        c.execute('DELETE FROM research_events WHERE user_id=?',(r['learner_id'],))
        c.execute('DELETE FROM research_feedback WHERE user_id=?',(r['learner_id'],))
    return {'withdrawn':True}

class Feedback(BaseModel):
    ease:int|None=Field(default=None,ge=1,le=5)
    helpfulness:int|None=Field(default=None,ge=1,le=5)
@router.post('/research/feedback')
def feedback(value:Feedback,user=Depends(accounts.current_user)):
    if value.ease is None and value.helpfulness is None:raise HTTPException(422,'Choose at least one rating, or skip the survey.')
    s=required()
    with accounts.db() as c:
        init(c)
        c.execute('BEGIN IMMEDIATE')
        if not eligible(c,s,user,True):raise HTTPException(403,'Current study and optional survey permission are required.')
        c.execute('DELETE FROM research_feedback WHERE study=? AND user_id=?',(s.study_id,user['id']))
        c.execute('INSERT INTO research_feedback(study,user_id,ease,helpfulness,version,expires) VALUES(?,?,?,?,?,?)',(s.study_id,user['id'],value.ease,value.helpfulness,s.version,time.time()+s.retention_days*86400))
    return {'saved':True}

def record(ses,event,user):
    s=config()
    if not ses.plan.get('_research_code'):return
    if not s or event not in ('started','explain','feedback','apply','independent','complete','hint','direct','example'):return
    with accounts.db() as c:
        init(c)
        c.execute('BEGIN IMMEDIATE')
        if not eligible(c,s,user):return
        context=ses.plan.get('_practice_context',{})
        course=context.get('course',{}).get('id',ses.plan.get('_course_id',''))
        # Session code is unrelated to the authentication or learning token.
        c.execute('INSERT INTO research_events(study,user_id,code,course,topic,event,support,version,expires) VALUES(?,?,?,?,?,?,?,?,?)',(s.study_id,user['id'],ses.plan['_research_code'],course,ses.plan['_topic_id'],event,ses.plan.get('_support','unknown'),s.version,time.time()+s.retention_days*86400))

@router.get('/research/export')
def export(user=Depends(accounts.current_user)):
    s=required()
    if user['id'] not in s.researcher_ids:raise HTTPException(403,'Research export is unavailable for this account.')
    # Aggregate only. No participant aliases, family links or raw records leave this API.
    with accounts.db() as c:
        init(c)
        active=[r['id'] for r in c.execute('SELECT id,role FROM accounts').fetchall() if eligible(c,s,dict(r))]
        if not active:return {'events':[],'feedback':[],'notice':'No currently eligible participants.'}
        placeholders=','.join('?' for _ in active)
        counts=c.execute('SELECT event,count(*) AS total,count(DISTINCT user_id) AS participants FROM research_events WHERE study=? AND version=? AND user_id IN ('+placeholders+') GROUP BY event HAVING count(DISTINCT user_id)>=5',(s.study_id,s.version,*active)).fetchall()
        feedback=c.execute('SELECT ease,helpfulness,count(*) AS total FROM research_feedback WHERE study=? AND version=? AND user_id IN ('+placeholders+') GROUP BY ease,helpfulness HAVING count(*)>=5',(s.study_id,s.version,*active)).fetchall()
    return {'events':[dict(r) for r in counts],'feedback':[dict(r) for r in feedback],'notice':'Cells below five participants suppressed. Completion is not mastery. No linked family export.'}


def purge_expired():
    with accounts.db() as c:
        init(c)
        c.execute('DELETE FROM family_invites WHERE expires<=?',(time.time(),))
