import os
import json
import sqlite3
import tempfile
import time
import sys
import unittest
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'server'))
from fastapi.testclient import TestClient
import main
from modules import accounts,family,research
from modules.learning import LearningStore

class FamilyResearchTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup)
        self.env=patch.dict(os.environ,{'STEMMATE_ACCOUNTS_DB':str(Path(self.tmp.name)/'db.sqlite'),'STEMMATE_RESEARCH_CONFIG':str(Path(self.tmp.name)/'study.json')});self.env.start();self.addCleanup(self.env.stop)
        main.store=LearningStore();main.auth_attempts.clear();main.ai_calls.clear();main.ai_user_calls.clear()
        self.client=TestClient(main.app)
        self.learner=self.reg('child','learner');self.guardian=self.reg('adult','guardian');self.other=self.reg('stranger','guardian')
        self.study=dict(enabled=True,study_id='pilot',version='v1',title='Pilot',institution='Test institution',approval_reference='TEST ONLY',information='Study information for a fictional test. '*8,contact='research@example.test',independent_contact='ethics@example.test',provider_notice='Test provider disclosure; never a real approval.',withdrawal_notice='Test withdrawal disclosure; live records can be removed.',starts=time.time()-60,ends=time.time()+86400,retention_days=30,researcher_ids=[self.guardian['id']],participant_ids=[self.guardian['id'],self.learner['id']])
    def reg(self,name,role):
        r=self.client.post('/auth/register',json={'username':name,'password':'test passphrase long','role':role});self.assertEqual(r.status_code,200,r.text)
        return {'id':r.json()['user']['id'],'headers':{'Authorization':'Bearer '+r.json()['token']}}
    def call(self,method,url,who=None,body=None):
        return self.client.request(method,url,headers=(who or self.learner)['headers'],json=body)
    def setup_link(self):
        code=self.call('POST','/family/invitation').json()['code']
        self.assertEqual(self.call('POST','/family/claim',self.guardian,{'code':code}).status_code,200)
        ident=self.call('GET','/family').json()[0]['id']
        self.call('PUT',f'/family/{ident}',body={'share_progress':True})
        with accounts.db() as c:c.execute('UPDATE family_links SET verified=1 WHERE id=?',(ident,))
        return ident
    def config(self):Path(os.environ['STEMMATE_RESEARCH_CONFIG']).write_text(json.dumps(self.study))
    def consent(self,who,participate=True,survey=True):return self.call('PUT','/research/choice',who,{'version':self.study['version'],'participate':participate,'survey':survey})
    def start(self,who=None,**extra):return self.call('POST','/learning',who,{'course_id':'na-nssco','topic_id':'linear','support':'together',**extra})
    def count(self,table):
        with accounts.db() as c:research.init(c);return c.execute('SELECT count(*) FROM '+table).fetchone()[0]
    def test_pending_pairing_ownership_and_class_isolation(self):
        code=self.call('POST','/family/invitation').json()['code']
        self.call('POST','/family/claim',self.guardian,{'code':code})
        self.assertEqual(self.call('POST','/family/claim',self.other,{'code':code}).status_code,404)
        ident=self.call('GET','/family').json()[0]['id']
        self.assertEqual(self.call('GET',f'/family/{ident}/progress',self.guardian).status_code,409)
        self.call('PUT',f'/family/{ident}',body={'share_progress':False})
        self.assertEqual(self.call('GET',f'/family/{ident}/progress',self.guardian).status_code,409)
        self.assertEqual(self.call('GET',f'/family/{ident}/progress',self.other).status_code,404)
        self.assertEqual(self.call('POST','/classes',self.guardian,{'name':'x','grade':10,'exam_year':2027,'course_id':'na-nssco'}).status_code,403)
        self.assertEqual(self.call('PUT',f'/family/{ident}',self.guardian,{'share_progress':True}).status_code,403)
    def test_home_suggestion_progress_and_revocation(self):
        ident=self.setup_link();task={'course_id':'na-nssco','topic_id':'linear','grade':10,'exam_year':2027}
        self.assertEqual(self.call('POST',f'/family/{ident}/practice',self.guardian,task).status_code,200)
        self.assertEqual(self.call('GET',f'/family/{ident}/practice').json()[0]['topic_id'],'linear')
        r=self.start();self.assertEqual(r.status_code,200,r.text)
        progress=self.call('GET',f'/family/{ident}/progress',self.guardian).json()
        self.assertEqual(progress['counts'][0]['support'],'together')
        self.assertNotIn('challenge',str(progress))
        self.call('PUT',f'/family/{ident}',body={'share_progress':False})
        self.assertEqual(self.count('home_progress'),0)
        self.call('DELETE',f'/family/{ident}')
        self.assertEqual(self.call('GET',f'/family/{ident}/progress',self.guardian).status_code,404)
        self.assertEqual(main.store.get(r.json()['token']).owner_id,self.learner['id'])
    def test_disabled_and_incomplete_consent_collect_nothing(self):
        self.assertIsNone(self.call('GET','/research').json()['study'])
        self.assertEqual(self.consent(self.learner).status_code,409)
        self.start();self.assertEqual(self.count('research_events'),0)
        self.config();self.consent(self.learner)
        self.start();self.assertEqual(self.count('research_events'),0)
        ident=self.setup_link()
        self.call('PUT',f'/research/permission/{ident}',self.guardian,{'version':'v1','participate':True})
        self.assertFalse(self.call('GET','/research',self.guardian).json()['eligible'])
        self.start();self.assertEqual(self.count('research_events'),1)
        self.assertEqual(self.call('POST','/research/feedback',body={'ease':4,'helpfulness':3}).status_code,200)
        self.assertEqual(self.call('POST','/research/feedback',self.guardian,{'ease':4,'helpfulness':3}).status_code,403)
        self.consent(self.learner,False,False)
        self.assertEqual(self.count('research_events'),0);self.assertEqual(self.count('research_feedback'),0)
        self.start();self.assertEqual(self.count('research_events'),0)
    def test_version_feedback_withdrawal_and_export(self):
        self.config();self.consent(self.guardian)
        self.start(self.guardian);self.assertEqual(self.count('research_events'),1)
        self.assertEqual(self.call('GET','/research/export',self.other).status_code,403)
        self.assertEqual(self.call('GET','/research/export',self.guardian).json()['events'],[])
        self.study['version']='v2';self.config()
        self.assertFalse(self.call('GET','/research',self.guardian).json()['eligible'])
        self.assertEqual(self.call('GET','/research/export',self.guardian).json()['events'],[])
        self.assertEqual(self.call('PUT','/research/choice',self.guardian,{'version':'v1','participate':True}).status_code,409)
        Path(os.environ['STEMMATE_RESEARCH_CONFIG']).unlink()
        self.assertEqual(self.call('DELETE','/research',self.guardian).status_code,200)
        self.assertEqual(self.count('research_events'),0)
    def test_permission_and_link_withdrawal_delete_and_deny(self):
        ident=self.setup_link();self.config();self.consent(self.learner)
        self.call('PUT',f'/research/permission/{ident}',self.guardian,{'version':'v1','participate':True})
        self.start();self.assertEqual(self.count('research_events'),1)
        self.consent(self.guardian);self.call('DELETE','/research',self.guardian)
        self.assertTrue(self.call('GET','/research').json()['eligible']) # adult withdrawal is separate
        self.call('DELETE',f'/research/permission/{ident}',self.guardian)
        self.assertEqual(self.count('research_events'),0)
        self.assertFalse(self.call('GET','/research').json()['eligible'])
        self.call('PUT',f'/research/permission/{ident}',self.guardian,{'version':'v1','participate':True})
        self.start();self.call('DELETE',f'/family/{ident}')
        self.assertEqual(self.count('research_events'),0)
    def test_study_roster_partial_feedback_and_retention(self):
        self.config()
        self.assertEqual(self.consent(self.other).status_code,403)
        self.consent(self.guardian)
        self.assertEqual(self.call('POST','/research/feedback',self.guardian,{'ease':4}).status_code,200)
        self.assertEqual(self.call('POST','/research/feedback',self.guardian,{}).status_code,422)
        self.start(self.guardian)
        with accounts.db() as c:
            c.execute('UPDATE research_events SET expires=0')
            c.execute('UPDATE research_feedback SET expires=0')
            c.execute('UPDATE research_choices SET expires=0')
            c.execute('UPDATE research_decisions SET expires=0')
        research.purge_expired()
        for table in ['research_events','research_feedback','research_choices','research_decisions']:self.assertEqual(self.count(table),0)
        self.assertFalse(self.call('GET','/research',self.guardian).json()['eligible'])

    def test_account_constraint_upgrade_keeps_ids_passwords_and_enrolments(self):
        old=Path(self.tmp.name)/'old.sqlite';con=sqlite3.connect(old)
        con.executescript("CREATE TABLE accounts(id INTEGER PRIMARY KEY,username TEXT UNIQUE NOT NULL,password_hash TEXT NOT NULL,role TEXT CHECK(role IN ('teacher','learner'))); INSERT INTO accounts VALUES(77,'old','hash','learner');")
        con.close()
        with patch.dict(os.environ,{'STEMMATE_ACCOUNTS_DB':str(old)}):
            with accounts.db() as c:
                self.assertEqual(c.execute('SELECT username FROM accounts WHERE id=77').fetchone()[0],'old')
                c.execute("INSERT INTO accounts VALUES(78,'guardian','hash','guardian')")
                self.assertEqual(c.execute('PRAGMA foreign_key_check').fetchall(),[])

if __name__=='__main__':unittest.main()
