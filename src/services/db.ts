import * as SQLite from 'expo-sqlite';

export const DB_NAME = 'preventivi_fabbro.db';

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
      numero_preventivo INTEGER NOT NULL,
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
  const colonnePreventivi = await db.getAllAsync<{ name: string }>(
    'PRAGMA table_info(preventivi);'
  );
  if (!colonnePreventivi.some((c) => c.name === 'oggetto')) {
    await db.execAsync('ALTER TABLE preventivi ADD COLUMN oggetto TEXT;');
  }

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
  const colonneBiglietto = await db.getAllAsync<{ name: string }>(
    'PRAGMA table_info(biglietto);'
  );
  if (!colonneBiglietto.some((c) => c.name === 'qualifica')) {
    await db.execAsync('ALTER TABLE biglietto ADD COLUMN qualifica TEXT;');
  }

  console.log('Database aperto e tabelle pronte.');
  return db;
}
