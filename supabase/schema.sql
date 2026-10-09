-- =====================================================================
-- Schema Supabase per l'app "preventivi"
-- Da eseguire una volta nel SQL Editor del progetto Supabase.
-- Tenere questo file nel repo: è la "verità" su com'è fatto il server.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. TRIGGER: server_updated_at
-- ---------------------------------------------------------------------
-- Ogni volta che una riga viene inserita o modificata sul server, questo
-- trigger scrive l'ora del SERVER in server_updated_at.
-- Il pull userà questa colonna per chiedere "cosa è cambiato dall'ultima
-- volta", senza fidarsi dell'orologio dei dispositivi (che può essere
-- avanti o indietro di qualche minuto).
-- updated_at invece arriva dal dispositivo e serve solo a decidere chi
-- vince in caso di conflitto.
create or replace function imposta_server_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.server_updated_at = now();
  return new;
end;
$$;


-- ---------------------------------------------------------------------
-- 2. TABELLE
-- ---------------------------------------------------------------------
-- Stesse colonne del SQLite locale, più:
-- - user_id: a chi appartiene la riga. Il default auth.uid() lo riempie
--   da solo con l'utente che ha fatto login, l'app non deve mandarlo.
-- - server_updated_at: vedi sopra.
-- Non c'è da_sincronizzare: è un'informazione solo locale.
--
-- Gli id sono "text" e non "uuid" perché i record creati prima del passo 1
-- hanno ancora id come CLI-1727... o PREV-2026-4.

-- Clienti
create table if not exists clienti (
  id                text primary key,
  user_id           uuid not null default auth.uid()
                    references auth.users (id) on delete cascade,
  nome              text not null,
  telefono          text,
  email             text,
  indirizzo         text,
  note              text,
  updated_at        timestamptz not null,
  deleted_at        timestamptz,
  server_updated_at timestamptz not null default now()
);

-- Preventivi, con le voci dentro come array JSON.
-- Esempio di voci:
--   [{"id":"…","descrizione":"Brollo ferro","quantita":4,
--     "prezzo_unitario":25,"totale_voce":100}]
-- Così preventivo e voci viaggiano insieme in un'unica riga, e non
-- serve sincronizzare una tabella di voci separata.
--
-- numero_preventivo può essere vuoto: le bozze non hanno ancora un numero,
-- lo ricevono dal server al momento dell'invio (vedi punto 5).
create table if not exists preventivi (
  id                text primary key,
  user_id           uuid not null default auth.uid()
                    references auth.users (id) on delete cascade,
  cliente_id        text not null references clienti (id),
  numero_preventivo integer,
  anno              integer not null,
  data_creazione    timestamptz not null,
  oggetto           text,
  stato             text not null default 'bozza'
                    check (stato in ('bozza', 'inviato', 'accettato', 'rifiutato')),
  aliquota_iva      numeric(5, 2) not null default 22,
  note_pagamento    text,
  totale_imponibile numeric(12, 2) not null default 0,
  totale_iva        numeric(12, 2) not null default 0,
  sconto            numeric(12, 2) not null default 0,  -- arrotondamento (migrazione 003)
  marca_bollo       numeric(12, 2) not null default 0,  -- marca da bollo (migrazione 007)
  totale_generale   numeric(12, 2) not null default 0,
  firmato_file      text,         -- copia firmata dal cliente (migrazione 004)
  firmato_tipo      text,
  firmato_at        timestamptz,
  voci              jsonb not null default '[]'::jsonb,
  updated_at        timestamptz not null,
  deleted_at        timestamptz,
  server_updated_at timestamptz not null default now()
);

-- Lo stesso numero non può comparire due volte nello stesso anno.
-- "where numero_preventivo is not null": le bozze senza numero non contano.
-- È la rete di sicurezza contro i doppioni: se mai arrivasse un secondo
-- 2026/004, il server lo rifiuterebbe invece di salvarlo.
create unique index if not exists preventivi_numero_unico
  on preventivi (user_id, anno, numero_preventivo)
  where numero_preventivo is not null;

-- Profilo dell'attività: una riga per utente, quindi la chiave è user_id
create table if not exists profilo (
  user_id           uuid primary key default auth.uid()
                    references auth.users (id) on delete cascade,
  nome_azienda      text not null,
  titolare          text,
  p_iva             text,
  codice_fiscale    text,
  telefono          text,
  email             text,
  indirizzo         text,
  iban              text,
  firma             text,         -- immagini data URI (migrazione 005)
  timbro            text,
  aliquota_iva      numeric(5, 2) not null default 22,  -- migrazione 007
  marca_bollo       boolean       not null default false,
  updated_at        timestamptz not null,
  server_updated_at timestamptz not null default now()
);

-- Biglietto da visita: una riga per utente.
-- Il logo resta un data URI in base64, come nel SQLite locale.
create table if not exists biglietto (
  user_id            uuid primary key default auth.uid()
                     references auth.users (id) on delete cascade,
  logo               text,
  descrizione_fronte text,
  nome               text,
  qualifica          text,
  descrizione_retro  text,
  indirizzo          text,
  telefono           text,
  cellulare          text,
  email              text,
  email_secondaria   text,
  p_iva              text,
  codice_fiscale     text,
  rea                text,
  updated_at         timestamptz not null,
  server_updated_at  timestamptz not null default now()
);

