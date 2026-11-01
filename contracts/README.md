# Contract Layer Rules

## Core Problem
Modules talk to each other however they want, leading to inconsistent behavior, silent breaks, and unreliable AI work.

## Orchestrator Rule
Modules DO NOT call each other. Only the orchestrator coordinates them.

## Module Template
Every module must follow this structure:
module/
├── contract.ts
├── index.ts
├── test.ts

## Test Rule
If test passes -> module is correct.
If test fails -> module is broken.

## Version Lock
Contracts are versioned.
Example: photocode v1.3, entity v1.0, assetIdentity v1.0

## AI Build Continuity Rule
AI reads contract -> builds module. No need for previous conversation.
