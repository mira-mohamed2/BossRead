import { column, Schema, Table } from '@powersync/react-native';

const contentItems = new Table({
  type: column.text,
  title: column.text,
  author: column.text,
  cover_uri: column.text,
  language: column.text,
  word_count: column.integer,
  created_at: column.text,
  updated_at: column.text,
  deleted_at: column.text,
  user_id: column.text,
});

const bookDetails = new Table({
  content_id: column.text,
  format: column.text,
  file_path: column.text,
  file_hash: column.text,
  file_size: column.integer,
  total_pages: column.integer,
  publisher: column.text,
  isbn: column.text,
});

const articleDetails = new Table({
  content_id: column.text,
  url: column.text,
  site_name: column.text,
  excerpt: column.text,
  html_content: column.text,
  estimated_read_minutes: column.integer,
});

const annotations = new Table({
  content_id: column.text,
  type: column.text,
  text_selection: column.text,
  note: column.text,
  color: column.text,
  position_data: column.text, // JSON string
  created_at: column.text,
  updated_at: column.text,
  deleted_at: column.text,
  user_id: column.text,
});

const readingProgress = new Table({
  content_id: column.text,
  position_data: column.text, // JSON string
  percentage: column.real,
  total_read_seconds: column.integer,
  last_read_at: column.text,
  updated_at: column.text,
  user_id: column.text,
});

const ttsPreferences = new Table({
  content_id: column.text,
  voice_id: column.text,
  speed: column.real,
  pitch: column.real,
  last_position: column.text, // JSON string
  updated_at: column.text,
  user_id: column.text,
});

const userSettings = new Table({
  theme: column.text,
  font_family: column.text,
  font_size: column.integer,
  line_height: column.real,
  default_tts_voice: column.text,
  default_tts_speed: column.real,
  sync_enabled: column.integer,
  updated_at: column.text,
  user_id: column.text,
});

export const AppSchema = new Schema({
  content_items: contentItems,
  book_details: bookDetails,
  article_details: articleDetails,
  annotations,
  reading_progress: readingProgress,
  tts_preferences: ttsPreferences,
  user_settings: userSettings,
});
