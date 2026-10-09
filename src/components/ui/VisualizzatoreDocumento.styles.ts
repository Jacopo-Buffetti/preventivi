import { StyleSheet } from 'react-native';
import { FONT } from '../../constants/tema';

export const styles = StyleSheet.create({
  schermata: { flex: 1 },
  barra: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  laterale: { width: 72, height: 44, justifyContent: 'center' },
  destra: { alignItems: 'flex-end' },
  chiudi: { fontSize: 16, fontFamily: FONT.grassetto },
  titolo: {
    flex: 1,
    textAlign: 'center',
    fontSize: 15,
    fontFamily: FONT.grassetto,
  },
  contenuto: { flex: 1 },
  caricamento: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
