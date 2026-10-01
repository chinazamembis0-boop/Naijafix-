/**
 * Reusable confirmation dialog built on the existing Ewizzy
 * .modal-overlay / .modal-content design language.
 */
function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Keep Order',
  destructive = false,
  busy = false,
  onConfirm,
  onCancel,
}) {
  if (!open) return null

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick={onCancel}>
      <div className="modal-content nf-confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onCancel} aria-label="Close" disabled={busy}>
            ×
          </button>
        </div>
        <div className="modal-body">
          <p className="nf-confirm-message">{message}</p>
          <div className="nf-confirm-actions">
            <button
              className={`dash-btn ${destructive ? 'dash-btn-danger' : 'dash-btn-outline'} dash-btn-full`}
              onClick={onCancel}
              disabled={busy}
            >
              {cancelLabel}
            </button>
            <button
              className={`dash-btn ${destructive ? 'dash-btn-primary' : 'dash-btn-primary'} dash-btn-full`}
              onClick={onConfirm}
              disabled={busy}
            >
              {busy ? 'Working...' : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialog
