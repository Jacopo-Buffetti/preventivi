import type { StatoPreventivo } from '../services/databaseService';

// Etichette e colori dei badge di stato, usati in lista e dettaglio
export const STATI: Record<StatoPreventivo, { etichetta: string; colore: string; sfondo: string }> =
  {
    bozza: { etichetta: 'BOZZA', colore: '#94A3B8', sfondo: 'rgba(148,163,184,0.15)' },
    inviato: { etichetta: 'INVIATO', colore: '#F59E0B', sfondo: 'rgba(245,158,11,0.15)' },
    accettato: { etichetta: 'ACCETTATO', colore: '#22C55E', sfondo: 'rgba(34,197,94,0.15)' },
    rifiutato: { etichetta: 'RIFIUTATO', colore: '#EF4444', sfondo: 'rgba(239,68,68,0.15)' },
  };

export const ORDINE_STATI: StatoPreventivo[] = ['bozza', 'inviato', 'accettato', 'rifiutato'];
