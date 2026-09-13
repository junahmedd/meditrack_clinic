// @ts-ignore
import { CapacitorConfig } from '@capacitor/cli';

const config: any = {
  appId: 'com.meditrack.saas',
  appName: 'MediTrack',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#070d18",
      androidSplashResourceName: "splash",
      showSpinner: false
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#070d18"
    }
  }
};

export default config;
