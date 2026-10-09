-- =====================================================================
-- Migrazione 007: aliquota IVA e marca da bollo
-- Da eseguire una volta nel SQL Editor, dopo le migrazioni precedenti.
-- Si può rilanciare senza errori.
-- =====================================================================

-- Nel profilo: le impostazioni dei preventivi nuovi
--   aliquota_iva  proposta ai preventivi nuovi (22 se non si sceglie)
--   marca_bollo   true = aggiungi la marca da bollo ai preventivi nuovi
alter table profilo
  add column if not exists aliquota_iva numeric(5, 2) not null default 22,
  add column if not exists marca_bollo  boolean       not null default false;

-- Sul preventivo: l'importo della marca da bollo (0 = senza), già
-- compreso in totale_generale. Sta sul preventivo perché cambiare le
-- impostazioni nel profilo non deve cambiare i preventivi già fatti.
alter table preventivi
  add column if not exists marca_bollo numeric(12, 2) not null default 0;

notify pgrst, 'reload schema';
