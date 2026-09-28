import React from 'react';
import { RenderMode, FlightMode, CameraFollowMode, TelemetryData } from '../types/automaton';
import { CREATURE_SPEC } from '../data/componentsData';
import {
  RotateCcw,
  Play,
  Pause,
  Layers,
  Sliders,
  Camera,
  Compass,
  Wind,
  Navigation,
  Activity,
  ZoomIn,
  Sparkles,
  Eye,
  EyeOff,
  Cpu,
  Feather,
} from 'lucide-react';

interface TechnicalSidePanelProps {
  renderMode: RenderMode;
  onSetRenderMode: (mode: RenderMode) => void;
  flightMode: FlightMode;
  onSetFlightMode: (mode: FlightMode) => void;
  cameraFollowMode: CameraFollowMode;
  onSetCameraFollowMode: (mode: CameraFollowMode) => void;
  explodeAmount: number;
  onSetExplodeAmount: (amount: number) => void;
  isAutoRotating: boolean;
  onToggleAutoRotate: () => void;
  isFlapping: boolean;
  onToggleFlapping: () => void;
  telemetry: TelemetryData;
  onTakeScreenshot: () => void;
  onResetView: () => void;
  isUIVisible: boolean;
  onToggleUIVisibility: () => void;
}

export const TechnicalSidePanel: React.FC<TechnicalSidePanelProps> = ({
  renderMode,
  onSetRenderMode,
  flightMode,
  onSetFlightMode,
  cameraFollowMode,
  onSetCameraFollowMode,
  explodeAmount,
  onSetExplodeAmount,
  isAutoRotating,
  onToggleAutoRotate,
  isFlapping,
  onToggleFlapping,
  telemetry,
  onTakeScreenshot,
  onResetView,
  isUIVisible,
  onToggleUIVisibility,
}) => {
  const isExploded = explodeAmount > 0.05;

  const renderModes: { id: RenderMode; label: string; icon: string; desc: string }[] = [
    { id: 'skin', label: 'Skin', icon: '✦', desc: 'PBR 24K Gold & Ceramic' },
    { id: 'blueprint', label: 'Blueprint', icon: '⌗', desc: 'Cyan CAD Drafting' },
    { id: 'xray', label: 'X-Ray', icon: '◎', desc: 'Holographic Internal Shell' },
    { id: 'micro_anatomy', label: 'Micro-Anatomy', icon: '❖', desc: 'Micro-Gears & Wiring' },
  ];

  const handleToggleExplode = () => {
    onSetExplodeAmount(isExploded ? 0 : 0.85);
  };

  return (
    <>
      {/* 1. SINGLE FLOATING 'TOGGLE VISIBILITY' BUTTON (Always visible in fixed position) */}
      <div className="fixed top-4 right-4 z-50 pointer-events-auto">
        <button
          onClick={onToggleUIVisibility}
          aria-label={isUIVisible ? 'Hide Interface for 100% Cinematic View' : 'Show Interface Controls'}
          title={isUIVisible ? 'Hide Interface (100% Unobstructed Full Screen)' : 'Show Interface'}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-full backdrop-blur-xl border shadow-2xl transition-all duration-300 font-mono-tech text-xs active:scale-95 ${
            isUIVisible
              ? 'bg-slate-900/90 text-white border-slate-700/80 hover:bg-slate-950 shadow-slate-950/20'
              : 'bg-white/95 text-slate-900 border-slate-300 hover:bg-white shadow-xl hover:scale-105 ring-2 ring-blue-500/50'
          }`}
        >
          {isUIVisible ? (
            <>
              <EyeOff className="w-4 h-4 text-cyan-400" />
              <span className="hidden sm:inline font-medium">Cinematic View</span>
            </>
          ) : (
            <>
              <Eye className="w-4 h-4 text-blue-600 animate-pulse" />
              <span className="font-semibold tracking-wide">Controls</span>
            </>
          )}
        </button>
      </div>

      {/* 2. SOPHISTICATED SIDE CONTROL PANEL & TOP TELEMETRY STRIP (Fully disappears when collapsed) */}
      <div
        className={`fixed inset-0 pointer-events-none transition-all duration-500 ease-in-out z-40 ${
          isUIVisible
            ? 'opacity-100 scale-100 pointer-events-none'
            : 'opacity-0 scale-95 pointer-events-none translate-x-12'
        }`}
      >
        {/* Top Header & Telemetry Strip */}
        <div className="absolute top-4 left-4 right-20 pointer-events-auto flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 shadow-sm max-w-3xl">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-950 dark:bg-white text-white dark:text-slate-950 flex items-center justify-center font-cinzel font-bold text-xs shadow-sm">
              AC
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-cinzel text-xs md:text-sm font-bold tracking-wider text-slate-900 dark:text-slate-100">
                  {CREATURE_SPEC.name.toUpperCase()}
                </h1>
                <span className="hidden sm:inline px-1.5 py-0.5 rounded text-[9px] font-mono-tech bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                  {telemetry.lodQuality} LOD
                </span>
              </div>
              <p className="text-[10px] font-mono-tech text-slate-500 dark:text-slate-400">
                {CREATURE_SPEC.calibre} · SPAN {CREATURE_SPEC.wingspan}
              </p>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="hidden md:flex items-center gap-2 text-xs font-mono-tech text-slate-700 dark:text-slate-300">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800">
              <ZoomIn className="w-3 h-3 text-indigo-500" />
              <span className="text-[10px] opacity-60">ZOOM</span>
              <span className="font-semibold">{telemetry.zoomLevel}x</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800">
              <Wind className="w-3 h-3 text-blue-500" />
              <span className="text-[10px] opacity-60">IAS</span>
              <span className="font-semibold">{telemetry.airspeedKnots} kts</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800">
              <Activity className="w-3 h-3 text-rose-500" />
              <span className="text-[10px] opacity-60">BEAT</span>
              <span className="font-semibold">{telemetry.wingBeatFrequencyHz} Hz</span>
            </div>
          </div>
        </div>

        {/* Sophisticated Side Control Panel (Right Floating Deck) */}
        <aside className="absolute right-4 top-20 bottom-24 w-80 md:w-92 pointer-events-auto flex flex-col justify-between p-4 rounded-3xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xl text-slate-800 dark:text-slate-100 overflow-y-auto space-y-4">
          {/* Section A: Rendering Pipeline */}
          <div className="space-y-2">
            <div className="text-[11px] font-mono-tech uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-500" />
                <span>RENDER MODE</span>
              </span>
              <span className="text-[10px] text-blue-600 font-semibold">KTX2 / DRACO</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/70 rounded-2xl">
              {renderModes.map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => onSetRenderMode(mode.id)}
                  title={mode.desc}
                  className={`px-3 py-2 text-xs rounded-xl transition-all text-left flex flex-col gap-0.5 ${
                    renderMode === mode.id
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-semibold shadow-md'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px]">{mode.icon}</span>
                    <span>{mode.label}</span>
                  </div>
                  <span className="text-[9px] opacity-70 line-clamp-1">{mode.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Section B: Extreme Anatomical Explode */}
          <div className="space-y-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800">
            <div className="flex items-center justify-between text-[11px] font-mono-tech uppercase tracking-wider">
              <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-semibold">
                <Sliders className="w-3.5 h-3.5 text-amber-500" />
                <span>ANATOMICAL EXPLODE</span>
              </span>
              <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                {Math.round(explodeAmount * 100)}%
              </span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              Displaces outer casing to reveal high-density internal micro-gears, fiber-optic harness, and spinal columns.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={explodeAmount}
                onChange={(e) => onSetExplodeAmount(parseFloat(e.target.value))}
                aria-label="Extreme anatomical explode slider"
                className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <button
                onClick={handleToggleExplode}
                className={`px-2.5 py-1 text-xs font-mono-tech rounded-lg border transition-all shrink-0 ${
                  isExploded
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-400'
                }`}
              >
                {isExploded ? 'Assemble' : 'Explode'}
              </button>
            </div>
          </div>

          {/* Section C: Flight Trajectory & Dynamics */}
          <div className="space-y-2">
            <div className="text-[11px] font-mono-tech uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5 text-indigo-500" />
                <span>FLIGHT TRAJECTORY</span>
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/70 rounded-xl">
              <button
                onClick={() => onSetFlightMode('stationary')}
                className={`px-3 py-1.5 text-xs rounded-lg transition-all ${
                  flightMode === 'stationary'
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-semibold shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700'
                }`}
              >
                Stationary 360°
              </button>
              <button
                onClick={() => onSetFlightMode('flight_path')}
                className={`px-3 py-1.5 text-xs rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  flightMode === 'flight_path'
                    ? 'bg-blue-600 text-white font-semibold shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700'
                }`}
              >
                <Navigation className="w-3 h-3" />
                <span>Spatial Flight</span>
              </button>
            </div>

            {flightMode === 'flight_path' && (
              <div className="flex items-center gap-1.5 pt-1 text-[11px] font-mono-tech text-slate-500">
                <span>Camera Tracking:</span>
                <button
                  onClick={() => onSetCameraFollowMode('orbit')}
                  className={`px-2 py-0.5 rounded ${cameraFollowMode === 'orbit' ? 'bg-slate-200 dark:bg-slate-700 font-semibold text-slate-900 dark:text-white' : ''}`}
                >
                  Free Orbit
                </button>
                <button
                  onClick={() => onSetCameraFollowMode('chase')}
                  className={`px-2 py-0.5 rounded ${cameraFollowMode === 'chase' ? 'bg-slate-200 dark:bg-slate-700 font-semibold text-slate-900 dark:text-white' : ''}`}
                >
                  Chase Cam
                </button>
              </div>
            )}
          </div>

          {/* Section D: Kinematics & Flapping Actions */}
          <div className="space-y-2 pt-2 border-t border-slate-200/80 dark:border-slate-800">
            <div className="text-[11px] font-mono-tech uppercase tracking-wider text-slate-500 dark:text-slate-400">
              KINEMATIC CONTROLS
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onToggleFlapping}
                className={`px-3 py-2 rounded-xl text-xs font-mono-tech flex items-center justify-center gap-1.5 transition-all ${
                  isFlapping
                    ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isFlapping ? 'Wing Stroke ON' : 'Wings Glide'}</span>
              </button>

              <button
                onClick={onToggleAutoRotate}
                className={`px-3 py-2 rounded-xl text-xs font-mono-tech flex items-center justify-center gap-1.5 transition-all ${
                  isAutoRotating
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                {isAutoRotating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isAutoRotating ? '360° Orbit ON' : 'Orbit Rotate'}</span>
              </button>
            </div>
          </div>

          {/* Section E: Tooling Bar */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-200/80 dark:border-slate-800">
            <button
              onClick={onResetView}
              className="px-3 py-1.5 rounded-lg text-xs font-mono-tech flex items-center gap-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Framing</span>
            </button>

            <button
              onClick={onTakeScreenshot}
              className="px-3 py-1.5 rounded-lg text-xs font-mono-tech flex items-center gap-1.5 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 hover:bg-blue-100"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>
          </div>

          {/* Optimization Telemetry Stamp */}
          <div className="p-2 rounded-xl bg-slate-100/70 dark:bg-slate-800/40 text-[10px] font-mono-tech text-slate-500 dark:text-slate-400 space-y-0.5">
            <div className="flex items-center justify-between">
              <span>DRACO / KTX2 PIPELINE</span>
              <span className="text-blue-600 dark:text-blue-400 font-semibold">SYNCHRONIZED</span>
            </div>
            <div className="flex items-center justify-between">
              <span>FRUSTUM CULLING: DYNAMIC</span>
              <span>INSTANCING: ON</span>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
};
