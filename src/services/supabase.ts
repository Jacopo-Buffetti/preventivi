import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

// I valori arrivano da .env.local. Expo rende leggibili nell'app solo le
// variabili che iniziano con EXPO_PUBLIC_, e le inserisce al momento del
// bundle: se le cambi, riavvia con "pnpm expo start -c".
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const chiavePubblica = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !chiavePubblica) {
  throw new Error(
    'Configurazione Supabase mancante: controlla EXPO_PUBLIC_SUPABASE_URL e ' +
      'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY nel file .env.local, poi riavvia con -c.'
  );
}

// Un unico client per tutta l'app.
export const supabase = createClient(url, chiavePubblica, {
  auth: {
    // Dove salvare la sessione (token di accesso e di rinnovo).
    // AsyncStorage la conserva anche chiudendo l'app: il login si fa
    // una volta sola per dispositivo. Funziona anche offline: la sessione
    // salvata resta valida e verrà rinnovata quando torna la rete.
    storage: AsyncStorage,
    // Rinnova da solo il token di accesso prima che scada (dura circa un'ora)
    autoRefreshToken: true,
    // Salva la sessione in storage (senza, si perderebbe a ogni riavvio)
    persistSession: true,
    // Serve solo ai login tramite link nel browser: in un'app non c'è un URL
    detectSessionInUrl: false,
  },
});

// Il rinnovo automatico usa un timer. Quando l'app va in background il
// telefono può sospenderlo, quindi lo fermiamo e lo riavviamo noi in base
// allo stato dell'app, come raccomanda la documentazione di Supabase.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (stato) => {
    if (stato === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
