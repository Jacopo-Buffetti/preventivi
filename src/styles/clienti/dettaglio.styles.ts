import { StyleSheet } from 'react-native';
import { FONT } from '../../constants/tema';

export const styles = StyleSheet.create({
  container: { flex: 1 },
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  titoloVuoto: { fontSize: 20, fontFamily: FONT.pieno, textAlign: 'center' },
  testoVuoto: {
    fontSize: 14,
    fontFamily: FONT.regolare,
    textAlign: 'center',
    marginTop: 6,
  },
  contorno: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  contornoTesto: { fontSize: 14, fontFamily: FONT.grassetto },

  intestazione: {
    paddingHorizontal: 20,
    paddingBottom: 22,
    gap: 18,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  barra: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  indietro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 44,
    paddingRight: 8,
  },
  indietroTesto: { fontSize: 15, fontFamily: FONT.semi },
  pulsanteIcona: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  identita: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTesto: { fontSize: 20, fontFamily: FONT.pieno },
  identitaTesti: { flex: 1, minWidth: 0, gap: 4 },
  nome: {
    fontSize: 26,
    lineHeight: 31,
    fontFamily: FONT.pieno,
    letterSpacing: -0.4,
  },
  indirizzo: { fontSize: 14, fontFamily: FONT.regolare },

  azioniRapide: { flexDirection: 'row', gap: 8 },
  azioneRapida: {
    flex: 1,
    height: 64,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  azioneRapidaTesto: { fontSize: 12, fontFamily: FONT.grassetto },
  spenta: { opacity: 0.35 },

  corpo: {
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 24,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  sezione: { gap: 10 },
  testaSezione: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titoloSezione: { fontSize: 16, fontFamily: FONT.pieno },
  dettaglioSezione: { fontSize: 13, fontFamily: FONT.grassetto },

  card: { borderRadius: 18, borderWidth: 1, overflow: 'hidden' },
  rigaInfo: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  iconaInfo: { marginTop: 2 },
  testiInfo: { flex: 1, minWidth: 0, gap: 2 },
  etichettaInfo: { fontSize: 12, fontFamily: FONT.semi },
  valoreInfo: { fontSize: 15, fontFamily: FONT.medio },
  mancante: { fontFamily: FONT.regolare, fontStyle: 'italic' },

  rigaPreventivo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  numero: {
    fontSize: 12,
    fontFamily: FONT.pieno,
    fontVariant: ['tabular-nums'],
  },
  oggetto: { fontSize: 15, fontFamily: FONT.grassetto },
  colonnaDestra: { alignItems: 'flex-end', gap: 5 },
  importo: {
    fontSize: 15,
    fontFamily: FONT.grassetto,
    fontVariant: ['tabular-nums'],
  },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  badgeTesto: { fontSize: 11, fontFamily: FONT.grassetto },

  pulsantePrincipale: {
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  pulsantePrincipaleTesto: { fontSize: 16, fontFamily: FONT.pieno },

  elimina: {
    alignSelf: 'center',
    height: 44,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  eliminaTesto: { fontSize: 14, fontFamily: FONT.grassetto },

  premuto: { opacity: 0.85, transform: [{ scale: 0.98 }] },
});
