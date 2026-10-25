import React, { useState, useCallback, useEffect } from 'react';

export default function MobileTreeControls({ reactFlowInstance }) {
  const [zoom, setZoom] = useState(1);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (reactFlowInstance) {
      const currentZoom = reactFlowInstance.getZoom();
      setZoom(currentZoom);
    }
  }, [reactFlowInstance]);

  const handleZoomIn = useCallback(() => {
    if (reactFlowInstance) {
      reactFlowInstance.zoomIn({ duration: 200 });
      setZoom(reactFlowInstance.getZoom());
    }
  }, [reactFlowInstance]);

  const handleZoomOut = useCallback(() => {
    if (reactFlowInstance) {
      reactFlowInstance.zoomOut({ duration: 200 });
      setZoom(reactFlowInstance.getZoom());
    }
  }, [reactFlowInstance]);

  const handleFitView = useCallback(() => {
    if (reactFlowInstance) {
      reactFlowInstance.fitView({ padding: 0.2, duration: 400 });
      setTimeout(() => {
        setZoom(reactFlowInstance.getZoom());
      }, 450);
    }
  }, [reactFlowInstance]);

  const handleCenter = useCallback(() => {
    if (reactFlowInstance) {
      const nodes = reactFlowInstance.getNodes();
      if (nodes.length > 0) {
        reactFlowInstance.setCenter(
          nodes[0].position.x,
          nodes[0].position.y,
          { zoom: 1, duration: 400 }
        );
        setTimeout(() => {
          setZoom(reactFlowInstance.getZoom());
        }, 450);
      }
    }
  }, [reactFlowInstance]);

  const handleResetZoom = useCallback(() => {
    if (reactFlowInstance) {
      reactFlowInstance.setZoom(1, { duration: 200 });
      setZoom(1);
    }
  }, [reactFlowInstance]);

  if (!isMobile) {
    return null; // Desktop has its own controls
  }

  return (
    <>
      {/* Mobile Zoom Controls - Bottom Right */}
      <div className="fixed bottom-20 end-4 z-40 flex flex-col gap-2">
        {/* Zoom In */}
        <button
          onClick={handleZoomIn}
          className="w-12 h-12 bg-white dark:bg-gray-800 rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform touch-manipulation"
          aria-label="Zoom in"
        >
          <svg className="w-6 h-6 text-gray-700 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>

        {/* Zoom Level Indicator */}
        <div className="w-12 h-8 bg-white dark:bg-gray-800 rounded-full shadow-lg flex items-center justify-center text-xs font-medium text-gray-700 dark:text-gray-300">
          {Math.round(zoom * 100)}%
        </div>

        {/* Zoom Out */}
        <button
          onClick={handleZoomOut}
          className="w-12 h-12 bg-white dark:bg-gray-800 rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform touch-manipulation"
          aria-label="Zoom out"
        >
          <svg className="w-6 h-6 text-gray-700 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        </button>

        {/* Divider */}
        <div className="w-12 h-px bg-gray-300 dark:bg-gray-600 mx-auto" />

        {/* Fit View */}
        <button
          onClick={handleFitView}
          className="w-12 h-12 bg-emerald-600 text-white rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform touch-manipulation"
          aria-label="Fit view"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </button>
      </div>

      {/* Mobile Quick Actions - Bottom Left */}
      <div className="fixed bottom-20 start-4 z-40 flex flex-col gap-2">
        {/* Center View */}
        <button
          onClick={handleCenter}
          className="w-12 h-12 bg-white dark:bg-gray-800 rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform touch-manipulation"
          aria-label="Center view"
        >
          <svg className="w-6 h-6 text-gray-700 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
        </button>

        {/* Reset Zoom */}
        <button
          onClick={handleResetZoom}
          className="w-12 h-12 bg-white dark:bg-gray-800 rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform touch-manipulation"
          aria-label="Reset zoom"
        >
          <svg className="w-6 h-6 text-gray-700 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* Touch Gesture Hints (shown briefly on first load) */}
      <MobileGestureHints />
    </>
  );
}

function MobileGestureHints() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const hasSeenHints = localStorage.getItem('mobile-gesture-hints-seen');
    if (!hasSeenHints) {
      setShow(true);
      const timer = setTimeout(() => {
        setShow(false);
        localStorage.setItem('mobile-gesture-hints-seen', 'true');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, []);

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Mobile Gestures
          </h3>
          <button
            onClick={() => setShow(false)}
            className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
            aria-label="Close modal"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-start gap-3">
            <span className="text-2xl">👆</span>
            <span><strong>Tap</strong> on a person to view details</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-2xl">🤏</span>
            <span><strong>Pinch</strong> to zoom in/out</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-2xl">👆👆</span>
            <span><strong>Two fingers</strong> to pan around</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-2xl">🔄</span>
            <span><strong>Swipe</strong> to navigate tree</span>
          </div>
        </div>
        <button
          onClick={() => setShow(false)}
          className="mt-6 w-full bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-emerald-700"
        >
          Got it!
        </button>
      </div>
    </div>
  );
}
