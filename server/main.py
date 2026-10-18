import asyncio
from contextlib import asynccontextmanager, suppress
import os
from pathlib import Path
from dotenv import load_dotenv

# Local credentials stay in the ignored server file; deployment env wins.
load_dotenv(Path(__file__).resolve().parent / ".env", override=False)
import secrets
import logging
import hashlib
from collections import deque
from time import monotonic
from fastapi import FastAPI, Header, HTTPException, Depends, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Literal
from starlette.concurrency import run_in_threadpool
from modules.learning import LearningStore, visible, advance
from modules.tutor import make_plan, direct_explanation
from modules import accounts, projects, attached_work, quiz
from modules.curricula import catalogue, starter_plan, course_for

store = LearningStore()
quizzes = quiz.QuizStore()
ai_calls = deque()
auth_attempts = {}
rate_salt = secrets.token_bytes(32)

@asynccontextmanager
async def lifespan(app):
    with accounts.db():
        pass
    async def cleanup():
        while True:
            await asyncio.sleep(60)
            with store.lock:
                store.purge()
                quizzes.purge()
                projects.purge_expired()
                now = monotonic()
                for key in list(auth_attempts):
                    if not auth_attempts[key] or auth_attempts[key][-1] < now-600:
                        del auth_attempts[key]
    task = asyncio.create_task(cleanup())
    try:
        yield
    finally:
        task.cancel()
        with suppress(asyncio.CancelledError):
            await task

app = FastAPI(title='STEMMate thinking companion', lifespan=lifespan)
app.add_middleware(CORSMiddleware,
    allow_origins=os.getenv('STEMMATE_ORIGINS', 'http://localhost:5173').split(','),
    allow_methods=['GET','POST','PUT','DELETE'], allow_headers=['Content-Type','Authorization','X-Learning-Token'])
app.include_router(accounts.router)
app.include_router(projects.router)

@app.middleware('http')
async def privacy_and_limits(request:Request, call_next):
    body_limit=2_850_000 if request.url.path.startswith('/work/') else 30_000 if request.url.path in ('/quiz','/quiz/session') else None
    if body_limit:
        body=bytearray()
        async for chunk in request.stream():
            body.extend(chunk)
            if len(body)>body_limit:
                return JSONResponse(status_code=413,content={'detail':'Request too large.'},headers={'Cache-Control':'no-store'})
        request._body=bytes(body)
    # Transient salted buckets protect password verification and invitation guessing.
    # No IPs are retained, logged, or included in evaluation data.
    limited = request.url.path in ('/auth/login','/auth/register','/classes/join')
    if limited:
        key = hashlib.sha256(rate_salt + (request.client.host if request.client else 'unknown').encode()).hexdigest()
        with store.lock:
            now=monotonic()
            bucket=auth_attempts.setdefault(key,deque())
            while bucket and bucket[0] < now-600:
                bucket.popleft()
            if len(bucket)>=300 or len(auth_attempts)>5000:
                return JSONResponse(status_code=429,content={'detail':'Too many sign-in or class-code attempts. Try again in ten minutes.'},headers={'Cache-Control':'no-store'})
            bucket.append(now)
    response=await call_next(request)
    response.headers['Cache-Control']='no-store'
    response.headers['Referrer-Policy']='no-referrer'
    return response


def reserve_ai():
    with store.lock:
        now=monotonic()
        while ai_calls and ai_calls[0] < now-3600:
            ai_calls.popleft()
        if len(ai_calls)>=60:
            raise HTTPException(429,'The tutor has reached its hourly limit. Starter practice remains available.')
        ai_calls.append(now)

class Start(BaseModel):
    class_id:int=Field(default=0,ge=0)
    course_id:str=Field(default="",max_length=80)
    grade:int=Field(default=10,ge=10,le=12)
    exam_year:int=Field(default=2027,ge=2026,le=2027)
    topic_id:str
    topic:str=Field(default='',max_length=2000)
    band:Literal['primary','secondary','senior']='secondary'
    consent:bool=False

