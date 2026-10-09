import * as FileSystem from 'expo-file-system/legacy';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import type { SQLiteDatabase } from 'expo-sqlite';
import { adesso, getDbConnection } from './db';
import { segnalaModificaLocale } from './eventiSync';
import { supabase } from './supabase';

// =====================================================================
// COPIA FIRMATA DEL PREVENTIVO
// =====================================================================
// Il cliente rimanda il preventivo firmato (PDF o foto del foglio).
// Lo attacchiamo al preventivo in due posti:
//
// 1. SUL TELEFONO, subito, in documentDirectory/firmati/. Così funziona
//    anche offline, come il resto dell'app.
// 2. SU SUPABASE STORAGE, alla sincronizzazione, nel bucket privato
//    "firmati", in una cartella per utente: <user_id>/<nome file>.
//    Così lo vede anche il tablet.
//
// Nella riga del preventivo salviamo solo il NOME del file, non il file:
// - firmato_file        es. "3f2a...-1728390000000.pdf"
// - firmato_tipo        es. "application/pdf" oppure "image/jpeg"
// - firmato_at          quando è stato caricato
// - firmato_da_caricare 1 = file cambiato qui e non ancora mandato al
//                       server (solo locale, come da_sincronizzare)
//
// Il nome contiene l'ora: se la copia viene sostituita, il nome cambia e
// gli altri dispositivi capiscono che devono scaricare quella nuova.
// =====================================================================

const BUCKET = 'firmati';

// Stesso limite impostato sul bucket (migrazione 004)
export const DIMENSIONE_MASSIMA = 10 * 1024 * 1024; // 10 MB

// Ottimizzazione delle foto: nessuna foto salvata supera PESO_MASSIMO_FOTO.
// Si prova dal tentativo più nitido al più leggero e ci si ferma al primo
// che sta sotto il limite. Prima si abbassa la qualità, poi la dimensione:
// per un foglio scritto la risoluzione conta più della qualità JPEG.
// 2000 px leggono bene un A4 anche ingrandito; 800 px è il minimo sotto
// cui una firma diventa difficile da riconoscere.
export const PESO_MASSIMO_FOTO = 300 * 1024; // 300 KB
const TENTATIVI: { lato: number; qualita: number }[] = [
  { lato: 2000, qualita: 0.6 },
  { lato: 2000, qualita: 0.45 },
  { lato: 1600, qualita: 0.5 },
  { lato: 1600, qualita: 0.4 },
  { lato: 1400, qualita: 0.4 },
  { lato: 1200, qualita: 0.4 },
  { lato: 1000, qualita: 0.35 },
  { lato: 800, qualita: 0.3 },
];

// Errore riconoscibile dalla schermata per mostrare il messaggio giusto
export class FileTroppoGrande extends Error {
  constructor() {
    super('File troppo grande');
    this.name = 'FileTroppoGrande';
  }
}

export interface FileScelto {
  uri: string;
  mimeType?: string | null;
  size?: number | null;
}

export interface CopiaFirmata {
  id: string; // id del preventivo
  firmato_file: string | null;
  firmato_tipo: string | null;
}

// --- PERCORSI E TIPI -------------------------------------------------

function cartellaLocale(): string {
  if (!FileSystem.documentDirectory) {
    throw new Error('Archivio del dispositivo non disponibile');
  }
  return FileSystem.documentDirectory + 'firmati/';
}

export function percorsoLocale(nomeFile: string): string {
  return cartellaLocale() + nomeFile;
}

export function eImmagine(tipo: string | null | undefined): boolean {
  return !!tipo && tipo.startsWith('image/');
}

// Il tipo del file: quello dichiarato da chi l'ha scelto, oppure
// ricavato dall'estensione. Senza indizi si assume una foto JPEG.
function tipoDelFile(file: FileScelto): string {
  if (file.mimeType) return file.mimeType;
  const ext = file.uri.split('?')[0].split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return 'application/pdf';
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'heic' || ext === 'heif') return 'image/heic';
  return 'image/jpeg';
}

