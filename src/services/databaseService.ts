import { adesso, getDbConnection } from './db';
import { segnalaModificaLocale } from './eventiSync';
import { nuovoId } from './id';

// --- INTERFACCE ---
export interface ProfiloFabbro {
  id?: number;
  nome_azienda: string;
  titolare?: string;
  p_iva?: string;
  codice_fiscale?: string;
  telefono?: string;
  email?: string;
  indirizzo?: string;
  iban?: string;
}

export interface Cliente {
  id: string;
  nome: string;
  telefono?: string;
  email?: string;
  indirizzo?: string;
  note?: string;
}

export interface VocePreventivoInput {
  descrizione: string;
  quantita: number;
  prezzo_unitario: number;
}

export type StatoPreventivo = 'bozza' | 'inviato' | 'accettato' | 'rifiutato';

export interface PreventivoInput {
  cliente_id: string;
  oggetto?: string;
  aliquota_iva?: number;
  note_pagamento?: string;
  stato?: StatoPreventivo;
  voci: VocePreventivoInput[];
}

export interface Preventivo {
  id: string;
  cliente_id: string;
  cliente_nome?: string;
  cliente_telefono?: string; // per ricontattare il cliente dalla Home
  numero_preventivo: number | null; // null = bozza, numero non ancora assegnato
  anno: number;
  data_creazione: string;
  oggetto?: string;
  stato: StatoPreventivo;
  aliquota_iva: number;
  note_pagamento?: string;
  totale_imponibile: number;
  totale_iva: number;
  totale_generale: number;
}

export interface VocePreventivo {
  id: string;
  preventivo_id: string;
  descrizione: string;
  quantita: number;
  prezzo_unitario: number;
  totale_voce: number;
}

// Preventivo con i dati del cliente, usato per il dettaglio e per il PDF
export interface PreventivoConCliente extends Preventivo {
  cliente_indirizzo?: string;
  cliente_email?: string;
  cliente_telefono?: string;
}

// --- PROFILO FABBRO ---
export async function getProfiloFabbro(): Promise<ProfiloFabbro | null> {
  const db = await getDbConnection();
  return await db.getFirstAsync<ProfiloFabbro>(
    'SELECT * FROM profilo_fabbro LIMIT 1;'
  );
}

export async function updateProfiloFabbro(
  profilo: ProfiloFabbro
): Promise<void> {
  const db = await getDbConnection();
  const esistente = await getProfiloFabbro();

  if (esistente) {
    await db.runAsync(
      `UPDATE profilo_fabbro SET 
        nome_azienda = ?, titolare = ?, p_iva = ?, codice_fiscale = ?, 
        telefono = ?, email = ?, indirizzo = ?, iban = ?,
        updated_at = ?, da_sincronizzare = 1
       WHERE id = ?;`,
      [
        profilo.nome_azienda,
        profilo.titolare || '',
        profilo.p_iva || '',
        profilo.codice_fiscale || '',
        profilo.telefono || '',
        profilo.email || '',
        profilo.indirizzo || '',
        profilo.iban || '',
        adesso(),
        esistente.id!,
      ]
    );
  } else {
    await db.runAsync(
      `INSERT INTO profilo_fabbro 
        (nome_azienda, titolare, p_iva, codice_fiscale, telefono, email, indirizzo, iban,
         updated_at, da_sincronizzare)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1);`,
      [
        profilo.nome_azienda,
        profilo.titolare || '',
        profilo.p_iva || '',
        profilo.codice_fiscale || '',
        profilo.telefono || '',
        profilo.email || '',
        profilo.indirizzo || '',
        profilo.iban || '',
        adesso(),
      ]
    );
  }
  segnalaModificaLocale();
}

// --- CLIENTI ---
export async function getClienti(): Promise<Cliente[]> {
  const db = await getDbConnection();
  return await db.getAllAsync<Cliente>(
    'SELECT * FROM clienti WHERE deleted_at IS NULL ORDER BY nome ASC;'
  );
}

