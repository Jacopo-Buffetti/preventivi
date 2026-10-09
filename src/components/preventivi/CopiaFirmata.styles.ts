import { StyleSheet } from 'react-native';
import { FONT } from '../../constants/tema';

export const styles = StyleSheet.create({
  card: { borderRadius: 18, borderWidth: 1, padding: 16, gap: 14 },
  riga: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  anteprima: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  icona: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testi: { flex: 1, minWidth: 0, gap: 3 },
  titoloRiga: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  titolo: { fontSize: 15, fontFamily: FONT.grassetto },
  sotto: { fontSize: 13, lineHeight: 18, fontFamily: FONT.regolare },
  spiegazione: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FONT.regolare,
  },

  carica: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  caricaTesto: { fontSize: 15, fontFamily: FONT.grassetto },

  azioni: { flexDirection: 'row', gap: 8 },
  azione: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  azioneTesto: { fontSize: 13, fontFamily: FONT.grassetto },

  opzioni: { gap: 10 },
  opzione: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },

  disabilitato: { opacity: 0.5 },
  premuto: { opacity: 0.85, transform: [{ scale: 0.98 }] },
});
