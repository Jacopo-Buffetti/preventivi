import * as SQLite from 'expo-sqlite';

export const DB_NAME = 'preventivi_fabbro.db';

// Data e ora attuali in formato ISO (es. 2026-10-07T09:15:30.123Z).
// Da usare per updated_at in ogni scrittura: è lo stesso formato che la
// migrazione usa per le righe esistenti, così le date si confrontano bene.
export function adesso(): string {
  return new Date().toISOString();
}

// Un'unica connessione per tutta l'app.
// Salviamo la Promise (non il db) così anche due chiamate contemporanee
// ricevono la stessa connessione invece di aprirne due.
let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDbConnection(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = apriEInizializza().catch((err) => {
      // Se l'apertura fallisce, permettiamo di riprovare alla chiamata successiva
      dbPromise = null;
      throw err;
    });
  }
  return dbPromise;
}

// Mantenuto per compatibilità con _layout.tsx: ora apre e inizializza una volta sola
export function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  return getDbConnection();
}

async function apriEInizializza(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(DB_NAME);

  await db.execAsync('PRAGMA foreign_keys = ON;');

  // 1. Tabella Profilo Fabbro
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS profilo_fabbro (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome_azienda TEXT NOT NULL,
      titolare TEXT,
      p_iva TEXT,
      codice_fiscale TEXT,
      telefono TEXT,
      email TEXT,
      indirizzo TEXT,
      iban TEXT
    );
  `);

  // 2. Tabella Clienti (Rubrica Anagrafica)
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS clienti (
      id TEXT PRIMARY KEY NOT NULL,
      nome TEXT NOT NULL,
      telefono TEXT,
      email TEXT,
      indirizzo TEXT,
      note TEXT
    );
  `);

  // 3. Tabella Preventivi
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS preventivi (
      id TEXT PRIMARY KEY NOT NULL,
      cliente_id TEXT NOT NULL,
      numero_preventivo INTEGER,
      anno INTEGER NOT NULL,
      data_creazione TEXT NOT NULL,
      oggetto TEXT,
      stato TEXT NOT NULL DEFAULT 'bozza',
      aliquota_iva REAL NOT NULL DEFAULT 22,
      note_pagamento TEXT,
      totale_imponibile REAL NOT NULL DEFAULT 0,
      totale_iva REAL NOT NULL DEFAULT 0,
      totale_generale REAL NOT NULL DEFAULT 0,
      FOREIGN KEY (cliente_id) REFERENCES clienti (id) ON DELETE RESTRICT
    );
  `);

  // Migrazione: aggiunge "oggetto" ai database creati prima di questa colonna.
  // CREATE TABLE IF NOT EXISTS non modifica una tabella già esistente.
  await aggiungiColonnaSeManca(db, 'preventivi', 'oggetto', 'TEXT');

  // 4. Tabella Voci Preventivo
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS voci_preventivo (
      id TEXT PRIMARY KEY NOT NULL,
      preventivo_id TEXT NOT NULL,
      descrizione TEXT NOT NULL,
      quantita REAL NOT NULL DEFAULT 1,
      prezzo_unitario REAL NOT NULL DEFAULT 0,
      totale_voce REAL NOT NULL DEFAULT 0,
      FOREIGN KEY (preventivo_id) REFERENCES preventivi (id) ON DELETE CASCADE
    );
  `);

  // 5. Biglietto da visita (una sola riga, id = 1)
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS biglietto (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      logo TEXT,
      descrizione_fronte TEXT,
      nome TEXT,
      qualifica TEXT,
      descrizione_retro TEXT,
      indirizzo TEXT,
      telefono TEXT,
      cellulare TEXT,
      email TEXT,
      email_secondaria TEXT,
      p_iva TEXT,
      codice_fiscale TEXT,
      rea TEXT
    );
  `);

  // Migrazione: aggiunge "qualifica" ai biglietti creati prima di questa colonna
  await aggiungiColonnaSeManca(db, 'biglietto', 'qualifica', 'TEXT');

  // Migrazione per la sincronizzazione (vedi commento sotto)
  await aggiungiColonneSincronizzazione(db);

  // Migrazione: numero_preventivo facoltativo (le bozze non hanno numero)
  await rendiNumeroFacoltativo(db);

  // Migrazione: sconto di arrotondamento sul totale con IVA (in euro).
  // Va DOPO rendiNumeroFacoltativo: quella ricostruisce la tabella con un
  // elenco fisso di colonne e, se venisse prima, perderebbe questa.
  // Default 0 = nessun arrotondamento, quindi i preventivi vecchi non cambiano.
  await aggiungiColonnaSeManca(db, 'preventivi', 'sconto', 'REAL NOT NULL DEFAULT 0');

  // 6. Stato della sincronizzazione: piccola tabella "chiave → valore".
  // Contiene, per esempio:
  //   utente        → id dell'utente a cui appartengono i dati di questo dispositivo
  //   pull:clienti  → fino a quando abbiamo già scaricato i clienti dal server
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS sync_stato (
      chiave TEXT PRIMARY KEY NOT NULL,
      valore TEXT
    );
  `);

  console.log('Database aperto e tabelle pronte.');
  return db;
}

