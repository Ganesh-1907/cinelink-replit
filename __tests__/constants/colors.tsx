export const COLORS = {
  primary: '#CF9F5A',
  primaryLight: '#E8CEAA',
  primaryDark: '#9C6E35',
  secondary: '#111216',
  secondaryLight: '#16171D',
  secondaryDark: '#090A0C',
  background: '#090A0C',
  surface: '#111216',
  surfaceLight: '#16171D',
  textPrimary: '#F7F8FA',
  textSecondary: '#9AA2AC',
  textTertiary: '#5C646E',
  border: '#1E2028',
  borderLight: '#262933',
  transparent: 'transparent',
  white: '#FFFFFF',
  black: '#000000',
  shadow: 'rgba(0, 0, 0, 0.3)',
};

export default COLORS;

describe('COLORS constant', () => {
  it('has primary and background defined', () => {
    expect(COLORS.primary).toBe('#CF9F5A');
    expect(COLORS.background).toBe('#090A0C');
  });
});