import { Pressable, PressableProps, StyleSheet, Text } from 'react-native';

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
  const isDisabled = disabled || loading;

  return (
    <Pressable
      style={[
        styles.button,
        isDisabled && styles.disabled,
        typeof style === 'function' ? style({ pressed: false }) : style,
      ]}
      disabled={isDisabled}
      {...props}
    >
      <Text style={styles.text}>{loading ? 'Salvataggio...' : title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#2563eb',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  disabled: { backgroundColor: '#93c5fd' },
  text: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
