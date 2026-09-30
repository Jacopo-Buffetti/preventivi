import * as SQLite from 'expo-sqlite';
import { DB_NAME } from './schema';

export interface ProfiloFabbro {
  id?: number;
  nome_azienda: string;
  titolare: string;
  p_iva: string;
  codice_fiscale: string;
  telefono: string;
  email: string;
  indirizzo: string;
  iban: string;
}

export async function salvaProfilo(profilo: ProfiloFabbro) {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  const esistente = await db.getFirstAsync<ProfiloFabbro>(
    `SELECT * FROM profilo_fabbro LIMIT 1;`
  );

  if (esistente) {
    await db.runAsync(
      `UPDATE profilo_fabbro SET nome_azienda=?, titolare=?, p_iva=?, codice_fiscale=?, telefono=?, email=?, indirizzo=?, iban=? WHERE id=?;`,
      [
        profilo.nome_azienda,
        profilo.titolare,
        profilo.p_iva,
        profilo.codice_fiscale,
        profilo.telefono,
        profilo.email,
        profilo.indirizzo,
        profilo.iban,
        esistente.id!,
      ]
    );
  } else {
    await db.runAsync(
      `INSERT INTO profilo_fabbro (nome_azienda, titolare, p_iva, codice_fiscale, telefono, email, indirizzo, iban)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        profilo.nome_azienda,
        profilo.titolare,
        profilo.p_iva,
        profilo.codice_fiscale,
        profilo.telefono,
        profilo.email,
        profilo.indirizzo,
        profilo.iban,
      ]
    );
  }
}

export async function getProfilo(): Promise<ProfiloFabbro | null> {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  return await db.getFirstAsync<ProfiloFabbro>(
    `SELECT * FROM profilo_fabbro LIMIT 1;`
  );
}
