import type { SQLiteDatabase } from 'expo-sqlite';
import { adesso, getDbConnection } from './db';
import { segnalaDatiAggiornati } from './eventiSync';
import { inviaFileFirmati, svuotaFirmatiLocali } from './firmatiService';
import { supabase } from './supabase';

// =====================================================================
// SINCRONIZZAZIONE CON SUPABASE
// =====================================================================
// Questo file è l'unico punto dell'app che parla con il server per i dati.
// Le schermate continuano a leggere e scrivere solo su SQLite.
//
// Una sincronizzazione fa, in quest'ordine:
// 1. CONTROLLO UTENTE: i dati locali sono di chi è collegato adesso?
// 2. PUSH: manda al server le righe con da_sincronizzare = 1
// 3. PULL: scarica le righe cambiate sul server dall'ultima volta
//
// Push prima del pull: "prima consegno, poi ritiro". Se nel frattempo un
// altro dispositivo ha salvato una versione più nuova, il server scarta
// la nostra (trigger scarta_modifiche_vecchie) e il pull subito dopo ci
// porta quella più nuova.
// =====================================================================

export interface RiepilogoPush {
  clienti: number;
  preventivi: number;
  profilo: boolean;
  biglietto: boolean;
  vociRapide: number;
}

export interface RiepilogoPull {
  clienti: number;
  preventivi: number;
  profilo: boolean;
  biglietto: boolean;
  vociRapide: number;
}

export interface RiepilogoSync {
  inviati: RiepilogoPush;
  ricevuti: RiepilogoPull;
}

// Una sola sincronizzazione alla volta.
// Può essere chiesta da più punti nello stesso momento (avvio, ritorno in
// primo piano, salvataggio, assegnazione del numero...). Due sincronizzazioni
// in parallelo leggerebbero e scriverebbero le stesse righe intrecciandosi.
// Le mettiamo quindi in fila: ognuna parte quando la precedente è finita.
let coda: Promise<unknown> = Promise.resolve();

export function sincronizza(): Promise<RiepilogoSync> {
  const questa = coda.then(eseguiSincronizzazione);
  // La coda va avanti anche se questa fallisce (l'errore arriva comunque
  // a chi ha chiamato sincronizza)
  coda = questa.catch(() => undefined);
  return questa;
}

async function eseguiSincronizzazione(): Promise<RiepilogoSync> {
  const userId = await utenteCollegato();
  const db = await getDbConnection();

  await verificaUtente(db, userId);
  const inviati = await inviaModifiche(db, userId);
  const ricevuti = await riceviModifiche(db);

  // Se sono arrivati dati nuovi, le schermate aperte si ricaricano
  const qualcosaDiNuovo =
    ricevuti.clienti > 0 ||
    ricevuti.preventivi > 0 ||
    ricevuti.profilo ||
    ricevuti.biglietto ||
    ricevuti.vociRapide > 0;
  if (qualcosaDiNuovo) segnalaDatiAggiornati();

  return { inviati, ricevuti };
}

// =====================================================================
// NUMERO DEL PREVENTIVO (strategia B)
// =====================================================================
// Chiede al server il prossimo numero libero e lo assegna alla bozza.
// Si chiama al primo invio (condivisione, email, WhatsApp, stampa):
// per mandare un preventivo serve comunque la rete, quindi in pratica
// questo passaggio non pesa sull'uso offline.
//
// Il numero lo decide la funzione assegna_numero_preventivo sul server,
// che non può mai dare lo stesso numero due volte, nemmeno se telefono e
// tablet la chiamano nello stesso istante.
//
// Se il server non risponde (offline) l'errore arriva al chiamante, che
// può proporre di generare il PDF come bozza.
export async function assegnaNumero(
  idPreventivo: string
): Promise<{ numero: number; anno: number }> {
  await utenteCollegato();
  const db = await getDbConnection();

  // L'anno è quello dell'invio, non della creazione della bozza:
  // una bozza del 30 dicembre inviata il 2 gennaio prende un numero
  // del nuovo anno.
  const anno = new Date().getFullYear();

  const { data, error } = await supabase.rpc('assegna_numero_preventivo', {
    p_anno: anno,
  });
  if (error) throw error;
  const numero = Number(data);

  // Salviamo il numero in locale. "AND numero_preventivo IS NULL" evita di
  // sovrascrivere un numero se nel frattempo la bozza ne avesse già ricevuto
  // uno. Una bozza che riceve il numero passa da "bozza" a "inviato".
  await db.runAsync(
    `UPDATE preventivi
     SET numero_preventivo = ?, anno = ?,
         stato = CASE WHEN stato = 'bozza' THEN 'inviato' ELSE stato END,
         updated_at = ?, da_sincronizzare = 1
     WHERE id = ? AND numero_preventivo IS NULL;`,
    [numero, anno, adesso(), idPreventivo]
  );

  // Mandiamo subito il numero al server, così gli altri dispositivi lo
  // vedono al loro prossimo pull. Se non riesce non è grave: la riga
  // resta "da sincronizzare" e partirà alla sincronizzazione successiva.
  try {
    await sincronizza();
  } catch (err) {
    console.warn('Numero assegnato, sincronizzazione rimandata:', err);
  }

  return { numero, anno };
}

