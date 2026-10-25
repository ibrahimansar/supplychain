import React, { useEffect, useRef, useState, useCallback } from 'react';
import Portal from './Portal';

export default function Tooltip({ label, children, placement = 'top', showDelay = 120, hideDelay = 100, offset = 20, theme = 'dark' }) {
  const anchorRef = useRef(null);
  const [shown, setShown] = useState(false); // mounted
  const [active, setActive] = useState(false); // animated visibility
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const showTimer = useRef(null);
  const hideTimer = useRef(null);
  const unmountTimer = useRef(null);

  const computePosition = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const left = r.left + r.width / 2;
    const top = placement === 'bottom' ? r.bottom + offset : r.top - offset;
    setCoords({ top, left });
  }, [placement, offset]);

  useEffect(() => {
    if (!shown) return;
    computePosition();
    const onScroll = () => computePosition();
    const onResize = () => computePosition();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('scroll', onScroll, true); window.removeEventListener('resize', onResize); };
  }, [shown, computePosition]);

  const onEnter = () => {
    clearTimeout(hideTimer.current);
    clearTimeout(unmountTimer.current);
    showTimer.current = setTimeout(() => {
      setShown(true);
      // next frame to allow transition
      requestAnimationFrame(() => setActive(true));
    }, showDelay);
  };
  const onLeave = () => {
    clearTimeout(showTimer.current);
    hideTimer.current = setTimeout(() => {
      setActive(false);
      unmountTimer.current = setTimeout(() => setShown(false), 200); // match transition duration
    }, hideDelay);
  };

  useEffect(() => () => {
    clearTimeout(showTimer.current);
    clearTimeout(hideTimer.current);
    clearTimeout(unmountTimer.current);
  }, []);

  return (
    <span
      ref={anchorRef}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onFocus={onEnter}
      onBlur={onLeave}
      className="inline-flex"
    >
      {children}
      {shown && (
        <Portal>
          <div className="pointer-events-none fixed z-[4000]" style={{ top: coords.top, left: coords.left }}>
            <div
              className={`transform -translate-x-1/2 ${placement === 'top' ? (active ? '-translate-y-1' : 'translate-y-0') : (active ? 'translate-y-1' : 'translate-y-0')} ${theme==='brand' ? 'bg-primary-600 text-white' : 'bg-gray-900/95 text-white'} text-xs px-3 py-1.5 rounded-lg shadow-lg whitespace-nowrap transition-all duration-200 ease-out ${active ? 'opacity-100' : 'opacity-0'}`}
              role="tooltip"
            >
              {label}
            </div>
          </div>
        </Portal>
      )}
    </span>
  );
}
