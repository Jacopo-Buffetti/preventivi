import { Platform, StyleSheet } from 'react-native';

// Colori fissi del biglietto: è un foglio di carta, non segue il tema
export const COLORI = {
  carta: '#FFFFFF',
  bordo: '#CBD5E1',
  separatore: '#E2E8F0',
  testo: '#0F172A',
  testoDettagli: '#334155',
  testoSecondario: '#475569',
  testoLegale: '#64748B',
  oro: '#B45309',
  oroChiaro: '#F59E0B',
};

const MONOSPACE = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

export const styles = StyleSheet.create({
  carta: {
    backgroundColor: COLORI.carta,
    borderWidth: 1,
    borderColor: COLORI.bordo,
    overflow: 'hidden',
    boxShadow: '0px 10px 25px -5px rgba(0, 0, 0, 0.25)',
  },
  barra: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
  },
  barraParte: { flex: 1 },
  flex: { flex: 1 },

  logoVuoto: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORI.bordo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoVuotoTesto: {
    color: COLORI.testoLegale,
    fontWeight: '700',
    letterSpacing: 1,
  },

  fronte: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sottotitoloFronte: {
    color: COLORI.testoSecondario,
    fontWeight: '700',
    textAlign: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORI.separatore,
    width: '85%',
  },

  retro: { flex: 1, justifyContent: 'space-between' },
  retroTesta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: COLORI.separatore,
    gap: 8,
  },
  nome: { color: COLORI.testo, fontWeight: '800' },
  titolo: { color: COLORI.oro, fontWeight: '700' },
  dettagli: { flex: 1, justifyContent: 'center' },
  dettaglio: { flexDirection: 'row', alignItems: 'center' },
  dettaglioTesto: { color: COLORI.testoDettagli, fontWeight: '500', flex: 1 },
  legale: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 6,
  },
  legaleTesto: {
    color: COLORI.testoLegale,
    fontFamily: MONOSPACE,
    fontWeight: '600',
  },
});
