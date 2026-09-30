import { getDbConnection } from './db';

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
  numero_preventivo: number;
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
        telefono = ?, email = ?, indirizzo = ?, iban = ? 
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
        esistente.id!,
      ]
    );
  } else {
    await db.runAsync(
      `INSERT INTO profilo_fabbro 
        (nome_azienda, titolare, p_iva, codice_fiscale, telefono, email, indirizzo, iban)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        profilo.nome_azienda,
        profilo.titolare || '',
        profilo.p_iva || '',
        profilo.codice_fiscale || '',
        profilo.telefono || '',
        profilo.email || '',
        profilo.indirizzo || '',
        profilo.iban || '',
      ]
    );
  }
}

// --- CLIENTI ---
export async function getClienti(): Promise<Cliente[]> {
  const db = await getDbConnection();
  return await db.getAllAsync<Cliente>(
    'SELECT * FROM clienti ORDER BY nome ASC;'
  );
}

export async function getClienteById(id: string): Promise<Cliente | null> {
  const db = await getDbConnection();
  return await db.getFirstAsync<Cliente>(
    'SELECT * FROM clienti WHERE id = ?;',
    [id]
  );
}

export async function addCliente(
  cliente: Omit<Cliente, 'id'>
): Promise<string> {
  const db = await getDbConnection();
  const id = `CLI-${Date.now()}`;
  await db.runAsync(
    `INSERT INTO clienti (id, nome, telefono, email, indirizzo, note) VALUES (?, ?, ?, ?, ?, ?);`,
    [
      id,
      cliente.nome,
      cliente.telefono || '',
      cliente.email || '',
      cliente.indirizzo || '',
      cliente.note || '',
    ]
  );
  return id;
}

export async function updateCliente(
  id: string,
  cliente: Partial<Omit<Cliente, 'id'>>
): Promise<void> {
  const db = await getDbConnection();
  await db.runAsync(
    `UPDATE clienti SET nome = ?, telefono = ?, email = ?, indirizzo = ?, note = ? WHERE id = ?;`,
    [
      cliente.nome || '',
      cliente.telefono || '',
      cliente.email || '',
      cliente.indirizzo || '',
      cliente.note || '',
      id,
    ]
  );
}

export async function deleteCliente(id: string): Promise<void> {
  const db = await getDbConnection();
  await db.runAsync('DELETE FROM clienti WHERE id = ?;', [id]);
}

// --- PREVENTIVI ---

// Prossimo numero progressivo per l'anno indicato (1, 2, 3... ripartendo ogni anno)
export async function getProssimoNumeroPreventivo(
  anno: number = new Date().getFullYear()
): Promise<number> {
  const db = await getDbConnection();
  const ultimo = await db.getFirstAsync<{ max_num: number | null }>(
    'SELECT MAX(numero_preventivo) as max_num FROM preventivi WHERE anno = ?;',
    [anno]
  );
  return (ultimo?.max_num || 0) + 1;
}

export async function savePreventivoWithVoci(
  input: PreventivoInput
): Promise<string> {
  const db = await getDbConnection();
  const annoCorrente = new Date().getFullYear();

  // Calcolo del prossimo numero progressivo per l'anno corrente
  const prossimoNumero = await getProssimoNumeroPreventivo(annoCorrente);

  const preventivoId = `PREV-${annoCorrente}-${prossimoNumero}`;
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
        (id, cliente_id, numero_preventivo, anno, data_creazione, oggetto, stato, aliquota_iva, note_pagamento, totale_imponibile, totale_iva, totale_generale)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        preventivoId,
        input.cliente_id,
        prossimoNumero,
        annoCorrente,
        dataCreazione,
        input.oggetto || '',
        input.stato || 'bozza',
        aliquotaIva,
        input.note_pagamento || '',
        imponibile,
        totaleIva,
        totaleGenerale,
      ]
    );

    // Inserimento Dettaglio Voci
    for (const voce of vociCalcolate) {
      const voceId = `VOCE-${Math.random().toString(36).substring(2, 9)}`;
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

  return preventivoId;
}

export async function getPreventiviByClienteId(
  clienteId: string
): Promise<Preventivo[]> {
  const db = await getDbConnection();
  return await db.getAllAsync<Preventivo>(
    'SELECT * FROM preventivi WHERE cliente_id = ? ORDER BY data_creazione DESC;',
    [clienteId]
  );
}

export async function getAllPreventivi(): Promise<Preventivo[]> {
  const db = await getDbConnection();
  return await db.getAllAsync<Preventivo>(`
    SELECT p.*, c.nome as cliente_nome 
    FROM preventivi p
    JOIN clienti c ON p.cliente_id = c.id
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
     WHERE p.id = ?;`,
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
  await db.runAsync('UPDATE preventivi SET stato = ? WHERE id = ?;', [
    stato,
    id,
  ]);
}

export async function deletePreventivo(id: string): Promise<void> {
  const db = await getDbConnection();
  // Le voci verrebbero cancellate anche dal vincolo ON DELETE CASCADE:
  // le eliminiamo esplicitamente per non dipendere da PRAGMA foreign_keys.
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM voci_preventivo WHERE preventivo_id = ?;', [
      id,
    ]);
    await db.runAsync('DELETE FROM preventivi WHERE id = ?;', [id]);
  });
}
