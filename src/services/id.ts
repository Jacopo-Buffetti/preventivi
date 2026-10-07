import * as Crypto from 'expo-crypto';

// Genera un identificativo univoco (UUID v4) usando il generatore casuale
// sicuro del sistema operativo.
// Serve per la sincronizzazione: due dispositivi che creano record offline,
// anche nello stesso istante, non producono mai lo stesso ID.
// Esempio: "3f2a9c1e-7b4d-4e8a-9f1c-2d5e6a7b8c9d"
export function nuovoId(): string {
  return Crypto.randomUUID();
}
