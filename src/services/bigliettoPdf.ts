import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { htmlBiglietto } from '../pdf/templateBiglietto';
import type { Biglietto } from './bigliettoService';
import { stampaSulWeb } from './pdfService';

// Errore lanciato quando una finestra di condivisione è ancora aperta
export const CONDIVISIONE_IN_CORSO = 'CONDIVISIONE_IN_CORSO';

// Su Android si può aprire una sola condivisione alla volta: se la precedente
// non si è ancora chiusa, una nuova richiesta viene rifiutata.
let condivisioneAperta = false;

// 85 x 55 mm in punti tipografici (1 mm = 2,8346 pt)
const FORMATO_BIGLIETTO = { width: 241, height: 156 };

// Crea il PDF del biglietto (pagina 1 fronte, pagina 2 retro) e apre la condivisione.
// È il formato da mandare in tipografia. Sul web apre la finestra di stampa.
export async function condividiPdfBiglietto(b: Biglietto): Promise<void> {
  const html = htmlBiglietto(b);

  if (Platform.OS === 'web') {
    stampaSulWeb(html);
    return;
  }

  // base64: true fa restituire anche il contenuto del PDF, oltre al percorso del file
  const { uri, base64 } = await Print.printToFileAsync({
    html,
    ...FORMATO_BIGLIETTO,
    margins: { left: 0, top: 0, right: 0, bottom: 0 },
    base64: true,
  });

  const uriDaCondividere = await salvaInCache(uri, base64);

  if (await Sharing.isAvailableAsync()) {
    if (condivisioneAperta) throw new Error(CONDIVISIONE_IN_CORSO);
    condivisioneAperta = true;
    try {
      await Sharing.shareAsync(uriDaCondividere, {
        mimeType: 'application/pdf',
        UTI: 'com.adobe.pdf',
        dialogTitle: 'Biglietto da visita',
      });
    } catch (err) {
      if (String(err).includes('Another share request')) {
        throw new Error(CONDIVISIONE_IN_CORSO);
      }
      throw err;
    } finally {
      condivisioneAperta = false;
    }
  } else {
    await Print.printAsync({ uri: uriDaCondividere });
  }
}

// expo-print salva il PDF in una sua cartella temporanea. Su Android, e in
// particolare dentro Expo Go, quella cartella non è leggibile né dalla
// condivisione ("Not allowed to read file") né da expo-file-system ("isn't
// readable"), quindi non si può nemmeno copiare il file.
// Per questo riscriviamo il PDF da zero nella cache dell'app, partendo dal suo
// contenuto in base64: quella cartella è sempre leggibile.
async function salvaInCache(uri: string, base64?: string): Promise<string> {
  if (!FileSystem.cacheDirectory || !base64) return uri;
  const destinazione = FileSystem.cacheDirectory + 'biglietto-da-visita.pdf';
  await FileSystem.writeAsStringAsync(destinazione, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return destinazione;
}
