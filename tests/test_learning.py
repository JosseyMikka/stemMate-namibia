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
from modules import accounts, projects
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

    def test_project_briefs_are_teacher_owned_and_class_scoped(self):
        brief={'title':'Paper model','question':'How can we explain equality?', 'brief':'Make and test a paper model, then revise it.', 'artifact':'A revised paper balance model', 'criteria':'Accuracy, evidence and independent explanation', 'resources':'Paper, fictional data and teacher checkpoints', 'topic_id':'linear','bloom':['understand','analyse','create'],'published':False,'revision':0}
        route=f"/classes/{self.room['id']}/projects"
        self.assertEqual(self.client.post(route,headers=self.learner,json=brief).status_code,403)
        created=self.client.post(route,headers=self.teacher,json=brief)
        self.assertEqual(created.status_code,200,created.text);project=created.json()
        self.assertEqual(self.client.get(route,headers=self.learner).json(),[])
        other=self.register('project_stranger','teacher')
        self.assertEqual(self.client.get(route,headers=other).status_code,403)
        self.assertEqual(self.client.put(route+f"/{project['id']}",headers=other,json={**project,'published':True}).status_code,403)
        published=self.client.put(route+f"/{project['id']}",headers=self.teacher,json={**project,'published':True})
        self.assertEqual(published.status_code,200);self.assertEqual(published.json()['revision'],2)
        self.assertEqual(len(self.client.get(route,headers=self.learner).json()),1)
        self.assertEqual(self.client.put(route+f"/{project['id']}",headers=self.teacher,json=project).status_code,409)
        second,_=self.create_class(self.teacher)
        self.assertEqual(self.client.put(f"/classes/{second['id']}/projects/{project['id']}",headers=self.teacher,json=published.json()).status_code,404)
        withdrawn=self.client.put(route+f"/{project['id']}",headers=self.teacher,json={**published.json(),'published':False})
        self.assertEqual(withdrawn.status_code,200)
        self.assertEqual(self.client.get(route,headers=self.learner).json(),[])
        learner_id=self.client.get('/auth/me',headers=self.learner).json()['id']
        self.client.delete(f"/classes/{self.room['id']}/members/{learner_id}",headers=self.teacher)
        self.assertEqual(self.client.get(route,headers=self.learner).status_code,403)

    def test_project_validation_and_existing_database_upgrade(self):
        route=f"/classes/{self.room['id']}/projects"
        brief={'title':'New project','question':'How could we explain this idea?', 'brief':'Make a model and evaluate evidence with your teacher.', 'artifact':'A model and revision log', 'criteria':'Evidence and individual explanation', 'resources':'Paper and supplied data', 'topic_id':'linear','bloom':['create'],'published':False}
        for change in [{'bloom':[]},{'bloom':['mastery']},{'topic_id':'atoms'},{'brief':' '*20},{'resources':'x'*2001}]:
            self.assertEqual(self.client.post(route,headers=self.teacher,json={**brief,**change}).status_code,422)
        # Reopening an existing account DB adds the new project table without losing users/classes.
        with accounts.db() as connection:
            self.assertEqual(connection.execute('SELECT COUNT(*) FROM accounts').fetchone()[0],2)
            self.assertEqual(connection.execute('SELECT COUNT(*) FROM projects').fetchone()[0],0)
        self.assertEqual(self.client.post(route,headers=self.teacher,json=brief).status_code,200)

    def submission_fixture(self):
        brief={'title':'Model project','question':'How can a model explain equality?', 'brief':'Make and test an original paper model with evidence.', 'artifact':'A paper model and description', 'criteria':'Accuracy, reasons and independent explanation', 'resources':'Paper and supplied fictional data','topic_id':'linear','bloom':['create'],'published':True}
        p=self.client.post(f"/classes/{self.room['id']}/projects",headers=self.teacher,json=brief).json()
        base=f"/classes/{self.room['id']}/projects/{p['id']}/submissions"
        value={'revision':1,'expected_version':0,'stage':2,'entries':['prediction','design','','','','',''],'artifact':'A text prototype for classroom review.','consent':True,'consent_retention_days':30}
        return p,base,value

    def test_submission_consent_scope_and_no_passive_collection(self):
        project,base,value=self.submission_fixture()
        privacy=f"/classes/{self.room['id']}/project-privacy"
        self.assertEqual(self.client.get(privacy,headers=self.learner).json()['enabled'],False)
        self.assertEqual(self.client.post(base,headers=self.learner,json=value).status_code,409)
        self.assertEqual(self.client.put(privacy,headers=self.learner,json={'enabled':True}).status_code,403)
        self.client.put(privacy,headers=self.teacher,json={'enabled':True,'retention_days':7})
        self.assertEqual(self.client.post(base,headers=self.learner,json={**value,'consent':False}).status_code,422)
        self.assertEqual(self.client.get(base,headers=self.teacher).json(),[])
        saved=self.client.post(base,headers=self.learner,json={**value,'consent_retention_days':7})
        self.assertEqual(saved.status_code,200,saved.text);sid=saved.json()['id']
        peer=self.register('project_peer');self.join(peer,self.code)
        stranger=self.register('teacher_outsider','teacher')
        self.assertEqual(self.client.get(base,headers=peer).json(),[])
        self.assertEqual(self.client.get(base+f'/{sid}',headers=peer).status_code,403)
        self.assertEqual(self.client.get(base,headers=stranger).status_code,403)
        self.assertEqual(self.client.get(base+f'/{sid}',headers=stranger).status_code,403)
        detail=self.client.get(base+f'/{sid}',headers=self.teacher).json()
        self.assertEqual(detail['body']['artifact'],value['artifact']);self.assertEqual(detail['body']['brief']['revision'],1)
        self.assertEqual(self.client.post(base,headers=self.teacher,json=value).status_code,403)

    def test_feedback_revisions_and_stale_writes(self):
        project,base,value=self.submission_fixture()
        self.client.put(f"/classes/{self.room['id']}/project-privacy",headers=self.teacher,json={'enabled':True})
        sid=self.client.post(base,headers=self.learner,json=value).json()['id']
        review={'receipt':self.client.get(base+f'/{sid}',headers=self.teacher).json()['receipt'],'version':1,'status':'revision_requested','feedback':'Explain why your model preserves equality, then test another case.','accuracy':'developing','reasoning':'developing','testing':'not_assessed','revision':'not_assessed','artifact_verified':False,'independent_verified':False}
        route=base+f'/{sid}/review'
        self.assertEqual(self.client.put(route,headers=self.learner,json=review).status_code,403)
        self.assertEqual(self.client.put(route,headers=self.teacher,json=review).status_code,200)
        self.assertEqual(self.client.put(route,headers=self.teacher,json=review).status_code,409)
        feedback=self.client.get(base+f'/{sid}',headers=self.learner).json()['review']
        self.assertEqual(feedback['status'],'revision_requested');self.assertFalse(feedback['independent_verified'])
        self.assertEqual(self.client.post(base,headers=self.learner,json=value).status_code,409)
        revised=self.client.post(base,headers=self.learner,json={**value,'expected_version':1,'artifact':'Version two with a second test case.'})
        self.assertEqual(revised.json()['version'],2)
        self.assertEqual(len(self.client.get(base,headers=self.learner).json()),2)
        latest=self.client.get(base,headers=self.teacher).json()
        self.assertEqual(len(latest),1);self.assertEqual(latest[0]['version'],2);self.assertEqual(latest[0]['review_status'],'awaiting_review')
        self.assertEqual(self.client.get(base+f'/{sid}',headers=self.learner).json()['review']['feedback'],review['feedback'])

    def test_submission_retention_revocation_and_withdrawal(self):
        project,base,value=self.submission_fixture();privacy=f"/classes/{self.room['id']}/project-privacy"
        self.client.put(privacy,headers=self.teacher,json={'enabled':True,'retention_days':90})
        sid=self.client.post(base,headers=self.learner,json={**value,'consent_retention_days':90}).json()['id']
        self.client.put(privacy,headers=self.teacher,json={'enabled':False,'retention_days':7})
        self.assertEqual(self.client.post(base,headers=self.learner,json={**value,'expected_version':1}).status_code,409)
        with accounts.db() as c:self.assertLessEqual(c.execute('SELECT expires FROM project_submissions WHERE id=?',(sid,)).fetchone()[0],time.time()+7*86400)
        learner_id=self.client.get('/auth/me',headers=self.learner).json()['id']
        self.client.delete(f"/classes/{self.room['id']}/members/{learner_id}",headers=self.teacher)
        self.assertEqual(self.client.get(base+f'/{sid}',headers=self.teacher).status_code,403)
        self.assertEqual(len(self.client.get('/my-project-submissions',headers=self.learner).json()),1)
        self.assertEqual(self.client.delete(base,headers=self.learner).status_code,200)
        self.assertEqual(self.client.get('/my-project-submissions',headers=self.learner).json(),[])
        self.join(self.learner,self.code)
        self.client.put(privacy,headers=self.teacher,json={'enabled':True})
        sid=self.client.post(base,headers=self.learner,json=value).json()['id']
        with accounts.db() as c:c.execute('UPDATE project_submissions SET expires=0 WHERE id=?',(sid,))
        self.assertEqual(self.client.get(base+f'/{sid}',headers=self.learner).status_code,404)
        with accounts.db() as c:self.assertEqual(c.execute('SELECT COUNT(*) FROM project_submissions').fetchone()[0],0)
        self.client.post(base,headers=self.learner,json=value)
        self.client.put(privacy,headers=self.teacher,json={'enabled':False,'delete_stored':True})
        self.assertEqual(self.client.get(base,headers=self.learner).json(),[])

    def test_submission_input_validation(self):
        project,base,value=self.submission_fixture()
        self.client.put(f"/classes/{self.room['id']}/project-privacy",headers=self.teacher,json={'enabled':True})
        for change in [{'revision':2},{'entries':['x']},{'entries':['x'*6001]+['']*6},{'stage':3},{'artifact':'x'*20001},{'stage':8}]:
            self.assertIn(self.client.post(base,headers=self.learner,json={**value,**change}).status_code,[409,422])

    def test_retention_is_measured_from_submission_and_never_extended(self):
        project,base,value=self.submission_fixture();privacy=f"/classes/{self.room['id']}/project-privacy"
        self.client.put(privacy,headers=self.teacher,json={'enabled':True,'retention_days':90})
        sid=self.client.post(base,headers=self.learner,json={**value,'consent_retention_days':90}).json()['id']
        with accounts.db() as c:c.execute('UPDATE project_submissions SET updated=? WHERE id=?',(time.time()-8*86400,sid))
        self.client.put(privacy,headers=self.teacher,json={'enabled':True,'retention_days':7})
        self.assertEqual(self.client.get(base,headers=self.learner).json(),[])
        sid=self.client.post(base,headers=self.learner,json={**value,'consent_retention_days':7}).json()['id']
        before=self.client.get(base+f'/{sid}',headers=self.learner).json()['expires']
        self.client.put(privacy,headers=self.teacher,json={'enabled':True,'retention_days':90})
        self.assertEqual(self.client.get(base+f'/{sid}',headers=self.learner).json()['expires'],before)

    def test_sharing_requires_current_storage_acknowledgement(self):
        project,base,value=self.submission_fixture();privacy=f"/classes/{self.room['id']}/project-privacy"
        self.client.put(privacy,headers=self.teacher,json={'enabled':True,'retention_days':7})
        self.assertEqual(self.client.post(base,headers=self.learner,json=value).status_code,409)
        missing={k:v for k,v in value.items() if k!='consent_retention_days'}
        self.assertEqual(self.client.post(base,headers=self.learner,json=missing).status_code,422)
        saved=self.client.post(base,headers=self.learner,json={**value,'consent_retention_days':7})
        self.assertEqual(saved.status_code,200)
        detail=self.client.get(base+f"/{saved.json()['id']}",headers=self.learner).json()
        self.assertEqual(detail['body']['consent_retention_days'],7)

    def test_concurrent_privacy_change_prevents_submission(self):
        project,base,value=self.submission_fixture();privacy=f"/classes/{self.room['id']}/project-privacy"
        self.client.put(privacy,headers=self.teacher,json={'enabled':True})
        def disable():
            with accounts.db() as c:c.execute('UPDATE project_privacy SET enabled=0 WHERE class_id=?',(self.room['id'],))
        with patch.object(projects,'purge_expired',side_effect=disable):
            self.assertEqual(self.client.post(base,headers=self.learner,json=value).status_code,409)
        self.assertEqual(self.client.get(base,headers=self.learner).json(),[])

    def test_concurrent_membership_and_brief_changes_prevent_submission(self):
        project,base,value=self.submission_fixture()
        self.client.put(f"/classes/{self.room['id']}/project-privacy",headers=self.teacher,json={'enabled':True})
        def change_brief():
            with accounts.db() as c:c.execute('UPDATE projects SET revision=revision+1 WHERE id=?',(project['id'],))
        with patch.object(projects,'purge_expired',side_effect=change_brief):
            self.assertEqual(self.client.post(base,headers=self.learner,json=value).status_code,409)
        def remove_member():
            with accounts.db() as c:c.execute('DELETE FROM enrolments WHERE class_id=?',(self.room['id'],))
        with patch.object(projects,'purge_expired',side_effect=remove_member):
            self.assertEqual(self.client.post(base,headers=self.learner,json={**value,'revision':2}).status_code,403)
        with accounts.db() as c:self.assertEqual(c.execute('SELECT COUNT(*) FROM project_submissions').fetchone()[0],0)

    def test_concurrent_removal_prevents_teacher_feedback(self):
        project,base,value=self.submission_fixture()
        self.client.put(f"/classes/{self.room['id']}/project-privacy",headers=self.teacher,json={'enabled':True})
        sid=self.client.post(base,headers=self.learner,json=value).json()['id']
        detail=self.client.get(base+f'/{sid}',headers=self.teacher).json()
        review={'receipt':detail['receipt'],'version':1,'status':'revision_requested','feedback':'Add another equation and explain your reasoning.','accuracy':'developing','reasoning':'developing','testing':'not_assessed','revision':'not_assessed'}
        original=projects.submission_access
        def remove_after_read(*args):
            row=original(*args)
            with accounts.db() as c:c.execute('DELETE FROM enrolments WHERE class_id=?',(self.room['id'],))
            return row
        with patch.object(projects,'submission_access',side_effect=remove_after_read):
            self.assertEqual(self.client.put(base+f'/{sid}/review',headers=self.teacher,json=review).status_code,403)
        with accounts.db() as c:self.assertEqual(json.loads(c.execute('SELECT review FROM project_submissions WHERE id=?',(sid,)).fetchone()[0]),{})

    def test_independent_practice_without_class_or_teacher(self):
        learner=self.register('independent_learner')
        self.assertEqual(self.client.get('/classes',headers=learner).json(),[])
        value={'course_id':'na-nssco','grade':10,'exam_year':2027,'topic_id':'linear','consent':True}
        r=self.client.post('/learning',headers=learner,json=value)
        self.assertEqual(r.status_code,200,r.text)
        token=r.json()['token'];headers={**learner,'X-Learning-Token':token}
        self.assertEqual(r.json()['class_id'],0)
        self.assertFalse(main.store.get(token).consent)
        self.assertNotIn('explanation',r.json())
        self.assertEqual(self.client.post('/learning/session',headers=headers,json={'action':'hint'}).status_code,409)
        self.assertEqual(self.client.get('/learning/session',headers={**self.learner,'X-Learning-Token':token}).status_code,403)
        for expected in ['explain','feedback','apply','independent','complete']:
            step=self.client.post('/learning/session',headers=headers,json={'action':'continue','attempted':True})
            self.assertEqual(step.json()['stage'],expected)
            if expected=='independent':
                self.assertEqual(self.client.post('/learning/session',headers=headers,json={'action':'direct'}).status_code,409)
        direct=self.client.post('/explain',headers=learner,json=value)
        self.assertEqual(direct.status_code,200);self.assertIn('answer',direct.json())
        with accounts.db() as c:
            self.assertEqual(c.execute('SELECT COUNT(*) FROM enrolments').fetchone()[0],1)
            self.assertEqual(c.execute('SELECT COUNT(*) FROM project_submissions').fetchone()[0],0)
        self.assertEqual(self.client.delete('/learning/session',headers=headers).status_code,200)
        self.assertEqual(self.client.get('/learning/session',headers=headers).status_code,404)

    def test_independent_practice_curriculum_and_ai_boundaries(self):
        for course in catalogue():
            value={'course_id':course['id'],'grade':course['grades'][0],'exam_year':course['exam_years'][0],'topic_id':course['topics'][0]['id']}
            r=self.client.post('/learning',headers=self.learner,json=value)
            self.assertEqual(r.status_code,200,r.text)
            self.assertEqual(r.json()['curriculum']['id'],course['id'])
        value={'course_id':'na-nssco','grade':10,'topic_id':'linear'}
        for change in [{'grade':12},{'course_id':'unknown'},{'topic_id':'atoms'}]:
            self.assertEqual(self.client.post('/learning',headers=self.learner,json={**value,**change}).status_code,422)
        self.assertEqual(self.client.post('/learning',json=value).status_code,401)

    def test_independent_ai_question_uses_curriculum_and_reasoning_gates(self):
        solo=self.register('solo_question')
        value={'course_id':'cam-igcse-extended','grade':11,'exam_year':2027,'topic_id':'linear','topic':'Why must I subtract the same number on both sides?','consent':True}
        with patch('main.make_plan',return_value=dict(LESSONS['linear'])) as provider:
            r=self.client.post('/learning',headers=solo,json=value)
        self.assertEqual(r.status_code,200,r.text)
        self.assertEqual(provider.call_args.args[0],value['topic'])
        course=provider.call_args.args[2]
        self.assertEqual((course['id'],course['grade'],course['exam_year']),('cam-igcse-extended',11,2027))
        self.assertEqual(provider.call_args.args[3],'linear')
        self.assertEqual(r.json()['content_source'],'ai_general_support')
        self.assertNotIn('explanation',r.json());self.assertFalse(main.store.get(r.json()['token']).consent)
        h={**solo,'X-Learning-Token':r.json()['token']}
        self.assertEqual(self.client.post('/learning/session',headers=h,json={'action':'hint'}).status_code,409)
        self.assertEqual(self.client.post('/learning/session',headers=h,json={'action':'continue','attempted':False}).status_code,409)
        self.client.post('/learning/session',headers=h,json={'action':'continue','attempted':True})
        for i in range(3):
            step=self.client.post('/learning/session',headers=h,json={'action':'hint'}).json()
            self.assertEqual(len(step['hints']),i+1);self.assertNotIn('explanation',step)
        self.assertEqual(self.client.post('/learning/session',headers=h,json={'action':'hint'}).status_code,409)
        direct=self.client.post('/learning/session',headers=h,json={'action':'direct'}).json()
        self.assertEqual(direct['direct_explanation'],LESSONS['linear']['explanation'])
        self.assertEqual(self.client.get('/classes',headers=solo).json(),[])
        self.assertEqual(self.client.get('/my-project-submissions',headers=solo).json(),[])

    def test_independent_ai_direct_and_unavailable_starter_fallback(self):
        value={'course_id':'na-nssco-physics','grade':10,'exam_year':2027,'topic_id':'motion','topic':'What does constant velocity mean?'}
        with patch('main.direct_explanation',return_value='A safe explanation. Explain it back in your own words.') as provider:
            r=self.client.post('/explain',headers=self.learner,json=value)
        self.assertEqual(r.status_code,200,r.text)
        self.assertEqual(r.json()['content_source'],'ai_general_support')
        self.assertEqual(provider.call_args.args[2]['subject'],'physics')
        for path,target in [('/learning','main.make_plan'),('/explain','main.direct_explanation')]:
            with patch(target,side_effect=RuntimeError('PRIVATE PROVIDER SECRET')):
                r=self.client.post(path,headers=self.learner,json=value)
            self.assertEqual(r.status_code,503);self.assertNotIn('PRIVATE',r.text)
            self.assertIn('starter practice',r.json()['detail'])
            self.assertEqual(self.client.post(path,headers=self.learner,json={**value,'topic':''}).status_code,200)
        with patch('main.make_plan') as provider:
            self.assertEqual(self.client.post('/learning',headers=self.learner,json={**value,'topic':'x'*2001}).status_code,422)
            self.assertEqual(self.client.post('/learning',headers=self.learner,json={**value,'course_id':'unknown'}).status_code,422)
            provider.assert_not_called()

if __name__=='__main__':unittest.main()
