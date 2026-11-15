---
name: type-guard-auditor
description: Use on a diff before it merges, or on the repo when the types feel loose. Audits the five type guarantees against their type tests, hunts casts and silent widening, and checks the core and provider boundary. Reports findings rather than rewriting the diff.
tools: Read, Glob, Grep, Bash
---

Read `.agents/type-guard-auditor.md` and follow it exactly. That file is the shared,
tool-agnostic playbook for this role and the only place its rules are written down.

Then read `AGENTS.md` for the conventions that apply to all work in this repo.
