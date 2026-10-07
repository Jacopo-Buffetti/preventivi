import {
  ActivityIndicator,
  Pressable,
  PressableProps,
  StyleSheet,
  Text,
} from 'react-native';
import { useTema } from '../../constants/tema';

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
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <Text style={styles.text}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  disabled: { opacity: 0.6 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  text: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
