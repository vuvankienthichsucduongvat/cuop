import { useState, useCallback, useRef } from 'react';
import { ThreeAutomatonCanvas, ThreeAutomatonCanvasHandle } from './components/ThreeAutomatonCanvas';
import { TechnicalSidePanel } from './components/TechnicalSidePanel';
import { PartDetailsDrawer } from './components/PartDetailsDrawer';
import { TechnicalDraftingGuides } from './components/TechnicalDraftingGuides';
import { FloatingZoomControls } from './components/FloatingZoomControls';
import { RenderMode, FlightMode, CameraFollowMode, TelemetryData } from './types/automaton';
import { MECHANICAL_COMPONENTS, CREATURE_SPEC } from './data/componentsData';

export default function App() {
  const [renderMode, setRenderMode] = useState<RenderMode>('skin');
  const [flightMode, setFlightMode] = useState<FlightMode>('flight_path');
  const [cameraFollowMode, setCameraFollowMode] = useState<CameraFollowMode>('orbit');
  const [explodeAmount, setExplodeAmount] = useState<number>(0);
  const [isAutoRotating, setIsAutoRotating] = useState<boolean>(true);
  const [rotationSpeed] = useState<number>(0.75);
  const [isFlapping, setIsFlapping] = useState<boolean>(true);
  const [flapSpeed] = useState<number>(1.0);
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);

  // Global Visibility Toggle for 100% unobstructed cinematic full-screen view
  const [isUIVisible, setIsUIVisible] = useState<boolean>(true);

  const [telemetry, setTelemetry] = useState<TelemetryData>({
    airspeedKnots: 52,
    altitudeMeters: 240,
    wingBeatFrequencyHz: 0.7,
    powerReserveHours: 94.2,
    escapementVph: 36000,
    pitchDegrees: 4,
    rollDegrees: -12,
    zoomLevel: 1.0,
    lodQuality: 'Standard',
  });

  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<ThreeAutomatonCanvasHandle>(null);

  const selectedComponent = MECHANICAL_COMPONENTS.find((c) => c.id === selectedPartId) || null;

  const handleToggleAutoRotate = useCallback(() => {
    setIsAutoRotating((prev) => !prev);
  }, []);

  const handleToggleFlapping = useCallback(() => {
    setIsFlapping((prev) => !prev);
  }, []);

  const handleToggleUIVisibility = useCallback(() => {
    setIsUIVisible((prev) => !prev);
  }, []);

  const handleZoomIn = useCallback(() => {
    canvasRef.current?.zoomIn();
  }, []);

  const handleZoomOut = useCallback(() => {
    canvasRef.current?.zoomOut();
  }, []);

  const handleResetView = useCallback(() => {
    setExplodeAmount(0);
    setIsAutoRotating(true);
    setSelectedPartId(null);
    setFlightMode('stationary');
  }, []);

  const handleTakeScreenshot = useCallback(() => {
    const canvas = canvasContainerRef.current?.querySelector('canvas');
    if (!canvas) return;

    try {
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `aquila-chronomechanica-${renderMode}-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Screenshot export failed:', err);
    }
  }, [renderMode]);

  return (
    <main className="relative w-screen h-screen overflow-hidden select-none tech-drafting-grid text-slate-900 transition-colors duration-500">
      {/* 1. Technical Aeronautical Drafting Guides (Fades away when UI is collapsed for pure cinematic clean view) */}
      <div className={`transition-opacity duration-500 ${isUIVisible ? 'opacity-100' : 'opacity-20'}`}>
        <TechnicalDraftingGuides wingspan={CREATURE_SPEC.wingspan} />
      </div>

      {/* 2. WebGL 3D Kinematic Engine Canvas (Draco & KTX2-optimized pipelines, Geometry Instancing & Dynamic Frustum Culling) */}
      <div ref={canvasContainerRef} className="absolute inset-0 z-0">
        <ThreeAutomatonCanvas
          ref={canvasRef}
          renderMode={renderMode}
          flightMode={flightMode}
          cameraFollowMode={cameraFollowMode}
          explodeAmount={explodeAmount}
          isAutoRotating={isAutoRotating}
          rotationSpeed={rotationSpeed}
          isFlapping={isFlapping}
          flapSpeed={flapSpeed}
          selectedPartId={selectedPartId}
          onSelectPart={setSelectedPartId}
          onTelemetryUpdate={setTelemetry}
        />
      </div>

      {/* 3. Dedicated On-Screen Floating Zoom In (+) and Zoom Out (-) Buttons (Anchored bottom-right, always accessible) */}
      <FloatingZoomControls onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} />

      {/* 4. Anatomical Component Details Inspection Drawer (Shows when part selected and UI visible) */}
      {selectedComponent && isUIVisible && (
        <PartDetailsDrawer
          component={selectedComponent}
          onClose={() => setSelectedPartId(null)}
        />
      )}

      {/* 5. Sophisticated Side Control Panel with Single Floating 'Toggle Visibility' Button */}
      <TechnicalSidePanel
        renderMode={renderMode}
        onSetRenderMode={setRenderMode}
        flightMode={flightMode}
        onSetFlightMode={setFlightMode}
        cameraFollowMode={cameraFollowMode}
        onSetCameraFollowMode={setCameraFollowMode}
        explodeAmount={explodeAmount}
        onSetExplodeAmount={setExplodeAmount}
        isAutoRotating={isAutoRotating}
        onToggleAutoRotate={handleToggleAutoRotate}
        isFlapping={isFlapping}
        onToggleFlapping={handleToggleFlapping}
        telemetry={telemetry}
        onTakeScreenshot={handleTakeScreenshot}
        onResetView={handleResetView}
        isUIVisible={isUIVisible}
        onToggleUIVisibility={handleToggleUIVisibility}
      />
    </main>
  );
}
