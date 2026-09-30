import { PaginaSegnaposto } from '../../components/ui/PaginaSegnaposto';

export default function ClientiScreen() {
  return (
    <PaginaSegnaposto
      titolo="Clienti"
      descrizione="Qui comparirà la rubrica dei clienti."
      azione={{ etichetta: 'Nuovo cliente', href: '/clienti/nuovo' }}
    />
  );
}
