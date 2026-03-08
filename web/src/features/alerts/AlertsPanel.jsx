import { addDoc, collection, onSnapshot, orderBy, query, serverTimestamp } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { db } from '../../lib/firebase';
import { useAuth } from '../auth/AuthContext';

export default function AlertsPanel() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    const q = query(collection(db, 'alerts'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => setAlerts(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))));
  }, []);

  const sendSos = async () => {
    await addDoc(collection(db, 'alerts'), {
      fishermanUid: user.uid,
      severity: 'critical',
      message: 'Emergency at sea - Immediate support required',
      status: 'open',
      location: { lat: 6.93, lng: 79.85 },
      createdAt: serverTimestamp()
    });
  };

  return (
    <>
      <button onClick={sendSos}>Report maritime incident</button>
      <ul>{alerts.slice(0, 8).map((alert) => <li key={alert.id}>{alert.status} - {alert.message}</li>)}</ul>
    </>
  );
}
