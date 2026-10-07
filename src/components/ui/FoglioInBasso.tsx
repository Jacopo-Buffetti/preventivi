import { Feather } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type DimensionValue,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FONT, useTema } from '../../constants/tema';

// Cornice comune ai fogli che salgono dal basso (nuova voce, scelta del
// cliente): sfondo scuro che chiude al tocco, maniglia, titolo, X.
// Il contenuto lo decide chi lo usa.
export function FoglioInBasso({
  visibile,
  titolo,
  onChiudi,
  altezzaMassima = '90%',
  children,
}: {
  visibile: boolean;
  titolo: string;
  onChiudi: () => void;
  altezzaMassima?: DimensionValue;
  children: ReactNode;
}) {
  const t = useTema();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visibile}
      transparent
      animationType="slide"
      onRequestClose={onChiudi}
    >
      <KeyboardAvoidingView
        style={styles.contenitore}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Tocco sullo sfondo scuro: chiude il foglio */}
        <Pressable
          style={[StyleSheet.absoluteFill, { backgroundColor: t.overlay }]}
          onPress={onChiudi}
          accessibilityLabel="Chiudi"
        />

        <View
          style={[
            styles.foglio,
            {
              backgroundColor: t.card,
              paddingBottom: insets.bottom + 16,
              maxHeight: altezzaMassima,
            },
          ]}
        >
          <View style={[styles.maniglia, { backgroundColor: t.bordo }]} />
          <View style={styles.testa}>
            <Text
              style={[styles.titolo, { color: t.testo }]}
              accessibilityRole="header"
            >
              {titolo}
            </Text>
            <Pressable
              onPress={onChiudi}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Chiudi"
              style={({ pressed }) => [
                styles.chiudi,
                { backgroundColor: t.riquadro },
                pressed && { opacity: 0.8 },
              ]}
            >
              <Feather name="x" size={20} color={t.testo} />
            </Pressable>
          </View>
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  contenitore: { flex: 1, justifyContent: 'flex-end' },
  foglio: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 10,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  maniglia: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  testa: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titolo: { fontSize: 20, fontFamily: FONT.pieno, flexShrink: 1 },
  chiudi: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
