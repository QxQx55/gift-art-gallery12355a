import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { ART_COLLECTIONS, ArtworkPrint, ALL_PRINTS } from '../data/artworks';
import { Volume2, VolumeX, Maximize2, Compass, MoveHorizontal, ChevronLeft, ChevronRight, Info, Eye } from 'lucide-react';

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
  const [compassAngle, setCompassAngle] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredPrint, setHoveredPrint] = useState<ArtworkPrint | null>(null);

  // References to keep Three.js animation state
  const stateRef = useRef({
    currentAngle: 0,
    targetAngle: 0,
    velocity: 0,
    isPointerDown: false,
    pointerStartX: 0,
    lastPointerX: 0,
    lastTime: performance.now(),
    isZooming: false,
    zoomProgress: 0,
    selectedArtworkIndex: -1,
  });

  // Curated list of prints for the 3D exhibition hall (curating highlights across major collections)
  const exhibitionArtworks = React.useMemo(() => {
    // Take highlights from each major collection so user can walk through all 19 collections seamlessly
    const list: { artwork: ArtworkPrint; collectionIndex: number }[] = [];
    ART_COLLECTIONS.forEach((col, cIdx) => {
      // Pick up to 4 representative artworks per collection for the 3D gallery
      const sample = col.prints.slice(0, 4);
      sample.forEach((p) => {
        list.push({ artwork: p, collectionIndex: cIdx });
      });
    });
    return list;
  }, []);

  const audioContextRef = useRef<AudioContext | null>(null);
  const ambientGainRef = useRef<GainNode | null>(null);

  // Web Audio ambient gallery tone
  const toggleAudio = useCallback(() => {
    if (!isAudioEnabled) {
      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new AudioCtx();
        audioContextRef.current = ctx;

        // Create warm low ambient gallery room sound
        const osc = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(55, ctx.currentTime); // low hum 55Hz

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(180, ctx.currentTime);

        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        ambientGainRef.current = gain;

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
    scene.background = new THREE.Color(0xf0f0f2); // Architectural gallery neutral warm grey/white
    scene.fog = new THREE.FogExp2(0xf0f0f2, 0.025);

    // CAMERA
    const width = container.clientWidth;
    const height = container.clientHeight;
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    camera.position.set(0, 0, 0); // Positioned inside rotunda looking outward at the wall

    // RENDERER
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // LIGHTING
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfffbf5, 1.2);
    dirLight.position.set(0, 15, 0);
    dirLight.castShadow = true;
    scene.add(dirLight);

    // Gallery track spotlights
    const spotlight = new THREE.SpotLight(0xfffcf2, 1.5, 30, Math.PI / 4, 0.3, 1);
    spotlight.position.set(0, 4, 0);
    spotlight.castShadow = true;
    scene.add(spotlight);

    // ROTUNDA ARCHITECTURE (Curved Wall & Floor)
    const galleryRadius = 14; // Radius of curved exhibition hall
    const galleryHeight = 10;
    const numPaintings = exhibitionArtworks.length;
    const angleStep = (Math.PI * 2) / numPaintings;

    // Curved rotunda wall
    const wallGeo = new THREE.CylinderGeometry(
      galleryRadius,
      galleryRadius,
      galleryHeight,
      96,
      1,
      true
    );
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0xf5f5f7,
      roughness: 0.95,
      metalness: 0.02,
      side: THREE.BackSide,
    });
    const wallMesh = new THREE.Mesh(wallGeo, wallMat);
    wallMesh.position.y = 0;
    wallMesh.receiveShadow = true;
    scene.add(wallMesh);

    // Baseboard trim molding on curved wall
    const baseboardGeo = new THREE.CylinderGeometry(
      galleryRadius - 0.05,
      galleryRadius - 0.05,
      0.35,
      96,
      1,
      true
    );
    const baseboardMat = new THREE.MeshStandardMaterial({
      color: 0xdcdce0,
      roughness: 0.8,
      side: THREE.BackSide,
    });
    const baseboard = new THREE.Mesh(baseboardGeo, baseboardMat);
    baseboard.position.y = -galleryHeight / 2 + 0.18;
    scene.add(baseboard);

    // Gallery Floor
    const floorGeo = new THREE.CircleGeometry(galleryRadius + 1, 96);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0xe6e6ea,
      roughness: 0.4,
      metalness: 0.08,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = -galleryHeight / 2;
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    // Gallery Ceiling with recessed skylight
    const ceilingGeo = new THREE.CircleGeometry(galleryRadius, 64);
    const ceilingMat = new THREE.MeshStandardMaterial({
      color: 0xf8f8fa,
      roughness: 0.9,
    });
    const ceilingMesh = new THREE.Mesh(ceilingGeo, ceilingMat);
    ceilingMesh.rotation.x = Math.PI / 2;
    ceilingMesh.position.y = galleryHeight / 2;
    scene.add(ceilingMesh);

    // TEXTURE LOADER & MESH STORAGE
    const textureLoader = new THREE.TextureLoader();
    const paintingMeshes: THREE.Group[] = [];

    // Helper to generate canvas texture for museum wall plaque
    const createPlaqueTexture = (title: string, collection: string) => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#f8f8fa';
        ctx.fillRect(0, 0, 512, 256);
        ctx.strokeStyle = '#e0e0e4';
        ctx.lineWidth = 4;
        ctx.strokeRect(4, 4, 504, 248);

        ctx.fillStyle = '#18181b';
        ctx.font = 'bold 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText(title.slice(0, 24).toUpperCase(), 32, 64);

        ctx.fillStyle = '#71717a';
        ctx.font = '20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText('MAYOWA ALABI (SHUTABUG)', 32, 108);

        ctx.fillStyle = '#a1a1aa';
        ctx.font = '18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText(`Series: ${collection}`, 32, 148);
        ctx.fillText('Archival Pigment Print • 2026', 32, 184);

        ctx.fillStyle = '#18181b';
        ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText('From $50.00 • Inquire / Purchase →', 32, 224);
      }
      const texture = new THREE.CanvasTexture(canvas);
      texture.anisotropy = 4;
      return texture;
    };

    // Helper canvas texture for fallback/loading
    const createPlaceholderTexture = (title: string) => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 700;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#e4e4e7';
        ctx.fillRect(0, 0, 512, 700);
        ctx.fillStyle = '#a1a1aa';
        ctx.font = 'bold 24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(title.slice(0, 18), 256, 350);
      }
      return new THREE.CanvasTexture(canvas);
    };

    // POPULATE PAINTINGS ON CURVED WALL
    exhibitionArtworks.forEach((item, index) => {
      const { artwork } = item;
      const theta = index * angleStep;

      // Group holding painting, frame, shadow, and museum plaque
      const group = new THREE.Group();

      // Painting frame dimensions
      const printHeight = 3.6;
      const printWidth = printHeight * (artwork.ratio || 0.72);

      // 1. Sleek black wood museum frame
      const frameThickness = 0.12;
      const frameDepth = 0.1;
      const frameGeo = new THREE.BoxGeometry(
        printWidth + frameThickness * 2,
        printHeight + frameThickness * 2,
        frameDepth
      );
      const frameMat = new THREE.MeshStandardMaterial({
        color: 0x18181b,
        roughness: 0.6,
        metalness: 0.1,
      });
      const frameMesh = new THREE.Mesh(frameGeo, frameMat);
      frameMesh.castShadow = true;
      group.add(frameMesh);

      // 2. White archival mat board bevel
      const matGeo = new THREE.PlaneGeometry(
        printWidth + frameThickness * 0.8,
        printHeight + frameThickness * 0.8
      );
      const matMaterial = new THREE.MeshStandardMaterial({
        color: 0xfdfdfd,
        roughness: 0.95,
      });
      const matMesh = new THREE.Mesh(matGeo, matMaterial);
      matMesh.position.z = frameDepth / 2 + 0.005;
      group.add(matMesh);

      // 3. Artwork Canvas Mesh
      const artGeo = new THREE.PlaneGeometry(printWidth, printHeight);
      const placeholderTex = createPlaceholderTexture(artwork.title);
      const artMat = new THREE.MeshStandardMaterial({
        map: placeholderTex,
        roughness: 0.4,
        metalness: 0.05,
      });

      // Load actual image texture
      textureLoader.load(
        artwork.src,
        (loadedTex) => {
          loadedTex.colorSpace = THREE.SRGBColorSpace;
          loadedTex.anisotropy = 8;
          artMat.map = loadedTex;
          artMat.needsUpdate = true;
        },
        undefined,
        () => {
          // Keep placeholder on error
        }
      );

      const artMesh = new THREE.Mesh(artGeo, artMat);
      artMesh.position.z = frameDepth / 2 + 0.01;
      artMesh.userData = { artwork, index };
      group.add(artMesh);

      // 4. Museum Placard / Label next to artwork
      const plaqueWidth = 1.1;
      const plaqueHeight = 0.55;
      const plaqueGeo = new THREE.PlaneGeometry(plaqueWidth, plaqueHeight);
      const plaqueMat = new THREE.MeshStandardMaterial({
        map: createPlaqueTexture(artwork.title, artwork.collectionTitle),
        roughness: 0.8,
      });
      const plaqueMesh = new THREE.Mesh(plaqueGeo, plaqueMat);
      plaqueMesh.position.set(printWidth / 2 + plaqueWidth / 2 + 0.25, -printHeight / 2 + 0.35, 0.02);
      group.add(plaqueMesh);

      // Position along the curved wall
      // The inner wall is at galleryRadius, so paintings are slightly offset inward
      const r = galleryRadius - 0.2;
      group.position.x = r * Math.sin(theta);
      group.position.z = -r * Math.cos(theta);
      group.position.y = 0.2; // comfortable eye level
      group.rotation.y = theta; // Face inward towards center

      group.userData = { artwork, index, theta };
      scene.add(group);
      paintingMeshes.push(group);
    });

    // RAYCASTER FOR INTERACTIVE HOVER & CLICKS
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    // INTERACTION HANDLERS
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      stateRef.current.isPointerDown = true;
      stateRef.current.pointerStartX = clientX;
      stateRef.current.lastPointerX = clientX;
      stateRef.current.velocity = 0;
      setIsDragging(true);
    };

    const onPointerMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      // Update pointer vector for raycasting
      const rect = container.getBoundingClientRect();
      pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;

      if (stateRef.current.isPointerDown) {
        const deltaX = clientX - stateRef.current.lastPointerX;
        stateRef.current.lastPointerX = clientX;

        // Sensitivity factor for natural panoramic sweep
        const sensitivity = 0.0035;
        stateRef.current.targetAngle -= deltaX * sensitivity;
        stateRef.current.velocity = -deltaX * sensitivity;
      }
    };

    const onPointerUp = () => {
      stateRef.current.isPointerDown = false;
      setIsDragging(false);
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      const sensitivity = 0.0018;
      stateRef.current.targetAngle += delta * sensitivity;
      stateRef.current.velocity = delta * sensitivity * 0.5;
    };

    const onClick = (e: MouseEvent) => {
      // If user was dragging significantly, ignore click
      if (Math.abs(e.clientX - stateRef.current.pointerStartX) > 8) return;

      const rect = container.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObjects(
        paintingMeshes.flatMap((g) => g.children),
        true
      );

      if (intersects.length > 0) {
        // Find top group
        let hitGroup: THREE.Object3D | null = intersects[0].object;
        while (hitGroup && !hitGroup.userData?.artwork && hitGroup.parent) {
          hitGroup = hitGroup.parent;
        }

        if (hitGroup && hitGroup.userData?.artwork) {
          const artwork: ArtworkPrint = hitGroup.userData.artwork;
          const theta = hitGroup.userData.theta;

          // Smoothly align targetAngle to face this artwork perfectly
          stateRef.current.targetAngle = theta;

          // Select this artwork!
          onSelectArtwork(artwork);
        }
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'KeyD') {
        stateRef.current.targetAngle += angleStep;
      } else if (e.key === 'ArrowLeft' || e.key === 'KeyA') {
        stateRef.current.targetAngle -= angleStep;
      } else if (e.key === 'Enter' || e.key === 'Space') {
        if (activeArtwork) {
          onSelectArtwork(activeArtwork);
        }
      }
    };

    // Attach listeners
    container.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);
    container.addEventListener('touchstart', onPointerDown, { passive: true });
    window.addEventListener('touchmove', onPointerMove, { passive: true });
    window.addEventListener('touchend', onPointerUp);
    container.addEventListener('wheel', onWheel, { passive: false });
    container.addEventListener('click', onClick);
    window.addEventListener('keydown', onKeyDown);

    // Initial positioning if initialCollectionId passed
    if (initialCollectionId) {
      const foundIdx = exhibitionArtworks.findIndex(
        (item) => item.artwork.collectionId === initialCollectionId
      );
      if (foundIdx !== -1) {
        stateRef.current.currentAngle = foundIdx * angleStep;
        stateRef.current.targetAngle = foundIdx * angleStep;
      }
    }

    // ANIMATION LOOP
    let animationFrameId: number;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Inertia physics & smooth dampening
      if (!stateRef.current.isPointerDown) {
        stateRef.current.targetAngle += stateRef.current.velocity;
        stateRef.current.velocity *= 0.92; // Friction decay
      }

      // Smooth lerp towards target angle
      stateRef.current.currentAngle +=
        (stateRef.current.targetAngle - stateRef.current.currentAngle) * 0.08;

      const angle = stateRef.current.currentAngle;

      // Update camera orientation: rotating around Y axis inside rotunda
      camera.rotation.y = angle;

      // Update spotlight position to point towards the direction camera is facing
      spotlight.position.x = Math.sin(angle) * 3;
      spotlight.position.z = -Math.cos(angle) * 3;
      spotlight.target.position.set(
        Math.sin(angle) * galleryRadius,
        0,
        -Math.cos(angle) * galleryRadius
      );
      spotlight.target.updateMatrixWorld();

      // Compass UI update
      setCompassAngle((angle * 180) / Math.PI);

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
        container.style.cursor = stateRef.current.isPointerDown ? 'grabbing' : 'grab';
      }
      setHoveredPrint(foundHover);

      // Find which artwork is currently in center of view
      // Normalize angle to [0, 2PI)
      const normalizedAngle =
        ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      const closestIdx = Math.round(normalizedAngle / angleStep) % numPaintings;

      if (
        exhibitionArtworks[closestIdx] &&
        exhibitionArtworks[closestIdx].artwork.id !== activeArtwork?.id
      ) {
        const item = exhibitionArtworks[closestIdx];
        setActiveArtwork(item.artwork);
        const col = ART_COLLECTIONS.find((c) => c.id === item.artwork.collectionId);
        if (col) setActiveCollection(col);
      }

      // Render
      renderer.render(scene, camera);
    };

    animate();

    // RESIZE HANDLER
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
      container.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('mouseup', onPointerUp);
      container.removeEventListener('touchstart', onPointerDown);
      window.removeEventListener('touchmove', onPointerMove);
      window.removeEventListener('touchend', onPointerUp);
      container.removeEventListener('wheel', onWheel);
      container.removeEventListener('click', onClick);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onResize);

      // Dispose Three.js objects
      scene.clear();
      renderer.dispose();
      wallGeo.dispose();
      wallMat.dispose();
      floorGeo.dispose();
      floorMat.dispose();
      ceilingGeo.dispose();
      ceilingMat.dispose();
    };
  }, [exhibitionArtworks, onSelectArtwork, initialCollectionId, activeArtwork?.id]);

  // Quick navigation to step left or right
  const stepGallery = (direction: 'left' | 'right') => {
    const angleStep = (Math.PI * 2) / exhibitionArtworks.length;
    stateRef.current.targetAngle += direction === 'right' ? angleStep : -angleStep;
  };

  // Jump to specific collection
  const jumpToCollection = (colId: string) => {
    const angleStep = (Math.PI * 2) / exhibitionArtworks.length;
    const idx = exhibitionArtworks.findIndex((item) => item.artwork.collectionId === colId);
    if (idx !== -1) {
      stateRef.current.targetAngle = idx * angleStep;
    }
  };

  return (
    <div className='relative w-full h-[88vh] min-h-[600px] overflow-hidden select-none bg-[#f0f0f2]'>
      {/* 3D WebGL Canvas Container */}
      <div ref={mountRef} className='w-full h-full' />

      {/* TOP CONTROLS BAR: Collection Pills */}
      <div className='absolute top-4 left-0 right-0 z-20 flex items-center justify-between px-6 pointer-events-none'>
        {/* Left: Collections selector pills */}
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

        {/* Right Utility Buttons: Audio toggle & Fullscreen */}
        <div className='pointer-events-auto flex items-center gap-2'>
          <button
            onClick={toggleAudio}
            className='p-2.5 rounded-full bg-white/80 hover:bg-white text-zinc-700 hover:text-black shadow-sm border border-zinc-200/60 backdrop-blur-md transition-all'
            title={isAudioEnabled ? 'Mute Gallery Ambiance' : 'Enable Gallery Ambiance'}
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

      {/* SIDE ARROW NAVIGATION BUTTONS */}
      <button
        onClick={() => stepGallery('left')}
        className='absolute left-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-white/75 hover:bg-white text-zinc-800 shadow-md border border-zinc-200/80 backdrop-blur-md transition-all hover:scale-110 active:scale-95'
        aria-label='Previous Artwork'
      >
        <ChevronLeft size={22} />
      </button>

      <button
        onClick={() => stepGallery('right')}
        className='absolute right-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-white/75 hover:bg-white text-zinc-800 shadow-md border border-zinc-200/80 backdrop-blur-md transition-all hover:scale-110 active:scale-95'
        aria-label='Next Artwork'
      >
        <ChevronRight size={22} />
      </button>

      {/* HOVER TOOLTIP FLOATER */}
      {hoveredPrint && !isDragging && (
        <div className='pointer-events-none absolute bottom-32 left-1/2 -translate-x-1/2 z-30 bg-zinc-950/85 text-white px-4 py-2 rounded-full backdrop-blur-md shadow-xl text-xs flex items-center gap-2 border border-white/10 animate-fade-in'>
          <Eye size={14} className='text-amber-400' />
          <span>Click to view: <strong className='font-semibold'>{hoveredPrint.title}</strong></span>
          <span className='text-zinc-400'>• From ${hoveredPrint.basePrice}</span>
        </div>
      )}

      {/* BOTTOM CENTER: EXACT MATCH TO VIDEO SCREEN */}
      {/* "MATCH DAY - 26/27", "THE BEAUTIFUL GAME", "KERESIMESI (CHRISTMAS)" */}
      {/* with "ENTER THE COLLECTION →" and counts */}
      <div className='absolute bottom-6 left-0 right-0 z-20 flex flex-col items-center justify-center pointer-events-none text-center px-4'>
        <div className='pointer-events-auto flex flex-col items-center bg-white/85 backdrop-blur-md px-8 py-3.5 rounded-2xl shadow-lg border border-zinc-200/80 transition-all hover:shadow-xl'>
          <div className='text-[10px] uppercase tracking-[0.25em] text-zinc-500 font-bold mb-0.5'>
            You are walking past
          </div>
          <h2 className='text-xl sm:text-2xl font-black uppercase tracking-tight text-zinc-900'>
            {activeCollection?.title || 'The Exhibition'}
          </h2>
          {activeArtwork && (
            <p className='text-xs text-zinc-600 font-medium mt-0.5'>
              Focused: <span className='text-zinc-900 font-semibold'>{activeArtwork.title}</span> • By {activeArtwork.artist}
            </p>
          )}

          <div className='flex items-center gap-3 mt-2'>
            <button
              onClick={() => activeArtwork && onSelectArtwork(activeArtwork)}
              className='px-4 py-1.5 bg-zinc-900 text-white hover:bg-black text-xs font-semibold uppercase tracking-wider rounded-full shadow-sm hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5'
            >
              <span>View Art & Buy Print</span>
              <span className='text-amber-400'>${activeArtwork?.basePrice || 50}</span>
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

      {/* BOTTOM RIGHT: EXACT NAVIGATION HINT FROM VIDEO */}
      {/* "DRAG OR SCROLL TO WALK" with circular compass reticle */}
      <div className='absolute bottom-6 right-6 z-20 hidden sm:flex items-center gap-2.5 pointer-events-none text-zinc-600 bg-white/70 backdrop-blur-md px-3.5 py-2 rounded-full border border-zinc-200/60 shadow-sm'>
        <div
          className='w-5 h-5 flex items-center justify-center transition-transform duration-100 ease-out'
          style={{ transform: `rotate(${-compassAngle}deg)` }}
        >
          <Compass size={18} className='text-zinc-700' />
        </div>
        <span className='text-[11px] font-semibold tracking-wider uppercase text-zinc-700'>
          Drag or Scroll to Walk
        </span>
      </div>

      {/* BOTTOM LEFT: HINT / KEYBOARD CONTROLS */}
      <div className='absolute bottom-6 left-6 z-20 hidden lg:flex items-center gap-2 pointer-events-none text-zinc-500 bg-white/70 backdrop-blur-md px-3 py-1.5 rounded-full border border-zinc-200/60 text-[11px] font-medium'>
        <MoveHorizontal size={14} />
        <span>Use Drag, Mouse Wheel or ← → Keys</span>
      </div>
    </div>
  );
}

// Dynamic track spotlights and gallery ambient lighting updates
// Interactive raycasting detection for mouse hover and click-to-zoom
