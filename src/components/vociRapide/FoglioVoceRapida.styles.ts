import { StyleSheet } from 'react-native';
import { FONT } from '../../constants/tema';

export const styles = StyleSheet.create({
  etichetta: {
    fontSize: 13,
    fontFamily: FONT.grassetto,
    marginTop: 14,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    minHeight: 48,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: FONT.regolare,
  },
  cifre: { fontVariant: ['tabular-nums'] },
  affiancati: { flexDirection: 'row', gap: 12 },
  colonna: { flex: 1 },
  bottone: {
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  bottoneTesto: { fontSize: 16, fontFamily: FONT.pieno },
  elimina: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  eliminaTesto: { fontSize: 15, fontFamily: FONT.grassetto },
  disabilitato: { opacity: 0.45 },
  premuto: { opacity: 0.85, transform: [{ scale: 0.98 }] },
});
