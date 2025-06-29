import '../styles/globals.css';
import '../../styles.css';
import '../../mobile-navigation.css';
import '../../mobile-optimizations.css';

import type { AppProps } from 'next/app';

export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
