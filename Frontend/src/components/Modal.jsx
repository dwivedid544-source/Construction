import { X } from 'lucide-react';
import { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'max-w-lg',
  hideHeader = false,
  darkMode = false,
}) => {
  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  // Close on backdrop click
  const handleBackdropClick = useCallback(
    (e) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose]
  );

  if (!isOpen) return null;

  const isHeaderVisible = !hideHeader && (title !== '' || title === undefined);

  return createPortal(
    <div
      onClick={handleBackdropClick}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
      }}
    >
      {/* Modal Panel */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          backgroundColor: darkMode ? '#0b0f19' : '#ffffff',
          color: darkMode ? '#f8fafc' : '#0f172a',
          width: '100%',
          borderRadius: '24px',
          boxShadow: darkMode
            ? '0 25px 60px -12px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.1)'
            : '0 25px 60px -12px rgba(0,0,0,0.35)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
          animation: 'modalIn 0.22s cubic-bezier(0.34, 1.56, 0.64, 1) both',
          overflow: 'hidden',
        }}
        className={maxWidth}
      >
        {/* Header */}
        {isHeaderVisible && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '20px 24px',
              borderBottom: darkMode ? '1px solid #1e293b' : '1px solid #f1f5f9',
              flexShrink: 0,
            }}
          >
            <h3
              style={{
                margin: 0,
                fontSize: '17px',
                fontWeight: 800,
                color: darkMode ? '#ffffff' : '#0f172a',
                letterSpacing: '-0.02em',
              }}
            >
              {title}
            </h3>
            <button
              onClick={onClose}
              style={{
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '8px',
                border: 'none',
                background: 'transparent',
                color: darkMode ? '#94a3b8' : '#94a3b8',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = darkMode ? '#1e293b' : '#f1f5f9';
                e.currentTarget.style.color = darkMode ? '#ffffff' : '#1e293b';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = '#94a3b8';
              }}
            >
              <X size={18} />
            </button>
          </div>
        )}

        {/* Scrollable Content */}
        <div
          style={{
            overflowY: 'auto',
            flex: 1,
            padding: isHeaderVisible ? '24px' : '0px',
          }}
        >
          {children}
        </div>
      </div>

      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.94) translateY(-10px); }
          to   { opacity: 1; transform: scale(1)    translateY(0); }
        }
      `}</style>
    </div>,
    document.body
  );
};

export default Modal;
