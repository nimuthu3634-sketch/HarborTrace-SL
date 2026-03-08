import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { db } from '../../lib/firebase';

export default function AuditPanel() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const q = query(collection(db, 'auditLogs'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => setLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
  }, []);

  return <ul>{logs.slice(0, 20).map((log) => <li key={log.id}>{log.action} - {log.targetType}</li>)}</ul>;
}