async function utenteCollegato(): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error('Nessun utente collegato');
  return session.user.id;
}

// =====================================================================
// 1. CONTROLLO UTENTE
// =====================================================================
// Il database locale non sa a chi appartengono i suoi dati. Salviamo in
// sync_stato l'id dell'utente della prima sincronizzazione.
// Se un giorno sullo stesso dispositivo entra un utente DIVERSO, i dati
// locali sono dell'altro utente: li cancelliamo prima di sincronizzare,
// altrimenti il push li caricherebbe nell'account sbagliato.
// (Stesso utente che esce e rientra: stesso id, non si cancella niente.)
async function verificaUtente(
  db: SQLiteDatabase,
  userId: string
): Promise<void> {
  const salvato = await leggiStato(db, 'utente');

  if (salvato === userId) return;

  if (salvato !== null) {
    console.warn('Utente diverso su questo dispositivo: svuoto i dati locali');
    await db.withTransactionAsync(async () => {
      await db.execAsync(`
        DELETE FROM voci_preventivo;
        DELETE FROM preventivi;
        DELETE FROM clienti;
        DELETE FROM profilo_fabbro;
        DELETE FROM biglietto;
        DELETE FROM voci_rapide;
        DELETE FROM sync_stato;
      `);
    });
    // Anche le copie firmate dell'utente precedente
    await svuotaFirmatiLocali().catch((err) =>
      console.warn('Copie firmate locali non svuotate:', err)
    );
    segnalaDatiAggiornati();
  }

  // Prima sincronizzazione su questo dispositivo (o dopo lo svuotamento):
  // i dati locali da adesso appartengono a questo utente.
  await scriviStato(db, 'utente', userId);
}

// =====================================================================
// 2. PUSH
// =====================================================================
// L'ordine conta: i preventivi puntano ai clienti (cliente_id), quindi
// il server deve ricevere prima i clienti, altrimenti rifiuta i preventivi.
async function inviaModifiche(
  db: SQLiteDatabase,
  userId: string
): Promise<RiepilogoPush> {
  const clienti = await inviaClienti(db);
  // Prima i file delle copie firmate, poi le righe dei preventivi che li
  // nominano: così un altro dispositivo non trova mai un nome di file
  // che sul server non c'è ancora
  await inviaFileFirmati(db, userId);
  const preventivi = await inviaPreventivi(db);
  const profilo = await inviaProfilo(db, userId);
  const biglietto = await inviaBiglietto(db, userId);
  const vociRapide = await inviaVociRapide(db);

  return { clienti, preventivi, profilo, biglietto, vociRapide };
}

// --- CLIENTI ---------------------------------------------------------

interface RigaCliente {
  id: string;
  nome: string;
  telefono: string | null;
  email: string | null;
  indirizzo: string | null;
  note: string | null;
  updated_at: string | null;
  deleted_at: string | null;
}

async function inviaClienti(db: SQLiteDatabase): Promise<number> {
  const righe = await db.getAllAsync<RigaCliente>(
    'SELECT * FROM clienti WHERE da_sincronizzare = 1;'
  );
  if (righe.length === 0) return 0;

  // Prepariamo le righe come le vuole il server: le stesse colonne,
  // senza da_sincronizzare (che è un'informazione solo locale) e senza
  // user_id (lo riempie il server con l'utente collegato).
  const daInviare = righe.map((r) => ({
    id: r.id,
    nome: r.nome,
    telefono: r.telefono,
    email: r.email,
    indirizzo: r.indirizzo,
    note: r.note,
    updated_at: r.updated_at ?? adesso(),
    deleted_at: r.deleted_at,
  }));

  // upsert = "inserisci, oppure aggiorna se l'id esiste già".
  // Mandiamo a blocchi per non fare richieste troppo grandi.
  for (const blocco of aBlocchi(daInviare, 100)) {
    const { error } = await supabase
      .from('clienti')
      .upsert(blocco, { onConflict: 'id' });
    if (error) throw error;
  }

  await segnaInviate(db, 'clienti', righe);
  return righe.length;
}

// --- PREVENTIVI (con le loro voci) -----------------------------------

