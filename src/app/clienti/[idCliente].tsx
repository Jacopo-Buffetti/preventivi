import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  useCallback,
  useState,
  type ComponentProps,
  type ReactNode,
} from 'react';
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
import { coloriStato, ETICHETTE_STATO } from '../../constants/stati';
import {
  FONT,
  useSceltaTema,
  useTema,
  type NomeTema,
  type Tema,
} from '../../constants/tema';
import { useCaricaQuandoVisibile } from '../../hooks/useCaricaQuandoVisibile';
import {
  deleteCliente,
  getClienteById,
  getPreventiviByClienteId,
  type Cliente,
  type Preventivo,
} from '../../services/databaseService';
import { avviso, conferma } from '../../utils/dialoghi';
import {
  formattaEuro,
  formattaNumeroPreventivo,
  iniziali,
  numeroWhatsApp,
} from '../../utils/formato';

type NomeIcona = ComponentProps<typeof Feather>['name'];

export default function DettaglioClienteScreen() {
  const { idCliente } = useLocalSearchParams<{ idCliente: string }>();
  const router = useRouter();
  const t = useTema();
  const { nome: nomeTema } = useSceltaTema();
  const insets = useSafeAreaInsets();

  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [preventivi, setPreventivi] = useState<Preventivo[]>([]);
  const [caricamento, setCaricamento] = useState(true);

  // Intestazione blu notte: ora e batteria del telefono in chiaro
  const [inVista, setInVista] = useState(false);
  useFocusEffect(
    useCallback(() => {
      setInVista(true);
      return () => setInVista(false);
    }, [])
  );

  // Si ricarica quando torna visibile e quando la sincronizzazione porta
  // dati nuovi (es. il cliente modificato su un altro dispositivo)
  useCaricaQuandoVisibile(() => {
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
  });

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

    // Un cliente con preventivi non si può eliminare
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
      `${cliente.nome} verrà eliminato dalla rubrica.`,
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
        <ActivityIndicator color={t.ottone} size="large" />
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
          Potrebbe essere stato eliminato su questo o su un altro dispositivo.
        </Text>
        <Pressable
          onPress={() => router.replace('/clienti')}
          style={({ pressed }) => [
            styles.contorno,
            { borderColor: t.bordo, marginTop: 20 },
            pressed && styles.premuto,
          ]}
          accessibilityRole="button"
        >
          <Text style={[styles.contornoTesto, { color: t.testo }]}>
            Torna alla rubrica
          </Text>
        </Pressable>
      </View>
    );
  }

  const telefono = (cliente.telefono ?? '').replace(/\s/g, '');
  const whatsapp = numeroWhatsApp(cliente.telefono ?? '');
  const valoreAccettato = preventivi
    .filter((p) => p.stato === 'accettato')
    .reduce((somma, p) => somma + p.totale_generale, 0);

  return (
    <View style={[styles.container, { backgroundColor: t.sfondo }]}>
      {inVista && <StatusBar style="light" />}

      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        {/* --- INTESTAZIONE --- */}
        <View
          style={[
            styles.intestazione,
            { backgroundColor: t.intestazione, paddingTop: insets.top + 8 },
          ]}
        >
          <View style={styles.barra}>
            <Pressable
              onPress={tornaAllaRubrica}
              hitSlop={8}
              accessibilityRole="button"
              style={styles.indietro}
            >
              <Feather
                name="chevron-left"
                size={22}
                color={t.testoIntestazioneSecondario}
              />
              <Text
                style={[
                  styles.indietroTesto,
                  { color: t.testoIntestazioneSecondario },
                ]}
              >
                Clienti
              </Text>
            </Pressable>
            <Pressable
              onPress={modifica}
              accessibilityRole="button"
              accessibilityLabel="Modifica contatto"
              style={({ pressed }) => [
                styles.pulsanteIcona,
                { backgroundColor: t.riquadroIntestazione },
                pressed && styles.premuto,
              ]}
            >
              <Feather name="edit-3" size={20} color={t.testoIntestazione} />
            </Pressable>
          </View>

          <View style={styles.identita}>
            <View
              style={[styles.avatar, { backgroundColor: t.bottonePrimario }]}
            >
              <Text style={[styles.avatarTesto, { color: t.testoSuPrimario }]}>
                {iniziali(cliente.nome)}
              </Text>
            </View>
            <View style={styles.identitaTesti}>
              <Text
                style={[styles.nome, { color: t.testoIntestazione }]}
                numberOfLines={2}
              >
                {cliente.nome}
              </Text>
              {!!cliente.indirizzo && (
                <Text
                  style={[
                    styles.indirizzo,
                    { color: t.testoIntestazioneSecondario },
                  ]}
                  numberOfLines={2}
                >
                  {cliente.indirizzo}
                </Text>
              )}
            </View>
          </View>

          {/* Azioni rapide: disattivate se manca il dato */}
          <View style={styles.azioniRapide}>
            <AzioneRapida
              t={t}
              icona="phone"
              testo="Chiama"
              attiva={!!telefono}
              onPress={() => apri(`tel:${telefono}`)}
            />
            <AzioneRapida
              t={t}
              icona="message-circle"
              testo="WhatsApp"
              attiva={!!whatsapp}
              onPress={() => apri(`https://wa.me/${whatsapp}`)}
            />
            <AzioneRapida
              t={t}
              icona="mail"
              testo="Email"
              attiva={!!cliente.email}
              onPress={() => apri(`mailto:${cliente.email}`)}
            />
          </View>
        </View>

        <View style={styles.corpo}>
          {/* --- CONTATTI --- */}
          <Sezione t={t} titolo="Contatti">
            <View
              style={[
                styles.card,
                { backgroundColor: t.card, borderColor: t.bordo },
              ]}
            >
              <RigaInfo
                t={t}
                icona="phone"
                etichetta="Telefono"
                valore={cliente.telefono}
              />
              <RigaInfo
                t={t}
                icona="mail"
                etichetta="Email"
                valore={cliente.email}
              />
              <RigaInfo
                t={t}
                icona="map-pin"
                etichetta="Indirizzo"
                valore={cliente.indirizzo}
                ultima={!cliente.note}
              />
              {!!cliente.note && (
                <RigaInfo
                  t={t}
                  icona="file-text"
                  etichetta="Note"
                  valore={cliente.note}
                  ultima
                />
              )}
            </View>
          </Sezione>

          {/* --- PREVENTIVI --- */}
          <Sezione
            t={t}
            titolo="Preventivi"
            dettaglio={
              valoreAccettato > 0
                ? `${formattaEuro(valoreAccettato)} accettati`
                : undefined
            }
            coloreDettaglio={t.successo}
          >
            {preventivi.length > 0 && (
              <View
                style={[
                  styles.card,
                  { backgroundColor: t.card, borderColor: t.bordo },
                ]}
              >
                {preventivi.map((p, i) => (
                  <RigaPreventivo
                    key={p.id}
                    p={p}
                    t={t}
                    nomeTema={nomeTema}
                    ultima={i === preventivi.length - 1}
                    onApri={() =>
                      router.push({
                        pathname: '/preventivi/[idPreventivo]',
                        params: { idPreventivo: p.id },
                      })
                    }
                  />
                ))}
              </View>
            )}

            <Pressable
              onPress={nuovoPreventivo}
              style={({ pressed }) => [
                styles.pulsantePrincipale,
                { backgroundColor: t.bottonePrimario },
                pressed && styles.premuto,
              ]}
              accessibilityRole="button"
            >
              <Feather name="plus" size={20} color={t.testoSuPrimario} />
              <Text
                style={[
                  styles.pulsantePrincipaleTesto,
                  { color: t.testoSuPrimario },
                ]}
              >
                {preventivi.length === 0
                  ? 'Primo preventivo per questo cliente'
                  : 'Nuovo preventivo'}
              </Text>
            </Pressable>
          </Sezione>

          <Pressable
            onPress={elimina}
            style={({ pressed }) => [
              styles.elimina,
              pressed && { opacity: 0.6 },
            ]}
            accessibilityRole="button"
          >
            <Text style={[styles.eliminaTesto, { color: t.pericolo }]}>
              Elimina contatto
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

// --- COMPONENTI ---------------------------------------------------------------

function Sezione({
  t,
  titolo,
  dettaglio,
  coloreDettaglio,
  children,
}: {
  t: Tema;
  titolo: string;
  dettaglio?: string;
  coloreDettaglio?: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.sezione}>
      <View style={styles.testaSezione}>
        <Text
          style={[styles.titoloSezione, { color: t.testo }]}
          accessibilityRole="header"
        >
          {titolo}
        </Text>
        {!!dettaglio && (
          <Text
            style={[
              styles.dettaglioSezione,
              { color: coloreDettaglio ?? t.testoSecondario },
            ]}
          >
            {dettaglio}
          </Text>
        )}
      </View>
      {children}
    </View>
  );
}

