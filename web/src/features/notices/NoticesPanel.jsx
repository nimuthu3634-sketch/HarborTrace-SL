import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { db } from '../../lib/firebase';

export default function NoticesPanel() {
  const [notices, setNotices] = useState([]);

  useEffect(() => {
    const q = query(collection(db, 'notices'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => setNotices(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))));
  }, []);

  return <ul>{notices.slice(0, 8).map((n) => <li key={n.id}>{n.title}</li>)}</ul>;
}
