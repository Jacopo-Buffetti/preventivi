import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { creaVCard, nomeFileVCard } from '../utils/vcard';
import { CONDIVISIONE_IN_CORSO } from './bigliettoPdf';
import type { Biglietto } from './bigliettoService';

let condivisioneAperta = false;

// Crea il file .vcf del contatto e apre la condivisione del telefono
// (WhatsApp, email, Bluetooth...). Sul web scarica il file.
export async function condividiContatto(b: Biglietto): Promise<void> {
  const contenuto = creaVCard(b);
  const nomeFile = nomeFileVCard(b);

  if (Platform.OS === 'web') {
    scaricaSulWeb(contenuto, nomeFile);
    return;
  }

  if (!FileSystem.cacheDirectory)
    throw new Error('Cartella cache non disponibile');
  const uri = FileSystem.cacheDirectory + nomeFile;
  await FileSystem.writeAsStringAsync(uri, contenuto, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Condivisione non disponibile su questo dispositivo');
  }
  if (condivisioneAperta) throw new Error(CONDIVISIONE_IN_CORSO);

  condivisioneAperta = true;
  try {
    await Sharing.shareAsync(uri, {
      mimeType: 'text/vcard',
      UTI: 'public.vcard',
      dialogTitle: 'Condividi contatto',
    });
  } catch (err) {
    if (String(err).includes('Another share request'))
      throw new Error(CONDIVISIONE_IN_CORSO);
    throw err;
  } finally {
    condivisioneAperta = false;
  }
}

function scaricaSulWeb(contenuto: string, nomeFile: string) {
  const blob = new Blob([contenuto], { type: 'text/vcard;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nomeFile;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
