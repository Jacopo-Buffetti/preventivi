-- =====================================================================
-- Migrazione 006: voci rapide
-- Da eseguire una volta nel SQL Editor, dopo le migrazioni precedenti.
-- Si può rilanciare senza errori.
-- =====================================================================
--
-- Le voci che ogni utente usa più spesso nei preventivi, con il suo
-- prezzo. Le crea lui dal Profilo: nessuna voce predefinita.
-- Stesse colonne del SQLite locale, più user_id e server_updated_at,
-- come per i clienti (vedi schema.sql).
--
-- Nota: l'unità di misura delle voci DEI PREVENTIVI non richiede
-- modifiche qui: le voci viaggiano nella colonna JSON "voci" della
-- tabella preventivi, che accetta il campo "unita" così com'è.

create table if not exists voci_rapide (
  id                text primary key,
  user_id           uuid not null default auth.uid()
                    references auth.users (id) on delete cascade,
  descrizione       text not null,
  prezzo            numeric(12, 2) not null default 0,
  quantita          numeric(12, 3) not null default 1,
  unita             text,
  posizione         integer not null default 0,
  updated_at        timestamptz not null,
  deleted_at        timestamptz,
  server_updated_at timestamptz not null default now()
);

-- Indice per il pull: "dammi le voci di questo utente cambiate dopo X"
create index if not exists voci_rapide_pull on voci_rapide (user_id, server_updated_at);

-- Ora del server a ogni modifica (funzione già creata da schema.sql)
create or replace trigger voci_rapide_server_updated_at
  before insert or update on voci_rapide
  for each row execute function imposta_server_updated_at();

-- Una modifica più vecchia non sovrascrive una più nuova
-- (funzione già creata dalla migrazione 002)
create or replace trigger voci_rapide_scarta_vecchie
  before update on voci_rapide
  for each row execute function scarta_modifiche_vecchie();

-- Ognuno vede e modifica solo le proprie voci
alter table voci_rapide enable row level security;

drop policy if exists "solo le proprie voci rapide" on voci_rapide;
create policy "solo le proprie voci rapide" on voci_rapide
  for all to authenticated
  using      (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

grant select, insert, update, delete on voci_rapide to authenticated;
revoke all on voci_rapide from anon;

-- Supabase rilegge subito le tabelle (altrimenti l'app potrebbe non
-- vedere la nuova tabella per qualche minuto)
notify pgrst, 'reload schema';
