import asyncio
from contextlib import asynccontextmanager, suppress
import os
import secrets
from collections import deque
from time import monotonic
from fastapi import FastAPI, Header, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Literal
from starlette.concurrency import run_in_threadpool
from modules.learning import LearningStore, visible, advance
from modules.tutor import make_plan, direct_explanation

@asynccontextmanager
async def lifespan(app):
    async def cleanup():
        while True:
            await asyncio.sleep(60)
            with store.lock:
                store.purge()
    task = asyncio.create_task(cleanup())
    try:
        yield
    finally:
        task.cancel()
        with suppress(asyncio.CancelledError):
            await task

app = FastAPI(title='STEMMate guided learning', lifespan=lifespan)
app.add_middleware(CORSMiddleware,
    allow_origins=os.getenv('STEMMATE_ORIGINS', 'http://localhost:5173').split(','),
    allow_methods=['GET', 'POST', 'PUT', 'DELETE'], allow_headers=['Content-Type', 'X-Teacher-Key', 'X-Learning-Token'])
store = LearningStore()
# Deployment policy, shared by all learners; restarting restores configured defaults.
policy = {'max_hints': max(0, min(3, int(os.getenv('STEMMATE_MAX_HINTS', '3')))),
          'paused': False, 'evaluation_enabled': False}
counts = {}
ai_calls = deque()

def reserve_ai():
    with store.lock:
        now = monotonic()
        while ai_calls and ai_calls[0] < now - 3600:
            ai_calls.popleft()
        if len(ai_calls) >= 60:
            raise HTTPException(429, "The tutor has reached its hourly limit. Try again later.")
        ai_calls.append(now)


class Start(BaseModel):
    topic: str = Field(min_length=1, max_length=2000)
    band: Literal['primary', 'secondary', 'senior'] = 'primary'
    consent: bool = False

class Action(BaseModel):
    action: Literal['hint', 'direct', 'continue']
    attempted: bool = False

class Policy(BaseModel):
    max_hints: int = Field(ge=0, le=3)
    paused: bool
    evaluation_enabled: bool


def teacher(key):
    configured = os.getenv('STEMMATE_TEACHER_KEY', '')
    if len(configured) < 24 or not key or not secrets.compare_digest(key.encode('utf-8'), configured.encode('utf-8')):
        raise HTTPException(403, 'Teacher access is not configured or the key is invalid.')


def record(s, event):
    # Aggregate only: no IDs, timestamps, learner prose, grades or model responses.
    if policy['evaluation_enabled'] and s.consent and s.band != 'primary':
        counts[event] = counts.get(event, 0) + 1


def session(token):
    try:
        return store.get(token)
    except KeyError:
        raise HTTPException(404, 'Session expired. Start a new session.')


def running():
    if policy['paused']:
        raise HTTPException(503, 'Your teacher has paused AI learning. Ask them for support.')


@app.middleware('http')
async def no_cache(request, call_next):
    response = await call_next(request)
    response.headers['Cache-Control'] = 'no-store'
    response.headers['Referrer-Policy'] = 'no-referrer'
    return response

@app.get('/policy')
def get_policy():
    with store.lock:
        return dict(policy)

@app.put('/teacher/policy')
def set_policy(value: Policy, x_teacher_key: str = Header(default='')):
    teacher(x_teacher_key)
    with store.lock:
        policy.update(value.model_dump())
        if not value.evaluation_enabled:
            counts.clear()
    return policy

@app.get('/teacher/evaluation')
def evaluation(x_teacher_key: str = Header(default='')):
    teacher(x_teacher_key)
    with store.lock:
        return {'counts': dict(counts), 'notice': 'Voluntary process counts; not scores or evidence of mastery.'}

@app.delete('/teacher/evaluation')
def clear_evaluation(x_teacher_key: str = Header(default='')):
    teacher(x_teacher_key)
    with store.lock:
        counts.clear()
    return {'deleted': True}

@app.post('/learning')
async def start(value: Start):
    running()
    if not value.topic.strip():
        raise HTTPException(422, 'Enter a STEM topic or question.')
    reserve_ai()
    try:
        plan = await run_in_threadpool(make_plan, value.topic, value.band)
    except Exception:
        # Never send provider errors or learner data to logs or the response.
        raise HTTPException(503, 'The tutor could not prepare a lesson. Please try again.')
    with store.lock:
        running()
        try:
            token = store.create(plan, value.band, value.consent)
        except ValueError as error:
            raise HTTPException(503, str(error))
        s = store.get(token)
        record(s, 'started')
        return {'token': token, **visible(s, policy['max_hints'])}

@app.get('/learning/session')
def resume(x_learning_token: str = Header(default='')):
    token = x_learning_token
    with store.lock:
        return visible(session(token), policy['max_hints'])

@app.post('/learning/session')
def act(value: Action, x_learning_token: str = Header(default='')):
    token = x_learning_token
    with store.lock:
        running()
        s = session(token)
        try:
            advance(s, value.action, value.attempted, policy['max_hints'])
        except ValueError as error:
            raise HTTPException(409, str(error))
        record(s, value.action if value.action != 'continue' else s.stage)
        result = visible(s, policy['max_hints'])
        if value.action == 'direct':
            result['direct_explanation'] = s.plan['explanation']
        return result

@app.delete('/learning/session')
def forget(x_learning_token: str = Header(default='')):
    token = x_learning_token
    with store.lock:
        store.sessions.pop(token, None)
    return {'deleted': True}

@app.post('/explain')
async def explain(value: Start):
    running()
    if not value.topic.strip():
        raise HTTPException(422, 'Enter a STEM topic or question.')
    reserve_ai()
    try:
        answer = await run_in_threadpool(direct_explanation, value.topic, value.band)
        running()
        return {'answer': answer}
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(503, 'The tutor is unavailable. Please try again.')

@app.post('/ask/')
async def legacy_ask(question: str = Form(..., min_length=1, max_length=2000)):
    # Compatibility for the older Streamlit client; clearly a direct explanation.
    return await explain(Start(topic=question))

@app.post('/upload_pdfs/')
def uploads_disabled():
    raise HTTPException(403, 'Shared uploads are disabled. Ask the curriculum administrator to review materials.')

@app.get('/test')
def health():
    return {'message': 'STEMMate is running'}
