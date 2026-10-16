import hashlib
import json
import os
import sys
import tempfile
import time
import unittest
from collections import deque
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'server'))
from fastapi.testclient import TestClient
import main
from modules import accounts
from modules.curricula import LESSONS, catalogue
from modules.learning import LearningStore

PASSWORD='a private test passphrase'
INVITE='teacher-admission-code-32-characters'

class ClassroomTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        patch.dict(os.environ,{'STEMMATE_ACCOUNTS_DB':str(Path(self.tmp.name)/'accounts.sqlite3'),'STEMMATE_TEACHER_INVITE':INVITE}).start()
        self.addCleanup(patch.stopall)
        main.store=LearningStore();main.ai_calls.clear();main.auth_attempts.clear()
        self.client=TestClient(main.app)
        self.teacher=self.register('teacher','teacher')
        self.learner=self.register('learner')
        self.room,self.code=self.create_class(self.teacher)
        self.join(self.learner,self.code)

    def register(self,name,role='learner'):
        r=self.client.post('/auth/register',json={'username':name,'password':PASSWORD,'role':role,'invitation':INVITE if role=='teacher' else ''})
        self.assertEqual(r.status_code,200,r.text)
        return {'Authorization':'Bearer '+r.json()['token']}

    def create_class(self,teacher,grade=10,course='na-nssco',name='Math A'):
        r=self.client.post('/classes',headers=teacher,json={'name':name,'grade':grade,'course_id':course,'exam_year':2027})
        self.assertEqual(r.status_code,200,r.text)
        return r.json()['classroom'],r.json()['join_code']

    def join(self,learner,code):
        r=self.client.post('/classes/join',headers=learner,json={'code':code})
        self.assertEqual(r.status_code,200,r.text)
        return r.json()

    def start(self,room=None,who=None,**extra):
        r=self.client.post('/learning',headers=who or self.learner,json={'class_id':(room or self.room)['id'],'topic_id':'linear',**extra})
        self.assertEqual(r.status_code,200,r.text)
        self.headers={**(who or self.learner),'X-Learning-Token':r.json()['token']}
        return r.json()

    def action(self,action='continue',attempted=True,headers=None):
        return self.client.post('/learning/session',headers=headers or self.headers,json={'action':action,'attempted':attempted})

    def policy(self,room=None,teacher=None,**changes):
        data={'max_hints':3,'paused':False,'evaluation_enabled':False,'voice_input_enabled':True,**changes}
        return self.client.put(f"/classes/{(room or self.room)['id']}/policy",headers=teacher or self.teacher,json=data)

    def test_guided_stages_and_independent_freeze(self):
        first=self.start()
        self.assertNotIn('explanation',first)
        self.assertEqual(first['curriculum']['code'],'6131')
        self.assertEqual(self.action('hint').status_code,409)
        self.assertEqual(self.action(attempted=False).status_code,409)
        self.assertEqual(self.action().json()['stage'],'explain')
        for n in range(3):
            r=self.action('hint').json();self.assertEqual(len(r['hints']),n+1);self.assertNotIn('explanation',r)
        self.assertEqual(self.action('hint').status_code,409)
        self.assertEqual(self.action().json()['stage'],'feedback')
        self.assertEqual(self.action(attempted=False).json()['stage'],'apply')
        r=self.action().json();self.assertEqual(r['stage'],'independent');self.assertEqual(r['hints'],[])
        self.assertNotIn('explanation',r);self.assertNotIn('independent_explanation',r)
        self.assertEqual(self.action('direct').status_code,409)
        self.assertEqual(self.action('hint').status_code,409)
        self.assertEqual(self.action(attempted=False).status_code,409)
        self.assertEqual(self.action().json()['stage'],'complete')
        self.assertEqual(self.action().status_code,409)

    def test_teacher_cannot_be_self_assigned(self):
        for invitation in ('','wrong'):
            r=self.client.post('/auth/register',json={'username':'fake_teacher','password':PASSWORD,'role':'teacher','invitation':invitation})
            self.assertEqual(r.status_code,403)
        r=self.client.post('/classes',headers=self.learner,json={'name':'fake','grade':10,'course_id':'na-nssco','exam_year':2027})
        self.assertEqual(r.status_code,403)
        self.assertEqual(self.policy(teacher=self.learner).status_code,403)

    def test_single_teacher_multiple_grades_and_pathways(self):
        self.create_class(self.teacher,11,'na-nssco','Grade 11')
        self.create_class(self.teacher,12,'na-nsscas','Grade 12')
        self.create_class(self.teacher,10,'cam-igcse-extended','Cambridge IGCSE')
        self.create_class(self.teacher,12,'cam-as-pure','Cambridge AS')
        self.create_class(self.teacher,12,'cam-a-statistics','Cambridge A')
        rooms=self.client.get('/classes',headers=self.teacher).json()
        self.assertEqual(len(rooms),6)
        self.assertEqual({r['course']['pathway'] for r in rooms},{'Namibia','Cambridge'})
        self.assertEqual(len(self.client.get('/classes',headers=self.learner).json()),1)

    def test_class_policies_and_roles_are_isolated(self):
        second,_=self.create_class(self.teacher,11,'na-nssco')
        stranger=self.register('other_teacher','teacher')
        self.assertEqual(self.policy(teacher=stranger,max_hints=0).status_code,403)
        self.assertEqual(self.client.get(f"/classes/{self.room['id']}/members",headers=stranger).status_code,403)
        self.assertEqual(self.policy(max_hints=1,paused=True,voice_input_enabled=False).status_code,200)
        rooms=self.client.get('/classes',headers=self.teacher).json()
        unchanged=next(c for c in rooms if c['id']==second['id'])
        self.assertEqual(unchanged['max_hints'],3);self.assertFalse(unchanged['paused']);self.assertTrue(unchanged['voice_input_enabled'])
        self.assertEqual(self.client.post('/learning',headers=self.learner,json={'class_id':second['id'],'topic_id':'linear'}).status_code,403)
        self.assertEqual(self.client.get(f"/classes/{self.room['id']}/members",headers=self.learner).status_code,403)

    def test_curriculum_and_topic_validation(self):
        for grade,course,year in [(12,'na-nssco',2027),(10,'na-nsscas',2027),(10,'unknown',2027),(10,'na-nssco',2030)]:
            self.assertEqual(self.client.post('/classes',headers=self.teacher,json={'name':'Invalid','grade':grade,'course_id':course,'exam_year':year}).status_code,422)
        core,code=self.create_class(self.teacher,10,'cam-igcse-core')
        self.join(self.learner,code)
        self.assertEqual(self.client.post('/learning',headers=self.learner,json={'class_id':core['id'],'topic_id':'differentiate'}).status_code,422)
        advanced,code=self.create_class(self.teacher,12,'cam-as-pure')
        self.join(self.learner,code)
        result=self.start(advanced,topic_id='differentiate')
        self.assertEqual(result['curriculum']['code'],'9709')
        self.assertIn('gradient',result['challenge'])
        self.assertNotEqual(result['curriculum']['id'],self.room['course_id'])

    def test_every_starter_plan_valid_and_no_ai_required(self):
        from modules.tutor import LessonPlan
        with patch('main.make_plan',side_effect=AssertionError('Must not use AI')):
            self.start()
        for course in catalogue():
            for topic in course['topics']:
                plan=LESSONS[topic['id']]
                LessonPlan.model_validate(plan)
                self.assertNotEqual(plan['application'],plan['independent'])
                self.assertEqual(len(plan['hints']),3)

    def test_ai_receives_authoritative_class_context(self):
        with patch('main.make_plan',return_value=dict(LESSONS['linear'])) as provider:
            result=self.start(topic='Explain how to preserve equality.')
            args=provider.call_args.args
            self.assertEqual(args[2]['id'],'na-nssco');self.assertEqual(args[2]['exam_year'],2027);self.assertEqual(args[3],'linear')
            self.assertEqual(result['content_source'],'ai_general_support')
        with patch('main.make_plan',side_effect=RuntimeError('PRIVATE SECRET')):
            r=self.client.post('/learning',headers=self.learner,json={'class_id':self.room['id'],'topic_id':'linear','topic':'question'})
            self.assertEqual(r.status_code,503);self.assertNotIn('SECRET',r.text)

    def test_session_ownership_membership_revocation_and_logout(self):
        self.start();old=self.headers.copy()
        other=self.register('another_learner');self.join(other,self.code)
        stolen={**other,'X-Learning-Token':old['X-Learning-Token']}
        self.assertEqual(self.action(headers=stolen).status_code,403)
        self.assertEqual(self.client.delete('/learning/session',headers=stolen).status_code,403)
        learner_id=self.client.get('/auth/me',headers=self.learner).json()['id']
        self.client.delete(f"/classes/{self.room['id']}/members/{learner_id}",headers=self.teacher)
        self.assertEqual(self.action(headers=old).status_code,403)
        self.assertEqual(self.client.delete('/learning/session',headers=old).status_code,200)
        self.client.post('/auth/logout',headers=self.learner)
        self.assertEqual(self.client.get('/classes',headers=self.learner).status_code,401)
        self.assertEqual(self.client.post('/learning',json={'class_id':self.room['id'],'topic_id':'linear'}).status_code,401)

    def test_invitation_rotation_expiry_and_peer_privacy(self):
        result=self.client.post(f"/classes/{self.room['id']}/invitation",headers=self.teacher)
        code=result.json()['join_code'];new=self.register('new_learner')
        self.assertEqual(self.client.post('/classes/join',headers=new,json={'code':self.code}).status_code,404)
        self.join(new,code)
        with accounts.db() as connection:
            connection.execute('UPDATE classes SET join_expires=0 WHERE id=?',(self.room['id'],))
        self.assertEqual(self.client.post('/classes/join',headers=new,json={'code':code}).status_code,404)
        self.assertEqual(self.client.post(f"/classes/{self.room['id']}/invitation",headers=self.learner).status_code,403)

    def test_counts_are_opt_in_class_scoped_and_small_groups_suppressed(self):
        self.policy(evaluation_enabled=True)
        self.start(consent=False);self.action()
        with accounts.db() as connection:
            self.assertEqual(connection.execute('SELECT COUNT(*) FROM activity_counts').fetchone()[0],0)
        self.start(consent=True);self.action();self.action('hint')
        data=self.client.get(f"/classes/{self.room['id']}/evaluation",headers=self.teacher).json()
        self.assertTrue(data['suppressed']);self.assertEqual(data['counts'],{})
        for n in range(4):
            self.join(self.register(f'cohort_{n}'),self.code)
        data=self.client.get(f"/classes/{self.room['id']}/evaluation",headers=self.teacher).json()
        self.assertEqual(data['counts'],{'started':1,'explain':1,'hint':1})
        self.assertNotIn('learner',str(data['counts']))
        self.assertEqual(self.client.get(f"/classes/{self.room['id']}/evaluation",headers=self.learner).status_code,403)
        self.policy(evaluation_enabled=False)
        with accounts.db() as connection:
            self.assertEqual(connection.execute('SELECT COUNT(*) FROM activity_counts').fetchone()[0],0)

    def test_credentials_persistence_and_hashed_storage(self):
        r=self.client.post('/auth/login',json={'username':'LEARNER','password':PASSWORD})
        self.assertEqual(r.status_code,200)
        token=r.json()['token']
        with accounts.db() as connection:
            hashes=[row[0] for row in connection.execute('SELECT password_hash FROM accounts')]
            tokens=[row[0] for row in connection.execute('SELECT token_hash FROM auth_sessions')]
        self.assertFalse(any(PASSWORD in h for h in hashes));self.assertNotIn(token,tokens)
        self.assertEqual(self.client.post('/auth/login',json={'username':'learner','password':'wrong passphrase'}).status_code,401)
        self.assertEqual(self.client.post('/auth/register',json={'username':'learner','password':PASSWORD}).status_code,409)
        self.assertEqual(self.client.post('/auth/register',json={'username':'tiny','password':'short'}).status_code,422)

    def test_direct_accessibility_support_and_teacher_preview(self):
        self.policy(evaluation_enabled=True)
        self.start(who=self.teacher,consent=True)
        r=self.action('direct',False).json()
        self.assertEqual(r['stage'],'attempt');self.assertTrue(r['direct_used'])
        with accounts.db() as connection:
            self.assertEqual(connection.execute('SELECT COUNT(*) FROM activity_counts').fetchone()[0],0)
        direct=self.client.post('/explain',headers=self.learner,json={'class_id':self.room['id'],'topic_id':'linear'}).json()
        self.assertIn('x=4',direct['answer'])
        self.policy(paused=True)
        self.assertEqual(self.action().status_code,503)
        self.assertEqual(self.client.delete('/learning/session',headers=self.headers).status_code,200)

    def test_limits_expiry_and_retired_bypasses(self):
        self.start()
        main.store.get(self.headers['X-Learning-Token']).expires=0
        self.assertEqual(self.action().status_code,404)
        key=hashlib.sha256(main.rate_salt+b'testclient').hexdigest()
        main.auth_attempts[key]=deque([time.monotonic()]*300)
        self.assertEqual(self.client.post('/auth/login',json={'username':'learner','password':PASSWORD}).status_code,429)
        self.assertEqual(self.client.post('/ask/').status_code,410)
        self.assertEqual(self.client.post('/upload_pdfs/').status_code,403)
        main.ai_calls.extend([time.monotonic()]*60)
        self.assertEqual(self.client.post('/learning',headers=self.learner,json={'class_id':self.room['id'],'topic_id':'linear','topic':'explain'}).status_code,429)
        self.start() # Starter practice remains available when provider calls are capped.
        self.assertEqual(self.client.get('/curricula').headers['cache-control'],'no-store')

    def test_multi_subject_classes_and_full_guided_flow(self):
        subjects={'mathematics','physics','chemistry','biology','computing'}
        self.assertEqual({c['subject'] for c in catalogue()},subjects)
        with patch('main.make_plan',side_effect=AssertionError('Starter must not call AI')):
            for course in catalogue():
                with self.subTest(course=course['id']):
                    year=course['exam_years'][0]
                    room_result=self.client.post('/classes',headers=self.teacher,json={'name':course['subject_label']+' pilot','grade':course['grades'][0],'course_id':course['id'],'exam_year':year})
                    self.assertEqual(room_result.status_code,200,room_result.text)
                    room=room_result.json()['classroom'];self.join(self.learner,room_result.json()['join_code'])
                    self.assertEqual(room['course']['subject'],course['subject'])
                    first=self.start(room,topic_id=course['topics'][0]['id'])
                    self.assertNotIn('explanation',first)
                    for stage in ['explain','feedback','apply','independent']:
                        result=self.action().json();self.assertEqual(result['stage'],stage)
                    self.assertEqual(result['hints'],[]);self.assertNotIn('explanation',result)
                    self.assertEqual(self.action('direct').status_code,409)
                    self.assertEqual(self.action().json()['stage'],'complete')
                    self.assertEqual(self.client.delete('/learning/session',headers=self.headers).status_code,200)
        rooms=self.client.get('/classes',headers=self.teacher).json()
        self.assertEqual({r['course']['subject'] for r in rooms},subjects)
        self.assertEqual({r['course']['pathway'] for r in rooms},{'Namibia','Cambridge'})

    def test_subject_topic_year_and_policy_boundaries(self):
        physics,code=self.create_class(self.teacher,10,'na-nssco-physics','Physics')
        chemistry,chem_code=self.create_class(self.teacher,11,'na-nssco-chemistry','Chemistry')
        self.join(self.learner,code);self.join(self.learner,chem_code)
        self.assertEqual(self.client.post('/learning',headers=self.learner,json={'class_id':physics['id'],'topic_id':'atoms'}).status_code,422)
        self.assertEqual(self.client.post('/classes',headers=self.teacher,json={'name':'Wrong year','grade':12,'course_id':'cam-as-computing-2026','exam_year':2027}).status_code,422)
        self.assertEqual(self.client.post('/classes',headers=self.teacher,json={'name':'Wrong grade','grade':10,'course_id':'na-nsscas-biology','exam_year':2027}).status_code,422)
        self.policy(physics,max_hints=0,voice_input_enabled=False,paused=True)
        listed=self.client.get('/classes',headers=self.teacher).json()
        other=next(r for r in listed if r['id']==chemistry['id'])
        self.assertEqual(other['max_hints'],3);self.assertTrue(other['voice_input_enabled']);self.assertFalse(other['paused'])
        with patch('main.make_plan',return_value=dict(LESSONS['atoms'])) as provider:
            self.start(chemistry,topic_id='atoms',topic='Explain conservation.')
            context=provider.call_args.args[2]
            self.assertEqual(context['subject'],'chemistry');self.assertIn('do not mix',context['safety_notice'])

if __name__=='__main__':unittest.main()