// --- MIGRAZIONI ---

// Aggiunge una colonna solo se la tabella non ce l'ha già.
// Serve perché SQLite non ha "ADD COLUMN IF NOT EXISTS": senza il controllo,
// al secondo avvio l'ALTER TABLE fallirebbe con "duplicate column name".
async function aggiungiColonnaSeManca(
  db: SQLite.SQLiteDatabase,
  tabella: string,
  colonna: string,
  definizione: string
): Promise<boolean> {
  const colonne = await db.getAllAsync<{ name: string }>(
    `PRAGMA table_info(${tabella});`
  );
  if (colonne.some((c) => c.name === colonna)) return false;

  await db.execAsync(
    `ALTER TABLE ${tabella} ADD COLUMN ${colonna} ${definizione};`
  );
  return true;
}

// Data e ora attuali nello stesso formato di new Date().toISOString(),
// es. 2026-10-07T09:15:30.123Z, così confronti e ordinamenti sono coerenti.
const ADESSO_SQL = "strftime('%Y-%m-%dT%H:%M:%fZ', 'now')";

// Colonne che servono alla sincronizzazione con Supabase:
//
// - updated_at       quando la riga è stata modificata l'ultima volta.
//                    Serve a decidere chi vince se la stessa riga è stata
//                    modificata su due dispositivi ("vince l'ultima modifica").
// - da_sincronizzare 1 = modificata qui e non ancora mandata al server.
//                    Il push legge solo le righe con 1 e, a invio riuscito,
//                    le rimette a 0.
// - deleted_at       quando la riga è stata cancellata (cancellazione "soft").
//                    Se cancellassimo davvero la riga, l'altro dispositivo non
//                    saprebbe mai che deve toglierla anche lui.
//
// Quali tabelle hanno cosa:
// - clienti e preventivi: tutte e tre.
// - profilo_fabbro e biglietto: solo updated_at e da_sincronizzare, perché
//   sono righe uniche che si modificano ma non si cancellano.
// - voci_preventivo: nessuna. Le voci viaggiano sempre insieme al loro
//   preventivo: quando cambia una voce si marca il preventivo, e il push
//   manda il preventivo con tutte le sue voci.
//
// Le righe già esistenti ricevono updated_at = adesso e da_sincronizzare = 1:
// al primo collegamento con Supabase verranno quindi caricate tutte.
async function aggiungiColonneSincronizzazione(db: SQLite.SQLiteDatabase) {
  const tabelle = [
    { nome: 'clienti', cancellabile: true },
    { nome: 'preventivi', cancellabile: true },
    { nome: 'profilo_fabbro', cancellabile: false },
    { nome: 'biglietto', cancellabile: false },
  ];

  for (const { nome, cancellabile } of tabelle) {
    // SQLite non accetta un default "dinamico" (come l'ora attuale) in
    // ALTER TABLE: aggiungiamo la colonna vuota e la riempiamo subito dopo.
    const aggiunta = await aggiungiColonnaSeManca(db, nome, 'updated_at', 'TEXT');
    if (aggiunta) {
      await db.execAsync(
        `UPDATE ${nome} SET updated_at = ${ADESSO_SQL} WHERE updated_at IS NULL;`
      );
    }

    // Default 1: anche le righe esistenti risultano "da sincronizzare"
    await aggiungiColonnaSeManca(
      db,
      nome,
      'da_sincronizzare',
      'INTEGER NOT NULL DEFAULT 1'
    );

    if (cancellabile) {
      // NULL = riga attiva; una data = riga cancellata
      await aggiungiColonnaSeManca(db, nome, 'deleted_at', 'TEXT');
    }
  }
}

