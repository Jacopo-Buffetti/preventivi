import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { useTema, type Tema } from '../../constants/tema';
import { CONDIVISIONE_IN_CORSO, condividiPdfBiglietto } from '../../services/bigliettoPdf';
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
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const larghezzaAnteprima = Math.min(width - 32, 420);

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
      avviso('Mancano dei dati', `Per creare il biglietto compila: ${mancanti.join(', ')}.`);
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
      avviso('Mancano dei dati', `Per creare il contatto compila: ${mancanti.join(', ')}.`);
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
        <ActivityIndicator color={t.accento} size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: t.sfondo }}
      contentContainerStyle={[styles.contenuto, { paddingTop: insets.top + 24 }]}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
    >
      <Text style={[styles.titolo, { color: t.testo }]}>Biglietto da visita</Text>
      <Text style={[styles.sottotitolo, { color: t.testoSecondario }]}>
        Componi il tuo biglietto: l'anteprima si aggiorna mentre scrivi.
      </Text>

      {/* Anteprima con scelta del lato */}
      <View style={[styles.selettore, { backgroundColor: t.card, borderColor: t.bordo }]}>
        {(['fronte', 'retro'] as const).map((l) => (
          <Pressable
            key={l}
            onPress={() => setLato(l)}
            style={[styles.selettoreVoce, lato === l && { backgroundColor: t.bottonePrimario }]}
            accessibilityRole="button"
            accessibilityState={{ selected: lato === l }}
          >
            <Text
              style={[
                styles.selettoreTesto,
                { color: lato === l ? '#FFFFFF' : t.testoSecondario },
              ]}
            >
              {l === 'fronte' ? 'Fronte' : 'Retro'}
            </Text>
          </Pressable>
        ))}
      </View>

      <Pressable
        onPress={() => setLato(lato === 'fronte' ? 'retro' : 'fronte')}
        style={styles.anteprima}
        accessibilityLabel="Gira il biglietto"
      >
        <AnteprimaBiglietto dati={dati} lato={lato} larghezza={larghezzaAnteprima} />
        <Text style={[styles.suggerimento, { color: t.testoSecondario }]}>
          Tocca il biglietto per girarlo
        </Text>
      </Pressable>

      {/* Logo */}
      <Sezione titolo="LOGO" t={t} />
      <View style={[styles.card, { backgroundColor: t.card, borderColor: t.bordo }]}>
        <Text style={[styles.testoCard, { color: t.testoSecondario }]}>
          Il logo compare grande sul fronte e piccolo sul retro. Funziona meglio con un'immagine
          quadrata su sfondo bianco o trasparente.
        </Text>
        <View style={styles.rigaBottoni}>
          <Pressable
            onPress={scegliLogo}
            style={({ pressed }) => [
              styles.bottoneLogo,
              { backgroundColor: t.bottoneSecondario },
              pressed && styles.premuto,
            ]}
            accessibilityRole="button"
          >
            <Text style={[styles.bottoneLogoTesto, { color: t.testo }]}>
              🖼️ {dati.logo ? 'Cambia logo' : 'Carica logo'}
            </Text>
          </Pressable>
          {!!dati.logo && (
            <Pressable
              onPress={rimuoviLogo}
              style={({ pressed }) => [
                styles.bottoneLogo,
                styles.bottoneRimuovi,
                { borderColor: t.pericolo },
                pressed && styles.premuto,
              ]}
              accessibilityRole="button"
            >
              <Text style={[styles.bottoneLogoTesto, { color: t.pericolo }]}>Rimuovi</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Fronte */}
      <Sezione titolo="FRONTE" t={t} />
      <FormInput
        label="Descrizione attività"
        placeholder="es. Serrature · Cancelli · Inferriate"
        value={dati.descrizione_fronte ?? ''}
        onChangeText={aggiorna('descrizione_fronte')}
        onFocus={() => setLato('fronte')}
      />

      {/* Retro */}
      <View style={styles.intestazioneRetro}>
        <Sezione titolo="RETRO" t={t} />
        <Pressable onPress={copiaDalProfilo} hitSlop={8} accessibilityRole="button">
          <Text style={[styles.link, { color: t.accento }]}>Completa dal profilo</Text>
        </Pressable>
      </View>

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
      />
      <Text style={[styles.notaCampo, { color: t.testoSecondario }]}>
        La qualifica non compare sul biglietto: viene inserita solo nel contatto condiviso.
      </Text>
      <FormInput
        label="Descrizione retro"
        placeholder="es. Fabbro · Sicurezza su misura"
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

      <View style={styles.riga}>
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
        value={dati.email ?? ''}
        onChangeText={aggiorna('email')}
        onFocus={() => setLato('retro')}
      />
      <FormInput
        label="Email secondaria"
        placeholder="pec@officina.it"
        keyboardType="email-address"
        autoCapitalize="none"
        value={dati.email_secondaria ?? ''}
        onChangeText={aggiorna('email_secondaria')}
        onFocus={() => setLato('retro')}
      />

      <View style={styles.riga}>
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

      <Text style={[styles.nota, { color: t.testoSecondario }]}>* campi obbligatori</Text>

      {/* Azioni */}
      <Pressable
        onPress={esporta}
        disabled={esportando || salvando}
        style={({ pressed }) => [
          styles.bottonePrimario,
          { backgroundColor: t.bottonePrimario },
          (esportando || salvando) && styles.disabilitato,
          pressed && styles.premuto,
        ]}
        accessibilityRole="button"
      >
        {esportando ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.bottonePrimarioTesto}>📄 Condividi PDF per la stampa</Text>
        )}
      </Pressable>

      <Pressable
        onPress={inviaContatto}
        disabled={condividendoContatto || salvando}
        style={({ pressed }) => [
          styles.bottoneContatto,
          { backgroundColor: t.card, borderColor: t.accento },
          (condividendoContatto || salvando) && styles.disabilitato,
          pressed && styles.premuto,
        ]}
        accessibilityRole="button"
      >
        {condividendoContatto ? (
          <ActivityIndicator color={t.accento} />
        ) : (
          <Text style={[styles.bottoneContattoTesto, { color: t.accento }]}>
            👤 Condividi contatto
          </Text>
        )}
      </Pressable>

      <Pressable
        onPress={salva}
        disabled={!modificato || salvando}
        style={({ pressed }) => [
          styles.bottoneSecondario,
          { borderColor: t.bordo },
          (!modificato || salvando) && styles.disabilitato,
          pressed && styles.premuto,
        ]}
        accessibilityRole="button"
      >
        <Text style={[styles.bottoneSecondarioTesto, { color: t.testo }]}>
          {salvando ? 'Salvataggio…' : modificato ? '💾 Salva modifiche' : '✓ Salvato'}
        </Text>
      </Pressable>
    </ScrollView>
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

