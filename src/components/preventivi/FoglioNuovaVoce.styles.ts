import { StyleSheet } from 'react-native';
import { FONT } from '../../constants/tema';

export const styles = StyleSheet.create({
  etichetta: {
    fontSize: 13,
    fontFamily: FONT.grassetto,
    marginTop: 14,
    marginBottom: 6,
  },
  chips: { gap: 8, paddingVertical: 2 },
  chip: {
    height: 36,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  chipTesto: { fontSize: 13 },
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
  colonnaStretta: { flex: 2 },
  colonnaLarga: { flex: 3 },
  subtotale: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
  },
  subtotaleEtichetta: { fontSize: 14, fontFamily: FONT.semi },
  subtotaleValore: {
    fontSize: 18,
    fontFamily: FONT.pieno,
    fontVariant: ['tabular-nums'],
  },
  bottone: {
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  bottoneTesto: { fontSize: 16, fontFamily: FONT.pieno },
  disabilitato: { opacity: 0.45 },
  premuto: { opacity: 0.85, transform: [{ scale: 0.98 }] },
});
