import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { ART_COLLECTIONS, ArtworkPrint, ALL_PRINTS } from '../data/artworks';
import {
  Volume2,
  VolumeX,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Eye,
  MapPin,
  Sparkles,
  MousePointer,
  DoorOpen,
  ArrowRight,
  UserCheck,
  Footprints
} from 'lucide-react';

interface Gallery3DProps {
  onSelectArtwork: (artwork: ArtworkPrint) => void;
  onEnterCollection?: (collectionId: string) => void;
  initialCollectionId?: string;
}

export default function Gallery3D({
  onSelectArtwork,
  onEnterCollection,
  initialCollectionId,
}: Gallery3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const radarDotRef = useRef<HTMLDivElement | null>(null);
  const [activeArtwork, setActiveArtwork] = useState<ArtworkPrint | null>(null);
  const [activeCollection, setActiveCollection] = useState(ART_COLLECTIONS[0]);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hoveredPrint, setHoveredPrint] = useState<ArtworkPrint | null>(null);
  const [isAtGate, setIsAtGate] = useState(true);
  const [currentArtworkIndex, setCurrentArtworkIndex] = useState(0);
  // OPTIONAL Face-to-Face toggle - disabled by default so walking is 100% free & unbroken!
  const [isFaceToFaceMode, setIsFaceToFaceMode] = useState(false);

  // State reference - pure, stable, zero camera hijacking, physics-based velocity
  const stateRef = useRef({
    progress: 0.992,
    targetProgress: 0.992,
    hasTarget: false,
    velocity: 0,
    isPointerDown: false,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    mouseNormX: 0,
    mouseNormY: 0,
    keys: new Set<string>(),
    artworkIndex: 0,
    isFaceToFace: false, // controlled explicitly by user, never hijacked automatically!
    activeArtId: '',
    isAtGate: true,
  });

  // Keep stateRef.isFaceToFace synced with isFaceToFaceMode
  useEffect(() => {
    stateRef.current.isFaceToFace = isFaceToFaceMode;
  }, [isFaceToFaceMode]);

  // 36 Curated Artworks placed alternately along Left & Right Walls
  const exhibitionItems = React.useMemo(() => {
    const list: {
      artwork: ArtworkPrint;
      collectionId: string;
      collectionTitle: string;
      wallSide: 'left' | 'right';
      t: number;
    }[] = [];

    const prints = ALL_PRINTS.slice(0, 36);
    const total = prints.length;

    prints.forEach((p, idx) => {
      const t = 0.05 + (idx / total) * 0.9;
      list.push({
        artwork: p,
        collectionId: p.collectionId,
        collectionTitle: p.collectionTitle,
        wallSide: idx % 2 === 0 ? 'right' : 'left',
        t,
      });
    });

    return list;
  }, []);

  // Step walk to next/previous artwork stop
  const stepToArtwork = useCallback((direction: 'next' | 'prev') => {
    const total = exhibitionItems.length;
    let nextIdx: number;

    if (direction === 'next') {
      nextIdx = (stateRef.current.artworkIndex + 1) % total;
    } else {
      nextIdx = (stateRef.current.artworkIndex - 1 + total) % total;
    }

    stateRef.current.artworkIndex = nextIdx;
    setCurrentArtworkIndex(nextIdx);

    const targetItem = exhibitionItems[nextIdx];
    if (targetItem) {
      stateRef.current.targetProgress = targetItem.t;
      stateRef.current.hasTarget = true;
      stateRef.current.velocity = 0;
      setActiveArtwork(targetItem.artwork);
      const col = ART_COLLECTIONS.find((c) => c.id === targetItem.artwork.collectionId);
      if (col) setActiveCollection(col);
      setIsAtGate(false);
    }
  }, [exhibitionItems]);

  // Toggle optional Face-to-Face view
  const toggleFaceToFace = () => {
    setIsFaceToFaceMode((prev) => !prev);
  };

  // Web Audio Ambiance
  const audioContextRef = useRef<AudioContext | null>(null);

  const toggleAudio = useCallback(() => {
    if (!isAudioEnabled) {
      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        const ctx = new AudioCtx();
        audioContextRef.current = ctx;

        const osc = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(55, ctx.currentTime);
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(160, ctx.currentTime);
        gain.gain.setValueAtTime(0.03, ctx.currentTime);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        osc.start();

        setIsAudioEnabled(true);
      } catch {
        setIsAudioEnabled(false);
      }
    } else {
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      setIsAudioEnabled(false);
    }
  }, [isAudioEnabled]);

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      mountRef.current?.parentElement?.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // SCENE SETUP
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f3);
    scene.fog = new THREE.FogExp2(0xf0f0f3, 0.012);

    // CAMERA
    const width = container.clientWidth;
    const height = container.clientHeight;
    const camera = new THREE.PerspectiveCamera(52, width / height, 0.1, 140);

    // RENDERER
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // BALANCED LIGHTING
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.25);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfffaf0, 0.85);
    dirLight.position.set(0, 15, 0);
    scene.add(dirLight);

    // BUILD THE CURVED TUNNEL SPLINE PATH
    const tunnelControlPoints = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(28, 0, 16),
      new THREE.Vector3(60, 0, 0),
      new THREE.Vector3(80, 0, -32),
      new THREE.Vector3(65, 0, -70),
      new THREE.Vector3(22, 0, -88),
      new THREE.Vector3(-22, 0, -88),
      new THREE.Vector3(-65, 0, -70),
      new THREE.Vector3(-80, 0, -32),
      new THREE.Vector3(-60, 0, 0),
      new THREE.Vector3(-28, 0, 16),
    ];

    const tunnelSpline = new THREE.CatmullRomCurve3(
      tunnelControlPoints,
      true,
      'centripetal',
      0.5
    );

    const tunnelHalfWidth = 4.2;
    const tunnelHeight = 5.4;
    const upVector = new THREE.Vector3(0, 1, 0);

    // GENERATE TUNNEL WALLS, FLOOR & CEILING
    const segments = 150;
    const floorPositions: number[] = [];
    const floorIndices: number[] = [];
    const leftWallPositions: number[] = [];
    const leftWallIndices: number[] = [];
    const rightWallPositions: number[] = [];
    const rightWallIndices: number[] = [];
    const ceilingPositions: number[] = [];
    const ceilingIndices: number[] = [];

    for (let i = 0; i <= segments; i++) {
      const t = (i / segments) % 1;
      const pt = tunnelSpline.getPointAt(t);
      const tan = tunnelSpline.getTangentAt(t);
      const norm = new THREE.Vector3().crossVectors(tan, upVector).normalize();

      const leftFloor = pt.clone().sub(norm.clone().multiplyScalar(tunnelHalfWidth));
      const rightFloor = pt.clone().add(norm.clone().multiplyScalar(tunnelHalfWidth));
      const leftCeil = leftFloor.clone().setY(tunnelHeight);
      const rightCeil = rightFloor.clone().setY(tunnelHeight);

      floorPositions.push(leftFloor.x, 0, leftFloor.z);
      floorPositions.push(rightFloor.x, 0, rightFloor.z);

      leftWallPositions.push(leftFloor.x, 0, leftFloor.z);
      leftWallPositions.push(leftCeil.x, tunnelHeight, leftCeil.z);

      rightWallPositions.push(rightFloor.x, 0, rightFloor.z);
      rightWallPositions.push(rightCeil.x, tunnelHeight, rightCeil.z);

      ceilingPositions.push(leftCeil.x, tunnelHeight, leftCeil.z);
      ceilingPositions.push(rightCeil.x, tunnelHeight, rightCeil.z);

      if (i < segments) {
        const v1 = i * 2;
        const v2 = v1 + 1;
        const v3 = (i + 1) * 2;
        const v4 = v3 + 1;

        floorIndices.push(v1, v2, v3, v2, v4, v3);
        leftWallIndices.push(v1, v3, v2, v2, v3, v4);
        rightWallIndices.push(v1, v2, v3, v2, v4, v3);
        ceilingIndices.push(v1, v3, v2, v2, v3, v4);
      }
    }

    // Floor Mesh
    const floorGeo = new THREE.BufferGeometry();
    floorGeo.setAttribute('position', new THREE.Float32BufferAttribute(floorPositions, 3));
    floorGeo.setIndex(floorIndices);
    floorGeo.computeVertexNormals();
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0xe3e3e7,
      roughness: 0.45,
    });
    scene.add(new THREE.Mesh(floorGeo, floorMat));

    // Walls
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0xf5f5f7,
      roughness: 0.95,
      side: THREE.DoubleSide,
    });

    const leftWallGeo = new THREE.BufferGeometry();
    leftWallGeo.setAttribute('position', new THREE.Float32BufferAttribute(leftWallPositions, 3));
    leftWallGeo.setIndex(leftWallIndices);
    leftWallGeo.computeVertexNormals();
    scene.add(new THREE.Mesh(leftWallGeo, wallMat));

    const rightWallGeo = new THREE.BufferGeometry();
    rightWallGeo.setAttribute('position', new THREE.Float32BufferAttribute(rightWallPositions, 3));
    rightWallGeo.setIndex(rightWallIndices);
    rightWallGeo.computeVertexNormals();
    scene.add(new THREE.Mesh(rightWallGeo, wallMat));

    // Ceiling
    const ceilingGeo = new THREE.BufferGeometry();
    ceilingGeo.setAttribute('position', new THREE.Float32BufferAttribute(ceilingPositions, 3));
    ceilingGeo.setIndex(ceilingIndices);
    ceilingGeo.computeVertexNormals();
    const ceilingMat = new THREE.MeshBasicMaterial({ color: 0xfbfbfd, side: THREE.DoubleSide });
    scene.add(new THREE.Mesh(ceilingGeo, ceilingMat));

    // ==========================================
    // 🏛️ GRAND ART-DECORATED MAIN ENTRANCE GATE
    // ==========================================
    const gatePoint = tunnelSpline.getPointAt(0);
    const gateTan = tunnelSpline.getTangentAt(0);
    const grandGateGroup = new THREE.Group();
    grandGateGroup.position.copy(gatePoint);
    grandGateGroup.lookAt(gatePoint.clone().add(gateTan));

    const pillarWidth = 0.85;
    const pillarDepth = 0.85;
    const pillarHeight = tunnelHeight + 0.3;
    const pillarGeo = new THREE.BoxGeometry(pillarWidth, pillarHeight, pillarDepth);
    const pillarMat = new THREE.MeshStandardMaterial({
      color: 0x141416,
      roughness: 0.25,
      metalness: 0.4,
    });

    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      roughness: 0.2,
      metalness: 0.85,
    });

    // Left Pillar
    const leftPillar = new THREE.Mesh(pillarGeo, pillarMat);
    leftPillar.position.set(-tunnelHalfWidth + 0.35, pillarHeight / 2, 0);
    grandGateGroup.add(leftPillar);

    const goldRingGeo = new THREE.BoxGeometry(pillarWidth + 0.1, 0.15, pillarDepth + 0.1);
    const leftGoldCapital = new THREE.Mesh(goldRingGeo, goldMat);
    leftGoldCapital.position.set(-tunnelHalfWidth + 0.35, pillarHeight - 0.15, 0);
    grandGateGroup.add(leftGoldCapital);

    // Right Pillar
    const rightPillar = new THREE.Mesh(pillarGeo, pillarMat);
    rightPillar.position.set(tunnelHalfWidth - 0.35, pillarHeight / 2, 0);
    grandGateGroup.add(rightPillar);

    const rightGoldCapital = new THREE.Mesh(goldRingGeo, goldMat);
    rightGoldCapital.position.set(tunnelHalfWidth - 0.35, pillarHeight - 0.15, 0);
    grandGateGroup.add(rightGoldCapital);

    // Lintel Archway
    const archSpan = tunnelHalfWidth * 2 - 0.2;
    const lintelHeight = 1.35;
    const lintelGeo = new THREE.BoxGeometry(archSpan, lintelHeight, 0.65);
    const lintelMesh = new THREE.Mesh(lintelGeo, pillarMat);
    lintelMesh.position.set(0, tunnelHeight - lintelHeight / 2 + 0.15, 0);
    grandGateGroup.add(lintelMesh);

    // Lintel Banner Canvas
    const gateBannerCanvas = document.createElement('canvas');
    gateBannerCanvas.width = 1024;
    gateBannerCanvas.height = 256;
    const gctx = gateBannerCanvas.getContext('2d');
    if (gctx) {
      gctx.fillStyle = '#0f0f11';
      gctx.fillRect(0, 0, 1024, 256);
      gctx.strokeStyle = '#d4af37';
      gctx.lineWidth = 6;
      gctx.strokeRect(12, 12, 1000, 232);
      gctx.strokeRect(20, 20, 984, 216);

      gctx.fillStyle = '#f8f8fa';
      gctx.font = '900 38px -apple-system, sans-serif';
      gctx.textAlign = 'center';
      gctx.letterSpacing = '8px';
      gctx.fillText('SHUTABUG ART GALLERY', 512, 98);

      gctx.fillStyle = '#d4af37';
      gctx.font = '700 22px -apple-system, sans-serif';
      gctx.letterSpacing = '6px';
      gctx.fillText('MAYOWA ALABI • THE 2026 RETROSPECTIVE', 512, 148);

      gctx.fillStyle = '#a1a1aa';
      gctx.font = '600 16px -apple-system, sans-serif';
      gctx.letterSpacing = '4px';
      gctx.fillText('ENTER THE CORRIDOR TO EXPERIENCE ORIGINAL ARCHIVAL PRINTS', 512, 192);
    }

    const gateBannerTex = new THREE.CanvasTexture(gateBannerCanvas);
    const gateBannerGeo = new THREE.PlaneGeometry(archSpan - 0.4, lintelHeight - 0.25);
    const gateBannerMat = new THREE.MeshBasicMaterial({ map: gateBannerTex });

    const frontBannerMesh = new THREE.Mesh(gateBannerGeo, gateBannerMat);
    frontBannerMesh.position.set(0, tunnelHeight - lintelHeight / 2 + 0.15, -0.34);
    frontBannerMesh.rotation.y = Math.PI;
    grandGateGroup.add(frontBannerMesh);

    // Velvet carpet
    const carpetGeo = new THREE.PlaneGeometry(3.6, 12);
    const carpetMat = new THREE.MeshStandardMaterial({
      color: 0x881337,
      roughness: 0.9,
    });
    const carpetMesh = new THREE.Mesh(carpetGeo, carpetMat);
    carpetMesh.rotation.x = -Math.PI / 2;
    carpetMesh.position.set(0, 0.015, 2.5);
    grandGateGroup.add(carpetMesh);

    scene.add(grandGateGroup);

    // STATIC CLICK TARGET ARRAY
    const clickableMeshes: THREE.Mesh[] = [];
    const paintingPositions: { pos: THREE.Vector3; wallSide: 'left' | 'right'; t: number; index: number }[] = [];
    const textureLoader = new THREE.TextureLoader();

    const frameGeo = new THREE.BoxGeometry(2.35, 3.15, 0.08);
    const frameMat = new THREE.MeshBasicMaterial({ color: 0x18181b });
    const matGeo = new THREE.PlaneGeometry(2.22, 3.02);
    const matMat = new THREE.MeshBasicMaterial({ color: 0xfdfdfd });
    const artGeo = new THREE.PlaneGeometry(2.1, 2.9);
    const plaqueGeo = new THREE.PlaneGeometry(0.85, 0.42);

    const createPlaqueTexture = (title: string, colTitle: string) => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#f8f8fa';
        ctx.fillRect(0, 0, 512, 256);
        ctx.strokeStyle = '#dcdce0';
        ctx.lineWidth = 4;
        ctx.strokeRect(4, 4, 504, 248);

        ctx.fillStyle = '#18181b';
        ctx.font = 'bold 26px -apple-system, sans-serif';
        ctx.fillText(title.slice(0, 24).toUpperCase(), 28, 64);

        ctx.fillStyle = '#71717a';
        ctx.font = '20px -apple-system, sans-serif';
        ctx.fillText('MAYOWA ALABI (SHUTABUG)', 28, 108);

        ctx.fillStyle = '#a1a1aa';
        ctx.font = '18px -apple-system, sans-serif';
        ctx.fillText(`Series: ${colTitle}`, 28, 148);
        ctx.fillText('Fine Art Archival Print • 2026', 28, 184);

        ctx.fillStyle = '#18181b';
        ctx.font = 'bold 22px -apple-system, sans-serif';
        ctx.fillText('From $50.00 • Inquire / Buy →', 28, 224);
      }
      return new THREE.CanvasTexture(canvas);
    };

    // POPULATE PAINTINGS ON LEFT AND RIGHT WALLS
    exhibitionItems.forEach((item, index) => {
      const { artwork, wallSide, t } = item;
      const pt = tunnelSpline.getPointAt(t);
      const tan = tunnelSpline.getTangentAt(t);
      const norm = new THREE.Vector3().crossVectors(tan, upVector).normalize();

      const group = new THREE.Group();

      const frameMesh = new THREE.Mesh(frameGeo, frameMat);
      group.add(frameMesh);

      const matMesh = new THREE.Mesh(matGeo, matMat);
      matMesh.position.z = 0.041;
      group.add(matMesh);

      const artMat = new THREE.MeshBasicMaterial({ color: 0xeeeeee });
      textureLoader.load(
        artwork.src,
        (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace;
          artMat.color.set(0xffffff);
          artMat.map = tex;
          artMat.needsUpdate = true;
        },
        undefined,
        () => {}
      );

      const artMesh = new THREE.Mesh(artGeo, artMat);
      artMesh.position.z = 0.043;
      artMesh.userData = { artwork, index, t };
      group.add(artMesh);
      clickableMeshes.push(artMesh);

      const plaqueMat = new THREE.MeshBasicMaterial({
        map: createPlaqueTexture(artwork.title, artwork.collectionTitle),
      });
      const plaqueMesh = new THREE.Mesh(plaqueGeo, plaqueMat);
      plaqueMesh.position.set(1.15 + 0.85 / 2 + 0.15, -0.9, 0.01);
      group.add(plaqueMesh);

      const wallOffset = wallSide === 'right' ? tunnelHalfWidth - 0.08 : -tunnelHalfWidth + 0.08;
      const pos = pt.clone().add(norm.clone().multiplyScalar(wallOffset));
      pos.y = 2.1;
      group.position.copy(pos);

      paintingPositions.push({ pos, wallSide, t, index });

      const inwardNormal = wallSide === 'right' ? norm.clone().negate() : norm.clone();
      const lookTarget = pos.clone().add(inwardNormal);
      group.lookAt(lookTarget);

      scene.add(group);
    });

    // RAYCASTER
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    // 100% UNBROKEN, FLUID VIDEO-GAME MOUSE & WALKING CONTROLS
    const onMouseDown = (e: MouseEvent) => {
      if ((e.target as HTMLElement)?.closest('button')) return;
      stateRef.current.isPointerDown = true;
      stateRef.current.startX = e.clientX;
      stateRef.current.startY = e.clientY;
      stateRef.current.lastX = e.clientX;
      stateRef.current.lastY = e.clientY;
      stateRef.current.hasTarget = false;
      container.style.cursor = 'grabbing';
    };

    const onMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const normX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const normY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      pointer.x = normX;
      pointer.y = normY;

      // Natural, pleasant mouse look glance (normX > 0 looks right, normY > 0 looks up)
      stateRef.current.mouseNormX = normX;
      stateRef.current.mouseNormY = normY;

      if (stateRef.current.isPointerDown) {
        const deltaX = e.clientX - stateRef.current.lastX;
        const deltaY = e.clientY - stateRef.current.lastY;
        stateRef.current.lastX = e.clientX;
        stateRef.current.lastY = e.clientY;

        // Moving mouse/dragging automatically exits face-to-face mode if active
        if (stateRef.current.isFaceToFace && (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4)) {
          stateRef.current.isFaceToFace = false;
          setIsFaceToFaceMode(false);
        }

        // Dragging UP (-deltaY) pushes you FORWARD along the corridor!
        // Dragging DOWN (+deltaY) pulls you BACKWARD!
        // Dragging LEFT/RIGHT also walks/pans!
        const forwardPush = -deltaY * 0.00028 - deltaX * 0.00018;
        stateRef.current.velocity += forwardPush;
        stateRef.current.hasTarget = false;
      }
    };

    const onMouseUp = () => {
      stateRef.current.isPointerDown = false;
      container.style.cursor = 'grab';
    };

    // Scroll wheel / touchpad = fluid, unbroken walk forward / backward with smooth inertia
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (stateRef.current.isFaceToFace) {
        stateRef.current.isFaceToFace = false;
        setIsFaceToFaceMode(false);
      }
      stateRef.current.hasTarget = false;

      // In browser wheel: scrolling down has positive deltaY
      // Normalize wheel delta for mouse wheels (+/-100) vs smooth trackpads (+/-5)
      const rawDelta = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      const normalizedDelta = Math.sign(rawDelta) * Math.min(Math.abs(rawDelta), 100);

      // Scroll forward pushes velocity forward
      stateRef.current.velocity += normalizedDelta * 0.000045;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      stateRef.current.keys.add(e.code);

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        stepToArtwork('prev');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        stepToArtwork('next');
      } else if (e.key === 'Enter' || e.key === 'Space') {
        if (activeArtwork) {
          onSelectArtwork(activeArtwork);
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      stateRef.current.keys.delete(e.code);
    };

    const onClick = (e: MouseEvent) => {
      if (
        Math.hypot(e.clientX - stateRef.current.startX, e.clientY - stateRef.current.startY) > 8
      )
        return;

      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(clickableMeshes, false);

      if (hits.length > 0) {
        const hit = hits[0].object;
        if (hit.userData?.artwork && typeof hit.userData.index === 'number') {
          const idx = hit.userData.index;
          stateRef.current.artworkIndex = idx;
          stateRef.current.targetProgress = hit.userData.t;
          stateRef.current.hasTarget = true;
          stateRef.current.velocity = 0;
          setCurrentArtworkIndex(idx);
          onSelectArtwork(hit.userData.artwork);
          return;
        }
      }

      // If clicked on open corridor / floor: walk forward a step!
      stateRef.current.velocity += 0.0035;
      stateRef.current.hasTarget = false;
    };

    let touchStartX = 0;
    let touchStartY = 0;
    const onTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      stateRef.current.hasTarget = false;
    };
    const onTouchMove = (e: TouchEvent) => {
      const deltaX = touchStartX - e.touches[0].clientX;
      const deltaY = touchStartY - e.touches[0].clientY;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      if (stateRef.current.isFaceToFace) {
        stateRef.current.isFaceToFace = false;
        setIsFaceToFaceMode(false);
      }
      stateRef.current.velocity += deltaY * 0.0003 + deltaX * 0.0003;
    };

    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    container.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    container.addEventListener('click', onClick);
    container.addEventListener('touchstart', onTouchStart, { passive: true });
    container.addEventListener('touchmove', onTouchMove, { passive: true });

    if (initialCollectionId) {
      const foundIdx = exhibitionItems.findIndex(
        (it) => it.artwork.collectionId === initialCollectionId
      );
      if (foundIdx !== -1) {
        stateRef.current.artworkIndex = foundIdx;
        stateRef.current.targetProgress = exhibitionItems[foundIdx].t;
        stateRef.current.hasTarget = true;
        stateRef.current.velocity = 0;
        setCurrentArtworkIndex(foundIdx);
      }
    }

    // ANIMATION LOOP - 100% UNBROKEN, FREE WALKING WITH PHYSICS VELOCITY
    let animationFrameId: number;
    let lastRaycastTime = 0;

    const smoothLookTarget = new THREE.Vector3();

    const animate = (timestamp: number) => {
      animationFrameId = requestAnimationFrame(animate);

      const keys = stateRef.current.keys;
      const isShift = keys.has('ShiftLeft') || keys.has('ShiftRight');

      if (keys.has('KeyW') || keys.has('ArrowUp')) {
        if (stateRef.current.isFaceToFace) {
          stateRef.current.isFaceToFace = false;
          setIsFaceToFaceMode(false);
        }
        stateRef.current.velocity += isShift ? 0.0007 : 0.00035;
        stateRef.current.hasTarget = false;
      }
      if (keys.has('KeyS') || keys.has('ArrowDown')) {
        if (stateRef.current.isFaceToFace) {
          stateRef.current.isFaceToFace = false;
          setIsFaceToFaceMode(false);
        }
        stateRef.current.velocity -= isShift ? 0.0007 : 0.00035;
        stateRef.current.hasTarget = false;
      }

      // Shortest cyclic path if navigating to a specific target artwork
      if (stateRef.current.hasTarget) {
        let diff = stateRef.current.targetProgress - stateRef.current.progress;
        while (diff > 0.5) diff -= 1;
        while (diff < -0.5) diff += 1;

        if (Math.abs(diff) < 0.0004) {
          stateRef.current.progress = stateRef.current.targetProgress;
          stateRef.current.hasTarget = false;
        } else {
          stateRef.current.progress += diff * 0.12;
        }
      } else {
        // Free fluid walking with smooth friction decay
        stateRef.current.velocity = Math.max(-0.012, Math.min(0.012, stateRef.current.velocity));
        stateRef.current.progress += stateRef.current.velocity;
        stateRef.current.velocity *= 0.88;
        if (Math.abs(stateRef.current.velocity) < 0.000005) {
          stateRef.current.velocity = 0;
        }
      }

      // Always normalize progress strictly between 0 and 1
      stateRef.current.progress = ((stateRef.current.progress % 1) + 1) % 1;
      const p = stateRef.current.progress;

      // Update radar without React re-render overhead
      if (radarDotRef.current) {
        radarDotRef.current.style.transform = `rotate(${p * 360}deg) translate(9px) rotate(-${p * 360}deg)`;
      }

      // Check gate state only on change
      const atGate = p < 0.04 || p > 0.965;
      if (atGate !== stateRef.current.isAtGate) {
        stateRef.current.isAtGate = atGate;
        setIsAtGate(atGate);
      }

      // CAMERA POSITION (Stays smoothly in corridor centerline at eye-level)
      const eyeHeight = 2.0;
      const camPos = tunnelSpline.getPointAt(p);
      camPos.y = eyeHeight;
      camera.position.copy(camPos);

      // CAMERA GAZE
      const forwardTangent = tunnelSpline.getTangentAt(p);
      const corridorNormal = new THREE.Vector3()
        .crossVectors(forwardTangent, upVector)
        .normalize();

      // Find closest artwork stop
      let closestItem = exhibitionItems[0];
      let closestIdx = 0;
      let minDiff = 1;

      exhibitionItems.forEach((item, idx) => {
        let diff = Math.abs(item.t - p);
        if (diff > 0.5) diff = 1 - diff;
        if (diff < minDiff) {
          minDiff = diff;
          closestItem = item;
          closestIdx = idx;
        }
      });

      // Default: 100% Free corridor look, follows user's mouse
      const forwardLookTarget = camPos
        .clone()
        .add(forwardTangent.clone().multiplyScalar(12.0));

      // Natural mouse look: move mouse right -> look right, move mouse left -> look left
      forwardLookTarget.add(
        corridorNormal.clone().multiplyScalar(stateRef.current.mouseNormX * 3.5)
      );
      forwardLookTarget.y += stateRef.current.mouseNormY * 1.0;

      let targetGazePoint = forwardLookTarget;

      // ONLY if user explicitly enabled Face-to-Face mode, look directly at the painting
      if (stateRef.current.isFaceToFace && !atGate) {
        const artStop = paintingPositions[closestIdx];
        if (artStop) {
          targetGazePoint = artStop.pos.clone();
        }
      }

      smoothLookTarget.lerp(targetGazePoint, 0.12);
      camera.lookAt(smoothLookTarget);

      // Throttled raycasting for hover
      if (timestamp - lastRaycastTime > 90) {
        lastRaycastTime = timestamp;
        raycaster.setFromCamera(pointer, camera);
        const hits = raycaster.intersectObjects(clickableMeshes, false);

        if (hits.length > 0 && hits[0].object.userData?.artwork) {
          setHoveredPrint(hits[0].object.userData.artwork);
          if (!stateRef.current.isPointerDown) {
            container.style.cursor = 'pointer';
          }
        } else {
          setHoveredPrint(null);
          if (!stateRef.current.isPointerDown) {
            container.style.cursor = 'grab';
          }
        }
      }

      // Update active artwork card only when artwork actually changes
      if (closestItem && closestItem.artwork.id !== stateRef.current.activeArtId) {
        stateRef.current.activeArtId = closestItem.artwork.id;
        stateRef.current.artworkIndex = closestIdx;
        setActiveArtwork(closestItem.artwork);
        setCurrentArtworkIndex(closestIdx);
        const col = ART_COLLECTIONS.find(
          (c) => c.id === closestItem.artwork.collectionId
        );
        if (col) setActiveCollection(col);
      }

      renderer.render(scene, camera);
    };

    animationFrameId = requestAnimationFrame(animate);

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      container.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      container.removeEventListener('click', onClick);
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('resize', onResize);

      scene.clear();
      renderer.dispose();
      floorGeo.dispose();
      floorMat.dispose();
      leftWallGeo.dispose();
      rightWallGeo.dispose();
      wallMat.dispose();
      ceilingGeo.dispose();
      ceilingMat.dispose();
      frameGeo.dispose();
      frameMat.dispose();
      matGeo.dispose();
      matMat.dispose();
      artGeo.dispose();
      plaqueGeo.dispose();
      pillarGeo.dispose();
      pillarMat.dispose();
      goldMat.dispose();
      carpetGeo.dispose();
      carpetMat.dispose();
    };
  }, [exhibitionItems, onSelectArtwork, initialCollectionId, activeArtwork?.id, stepToArtwork]);

  const jumpToCollection = (colId: string) => {
    const itemIdx = exhibitionItems.findIndex((it) => it.artwork.collectionId === colId);
    if (itemIdx !== -1) {
      stateRef.current.artworkIndex = itemIdx;
      stateRef.current.targetProgress = exhibitionItems[itemIdx].t;
      stateRef.current.hasTarget = true;
      stateRef.current.velocity = 0;
      setCurrentArtworkIndex(itemIdx);
      if (stateRef.current.isFaceToFace) {
        stateRef.current.isFaceToFace = false;
        setIsFaceToFaceMode(false);
      }
    }
  };

  const walkThroughGate = () => {
    stateRef.current.targetProgress = 0.05;
    stateRef.current.hasTarget = true;
    stateRef.current.velocity = 0;
    if (stateRef.current.isFaceToFace) {
      stateRef.current.isFaceToFace = false;
      setIsFaceToFaceMode(false);
    }
  };

  return (
    <div className='relative w-full h-[90vh] min-h-[640px] overflow-hidden select-none bg-[#f0f0f3] cursor-grab active:cursor-grabbing'>
      {/* 3D WebGL Canvas */}
      <div ref={mountRef} className='w-full h-full' />

      {/* TOP CONTROLS: Collection Tabs & Return to Gate */}
      <div className='absolute top-4 left-0 right-0 z-20 flex items-center justify-between px-6 pointer-events-none'>
        <div className='pointer-events-auto flex items-center gap-2 overflow-x-auto py-1 max-w-[70vw] no-scrollbar'>
          <button
            onClick={() => {
              stateRef.current.targetProgress = 0.992;
              stateRef.current.hasTarget = true;
              stateRef.current.velocity = 0;
              setIsFaceToFaceMode(false);
            }}
            className='px-3.5 py-1.5 text-xs uppercase tracking-wider font-bold rounded-full bg-amber-500 hover:bg-amber-600 text-white shadow-md transition-all flex items-center gap-1.5 whitespace-nowrap'
          >
            <DoorOpen size={13} />
            <span>Main Gate</span>
          </button>

          {ART_COLLECTIONS.slice(0, 8).map((col) => {
            const isSelected = !isAtGate && activeCollection?.id === col.id;
            return (
              <button
                key={col.id}
                onClick={() => jumpToCollection(col.id)}
                className={`px-3.5 py-1.5 text-xs uppercase tracking-wider font-semibold rounded-full backdrop-blur-md transition-all duration-300 whitespace-nowrap ${
                  isSelected
                    ? 'bg-zinc-900 text-white shadow-md'
                    : 'bg-white/80 text-zinc-700 hover:bg-white hover:text-black border border-zinc-200/80'
                }`}
              >
                {col.title}
              </button>
            );
          })}
        </div>

        {/* Audio & Fullscreen Buttons */}
        <div className='pointer-events-auto flex items-center gap-2'>
          <button
            onClick={toggleAudio}
            className='p-2.5 rounded-full bg-white/85 hover:bg-white text-zinc-700 hover:text-black shadow-sm border border-zinc-200/80 backdrop-blur-md transition-all'
            title={isAudioEnabled ? 'Mute Gallery Sound' : 'Enable Gallery Sound'}
          >
            {isAudioEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
          <button
            onClick={handleFullscreen}
            className='p-2.5 rounded-full bg-white/85 hover:bg-white text-zinc-700 hover:text-black shadow-sm border border-zinc-200/80 backdrop-blur-md transition-all'
            title='Toggle Fullscreen'
          >
            <Maximize2 size={16} />
          </button>
        </div>
      </div>

      {/* 🎯 "<" AND ">" BUTTONS: WALK SMOOTHLY FORWARD AND BACKWARD */}
      <button
        onClick={() => stepToArtwork('prev')}
        className='absolute left-4 top-1/2 -translate-y-1/2 z-30 p-3.5 rounded-full bg-white/90 hover:bg-white text-zinc-900 shadow-xl border border-zinc-300 backdrop-blur-md transition-all hover:scale-110 active:scale-95 group'
        title='Walk Backward Along Corridor'
        aria-label='Walk Backward'
      >
        <ChevronLeft size={24} className='group-hover:-translate-x-0.5 transition-transform' />
      </button>

      <button
        onClick={() => stepToArtwork('next')}
        className='absolute right-4 top-1/2 -translate-y-1/2 z-30 p-3.5 rounded-full bg-white/90 hover:bg-white text-zinc-900 shadow-xl border border-zinc-300 backdrop-blur-md transition-all hover:scale-110 active:scale-95 group'
        title='Walk Forward Along Corridor'
        aria-label='Walk Forward'
      >
        <ChevronRight size={24} className='group-hover:translate-x-0.5 transition-transform' />
      </button>

      {/* HOVER TOOLTIP */}
      {hoveredPrint && (
        <div className='pointer-events-none absolute bottom-32 left-1/2 -translate-x-1/2 z-30 bg-zinc-950/90 text-white px-4 py-2 rounded-full backdrop-blur-md shadow-2xl text-xs flex items-center gap-2 border border-white/10 animate-fade-in'>
          <Eye size={14} className='text-amber-400' />
          <span>
            Click to inspect:{' '}
            <strong className='font-semibold'>{hoveredPrint.title}</strong>
          </span>
          <span className='text-zinc-400'>• From ${hoveredPrint.basePrice}</span>
        </div>
      )}

      {/* BOTTOM CENTER: "YOU ARE WALKING PAST" WITH OPTIONAL FACE-TO-FACE TOGGLE */}
      <div className='absolute bottom-6 left-0 right-0 z-20 flex flex-col items-center justify-center pointer-events-none text-center px-4'>
        {isAtGate ? (
          /* ENTRANCE GATE CARD */
          <div className='pointer-events-auto flex flex-col items-center bg-zinc-950/92 text-white backdrop-blur-md px-8 py-4 rounded-2xl shadow-2xl border border-amber-500/40 transition-all hover:border-amber-500'>
            <div className='text-[10px] uppercase tracking-[0.25em] text-amber-400 font-bold mb-1 flex items-center gap-1.5'>
              <Sparkles size={12} className='text-amber-400' />
              <span>Grand Exhibition Portal</span>
            </div>

            <h2 className='text-xl sm:text-2xl font-black uppercase tracking-tight text-white'>
              Shutabug Gallery Main Gate
            </h2>

            <p className='text-xs text-zinc-300 font-medium mt-1 max-w-md'>
              Scroll or drag your mouse to walk freely through the grand entrance gate into the corridor exhibition.
            </p>

            <button
              onClick={walkThroughGate}
              className='mt-3 px-6 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black uppercase tracking-wider rounded-full shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2'
            >
              <span>Step Through The Gate</span>
              <ArrowRight size={14} />
            </button>
          </div>
        ) : (
          /* ACTIVE ARTWORK CARD WITH OPTIONAL FACE-TO-FACE BUTTON */
          <div className='pointer-events-auto flex flex-col items-center bg-white/92 backdrop-blur-md px-8 py-3.5 rounded-2xl shadow-xl border border-zinc-200/90 transition-all hover:shadow-2xl'>
            <div className='flex items-center gap-2 mb-0.5'>
              <span className='text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-bold flex items-center gap-1'>
                <Sparkles size={11} className='text-amber-500' />
                <span>You Are Walking Past</span>
              </span>
            </div>

            <h2 className='text-xl sm:text-2xl font-black uppercase tracking-tight text-zinc-900'>
              {activeArtwork?.title || activeCollection?.title || 'Exhibition Corridor'}
            </h2>

            {activeArtwork && (
              <p className='text-xs text-zinc-600 font-medium mt-0.5'>
                Series:{' '}
                <span className='text-zinc-900 font-semibold'>
                  {activeArtwork.collectionTitle}
                </span>{' '}
                • {activeArtwork.artist} • Artwork {currentArtworkIndex + 1} of {exhibitionItems.length}
              </p>
            )}

            <div className='flex items-center gap-2.5 mt-2.5'>
              {/* Optional Face-to-Face view toggle */}
              <button
                onClick={toggleFaceToFace}
                className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-all flex items-center gap-1.5 ${
                  isFaceToFaceMode
                    ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                    : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border-zinc-200'
                }`}
                title='Optional: look directly at painting face-to-face'
              >
                {isFaceToFaceMode ? <Footprints size={13} /> : <UserCheck size={13} />}
                <span>{isFaceToFaceMode ? 'Free Walk View' : 'Face-to-Face View'}</span>
              </button>

              <button
                onClick={() => activeArtwork && onSelectArtwork(activeArtwork)}
                className='px-4 py-1.5 bg-zinc-900 text-white hover:bg-black text-xs font-semibold uppercase tracking-wider rounded-full shadow-sm hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5'
              >
                <span>Inquire & Buy Print</span>
                <span className='text-amber-400'>
                  ${activeArtwork?.basePrice || 50}
                </span>
              </button>

              {onEnterCollection && activeCollection && (
                <button
                  onClick={() => onEnterCollection(activeCollection.id)}
                  className='text-xs font-semibold text-zinc-700 hover:text-black tracking-wide underline underline-offset-4 hidden sm:inline-block'
                >
                  Collection ({activeCollection.count}) →
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM RIGHT: SMOOTH INSTRUCTIONS & RADAR */}
      <div className='absolute bottom-6 right-6 z-20 hidden sm:flex items-center gap-3 pointer-events-none text-zinc-600 bg-white/85 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-zinc-200/80 shadow-md'>
        <div className='relative w-7 h-7 rounded-full border-2 border-zinc-300 flex items-center justify-center'>
          <div
            ref={radarDotRef}
            className='absolute w-2 h-2 rounded-full bg-amber-500 shadow-sm transition-transform duration-75'
            style={{
              transform: 'rotate(0deg) translate(9px) rotate(0deg)',
            }}
          />
          <MapPin size={10} className='text-zinc-400' />
        </div>

        <div className='text-left'>
          <div className='text-[10px] font-bold uppercase tracking-wider text-zinc-800 flex items-center gap-1.5'>
            <MousePointer size={11} className='text-zinc-600' />
            <span>Scroll or Drag to Walk Freely</span>
          </div>
          <div className='text-[9px] text-zinc-500'>
            Mouse aims your gaze freely • Face-to-Face is optional
          </div>
        </div>
      </div>
    </div>
  );
}
