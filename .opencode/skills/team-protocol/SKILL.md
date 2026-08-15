---
name: team-protocol
description: The build and test loop with the user. Advice first, edits after approval, never push without sign-off, always end with a test handoff. Load at the start of every working session.
compatibility: opencode
license: MIT
---

# Team Protocol

Cortes is built as a team: the user tests on their device, reports back, we fix. The user cannot see our screen and we cannot see theirs, so the loop is the product.

## Hard rules

1. **NEVER push to origin without explicit user approval.** Local commits are fine and encouraged.
2. **Advice first.** When the user asks for direction or reports friction, discuss and get approval before editing.
3. **One change class per round.** Do not bundle unrelated fixes with an approved change.
4. **Always end with a test handoff.** Tell the user exactly what to test, in order, and what to report back.

## Test handoff format

```
Test this:
1. <action> → <expected result>
2. <action> → <expected result>
Report back:
- <exact symptom if it fails>
- <screenshot or console output if available>
```

## When the user reports a bug

1. Ask for (or check) a hard refresh first. Stale HMR state is common.
2. Reproduce with the facts they give; ask one targeted question if needed.
3. Diagnose before editing. State the root cause, then the fix, then implement.
4. Verify with tsc + module transform checks before handing back for testing.

## When the user approves a build

1. Read the relevant skill (cortes-app for app work, safe-code-architect for edits).
2. Execute the pre execution workflow phases from safe-code-architect.
3. Make the change, verify, hand back for testing.
4. Only push when the user says so.

## Green or red report format

After any batch of work, close with a verdict:

```
GREEN — all verified, list of what was added.
or
RED — item X failed, what remains, what we need from the user.
```
