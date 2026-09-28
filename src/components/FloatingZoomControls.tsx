import React from 'react';
import { Plus, Minus } from 'lucide-react';

interface FloatingZoomControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
}

export const FloatingZoomControls: React.FC<FloatingZoomControlsProps> = ({
  onZoomIn,
  onZoomOut,
}) => {
  return (
    <div
      className="fixed bottom-6 right-6 z-50 pointer-events-auto flex flex-col gap-2 select-none"
      role="group"
      aria-label="Camera Zoom Controls"
    >
      <button
        onClick={onZoomIn}
        aria-label="Zoom In Camera"
        title="Zoom In (Dolly Forward)"
        className="w-11 h-11 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800 shadow-xl flex items-center justify-center text-slate-800 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white active:scale-95 transition-all duration-200"
      >
        <Plus className="w-5 h-5" strokeWidth={2.4} />
      </button>

      <button
        onClick={onZoomOut}
        aria-label="Zoom Out Camera"
        title="Zoom Out (Dolly Backward)"
        className="w-11 h-11 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800 shadow-xl flex items-center justify-center text-slate-800 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white active:scale-95 transition-all duration-200"
      >
        <Minus className="w-5 h-5" strokeWidth={2.4} />
      </button>
    </div>
  );
};
