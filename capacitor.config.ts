import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.muhtasim.squadcal',
  appName: 'Squad Calendar',
  webDir: 'build',
  ios: {
    contentInset: 'automatic',
  },
};

export default config;