function AzioneRapida({
  t,
  icona,
  testo,
  attiva,
  onPress,
}: {
  t: Tema;
  icona: NomeIcona;
  testo: string;
  attiva: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!attiva}
      accessibilityRole="button"
      accessibilityState={{ disabled: !attiva }}
      style={({ pressed }) => [
        styles.azioneRapida,
        { backgroundColor: t.riquadroIntestazione },
        !attiva && styles.spenta,
        pressed && styles.premuto,
      ]}
    >
      <Feather name={icona} size={20} color={t.bottonePrimario} />
      <Text style={[styles.azioneRapidaTesto, { color: t.testoIntestazione }]}>
        {testo}
      </Text>
    </Pressable>
  );
}

function RigaInfo({
  t,
  icona,
  etichetta,
  valore,
  ultima,
}: {
  t: Tema;
  icona: NomeIcona;
  etichetta: string;
  valore?: string;
  ultima?: boolean;
}) {
  return (
    <View
      style={[
        styles.rigaInfo,
        !ultima && { borderBottomWidth: 1, borderBottomColor: t.bordo },
      ]}
    >
      <Feather
        name={icona}
        size={18}
        color={t.testoSecondario}
        style={styles.iconaInfo}
      />
      <View style={styles.testiInfo}>
        <Text style={[styles.etichettaInfo, { color: t.testoSecondario }]}>
          {etichetta}
        </Text>
        <Text
          style={[
            styles.valoreInfo,
            { color: valore ? t.testo : t.testoSecondario },
            !valore && styles.mancante,
          ]}
        >
          {valore || 'Non inserito'}
        </Text>
      </View>
    </View>
  );
}

