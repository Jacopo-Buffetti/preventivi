import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import { FONT, useTema } from '../../constants/tema';

interface FormInputProps extends TextInputProps {
  label: string;
  // Riga di aiuto sotto il campo (facoltativa)
  aiuto?: string;
}

// Campo di testo con etichetta, usato in tutti i form dell'app
// (preventivo, cliente, profilo, login)
export function FormInput({ label, aiuto, style, ...props }: FormInputProps) {
  const t = useTema();
  return (
    <View style={styles.gruppo}>
      <Text style={[styles.etichetta, { color: t.testoSecondario }]}>
        {label}
      </Text>
      <TextInput
        style={[
          styles.input,
          { backgroundColor: t.input, borderColor: t.bordo, color: t.testo },
          style,
        ]}
        placeholderTextColor={t.testoSecondario}
        accessibilityLabel={label}
        {...props}
      />
      {!!aiuto && (
        <Text style={[styles.aiuto, { color: t.testoSecondario }]}>
          {aiuto}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  gruppo: { marginBottom: 16, gap: 6 },
  etichetta: { fontSize: 13, fontFamily: FONT.grassetto },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    minHeight: 48,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: FONT.regolare,
  },
  aiuto: { fontSize: 12, fontFamily: FONT.regolare },
});
