import { useColorScheme } from 'react-native';

// Colori condivisi dalle pagine dell'app (tema scuro e chiaro)
export const TEMI = {
  dark: {
    sfondo: '#0F172A',
    card: '#1E293B',
    bordo: '#334155',
    input: '#1E293B',
    inputFoglio: '#0F172A',
    testo: '#F8FAFC',
    testoSecondario: '#94A3B8',
    accento: '#F59E0B',
    bottonePrimario: '#D97706',
    bottoneSecondario: '#334155',
    pericolo: '#EF4444',
    overlay: 'rgba(2, 6, 23, 0.72)',
  },
  light: {
    sfondo: '#F4F5F7',
    card: '#FFFFFF',
    bordo: '#E2E8F0',
    input: '#FFFFFF',
    inputFoglio: '#F4F5F7',
    testo: '#0F172A',
    testoSecondario: '#64748B',
    accento: '#D97706',
    bottonePrimario: '#D97706',
    bottoneSecondario: '#E2E8F0',
    pericolo: '#DC2626',
    overlay: 'rgba(15, 23, 42, 0.45)',
  },
};

export type Tema = typeof TEMI.dark;

export function useTema(): Tema {
  return useColorScheme() === 'light' ? TEMI.light : TEMI.dark;
}
