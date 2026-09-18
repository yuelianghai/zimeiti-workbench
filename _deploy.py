import subprocess, os, sys, time

GIT = r'C:/Users/mi/.workbuddy/binaries/PortableGit/versions/1.2.0/mingw64/bin/git.exe'
REPO = r'D:/WorkBuddy存储/内容创作/自媒体工作台'
TOKEN_PATH = os.path.join(REPO, '.workbuddy', 'secrets', 'ghtoken')
REMOTE = 'https://github.com/yuelianghai/zimeiti-workbench.git'

with open(TOKEN_PATH, 'r', encoding='utf-8') as f:
    token = f.read().strip()

push_url = f'https://x-access-token:{token}@{REMOTE.split("https://",1)[1]}'

env = dict(os.environ)
env['GIT_TERMINAL_PROMPT'] = '0'
git_bin = os.path.dirname(GIT)
env['PATH'] = git_bin + os.pathsep + env.get('PATH', '')

def run(args, check=True):
    print('$ git', ' '.join(args))
    r = subprocess.run([GIT] + args, cwd=REPO, env=env,
                       capture_output=True, text=True, encoding='utf-8')
    out = (r.stdout or '') + (r.stderr or '')
    print(out[-1500:] if out else '(no output)')
    if check and r.returncode != 0:
        raise RuntimeError(f'git {" ".join(args)} failed rc={r.returncode}')
    return r

# 1. add
run(['add', '-A'])

# 2. commit (allow nothing-to-commit)
cr = subprocess.run([GIT, 'commit', '-q', '-m', f'daily update {time.strftime("%Y-%m-%d")}'],
                   cwd=REPO, env=env, capture_output=True, text=True, encoding='utf-8')
print('commit rc=', cr.returncode, (cr.stdout or cr.stderr)[-500:])

# 3. push with retry (force to overwrite any drift)
ok = False
for i in range(1, 4):
    print(f'--- push attempt {i} ---')
    pr = subprocess.run([GIT, 'push', '--force', push_url, 'master'],
                        cwd=REPO, env=env, capture_output=True, text=True, encoding='utf-8')
    msg = (pr.stdout or '') + (pr.stderr or '')
    print(msg[-1500:])
    if pr.returncode == 0:
        ok = True
        break
    print(f'attempt {i} failed, sleep 5')
    time.sleep(5)

print('PUSH_OK' if ok else 'PUSH_FAILED')
sys.exit(0 if ok else 1)
