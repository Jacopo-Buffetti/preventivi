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

  titoli: { gap: 6 },
  numero: {
    fontSize: 14,
    fontFamily: FONT.grassetto,
    fontVariant: ['tabular-nums'],
  },
  oggetto: {
    fontSize: 30,
    lineHeight: 36,
    fontFamily: FONT.pieno,
    letterSpacing: -0.5,
  },
  data: { fontSize: 14, fontFamily: FONT.regolare },
  blocco: { gap: 4 },
  totaleGrande: {
    fontSize: 38,
    lineHeight: 44,
    fontFamily: FONT.pieno,
    fontVariant: ['tabular-nums'],
  },

  selettore: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: 14 },
  opzioneStato: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  opzioneStatoTesto: { fontSize: 12 },

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
  linkSezione: { fontSize: 14, fontFamily: FONT.grassetto, paddingVertical: 4 },

  card: { borderRadius: 18, borderWidth: 1, overflow: 'hidden' },
  cardCliente: { padding: 16, gap: 14 },
  cardNote: { padding: 16 },
  clienteNome: { fontSize: 17, fontFamily: FONT.grassetto },
  sottoRiga: { fontSize: 13, fontFamily: FONT.regolare },
  contatti: { flexDirection: 'row', gap: 8 },
  contatto: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  contattoTesto: { fontSize: 13, fontFamily: FONT.grassetto },

  voce: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  voceTesti: { flex: 1, gap: 3 },
  voceDescrizione: { fontSize: 15, fontFamily: FONT.grassetto },
  voceTotale: {
    fontSize: 15,
    fontFamily: FONT.grassetto,
    fontVariant: ['tabular-nums'],
  },
  nessunaVoce: { padding: 16, borderBottomWidth: 1 },
  cifre: { fontVariant: ['tabular-nums'] },

  totali: { paddingVertical: 14, paddingHorizontal: 16, gap: 8 },
  rigaTotale: { flexDirection: 'row', justifyContent: 'space-between' },
  rigaTesto: { fontSize: 14, fontFamily: FONT.regolare },
  rigaTotaleFinale: { borderTopWidth: 1, paddingTop: 10, marginTop: 2 },
  totaleEtichetta: { fontSize: 17, fontFamily: FONT.pieno },

  note: { fontSize: 14, lineHeight: 21, fontFamily: FONT.regolare },

  elimina: {
    alignSelf: 'center',
    height: 44,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  eliminaTesto: { fontSize: 14, fontFamily: FONT.grassetto },

  pulsanteContorno: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    justifyContent: 'center',
  },
  pulsanteContornoTesto: { fontSize: 14, fontFamily: FONT.grassetto },

  barraAzioni: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 10,
    borderTopWidth: 1,
  },
  notaFirmato: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  notaFirmatoTesto: { fontSize: 12, fontFamily: FONT.semi },
  azionePrincipale: {
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  azionePrincipaleTesto: { fontSize: 16, fontFamily: FONT.pieno },
  // Tre pulsanti affiancati: icona e testo stanno stretti, quindi
  // margini ridotti e testo un po' più piccolo
  azioniSecondarie: { flexDirection: 'row', gap: 8 },
  azioneSecondaria: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  azioneSecondariaTesto: { fontSize: 13, fontFamily: FONT.grassetto },

  disabilitato: { opacity: 0.6 },
  premuto: { opacity: 0.85, transform: [{ scale: 0.98 }] },
});
