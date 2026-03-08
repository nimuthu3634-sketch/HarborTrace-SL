import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { db } from '../../lib/firebase';

function formatCreatedAt(createdAt) {
  if (!createdAt) return 'Unknown time';
  const value = typeof createdAt?.toDate === 'function' ? createdAt.toDate() : new Date(createdAt);
  if (Number.isNaN(value.getTime())) return 'Unknown time';
  return value.toLocaleString();
}

export default function AuditPanel() {
  const [logs, setLogs] = useState([]);
  const [filters, setFilters] = useState({
    action: 'all',
    actorRole: 'all',
    targetType: 'all',
    queryText: ''
  });

  useEffect(() => {
    const q = query(collection(db, 'auditLogs'), orderBy('createdAt', 'desc'), limit(300));
    return onSnapshot(q, (snap) => setLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
  }, []);

  const options = useMemo(() => {
    const actions = new Set();
    const roles = new Set();
    const targetTypes = new Set();
    logs.forEach((log) => {
      if (log.action) actions.add(log.action);
      if (log.actorRole) roles.add(log.actorRole);
      if (log.targetType) targetTypes.add(log.targetType);
    });
    return {
      actions: [...actions].sort(),
      roles: [...roles].sort(),
      targetTypes: [...targetTypes].sort()
    };
  }, [logs]);

  const filteredLogs = useMemo(() => {
    const q = filters.queryText.trim().toLowerCase();
    return logs.filter((log) => {
      if (filters.action !== 'all' && log.action !== filters.action) return false;
      if (filters.actorRole !== 'all' && log.actorRole !== filters.actorRole) return false;
      if (filters.targetType !== 'all' && log.targetType !== filters.targetType) return false;
      if (!q) return true;

      const haystack = [
        log.action,
        log.targetType,
        log.targetId,
        log.actorUid,
        log.actorRole,
        JSON.stringify(log.metadata ?? {})
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [filters, logs]);

  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <div style={{ display: 'grid', gap: '.75rem', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <label>
          Action
          <select value={filters.action} onChange={(e) => setFilters((prev) => ({ ...prev, action: e.target.value }))}>
            <option value="all">All actions</option>
            {options.actions.map((action) => <option key={action} value={action}>{action}</option>)}
          </select>
        </label>
        <label>
          Actor Role
          <select value={filters.actorRole} onChange={(e) => setFilters((prev) => ({ ...prev, actorRole: e.target.value }))}>
            <option value="all">All roles</option>
            {options.roles.map((role) => <option key={role} value={role}>{role}</option>)}
          </select>
        </label>
        <label>
          Target Type
          <select value={filters.targetType} onChange={(e) => setFilters((prev) => ({ ...prev, targetType: e.target.value }))}>
            <option value="all">All targets</option>
            {options.targetTypes.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
        </label>
        <label>
          Search
          <input
            placeholder="Search actor, target, metadata"
            value={filters.queryText}
            onChange={(e) => setFilters((prev) => ({ ...prev, queryText: e.target.value }))}
          />
        </label>
      </div>

      <div style={{ fontSize: '.9rem', opacity: 0.8 }}>
        Showing {filteredLogs.length} of {logs.length} audit events
      </div>

      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '.75rem' }}>
        {filteredLogs.map((log) => (
          <li key={log.id} style={{ border: '1px solid #ddd', borderRadius: 8, padding: '.75rem' }}>
            <div><strong>{log.action}</strong></div>
            <div>Target: {log.targetType} / {log.targetId}</div>
            <div>Actor: {log.actorUid} ({log.actorRole})</div>
            <div>When: {formatCreatedAt(log.createdAt)}</div>
            <details>
              <summary>Metadata</summary>
              <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(log.metadata ?? {}, null, 2)}</pre>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}
