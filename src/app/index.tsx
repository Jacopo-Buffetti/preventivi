import { Link, type Href } from 'expo-router';
import { useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCaricaQuandoVisibile } from '../hooks/useCaricaQuandoVisibile';
import { getProfiloFabbro } from '../services/databaseService';
import { useTiraPerAggiornare } from '../services/syncAutomatico';

// --- COLORI ---------------------------------------------------------------

const PALETTE = {
  light: {
    sfondo: '#F4F5F7',
    card: '#FFFFFF',
    bordo: '#E6E8EC',
    testo: '#0B1220',
    testoSecondario: '#667085',
    hero: '#0B1220',
    heroTesto: '#FFFFFF',
    heroSecondario: '#A9B4C8',
    accento: '#FF6B2C',
    avviso: '#FFF4E8',
    avvisoTesto: '#9A4A12',
  },
  dark: {
    sfondo: '#0A0D14',
    card: '#141925',
    bordo: '#222939',
    testo: '#F3F5F9',
    testoSecondario: '#8C96A8',
    hero: '#1B2233',
    heroTesto: '#FFFFFF',
    heroSecondario: '#A9B4C8',
    accento: '#FF7A40',
    avviso: '#2A1E14',
    avvisoTesto: '#FFB27F',
  },
};

type Tema = typeof PALETTE.light;

// --- VOCI DEL MENU --------------------------------------------------------

interface VoceMenu {
  href: Href;
  icona: string;
  titolo: string;
  descrizione: string;
  tinta: { chiaro: string; scuro: string };
}

const MENU: VoceMenu[] = [
  {
    href: '/preventivi',
    icona: '📄',
    titolo: 'Preventivi',
    descrizione: 'Bozze, inviati e accettati',
    tinta: { chiaro: '#FFE9DD', scuro: '#3A2418' },
  },
  {
    href: '/clienti',
    icona: '👥',
    titolo: 'Clienti',
    descrizione: 'Rubrica e contatti',
    tinta: { chiaro: '#E3EDFF', scuro: '#19253D' },
  },
  {
    href: '/biglietto',
    icona: '📇',
    titolo: 'Biglietto',
    descrizione: 'Il tuo biglietto da visita',
    tinta: { chiaro: '#E4F6EC', scuro: '#16301F' },
  },
  {
    href: '/profilo',
    icona: '⚙️',
    titolo: 'Profilo',
    descrizione: "Dati dell'officina",
    tinta: { chiaro: '#EEE8FF', scuro: '#261F3D' },
  },
];

// --- UTILITÀ ----------------------------------------------------------------

function saluto(): string {
  const ora = new Date().getHours();
  if (ora < 13) return 'Buongiorno';
  if (ora < 18) return 'Buon pomeriggio';
  return 'Buonasera';
}

function dataOggi(): string {
  const testo = new Date().toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  return testo.charAt(0).toUpperCase() + testo.slice(1);
}

// --- SCHERMATA --------------------------------------------------------------

