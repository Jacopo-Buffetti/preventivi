import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Sharing from 'expo-sharing';
import type { DocumentoPreventivo } from './documentoPreventivo';

// =====================================================================
// APRIRE UN DOCUMENTO PER GUARDARLO
// =====================================================================
// Android: si chiede al telefono di APRIRE il file (non di condividerlo).
//   Parte il lettore predefinito (PDF di Drive, Galleria, Foto...), o il
//   menu "Apri con" se non ce n'è uno predefinito.
// iPhone: non esiste un "apri con" generico: il documento si mostra
//   dentro l'app (VisualizzatoreDocumento), che legge PDF e foto da solo.
// =====================================================================

// Flag Android: l'app che apre il file riceve il permesso di leggerlo
const PERMESSO_LETTURA = 1; // Intent.FLAG_GRANT_READ_URI_PERMISSION

export async function apriConAppEsterna(
  doc: DocumentoPreventivo
): Promise<void> {
  try {
    // Le altre app non possono leggere i file:// della nostra cartella:
    // serve un indirizzo content:// che il sistema gestisce per noi
    const indirizzo = await FileSystem.getContentUriAsync(doc.uri);
    await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
      data: indirizzo,
      type: doc.mimeType,
      flags: PERMESSO_LETTURA,
    });
  } catch (err) {
    // Nessuna app sul telefono sa aprire questo tipo di file: almeno si
    // può mandarlo a un'app che lo apre (Drive, Gmail...)
    console.warn('Nessuna app per aprire il file, uso la condivisione:', err);
    await condividiDocumento(doc);
  }
}

export async function condividiDocumento(
  doc: DocumentoPreventivo
): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Condivisione non disponibile su questo dispositivo');
  }
  await Sharing.shareAsync(doc.uri, {
    mimeType: doc.mimeType,
    UTI: doc.mimeType === 'application/pdf' ? 'com.adobe.pdf' : undefined,
    dialogTitle: doc.nomeFile,
  });
}
