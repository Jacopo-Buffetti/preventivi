-- =====================================================================
-- Migrazione 003: arrotondamento del totale
-- Da eseguire una volta nel SQL Editor, dopo schema.sql e 002.
-- =====================================================================
--
-- "sconto" è la differenza tra il totale con IVA e il totale arrotondato,
-- in euro. Esempio: totale con IVA 244, arrotondato a 240 → sconto 4.
-- totale_generale contiene già il totale arrotondato (240).
--
-- Default 0 = nessun arrotondamento: i preventivi già salvati non cambiano.
-- "if not exists": si può rilanciare senza errori.

alter table preventivi
  add column if not exists sconto numeric(12, 2) not null default 0;
