import { StyleSheet } from 'react-native';
import { FONT } from '../../constants/tema';

export const styles = StyleSheet.create({
  container: { flex: 1 },
  contenuto: {
    paddingHorizontal: 24,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  // Il logo dell'app ha già il suo sfondo scuro: basta arrotondare gli
  // angoli, come un'icona
  logo: {
    width: 140,
    height: 140,
    alignSelf: 'center',
    marginBottom: 28,
    borderRadius: 32,
  },
  titolo: {
    fontSize: 30,
    lineHeight: 36,
    fontFamily: FONT.pieno,
    letterSpacing: -0.5,
  },
  sottotitolo: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
    marginBottom: 24,
    fontFamily: FONT.regolare,
  },
  boxErrore: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 8,
  },
  testoErrore: { fontSize: 14, fontFamily: FONT.semi },
});
