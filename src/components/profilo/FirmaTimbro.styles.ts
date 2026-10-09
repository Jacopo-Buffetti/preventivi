import { StyleSheet } from 'react-native';
import { FONT } from '../../constants/tema';

// Colori fissi dell'anteprima: è un pezzo di foglio, non segue il tema.
// Gli stessi del PDF (vedi stilePreventivo.ts).
const CARTA = {
  sfondo: '#FFFFFF',
  blu: '#071522',
  grigio: '#66717D',
};

export const styles = StyleSheet.create({
  contenitore: { marginTop: 8, marginBottom: 20, gap: 10 },
  titolo: { fontSize: 15, fontFamily: FONT.grassetto },
  spiegazione: { fontSize: 13, lineHeight: 18, fontFamily: FONT.regolare },

  affiancati: { flexDirection: 'row', gap: 12 },
  card: { flex: 1, borderRadius: 16, borderWidth: 1, padding: 12, gap: 8 },
  etichetta: { fontSize: 13, fontFamily: FONT.grassetto },
  miniatura: {
    height: 80,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: CARTA.sfondo,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  miniaturaImmagine: { width: '90%', height: '90%' },
  pulsante: {
    height: 38,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  pulsanteTesto: { fontSize: 13, fontFamily: FONT.grassetto },

  // Anteprima dello spazio firma del PDF
  anteprima: { borderRadius: 16, borderWidth: 1, padding: 12, gap: 8 },
  foglio: {
    backgroundColor: CARTA.sfondo,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 12,
  },
  foglioTitolo: {
    color: CARTA.blu,
    fontSize: 11,
    fontWeight: '800',
  },
  spazioFirma: { height: 76, position: 'relative' },
  timbro: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: -6,
    width: 120,
    height: 76,
    opacity: 0.9,
    mixBlendMode: 'multiply',
  },
  // "multiply" (anche sul timbro): il bianco dell'immagine diventa
  // trasparente, come nel PDF
  firma: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: -10,
    width: 170,
    height: 56,
    mixBlendMode: 'multiply',
  },
  linea: { height: 1, backgroundColor: CARTA.blu },
  didascalia: { color: CARTA.grigio, fontSize: 9, marginTop: 6 },

  opzioni: { gap: 10 },
  opzione: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  icona: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testi: { flex: 1, minWidth: 0, gap: 3 },
  opzioneTitolo: { fontSize: 15, fontFamily: FONT.grassetto },
  opzioneSotto: { fontSize: 13, lineHeight: 18, fontFamily: FONT.regolare },

  disabilitato: { opacity: 0.5 },
  premuto: { opacity: 0.85, transform: [{ scale: 0.98 }] },
});
