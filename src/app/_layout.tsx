import { Tabs } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useTema } from '../constants/tema';
import { initDatabase } from '../services/db';

export default function RootLayout() {
  const t = useTema();
  const [dbPronto, setDbPronto] = useState(false);
  const [erroreDb, setErroreDb] = useState<string | null>(null);

  useEffect(() => {
    initDatabase()
      .then(() => setDbPronto(true))
      .catch((err) => {
        console.error('Errore inizializzazione DB:', err);
        setErroreDb(String(err?.message ?? err));
      });
  }, []);

  if (erroreDb) {
    return (
      <View style={[styles.centro, { backgroundColor: t.sfondo }]}>
        <Text style={[styles.titolo, { color: t.testo }]}>Impossibile aprire il database</Text>
        <Text style={[styles.dettaglio, { color: t.testoSecondario }]}>{erroreDb}</Text>
      </View>
    );
  }

  // Le schermate vengono montate solo quando le tabelle esistono già
  if (!dbPronto) {
    return (
      <View style={[styles.centro, { backgroundColor: t.sfondo }]}>
        <ActivityIndicator size="large" color={t.accento} />
      </View>
    );
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
