/**
 * Reusable confirmation dialog built on the existing Ewizzy
 * .modal-overlay / .modal-content design language.
 *
 * Optional `reasonLabel`/`reasonValue`/`onReasonChange` props add a free
 * text field (e.g. a cancellation reason). When they are omitted the
 * dialog renders as before, with no extra UI.
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
  reasonLabel,
  reasonValue,
  onReasonChange,
  reasonPlaceholder = 'Optional reason',
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
          {reasonLabel && (
            <label className="nf-confirm-reason">
              <span>{reasonLabel}</span>
              <textarea
                rows={2}
                value={reasonValue || ''}
                placeholder={reasonPlaceholder}
                onChange={(event) => onReasonChange?.(event.target.value)}
                disabled={busy}
              />
            </label>
          )}
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
