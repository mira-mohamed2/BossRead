-- ============================================================
-- ReadFlow — Supabase Postgres tables matching PowerSync schema
-- Run via: supabase db push  (or paste into Supabase SQL Editor)
-- ============================================================

-- Enable UUID extension (already enabled on most Supabase projects)
create extension if not exists "uuid-ossp";

-- -------------------------------------------------------
-- 1. content_items  —  core library items
-- -------------------------------------------------------
create table public.content_items (
  id    uuid primary key default uuid_generate_v4(),
  type  text not null check (type in ('book','article')),
  title text not null,
  author text,
  cover_uri  text,
  language   text not null default 'en',
  word_count integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  user_id    uuid not null references auth.users(id) on delete cascade
);

create index idx_content_items_user on public.content_items(user_id);

-- -------------------------------------------------------
-- 2. book_details  —  book-specific metadata
-- -------------------------------------------------------
create table public.book_details (
  id          uuid primary key default uuid_generate_v4(),
  content_id  uuid not null references public.content_items(id) on delete cascade,
  format      text not null check (format in ('epub','pdf','mobi','txt')),
  file_path   text,
  file_hash   text,
  file_size   integer,
  total_pages integer,
  publisher   text,
  isbn        text
);

create unique index idx_book_details_content on public.book_details(content_id);

-- -------------------------------------------------------
-- 3. article_details  —  article-specific metadata
-- -------------------------------------------------------
create table public.article_details (
  id                    uuid primary key default uuid_generate_v4(),
  content_id            uuid not null references public.content_items(id) on delete cascade,
  url                   text,
  site_name             text,
  excerpt               text,
  html_content          text,
  estimated_read_minutes integer
);

create unique index idx_article_details_content on public.article_details(content_id);

-- -------------------------------------------------------
-- 4. annotations  —  highlights, notes, bookmarks
-- -------------------------------------------------------
create table public.annotations (
  id             uuid primary key default uuid_generate_v4(),
  content_id     uuid not null references public.content_items(id) on delete cascade,
  type           text not null check (type in ('highlight','note','bookmark')),
  text_selection text,
  note           text,
  color          text,
  position_data  jsonb,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz,
  user_id        uuid not null references auth.users(id) on delete cascade
);

create index idx_annotations_content on public.annotations(content_id);
create index idx_annotations_user    on public.annotations(user_id);

-- -------------------------------------------------------
-- 5. reading_progress  —  position, percentage, time
-- -------------------------------------------------------
create table public.reading_progress (
  id                 uuid primary key default uuid_generate_v4(),
  content_id         uuid not null references public.content_items(id) on delete cascade,
  position_data      jsonb,
  percentage         double precision default 0,
  total_read_seconds integer default 0,
  last_read_at       timestamptz,
  updated_at         timestamptz not null default now(),
  user_id            uuid not null references auth.users(id) on delete cascade
);

create unique index idx_reading_progress_user_content
  on public.reading_progress(user_id, content_id);

-- -------------------------------------------------------
-- 6. tts_preferences  —  per-content TTS settings
-- -------------------------------------------------------
create table public.tts_preferences (
  id            uuid primary key default uuid_generate_v4(),
  content_id    uuid not null references public.content_items(id) on delete cascade,
  voice_id      text,
  speed         double precision default 1.0,
  pitch         double precision default 1.0,
  last_position jsonb,
  updated_at    timestamptz not null default now(),
  user_id       uuid not null references auth.users(id) on delete cascade
);

create unique index idx_tts_prefs_user_content
  on public.tts_preferences(user_id, content_id);

-- -------------------------------------------------------
-- 7. user_settings  —  global app preferences
-- -------------------------------------------------------
create table public.user_settings (
  id                uuid primary key default uuid_generate_v4(),
  theme             text default 'light',
  font_family       text default 'system',
  font_size         integer default 16,
  line_height       double precision default 1.6,
  default_tts_voice text,
  default_tts_speed double precision default 1.0,
  sync_enabled      integer default 1,
  updated_at        timestamptz not null default now(),
  -- one row per user
  user_id           uuid not null unique references auth.users(id) on delete cascade
);

-- ============================================================
-- Row Level Security  —  users only see/modify their own rows
-- ============================================================

alter table public.content_items    enable row level security;
alter table public.book_details     enable row level security;
alter table public.article_details  enable row level security;
alter table public.annotations      enable row level security;
alter table public.reading_progress enable row level security;
alter table public.tts_preferences  enable row level security;
alter table public.user_settings    enable row level security;

-- content_items
create policy "Users manage own content_items" on public.content_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- book_details  — join through content_items.user_id
create policy "Users manage own book_details" on public.book_details
  for all using (
    exists (select 1 from public.content_items ci where ci.id = content_id and ci.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.content_items ci where ci.id = content_id and ci.user_id = auth.uid())
  );

-- article_details
create policy "Users manage own article_details" on public.article_details
  for all using (
    exists (select 1 from public.content_items ci where ci.id = content_id and ci.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.content_items ci where ci.id = content_id and ci.user_id = auth.uid())
  );

-- annotations
create policy "Users manage own annotations" on public.annotations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- reading_progress
create policy "Users manage own reading_progress" on public.reading_progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- tts_preferences
create policy "Users manage own tts_preferences" on public.tts_preferences
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- user_settings
create policy "Users manage own user_settings" on public.user_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- Publication (required for PowerSync replication)
-- PowerSync reads from a Postgres publication to detect changes.
-- ============================================================

create publication powersync for table
  public.content_items,
  public.book_details,
  public.article_details,
  public.annotations,
  public.reading_progress,
  public.tts_preferences,
  public.user_settings;
