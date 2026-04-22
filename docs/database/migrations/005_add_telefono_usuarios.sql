-- Migration 005: Add telefono column to usuarios table
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS telefono character varying(20);
