import { Feather } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState, type ComponentProps } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  Text,
  View,
} from 'react-native';
import { useTema, type Tema } from '../../constants/tema';
import type { PreventivoConCliente } from '../../services/databaseService';
import { apriConAppEsterna } from '../../services/apriDocumento';
import {
  documentoDaInviare,
  type DocumentoPreventivo,
} from '../../services/documentoPreventivo';
import {
  dimensioneSulTelefono,
  DIMENSIONE_MASSIMA,
  eImmagine,
  FileTroppoGrande,
  percorsoLocale,
  rimuoviCopiaFirmata,
  salvaCopiaFirmata,
  tipoAmmesso,
  type FileScelto,
} from '../../services/firmatiService';
import { avviso, conferma } from '../../utils/dialoghi';
import { formattaData, formattaDimensione } from '../../utils/formato';
import { FoglioInBasso } from '../ui/FoglioInBasso';
import { VisualizzatoreDocumento } from '../ui/VisualizzatoreDocumento';
import { styles } from './CopiaFirmata.styles';

type NomeIcona = ComponentProps<typeof Feather>['name'];

interface Props {
  preventivo: PreventivoConCliente;
  // Da chiamare dopo ogni modifica: la schermata rilegge il preventivo
  // (cambiano anche lo stato e i dati della copia)
  onCambiato: () => void;
}

