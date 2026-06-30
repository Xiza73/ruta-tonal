---
name: delivery-handoff
description: >
  End-of-task delivery ritual: plan commit count up front, make changes live on the working branch,
  stage, propose commit message (+ PR body with test cases on the final commit), WAIT for the user's OK,
  then commit (+ PR + merge to the integration branch). Single-commit and multi-commit variants.
  Trigger: When finishing a task that produces changes and you are about to commit / hand off for review.
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## When to Use

- You are wrapping up a task that touched code and need to deliver it
- You need to decide and execute the commit/PR/merge handoff

This skill is the **procedure**. It relies on `git-flow` for the rules (branch
targets, message limits, pre-commit checks) and `github-pr` for the `gh` syntax.

## Critical Patterns

### Step 0 — Plan the commit count up front

As part of the work plan, decide whether the task needs **one** commit or
**N** commits. This choice picks the variant below. State it before starting.

### Always — changes are LIVE on the working branch

Make changes directly on the branch we're working on. **No worktree, no detour.**
The user reviews the code and runs local tests against these live changes.

### STOP and wait for the OK — but only once

After presenting a proposal, **STOP**. Do not commit, PR, or merge until the
user explicitly approves. The user is reviewing/testing — approval is theirs.

**One OK authorizes the whole chain.** A single approval runs commit → PR →
merge end to end — do NOT re-prompt between the steps. Stop only if a step
**fails** (red gate, conflict, failed check): surface the error and wait.

### Variant A — single commit

When done:
1. Stage everything (`git add -A`).
2. Present, then stop:
   - **Commit message** — proposal, as short as possible (see `git-flow` limits).
   - **PR body** — summary, **test cases**, and any other relevant data.
3. On OK → run pre-commit gate, then **commit + PR + merge to the integration branch** (dev) in one go.

### Variant B — multiple commits

For the first **n−1** commits, each:
1. Stage that commit's changes.
2. Present only the **commit message** proposal, then stop.
3. On OK → pre-commit gate → commit. Repeat for the next.

For the **last** commit → do exactly **Variant A** (message + PR body with test
cases, wait OK, then commit + PR + merge to dev).

## Decision

| Task plan | Per intermediate commit | Final commit |
|-----------|------------------------|--------------|
| 1 commit  | — | message + PR body → OK → commit + PR + merge |
| N commits | message → OK → commit | message + PR body → OK → commit + PR + merge |

## Commands

```bash
git add -A                 # stage live changes on the working branch
git status                 # confirm what's staged before proposing
# on OK (see git-flow for pre-commit gate, github-pr for gh pr create/merge):
git commit -m "type(scope): subject"
gh pr create --base dev --title "type(scope): subject" --body "<body>"
gh pr merge --squash
```

## Resources

- **Sibling skills**: `git-flow` (policy), `github-pr` (gh syntax)