interface RigaPreventivo {
  id: string;
  cliente_id: string;
  numero_preventivo: number | null;
  anno: number;
  data_creazione: string;
  oggetto: string | null;
  stato: string;
  aliquota_iva: number;
  note_pagamento: string | null;
  totale_imponibile: number;
  totale_iva: number;
  sconto: number;
  marca_bollo: number;
  totale_generale: number;
  firmato_file: string | null;
  firmato_tipo: string | null;
  firmato_at: string | null;
  updated_at: string | null;
  deleted_at: string | null;
}

interface RigaVoce {
  id: string;
  descrizione: string;
  quantita: number;
  unita?: string | null; // assente nelle voci create prima delle unità
  prezzo_unitario: number;
  totale_voce: number;
}

async function inviaPreventivi(db: SQLiteDatabase): Promise<number> {
  const righe = await db.getAllAsync<RigaPreventivo>(
    'SELECT * FROM preventivi WHERE da_sincronizzare = 1;'
  );
  if (righe.length === 0) return 0;

  const daInviare = [];
  for (const p of righe) {
    // Le voci partono sempre tutte insieme al loro preventivo, come array
    // JSON nella colonna "voci". ORDER BY rowid = nell'ordine di inserimento.
    const voci = await db.getAllAsync<RigaVoce>(
      `SELECT id, descrizione, quantita, unita, prezzo_unitario, totale_voce
       FROM voci_preventivo
       WHERE preventivo_id = ?
       ORDER BY rowid;`,
      [p.id]
    );

    daInviare.push({
      id: p.id,
      cliente_id: p.cliente_id,
      numero_preventivo: p.numero_preventivo,
      anno: p.anno,
      data_creazione: p.data_creazione,
      oggetto: p.oggetto,
      stato: p.stato,
      aliquota_iva: p.aliquota_iva,
      note_pagamento: p.note_pagamento,
      totale_imponibile: p.totale_imponibile,
      totale_iva: p.totale_iva,
      sconto: p.sconto ?? 0,
      marca_bollo: p.marca_bollo ?? 0,
      totale_generale: p.totale_generale,
      firmato_file: p.firmato_file,
      firmato_tipo: p.firmato_tipo,
      firmato_at: p.firmato_at,
      voci,
      updated_at: p.updated_at ?? adesso(),
      deleted_at: p.deleted_at,
    });
  }

  // Blocchi più piccoli: ogni preventivo porta con sé tutte le sue voci
  for (const blocco of aBlocchi(daInviare, 50)) {
    const { error } = await supabase
      .from('preventivi')
      .upsert(blocco, { onConflict: 'id' });
    if (error) {
      if (colonnaMancante(error)) {
        avvisaMigrazioneMancante('Preventivi', error);
        return 0;
      }
      throw error;
    }
  }

  await segnaInviate(db, 'preventivi', righe);
  return righe.length;
}

// --- VOCI RAPIDE -----------------------------------------------------

interface RigaVoceRapida {
  id: string;
  descrizione: string;
  prezzo: number;
  quantita: number;
  unita: string | null;
  posizione: number;
  updated_at: string | null;
  deleted_at: string | null;
}

async function inviaVociRapide(db: SQLiteDatabase): Promise<number> {
  const righe = await db.getAllAsync<RigaVoceRapida>(
    'SELECT * FROM voci_rapide WHERE da_sincronizzare = 1;'
  );
  if (righe.length === 0) return 0;

  const daInviare = righe.map((r) => ({
    id: r.id,
    descrizione: r.descrizione,
    prezzo: r.prezzo,
    quantita: r.quantita,
    unita: r.unita,
    posizione: r.posizione,
    updated_at: r.updated_at ?? adesso(),
    deleted_at: r.deleted_at,
  }));

  for (const blocco of aBlocchi(daInviare, 100)) {
    const { error } = await supabase
      .from('voci_rapide')
      .upsert(blocco, { onConflict: 'id' });
    if (error) {
      // Tabella non ancora creata sul server (migrazione 006 da fare):
      // le voci restano da inviare e partiranno appena c'è. Intanto il
      // resto della sincronizzazione va avanti.
      if (tabellaMancante(error)) {
        console.warn('Voci rapide non sincronizzate: manca la migrazione 006');
        return 0;
      }
      throw error;
    }
  }

  await segnaInviate(db, 'voci_rapide', righe);
  return righe.length;
}

// --- PROFILO ---------------------------------------------------------

interface RigaProfilo {
  id: number;
  nome_azienda: string;
  titolare: string | null;
  p_iva: string | null;
  codice_fiscale: string | null;
  telefono: string | null;
  email: string | null;
  indirizzo: string | null;
  iban: string | null;
  firma: string | null;
  timbro: string | null;
  aliquota_iva: number;
  marca_bollo: number; // 1 = sì
  updated_at: string | null;
}

