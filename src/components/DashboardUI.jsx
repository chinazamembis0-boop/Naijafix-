export function SectionHeader({ label, title, action }) {
  return (
    <div className="dash-section-header">
      <div>
        {label && <span className="dash-section-label">{label}</span>}
        <h3 className="dash-section-title">{title}</h3>
      </div>
      {action && <div className="dash-section-action">{action}</div>}
    </div>
  )
}

export function StatusBadge({ status }) {
  const normalized = String(status || 'pending').toLowerCase()
  return (
    <span className={`dash-status-badge dash-status-${normalized}`}>
      {status || 'Pending'}
    </span>
  )
}

export function EmptyState({ icon, title, description, action }) {
  return (
    <div className="dash-empty-state">
      <span className="dash-empty-icon">{icon || '📭'}</span>
      <h4 className="dash-empty-title">{title || 'Nothing here yet'}</h4>
      {description && <p className="dash-empty-desc">{description}</p>}
      {action && <div className="dash-empty-action">{action}</div>}
    </div>
  )
}

export function LoadingState({ text = 'Loading...' }) {
  return (
    <div className="dash-empty-state">
      <span className="dash-empty-icon">⏳</span>
      <h4 className="dash-empty-title">{text}</h4>
    </div>
  )
}

export function DashboardCard({ children, className = '' }) {
  return (
    <div className={`dash-card ${className}`}>
      {children}
    </div>
  )
}

export function VerificationCard({ verification, type = 'provider', onViewDocument, children }) {
  const normalizedStatus = String(verification?.status || 'pending').toLowerCase()
  return (
    <div className="dash-card dash-verification-card">
      <div className="dash-verification-header">
        <h4>{type === 'provider' ? 'Provider' : 'Customer'} Verification</h4>
        <div className="dash-verification-badges">
          <span className={`dash-status-badge dash-status-${normalizedStatus}`}>
            {verification?.status === 'not-submitted' ? 'Not submitted' : verification?.status || 'Pending'}
          </span>
          {verification?.resubmitted_at && (
            <span className="dash-resubmit-badge">Resubmitted</span>
          )}
        </div>
      </div>
      <div className="dash-verification-body">
        <p><strong>Submitted:</strong> {verification?.submitted_at ? new Date(verification.submitted_at).toLocaleString() : 'N/A'}</p>
        {verification?.resubmitted_at && (
          <p><strong>Resubmitted:</strong> {new Date(verification.resubmitted_at).toLocaleString()}</p>
        )}
        {verification?.rejection_reason && (
          <p className="dash-rejection-reason"><strong>Reason:</strong> {verification.rejection_reason}</p>
        )}
        {verification?.id_document_url && onViewDocument && (
          <button
            type="button"
            className="dash-btn dash-btn-outline dash-btn-sm"
            onClick={() => onViewDocument(verification.id_document_url)}
          >
            View Document
          </button>
        )}
      </div>
      {children}
    </div>
  )
}

export function ReportCard({ report, onUpdate, reporterName }) {
  return (
    <div className="dash-card dash-report-card">
      <div className="dash-report-header">
        <h4>{report.subject}</h4>
        <StatusBadge status={report.status} />
      </div>
      <div className="dash-report-body">
        <p><strong>Category:</strong> {report.category}</p>
        <p><strong>Reporter:</strong> {reporterName || report.reporter_user_id}</p>
        <p className="dash-report-desc">{report.description}</p>
        <p><strong>Created:</strong> {new Date(report.created_at).toLocaleString()}</p>
        {report.admin_response && (
          <div className="dash-admin-response">
            <strong>Admin response:</strong>
            <p>{report.admin_response}</p>
          </div>
        )}
      </div>
      {onUpdate && (
        <div className="dash-report-actions">
          {onUpdate(report)}
        </div>
      )}
    </div>
  )
}

export function NotificationItem({ notification }) {
  const isUnread = !notification.is_read
  const typeIcon = {
    accepted: '✅',
    declined: '❌',
    booking: '📅',
    message: '💬',
    verification: '🪪',
    support_update: '📋',
  }
  return (
    <div className={`dash-notification-item ${isUnread ? 'dash-notification-unread' : 'dash-notification-read'}`}>
      <span className="dash-notification-icon">
        {typeIcon[notification.type] || '🔔'}
      </span>
      <div className="dash-notification-content">
        <strong>{notification.title || 'Notification'}</strong>
        <p>{notification.message || ''}</p>
        <small>
          {notification.type || 'update'}{' '}
          {notification.created_at ? new Date(notification.created_at).toLocaleString() : ''}
        </small>
      </div>
      {isUnread && <span className="dash-notification-dot" />}
    </div>
  )
}

