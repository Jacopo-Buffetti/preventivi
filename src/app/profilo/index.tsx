import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ProfiloForm } from '../../components/profilo/ProfiloForm';
import { useTema } from '../../constants/tema';

export default function ProfiloScreen() {
  const router = useRouter();
  const t = useTema();
  const insets = useSafeAreaInsets();

  const tornaIndietro = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  return (
    <View style={[styles.container, { backgroundColor: t.sfondo }]}>
      <View style={[styles.barra, { paddingTop: insets.top + 12 }]}>
        <Pressable
          onPress={tornaIndietro}
          hitSlop={12}
          accessibilityRole="button"
        >
          <Text style={[styles.indietro, { color: t.testoSecondario }]}>
            ‹ Home
          </Text>
        </Pressable>
        <Text style={[styles.title, { color: t.testo }]}>Profilo Officina</Text>
        <Text style={[styles.sottotitolo, { color: t.testoSecondario }]}>
          Questi dati compaiono sui preventivi e sul biglietto da visita.
        </Text>
      </View>
      <ProfiloForm />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  barra: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  indietro: { fontSize: 15, fontWeight: '600', marginBottom: 12 },
  title: { fontSize: 24, fontWeight: '800', letterSpacing: -0.3 },
  sottotitolo: { fontSize: 14, marginTop: 4 },
});
