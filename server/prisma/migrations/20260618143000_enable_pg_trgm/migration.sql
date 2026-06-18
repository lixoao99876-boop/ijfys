-- Enable pg_trgm extension for trigram similarity search (used in /api/search fallback)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
