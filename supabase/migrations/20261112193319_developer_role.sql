-- Keep the repository's schema history aligned with the live project.
-- This migration was applied to the connected Supabase project on 2026-11-12.
alter type public.school_role add value if not exists 'developer';
