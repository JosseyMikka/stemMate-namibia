"""Teacher-owned briefs and optional, class-scoped project assessment snapshots."""
import json
import hashlib
import time
from typing import Literal
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from modules.accounts import db, current_user, class_access

router=APIRouter()
Bloom=Literal['remember','understand','apply','analyse','evaluate','create']

class Brief(BaseModel):
    title:str=Field(min_length=3,max_length=100)
    question:str=Field(min_length=10,max_length=1000)
    brief:str=Field(min_length=20,max_length=3000)
    artifact:str=Field(min_length=10,max_length=1000)
    criteria:str=Field(min_length=10,max_length=2000)
    resources:str=Field(min_length=10,max_length=2000)
    topic_id:str=Field(max_length=80)
    bloom:list[Bloom]=Field(min_length=1,max_length=6)
    published:bool=False
    revision:int=Field(default=0,ge=0)

    def cleaned(self):
        value=self.model_dump()
        for key in ('title','question','brief','artifact','criteria','resources'):
            if not value[key].strip():raise HTTPException(422,'Complete every project field.')
        value['bloom']=list(dict.fromkeys(value['bloom']))
        return value


def unpack(row):
    return {**json.loads(row['body']),'id':row['id'],'revision':row['revision']}

@router.get('/classes/{class_id}/projects')
def list_projects(class_id:int,user=Depends(current_user)):
    class_access(class_id,user)
    with db() as connection:
        rows=connection.execute('SELECT * FROM projects WHERE class_id=? ORDER BY id DESC',(class_id,)).fetchall()
    return [p for row in rows if (p:=unpack(row))['published'] or user['role']=='teacher']

@router.post('/classes/{class_id}/projects')
def create_project(class_id:int,value:Brief,user=Depends(current_user)):
    classroom=class_access(class_id,user,True)
    if value.topic_id not in [t['id'] for t in classroom['course']['topics']]:raise HTTPException(422,'Choose a topic from this class.')
    body=value.cleaned()
    with db() as connection:
        cursor=connection.execute('INSERT INTO projects(class_id,body,revision,updated) VALUES(?,?,1,?)',(class_id,json.dumps(body),time.time()))
        row=connection.execute('SELECT * FROM projects WHERE id=?',(cursor.lastrowid,)).fetchone()
    return unpack(row)

@router.put('/classes/{class_id}/projects/{project_id}')
def update_project(class_id:int,project_id:int,value:Brief,user=Depends(current_user)):
    classroom=class_access(class_id,user,True)
    if value.topic_id not in [t['id'] for t in classroom['course']['topics']]:raise HTTPException(422,'Choose a topic from this class.')
    body=value.cleaned()
    with db() as connection:
        row=connection.execute('SELECT * FROM projects WHERE id=? AND class_id=?',(project_id,class_id)).fetchone()
        if not row:raise HTTPException(404,'Project not found in this class.')
        cursor=connection.execute('UPDATE projects SET body=?,revision=revision+1,updated=? WHERE id=? AND class_id=? AND revision=?',(json.dumps(body),time.time(),project_id,class_id,value.revision))
        if cursor.rowcount!=1:raise HTTPException(409,'This brief has changed. Refresh projects before editing again.')
        row=connection.execute('SELECT * FROM projects WHERE id=?',(project_id,)).fetchone()
    return unpack(row)

# Explicit sharing, not passive learner surveillance. Files/audio are never accepted.
class Privacy(BaseModel):
    enabled:bool
    retention_days:Literal[7,30,90]=30
    delete_stored:bool=False

class Submission(BaseModel):
    consent_retention_days:Literal[7,30,90]
    revision:int=Field(ge=1)
    expected_version:int=Field(default=0,ge=0)
    stage:int=Field(ge=0,le=7)
    entries:list[str]=Field(min_length=7,max_length=7)
    artifact:str=Field(min_length=10,max_length=20000)
    consent:bool=False

