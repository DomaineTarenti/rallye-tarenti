-- Migration: Add locked column to teams
-- Run in Supabase SQL Editor

ALTER TABLE teams ADD COLUMN IF NOT EXISTS locked boolean NOT NULL DEFAULT false;
