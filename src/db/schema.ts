import * as SQLite from 'expo-sqlite';

// Nome del database locale
export const DB_NAME = 'preventivi_fabbro.db';

export async function initDatabase() {
  const db = await SQLite.openDatabaseAsync(DB_NAME);

  // Creazione tabella Profilo Fabbro (Biglietto da Visita)
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

  // Creazione tabella Preventivi
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS preventivi (
      id TEXT PRIMARY KEY NOT NULL,
      cliente_nome TEXT NOT NULL,
      cliente_telefono TEXT,
      cliente_indirizzo TEXT,
      descrizione TEXT,
      data_creazione TEXT NOT NULL,
      stato TEXT DEFAULT 'bozza', -- 'bozza', 'inviato', 'accettato', 'rifiutato'
      totale REAL DEFAULT 0
    );
  `);

  // Creazione tabella Voci Preventivo (Dettagli materiali e manodopera)
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS voci_preventivo (
      id TEXT PRIMARY KEY NOT NULL,
      preventivo_id TEXT NOT NULL,
      descrizione TEXT NOT NULL,
      quantita REAL NOT NULL DEFAULT 1,
      prezzo_unitario REAL NOT NULL DEFAULT 0,
      totale REAL NOT NULL DEFAULT 0,
      FOREIGN KEY (preventivo_id) REFERENCES preventivi (id) ON DELETE CASCADE
    );
  `);

  console.log('Database e tabelle inizializzati correttamente');
  return db;
}
