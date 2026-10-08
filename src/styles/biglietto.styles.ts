import { StyleSheet } from 'react-native';
import { FONT } from '../constants/tema';

export const styles = StyleSheet.create({
  container: { flex: 1 },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  contenuto: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 24,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },

  testa: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  testaTesti: { flex: 1, gap: 2 },
  titolo: {
    fontSize: 30,
    lineHeight: 36,
    fontFamily: FONT.pieno,
    letterSpacing: -0.5,
  },
  sottotitolo: { fontSize: 13, fontFamily: FONT.regolare },
  salva: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginTop: 2,
    minWidth: 96,
    justifyContent: 'center',
  },
  salvaTesto: { fontSize: 14, fontFamily: FONT.grassetto },

  selettore: {
    flexDirection: 'row',
    alignSelf: 'center',
    padding: 4,
    borderRadius: 14,
    gap: 4,
    marginBottom: -8,
  },
  selettoreVoce: {
    height: 36,
    paddingHorizontal: 22,
    borderRadius: 10,
    justifyContent: 'center',
  },
  selettoreTesto: { fontSize: 14 },

  anteprima: { alignItems: 'center', gap: 10 },
  // Ombra leggera: il biglietto deve sembrare un oggetto di carta
  ombra: { borderRadius: 12, boxShadow: '0px 10px 24px rgba(7, 21, 34, 0.25)' },
  suggerimento: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  suggerimentoTesto: { fontSize: 12, fontFamily: FONT.regolare },

  sezione: { gap: 10 },
  testaSezione: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titoloSezione: { fontSize: 16, fontFamily: FONT.pieno },
  linkSezione: { fontSize: 14, fontFamily: FONT.grassetto, paddingVertical: 4 },
  obbligatori: {
    fontSize: 12,
    fontFamily: FONT.regolare,
    marginTop: -4,
    marginBottom: 2,
  },

  card: { borderRadius: 18, borderWidth: 1 },
  cardLogo: {
    flexDirection: 'row',
    gap: 14,
    padding: 14,
    alignItems: 'center',
  },
  miniatura: {
    width: 72,
    height: 72,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  miniaturaImmagine: { width: 64, height: 64 },
  logoTesti: { flex: 1, gap: 10 },
  testoCard: { fontSize: 13, lineHeight: 18, fontFamily: FONT.regolare },
  rigaBottoni: { flexDirection: 'row', gap: 8 },
  pulsanteRiquadro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  pulsanteRiquadroTesto: { fontSize: 13, fontFamily: FONT.grassetto },

  affiancati: { flexDirection: 'row', gap: 12 },
  flex: { flex: 1 },

  barraAzioni: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  azionePrincipale: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  azionePrincipaleTesto: { fontSize: 16, fontFamily: FONT.pieno },
  azioneSecondaria: {
    height: 56,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  azioneSecondariaTesto: { fontSize: 14, fontFamily: FONT.grassetto },

  disabilitato: { opacity: 0.5 },
  premuto: { opacity: 0.85, transform: [{ scale: 0.98 }] },
});
