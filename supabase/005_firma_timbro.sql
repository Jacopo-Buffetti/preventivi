-- =====================================================================
-- Migrazione 005: firma e timbro del professionista
-- Da eseguire una volta nel SQL Editor, dopo le migrazioni precedenti.
-- Si può rilanciare senza errori.
-- =====================================================================
--
-- Le immagini sono data URI in base64 (data:image/png;base64,...), come il
-- logo del biglietto. Sono piccole (al massimo 200 KB, vedi
-- immaginiProfilo.ts), quindi possono stare nella riga del profilo e
-- viaggiare con la normale sincronizzazione.

alter table profilo
  add column if not exists firma  text,
  add column if not exists timbro text;
