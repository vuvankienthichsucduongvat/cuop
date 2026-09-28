import React from 'react';
import { MechanicalComponent } from '../types/automaton';
import { X, Cpu, Layers, Disc, Sparkles, Scale, ShieldAlert } from 'lucide-react';

interface PartDetailsDrawerProps {
  component: MechanicalComponent | null;
  onClose: () => void;
}

export const PartDetailsDrawer: React.FC<PartDetailsDrawerProps> = ({
  component,
  onClose,
}) => {
  if (!component) return null;

  return (
    <div className="fixed md:absolute top-24 right-4 left-4 md:left-auto md:w-[420px] rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-5 border border-slate-200/90 dark:border-slate-800 shadow-2xl transition-all duration-300 z-20 text-slate-800 dark:text-slate-100">
      {/* Header */}
      <div className="flex items-start justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-mono-tech text-slate-500 dark:text-slate-400">
            <span className="uppercase tracking-wider font-semibold text-blue-600 dark:text-blue-400">
              LAYER: {component.anatomicalLayer}
            </span>
            <span>·</span>
            <span>SEC: {component.category.toUpperCase()}</span>
          </div>
          <h3 className="text-base font-cinzel font-bold tracking-wide mt-1">
            {component.name}
          </h3>
        </div>
        <button
          onClick={onClose}
          aria-label="Close component details"
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Specifications Grid */}
      <div className="grid grid-cols-2 gap-2.5 py-3 text-xs font-mono-tech">
        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[10px] uppercase mb-1">
            <Layers className="w-3.5 h-3.5 text-amber-500" />
            <span>MATERIAL ALLOY</span>
          </div>
          <p className="font-sans font-medium text-xs text-slate-800 dark:text-slate-200 leading-snug">
            {component.material}
          </p>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[10px] uppercase mb-1">
            <Cpu className="w-3.5 h-3.5 text-blue-500" />
            <span>PRECISION TOLERANCE</span>
          </div>
          <p className="font-semibold text-xs text-blue-600 dark:text-blue-400">
            {component.tolerance}
          </p>
        </div>

        {component.weightGrams !== undefined && (
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[10px] uppercase mb-1">
              <Scale className="w-3.5 h-3.5 text-emerald-500" />
              <span>MASS SPECIFICATION</span>
            </div>
            <p className="font-semibold text-xs">
              {component.weightGrams} g
            </p>
          </div>
        )}

        {component.jewelCount !== undefined && (
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[10px] uppercase mb-1">
              <Sparkles className="w-3.5 h-3.5 text-rose-500" />
              <span>JEWEL BEARINGS</span>
            </div>
            <p className="font-semibold text-xs text-rose-600 dark:text-rose-400">
              {component.jewelCount} Synthetic Rubies
            </p>
          </div>
        )}

        {component.gearRatio && (
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 col-span-2">
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[10px] uppercase mb-1">
              <Disc className="w-3.5 h-3.5 text-indigo-500" />
              <span>KINEMATIC RATIO / FREQUENCY</span>
            </div>
            <p className="font-semibold text-xs">
              {component.gearRatio}
            </p>
          </div>
        )}
      </div>

      {/* Biomechanical Kinematic Description */}
      <div className="pt-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
        <p>{component.description}</p>
      </div>

      {/* Explode Vector Annotation */}
      <div className="mt-3 pt-2 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-[10px] font-mono-tech text-slate-400">
        <span>EXPLODE DISPLACEMENT: {component.explodeDistance}x</span>
        <span>TRAJECTORY: [{component.explodeDirection.join(', ')}]</span>
      </div>
    </div>
  );
};
