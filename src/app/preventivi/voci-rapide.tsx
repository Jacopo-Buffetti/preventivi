import { SchermataVociRapide } from '../../components/vociRapide/SchermataVociRapide';

// Voci rapide aperte da "Gestisci" nel foglio "Aggiungi una voce" del
// preventivo. Sta nella scheda Preventivi, sopra il preventivo in corso:
// tornando indietro lo si ritrova com'era.
export default function VociRapidePreventivoScreen() {
  return <SchermataVociRapide etichettaIndietro="Preventivo" />;
}