export function DocPreview({ url, name, onRemove, onClear }) {
  const isPdf = String(url || '').toLowerCase().endsWith('.pdf')
  return (
    <div className="dash-doc-preview">
      <p className="dash-doc-name">{name || 'Selected document'}</p>
      {isPdf ? (
        <div className="dash-pdf-preview">
          <span>📄 PDF Document</span>
          <span className="dash-doc-name">{name}</span>
        </div>
      ) : (
        <img src={url} alt="Document preview" className="dash-doc-image" />
      )}
      <button type="button" className="dash-btn dash-btn-danger dash-btn-sm" onClick={onClear || onRemove}>
        Remove
      </button>
    </div>
  )
}

export function ImageModal({ url, onClose }) {
  if (!url) return null

  const isPdf = String(url).toLowerCase().includes('.pdf') ||
    String(url).toLowerCase().includes('application/pdf')

  return (
    <div className="dash-image-modal-overlay" onClick={onClose}>
      <div className="dash-image-modal-content" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="dash-image-modal-close" onClick={onClose}>×</button>
        {isPdf ? (
          <iframe
            src={url}
            title="Document viewer"
            className="dash-image-modal-iframe"
          />
        ) : (
          <img src={url} alt="Full size" className="dash-image-modal-img" />
        )}
      </div>
    </div>
  )
}

export function TabNav({ tabs, active, onChange }) {
  return (
    <nav className="dash-tab-nav">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`dash-tab-btn ${active === tab.id ? 'dash-tab-active' : ''}`}
          onClick={() => onChange(tab.id)}
        >
          {tab.icon && <span className="dash-tab-icon">{tab.icon}</span>}
          <span className="dash-tab-label">{tab.label}</span>
          {tab.badge > 0 && <span className="dash-tab-badge">{tab.badge}</span>}
        </button>
      ))}
    </nav>
  )
}

export function DashboardShell({ children, sidebar, header, activeTab, onTabChange, tabs }) {
  return (
    <div className="dash-shell">
      {sidebar}
      <div className="dash-shell-main">
        {header}
        <main className="dash-shell-content">
          {tabs && activeTab && (
            <TabNav tabs={tabs} active={activeTab} onChange={onTabChange} />
          )}
          {children}
        </main>
      </div>
    </div>
  )
}

export function AdminSidebar({ active, onChange, stats }) {
  return (
    <aside className="dash-admin-sidebar">
      <div className="dash-admin-sidebar-header">
        <div className="dash-brand">
          <div className="dash-brand-icon">
            <img src="/images/naijafix-logo.jpeg" alt="NaijaFix" />
          </div>
          <div>
            <h1>NaijaFix</h1>
            <span>Admin Panel</span>
          </div>
        </div>
      </div>
      <nav className="dash-admin-nav">
        <button className={`dash-admin-nav-btn ${active === 'overview' ? 'dash-admin-nav-active' : ''}`} onClick={() => onChange('overview')}>
          📊 <span>Overview</span>
        </button>
        <button className={`dash-admin-nav-btn ${active === 'users' ? 'dash-admin-nav-active' : ''}`} onClick={() => onChange('users')}>
          👥 <span>Users</span>
        </button>
        <button className={`dash-admin-nav-btn ${active === 'providers' ? 'dash-admin-nav-active' : ''}`} onClick={() => onChange('providers')}>
          🛠️ <span>Providers</span>
        </button>
        <button className={`dash-admin-nav-btn ${active === 'bookings' ? 'dash-admin-nav-active' : ''}`} onClick={() => onChange('bookings')}>
          📅 <span>Bookings</span>
        </button>
        <button className={`dash-admin-nav-btn ${active === 'services' ? 'dash-admin-nav-active' : ''}`} onClick={() => onChange('services')}>
          🏷️ <span>Services</span>
        </button>
        <button className={`dash-admin-nav-btn ${active === 'provider-verifications' ? 'dash-admin-nav-active' : ''}`} onClick={() => onChange('provider-verifications')}>
          🪪 <span>Provider Verifications</span>
          {stats?.pendingProvider > 0 && <span className="dash-admin-nav-badge">{stats.pendingProvider}</span>}
        </button>
        <button className={`dash-admin-nav-btn ${active === 'customer-verifications' ? 'dash-admin-nav-active' : ''}`} onClick={() => onChange('customer-verifications')}>
          🆔 <span>Customer Verifications</span>
          {stats?.pendingCustomer > 0 && <span className="dash-admin-nav-badge">{stats.pendingCustomer}</span>}
        </button>
        <button className={`dash-admin-nav-btn ${active === 'support-reports' ? 'dash-admin-nav-active' : ''}`} onClick={() => onChange('support-reports')}>
          📋 <span>Support Reports</span>
          {stats?.openReports > 0 && <span className="dash-admin-nav-badge">{stats.openReports}</span>}
        </button>
        <button className={`dash-admin-nav-btn ${active === 'notifications' ? 'dash-admin-nav-active' : ''}`} onClick={() => onChange('notifications')}>
          🔔 <span>Notifications</span>
          {stats?.unreadNotifications > 0 && <span className="dash-admin-nav-badge">{stats.unreadNotifications}</span>}
        </button>
      </nav>
      <div className="dash-admin-sidebar-footer">
        <button className="dash-admin-nav-btn" onClick={stats?.onLogout}>
          🚪 <span>Logout</span>
        </button>
      </div>
    </aside>
  )
}

