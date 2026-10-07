-- =====================================================================
-- Migrazione 002: "vince l'ultima modifica", controllato dal server
-- Da eseguire una volta nel SQL Editor, dopo schema.sql.
-- =====================================================================
--
-- Il problema: telefono e tablet modificano lo stesso cliente mentre sono
-- offline. Il tablet lo modifica DOPO, ma il telefono si collega per
-- ultimo e fa il push: senza controlli, la versione più vecchia (quella
-- del telefono) sovrascriverebbe quella più nuova.
--
-- La soluzione: prima di ogni UPDATE il server confronta updated_at.
-- Se la versione in arrivo è più vecchia di quella già salvata, la
-- scarta in silenzio ("return null" = non fare questo aggiornamento).
-- Il telefono riceverà poi la versione più nuova con il pull.
--
-- Così la regola vale sempre, in qualunque ordine arrivino i push.

create or replace function scarta_modifiche_vecchie()
returns trigger
language plpgsql
as $$
begin
  if new.updated_at < old.updated_at then
    return null;
  end if;
  return new;
end;
$$;

-- Solo "before update": un INSERT è sempre una riga nuova, non c'è
-- niente con cui confrontarlo.
create or replace trigger clienti_scarta_vecchie
  before update on clienti
  for each row execute function scarta_modifiche_vecchie();

create or replace trigger preventivi_scarta_vecchie
  before update on preventivi
  for each row execute function scarta_modifiche_vecchie();

create or replace trigger profilo_scarta_vecchie
  before update on profilo
  for each row execute function scarta_modifiche_vecchie();

create or replace trigger biglietto_scarta_vecchie
  before update on biglietto
  for each row execute function scarta_modifiche_vecchie();