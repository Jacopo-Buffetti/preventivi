import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { DOCUMENTO } from '../constants/documento';
import {
  htmlPreventivo,
  type DatiPdfPreventivo,
} from '../pdf/templatePreventivo';
import { formattaData, formattaNumeroPreventivo } from '../utils/formato';
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

async function costruisciDati(
  idPreventivo: string
): Promise<DatiPdfPreventivo> {
  const [preventivo, voci, profilo] = await Promise.all([
    getPreventivoById(idPreventivo),
    getVociByPreventivoId(idPreventivo),
    getProfiloFabbro(),
  ]);

  if (!preventivo) throw new Error(`Preventivo ${idPreventivo} non trovato`);

  return {
    numero: formattaNumeroPreventivo(
      preventivo.anno,
      preventivo.numero_preventivo
    ),
    data: formattaData(preventivo.data_creazione),
    oggetto: preventivo.oggetto ?? '',
    validitaGiorni: DOCUMENTO.validitaGiorni,

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

    note: preventivo.note_pagamento,
    modalitaPagamento: DOCUMENTO.modalitaPagamento,
    slogan: DOCUMENTO.slogan,
  };
}

// Genera il PDF del preventivo e apre la condivisione (WhatsApp, email, Drive...).
// Sul web apre invece la finestra di stampa, da cui si può salvare come PDF.
export async function condividiPdfPreventivo(
  idPreventivo: string
): Promise<void> {
  const dati = await costruisciDati(idPreventivo);
  const html = htmlPreventivo(dati);

  if (Platform.OS === 'web') {
    stampaSulWeb(html);
    return;
  }

  const { uri } = await Print.printToFileAsync({ html, ...A4 });
  // Some Android devices restrict direct sharing from the temporary
  // print location. Copying the file into the app cache directory
  // ensures Sharing can read it reliably.
  let uriToShare = uri;
  try {
    const filename = `preventivo-${idPreventivo}.pdf`;
    const dest = FileSystem.cacheDirectory + filename;
    // Copy the file to cache (overwrite if exists)
    await FileSystem.copyAsync({ from: uri, to: dest });
    uriToShare = dest;
  } catch (copyErr) {
    // If copy fails, try to obtain a content:// URI on Android so other apps can read it
    console.warn(
      'Impossibile copiare il PDF in cache, provo a ottenere content URI',
      copyErr
    );
    try {
      if (Platform.OS === 'android' && FileSystem.getContentUriAsync) {
        const contentUri = await FileSystem.getContentUriAsync(uri);
        uriToShare = contentUri;
      } else {
        uriToShare = uri;
      }
    } catch (contentErr) {
      console.warn(
        'Impossibile ottenere content URI, uso il percorso originale',
        contentErr
      );
      uriToShare = uri;
    }
  }

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
  const dati = await costruisciDati(idPreventivo);
  const html = htmlPreventivo(dati);

  const { uri } = await Print.printToFileAsync({ html, ...A4 });

  // Copia su cache per compatibilità con Sharing su Android
  try {
    const filename = `preventivo-${idPreventivo}.pdf`;
    const dest = FileSystem.cacheDirectory + filename;
    await FileSystem.copyAsync({ from: uri, to: dest });
    return dest;
  } catch (copyErr) {
    // Try to return a content URI on Android if copy fails
    console.warn(
      'Impossibile copiare il PDF in cache, provo a ottenere content URI',
      copyErr
    );
    try {
      if (Platform.OS === 'android' && FileSystem.getContentUriAsync) {
        const contentUri = await FileSystem.getContentUriAsync(uri);
        return contentUri;
      }
    } catch (contentErr) {
      console.warn(
        'Impossibile ottenere content URI, uso il percorso originale',
        contentErr
      );
    }
    return uri;
  }
}

// Sul web si stampa da un iframe nascosto: così si stampa solo il preventivo
// e non la schermata dell'app, e il browser non blocca una finestra popup.
function stampaSulWeb(html: string) {
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
