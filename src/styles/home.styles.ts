import { StyleSheet } from 'react-native';
import { FONT } from '../constants/tema';

export const styles = StyleSheet.create({
  schermata: { flex: 1 },

  intestazione: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 22,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
  },
  arco: { position: 'absolute', borderRadius: 999 },
  arcoGrande: {
    width: 300,
    height: 300,
    top: -130,
    right: -110,
    borderWidth: 1.5,
    opacity: 0.55,
  },
  arcoPiccolo: {
    width: 300,
    height: 300,
    top: -110,
    right: -140,
    borderWidth: 1,
    opacity: 0.25,
  },

  rigaMarchio: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logo: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#FFFFFF' },
  marchioTesti: { flex: 1, gap: 3 },
  nomeAttivita: { fontSize: 15, fontFamily: FONT.grassetto },
  rigaSync: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pallino: { width: 8, height: 8, borderRadius: 4 },
  testoSync: { fontSize: 12, fontFamily: FONT.regolare, flexShrink: 1 },
  pulsanteTema: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  saluto: { gap: 4 },
  data: { fontSize: 14, fontFamily: FONT.regolare },
  titoloSaluto: {
    fontSize: 30,
    lineHeight: 36,
    fontFamily: FONT.pieno,
    letterSpacing: -0.5,
  },

  pulsantePrincipale: {
    height: 60,
    borderRadius: 16,
    paddingLeft: 20,
    paddingRight: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pulsantePrincipaleTesto: { fontSize: 17, fontFamily: FONT.pieno },
  pulsantePiu: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  corpo: {
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 28,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },

  avviso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
  },
  avvisoTesto: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FONT.medio,
  },

  sezione: { gap: 12 },
  testaSezione: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },
  testiSezione: { flexShrink: 1, gap: 2 },
  titoloSezione: { fontSize: 18, fontFamily: FONT.pieno },
  linkSezione: { fontSize: 14, fontFamily: FONT.grassetto, paddingVertical: 4 },

  card: { borderRadius: 18, borderWidth: 1, overflow: 'hidden' },
  rigaBozza: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    paddingLeft: 16,
  },
  riga: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingLeft: 16,
    paddingRight: 14,
  },
  testiRiga: { flex: 1, minWidth: 0, gap: 3 },
  titoloRiga: { fontSize: 15, fontFamily: FONT.grassetto },
  sottoRiga: { fontSize: 13, fontFamily: FONT.regolare },
  attesa: { fontSize: 12 },
  importo: {
    fontSize: 15,
    fontFamily: FONT.grassetto,
    fontVariant: ['tabular-nums'],
  },
  numero: {
    width: 66,
    fontSize: 13,
    fontFamily: FONT.pieno,
    fontVariant: ['tabular-nums'],
  },
  colonnaDestra: { alignItems: 'flex-end', gap: 5 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  badgeTesto: { fontSize: 11, fontFamily: FONT.grassetto },

  iconaRiquadro: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulsanteContorno: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    justifyContent: 'center',
  },
  pulsanteContornoTesto: { fontSize: 14, fontFamily: FONT.grassetto },

  griglia: { flexDirection: 'row' },
  cifra: { flex: 1, padding: 16, gap: 4 },
  cifraValore: {
    fontSize: 26,
    fontFamily: FONT.pieno,
    fontVariant: ['tabular-nums'],
  },
  cifraValorePiccolo: {
    fontSize: 20,
    lineHeight: 31,
    fontFamily: FONT.pieno,
    fontVariant: ['tabular-nums'],
  },
  cifraEtichetta: { fontSize: 12, fontFamily: FONT.regolare },

  vuoto: { padding: 24, alignItems: 'center', gap: 6 },

  premuto: { opacity: 0.85, transform: [{ scale: 0.98 }] },
});
