import {
  Archivo_400Regular,
  Archivo_500Medium,
  Archivo_600SemiBold,
  Archivo_700Bold,
  Archivo_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/archivo';
import { Feather } from '@expo/vector-icons';
import type { Session } from '@supabase/supabase-js';
import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState, type ComponentProps } from 'react';
import { ActivityIndicator, Text, View, type ColorValue } from 'react-native';
import { SchermataLogin } from '../components/auth/SchermataLogin';
import { FONT, ProviderTema, useSceltaTema, useTema } from '../constants/tema';
import { initDatabase } from '../services/db';
import { supabase } from '../services/supabase';
import { avviaSincronizzazioneAutomatica } from '../services/syncAutomatico';
import { styles } from '../styles/layout.styles';

// Il provider del tema deve stare SOPRA a tutto il resto: per questo il
// layout vero e proprio è un componente a parte, renderizzato dentro.
export default function RootLayout() {
  return (
    <ProviderTema>
      <LayoutApp />
    </ProviderTema>
  );
}

function LayoutApp() {
  const t = useTema();
  const { nome } = useSceltaTema();

  // Carattere Archivo: i pesi usati nell'app (vedi FONT in tema.ts).
  // Se il caricamento fallisce si prosegue con il carattere di sistema.
  const [fontCaricati, erroreFont] = useFonts({
    Archivo_400Regular,
    Archivo_500Medium,
    Archivo_600SemiBold,
    Archivo_700Bold,
    Archivo_800ExtraBold,
  });
  const fontPronti = fontCaricati || !!erroreFont;
  const [dbPronto, setDbPronto] = useState(false);
  const [erroreDb, setErroreDb] = useState<string | null>(null);

  // Sessione Supabase: null = nessun utente collegato.
  // authPronta distingue "non ho ancora controllato" da "ho controllato e
  // non c'è nessuno", così all'avvio non compare il login per un istante.
  const [sessione, setSessione] = useState<Session | null>(null);
  const [authPronta, setAuthPronta] = useState(false);

  useEffect(() => {
    initDatabase()
      .then(() => setDbPronto(true))
      .catch((err) => {
        console.error('Errore inizializzazione DB:', err);
        setErroreDb(String(err?.message ?? err));
      });
  }, []);

  useEffect(() => {
    // 1. All'avvio legge la sessione salvata in AsyncStorage (non serve la rete)
    supabase.auth
      .getSession()
      .then(({ data }) => setSessione(data.session))
      .catch((err) => console.error('Errore lettura sessione:', err))
      .finally(() => setAuthPronta(true));

    // 2. Poi resta in ascolto: login, logout e rinnovo del token aggiornano
    //    la sessione, e React ridisegna mostrando il login o l'app.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_evento, nuovaSessione) => {
      setSessione(nuovaSessione);
    });

    // Quando il componente viene smontato smettiamo di ascoltare
    return () => subscription.unsubscribe();
  }, []);

  // Sincronizzazione automatica: attiva solo con database pronto e utente
  // collegato. Al logout (o cambio utente) la funzione restituita la ferma.
  // Dipende dall'id dell'utente e non dalla sessione: la sessione cambia
  // a ogni rinnovo del token (circa ogni ora) e riavvierebbe tutto.
  const idUtente = sessione?.user.id ?? null;
  useEffect(() => {
    if (!dbPronto || !idUtente) return;
    return avviaSincronizzazioneAutomatica();
  }, [dbPronto, idUtente]);

  if (erroreDb) {
    return (
      <View style={[styles.centro, { backgroundColor: t.sfondo }]}>
        <Text style={[styles.titolo, { color: t.testo }]}>
          Impossibile aprire il database
        </Text>
        <Text style={[styles.dettaglio, { color: t.testoSecondario }]}>
          {erroreDb}
        </Text>
      </View>
    );
  }

  // Le schermate vengono montate solo quando le tabelle esistono già
  // e sappiamo se c'è un utente collegato
  if (!dbPronto || !authPronta || !fontPronti) {
    return (
      <View style={[styles.centro, { backgroundColor: t.sfondo }]}>
        <ActivityIndicator size="large" color={t.accento} />
      </View>
    );
  }

  // Nessun utente collegato su questo dispositivo: chiediamo il login
  if (!sessione) {
    return (
      <>
        <StatusBar style={nome === 'dark' ? 'light' : 'dark'} />
        <SchermataLogin />
      </>
    );
  }

  return (
    <>
      {/* Barra di stato del telefono (ora, batteria): testo chiaro sul tema
          scuro, scuro sul tema chiaro. Le schermate con intestazione blu
          notte la sovrascrivono mentre sono visibili. */}
      <StatusBar style={nome === 'dark' ? 'light' : 'dark'} />

      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: t.tabAttiva,
          tabBarInactiveTintColor: t.testoSecondario,
          tabBarStyle: { backgroundColor: t.barraTab, borderTopColor: t.bordo },
          tabBarLabelStyle: { fontSize: 11, fontFamily: FONT.semi },
          sceneStyle: { backgroundColor: t.sfondo },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ focused, color }) => (
              <IconaTab
                nome="home"
                attiva={focused}
                colore={color}
                ottone={t.ottone}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="preventivi"
          options={{
            // Uscendo dalla scheda, la pila torna alla lista: rientrando si vede
            // sempre l'elenco, non l'ultimo preventivo aperto
            popToTopOnBlur: true,
            title: 'Preventivi',
            tabBarIcon: ({ focused, color }) => (
              <IconaTab
                nome="file-text"
                attiva={focused}
                colore={color}
                ottone={t.ottone}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="clienti"
          options={{
            // Come per i preventivi: rientrando si vede sempre l'elenco
            popToTopOnBlur: true,
            title: 'Clienti',
            tabBarIcon: ({ focused, color }) => (
              <IconaTab
                nome="users"
                attiva={focused}
                colore={color}
                ottone={t.ottone}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="biglietto/index"
          options={{
            title: 'Biglietto',
            tabBarIcon: ({ focused, color }) => (
              <IconaTab
                nome="credit-card"
                attiva={focused}
                colore={color}
                ottone={t.ottone}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="profilo"
          options={{
            // Come Preventivi e Clienti: rientrando si vede il profilo,
            // non l'ultima pagina aperta da lì (es. le voci rapide)
            popToTopOnBlur: true,
            title: 'Profilo',
            tabBarIcon: ({ focused, color }) => (
              <IconaTab
                nome="user"
                attiva={focused}
                colore={color}
                ottone={t.ottone}
              />
            ),
          }}
        />
      </Tabs>
    </>
  );
}

// Icona della barra in basso: icona a linea (Feather) e, sulla scheda
// attiva, una lineetta color ottone sopra, come nel disegno
type NomeIcona = ComponentProps<typeof Feather>['name'];

function IconaTab({
  nome,
  attiva,
  colore,
  ottone,
}: {
  nome: NomeIcona;
  attiva: boolean;
  colore: ColorValue;
  ottone: string;
}) {
  return (
    <View style={styles.iconaTab}>
      {attiva && (
        <View style={[styles.lineettaAttiva, { backgroundColor: ottone }]} />
      )}
      <Feather name={nome} size={22} color={colore} />
    </View>
  );
}
