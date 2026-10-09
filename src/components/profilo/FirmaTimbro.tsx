import { Feather } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useState, type ComponentProps } from 'react';
import { ActivityIndicator, Image, Pressable, Text, View } from 'react-native';
import { useTema, type Tema } from '../../constants/tema';
import {
  ImmagineTroppoGrande,
  preparaImmagineProfilo,
  type ImmagineProfilo,
} from '../../services/immaginiProfilo';
import { avviso } from '../../utils/dialoghi';
import { FoglioInBasso } from '../ui/FoglioInBasso';
import { styles } from './FirmaTimbro.styles';

type NomeIcona = ComponentProps<typeof Feather>['name'];

interface Props {
  firma: string | null;
  timbro: string | null;
  onCambia: (tipo: ImmagineProfilo, valore: string | null) => void;
}

const ETICHETTE: Record<ImmagineProfilo, string> = {
  firma: 'Firma',
  timbro: 'Timbro',
};

// Firma e timbro del professionista, nel form del profilo.
// Finiscono nel PDF del preventivo, nello spazio "Firma per conferma":
// il timbro sotto, la firma sopra. Qui c'è un'anteprima di come escono.
// Le immagini non si salvano da sole: entrano nel profilo con il pulsante
// "Salva i dati", come gli altri campi.
export function FirmaTimbro({ firma, timbro, onCambia }: Props) {
  const t = useTema();
  // Quale immagine si sta scegliendo (il foglio di scelta è aperto)
  const [scelta, setScelta] = useState<ImmagineProfilo | null>(null);
  const [preparando, setPreparando] = useState<ImmagineProfilo | null>(null);

  // Chiude il foglio e aspetta la fine dell'animazione: su iPhone la
  // galleria aperta mentre il foglio si chiude a volte non compare
  const chiudiScelta = async () => {
    setScelta(null);
    await new Promise((fatto) => setTimeout(fatto, 400));
  };

  const usa = async (
    tipo: ImmagineProfilo,
    uri: string,
    mimeType?: string | null
  ) => {
    try {
      setPreparando(tipo);
      const dataUri = await preparaImmagineProfilo(uri, mimeType, tipo);
      onCambia(tipo, dataUri);
    } catch (err) {
      if (err instanceof ImmagineTroppoGrande) {
        avviso(
          'Immagine troppo complessa',
          "Prova con un'immagine ritagliata stretta intorno alla firma o al timbro."
        );
        return;
      }
      console.error(err);
      avviso('Errore', "Impossibile leggere l'immagine scelta.");
    } finally {
      setPreparando(null);
    }
  };

  const dallaGalleria = async (tipo: ImmagineProfilo) => {
    await chiudiScelta();
    try {
      const r = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        // Ritaglio libero: utile per stringere intorno alla firma
        allowsEditing: true,
        quality: 1,
      });
      if (r.canceled) return;
      const f = r.assets[0];
      await usa(tipo, f.uri, f.mimeType);
    } catch (err) {
      console.error(err);
      avviso('Errore', 'Impossibile aprire la galleria.');
    }
  };

  // Dai file: è il modo sicuro per un PNG trasparente, che la galleria
  // a volte converte in JPEG perdendo la trasparenza
  const daFile = async (tipo: ImmagineProfilo) => {
    await chiudiScelta();
    try {
      const r = await DocumentPicker.getDocumentAsync({
        type: ['image/png', 'image/jpeg', 'image/*'],
        copyToCacheDirectory: true,
      });
      if (r.canceled) return;
      const f = r.assets[0];
      await usa(tipo, f.uri, f.mimeType);
    } catch (err) {
      console.error(err);
      avviso('Errore', 'Impossibile aprire i file del telefono.');
    }
  };

  return (
    <View style={styles.contenitore}>
      <Text style={[styles.titolo, { color: t.testo }]}>Firma e timbro</Text>
      <Text style={[styles.spiegazione, { color: t.testoSecondario }]}>
        Compaiono nel PDF nello spazio "Firma per conferma": il timbro sotto, la
        firma sopra. Meglio PNG con sfondo trasparente, ma va bene anche una
        foto su foglio bianco: il bianco nel PDF sparisce.
      </Text>

      <View style={styles.affiancati}>
        {(['firma', 'timbro'] as const).map((tipo) => {
          const valore = tipo === 'firma' ? firma : timbro;
          return (
            <View
              key={tipo}
              style={[
                styles.card,
                { backgroundColor: t.card, borderColor: t.bordo },
              ]}
            >
              <Text style={[styles.etichetta, { color: t.testoSecondario }]}>
                {ETICHETTE[tipo]}
              </Text>
              {/* Sempre su bianco: è così che finisce sul foglio */}
              <View style={[styles.miniatura, { borderColor: t.bordo }]}>
                {preparando === tipo ? (
                  <ActivityIndicator color={t.ottone} />
                ) : valore ? (
                  <Image
                    source={{ uri: valore }}
                    style={styles.miniaturaImmagine}
                    resizeMode="contain"
                    accessibilityLabel={ETICHETTE[tipo]}
                  />
                ) : (
                  <Feather
                    name={tipo === 'firma' ? 'pen-tool' : 'award'}
                    size={22}
                    color="#93A3B5"
                  />
                )}
              </View>
              <Pulsante
                t={t}
                icona="upload"
                testo={valore ? 'Cambia' : 'Carica'}
                onPress={() => setScelta(tipo)}
                disabilitato={preparando !== null}
              />
              {!!valore && (
                <Pulsante
                  t={t}
                  icona="trash-2"
                  testo="Rimuovi"
                  colore={t.pericolo}
                  onPress={() => onCambia(tipo, null)}
                  disabilitato={preparando !== null}
                />
              )}
            </View>
          );
        })}
      </View>

      {/* Anteprima dello spazio firma del PDF, con le stesse proporzioni */}
      {(!!firma || !!timbro) && (
        <View
          style={[
            styles.anteprima,
            { backgroundColor: t.card, borderColor: t.bordo },
          ]}
        >
          <Text style={[styles.etichetta, { color: t.testoSecondario }]}>
            Come esce nel preventivo
          </Text>
          <View style={[styles.foglio, { borderColor: t.bordo }]}>
            <Text style={styles.foglioTitolo}>Firma per Conferma</Text>
            <View style={styles.spazioFirma}>
              {!!timbro && (
                <Image
                  source={{ uri: timbro }}
                  style={styles.timbro}
                  resizeMode="contain"
                />
              )}
              {!!firma && (
                <Image
                  source={{ uri: firma }}
                  style={styles.firma}
                  resizeMode="contain"
                />
              )}
            </View>
            <View style={styles.linea} />
            <Text style={styles.didascalia}>
              Firma e timbro del professionista
            </Text>
          </View>
        </View>
      )}

      <FoglioInBasso
        visibile={scelta !== null}
        titolo={scelta ? `Carica ${ETICHETTE[scelta].toLowerCase()}` : ''}
        onChiudi={() => setScelta(null)}
      >
        <View style={styles.opzioni}>
          <Opzione
            t={t}
            icona="image"
            titolo="Dalla galleria"
            sotto="Una foto su foglio bianco: puoi ritagliarla stretta"
            onPress={() => scelta && dallaGalleria(scelta)}
          />
          <Opzione
            t={t}
            icona="file"
            titolo="Da un file"
            sotto="Il modo migliore per un PNG con sfondo trasparente"
            onPress={() => scelta && daFile(scelta)}
          />
        </View>
      </FoglioInBasso>
    </View>
  );
}

