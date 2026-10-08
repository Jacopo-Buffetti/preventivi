import {
  ActivityIndicator,
  Pressable,
  PressableProps,
  Text,
} from 'react-native';
import { useTema } from '../../constants/tema';
import { styles } from './PrimaryButton.styles';

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