function RigaPreventivo({
  p,
  t,
  nomeTema,
  ultima,
  onApri,
}: {
  p: Preventivo;
  t: Tema;
  nomeTema: NomeTema;
  ultima: boolean;
  onApri: () => void;
}) {
  const stato = coloriStato(p.stato, nomeTema);
  const bozza = p.numero_preventivo === null;
  return (
    <Pressable
      onPress={onApri}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.rigaPreventivo,
        !ultima && { borderBottomWidth: 1, borderBottomColor: t.bordo },
        pressed && { backgroundColor: t.riquadro },
      ]}
    >
      <View style={styles.testiInfo}>
        <Text style={[styles.numero, { color: t.testoSecondario }]}>
          {bozza
            ? 'Bozza'
            : `N. ${formattaNumeroPreventivo(p.anno, p.numero_preventivo)}`}
        </Text>
        <Text style={[styles.oggetto, { color: t.testo }]} numberOfLines={1}>
          {p.oggetto?.trim() || 'Senza oggetto'}
        </Text>
      </View>
      <View style={styles.colonnaDestra}>
        <Text style={[styles.importo, { color: t.testo }]}>
          {formattaEuro(p.totale_generale)}
        </Text>
        <View style={[styles.badge, { backgroundColor: stato.sfondo }]}>
          <Text style={[styles.badgeTesto, { color: stato.colore }]}>
            {ETICHETTE_STATO[p.stato]}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

// --- STILI ------------------------------------------------------------------

const styles = StyleSheet.create({
  container: { flex: 1 },
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  titoloVuoto: { fontSize: 20, fontFamily: FONT.pieno, textAlign: 'center' },
  testoVuoto: {
    fontSize: 14,
    fontFamily: FONT.regolare,
    textAlign: 'center',
    marginTop: 6,
  },
  contorno: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  contornoTesto: { fontSize: 14, fontFamily: FONT.grassetto },

  intestazione: {
    paddingHorizontal: 20,
    paddingBottom: 22,
    gap: 18,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  barra: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  indietro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 44,
    paddingRight: 8,
  },
  indietroTesto: { fontSize: 15, fontFamily: FONT.semi },
  pulsanteIcona: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  identita: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTesto: { fontSize: 20, fontFamily: FONT.pieno },
  identitaTesti: { flex: 1, minWidth: 0, gap: 4 },
  nome: {
    fontSize: 26,
    lineHeight: 31,
    fontFamily: FONT.pieno,
    letterSpacing: -0.4,
  },
  indirizzo: { fontSize: 14, fontFamily: FONT.regolare },

  azioniRapide: { flexDirection: 'row', gap: 8 },
  azioneRapida: {
    flex: 1,
    height: 64,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  azioneRapidaTesto: { fontSize: 12, fontFamily: FONT.grassetto },
  spenta: { opacity: 0.35 },

  corpo: {
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 24,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  sezione: { gap: 10 },
  testaSezione: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titoloSezione: { fontSize: 16, fontFamily: FONT.pieno },
  dettaglioSezione: { fontSize: 13, fontFamily: FONT.grassetto },

  card: { borderRadius: 18, borderWidth: 1, overflow: 'hidden' },
  rigaInfo: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  iconaInfo: { marginTop: 2 },
  testiInfo: { flex: 1, minWidth: 0, gap: 2 },
  etichettaInfo: { fontSize: 12, fontFamily: FONT.semi },
  valoreInfo: { fontSize: 15, fontFamily: FONT.medio },
  mancante: { fontFamily: FONT.regolare, fontStyle: 'italic' },

  rigaPreventivo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  numero: {
    fontSize: 12,
    fontFamily: FONT.pieno,
    fontVariant: ['tabular-nums'],
  },
  oggetto: { fontSize: 15, fontFamily: FONT.grassetto },
  colonnaDestra: { alignItems: 'flex-end', gap: 5 },
  importo: {
    fontSize: 15,
    fontFamily: FONT.grassetto,
    fontVariant: ['tabular-nums'],
  },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  badgeTesto: { fontSize: 11, fontFamily: FONT.grassetto },

  pulsantePrincipale: {
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  pulsantePrincipaleTesto: { fontSize: 16, fontFamily: FONT.pieno },

  elimina: {
    alignSelf: 'center',
    height: 44,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  eliminaTesto: { fontSize: 14, fontFamily: FONT.grassetto },

  premuto: { opacity: 0.85, transform: [{ scale: 0.98 }] },
});
