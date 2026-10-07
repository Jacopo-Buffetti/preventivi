import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ProfiloForm } from '../../components/profilo/ProfiloForm';
import { useTema } from '../../constants/tema';
import { supabase } from '../../services/supabase';
import { sincronizzaOra, useStatoSync } from '../../services/syncAutomatico';
import { avviso, conferma } from '../../utils/dialoghi';

export default function ProfiloScreen() {
  const router = useRouter();
  const t = useTema();
  const insets = useSafeAreaInsets();
  const [emailUtente, setEmailUtente] = useState<string | null>(null);
  const statoSync = useStatoSync();

  // Email dell'utente collegato, letta dalla sessione salvata
  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => setEmailUtente(data.session?.user.email ?? null))
      .catch(console.error);
  }, []);

  // Testo dell'indicatore di sincronizzazione
  const descrizioneSync = statoSync.inCorso
    ? 'Sincronizzazione in corso…'
    : statoSync.errore
      ? `Non sincronizzato: ${statoSync.errore}. Le modifiche partiranno appena possibile.`
      : statoSync.ultimaRiuscita
        ? `Sincronizzato alle ${statoSync.ultimaRiuscita.toLocaleTimeString(
            'it-IT',
            {
              hour: '2-digit',
              minute: '2-digit',
            }
          )}`
        : 'In attesa della prima sincronizzazione…';

  // Dopo il logout non serve navigare: _layout.tsx riceve l'evento da
  // Supabase e mostra la schermata di login al posto dell'app.
  // I dati locali (SQLite) restano sul dispositivo.
  const esci = async () => {
    const ok = await conferma(
      "Uscire dall'account?",
      'Per rientrare servirà di nuovo la password. I dati salvati su questo dispositivo restano.',
      'Esci',
      true
    );
    if (!ok) return;
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error(error);
      avviso('Errore', "Impossibile uscire dall'account.");
    }
  };

  const tornaIndietro = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  return (
    <View style={[styles.container, { backgroundColor: t.sfondo }]}>
      <View style={[styles.barra, { paddingTop: insets.top + 12 }]}>
        <Pressable
          onPress={tornaIndietro}
          hitSlop={12}
          accessibilityRole="button"
        >
          <Text style={[styles.indietro, { color: t.testoSecondario }]}>
            ‹ Home
          </Text>
        </Pressable>
        <Text style={[styles.title, { color: t.testo }]}>Profilo Officina</Text>
        <Text style={[styles.sottotitolo, { color: t.testoSecondario }]}>
          Questi dati compaiono sui preventivi e sul biglietto da visita.
        </Text>

        <View
          style={[
            styles.account,
            { borderColor: t.bordo, backgroundColor: t.card },
          ]}
        >
          <Text
            style={[styles.accountTesto, { color: t.testoSecondario }]}
            numberOfLines={1}
          >
            Collegato come{' '}
            <Text style={{ color: t.testo, fontWeight: '700' }}>
              {emailUtente ?? '…'}
            </Text>
          </Text>
          <View style={styles.azioniAccount}>
            <Pressable
              onPress={sincronizzaOra}
              disabled={statoSync.inCorso}
              hitSlop={12}
              accessibilityRole="button"
            >
              <Text
                style={[
                  styles.esci,
                  { color: t.accento, opacity: statoSync.inCorso ? 0.5 : 1 },
                ]}
              >
                Sincronizza
              </Text>
            </Pressable>
            <Pressable onPress={esci} hitSlop={12} accessibilityRole="button">
              <Text style={[styles.esci, { color: t.pericolo }]}>Esci</Text>
            </Pressable>
          </View>
        </View>

        <Text
          style={[
            styles.statoSync,
            { color: statoSync.errore ? t.pericolo : t.testoSecondario },
          ]}
        >
          {descrizioneSync}
        </Text>
      </View>
      <ProfiloForm />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  barra: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  indietro: { fontSize: 15, fontWeight: '600', marginBottom: 12 },
  title: { fontSize: 24, fontWeight: '800', letterSpacing: -0.3 },
  sottotitolo: { fontSize: 14, marginTop: 4 },
  account: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 12,
  },
  accountTesto: { fontSize: 13, flexShrink: 1 },
  statoSync: { fontSize: 12, marginTop: 6, marginLeft: 2 },
  azioniAccount: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  esci: { fontSize: 14, fontWeight: '800' },
});
