# Project Log: Serene Practice

## 1. Project Overview
**Serene Practice** is a minimalist, aesthetic appointment and note management system designed for practitioners (such as doctors or therapists). It provides a "calm space" to manage daily sessions, track intentions, and maintain personal notes with a focus on visual elegance and simplicity.

## 2. Tech Stack
- **Frontend**: 
  - Standard HTML5 & Vanilla JavaScript.
  - Vanilla CSS3 for styling (using a Japanese Floral-inspired palette).
  - Google Fonts: *Inter* (UI) and *Playfair Display* (Headings).
- **Backend-as-a-Service**: 
  - **Supabase**: Handles Authentication (Email/Password) and PostgreSQL database storage.
- **Icons**: Minimalist use of Unicode Emojis for a lightweight and clean feel.

## 3. Implementation Details

### Architecture
The project follows a single-page application (SPA) architecture where different views (Auth vs. App) and modals are toggled using JavaScript and CSS classes (`active`, `hidden`).

### Core Modules
1. **Authentication (`app.js`)**:
   - Integrates with Supabase Auth for sign-up and sign-in.
   - Persistent sessions are checked on page load via `supabaseClient.auth.getSession()`.
   - User metadata (Full Name) is stored and synced with the UI.

2. **Schedule Management**:
   - **Appointments Table**: Stores `client_name`, `date`, `time`, `session_type` (New/Follow-up), `mode` (Online/In-person), and `notes`.
   - **Dynamic Fetching**: Appointments are fetched and rendered based on the `selectedDate`.

3. **Notes & Intention Tracking**:
   - **Notes Table**: Stores text notes and checklists.
   - **Daily Intentions**: A special pinned note that functions as a checklist. It is automatically created if it doesn't exist.
   - **Canvas Modal**: A distraction-free environment for writing notes or managing checklist items.

4. **UI/UX Design (`style.css`)**:
   - **Japanese Floral Palette**: Uses soft tones like `#F9F7F2` (Paper), `#D8D0E3` (Lavender), and `#C5D1C3` (Sage).
   - **Noise Filter**: A subtle SVG-based grain texture applied to the background for a premium feel.
   - **Micro-animations**: Smooth transitions for hover states, modal overlays, and scale effects on interactive elements.

5. **Utility Features**:
   - **CSV Export**: Allows users to download all their appointment data.
   - **Date Navigator**: Custom navigation bar with a native HTML5 date picker integration.
   - **Profile System**: Allows updating display names and viewing session details.

## 4. Security & Configuration
- **Supabase Keys**: The application requires `SUPABASE_URL` and `SUPABASE_KEY` to be configured in `app.js`. (Actual keys are excluded for security).
- **Data Privacy**: All database queries are filtered by `user_id` to ensure users can only access their own data.

## 5. File Structure
- `index.html`: The skeleton of the app, including all modal structures.
- `style.css`: The "Serene" design system and layout logic.
- `app.js`: The "brain" of the application handling state, DB interactions, and DOM updates.
- `config.js`: Reserved for auxiliary configuration (currently empty).

## 6. LLM Code Context (Blueprint)
This section is designed to provide an LLM or AI agent with the exact technical blueprint of the project for modification or debugging.

### Code Location & Flat Structure
All core source files are located in the **project root directory**. There are no nested source folders (e.g., no `/src` or `/assets`), ensuring a simple, flat structure for direct editing and rapid prototyping.

### A. index.html (UI Structure)
- **Container Views**: Uses two main parent divs: `#auth-view` (Login/Signup) and `#app-view` (Main Dashboard).
- **Navigation**: Features a custom `.date-nav` bar with arrows and a hidden `<input type="date">` for calendar selection.
- **Data Display**: 
    - `#appointment-list`: Container for dynamic session cards.
    - `#notes-list`: Container for pinned (Daily Intentions) and regular notes.
- **Modals (4 Total)**:
    1. `#modal`: Form for adding/editing sessions (Name, Date, Time, Type, Mode, Notes).
    2. `#note-modal`: A "Canvas" for writing notes or managing checklist items.
    3. `#profile-modal`: Simple input to update the user's display name.
    4. `#new-title-modal`: Small prompt for naming a new note before opening the canvas.

### B. style.css (Design System)
- **CSS Variables**: Defined in `:root` for a "Japanese Floral" palette (Paper, Charcoal, Lavender, Sage, Coral).
- **Visual Texture**: A custom `background-image` using a `feTurbulence` SVG filter to create a subtle grain/noise effect.
- **Overlay System**: `.modal-overlay` uses `opacity` and `pointer-events` transitions for smooth pop-up effects.
- **Layout**: Centered container with a `max-width: 700px` for a focused, list-style productivity experience.

### C. app.js (Business Logic & State)
- **State Object**: Tracks `currentUser`, `selectedDate`, `appointments[]`, `notes[]`, and `pinnedNoteId`.
- **Supabase Client**: Initialized using `SUPABASE_URL` and `SUPABASE_KEY` (Anon Key).
- **Key Functions**:
    - `checkSession()`: Entry point to verify if user is logged in.
    - `showApp()` / `showAuth()`: Manages DOM visibility between login and dashboard.
    - `fetchAppointments()` / `fetchNotes()`: Asynchronous Supabase queries filtered by `user_id`.
    - `updateChecklist()`: Specialized logic to parse and stringify JSON content for the "Daily Intentions" checklist.
    - `export-btn`: Logic to convert Supabase data arrays into a CSV string and trigger a browser download.
- **Event Listeners**: Comprehensive DOM mapping for all buttons, forms, and window-click events for dropdown management.

### D. Database Schema (Reference)
- **Table: `appointments`**
    - `id` (uuid), `user_id` (uuid), `client_name` (text), `date` (date), `time` (time), `session_type` (text), `mode` (text), `notes` (text).
- **Table: `notes`**
    - `id` (uuid), `user_id` (uuid), `title` (text), `content` (text/json), `type` (text: 'text' or 'checklist'), `is_pinned` (boolean), `created_at` (timestamptz).
