import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { DOCUMENTO } from '../constants/documento';
import { htmlPreventivo, type DatiPdfPreventivo } from '../pdf/templatePreventivo';
import {
  getPreventivoById,
  getProfiloFabbro,
  getVociByPreventivoId,
} from './databaseService';
import { formattaData, formattaNumeroPreventivo } from '../utils/formato';

// Formato A4 in punti tipografici (1 pt = 1/72 di pollice)
const A4 = { width: 595, height: 842 };

// Numero senza simbolo €, che nel template è già scritto prima del valore
function importo(valore: number): string {
  return valore.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function costruisciDati(idPreventivo: string): Promise<DatiPdfPreventivo> {
  const [preventivo, voci, profilo] = await Promise.all([
    getPreventivoById(idPreventivo),
    getVociByPreventivoId(idPreventivo),
    getProfiloFabbro(),
  ]);

  if (!preventivo) throw new Error(`Preventivo ${idPreventivo} non trovato`);

  return {
    numero: formattaNumeroPreventivo(preventivo.anno, preventivo.numero_preventivo),
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
export async function condividiPdfPreventivo(idPreventivo: string): Promise<void> {
  const dati = await costruisciDati(idPreventivo);
  const html = htmlPreventivo(dati);

  if (Platform.OS === 'web') {
    stampaSulWeb(html);
    return;
  }

  const { uri } = await Print.printToFileAsync({ html, ...A4 });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
      dialogTitle: `Preventivo ${dati.numero}`,
    });
  } else {
    await Print.printAsync({ uri });
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
