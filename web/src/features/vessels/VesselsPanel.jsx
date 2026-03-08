import { collection, onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { db } from '../../lib/firebase';

export default function VesselsPanel() {
  const [vessels, setVessels] = useState([]);

  useEffect(() => onSnapshot(collection(db, 'vessels'), (snap) => setVessels(snap.docs.map((d) => ({ id: d.id, ...d.data() })))), []);

  return <ul>{vessels.slice(0, 8).map((v) => <li key={v.id}>{v.registrationNo} - {v.name}</li>)}</ul>;
}
