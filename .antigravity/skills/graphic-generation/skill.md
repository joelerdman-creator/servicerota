---
description: Graphic generation tools and configurations for producing visually appealing assets for the platform, ensuring cohesive style across the app.
---

# Graphic Generation Skill

This skill provides assets, configurations, and scripts for generating and managing images/graphics for the SaaS application (ServiceRota/ParishScribe).

## When to use this skill
Auto-load or use this skill whenever:
- User invokes `/generate-graphics`
- You are executing tasks involving generating, producing, or updating marketing imagery, volunteer role iconography, or UI feature graphics.
- A user asks to upload or manage graphical assets to Firebase Storage for the application.

## Key Files
- `prompt-registry.json`: The prompt mappings for denominations (as defined in the app) and roles (as defined in `src/lib/DenominationRoles.ts`).
- `firebase-upload.ts`: A TypeScript execution script to upload generated image buffers directly into the Firebase project.
- `../rules/graphic-standards.md`: The rule dictating style restrictions (MUST ALWAYS be followed when generating).
- `../workflows/generate-graphics.md`: The standard operating procedure for generating graphics.

## Best Practices
- Always check `src/lib/DenominationRoles.ts` and `src/app/dashboard/admin/settings/page.tsx` for the current truth of denominations and roles.
- Use `npx tsx` when executing the `firebase-upload.ts` script to properly hook into the system's TypeScript-based Firebase Admin setup.
