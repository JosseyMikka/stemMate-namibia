"""Local administrator operations. Run on the private host, never as a web endpoint."""
import argparse
import getpass
import os
import sqlite3
from pathlib import Path
from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parent/'.env',override=False)
from modules import accounts


def account_summary(username):
    with accounts.db() as db:
        row=db.execute('SELECT id,role FROM accounts WHERE username=?',(username.lower(),)).fetchone()
        if not row:
            raise ValueError('Account not found.')
        submissions=db.execute('SELECT COUNT(*) FROM project_submissions WHERE learner_id=?',(row['id'],)).fetchone()[0]
        return {'role':row['role'],'submissions':submissions}


def reset_password(username,password):
    if not 12<=len(password)<=128:
        raise ValueError('Use a password of 12–128 characters.')
    with accounts.db() as db:
        row=db.execute('SELECT id FROM accounts WHERE username=?',(username.lower(),)).fetchone()
        if not row:raise ValueError('Account not found.')
        db.execute('UPDATE accounts SET password_hash=? WHERE id=?',(accounts.password_hash(password),row['id']))
        db.execute('DELETE FROM auth_sessions WHERE user_id=?',(row['id'],))


def delete_learner(username):
    with accounts.db() as db:
        row=db.execute('SELECT id,role FROM accounts WHERE username=?',(username.lower(),)).fetchone()
        if not row or row['role']!='learner':
            raise ValueError('Only a learner account can be removed here. Teacher classes require a separate retention/ownership review.')
        for table,column in [('project_submissions','learner_id'),('enrolments','learner_id'),('auth_sessions','user_id')]:
            db.execute(f'DELETE FROM {table} WHERE {column}=?',(row['id'],))
        db.execute('DELETE FROM accounts WHERE id=?',(row['id'],))


def backup(destination):
    target=Path(destination).resolve()
    if target.suffix!='.sqlite3':raise ValueError('Use a private .sqlite3 backup path.')
    if target.exists():raise ValueError('Backup destination already exists.')
    target.parent.mkdir(parents=True,exist_ok=True,mode=0o700)
    fd=os.open(target,os.O_CREAT|os.O_EXCL|os.O_WRONLY,0o600)
    os.close(fd)
    with accounts.db() as source:
        with sqlite3.connect(target) as dest:source.backup(dest)


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('operation',choices=['inspect','reset-password','delete-learner','backup'])
    parser.add_argument('target',help='Alias, or private backup destination')
    parser.add_argument('--apply',action='store_true',help='Enable mutation; otherwise show a dry run')
    args=parser.parse_args()
    if args.operation=='backup':
        if not args.apply:print('Dry run: create a private database backup. No data copied.');return
        backup(args.target);print('Private backup created. Protect it with the same retention and access rules.');return
    print(account_summary(args.target))
    if args.operation=='inspect' or not args.apply:
        print('Dry run: no account changes.');return
    if input('Type the exact alias to confirm this local operation: ')!=args.target:
        raise ValueError('Confirmation did not match.')
    if args.operation=='reset-password':
        password=getpass.getpass('New password (not displayed): ')
        if password!=getpass.getpass('Repeat new password: '):raise ValueError('Passwords did not match.')
        reset_password(args.target,password)
    else:delete_learner(args.target)
    print('Operation complete. Existing account sign-ins have been revoked.')

if __name__=='__main__':main()
