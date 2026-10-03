import { Link, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

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
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{titolo}</Text>
      <Text style={styles.subtitle}>{descrizione}</Text>

      {azione && (
        <Link href={azione.href} asChild>
          <Pressable
            style={({ pressed }) => [
              styles.button,
              pressed && styles.buttonPressed,
            ]}
            accessibilityRole="link"
          >
            <Text style={styles.buttonText}>{azione.etichetta}</Text>
          </Pressable>
        </Link>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 20,
    paddingTop: 50,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
  },
  button: {
    backgroundColor: '#2563eb',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonPressed: { backgroundColor: '#1d4ed8' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
