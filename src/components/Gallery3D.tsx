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
  MousePointer
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

  // State reference - simple, stable, zero-garbage
  const stateRef = useRef({
    progress: 0,
    targetProgress: 0,
    isPointerDown: false,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    mouseNormX: 0,
    mouseNormY: 0,
    keys: new Set<string>(),
  });

  // Exhibition artworks list
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
      list.push({
        artwork: p,
        collectionId: p.collectionId,
        collectionTitle: p.collectionTitle,
        wallSide: idx % 2 === 0 ? 'right' : 'left',
        t: idx / total,
      });
    });

    return list;
  }, []);

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

    // SCENE SETUP - Clean, light architectural aesthetic
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf1f1f3);
    scene.fog = new THREE.FogExp2(0xf1f1f3, 0.012);

    // CAMERA - Stable, comfortable eye-level
    const width = container.clientWidth;
    const height = container.clientHeight;
    const camera = new THREE.PerspectiveCamera(52, width / height, 0.1, 140);

    // RENDERER - Maximum responsiveness, no heavy multi-pass
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

    // BALANCED LIGHTING (Bright, shadowless for high framerate)
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.25);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfffaf0, 0.85);
    dirLight.position.set(0, 15, 0);
    scene.add(dirLight);

    // BUILD THE CURVED TUNNEL SPLINE PATH
    // Gentle sweeping curved corridor
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

    const tunnelHalfWidth = 4.0; // Roomy corridor width
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

    // STATIC CLICK TARGET ARRAY (NO GC IN ANIMATE LOOP)
    const clickableMeshes: THREE.Mesh[] = [];
    const textureLoader = new THREE.TextureLoader();

    // Reusable materials & geometries
    const frameGeo = new THREE.BoxGeometry(2.35, 3.15, 0.08);
    const frameMat = new THREE.MeshBasicMaterial({ color: 0x18181b });
    const matGeo = new THREE.PlaneGeometry(2.22, 3.02);
    const matMat = new THREE.MeshBasicMaterial({ color: 0xfdfdfd });
    const artGeo = new THREE.PlaneGeometry(2.1, 2.9);
    const plaqueGeo = new THREE.PlaneGeometry(0.85, 0.42);

    // Canvas plaque generator
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

      // Outer frame
      const frameMesh = new THREE.Mesh(frameGeo, frameMat);
      group.add(frameMesh);

      // Inner white mat border
      const matMesh = new THREE.Mesh(matGeo, matMat);
      matMesh.position.z = 0.041;
      group.add(matMesh);

      // Artwork canvas
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

      // Plaque beside painting
      const plaqueMat = new THREE.MeshBasicMaterial({
        map: createPlaqueTexture(artwork.title, artwork.collectionTitle),
      });
      const plaqueMesh = new THREE.Mesh(plaqueGeo, plaqueMat);
      plaqueMesh.position.set(1.15 + 0.85 / 2 + 0.15, -0.9, 0.01);
      group.add(plaqueMesh);

      // Mount on left or right wall
      const wallOffset = wallSide === 'right' ? tunnelHalfWidth - 0.08 : -tunnelHalfWidth + 0.08;
      const pos = pt.clone().add(norm.clone().multiplyScalar(wallOffset));
      pos.y = 2.1; // Comfortable museum viewing height
      group.position.copy(pos);

      // Point into the corridor center
      const inwardNormal = wallSide === 'right' ? norm.clone().negate() : norm.clone();
      const lookTarget = pos.clone().add(inwardNormal);
      group.lookAt(lookTarget);

      scene.add(group);
    });

    // RAYCASTER (PRE-ALLOCATED)
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    // INTUITIVE, SMOOTH CONTROL LISTENERS
    // 1. Mouse Drag: drag up/down or left/right to glide smoothly through the gallery!
    const onMouseDown = (e: MouseEvent) => {
      stateRef.current.isPointerDown = true;
      stateRef.current.startX = e.clientX;
      stateRef.current.startY = e.clientY;
      stateRef.current.lastX = e.clientX;
      stateRef.current.lastY = e.clientY;
      container.style.cursor = 'grabbing';
    };

    const onMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const normX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const normY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      pointer.x = normX;
      pointer.y = normY;

      // Subtle, gentle head look without fighting the cursor
      stateRef.current.mouseNormX = normX;
      stateRef.current.mouseNormY = normY;

      if (stateRef.current.isPointerDown) {
        const deltaX = e.clientX - stateRef.current.lastX;
        const deltaY = e.clientY - stateRef.current.lastY;
        stateRef.current.lastX = e.clientX;
        stateRef.current.lastY = e.clientY;
        // Direct, effortless mouse drag: dragging forward/up or left walks forward, dragging down or right walks back
        stateRef.current.targetProgress += (-deltaY * 0.0014 - deltaX * 0.0014);
      }
    };

    const onMouseUp = () => {
      stateRef.current.isPointerDown = false;
      container.style.cursor = 'grab';
    };

    // 2. Mouse Wheel: smooth, natural scroll to walk forward & backward
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      // Responsive, effortless walking rate
      stateRef.current.targetProgress += delta * 0.0009;
    };

    // 3. Keyboard: W / S / Up / Down / Left / Right
    const onKeyDown = (e: KeyboardEvent) => {
      stateRef.current.keys.add(e.code);
      if (e.key === 'Enter' || e.key === 'Space') {
        if (activeArtwork) {
          onSelectArtwork(activeArtwork);
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      stateRef.current.keys.delete(e.code);
    };

    // 4. Click: Raycast directly against clickableMeshes
    const onClick = (e: MouseEvent) => {
      if (
        Math.abs(e.clientX - stateRef.current.startX) > 6 ||
        Math.abs(e.clientY - stateRef.current.startY) > 6
      )
        return; // Skip if dragged

      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(clickableMeshes, false);

      if (hits.length > 0) {
        const hit = hits[0].object;
        if (hit.userData?.artwork) {
          stateRef.current.targetProgress = hit.userData.t;
          onSelectArtwork(hit.userData.artwork);
        }
      }
    };

    // 5. Touch swipe for mobile
    let touchStartX = 0;
    const onTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX;
    };
    const onTouchMove = (e: TouchEvent) => {
      const deltaX = touchStartX - e.touches[0].clientX;
      touchStartX = e.touches[0].clientX;
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
      const found = exhibitionItems.find(
        (it) => it.artwork.collectionId === initialCollectionId
      );
      if (found) {
        stateRef.current.progress = found.t;
        stateRef.current.targetProgress = found.t;
      }
    }

    // ANIMATION LOOP (SOLID 60-120 FPS, ZERO JITTER)
    let animationFrameId: number;
    let lastRaycastTime = 0;

    const animate = (timestamp: number) => {
      animationFrameId = requestAnimationFrame(animate);

      // Smooth keyboard walking
      const keys = stateRef.current.keys;
      const isShift = keys.has('ShiftLeft') || keys.has('ShiftRight');
      const keyStep = (isShift ? 0.003 : 0.0016);

      if (keys.has('KeyW') || keys.has('ArrowUp')) {
        stateRef.current.targetProgress += keyStep;
      }
      if (keys.has('KeyS') || keys.has('ArrowDown')) {
        stateRef.current.targetProgress -= keyStep;
      }
      if (keys.has('KeyA') || keys.has('ArrowLeft')) {
        stateRef.current.targetProgress -= keyStep * 0.8;
      }
      if (keys.has('KeyD') || keys.has('ArrowRight')) {
        stateRef.current.targetProgress += keyStep * 0.8;
      }

      // Smooth, fluid camera progress damping
      stateRef.current.progress +=
        (stateRef.current.targetProgress - stateRef.current.progress) * 0.12;

      const p = ((stateRef.current.progress % 1) + 1) % 1;
      setCurrentProgressPct(p);

      // CAMERA POSITION (Stable eye-level along corridor centerline)
      const eyeHeight = 2.0;
      const camPos = tunnelSpline.getPointAt(p);
      camPos.y = eyeHeight;
      camera.position.copy(camPos);

      // CAMERA FORWARD GAZE (Follows the natural curving tunnel ahead)
      const forwardTangent = tunnelSpline.getTangentAt(p);
      const lookOffsetDist = 12.0;

      // Subtle, stable mouse parallax (doesn't fight cursor or make user dizzy)
      const lookTarget = camPos
        .clone()
        .add(forwardTangent.clone().multiplyScalar(lookOffsetDist));

      // Gentle horizontal glance left or right toward the walls
      const corridorNormal = new THREE.Vector3()
        .crossVectors(forwardTangent, upVector)
        .normalize();

      lookTarget.add(
        corridorNormal.clone().multiplyScalar(-stateRef.current.mouseNormX * 3.2)
      );
      lookTarget.y += stateRef.current.mouseNormY * 0.8;

      camera.lookAt(lookTarget);

      // Throttled hover detection (only 10 times a second, completely eliminates raycast lag)
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

      // Determine active artwork closest to current position
      let closestItem = exhibitionItems[0];
      let minDiff = 1;

      exhibitionItems.forEach((item) => {
        let diff = Math.abs(item.t - p);
        if (diff > 0.5) diff = 1 - diff;
        if (diff < minDiff) {
          minDiff = diff;
          closestItem = item;
        }
      });

      if (closestItem && closestItem.artwork.id !== activeArtwork?.id) {
        setActiveArtwork(closestItem.artwork);
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
    };
  }, [exhibitionItems, onSelectArtwork, initialCollectionId, activeArtwork?.id]);

  const jumpToCollection = (colId: string) => {
    const item = exhibitionItems.find((it) => it.artwork.collectionId === colId);
    if (item) {
      stateRef.current.targetProgress = item.t;
    }
  };

  const stepWalk = (direction: 'forward' | 'backward') => {
    stateRef.current.targetProgress += direction === 'forward' ? 0.05 : -0.05;
  };

  return (
    <div className='relative w-full h-[90vh] min-h-[640px] overflow-hidden select-none bg-[#f1f1f3] cursor-grab active:cursor-grabbing'>
      {/* 3D WebGL Canvas */}
      <div ref={mountRef} className='w-full h-full' />

      {/* TOP CONTROLS: Collection Tabs */}
      <div className='absolute top-4 left-0 right-0 z-20 flex items-center justify-between px-6 pointer-events-none'>
        <div className='pointer-events-auto flex items-center gap-2 overflow-x-auto py-1 max-w-[70vw] no-scrollbar'>
          {ART_COLLECTIONS.slice(0, 8).map((col) => {
            const isSelected = activeCollection?.id === col.id;
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

      {/* QUICK STEP BUTTONS ON SIDES */}
      <button
        onClick={() => stepWalk('backward')}
        className='absolute left-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-white/85 hover:bg-white text-zinc-800 shadow-md border border-zinc-200/80 backdrop-blur-md transition-all hover:scale-110 active:scale-95'
        title='Walk Backward'
      >
        <ChevronLeft size={22} />
      </button>

      <button
        onClick={() => stepWalk('forward')}
        className='absolute right-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-white/85 hover:bg-white text-zinc-800 shadow-md border border-zinc-200/80 backdrop-blur-md transition-all hover:scale-110 active:scale-95'
        title='Walk Forward'
      >
        <ChevronRight size={22} />
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

      {/* BOTTOM CENTER: "YOU ARE WALKING PAST" (MATCHES VIDEO) */}
      <div className='absolute bottom-6 left-0 right-0 z-20 flex flex-col items-center justify-center pointer-events-none text-center px-4'>
        <div className='pointer-events-auto flex flex-col items-center bg-white/92 backdrop-blur-md px-8 py-3.5 rounded-2xl shadow-xl border border-zinc-200/90 transition-all hover:shadow-2xl'>
          <div className='text-[10px] uppercase tracking-[0.25em] text-zinc-500 font-bold mb-0.5 flex items-center gap-1.5'>
            <Sparkles size={11} className='text-amber-500' />
            <span>You Are Walking Past</span>
          </div>

          <h2 className='text-xl sm:text-2xl font-black uppercase tracking-tight text-zinc-900'>
            {activeCollection?.title || 'Exhibition Tunnel'}
          </h2>

          {activeArtwork && (
            <p className='text-xs text-zinc-600 font-medium mt-0.5'>
              Artwork:{' '}
              <span className='text-zinc-900 font-semibold'>
                {activeArtwork.title}
              </span>{' '}
              • By {activeArtwork.artist}
            </p>
          )}

          <div className='flex items-center gap-3 mt-2.5'>
            <button
              onClick={() => activeArtwork && onSelectArtwork(activeArtwork)}
              className='px-4 py-1.5 bg-zinc-900 text-white hover:bg-black text-xs font-semibold uppercase tracking-wider rounded-full shadow-sm hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5'
            >
              <span>View Print & Buy</span>
              <span className='text-amber-400'>
                ${activeArtwork?.basePrice || 50}
              </span>
            </button>

            {onEnterCollection && activeCollection && (
              <button
                onClick={() => onEnterCollection(activeCollection.id)}
                className='text-xs font-semibold text-zinc-700 hover:text-black tracking-wide underline underline-offset-4'
              >
                Enter Collection ({activeCollection.count} prints) →
              </button>
            )}
          </div>
        </div>
      </div>

      {/* BOTTOM RIGHT: SMOOTH INSTRUCTIONS & RADAR */}
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
            <MousePointer size={11} className='text-zinc-600' />
            <span>Scroll or Drag to Walk</span>
          </div>
          <div className='text-[9px] text-zinc-500'>
            Click any painting on left or right wall
          </div>
        </div>
      </div>
    </div>
  );
}
