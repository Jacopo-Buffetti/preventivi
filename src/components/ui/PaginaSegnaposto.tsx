import { Link, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTema } from '../../constants/tema';

interface PaginaSegnapostoProps {
  titolo: string;
  descrizione: string;
  azione?: { etichetta: string; href: Href };
}

// Pagina provvisoria per le sezioni non ancora sviluppate
export function PaginaSegnaposto({ titolo, descrizione, azione }: PaginaSegnapostoProps) {
  const t = useTema();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: t.sfondo, paddingTop: insets.top + 24 }]}>
      <View style={styles.colonna}>
        <Text style={[styles.title, { color: t.testo }]}>{titolo}</Text>
        <Text style={[styles.subtitle, { color: t.testoSecondario }]}>{descrizione}</Text>

        {azione && (
          <Link href={azione.href} asChild>
            <Pressable
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: t.bottonePrimario },
                pressed && styles.buttonPressed,
              ]}
              accessibilityRole="link"
            >
              <Text style={styles.buttonText}>{azione.etichetta}</Text>
            </Pressable>
          </Link>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },
  colonna: { width: '100%', maxWidth: 720, alignSelf: 'center' },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 8 },
  subtitle: { fontSize: 16 },
  button: { padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 24 },
  buttonPressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
