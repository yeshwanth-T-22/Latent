-- Supabase database schema for Latent
-- Run these SQL statements in Supabase SQL Editor

-- ─── Enable UUID extension ────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─── profiles table ───────────────────────────────────────────────────────────
-- One row per user. Links to Supabase Auth (auth.users).
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Student',
  year_group text,
  avatar_color text not null default '#4ba59a',
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Migration: add avatar_color and bio if table already exists
alter table public.profiles add column if not exists avatar_color text not null default '#4ba59a';
alter table public.profiles add column if not exists bio text;

-- ─── topics table ─────────────────────────────────────────────────────────────
-- One row per (student, topic_name) pair.
create table if not exists public.topics (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  topic_name text not null,
  subject text not null default '',
  confidence_score integer not null default 50 check (confidence_score between 0 and 100),
  true_understanding_score integer not null default 50 check (true_understanding_score between 0 and 100),
  is_weak_spot boolean not null default false,
  doubt_state jsonb,
  quiz_state jsonb,
  explain_state jsonb,
  last_interaction timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(student_id, topic_name)
);

-- Migration: add state columns if table already exists
alter table public.topics add column if not exists doubt_state jsonb;
alter table public.topics add column if not exists quiz_state jsonb;
alter table public.topics add column if not exists explain_state jsonb;

-- ─── history table ────────────────────────────────────────────────────────────
-- One row per interaction (doubt, quiz, explainback).
create table if not exists public.history (
  id uuid primary key default uuid_generate_v4(),
  topic_id uuid not null references public.topics(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  interaction_type text not null check (interaction_type in ('doubt', 'quiz', 'explainback')),
  notes text,
  true_score integer check (true_score between 0 and 100),
  created_at timestamptz not null default now()
);

-- ─── Row Level Security ───────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.topics enable row level security;
alter table public.history enable row level security;

-- profiles: users can only read/write their own row
create policy "profiles: own row only" on public.profiles
  for all using (auth.uid() = id);

-- topics: users can only access their own topics
create policy "topics: own topics only" on public.topics
  for all using (auth.uid() = student_id);

-- history: users can only access their own history
create policy "history: own history only" on public.history
  for all using (auth.uid() = student_id);

-- ─── Trigger: auto-update updated_at ─────────────────────────────────────────
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles
  for each row execute procedure update_updated_at();

create trigger topics_updated_at before update on public.topics
  for each row execute procedure update_updated_at();

-- ─── Trigger: auto-create profile on signup ───────────────────────────────────
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', 'Student'));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
