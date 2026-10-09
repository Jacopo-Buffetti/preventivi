import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import { nomeFilePreventivo } from '../utils/formato';
import type { PreventivoConCliente } from './databaseService';
import { fileLocale } from './firmatiService';
import { copiaConNome, generaPdfPreventivo } from './pdfService';

// =====================================================================
// IL DOCUMENTO DEL PREVENTIVO
// =====================================================================
// Quale file mandare quando si invia un preventivo (WhatsApp, email,
// stampa):
// - se c'è la COPIA FIRMATA dal cliente, quella: è il documento che vale,
//   e sostituisce il PDF generato dall'app;
// - altrimenti il PDF generato al momento.
// Le schermate chiedono il documento da qui e non devono sapere quale sia.
// =====================================================================

export interface DocumentoPreventivo {
  uri: string;
  mimeType: string;
  nomeFile: string; // es. preventivo-2026-004.pdf, preventivo-2026-004-firmato.jpg
  firmato: boolean;
}

export async function documentoDaInviare(
  p: PreventivoConCliente
): Promise<DocumentoPreventivo> {
  const nomeBase = nomeFilePreventivo(p.anno, p.numero_preventivo);

  if (p.firmato_file) {
    // Se è stata caricata da un altro dispositivo, qui viene scaricata
    const locale = await fileLocale(p);
    const estensione = p.firmato_file.split('.').pop() ?? 'pdf';
    const nomeFile = nomeBase.replace(/\.pdf$/, `-firmato.${estensione}`);
    // Copia con un nome leggibile: chi riceve il file vede quello, non
    // il nome interno con l'id del preventivo
    const uri = FileSystem.cacheDirectory
      ? await copiaConNome(locale, FileSystem.cacheDirectory, nomeFile)
      : locale;
    return {
      uri,
      mimeType: p.firmato_tipo ?? 'application/pdf',
      nomeFile,
      firmato: true,
    };
  }

  return {
    uri: await generaPdfPreventivo(p.id),
    mimeType: 'application/pdf',
    nomeFile: nomeBase,
    firmato: false,
  };
}

// Apre la stampa del documento. Un PDF si stampa così com'è; una foto
// (copia firmata fotografata) si mette su una pagina A4, adattata al foglio.
export async function stampaDocumento(doc: DocumentoPreventivo): Promise<void> {
  if (doc.mimeType === 'application/pdf') {
    await Print.printAsync({ uri: doc.uri });
    return;
  }

  // L'immagine va dentro l'HTML come data URI: un percorso file:// non
  // verrebbe caricato dalla pagina di stampa su Android
  const base64 = await FileSystem.readAsStringAsync(doc.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  await Print.printAsync({
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page { size: A4; margin: 10mm; }
    html, body { margin: 0; height: 100%; }
    body { display: flex; align-items: center; justify-content: center; }
    img { max-width: 100%; max-height: 100%; object-fit: contain; }
  </style>
</head>
<body>
  <img src="data:${doc.mimeType};base64,${base64}" alt="Preventivo firmato">
</body>
</html>`,
  });
}