function estensione(tipo: string): string {
  switch (tipo) {
    case 'application/pdf':
      return 'pdf';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/heic':
    case 'image/heif':
      return 'heic';
    default:
      return 'jpg';
  }
}

export function tipoAmmesso(file: FileScelto): boolean {
  const tipo = tipoDelFile(file);
  return tipo === 'application/pdf' || eImmagine(tipo);
}

// --- OTTIMIZZAZIONE DELLE FOTO ---------------------------------------
// Riduce la foto sotto i 300 KB (vedi TENTATIVI in cima al file) e la
// salva in JPEG. Converte anche le foto HEIC dell'iPhone, che su Android
// e Windows spesso non si aprono.
// Una foto che è già un JPEG sotto il limite resta com'è: ricomprimerla
// la peggiorerebbe e basta.
//
// I PDF invece NON si toccano: se il cliente li firma con la firma
// digitale, qualsiasi modifica al file renderebbe la firma non valida.
async function ottimizzaFoto(file: FileScelto): Promise<FileScelto> {
  const pesoOriginale = file.size ?? (await dimensioneFile(file.uri));
  if (
    tipoDelFile(file) === 'image/jpeg' &&
    pesoOriginale !== null &&
    pesoOriginale <= PESO_MASSIMO_FOTO
  ) {
    return file;
  }

  // Prima lettura: serve solo a conoscere le dimensioni
  const lettura = ImageManipulator.manipulate(file.uri);
  const originale = await lettura.renderAsync();
  const { width, height } = originale;
  originale.release();
  lettura.release();
  const latoLungo = Math.max(width, height);

  let ultimo: FileScelto | null = null;
  let provato = '';
  for (const { lato, qualita } of TENTATIVI) {
    // Una foto più piccola del lato richiesto non si ingrandisce: per lei
    // alcuni tentativi sono identici al precedente e si saltano
    const chiave = `${Math.min(lato, latoLungo)}-${qualita}`;
    if (chiave === provato) continue;
    provato = chiave;

    if (ultimo) {
      await FileSystem.deleteAsync(ultimo.uri, { idempotent: true });
    }
    ultimo = await salvaRidotta(file.uri, width, height, lato, qualita);
    if (ultimo.size != null && ultimo.size <= PESO_MASSIMO_FOTO) {
      return ultimo;
    }
  }

  // L'ultimo tentativo (800 px, qualità 30%) pesa di solito 60-120 KB:
  // arrivare qui vuol dire una foto davvero insolita. La si tiene
  // comunque, la più leggera possibile.
  return ultimo!;
}

// Un tentativo: ridimensiona (solo se serve) e salva in JPEG
async function salvaRidotta(
  uri: string,
  width: number,
  height: number,
  lato: number,
  qualita: number
): Promise<FileScelto> {
  const contesto = ImageManipulator.manipulate(uri);
  if (Math.max(width, height) > lato) {
    // Si indica solo il lato lungo: l'altro segue, senza deformare
    contesto.resize(width >= height ? { width: lato } : { height: lato });
  }
  const immagine = await contesto.renderAsync();
  const salvata = await immagine.saveAsync({
    format: SaveFormat.JPEG,
    compress: qualita,
  });
  immagine.release();
  contesto.release();
  return {
    uri: salvata.uri,
    mimeType: 'image/jpeg',
    size: await dimensioneFile(salvata.uri),
  };
}

async function dimensioneFile(uri: string): Promise<number | null> {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    return info.exists ? info.size : null;
  } catch {
    return null;
  }
}

// --- AZIONI DALLE SCHERMATE ------------------------------------------

