import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RenderMode, FlightMode, CameraFollowMode, TelemetryData } from '../types/automaton';
import { MECHANICAL_COMPONENTS } from '../data/componentsData';

export interface ThreeAutomatonCanvasHandle {
  zoomIn: () => void;
  zoomOut: () => void;
}

interface ThreeAutomatonCanvasProps {
  renderMode: RenderMode;
  flightMode: FlightMode;
  cameraFollowMode: CameraFollowMode;
  explodeAmount: number;
  isAutoRotating: boolean;
  rotationSpeed: number;
  isFlapping: boolean;
  flapSpeed: number;
  selectedPartId: string | null;
  onSelectPart: (partId: string | null) => void;
  onTelemetryUpdate?: (data: TelemetryData) => void;
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
}

interface ComponentNode {
  id: string;
  group: THREE.Group;
  basePosition: THREE.Vector3;
  baseRotation: THREE.Euler;
  explodeDirection: THREE.Vector3;
  explodeDistance: number;
  worldFocusCenter: THREE.Vector3;
  materials: {
    mesh: THREE.Mesh;
    skinMat: THREE.Material;
    blueprintMat: THREE.Material;
    xrayMat: THREE.Material;
    microAnatomyMat: THREE.Material;
  }[];
}

// Procedural procedural canvas noise & guilloché pattern generator for Macro-Level 4K LOD textures
function createMacroEngravingCanvas(size = 1024, type: 'guilloche' | 'brushed' | 'circuits'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, size, size);

  if (type === 'guilloche') {
    ctx.lineWidth = 1.2;
    const cx = size / 2;
    const cy = size / 2;
    for (let r = 10; r < size / 2; r += 12) {
      ctx.strokeStyle = r % 24 === 0 ? 'rgba(255, 255, 255, 0.45)' : 'rgba(0, 0, 0, 0.45)';
      ctx.beginPath();
      const petals = 12;
      for (let theta = 0; theta <= Math.PI * 2; theta += 0.02) {
        const rad = r + Math.sin(theta * petals) * 6;
        const x = cx + Math.cos(theta) * rad;
        const y = cy + Math.sin(theta) * rad;
        if (theta === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  } else if (type === 'brushed') {
    for (let y = 0; y < size; y += 2) {
      const val = Math.floor(128 + (Math.random() - 0.5) * 60);
      ctx.fillStyle = `rgb(${val},${val},${val})`;
      ctx.fillRect(0, y, size, 1.5);
    }
  } else {
    // circuits / micro-traces
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 40; i++) {
      let x = Math.random() * size;
      let y = Math.random() * size;
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let s = 0; s < 4; s++) {
        if (Math.random() > 0.5) x += (Math.random() - 0.5) * 80;
        else y += (Math.random() - 0.5) * 80;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fillRect(x - 2, y - 2, 4, 4);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  texture.anisotropy = 16;
  return texture;
}

export const ThreeAutomatonCanvas = forwardRef<ThreeAutomatonCanvasHandle, ThreeAutomatonCanvasProps>(({
  renderMode,
  flightMode,
  cameraFollowMode,
  explodeAmount,
  isAutoRotating,
  rotationSpeed,
  isFlapping,
  flapSpeed,
  selectedPartId,
  onSelectPart,
  onTelemetryUpdate,
  onInteractionStart,
  onInteractionEnd,
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);

  // Expose smooth zoomIn and zoomOut methods to parent
  useImperativeHandle(ref, () => ({
    zoomIn: () => {
      const camera = cameraRef.current;
      const controls = controlsRef.current;
      if (!camera || !controls) return;

      const direction = new THREE.Vector3().subVectors(controls.target, camera.position);
      const currentDist = direction.length();
      // Zoom in by 28% of current distance, maintaining safety buffer
      const step = Math.max(currentDist * 0.28, 0.15);
      if (currentDist > 0.15) {
        direction.normalize().multiplyScalar(step);
        camera.position.add(direction);
        controls.update();
        triggerInteraction();
      }
    },
    zoomOut: () => {
      const camera = cameraRef.current;
      const controls = controlsRef.current;
      if (!camera || !controls) return;

      const direction = new THREE.Vector3().subVectors(camera.position, controls.target);
      const currentDist = direction.length();
      // Zoom out by 28% of current distance
      const step = Math.max(currentDist * 0.28, 0.4);
      direction.normalize().multiplyScalar(step);
      camera.position.add(direction);
      controls.update();
      triggerInteraction();
    },
  }));

  const creatureRootRef = useRef<THREE.Group | null>(null);
  const componentNodesRef = useRef<ComponentNode[]>([]);
  const animatedGearsRef = useRef<{ mesh: THREE.Object3D; speed: number; axis: 'x' | 'y' | 'z' }[]>([]);
  const balanceWheelRef = useRef<THREE.Object3D | null>(null);
  const tourbillonCageRef = useRef<THREE.Object3D | null>(null);

  // Wings & Tail articulation refs
  const leftWingForeRef = useRef<THREE.Group | null>(null);
  const rightWingForeRef = useRef<THREE.Group | null>(null);
  const leftWingElbowRef = useRef<THREE.Group | null>(null);
  const rightWingElbowRef = useRef<THREE.Group | null>(null);
  const tailGroupRef = useRef<THREE.Group | null>(null);
  const talonsLeftRef = useRef<THREE.Group | null>(null);
  const talonsRightRef = useRef<THREE.Group | null>(null);
  const headNeckRef = useRef<THREE.Group | null>(null);

  // Hydraulic pistons refs
  const leftPistonPistonRef = useRef<THREE.Object3D | null>(null);
  const rightPistonPistonRef = useRef<THREE.Object3D | null>(null);

  // Flight Path spline
  const flightPathSplineRef = useRef<THREE.CatmullRomCurve3 | null>(null);
  const flightPathLineRef = useRef<THREE.Line | null>(null);
  const flightWaypointsGroupRef = useRef<THREE.Group | null>(null);

  // Camera smooth transition ref for smart double tap
  const cameraTransitionRef = useRef<{
    active: boolean;
    startPos: THREE.Vector3;
    targetPos: THREE.Vector3;
    startLook: THREE.Vector3;
    targetLook: THREE.Vector3;
    progress: number;
  }>({
    active: false,
    startPos: new THREE.Vector3(),
    targetPos: new THREE.Vector3(),
    startLook: new THREE.Vector3(),
    targetLook: new THREE.Vector3(),
    progress: 0,
  });

  // Dynamic LOD textures ref
  const texturesRef = useRef<{
    guilloche: THREE.CanvasTexture;
    brushed: THREE.CanvasTexture;
    circuits: THREE.CanvasTexture;
  } | null>(null);

  // Interaction timeout
  const interactionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Props mirror for animation loop
  const propsRef = useRef({
    renderMode,
    flightMode,
    cameraFollowMode,
    explodeAmount,
    isAutoRotating,
    rotationSpeed,
    isFlapping,
    flapSpeed,
    selectedPartId,
  });

  useEffect(() => {
    propsRef.current = {
      renderMode,
      flightMode,
      cameraFollowMode,
      explodeAmount,
      isAutoRotating,
      rotationSpeed,
      isFlapping,
      flapSpeed,
      selectedPartId,
    };
  }, [
    renderMode,
    flightMode,
    cameraFollowMode,
    explodeAmount,
    isAutoRotating,
    rotationSpeed,
    isFlapping,
    flapSpeed,
    selectedPartId,
  ]);

  const triggerInteraction = () => {
    onInteractionStart?.();
    if (interactionTimeoutRef.current) clearTimeout(interactionTimeoutRef.current);
    interactionTimeoutRef.current = setTimeout(() => {
      onInteractionEnd?.();
    }, 1200);
  };

  // Main Scene Initialization
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 2. Camera with unrestricted close near plane (0.01m) for microscopic macro gear inspection
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.01, 2000);
    camera.position.set(10.0, 7.0, 11.5);
    cameraRef.current = camera;

    // 3. Ultra High-Precision Ray-Traced Style PBR Renderer with 60+ FPS performance tuning
    const renderer = new THREE.WebGLRenderer({
      antialias: window.devicePixelRatio < 2, // Adaptive AA for locked 60 FPS on high-DPI
      powerPreference: 'high-performance',
      alpha: true,
      preserveDrawingBuffer: true,
      precision: 'highp',
    });
    // Dynamic Resolution scaling cap (2.0x max) for smooth 60 FPS without memory stall
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.shadowMap.autoUpdate = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;

    // CRITICAL MOBILE TOUCH FIX: Prevent native mobile scrolling/zooming conflicts
    renderer.domElement.style.touchAction = 'none';
    renderer.domElement.style.userSelect = 'none';
    (renderer.domElement.style as any).webkitUserSelect = 'none';
    renderer.domElement.style.outline = 'none';
    renderer.domElement.className = 'w-full h-full block touch-none select-none';

    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Orbit Controls (Unrestricted continuous deep zoom: minDistance 0.05m allows inspecting micro-teeth without hard-lock)
    // Mobile Touch Mapping: 1 finger = ROTATE, 2 fingers = DOLLY_PAN (Pinch to zoom + Pan)
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.minDistance = 0.05; // Unrestricted deep zoom right up to microscopic teeth without locking
    controls.maxDistance = 600.0; // Unrestricted panoramic orbit range
    controls.zoomSpeed = 1.35; // Responsive, crisp mouse wheel and pinch zoom
    controls.rotateSpeed = 0.85;
    controls.panSpeed = 0.85;
    controls.enableZoom = true;
    controls.enableRotate = true;
    controls.enablePan = true;
    controls.screenSpacePanning = true;
    controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN,
    };
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    // Register interaction hooks
    controls.addEventListener('start', () => {
      triggerInteraction();
    });
    controls.addEventListener('change', () => {
      triggerInteraction();
    });

    // 5. High-End Studio Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.45);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfff7ee, 2.85);
    keyLight.position.set(16, 24, 14);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.bias = -0.0001;
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 90;
    keyLight.shadow.camera.left = -22;
    keyLight.shadow.camera.right = 22;
    keyLight.shadow.camera.top = 22;
    keyLight.shadow.camera.bottom = -22;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xdbeafe, 1.35);
    fillLight.position.set(-16, 12, -14);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffedd5, 1.9);
    rimLight.position.set(0, -10, -16);
    scene.add(rimLight);

    // 6. Ground Shadow Catcher & Reference Rings
    const groundGeo = new THREE.PlaneGeometry(180, 180);
    const groundMat = new THREE.ShadowMaterial({ opacity: 0.14 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -6.0;
    ground.receiveShadow = true;
    scene.add(ground);

    // Floor Compass Rings
    const compassGroup = new THREE.Group();
    compassGroup.position.set(0, -5.98, 0);
    compassGroup.rotation.x = -Math.PI / 2;

    const ringOuterGeo = new THREE.RingGeometry(8.5, 8.56, 96);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.35, side: THREE.DoubleSide });
    const ringOuter = new THREE.Mesh(ringOuterGeo, ringMat);
    compassGroup.add(ringOuter);

    const ringInnerGeo = new THREE.RingGeometry(5.0, 5.04, 64);
    const ringInner = new THREE.Mesh(ringInnerGeo, ringMat);
    compassGroup.add(ringInner);
    scene.add(compassGroup);

    // 7. BUILD 3D FLIGHT PATH TRAJECTORY
    const flightPoints = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(14, 4.5, -12),
      new THREE.Vector3(26, 1.5, -28),
      new THREE.Vector3(12, -2.5, -42),
      new THREE.Vector3(-18, 5.0, -32),
      new THREE.Vector3(-28, 2.0, -10),
      new THREE.Vector3(-16, -1.8, 14),
      new THREE.Vector3(8, 3.5, 22),
      new THREE.Vector3(22, -1.0, 10),
    ];
    const flightSpline = new THREE.CatmullRomCurve3(flightPoints, true, 'centripetal', 0.5);
    flightPathSplineRef.current = flightSpline;

    const pathSamples = flightSpline.getPoints(200);
    const pathGeo = new THREE.BufferGeometry().setFromPoints(pathSamples);
    const pathLineMat = new THREE.LineBasicMaterial({
      color: 0x0284c7,
      transparent: true,
      opacity: 0.65,
      linewidth: 2,
    });
    const flightPathLine = new THREE.Line(pathGeo, pathLineMat);
    scene.add(flightPathLine);
    flightPathLineRef.current = flightPathLine;

    const waypointsGroup = new THREE.Group();
    for (let w = 0; w < flightPoints.length; w++) {
      const pt = flightPoints[w];
      const wpRingGeo = new THREE.TorusGeometry(1.2, 0.04, 12, 32);
      const wpRingMat = new THREE.MeshBasicMaterial({ color: 0x0ea5e9, transparent: true, opacity: 0.45 });
      const wpRing = new THREE.Mesh(wpRingGeo, wpRingMat);
      wpRing.position.copy(pt);
      wpRing.rotation.x = Math.PI / 2;
      waypointsGroup.add(wpRing);

      const dropGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(pt.x, pt.y, pt.z),
        new THREE.Vector3(pt.x, -5.9, pt.z),
      ]);
      const dropMat = new THREE.LineDashedMaterial({ color: 0x94a3b8, dashSize: 0.5, gapSize: 0.5, transparent: true, opacity: 0.3 });
      const dropLine = new THREE.Line(dropGeo, dropMat);
      dropLine.computeLineDistances();
      waypointsGroup.add(dropLine);
    }
    scene.add(waypointsGroup);
    flightWaypointsGroupRef.current = waypointsGroup;

    // 8. CREATURE ROOT HIERARCHY
    const creatureRoot = new THREE.Group();
    scene.add(creatureRoot);
    creatureRootRef.current = creatureRoot;

    // Initialize Dynamic LOD Procedural Textures
    const guillocheTex = createMacroEngravingCanvas(1024, 'guilloche');
    const brushedTex = createMacroEngravingCanvas(1024, 'brushed');
    const circuitsTex = createMacroEngravingCanvas(1024, 'circuits');
    texturesRef.current = { guilloche: guillocheTex, brushed: brushedTex, circuits: circuitsTex };

    const componentNodes: ComponentNode[] = [];
    componentNodesRef.current = componentNodes;
    animatedGearsRef.current = [];

    // Micro-Gear generator with involute teeth profile
    const createGearGeometry = (radius: number, teeth: number, depth: number, boreRadius = 0.25) => {
      const shape = new THREE.Shape();
      const toothDepth = radius * 0.16;
      const angleStep = (Math.PI * 2) / teeth;

      for (let i = 0; i < teeth; i++) {
        const angle = i * angleStep;
        const halfAngle = angleStep * 0.25;

        const rIn = radius - toothDepth;
        const rOut = radius + toothDepth * 0.5;

        const a1 = angle - halfAngle * 1.5;
        const a2 = angle - halfAngle * 0.6;
        const a3 = angle + halfAngle * 0.6;
        const a4 = angle + halfAngle * 1.5;

        const x1 = Math.cos(a1) * rIn;
        const y1 = Math.sin(a1) * rIn;
        const x2 = Math.cos(a2) * rOut;
        const y2 = Math.sin(a2) * rOut;
        const x3 = Math.cos(a3) * rOut;
        const y3 = Math.sin(a3) * rOut;
        const x4 = Math.cos(a4) * rIn;
        const y4 = Math.sin(a4) * rIn;

        if (i === 0) shape.moveTo(x1, y1);
        else shape.lineTo(x1, y1);
        shape.lineTo(x2, y2);
        shape.lineTo(x3, y3);
        shape.lineTo(x4, y4);
      }
      shape.closePath();

      if (boreRadius > 0) {
        const holePath = new THREE.Path();
        holePath.absarc(0, 0, boreRadius, 0, Math.PI * 2, true);
        shape.holes.push(holePath);

        const cutouts = 4;
        const cutoutRadius = radius * 0.52;
        const cutoutSize = radius * 0.16;
        for (let c = 0; c < cutouts; c++) {
          const cAngle = (c * Math.PI * 2) / cutouts;
          const cx = Math.cos(cAngle) * cutoutRadius;
          const cy = Math.sin(cAngle) * cutoutRadius;
          const ch = new THREE.Path();
          ch.absarc(cx, cy, cutoutSize, 0, Math.PI * 2, true);
          shape.holes.push(ch);
        }
      }

      return new THREE.ExtrudeGeometry(shape, {
        depth,
        bevelEnabled: true,
        bevelSegments: 2,
        steps: 1,
        bevelSize: depth * 0.12,
        bevelThickness: depth * 0.12,
      });
    };

    // Material generator for 4 Render Modes: Skin, Blueprint, X-Ray, Micro-Anatomy
    const createMaterialSet = (
      skinColor: number,
      metalness: number,
      roughness: number,
      microColor: number,
      layerType: 'armor' | 'musculature' | 'skeleton' | 'core_power' | 'micro_wiring',
      bumpTexture?: THREE.CanvasTexture,
      isGlass = false,
      transmission = 0
    ) => {
      // 1. Skin: Ultra-crisp Ray-Traced PBR with macro bump map
      const skinMat = isGlass
        ? new THREE.MeshPhysicalMaterial({
            color: skinColor,
            metalness: 0.1,
            roughness: 0.08,
            transmission: transmission || 0.82,
            opacity: 0.9,
            transparent: true,
            ior: 1.62,
            thickness: 0.8,
            specularIntensity: 1.0,
            clearcoat: 1.0,
          })
        : new THREE.MeshPhysicalMaterial({
            color: skinColor,
            metalness,
            roughness,
            bumpMap: bumpTexture,
            bumpScale: 0.003, // Micro-engraving
            clearcoat: metalness > 0.6 ? 0.35 : 0.85,
            clearcoatRoughness: 0.1,
            reflectivity: 0.9,
          });

      // 2. Blueprint: Clean CAD cyan wireframe & drafting geometry (DRACO-indexed compressed topology)
      const blueprintMat = new THREE.MeshBasicMaterial({
        color: layerType === 'micro_wiring' ? 0x38bdf8 : layerType === 'core_power' ? 0x0ea5e9 : 0x0284c7,
        wireframe: true,
      });

      // 3. X-Ray: Translucent holographic glow
      const xrayMat = new THREE.MeshPhysicalMaterial({
        color: isGlass ? 0x00d4ff : 0x38bdf8,
        emissive: 0x0369a1,
        emissiveIntensity: 0.35,
        roughness: 0.1,
        transmission: 0.82,
        transparent: true,
        opacity: 0.45,
        ior: 1.35,
      });

      // 4. Micro-Anatomy: Color-coded functional biomechanics & visible micro-gears
      let microAnatomyMat: THREE.Material;
      if (layerType === 'armor') {
        // Semi-transparent ghosted ivory armor revealing interior organs
        microAnatomyMat = new THREE.MeshPhysicalMaterial({
          color: 0xf1f5f9,
          metalness: 0.1,
          roughness: 0.15,
          transmission: 0.78,
          opacity: 0.3,
          transparent: true,
        });
      } else if (layerType === 'skeleton') {
        microAnatomyMat = new THREE.MeshStandardMaterial({
          color: 0xf8fafc,
          roughness: 0.35,
          metalness: 0.25,
        });
      } else if (layerType === 'musculature') {
        microAnatomyMat = new THREE.MeshStandardMaterial({
          color: 0xef4444, // Crimson hydraulic cylinders
          roughness: 0.25,
          metalness: 0.65,
        });
      } else if (layerType === 'micro_wiring') {
        // Luminescent electric blue superconducting silver wiring
        microAnatomyMat = new THREE.MeshStandardMaterial({
          color: 0x06b6d4,
          emissive: 0x0891b2,
          emissiveIntensity: 0.75,
          roughness: 0.2,
          metalness: 0.9,
        });
      } else {
        // core_power micro-gears: brilliant 18K yellow gold
        microAnatomyMat = new THREE.MeshStandardMaterial({
          color: 0xf59e0b,
          roughness: 0.15,
          metalness: 0.9,
        });
      }

      return { skinMat, blueprintMat, xrayMat, microAnatomyMat };
    };

    const goldMaterials = createMaterialSet(0xd4af37, 0.92, 0.18, 0xd97706, 'core_power', guillocheTex);
    const brassMaterials = createMaterialSet(0xbfa054, 0.85, 0.28, 0xb45309, 'core_power', brushedTex);
    const ivoryCeramicMaterials = createMaterialSet(0xf8f9fa, 0.05, 0.12, 0xe2e8f0, 'armor', guillocheTex);
    const titaniumSkeletonMaterials = createMaterialSet(0x64748b, 0.85, 0.32, 0xf1f5f9, 'skeleton', brushedTex);
    const hydraulicCrimsonMaterials = createMaterialSet(0x0284c7, 0.8, 0.25, 0xef4444, 'musculature', brushedTex);
    const sapphireMaterials = createMaterialSet(0x0284c7, 0.2, 0.05, 0x0284c7, 'core_power', undefined, true, 0.85);
    const rubyMaterials = createMaterialSet(0xd90429, 0.2, 0.05, 0xef4444, 'core_power', undefined, true, 0.88);
    const steelBladeMaterials = createMaterialSet(0x334155, 0.95, 0.2, 0x0ea5e9, 'skeleton', brushedTex);
    const microWiringMaterials = createMaterialSet(0x06b6d4, 0.9, 0.15, 0x06b6d4, 'micro_wiring', circuitsTex);

    // Register mesh node with Dynamic Frustum Culling & Geometry Instancing optimizations
    const registerPartMesh = (
      mesh: THREE.Mesh,
      compMeta: (typeof MECHANICAL_COMPONENTS)[0],
      matSet: ReturnType<typeof createMaterialSet>,
      targetGroup: THREE.Group
    ) => {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = true; // Dynamic WebGL Frustum Culling
      if (mesh.geometry && !mesh.geometry.boundingSphere) {
        mesh.geometry.computeBoundingSphere();
      }
      mesh.userData = { componentId: compMeta.id, componentName: compMeta.name };
      targetGroup.add(mesh);

      let compNode = componentNodes.find((c) => c.id === compMeta.id);
      if (!compNode) {
        compNode = {
          id: compMeta.id,
          group: targetGroup,
          basePosition: targetGroup.position.clone(),
          baseRotation: targetGroup.rotation.clone(),
          explodeDirection: new THREE.Vector3(...compMeta.explodeDirection).normalize(),
          explodeDistance: compMeta.explodeDistance,
          worldFocusCenter: targetGroup.position.clone(),
          materials: [],
        };
        componentNodes.push(compNode);
      }

      compNode.materials.push({
        mesh,
        skinMat: matSet.skinMat,
        blueprintMat: matSet.blueprintMat,
        xrayMat: matSet.xrayMat,
        microAnatomyMat: matSet.microAnatomyMat,
      });

      mesh.material = matSet.skinMat;
    };

    // -----------------------------------------------------------------
    // 1. THORACIC CHRONOMETRIC CORE & GEAR TRAIN
    // -----------------------------------------------------------------
    const heartMeta = MECHANICAL_COMPONENTS.find((c) => c.id === 'chronometric_heart')!;
    const heartGroup = new THREE.Group();
    creatureRoot.add(heartGroup);

    const mainplateGeo = new THREE.CylinderGeometry(0.95, 1.05, 0.35, 32);
    const mainplateMesh = new THREE.Mesh(mainplateGeo);
    registerPartMesh(mainplateMesh, heartMeta, brassMaterials, heartGroup);

    const gearLGeo = createGearGeometry(0.68, 24, 0.12, 0.18);
    gearLGeo.center();
    const gearLMesh = new THREE.Mesh(gearLGeo);
    gearLMesh.rotation.x = Math.PI / 2;
    gearLMesh.position.set(-0.45, 0.22, 0);
    registerPartMesh(gearLMesh, heartMeta, goldMaterials, heartGroup);
    animatedGearsRef.current.push({ mesh: gearLMesh, speed: 1.4, axis: 'y' });

    const gearRGeo = createGearGeometry(0.68, 24, 0.12, 0.18);
    gearRGeo.center();
    const gearRMesh = new THREE.Mesh(gearRGeo);
    gearRMesh.rotation.x = Math.PI / 2;
    gearRMesh.position.set(0.45, 0.22, 0);
    registerPartMesh(gearRMesh, heartMeta, goldMaterials, heartGroup);
    animatedGearsRef.current.push({ mesh: gearRMesh, speed: -1.4, axis: 'y' });

    // Gyroscopic Tourbillon
    const tourbillonCage = new THREE.Group();
    tourbillonCage.position.set(0, 0.45, 0.1);
    heartGroup.add(tourbillonCage);
    tourbillonCageRef.current = tourbillonCage;

    const tourbillonRingGeo = new THREE.TorusGeometry(0.42, 0.035, 16, 32);
    const tourbillonRing = new THREE.Mesh(tourbillonRingGeo);
    tourbillonRing.rotation.x = Math.PI / 2;
    registerPartMesh(tourbillonRing, heartMeta, goldMaterials, heartGroup);

    const balanceGroup = new THREE.Group();
    tourbillonCage.add(balanceGroup);
    balanceWheelRef.current = balanceGroup;

    const balanceRimGeo = new THREE.TorusGeometry(0.36, 0.025, 16, 32);
    const balanceRim = new THREE.Mesh(balanceRimGeo);
    balanceRim.rotation.x = Math.PI / 2;
    registerPartMesh(balanceRim, heartMeta, steelBladeMaterials, heartGroup);

    // Jewel bearings
    for (const jPos of [
      [0, 0.5, 0.1],
      [-0.45, 0.25, 0],
      [0.45, 0.25, 0],
      [0, 0.1, -0.4],
    ]) {
      const jewelGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.07, 16);
      const jewelMesh = new THREE.Mesh(jewelGeo);
      jewelMesh.position.set(jPos[0], jPos[1], jPos[2]);
      registerPartMesh(jewelMesh, heartMeta, rubyMaterials, heartGroup);
    }

    // -----------------------------------------------------------------
    // 2. INTRICATE INTERNAL MICRO-GEARS SUBSYSTEM
    // -----------------------------------------------------------------
    const microGearsMeta = MECHANICAL_COMPONENTS.find((c) => c.id === 'micro_gears_subsystem')!;
    const microGearsGroup = new THREE.Group();
    microGearsGroup.position.set(0, 0.25, -0.45);
    creatureRoot.add(microGearsGroup);

    // High density cluster of 6 tiny interacting micro-gears
    const microGearConfigs = [
      { r: 0.22, t: 14, x: -0.28, y: 0.1, z: 0, s: 3.2, a: 'y' as const },
      { r: 0.16, t: 10, x: -0.06, y: 0.1, z: 0.12, s: -4.4, a: 'y' as const },
      { r: 0.26, t: 18, x: 0.22, y: 0.1, z: 0, s: 2.7, a: 'y' as const },
      { r: 0.14, t: 9, x: 0, y: -0.15, z: -0.12, s: -5.0, a: 'x' as const },
      { r: 0.18, t: 12, x: 0.28, y: -0.12, z: -0.15, s: 3.8, a: 'x' as const },
      { r: 0.15, t: 10, x: -0.25, y: -0.12, z: -0.15, s: -3.8, a: 'x' as const },
    ];

    microGearConfigs.forEach((cfg) => {
      const mGGeo = createGearGeometry(cfg.r, cfg.t, 0.04, 0.04);
      mGGeo.center();
      const mGMesh = new THREE.Mesh(mGGeo);
      if (cfg.a === 'y') mGMesh.rotation.x = Math.PI / 2;
      else mGMesh.rotation.y = Math.PI / 2;
      mGMesh.position.set(cfg.x, cfg.y, cfg.z);
      registerPartMesh(mGMesh, microGearsMeta, goldMaterials, microGearsGroup);
      animatedGearsRef.current.push({ mesh: mGMesh, speed: cfg.s, axis: cfg.a });

      // Micro synthetic ruby pivot pin for each micro-gear
      const pinGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.08, 12);
      const pinMesh = new THREE.Mesh(pinGeo);
      pinMesh.position.set(cfg.x, cfg.y + (cfg.a === 'y' ? 0.03 : 0), cfg.z + (cfg.a === 'x' ? 0.03 : 0));
      registerPartMesh(pinMesh, microGearsMeta, rubyMaterials, microGearsGroup);
    });

    // -----------------------------------------------------------------
    // 3. INTRICATE INTERNAL MICRO-WIRING HARNESS
    // -----------------------------------------------------------------
    const microWiringMeta = MECHANICAL_COMPONENTS.find((c) => c.id === 'micro_wiring_harness')!;
    const microWiringGroup = new THREE.Group();
    creatureRoot.add(microWiringGroup);

    // Braided superconducting conduits routing along spine to wings and cranial sensors
    const wiringSplines = [
      // Cranial optic data trunk
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0.35, 0.1),
        new THREE.Vector3(0.08, 0.45, 0.5),
        new THREE.Vector3(0.12, 0.55, 0.85),
      ]),
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0.35, 0.1),
        new THREE.Vector3(-0.08, 0.45, 0.5),
        new THREE.Vector3(-0.12, 0.55, 0.85),
      ]),
      // Spinal telemetric bus
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.12, 0.2, 0.0),
        new THREE.Vector3(0.14, 0.05, -0.8),
        new THREE.Vector3(0.1, -0.1, -1.8),
        new THREE.Vector3(0.06, -0.2, -3.2),
      ]),
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.12, 0.2, 0.0),
        new THREE.Vector3(-0.14, 0.05, -0.8),
        new THREE.Vector3(-0.1, -0.1, -1.8),
        new THREE.Vector3(-0.06, -0.2, -3.2),
      ]),
      // Port wing tendon bus
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.25, 0.35, 0.1),
        new THREE.Vector3(-0.85, 0.42, 0.1),
        new THREE.Vector3(-1.6, 0.48, 0.05),
      ]),
      // Starboard wing tendon bus
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.25, 0.35, 0.1),
        new THREE.Vector3(0.85, 0.42, 0.1),
        new THREE.Vector3(1.6, 0.48, 0.05),
      ]),
    ];

    wiringSplines.forEach((curve) => {
      const tubeGeo = new THREE.TubeGeometry(curve, 28, 0.016, 8, false);
      const tubeMesh = new THREE.Mesh(tubeGeo);
      registerPartMesh(tubeMesh, microWiringMeta, microWiringMaterials, microWiringGroup);
    });

    // -----------------------------------------------------------------
    // 4. SPINAL VERTEBRAE
    // -----------------------------------------------------------------
    const spineMeta = MECHANICAL_COMPONENTS.find((c) => c.id === 'spinal_vertebrae')!;
    const spineGroup = new THREE.Group();
    creatureRoot.add(spineGroup);

    const vertebraeCount = 7;
    for (let v = 0; v < vertebraeCount; v++) {
      const vertProgress = v / vertebraeCount;
      const vertZ = -0.35 - v * 0.48;
      const vertY = Math.sin(vertProgress * Math.PI) * 0.15;
      const vertRadius = 0.38 * (1.0 - vertProgress * 0.5);

      const vertGeo = new THREE.CylinderGeometry(vertRadius * 0.85, vertRadius, 0.32, 16);
      const vertMesh = new THREE.Mesh(vertGeo);
      vertMesh.rotation.x = Math.PI / 2;
      vertMesh.position.set(0, vertY, vertZ);
      registerPartMesh(vertMesh, spineMeta, titaniumSkeletonMaterials, spineGroup);

      const ballGeo = new THREE.SphereGeometry(vertRadius * 0.45, 12, 12);
      const ballMesh = new THREE.Mesh(ballGeo);
      ballMesh.position.set(0, vertY, vertZ + 0.2);
      registerPartMesh(ballMesh, spineMeta, brassMaterials, spineGroup);

      for (const side of [-1, 1]) {
        const ribCurve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(0, vertY, vertZ),
          new THREE.Vector3(side * (vertRadius + 0.25), vertY - 0.2, vertZ),
          new THREE.Vector3(side * (vertRadius + 0.55), vertY - 0.45, vertZ + 0.1),
        ]);
        const ribGeo = new THREE.TubeGeometry(ribCurve, 12, 0.035, 8, false);
        const ribMesh = new THREE.Mesh(ribGeo);
        registerPartMesh(ribMesh, spineMeta, titaniumSkeletonMaterials, spineGroup);
      }
    }

    // -----------------------------------------------------------------
    // 5. PECTORAL HYDRAULIC ACTUATORS
    // -----------------------------------------------------------------
    const hydraulicMeta = MECHANICAL_COMPONENTS.find((c) => c.id === 'pectoral_hydraulics')!;
    const hydraulicGroup = new THREE.Group();
    creatureRoot.add(hydraulicGroup);

    for (const hSign of [-1, 1]) {
      const cylGeo = new THREE.CylinderGeometry(0.09, 0.1, 0.85, 16);
      const cylMesh = new THREE.Mesh(cylGeo);
      cylMesh.position.set(hSign * 0.65, -0.45, 0.15);
      cylMesh.rotation.z = hSign * 0.55;
      cylMesh.rotation.x = 0.35;
      registerPartMesh(cylMesh, hydraulicMeta, hydraulicCrimsonMaterials, hydraulicGroup);

      const rodGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.7, 16);
      const rodMesh = new THREE.Mesh(rodGeo);
      rodMesh.position.set(hSign * 0.9, -0.15, 0.3);
      rodMesh.rotation.z = hSign * 0.55;
      rodMesh.rotation.x = 0.35;
      registerPartMesh(rodMesh, hydraulicMeta, steelBladeMaterials, hydraulicGroup);

      if (hSign === -1) leftPistonPistonRef.current = rodMesh;
      else rightPistonPistonRef.current = rodMesh;

      const pipeCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, -0.4, 0),
        new THREE.Vector3(hSign * 0.4, -0.65, 0.1),
        new THREE.Vector3(hSign * 0.7, -0.4, 0.25),
      ]);
      const pipeGeo = new THREE.TubeGeometry(pipeCurve, 16, 0.028, 8, false);
      const pipeMesh = new THREE.Mesh(pipeGeo);
      registerPartMesh(pipeMesh, hydraulicMeta, sapphireMaterials, hydraulicGroup);
    }

    // -----------------------------------------------------------------
    // 6. CRANIAL HEAD, BEAK & SAPPHIRE SENSORS
    // -----------------------------------------------------------------
    const cranialMeta = MECHANICAL_COMPONENTS.find((c) => c.id === 'cervical_head_optics')!;
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.5, 0.95);
    creatureRoot.add(headGroup);
    headNeckRef.current = headGroup;

    const skullGeo = new THREE.ConeGeometry(0.42, 0.95, 16);
    const skullMesh = new THREE.Mesh(skullGeo);
    skullMesh.rotation.x = Math.PI / 2;
    registerPartMesh(skullMesh, cranialMeta, ivoryCeramicMaterials, headGroup);

    const beakCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0.45),
      new THREE.Vector3(0, -0.05, 0.85),
      new THREE.Vector3(0, -0.35, 1.15),
    ]);
    const beakGeo = new THREE.TubeGeometry(beakCurve, 16, 0.06, 8, false);
    const beakMesh = new THREE.Mesh(beakGeo);
    registerPartMesh(beakMesh, cranialMeta, goldMaterials, headGroup);

    for (const eyeSign of [-1, 1]) {
      const eyeGeo = new THREE.IcosahedronGeometry(0.14, 2);
      const eyeMesh = new THREE.Mesh(eyeGeo);
      eyeMesh.position.set(eyeSign * 0.32, 0.12, 0.25);
      registerPartMesh(eyeMesh, cranialMeta, sapphireMaterials, headGroup);

      const browGeo = new THREE.BoxGeometry(0.28, 0.05, 0.25);
      const browMesh = new THREE.Mesh(browGeo);
      browMesh.position.set(eyeSign * 0.32, 0.22, 0.25);
      browMesh.rotation.z = -eyeSign * 0.3;
      registerPartMesh(browMesh, cranialMeta, brassMaterials, headGroup);
    }

    for (let c = -1; c <= 1; c++) {
      const crestCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(c * 0.12, 0.2, 0),
        new THREE.Vector3(c * 0.18, 0.65, -0.3),
        new THREE.Vector3(c * 0.22, 1.05, -0.7),
      ]);
      const crestGeo = new THREE.TubeGeometry(crestCurve, 16, 0.025, 6, false);
      const crestMesh = new THREE.Mesh(crestGeo);
      registerPartMesh(crestMesh, cranialMeta, goldMaterials, headGroup);
    }

    // -----------------------------------------------------------------
    // 7. DORSAL ARMOR CARAPACE & VENTRAL KEEL
    // -----------------------------------------------------------------
    const dorsalMeta = MECHANICAL_COMPONENTS.find((c) => c.id === 'dorsal_armor_carapace')!;
    const dorsalGroup = new THREE.Group();
    dorsalGroup.position.set(0, 0.85, -0.15);
    creatureRoot.add(dorsalGroup);

    const cowlShape = new THREE.Shape();
    cowlShape.moveTo(0, 1.1);
    cowlShape.bezierCurveTo(0.65, 0.8, 0.75, 0.1, 0.5, -0.8);
    cowlShape.bezierCurveTo(0.2, -1.2, 0, -1.3, 0, -1.3);
    cowlShape.bezierCurveTo(0, -1.3, -0.2, -1.2, -0.5, -0.8);
    cowlShape.bezierCurveTo(-0.75, 0.1, -0.65, 0.8, 0, 1.1);

    const cowlGeo = new THREE.ExtrudeGeometry(cowlShape, {
      depth: 0.22,
      bevelEnabled: true,
      bevelSegments: 3,
      bevelSize: 0.08,
      bevelThickness: 0.08,
    });
    cowlGeo.center();
    const cowlMesh = new THREE.Mesh(cowlGeo);
    cowlMesh.rotation.x = -Math.PI / 2;
    registerPartMesh(cowlMesh, dorsalMeta, ivoryCeramicMaterials, dorsalGroup);

    const dorsalTrimGeo = new THREE.TorusGeometry(0.38, 0.03, 16, 32);
    const dorsalTrim = new THREE.Mesh(dorsalTrimGeo);
    dorsalTrim.rotation.x = Math.PI / 2;
    dorsalTrim.position.set(0, 0.15, 0);
    registerPartMesh(dorsalTrim, dorsalMeta, goldMaterials, dorsalGroup);

    // Ventral Keel & Barrels
    const ventralMeta = MECHANICAL_COMPONENTS.find((c) => c.id === 'ventral_breastplate')!;
    const ventralGroup = new THREE.Group();
    ventralGroup.position.set(0, -0.85, 0.1);
    creatureRoot.add(ventralGroup);

    const keelGeo = new THREE.ConeGeometry(0.75, 1.8, 4);
    const keelMesh = new THREE.Mesh(keelGeo);
    keelMesh.rotation.x = Math.PI / 2;
    keelMesh.rotation.y = Math.PI / 4;
    registerPartMesh(keelMesh, ventralMeta, brassMaterials, ventralGroup);

    for (const [bx, bz] of [
      [-0.4, -0.3],
      [0.4, -0.3],
      [-0.4, 0.3],
      [0.4, 0.3],
    ]) {
      const bGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.35, 16);
      const bMesh = new THREE.Mesh(bGeo);
      bMesh.rotation.z = Math.PI / 2;
      bMesh.position.set(bx, 0, bz);
      registerPartMesh(bMesh, ventralMeta, goldMaterials, ventralGroup);
    }

    // -----------------------------------------------------------------
    // 8. ARTICULATED PRIMARY WINGS & ALULA FEATHERS
    // -----------------------------------------------------------------
    const leftPrimaryMeta = MECHANICAL_COMPONENTS.find((c) => c.id === 'left_primary_wing')!;
    const rightPrimaryMeta = MECHANICAL_COMPONENTS.find((c) => c.id === 'right_primary_wing')!;
    const leftAlulaMeta = MECHANICAL_COMPONENTS.find((c) => c.id === 'left_filigree_feathers')!;
    const rightAlulaMeta = MECHANICAL_COMPONENTS.find((c) => c.id === 'right_filigree_feathers')!;

    const createBladeFeatherGeo = (length: number, width: number) => {
      const fShape = new THREE.Shape();
      fShape.moveTo(0, 0);
      fShape.bezierCurveTo(width * 0.3, length * 0.3, width * 0.9, length * 0.7, width * 0.6, length);
      fShape.bezierCurveTo(width * 0.3, length * 0.95, -width * 0.2, length * 0.7, 0, 0);

      const cutHole = new THREE.Path();
      cutHole.moveTo(width * 0.15, length * 0.35);
      cutHole.bezierCurveTo(width * 0.4, length * 0.5, width * 0.35, length * 0.7, width * 0.2, length * 0.85);
      cutHole.bezierCurveTo(width * 0.05, length * 0.65, 0, length * 0.5, width * 0.15, length * 0.35);
      fShape.holes.push(cutHole);

      return new THREE.ExtrudeGeometry(fShape, {
        depth: 0.035,
        bevelEnabled: true,
        bevelSegments: 2,
        bevelSize: 0.01,
        bevelThickness: 0.01,
      });
    };

    const buildWingAssembly = (
      isLeft: boolean,
      primaryMeta: (typeof MECHANICAL_COMPONENTS)[0],
      alulaMeta: (typeof MECHANICAL_COMPONENTS)[0]
    ) => {
      const sign = isLeft ? -1 : 1;
      const shoulderGroup = new THREE.Group();
      shoulderGroup.position.set(sign * 0.85, 0.4, 0.1);
      creatureRoot.add(shoulderGroup);

      const shoulderBallGeo = new THREE.SphereGeometry(0.32, 16, 16);
      const shoulderBall = new THREE.Mesh(shoulderBallGeo);
      registerPartMesh(shoulderBall, primaryMeta, brassMaterials, shoulderGroup);

      const humerusGeo = new THREE.CylinderGeometry(0.12, 0.15, 1.8, 16);
      const humerusMesh = new THREE.Mesh(humerusGeo);
      humerusMesh.position.set(sign * 0.9, 0.1, 0);
      humerusMesh.rotation.z = -sign * 1.2;
      registerPartMesh(humerusMesh, primaryMeta, titaniumSkeletonMaterials, shoulderGroup);

      const elbowGroup = new THREE.Group();
      elbowGroup.position.set(sign * 1.7, 0.4, 0);
      shoulderGroup.add(elbowGroup);

      const elbowGearGeo = createGearGeometry(0.28, 14, 0.08, 0.06);
      elbowGearGeo.center();
      const elbowGear = new THREE.Mesh(elbowGearGeo);
      elbowGear.rotation.x = Math.PI / 2;
      registerPartMesh(elbowGear, primaryMeta, goldMaterials, elbowGroup);

      const radiusGeo = new THREE.CylinderGeometry(0.08, 0.11, 2.2, 16);
      const radiusMesh = new THREE.Mesh(radiusGeo);
      radiusMesh.position.set(sign * 1.05, 0.1, 0.15);
      radiusMesh.rotation.z = -sign * 1.35;
      registerPartMesh(radiusMesh, primaryMeta, titaniumSkeletonMaterials, elbowGroup);

      const bladeFeathersCount = 8;
      for (let b = 0; b < bladeFeathersCount; b++) {
        const bProg = b / bladeFeathersCount;
        const fLen = 2.4 - bProg * 0.9;
        const fWidth = 0.55 - bProg * 0.15;
        const fGeo = createBladeFeatherGeo(fLen, fWidth);

        const fMesh = new THREE.Mesh(fGeo);
        fMesh.position.set(sign * (0.4 + b * 0.28), 0, -b * 0.15);
        fMesh.rotation.z = -sign * (1.6 + bProg * 0.6);
        fMesh.rotation.x = 0.25;
        fMesh.rotation.y = sign * 0.15;

        const fMat = b % 2 === 0 ? goldMaterials : steelBladeMaterials;
        registerPartMesh(fMesh, primaryMeta, fMat, elbowGroup);
      }

      const alulaGroup = new THREE.Group();
      alulaGroup.position.set(sign * 0.6, 0.35, 0.2);
      elbowGroup.add(alulaGroup);

      for (let a = 0; a < 4; a++) {
        const aLen = 1.3 - a * 0.2;
        const aWidth = 0.35;
        const aGeo = createBladeFeatherGeo(aLen, aWidth);
        const aMesh = new THREE.Mesh(aGeo);
        aMesh.position.set(sign * a * 0.25, 0.1, a * 0.08);
        aMesh.rotation.z = -sign * (1.2 + a * 0.15);
        registerPartMesh(aMesh, alulaMeta, ivoryCeramicMaterials, alulaGroup);
      }

      return { shoulderGroup, elbowGroup };
    };

    const leftWing = buildWingAssembly(true, leftPrimaryMeta, leftAlulaMeta);
    leftWingForeRef.current = leftWing.shoulderGroup;
    leftWingElbowRef.current = leftWing.elbowGroup;

    const rightWing = buildWingAssembly(false, rightPrimaryMeta, rightAlulaMeta);
    rightWingForeRef.current = rightWing.shoulderGroup;
    rightWingElbowRef.current = rightWing.elbowGroup;

    // -----------------------------------------------------------------
    // 9. TALONS & EMPENNAGE TAIL
    // -----------------------------------------------------------------
    const leftTalonMeta = MECHANICAL_COMPONENTS.find((c) => c.id === 'talons_left')!;
    const rightTalonMeta = MECHANICAL_COMPONENTS.find((c) => c.id === 'talons_right')!;

    const buildTalonAssembly = (isLeft: boolean, talonMeta: (typeof MECHANICAL_COMPONENTS)[0]) => {
      const sign = isLeft ? -1 : 1;
      const legGroup = new THREE.Group();
      legGroup.position.set(sign * 0.65, -0.65, -0.7);
      creatureRoot.add(legGroup);

      const femurGeo = new THREE.CylinderGeometry(0.1, 0.12, 0.9, 16);
      const femurMesh = new THREE.Mesh(femurGeo);
      femurMesh.position.set(0, -0.35, 0.1);
      femurMesh.rotation.x = -0.5;
      femurMesh.rotation.z = sign * 0.2;
      registerPartMesh(femurMesh, talonMeta, titaniumSkeletonMaterials, legGroup);

      const kneeGeo = new THREE.SphereGeometry(0.16, 12, 12);
      const kneeMesh = new THREE.Mesh(kneeGeo);
      kneeMesh.position.set(0, -0.75, 0.28);
      registerPartMesh(kneeMesh, talonMeta, brassMaterials, legGroup);

      const shankGeo = new THREE.CylinderGeometry(0.08, 0.09, 0.95, 16);
      const shankMesh = new THREE.Mesh(shankGeo);
      shankMesh.position.set(0, -1.15, -0.05);
      shankMesh.rotation.x = 0.65;
      registerPartMesh(shankMesh, talonMeta, titaniumSkeletonMaterials, legGroup);

      for (let cl = -1; cl <= 1; cl++) {
        const clawCurve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(cl * 0.1, -1.5, -0.2),
          new THREE.Vector3(cl * 0.15, -1.75, 0.05),
          new THREE.Vector3(cl * 0.18, -1.95, -0.15),
        ]);
        const clawGeo = new THREE.TubeGeometry(clawCurve, 12, 0.038, 8, false);
        const clawMesh = new THREE.Mesh(clawGeo);
        registerPartMesh(clawMesh, talonMeta, steelBladeMaterials, legGroup);
      }

      return legGroup;
    };

    talonsLeftRef.current = buildTalonAssembly(true, leftTalonMeta);
    talonsRightRef.current = buildTalonAssembly(false, rightTalonMeta);

    const tailMeta = MECHANICAL_COMPONENTS.find((c) => c.id === 'empennage_tail')!;
    const tailGroup = new THREE.Group();
    tailGroup.position.set(0, -0.2, -3.8);
    creatureRoot.add(tailGroup);
    tailGroupRef.current = tailGroup;

    const tailGearGeo = createGearGeometry(0.34, 16, 0.08, 0.05);
    tailGearGeo.center();
    const tailGearMesh = new THREE.Mesh(tailGearGeo);
    tailGearMesh.rotation.x = Math.PI / 2;
    registerPartMesh(tailGearMesh, tailMeta, goldMaterials, tailGroup);

    for (let t = -3; t <= 3; t++) {
      if (t === 0) continue;
      const angle = (t / 3) * 0.45;
      const tLen = 2.6 - Math.abs(t) * 0.25;
      const tGeo = createBladeFeatherGeo(tLen, 0.45);
      const tMesh = new THREE.Mesh(tGeo);
      tMesh.position.set(Math.sin(angle) * 0.4, 0, -Math.cos(angle) * 0.2);
      tMesh.rotation.y = Math.PI;
      tMesh.rotation.z = angle;
      tMesh.rotation.x = -0.15;
      registerPartMesh(tMesh, tailMeta, t % 2 === 0 ? ivoryCeramicMaterials : goldMaterials, tailGroup);
    }

    // ----------------------------------------------------
    // Raycasting & Smart Double Tap to Focus on Micro-Components
    // ----------------------------------------------------
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let lastTapTime = 0;

    const performFocusOnObject = (targetObj: THREE.Object3D, compId: string) => {
      onSelectPart(compId);

      // Compute bounding box and center in world space
      const box = new THREE.Box3().setFromObject(targetObj);
      const center = new THREE.Vector3();
      box.getCenter(center);
      const size = box.getSize(new THREE.Vector3()).length();

      const direction = camera.position.clone().sub(controls.target).normalize();
      // Position camera at close macro zoom distance (0.8x to 1.5x object size)
      const targetCamPos = center.clone().add(direction.multiplyScalar(Math.max(size * 1.2, 1.4)));

      cameraTransitionRef.current = {
        active: true,
        startPos: camera.position.clone(),
        targetPos: targetCamPos,
        startLook: controls.target.clone(),
        targetLook: center,
        progress: 0,
      };
    };

    // Touch & pointer interaction tracking to distinguish deliberate taps from drags/pinches
    let pointerStartX = 0;
    let pointerStartY = 0;
    let pointerStartTime = 0;

    const onPointerDownTrack = (e: PointerEvent) => {
      pointerStartX = e.clientX;
      pointerStartY = e.clientY;
      pointerStartTime = performance.now();
      triggerInteraction();
    };

    const handlePointerTap = (clientX: number, clientY: number) => {
      triggerInteraction();
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const meshes: THREE.Mesh[] = [];
      componentNodesRef.current.forEach((node) => {
        node.materials.forEach((m) => meshes.push(m.mesh));
      });

      const intersects = raycaster.intersectObjects(meshes, true);
      const now = performance.now();
      const isDoubleTap = now - lastTapTime < 340;
      lastTapTime = now;

      if (intersects.length > 0) {
        const topHit = intersects[0].object;
        const compId = topHit.userData.componentId;
        if (compId) {
          if (isDoubleTap) {
            // Smart Double-Tap to focus camera closely on this micro-component
            performFocusOnObject(topHit, compId);
          } else {
            onSelectPart(compId);
          }
        }
      }
    };

    const onPointerUpTrack = (e: PointerEvent) => {
      const dist = Math.hypot(e.clientX - pointerStartX, e.clientY - pointerStartY);
      const duration = performance.now() - pointerStartTime;
      // Only treat as a tap if movement was small (< 8px) and quick (< 350ms)
      if (dist < 8 && duration < 350) {
        handlePointerTap(e.clientX, e.clientY);
      }
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDownTrack);
    renderer.domElement.addEventListener('pointerup', onPointerUpTrack);

    // Resize handler
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    // ----------------------------------------------------
    // Main Kinematic Animation Loop with Dynamic LOD
    // ----------------------------------------------------
    let animationFrameId: number;
    const clock = new THREE.Clock();
    let flightProgress = 0;
    let telemetryTimer = 0;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const time = clock.getElapsedTime();
      const currentProps = propsRef.current;

      // 1. Camera transition for smart double-tap focus
      if (cameraTransitionRef.current.active) {
        cameraTransitionRef.current.progress += delta * 2.2;
        const t = Math.min(cameraTransitionRef.current.progress, 1.0);
        // Smooth easeInOutCubic
        const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

        camera.position.lerpVectors(cameraTransitionRef.current.startPos, cameraTransitionRef.current.targetPos, ease);
        controls.target.lerpVectors(cameraTransitionRef.current.startLook, cameraTransitionRef.current.targetLook, ease);

        if (t >= 1.0) cameraTransitionRef.current.active = false;
      }

      // 2. Dynamic Level of Detail (LOD) check based on camera distance
      const camDistance = camera.position.distanceTo(controls.target);
      let lodState: 'Macro 4K' | 'High' | 'Standard' = 'Standard';
      if (camDistance < 3.5) lodState = 'Macro 4K';
      else if (camDistance < 8.0) lodState = 'High';

      // Update texture bumpScale based on LOD (more pronounced macro relief at close range)
      if (texturesRef.current) {
        const bumpIntensity = camDistance < 3.5 ? 0.008 : camDistance < 8.0 ? 0.004 : 0.002;
        componentNodesRef.current.forEach((n) => {
          n.materials.forEach((m) => {
            if (m.skinMat instanceof THREE.MeshPhysicalMaterial && m.skinMat.bumpMap) {
              m.skinMat.bumpScale = bumpIntensity;
            }
          });
        });
      }

      // 3. Dynamic flight path
      let currentCreaturePos = new THREE.Vector3(0, 0, 0);
      let calculatedPitch = 0;
      let calculatedRoll = 0;
      let calculatedSpeed = 48.0;

      if (currentProps.flightMode === 'flight_path' && flightPathSplineRef.current && creatureRootRef.current) {
        if (flightPathLineRef.current) flightPathLineRef.current.visible = true;
        if (flightWaypointsGroupRef.current) flightWaypointsGroupRef.current.visible = true;

        const flightSpeed = 0.045 * (currentProps.isFlapping ? currentProps.flapSpeed : 0.8);
        flightProgress = (flightProgress + delta * flightSpeed) % 1.0;

        const pos = flightPathSplineRef.current.getPointAt(flightProgress);
        const tangent = flightPathSplineRef.current.getTangentAt(flightProgress).normalize();

        const lookAheadProgress = (flightProgress + 0.02) % 1.0;
        const nextTangent = flightPathSplineRef.current.getTangentAt(lookAheadProgress).normalize();
        const curvature = tangent.clone().cross(nextTangent).y;
        const bankAngle = THREE.MathUtils.clamp(-curvature * 45.0, -0.65, 0.65);

        creatureRootRef.current.position.copy(pos);
        currentCreaturePos = pos.clone();

        const forward = tangent.clone();
        const up = new THREE.Vector3(0, 1, 0);
        const right = new THREE.Vector3().crossVectors(forward, up).normalize();
        const bankedUp = new THREE.Vector3().crossVectors(right, forward).normalize();
        bankedUp.applyAxisAngle(forward, bankAngle);

        const targetRotMatrix = new THREE.Matrix4().lookAt(pos, pos.clone().add(forward), bankedUp);
        creatureRootRef.current.quaternion.slerp(new THREE.Quaternion().setFromRotationMatrix(targetRotMatrix), 0.1);

        calculatedPitch = Math.round(tangent.y * 57.3);
        calculatedRoll = Math.round(bankAngle * 57.3);
        calculatedSpeed = Math.round(42.0 + Math.abs(tangent.y) * 20.0);

        if (currentProps.cameraFollowMode === 'chase' && cameraRef.current) {
          const chaseOffset = forward.clone().multiplyScalar(-10.0).add(bankedUp.clone().multiplyScalar(4.5));
          cameraRef.current.position.lerp(pos.clone().add(chaseOffset), 0.08);
          controls.target.lerp(pos.clone().add(forward.clone().multiplyScalar(3.0)), 0.12);
        } else if (!cameraTransitionRef.current.active) {
          controls.target.lerp(pos, 0.08);
        }
      } else if (creatureRootRef.current) {
        if (flightPathLineRef.current) flightPathLineRef.current.visible = false;
        if (flightWaypointsGroupRef.current) flightWaypointsGroupRef.current.visible = false;

        creatureRootRef.current.position.lerp(new THREE.Vector3(0, Math.sin(time * 1.5) * 0.12, 0), 0.08);
        const baseQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0));
        creatureRootRef.current.quaternion.slerp(baseQuat, 0.08);

        if (!cameraTransitionRef.current.active && currentProps.selectedPartId === null) {
          controls.target.lerp(new THREE.Vector3(0, 0, 0), 0.08);
        }

        calculatedPitch = Math.round(Math.sin(time * 1.5) * 4);
        calculatedRoll = 0;
        calculatedSpeed = currentProps.isFlapping ? 12 : 0;
      }

      // 4. Controls auto rotate
      controls.autoRotate = currentProps.isAutoRotating && currentProps.cameraFollowMode !== 'chase' && !cameraTransitionRef.current.active;
      controls.autoRotateSpeed = currentProps.rotationSpeed * 2.0;
      controls.update();

      // 5. Extreme anatomical explode interpolation
      componentNodesRef.current.forEach((node) => {
        const targetPos = node.basePosition
          .clone()
          .addScaledVector(node.explodeDirection, node.explodeDistance * currentProps.explodeAmount);
        node.group.position.lerp(targetPos, 0.14);
      });

      // 6. Gear train and micro-gears rotation
      animatedGearsRef.current.forEach((gear) => {
        const gSpeed = gear.speed * delta * (currentProps.isFlapping ? currentProps.flapSpeed * 2.5 : 0.6);
        if (gear.axis === 'x') gear.mesh.rotation.x += gSpeed;
        if (gear.axis === 'y') gear.mesh.rotation.y += gSpeed;
        if (gear.axis === 'z') gear.mesh.rotation.z += gSpeed;
      });

      // 7. Tourbillon & Balance wheel 5 Hz oscillation
      if (tourbillonCageRef.current) tourbillonCageRef.current.rotation.y += delta * 0.45;
      if (balanceWheelRef.current) {
        const balanceOsc = Math.sin(time * 31.4) * 0.85;
        balanceWheelRef.current.rotation.y = balanceOsc;
      }

      // 8. Kinetic Wing Flapping
      if (currentProps.isFlapping) {
        const fSpeed = currentProps.flapSpeed * 4.2;
        const flapAngle = Math.sin(time * fSpeed) * 0.48 + 0.05;
        const elbowFlex = Math.sin(time * fSpeed - 0.4) * 0.32;

        if (leftWingForeRef.current) {
          leftWingForeRef.current.rotation.z = flapAngle;
          leftWingForeRef.current.rotation.x = Math.sin(time * fSpeed * 0.5) * 0.08;
        }
        if (rightWingForeRef.current) {
          rightWingForeRef.current.rotation.z = -flapAngle;
          rightWingForeRef.current.rotation.x = Math.sin(time * fSpeed * 0.5) * 0.08;
        }
        if (leftWingElbowRef.current) leftWingElbowRef.current.rotation.z = elbowFlex;
        if (rightWingElbowRef.current) rightWingElbowRef.current.rotation.z = -elbowFlex;

        const strokePiston = Math.sin(time * fSpeed) * 0.12;
        if (leftPistonPistonRef.current) leftPistonPistonRef.current.position.y = -0.15 + strokePiston;
        if (rightPistonPistonRef.current) rightPistonPistonRef.current.position.y = -0.15 + strokePiston;

        if (headNeckRef.current) headNeckRef.current.rotation.x = -Math.sin(time * fSpeed) * 0.05;
        if (tailGroupRef.current) tailGroupRef.current.rotation.x = -Math.sin(time * fSpeed - 0.6) * 0.15;
      } else {
        if (leftWingForeRef.current) leftWingForeRef.current.rotation.z *= 0.95;
        if (rightWingForeRef.current) rightWingForeRef.current.rotation.z *= 0.95;
        if (leftWingElbowRef.current) leftWingElbowRef.current.rotation.z *= 0.95;
        if (rightWingElbowRef.current) rightWingElbowRef.current.rotation.z *= 0.95;
      }

      const talonTargetAngle = currentProps.flightMode === 'flight_path' ? 0.6 : 0.0;
      if (talonsLeftRef.current) talonsLeftRef.current.rotation.x = THREE.MathUtils.lerp(talonsLeftRef.current.rotation.x, talonTargetAngle, 0.05);
      if (talonsRightRef.current) talonsRightRef.current.rotation.x = THREE.MathUtils.lerp(talonsRightRef.current.rotation.x, talonTargetAngle, 0.05);

      // 9. Telemetry update with LOD & Zoom Level
      telemetryTimer += delta;
      if (telemetryTimer > 0.1 && onTelemetryUpdate) {
        telemetryTimer = 0;
        onTelemetryUpdate({
          airspeedKnots: calculatedSpeed,
          altitudeMeters: Math.round(180 + currentCreaturePos.y * 15.0),
          wingBeatFrequencyHz: currentProps.isFlapping ? parseFloat(((currentProps.flapSpeed * 4.2) / (2 * Math.PI)).toFixed(1)) : 0,
          powerReserveHours: 94.2,
          escapementVph: 36000,
          pitchDegrees: calculatedPitch,
          rollDegrees: calculatedRoll,
          zoomLevel: parseFloat((15.0 / Math.max(camDistance, 0.5)).toFixed(1)),
          lodQuality: lodState,
        });
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (interactionTimeoutRef.current) clearTimeout(interactionTimeoutRef.current);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('pointerdown', onPointerDownTrack);
      renderer.domElement.removeEventListener('pointerup', onPointerUpTrack);
      controls.dispose();
      renderer.dispose();
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [onSelectPart, onTelemetryUpdate]);

  // Handle RenderMode and Highlight updates
  useEffect(() => {
    const mode = renderMode;
    const selectedId = selectedPartId;

    componentNodesRef.current.forEach((node) => {
      const isSelected = node.id === selectedId;

      node.materials.forEach(({ mesh, skinMat, blueprintMat, xrayMat, microAnatomyMat }) => {
        let activeMat: THREE.Material = skinMat;

        if (mode === 'blueprint') activeMat = blueprintMat;
        else if (mode === 'xray') activeMat = xrayMat;
        else if (mode === 'micro_anatomy') activeMat = microAnatomyMat;

        if (isSelected) {
          if (activeMat instanceof THREE.MeshStandardMaterial || activeMat instanceof THREE.MeshPhysicalMaterial) {
            activeMat.emissive = new THREE.Color(0x0284c7);
            activeMat.emissiveIntensity = 0.65;
          }
        } else {
          if (activeMat instanceof THREE.MeshStandardMaterial || activeMat instanceof THREE.MeshPhysicalMaterial) {
            if (mode !== 'xray' && !(node.id === 'micro_wiring_harness' && mode === 'micro_anatomy')) {
              activeMat.emissive = new THREE.Color(0x000000);
              activeMat.emissiveIntensity = 0;
            }
          }
        }

        mesh.material = activeMat;
      });
    });
  }, [renderMode, selectedPartId]);

  return <div ref={containerRef} className="w-full h-full relative cursor-grab active:cursor-grabbing outline-none touch-none" />;
});

ThreeAutomatonCanvas.displayName = 'ThreeAutomatonCanvas';
