import json
import sys
import unittest
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'server'))
from modules import teacher_planning as planning

class PlanningTests(unittest.TestCase):
    def test_payload_excludes_class_and_identity_and_separates_answers(self):
        value=planning.Preparation(class_id=99,mode='adapt',topic='Algebra',objective='Explain balance',content='Original activity',consent=True)
        classroom={'name':'DO_NOT_SEND_CLASS_NAME','join_code':'DO_NOT_SEND_CODE','grade':11,'exam_year':2027,'course':{'id':'ca-igcse','subject':'mathematics'}}
        result={'learner_draft':'Predict a step.','teacher_guide':'Answer: subtract.','review_notes':'Check alignment.'}
        with patch.object(planning,'model_reply',return_value=json.dumps({**result,'context_status':'fits_subject'})) as reply:
            self.assertEqual(planning.generate(value,classroom),result)
            payload=json.loads(reply.call_args.args[0]);self.assertNotIn('class_id',payload);self.assertNotIn('consent',payload)
            self.assertNotIn('DO_NOT_SEND',repr(reply.call_args))
            self.assertIn('no answer key',reply.call_args.args[2])
            self.assertEqual(reply.call_args.args[3]['grade'],11)
            self.assertIsNone(reply.call_args.args[4])

    def test_invalid_generated_drafts_rejected(self):
        valid={'learner_draft':'Activity','teacher_guide':'Guide','review_notes':'Review'}
        for key in valid:
            with self.subTest(key=key),self.assertRaises(ValueError):planning.Draft.model_validate({**valid,key:'  '})
        with self.assertRaises(ValueError):planning.Draft.model_validate({**valid,'extra':'Unexpected'})
        with self.assertRaises(ValueError):planning.Draft.model_validate({**valid,'learner_draft':'x'*14001})

    def test_all_modes_include_no_print_and_safeguards(self):
        result=json.dumps({'context_status':'fits_subject','learner_draft':'Activity','teacher_guide':'Guide','review_notes':'Review'})
        for mode in planning.TASKS:
            value=planning.Preparation(class_id=1,mode=mode,topic='Cells',objective='Explain structure',content='Supplied notes',consent=True)
            with patch.object(planning,'model_reply',return_value=result) as reply:
                planning.generate(value,{'grade':12,'exam_year':2027,'course':{'subject':'biology'}})
                prompt=reply.call_args.args[2]
                for phrase in ('untrusted','no-print','not verified alignment','teacher judgement','hazardous'):self.assertIn(phrase,prompt)

    def test_subject_mismatch_and_missing_check_cannot_become_a_draft(self):
        value=planning.Preparation(mode='lesson',topic='FOR loops',objective='Trace program execution',consent=True)
        classroom={'grade':10,'exam_year':2027,'course':{'subject':'mathematics'}}
        response={'context_status':'needs_clarification','learner_draft':'','teacher_guide':'','review_notes':''}
        with patch.object(planning,'model_reply',return_value=json.dumps(response)):
            with self.assertRaises(planning.ContextMismatch):planning.generate(value,classroom)
        response.pop('context_status')
        with patch.object(planning,'model_reply',return_value=json.dumps(response)):
            with self.assertRaises(ValueError):planning.generate(value,classroom)

    def test_provider_allowance_is_reported_without_private_payload(self):
        class LimitError(Exception):status_code=429
        value=planning.Preparation(mode='lesson',topic='Cells',objective='Describe cells',consent=True)
        with patch.object(planning,'model_reply',side_effect=LimitError('PRIVATE_PROVIDER_PAYLOAD')):
            with self.assertRaises(planning.ProviderLimit) as result:planning.generate(value,{'grade':10,'exam_year':2027,'course':{'subject':'biology'}})
            self.assertNotIn('PRIVATE_PROVIDER_PAYLOAD',str(result.exception))
