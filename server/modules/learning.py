"""Server-owned learning stages. No learner prose is retained between requests."""
from dataclasses import dataclass, field
from time import monotonic
from secrets import token_urlsafe
from threading import RLock

STAGES = ('attempt', 'explain', 'feedback', 'apply', 'independent', 'complete')


@dataclass
class Session:
    plan: dict
    band: str
    consent: bool
    stage: str = 'attempt'
    hints: int = 0
    direct_used: bool = False
    expires: float = field(default_factory=lambda: monotonic() + 3600)


class LearningStore:
    def __init__(self):
        self.sessions = {}
        self.lock = RLock()

    def purge(self):
        now = monotonic()
        self.sessions = {k: v for k, v in self.sessions.items() if v.expires > now}

    def create(self, plan, band, consent):
        self.purge()
        if len(self.sessions) >= 500:
            raise ValueError('Learning sessions are busy. Please try later.')
        token = token_urlsafe(32)
        self.sessions[token] = Session(plan, band, consent)
        return token

    def get(self, token):
        self.purge()
        if token not in self.sessions:
            raise KeyError('Session expired. Start a new learning session.')
        return self.sessions[token]


def visible(s, max_hints=3):
    """Only release material appropriate to the authoritative server stage."""
    result = {'stage': s.stage, 'hints_used': s.hints,
              'max_hints': max_hints, 'direct_used': s.direct_used,
              'challenge': s.plan['challenge'] if s.stage != 'independent' else '',
              'hints': s.plan['hints'][:s.hints] if s.stage != 'independent' else []}
    if s.stage in ('feedback', 'apply', 'complete'):
        result['explanation'] = s.plan['explanation']
    if s.stage in ('apply', 'complete'):
        result['application'] = s.plan['application']
    if s.stage in ('independent', 'complete'):
        result['independent'] = s.plan['independent']
    if s.stage == 'complete':
        result['application_explanation'] = s.plan['application_explanation']
        result['independent_explanation'] = s.plan['independent_explanation']
    return result


def advance(s, action, attempted, max_hints):
    if action == 'hint':
        if s.stage != 'explain' or s.hints >= max_hints:
            raise ValueError('Hints are only available after an attempt, up to the teacher limit.')
        s.hints += 1
        return
    if action == 'direct':
        if s.stage in ('independent', 'complete'):
            raise ValueError('Finish the independent check before viewing more help.')
        s.direct_used = True
        # Preserve the reasoning path; direct help does not count as an attempt.
        return
    if action != 'continue':
        raise ValueError('Unknown learning action.')
    if s.stage == 'complete':
        raise ValueError('This session is complete.')
    if s.stage != 'feedback' and not attempted:
        raise ValueError('Share your thinking first. A short attempt or “I am stuck” is enough.')
    s.stage = STAGES[STAGES.index(s.stage) + 1]
