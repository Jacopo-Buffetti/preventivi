import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  // Ogni riga è posizionata in alto e spostata con translateY: il suo
  // posto lo decide la lista, non l'ordine nel layout
  riga: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    // Ombra della riga sollevata (l'opacità la anima la lista)
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 14,
    shadowOpacity: 0,
  },
});
