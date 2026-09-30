import { Alert, Platform } from 'react-native';

// Alert di React Native sul web non fa nulla (react-native-web non lo implementa).
// Queste funzioni usano Alert su Android/iOS e le finestre del browser sul web.

export function avviso(titolo: string, messaggio?: string): void {
  if (Platform.OS === 'web') {
    window.alert(messaggio ? `${titolo}\n\n${messaggio}` : titolo);
    return;
  }
  Alert.alert(titolo, messaggio);
}

export function conferma(
  titolo: string,
  messaggio: string,
  etichettaConferma = 'Conferma',
  distruttiva = false
): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(window.confirm(`${titolo}\n\n${messaggio}`));
  }
  return new Promise((resolve) => {
    Alert.alert(
      titolo,
      messaggio,
      [
        { text: 'Annulla', style: 'cancel', onPress: () => resolve(false) },
        {
          text: etichettaConferma,
          style: distruttiva ? 'destructive' : 'default',
          onPress: () => resolve(true),
        },
      ],
      { cancelable: true, onDismiss: () => resolve(false) }
    );
  });
}
