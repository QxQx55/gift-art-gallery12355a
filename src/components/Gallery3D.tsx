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
  Zap,
  Gauge
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
  const [isFastSpeed, setIsFastSpeed] = useState(true); // Default to fast responsive speed!
  const [hoveredPrint, setHoveredPrint] = useState<ArtworkPrint | null>(null);
  const [currentProgressPct, setCurrentProgressPct] = useState(0);

  // State reference for fluid 60-120fps animation loop
  const stateRef = useRef({
    progress: 0,
    targetProgress: 0,
    velocity: 0,
    yaw: 0,
    targetYaw: 0,
    pitch: 0,
    targetPitch: 0,
    isPointerDown: false,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    keys: new Set<string>(),
    isFast: true,
  });

  // Keep stateRef.isFast synced with isFastSpeed
  useEffect(() => {
    stateRef.current.isFast = isFastSpeed;
  }, [isFastSpeed]);

  // Curated Exhibition Artworks list for Left & Right Walls
  const exhibitionItems = React.useMemo(() => {
    const list: {
      artwork: ArtworkPrint;
      collectionId: string;
      collectionTitle: string;
      wallSide: 'left' | 'right';
      t: number;
    }[] = [];

    const prints = ALL_PRINTS.slice(0, 48);
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
        gain.gain.setValueAtTime(0.035, ctx.currentTime);

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

    // SCENE SETUP - Optimized for maximum framerate
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf2f2f4);
    scene.fog = new THREE.FogExp2(0xf2f2f4, 0.015);

    // CAMERA
    const width = container.clientWidth;
    const height = container.clientHeight;
    const camera = new THREE.PerspectiveCamera(58, width / height, 0.1, 160);

    // RENDERER - Ultra performant WebGL setup
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      precision: 'mediump',
    });
    renderer.setSize(width, height);
    // Limit pixel ratio to 1.5 for buttery smooth 60-120fps on all screens
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // EFFICIENT LIGHTING: Clean ambient & directional, no expensive multi-spotlight passes
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.15);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfffaf0, 1.25);
    dirLight.position.set(0, 10, 0);
    scene.add(dirLight);

    // Single player flashlight/torch spotlight
    const playerLight = new THREE.PointLight(0xfffbf2, 1.2, 18);
    scene.add(playerLight);

    // BUILD THE 3D CURVED TUNNEL SPLINE PATH
    const tunnelControlPoints = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(25, 0, 18),
      new THREE.Vector3(55, 0, 5),
      new THREE.Vector3(75, 0, -28),
      new THREE.Vector3(60, 0, -65),
      new THREE.Vector3(20, 0, -82),
      new THREE.Vector3(-20, 0, -82),
      new THREE.Vector3(-60, 0, -65),
      new THREE.Vector3(-75, 0, -28),
      new THREE.Vector3(-55, 0, 5),
      new THREE.Vector3(-25, 0, 18),
    ];

    const tunnelSpline = new THREE.CatmullRomCurve3(
      tunnelControlPoints,
      true,
      'centripetal',
      0.5
    );

    const tunnelHalfWidth = 3.8;
    const tunnelHeight = 5.2;
    const upVector = new THREE.Vector3(0, 1, 0);

    // GENERATE TUNNEL WALLS, FLOOR & CEILING
    const segments = 180; // Optimized segment count
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
      color: 0xe6e6ea,
      roughness: 0.4,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    scene.add(floorMesh);

    // Wall Material
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0xf5f5f7,
      roughness: 0.95,
      side: THREE.DoubleSide,
    });

    // Left Wall Mesh
    const leftWallGeo = new THREE.BufferGeometry();
    leftWallGeo.setAttribute('position', new THREE.Float32BufferAttribute(leftWallPositions, 3));
    leftWallGeo.setIndex(leftWallIndices);
    leftWallGeo.computeVertexNormals();
    scene.add(new THREE.Mesh(leftWallGeo, wallMat));

    // Right Wall Mesh
    const rightWallGeo = new THREE.BufferGeometry();
    rightWallGeo.setAttribute('position', new THREE.Float32BufferAttribute(rightWallPositions, 3));
    rightWallGeo.setIndex(rightWallIndices);
    rightWallGeo.computeVertexNormals();
    scene.add(new THREE.Mesh(rightWallGeo, wallMat));

    // Ceiling Mesh
    const ceilingGeo = new THREE.BufferGeometry();
    ceilingGeo.setAttribute('position', new THREE.Float32BufferAttribute(ceilingPositions, 3));
    ceilingGeo.setIndex(ceilingIndices);
    ceilingGeo.computeVertexNormals();
    const ceilingMat = new THREE.MeshBasicMaterial({ color: 0xfafafc, side: THREE.DoubleSide });
    scene.add(new THREE.Mesh(ceilingGeo, ceilingMat));

    // Ceiling Track Lights
    const trackLightGeo = new THREE.BoxGeometry(0.35, 0.08, 0.8);
    const trackLightMat = new THREE.MeshBasicMaterial({ color: 0xfffae0 });
    for (let i = 0; i < 22; i++) {
      const t = i / 22;
      const pt = tunnelSpline.getPointAt(t);
      const lightMesh = new THREE.Mesh(trackLightGeo, trackLightMat);
      lightMesh.position.set(pt.x, tunnelHeight - 0.04, pt.z);
      scene.add(lightMesh);
    }

    // TEXTURE LOADER & SHARED GEOMETRIES
    const textureLoader = new THREE.TextureLoader();
    const paintingMeshes: THREE.Group[] = [];

    // Shared geometry for plaques to eliminate garbage collection & drawcall cost
    const plaqueGeo = new THREE.PlaneGeometry(0.9, 0.45);
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.5 });
    const matMat = new THREE.MeshBasicMaterial({ color: 0xfafafa });

    // Canvas texture generator for museum wall plaque
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
        ctx.fillText(title.slice(0, 26).toUpperCase(), 28, 62);

        ctx.fillStyle = '#71717a';
        ctx.font = '20px -apple-system, sans-serif';
        ctx.fillText('MAYOWA ALABI (SHUTABUG)', 28, 106);

        ctx.fillStyle = '#a1a1aa';
        ctx.font = '18px -apple-system, sans-serif';
        ctx.fillText(`Series: ${colTitle}`, 28, 146);
        ctx.fillText('Archival Pigment Print • 2026', 28, 182);

        ctx.fillStyle = '#18181b';
        ctx.font = 'bold 22px -apple-system, sans-serif';
        ctx.fillText('From $50.00 • Inquire / Buy →', 28, 222);
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

      const printHeight = 2.8;
      const printWidth = printHeight * (artwork.ratio || 0.72);

      // Frame
      const frameThickness = 0.09;
      const frameDepth = 0.08;
      const frameGeo = new THREE.BoxGeometry(
        printWidth + frameThickness * 2,
        printHeight + frameThickness * 2,
        frameDepth
      );
      const frameMesh = new THREE.Mesh(frameGeo, frameMat);
      group.add(frameMesh);

      // Mat Board
      const matGeo = new THREE.PlaneGeometry(
        printWidth + frameThickness * 0.7,
        printHeight + frameThickness * 0.7
      );
      const matMesh = new THREE.Mesh(matGeo, matMat);
      matMesh.position.z = frameDepth / 2 + 0.003;
      group.add(matMesh);

      // Painting Canvas: using fast, vivid material
      const artGeo = new THREE.PlaneGeometry(printWidth, printHeight);
      const artMat = new THREE.MeshStandardMaterial({
        color: 0xeeeeee,
        roughness: 0.3,
      });

      // Asynchronous texture loading
      textureLoader.load(
        artwork.src,
        (loadedTex) => {
          loadedTex.colorSpace = THREE.SRGBColorSpace;
          artMat.color.set(0xffffff);
          artMat.map = loadedTex;
          artMat.needsUpdate = true;
        },
        undefined,
        () => {}
      );

      const artMesh = new THREE.Mesh(artGeo, artMat);
      artMesh.position.z = frameDepth / 2 + 0.008;
      artMesh.userData = { artwork, index, t };
      group.add(artMesh);

      // Museum Wall Plaque beside painting
      const plaqueMat = new THREE.MeshBasicMaterial({
        map: createPlaqueTexture(artwork.title, artwork.collectionTitle),
      });
      const plaqueMesh = new THREE.Mesh(plaqueGeo, plaqueMat);
      plaqueMesh.position.set(
        printWidth / 2 + 0.9 / 2 + 0.2,
        -printHeight / 2 + 0.28,
        0.01
      );
      group.add(plaqueMesh);

      // Position on LEFT or RIGHT wall
      const wallOffset = wallSide === 'right' ? tunnelHalfWidth - 0.12 : -tunnelHalfWidth + 0.12;
      const pos = pt.clone().add(norm.clone().multiplyScalar(wallOffset));
      pos.y = 2.0;
      group.position.copy(pos);

      // Orient painting to face into tunnel center
      const inwardNormal = wallSide === 'right' ? norm.clone().negate() : norm.clone();
      const lookTarget = pos.clone().add(inwardNormal);
      group.lookAt(lookTarget);

      group.userData = { artwork, index, t, wallSide };
      scene.add(group);
      paintingMeshes.push(group);
    });

    // RAYCASTER FOR HOVER & INTERACTION
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    // INTERACTIVE CONTROLS
    const onMouseDown = (e: MouseEvent) => {
      stateRef.current.isPointerDown = true;
      stateRef.current.startX = e.clientX;
      stateRef.current.startY = e.clientY;
      stateRef.current.lastX = e.clientX;
      stateRef.current.lastY = e.clientY;
    };

    const onMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      if (stateRef.current.isPointerDown) {
        const deltaX = e.clientX - stateRef.current.lastX;
        const deltaY = e.clientY - stateRef.current.lastY;
        stateRef.current.lastX = e.clientX;
        stateRef.current.lastY = e.clientY;

        // Dragging left/right rotates view
        stateRef.current.targetYaw -= deltaX * 0.005;
        stateRef.current.targetPitch -= deltaY * 0.004;
        stateRef.current.targetPitch = Math.max(
          -0.45,
          Math.min(0.45, stateRef.current.targetPitch)
        );

        // Dragging up/down also walks forward/backward directly!
        const dragWalkMultiplier = stateRef.current.isFast ? 0.0006 : 0.0003;
        stateRef.current.targetProgress -= deltaY * dragWalkMultiplier;
      } else {
        // Natural mouse gaze follow
        const normX = (e.clientX - rect.left) / rect.width - 0.5;
        const normY = (e.clientY - rect.top) / rect.height - 0.5;
        stateRef.current.targetYaw = -normX * 0.8;
        stateRef.current.targetPitch = -normY * 0.4;
      }
    };

    const onMouseUp = () => {
      stateRef.current.isPointerDown = false;
    };

    // FAST & RESPONSIVE SCROLL WHEEL
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      // High speed walk multiplier (5x faster!)
      const baseWalkSpeed = stateRef.current.isFast ? 0.0019 : 0.0009;
      stateRef.current.targetProgress += delta * baseWalkSpeed;
      stateRef.current.velocity = delta * baseWalkSpeed * 0.4;
    };

    // CONTINUOUS KEYBOARD WALKING (W / S / Up / Down / Shift)
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

    // CLICK ON PAINTING TO VIEW
    const onClick = (e: MouseEvent) => {
      if (Math.abs(e.clientX - stateRef.current.startX) > 8) return;

      const rect = container.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObjects(
        paintingMeshes.flatMap((g) => g.children),
        true
      );

      if (intersects.length > 0) {
        let hitGroup: THREE.Object3D | null = intersects[0].object;
        while (hitGroup && !hitGroup.userData?.artwork && hitGroup.parent) {
          hitGroup = hitGroup.parent;
        }

        if (hitGroup && hitGroup.userData?.artwork) {
          const artwork: ArtworkPrint = hitGroup.userData.artwork;
          const targetT = hitGroup.userData.t;
          stateRef.current.targetProgress = targetT;
          onSelectArtwork(artwork);
        }
      }
    };

    // Touch support for mobile
    let touchStartY = 0;
    const onTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
    };
    const onTouchMove = (e: TouchEvent) => {
      const deltaY = touchStartY - e.touches[0].clientY;
      touchStartY = e.touches[0].clientY;
      stateRef.current.targetProgress += deltaY * 0.0022;
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

    // ANIMATION LOOP (HIGH FPS + FAST CONTINUOUS KEYBOARD WALKING)
    let animationFrameId: number;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Check continuous keyboard walking keys
      const keys = stateRef.current.keys;
      const isShift = keys.has('ShiftLeft') || keys.has('ShiftRight');
      const stepSpeed = (stateRef.current.isFast ? 0.0025 : 0.0014) * (isShift ? 2.0 : 1.0);

      if (keys.has('KeyW') || keys.has('ArrowUp')) {
        stateRef.current.targetProgress += stepSpeed;
      }
      if (keys.has('KeyS') || keys.has('ArrowDown')) {
        stateRef.current.targetProgress -= stepSpeed;
      }
      if (keys.has('KeyA') || keys.has('ArrowLeft')) {
        stateRef.current.targetYaw += 0.04;
      }
      if (keys.has('KeyD') || keys.has('ArrowRight')) {
        stateRef.current.targetYaw -= 0.04;
      }

      // Inertia & velocity decay
      if (!stateRef.current.isPointerDown) {
        stateRef.current.targetProgress += stateRef.current.velocity;
        stateRef.current.velocity *= 0.88;
      }

      // Snappy, responsive lerp (0.16 factor feels crisp and instantaneous)
      stateRef.current.progress +=
        (stateRef.current.targetProgress - stateRef.current.progress) * 0.16;

      const p = ((stateRef.current.progress % 1) + 1) % 1;
      setCurrentProgressPct(p);

      stateRef.current.yaw +=
        (stateRef.current.targetYaw - stateRef.current.yaw) * 0.16;
      stateRef.current.pitch +=
        (stateRef.current.targetPitch - stateRef.current.pitch) * 0.16;

      // Position camera
      const eyeHeight = 1.85;
      const camPos = tunnelSpline.getPointAt(p);
      camPos.y = eyeHeight;
      camera.position.copy(camPos);

      // Dynamic light moves with camera
      playerLight.position.set(camPos.x, camPos.y + 0.5, camPos.z);

      // Direction gaze
      const tangent = tunnelSpline.getTangentAt(p);
      const lookDir = tangent
        .clone()
        .applyAxisAngle(upVector, stateRef.current.yaw)
        .add(new THREE.Vector3(0, stateRef.current.pitch, 0))
        .normalize();

      const lookTarget = camPos.clone().add(lookDir.clone().multiplyScalar(15));
      camera.lookAt(lookTarget);

      // Raycast for hover detection
      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObjects(
        paintingMeshes.flatMap((g) => g.children),
        true
      );

      let foundHover: ArtworkPrint | null = null;
      if (intersects.length > 0) {
        let hitGroup: THREE.Object3D | null = intersects[0].object;
        while (hitGroup && !hitGroup.userData?.artwork && hitGroup.parent) {
          hitGroup = hitGroup.parent;
        }
        if (hitGroup?.userData?.artwork) {
          foundHover = hitGroup.userData.artwork;
          container.style.cursor = 'pointer';
        }
      } else {
        container.style.cursor = 'grab';
      }
      setHoveredPrint(foundHover);

      // Determine active artwork
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

    animate();

    // RESIZE
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
      plaqueGeo.dispose();
      frameMat.dispose();
      matMat.dispose();
    };
  }, [exhibitionItems, onSelectArtwork, initialCollectionId, activeArtwork?.id]);

  const jumpToCollection = (colId: string) => {
    const item = exhibitionItems.find((it) => it.artwork.collectionId === colId);
    if (item) {
      stateRef.current.targetProgress = item.t;
    }
  };

  const stepWalk = (direction: 'forward' | 'backward') => {
    const step = stateRef.current.isFast ? 0.065 : 0.035;
    stateRef.current.targetProgress += direction === 'forward' ? step : -step;
  };

  return (
    <div className='relative w-full h-[90vh] min-h-[640px] overflow-hidden select-none bg-[#f2f2f4]'>
      {/* 3D WebGL Canvas */}
      <div ref={mountRef} className='w-full h-full' />

      {/* TOP CONTROLS: Collections Navigator Pills & Speed Mode */}
      <div className='absolute top-4 left-0 right-0 z-20 flex items-center justify-between px-6 pointer-events-none'>
        <div className='pointer-events-auto flex items-center gap-2 overflow-x-auto py-1 max-w-[70vw] no-scrollbar'>
          {ART_COLLECTIONS.slice(0, 8).map((col) => {
            const isSelected = activeCollection?.id === col.id;
            return (
              <button
                key={col.id}
                onClick={() => jumpToCollection(col.id)}
                className={`px-3 py-1.5 text-xs uppercase tracking-wider font-semibold rounded-full backdrop-blur-md transition-all duration-300 whitespace-nowrap ${
                  isSelected
                    ? 'bg-zinc-900 text-white shadow-md'
                    : 'bg-white/70 text-zinc-700 hover:bg-white hover:text-black border border-zinc-200/60'
                }`}
              >
                {col.title}
              </button>
            );
          })}
        </div>

        {/* Speed Toggle, Audio & Fullscreen Buttons */}
        <div className='pointer-events-auto flex items-center gap-2'>
          {/* Walking Speed Switcher Button */}
          <button
            onClick={() => setIsFastSpeed(!isFastSpeed)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase backdrop-blur-md shadow-sm border transition-all flex items-center gap-1.5 ${
              isFastSpeed
                ? 'bg-amber-500 text-white border-amber-400 shadow-amber-500/20'
                : 'bg-white/80 hover:bg-white text-zinc-700 border-zinc-200/60'
            }`}
            title='Toggle Walking Speed (Fast / Normal)'
          >
            <Zap size={14} className={isFastSpeed ? 'fill-white' : ''} />
            <span>{isFastSpeed ? 'Fast Walk' : 'Normal Walk'}</span>
          </button>

          <button
            onClick={toggleAudio}
            className='p-2.5 rounded-full bg-white/80 hover:bg-white text-zinc-700 hover:text-black shadow-sm border border-zinc-200/60 backdrop-blur-md transition-all'
            title={isAudioEnabled ? 'Mute Gallery Sound' : 'Enable Gallery Sound'}
          >
            {isAudioEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
          <button
            onClick={handleFullscreen}
            className='p-2.5 rounded-full bg-white/80 hover:bg-white text-zinc-700 hover:text-black shadow-sm border border-zinc-200/60 backdrop-blur-md transition-all'
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
        title='Walk Backward (S / Down)'
      >
        <ChevronLeft size={22} />
      </button>

      <button
        onClick={() => stepWalk('forward')}
        className='absolute right-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-white/85 hover:bg-white text-zinc-800 shadow-md border border-zinc-200/80 backdrop-blur-md transition-all hover:scale-110 active:scale-95'
        title='Walk Forward (W / Up)'
      >
        <ChevronRight size={22} />
      </button>

      {/* HOVER TOOLTIP */}
      {hoveredPrint && (
        <div className='pointer-events-none absolute bottom-32 left-1/2 -translate-x-1/2 z-30 bg-zinc-950/85 text-white px-4 py-2 rounded-full backdrop-blur-md shadow-xl text-xs flex items-center gap-2 border border-white/10 animate-fade-in'>
          <Eye size={14} className='text-amber-400' />
          <span>
            Click to inspect:{' '}
            <strong className='font-semibold'>{hoveredPrint.title}</strong>
          </span>
          <span className='text-zinc-400'>• From ${hoveredPrint.basePrice}</span>
        </div>
      )}

      {/* BOTTOM CENTER: "YOU ARE WALKING PAST" */}
      <div className='absolute bottom-6 left-0 right-0 z-20 flex flex-col items-center justify-center pointer-events-none text-center px-4'>
        <div className='pointer-events-auto flex flex-col items-center bg-white/90 backdrop-blur-md px-8 py-3.5 rounded-2xl shadow-lg border border-zinc-200/80 transition-all hover:shadow-xl'>
          <div className='text-[10px] uppercase tracking-[0.25em] text-zinc-500 font-bold mb-0.5 flex items-center gap-1.5'>
            <Sparkles size={11} className='text-amber-500' />
            <span>You Are Walking Past</span>
          </div>

          <h2 className='text-xl sm:text-2xl font-black uppercase tracking-tight text-zinc-900'>
            {activeCollection?.title || 'Exhibition Corridor'}
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

      {/* BOTTOM RIGHT: SPEED & WALKING CONTROLS */}
      <div className='absolute bottom-6 right-6 z-20 hidden sm:flex items-center gap-3 pointer-events-none text-zinc-600 bg-white/85 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-zinc-200/60 shadow-sm'>
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
          <div className='text-[10px] font-bold uppercase tracking-wider text-zinc-800 flex items-center gap-1'>
            <span>Scroll or W / S to Walk</span>
            <span className='text-amber-600 font-extrabold'>(Shift: Sprint)</span>
          </div>
          <div className='text-[9px] text-zinc-500'>
            Mouse aims gaze at left & right artworks
          </div>
        </div>
      </div>

      {/* BOTTOM LEFT: STATUS */}
      <div className='absolute bottom-6 left-6 z-20 hidden lg:flex items-center gap-2 pointer-events-none text-zinc-600 bg-white/75 backdrop-blur-md px-3.5 py-2 rounded-full border border-zinc-200/60 text-[11px] font-semibold'>
        <Gauge size={13} className='text-amber-600' />
        <span>Smooth 60FPS Video Game Mode</span>
      </div>
    </div>
  );
}
