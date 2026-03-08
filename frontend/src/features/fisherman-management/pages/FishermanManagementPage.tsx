import { FormEvent, useEffect, useState } from 'react';
import {
  type FishermanFormValues,
  type FishermanStatusFilter,
  useFishermanManagement
} from '../hooks/useFishermanManagement';

const defaultForm: FishermanFormValues = {
  uid: '',
  displayName: '',
  phoneNumber: '',
  homeHarborId: '',
  isActive: true
};

export function FishermanManagementPage() {
  const {
    loading,
    submitting,
    error,
    fishermen,
    selected,
    selectedVessels,
    search,
    harborFilter,
    statusFilter,
    setSearch,
    setHarborFilter,
    setStatusFilter,
    loadDetail,
    saveFisherman,
    clearSelection,
  } = useFishermanManagement();

  const [formValues, setFormValues] = useState<FishermanFormValues>(defaultForm);

  useEffect(() => {
    if (!selected) {
      setFormValues(defaultForm);
      return;
    }

    setFormValues({
      displayName: selected.displayName,
      phoneNumber: selected.phoneNumber ?? '',
      homeHarborId: selected.homeHarborId ?? '',
      isActive: selected.isActive
    });
  }, [selected]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void saveFisherman(formValues, selected?.uid);
  }

  return (
    <main className="page-wrap page-wide">
      <header className="page-header">
        <h1>Fisherman Management</h1>
        <p className="subtle">Manage fisherman profiles with explicit server-enforced roles and audit logs.</p>
      </header>

      <section className="panel filter-grid">
        <label>
          <span>Search name</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="e.g., Aji Surya" />
        </label>
        <label>
          <span>Harbor ID</span>
          <input value={harborFilter} onChange={(event) => setHarborFilter(event.target.value)} placeholder="HB-01" />
        </label>
        <label>
          <span>Status</span>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as FishermanStatusFilter)}>
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
      </section>

      {error ? <p className="state-error">{error}</p> : null}
      {loading ? <p className="state-loading">Loading fishermen...</p> : null}

      <section className="management-layout">
        <article className="panel">
          <div className="panel-header-row">
            <h2 className="panel-title">Fisherman List</h2>
            <button type="button" onClick={clearSelection}>New fisherman</button>
          </div>
          {fishermen.length === 0 ? (
            <p className="state-empty">No fishermen found for the current filter.</p>
          ) : (
            <ul className="simple-list">
              {fishermen.map((fisherman) => (
                <li key={fisherman.uid}>
                  <button type="button" className="link-button" onClick={() => void loadDetail(fisherman.uid)}>
                    <strong>{fisherman.displayName}</strong>
                    <span className="subtle">{fisherman.uid} · {fisherman.homeHarborId ?? 'No harbor'}</span>
                    <span className={`badge ${fisherman.isActive ? 'badge-active' : 'badge-cancelled'}`}>
                      {fisherman.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="panel">
          <h2 className="panel-title">{selected ? 'Fisherman Detail' : 'Create Fisherman'}</h2>
          <form className="form-stack" onSubmit={onSubmit}>
            {!selected ? (
              <label>
                <span>UID</span>
                <input
                  value={formValues.uid ?? ''}
                  onChange={(event) => setFormValues((current) => ({ ...current, uid: event.target.value }))}
                  required
                />
              </label>
            ) : null}
            <label>
              <span>Name</span>
              <input
                value={formValues.displayName}
                onChange={(event) => setFormValues((current) => ({ ...current, displayName: event.target.value }))}
                required
              />
            </label>
            <label>
              <span>Phone</span>
              <input
                value={formValues.phoneNumber}
                onChange={(event) => setFormValues((current) => ({ ...current, phoneNumber: event.target.value }))}
              />
            </label>
            <label>
              <span>Home Harbor ID</span>
              <input
                value={formValues.homeHarborId}
                onChange={(event) => setFormValues((current) => ({ ...current, homeHarborId: event.target.value }))}
              />
            </label>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={formValues.isActive}
                onChange={(event) => setFormValues((current) => ({ ...current, isActive: event.target.checked }))}
              />
              <span>Active fisherman</span>
            </label>

            <div className="role-note">
              Role is locked to <strong>fisherman</strong> and enforced by secure callable functions.
            </div>

            <button type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : selected ? 'Update fisherman' : 'Create fisherman'}
            </button>
          </form>

          {selected ? (
            <div className="vessel-section">
              <h3>Linked Vessels</h3>
              {selectedVessels.length === 0 ? (
                <p className="state-empty">No linked vessels found.</p>
              ) : (
                <ul className="simple-list">
                  {selectedVessels.map((vessel) => (
                    <li key={vessel.vesselId}>
                      <strong>{vessel.vesselName}</strong>
                      <p className="subtle">
                        {vessel.registrationNumber ?? 'No registration'} · {vessel.status ?? 'status n/a'}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </article>
      </section>
    </main>
  );
}