class Review(BaseModel):
    receipt:str=Field(min_length=64,max_length=64)
    review_revision:int=Field(default=0,ge=0)
    version:int=Field(ge=1)
    status:Literal['reviewed','revision_requested']
    feedback:str=Field(min_length=10,max_length=4000)
    accuracy:Literal['not_assessed','developing','supported']
    reasoning:Literal['not_assessed','developing','supported']
    testing:Literal['not_assessed','developing','supported']
    revision:Literal['not_assessed','developing','supported']
    artifact_verified:bool=False
    independent_verified:bool=False


def purge_expired():
    with db() as connection:
        connection.execute('DELETE FROM project_submissions WHERE expires<=?',(time.time(),))


def privacy_for(class_id):
    with db() as connection:
        row=connection.execute('SELECT * FROM project_privacy WHERE class_id=?',(class_id,)).fetchone()
    return {'enabled':bool(row['enabled']) if row else False,'retention_days':row['retention_days'] if row else 30}

@router.get('/classes/{class_id}/project-privacy')
def get_privacy(class_id:int,user=Depends(current_user)):
    class_access(class_id,user)
    return privacy_for(class_id)

@router.put('/classes/{class_id}/project-privacy')
def set_privacy(class_id:int,value:Privacy,user=Depends(current_user)):
    class_access(class_id,user,True)
    with db() as connection:
        if value.delete_stored:
            connection.execute('DELETE FROM project_submissions WHERE project_id IN (SELECT id FROM projects WHERE class_id=?)',(class_id,))
        connection.execute('INSERT INTO project_privacy VALUES(?,?,?) ON CONFLICT(class_id) DO UPDATE SET enabled=excluded.enabled,retention_days=excluded.retention_days',(class_id,value.enabled,value.retention_days))
        # Shorter retention also applies to existing submissions; never extend them silently.
        connection.execute('UPDATE project_submissions SET expires=MIN(expires,updated+?) WHERE project_id IN (SELECT id FROM projects WHERE class_id=?)',(value.retention_days*86400,class_id))
        connection.execute('DELETE FROM project_submissions WHERE expires<=?',(time.time(),))
    return privacy_for(class_id)


def project_access(class_id,project_id,user):
    classroom=class_access(class_id,user)
    with db() as connection:
        row=connection.execute('SELECT * FROM projects WHERE id=? AND class_id=?',(project_id,class_id)).fetchone()
    if not row:raise HTTPException(404,'Project not found.')
    return classroom,unpack(row)