export async function getClienteById(id: string): Promise<Cliente | null> {
  const db = await getDbConnection();
  return await db.getFirstAsync<Cliente>(
    'SELECT * FROM clienti WHERE id = ? AND deleted_at IS NULL;',
    [id]
  );
}

export async function addCliente(
  cliente: Omit<Cliente, 'id'>
): Promise<string> {
  const db = await getDbConnection();
  const id = nuovoId();
  await db.runAsync(
    `INSERT INTO clienti (id, nome, telefono, email, indirizzo, note, updated_at, da_sincronizzare)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1);`,
    [
      id,
      cliente.nome,
      cliente.telefono || '',
      cliente.email || '',
      cliente.indirizzo || '',
      cliente.note || '',
      adesso(),
    ]
  );
  segnalaModificaLocale();
  return id;
}

export async function updateCliente(
  id: string,
  cliente: Partial<Omit<Cliente, 'id'>>
): Promise<void> {
  const db = await getDbConnection();
  await db.runAsync(
    `UPDATE clienti
     SET nome = ?, telefono = ?, email = ?, indirizzo = ?, note = ?,
         updated_at = ?, da_sincronizzare = 1
     WHERE id = ?;`,
    [
      cliente.nome || '',
      cliente.telefono || '',
      cliente.email || '',
      cliente.indirizzo || '',
      cliente.note || '',
      adesso(),
      id,
    ]
  );
  segnalaModificaLocale();
}

// Cancellazione "soft": la riga resta, con la data di cancellazione.
// Così il dispositivo che sincronizza dopo scopre che il cliente va tolto.
//
// Prima il blocco "cliente con preventivi" lo faceva il database con
// ON DELETE RESTRICT; con un UPDATE quel vincolo non scatta più, quindi
// il controllo lo facciamo qui. La schermata lo verifica già, questo è
// una sicurezza in più se un domani la funzione viene chiamata altrove.
export async function deleteCliente(id: string): Promise<void> {
  const db = await getDbConnection();

  const conPreventivi = await db.getFirstAsync<{ n: number }>(
    'SELECT COUNT(*) AS n FROM preventivi WHERE cliente_id = ? AND deleted_at IS NULL;',
    [id]
  );
  if ((conPreventivi?.n ?? 0) > 0) {
    throw new Error('Il cliente ha ancora dei preventivi: eliminali prima.');
  }

  const ora = adesso();
  await db.runAsync(
    `UPDATE clienti
     SET deleted_at = ?, updated_at = ?, da_sincronizzare = 1
     WHERE id = ?;`,
    [ora, ora, id]
  );
  segnalaModificaLocale();
}

// --- PREVENTIVI ---

