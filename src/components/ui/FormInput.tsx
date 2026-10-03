import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { useTema } from '../../constants/tema';

interface FormInputProps extends TextInputProps {
  label: string;
}

export function FormInput({ label, style, ...props }: FormInputProps) {
  const t = useTema();
  return (
    <View style={styles.fieldGroup}>
      <Text style={[styles.label, { color: t.testoSecondario }]}>{label.toUpperCase()}</Text>
      <TextInput
        style={[
          styles.input,
          { backgroundColor: t.input, borderColor: t.bordo, color: t.testo },
          style,
        ]}
        placeholderTextColor={t.testoSecondario}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fieldGroup: { marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '800', letterSpacing: 0.4, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
  },
});
