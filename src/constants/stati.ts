import type { StatoPreventivo } from '../services/databaseService';
import type { NomeTema } from './tema';

// Etichette e colori dei badge di stato, usati in Home, lista e dettaglio.
//
// I colori dipendono dal tema: su fondo scuro servono tinte più chiare.
// Ogni stato ha anche una luminosità diversa dagli altri, così si
// distinguono anche alla luce del sole o per chi vede male i colori.
// "Inviato" è blu e non ambra, per non confondersi con l'accento ottone.

type ColoriStato = { colore: string; sfondo: string };

const COLORI: Record<NomeTema, Record<StatoPreventivo, ColoriStato>> = {
  light: {
    bozza: { colore: '#5B6672', sfondo: '#E9ECEF' },
    inviato: { colore: '#1F5FA8', sfondo: '#E3EDF8' },
    accettato: { colore: '#1E7A46', sfondo: '#E2F3E8' },
    rifiutato: { colore: '#B3261E', sfondo: '#FBE6E4' },
  },
  dark: {
    bozza: { colore: '#A7B4C2', sfondo: 'rgba(167, 180, 194, 0.14)' },
    inviato: { colore: '#8BBBF0', sfondo: 'rgba(79, 148, 224, 0.16)' },
    accettato: { colore: '#7ED9A6', sfondo: 'rgba(63, 185, 122, 0.16)' },
    rifiutato: { colore: '#F29A90', sfondo: 'rgba(229, 96, 84, 0.18)' },
  },
};

export const ETICHETTE_STATO: Record<StatoPreventivo, string> = {
  bozza: 'Bozza',
  inviato: 'Inviato',
  accettato: 'Accettato',
  rifiutato: 'Rifiutato',
};

export function coloriStato(
  stato: StatoPreventivo,
  tema: NomeTema
): ColoriStato {
  return COLORI[tema][stato];
}

// Versione precedente, ancora usata da lista e dettaglio finché non
// vengono ridisegnati (passo 4): toni intermedi leggibili su entrambi i
// temi, con "inviato" già passato dall'ambra al blu.
export const STATI: Record<
  StatoPreventivo,
  { etichetta: string; colore: string; sfondo: string }
> = {
  bozza: {
    etichetta: 'BOZZA',
    colore: '#94A3B8',
    sfondo: 'rgba(148,163,184,0.15)',
  },
  inviato: {
    etichetta: 'INVIATO',
    colore: '#3B82F6',
    sfondo: 'rgba(59,130,246,0.15)',
  },
  accettato: {
    etichetta: 'ACCETTATO',
    colore: '#22C55E',
    sfondo: 'rgba(34,197,94,0.15)',
  },
  rifiutato: {
    etichetta: 'RIFIUTATO',
    colore: '#EF4444',
    sfondo: 'rgba(239,68,68,0.15)',
  },
};

export const ORDINE_STATI: StatoPreventivo[] = [
  'bozza',
  'inviato',
  'accettato',
  'rifiutato',
];