@router.post('/classes/{class_id}/projects/{project_id}/submissions')
def submit(class_id:int,project_id:int,value:Submission,user=Depends(current_user)):
    classroom,project=project_access(class_id,project_id,user)
    policy=privacy_for(class_id)
    if user['role']!='learner':raise HTTPException(403,'Only learners submit their work.')
    if not policy['enabled'] or not project['published'] or classroom['paused']:raise HTTPException(409,'Your teacher is not accepting submissions now.')
    if not value.consent:raise HTTPException(422,'Confirm sharing with your teacher before submitting.')
    if value.revision!=project['revision']:raise HTTPException(409,'The project brief changed. Export your notebook and refresh projects before submitting.')
    if any(len(e)>6000 for e in value.entries) or any(not e.strip() for e in value.entries[:value.stage]) or not value.artifact.strip():raise HTTPException(422,'Check the evidence lengths and completed stages.')
    purge_expired()
    now=time.time()
    with db() as connection:
        connection.execute('BEGIN IMMEDIATE')
        # Recheck access, the brief and sharing terms under the write lock. A pause,
        # removal or privacy change between the initial reads and insert must win.
        current_class=connection.execute('SELECT * FROM classes WHERE id=?',(class_id,)).fetchone()
        member=connection.execute('SELECT 1 FROM enrolments WHERE class_id=? AND learner_id=?',(class_id,user['id'])).fetchone()
        if not member:raise HTTPException(403,'You are no longer enrolled in this class.')
        current_project=connection.execute('SELECT * FROM projects WHERE id=? AND class_id=?',(project_id,class_id)).fetchone()
        current_policy=connection.execute('SELECT * FROM project_privacy WHERE class_id=?',(class_id,)).fetchone()
        if not current_class or current_class['paused'] or not current_project or not unpack(current_project)['published'] or not current_policy or not current_policy['enabled']:raise HTTPException(409,'Your teacher is not accepting submissions now.')
        if current_project['revision']!=value.revision:raise HTTPException(409,'The brief changed. Save locally and refresh projects before sharing.')
        if current_policy['retention_days']!=value.consent_retention_days:raise HTTPException(409,'The storage period changed. Refresh submissions, review it and acknowledge sharing again.')
        policy={'retention_days':current_policy['retention_days']}
        project=unpack(current_project)
        latest=connection.execute('SELECT MAX(version) FROM project_submissions WHERE project_id=? AND learner_id=?',(project_id,user['id'])).fetchone()[0] or 0
        if latest!=value.expected_version:raise HTTPException(409,'A newer submission exists. Refresh your submissions before sending another version.')
        if latest>=20:raise HTTPException(409,'This project has reached the pilot limit of 20 stored versions. Export and ask your teacher for support.')
        body={'brief':project,'stage':value.stage,'entries':value.entries,'artifact':value.artifact,'sharing_acknowledged':True,'sharing_notice_version':'project-assessment-v1','consent_retention_days':value.consent_retention_days}
        cursor=connection.execute('INSERT INTO project_submissions(project_id,learner_id,version,body,updated,expires) VALUES(?,?,?,?,?,?)',(project_id,user['id'],latest+1,json.dumps(body),now,now+policy['retention_days']*86400))
        submission_id=cursor.lastrowid
    return {'id':submission_id,'version':latest+1,'expires':now+policy['retention_days']*86400}

@router.get('/classes/{class_id}/projects/{project_id}/submissions')
def submissions(class_id:int,project_id:int,user=Depends(current_user)):
    project_access(class_id,project_id,user);purge_expired()
    with db() as connection:
        if user['role']=='teacher':
            rows=connection.execute('SELECT s.*,a.username FROM project_submissions s JOIN accounts a ON a.id=s.learner_id JOIN enrolments e ON e.learner_id=s.learner_id AND e.class_id=? WHERE s.project_id=? AND s.version=(SELECT MAX(t.version) FROM project_submissions t WHERE t.project_id=s.project_id AND t.learner_id=s.learner_id) ORDER BY s.updated DESC LIMIT 100',(class_id,project_id)).fetchall()
        else:
            rows=connection.execute('SELECT s.*,a.username FROM project_submissions s JOIN accounts a ON a.id=s.learner_id WHERE s.project_id=? AND s.learner_id=? ORDER BY s.version DESC LIMIT 20',(project_id,user['id'])).fetchall()
    return [{'id':r['id'],'username':r['username'],'version':r['version'],'stage':json.loads(r['body'])['stage'],'review_status':json.loads(r['review']).get('status','awaiting_review'),'expires':r['expires']} for r in rows]


def submission_access(class_id,project_id,submission_id,user):
    project_access(class_id,project_id,user);purge_expired()
    with db() as connection:
        row=connection.execute('SELECT s.*,a.username FROM project_submissions s JOIN accounts a ON a.id=s.learner_id WHERE s.id=? AND s.project_id=?',(submission_id,project_id)).fetchone()
        if not row:raise HTTPException(404,'Submission not found or retention period ended.')
        if user['role']=='learner' and row['learner_id']!=user['id']:raise HTTPException(403,'This submission belongs to another learner.')
        if user['role']=='teacher' and not connection.execute('SELECT 1 FROM enrolments WHERE class_id=? AND learner_id=?',(class_id,row['learner_id'])).fetchone():raise HTTPException(403,'This learner is no longer enrolled.')
    return row

