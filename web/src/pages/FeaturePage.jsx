import { useEffect } from 'react';

export default function FeaturePage({ title, children }) {
  useEffect(() => {
    document.title = `HarborTrace SL | ${title}`;
  }, [title]);

  return (
    <section className="card">
      <h2>{title}</h2>
      {children}
    </section>
  );
}