function Pulsante({
  t,
  icona,
  testo,
  colore,
  onPress,
  disabilitato,
}: {
  t: Tema;
  icona: NomeIcona;
  testo: string;
  colore?: string;
  onPress: () => void;
  disabilitato: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabilitato}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.pulsante,
        { backgroundColor: t.riquadro },
        disabilitato && styles.disabilitato,
        pressed && styles.premuto,
      ]}
    >
      <Feather name={icona} size={15} color={colore ?? t.testo} />
      <Text style={[styles.pulsanteTesto, { color: colore ?? t.testo }]}>
        {testo}
      </Text>
    </Pressable>
  );
}

function Opzione({
  t,
  icona,
  titolo,
  sotto,
  onPress,
}: {
  t: Tema;
  icona: NomeIcona;
  titolo: string;
  sotto: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.opzione,
        { backgroundColor: t.inputFoglio, borderColor: t.bordo },
        pressed && styles.premuto,
      ]}
    >
      <View style={[styles.icona, { backgroundColor: t.riquadro }]}>
        <Feather name={icona} size={20} color={t.testo} />
      </View>
      <View style={styles.testi}>
        <Text style={[styles.opzioneTitolo, { color: t.testo }]}>{titolo}</Text>
        <Text style={[styles.opzioneSotto, { color: t.testoSecondario }]}>
          {sotto}
        </Text>
      </View>
      <Feather name="chevron-right" size={20} color={t.testoSecondario} />
    </Pressable>
  );
}
