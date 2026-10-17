"""Teacher-owned briefs; learner project evidence stays in browser memory."""
import json
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
