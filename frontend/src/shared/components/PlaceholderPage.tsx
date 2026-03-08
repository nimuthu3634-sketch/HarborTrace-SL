type PlaceholderPageProps = {
  title: string;
};

export function PlaceholderPage({ title }: PlaceholderPageProps) {
  return (
    <main style={{ padding: '1.5rem', fontFamily: 'sans-serif' }}>
      <h1>{title}</h1>
      <p>Base page scaffold ready for feature implementation.</p>
    </main>
  );
}
