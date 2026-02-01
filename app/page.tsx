import packageJson from '../package.json';
import MvpClient from './ui/mvp-client';

export default function HomePage() {
  const version = packageJson.version ?? 'dev';

  return (
    <main style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0 }}>Georgies Spotify Player</h1>
        <div style={{ fontSize: 12, opacity: 0.6, marginTop: 6 }}>v{version}</div>
      </header>
      <MvpClient />
    </main>
  );
}