-- Voci rapide: le voci che l'utente usa più spesso (migrazione 006).
-- Il dettaglio con trigger e regole di accesso è in 006_voci_rapide.sql.
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

-- Indici per il pull: "dammi le righe di questo utente cambiate dopo X"
create index if not exists clienti_pull    on clienti    (user_id, server_updated_at);
create index if not exists preventivi_pull on preventivi (user_id, server_updated_at);

-- Collega il trigger a tutte e quattro le tabelle
create or replace trigger clienti_server_updated_at
  before insert or update on clienti
  for each row execute function imposta_server_updated_at();

create or replace trigger preventivi_server_updated_at
  before insert or update on preventivi
  for each row execute function imposta_server_updated_at();

create or replace trigger profilo_server_updated_at
  before insert or update on profilo
  for each row execute function imposta_server_updated_at();

create or replace trigger biglietto_server_updated_at
  before insert or update on biglietto
  for each row execute function imposta_server_updated_at();


-- ---------------------------------------------------------------------
-- 3. ROW LEVEL SECURITY
-- ---------------------------------------------------------------------
-- La chiave pubblica (publishable key) sarà dentro l'app, quindi chiunque
-- potrebbe estrarla. È sicuro solo grazie a queste regole: con la RLS
-- attiva ogni utente vede e modifica SOLO le righe con il proprio user_id.
-- Senza login non si vede niente.
--
-- "(select auth.uid())" invece di "auth.uid()": stesso risultato, ma
-- Postgres lo calcola una volta per query invece che una volta per riga.

alter table clienti    enable row level security;
alter table preventivi enable row level security;
alter table profilo    enable row level security;
alter table biglietto  enable row level security;

drop policy if exists "solo i propri clienti" on clienti;
create policy "solo i propri clienti" on clienti
  for all to authenticated
  using      (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "solo i propri preventivi" on preventivi;
create policy "solo i propri preventivi" on preventivi
  for all to authenticated
  using      (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "solo il proprio profilo" on profilo;
create policy "solo il proprio profilo" on profilo
  for all to authenticated
  using      (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "solo il proprio biglietto" on biglietto;
create policy "solo il proprio biglietto" on biglietto
  for all to authenticated
  using      (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Permessi espliciti: utenti loggati sì, utenti anonimi no.
grant select, insert, update, delete on clienti, preventivi, profilo, biglietto to authenticated;
revoke all on clienti, preventivi, profilo, biglietto from anon;


-- ---------------------------------------------------------------------
-- 4. CONTATORE DEI NUMERI DI PREVENTIVO
-- ---------------------------------------------------------------------
-- Un contatore per utente e per anno: tiene l'ultimo numero assegnato.
create table if not exists contatori_preventivi (
  user_id       uuid not null references auth.users (id) on delete cascade,
  anno          integer not null,
  ultimo_numero integer not null,
  primary key (user_id, anno)
);

alter table contatori_preventivi enable row level security;
-- Nessuna policy: l'app non può leggere né scrivere direttamente il
-- contatore. Lo tocca solo la funzione qui sotto.
revoke all on contatori_preventivi from anon, authenticated;


-- ---------------------------------------------------------------------
-- 5. FUNZIONE: assegna il prossimo numero (strategia B)
-- ---------------------------------------------------------------------
-- L'app la chiama al momento dell'invio di un preventivo:
--   supabase.rpc('assegna_numero_preventivo', { p_anno: 2026 })
-- e riceve il numero, es. 5.
--
-- Perché è sicura anche se telefono e tablet la chiamano nello stesso
-- istante: "insert ... on conflict do update" blocca la riga del contatore
-- finché non ha finito. La seconda chiamata aspetta la prima e poi riceve
-- il numero successivo. Due numeri uguali sono impossibili.
--
-- Il "greatest(...)" tiene conto dei preventivi già numerati che
-- arriveranno dal primo caricamento dei dati vecchi: il contatore parte
-- sempre dopo il numero più alto già presente, anche se cancellato.
--
-- "security definer": la funzione gira con i permessi di chi l'ha creata,
-- quindi può scrivere nel contatore anche se l'app non può. Usa sempre
-- auth.uid(), quindi ogni utente incrementa solo il proprio contatore.
create or replace function assegna_numero_preventivo(p_anno integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  utente       uuid := auth.uid();
  massimo      integer;
  nuovo_numero integer;
begin
  if utente is null then
    raise exception 'Serve il login per assegnare un numero';
  end if;

  select coalesce(max(numero_preventivo), 0)
    into massimo
    from preventivi
   where user_id = utente and anno = p_anno;

  insert into contatori_preventivi (user_id, anno, ultimo_numero)
  values (utente, p_anno, massimo + 1)
  on conflict (user_id, anno) do update
    set ultimo_numero = greatest(contatori_preventivi.ultimo_numero, massimo) + 1
  returning ultimo_numero into nuovo_numero;

  return nuovo_numero;
end;
$$;

-- Solo gli utenti loggati possono chiamarla
revoke execute on function assegna_numero_preventivo(integer) from public, anon;
grant execute on function assegna_numero_preventivo(integer) to authenticated;