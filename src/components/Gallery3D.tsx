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
  Compass
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
  const [activeArtwork, setActiveArtwork] = useState<ArtworkPrint | null>(null);
  const [activeCollection, setActiveCollection] = useState(ART_COLLECTIONS[0]);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hoveredPrint, setHoveredPrint] = useState<ArtworkPrint | null>(null);
  const [currentProgressPct, setCurrentProgressPct] = useState(0);
  const [isAtGate, setIsAtGate] = useState(true);
  const [isFaceToFace, setIsFaceToFace] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Motion and Camera state
  const stateRef = useRef({
    progress: 0.992,
    targetProgress: 0.992,
    isPointerDown: false,
    startX: 0,
    lastX: 0,
    mouseNormX: 0,
    mouseNormY: 0,
    keys: new Set<string>(),
    viewMode: 'corridor' as 'corridor' | 'face-to-face',
    blendFactor: 0, // 0 = corridor, 1 = face-to-face
    faceCamPos: new THREE.Vector3(),
    faceLookTarget: new THREE.Vector3(),
    artworkIndex: 0,
  });

  // Exhibition artworks distributed on Left & Right Walls
  const exhibitionItems = React.useMemo(() => {
    const list: {
      artwork: ArtworkPrint;
      collectionId: string;
      collectionTitle: string;
      wallSide: 'left' | 'right';
      t: number;
      artPos: THREE.Vector3;
      inwardNorm: THREE.Vector3;
    }[] = [];

    const prints = ALL_PRINTS.slice(0, 36);
    const total = prints.length;

    // Spline reference for precomputing positions
    const pts = [
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
    const spline = new THREE.CatmullRomCurve3(pts, true, 'centripetal', 0.5);
    const up = new THREE.Vector3(0, 1, 0);
    const tunnelHalfWidth = 4.0;

    prints.forEach((p, idx) => {
      const t = 0.05 + (idx / total) * 0.9;
      const pt = spline.getPointAt(t);
      const tan = spline.getTangentAt(t);
      const norm = new THREE.Vector3().crossVectors(tan, up).normalize();
      const wallSide: 'left' | 'right' = idx % 2 === 0 ? 'right' : 'left';

      const wallOffset = wallSide === 'right' ? tunnelHalfWidth - 0.08 : -tunnelHalfWidth + 0.08;
      const artPos = pt.clone().add(norm.clone().multiplyScalar(wallOffset));
      artPos.y = 2.1; // Museum eye level

      const inwardNorm = wallSide === 'right' ? norm.clone().negate() : norm.clone();

      list.push({
        artwork: p,
        collectionId: p.collectionId,
        collectionTitle: p.collectionTitle,
        wallSide,
        t,
        artPos,
        inwardNorm,
      });
    });

    return list;
  }, []);

  // Set up Face-to-Face target for a specific artwork index
  const setFaceToFaceTarget = useCallback((index: number) => {
    const item = exhibitionItems[index];
    if (!item) return;

    stateRef.current.artworkIndex = index;
    stateRef.current.viewMode = 'face-to-face';
    stateRef.current.targetProgress = item.t;

    // Optimal standing spot in front of the artwork:
    // Stand 3.2 units away along the inward normal vector, directly facing the canvas
    const viewingDistance = 3.2;
    stateRef.current.faceCamPos.copy(
      item.artPos.clone().add(item.inwardNorm.clone().multiplyScalar(viewingDistance))
    );
    // Eye height of viewer matches center of painting
    stateRef.current.faceCamPos.y = 2.1;

    // Look target is the exact center of the artwork canvas
    stateRef.current.faceLookTarget.copy(item.artPos);

    setActiveArtwork(item.artwork);
    const col = ART_COLLECTIONS.find((c) => c.id === item.artwork.collectionId);
    if (col) setActiveCollection(col);

    setIsFaceToFace(true);
    setCurrentIndex(index);
    setIsAtGate(false);
  }, [exhibitionItems]);

  // Handle "<" (Previous Artwork Face-to-Face)
  const handlePrevFaceToFace = useCallback(() => {
    const total = exhibitionItems.length;
    const newIdx = (stateRef.current.artworkIndex - 1 + total) % total;
    setFaceToFaceTarget(newIdx);
  }, [exhibitionItems.length, setFaceToFaceTarget]);

  // Handle ">" (Next Artwork Face-to-Face)
  const handleNextFaceToFace = useCallback(() => {
    const total = exhibitionItems.length;
    const newIdx = (stateRef.current.artworkIndex + 1) % total;
    setFaceToFaceTarget(newIdx);
  }, [exhibitionItems.length, setFaceToFaceTarget]);

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

    const tunnelHalfWidth = 4.0;
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
    // 🏛️ THE GRAND ART-DECORATED MAIN ENTRANCE GATE
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

    // STATIC CLICK TARGET ARRAY (NO GC IN ANIMATE LOOP)
    const clickableMeshes: THREE.Mesh[] = [];
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
      const { artwork, artPos, inwardNorm } = item;

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
      artMesh.userData = { artwork, index, t: item.t };
      group.add(artMesh);
      clickableMeshes.push(artMesh);

      const plaqueMat = new THREE.MeshBasicMaterial({
        map: createPlaqueTexture(artwork.title, artwork.collectionTitle),
      });
      const plaqueMesh = new THREE.Mesh(plaqueGeo, plaqueMat);
      plaqueMesh.position.set(1.15 + 0.85 / 2 + 0.15, -0.9, 0.01);
      group.add(plaqueMesh);

      group.position.copy(artPos);
      const lookTarget = artPos.clone().add(inwardNorm);
      group.lookAt(lookTarget);

      scene.add(group);
    });

    // RAYCASTER
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    // SMOOTH MOUSE & DRAG CONTROLS
    const onMouseDown = (e: MouseEvent) => {
      stateRef.current.isPointerDown = true;
      stateRef.current.startX = e.clientX;
      stateRef.current.lastX = e.clientX;
      container.style.cursor = 'grabbing';
    };

    const onMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const normX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const normY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      pointer.x = normX;
      pointer.y = normY;

      stateRef.current.mouseNormX = normX;
      stateRef.current.mouseNormY = normY;

      if (stateRef.current.isPointerDown) {
        const deltaX = e.clientX - stateRef.current.lastX;
        stateRef.current.lastX = e.clientX;

        // If in face-to-face mode, horizontal drag smoothly transitions back to corridor walk
        if (stateRef.current.viewMode === 'face-to-face' && Math.abs(deltaX) > 4) {
          stateRef.current.viewMode = 'corridor';
          setIsFaceToFace(false);
        }

        stateRef.current.targetProgress -= deltaX * 0.0012;
      }
    };

    const onMouseUp = () => {
      stateRef.current.isPointerDown = false;
      container.style.cursor = 'grab';
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;

      // Scrolling smoothly resumes corridor walking
      if (stateRef.current.viewMode === 'face-to-face') {
        stateRef.current.viewMode = 'corridor';
        setIsFaceToFace(false);
      }

      stateRef.current.targetProgress += delta * 0.0009;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      stateRef.current.keys.add(e.code);

      // Left arrow = Previous Face-to-Face artwork!
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevFaceToFace();
      }
      // Right arrow = Next Face-to-Face artwork!
      else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNextFaceToFace();
      }
      else if (e.key === 'Enter' || e.key === 'Space') {
        if (activeArtwork) {
          onSelectArtwork(activeArtwork);
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      stateRef.current.keys.delete(e.code);
    };

    const onClick = (e: MouseEvent) => {
      if (Math.abs(e.clientX - stateRef.current.startX) > 6) return;

      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(clickableMeshes, false);

      if (hits.length > 0) {
        const hit = hits[0].object;
        if (hit.userData?.artwork && typeof hit.userData.index === 'number') {
          // Clicking directly on an artwork locks onto it face-to-face!
          setFaceToFaceTarget(hit.userData.index);
          onSelectArtwork(hit.userData.artwork);
        }
      }
    };

    let touchStartX = 0;
    const onTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX;
    };
    const onTouchMove = (e: TouchEvent) => {
      const deltaX = touchStartX - e.touches[0].clientX;
      touchStartX = e.touches[0].clientX;
      if (stateRef.current.viewMode === 'face-to-face') {
        stateRef.current.viewMode = 'corridor';
        setIsFaceToFace(false);
      }
      stateRef.current.targetProgress += deltaX * 0.0016;
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
        setFaceToFaceTarget(foundIdx);
      }
    }

    // ANIMATION LOOP (SOLID 60-120 FPS, SMOOTH CORRIDOR & FACE-TO-FACE MODES)
    let animationFrameId: number;
    let lastRaycastTime = 0;
    const currentCamPos = new THREE.Vector3();
    const currentLookTarget = new THREE.Vector3();

    const animate = (timestamp: number) => {
      animationFrameId = requestAnimationFrame(animate);

      const keys = stateRef.current.keys;
      const isShift = keys.has('ShiftLeft') || keys.has('ShiftRight');
      const keyStep = isShift ? 0.003 : 0.0016;

      if (keys.has('KeyW') || keys.has('ArrowUp')) {
        if (stateRef.current.viewMode === 'face-to-face') {
          stateRef.current.viewMode = 'corridor';
          setIsFaceToFace(false);
        }
        stateRef.current.targetProgress += keyStep;
      }
      if (keys.has('KeyS') || keys.has('ArrowDown')) {
        if (stateRef.current.viewMode === 'face-to-face') {
          stateRef.current.viewMode = 'corridor';
          setIsFaceToFace(false);
        }
        stateRef.current.targetProgress -= keyStep;
      }

      stateRef.current.progress +=
        (stateRef.current.targetProgress - stateRef.current.progress) * 0.12;

      const p = ((stateRef.current.progress % 1) + 1) % 1;
      setCurrentProgressPct(p);

      const atGate = p < 0.04 || p > 0.965;
      setIsAtGate(atGate && stateRef.current.viewMode !== 'face-to-face');

      // CORRIDOR WALKING CAMERA POSITION & TARGET
      const eyeHeight = 2.0;
      const corridorCamPos = tunnelSpline.getPointAt(p);
      corridorCamPos.y = eyeHeight;

      const forwardTangent = tunnelSpline.getTangentAt(p);
      const lookOffsetDist = 12.0;
      const corridorLookTarget = corridorCamPos
        .clone()
        .add(forwardTangent.clone().multiplyScalar(lookOffsetDist));

      const corridorNormal = new THREE.Vector3()
        .crossVectors(forwardTangent, upVector)
        .normalize();

      corridorLookTarget.add(
        corridorNormal.clone().multiplyScalar(-stateRef.current.mouseNormX * 3.2)
      );
      corridorLookTarget.y += stateRef.current.mouseNormY * 0.8;

      // BLEND FACTOR FOR FACE-TO-FACE INSPECTION
      const targetBlend = stateRef.current.viewMode === 'face-to-face' ? 1.0 : 0.0;
      stateRef.current.blendFactor +=
        (targetBlend - stateRef.current.blendFactor) * 0.10;
      const b = stateRef.current.blendFactor;

      // Interpolate smoothly between corridor walk and face-to-face view!
      currentCamPos.lerpVectors(corridorCamPos, stateRef.current.faceCamPos, b);
      currentLookTarget.lerpVectors(corridorLookTarget, stateRef.current.faceLookTarget, b);

      camera.position.copy(currentCamPos);
      camera.lookAt(currentLookTarget);

      // Throttled raycasting
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

      // Track closest artwork when in corridor mode
      if (stateRef.current.viewMode === 'corridor') {
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

        if (closestItem && closestItem.artwork.id !== activeArtwork?.id) {
          setActiveArtwork(closestItem.artwork);
          stateRef.current.artworkIndex = closestIdx;
          setCurrentIndex(closestIdx);
          const col = ART_COLLECTIONS.find(
            (c) => c.id === closestItem.artwork.collectionId
          );
          if (col) setActiveCollection(col);
        }
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
  }, [exhibitionItems, onSelectArtwork, initialCollectionId, activeArtwork?.id, handleNextFaceToFace, handlePrevFaceToFace, setFaceToFaceTarget]);

  const jumpToCollection = (colId: string) => {
    const itemIdx = exhibitionItems.findIndex((it) => it.artwork.collectionId === colId);
    if (itemIdx !== -1) {
      setFaceToFaceTarget(itemIdx);
    }
  };

  const walkThroughGate = () => {
    stateRef.current.viewMode = 'corridor';
    setIsFaceToFace(false);
    stateRef.current.targetProgress = 0.06;
  };

  const resumeCorridorWalk = () => {
    stateRef.current.viewMode = 'corridor';
    setIsFaceToFace(false);
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
              stateRef.current.viewMode = 'corridor';
              setIsFaceToFace(false);
              stateRef.current.targetProgress = 0.992;
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

      {/* 🎯 "<" AND ">" BUTTONS: FACE-TO-FACE ARTWORK INSPECTION TOUR */}
      {/* Clicking "<" or ">" points the camera directly perpendicular to the artwork so you look at it FACE TO FACE */}
      <button
        onClick={handlePrevFaceToFace}
        className='absolute left-4 top-1/2 -translate-y-1/2 z-30 p-3.5 rounded-full bg-white/90 hover:bg-white text-zinc-900 shadow-xl border border-zinc-300 backdrop-blur-md transition-all hover:scale-110 active:scale-95 group'
        title='Previous Artwork (Face-to-Face View)'
        aria-label='Previous Artwork Face-to-Face'
      >
        <ChevronLeft size={24} className='group-hover:-translate-x-0.5 transition-transform' />
      </button>

      <button
        onClick={handleNextFaceToFace}
        className='absolute right-4 top-1/2 -translate-y-1/2 z-30 p-3.5 rounded-full bg-white/90 hover:bg-white text-zinc-900 shadow-xl border border-zinc-300 backdrop-blur-md transition-all hover:scale-110 active:scale-95 group'
        title='Next Artwork (Face-to-Face View)'
        aria-label='Next Artwork Face-to-Face'
      >
        <ChevronRight size={24} className='group-hover:translate-x-0.5 transition-transform' />
      </button>

      {/* HOVER TOOLTIP */}
      {hoveredPrint && (
        <div className='pointer-events-none absolute bottom-32 left-1/2 -translate-x-1/2 z-30 bg-zinc-950/90 text-white px-4 py-2 rounded-full backdrop-blur-md shadow-2xl text-xs flex items-center gap-2 border border-white/10 animate-fade-in'>
          <Eye size={14} className='text-amber-400' />
          <span>
            Click to view face-to-face:{' '}
            <strong className='font-semibold'>{hoveredPrint.title}</strong>
          </span>
          <span className='text-zinc-400'>• From ${hoveredPrint.basePrice}</span>
        </div>
      )}

      {/* BOTTOM CENTER: INTUITIVE STATUS & FACE-TO-FACE BADGE */}
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
              You are standing at the ceremonial entrance. Use the <strong>&lt;</strong> and <strong>&gt;</strong> buttons to inspect paintings face-to-face, or step through the gate.
            </p>

            <button
              onClick={walkThroughGate}
              className='mt-3 px-6 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black uppercase tracking-wider rounded-full shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2'
            >
              <span>Enter Through The Gate</span>
              <ArrowRight size={14} />
            </button>
          </div>
        ) : (
          /* ACTIVE ARTWORK PLAQUE WITH FACE-TO-FACE INDICATOR */
          <div className='pointer-events-auto flex flex-col items-center bg-white/92 backdrop-blur-md px-8 py-3.5 rounded-2xl shadow-xl border border-zinc-200/90 transition-all hover:shadow-2xl'>
            <div className='flex items-center gap-2 mb-0.5'>
              {isFaceToFace ? (
                <span className='text-[10px] uppercase tracking-[0.2em] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 border border-emerald-200'>
                  <UserCheck size={11} />
                  <span>Face-to-Face View ({exhibitionItems[currentIndex]?.wallSide?.toUpperCase()} WALL)</span>
                </span>
              ) : (
                <span className='text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-bold flex items-center gap-1'>
                  <Sparkles size={11} className='text-amber-500' />
                  <span>You Are Walking Past</span>
                </span>
              )}
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
                • {activeArtwork.artist} • Print {currentIndex + 1} of {exhibitionItems.length}
              </p>
            )}

            <div className='flex items-center gap-3 mt-2.5'>
              <button
                onClick={() => activeArtwork && onSelectArtwork(activeArtwork)}
                className='px-4 py-1.5 bg-zinc-900 text-white hover:bg-black text-xs font-semibold uppercase tracking-wider rounded-full shadow-sm hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5'
              >
                <span>Inquire & Buy Print</span>
                <span className='text-amber-400'>
                  ${activeArtwork?.basePrice || 50}
                </span>
              </button>

              {isFaceToFace ? (
                <button
                  onClick={resumeCorridorWalk}
                  className='text-xs font-semibold text-zinc-700 hover:text-black tracking-wide underline underline-offset-4'
                >
                  Resume Corridor Walk →
                </button>
              ) : (
                onEnterCollection && activeCollection && (
                  <button
                    onClick={() => onEnterCollection(activeCollection.id)}
                    className='text-xs font-semibold text-zinc-700 hover:text-black tracking-wide underline underline-offset-4'
                  >
                    Enter Collection ({activeCollection.count} prints) →
                  </button>
                )
              )}
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM RIGHT: INSTRUCTIONS & RADAR */}
      <div className='absolute bottom-6 right-6 z-20 hidden sm:flex items-center gap-3 pointer-events-none text-zinc-600 bg-white/85 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-zinc-200/80 shadow-md'>
        <div className='relative w-7 h-7 rounded-full border-2 border-zinc-300 flex items-center justify-center'>
          <div
            className='absolute w-2 h-2 rounded-full bg-amber-500 shadow-sm transition-all duration-75'
            style={{
              transform: `rotate(${currentProgressPct * 360}deg) translate(9px) rotate(-${
                currentProgressPct * 360
              }deg)`,
            }}
          />
          <MapPin size={10} className='text-zinc-400' />
        </div>

        <div className='text-left'>
          <div className='text-[10px] font-bold uppercase tracking-wider text-zinc-800 flex items-center gap-1.5'>
            <span>Click &lt; or &gt; for Face-to-Face View</span>
          </div>
          <div className='text-[9px] text-zinc-500'>
            Scroll or drag mouse to glide through hall
          </div>
        </div>
      </div>
    </div>
  );
}
