import { definePreset } from '@primeuix/themes';
import Lara from '@primeuix/themes/lara';

export const JAMBAAR_PRESET = definePreset(Lara, {
  semantic: {
    primary: {
      50: '#fff7ed',
      100: '#ffedd5',
      200: '#fed7aa',
      300: '#fdba74',
      400: '#ff9b6d',
      500: '#f4774f',
      600: '#dc5d38',
      700: '#b7472c',
      800: '#923c29',
      900: '#793528',
      950: '#401a15',
    },
    colorScheme: {
      light: {
        surface: {
          0: '#ffffff',
          50: '#fafafa',
          100: '#f5f7fb',
          200: '#e3e8f0',
          900: '#172033',
          950: '#111a2e',
        },
      },
    },
  },
  components: {
    button: {
      root: {
        borderRadius: '0.5rem',
      },
    },
    inputtext: {
      root: {
        borderRadius: '0.5rem',
      },
    },
  },
});
