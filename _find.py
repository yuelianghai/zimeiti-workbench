# -*- coding: utf-8 -*-
import subprocess, os, time, glob

REPO = r"D:\WorkBuddy存储\内容创作\自媒体工作台"

# 定位 git.exe
candidates = []
for base in [r"C:\Users\mi\.workbuddy\binaries", r"C:\Program Files", r"C:\Program Files (x86)", r"C:\Users\mi"]:
    candidates += glob.glob(os.path.join(base, "**", "git.exe"), recursive=True)
candidates = [c for c in candidates if "bin" in c.lower() or "cmd" in c.lower()][:10]
print("git candidates:")
for c in candidates:
    print("  ", c)

GIT = candidates[0] if candidates else None
if not GIT:
    print("NO GIT FOUND")
    raise SystemExit(1)
print("using", GIT)

GITBIN = os.path.dirname(GIT)
TOKEN = open(os.path.join(REPO, ".workbuddy", "secrets", "ghtoken"), encoding="utf-8").read().strip()
URL = "https://x-access-token:%s@github.com/yuelianghai/zimeiti-workbench.git" % TOKEN
env = dict(os.environ)
env["PATH"] = GITBIN + os.pathsep + env.get("PATH", "")

def run(args):
    return subprocess.run([GIT, "-C", REPO] + args, capture_output=True, text=True, env=env)

print("add rc=", run(["add", "-A"]).returncode)
print("commit rc=", run(["commit", "-q", "-m", "daily update 2026-09-17 (AI优先选题)"]).returncode)
for i in range(3):
    r = run(["push", URL, "master", "--force"])
    print("push attempt", i + 1, "rc=", r.returncode)
    print((r.stdout + r.stderr)[-800:])
    if r.returncode == 0:
        print("=== PUSH OK ===")
        break
    time.sleep(5)
