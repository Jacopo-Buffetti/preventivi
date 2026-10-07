import type { Session } from '@supabase/supabase-js';
import { Tabs } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SchermataLogin } from '../components/auth/SchermataLogin';
import { useTema } from '../constants/tema';
import { initDatabase } from '../services/db';
import { supabase } from '../services/supabase';
import { avviaSincronizzazioneAutomatica } from '../services/syncAutomatico';

export default function RootLayout() {
  const t = useTema();
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
        <Text style={[styles.titolo, { color: t.testo }]}>Impossibile aprire il database</Text>
        <Text style={[styles.dettaglio, { color: t.testoSecondario }]}>{erroreDb}</Text>
      </View>
    );
  }

  // Le schermate vengono montate solo quando le tabelle esistono già
  // e sappiamo se c'è un utente collegato
  if (!dbPronto || !authPronta) {
    return (
      <View style={[styles.centro, { backgroundColor: t.sfondo }]}>
        <ActivityIndicator size="large" color={t.accento} />
      </View>
    );
  }

  // Nessun utente collegato su questo dispositivo: chiediamo il login
  if (!sessione) {
    return <SchermataLogin />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.accento,
        tabBarInactiveTintColor: t.testoSecondario,
        tabBarStyle: { backgroundColor: t.card, borderTopColor: t.bordo },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
        sceneStyle: { backgroundColor: t.sfondo },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => <IconaTab emoji="🏠" attiva={focused} />,
        }}
      />
      <Tabs.Screen
        name="preventivi"
        options={{
          title: 'Preventivi',
          tabBarIcon: ({ focused }) => <IconaTab emoji="📄" attiva={focused} />,
        }}
      />
      <Tabs.Screen
        name="clienti"
        options={{
          title: 'Clienti',
          tabBarIcon: ({ focused }) => <IconaTab emoji="👥" attiva={focused} />,
        }}
      />
      <Tabs.Screen
        name="biglietto/index"
        options={{
          title: 'Biglietto',
          tabBarIcon: ({ focused }) => <IconaTab emoji="📇" attiva={focused} />,
        }}
      />

      {/* Il profilo si apre dalla home ma non ha una scheda nella barra */}
      <Tabs.Screen name="profilo/index" options={{ href: null }} />
    </Tabs>
  );
}

// Le emoji non si possono colorare: la scheda inattiva viene resa più trasparente
function IconaTab({ emoji, attiva }: { emoji: string; attiva: boolean }) {
  return <Text style={[styles.icona, { opacity: attiva ? 1 : 0.45 }]}>{emoji}</Text>;
}

const styles = StyleSheet.create({
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  titolo: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  dettaglio: {
    fontSize: 14,
    textAlign: 'center',
  },
  icona: { fontSize: 20 },
});
