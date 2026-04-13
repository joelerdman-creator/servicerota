---
description: A workflow to batch generate square user profile avatars organized by church style.
---

# Generate Avatars Workflow

**Trigger:** The user issues the command `/generate-avatars style="[liturgical|modern]"` (or both)

**Execution Steps:**

1. **Load Prompts**:
   - Parse `.antigravity/skills/avatar-generation/prompt-registry.json` to extract the `master_style_anchor`.
   - Identify which set of roles to generate based on the user's input (`liturgical_roles`, `modern_roles`, or both).

2. **Generate Images Parallelly**:
   - Loop through the requested roles dictionary.
   - For each role, trigger the image generation tool twice simultaneously:
     - Male Prompt: `[Male Role Descriptor], [Master Style Anchor]`
     - Female Prompt: `[Female Role Descriptor], [Master Style Anchor]`
   - Be aware of the quota limit (e.g. usually generates ~15-20 images before pausing). Execute in batches if necessary.

3. **Upload to Firebase (Auto-run)**:
// turbo-all
   - Once images are generated, run the custom avatar upload script:
     ```bash
     npx tsx --env-file=.env.local .antigravity/skills/avatar-generation/avatar-upload.ts "<absolute_path_to_png>" "<role_name>" "<gender>"
     ```

4. **Verify & Display**:
   - Render the Walkthrough markdown artifact displaying the local file URLs so the user can easily view the new avatars right in the IDE.
   - Wait for their approval or feedback.
