import type { ButtonProps } from './types';
import { COLORS } from '../constants';

const Button = ({ children, onClick, variant = 'primary', disabled = false }: ButtonProps) => {
  let bg = COLORS.primary;
  let color = COLORS.white;
  let border = 'none';

  if (variant === 'secondary') {
    bg = COLORS.accent;
  } else if (variant === 'outline') {
    bg = 'transparent';
    color = COLORS.primary;
    border = `1px solid ${COLORS.primary}`;
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        backgroundColor: disabled ? COLORS.textLight : bg,
        color: color,
        border: border,
        padding: '10px 20px',
        borderRadius: '6px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: '1rem',
        fontWeight: '500',
        transition: 'all 0.2s',
      }}
    >
      {children}
    </button>
  );
};

export default Button;
