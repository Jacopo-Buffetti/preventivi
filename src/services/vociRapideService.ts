import { adesso, getDbConnection } from './db';
import { segnalaModificaLocale } from './eventiSync';
import { nuovoId } from './id';

// =====================================================================
// VOCI RAPIDE
// =====================================================================
// Le voci che l'utente aggiunge più spesso ai preventivi, con il suo
// prezzo. Le crea, modifica, riordina e cancella dal Profilo; compaiono
// nel foglio "Aggiungi una voce" del preventivo.
//
// Non ce ne sono di predefinite: ognuno parte dall'elenco vuoto e si
// crea le voci del suo mestiere.
//
// Come i clienti: ogni modifica segna da_sincronizzare = 1 e la
// cancellazione è "soft" (deleted_at), così arriva anche agli altri
// dispositivi. Una voce cancellata non tocca i preventivi già fatti:
// lì la voce è copiata, non collegata.
// =====================================================================

export interface VoceRapida {
  id: string;
  descrizione: string;
  prezzo: number;
  quantita: number; // quantità proposta quando si sceglie la voce
  unita: string | null; // id da constants/unita.ts
  posizione: number;
}

export type VoceRapidaInput = Omit<VoceRapida, 'id' | 'posizione'>;

// Le voci attive, nell'ordine scelto dall'utente
export async function getVociRapide(): Promise<VoceRapida[]> {
  const db = await getDbConnection();
  return db.getAllAsync<VoceRapida>(
    `SELECT id, descrizione, prezzo, quantita, unita, posizione
     FROM voci_rapide
     WHERE deleted_at IS NULL
     ORDER BY posizione, rowid;`
  );
}

// Una voce nuova va in fondo all'elenco
export async function creaVoceRapida(input: VoceRapidaInput): Promise<string> {
  const db = await getDbConnection();
  const ultima = await db.getFirstAsync<{ massimo: number | null }>(
    'SELECT MAX(posizione) AS massimo FROM voci_rapide WHERE deleted_at IS NULL;'
  );
  const id = nuovoId();
  await db.runAsync(
    `INSERT INTO voci_rapide
       (id, descrizione, prezzo, quantita, unita, posizione, updated_at, da_sincronizzare)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1);`,
    [
      id,
      input.descrizione.trim(),
      input.prezzo,
      input.quantita,
      input.unita,
      (ultima?.massimo ?? -1) + 1,
      adesso(),
    ]
  );
  segnalaModificaLocale();
  return id;
}

export async function aggiornaVoceRapida(
  id: string,
  input: VoceRapidaInput
): Promise<void> {
  const db = await getDbConnection();
  await db.runAsync(
    `UPDATE voci_rapide
     SET descrizione = ?, prezzo = ?, quantita = ?, unita = ?,
         updated_at = ?, da_sincronizzare = 1
     WHERE id = ?;`,
    [
      input.descrizione.trim(),
      input.prezzo,
      input.quantita,
      input.unita,
      adesso(),
      id,
    ]
  );
  segnalaModificaLocale();
}

export async function eliminaVoceRapida(id: string): Promise<void> {
  const db = await getDbConnection();
  const ora = adesso();
  await db.runAsync(
    `UPDATE voci_rapide
     SET deleted_at = ?, updated_at = ?, da_sincronizzare = 1
     WHERE id = ?;`,
    [ora, ora, id]
  );
  segnalaModificaLocale();
}

// Salva il nuovo ordine dopo un trascinamento: ids è l'elenco completo,
// dalla prima all'ultima. Si toccano solo le voci che si sono spostate,
// così si sincronizza il minimo indispensabile.
export async function riordinaVociRapide(ids: string[]): Promise<void> {
  const db = await getDbConnection();
  const ora = adesso();
  let cambiate = 0;
  await db.withTransactionAsync(async () => {
    for (let i = 0; i < ids.length; i++) {
      const r = await db.runAsync(
        `UPDATE voci_rapide
         SET posizione = ?, updated_at = ?, da_sincronizzare = 1
         WHERE id = ? AND posizione != ?;`,
        [i, ora, ids[i], i]
      );
      cambiate += r.changes;
    }
  });
  if (cambiate > 0) segnalaModificaLocale();
}

// C'è già una voce rapida con questa descrizione? (maiuscole e spazi
// non contano). Serve a non creare doppioni con "Salva tra le voci rapide".
export async function esisteVoceRapida(descrizione: string): Promise<boolean> {
  const db = await getDbConnection();
  const riga = await db.getFirstAsync<{ n: number }>(
    `SELECT COUNT(*) AS n FROM voci_rapide
     WHERE deleted_at IS NULL AND LOWER(TRIM(descrizione)) = LOWER(TRIM(?));`,
    [descrizione]
  );
  return (riga?.n ?? 0) > 0;
}
