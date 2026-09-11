import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.arenax.esports',
  appName: 'ArenaX Esports',
  webDir: 'dist',
  server: {
    url: 'https://arenax.cyou',
    cleartext: true
  }
};

export default config;
