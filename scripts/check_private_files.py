"""CI guard: reject tracked runtime data; filenames only, never read file contents."""
import subprocess
from pathlib import PurePosixPath
paths=subprocess.check_output(['git','ls-files','-z']).decode().split('\0')
forbidden=[]
for path in filter(None,paths):
    p=PurePosixPath(path)
    if p.name=='.env' or p.suffix in ('.db','.sqlite3','.sqlite','.bin','.pickle') or path.startswith(('server/chroma_store/','server/private/','server/uploaded_pdfs/')):
        forbidden.append(path)
if forbidden:
    raise SystemExit('Private runtime files must not be tracked:\n'+'\n'.join(forbidden))
print('Tracked runtime data guard passed.')
