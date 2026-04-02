# ReadFlow — Technical Documentation

Comprehensive technical documentation for the ReadFlow mobile reading application.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Database Schema](#database-schema)
5. [State Management](#state-management)
6. [Services Layer](#services-layer)
7. [Feature Modules](#feature-modules)
8. [Routing & Navigation](#routing--navigation)
9. [Authentication Flow](#authentication-flow)
10. [Data Sync Architecture](#data-sync-architecture)
11. [Content Parsing Pipeline](#content-parsing-pipeline)
12. [Text-to-Speech Engine](#text-to-speech-engine)
13. [Theming System](#theming-system)
14. [Build & Development](#build--development)
15. [Environment Configuration](#environment-configuration)
16. [Key Design Decisions](#key-design-decisions)

---

## Architecture Overview

ReadFlow is a **local-first** mobile reading application built with React Native and Expo. The architecture prioritizes offline functionality with background cloud sync.

```
+-------------------+     +------------------+     +---------------+
|   React Native    |     |    PowerSync     |     |   Supabase    |
|   UI Layer        | <-> |   Local SQLite   | <-> |  PostgreSQL   |
|   (Expo Router)   |     |   (readflow.db)  |     |  Cloud DB     |
+-------------------+     +------------------+     +---------------+
        |                         |
   Zustand Stores          CRUD Operations
   (In-memory state)       (Persistent data)
```

**Core principles:**
- All data is stored locally in SQLite via PowerSync
- UI reads directly from local SQLite — no network latency
- PowerSync syncs changes bidirectionally with Supabase in the background
- Zustand stores manage ephemeral UI state (not persisted data)
- File-based routing via expo-router

---

## Technology Stack

| Category | Technology | Version |
|----------|-----------|---------|
| Framework | React Native | 0.81.5 |
| Platform | Expo SDK | 54 |
| Language | TypeScript | 5.9.2 |
| UI Library | React | 19.1.0 |
| Navigation | expo-router | 6 |
| State Mgmt | Zustand | 5.0.12 |
| Local DB | PowerSync (SQLite) | 1.33.0 |
| Cloud DB | Supabase | 2.100.1 |
| Data Fetching | TanStack React Query | 5.95.2 |
| Icons | @expo/vector-icons (Ionicons) | 15.0.3 |
| Gestures | react-native-gesture-handler | 2.28.0 |
| Animations | react-native-reanimated | 4.1.1 |
| TTS | expo-speech | 14.0.8 |
| File Picker | expo-document-picker | 14.0.8 |
| WebView | react-native-webview | 13.15.0 |
| EPUB parsing | JSZip + custom parser | 3.10.1 |
| ID Generation | ULID | 3.0.2 |
| Secure Storage | expo-secure-store | 15.0.8 |
| Article Parsing | @mozilla/readability | 0.6.0 |

---

## Project Structure

```
ReadFlow/
+-- src/
|   +-- app/                    # Expo Router file-based routes
|   |   +-- _layout.tsx         # Root layout (auth gate, providers)
|   |   +-- (tabs)/             # Tab navigator group
|   |   |   +-- _layout.tsx     # Tab bar configuration
|   |   |   +-- library.tsx     # Library screen
|   |   |   +-- discover.tsx    # Novel discovery screen
|   |   |   +-- browser.tsx     # In-app web browser
|   |   |   +-- stats.tsx       # Reading statistics dashboard
|   |   |   +-- settings.tsx    # App settings
|   |   +-- auth/               # Auth screens group
|   |   |   +-- login.tsx       # Login form
|   |   |   +-- register.tsx    # Registration form
|   |   +-- reader/             # Reader screens
|   |       +-- _layout.tsx     # Reader layout (hides tabs)
|   |       +-- [id].tsx        # Dynamic reader route
|   +-- constants/              # App-wide constants
|   |   +-- env.ts              # Environment variables
|   |   +-- themes.ts           # Theme colors, fonts, defaults
|   +-- features/               # Feature modules (domain logic)
|   |   +-- library/            # Library feature
|   |   |   +-- components/     # ContentCard, EmptyLibrary
|   |   |   +-- hooks/          # useLibrary, useImport
|   |   +-- reader/             # Reader feature
|   |   |   +-- components/     # Renderers (Epub, PDF, Article), Toolbar
|   |   |   +-- hooks/          # useReadingProgress
|   |   +-- tts/                # Text-to-Speech feature
|   |   |   +-- components/     # TTSMiniPlayer
|   |   |   +-- engine/         # NativeTTSAdapter, engine types
|   |   |   +-- hooks/          # useTTS
|   |   |   +-- utils/          # textChunker
|   |   +-- stats/              # Reading statistics feature
|   |   |   +-- hooks/          # useReadingStats
|   |   +-- discover/           # Novel discovery feature
|   |       +-- sources/        # Source adapters (RoyalRoad, LightNovelPub)
|   |       +-- store/          # Discover store
|   +-- hooks/                  # Shared hooks
|   |   +-- useBookmarks.ts     # Bookmark toggle logic
|   |   +-- useDebounce.ts      # Debounce utility hook
|   |   +-- useTheme.ts         # Theme access hook
|   +-- services/               # External service integrations
|   |   +-- parsers/            # EPUB parser, Readability wrapper
|   |   +-- powersync/          # PowerSync DB client, schema, connector
|   |   +-- supabase/           # Supabase client, auth functions
|   +-- stores/                 # Zustand state stores
|   |   +-- authStore.ts        # Authentication state
|   |   +-- browserStore.ts     # Browser navigation state
|   |   +-- readerStore.ts      # Reader UI state
|   |   +-- ttsStore.ts         # TTS playback state
|   |   +-- uiStore.ts          # Theme, fonts, UI preferences
|   +-- types/                  # TypeScript type definitions
|   |   +-- annotation.ts       # Annotation types
|   |   +-- content.ts          # Content item types
|   |   +-- position.ts         # Reading position types
|   |   +-- settings.ts         # Settings types (ThemeMode etc.)
|   |   +-- tts.ts              # TTS types (TTSStatus, TTSChunk)
|   +-- utils/                  # Utility functions
|       +-- formatters.ts       # Time, percentage, file size formatters
|       +-- validators.ts       # URL validation, normalization
+-- assets/                     # Static assets (fonts, images)
+-- app.json                    # Expo configuration
+-- package.json                # Dependencies
+-- tsconfig.json               # TypeScript configuration
```

---

## Database Schema

ReadFlow uses 7 SQLite tables managed by PowerSync. All IDs are ULIDs.

### content_items
Primary table for all user content.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT (PK) | ULID |
| type | TEXT | 'book' or 'article' |
| title | TEXT | Content title |
| author | TEXT | Author name |
| cover_uri | TEXT | Local file URI for cover image |
| language | TEXT | Content language code |
| word_count | INTEGER | Total word count |
| created_at | TEXT | ISO 8601 timestamp |
| updated_at | TEXT | ISO 8601 timestamp |
| deleted_at | TEXT | Soft delete timestamp (null if active) |
| user_id | TEXT | Owner user ID |

### book_details
Extended metadata for books (1:1 with content_items).

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT (PK) | ULID |
| content_id | TEXT (FK) | References content_items.id |
| format | TEXT | 'epub', 'pdf', or 'txt' |
| file_path | TEXT | Local file system path |
| file_hash | TEXT | SHA-256 hash of file |
| file_size | INTEGER | File size in bytes |
| total_pages | INTEGER | Total pages (PDF) or chapters (EPUB) |
| publisher | TEXT | Publisher name |
| isbn | TEXT | ISBN identifier |

### article_details
Extended metadata for articles (1:1 with content_items).

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT (PK) | ULID |
| content_id | TEXT (FK) | References content_items.id |
| url | TEXT | Original article URL |
| site_name | TEXT | Source website name |
| excerpt | TEXT | Article excerpt/summary |
| html_content | TEXT | Full HTML content |
| estimated_read_minutes | INTEGER | Estimated reading time |

### annotations
Highlights, notes, and bookmarks.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT (PK) | ULID |
| content_id | TEXT (FK) | References content_items.id |
| type | TEXT | 'highlight', 'note', or 'bookmark' |
| text_selection | TEXT | Selected text (for highlights) |
| note | TEXT | User note content |
| color | TEXT | Highlight color |
| position_data | TEXT | JSON: position in content |
| created_at | TEXT | ISO 8601 timestamp |
| updated_at | TEXT | ISO 8601 timestamp |
| deleted_at | TEXT | Soft delete timestamp |
| user_id | TEXT | Owner user ID |

### reading_progress
Per-item reading position and statistics.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT (PK) | ULID |
| content_id | TEXT (FK) | References content_items.id |
| position_data | TEXT | JSON: chapter/page/offset |
| percentage | REAL | Reading progress (0-100) |
| total_read_seconds | INTEGER | Cumulative reading time |
| last_read_at | TEXT | Last reading session timestamp |
| updated_at | TEXT | ISO 8601 timestamp |
| user_id | TEXT | Owner user ID |

### tts_preferences
Per-item TTS settings.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT (PK) | ULID |
| content_id | TEXT (FK) | References content_items.id |
| voice_id | TEXT | Selected voice identifier |
| speed | REAL | Playback speed (0.25-4.0) |
| pitch | REAL | Voice pitch (0.5-2.0) |
| last_position | TEXT | JSON: last TTS position |
| updated_at | TEXT | ISO 8601 timestamp |
| user_id | TEXT | Owner user ID |

### user_settings
Global user preferences (one row per user).

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT (PK) | ULID |
| theme | TEXT | 'light', 'dark', 'sepia', 'amoled' |
| font_family | TEXT | 'system', 'serif', 'sans', 'openDyslexic' |
| font_size | INTEGER | Reader font size in px |
| line_height | REAL | Line height multiplier |
| default_tts_voice | TEXT | Default TTS voice ID |
| default_tts_speed | REAL | Default TTS speed |
| sync_enabled | INTEGER | 0 or 1 |
| updated_at | TEXT | ISO 8601 timestamp |

---

## State Management

ReadFlow uses Zustand for in-memory state management. Stores hold **ephemeral UI state**, not persistent data.

### Store Inventory

| Store | File | Purpose |
|-------|------|---------|
| `useAuthStore` | authStore.ts | Auth state: userId, email, isAuthenticated, isLoading |
| `useUIStore` | uiStore.ts | Theme, colors, fontFamily, fontSize, lineHeight, isOnline |
| `useReaderStore` | readerStore.ts | Current contentId, position, controlsVisible, isFullscreen |
| `useTTSStore` | ttsStore.ts | TTS status, contentId, speed, pitch, chunks, currentChunkIndex |
| `useBrowserStore` | browserStore.ts | Browser URL, loading state, navigation state |
| `useDiscoverStore` | discover store | Active source, search query, tab, novels, pagination |

### Pattern: Direct Zustand Selectors

All components use selector pattern for minimal re-renders:

```typescript
const colors = useUIStore((s) => s.colors);
const theme = useUIStore((s) => s.theme);
```

---

## Services Layer

### PowerSync (Local Database)

- **Client** (`services/powersync/client.ts`): Singleton `PowerSyncDatabase` instance with filename `readflow.db`
- **Schema** (`services/powersync/schema.ts`): 7-table schema definition
- **Connector** (`services/powersync/connector.ts`): `SupabaseConnector` implements `PowerSyncBackendConnector`
  - `fetchCredentials()`: Gets Supabase session token for PowerSync auth
  - `uploadData()`: Processes CRUD transaction queue, maps to Supabase REST API calls (upsert/update/delete)

### Supabase (Cloud Backend)

- **Client** (`services/supabase/client.ts`): Supabase client with `expo-secure-store` adapter for token persistence
- **Auth** (`services/supabase/auth.ts`): `signIn()`, `signUp()`, `signOut()` wrappers

### Content Parsers

- **EPUB** (`services/parsers/epub.ts`): Uses JSZip to extract EPUB contents, reads OPF manifest, extracts metadata and chapters
- **Readability** (`services/parsers/readability.ts`): Wraps Mozilla Readability for article content extraction

---

## Feature Modules

### Library Feature (`features/library/`)

| Component/Hook | Purpose |
|---------------|---------|
| `useLibrary` | Loads content_items with details, search, sort, filter (all/book/article/bookmarked), progress map |
| `useImport` | File picker + EPUB/PDF/TXT import pipeline |
| `ContentCard` | Library item card with cover, title, author, progress bar, read time |
| `EmptyLibrary` | Empty state with guidance |

### Reader Feature (`features/reader/`)

| Component/Hook | Purpose |
|---------------|---------|
| `EpubRenderer` | WebView-based EPUB reader with chapter navigation |
| `PdfRenderer` | Native PDF viewer with page tracking |
| `ArticleRenderer` | HTML article renderer with reader styling |
| `ReaderToolbar` | Top/bottom overlay with back, bookmark, font size controls |
| `useReadingProgress` | Debounced position/percentage save to reading_progress table |

### TTS Feature (`features/tts/`)

| Component/Hook | Purpose |
|---------------|---------|
| `TTSMiniPlayer` | Floating player with play/pause, skip, speed/pitch/sleep controls |
| `useTTS` | TTS lifecycle: load content -> chunk text -> speak sequentially |
| `NativeTTSAdapter` | Wraps `expo-speech` API implementing `ITTSEngine` interface |
| `textChunker` | Splits HTML/text into sentence-level chunks with position metadata |

### Stats Feature (`features/stats/`)

| Component/Hook | Purpose |
|---------------|---------|
| `useReadingStats` | Aggregates content_items + reading_progress for statistics |

### Discover Feature (`features/discover/`)

| Component/Hook | Purpose |
|---------------|---------|
| `RoyalRoad` | Source adapter: popular, latest, search on RoyalRoad |
| `LightNovelPub` | Source adapter: popular, latest, search on LightNovelPub |
| `useDiscoverStore` | Discover tab state: source, query, pagination, results |

---

## Routing & Navigation

Expo Router v6 file-based routing. Route structure:

```
/ (Root _layout.tsx -> AuthGate)
+-- /auth/login            # Login screen
+-- /auth/register         # Registration screen
+-- /(tabs)/               # Tab navigator
|   +-- /library           # Library tab
|   +-- /discover          # Discover tab
|   +-- /browser           # Browse tab
|   +-- /stats             # Stats tab
|   +-- /settings          # Settings tab
+-- /reader/[id]           # Dynamic reader route (fullscreen, no tabs)
```

**Auth Gate**: Root layout contains an `AuthGate` component that:
1. Listens to Supabase auth state changes
2. Redirects unauthenticated users to `/auth/login`
3. Redirects authenticated users from auth screens to `/(tabs)/library`
4. Connects/disconnects PowerSync based on auth state

---

## Authentication Flow

```
1. User opens app
2. AuthGate checks Supabase session (via expo-secure-store)
3a. Session exists -> setUser() -> db.connect(SupabaseConnector) -> navigate to /(tabs)/library
3b. No session -> navigate to /auth/login
4. User signs in/up -> Supabase onAuthStateChange fires -> step 3a
5. User signs out -> clearUser() -> db.disconnect() -> navigate to /auth/login
```

**Token storage**: Supabase tokens stored in `expo-secure-store` (Keychain on iOS, EncryptedSharedPreferences on Android).

---

## Data Sync Architecture

```
Local Write -> PowerSync Queue -> SupabaseConnector.uploadData() -> Supabase REST API -> PostgreSQL
                                                                                            |
Local Read  <- PowerSync Sync  <- PowerSync Service (WebSocket) <----- Supabase Realtime <--/
```

**Key behaviors:**
- All writes go to local SQLite first (instant UI updates)
- PowerSync queues changes and uploads via `SupabaseConnector`
- The connector maps CRUD operations to Supabase REST calls
- Downstream sync happens via PowerSync's WebSocket connection
- Soft deletes used throughout (`deleted_at` column instead of actual deletion)
- Conflict resolution handled by PowerSync (last-write-wins by default)

---

## Content Parsing Pipeline

### Book Import Flow

```
1. expo-document-picker -> user selects file
2. File copied to app's document directory (expo-file-system)
3. Based on extension (.epub/.pdf/.txt):
   a. EPUB: JSZip extracts OPF -> parse metadata (title, author, cover, chapters)
   b. PDF: metadata extraction from file headers
   c. TXT: file name used as title
4. Insert content_items row + book_details row
5. Generate ULID for unique ID
6. File hash (SHA-256) computed for dedup
```

### Article Save Flow

```
1. User navigates to article in Browse tab
2. User taps save -> inject Readability.js extraction script
3. WebView postMessage returns { title, content, siteName, url }
4. Insert content_items row (type='article') + article_details row
5. HTML content stored in article_details.html_content
6. Word count estimated -> reading time calculated
```

---

## Text-to-Speech Engine

### Architecture

```
useTTS hook
  -> loads content text (article HTML or book text)
  -> textChunker splits into sentence chunks with position metadata
  -> NativeTTSAdapter wraps expo-speech
  -> speaks chunks sequentially with speed/pitch from ttsStore
```

### ITTSEngine Interface

```typescript
interface ITTSEngine {
  speak(text: string, options: { rate?: number; pitch?: number; voiceId?: string }): Promise<void>;
  pause(): void;
  resume(): void;
  stop(): void;
  getAvailableVoices(): Promise<Voice[]>;
}
```

### Text Chunking

The `textChunker` splits content into `TTSChunk` objects:

```typescript
interface TTSChunk {
  text: string;              // Sentence text
  paragraphIndex: number;    // Paragraph number
  sentenceIndex: number;     // Sentence within paragraph
  charOffset: number;        // Character offset from start
}
```

### Sleep Timer

Client-side `setTimeout` that calls `stop()` after the configured duration. Resets when status changes or timer value changes.

---

## Theming System

### Theme Types

4 built-in themes: `light`, `dark`, `sepia`, `amoled`

### ThemeColors Interface

Each theme provides 10 color tokens:

| Token | Usage |
|-------|-------|
| `background` | Screen backgrounds |
| `surface` | Cards, headers, tab bar |
| `text` | Primary text |
| `textSecondary` | Labels, metadata |
| `primary` | Accent color, active states |
| `border` | Dividers, outlines |
| `card` | Card backgrounds |
| `error` | Error text, destructive actions |
| `readerBackground` | Reader screen background |
| `readerText` | Reader text color |

### Font System

4 font families: `system` (device default), `serif`, `sans` (sans-serif), `openDyslexic` (accessibility font).

Font size range: 12px - 32px. Line height range: 1.0 - 3.0.

---

## Build & Development

### Prerequisites

- Node.js 18+
- Expo CLI (`npx expo`)
- Android SDK (for Android builds) or Xcode (for iOS)

### Commands

```bash
# Install dependencies
npm install

# Start Expo dev server
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios

# Type check
npx tsc --noEmit
```

### Android Configuration

- Package name: `com.readflow.app`
- Default dev server port: 8082
- ANDROID_HOME: `$env:LOCALAPPDATA\Android\Sdk` (Windows)

### Postinstall Script

`scripts/bundle-readability.js` bundles Mozilla Readability for WebView injection.

---

## Environment Configuration

Environment variables in `src/constants/env.ts`:

| Variable | Purpose |
|----------|---------|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous/public API key |
| `EXPO_PUBLIC_POWERSYNC_URL` | PowerSync service endpoint |

These are loaded via Expo's `expo-constants` from environment variables prefixed with `EXPO_PUBLIC_`.

---

## Key Design Decisions

### Local-First Architecture
All data lives in local SQLite. The app is fully functional offline. Cloud sync is a background enhancement, not a requirement.

### PowerSync over Direct Supabase
PowerSync provides automatic bidirectional sync with conflict resolution, eliminating manual sync logic.

### Zustand for UI State, SQLite for Data
Zustand stores hold only ephemeral UI state (current theme, reader visibility, TTS playback status). All persistent data goes through PowerSync/SQLite.

### Feature Module Organization
Each feature (library, reader, TTS, stats, discover) is self-contained with its own components, hooks, and utilities. Shared code lives in top-level `hooks/`, `utils/`, `stores/`.

### Soft Deletes
All deletions use `deleted_at` timestamps rather than actual row deletion. This enables undo functionality and prevents sync conflicts.

### ULID for IDs
ULIDs are used instead of UUIDs for sortable, collision-resistant IDs that work well in distributed/offline scenarios.

### Expo Router File-Based Routing
Leverages Expo Router's file system routing for type-safe, convention-based navigation without manual route registration.

---

*Generated for ReadFlow v1.0.0*