import { collection, onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { db } from '../../lib/firebase';

export default function AnalyticsPanel() {
  const [cards, setCards] = useState([]);

  useEffect(() => onSnapshot(collection(db, 'analytics'), (snap) => setCards(snap.docs.map((d) => ({ id: d.id, ...d.data() })))), []);

  return <ul>{cards.map((card) => <li key={card.id}>{card.label}: {card.value}</li>)}</ul>;
}
