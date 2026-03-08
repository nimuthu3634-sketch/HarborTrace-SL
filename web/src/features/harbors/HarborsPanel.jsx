import { collection, onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { db } from '../../lib/firebase';

export default function HarborsPanel() {
  const [harbors, setHarbors] = useState([]);

  useEffect(() => onSnapshot(collection(db, 'harbors'), (snap) => setHarbors(snap.docs.map((d) => ({ id: d.id, ...d.data() })))), []);

  return <ul>{harbors.map((h) => <li key={h.id}>{h.name} ({h.district})</li>)}</ul>;
}
