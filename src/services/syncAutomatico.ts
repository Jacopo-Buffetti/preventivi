import { useCallback, useState, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import { sulleModificheLocali } from './eventiSync';
import { sincronizza } from './syncService';

// =====================================================================
// SINCRONIZZAZIONE AUTOMATICA
// =====================================================================
// Decide QUANDO sincronizzare (il COME è in syncService.ts):
//
// 1. all'avvio, appena c'è un utente collegato
// 2. quando l'app torna in primo piano (es. dopo una telefonata)
// 3. qualche secondo dopo ogni modifica locale
// 4. a richiesta: "tira per aggiornare" sulle liste, pulsante nel profilo
//
// Gli errori (tipicamente: niente rete) non mostrano avvisi: l'app
// funziona offline e le modifiche restano in coda per la volta dopo.
// Lo stato è visibile nel profilo.
// =====================================================================

// Dopo una modifica aspettiamo un attimo: se l'utente sta salvando più
// cose di fila, partono tutte insieme in un'unica sincronizzazione.
const ATTESA_DOPO_MODIFICA_MS = 3000;

export interface StatoSync {
  inCorso: boolean;
  ultimaRiuscita: Date | null;
  errore: string | null;
}

let stato: StatoSync = { inCorso: false, ultimaRiuscita: null, errore: null };
const ascoltatoriStato = new Set<() => void>();
let timerModifica: ReturnType<typeof setTimeout> | null = null;

function aggiornaStato(parziale: Partial<StatoSync>) {
  // Nuovo oggetto a ogni cambio: useSyncExternalStore se ne accorge così
  stato = { ...stato, ...parziale };
  ascoltatoriStato.forEach((f) => f());
}

// Avvia una sincronizzazione adesso. Non lancia mai errori: li registra
// nello stato. Se ne è già in corso una, syncService la mette in coda.
export async function sincronizzaOra(): Promise<void> {
  aggiornaStato({ inCorso: true });
  try {
    await sincronizza();
    aggiornaStato({ inCorso: false, ultimaRiuscita: new Date(), errore: null });
  } catch (err) {
    console.warn('Sincronizzazione non riuscita:', err);
    aggiornaStato({ inCorso: false, errore: descriviErrore(err) });
  }
}

// Da chiamare quando un utente è collegato. Restituisce la funzione per
// fermare tutto (da chiamare al logout).
export function avviaSincronizzazioneAutomatica(): () => void {
  // 1. Subito
  sincronizzaOra();

  // 2. Al ritorno in primo piano
  const abbonamentoApp = AppState.addEventListener('change', (statoApp) => {
    if (statoApp === 'active') sincronizzaOra();
  });

  // 3. Dopo ogni modifica locale, con un piccolo ritardo
  const smettiDiAscoltare = sulleModificheLocali(() => {
    if (timerModifica) clearTimeout(timerModifica);
    timerModifica = setTimeout(() => {
      timerModifica = null;
      sincronizzaOra();
    }, ATTESA_DOPO_MODIFICA_MS);
  });

  return () => {
    abbonamentoApp.remove();
    smettiDiAscoltare();
    if (timerModifica) clearTimeout(timerModifica);
    timerModifica = null;
  };
}

// --- HOOK PER LE SCHERMATE ---

// Stato della sincronizzazione (per l'indicatore nel profilo)
export function useStatoSync(): StatoSync {
  return useSyncExternalStore(
    (f) => {
      ascoltatoriStato.add(f);
      return () => {
        ascoltatoriStato.delete(f);
      };
    },
    () => stato
  );
}

// Per ricaricare una schermata quando arrivano dati nuovi dal server
// si usa useCaricaQuandoVisibile (src/hooks/useCaricaQuandoVisibile.ts).

// "Tira per aggiornare" per FlatList e ScrollView (RefreshControl)
export function useTiraPerAggiornare() {
  const [aggiornando, setAggiornando] = useState(false);
  const aggiorna = useCallback(async () => {
    setAggiornando(true);
    await sincronizzaOra();
    setAggiornando(false);
  }, []);
  return { aggiornando, aggiorna };
}

// --- SUPPORTO ---

function descriviErrore(err: unknown): string {
  const messaggio =
    err && typeof err === 'object' && 'message' in err
      ? String((err as { message: unknown }).message)
      : String(err);
  const m = messaggio.toLowerCase();
  if (m.includes('network') || m.includes('fetch') || m.includes('timeout')) {
    return 'Nessuna connessione';
  }
  if (m.includes('nessun utente')) return 'Nessun utente collegato';
  return messaggio;
}