async function inviaProfilo(
  db: SQLiteDatabase,
  userId: string
): Promise<boolean> {
  const riga = await db.getFirstAsync<RigaProfilo>(
    'SELECT * FROM profilo_fabbro WHERE da_sincronizzare = 1 ORDER BY id LIMIT 1;'
  );
  if (!riga) return false;

  // Sul server il profilo è "una riga per utente": la chiave è user_id,
  // quindi qui lo mandiamo esplicitamente per far funzionare l'upsert.
  const { error } = await supabase.from('profilo').upsert(
    {
      user_id: userId,
      nome_azienda: riga.nome_azienda,
      titolare: riga.titolare,
      p_iva: riga.p_iva,
      codice_fiscale: riga.codice_fiscale,
      telefono: riga.telefono,
      email: riga.email,
      indirizzo: riga.indirizzo,
      iban: riga.iban,
      firma: riga.firma,
      timbro: riga.timbro,
      aliquota_iva: riga.aliquota_iva,
      marca_bollo: riga.marca_bollo === 1,
      updated_at: riga.updated_at ?? adesso(),
    },
    { onConflict: 'user_id' }
  );
  if (error) {
    if (colonnaMancante(error)) {
      avvisaMigrazioneMancante('Profilo', error);
      return false;
    }
    throw error;
  }

  await segnaInviate(db, 'profilo_fabbro', [riga]);
  return true;
}

// --- BIGLIETTO -------------------------------------------------------

interface RigaBiglietto {
  id: number;
  logo: string | null;
  descrizione_fronte: string | null;
  nome: string | null;
  qualifica: string | null;
  descrizione_retro: string | null;
  indirizzo: string | null;
  telefono: string | null;
  cellulare: string | null;
  email: string | null;
  email_secondaria: string | null;
  p_iva: string | null;
  codice_fiscale: string | null;
  rea: string | null;
  updated_at: string | null;
}

async function inviaBiglietto(
  db: SQLiteDatabase,
  userId: string
): Promise<boolean> {
  const riga = await db.getFirstAsync<RigaBiglietto>(
    'SELECT * FROM biglietto WHERE id = 1 AND da_sincronizzare = 1;'
  );
  if (!riga) return false;

  const { error } = await supabase.from('biglietto').upsert(
    {
      user_id: userId,
      logo: riga.logo,
      descrizione_fronte: riga.descrizione_fronte,
      nome: riga.nome,
      qualifica: riga.qualifica,
      descrizione_retro: riga.descrizione_retro,
      indirizzo: riga.indirizzo,
      telefono: riga.telefono,
      cellulare: riga.cellulare,
      email: riga.email,
      email_secondaria: riga.email_secondaria,
      p_iva: riga.p_iva,
      codice_fiscale: riga.codice_fiscale,
      rea: riga.rea,
      updated_at: riga.updated_at ?? adesso(),
    },
    { onConflict: 'user_id' }
  );
  if (error) throw error;

  await segnaInviate(db, 'biglietto', [riga]);
  return true;
}

// =====================================================================
// 3. PULL
// =====================================================================
// Per ogni tabella chiediamo al server: "dammi le righe con
// server_updated_at successivo all'ultima volta". Quel momento lo teniamo
// in sync_stato (es. pull:clienti), ed è l'ora del SERVER, non del
// telefono: così un orologio del dispositivo sbagliato non fa perdere dati.
//
// Margine di sicurezza: chiediamo anche gli ultimi 60 secondi già visti.
// Il motivo: server_updated_at è l'ora in cui una scrittura è INIZIATA.
// Una scrittura lenta, iniziata prima ma finita dopo il nostro ultimo
// pull, avrebbe un'ora "nel passato" e verrebbe saltata per sempre.
// Rileggere qualche riga già vista non fa danni: riapplicarla dà lo
// stesso risultato.
const MARGINE_PULL_MS = 60_000;
const RIGHE_PER_PAGINA = 500;

async function riceviModifiche(db: SQLiteDatabase): Promise<RiepilogoPull> {
  // Stesso ordine del push: i preventivi locali hanno bisogno che il
  // loro cliente esista già nel SQLite (chiave esterna).
  const clienti = await scaricaTabella(db, 'clienti', applicaCliente);
  const preventivi = await scaricaTabella(db, 'preventivi', applicaPreventivo);
  const profilo = (await scaricaTabella(db, 'profilo', applicaProfilo)) > 0;
  const biglietto =
    (await scaricaTabella(db, 'biglietto', applicaBiglietto)) > 0;
  const vociRapide = await riceviVociRapide(db);

  return { clienti, preventivi, profilo, biglietto, vociRapide };
}

