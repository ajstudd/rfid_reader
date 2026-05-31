import { HiOutlineCheckCircle, HiOutlineExclamationCircle, HiOutlineInformationCircle, HiOutlineXCircle, HiOutlineX } from 'react-icons/hi';
import type { ToastItem } from '../hooks/useToast';

const iconMap = {
  success: <HiOutlineCheckCircle />,
  error: <HiOutlineXCircle />,
  warning: <HiOutlineExclamationCircle />,
  info: <HiOutlineInformationCircle />,
};

interface ToastContainerProps {
  toasts: ToastItem[];
  onRemove: (id: string) => void;
}

export default function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-container" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.type}`}>
          <span className="toast-icon">{iconMap[toast.type]}</span>
          <span className="toast-message">{toast.message}</span>
          <button className="toast-close" onClick={() => onRemove(toast.id)} aria-label="Dismiss">
            <HiOutlineX />
          </button>
        </div>
      ))}
    </div>
  );
}
