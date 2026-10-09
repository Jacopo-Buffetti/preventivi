-- =====================================================================
-- Migrazione 004: copia firmata del preventivo
-- Da eseguire una volta nel SQL Editor, dopo schema.sql, 002 e 003.
-- Si può rilanciare senza errori.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. COLONNE SUL PREVENTIVO
-- ---------------------------------------------------------------------
-- Nella riga c'è solo il NOME del file; il file vero sta nello Storage.
--   firmato_file  es. "3f2a...-1728390000000.pdf"
--   firmato_tipo  es. "application/pdf" oppure "image/jpeg"
--   firmato_at    quando è stato caricato
alter table preventivi
  add column if not exists firmato_file text,
  add column if not exists firmato_tipo text,
  add column if not exists firmato_at   timestamptz;


-- ---------------------------------------------------------------------
-- 2. BUCKET "firmati"
-- ---------------------------------------------------------------------
-- Privato: i file non hanno un indirizzo pubblico. L'app li scarica con
-- un link temporaneo, valido solo per l'utente collegato.
-- Massimo 10 MB a file, solo PDF e immagini.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'firmati',
  'firmati',
  false,
  10485760,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do nothing;


-- ---------------------------------------------------------------------
-- 3. REGOLE DI ACCESSO
-- ---------------------------------------------------------------------
-- Ogni utente ha la sua cartella, con il proprio id come nome:
--   firmati/<user_id>/<nome file>
-- Le regole controllano che la prima cartella del percorso sia l'id di chi
-- è collegato: ognuno vede, carica e cancella solo i propri file.
-- Servono tutte e quattro: l'app carica con "upsert" (insert + update),
-- legge per scaricare e per cercare le copie vecchie, cancella quelle vecchie.

drop policy if exists "firmati: leggere i propri file" on storage.objects;
create policy "firmati: leggere i propri file" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'firmati'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "firmati: caricare nei propri file" on storage.objects;
create policy "firmati: caricare nei propri file" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'firmati'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "firmati: sostituire i propri file" on storage.objects;
create policy "firmati: sostituire i propri file" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'firmati'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'firmati'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "firmati: cancellare i propri file" on storage.objects;
create policy "firmati: cancellare i propri file" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'firmati'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