export default function HomeScreen() {
  const schema = useColorScheme();
  const t = schema === 'dark' ? PALETTE.dark : PALETTE.light;
  const scuro = schema === 'dark';
  const insets = useSafeAreaInsets();

  const [nomeAzienda, setNomeAzienda] = useState<string | null>(null);
  const [profiloCaricato, setProfiloCaricato] = useState(false);

  const { aggiornando, aggiorna } = useTiraPerAggiornare();

  // Ricarica il nome ogni volta che si torna sulla home (es. dopo aver salvato il profilo)
  useCaricaQuandoVisibile(() => {
    getProfiloFabbro()
      .then((profilo) => setNomeAzienda(profilo?.nome_azienda || null))
      .catch(() => setNomeAzienda(null))
      .finally(() => setProfiloCaricato(true));
  });

  return (
    <ScrollView
      style={{ backgroundColor: t.sfondo }}
      refreshControl={
        <RefreshControl refreshing={aggiornando} onRefresh={aggiorna} tintColor={t.accento} />
      }
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 },
      ]}
    >
      <View style={styles.colonna}>
        {/* Intestazione */}
        <Text style={[styles.data, { color: t.testoSecondario }]}>
          {dataOggi()}
        </Text>
        <Text style={[styles.saluto, { color: t.testo }]}>
          {saluto()}
          {nomeAzienda ? ',' : ''}
        </Text>
        {nomeAzienda && (
          <Text
            style={[styles.nomeAzienda, { color: t.accento }]}
            numberOfLines={1}
          >
            {nomeAzienda}
          </Text>
        )}

        {/* Avviso profilo mancante */}
        {profiloCaricato && !nomeAzienda && (
          <Link href="/profilo" asChild>
            <Pressable
              style={({ pressed }) => [
                styles.avviso,
                { backgroundColor: t.avviso },
                pressed && styles.premuto,
              ]}
              accessibilityRole="link"
            >
              <Text style={[styles.avvisoTesto, { color: t.avvisoTesto }]}>
                Completa il profilo dell'officina: i dati compariranno sui
                preventivi e sul biglietto.
              </Text>
              <Text style={[styles.freccia, { color: t.avvisoTesto }]}>→</Text>
            </Pressable>
          </Link>
        )}

        {/* Azione principale */}
        <View style={[styles.hero, { backgroundColor: t.hero }]}>
          <View
            style={[styles.decoro, styles.decoroGrande, { backgroundColor: t.accento }]}
          />
          <View
            style={[styles.decoro, styles.decoroPiccolo, { backgroundColor: t.accento }]}
          />
          <Text style={[styles.heroEtichetta, { color: t.heroSecondario }]}>
            AZIONE RAPIDA
          </Text>
          <Text style={[styles.heroTitolo, { color: t.heroTesto }]}>
            Crea un nuovo preventivo
          </Text>
          <Text style={[styles.heroTesto, { color: t.heroSecondario }]}>
            Scegli il cliente, aggiungi le voci e calcola IVA e totale.
          </Text>
          <Link href="/preventivi/nuovo" asChild>
            <Pressable
              style={({ pressed }) => [
                styles.heroBottone,
                { backgroundColor: t.accento },
                pressed && styles.premuto,
              ]}
              accessibilityRole="link"
            >
              <Text style={styles.heroBottoneTesto}>Nuovo preventivo</Text>
              <Text style={styles.heroBottoneTesto}>＋</Text>
            </Pressable>
          </Link>
        </View>

        {/* Sezioni */}
        <Text style={[styles.sezione, { color: t.testoSecondario }]}>
          Sezioni
        </Text>
        <View style={styles.griglia}>
          {MENU.map((voce) => (
            <CardMenu key={voce.titolo} voce={voce} t={t} scuro={scuro} />
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

function CardMenu({ voce, t, scuro }: { voce: VoceMenu; t: Tema; scuro: boolean }) {
  return (
    <Link href={voce.href} asChild>
      <Pressable
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: t.card, borderColor: t.bordo },
          pressed && styles.premuto,
        ]}
        accessibilityRole="link"
        accessibilityLabel={`${voce.titolo}: ${voce.descrizione}`}
      >
        <View style={styles.cardTesta}>
          <View
            style={[
              styles.iconaBox,
              { backgroundColor: scuro ? voce.tinta.scuro : voce.tinta.chiaro },
            ]}
          >
            <Text style={styles.icona}>{voce.icona}</Text>
          </View>
          <Text style={[styles.freccia, { color: t.testoSecondario }]}>↗</Text>
        </View>
        <Text style={[styles.cardTitolo, { color: t.testo }]}>{voce.titolo}</Text>
        <Text
          style={[styles.cardDescrizione, { color: t.testoSecondario }]}
          numberOfLines={2}
        >
          {voce.descrizione}
        </Text>
      </Pressable>
    </Link>
  );
}

// --- STILI ------------------------------------------------------------------

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, flexGrow: 1 },
  colonna: { width: '100%', maxWidth: 720, alignSelf: 'center' },

  data: { fontSize: 14, fontWeight: '500' },
  saluto: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.8,
    marginTop: 4,
  },
  nomeAzienda: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.8,
  },

  avviso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    marginTop: 20,
  },
  avvisoTesto: { flex: 1, fontSize: 14, lineHeight: 20, fontWeight: '500' },

  hero: {
    borderRadius: 28,
    padding: 24,
    marginTop: 24,
    overflow: 'hidden',
  },
  decoro: { position: 'absolute', borderRadius: 999, opacity: 0.18 },
  decoroGrande: { width: 220, height: 220, top: -90, right: -70 },
  decoroPiccolo: { width: 90, height: 90, bottom: -30, right: 70, opacity: 0.12 },
  heroEtichetta: { fontSize: 12, fontWeight: '700', letterSpacing: 1.2 },
  heroTitolo: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginTop: 8,
    maxWidth: 260,
  },
  heroTesto: { fontSize: 15, lineHeight: 21, marginTop: 8, maxWidth: 300 },
  heroBottone: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    alignSelf: 'flex-start',
    gap: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 999,
    marginTop: 20,
  },
  heroBottoneTesto: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

  sezione: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 32,
    marginBottom: 12,
  },
  griglia: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: {
    flexBasis: '45%',
    flexGrow: 1,
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
    minHeight: 150,
  },
  cardTesta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  iconaBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icona: { fontSize: 24 },
  freccia: { fontSize: 18, fontWeight: '600' },
  cardTitolo: { fontSize: 17, fontWeight: '700', letterSpacing: -0.2 },
  cardDescrizione: { fontSize: 13, lineHeight: 18, marginTop: 4 },

  premuto: { opacity: 0.85, transform: [{ scale: 0.98 }] },
});
