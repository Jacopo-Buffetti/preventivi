import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import {
  Image,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { coloriStato, ETICHETTE_STATO } from '../constants/stati';
import {
  FONT,
  useSceltaTema,
  useTema,
  type NomeTema,
  type Tema,
} from '../constants/tema';
import { useCaricaQuandoVisibile } from '../hooks/useCaricaQuandoVisibile';
import { getBiglietto } from '../services/bigliettoService';
import {
  getAllPreventivi,
  getProfiloFabbro,
  type Preventivo,
  type ProfiloFabbro,
} from '../services/databaseService';
import {
  useStatoSync,
  useTiraPerAggiornare,
  type StatoSync,
} from '../services/syncAutomatico';
import { styles } from '../styles/home.styles';
import {
  formattaEuro,
  formattaNumeroPreventivo,
  numeroWhatsApp,
} from '../utils/formato';

// =====================================================================
// HOME
// =====================================================================
// Risponde a una domanda: "cosa devo fare oggi?"
// 1. creare un preventivo (pulsante principale)
// 2. riprendere una bozza lasciata a metà
// 3. sollecitare i clienti che non hanno ancora risposto
// 4. tre numeri sul mese, senza enfasi
// 5. gli ultimi preventivi
// La navigazione tra le sezioni è nella barra in basso: qui non si ripete.
// =====================================================================

export default function HomeScreen() {
  const t = useTema();
  const { nome: nomeTema, alterna } = useSceltaTema();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const statoSync = useStatoSync();
  const { aggiornando, aggiorna } = useTiraPerAggiornare();

  const [profilo, setProfilo] = useState<ProfiloFabbro | null>(null);
  // Logo caricato nel biglietto da visita: finché non c'è, nessun logo
  const [logo, setLogo] = useState<string | null>(null);
  const [preventivi, setPreventivi] = useState<Preventivo[]>([]);
  const [caricato, setCaricato] = useState(false);

  // L'intestazione è blu notte in entrambi i temi: mentre la Home è
  // visibile, ora e batteria del telefono vanno in chiaro
  const [inVista, setInVista] = useState(false);
  useFocusEffect(
    useCallback(() => {
      setInVista(true);
      return () => setInVista(false);
    }, [])
  );

  // Ricarica quando la Home torna visibile e quando arrivano dati nuovi
  useCaricaQuandoVisibile(() => {
    Promise.all([getProfiloFabbro(), getAllPreventivi(), getBiglietto()])
      .then(([p, lista, biglietto]) => {
        setProfilo(p);
        setPreventivi(lista);
        setLogo(biglietto?.logo || null);
      })
      .catch((err) => console.error('Errore caricamento Home:', err))
      .finally(() => setCaricato(true));
  });

  // Le sezioni si calcolano dalla lista (già ordinata dal più recente)
  const dati = useMemo(() => calcolaSezioni(preventivi), [preventivi]);

  const nomeTitolare = primoNome(profilo?.titolare);
  const nomeAttivita = profilo?.nome_azienda?.trim() || null;
  const coloreContorno =
    nomeTema === 'dark' ? t.bottonePrimario : t.intestazione;

  const apriPreventivo = (id: string) =>
    router.push({
      pathname: '/preventivi/[idPreventivo]',
      params: { idPreventivo: id },
    });

  return (
    <View style={[styles.schermata, { backgroundColor: t.sfondo }]}>
      {inVista && <StatusBar style="light" />}

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={aggiornando}
            onRefresh={aggiorna}
            tintColor={t.ottone}
            colors={[t.ottone]}
            progressViewOffset={insets.top}
          />
        }
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {/* --- INTESTAZIONE --- */}
        <View
          style={[
            styles.intestazione,
            { backgroundColor: t.intestazione, paddingTop: insets.top + 16 },
          ]}
        >
          {/* Il doppio arco riprende il cerchio del logo */}
          <View
            style={[styles.arco, styles.arcoGrande, { borderColor: t.ottone }]}
          />
          <View
            style={[styles.arco, styles.arcoPiccolo, { borderColor: t.ottone }]}
          />

          <View style={styles.rigaMarchio}>
            {/* Il logo è quello del biglietto da visita: senza logo, niente riquadro */}
            {logo && (
              <Image
                source={{ uri: logo }}
                style={styles.logo}
                resizeMode="contain"
                accessibilityLabel="Logo"
              />
            )}
            <View style={styles.marchioTesti}>
              <Text
                style={[styles.nomeAttivita, { color: t.testoIntestazione }]}
                numberOfLines={1}
              >
                {nomeAttivita ?? 'La tua attività'}
              </Text>
              <StatoSincronizzazione t={t} stato={statoSync} />
            </View>
            <Pressable
              onPress={alterna}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={
                nomeTema === 'dark'
                  ? 'Passa al tema chiaro'
                  : 'Passa al tema scuro'
              }
              style={({ pressed }) => [
                styles.pulsanteTema,
                { backgroundColor: t.riquadroIntestazione },
                pressed && styles.premuto,
              ]}
            >
              <Feather
                name={nomeTema === 'dark' ? 'sun' : 'moon'}
                size={20}
                color={t.bottonePrimario}
              />
            </Pressable>
          </View>

          <View style={styles.saluto}>
            <Text
              style={[styles.data, { color: t.testoIntestazioneSecondario }]}
            >
              {dataOggi()}
            </Text>
            <Text style={[styles.titoloSaluto, { color: t.testoIntestazione }]}>
              {saluto()}
              {nomeTitolare ? `, ${nomeTitolare}` : ''}
            </Text>
          </View>

          {/* Pressable con router.push e non <Link asChild>: Link scarta gli
              stili scritti come funzione ({ pressed }) => ..., e il pulsante
              restava senza sfondo, invisibile sull'intestazione blu notte */}
          <Pressable
            onPress={() => router.push('/preventivi/nuovo')}
            accessibilityRole="link"
            style={({ pressed }) => [
              styles.pulsantePrincipale,
              { backgroundColor: t.bottonePrimario },
              pressed && styles.premuto,
            ]}
          >
            <Text
              style={[
                styles.pulsantePrincipaleTesto,
                { color: t.testoSuPrimario },
              ]}
            >
              Nuovo preventivo
            </Text>
            <View
              style={[
                styles.pulsantePiu,
                { backgroundColor: t.testoSuPrimario },
              ]}
            >
              <Feather name="plus" size={22} color={t.bottonePrimario} />
            </View>
          </Pressable>
        </View>

        <View style={styles.corpo}>
          {/* Profilo non compilato: i PDF uscirebbero con "La tua attività" */}
          {caricato && !nomeAttivita && (
            <Pressable
              onPress={() => router.push('/profilo')}
              accessibilityRole="link"
              style={({ pressed }) => [
                styles.avviso,
                { backgroundColor: t.card, borderColor: t.ottone },
                pressed && styles.premuto,
              ]}
            >
              <Feather name="alert-circle" size={20} color={t.accento} />
              <Text style={[styles.avvisoTesto, { color: t.testo }]}>
                Completa il profilo: nome e dati dell'attività compaiono sui
                preventivi.
              </Text>
              <Feather
                name="chevron-right"
                size={20}
                color={t.testoSecondario}
              />
            </Pressable>
          )}

          {/* --- DA RIPRENDERE: l'ultima bozza --- */}
          {dati.bozza && (
            <Sezione t={t} titolo="Da riprendere">
              <View
                style={[
                  styles.card,
                  styles.rigaBozza,
                  { backgroundColor: t.card, borderColor: t.bordo },
                ]}
              >
                <View
                  style={[
                    styles.iconaRiquadro,
                    { backgroundColor: t.riquadro },
                  ]}
                >
                  <Feather name="edit-3" size={20} color={t.testoSecondario} />
                </View>
                <View style={styles.testiRiga}>
                  <Text
                    style={[styles.titoloRiga, { color: t.testo }]}
                    numberOfLines={1}
                  >
                    {dati.bozza.oggetto?.trim() || 'Preventivo senza oggetto'}
                  </Text>
                  <Text
                    style={[styles.sottoRiga, { color: t.testoSecondario }]}
                    numberOfLines={1}
                  >
                    {dati.bozza.cliente_nome}, bozza{' '}
                    {quando(dati.bozza.data_creazione)}
                  </Text>
                </View>
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: '/preventivi/nuovo',
                      params: { idPreventivo: dati.bozza!.id },
                    })
                  }
                  accessibilityRole="link"
                  accessibilityLabel="Riprendi la bozza"
                  style={({ pressed }) => [
                    styles.pulsanteContorno,
                    { borderColor: coloreContorno },
                    pressed && styles.premuto,
                  ]}
                >
                  <Text
                    style={[
                      styles.pulsanteContornoTesto,
                      { color: coloreContorno },
                    ]}
                  >
                    Riprendi
                  </Text>
                </Pressable>
              </View>
            </Sezione>
          )}

          {/* --- IN ATTESA DI RISPOSTA --- */}
          {dati.inAttesa.length > 0 && (
            <Sezione
              t={t}
              titolo="In attesa di risposta"
              sottotitolo="Inviati e non ancora accettati"
            >
              <View
                style={[
                  styles.card,
                  { backgroundColor: t.card, borderColor: t.bordo },
                ]}
              >
                {dati.inAttesa.map((p, i) => (
                  <RigaInAttesa
                    key={p.id}
                    p={p}
                    t={t}
                    nomeTema={nomeTema}
                    ultima={i === dati.inAttesa.length - 1}
                    apri={() => apriPreventivo(p.id)}
                  />
                ))}
              </View>
            </Sezione>
          )}

          {/* --- IL MESE --- */}
          {preventivi.length > 0 && (
            <Sezione t={t} titolo={nomeMese()}>
              <View
                style={[
                  styles.card,
                  styles.griglia,
                  { backgroundColor: t.card, borderColor: t.bordo },
                ]}
              >
                <Cifra
                  t={t}
                  valore={String(dati.mese.inviati)}
                  etichetta={
                    dati.mese.inviati === 1
                      ? 'preventivo inviato'
                      : 'preventivi inviati'
                  }
                />
                <Cifra
                  t={t}
                  valore={String(dati.mese.accettati)}
                  etichetta={
                    dati.mese.accettati === 1 ? 'accettato' : 'accettati'
                  }
                  bordo
                />
                <Cifra
                  t={t}
                  valore={formattaEuroBreve(dati.mese.valoreAccettato)}
                  etichetta="lavori acquisiti"
                  colore={t.successo}
                  piccolo
                  bordo
                />
              </View>
            </Sezione>
          )}

          {/* --- ULTIMI PREVENTIVI --- */}
          {dati.ultimi.length > 0 ? (
            <Sezione
              t={t}
              titolo="Ultimi preventivi"
              azione={{ etichetta: 'Vedi tutti', href: '/preventivi' }}
            >
              <View
                style={[
                  styles.card,
                  { backgroundColor: t.card, borderColor: t.bordo },
                ]}
              >
                {dati.ultimi.map((p, i) => (
                  <RigaPreventivo
                    key={p.id}
                    p={p}
                    t={t}
                    nomeTema={nomeTema}
                    ultima={i === dati.ultimi.length - 1}
                    apri={() => apriPreventivo(p.id)}
                  />
                ))}
              </View>
            </Sezione>
          ) : (
            caricato && (
              <View
                style={[
                  styles.card,
                  styles.vuoto,
                  { backgroundColor: t.card, borderColor: t.bordo },
                ]}
              >
                <Text style={[styles.titoloRiga, { color: t.testo }]}>
                  Nessun preventivo, per ora
                </Text>
                <Text
                  style={[
                    styles.sottoRiga,
                    { color: t.testoSecondario, textAlign: 'center' },
                  ]}
                >
                  Crea il primo con il pulsante "Nuovo preventivo" qui sopra.
                </Text>
              </View>
            )
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// --- COMPONENTI DELLA HOME ------------------------------------------------

function StatoSincronizzazione({ t, stato }: { t: Tema; stato: StatoSync }) {
  const testo = stato.inCorso
    ? 'Sincronizzazione…'
    : stato.errore
      ? 'Non sincronizzato'
      : stato.ultimaRiuscita
        ? `Sincronizzato alle ${stato.ultimaRiuscita.toLocaleTimeString(
            'it-IT',
            {
              hour: '2-digit',
              minute: '2-digit',
            }
          )}`
        : 'In attesa di sincronizzare';
  // Verde = tutto a posto, ottone = in corso o qualcosa in sospeso
  const tuttoOk = !stato.errore && !stato.inCorso && !!stato.ultimaRiuscita;
  return (
    <View style={styles.rigaSync}>
      <View
        style={[
          styles.pallino,
          { backgroundColor: tuttoOk ? '#3FB97A' : t.bottonePrimario },
        ]}
      />
      <Text
        style={[styles.testoSync, { color: t.testoIntestazioneSecondario }]}
        numberOfLines={1}
      >
        {testo}
      </Text>
    </View>
  );
}

function Sezione({
  t,
  titolo,
  sottotitolo,
  azione,
  children,
}: {
  t: Tema;
  titolo: string;
  sottotitolo?: string;
  azione?: { etichetta: string; href: Href };
  children: ReactNode;
}) {
  const router = useRouter();
  return (
    <View style={styles.sezione}>
      <View style={styles.testaSezione}>
        <View style={styles.testiSezione}>
          <Text
            style={[styles.titoloSezione, { color: t.testo }]}
            accessibilityRole="header"
          >
            {titolo}
          </Text>
          {sottotitolo && (
            <Text style={[styles.sottoRiga, { color: t.testoSecondario }]}>
              {sottotitolo}
            </Text>
          )}
        </View>
        {azione && (
          <Pressable
            onPress={() => router.push(azione.href)}
            accessibilityRole="link"
            hitSlop={10}
          >
            <Text style={[styles.linkSezione, { color: t.accento }]}>
              {azione.etichetta}
            </Text>
          </Pressable>
        )}
      </View>
      {children}
    </View>
  );
}

function RigaInAttesa({
  p,
  t,
  nomeTema,
  ultima,
  apri,
}: {
  p: Preventivo;
  t: Tema;
  nomeTema: NomeTema;
  ultima: boolean;
  apri: () => void;
}) {
  const giorni = giorniDa(p.data_creazione);
  const blu = coloriStato('inviato', nomeTema);
  // Con il prefisso internazionale, se manca: wa.me non funziona senza
  const telefono = numeroWhatsApp(p.cliente_telefono ?? '');
  // Dopo 5 giorni senza risposta la riga si fa notare
  const daSollecitare = giorni >= 5;

  // Con il numero apre la chat WhatsApp, senza numero apre il preventivo
  const ricontatta = () => {
    if (!telefono) {
      apri();
      return;
    }
    const numero = formattaNumeroPreventivo(p.anno, p.numero_preventivo);
    const testo = `Buongiorno ${p.cliente_nome ?? ''}, volevo sapere se ha avuto modo di valutare il preventivo N° ${numero}.`;
    Linking.openURL(
      `https://wa.me/${telefono}?text=${encodeURIComponent(testo)}`
    ).catch(console.error);
  };

  return (
    <View
      style={[
        styles.riga,
        !ultima && { borderBottomWidth: 1, borderBottomColor: t.bordo },
      ]}
    >
      <Pressable
        onPress={apri}
        accessibilityRole="link"
        style={styles.testiRiga}
      >
        <Text style={[styles.titoloRiga, { color: t.testo }]} numberOfLines={1}>
          {p.oggetto?.trim() ||
            formattaNumeroPreventivo(p.anno, p.numero_preventivo)}
        </Text>
        <Text
          style={[styles.sottoRiga, { color: t.testoSecondario }]}
          numberOfLines={1}
        >
          {p.cliente_nome}
        </Text>
        <Text
          style={[
            styles.attesa,
            {
              color: daSollecitare ? t.accento : t.testoSecondario,
              fontFamily: daSollecitare ? FONT.grassetto : FONT.regolare,
            },
          ]}
        >
          {giorni === 0
            ? 'Emesso oggi'
            : giorni === 1
              ? 'Emesso ieri'
              : `Emesso ${giorni} giorni fa`}
        </Text>
      </Pressable>
      <Text style={[styles.importo, { color: t.testo }]}>
        {formattaEuro(p.totale_generale)}
      </Text>
      <Pressable
        onPress={ricontatta}
        accessibilityRole="button"
        accessibilityLabel={`Ricontatta ${p.cliente_nome ?? 'il cliente'}`}
        style={({ pressed }) => [
          styles.iconaRiquadro,
          { backgroundColor: blu.sfondo },
          pressed && styles.premuto,
        ]}
      >
        <Feather name="message-circle" size={20} color={blu.colore} />
      </Pressable>
    </View>
  );
}

function RigaPreventivo({
  p,
  t,
  nomeTema,
  ultima,
  apri,
}: {
  p: Preventivo;
  t: Tema;
  nomeTema: NomeTema;
  ultima: boolean;
  apri: () => void;
}) {
  const stato = coloriStato(p.stato, nomeTema);
  return (
    <Pressable
      onPress={apri}
      accessibilityRole="link"
      style={({ pressed }) => [
        styles.riga,
        !ultima && { borderBottomWidth: 1, borderBottomColor: t.bordo },
        pressed && { backgroundColor: t.riquadro },
      ]}
    >
      <Text style={[styles.numero, { color: t.testoSecondario }]}>
        {formattaNumeroPreventivo(p.anno, p.numero_preventivo)}
      </Text>
      <View style={styles.testiRiga}>
        <Text style={[styles.titoloRiga, { color: t.testo }]} numberOfLines={1}>
          {p.oggetto?.trim() || 'Senza oggetto'}
        </Text>
        <Text
          style={[styles.sottoRiga, { color: t.testoSecondario }]}
          numberOfLines={1}
        >
          {p.cliente_nome}
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

function Cifra({
  t,
  valore,
  etichetta,
  colore,
  piccolo,
  bordo,
}: {
  t: Tema;
  valore: string;
  etichetta: string;
  colore?: string;
  piccolo?: boolean;
  bordo?: boolean;
}) {
  return (
    <View
      style={[
        styles.cifra,
        bordo && { borderLeftWidth: 1, borderLeftColor: t.bordo },
      ]}
    >
      <Text
        style={[
          piccolo ? styles.cifraValorePiccolo : styles.cifraValore,
          { color: colore ?? t.testo },
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {valore}
      </Text>
      <Text style={[styles.cifraEtichetta, { color: t.testoSecondario }]}>
        {etichetta}
      </Text>
    </View>
  );
}

// --- CALCOLI ----------------------------------------------------------------

function calcolaSezioni(lista: Preventivo[]) {
  const oggi = new Date();
  const delMese = (p: Preventivo) => {
    const d = new Date(p.data_creazione);
    return (
      d.getFullYear() === oggi.getFullYear() && d.getMonth() === oggi.getMonth()
    );
  };

  // La lista arriva ordinata dalla più recente: la prima bozza è l'ultima creata
  const bozza = lista.find((p) => p.stato === 'bozza') ?? null;

  // Prima quelli che aspettano da più tempo: sono quelli da sollecitare
  const inAttesa = lista
    .filter((p) => p.stato === 'inviato')
    .sort((a, b) => a.data_creazione.localeCompare(b.data_creazione))
    .slice(0, 3);

  const delMeseLista = lista.filter(delMese);
  const accettatiMese = delMeseLista.filter((p) => p.stato === 'accettato');

  return {
    bozza,
    inAttesa,
    ultimi: lista.slice(0, 3),
    mese: {
      // "inviati" = quelli che hanno ricevuto un numero, cioè sono usciti
      inviati: delMeseLista.filter((p) => p.numero_preventivo !== null).length,
      accettati: accettatiMese.length,
      valoreAccettato: accettatiMese.reduce(
        (somma, p) => somma + p.totale_generale,
        0
      ),
    },
  };
}

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

function nomeMese(): string {
  const mese = new Date().toLocaleDateString('it-IT', { month: 'long' });
  return mese.charAt(0).toUpperCase() + mese.slice(1);
}

// "Mario Rossi" → "Mario"
function primoNome(nome?: string | null): string | null {
  const pulito = nome?.trim();
  return pulito ? pulito.split(/\s+/)[0] : null;
}

// Giorni di calendario trascorsi (non ore): ieri sera è "ieri", non "oggi"
function giorniDa(data: string): number {
  const inizio = new Date(data);
  const oggi = new Date();
  const a = Date.UTC(inizio.getFullYear(), inizio.getMonth(), inizio.getDate());
  const b = Date.UTC(oggi.getFullYear(), oggi.getMonth(), oggi.getDate());
  return Math.max(0, Math.round((b - a) / 86_400_000));
}

function quando(data: string): string {
  const g = giorniDa(data);
  if (g === 0) return 'di oggi';
  if (g === 1) return 'di ieri';
  return `di ${g} giorni fa`;
}

// Nella cella stretta del mese niente centesimi: "€ 1.240" invece di "€ 1.240,00"
function formattaEuroBreve(valore: number): string {
  return `€ ${Math.round(valore).toLocaleString('it-IT')}`;
}