function Sezione({ titolo, t }: { titolo: string; t: Tema }) {
  return <Text style={[styles.sezione, { color: t.testoSecondario }]}>{titolo}</Text>;
}

const styles = StyleSheet.create({
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  contenuto: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  titolo: { fontSize: 24, fontWeight: '800', letterSpacing: -0.4 },
  sottotitolo: { fontSize: 14, marginTop: 4 },

  selettore: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 999,
    padding: 4,
    marginTop: 20,
    alignSelf: 'center',
  },
  selettoreVoce: { paddingHorizontal: 22, paddingVertical: 8, borderRadius: 999 },
  selettoreTesto: { fontSize: 14, fontWeight: '700' },

  anteprima: { alignItems: 'center', marginTop: 16 },
  suggerimento: { fontSize: 12, marginTop: 10 },

  sezione: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
    marginTop: 24,
    marginBottom: 10,
  },
  intestazioneRetro: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  link: { fontSize: 13, fontWeight: '700', marginBottom: 10 },

  card: { borderWidth: 1, borderRadius: 12, padding: 14 },
  testoCard: { fontSize: 13, lineHeight: 19 },
  rigaBottoni: { flexDirection: 'row', gap: 8, marginTop: 12 },
  bottoneLogo: { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  bottoneRimuovi: { flex: 0, paddingHorizontal: 18, borderWidth: 1 },
  bottoneLogoTesto: { fontSize: 14, fontWeight: '700' },

  riga: { flexDirection: 'row', gap: 12 },
  flex: { flex: 1 },
  nota: { fontSize: 12, marginTop: -4 },
  notaCampo: { fontSize: 12, marginTop: -10, marginBottom: 16 },

  bottonePrimario: { borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 20 },
  bottonePrimarioTesto: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  bottoneContatto: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 12,
  },
  bottoneContattoTesto: { fontSize: 15, fontWeight: '800' },
  bottoneSecondario: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  bottoneSecondarioTesto: { fontSize: 15, fontWeight: '700' },

  disabilitato: { opacity: 0.5 },
  premuto: { opacity: 0.85, transform: [{ scale: 0.98 }] },
});
