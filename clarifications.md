# Project Clarifications

Based on my analysis of the current codebase:

## 1. Supabase Initialization
- **Location:** `createClient()` is currently written inside `app.js`.
- **Hardcoding:** Both `SUPABASE_URL` and `SUPABASE_KEY` are hardcoded directly in `app.js`.
- **Config:** `config.js` exists but is currently empty.

## 2. Current JS Size
- **Line Count:** `app.js` is approximately **549 lines**.
- **Category:** 500–1500 lines. (Starting to reach the point where modularization is beneficial).

## 3. Build System
- **Current State:** Using **plain HTML** with `<script src="app.js">`.
- **Note:** No bundler (Vite) or ES modules are currently in use.

## 4. State Management
- **Pattern:** Using separate top-level global variables (`currentUser`, `selectedDate`, `appointments`, `notes`, `pinnedNoteId`).
- **Mutation:** These are mutated directly throughout the functions in `app.js`.

## 5. Modal Logic
- **Method:** Managed via **direct DOM manipulation** (specifically `classList` toggling of `active` and `hidden` classes on elements fetched via `document.getElementById`).

---

## Architecture Questions & Remaining Queries

Help me refine the roadmap by answering these:

1. **Supabase RLS:** Have you enabled Row Level Security and written policies in the Supabase Dashboard, or should we include that in the infra/setup tasks?
2. **GitHub Setup:** Is this repository already connected to a GitHub remote? Are you using any CI/CD (GitHub Actions) or specific deployment platforms (Vercel, Netlify, etc.)?
3. **Modularization Preference:** Since `app.js` is ~550 lines, would you like to move towards a modular structure (ES Modules) or keep it as a single file for now?

**Where to look:** Most of the logic and configuration identified above is located in `app.js`.
