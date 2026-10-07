import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { STATI } from '../../constants/stati';
import { useTema, type Tema } from '../../constants/tema';
import {
  deleteCliente,
  getClienteById,
  getPreventiviByClienteId,
  type Cliente,
  type Preventivo,
} from '../../services/databaseService';
import { avviso, conferma } from '../../utils/dialoghi';
import {
  formattaData,
  formattaEuro,
  formattaNumeroPreventivo,
} from '../../utils/formato';

// "Mario Rossi" → "MR"
function iniziali(nome: string): string {
  const parole = nome.trim().split(/\s+/).filter(Boolean);
  const lettere =
    parole.length > 1
      ? parole[0][0] + parole[parole.length - 1][0]
      : (parole[0]?.slice(0, 2) ?? '?');
  return lettere.toUpperCase();
}

// Numero per wa.me: solo cifre, con prefisso internazionale (39 se manca)
function numeroWhatsApp(telefono: string): string {
  let cifre = telefono.replace(/[^\d+]/g, '');
  if (cifre.startsWith('+')) cifre = cifre.slice(1);
  else if (cifre.startsWith('00')) cifre = cifre.slice(2);
  else if (cifre.length === 10 && cifre.startsWith('3')) cifre = '39' + cifre;
  return cifre.replace(/\D/g, '');
}

