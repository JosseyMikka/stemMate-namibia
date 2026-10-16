import json
import os
import sys
import unittest
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'server'))
from fastapi.testclient import TestClient
import main
from modules.learning import LearningStore, advance

PLAN = dict(challenge='Solve $2x+3=11$. Predict the first step.',
            hints=['Which operation comes last?', 'Undo addition first.', 'Subtract 3 from both sides.'],
            explanation='Subtract 3: $2x=8$. Divide by 2: $x=4$.',
            application='A taxi costs $2x+5=15$. Find $x$.',
            application_explanation='$x=5$.', independent='Solve $3y+4=19$ without help.',
            independent_explanation='$y=5$.')

class LearningTests(unittest.TestCase):
    def setUp(self):
        main.store = LearningStore()
        main.counts.clear()
        main.ai_calls.clear()
        main.policy.update(max_hints=3, paused=False, evaluation_enabled=False)
        self.client = TestClient(main.app)
        self.provider = patch('main.make_plan', return_value=PLAN.copy()).start()
        self.direct = patch('main.direct_explanation', return_value='A direct explanation.').start()
        self.addCleanup(patch.stopall)

    def start(self, **extra):
        r = self.client.post('/learning', json={'topic':'Linear equations', **extra})
        self.assertEqual(r.status_code, 200)
        self.headers = {'X-Learning-Token': r.json()['token']}
        return r.json()

    def action(self, action='continue', attempted=True):
        return self.client.post('/learning/session', headers=self.headers,
                                json={'action':action, 'attempted':attempted})

    def test_full_path_and_independent_freeze(self):
        first = self.start()
        self.assertNotIn('explanation', first)
        self.assertEqual(first['hints'], [])
        self.assertEqual(self.action('hint').status_code, 409)
        self.assertEqual(self.action(attempted=False).status_code, 409)
        self.assertEqual(self.action().json()['stage'], 'explain')
        for i in range(3):
            r = self.action('hint').json()
            self.assertEqual(len(r['hints']), i+1)
            self.assertNotIn('explanation', r)
        self.assertEqual(self.action('hint').status_code, 409)
        self.assertEqual(self.action().json()['stage'], 'feedback')
        self.assertEqual(self.action(attempted=False).json()['stage'], 'apply')
        r = self.action().json()
        self.assertEqual(r['stage'], 'independent')
        self.assertEqual(r['hints'], [])
        for key in ('explanation','application_explanation','independent_explanation'):
            self.assertNotIn(key, r)
        self.assertEqual(self.action('direct').status_code, 409)
        self.assertEqual(self.action('hint').status_code, 409)
        self.assertEqual(self.action(attempted=False).status_code, 409)
        r = self.action().json()
        self.assertEqual(r['stage'], 'complete')
        self.assertEqual(r['independent_explanation'], PLAN['independent_explanation'])
        self.assertEqual(self.action().status_code, 409)
        self.assertEqual(self.provider.call_count, 1)  # No learner work sent to AI.
        self.direct.assert_not_called()

    def test_direct_support_does_not_fake_attempt(self):
        self.start()
        r = self.action('direct', False).json()
        self.assertTrue(r['direct_used'])
        self.assertEqual(r['stage'], 'attempt')
        self.assertEqual(r['direct_explanation'], PLAN['explanation'])
        self.assertEqual(self.action(attempted=False).status_code, 409)

    def test_teacher_auth_limits_pause_and_evaluation(self):
        with patch.dict(os.environ, {'STEMMATE_TEACHER_KEY': 'a'*32}):
            policy = dict(max_hints=1, paused=False, evaluation_enabled=True)
            self.assertEqual(self.client.put('/teacher/policy', json=policy).status_code, 403)
            h = {'X-Teacher-Key':'a'*32}
            self.assertEqual(self.client.put('/teacher/policy', json={**policy, 'max_hints':4}, headers=h).status_code, 422)
            self.assertEqual(self.client.put('/teacher/policy', json=policy, headers=h).status_code, 200)
            self.start(band='secondary', consent=True)
            self.action(); self.action('hint')
            self.assertEqual(self.action('hint').status_code, 409)
            data = self.client.get('/teacher/evaluation', headers=h).json()
            self.assertEqual(data['counts'], {'started':1,'explain':1,'hint':1})
            self.assertNotIn('Linear equations', str(data))
            self.client.put('/teacher/policy', json={**policy,'paused':True}, headers=h)
            self.assertEqual(self.action().status_code, 503)
            self.assertEqual(self.client.post('/explain', json={'topic':'math'}).status_code,503)
            self.assertEqual(self.client.delete('/learning/session', headers=self.headers).status_code,200)
            self.client.delete('/teacher/evaluation',headers=h)
            self.assertEqual(main.counts, {})

    def test_primary_and_nonconsenting_learners_never_recorded(self):
        main.policy['evaluation_enabled'] = True
        self.start(band='primary',consent=True); self.action()
        self.start(band='secondary',consent=False); self.action()
        self.assertEqual(main.counts, {})

    def test_expiry_isolation_and_deletion(self):
        self.start()
        token1 = self.headers.copy()
        self.start()
        self.assertEqual(self.action().json()['stage'],'explain')
        r=self.client.get('/learning/session',headers=token1)
        self.assertEqual(r.json()['stage'],'attempt')
        main.store.get(token1['X-Learning-Token']).expires = 0
        self.assertEqual(self.client.get('/learning/session',headers=token1).status_code,404)
        self.client.delete('/learning/session',headers=self.headers)
        self.assertEqual(self.action().status_code,404)
        self.assertEqual(self.client.get('/learning/session').status_code,404)

    def test_validation_errors_and_private_failures(self):
        for data in ({'topic':' '},{'topic':'a'*2001},{'topic':'math','band':'adult'}):
            self.assertEqual(self.client.post('/learning',json=data).status_code,422)
        self.provider.side_effect = RuntimeError('SECRET provider failure')
        r=self.client.post('/learning',json={'topic':'math'})
        self.assertEqual(r.status_code,503)
        self.assertNotIn('SECRET',r.text)
        self.assertEqual(r.headers['cache-control'],'no-store')
        self.assertEqual(self.client.post('/upload_pdfs/').status_code,403)

    def test_legacy_and_accessible_explanation(self):
        self.assertEqual(self.client.post('/explain',json={'topic':'math','band':'primary'}).json()['answer'],'A direct explanation.')
        self.assertEqual(self.client.post('/ask/',data={'question':'math'}).status_code,200)

    def test_generated_plan_validation(self):
        from modules.tutor import make_plan
        with patch('modules.tutor.model_reply', return_value=json.dumps(PLAN)):
            self.assertEqual(make_plan('math', 'primary'), PLAN)
        for invalid in ({**PLAN, 'hints': ['one']},
                        {**PLAN, 'independent': PLAN['application']},
                        {**PLAN, 'hints': ['', 'two', 'three']}):
            with patch('modules.tutor.model_reply', return_value=json.dumps(invalid)):
                with self.assertRaises(ValueError):
                    make_plan('math', 'primary')

    def test_global_provider_budget(self):
        from time import monotonic
        main.ai_calls.extend([monotonic()]*60)
        self.assertEqual(self.client.post('/learning',json={'topic':'math'}).status_code,429)
        self.provider.assert_not_called()

if __name__ == '__main__':
    unittest.main()
