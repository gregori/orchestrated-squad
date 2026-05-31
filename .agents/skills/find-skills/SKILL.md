---
name: find-skills
description: Helps users discover and install agent skills when they ask questions like "how do I do X", "find a skill for X", "is there a skill that can...", or express interest in extending capabilities. This skill should be used when the user is looking for functionality that might exist as an installable skill.
---

# Find Skills

This skill helps you discover and install skills from the open agent skills ecosystem.

## When to Use

Use this when starting a new task to discover relevant skills for the domain.

## Commands

- `npx skills find [query]` — Search for skills
- `npx skills add <package>` — Install a skill
- Browse skills at: https://skills.sh/

## How to Use

1. Identify the domain (Python, React, Terraform, etc.)
2. Run `npx skills find <domain>` to discover relevant skills
3. Verify quality (install count, source reputation)
4. Present options to the user or install with `npx skills add <package> -g -y`