// Attacca la copia firmata al preventivo e lo segna come Accettato:
// se il cliente l'ha firmato, l'ha accettato.
// Le foto vengono prima ottimizzate; il limite di 10 MB si controlla
// dopo, sul file che verrà davvero salvato e caricato.
export async function salvaCopiaFirmata(
  idPreventivo: string,
  scelto: FileScelto
): Promise<void> {
  const file = eImmagine(tipoDelFile(scelto))
    ? await ottimizzaFoto(scelto)
    : scelto;

  const peso = file.size ?? (await dimensioneFile(file.uri));
  if (peso !== null && peso > DIMENSIONE_MASSIMA) throw new FileTroppoGrande();

  const tipo = tipoDelFile(file);
  const nomeFile = `${idPreventivo}-${Date.now()}.${estensione(tipo)}`;

  // intermediates: non dà errore se la cartella esiste già
  await FileSystem.makeDirectoryAsync(cartellaLocale(), {
    intermediates: true,
  });
  await FileSystem.copyAsync({ from: file.uri, to: percorsoLocale(nomeFile) });

  const db = await getDbConnection();
  const precedente = await db.getFirstAsync<{ firmato_file: string | null }>(
    'SELECT firmato_file FROM preventivi WHERE id = ?;',
    [idPreventivo]
  );

  const ora = adesso();
  await db.runAsync(
    `UPDATE preventivi
     SET firmato_file = ?, firmato_tipo = ?, firmato_at = ?,
         firmato_da_caricare = 1, stato = 'accettato',
         updated_at = ?, da_sincronizzare = 1
     WHERE id = ?;`,
    [nomeFile, tipo, ora, ora, idPreventivo]
  );

  // La copia precedente sul telefono non serve più. Quella sul server
  // la toglie la sincronizzazione (vedi inviaFileFirmati).
  if (precedente?.firmato_file) {
    await FileSystem.deleteAsync(percorsoLocale(precedente.firmato_file), {
      idempotent: true,
    });
  }

  segnalaModificaLocale();
}

// Stacca la copia firmata. Lo stato del preventivo non cambia.
export async function rimuoviCopiaFirmata(idPreventivo: string): Promise<void> {
  const db = await getDbConnection();
  const precedente = await db.getFirstAsync<{ firmato_file: string | null }>(
    'SELECT firmato_file FROM preventivi WHERE id = ?;',
    [idPreventivo]
  );

  await db.runAsync(
    `UPDATE preventivi
     SET firmato_file = NULL, firmato_tipo = NULL, firmato_at = NULL,
         firmato_da_caricare = 1,
         updated_at = ?, da_sincronizzare = 1
     WHERE id = ?;`,
    [adesso(), idPreventivo]
  );

  if (precedente?.firmato_file) {
    await FileSystem.deleteAsync(percorsoLocale(precedente.firmato_file), {
      idempotent: true,
    });
  }

  segnalaModificaLocale();
}

// Restituisce il file sul telefono, scaricandolo dal server se manca
// (succede quando la copia è stata caricata da un altro dispositivo).
export async function fileLocale(copia: CopiaFirmata): Promise<string> {
  if (!copia.firmato_file) throw new Error('Nessuna copia firmata');
  const destinazione = percorsoLocale(copia.firmato_file);

  const info = await FileSystem.getInfoAsync(destinazione);
  if (info.exists) return destinazione;

  const userId = await utenteCollegato();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(`${userId}/${copia.firmato_file}`, 120);
  if (error) throw error;

  await FileSystem.makeDirectoryAsync(cartellaLocale(), {
    intermediates: true,
  });
  const scaricato = await FileSystem.downloadAsync(
    data.signedUrl,
    destinazione
  );
  if (scaricato.status !== 200) {
    await FileSystem.deleteAsync(destinazione, { idempotent: true });
    throw new Error(`Download non riuscito (${scaricato.status})`);
  }
  return destinazione;
}

// Peso del file se è già sul telefono, altrimenti null.
// Serve per anteprima e peso nel riquadro, senza scaricare niente.
export async function dimensioneSulTelefono(
  nomeFile: string
): Promise<number | null> {
  return dimensioneFile(percorsoLocale(nomeFile));
}

// Cambio di utente sul dispositivo: i file dell'utente precedente vanno via
// insieme ai suoi dati (vedi verificaUtente in syncService.ts)
export async function svuotaFirmatiLocali(): Promise<void> {
  await FileSystem.deleteAsync(cartellaLocale(), { idempotent: true });
}

// --- SINCRONIZZAZIONE ------------------------------------------------
// Chiamata dal push PRIMA di inviare i preventivi: quando la riga arriva
// sul server con il nome del file, il file è già lì.