export function StatCard({ label, value, icon, color = 'green' }) {
  return (
    <div className={`dash-stat-card dash-stat-${color}`}>
      <span className="dash-stat-icon">{icon}</span>
      <div className="dash-stat-content">
        <strong className="dash-stat-value">{value || 0}</strong>
        <span className="dash-stat-label">{label}</span>
      </div>
    </div>
  )
}

export function StatGrid({ children }) {
  return <div className="dash-stat-grid">{children}</div>
}

export function BookingCard({ booking, onAccept, onDecline, onMessage, showActions = true, onProviderOnTheWay, onMarkInProgress, onMarkCompleted, onAcceptTime, onProposeTime, proposedTime, onProposedTimeChange }) {
  const status = String(booking.status || 'Pending').toLowerCase()
  const isPending = status === 'pending'
  const isAccepted = status === 'accepted'
  return (
    <div className="dash-booking-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
        <h4>{booking.service_name || booking.customer_name || 'Service request'}</h4>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {booking.emergency && <span className="dash-status-badge dash-status-declined">🚨 Emergency</span>}
          <StatusBadge status={booking.status} />
        </div>
      </div>
      {booking.customer_name && <p><strong>Customer:</strong> {booking.customer_name}</p>}
      {booking.provider_name && <p><strong>Provider:</strong> {booking.provider_name}</p>}
      {booking.booking_date && <p>📅 {booking.booking_date}</p>}
      {booking.preferred_time && <p>⏰ Preferred: {booking.preferred_time}</p>}
      {booking.proposed_time && <p>🔄 Proposed: {booking.proposed_time} {booking.time_accepted ? '✓' : '(awaiting response)'}</p>}
      {booking.service_location && <p>📍 {booking.service_location}</p>}
      {booking.notes && <p style={{ marginTop: 6 }}>{booking.notes}</p>}
      {booking.total_price != null && booking.total_price !== undefined && (
        <p style={{ fontWeight: 800, color: 'var(--nf-green)' }}>₦{booking.total_price}</p>
      )}
      {showActions && isPending && (onAccept || onDecline) && (
        <div className="dash-booking-actions">
          {onAccept && (
            <button type="button" className="dash-btn dash-btn-primary" onClick={() => onAccept(booking)}>
              Accept
            </button>
          )}
          {onDecline && (
            <button type="button" className="dash-btn dash-btn-danger" onClick={() => onDecline(booking)}>
              Decline
            </button>
          )}
        </div>
      )}
      {showActions && isAccepted && (onProviderOnTheWay || onMarkInProgress) && (
        <div className="dash-booking-actions">
          {onProviderOnTheWay && (
            <button type="button" className="dash-btn dash-btn-outline" onClick={() => onProviderOnTheWay(booking)}>
              🚗 On the way
            </button>
          )}
          {onMarkInProgress && (
            <button type="button" className="dash-btn dash-btn-primary" onClick={() => onMarkInProgress(booking)}>
              🔧 In progress
            </button>
          )}
        </div>
      )}
      {showActions && booking.preferred_time && isAccepted && !booking.time_accepted && (onAcceptTime || onProposeTime) && (
        <div className="dash-booking-actions">
          {onAcceptTime && (
            <button type="button" className="dash-btn dash-btn-primary" onClick={() => onAcceptTime(booking)}>
              ✓ Accept time
            </button>
          )}
          <input
            type="time"
            className="dash-form-input"
            value={proposedTime || ''}
            onChange={(e) => onProposedTimeChange?.(e.target.value)}
            placeholder="Propose alternative time"
            style={{ width: 'auto', flex: 1 }}
          />
          {onProposeTime && (
            <button type="button" className="dash-btn dash-btn-outline" onClick={() => onProposeTime(proposedTime)}>
              Propose time
            </button>
          )}
        </div>
      )}
      {showActions && (onProviderOnTheWay || onMarkInProgress || onMarkCompleted) && (
        <div className="dash-booking-actions">
          {onProviderOnTheWay && (
            <button type="button" className="dash-btn dash-btn-outline" onClick={() => onProviderOnTheWay(booking)}>
              On the way
            </button>
          )}
          {onMarkInProgress && (
            <button type="button" className="dash-btn dash-btn-primary" onClick={() => onMarkInProgress(booking)}>
              In progress
            </button>
          )}
          {onMarkCompleted && (
            <button type="button" className="dash-btn dash-btn-primary" onClick={() => onMarkCompleted(booking)}>
              ✅ Mark completed
            </button>
          )}
        </div>
      )}
      {onMessage && (
        <div className="dash-booking-actions">
          <button type="button" className="dash-btn dash-btn-outline" onClick={() => onMessage(booking)}>
            💬 Message
          </button>
        </div>
      )}
    </div>
  )
}

