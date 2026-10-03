import { StyleSheet, Text, View } from 'react-native';
import { ProfiloForm } from '../../components/profilo/ProfiloForm';

export default function ProfiloScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profilo Personale</Text>
      <ProfiloForm />
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
    marginBottom: 20,
  },
});
