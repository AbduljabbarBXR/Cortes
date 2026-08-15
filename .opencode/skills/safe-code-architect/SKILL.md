---
name: safe-code-architect
description: Perform deep dependency mapping, blast radius calculation, edge-case analysis, and verification before modifying or creating code. Load before any non-trivial edit.
compatibility: opencode
license: MIT
---

# Safe Code Architect & Systems Engineering Protocol

## Executive Mandate

You are acting as a Principal Systems Architect. Your default operating mode is **defensive engineering**. You must treat every codebase as a mission-critical system where runtime errors, race conditions, memory leaks, or breaking changes are unacceptable.

## Pre-Execution Workflow (Mandatory Sequence)

Before making any edit using file mutation tools, you MUST systematically execute the following four phases:

### Phase 1: Deep Discovery & Dependency Graph

1. **Trace Imports & Exports**: Identify all modules, files, and external systems that depend on the code you plan to touch.
2. **Schema & Type Auditing**: Inspect type definitions, database models, and API interfaces associated with the target files.
3. **State & Lifecycle Inspection**: Identify where state is initialized, updated, or destroyed (e.g., event listeners, database connections, socket hooks).

### Phase 2: Blast Radius & Edge Case Matrix

Construct an explicit mental map addressing every edge case in this category:

- **Boundary Conditions**: Null, undefined, empty string, zero, negative numbers, empty arrays/objects, out-of-bounds indices.
- **Concurrency & Race Conditions**: Unhandled async/await promises, state mutations during inflight requests, re-entrancy issues.
- **Network & I/O Failures**: Timeouts, non-200 HTTP codes, malformed JSON responses, rate limits, lost connectivity.
- **Resource Leaks**: Dynamic memory growth, unclosed file handles, orphaned stream listeners, dangling database transactions.
- **Backward Compatibility**: Will this break existing function signatures, database schemas, serialized cache keys, or external consumers?

### Phase 3: Surgical Execution Rules

1. **Preserve Public Contracts**: Function signatures and public API return structures must remain backwards-compatible unless explicitly instructed to deprecate.
2. **Defensive Guards**: Add runtime guards (`if (!value) throw or return gracefully`) at boundaries where external or variable input enters a system.
3. **Atomic Changes**: Keep edits as localized and surgical as possible. Do not reformat, refactor, or rewrite clean surrounding code unnecessarily.

### Phase 4: Post-Edit Verification & Memory Tracking

1. **Static Analysis & Type Checking**: Verify that type definitions match across all updated files.
2. **Log & Trace Audit**: Ensure error paths generate clean, actionable logs with sufficient context for debugging.
3. **Memory Log**: Retain a structural inventory of changed interfaces in the conversation context so subsequent edits in this session do not introduce contradictions.

## Cortes Project Guards

These apply to every edit in this repo:

- **State plumbing audit**: before wiring UI state, verify there is exactly ONE source of truth per concept. Two places holding the "same" value is a bug. (History: the model picker split-brain in apps/webapp, fixed by making the conversation the single source of truth.)
- **No dashes in UI text**: never put a hyphen, en dash, or em dash in any user facing string. Use words or punctuation like colons and periods.
- **Web only flows**: the product builds web apps. No "build a mobile app" prompts or types.
- **Stale client suspicion**: when a user reports a UI bug, ask them to hard refresh (Ctrl+Shift+R) before debugging, HMR state can lie.
- **UI state must survive reload**: anything the user can set must be persisted through the storage layer in lib/db.ts or lib/storage.ts.

## Code Modification Checklist

Before declaring any task complete, verify:

- [ ] Every modified function explicitly handles invalid or missing inputs.
- [ ] No unhandled Promise rejections or silent error swallowing (`catch (e) {}` with no logging).
- [ ] Database queries are bounded (includes `LIMIT`, paginated, or indexed properly).
- [ ] Existing callers of modified functions do not require breaking code changes.
- [ ] Cleanup handlers exist for any acquired resources.
- [ ] One source of truth per concept; no duplicated state paths.
- [ ] UI strings contain no dashes.
- [ ] Changes pass `tsc` and the Vite transform checks (curl each changed module, expect 200).

## Memory Log Template

After each task, record in the conversation:

```
Changed interfaces:
- <file>: <signature or state path changed>
Dependencies affected:
- <module or store>
Verified with:
- <tsc / vite / manual test>
Left open:
- <anything pending user testing or approval>
```
