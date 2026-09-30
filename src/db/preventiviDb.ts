import * as SQLite from 'expo-sqlite';
import { DB_NAME } from './schema';

export interface Preventivo {
  id: string;
  cliente_nome: string;
  cliente_telefono?: string;
  cliente_indirizzo?: string;
  descrizione?: string;
  data_creazione: string;
  stato: 'bozza' | 'inviato' | 'accettato' | 'rifiutato';
  totale: number;
}

export interface VocePreventivo {
  id: string;
  preventivo_id: string;
  descrizione: string;
  quantita: number;
  prezzo_unitario: number;
  totale: number;
}

// Inserisce un nuovo preventivo con le sue voci
export async function inserisciPreventivo(
  preventivo: Omit<Preventivo, 'id' | 'data_creazione'>,
  voci: Omit<VocePreventivo, 'id' | 'preventivo_id' | 'totale'>[]
) {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  const idPreventivo = `PREV-${Date.now()}`;
  const dataCreazione = new Date().toISOString();

  let totalePreventivo = 0;

  // Inserimento Preventivo
  await db.runAsync(
    `INSERT INTO preventivi (id, cliente_nome, cliente_telefono, cliente_indirizzo, descrizione, data_creazione, stato, totale)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      idPreventivo,
      preventivo.cliente_nome,
      preventivo.cliente_telefono || '',
      preventivo.cliente_indirizzo || '',
      preventivo.descrizione || '',
      dataCreazione,
      preventivo.stato || 'bozza',
      0,
    ]
  );

  // Inserimento Voci
  for (const voce of voci) {
    const idVoce = `VOCE-${Math.random().toString(36).substr(2, 9)}`;
    const totaleVoce = voce.quantita * voce.prezzo_unitario;
    totalePreventivo += totaleVoce;

    await db.runAsync(
      `INSERT INTO voci_preventivo (id, preventivo_id, descrizione, quantita, prezzo_unitario, totale)
       VALUES (?, ?, ?, ?, ?, ?);`,
      [
        idVoce,
        idPreventivo,
        voce.descrizione,
        voce.quantita,
        voce.prezzo_unitario,
        totaleVoce,
      ]
    );
  }

  // Aggiornamento Totale Preventivo
  await db.runAsync(`UPDATE preventivi SET totale = ? WHERE id = ?;`, [
    totalePreventivo,
    idPreventivo,
  ]);

  return idPreventivo;
}

// Recupera tutti i preventivi
export async function getPreventivi(): Promise<Preventivo[]> {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  return await db.getAllAsync<Preventivo>(
    `SELECT * FROM preventivi ORDER BY data_creazione DESC;`
  );
}

// Elimina un preventivo e le sue voci
export async function eliminaPreventivo(id: string) {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  await db.runAsync(`DELETE FROM voci_preventivo WHERE preventivo_id = ?;`, [
    id,
  ]);
  await db.runAsync(`DELETE FROM preventivi WHERE id = ?;`, [id]);
}
