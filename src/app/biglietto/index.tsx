import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import {
  useEffect,
  useState,
  type ComponentProps,
  type ReactNode,
} from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnteprimaBiglietto } from '../../components/biglietto/AnteprimaBiglietto';
import { FormInput } from '../../components/ui/FormInput';
import { FONT, useSceltaTema, useTema, type Tema } from '../../constants/tema';
import {
  CONDIVISIONE_IN_CORSO,
  condividiPdfBiglietto,
} from '../../services/bigliettoPdf';
import {
  campiMancanti,
  getBiglietto,
  saveBiglietto,
  type Biglietto,
} from '../../services/bigliettoService';
import { getProfiloFabbro } from '../../services/databaseService';
import { condividiContatto } from '../../services/vcardService';
import { avviso } from '../../utils/dialoghi';

// Oltre questa dimensione (circa 2 MB) il logo appesantisce database e PDF
const MAX_LOGO_BASE64 = 2_800_000;

export default function BigliettoScreen() {
  const t = useTema();
  const { nome: nomeTema } = useSceltaTema();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const larghezzaAnteprima = Math.min(width - 40, 420);

  const [dati, setDati] = useState<Biglietto>({});
  const [lato, setLato] = useState<'fronte' | 'retro'>('fronte');
  const [caricamento, setCaricamento] = useState(true);
  const [modificato, setModificato] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [esportando, setEsportando] = useState(false);
  const [condividendoContatto, setCondividendoContatto] = useState(false);

  // Al primo avvio, se il biglietto non esiste, lo precompila con i dati del profilo
  useEffect(() => {
    (async () => {
      try {
        const salvato = await getBiglietto();
        if (salvato) {
          setDati(salvato);
        } else {
          setDati(await datiDalProfilo({}));
          setModificato(true);
        }
      } catch (err) {
        console.error(err);
        avviso('Errore', 'Impossibile caricare il biglietto da visita.');
      } finally {
        setCaricamento(false);
      }
    })();
  }, []);

  const aggiorna = (campo: keyof Biglietto) => (valore: string) => {
    setDati((d) => ({ ...d, [campo]: valore }));
    setModificato(true);
  };

  const copiaDalProfilo = async () => {
    const completati = await datiDalProfilo(dati);
    setDati(completati);
    setModificato(true);
  };

  const scegliLogo = async () => {
    try {
      const risultato = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.7,
        base64: true,
      });
      if (risultato.canceled) return;

      const immagine = risultato.assets[0];
      const uri = immagine.uri.startsWith('data:')
        ? immagine.uri
        : immagine.base64
          ? `data:${immagine.mimeType ?? 'image/jpeg'};base64,${immagine.base64}`
          : null;

      if (!uri) {
        avviso('Errore', "Impossibile leggere l'immagine scelta.");
        return;
      }
      if (uri.length > MAX_LOGO_BASE64) {
        avviso(
          'Immagine troppo grande',
          "Scegli un'immagine più piccola o ritagliala: per il logo bastano poche centinaia di pixel."
        );
        return;
      }

      setDati((d) => ({ ...d, logo: uri }));
      setModificato(true);
    } catch (err) {
      console.error(err);
      avviso('Errore', 'Impossibile aprire la galleria.');
    }
  };

  const rimuoviLogo = () => {
    setDati((d) => ({ ...d, logo: undefined }));
    setModificato(true);
  };

  const salva = async (): Promise<boolean> => {
    try {
      setSalvando(true);
      await saveBiglietto(dati);
      setModificato(false);
      return true;
    } catch (err) {
      console.error(err);
      avviso('Errore', 'Impossibile salvare il biglietto.');
      return false;
    } finally {
      setSalvando(false);
    }
  };

  const esporta = async () => {
    const mancanti = campiMancanti(dati);
    if (mancanti.length > 0) {
      avviso(
        'Mancano dei dati',
        `Per creare il biglietto compila: ${mancanti.join(', ')}.`
      );
      return;
    }
    if (modificato && !(await salva())) return;

    try {
      setEsportando(true);
      await condividiPdfBiglietto(dati);
    } catch (err) {
      mostraErroreCondivisione(err, 'Impossibile creare il PDF del biglietto.');
    } finally {
      setEsportando(false);
    }
  };

  const inviaContatto = async () => {
    const mancanti = campiMancanti(dati);
    if (mancanti.length > 0) {
      avviso(
        'Mancano dei dati',
        `Per creare il contatto compila: ${mancanti.join(', ')}.`
      );
      return;
    }
    if (modificato && !(await salva())) return;

    try {
      setCondividendoContatto(true);
      await condividiContatto(dati);
    } catch (err) {
      mostraErroreCondivisione(err, 'Impossibile creare il contatto.');
    } finally {
      setCondividendoContatto(false);
    }
  };

  if (caricamento) {
    return (
      <View style={[styles.centro, { backgroundColor: t.sfondo }]}>
        <ActivityIndicator color={t.ottone} size="large" />
      </View>
    );
  }

  const occupato = salvando || esportando || condividendoContatto;

  return (
    <View style={[styles.container, { backgroundColor: t.sfondo }]}>
      <ScrollView
        contentContainerStyle={[
          styles.contenuto,
          { paddingTop: insets.top + 20 },
        ]}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        {/* --- TITOLO E SALVATAGGIO --- */}
        <View style={styles.testa}>
          <View style={styles.testaTesti}>
            <Text
              style={[styles.titolo, { color: t.testo }]}
              accessibilityRole="header"
            >
              Biglietto da visita
            </Text>
            <Text style={[styles.sottotitolo, { color: t.testoSecondario }]}>
              L'anteprima si aggiorna mentre scrivi.
            </Text>
          </View>
          {/* Con modifiche da salvare il pulsante è ottone, altrimenti dice "Salvato" */}
          <Pressable
            onPress={salva}
            disabled={!modificato || salvando}
            accessibilityRole="button"
            accessibilityLabel={
              modificato ? 'Salva modifiche' : 'Biglietto salvato'
            }
            style={({ pressed }) => [
              styles.salva,
              modificato
                ? { backgroundColor: t.bottonePrimario }
                : { backgroundColor: t.riquadro },
              pressed && styles.premuto,
            ]}
          >
            {salvando ? (
              <ActivityIndicator color={t.testoSuPrimario} />
            ) : (
              <>
                <Feather
                  name={modificato ? 'save' : 'check'}
                  size={16}
                  color={modificato ? t.testoSuPrimario : t.testoSecondario}
                />
                <Text
                  style={[
                    styles.salvaTesto,
                    {
                      color: modificato ? t.testoSuPrimario : t.testoSecondario,
                    },
                  ]}
                >
                  {modificato ? 'Salva' : 'Salvato'}
                </Text>
              </>
            )}
          </Pressable>
        </View>

        {/* --- ANTEPRIMA --- */}
        <View style={[styles.selettore, { backgroundColor: t.riquadro }]}>
          {(['fronte', 'retro'] as const).map((l) => {
            const attivo = lato === l;
            return (
              <Pressable
                key={l}
                onPress={() => setLato(l)}
                style={[
                  styles.selettoreVoce,
                  attivo && {
                    backgroundColor: nomeTema === 'dark' ? t.bordo : t.card,
                  },
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: attivo }}
              >
                <Text
                  style={[
                    styles.selettoreTesto,
                    {
                      color: attivo ? t.testo : t.testoSecondario,
                      fontFamily: attivo ? FONT.pieno : FONT.semi,
                    },
                  ]}
                >
                  {l === 'fronte' ? 'Fronte' : 'Retro'}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          onPress={() => setLato(lato === 'fronte' ? 'retro' : 'fronte')}
          style={styles.anteprima}
          accessibilityLabel="Gira il biglietto"
        >
          <View style={styles.ombra}>
            <AnteprimaBiglietto
              dati={dati}
              lato={lato}
              larghezza={larghezzaAnteprima}
            />
          </View>
          <View style={styles.suggerimento}>
            <Feather name="refresh-cw" size={13} color={t.testoSecondario} />
            <Text
              style={[styles.suggerimentoTesto, { color: t.testoSecondario }]}
            >
              Tocca il biglietto per girarlo
            </Text>
          </View>
        </Pressable>

        {/* --- LOGO --- */}
        <Sezione t={t} titolo="Logo">
          <View
            style={[
              styles.card,
              styles.cardLogo,
              { backgroundColor: t.card, borderColor: t.bordo },
            ]}
          >
            <View
              style={[
                styles.miniatura,
                { backgroundColor: '#FFFFFF', borderColor: t.bordo },
              ]}
            >
              {dati.logo ? (
                <Image
                  source={{ uri: dati.logo }}
                  style={styles.miniaturaImmagine}
                  resizeMode="contain"
                  accessibilityLabel="Logo attuale"
                />
              ) : (
                <Feather name="image" size={24} color="#93A3B5" />
              )}
            </View>
            <View style={styles.logoTesti}>
              <Text style={[styles.testoCard, { color: t.testoSecondario }]}>
                Grande sul fronte, piccolo sul retro. Meglio un'immagine
                quadrata su fondo bianco o trasparente.
              </Text>
              <View style={styles.rigaBottoni}>
                <PulsanteRiquadro
                  t={t}
                  icona="image"
                  testo={dati.logo ? 'Cambia' : 'Carica logo'}
                  onPress={scegliLogo}
                />
                {!!dati.logo && (
                  <PulsanteRiquadro
                    t={t}
                    icona="trash-2"
                    testo="Rimuovi"
                    colore={t.pericolo}
                    onPress={rimuoviLogo}
                  />
                )}
              </View>
            </View>
          </View>
        </Sezione>

        {/* --- FRONTE --- */}
        <Sezione t={t} titolo="Fronte">
          <FormInput
            label="Descrizione attività"
            placeholder="es. Serrature, cancelli, inferriate"
            value={dati.descrizione_fronte ?? ''}
            onChangeText={aggiorna('descrizione_fronte')}
            onFocus={() => setLato('fronte')}
            aiuto="Compare sotto il logo, in maiuscolo."
          />
        </Sezione>

        {/* --- RETRO --- */}
        <Sezione
          t={t}
          titolo="Retro"
          azione={{
            etichetta: 'Completa dal profilo',
            onPress: copiaDalProfilo,
          }}
        >
          <Text style={[styles.obbligatori, { color: t.testoSecondario }]}>
            I campi con * sono obbligatori.
          </Text>
          <FormInput
            label="Nome attività *"
            placeholder="es. Giacomo D'Ignazio"
            value={dati.nome ?? ''}
            onChangeText={aggiorna('nome')}
            onFocus={() => setLato('retro')}
          />
          <FormInput
            label="Qualifica"
            placeholder="es. Titolare, Fabbro, Tecnico"
            value={dati.qualifica ?? ''}
            onChangeText={aggiorna('qualifica')}
            aiuto="Non compare sul biglietto: va solo nel contatto condiviso."
          />
          <FormInput
            label="Descrizione retro"
            placeholder="es. Fabbro, sicurezza su misura"
            value={dati.descrizione_retro ?? ''}
            onChangeText={aggiorna('descrizione_retro')}
            onFocus={() => setLato('retro')}
          />
          <FormInput
            label="Indirizzo *"
            placeholder="es. Via Roma 12, Terni"
            value={dati.indirizzo ?? ''}
            onChangeText={aggiorna('indirizzo')}
            onFocus={() => setLato('retro')}
          />
          <View style={styles.affiancati}>
            <View style={styles.flex}>
              <FormInput
                label="Telefono *"
                placeholder="0744 123456"
                keyboardType="phone-pad"
                value={dati.telefono ?? ''}
                onChangeText={aggiorna('telefono')}
                onFocus={() => setLato('retro')}
              />
            </View>
            <View style={styles.flex}>
              <FormInput
                label="Cellulare"
                placeholder="333 1234567"
                keyboardType="phone-pad"
                value={dati.cellulare ?? ''}
                onChangeText={aggiorna('cellulare')}
                onFocus={() => setLato('retro')}
              />
            </View>
          </View>
          <FormInput
            label="Email *"
            placeholder="info@officina.it"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            value={dati.email ?? ''}
            onChangeText={aggiorna('email')}
            onFocus={() => setLato('retro')}
          />
          <FormInput
            label="Email secondaria"
            placeholder="pec@officina.it"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            value={dati.email_secondaria ?? ''}
            onChangeText={aggiorna('email_secondaria')}
            onFocus={() => setLato('retro')}
          />
          <View style={styles.affiancati}>
            <View style={styles.flex}>
              <FormInput
                label="P.IVA"
                placeholder="01234567890"
                keyboardType="numeric"
                value={dati.p_iva ?? ''}
                onChangeText={aggiorna('p_iva')}
                onFocus={() => setLato('retro')}
              />
            </View>
            <View style={styles.flex}>
              <FormInput
                label="REA"
                placeholder="TR-123456"
                autoCapitalize="characters"
                value={dati.rea ?? ''}
                onChangeText={aggiorna('rea')}
                onFocus={() => setLato('retro')}
              />
            </View>
          </View>
          <FormInput
            label="Codice fiscale"
            placeholder="RSSMRA80A01L117X"
            autoCapitalize="characters"
            value={dati.codice_fiscale ?? ''}
            onChangeText={aggiorna('codice_fiscale')}
            onFocus={() => setLato('retro')}
          />
        </Sezione>
      </ScrollView>

      {/* --- BARRA IN BASSO: le due cose che si fanno con il biglietto --- */}
      <View
        style={[
          styles.barraAzioni,
          { backgroundColor: t.barraTab, borderTopColor: t.bordo },
        ]}
      >
        <Pressable
          onPress={esporta}
          disabled={occupato}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.azionePrincipale,
            { backgroundColor: t.bottonePrimario },
            occupato && styles.disabilitato,
            pressed && styles.premuto,
          ]}
        >
          {esportando ? (
            <ActivityIndicator color={t.testoSuPrimario} />
          ) : (
            <>
              <Feather name="printer" size={19} color={t.testoSuPrimario} />
              <Text
                style={[
                  styles.azionePrincipaleTesto,
                  { color: t.testoSuPrimario },
                ]}
              >
                PDF per la tipografia
              </Text>
            </>
          )}
        </Pressable>
        <Pressable
          onPress={inviaContatto}
          disabled={occupato}
          accessibilityRole="button"
          accessibilityLabel="Condividi il contatto"
          style={({ pressed }) => [
            styles.azioneSecondaria,
            { borderColor: t.bordo },
            occupato && styles.disabilitato,
            pressed && styles.premuto,
          ]}
        >
          {condividendoContatto ? (
            <ActivityIndicator color={t.testo} />
          ) : (
            <>
              <Feather name="user" size={18} color={t.testo} />
              <Text style={[styles.azioneSecondariaTesto, { color: t.testo }]}>
                Contatto
              </Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

function mostraErroreCondivisione(err: unknown, messaggio: string) {
  console.error(err);
  if (err instanceof Error && err.message === CONDIVISIONE_IN_CORSO) {
    avviso(
      'Condivisione già aperta',
      "C'è ancora una finestra di condivisione aperta. Chiudila e riprova. " +
        'Se non ne vedi nessuna, chiudi completamente Expo Go e riaprilo.'
    );
  } else {
    avviso('Errore', messaggio);
  }
}

// Completa i campi vuoti del biglietto con i dati del profilo dell'officina
async function datiDalProfilo(attuali: Biglietto): Promise<Biglietto> {
  const p = await getProfiloFabbro();
  if (!p) return attuali;
  const scegli = (attuale?: string, profilo?: string) =>
    attuale && attuale.trim() ? attuale : profilo || undefined;
  return {
    ...attuali,
    nome: scegli(attuali.nome, p.nome_azienda),
    indirizzo: scegli(attuali.indirizzo, p.indirizzo),
    telefono: scegli(attuali.telefono, p.telefono),
    email: scegli(attuali.email, p.email),
    p_iva: scegli(attuali.p_iva, p.p_iva),
    codice_fiscale: scegli(attuali.codice_fiscale, p.codice_fiscale),
  };
}

type NomeIcona = ComponentProps<typeof Feather>['name'];

function Sezione({
  t,
  titolo,
  azione,
  children,
}: {
  t: Tema;
  titolo: string;
  azione?: { etichetta: string; onPress: () => void };
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
        {azione && (
          <Pressable
            onPress={azione.onPress}
            hitSlop={10}
            accessibilityRole="button"
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

function PulsanteRiquadro({
  t,
  icona,
  testo,
  colore,
  onPress,
}: {
  t: Tema;
  icona: NomeIcona;
  testo: string;
  colore?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.pulsanteRiquadro,
        { backgroundColor: t.riquadro },
        pressed && styles.premuto,
      ]}
    >
      <Feather name={icona} size={16} color={colore ?? t.testo} />
      <Text
        style={[styles.pulsanteRiquadroTesto, { color: colore ?? t.testo }]}
      >
        {testo}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  contenuto: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 24,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },

  testa: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  testaTesti: { flex: 1, gap: 2 },
  titolo: {
    fontSize: 30,
    lineHeight: 36,
    fontFamily: FONT.pieno,
    letterSpacing: -0.5,
  },
  sottotitolo: { fontSize: 13, fontFamily: FONT.regolare },
  salva: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginTop: 2,
    minWidth: 96,
    justifyContent: 'center',
  },
  salvaTesto: { fontSize: 14, fontFamily: FONT.grassetto },

  selettore: {
    flexDirection: 'row',
    alignSelf: 'center',
    padding: 4,
    borderRadius: 14,
    gap: 4,
    marginBottom: -8,
  },
  selettoreVoce: {
    height: 36,
    paddingHorizontal: 22,
    borderRadius: 10,
    justifyContent: 'center',
  },
  selettoreTesto: { fontSize: 14 },

  anteprima: { alignItems: 'center', gap: 10 },
  // Ombra leggera: il biglietto deve sembrare un oggetto di carta
  ombra: { borderRadius: 12, boxShadow: '0px 10px 24px rgba(7, 21, 34, 0.25)' },
  suggerimento: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  suggerimentoTesto: { fontSize: 12, fontFamily: FONT.regolare },

  sezione: { gap: 10 },
  testaSezione: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titoloSezione: { fontSize: 16, fontFamily: FONT.pieno },
  linkSezione: { fontSize: 14, fontFamily: FONT.grassetto, paddingVertical: 4 },
  obbligatori: {
    fontSize: 12,
    fontFamily: FONT.regolare,
    marginTop: -4,
    marginBottom: 2,
  },

  card: { borderRadius: 18, borderWidth: 1 },
  cardLogo: {
    flexDirection: 'row',
    gap: 14,
    padding: 14,
    alignItems: 'center',
  },
  miniatura: {
    width: 72,
    height: 72,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  miniaturaImmagine: { width: 64, height: 64 },
  logoTesti: { flex: 1, gap: 10 },
  testoCard: { fontSize: 13, lineHeight: 18, fontFamily: FONT.regolare },
  rigaBottoni: { flexDirection: 'row', gap: 8 },
  pulsanteRiquadro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  pulsanteRiquadroTesto: { fontSize: 13, fontFamily: FONT.grassetto },

  affiancati: { flexDirection: 'row', gap: 12 },
  flex: { flex: 1 },

  barraAzioni: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  azionePrincipale: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  azionePrincipaleTesto: { fontSize: 16, fontFamily: FONT.pieno },
  azioneSecondaria: {
    height: 56,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  azioneSecondariaTesto: { fontSize: 14, fontFamily: FONT.grassetto },

  disabilitato: { opacity: 0.5 },
  premuto: { opacity: 0.85, transform: [{ scale: 0.98 }] },
});
