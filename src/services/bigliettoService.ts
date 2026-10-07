import { adesso, getDbConnection } from './db';
import { segnalaModificaLocale } from './eventiSync';

export interface Biglietto {
  logo?: string; // immagine come data URI (data:image/...;base64,...)
  descrizione_fronte?: string;
  nome?: string;
  qualifica?: string; // solo per il contatto vCard, non compare sul biglietto
  descrizione_retro?: string;
  indirizzo?: string;
  telefono?: string;
  cellulare?: string;
  email?: string;
  email_secondaria?: string;
  p_iva?: string;
  codice_fiscale?: string;
  rea?: string;
}

// Campi che il biglietto deve avere per poter essere esportato
export const CAMPI_OBBLIGATORI: { campo: keyof Biglietto; etichetta: string }[] = [
  { campo: 'nome', etichetta: 'Nome attività' },
  { campo: 'indirizzo', etichetta: 'Indirizzo' },
  { campo: 'telefono', etichetta: 'Telefono' },
  { campo: 'email', etichetta: 'Email' },
];

export function campiMancanti(b: Biglietto): string[] {
  return CAMPI_OBBLIGATORI.filter(({ campo }) => !String(b[campo] ?? '').trim()).map(
    ({ etichetta }) => etichetta
  );
}

export async function getBiglietto(): Promise<Biglietto | null> {
  const db = await getDbConnection();
  const riga = await db.getFirstAsync<
    Biglietto & { id: number; updated_at?: string; da_sincronizzare?: number }
  >(
    'SELECT * FROM biglietto WHERE id = 1;'
  );
  if (!riga) return null;
  // Togliamo i campi tecnici: alle schermate interessano solo i dati del biglietto
  const { id: _id, updated_at: _u, da_sincronizzare: _d, ...biglietto } = riga;
  return biglietto;
}

export async function saveBiglietto(b: Biglietto): Promise<void> {
  const db = await getDbConnection();
  await db.runAsync(
    `INSERT OR REPLACE INTO biglietto
      (id, logo, descrizione_fronte, nome, qualifica, descrizione_retro, indirizzo,
       telefono, cellulare, email, email_secondaria, p_iva, codice_fiscale, rea,
       updated_at, da_sincronizzare)
     VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1);`,
    [
      b.logo ?? null,
      b.descrizione_fronte?.trim() ?? null,
      b.nome?.trim() ?? null,
      b.qualifica?.trim() ?? null,
      b.descrizione_retro?.trim() ?? null,
      b.indirizzo?.trim() ?? null,
      b.telefono?.trim() ?? null,
      b.cellulare?.trim() ?? null,
      b.email?.trim() ?? null,
      b.email_secondaria?.trim() ?? null,
      b.p_iva?.trim() ?? null,
      b.codice_fiscale?.trim() ?? null,
      b.rea?.trim() ?? null,
      adesso(),
    ]
  );
  segnalaModificaLocale();
}