class Action(BaseModel):
    action:Literal['hint','direct','example','continue']
    attempted:bool=False


def active_class(class_id,user):
    classroom=accounts.class_access(class_id,user)
    if classroom['paused']:
        raise HTTPException(503,'Your teacher has paused learning in this class. Ask them for support.')
    return classroom


def learning_context(value,user):
    if value.class_id:
        return active_class(value.class_id,user)
    return {'id':0,'grade':value.grade,'exam_year':value.exam_year,
            'course':course_for(value.course_id,value.grade,value.exam_year),
            'max_hints':3,'paused':False,'evaluation_enabled':False,'voice_input_enabled':False}


def owned_session(token,user):
    try:
        s=store.get(token)
    except KeyError:
        raise HTTPException(404,'Session expired. Start a new session.')
    if s.owner_id!=user['id']:
        raise HTTPException(403,'This learning session belongs to another account.')
    classroom=accounts.class_access(s.class_id,user) if s.class_id else s.plan['_practice_context']
    return s,classroom


def record(s,event,user,classroom):
    if s.class_id and user['role']=='learner' and classroom['evaluation_enabled'] and s.consent:
        accounts.record(s.class_id,event)


def response(s,classroom):
    return {**visible(s,classroom['max_hints']), 'class_id':s.class_id,
            'curriculum':classroom['course'], 'content_source':s.plan.get('_source','original_starter')}

@app.get('/curricula')
def curricula():
    return catalogue()

@app.post('/learning')
async def start(value:Start,user=Depends(accounts.current_user)):
    classroom=learning_context(value,user)
    plan=starter_plan(classroom['course'],value.topic_id)
    if value.topic.strip():
        reserve_ai()
        course={**classroom['course'],'exam_year':classroom['exam_year'],'grade':classroom['grade']}
        try:
            plan=await run_in_threadpool(make_plan,value.topic,value.band,course,value.topic_id)
            plan['_source']='ai_general_support'
        except Exception:
            raise HTTPException(503,'The AI tutor is unavailable. Clear the optional question to use starter practice.')
    with store.lock:
        classroom=learning_context(value,user)
        try:
            if not value.class_id:plan['_practice_context']=classroom
            token=store.create(plan,value.band,value.consent if value.class_id else False,user['id'],value.class_id)
        except ValueError as error:
            raise HTTPException(503,str(error))
        s=store.get(token)
        record(s,'started',user,classroom)
        return {'token':token,**response(s,classroom)}

@app.get('/learning/session')
def resume(x_learning_token:str=Header(default=''),user=Depends(accounts.current_user)):
    with store.lock:
        s,classroom=owned_session(x_learning_token,user)
        return response(s,classroom)

@app.post('/learning/session')
def act(value:Action,x_learning_token:str=Header(default=''),user=Depends(accounts.current_user)):
    with store.lock:
        s,classroom=owned_session(x_learning_token,user)
        if s.class_id:classroom=active_class(s.class_id,user)
        try:
            advance(s,value.action,value.attempted,classroom['max_hints'])
        except ValueError as error:
            raise HTTPException(409,str(error))
        record(s,value.action if value.action!='continue' else s.stage,user,classroom)
        result=response(s,classroom)
        if value.action=='direct':
            result['direct_explanation']=s.plan['explanation']
        if value.action=='example':
            result['similar_example']=s.plan['application']+'\n\n'+s.plan['application_explanation']
        return result

@app.delete('/learning/session')
def forget(x_learning_token:str=Header(default=''),user=Depends(accounts.current_user)):
    with store.lock:
        s=store.sessions.get(x_learning_token)
        # Deleting one's temporary work remains possible after class access is revoked.
        if s and s.owner_id!=user['id']:
            raise HTTPException(403,'This session belongs to another account.')
        store.sessions.pop(x_learning_token,None)
    return {'deleted':True}