// Scarica a pagine tutte le righe cambiate di una tabella e le applica.
// Restituisce quante righe sono state effettivamente scritte in locale.
async function scaricaTabella<T extends { server_updated_at: string }>(
  db: SQLiteDatabase,
  tabella: 'clienti' | 'preventivi' | 'profilo' | 'biglietto' | 'voci_rapide',
  applica: (db: SQLiteDatabase, riga: T) => Promise<boolean>
): Promise<number> {
  const chiave = `pull:${tabella}`;
  const ultimo = await leggiStato(db, chiave);

  // Prima volta su questo dispositivo: nessun filtro, scarica tutto.
  const da = ultimo
    ? new Date(msDa(ultimo) - MARGINE_PULL_MS).toISOString()
    : null;

  let piuRecente = ultimo;
  let applicate = 0;
  let inizio = 0;

  while (true) {
    let query = supabase.from(tabella).select('*');
    if (da) query = query.gte('server_updated_at', da);

    const { data, error } = await query
      .order('server_updated_at', { ascending: true })
      .range(inizio, inizio + RIGHE_PER_PAGINA - 1);
    if (error) throw error;
    const righe = (data ?? []) as T[];

    for (const riga of righe) {
      if (await applica(db, riga)) applicate++;
      if (!piuRecente || msDa(riga.server_updated_at) > msDa(piuRecente)) {
        piuRecente = riga.server_updated_at;
      }
    }

    if (righe.length < RIGHE_PER_PAGINA) break;
    inizio += RIGHE_PER_PAGINA;
  }

  // Salviamo il nuovo punto di partenza solo alla fine: se il pull si
  // interrompe a metà, la volta dopo ripartiamo dal punto vecchio.
  if (piuRecente && piuRecente !== ultimo) {
    await scriviStato(db, chiave, piuRecente);
  }
  return applicate;
}

// Decide se ignorare una riga arrivata dal server. Due casi:
// - la abbiamo già identica (stesso updated_at, niente da inviare): succede
//   per esempio con le nostre stesse modifiche, che il pull dopo il push
//   ci "rimanda indietro". Riscriverla sarebbe lavoro inutile.
// - vince la versione locale (vedi sotto).
function daSaltare(
  locale: { updated_at: string | null; da_sincronizzare: number } | null,
  updatedAtServer: string
): boolean {
  const giaUguale =
    !!locale &&
    locale.da_sincronizzare === 0 &&
    !!locale.updated_at &&
    msDa(locale.updated_at) === msDa(updatedAtServer);
  return giaUguale || vinceLaLocale(locale, updatedAtServer);
}

// Regola del conflitto, uguale per tutte le tabelle.
// Applichiamo la riga del server, TRANNE se in locale c'è una modifica
// non ancora inviata e più recente: in quel caso vince la locale, che
// partirà al prossimo push.
function vinceLaLocale(
  locale: { updated_at: string | null; da_sincronizzare: number } | null,
  updatedAtServer: string
): boolean {
  if (!locale || locale.da_sincronizzare !== 1 || !locale.updated_at)
    return false;
  return msDa(locale.updated_at) > msDa(updatedAtServer);
}

// Converte una data in millisecondi.
// Postgres usa i microsecondi (…30.123456+00:00), JavaScript i millisecondi:
// tagliamo le cifre in più prima di convertire, perché non tutti i motori
// JavaScript (Hermes compreso) leggono bene più di 3 decimali.
function msDa(data: string): number {
  return new Date(data.replace(/(\.\d{3})\d+/, '$1')).getTime();
}

// Postgres restituisce le date come "2026-10-07T09:15:30.123+00:00".
// Le riportiamo al formato usato in locale ("…Z") così i confronti
// tra date salvate in SQLite restano coerenti.
function isoLocale(data: string): string;
function isoLocale(data: string | null): string | null;
function isoLocale(data: string | null): string | null {
  return data ? new Date(msDa(data)).toISOString() : null;
}

// --- Clienti ---

interface ClienteServer {
  id: string;
  nome: string;
  telefono: string | null;
  email: string | null;
  indirizzo: string | null;
  note: string | null;
  updated_at: string;
  deleted_at: string | null;
  server_updated_at: string;
}

