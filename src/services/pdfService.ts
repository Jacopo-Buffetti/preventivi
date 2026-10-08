import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { DOCUMENTO } from '../constants/documento';
import {
  htmlPreventivo,
  type DatiPdfPreventivo,
} from '../pdf/templatePreventivo';
import {
  formattaData,
  formattaNumeroPreventivo,
  formattaPercentuale,
  nomeFilePreventivo,
  percentualeSconto,
} from '../utils/formato';
import { getBiglietto } from './bigliettoService';
import {
  getPreventivoById,
  getProfiloFabbro,
  getVociByPreventivoId,
} from './databaseService';

// Formato A4 in punti tipografici (1 pt = 1/72 di pollice)
const A4 = { width: 595, height: 842 };

// Numero senza simbolo €, che nel template è già scritto prima del valore
function importo(valore: number): string {
  return valore.toLocaleString('it-IT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// Restituisce i dati per il template e il nome del file PDF.
// Il nome usa anno e numero (preventivo-2026-005.pdf) e non l'ID interno,
// che ora è un UUID poco leggibile per il cliente che riceve il file.
async function costruisciDati(
  idPreventivo: string
): Promise<{ dati: DatiPdfPreventivo; nomeFile: string }> {
  const [preventivo, voci, profilo, biglietto] = await Promise.all([
    getPreventivoById(idPreventivo),
    getVociByPreventivoId(idPreventivo),
    getProfiloFabbro(),
    getBiglietto(),
  ]);

  if (!preventivo) throw new Error(`Preventivo ${idPreventivo} non trovato`);

  const totaleConIva = preventivo.totale_imponibile + preventivo.totale_iva;
  const sconto = preventivo.sconto ?? 0;

  const dati: DatiPdfPreventivo = {
    numero: formattaNumeroPreventivo(
      preventivo.anno,
      preventivo.numero_preventivo
    ),
    data: formattaData(preventivo.data_creazione),
    oggetto: preventivo.oggetto ?? '',
    validitaGiorni: DOCUMENTO.validitaGiorni,
    logo: biglietto?.logo || undefined,

    cliente: {
      nome: preventivo.cliente_nome ?? 'Cliente',
      indirizzo: preventivo.cliente_indirizzo,
      email: preventivo.cliente_email,
      telefono: preventivo.cliente_telefono,
    },

    azienda: {
      nome: profilo?.nome_azienda || 'La tua officina',
      indirizzo: profilo?.indirizzo,
      partitaIva: profilo?.p_iva,
      codiceFiscale: profilo?.codice_fiscale,
      email: profilo?.email,
      telefono: profilo?.telefono,
      iban: profilo?.iban,
    },

    righe: voci.map((v) => ({
      descrizione: v.descrizione,
      quantita: v.quantita.toLocaleString('it-IT'),
      prezzoUnitario: importo(v.prezzo_unitario),
      totale: importo(v.totale_voce),
    })),

    imponibile: importo(preventivo.totale_imponibile),
    ivaPercentuale: preventivo.aliquota_iva,
    iva: importo(preventivo.totale_iva),
    totale: importo(preventivo.totale_generale),
    arrotondamento:
      sconto > 0
        ? {
            totaleConIva: importo(totaleConIva),
            sconto: importo(sconto),
            percentuale: formattaPercentuale(
              percentualeSconto(sconto, totaleConIva)
            ),
          }
        : undefined,

    note: preventivo.note_pagamento,
    modalitaPagamento: DOCUMENTO.modalitaPagamento,
    slogan: DOCUMENTO.slogan,
  };

  return {
    dati,
    nomeFile: nomeFilePreventivo(preventivo.anno, preventivo.numero_preventivo),
  };
}

// Genera il PDF del preventivo e apre la condivisione (WhatsApp, email, Drive...).
// Sul web apre invece la finestra di stampa, da cui si può salvare come PDF.
export async function condividiPdfPreventivo(
  idPreventivo: string
): Promise<void> {
  const { dati, nomeFile } = await costruisciDati(idPreventivo);
  const html = htmlPreventivo(dati);

  if (Platform.OS === 'web') {
    stampaSulWeb(html);
    return;
  }

  const uriToShare = await creaFilePdf(html, nomeFile);

  if (await Sharing.isAvailableAsync()) {
    try {
      await Sharing.shareAsync(uriToShare, {
        mimeType: 'application/pdf',
        UTI: 'com.adobe.pdf',
        dialogTitle: `Preventivo ${dati.numero}`,
      });
    } catch (shareErr) {
      console.error('Condivisione fallita', shareErr);
      // Fallback: apri la UI di stampa se la condivisione fallisce
      try {
        await Print.printAsync({ uri: uriToShare });
      } catch (printErr) {
        console.error('Stampa di fallback fallita', printErr);
        throw shareErr;
      }
    }
  } else {
    await Print.printAsync({ uri: uriToShare });
  }
}

// Genera il PDF e restituisce l'URI pronto per la condivisione/stampa.
export async function generaPdfPreventivo(
  idPreventivo: string
): Promise<string> {
  const { dati, nomeFile } = await costruisciDati(idPreventivo);
  const html = htmlPreventivo(dati);

  return creaFilePdf(html, nomeFile);
}

// Copia un file in una cartella con il nome indicato.
// Se esiste già un file con quel nome (preventivo condiviso o salvato in
// precedenza) viene prima eliminato: la copia non sovrascrive da sola e
// fallirebbe, facendo finire al cliente il file temporaneo col nome UUID.
export async function copiaConNome(
  uri: string,
  cartella: string,
  nomeFile: string
): Promise<string> {
  const dest = cartella + nomeFile;
  await FileSystem.deleteAsync(dest, { idempotent: true });
  await FileSystem.copyAsync({ from: uri, to: dest });
  return dest;
}

// Genera il PDF e lo scrive in cache con un nome leggibile
// (preventivo-2026-004.pdf), così le app che lo ricevono mostrano quel nome.
//
// Perché non copiamo il file creato da expo-print: expo-print lo salva nella
// SUA cartella temporanea (cache/Print/<uuid>.pdf). In Expo Go quella cartella
// sta fuori dallo spazio a cui la nostra app ha accesso, quindi copyAsync
// fallisce con "isn't readable". Chiediamo invece a expo-print anche il
// contenuto in base64 e scriviamo noi il file nella nostra cache: funziona
// sia in Expo Go sia nell'app installata.
async function creaFilePdf(html: string, nomeFile: string): Promise<string> {
  const { uri, base64 } = await Print.printToFileAsync({
    html,
    ...A4,
    base64: true,
  });

  if (!base64 || !FileSystem.cacheDirectory) {
    console.warn('PDF senza contenuto base64, uso il file temporaneo');
    return uri;
  }

  try {
    const dest = FileSystem.cacheDirectory + nomeFile;
    // writeAsStringAsync sovrascrive un eventuale file con lo stesso nome
    await FileSystem.writeAsStringAsync(dest, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return dest;
  } catch (scritturaErr) {
    console.warn(
      'Impossibile scrivere il PDF in cache, uso il file temporaneo',
      scritturaErr
    );
    return uri;
  }
}

// Sul web si stampa da un iframe nascosto: così si stampa solo il preventivo
// e non la schermata dell'app, e il browser non blocca una finestra popup.
export function stampaSulWeb(html: string) {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.srcdoc = html;

  iframe.onload = () => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    // Rimuove l'iframe quando la finestra di stampa è stata chiusa
    setTimeout(() => iframe.remove(), 1000);
  };

  document.body.appendChild(iframe);
}
