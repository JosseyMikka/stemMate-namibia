"""Offline operator tool: verify a relationship only after the approved evidence process."""
import argparse
import time
from modules import accounts,family
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('link_id',type=int)
p.add_argument('--reference',required=True,help='Non-identifying reference to the separate verification record; do not enter identity documents.')
a=p.parse_args()
if not 1<=len(a.reference)<=120:p.error('Reference must contain 1 to 120 characters.')
with accounts.db() as c:
    family.init(c)
    if not c.execute('SELECT 1 FROM family_links WHERE id=?',(a.link_id,)).fetchone():p.error('Link not found.')
    c.execute('UPDATE family_links SET verified=1 WHERE id=?',(a.link_id,))
    c.execute('INSERT OR REPLACE INTO family_verifications VALUES(?,?,?)',(a.link_id,a.reference,time.time()))
print('Relationship verified. Learner confirmation is still required for access.')
