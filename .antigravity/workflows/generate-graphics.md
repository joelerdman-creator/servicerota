---
description: A workflow to orchestrate the generation and storage of app graphics using internal rules and schemas.
---

# Generate Graphics Workflow

**Trigger:** The user issues the slash command `/generate-graphics role="[role]" denomination="[denomination]"`
**Or:** `/generate-graphics type="hero" denomination="[denomination]"`
*(Note: Passing `denomination="all"` triggers a batch run across all denominations)*

**Execution Steps:**

1. **Verify Inputs**: 
   - Check if the provided `denomination` string matches any in `src/app/dashboard/admin/settings/page.tsx` or `src/lib/DenominationRoles.ts`.
   - If generating for a role, check if the `role` aligns with any defaults for that denomination or is a valid custom role.
   - If generating a hero image (`type="hero"`), no role validation is needed.

2. **Load Mapping & Standards**:
   - Read `.antigravity/rules/graphic-standards.md` to get the Master Style Anchor.
   - Read `.antigravity/skills/graphic-generation/prompt-registry.json`.

3. **Construct the Prompt**:
   - Extract the cluster environment prompt.
   - **If generating a role**: Match the provided `role` to a fragment in `roles` (or a loosely matching synonym, or `General_Default` if completely unmatched).
   - **If generating a hero**: Extract a fragment from `flyer_heroes` in the registry (using `default` or choosing one that matches the requested vibe).
   - Combine into a single prompt string: `[Subject Fragment], set in a [Cluster Fragment], [Master Style Anchor]`

4. **Batch Mode vs Single Mode**:
   - **Single Mode**: If a specific denomination is given, match it to a single cluster from `denomination_mapping` and construct ONE prompt string. Generate **5 variants**, then upload them for that specific denomination.
   - **Batch Mode** (`denomination="all"`): Iterate through all 6 distinct clusters (`Liturgical`, `Mainline`, `Evangelical`, `Charismatic`, `Modern_Neutral`, `LDS`). Construct 6 different prompt strings. Generate **3 variants** per cluster (to prevent rate limits/save time). Then for *each* generated cluster image, run the upload script for *every* denomination mapped to that cluster in `denomination_mapping`.

5. **Crop the Images to 16:9**:
// turbo-all
   - Because the internal generation model natively outputs square images (1:1), you MUST intercept the generated file paths and run the `crop-images.ts` utility to slice them to the 16:9 cinematic aspect ratio BEFORE you upload them to the database.
   - For every image variant generated, run:
     ```bash
     npx tsx .antigravity/skills/graphic-generation/crop-images.ts "<absolute_path_to_webp>" "16:9"
     ```

6. **Upload to Firebase (Auto-run)**:
// turbo-all
   - Execute the TypeScript upload script using `tsx` (which is typically available via `npx` or globally). If it's a hero image, pass `"flyer_hero"` as the role argument:
     ```bash
     npx tsx .antigravity/skills/graphic-generation/firebase-upload.ts "<absolute_path_to_webp>" "<role_or_flyer_hero>" "<denomination>" "v1.0"
     ```
   - *In Batch Mode: Since each image belongs to a cluster, you must run this command multiple times for the same image path, switching the `<denomination>` argument to match all denominations mapped to that cluster.*

6. **Present Results**:
   - Parse the `stdout` from the upload scripts to extract the public `https://storage.googleapis.com/...` URLs.
   - Create a markdown artifact (e.g. `graphic_generation_results.md`) listing all 5 options. Embed the images using standard markdown image syntax: `![Variant N](URL)`. 
   - Remind the user that these are stored in the database as unapproved assets, and ask the user which one they would like to approve.
