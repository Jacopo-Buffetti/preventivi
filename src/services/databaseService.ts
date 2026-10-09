import { adesso, getDbConnection } from './db';
import { ALIQUOTA_IVA_PREDEFINITA } from '../constants/fisco';
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
  // Immagini come data URI (data:image/png;base64,...): finiscono nel PDF
  // nello spazio "Firma per conferma", la firma sopra il timbro
  firma?: string | null;
  timbro?: string | null;
  // Impostazioni dei preventivi nuovi (vedi constants/fisco.ts).
  // Non le tocca updateProfiloFabbro: si salvano da sole, dal Profilo.
  aliquota_iva?: number;
  marca_bollo?: number; // 1 = sì, 0 = no
}

export interface ImpostazioniPreventivi {
  aliquota_iva: number;
  marca_bollo: boolean;
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
  unita?: string | null; // id da constants/unita.ts, null = nessuna
  prezzo_unitario: number;
}

export type StatoPreventivo = 'bozza' | 'inviato' | 'accettato' | 'rifiutato';

export interface PreventivoInput {
  cliente_id: string;
  oggetto?: string;
  aliquota_iva?: number;
  note_pagamento?: string;
  // Sconto di arrotondamento in euro, tolto dal totale con IVA (0 = nessuno)
  sconto?: number;
  // Marca da bollo in euro, aggiunta al totale (0 = nessuna)
  marca_bollo?: number;
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
  sconto: number; // arrotondamento in euro, già tolto da totale_generale
  marca_bollo: number; // marca da bollo in euro, già compresa nel totale
  // totale da pagare: imponibile + IVA - sconto + marca da bollo
  totale_generale: number;
  // Copia firmata dal cliente (vedi firmatiService.ts)
  firmato_file: string | null;
  firmato_tipo: string | null;
  firmato_at: string | null;
  firmato_da_caricare?: number;
}

export interface VocePreventivo {
  id: string;
  preventivo_id: string;
  descrizione: string;
  quantita: number;
  unita: string | null;
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
        firma = ?, timbro = ?,
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
        profilo.firma ?? null,
        profilo.timbro ?? null,
        adesso(),
        esistente.id!,
      ]
    );
  } else {
    await db.runAsync(
      `INSERT INTO profilo_fabbro 
        (nome_azienda, titolare, p_iva, codice_fiscale, telefono, email, indirizzo, iban,
         firma, timbro, updated_at, da_sincronizzare)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1);`,
      [
        profilo.nome_azienda,
        profilo.titolare || '',
        profilo.p_iva || '',
        profilo.codice_fiscale || '',
        profilo.telefono || '',
        profilo.email || '',
        profilo.indirizzo || '',
        profilo.iban || '',
        profilo.firma ?? null,
        profilo.timbro ?? null,
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

// Marca da bollo: mai negativa, arrotondata al centesimo
export function bolloValido(bollo: number | undefined): number {
  if (!bollo || !Number.isFinite(bollo) || bollo <= 0) return 0;
  return Math.round(bollo * 100) / 100;
}

// --- IMPOSTAZIONI DEI PREVENTIVI (aliquota IVA e marca da bollo) ---

export async function getImpostazioniPreventivi(): Promise<ImpostazioniPreventivi> {
  const profilo = await getProfiloFabbro();
  return {
    aliquota_iva: profilo?.aliquota_iva ?? ALIQUOTA_IVA_PREDEFINITA,
    marca_bollo: profilo?.marca_bollo === 1,
  };
}

// Salva subito, senza passare dal pulsante "Salva i dati" del profilo.
// Se il profilo non c'è ancora, lo crea vuoto (il nome dell'attività si
// completa poi nel form).
export async function aggiornaImpostazioniPreventivi(
  impostazioni: ImpostazioniPreventivi
): Promise<void> {
  const db = await getDbConnection();
  const esistente = await getProfiloFabbro();
  const valori = [
    impostazioni.aliquota_iva,
    impostazioni.marca_bollo ? 1 : 0,
    adesso(),
  ];
  if (esistente) {
    await db.runAsync(
      `UPDATE profilo_fabbro
       SET aliquota_iva = ?, marca_bollo = ?, updated_at = ?, da_sincronizzare = 1
       WHERE id = ?;`,
      [...valori, esistente.id!]
    );
  } else {
    await db.runAsync(
      `INSERT INTO profilo_fabbro
         (nome_azienda, aliquota_iva, marca_bollo, updated_at, da_sincronizzare)
       VALUES ('', ?, ?, ?, 1);`,
      valori
    );
  }
  segnalaModificaLocale();
}

// Lo sconto di arrotondamento: arrotondato al centesimo, mai negativo e mai
// più grande del totale con IVA. Un valore assurdo diventa 0.
export function scontoValido(
  sconto: number | undefined,
  totaleConIva: number
): number {
  if (!sconto || !Number.isFinite(sconto) || sconto <= 0) return 0;
  if (sconto >= totaleConIva) return 0;
  return Math.round(sconto * 100) / 100;
}

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
  const sconto = scontoValido(input.sconto, imponibile + totaleIva);
  const bollo = bolloValido(input.marca_bollo);
  // Il bollo si aggiunge DOPO l'arrotondamento: è una spesa a parte,
  // non fa parte del prezzo del lavoro
  const totaleGenerale = imponibile + totaleIva - sconto + bollo;

  // Esecuzione in TRANSAZIONE Atomica
  await db.withTransactionAsync(async () => {
    // Inserimento Testata
    await db.runAsync(
      `INSERT INTO preventivi 
        (id, cliente_id, numero_preventivo, anno, data_creazione, oggetto, stato, aliquota_iva, note_pagamento, totale_imponibile, totale_iva, sconto, marca_bollo, totale_generale,
         updated_at, da_sincronizzare)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1);`,
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
        sconto,
        bollo,
        totaleGenerale,
        dataCreazione,
      ]
    );

    // Inserimento Dettaglio Voci
    for (const voce of vociCalcolate) {
      const voceId = nuovoId();
      await db.runAsync(
        `INSERT INTO voci_preventivo (id, preventivo_id, descrizione, quantita, unita, prezzo_unitario, totale_voce)
         VALUES (?, ?, ?, ?, ?, ?, ?);`,
        [
          voceId,
          preventivoId,
          voce.descrizione,
          voce.quantita,
          voce.unita ?? null,
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
// L'eventuale copia firmata invece si stacca: alla sincronizzazione il
// file viene tolto dal server e dal telefono (inviaFileFirmati).
// In SQLite le espressioni di un UPDATE leggono i valori PRIMA della
// modifica: il CASE vede ancora il firmato_file originale.
export async function deletePreventivo(id: string): Promise<void> {
  const db = await getDbConnection();
  const ora = adesso();
  await db.runAsync(
    `UPDATE preventivi
     SET deleted_at = ?, updated_at = ?, da_sincronizzare = 1,
         firmato_da_caricare = CASE WHEN firmato_file IS NOT NULL
                                    THEN 1 ELSE firmato_da_caricare END,
         firmato_file = NULL, firmato_tipo = NULL, firmato_at = NULL
     WHERE id = ?;`,
    [ora, ora, id]
  );
  segnalaModificaLocale();
}