@app.post('/explain')
async def explain(value:Start,user=Depends(accounts.current_user)):
    classroom=learning_context(value,user)
    plan=starter_plan(classroom['course'],value.topic_id)
    answer=plan['challenge']+'\n\n'+plan['explanation']
    if value.topic.strip():
        reserve_ai()
        course={**classroom['course'],'exam_year':classroom['exam_year'],'grade':classroom['grade']}
        try:
            answer=await run_in_threadpool(direct_explanation,value.topic,value.band,course,value.topic_id)
        except Exception:
            raise HTTPException(503,'The AI tutor is unavailable. Clear the optional question to use starter practice.')
    learning_context(value,user)
    return {'answer':answer,'content_source':'ai_general_support' if value.topic.strip() else 'original_starter'}

@app.post('/ask/')
def legacy_ask():
    raise HTTPException(410,'Use the signed-in classroom interface. Anonymous direct answers have been retired.')

@app.post('/upload_pdfs/')
def uploads_disabled():
    raise HTTPException(403,'Shared uploads are disabled. Ask the curriculum administrator to review and tag materials.')

@app.get('/test')
def health():
    return {'message':'STEMMate is running'}


def attachment_access(value,user,token):
    if value.class_id:
        active_class(value.class_id,user)
    if token:
        with store.lock:
            session,_=owned_session(token,user)
            if session.class_id!=value.class_id or session.stage=='independent':
                raise HTTPException(409,'Attachment support is unavailable during an independent check.')

@app.post('/work/transcribe')
async def transcribe_work(value:attached_work.Transcribe,x_learning_token:str=Header(default=''),user=Depends(accounts.current_user)):
    attachment_access(value,user,x_learning_token)
    if not value.consent:
        raise HTTPException(400,'Confirm permission before sending work to the AI provider.')
    reserve_ai()
    try:
        text=await run_in_threadpool(attached_work.transcribe,value.image)
    except ValueError:
        raise HTTPException(400,'Use a valid PNG or JPEG smaller than 2 MB and 12 million pixels.')
    except Exception:
        raise HTTPException(503,'Image reading is unavailable. You can type your work instead; nothing was saved by STEMMate.')
    attachment_access(value,user,x_learning_token)
    return {'transcription':text}

@app.post('/work/feedback')
async def review_work(value:attached_work.Review,x_learning_token:str=Header(default=''),user=Depends(accounts.current_user)):
    attachment_access(value,user,x_learning_token)
    if not value.consent or not value.confirmed:
        raise HTTPException(400,'Confirm the transcription and AI processing permission first.')
    if not value.question.strip() or not value.work.strip() or '[unclear]' in value.work.lower():
        raise HTTPException(400,'Add the question and correct unclear text before requesting feedback.')
    if value.mode=='scheme' and not value.scheme.strip():
        raise HTTPException(400,'Provide the matching marking criteria first, or choose Help me improve.')
    reserve_ai()
    try:
        text=await run_in_threadpool(attached_work.feedback,value)
    except Exception:
        raise HTTPException(503,'Feedback is unavailable. Your draft is still on this page; try again later.')
    attachment_access(value,user,x_learning_token)
    return {'feedback':text}


class QuizAction(BaseModel):
    number:int=Field(ge=1,le=3)
    hints_seen:int=Field(default=0,ge=0,le=3)
    action:Literal['hint','answer','next']
    answer:str=Field(default='',max_length=4000)
    reasoning:str=Field(default='',max_length=2000)


def owned_quiz(token,user):
    try:s=quizzes.get(token)
    except KeyError:raise HTTPException(404,'Quiz expired. Start a new quiz.')
    if s.owner_id!=user['id']:raise HTTPException(403,'This quiz belongs to another account.')
    classroom=active_class(s.class_id,user) if s.class_id else s.context
    return s,classroom

