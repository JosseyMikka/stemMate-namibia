"""Run on the trusted server, never expose this as a public reset endpoint."""
import argparse
import getpass
from modules.accounts import db, password_hash


def main():
    parser=argparse.ArgumentParser(description='Administrator-assisted account recovery')
    parser.add_argument('action',choices=['reset-password'])
    parser.add_argument('username',help='School-approved account alias')
    args=parser.parse_args()
    password=getpass.getpass('New password (12–128 characters): ')
    if not 12<=len(password)<=128:
        raise SystemExit('Password must contain 12–128 characters.')
    if password!=getpass.getpass('Repeat password: '):
        raise SystemExit('Passwords do not match.')
    with db() as connection:
        row=connection.execute('SELECT id FROM accounts WHERE username=?',(args.username.lower(),)).fetchone()
        if not row:raise SystemExit('Account not found.')
        connection.execute('UPDATE accounts SET password_hash=? WHERE id=?',(password_hash(password),row['id']))
        connection.execute('DELETE FROM auth_sessions WHERE user_id=?',(row['id'],))
    print('Password reset and all account sign-ins revoked.')

if __name__=='__main__':main()
