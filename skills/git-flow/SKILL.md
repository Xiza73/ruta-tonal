---
name: git-flow
description: >
  Git branching policy and commit conventions for a repo: integration branch (dev) as default,
  master only via PR from dev, branch naming, commit message limits, pre-commit checks, release tagging.
  Trigger: When creating branches, committing, opening PRs, or cutting a release in a repo that uses this flow.
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## When to Use

- Creating a working branch at the start of a task
- Writing a commit message (format + length)
- Deciding where a PR targets
- Cutting a release to `master`

This skill is the **policy** layer. For the `gh` syntax use `github-pr`. For the
end-of-task delivery ritual (stage → propose → wait OK → execute) use `delivery-handoff`.

## Critical Patterns

### Branch targets — never PR straight to master

| From | To | When |
|------|----|----|
| `feat/*`, `fix/*`, `chore/*`, … | `dev` (integration, the git default branch) | every task |
| `dev` | `master` | only when accumulated PRs complete a release |

- The **default branch in git is the integration branch, NOT `master`** — `dev` in
  most projects (configurable per project; confirm if unsure).
- `master` receives PRs **exclusively from `dev`**. Never target `master` from a feature branch.

### Merge strategy — always a merge commit (`--no-ff`)

| Merge | Strategy | Why |
|-------|----------|-----|
| `feat/*` → `dev` | merge commit (`--no-ff`) | preserves the intentional commits from `delivery-handoff` variant B; squash would collapse them |
| `dev` → `master` | merge commit (`--no-ff`), then tag | classic gitflow; keeps release lineage |

- **Never squash** — it destroys the planned commit granularity. **Never rebase** onto
  the target — it loses the feature grouping and rewrites history.
- Delete the feature branch on merge.

```bash
gh pr merge <n> --merge --delete-branch   # --merge = no-ff merge commit
```

### Branch naming — conventional prefix

```
feat/<slug>     fix/<slug>     chore/<slug>
docs/<slug>     refactor/<slug>  test/<slug>
```

### Commit messages — short, conventional, bounded

```
<type>(<scope>): <subject>
```

- Subject ≤ **50 chars** ideal, **72 hard cap**. Reject longer — rewrite shorter.
- Imperative mood, lowercase, no trailing period.
- Body only if it adds real context; wrap at 72.

### Pre-commit gate — run checks before committing

Before every commit, run the project's lint + tests (and any other relevant
checks) **if they exist and are runnable**. Don't commit on a red gate; surface
the failure instead. Skip silently only when the project has no such scripts.

### Release — merge dev → master, tag semver

When PRs on `dev` complete a release: PR `dev` → `master`, merge, then tag.

```bash
git tag -a v1.4.0 -m "release: v1.4.0"
git push origin v1.4.0
```

## Commands

```bash
git checkout -b feat/<slug> dev      # branch off the integration branch
git push -u origin feat/<slug>       # PR target = dev (see github-pr for gh syntax)
git checkout master && git merge --no-ff dev   # release merge
git tag -a v<X.Y.Z> -m "release: v<X.Y.Z>" && git push origin v<X.Y.Z>
```

## Resources

- **Sibling skills**: `github-pr` (gh syntax), `delivery-handoff` (delivery ritual)
- [Conventional Commits](https://www.conventionalcommits.org/) · [SemVer](https://semver.org/)