async function applicaCliente(
  db: SQLiteDatabase,
  c: ClienteServer
): Promise<boolean> {
  const locale = await db.getFirstAsync<{
    updated_at: string | null;
    da_sincronizzare: number;
  }>('SELECT updated_at, da_sincronizzare FROM clienti WHERE id = ?;', [c.id]);
  if (daSaltare(locale, c.updated_at)) return false;

  // INSERT ... ON CONFLICT DO UPDATE = "upsert" di SQLite.
  // Non usiamo INSERT OR REPLACE: cancellerebbe e reinserirebbe la riga,
  // e la cancellazione di un cliente con preventivi è vietata dalla
  // chiave esterna (ON DELETE RESTRICT).
  // da_sincronizzare = 0: la riga arriva dal server, non c'è niente da inviare.
  await db.runAsync(
    `INSERT INTO clienti
       (id, nome, telefono, email, indirizzo, note, updated_at, deleted_at, da_sincronizzare)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
     ON CONFLICT(id) DO UPDATE SET
       nome = excluded.nome,
       telefono = excluded.telefono,
       email = excluded.email,
       indirizzo = excluded.indirizzo,
       note = excluded.note,
       updated_at = excluded.updated_at,
       deleted_at = excluded.deleted_at,
       da_sincronizzare = 0;`,
    [
      c.id,
      c.nome,
      c.telefono,
      c.email,
      c.indirizzo,
      c.note,
      isoLocale(c.updated_at),
      isoLocale(c.deleted_at),
    ]
  );
  return true;
}

// --- Preventivi ---

interface PreventivoServer {
  id: string;
  cliente_id: string;
  numero_preventivo: number | null;
  anno: number;
  data_creazione: string;
  oggetto: string | null;
  stato: string;
  aliquota_iva: number;
  note_pagamento: string | null;
  totale_imponibile: number;
  totale_iva: number;
  sconto: number | null; // null se arriva da prima della migrazione 003
  marca_bollo?: number | null; // assente prima della migrazione 007
  totale_generale: number;
  // undefined se arriva da prima della migrazione 004
  firmato_file?: string | null;
  firmato_tipo?: string | null;
  firmato_at?: string | null;
  voci: RigaVoce[] | null;
  updated_at: string;
  deleted_at: string | null;
  server_updated_at: string;
}

