import { Component, useEffect, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, RefreshCw, X } from 'lucide-react';

type AlertTone = 'success' | 'error' | 'info' | 'warning';

const toneIcon: Record<AlertTone, ReactNode> = {
  success: <CheckCircle2 size={16} />,
  error: <AlertTriangle size={16} />,
  info: <Info size={16} />,
  warning: <AlertTriangle size={16} />,
};

/** Inline status banner. Renders nothing when there is no message. */
export function Alert({ tone, message, onDismiss }: { tone: AlertTone; message?: string | null; onDismiss?: () => void }) {
  if (!message) return null;
  return (
    <div className={`alert alert-${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      {toneIcon[tone]}
      <div className="alert-body">{message}</div>
      {onDismiss && (
        <button type="button" className="alert-dismiss" onClick={onDismiss} aria-label="Dismiss message">
          <X size={14} />
        </button>
      )}
    </div>
  );
}

/**
 * Accessible modal dialog: closes on Escape and on backdrop click, and locks
 * background scrolling while open.
 */
export function Modal({
  open,
  title,
  eyebrow,
  onClose,
  children,
  footer,
  width,
}: {
  open: boolean;
  title: string;
  eyebrow?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="modal-card" role="dialog" aria-modal="true" aria-label={title} style={width ? { maxWidth: `${width}px` } : undefined}>
        <div className="modal-head">
          <div>
            {eyebrow && <div className="modal-eyebrow">{eyebrow}</div>}
            <h3>{title}</h3>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close dialog">
            <X size={19} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

/** Spinner + label used while a panel or page is fetching. */
export function LoadingBlock({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="loading-block" role="status" aria-live="polite">
      <RefreshCw size={18} className="spin-icon" />
      <span>{label}</span>
    </div>
  );
}

/** Placeholder rows shown inside a table body while data is loading. */
export function TableLoadingRow({ colSpan, label = 'Loading records…' }: { colSpan: number; label?: string }) {
  return (
    <tr>
      <td colSpan={colSpan} style={{ padding: 0 }}>
        <LoadingBlock label={label} />
      </td>
    </tr>
  );
}

/** Full-panel error with a retry affordance. */
export function ErrorBlock({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="loading-block" role="alert">
      <AlertTriangle size={20} color="#dc2626" />
      <span style={{ color: '#991b1b', maxWidth: '440px' }}>{message}</span>
      {onRetry && (
        <button type="button" className="button button-secondary button-sm" onClick={onRetry}>
          <RefreshCw size={13} /> Try again
        </button>
      )}
    </div>
  );
}

type BoundaryProps = { children: ReactNode };
type BoundaryState = { error: Error | null };

/**
 * Stops a render-time exception in one page from blanking the whole portal.
 */
export class ErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled UI error:', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="panel" style={{ padding: '28px' }}>
        <div className="eyebrow">UNEXPECTED ERROR</div>
        <h2 style={{ font: "600 18px 'Space Grotesk'", margin: '0 0 6px', color: '#1e293b' }}>
          This screen could not be displayed
        </h2>
        <p style={{ fontSize: '12.5px', color: '#64748b', margin: '0 0 16px', maxWidth: '560px' }}>
          An unexpected error occurred while rendering this page. The rest of the portal is still available.
        </p>
        <pre
          style={{
            background: '#0f172a',
            color: '#f8b4b4',
            padding: '12px',
            borderRadius: '8px',
            fontSize: '11px',
            overflowX: 'auto',
            margin: '0 0 16px',
          }}
        >
          {this.state.error.message}
        </pre>
        <button type="button" className="button button-secondary" onClick={() => this.setState({ error: null })}>
          <RefreshCw size={14} /> Retry rendering
        </button>
      </div>
    );
  }
}