// Riquadro "Copia firmata" nel dettaglio del preventivo.
// Senza copia: spiega cosa fare e offre il pulsante per caricarla.
// Con la copia: anteprima, data, e i pulsanti Apri / Sostituisci / Rimuovi.
export function CopiaFirmata({ preventivo, onCambiato }: Props) {
  const t = useTema();
  const [sceltaAperta, setSceltaAperta] = useState(false);
  const [occupato, setOccupato] = useState(false);
  const [anteprima, setAnteprima] = useState<string | null>(null);
  const [peso, setPeso] = useState<number | null>(null);
  // Documento aperto nel visualizzatore interno (solo iPhone)
  const [aperto, setAperto] = useState<DocumentoPreventivo | null>(null);

  const { firmato_file, firmato_tipo, firmato_at } = preventivo;
  const daCaricare = preventivo.firmato_da_caricare === 1;
  const foto = eImmagine(firmato_tipo);

  // Peso e anteprima della foto, solo se il file è già sul telefono:
  // non scarichiamo niente finché non si tocca "Apri"
  useEffect(() => {
    let attivo = true;
    setAnteprima(null);
    setPeso(null);
    if (firmato_file) {
      dimensioneSulTelefono(firmato_file)
        .then((byte) => {
          if (!attivo || byte === null) return;
          setPeso(byte);
          if (foto) setAnteprima(percorsoLocale(firmato_file));
        })
        .catch(() => undefined);
    }
    return () => {
      attivo = false;
    };
  }, [firmato_file, foto]);

  // --- Scelta del file ---

  // Chiude il foglio e aspetta che l'animazione finisca: su iPhone la
  // galleria o la fotocamera aperte mentre il foglio si sta ancora
  // chiudendo a volte non compaiono
  const chiudiScelta = async () => {
    setSceltaAperta(false);
    await new Promise((fatto) => setTimeout(fatto, 400));
  };

  const usaFile = async (file: FileScelto) => {
    if (!tipoAmmesso(file)) {
      avviso('File non valido', 'Puoi caricare un PDF oppure una foto.');
      return;
    }
    // Le foto si controllano dopo l'ottimizzazione, che le riduce molto:
    // qui si fermano subito solo i PDF troppo grandi
    if (
      !eImmagine(file.mimeType) &&
      file.size &&
      file.size > DIMENSIONE_MASSIMA
    ) {
      avvisaTroppoGrande();
      return;
    }
    try {
      setOccupato(true);
      await salvaCopiaFirmata(preventivo.id, file);
      onCambiato();
    } catch (err) {
      if (err instanceof FileTroppoGrande) {
        avvisaTroppoGrande();
        return;
      }
      console.error(err);
      avviso('Errore', 'Impossibile salvare la copia firmata.');
    } finally {
      setOccupato(false);
    }
  };

  const avvisaTroppoGrande = () =>
    avviso(
      'File troppo grande',
      'Il file supera i 10 MB. Chiedi al cliente di rimandarlo più leggero, oppure fotografa il foglio firmato.'
    );

  const scegliDocumento = async () => {
    await chiudiScelta();
    try {
      const r = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        // Android: niente copia in cache, si riceve il file originale
        // (indirizzo content://), che si può sempre leggere.
        // La copia in cache in Expo Go finisce in una cartella che l'app
        // non ha il permesso di leggere ("isn't readable"); il file lo
        // copiamo comunque noi nella nostra cartella (firmatiService).
        // iOS: serve la copia, l'originale è leggibile solo per un attimo.
        copyToCacheDirectory: Platform.OS !== 'android',
      });
      if (r.canceled) return;
      const f = r.assets[0];
      await usaFile({ uri: f.uri, mimeType: f.mimeType, size: f.size });
    } catch (err) {
      console.error(err);
      avviso('Errore', 'Impossibile aprire i file del telefono.');
    }
  };

  const scegliFoto = async (daFotocamera: boolean) => {
    await chiudiScelta();
    try {
      if (daFotocamera) {
        const permesso = await ImagePicker.requestCameraPermissionsAsync();
        if (!permesso.granted) {
          avviso(
            'Fotocamera non disponibile',
            'Per scattare la foto serve il permesso della fotocamera: puoi darlo dalle impostazioni del telefono.'
          );
          return;
        }
      }
      const opzioni: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        // Nessuna compressione qui: la fa una volta sola l'ottimizzazione
        // (firmatiService), che ridimensiona e comprime insieme
        quality: 1,
      };
      const r = daFotocamera
        ? await ImagePicker.launchCameraAsync(opzioni)
        : await ImagePicker.launchImageLibraryAsync(opzioni);
      if (r.canceled) return;
      const f = r.assets[0];
      await usaFile({
        uri: f.uri,
        mimeType: f.mimeType ?? 'image/jpeg',
        size: f.fileSize,
      });
    } catch (err) {
      console.error(err);
      avviso(
        'Errore',
        daFotocamera
          ? 'Impossibile aprire la fotocamera.'
          : 'Impossibile aprire la galleria.'
      );
    }
  };

  // --- Azioni sulla copia già caricata ---

  // Apre la copia firmata per guardarla: su Android con il lettore del
  // telefono, su iPhone dentro l'app. Il file ha un nome leggibile
  // (preventivo-2026-004-firmato.pdf), non quello interno.
  const apri = async () => {
    try {
      setOccupato(true);
      const doc = await documentoDaInviare(preventivo);
      if (Platform.OS === 'android') await apriConAppEsterna(doc);
      else setAperto(doc);
    } catch (err) {
      console.error(err);
      avviso(
        'Impossibile aprire la copia',
        'Se è stata caricata da un altro dispositivo serve la connessione per scaricarla.'
      );
    } finally {
      setOccupato(false);
    }
  };

  const rimuovi = async () => {
    const ok = await conferma(
      'Rimuovere la copia firmata?',
      'Il file verrà tolto da questo preventivo su tutti i dispositivi. Lo stato del preventivo non cambia.',
      'Rimuovi',
      true
    );
    if (!ok) return;
    try {
      setOccupato(true);
      await rimuoviCopiaFirmata(preventivo.id);
      onCambiato();
    } catch (err) {
      console.error(err);
      avviso('Errore', 'Impossibile rimuovere la copia firmata.');
    } finally {
      setOccupato(false);
    }
  };

  return (
    <>
      <View
        style={[styles.card, { backgroundColor: t.card, borderColor: t.bordo }]}
      >
        {firmato_file ? (
          <>
            <View style={styles.riga}>
              {anteprima ? (
                <Image
                  source={{ uri: anteprima }}
                  style={[styles.anteprima, { backgroundColor: t.riquadro }]}
                  resizeMode="cover"
                  accessibilityLabel="Anteprima della copia firmata"
                />
              ) : (
                <View
                  style={[styles.anteprima, { backgroundColor: t.riquadro }]}
                >
                  <Feather
                    name={foto ? 'image' : 'file-text'}
                    size={24}
                    color={t.testo}
                  />
                </View>
              )}
              <View style={styles.testi}>
                <View style={styles.titoloRiga}>
                  <Feather name="check-circle" size={16} color={t.successo} />
                  <Text style={[styles.titolo, { color: t.testo }]}>
                    Preventivo firmato
                  </Text>
                </View>
                <Text style={[styles.sotto, { color: t.testoSecondario }]}>
                  {foto ? 'Foto' : 'PDF'}
                  {peso !== null ? ` · ${formattaDimensione(peso)}` : ''}
                  {firmato_at
                    ? `, caricato il ${formattaData(firmato_at)}`
                    : ''}
                </Text>
                {daCaricare && (
                  <Text style={[styles.sotto, { color: t.accento }]}>
                    In attesa di sincronizzazione
                  </Text>
                )}
              </View>
              {occupato && <ActivityIndicator color={t.ottone} />}
            </View>

            <View style={styles.azioni}>
              <Azione
                t={t}
                icona="external-link"
                testo="Apri"
                onPress={apri}
                disabilitata={occupato}
              />
              <Azione
                t={t}
                icona="refresh-cw"
                testo="Sostituisci"
                onPress={() => setSceltaAperta(true)}
                disabilitata={occupato}
              />
              <Azione
                t={t}
                icona="trash-2"
                testo="Rimuovi"
                colore={t.pericolo}
                onPress={rimuovi}
                disabilitata={occupato}
              />
            </View>
          </>
        ) : (
          <>
            <View style={styles.riga}>
              <View style={[styles.icona, { backgroundColor: t.riquadro }]}>
                <Feather name="pen-tool" size={20} color={t.testo} />
              </View>
              <Text style={[styles.spiegazione, { color: t.testoSecondario }]}>
                Il cliente ti ha rimandato il preventivo firmato? Caricalo qui:
                il preventivo diventa Accettato.
              </Text>
            </View>
            <Pressable
              onPress={() => setSceltaAperta(true)}
              disabled={occupato}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.carica,
                { borderColor: t.accento },
                occupato && styles.disabilitato,
                pressed && styles.premuto,
              ]}
            >
              {occupato ? (
                <ActivityIndicator color={t.accento} />
              ) : (
                <>
                  <Feather name="upload" size={18} color={t.accento} />
                  <Text style={[styles.caricaTesto, { color: t.accento }]}>
                    Carica copia firmata
                  </Text>
                </>
              )}
            </Pressable>
          </>
        )}
      </View>

      <VisualizzatoreDocumento
        documento={aperto}
        onChiudi={() => setAperto(null)}
      />

      <FoglioInBasso
        visibile={sceltaAperta}
        titolo={
          firmato_file ? 'Sostituisci la copia' : 'Carica la copia firmata'
        }
        onChiudi={() => setSceltaAperta(false)}
      >
        <View style={styles.opzioni}>
          <Opzione
            t={t}
            icona="file"
            titolo="Scegli un file"
            sotto="Il PDF firmato, ad esempio salvato da WhatsApp o dall'email"
            onPress={scegliDocumento}
          />
          <Opzione
            t={t}
            icona="image"
            titolo="Foto dalla galleria"
            sotto="La foto del foglio firmato che ti ha mandato il cliente"
            onPress={() => scegliFoto(false)}
          />
          <Opzione
            t={t}
            icona="camera"
            titolo="Scatta una foto"
            sotto="Fotografa il foglio firmato che hai in mano"
            onPress={() => scegliFoto(true)}
          />
        </View>
      </FoglioInBasso>
    </>
  );
}

function Azione({
  t,
  icona,
  testo,
  colore,
  onPress,
  disabilitata,
}: {
  t: Tema;
  icona: NomeIcona;
  testo: string;
  colore?: string;
  onPress: () => void;
  disabilitata: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabilitata}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.azione,
        { backgroundColor: t.riquadro },
        disabilitata && styles.disabilitato,
        pressed && styles.premuto,
      ]}
    >
      <Feather name={icona} size={16} color={colore ?? t.testo} />
      <Text style={[styles.azioneTesto, { color: colore ?? t.testo }]}>
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
        <Text style={[styles.titolo, { color: t.testo }]}>{titolo}</Text>
        <Text style={[styles.sotto, { color: t.testoSecondario }]}>
          {sotto}
        </Text>
      </View>
      <Feather name="chevron-right" size={20} color={t.testoSecondario} />
    </Pressable>
  );
}