export default function DettaglioClienteScreen() {
  const { idCliente } = useLocalSearchParams<{ idCliente: string }>();
  const router = useRouter();
  const t = useTema();
  const insets = useSafeAreaInsets();

  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [preventivi, setPreventivi] = useState<Preventivo[]>([]);
  const [caricamento, setCaricamento] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (!idCliente) return;
      Promise.all([
        getClienteById(idCliente),
        getPreventiviByClienteId(idCliente),
      ])
        .then(([c, p]) => {
          setCliente(c);
          setPreventivi(p);
        })
        .catch((err) => {
          console.error(err);
          avviso('Errore', 'Impossibile caricare i dati del cliente.');
        })
        .finally(() => setCaricamento(false));
    }, [idCliente])
  );

  // Se si arriva qui da un link diretto non c'è una pagina a cui tornare
  const tornaAllaRubrica = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/clienti');
  };

  const apri = (url: string) =>
    Linking.openURL(url).catch(() =>
      avviso('Errore', "Impossibile aprire l'app richiesta.")
    );

  const modifica = () => {
    if (!cliente) return;
    router.push({
      pathname: '/clienti/nuovo',
      params: { idCliente: cliente.id },
    });
  };

  const nuovoPreventivo = () => {
    if (!cliente) return;
    router.push({
      pathname: '/preventivi/nuovo',
      params: { idCliente: cliente.id },
    });
  };

  const elimina = async () => {
    if (!cliente) return;

    // Un cliente con preventivi non si può eliminare (il database lo impedisce)
    if (preventivi.length > 0) {
      avviso(
        'Impossibile eliminare',
        `${cliente.nome} ha ${preventivi.length} ${
          preventivi.length === 1 ? 'preventivo' : 'preventivi'
        }. Elimina prima i preventivi, poi potrai eliminare il contatto.`
      );
      return;
    }

    const ok = await conferma(
      'Eliminare il contatto?',
      `${cliente.nome} verrà eliminato definitivamente dalla rubrica.`,
      'Elimina',
      true
    );
    if (!ok) return;
    try {
      await deleteCliente(cliente.id);
      tornaAllaRubrica();
    } catch (err) {
      console.error(err);
      avviso('Errore', 'Impossibile eliminare il cliente.');
    }
  };

  // --- Caricamento e cliente inesistente ---

  if (caricamento) {
    return (
      <View style={[styles.centro, { backgroundColor: t.sfondo }]}>
        <ActivityIndicator color={t.accento} size="large" />
      </View>
    );
  }

  if (!cliente) {
    return (
      <View style={[styles.centro, { backgroundColor: t.sfondo }]}>
        <Text style={[styles.titoloVuoto, { color: t.testo }]}>
          Cliente non trovato
        </Text>
        <Text style={[styles.testoVuoto, { color: t.testoSecondario }]}>
          Potrebbe essere stato eliminato.
        </Text>
        <Pressable
          onPress={() => router.replace('/clienti')}
          style={[
            styles.bottoneContorno,
            { borderColor: t.bordo, marginTop: 20 },
          ]}
          accessibilityRole="button"
        >
          <Text style={[styles.bottoneContornoTesto, { color: t.testo }]}>
            Torna alla rubrica
          </Text>
        </Pressable>
      </View>
    );
  }

  const totaleAccettati = preventivi
    .filter((p) => p.stato === 'accettato')
    .reduce((somma, p) => somma + p.totale_generale, 0);

  return (
    <View style={[styles.container, { backgroundColor: t.sfondo }]}>
      {/* Barra superiore: resta sotto la barra di stato del telefono */}
      <View style={[styles.barra, { paddingTop: insets.top + 12 }]}>
        <Pressable
          onPress={tornaAllaRubrica}
          hitSlop={12}
          accessibilityRole="button"
        >
          <Text style={[styles.indietro, { color: t.testoSecondario }]}>
            ‹ Clienti
          </Text>
        </Pressable>
        <Pressable
          onPress={modifica}
          style={({ pressed }) => [
            styles.pillModifica,
            { backgroundColor: t.card, borderColor: t.bordo },
            pressed && styles.premuto,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Modifica contatto"
        >
          <Text style={[styles.pillModificaTesto, { color: t.accento }]}>
            ✎ Modifica
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.contenuto, { paddingBottom: 32 }]}
      >
        {/* Testata con avatar */}
        <View
          style={[
            styles.hero,
            { backgroundColor: t.card, borderColor: t.bordo },
          ]}
        >
          <View style={styles.heroRiga}>
            <View
              style={[
                styles.avatar,
                { backgroundColor: 'rgba(245,158,11,0.15)' },
              ]}
            >
              <Text style={[styles.avatarTesto, { color: t.accento }]}>
                {iniziali(cliente.nome)}
              </Text>
            </View>
            <View style={styles.heroTesti}>
              <Text style={[styles.nome, { color: t.testo }]} numberOfLines={2}>
                {cliente.nome}
              </Text>
              {!!cliente.indirizzo && (
                <Text
                  style={[styles.sottotitolo, { color: t.testoSecondario }]}
                  numberOfLines={2}
                >
                  📍 {cliente.indirizzo}
                </Text>
              )}
            </View>
          </View>

          {/* Azioni rapide */}
          <View style={styles.azioniRapide}>
            <AzioneRapida
              icona="📞"
              etichetta="Chiama"
              t={t}
              attiva={!!cliente.telefono}
              onPress={() =>
                apri(`tel:${cliente.telefono!.replace(/\s/g, '')}`)
              }
            />
            <AzioneRapida
              icona="💬"
              etichetta="WhatsApp"
              t={t}
              attiva={!!cliente.telefono}
              onPress={() =>
                apri(`https://wa.me/${numeroWhatsApp(cliente.telefono!)}`)
              }
            />
            <AzioneRapida
              icona="✉️"
              etichetta="Email"
              t={t}
              attiva={!!cliente.email}
              onPress={() => apri(`mailto:${cliente.email}`)}
            />
          </View>
        </View>

        {/* Dati del contatto */}
        <Etichetta testo="CONTATTI" t={t} />
        <View
          style={[
            styles.card,
            { backgroundColor: t.card, borderColor: t.bordo },
          ]}
        >
          <RigaInfo etichetta="Telefono" valore={cliente.telefono} t={t} />
          <RigaInfo etichetta="Email" valore={cliente.email} t={t} />
          <RigaInfo
            etichetta="Indirizzo"
            valore={cliente.indirizzo}
            t={t}
            ultima={!cliente.note}
          />
          {!!cliente.note && (
            <RigaInfo etichetta="Note" valore={cliente.note} t={t} ultima />
          )}
        </View>

        {/* Preventivi */}
        <View style={styles.intestazioneSezione}>
          <Text
            style={[
              styles.etichetta,
              styles.senzaMargine,
              { color: t.testoSecondario },
            ]}
          >
            PREVENTIVI ({preventivi.length})
          </Text>
          {totaleAccettati > 0 && (
            <Text style={[styles.accettati, { color: '#22C55E' }]}>
              Accettati: {formattaEuro(totaleAccettati)}
            </Text>
          )}
        </View>

        {preventivi.length === 0 ? (
          <View
            style={[
              styles.card,
              styles.vuotoCard,
              { backgroundColor: t.card, borderColor: t.bordo },
            ]}
          >
            <Text style={[styles.testoVuoto, { color: t.testoSecondario }]}>
              Nessun preventivo per questo cliente.
            </Text>
          </View>
        ) : (
          preventivi.map((p) => {
            const stato = STATI[p.stato] ?? STATI.bozza;
            return (
              <Pressable
                key={p.id}
                onPress={() =>
                  router.push({
                    pathname: '/preventivi/[idPreventivo]',
                    params: { idPreventivo: p.id },
                  })
                }
                style={({ pressed }) => [
                  styles.preventivo,
                  { backgroundColor: t.card, borderColor: t.bordo },
                  pressed && styles.premuto,
                ]}
                accessibilityRole="button"
              >
                <View style={styles.preventivoTesta}>
                  <Text style={[styles.preventivoNumero, { color: t.testo }]}>
                    N° {formattaNumeroPreventivo(p.anno, p.numero_preventivo)}
                  </Text>
                  <View
                    style={[
                      styles.badge,
                      {
                        backgroundColor: stato.sfondo,
                        borderColor: stato.colore,
                      },
                    ]}
                  >
                    <Text style={[styles.badgeTesto, { color: stato.colore }]}>
                      {stato.etichetta}
                    </Text>
                  </View>
                </View>
                {!!p.oggetto && (
                  <Text
                    style={[styles.preventivoOggetto, { color: t.testo }]}
                    numberOfLines={1}
                  >
                    {p.oggetto}
                  </Text>
                )}
                <View style={styles.preventivoPiede}>
                  <Text
                    style={[
                      styles.preventivoData,
                      { color: t.testoSecondario },
                    ]}
                  >
                    {formattaData(p.data_creazione)}
                  </Text>
                  <Text style={[styles.preventivoTotale, { color: t.accento }]}>
                    {formattaEuro(p.totale_generale)}
                  </Text>
                </View>
              </Pressable>
            );
          })
        )}

        {/* Azioni */}
        <Pressable
          onPress={nuovoPreventivo}
          style={({ pressed }) => [
            styles.bottonePrimario,
            { backgroundColor: t.bottonePrimario },
            pressed && styles.premuto,
          ]}
          accessibilityRole="button"
        >
          <Text style={styles.bottonePrimarioTesto}>
            ＋ Nuovo preventivo per questo cliente
          </Text>
        </Pressable>

        <Pressable
          onPress={elimina}
          style={({ pressed }) => [styles.elimina, pressed && { opacity: 0.6 }]}
          accessibilityRole="button"
        >
          <Text style={[styles.eliminaTesto, { color: t.pericolo }]}>
            Elimina contatto
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

// --- Componenti di supporto ---

function Etichetta({ testo, t }: { testo: string; t: Tema }) {
  return (
    <Text style={[styles.etichetta, { color: t.testoSecondario }]}>
      {testo}
    </Text>
  );
}

function AzioneRapida({
  icona,
  etichetta,
  attiva,
  onPress,
  t,
}: {
  icona: string;
  etichetta: string;
  attiva: boolean;
  onPress: () => void;
  t: Tema;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!attiva}
      style={({ pressed }) => [
        styles.azione,
        { backgroundColor: t.sfondo, borderColor: t.bordo },
        !attiva && styles.disattivata,
        pressed && styles.premuto,
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled: !attiva }}
    >
      <Text style={styles.azioneIcona}>{icona}</Text>
      <Text style={[styles.azioneTesto, { color: t.testo }]}>{etichetta}</Text>
    </Pressable>
  );
}

