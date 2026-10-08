import { Link, type Href } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTema } from '../../constants/tema';
import { styles } from './PaginaSegnaposto.styles';

interface PaginaSegnapostoProps {
  titolo: string;
  descrizione: string;
  azione?: { etichetta: string; href: Href };
}

// Pagina provvisoria per le sezioni non ancora sviluppate
export function PaginaSegnaposto({
  titolo,
  descrizione,
  azione,
}: PaginaSegnapostoProps) {
  const t = useTema();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: t.sfondo, paddingTop: insets.top + 24 },
      ]}
    >
      <View style={styles.colonna}>
        <Text style={[styles.title, { color: t.testo }]}>{titolo}</Text>
        <Text style={[styles.subtitle, { color: t.testoSecondario }]}>
          {descrizione}
        </Text>

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
