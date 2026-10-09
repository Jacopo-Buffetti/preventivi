import { Feather } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import { ActivityIndicator, Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { useTema } from '../../constants/tema';
import { condividiDocumento } from '../../services/apriDocumento';
import type { DocumentoPreventivo } from '../../services/documentoPreventivo';
import { avviso } from '../../utils/dialoghi';
import { styles } from './VisualizzatoreDocumento.styles';

interface Props {
  documento: DocumentoPreventivo | null; // null = chiuso
  onChiudi: () => void;
}

// Mostra un PDF o una foto a tutto schermo, dentro l'app.
// Si usa su iPhone, dove la WebView sa leggere i PDF da sola (con zoom e
// scorrimento delle pagine). Su Android i PDF si aprono con il lettore
// del telefono (vedi apriDocumento.ts), perché la WebView non li legge.
export function VisualizzatoreDocumento({ documento, onChiudi }: Props) {
  const t = useTema();
  const insets = useSafeAreaInsets();

  const condividi = async () => {
    if (!documento) return;
    try {
      await condividiDocumento(documento);
    } catch (err) {
      console.error(err);
      avviso('Errore', 'Impossibile condividere il documento.');
    }
  };

  return (
    <Modal
      visible={documento !== null}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onChiudi}
    >
      <View style={[styles.schermata, { backgroundColor: t.sfondo }]}>
        <View
          style={[
            styles.barra,
            {
              paddingTop: insets.top + 8,
              backgroundColor: t.barraTab,
              borderBottomColor: t.bordo,
            },
          ]}
        >
          <Pressable
            onPress={onChiudi}
            hitSlop={8}
            accessibilityRole="button"
            style={styles.laterale}
          >
            <Text style={[styles.chiudi, { color: t.accento }]}>Chiudi</Text>
          </Pressable>
          <Text
            style={[styles.titolo, { color: t.testo }]}
            numberOfLines={1}
            accessibilityRole="header"
          >
            {documento?.nomeFile ?? ''}
          </Text>
          <Pressable
            onPress={condividi}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Condividi"
            style={[styles.laterale, styles.destra]}
          >
            <Feather name="share" size={20} color={t.accento} />
          </Pressable>
        </View>

        {documento && (
          <WebView
            source={{ uri: documento.uri }}
            style={styles.contenuto}
            originWhitelist={['*']}
            // Il file sta nella cache dell'app: la WebView deve poterla leggere
            allowingReadAccessToURL={FileSystem.cacheDirectory ?? undefined}
            allowFileAccess
            startInLoadingState
            renderLoading={() => (
              <View style={[styles.caricamento, { backgroundColor: t.sfondo }]}>
                <ActivityIndicator color={t.ottone} size="large" />
              </View>
            )}
          />
        )}
      </View>
    </Modal>
  );
}
