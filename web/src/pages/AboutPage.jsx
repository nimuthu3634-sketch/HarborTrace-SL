import { useEffect } from 'react';

export default function AboutPage() {
  useEffect(() => {
    document.title = 'HarborTrace SL | About';
  }, []);

  return (
    <section className="card about-page">
      <h2>About HarborTrace SL</h2>
      <p>
        HarborTrace SL is a fisheries operations and seafood traceability platform designed for Sri Lankan harbor ecosystems.
        It connects fishers, harbor officers, seafood buyers, and administrators in one secure workflow from departure to
        verified batch records.
      </p>

      <h3>Project Purpose</h3>
      <p>
        This system was developed as a university final-year project to demonstrate how digital platforms can strengthen
        fisheries governance, improve safety at sea, and build confidence in seafood supply chains through transparent data.
      </p>

      <h3>How the System Works</h3>
      <ul>
        <li><strong>Voyage Tracking:</strong> Fishers register departures and maintain active trip status linked to harbor operations.</li>
        <li><strong>Incident Reporting:</strong> Safety alerts allow rapid communication of urgent incidents from sea to shore teams.</li>
        <li><strong>Landing Verification:</strong> Harbor officers review landed catch declarations and validate intake records.</li>
        <li><strong>Batch Traceability:</strong> Verified landings are transformed into batch records that buyers can check independently.</li>
        <li><strong>Governance Layer:</strong> Audit logs and analytics help administrators monitor compliance and performance trends.</li>
      </ul>

      <h3>Academic Value</h3>
      <p>
        HarborTrace SL showcases practical use of role-based access control, secure cloud services, real-time data updates,
        and traceability-first interface design. The platform balances technical depth with operational relevance for a real-world
        fisheries context.
      </p>
    </section>
  );
}