async function applicaPreventivo(
  db: SQLiteDatabase,
  p: PreventivoServer
): Promise<boolean> {
  const locale = await db.getFirstAsync<{
    updated_at: string | null;
    da_sincronizzare: number;
  }>('SELECT updated_at, da_sincronizzare FROM preventivi WHERE id = ?;', [
    p.id,
  ]);
  if (daSaltare(locale, p.updated_at)) return false;

  // Preventivo e voci in un'unica transazione: o si aggiorna tutto o niente
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO preventivi
         (id, cliente_id, numero_preventivo, anno, data_creazione, oggetto, stato,
          aliquota_iva, note_pagamento, totale_imponibile, totale_iva, sconto, marca_bollo,
          totale_generale, firmato_file, firmato_tipo, firmato_at,
          updated_at, deleted_at, da_sincronizzare)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
       ON CONFLICT(id) DO UPDATE SET
         cliente_id = excluded.cliente_id,
         numero_preventivo = excluded.numero_preventivo,
         anno = excluded.anno,
         data_creazione = excluded.data_creazione,
         oggetto = excluded.oggetto,
         stato = excluded.stato,
         aliquota_iva = excluded.aliquota_iva,
         note_pagamento = excluded.note_pagamento,
         totale_imponibile = excluded.totale_imponibile,
         totale_iva = excluded.totale_iva,
         sconto = excluded.sconto,
         marca_bollo = excluded.marca_bollo,
         totale_generale = excluded.totale_generale,
         firmato_file = excluded.firmato_file,
         firmato_tipo = excluded.firmato_tipo,
         firmato_at = excluded.firmato_at,
         updated_at = excluded.updated_at,
         deleted_at = excluded.deleted_at,
         da_sincronizzare = 0;`,
      [
        p.id,
        p.cliente_id,
        p.numero_preventivo,
        p.anno,
        isoLocale(p.data_creazione),
        p.oggetto,
        p.stato,
        Number(p.aliquota_iva),
        p.note_pagamento,
        Number(p.totale_imponibile),
        Number(p.totale_iva),
        Number(p.sconto ?? 0),
        Number(p.marca_bollo ?? 0),
        Number(p.totale_generale),
        p.firmato_file ?? null,
        p.firmato_tipo ?? null,
        isoLocale(p.firmato_at ?? null),
        isoLocale(p.updated_at),
        isoLocale(p.deleted_at),
      ]
    );

    // Le voci arrivano tutte insieme: sostituiamo quelle locali
    await db.runAsync('DELETE FROM voci_preventivo WHERE preventivo_id = ?;', [
      p.id,
    ]);
    for (const v of p.voci ?? []) {
      await db.runAsync(
        `INSERT INTO voci_preventivo
           (id, preventivo_id, descrizione, quantita, unita, prezzo_unitario, totale_voce)
         VALUES (?, ?, ?, ?, ?, ?, ?);`,
        [
          v.id,
          p.id,
          v.descrizione,
          v.quantita,
          v.unita ?? null,
          v.prezzo_unitario,
          v.totale_voce,
        ]
      );
    }
  });
  return true;
}

// --- Voci rapide ---

interface VoceRapidaServer extends Omit<RigaVoceRapida, 'updated_at'> {
  updated_at: string;
  server_updated_at: string;
}

// Come scaricaTabella, ma senza bloccare tutto se sul server la tabella
// non c'è ancora (vedi inviaVociRapide)
async function riceviVociRapide(db: SQLiteDatabase): Promise<number> {
  try {
    return await scaricaTabella(db, 'voci_rapide', applicaVoceRapida);
  } catch (err) {
    if (tabellaMancante(err)) return 0;
    throw err;
  }
}

async function applicaVoceRapida(
  db: SQLiteDatabase,
  v: VoceRapidaServer
): Promise<boolean> {
  const locale = await db.getFirstAsync<{
    updated_at: string | null;
    da_sincronizzare: number;
  }>('SELECT updated_at, da_sincronizzare FROM voci_rapide WHERE id = ?;', [
    v.id,
  ]);
  if (daSaltare(locale, v.updated_at)) return false;

  await db.runAsync(
    `INSERT INTO voci_rapide
       (id, descrizione, prezzo, quantita, unita, posizione, updated_at, deleted_at, da_sincronizzare)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
     ON CONFLICT(id) DO UPDATE SET
       descrizione = excluded.descrizione,
       prezzo = excluded.prezzo,
       quantita = excluded.quantita,
       unita = excluded.unita,
       posizione = excluded.posizione,
       updated_at = excluded.updated_at,
       deleted_at = excluded.deleted_at,
       da_sincronizzare = 0;`,
    [
      v.id,
      v.descrizione,
      Number(v.prezzo),
      Number(v.quantita),
      v.unita,
      Number(v.posizione),
      isoLocale(v.updated_at),
      isoLocale(v.deleted_at),
    ]
  );
  return true;
}

// Errore di Supabase "colonna che non esiste" (PGRST204): l'app è più
// nuova del server, manca una migrazione. Le righe restano da inviare e
// partiranno appena la migrazione è fatta; intanto il resto della
// sincronizzazione va avanti invece di bloccarsi tutta.
function colonnaMancante(errore: unknown): boolean {
  return (errore as { code?: string } | null)?.code === 'PGRST204';
}

function avvisaMigrazioneMancante(cosa: string, errore: unknown): void {
  const messaggio = (errore as { message?: string } | null)?.message ?? '';
  console.warn(
    `${cosa} non inviati: su Supabase manca una migrazione. ${messaggio}`
  );
}

// Errore di Supabase "tabella che non esiste": PGRST205 se la tabella non
// è nella cache dello schema, 42P01 se è Postgres a non trovarla
function tabellaMancante(errore: unknown): boolean {
  const codice = (errore as { code?: string } | null)?.code;
  return codice === 'PGRST205' || codice === '42P01';
}

// --- Profilo ---

interface ProfiloServer {
  nome_azienda: string;
  titolare: string | null;
  p_iva: string | null;
  codice_fiscale: string | null;
  telefono: string | null;
  email: string | null;
  indirizzo: string | null;
  iban: string | null;
  // undefined se arriva da prima della migrazione 005
  firma?: string | null;
  timbro?: string | null;
  // undefined se arriva da prima della migrazione 007
  aliquota_iva?: number | string | null;
  marca_bollo?: boolean | null;
  updated_at: string;
  server_updated_at: string;
}

async function applicaProfilo(
  db: SQLiteDatabase,
  p: ProfiloServer
): Promise<boolean> {
  // In locale il profilo è la prima riga di profilo_fabbro (id automatico)
  const locale = await db.getFirstAsync<{
    id: number;
    updated_at: string | null;
    da_sincronizzare: number;
  }>(
    'SELECT id, updated_at, da_sincronizzare FROM profilo_fabbro ORDER BY id LIMIT 1;'
  );
  if (daSaltare(locale, p.updated_at)) return false;

  const valori = [
    p.nome_azienda,
    p.titolare,
    p.p_iva,
    p.codice_fiscale,
    p.telefono,
    p.email,
    p.indirizzo,
    p.iban,
    p.firma ?? null,
    p.timbro ?? null,
    // numeric di Postgres arriva come testo: si converte
    p.aliquota_iva != null ? Number(p.aliquota_iva) : 22,
    p.marca_bollo ? 1 : 0,
    isoLocale(p.updated_at),
  ];

  if (locale) {
    await db.runAsync(
      `UPDATE profilo_fabbro SET
         nome_azienda = ?, titolare = ?, p_iva = ?, codice_fiscale = ?,
         telefono = ?, email = ?, indirizzo = ?, iban = ?,
         firma = ?, timbro = ?, aliquota_iva = ?, marca_bollo = ?,
         updated_at = ?, da_sincronizzare = 0
       WHERE id = ?;`,
      [...valori, locale.id]
    );
  } else {
    await db.runAsync(
      `INSERT INTO profilo_fabbro
         (nome_azienda, titolare, p_iva, codice_fiscale, telefono, email, indirizzo, iban,
          firma, timbro, aliquota_iva, marca_bollo, updated_at, da_sincronizzare)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0);`,
      valori
    );
  }
  return true;
}

// --- Biglietto ---

interface BigliettoServer extends Omit<RigaBiglietto, 'id' | 'updated_at'> {
  updated_at: string;
  server_updated_at: string;
}

async function applicaBiglietto(
  db: SQLiteDatabase,
  b: BigliettoServer
): Promise<boolean> {
  const locale = await db.getFirstAsync<{
    updated_at: string | null;
    da_sincronizzare: number;
  }>('SELECT updated_at, da_sincronizzare FROM biglietto WHERE id = 1;');
  if (daSaltare(locale, b.updated_at)) return false;

  await db.runAsync(
    `INSERT INTO biglietto
       (id, logo, descrizione_fronte, nome, qualifica, descrizione_retro, indirizzo,
        telefono, cellulare, email, email_secondaria, p_iva, codice_fiscale, rea,
        updated_at, da_sincronizzare)
     VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
     ON CONFLICT(id) DO UPDATE SET
       logo = excluded.logo,
       descrizione_fronte = excluded.descrizione_fronte,
       nome = excluded.nome,
       qualifica = excluded.qualifica,
       descrizione_retro = excluded.descrizione_retro,
       indirizzo = excluded.indirizzo,
       telefono = excluded.telefono,
       cellulare = excluded.cellulare,
       email = excluded.email,
       email_secondaria = excluded.email_secondaria,
       p_iva = excluded.p_iva,
       codice_fiscale = excluded.codice_fiscale,
       rea = excluded.rea,
       updated_at = excluded.updated_at,
       da_sincronizzare = 0;`,
    [
      b.logo,
      b.descrizione_fronte,
      b.nome,
      b.qualifica,
      b.descrizione_retro,
      b.indirizzo,
      b.telefono,
      b.cellulare,
      b.email,
      b.email_secondaria,
      b.p_iva,
      b.codice_fiscale,
      b.rea,
      isoLocale(b.updated_at),
    ]
  );
  return true;
}

// --- FUNZIONI DI SUPPORTO --------------------------------------------

// Rimette da_sincronizzare = 0 sulle righe appena inviate.
//
// "AND updated_at IS ?": azzera il flag solo se la riga non è cambiata
// mentre la stavamo inviando. Esempio: il push legge un cliente, intanto
// l'utente lo modifica, poi il push finisce. Senza questa condizione la
// modifica nuova risulterebbe "già inviata" e non partirebbe mai.
// Con la condizione, la riga resta a 1 e parte al push successivo.
// (IS invece di = perché funziona anche se updated_at è NULL.)
async function segnaInviate(
  db: SQLiteDatabase,
  tabella:
    'clienti' | 'preventivi' | 'profilo_fabbro' | 'biglietto' | 'voci_rapide',
  righe: { id: string | number; updated_at: string | null }[]
): Promise<void> {
  await db.withTransactionAsync(async () => {
    for (const r of righe) {
      await db.runAsync(
        `UPDATE ${tabella} SET da_sincronizzare = 0 WHERE id = ? AND updated_at IS ?;`,
        [r.id, r.updated_at]
      );
    }
  });
}

// Lettura e scrittura nella tabella sync_stato (chiave → valore)
async function leggiStato(
  db: SQLiteDatabase,
  chiave: string
): Promise<string | null> {
  const riga = await db.getFirstAsync<{ valore: string | null }>(
    'SELECT valore FROM sync_stato WHERE chiave = ?;',
    [chiave]
  );
  return riga?.valore ?? null;
}

async function scriviStato(
  db: SQLiteDatabase,
  chiave: string,
  valore: string
): Promise<void> {
  await db.runAsync(
    `INSERT INTO sync_stato (chiave, valore) VALUES (?, ?)
     ON CONFLICT(chiave) DO UPDATE SET valore = excluded.valore;`,
    [chiave, valore]
  );
}

// Divide un array in pezzi da "dimensione" elementi
function aBlocchi<T>(elementi: T[], dimensione: number): T[][] {
  const blocchi: T[][] = [];
  for (let i = 0; i < elementi.length; i += dimensione) {
    blocchi.push(elementi.slice(i, i + dimensione));
  }
  return blocchi;
}