function RigaInfo({
  etichetta,
  valore,
  t,
  ultima,
}: {
  etichetta: string;
  valore?: string;
  t: Tema;
  ultima?: boolean;
}) {
  return (
    <View
      style={[
        styles.rigaInfo,
        !ultima && { borderBottomWidth: 1, borderBottomColor: t.bordo },
      ]}
    >
      <Text style={[styles.rigaEtichetta, { color: t.testoSecondario }]}>
        {etichetta}
      </Text>
      <Text
        style={[
          styles.rigaValore,
          { color: valore ? t.testo : t.testoSecondario },
        ]}
        selectable
      >
        {valore || '—'}
      </Text>
    </View>
  );
}

// --- Stili ---

const styles = StyleSheet.create({
  container: { flex: 1 },
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  titoloVuoto: { fontSize: 18, fontWeight: '800' },
  testoVuoto: { fontSize: 14, marginTop: 6, textAlign: 'center' },

  barra: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  indietro: { fontSize: 15, fontWeight: '600' },
  pillModifica: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  pillModificaTesto: { fontSize: 14, fontWeight: '700' },

  contenuto: {
    paddingHorizontal: 16,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },

  hero: { borderWidth: 1, borderRadius: 18, padding: 16 },
  heroRiga: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTesto: { fontSize: 20, fontWeight: '800' },
  heroTesti: { flex: 1 },
  nome: { fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
  sottotitolo: { fontSize: 14, marginTop: 4 },

  azioniRapide: { flexDirection: 'row', gap: 8, marginTop: 16 },
  azione: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 4,
  },
  azioneIcona: { fontSize: 20 },
  azioneTesto: { fontSize: 12, fontWeight: '700' },
  disattivata: { opacity: 0.35 },

  etichetta: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
    marginTop: 22,
    marginBottom: 8,
  },
  senzaMargine: { marginTop: 0, marginBottom: 0 },

  card: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14 },
  rigaInfo: { paddingVertical: 12 },
  rigaEtichetta: { fontSize: 12, fontWeight: '600' },
  rigaValore: { fontSize: 15, marginTop: 2 },

  intestazioneSezione: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 22,
    marginBottom: 8,
  },
  accettati: { fontSize: 12, fontWeight: '800' },
  vuotoCard: { paddingVertical: 16 },

  preventivo: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  preventivoTesta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  preventivoNumero: { fontSize: 16, fontWeight: '800' },
  badge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeTesto: { fontSize: 11, fontWeight: '800', letterSpacing: 0.4 },
  preventivoOggetto: { fontSize: 14, fontWeight: '600', marginTop: 6 },
  preventivoPiede: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  preventivoData: { fontSize: 13 },
  preventivoTotale: { fontSize: 15, fontWeight: '800' },

  bottonePrimario: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  bottonePrimarioTesto: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },

  bottoneContorno: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  bottoneContornoTesto: { fontSize: 15, fontWeight: '700' },

  elimina: {
    alignSelf: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginTop: 8,
  },
  eliminaTesto: { fontSize: 14, fontWeight: '700' },

  premuto: { opacity: 0.85, transform: [{ scale: 0.98 }] },
});