// Le bozze non hanno ancora un numero: lo ricevono dal server al primo
// invio (strategia B). Serve quindi che numero_preventivo accetti NULL.
//
// SQLite non permette di togliere un NOT NULL da una colonna esistente.
// L'unico modo è la procedura ufficiale di "ricostruzione":
//   1. creare una tabella nuova con la struttura giusta
//   2. copiarci tutti i dati
//   3. eliminare la tabella vecchia
//   4. rinominare la nuova con il nome della vecchia
//
// Attenzione al punto 3: voci_preventivo ha una chiave esterna verso
// preventivi con ON DELETE CASCADE. Con le chiavi esterne attive,
// eliminare la tabella preventivi cancellerebbe anche TUTTE le voci.
// Per questo le disattiviamo durante la ricostruzione (va fatto fuori
// dalla transazione: dentro una transazione SQLite ignora il comando).
async function rendiNumeroFacoltativo(db: SQLite.SQLiteDatabase) {
  const colonne = await db.getAllAsync<{ name: string; notnull: number }>(
    'PRAGMA table_info(preventivi);'
  );
  const numero = colonne.find((c) => c.name === 'numero_preventivo');
  // Già facoltativo (database nuovo o migrazione già fatta): niente da fare
  if (!numero || numero.notnull === 0) return;

  const elenco = `id, cliente_id, numero_preventivo, anno, data_creazione, oggetto, stato,
    aliquota_iva, note_pagamento, totale_imponibile, totale_iva, totale_generale,
    updated_at, da_sincronizzare, deleted_at`;

  await db.execAsync('PRAGMA foreign_keys = OFF;');
  try {
    await db.withTransactionAsync(async () => {
      await db.execAsync(`
        CREATE TABLE preventivi_nuova (
          id TEXT PRIMARY KEY NOT NULL,
          cliente_id TEXT NOT NULL,
          numero_preventivo INTEGER,
          anno INTEGER NOT NULL,
          data_creazione TEXT NOT NULL,
          oggetto TEXT,
          stato TEXT NOT NULL DEFAULT 'bozza',
          aliquota_iva REAL NOT NULL DEFAULT 22,
          note_pagamento TEXT,
          totale_imponibile REAL NOT NULL DEFAULT 0,
          totale_iva REAL NOT NULL DEFAULT 0,
          totale_generale REAL NOT NULL DEFAULT 0,
          updated_at TEXT,
          da_sincronizzare INTEGER NOT NULL DEFAULT 1,
          deleted_at TEXT,
          FOREIGN KEY (cliente_id) REFERENCES clienti (id) ON DELETE RESTRICT
        );
        INSERT INTO preventivi_nuova (${elenco}) SELECT ${elenco} FROM preventivi;
        DROP TABLE preventivi;
        ALTER TABLE preventivi_nuova RENAME TO preventivi;
      `);
    });
  } finally {
    await db.execAsync('PRAGMA foreign_keys = ON;');
  }
}
