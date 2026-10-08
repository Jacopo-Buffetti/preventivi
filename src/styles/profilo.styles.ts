import { StyleSheet } from 'react-native';
import { FONT } from '../constants/tema';

export const styles = StyleSheet.create({
  contenuto: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 24,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  titolo: {
    fontSize: 30,
    lineHeight: 36,
    fontFamily: FONT.pieno,
    letterSpacing: -0.5,
  },
  sottotitolo: { fontSize: 13, fontFamily: FONT.regolare },

  sezione: { gap: 10 },
  titoloSezione: { fontSize: 16, fontFamily: FONT.pieno },

  card: { borderRadius: 18, borderWidth: 1, overflow: 'hidden' },
  rigaAccount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  iconaRiquadro: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testi: { flex: 1, minWidth: 0, gap: 2 },
  etichetta: { fontSize: 13, fontFamily: FONT.regolare },
  valore: { fontSize: 15, fontFamily: FONT.grassetto },

  rigaSync: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  pallino: { width: 8, height: 8, borderRadius: 4 },
  testoSync: { flex: 1, fontSize: 13, lineHeight: 18, fontFamily: FONT.medio },

  azioni: { flexDirection: 'row', gap: 8, padding: 12, borderTopWidth: 1 },
  azione: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  azioneTesto: { fontSize: 14, fontFamily: FONT.grassetto },

  rigaTema: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },

  disabilitato: { opacity: 0.5 },
  premuto: { opacity: 0.85, transform: [{ scale: 0.98 }] },
});