export async function inviaFileFirmati(
  db: SQLiteDatabase,
  userId: string
): Promise<number> {
  const righe = await db.getAllAsync<CopiaFirmata>(
    `SELECT id, firmato_file, firmato_tipo
     FROM preventivi
     WHERE firmato_da_caricare = 1;`
  );

  for (const r of righe) {
    if (r.firmato_file) {
      const locale = percorsoLocale(r.firmato_file);
      const info = await FileSystem.getInfoAsync(locale);
      if (info.exists) {
        const base64 = await FileSystem.readAsStringAsync(locale, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const { error } = await supabase.storage
          .from(BUCKET)
          .upload(`${userId}/${r.firmato_file}`, base64InByte(base64), {
            contentType: r.firmato_tipo ?? undefined,
            upsert: true,
          });
        if (error) throw error;
      } else {
        // Non dovrebbe succedere: il file è stato tolto dal telefono
        // prima di essere caricato. Non c'è niente da mandare.
        console.warn('Copia firmata non trovata sul telefono:', locale);
      }
    }

    await togliCopieVecchie(userId, r.id, r.firmato_file);

    // "AND firmato_file IS ?": se nel frattempo è stata caricata un'altra
    // copia, resta da caricare e partirà alla prossima sincronizzazione
    await db.runAsync(
      `UPDATE preventivi SET firmato_da_caricare = 0
       WHERE id = ? AND firmato_file IS ?;`,
      [r.id, r.firmato_file]
    );
  }

  return righe.length;
}

// Toglie dal server e dal telefono le copie di questo preventivo diverse
// da quella attuale (sostituite o rimosse). Se non riesce non blocca la
// sincronizzazione: al massimo resta un file in più.
async function togliCopieVecchie(
  userId: string,
  idPreventivo: string,
  attuale: string | null
): Promise<void> {
  try {
    const { data } = await supabase.storage
      .from(BUCKET)
      .list(userId, { search: idPreventivo });
    const vecchie = (data ?? [])
      .map((f) => f.name)
      .filter((nome) => nome.startsWith(idPreventivo) && nome !== attuale)
      .map((nome) => `${userId}/${nome}`);
    if (vecchie.length > 0) {
      await supabase.storage.from(BUCKET).remove(vecchie);
    }
  } catch (err) {
    console.warn('Copie firmate vecchie non tolte dal server:', err);
  }

  try {
    const cartella = cartellaLocale();
    const info = await FileSystem.getInfoAsync(cartella);
    if (!info.exists) return;
    const nomi = await FileSystem.readDirectoryAsync(cartella);
    for (const nome of nomi) {
      if (nome.startsWith(idPreventivo) && nome !== attuale) {
        await FileSystem.deleteAsync(cartella + nome, { idempotent: true });
      }
    }
  } catch (err) {
    console.warn('Copie firmate vecchie non tolte dal telefono:', err);
  }
}

async function utenteCollegato(): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error('Nessun utente collegato');
  return session.user.id;
}

// Da base64 (come lo legge expo-file-system) ai byte da caricare.
// Fatto a mano per non aggiungere una libreria solo per questo.
const ALFABETO =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const VALORI = new Uint8Array(128);
for (let i = 0; i < ALFABETO.length; i++) VALORI[ALFABETO.charCodeAt(i)] = i;

function base64InByte(base64: string): Uint8Array {
  const pulito = base64.replace(/[^A-Za-z0-9+/]/g, '');
  const lunghezza = Math.floor((pulito.length * 3) / 4);
  const byte = new Uint8Array(lunghezza);
  let j = 0;
  for (let i = 0; i < pulito.length; i += 4) {
    const a = VALORI[pulito.charCodeAt(i)];
    const b = VALORI[pulito.charCodeAt(i + 1)];
    const c = VALORI[pulito.charCodeAt(i + 2)];
    const d = VALORI[pulito.charCodeAt(i + 3)];
    byte[j++] = (a << 2) | (b >> 4);
    if (j < lunghezza) byte[j++] = ((b & 15) << 4) | (c >> 2);
    if (j < lunghezza) byte[j++] = ((c & 3) << 6) | d;
  }
  return byte;
}
