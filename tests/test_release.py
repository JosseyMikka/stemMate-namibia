import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'server'))
from modules import release_config, tutor, accounts
import main
from fastapi import HTTPException
from fastapi.testclient import TestClient

class ReleaseTests(unittest.TestCase):
    def test_production_fails_closed(self):
        safe={'STEMMATE_ENV':'production','STEMMATE_ORIGINS':'https://school.example',
              'STEMMATE_ACCOUNTS_DB':'/var/data/accounts.sqlite3','STEMMATE_TEACHER_INVITE':'x'*32,'STEMMATE_SINGLE_WORKER_ACK':'1','STEMMATE_PROVIDER_REVIEWED':'1','GROQ_API_KEY':'fictional-test-key'}
        with patch.dict(os.environ,safe):
            release_config.validate()
            for key,value in [('STEMMATE_ORIGINS','*'),('STEMMATE_ORIGINS','http://school.example'),('STEMMATE_ORIGINS','https://school.example/path'),('STEMMATE_ACCOUNTS_DB','relative.db'),('STEMMATE_TEACHER_INVITE','short'),('STEMMATE_SINGLE_WORKER_ACK',''),('STEMMATE_PROVIDER_REVIEWED','')]:
                with self.subTest(key=key,value=value),patch.dict(os.environ,{key:value}):
                    with self.assertRaises(RuntimeError):release_config.validate()

    def test_no_implicit_legacy_index(self):
        with patch.dict(os.environ,{'STEMMATE_VECTORSTORE_DIR':''}),patch.dict(sys.modules,{'langchain_community.vectorstores':None}):
            self.assertEqual(tutor.reviewed_context('cells',{'id':'na-nssco'},'cells'),'')

    def test_private_validation_and_bounded_auth_body(self):
        client=TestClient(main.app)
        response=client.post('/auth/register',json={'username':'x','password':'PRIVATE_PASSWORD_DO_NOT_ECHO'})
        self.assertEqual(response.status_code,422)
        self.assertNotIn('PRIVATE_PASSWORD',response.text)
        self.assertEqual(response.headers['cache-control'],'no-store')
        self.assertEqual(response.headers['x-content-type-options'],'nosniff')
        response=client.post('/auth/register',content=b'x'*256001)
        self.assertEqual(response.status_code,413)

    def test_individual_and_global_ai_budget(self):
        main.ai_calls.clear();main.ai_user_calls.clear()
        self.addCleanup(main.ai_calls.clear);self.addCleanup(main.ai_user_calls.clear)
        with patch.dict(os.environ,{'STEMMATE_AI_USER_HOURLY_LIMIT':'1','STEMMATE_AI_HOURLY_LIMIT':'2'}):
            main.reserve_ai(1)
            with self.assertRaises(HTTPException) as error:main.reserve_ai(1)
            self.assertEqual(error.exception.status_code,429)
            self.assertIn('Retry-After',error.exception.headers)
            main.reserve_ai(2)
            with self.assertRaises(HTTPException):main.reserve_ai(3)
            self.assertEqual(len(main.ai_calls),2)
        with patch.dict(os.environ,{'STEMMATE_AI_HOURLY_LIMIT':'0'}):
            with self.assertRaises(RuntimeError):release_config.validate()

    def test_expired_auth_cleanup_keeps_live_session(self):
        with tempfile.TemporaryDirectory() as directory,patch.dict(os.environ,{'STEMMATE_ACCOUNTS_DB':str(Path(directory)/'private.sqlite3')}):
            with accounts.db() as db:
                db.execute("INSERT INTO accounts VALUES(1,'alias','test','learner')")
                db.execute("INSERT INTO auth_sessions VALUES('old',1,0)")
                db.execute("INSERT INTO auth_sessions VALUES('live',1,9999999999)")
            accounts.purge_expired_sessions()
            with accounts.db() as db:
                self.assertEqual([r[0] for r in db.execute('SELECT token_hash FROM auth_sessions')],['live'])

    def test_local_recovery_deletion_and_backup(self):
        import manage_private_data as admin
        with tempfile.TemporaryDirectory() as directory,patch.dict(os.environ,{'STEMMATE_ACCOUNTS_DB':str(Path(directory)/'private.sqlite3')}):
            with accounts.db() as db:
                db.execute("INSERT INTO accounts VALUES(1,'alias','old','learner')")
                db.execute("INSERT INTO accounts VALUES(2,'teacher','old','teacher')")
                db.execute("INSERT INTO auth_sessions VALUES('live',1,9999999999)")
                db.execute("INSERT INTO classes(id,teacher_id,name,grade,course_id,exam_year,join_expires) VALUES(1,2,'Test',10,'na-nssco',2027,0)")
                db.execute("INSERT INTO projects VALUES(1,1,'{}',1,0)")
                db.execute("INSERT INTO enrolments VALUES(1,1)")
                db.execute("INSERT INTO project_submissions(project_id,learner_id,version,body,updated,expires) VALUES(1,1,1,'{}',0,9999999999)")
            self.assertEqual(admin.account_summary('alias'),{'role':'learner','submissions':1})
            admin.reset_password('alias','a replacement private password')
            with accounts.db() as db:
                self.assertEqual(db.execute('SELECT COUNT(*) FROM auth_sessions').fetchone()[0],0)
                self.assertNotEqual(db.execute('SELECT password_hash FROM accounts WHERE id=1').fetchone()[0],'old')
            destination=Path(directory)/'backup.sqlite3'
            admin.backup(destination)
            self.assertEqual(destination.stat().st_mode&0o777,0o600)
            import sqlite3
            with sqlite3.connect(destination) as restored:
                self.assertEqual(restored.execute('PRAGMA integrity_check').fetchone()[0],'ok')
                self.assertEqual(restored.execute('SELECT COUNT(*) FROM project_submissions').fetchone()[0],1)
            with self.assertRaises(ValueError):admin.backup(destination)
            with self.assertRaises(ValueError):admin.delete_learner('teacher')
            admin.delete_learner('alias')
            with accounts.db() as db:
                self.assertEqual(db.execute('SELECT COUNT(*) FROM accounts').fetchone()[0],1)
                self.assertEqual(db.execute('SELECT COUNT(*) FROM project_submissions').fetchone()[0],0)
                self.assertEqual(db.execute('SELECT COUNT(*) FROM enrolments').fetchone()[0],0)
                self.assertEqual(db.execute('SELECT COUNT(*) FROM projects').fetchone()[0],1)

    def test_concurrent_reservations_obey_shared_budget(self):
        from concurrent.futures import ThreadPoolExecutor
        main.ai_calls.clear();main.ai_user_calls.clear()
        self.addCleanup(main.ai_calls.clear);self.addCleanup(main.ai_user_calls.clear)
        def reserve(number):
            try:main.reserve_ai(number);return True
            except HTTPException:return False
        with patch.dict(os.environ,{'STEMMATE_AI_HOURLY_LIMIT':'30','STEMMATE_AI_USER_HOURLY_LIMIT':'12'}):
            with ThreadPoolExecutor(max_workers=12) as pool:
                self.assertEqual(sum(pool.map(reserve,range(80))),30)
        self.assertEqual(len(main.ai_calls),30)

    def test_production_startup_rejects_bad_configuration(self):
        with patch.dict(os.environ,{'STEMMATE_ENV':'production','STEMMATE_ORIGINS':'*'}):
            with self.assertRaises(RuntimeError):
                with TestClient(main.app):pass
