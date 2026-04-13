---
description: Avatar generation tools for producing fun cartoon-style 1:1 profile pictures for user roles.
---

# Avatar Generation Skill

This skill provides assets, configurations, and scripts for generating and managing square (1:1) cartoon avatar graphics for the SaaS application (ServiceRota/ParishScribe).

## When to use this skill
Auto-load or use this skill whenever:
- User invokes `/generate-avatars`
- You are executing tasks involving generating user profile pictures or avatar placeholders for roles.

## Key Files
- `prompt-registry.json`: The prompt mappings for our standard roles, ensuring a unified fun modern cartoon style.
- `avatar-upload.ts`: A TypeScript execution script to upload generated image buffers directly into the `avatars/` path in Firebase.
- `../../workflows/generate-avatars.md`: The standard operating procedure for generating avatars.