export async function savePreventivoWithVoci(
  input: PreventivoInput
): Promise<string> {
  const db = await getDbConnection();
  const annoCorrente = new Date().getFullYear();

  // Il preventivo nasce come bozza SENZA numero: il numero progressivo lo
  // assegna il server al primo invio (assegnaNumero in syncService.ts).
  // Così due dispositivi offline non possono mai darsi lo stesso numero.
  // L'ID invece è un UUID, unico da subito anche offline.
  const preventivoId = nuovoId();
  const dataCreazione = new Date().toISOString();
  const aliquotaIva = input.aliquota_iva ?? 22;

  // Calcolo Totali
  let imponibile = 0;
  const vociCalcolate = input.voci.map((v) => {
    const totaleVoce = v.quantita * v.prezzo_unitario;
    imponibile += totaleVoce;
    return { ...v, totaleVoce };
  });

  const totaleIva = (imponibile * aliquotaIva) / 100;
  const totaleGenerale = imponibile + totaleIva;

  // Esecuzione in TRANSAZIONE Atomica
  await db.withTransactionAsync(async () => {
    // Inserimento Testata
    await db.runAsync(
      `INSERT INTO preventivi 
        (id, cliente_id, numero_preventivo, anno, data_creazione, oggetto, stato, aliquota_iva, note_pagamento, totale_imponibile, totale_iva, totale_generale,
         updated_at, da_sincronizzare)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1);`,
      [
        preventivoId,
        input.cliente_id,
        null, // numero: assegnato dal server al primo invio
        annoCorrente,
        dataCreazione,
        input.oggetto || '',
        input.stato || 'bozza',
        aliquotaIva,
        input.note_pagamento || '',
        imponibile,
        totaleIva,
        totaleGenerale,
        dataCreazione,
      ]
    );

    // Inserimento Dettaglio Voci
    for (const voce of vociCalcolate) {
      const voceId = nuovoId();
      await db.runAsync(
        `INSERT INTO voci_preventivo (id, preventivo_id, descrizione, quantita, prezzo_unitario, totale_voce)
         VALUES (?, ?, ?, ?, ?, ?);`,
        [
          voceId,
          preventivoId,
          voce.descrizione,
          voce.quantita,
          voce.prezzo_unitario,
          voce.totaleVoce,
        ]
      );
    }
  });

  segnalaModificaLocale();
  return preventivoId;
}

export async function getPreventiviByClienteId(
  clienteId: string
): Promise<Preventivo[]> {
  const db = await getDbConnection();
  return await db.getAllAsync<Preventivo>(
    `SELECT * FROM preventivi
     WHERE cliente_id = ? AND deleted_at IS NULL
     ORDER BY data_creazione DESC;`,
    [clienteId]
  );
}

export async function getAllPreventivi(): Promise<Preventivo[]> {
  const db = await getDbConnection();
  return await db.getAllAsync<Preventivo>(`
    SELECT p.*, c.nome as cliente_nome, c.telefono as cliente_telefono
    FROM preventivi p
    JOIN clienti c ON p.cliente_id = c.id
    WHERE p.deleted_at IS NULL
    ORDER BY p.data_creazione DESC;
  `);
}

export async function getPreventivoById(
  id: string
): Promise<PreventivoConCliente | null> {
  const db = await getDbConnection();
  return await db.getFirstAsync<PreventivoConCliente>(
    `SELECT p.*,
            c.nome AS cliente_nome,
            c.indirizzo AS cliente_indirizzo,
            c.email AS cliente_email,
            c.telefono AS cliente_telefono
     FROM preventivi p
     LEFT JOIN clienti c ON p.cliente_id = c.id
     WHERE p.id = ? AND p.deleted_at IS NULL;`,
    [id]
  );
}

export async function getVociByPreventivoId(
  preventivoId: string
): Promise<VocePreventivo[]> {
  const db = await getDbConnection();
  // rowid mantiene l'ordine di inserimento delle voci
  return await db.getAllAsync<VocePreventivo>(
    'SELECT * FROM voci_preventivo WHERE preventivo_id = ? ORDER BY rowid ASC;',
    [preventivoId]
  );
}

export async function updateStatoPreventivo(
  id: string,
  stato: StatoPreventivo
): Promise<void> {
  const db = await getDbConnection();
  await db.runAsync(
    `UPDATE preventivi
     SET stato = ?, updated_at = ?, da_sincronizzare = 1
     WHERE id = ?;`,
    [stato, adesso(), id]
  );
  segnalaModificaLocale();
}

// Cancellazione "soft" del preventivo.
// Le voci restano nel database ma non si vedono più: si leggono sempre
// passando dal preventivo, che ora risulta cancellato.
export async function deletePreventivo(id: string): Promise<void> {
  const db = await getDbConnection();
  const ora = adesso();
  await db.runAsync(
    `UPDATE preventivi
     SET deleted_at = ?, updated_at = ?, da_sincronizzare = 1
     WHERE id = ?;`,
    [ora, ora, id]
  );
  segnalaModificaLocale();
}
