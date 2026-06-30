import React from 'react';

// Centered loading spinner with an optional label. Announces itself to
// assistive tech via role="status".
export function Spinner({ label = 'Loading…' }) {
  return (
    <div className="loader-wrap" role="status" aria-live="polite">
      <div className="spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

// Friendly empty / error placeholder. `icon` is any lucide icon element.
export function EmptyState({ icon, title, message, action }) {
  return (
    <div className="empty-state" role="status">
      {icon && <div className="empty-icon" aria-hidden="true">{icon}</div>}
      {title && <h3 className="empty-title">{title}</h3>}
      {message && <p className="empty-msg">{message}</p>}
      {action}
    </div>
  );
}
