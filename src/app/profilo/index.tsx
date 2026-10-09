import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ImpostazioniPreventivi } from '../../components/profilo/ImpostazioniPreventivi';
import { ProfiloForm } from '../../components/profilo/ProfiloForm';
import { useSceltaTema, useTema, type Tema } from '../../constants/tema';
import { useCaricaQuandoVisibile } from '../../hooks/useCaricaQuandoVisibile';
import { supabase } from '../../services/supabase';
import { sincronizzaOra, useStatoSync } from '../../services/syncAutomatico';
import { getVociRapide } from '../../services/vociRapideService';
import { styles } from '../../styles/profilo.styles';
import { avviso, conferma } from '../../utils/dialoghi';

export default function ProfiloScreen() {
  const t = useTema();
  const { nome: nomeTema, alterna } = useSceltaTema();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [emailUtente, setEmailUtente] = useState<string | null>(null);
  const [numeroVociRapide, setNumeroVociRapide] = useState<number | null>(null);
  const statoSync = useStatoSync();

  // Email dell'utente collegato, letta dalla sessione salvata
  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => setEmailUtente(data.session?.user.email ?? null))
      .catch(console.error);
  }, []);

  // Quante voci rapide ci sono: si rilegge tornando dalla loro pagina
  useCaricaQuandoVisibile(() => {
    getVociRapide()
      .then((voci) => setNumeroVociRapide(voci.length))
      .catch(console.error);
  });

  // Stato della sincronizzazione: testo e colore del pallino
  const orario = statoSync.ultimaRiuscita?.toLocaleTimeString('it-IT', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const sync = statoSync.inCorso
    ? { testo: 'Sincronizzazione in corso…', colore: t.bottonePrimario }
    : statoSync.errore
      ? {
          testo: `Non sincronizzato: ${statoSync.errore}. Le modifiche partiranno appena possibile.`,
          colore: t.pericolo,
        }
      : orario
        ? { testo: `Tutto sincronizzato alle ${orario}`, colore: '#3FB97A' }
        : {
            testo: 'In attesa della prima sincronizzazione…',
            colore: t.bottonePrimario,
          };

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

  return (
    <ScrollView
      style={{ backgroundColor: t.sfondo }}
      contentContainerStyle={[
        styles.contenuto,
        { paddingTop: insets.top + 20 },
      ]}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
    >
      <View style={{ gap: 2 }}>
        <Text
          style={[styles.titolo, { color: t.testo }]}
          accessibilityRole="header"
        >
          Profilo
        </Text>
        <Text style={[styles.sottotitolo, { color: t.testoSecondario }]}>
          Account, aspetto dell'app e dati dell'attività.
        </Text>
      </View>

      {/* --- ACCOUNT E SINCRONIZZAZIONE --- */}
      <Sezione t={t} titolo="Account">
        <View
          style={[
            styles.card,
            { backgroundColor: t.card, borderColor: t.bordo },
          ]}
        >
          <View style={styles.rigaAccount}>
            <View
              style={[styles.iconaRiquadro, { backgroundColor: t.riquadro }]}
            >
              <Feather name="user" size={20} color={t.testo} />
            </View>
            <View style={styles.testi}>
              <Text style={[styles.etichetta, { color: t.testoSecondario }]}>
                Collegato come
              </Text>
              <Text
                style={[styles.valore, { color: t.testo }]}
                numberOfLines={1}
              >
                {emailUtente ?? '…'}
              </Text>
            </View>
          </View>

          <View style={[styles.rigaSync, { borderTopColor: t.bordo }]}>
            <View style={[styles.pallino, { backgroundColor: sync.colore }]} />
            <Text
              style={[
                styles.testoSync,
                { color: statoSync.errore ? t.pericolo : t.testoSecondario },
              ]}
            >
              {sync.testo}
            </Text>
          </View>

          <View style={[styles.azioni, { borderTopColor: t.bordo }]}>
            <Pressable
              onPress={sincronizzaOra}
              disabled={statoSync.inCorso}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.azione,
                { backgroundColor: t.riquadro },
                statoSync.inCorso && styles.disabilitato,
                pressed && styles.premuto,
              ]}
            >
              <Feather name="refresh-cw" size={17} color={t.testo} />
              <Text style={[styles.azioneTesto, { color: t.testo }]}>
                Sincronizza ora
              </Text>
            </Pressable>
            <Pressable
              onPress={esci}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.azione,
                { backgroundColor: t.riquadro },
                pressed && styles.premuto,
              ]}
            >
              <Feather name="log-out" size={17} color={t.pericolo} />
              <Text style={[styles.azioneTesto, { color: t.pericolo }]}>
                Esci
              </Text>
            </Pressable>
          </View>
        </View>
      </Sezione>

      {/* --- ASPETTO: lo stesso interruttore della luna/sole in Home --- */}
      <Sezione t={t} titolo="Aspetto">
        <View
          style={[
            styles.card,
            styles.rigaTema,
            { backgroundColor: t.card, borderColor: t.bordo },
          ]}
        >
          <View style={[styles.iconaRiquadro, { backgroundColor: t.riquadro }]}>
            <Feather
              name={nomeTema === 'dark' ? 'moon' : 'sun'}
              size={20}
              color={t.accento}
            />
          </View>
          <View style={styles.testi}>
            <Text style={[styles.valore, { color: t.testo }]}>Tema scuro</Text>
            <Text style={[styles.etichetta, { color: t.testoSecondario }]}>
              La scelta resta salvata su questo dispositivo.
            </Text>
          </View>
          <Switch
            value={nomeTema === 'dark'}
            onValueChange={alterna}
            trackColor={{ false: t.bordo, true: t.bottonePrimario }}
            thumbColor="#FFFFFF"
            ios_backgroundColor={t.bordo}
            accessibilityLabel="Tema scuro"
          />
        </View>
      </Sezione>

      {/* --- PREVENTIVI: come si compilano --- */}
      <Sezione
        t={t}
        titolo="Preventivi"
        sottotitolo="Come si compilano i tuoi preventivi."
      >
        <Pressable
          onPress={() => router.push('/profilo/voci-rapide')}
          accessibilityRole="button"
          accessibilityLabel={`Voci rapide${
            numeroVociRapide ? `, ${numeroVociRapide}` : ''
          }`}
          style={({ pressed }) => [
            styles.card,
            styles.rigaTema,
            { backgroundColor: t.card, borderColor: t.bordo },
            pressed && styles.premuto,
          ]}
        >
          <View style={[styles.iconaRiquadro, { backgroundColor: t.riquadro }]}>
            <Feather name="list" size={20} color={t.testo} />
          </View>
          <View style={styles.testi}>
            <Text style={[styles.valore, { color: t.testo }]}>Voci rapide</Text>
            <Text style={[styles.etichetta, { color: t.testoSecondario }]}>
              Pronte da aggiungere ai preventivi con un tocco.
            </Text>
          </View>
          {!!numeroVociRapide && (
            <View
              style={[styles.conteggio, { backgroundColor: t.bottonePrimario }]}
            >
              <Text
                style={[styles.conteggioTesto, { color: t.testoSuPrimario }]}
              >
                {numeroVociRapide}
              </Text>
            </View>
          )}
          <Feather name="chevron-right" size={20} color={t.testoSecondario} />
        </Pressable>
        <ImpostazioniPreventivi />
      </Sezione>

      {/* --- DATI DELL'ATTIVITÀ --- */}
      <Sezione
        t={t}
        titolo="Dati dell'attività"
        sottotitolo="Compaiono sui preventivi e completano il biglietto da visita."
      >
        <ProfiloForm />
      </Sezione>
    </ScrollView>
  );
}

function Sezione({
  t,
  titolo,
  sottotitolo,
  children,
}: {
  t: Tema;
  titolo: string;
  sottotitolo?: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.sezione}>
      <View style={{ gap: 2 }}>
        <Text
          style={[styles.titoloSezione, { color: t.testo }]}
          accessibilityRole="header"
        >
          {titolo}
        </Text>
        {!!sottotitolo && (
          <Text style={[styles.etichetta, { color: t.testoSecondario }]}>
            {sottotitolo}
          </Text>
        )}
      </View>
      {children}
    </View>
  );
}
