import {
  ActivityIndicator,
  Pressable,
  PressableProps,
  StyleSheet,
  Text,
} from 'react-native';
import { FONT, useTema } from '../../constants/tema';

interface PrimaryButtonProps extends PressableProps {
  title: string;
  loading?: boolean;
}

export function PrimaryButton({
  title,
  loading,
  disabled,
  style,
  ...props
}: PrimaryButtonProps) {
  const t = useTema();
  const isDisabled = disabled || loading;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: t.bottonePrimario },
        isDisabled && styles.disabled,
        pressed && styles.pressed,
        typeof style === 'function'
          ? (style as (stato: { pressed: boolean }) => any)({ pressed })
          : style,
      ]}
      disabled={isDisabled}
      accessibilityRole="button"
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={t.testoSuPrimario} />
      ) : (
        <Text style={[styles.text, { color: t.testoSuPrimario }]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  disabled: { opacity: 0.6 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  // Testo blu notte sul pulsante ottone (il bianco sull'ottone si legge male)
  text: { fontSize: 16, fontFamily: FONT.pieno },
});