@app.post('/quiz')
async def start_quiz(value:Start,x_learning_token:str=Header(default=''),user=Depends(accounts.current_user)):
    classroom=learning_context(value,user)
    attachment_access(value,user,x_learning_token)
    if not value.consent:raise HTTPException(400,'Agree to AI processing of quiz answers and reasoning first.')
    starter_plan(classroom['course'],value.topic_id)
    reserve_ai()
    course={**classroom['course'],'grade':classroom['grade'],'exam_year':classroom['exam_year']}
    requested=value.topic.strip() or next(t['label'] for t in course['topics'] if t['id']==value.topic_id)
    try:plan=await run_in_threadpool(quiz.make_quiz,requested,value.band,course)
    except Exception as error:
        logging.getLogger('stemmate.quiz').warning('Quiz generation failed: %s',type(error).__name__)
        raise HTTPException(503,'Quiz generation is unavailable. Your usual practice is still available.')
    with store.lock:
        classroom=learning_context(value,user)
        attachment_access(value,user,x_learning_token)
        try:token=quizzes.create(user['id'],value.class_id,classroom,plan,value.band)
        except ValueError as error:raise HTTPException(503,str(error))
        return {'token':token,**quiz.visible(quizzes.get(token),classroom['max_hints'])}

@app.get('/quiz/session')
def get_quiz(x_learning_token:str=Header(default=''),user=Depends(accounts.current_user)):
    with store.lock:
        s,c=owned_quiz(x_learning_token,user)
        return quiz.visible(s,c['max_hints'])

@app.post('/quiz/session')
async def quiz_action(value:QuizAction,x_learning_token:str=Header(default=''),user=Depends(accounts.current_user)):
    with store.lock:
        s,c=owned_quiz(x_learning_token,user)
        if s.inflight:raise HTTPException(409,'Please wait for your feedback.')
        # A delivered Next request may lose its response. Repeating it returns
        # the current question instead of advancing a second time.
        if value.action=='next' and value.number==s.index and s.index>0:
            return quiz.visible(s,c['max_hints'])
        if value.number!=s.index+1:raise HTTPException(409,'This response belongs to an earlier question. Return to the current question.')
        if s.index>=len(s.plan):raise HTTPException(409,'This quiz is complete.')
        if value.action=='hint':
            if s.answered:raise HTTPException(409,'No more hints are available for this question.')
            if value.hints_seen<s.hints:return quiz.visible(s,c['max_hints'])
            if value.hints_seen>s.hints:raise HTTPException(409,'Hint state changed. Return to the current question.')
            if s.hints>=c['max_hints']:raise HTTPException(409,'No more hints are available for this question.')
            s.hints+=1
            return quiz.visible(s,c['max_hints'])
        if value.action=='next':
            if not s.answered:raise HTTPException(409,'Attempt this question and explain your reasoning first.')
            s.index+=1;s.hints=0;s.answered=False
            return quiz.visible(s,c['max_hints'])
        # Recompute a lost feedback response from the resubmitted text; do not
        # cache private answers/feedback or count the question twice.
        if not value.answer.strip() or not value.reasoning.strip():raise HTTPException(400,'Add your answer and explain your thinking. “I’m unsure because…” is enough.')
        reserve_ai();s.inflight=True
        question=s.plan[s.index]
    try:
        text=await run_in_threadpool(quiz.feedback,question,value.answer,value.reasoning,s.band)
        if not text.strip():raise ValueError('Empty feedback')
        with store.lock:
            s,c=owned_quiz(x_learning_token,user)
            if not s.answered:s.support.append(s.hints>0)
            s.answered=True
            return {**quiz.visible(s,c['max_hints']),'feedback':text}
    except HTTPException:raise
    except Exception as error:
        logging.getLogger('stemmate.quiz').warning('Quiz feedback failed: %s',type(error).__name__)
        raise HTTPException(503,'Feedback is unavailable. Your answer is still on this page; try again.')
    finally:
        with store.lock:s.inflight=False

@app.delete('/quiz/session')
def delete_quiz(x_learning_token:str=Header(default=''),user=Depends(accounts.current_user)):
    with store.lock:
        s=quizzes.sessions.get(x_learning_token)
        if s and s.owner_id!=user['id']:raise HTTPException(403,'This quiz belongs to another account.')
        quizzes.sessions.pop(x_learning_token,None)
    return {'deleted':True}
