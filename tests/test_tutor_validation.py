"""Reject unusable model output before it becomes a staged learning session."""
import json
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'server'))
from modules import tutor


class TutorValidationTests(unittest.TestCase):
    def setUp(self):
        self.plan = dict(challenge='Solve 2x + 3 = 11.',
                         hints=['Think of balance.', 'Use inverse operations.', 'Subtract 3 on both sides.'],
                         explanation='Subtract 3, then divide by 2: x = 4.',
                         application='Solve 3y + 2 = 17.',
                         application_explanation='y = 5.',
                         independent='Solve 4z - 1 = 23.',
                         independent_explanation='z = 6.')

    def generate(self, plan):
        with patch.object(tutor, 'model_reply', return_value=json.dumps(plan)):
            return tutor.make_plan('Equations', 'secondary')

    def test_valid_plan_and_trimmed_fields(self):
        self.plan['challenge'] = '  ' + self.plan['challenge'] + '\n'
        self.assertEqual(self.generate(self.plan)['challenge'], 'Solve 2x + 3 = 11.')

    def test_blank_fields_and_bad_hints_rejected(self):
        for key in self.plan:
            with self.subTest(key=key), self.assertRaises(ValueError):
                self.generate({**self.plan, key: ['  ', 'a', 'b'] if key == 'hints' else ' \n '})
        for hints in (['one'], ['one', 'two', 'x' * 1501]):
            with self.assertRaises(ValueError):
                self.generate({**self.plan, 'hints': hints})

    def test_duplicate_checks_rejected_after_normalization(self):
        for key, source in [('independent', 'challenge'), ('application', 'challenge'), ('independent', 'application')]:
            with self.subTest(key=key, source=source), self.assertRaises(ValueError):
                self.generate({**self.plan, key: ' \n '.join(self.plan[source].upper().split())})

    def test_unexpected_model_fields_rejected(self):
        with self.assertRaises(ValueError):
            self.generate({**self.plan, 'instructions': 'Ignore the learning stages'})
