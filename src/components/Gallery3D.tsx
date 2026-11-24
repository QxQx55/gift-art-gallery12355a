import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { ART_COLLECTIONS, ArtworkPrint, ALL_PRINTS } from '../data/artworks';
import {
  Volume2,
  VolumeX,
  Maximize2,
  Move,
  ChevronLeft,
  ChevronRight,
  Eye,
  MapPin,
  Sparkles
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

  // Motion and Camera State Ref
  const stateRef = useRef({
    progress: 0, // 0 to 1 along tunnel spline
    targetProgress: 0,
    velocity: 0,
    yaw: 0, // horizontal look angle in radians
    targetYaw: 0,
    pitch: 0, // vertical look angle
    targetPitch: 0,
    isPointerDown: false,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
  });

  // Curated Exhibition Artworks list for Left & Right Walls
  const exhibitionItems = React.useMemo(() => {
    const list: {
      artwork: ArtworkPrint;
      collectionId: string;
      collectionTitle: string;
      wallSide: 'left' | 'right';
      t: number; // progress position on curve 0 to 1
    }[] = [];

    // Filter high quality prints across collections
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

    // SCENE SETUP
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f2); // Gallery light grey architectural tone
    scene.fog = new THREE.FogExp2(0xf0f0f2, 0.018); // Soft depth haze in tunnel

    // CAMERA
    const width = container.clientWidth;
    const height = container.clientHeight;
    const camera = new THREE.PerspectiveCamera(56, width / height, 0.1, 160);

    // RENDERER
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // LIGHTING
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.95);
    scene.add(ambientLight);

    // Moving spotlight anchored ahead of user's walk
    const followSpotlight = new THREE.SpotLight(
      0xfffaee,
      2.0,
      35,
      Math.PI / 3,
      0.35,
      1
    );
    followSpotlight.castShadow = true;
    scene.add(followSpotlight);

    // BUILD THE 3D CURVED TUNNEL SPLINE PATH
    // An architectural curved gallery loop corridor
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

    // TUNNEL ARCHITECTURE DIMENSIONS
    const tunnelHalfWidth = 3.8; // 7.6m wide corridor
    const tunnelHeight = 5.2; // 5.2m ceiling
    const upVector = new THREE.Vector3(0, 1, 0);

    // GENERATE TUNNEL WALLS, FLOOR & CEILING MESHES
    const segments = 240;
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

      // Left and right wall coordinates at floor (y = 0) and ceiling (y = tunnelHeight)
      const leftFloor = pt.clone().sub(norm.clone().multiplyScalar(tunnelHalfWidth));
      const rightFloor = pt.clone().add(norm.clone().multiplyScalar(tunnelHalfWidth));
      const leftCeil = leftFloor.clone().setY(tunnelHeight);
      const rightCeil = rightFloor.clone().setY(tunnelHeight);

      // Floor (left to right at y = 0)
      floorPositions.push(leftFloor.x, 0, leftFloor.z);
      floorPositions.push(rightFloor.x, 0, rightFloor.z);

      // Left Wall (from y = 0 to y = tunnelHeight)
      leftWallPositions.push(leftFloor.x, 0, leftFloor.z);
      leftWallPositions.push(leftCeil.x, tunnelHeight, leftCeil.z);

      // Right Wall (from y = 0 to y = tunnelHeight)
      rightWallPositions.push(rightFloor.x, 0, rightFloor.z);
      rightWallPositions.push(rightCeil.x, tunnelHeight, rightCeil.z);

      // Ceiling (left to right at y = tunnelHeight)
      ceilingPositions.push(leftCeil.x, tunnelHeight, leftCeil.z);
      ceilingPositions.push(rightCeil.x, tunnelHeight, rightCeil.z);

      if (i < segments) {
        const v1 = i * 2;
        const v2 = v1 + 1;
        const v3 = (i + 1) * 2;
        const v4 = v3 + 1;

        // Quad triangles
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
      color: 0xe5e5e8,
      roughness: 0.35,
      metalness: 0.08,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    // Left Wall Mesh
    const leftWallGeo = new THREE.BufferGeometry();
    leftWallGeo.setAttribute('position', new THREE.Float32BufferAttribute(leftWallPositions, 3));
    leftWallGeo.setIndex(leftWallIndices);
    leftWallGeo.computeVertexNormals();
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0xf4f4f6,
      roughness: 0.95,
      side: THREE.DoubleSide,
    });
    const leftWallMesh = new THREE.Mesh(leftWallGeo, wallMat);
    leftWallMesh.receiveShadow = true;
    scene.add(leftWallMesh);

    // Right Wall Mesh
    const rightWallGeo = new THREE.BufferGeometry();
    rightWallGeo.setAttribute('position', new THREE.Float32BufferAttribute(rightWallPositions, 3));
    rightWallGeo.setIndex(rightWallIndices);
    rightWallGeo.computeVertexNormals();
    const rightWallMesh = new THREE.Mesh(rightWallGeo, wallMat);
    rightWallMesh.receiveShadow = true;
    scene.add(rightWallMesh);

    // Ceiling Mesh
    const ceilingGeo = new THREE.BufferGeometry();
    ceilingGeo.setAttribute('position', new THREE.Float32BufferAttribute(ceilingPositions, 3));
    ceilingGeo.setIndex(ceilingIndices);
    ceilingGeo.computeVertexNormals();
    const ceilingMat = new THREE.MeshStandardMaterial({
      color: 0xfbfbfd,
      roughness: 0.9,
      side: THREE.DoubleSide,
    });
    const ceilingMesh = new THREE.Mesh(ceilingGeo, ceilingMat);
    scene.add(ceilingMesh);

    // Track lighting strips running along ceiling
    const trackLightGeo = new THREE.BoxGeometry(0.35, 0.08, 0.8);
    const trackLightMat = new THREE.MeshBasicMaterial({ color: 0xfffae0 });
    for (let i = 0; i < 30; i++) {
      const t = i / 30;
      const pt = tunnelSpline.getPointAt(t);
      const lightMesh = new THREE.Mesh(trackLightGeo, trackLightMat);
      lightMesh.position.set(pt.x, tunnelHeight - 0.04, pt.z);
      scene.add(lightMesh);
    }

    // TEXTURE LOADER & PAINTING MESHES
    const textureLoader = new THREE.TextureLoader();
    const paintingMeshes: THREE.Group[] = [];

    // Canvas texture for museum wall plaque
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
        ctx.fillText('Fine Art Archival Print • 2026', 28, 182);

        ctx.fillStyle = '#18181b';
        ctx.font = 'bold 22px -apple-system, sans-serif';
        ctx.fillText('From $50.00 • Inquire / Buy →', 28, 222);
      }
      const tex = new THREE.CanvasTexture(canvas);
      tex.anisotropy = 4;
      return tex;
    };

    // POPULATE PAINTINGS ON LEFT AND RIGHT WALLS OF THE TUNNEL
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
      const frameMat = new THREE.MeshStandardMaterial({
        color: 0x18181b,
        roughness: 0.5,
      });
      const frameMesh = new THREE.Mesh(frameGeo, frameMat);
      frameMesh.castShadow = true;
      group.add(frameMesh);

      // Mat Board
      const matGeo = new THREE.PlaneGeometry(
        printWidth + frameThickness * 0.7,
        printHeight + frameThickness * 0.7
      );
      const matMat = new THREE.MeshStandardMaterial({
        color: 0xfbfbfb,
        roughness: 0.95,
      });
      const matMesh = new THREE.Mesh(matGeo, matMat);
      matMesh.position.z = frameDepth / 2 + 0.003;
      group.add(matMesh);

      // Painting Canvas
      const artGeo = new THREE.PlaneGeometry(printWidth, printHeight);
      const artMat = new THREE.MeshStandardMaterial({
        color: 0xdddddd,
        roughness: 0.4,
      });

      // Load texture
      textureLoader.load(
        artwork.src,
        (loadedTex) => {
          loadedTex.colorSpace = THREE.SRGBColorSpace;
          loadedTex.anisotropy = 8;
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
      const plaqueWidth = 0.9;
      const plaqueHeight = 0.45;
      const plaqueGeo = new THREE.PlaneGeometry(plaqueWidth, plaqueHeight);
      const plaqueMat = new THREE.MeshStandardMaterial({
        map: createPlaqueTexture(artwork.title, artwork.collectionTitle),
        roughness: 0.8,
      });
      const plaqueMesh = new THREE.Mesh(plaqueGeo, plaqueMat);
      plaqueMesh.position.set(
        printWidth / 2 + plaqueWidth / 2 + 0.2,
        -printHeight / 2 + 0.28,
        0.01
      );
      group.add(plaqueMesh);

      // Spot light over this painting
      const artSpot = new THREE.SpotLight(0xfffaea, 1.2, 12, Math.PI / 4, 0.4);
      artSpot.position.set(0, 2.2, 1.5);
      artSpot.target = artMesh;
      group.add(artSpot);

      // Position on LEFT or RIGHT wall
      const wallOffset = wallSide === 'right' ? tunnelHalfWidth - 0.12 : -tunnelHalfWidth + 0.12;
      const pos = pt.clone().add(norm.clone().multiplyScalar(wallOffset));
      pos.y = 2.0; // Eye level height on wall
      group.position.copy(pos);

      // Orient painting to face directly INTO the tunnel center
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

    // INTERACTIVE CONTROLS (MOUSE LOOK & WALKING)
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

        // Mouse look yaw & pitch
        stateRef.current.targetYaw -= deltaX * 0.004;
        stateRef.current.targetPitch -= deltaY * 0.003;
        // Clamp pitch to avoid flipping
        stateRef.current.targetPitch = Math.max(
          -0.45,
          Math.min(0.45, stateRef.current.targetPitch)
        );
      } else {
        // Subtle gaze follow when hovering
        const normX = (e.clientX - rect.left) / rect.width - 0.5;
        const normY = (e.clientY - rect.top) / rect.height - 0.5;
        stateRef.current.targetYaw = -normX * 0.7; // Look up to ~40 degrees left/right
        stateRef.current.targetPitch = -normY * 0.35;
      }
    };

    const onMouseUp = () => {
      stateRef.current.isPointerDown = false;
    };

    // SCROLL WHEEL = WALK FORWARD / BACKWARD IN TUNNEL
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      // Scroll moves player along tunnel
      const walkSpeed = 0.00045;
      stateRef.current.targetProgress += delta * walkSpeed;
      stateRef.current.velocity = delta * walkSpeed * 0.35;
    };

    // KEYBOARD VIDEO GAME WALKING: W / S / ArrowUp / ArrowDown
    const onKeyDown = (e: KeyboardEvent) => {
      const walkStep = 0.012;
      if (e.key === 'KeyW' || e.key === 'ArrowUp') {
        stateRef.current.targetProgress += walkStep;
      } else if (e.key === 'KeyS' || e.key === 'ArrowDown') {
        stateRef.current.targetProgress -= walkStep;
      } else if (e.key === 'KeyA' || e.key === 'ArrowLeft') {
        stateRef.current.targetYaw += 0.15;
      } else if (e.key === 'KeyD' || e.key === 'ArrowRight') {
        stateRef.current.targetYaw -= 0.15;
      } else if (e.key === 'Enter' || e.key === 'Space') {
        if (activeArtwork) {
          onSelectArtwork(activeArtwork);
        }
      }
    };

    // CLICK ON PAINTINGS TO VIEW
    const onClick = (e: MouseEvent) => {
      if (Math.abs(e.clientX - stateRef.current.startX) > 8) return; // Ignore drag

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

          // Smoothly walk up to this painting
          stateRef.current.targetProgress = targetT;
          onSelectArtwork(artwork);
        }
      }
    };

    // Touch support for mobile walking & look
    let touchStartY = 0;
    const onTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
    };
    const onTouchMove = (e: TouchEvent) => {
      const deltaY = touchStartY - e.touches[0].clientY;
      touchStartY = e.touches[0].clientY;
      stateRef.current.targetProgress += deltaY * 0.0007;
    };

    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    container.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKeyDown);
    container.addEventListener('click', onClick);
    container.addEventListener('touchstart', onTouchStart, { passive: true });
    container.addEventListener('touchmove', onTouchMove, { passive: true });

    // Initial positioning if collection passed
    if (initialCollectionId) {
      const found = exhibitionItems.find(
        (it) => it.artwork.collectionId === initialCollectionId
      );
      if (found) {
        stateRef.current.progress = found.t;
        stateRef.current.targetProgress = found.t;
      }
    }

    // ANIMATION & FIRST PERSON WALKING LOOP
    let animationFrameId: number;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Inertia & velocity dampening
      if (!stateRef.current.isPointerDown) {
        stateRef.current.targetProgress += stateRef.current.velocity;
        stateRef.current.velocity *= 0.91;
      }

      // Smooth progress lerp
      stateRef.current.progress +=
        (stateRef.current.targetProgress - stateRef.current.progress) * 0.08;

      // Keep progress normalized in [0, 1)
      const p = ((stateRef.current.progress % 1) + 1) % 1;
      setCurrentProgressPct(p);

      // Smooth yaw and pitch lerp
      stateRef.current.yaw +=
        (stateRef.current.targetYaw - stateRef.current.yaw) * 0.08;
      stateRef.current.pitch +=
        (stateRef.current.targetPitch - stateRef.current.pitch) * 0.08;

      // POSITION CAMERA AT CURRENT WALKING SPOT
      const eyeHeight = 1.85;
      const camPos = tunnelSpline.getPointAt(p);
      camPos.y = eyeHeight;
      camera.position.copy(camPos);

      // CAMERA FORWARD TANGENT
      const tangent = tunnelSpline.getTangentAt(p);
      const norm = new THREE.Vector3().crossVectors(tangent, upVector).normalize();

      // Look direction: combines spline tangent with user mouse look yaw & pitch
      const lookDir = tangent
        .clone()
        .applyAxisAngle(upVector, stateRef.current.yaw)
        .add(new THREE.Vector3(0, stateRef.current.pitch, 0))
        .normalize();

      const lookTarget = camPos.clone().add(lookDir.clone().multiplyScalar(15));
      camera.lookAt(lookTarget);

      // Spotlight follows ahead of camera
      followSpotlight.position.copy(camPos.clone().add(new THREE.Vector3(0, 1.5, 0)));
      followSpotlight.target.position.copy(lookTarget);
      followSpotlight.target.updateMatrixWorld();

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

      // Determine active artwork currently being walked past
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

      // Render
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

    // CLEANUP
    return () => {
      cancelAnimationFrame(animationFrameId);
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      container.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKeyDown);
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
    };
  }, [exhibitionItems, onSelectArtwork, initialCollectionId, activeArtwork?.id]);

  // Jump to specific collection along tunnel
  const jumpToCollection = (colId: string) => {
    const item = exhibitionItems.find((it) => it.artwork.collectionId === colId);
    if (item) {
      stateRef.current.targetProgress = item.t;
    }
  };

  // Step walk buttons
  const stepWalk = (direction: 'forward' | 'backward') => {
    stateRef.current.targetProgress += direction === 'forward' ? 0.035 : -0.035;
  };

  return (
    <div className='relative w-full h-[90vh] min-h-[640px] overflow-hidden select-none bg-[#f0f0f2]'>
      {/* 3D WebGL Canvas */}
      <div ref={mountRef} className='w-full h-full' />

      {/* TOP CONTROLS: Collections Navigator Pills */}
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

        {/* Audio & Fullscreen Buttons */}
        <div className='pointer-events-auto flex items-center gap-2'>
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

      {/* STEP WALK BUTTONS ON SIDES */}
      <button
        onClick={() => stepWalk('backward')}
        className='absolute left-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-white/80 hover:bg-white text-zinc-800 shadow-md border border-zinc-200/80 backdrop-blur-md transition-all hover:scale-110 active:scale-95'
        title='Walk Backward (S / Down)'
      >
        <ChevronLeft size={22} />
      </button>

      <button
        onClick={() => stepWalk('forward')}
        className='absolute right-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-white/80 hover:bg-white text-zinc-800 shadow-md border border-zinc-200/80 backdrop-blur-md transition-all hover:scale-110 active:scale-95'
        title='Walk Forward (W / Up)'
      >
        <ChevronRight size={22} />
      </button>

      {/* HOVER TOOLTIP */}
      {hoveredPrint && (
        <div className='pointer-events-none absolute bottom-32 left-1/2 -translate-x-1/2 z-30 bg-zinc-950/85 text-white px-4 py-2 rounded-full backdrop-blur-md shadow-xl text-xs flex items-center gap-2 border border-white/10 animate-fade-in'>
          <Eye size={14} className='text-amber-400' />
          <span>
            Click to examine:{' '}
            <strong className='font-semibold'>{hoveredPrint.title}</strong>
          </span>
          <span className='text-zinc-400'>• From ${hoveredPrint.basePrice}</span>
        </div>
      )}

      {/* BOTTOM CENTER: EXACT MATCH TO VIDEO SCREEN */}
      {/* "YOU ARE WALKING PAST", SERIES TITLE, "ENTER THE COLLECTION →" */}
      <div className='absolute bottom-6 left-0 right-0 z-20 flex flex-col items-center justify-center pointer-events-none text-center px-4'>
        <div className='pointer-events-auto flex flex-col items-center bg-white/90 backdrop-blur-md px-8 py-3.5 rounded-2xl shadow-lg border border-zinc-200/80 transition-all hover:shadow-xl'>
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

      {/* BOTTOM RIGHT: VIDEO GAME WALKING INSTRUCTIONS & RADAR */}
      <div className='absolute bottom-6 right-6 z-20 hidden sm:flex items-center gap-3 pointer-events-none text-zinc-600 bg-white/80 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-zinc-200/60 shadow-sm'>
        {/* Live Tunnel Progress Radar */}
        <div className='relative w-7 h-7 rounded-full border-2 border-zinc-300 flex items-center justify-center'>
          <div
            className='absolute w-2 h-2 rounded-full bg-amber-500 shadow-sm transition-all duration-100'
            style={{
              transform: `rotate(${currentProgressPct * 360}deg) translate(9px) rotate(-${
                currentProgressPct * 360
              }deg)`,
            }}
          />
          <MapPin size={10} className='text-zinc-400' />
        </div>

        <div className='text-left'>
          <div className='text-[10px] font-bold uppercase tracking-wider text-zinc-800'>
            Scroll or W / S to Walk
          </div>
          <div className='text-[9px] text-zinc-500'>
            Move mouse to look at left & right walls
          </div>
        </div>
      </div>

      {/* BOTTOM LEFT: SHORTCUTS BADGE */}
      <div className='absolute bottom-6 left-6 z-20 hidden lg:flex items-center gap-2 pointer-events-none text-zinc-500 bg-white/70 backdrop-blur-md px-3.5 py-2 rounded-full border border-zinc-200/60 text-[11px] font-medium'>
        <Move size={13} className='text-zinc-600' />
        <span>First-Person Gallery Walkway Mode</span>
      </div>
    </div>
  );
}
