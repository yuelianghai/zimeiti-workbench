# -*- coding: utf-8 -*-
import subprocess, os, time

REPO = r"D:\WorkBuddy存储\内容创作\自媒体工作台"
GITBIN = r"C:\Users\mi\.workbuddy\binaries\PortableGit\versions\1.2.0\bin"
GIT = os.path.join(GITBIN, "git.exe")
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
    print((r.stdout + r.stderr)[-700:])
    if r.returncode == 0:
        print("=== PUSH OK ===")
        break
    time.sleep(5)
