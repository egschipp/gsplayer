export default function HomePage() {
  // Minimalistische pagina om Next build te laten slagen; UI valt buiten scope.
  const version = process.env.NEXT_PUBLIC_APP_VERSION ?? 'dev';

  return (
    <main>
      Georgies Spotify Player
      <div style={{ fontSize: 12, opacity: 0.6, marginTop: 8 }}>v{version}</div>
    </main>
  );
}
