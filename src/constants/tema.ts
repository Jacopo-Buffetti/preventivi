import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useColorScheme } from 'react-native';

// =====================================================================
// TEMA DELL'APP: "Notte e Ottone"
// =====================================================================
// I colori vengono dal marchio (logo e PDF del preventivo): il blu notte
// #071522 e l'ottone #B97A18. Un solo accento in tutta l'app: quello che
// è color ottone si può toccare.
//
// Tutte le schermate leggono i colori da qui con useTema(): nessuna
// schermata deve avere una palette propria.
// =====================================================================

// Carattere Archivo, caricato in _layout.tsx.
// Con un carattere personalizzato su Android "fontWeight" non sceglie il
// file giusto: ogni peso è un font a sé, quindi si usa fontFamily.
export const FONT = {
  regolare: 'Archivo_400Regular',
  medio: 'Archivo_500Medium',
  semi: 'Archivo_600SemiBold',
  grassetto: 'Archivo_700Bold',
  pieno: 'Archivo_800ExtraBold',
} as const;

export const TEMI = {
  light: {
    // Superfici
    sfondo: '#F2F3F4',
    card: '#FFFFFF',
    riquadro: '#F2F3F4', // icone, pulsanti secondari dentro le card
    bordo: '#DFE3E7',
    input: '#FFFFFF',
    inputFoglio: '#F2F3F4',
    overlay: 'rgba(7, 21, 34, 0.45)',

    // Testi
    testo: '#172330',
    testoSecondario: '#5B6672',

    // Accento ottone: "accento" è la versione leggibile come testo,
    // "bottonePrimario" quella per i riempimenti (con testo blu notte sopra)
    accento: '#8A5A10',
    ottone: '#B97A18',
    bottonePrimario: '#D39A38',
    testoSuPrimario: '#071522',
    bottoneSecondario: '#E7EAED',

    // Intestazione blu notte (uguale nei due temi)
    intestazione: '#071522',
    testoIntestazione: '#FFFFFF',
    testoIntestazioneSecondario: '#A9B6C4',
    riquadroIntestazione: 'rgba(255, 255, 255, 0.08)',

    // Barra in basso
    barraTab: '#FFFFFF',
    tabAttiva: '#071522',

    // Stati
    successo: '#1E7A46',
    pericolo: '#B3261E',
  },
  dark: {
    sfondo: '#071522',
    card: '#0F2133',
    riquadro: '#142A3F',
    bordo: '#1F3650',
    input: '#142A3F',
    inputFoglio: '#0F2133',
    overlay: 'rgba(0, 0, 0, 0.6)',

    testo: '#EEF2F6',
    testoSecondario: '#93A3B5',

    accento: '#D39A38',
    ottone: '#B97A18',
    bottonePrimario: '#D39A38',
    testoSuPrimario: '#071522',
    bottoneSecondario: '#1F3650',

    intestazione: '#102338',
    testoIntestazione: '#FFFFFF',
    testoIntestazioneSecondario: '#A9B6C4',
    riquadroIntestazione: 'rgba(255, 255, 255, 0.08)',

    barraTab: '#0B1A2A',
    tabAttiva: '#FFFFFF',

    successo: '#7ED9A6',
    pericolo: '#F29A90',
  },
};

export type Tema = typeof TEMI.light;
export type NomeTema = keyof typeof TEMI;

// =====================================================================
// SCELTA DEL TEMA (ricordata tra un avvio e l'altro)
// =====================================================================
// Un "contesto" React: un valore condiviso da tutta l'app. Quando cambia,
// tutte le schermate che usano useTema() si ridisegnano insieme.
//
// Finché l'utente non sceglie, si segue l'impostazione del telefono.
// Dalla prima scelta si usa quella, salvata in AsyncStorage.

const CHIAVE_TEMA = 'preferenze:tema';

interface ContestoTema {
  nome: NomeTema;
  tema: Tema;
  alterna: () => void;
}

const Contesto = createContext<ContestoTema | null>(null);

export function ProviderTema({ children }: { children: ReactNode }) {
  const sistema = useColorScheme();
  const [scelta, setScelta] = useState<NomeTema | null>(null);
  const [caricato, setCaricato] = useState(false);

  // All'avvio legge la scelta salvata
  useEffect(() => {
    AsyncStorage.getItem(CHIAVE_TEMA)
      .then((valore) => {
        if (valore === 'light' || valore === 'dark') setScelta(valore);
      })
      .catch((err) => console.warn('Impossibile leggere il tema salvato:', err))
      .finally(() => setCaricato(true));
  }, []);

  // Nessuna scelta: come prima, scuro salvo telefono impostato su chiaro
  const nome: NomeTema = scelta ?? (sistema === 'light' ? 'light' : 'dark');

  const alterna = useCallback(() => {
    const nuovo: NomeTema = nome === 'dark' ? 'light' : 'dark';
    setScelta(nuovo);
    AsyncStorage.setItem(CHIAVE_TEMA, nuovo).catch((err) =>
      console.warn('Impossibile salvare il tema:', err)
    );
  }, [nome]);

  const valore = useMemo(
    () => ({ nome, tema: TEMI[nome], alterna }),
    [nome, alterna]
  );

  // Aspettiamo di aver letto la scelta: così l'app non parte col tema
  // sbagliato per poi cambiare colore un istante dopo
  if (!caricato) return null;

  // createElement invece di JSX perché questo file è .ts, non .tsx
  return createElement(Contesto.Provider, { value: valore }, children);
}

// I colori del tema attivo
export function useTema(): Tema {
  const contesto = useContext(Contesto);
  const sistema = useColorScheme();
  if (contesto) return contesto.tema;
  // Fuori dal provider (non dovrebbe succedere): si segue il telefono
  return sistema === 'light' ? TEMI.light : TEMI.dark;
}

// Nome del tema attivo e funzione per cambiarlo (per il pulsante)
export function useSceltaTema(): { nome: NomeTema; alterna: () => void } {
  const contesto = useContext(Contesto);
  if (!contesto) return { nome: 'dark', alterna: () => {} };
  return { nome: contesto.nome, alterna: contesto.alterna };
}
