import type { StatoPreventivo } from '../services/databaseService';
import { assegnaNumero } from '../services/syncService';
import { conferma } from './dialoghi';

// Da chiamare prima di ogni invio di un preventivo (condivisione, WhatsApp,
// email, stampa), da qualunque schermata parta.
//
// - Se il preventivo ha già un numero, non fa niente.
// - Se è una bozza senza numero, chiede il numero al server.
// - Se il server non risponde, propone di generare il PDF come bozza.
//
// Restituisce il preventivo aggiornato (con numero, anno e stato nuovi),
// lo stesso preventivo se l'utente sceglie la bozza, oppure null se
// l'utente rinuncia all'invio.
export async function prontoPerInvio<
  T extends {
    id: string;
    numero_preventivo: number | null;
    anno: number;
    stato: StatoPreventivo;
  },
>(preventivo: T): Promise<T | null> {
  if (preventivo.numero_preventivo !== null) return preventivo;

  try {
    const { numero, anno } = await assegnaNumero(preventivo.id);
    return {
      ...preventivo,
      numero_preventivo: numero,
      anno,
      stato: preventivo.stato === 'bozza' ? 'inviato' : preventivo.stato,
    };
  } catch (err) {
    console.warn('Impossibile assegnare il numero:', err);
    const comeBozza = await conferma(
      'Numero non assegnato',
      'Il numero definitivo viene assegnato online e ora non riesco a contattare il server. ' +
        'Vuoi generare comunque il PDF come BOZZA, senza numero?',
      'Usa bozza'
    );
    return comeBozza ? preventivo : null;
  }
}
