import React, { useState, useEffect } from 'react';

const WhatsAppFloatingButton = () => {
    const [isHovered, setIsHovered] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const whatsappUrl = "https://wa.me/919752100980?text=Hi%20Lalit,%20I'm%20interested%20in%20Kiaan%20Build.%20Please%20schedule%20a%20demo.";

    const size = isMobile ? 54 : 60;

    return (
        <div
            style={{
                position: 'fixed',
                bottom: '24px',
                right: '24px',
                zIndex: 999999,
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                userSelect: 'none',
                WebkitUserSelect: 'none'
            }}
        >
            <style>{`
                @keyframes wa-pulse {
                    0% {
                        box-shadow: 0 0 0 0 rgba(37, 211, 102, 0.6);
                    }
                    70% {
                        box-shadow: 0 0 0 16px rgba(37, 211, 102, 0);
                    }
                    100% {
                        box-shadow: 0 0 0 0 rgba(37, 211, 102, 0);
                    }
                }
                .wa-floating-btn {
                    animation: wa-pulse 2s infinite;
                }
                .wa-floating-btn:hover {
                    transform: scale(1.1) rotate(4deg);
                    background-color: #20ba5a !important;
                    box-shadow: 0 12px 28px rgba(37, 211, 102, 0.55), 0 4px 14px rgba(0,0,0,0.4) !important;
                }
                .wa-tooltip {
                    transition: opacity 0.25s ease, transform 0.25s ease;
                }
            `}</style>

            {/* Tooltip */}
            {!isMobile && (
                <div
                    className="wa-tooltip"
                    style={{
                        background: 'rgba(15, 23, 42, 0.95)',
                        color: '#f8fafc',
                        fontSize: '13px',
                        fontWeight: 600,
                        padding: '8px 14px',
                        borderRadius: '12px',
                        border: '1px solid rgba(59, 130, 246, 0.3)',
                        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5), 0 0 15px rgba(37, 211, 102, 0.15)',
                        backdropFilter: 'blur(12px)',
                        WebkitBackdropFilter: 'blur(12px)',
                        opacity: isHovered ? 1 : 0,
                        transform: isHovered ? 'translateX(0) scale(1)' : 'translateX(8px) scale(0.95)',
                        pointerEvents: isHovered ? 'auto' : 'none',
                        whiteSpace: 'nowrap',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}
                >
                    <span style={{ fontSize: '15px' }}>💬</span>
                    <span>Chat with us on WhatsApp</span>
                </div>
            )}

            {/* Floating WhatsApp Button */}
            <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Chat with us on WhatsApp"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className="wa-floating-btn"
                style={{
                    width: `${size}px`,
                    height: `${size}px`,
                    borderRadius: '50%',
                    backgroundColor: '#25D366',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textDecoration: 'none',
                    outline: 'none',
                    cursor: 'pointer',
                    transition: 'transform 0.25s ease, background-color 0.25s ease, box-shadow 0.25s ease',
                    boxShadow: '0 8px 24px rgba(37, 211, 102, 0.45), 0 2px 8px rgba(0, 0, 0, 0.25)',
                    flexShrink: 0
                }}
            >
                {/* WhatsApp SVG Icon */}
                <svg
                    style={{
                        width: isMobile ? '28px' : '32px',
                        height: isMobile ? '28px' : '32px',
                        fill: '#ffffff',
                        filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))'
                    }}
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.572-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.99c-.002 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
            </a>
        </div>
    );
};

export default WhatsAppFloatingButton;
