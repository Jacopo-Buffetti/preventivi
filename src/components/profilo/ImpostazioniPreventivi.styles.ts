import { StyleSheet } from 'react-native';
import { FONT } from '../../constants/tema';

export const styles = StyleSheet.create({
  card: { borderRadius: 18, borderWidth: 1, overflow: 'hidden' },
  blocco: { padding: 14, gap: 12 },
  separato: { borderTopWidth: 1 },
  riga: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icona: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testi: { flex: 1, minWidth: 0, gap: 2 },
  titolo: { fontSize: 15, fontFamily: FONT.grassetto },
  spiegazione: { fontSize: 13, lineHeight: 18, fontFamily: FONT.regolare },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  nota: {
    flexDirection: 'row',
    gap: 8,
    padding: 10,
    borderRadius: 12,
  },
  notaTesto: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
    fontFamily: FONT.regolare,
  },
});