@router.get('/classes/{class_id}/projects/{project_id}/submissions/{submission_id}')
def submission_detail(class_id:int,project_id:int,submission_id:int,user=Depends(current_user)):
    row=submission_access(class_id,project_id,submission_id,user)
    return {'id':row['id'],'receipt':submission_receipt(row),'username':row['username'],'version':row['version'],'body':json.loads(row['body']),'review':json.loads(row['review']),'expires':row['expires']}

def submission_receipt(row):
    return hashlib.sha256(f"{row['id']}:{row['learner_id']}:{row['updated']}:{row['body']}".encode()).hexdigest()

@router.put('/classes/{class_id}/projects/{project_id}/submissions/{submission_id}/review')
def review(class_id:int,project_id:int,submission_id:int,value:Review,user=Depends(current_user)):
    class_access(class_id,user,True);row=submission_access(class_id,project_id,submission_id,user)
    if value.receipt!=submission_receipt(row):raise HTTPException(409,'This submission was replaced. Refresh the dashboard.')
    if value.version!=row['version']:raise HTTPException(409,'Refresh the submission before reviewing.')
    if not value.feedback.strip():raise HTTPException(422,'Write actionable feedback.')
    with db() as connection:
        connection.execute('BEGIN IMMEDIATE')
        owner=connection.execute('SELECT teacher_id FROM classes WHERE id=?',(class_id,)).fetchone()
        member=connection.execute('SELECT 1 FROM enrolments WHERE class_id=? AND learner_id=?',(class_id,row['learner_id'])).fetchone()
        if not owner or owner['teacher_id']!=user['id'] or not member:raise HTTPException(403,'Class access changed. Refresh the dashboard.')
        current=connection.execute('SELECT * FROM project_submissions WHERE id=?',(submission_id,)).fetchone()
        if not current:raise HTTPException(409,'This submission was withdrawn. Refresh the dashboard.')
        if value.receipt!=submission_receipt(current):raise HTTPException(409,'This submission was replaced. Refresh the dashboard.')
        if json.loads(current['review']).get('review_revision',0)!=value.review_revision:raise HTTPException(409,'Feedback changed in another view. Refresh before reviewing again.')
        saved={**value.model_dump(),'review_revision':value.review_revision+1}
        cursor=connection.execute('UPDATE project_submissions SET review=? WHERE id=? AND expires>?',(json.dumps(saved),submission_id,time.time()))
        if cursor.rowcount!=1:raise HTTPException(409,'This submission was withdrawn or expired. Refresh the dashboard.')
    return {'saved':True}

@router.delete('/classes/{class_id}/projects/{project_id}/submissions')
def delete_own(class_id:int,project_id:int,user=Depends(current_user)):
    # Learners may withdraw their own stored work even after leaving the class.
    if user['role']!='learner':raise HTTPException(403,'Learners withdraw their own submissions; teachers use class privacy controls.')
    with db() as connection:
        connection.execute('DELETE FROM project_submissions WHERE project_id IN (SELECT id FROM projects WHERE id=? AND class_id=?) AND learner_id=?',(project_id,class_id,user['id']))
    return {'deleted':True}

@router.get('/my-project-submissions')
def my_stored_work(user=Depends(current_user)):
    purge_expired()
    with db() as connection:
        rows=connection.execute('SELECT DISTINCT p.id,p.class_id,p.body,c.name FROM projects p JOIN classes c ON c.id=p.class_id JOIN project_submissions s ON s.project_id=p.id WHERE s.learner_id=?',(user['id'],)).fetchall()
    return [{'id':r['id'],'class_id':r['class_id'],'title':json.loads(r['body'])['title'],'class_name':r['name']} for r in rows]
