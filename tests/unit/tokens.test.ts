import { colors } from '@theme/colors';
import { spacing } from '@theme/spacing';

describe('theme tokens', () => {
  it('exposes expected color palette keys', () => {
    expect(colors).toEqual({
      background: '#F6F6F0',
      surface: '#FFFFFF',
      text: '#162521',
      muted: '#5A6461',
      border: '#D9DDD7',
      primary: '#1D6E5C',
    });
  });

  it('exposes expected spacing scale', () => {
    expect(spacing).toEqual({
      xs: 4,
      sm: 8,
      md: 12,
      lg: 20,
      xl: 28,
    });
  });
});