export function ProfileSummary({ name, email, phone, role, avatarUrl, onEdit, editButtonLabel = 'Edit profile' }) {
  return (
    <div className="dash-card">
      <div className="dash-profile-header">
        <div className="dash-profile-avatar">
          {avatarUrl ? <img src={avatarUrl} alt={name} /> : name?.charAt(0)?.toUpperCase() || 'U'}
        </div>
        <div className="dash-profile-info">
          <h3>{name}</h3>
          <p>{email}</p>
          {phone && <p>📞 {phone}</p>}
          {role && <p style={{ textTransform: 'capitalize' }}>{role} account</p>}
        </div>
      </div>
      {onEdit && (
        <button type="button" className="dash-btn dash-btn-outline dash-btn-full" onClick={onEdit}>
          {editButtonLabel}
        </button>
      )}
    </div>
  )
}

export function ServiceGrid({ services, onSelect, columns, showImages = false }) {
  return (
    <div className="dash-service-grid" style={columns ? { gridTemplateColumns: `repeat(${columns}, 1fr)` } : undefined}>
      {services.map((service) => (
        <button
          key={service.id}
          className={`dash-service-card ${showImages && service.image ? 'dash-service-card--image' : ''}`}
          onClick={() => onSelect?.(service)}
        >
          {showImages && service.image ? (
            <div className="dash-service-card-image-wrapper">
              <img
                src={service.image}
                alt={service.name}
                className="dash-service-card-image"
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                  e.currentTarget.nextSibling.style.display = 'flex'
                }}
              />
              <div className="dash-service-card-image-fallback" style={{ display: 'none' }}>
                <span>{service.icon || '🛠️'}</span>
              </div>
            </div>
          ) : (
            <div className="dash-service-card-icon">{service.icon || '🛠️'}</div>
          )}
          <div className="dash-service-card-name">{service.name}</div>
        </button>
      ))}
    </div>
  )
}

export function SearchBar({ value, onChange, placeholder = 'Search...' }) {
  return (
    <div className="dash-search">
      <span>🔍</span>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

export function TopBar({ greeting, name, subtitle, avatarUrl, onProfile, onNotification, notificationCount, actions }) {
  return (
    <div className="dash-topbar">
      <div className="dash-topbar-left">
        {greeting && <div className="dash-topbar-greeting">{greeting}</div>}
        {name && <h2 className="dash-topbar-name">{name}</h2>}
        {subtitle && <p className="dash-topbar-subtitle">{subtitle}</p>}
      </div>
      <div className="dash-topbar-actions">
        {actions}
        {onNotification && (
          <button className="dash-icon-btn" onClick={onNotification} aria-label="Notifications">
            🔔
            {notificationCount > 0 && <span className="dash-icon-btn-badge">{notificationCount}</span>}
          </button>
        )}
        {onProfile && (
          <button className="dash-avatar-btn" onClick={onProfile} aria-label="Profile">
            {avatarUrl ? <img src={avatarUrl} alt="Profile" /> : name?.charAt(0)?.toUpperCase() || 'U'}
          </button>
        )}
      </div>
    </div>
  )
}

export function BottomNav({ items, active, onChange }) {
  return (
    <nav className="dash-bottom-nav">
      {items.map((item) => (
        <button
          key={item.id}
          className={active === item.id ? 'dash-nav-active' : ''}
          onClick={() => onChange(item.id)}
        >
          <span className="dash-bottom-nav-icon">{item.icon}</span>
          <span>{item.label}</span>
          {item.badge > 0 && <span className="dash-bottom-nav-badge">{item.badge}</span>}
        </button>
      ))}
    </nav>
  )
}

export function QuickActions({ actions }) {
  return (
    <div className="dash-quick-actions">
      {actions.map((action, index) => (
        <button key={index} className="dash-quick-action" onClick={action.onClick}>
          <div className="dash-quick-action-icon">{action.icon}</div>
          <div className="dash-quick-action-label">{action.label}</div>
        </button>
      ))}
    </div>
  )
}
