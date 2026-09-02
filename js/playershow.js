// ==========================================
// ARENAX 3D PLAYER SHOW / THREE.JS ENGINE
// ==========================================

// Module variables
let playerShow3DModel = null;
let playerShowCoinGroup = null;
let playerShow3DScene = null;
let playerShow3DCamera = null;
let playerShow3DRenderer = null;
let playerShow3DControls = null;
let playerShow3DAutoRotateTimer = null;
let playerShow3DAnimFrame = null;

// ── GLOBAL ARENAX 3D ASSET PRELOAD & CACHE SYSTEM ──
window.ARENAX_3D_CACHE = window.ARENAX_3D_CACHE || {
  parsedGltf: {},
  loadingPromises: {},
};

// Deep clones GLTF scenes while correctly rebinding SkinnedMeshes and Skeletons
function cloneArenaXGltf(gltf) {
  if (!gltf || !gltf.scene) return null;
  const THREE = window.THREE;
  if (!THREE) return gltf.scene.clone();

  const sourceScene = gltf.scene;
  const clone = {
    animations: gltf.animations || [],
    scene: sourceScene.clone(true)
  };

  const parallelTraverse = (a, b, callback) => {
    callback(a, b);
    if (a.children && b.children) {
      for (let i = 0; i < a.children.length; ++i) {
        parallelTraverse(a.children[i], b.children[i], callback);
      }
    }
  };

  const bones = {};
  const clonedMeshes = [];

  parallelTraverse(sourceScene, clone.scene, (source, target) => {
    if (source.isBone) {
      bones[source.name || source.uuid] = target;
    }
    if (source.isSkinnedMesh) {
      clonedMeshes.push({ source, target });
    }
  });

  for (const { source, target } of clonedMeshes) {
    if (source.skeleton) {
      const sourceBones = source.skeleton.bones;
      const targetBones = [];
      for (let i = 0; i < sourceBones.length; i++) {
        const sourceBone = sourceBones[i];
        targetBones.push(bones[sourceBone.name || sourceBone.uuid] || sourceBone);
      }
      target.bind(new THREE.Skeleton(targetBones, source.skeleton.boneInverses), target.matrixWorld);
    }
  }

  return clone;
}

// Loads and caches a 3D model asset silently in the background
function preloadArenaX3DModel(fileName) {
  if (!fileName) return Promise.resolve(null);
  const cleanFileName = String(fileName).replace(/^(\.\/|\/)/, '');
  if (window.ARENAX_3D_CACHE.parsedGltf[cleanFileName]) {
    return Promise.resolve(window.ARENAX_3D_CACHE.parsedGltf[cleanFileName]);
  }
  if (window.ARENAX_3D_CACHE.loadingPromises[cleanFileName]) {
    return window.ARENAX_3D_CACHE.loadingPromises[cleanFileName];
  }

  const THREE = window.THREE;
  const GLTFLoaderClass = THREE?.GLTFLoader || window.GLTFLoader;
  if (!GLTFLoaderClass) return Promise.resolve(null);

  const loader = new GLTFLoaderClass();
  const DRACOLoaderClass = THREE?.DRACOLoader || window.DRACOLoader;
  if (DRACOLoaderClass) {
    try {
      const dracoLoader = new DRACOLoaderClass();
      dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
      dracoLoader.setDecoderConfig({ type: 'js' });
      loader.setDRACOLoader(dracoLoader);
    } catch(e) {
      console.warn('[ArenaX 3D] DRACOLoader setup error:', e);
    }
  }

  const candidateUrls = [
    '/' + cleanFileName,
    './' + cleanFileName,
    cleanFileName
  ];
  if (typeof window.getAppBasePath === 'function') {
    try {
      const b = window.getAppBasePath();
      if (b && b !== '/' && b !== './') {
        candidateUrls.push(b.endsWith('/') ? b + cleanFileName : b + '/' + cleanFileName);
      }
    } catch(e) {}
  }
  const urlsToTry = Array.from(new Set(candidateUrls));

  const promise = new Promise((resolve) => {
    const tryLoad = (idx) => {
      if (idx >= urlsToTry.length) {
        console.warn(`[ArenaX 3D] Failed to load model "${cleanFileName}" from any candidate URL (${urlsToTry.join(', ')}). Using procedural fallback.`);
        resolve(null);
        return;
      }
      const targetUrl = urlsToTry[idx];
      loader.load(
        targetUrl,
        (gltf) => {
          console.log(`[ArenaX 3D] Successfully loaded model "${cleanFileName}" from ${targetUrl}`);
          // Prepare textures
          if (gltf && gltf.scene) {
            gltf.scene.traverse((child) => {
              if (child.isMesh && child.material) {
                const materials = Array.isArray(child.material) ? child.material : [child.material];
                materials.forEach((mat) => {
                  if (mat.map) {
                    if (THREE.SRGBColorSpace) mat.map.colorSpace = THREE.SRGBColorSpace;
                    if (THREE.sRGBEncoding) mat.map.encoding = THREE.sRGBEncoding;
                    mat.map.flipY = false;
                    mat.map.needsUpdate = true;
                  }
                  if (mat.emissiveMap) {
                    if (THREE.SRGBColorSpace) mat.emissiveMap.colorSpace = THREE.SRGBColorSpace;
                    if (THREE.sRGBEncoding) mat.emissiveMap.encoding = THREE.sRGBEncoding;
                    mat.emissiveMap.flipY = false;
                    mat.emissiveMap.needsUpdate = true;
                  }
                  mat.needsUpdate = true;
                });
              }
            });
          }
          window.ARENAX_3D_CACHE.parsedGltf[cleanFileName] = gltf;
          resolve(gltf);
        },
        undefined,
        (err) => {
          console.warn(`[ArenaX 3D] Attempt ${idx + 1}/${urlsToTry.length} failed for "${targetUrl}":`, err?.message || err);
          tryLoad(idx + 1);
        }
      );
    };
    tryLoad(0);
  });

  window.ARENAX_3D_CACHE.loadingPromises[cleanFileName] = promise;
  return promise;
}

// Background preloader: runs silently during splash screen without creating any canvas/DOM elements
function initArenaX3DBackgroundPreload() {
  const models = [
    'character_boy_1_fbx.glb',
    'Convert_Waving.glb',
    'model3.glb',
    'model4.glb',
    'model5.glb',
    'model6.glb'
  ];
  if (Array.isArray(window.CHARACTER_3D_MODELS_DATA)) {
    window.CHARACTER_3D_MODELS_DATA.forEach(m => {
      if (m.fileName && !models.includes(m.fileName)) {
        models.push(m.fileName);
      }
    });
  }
  models.forEach(m => {
    preloadArenaX3DModel(m).catch(() => {});
  });
}

// Kick off background preload immediately while splash screen is showing
if (typeof window !== 'undefined') {
  setTimeout(() => {
    initArenaX3DBackgroundPreload();
  }, 50);
}

const CHARACTER_3D_MODELS_DATA = [
  {
    id: 'classic_boy',
    name: 'Classic Boy',
    subtitle: 'Static 3D Character Avatar',
    fileName: 'character_boy_1_fbx.glb',
    price: 7000,
    icon: 'fa-cube',
    isAnimated: false,
    badgeText: 'Classic'
  },
  {
    id: 'waving_hero',
    name: 'Waving Hero',
    subtitle: 'Animated Waving Avatar',
    fileName: 'Convert_Waving.glb',
    price: 7000,
    icon: 'fa-child',
    isAnimated: true,
    badgeText: 'Animated'
  },
  {
    id: 'model3',
    name: 'Cyber Guardian',
    subtitle: 'Premium 3D Avatar',
    fileName: 'model3.glb',
    price: 9999,
    icon: 'fa-robot',
    isAnimated: true,
    badgeText: '9,999 AX'
  },
  {
    id: 'model4',
    name: 'Cyber Titan',
    subtitle: 'Heavy Armor 3D Avatar',
    fileName: 'model4.glb',
    price: 9999,
    icon: 'fa-shield-halved',
    isAnimated: true,
    badgeText: '9,999 AX'
  },
  {
    id: 'model5',
    name: 'Shadow Striker',
    subtitle: 'Stealth 3D Avatar',
    fileName: 'model5.glb',
    price: 9999,
    icon: 'fa-bolt',
    isAnimated: true,
    badgeText: '9,999 AX'
  },
  {
    id: 'model6',
    name: 'Nexus Ranger',
    subtitle: 'Futuristic 3D Avatar',
    fileName: 'model6.glb',
    price: 9999,
    icon: 'fa-crosshairs',
    isAnimated: true,
    badgeText: '9,999 AX'
  }
];

let currentSelected3DModelId = 'classic_boy';
let playerShow3DClock = null;
let playerShow3DMixer = null;
let playerShowLoggedAnim = false;

function autoFramePlayerShowCamera(object, camera, controls, width, height) {
  if (!object || !camera) return;
  const THREE = window.THREE;
  if (!THREE) return;

  // Reset any pre-existing rotation or translation on the model
  object.rotation.set(0, 0, 0);
  object.scale.set(1, 1, 1);
  object.updateMatrixWorld(true);

  // Calculate bounding box and center
  const box = new THREE.Box3().setFromObject(object);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());

  // Center model exactly at origin
  object.position.set(-center.x, -center.y, -center.z);
  object.updateMatrixWorld(true);

  // Recalculate centered bounding box and size
  const centeredBox = new THREE.Box3().setFromObject(object);
  const centeredSize = centeredBox.getSize(new THREE.Vector3());
  const maxDim = Math.max(centeredSize.x, centeredSize.y, centeredSize.z);

  const fov = camera.fov * (Math.PI / 180);
  let distance = (maxDim / 2) / Math.tan(fov / 2);

  const aspect = (width && height) ? (width / height) : (camera.aspect || 1.0);
  camera.aspect = aspect;

  if (aspect < 1.0) {
    distance = distance / aspect;
  }

  // Framing padding: 1.45x provides clear view of entire model from head to feet with generous margins
  distance = Math.max(distance * 1.45, 2.5);

  const camY = centeredSize.y * 0.05;
  camera.position.set(0, camY, distance);
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();

  if (controls) {
    controls.target.set(0, 0, 0);
    controls.minDistance = distance * 0.25;
    controls.maxDistance = distance * 3.5;
    controls.update();
  }
}

function is3DModelUnlocked(profile, model) {
  if (!profile) return false;
  if (profile.unlocked3dModels && Array.isArray(profile.unlocked3dModels)) {
    if (profile.unlocked3dModels.includes(model.id) || 
        profile.unlocked3dModels.includes(model.fileName) ||
        profile.unlocked3dModels.includes(model.fileName.toLowerCase()) ||
        profile.unlocked3dModels.includes(model.id.toLowerCase())) {
      return true;
    }
  }
  // If legacy playerShowUnlocked or character3dUnlocked is true, Classic Boy is unlocked
  if (model.id === 'classic_boy' && (profile.playerShowUnlocked || profile.character3dUnlocked)) {
    return true;
  }
  return false;
}

function getActive3DModelFileName(profile) {
  if (!profile) return 'character_boy_1_fbx.glb';
  if (profile.active3dModel) {
    const act = String(profile.active3dModel).toLowerCase();
    if (act.includes('model6')) return 'model6.glb';
    if (act.includes('model5')) return 'model5.glb';
    if (act.includes('model4')) return 'model4.glb';
    if (act.includes('model3')) return 'model3.glb';
    if (act.includes('waving') || act.includes('hero')) return 'Convert_Waving.glb';
    if (act.includes('classic') || act.includes('boy')) return 'character_boy_1_fbx.glb';
    return profile.active3dModel;
  }
  if (profile.unlocked3dModels && Array.isArray(profile.unlocked3dModels)) {
    const last = profile.unlocked3dModels[profile.unlocked3dModels.length - 1];
    if (typeof last === 'string') {
      if (last.includes('model6')) return 'model6.glb';
      if (last.includes('model5')) return 'model5.glb';
      if (last.includes('model4')) return 'model4.glb';
      if (last.includes('model3')) return 'model3.glb';
      if (last.toLowerCase().includes('waving') || last.toLowerCase().includes('hero')) return 'Convert_Waving.glb';
    }
  }
  return 'character_boy_1_fbx.glb';
}

function renderPlayerShowSelectorUI() {
  const profile = window.userProfile || window.currentUser || (typeof window.getActiveUserProfile === 'function' ? window.getActiveUserProfile() : null);
  const container = document.getElementById('pPlayerShowModelCardsList');
  const balanceEl = document.getElementById('pPlayerShowViewerUserBalance');
  const footerAction = document.getElementById('pPlayerShowViewerFooterAction');

  const userCoins = profile?.balance !== undefined ? profile.balance : (profile?.axCoins || 0);
  if (balanceEl) {
    balanceEl.textContent = Number(userCoins).toLocaleString();
  }

  const activeFileName = getActive3DModelFileName(profile);
  const selectedModel = CHARACTER_3D_MODELS_DATA.find(m => m.id === currentSelected3DModelId) || CHARACTER_3D_MODELS_DATA[0];

  // Render cards in two rows: Row 1 (first 3 models) and Row 2 (newly added models)
  if (container) {
    function renderModelCardHTML(m) {
      const isSelected = m.id === selectedModel.id;
      const isUnlocked = is3DModelUnlocked(profile, m);
      const isEquipped = isUnlocked && (activeFileName === m.fileName || (m.id === 'classic_boy' && activeFileName === 'character_boy_1_fbx.glb'));

      let statusDisplay = '';
      if (isEquipped) {
        statusDisplay = '<span class="text-[10px] text-emerald-300 font-black flex items-center gap-0.5"><i class="fas fa-check-circle text-[9px]"></i> Active</span>';
      } else if (isUnlocked) {
        statusDisplay = '<span class="text-[10px] text-amber-300 font-black flex items-center gap-0.5"><i class="fas fa-unlock text-[9px]"></i> Owned</span>';
      } else {
        statusDisplay = `<span class="text-[10px] text-[#f7d154] font-black font-mono flex items-center gap-1"><span>🪙</span> ${m.price.toLocaleString()}</span>`;
      }

      return `
        <button
          type="button"
          onclick="window.selectPlayerShowModel('${m.id}')"
          class="relative p-3 rounded-2xl border-2 text-left flex flex-col justify-between transition-all duration-200 cursor-pointer overflow-hidden h-32 ${
            isSelected
              ? 'bg-gradient-to-br from-[#4d637f] to-[#36475d] border-[#24d9c8] shadow-[0_0_18px_rgba(36,217,200,0.45)] ring-2 ring-[#24d9c8]/50'
              : 'bg-[#4b5e78]/80 hover:bg-[#576c88] border-white/15 hover:border-white/30'
          }"
        >
          <!-- Top Card Badges -->
          <div class="flex items-center justify-between w-full">
            <span class="text-[10px] font-bold text-white/80 uppercase tracking-wider font-mono">
              ${m.isAnimated ? 'ANIM' : '3D'}
            </span>
            <span class="px-1.5 py-0.5 rounded-md bg-[#f0c040] text-slate-950 text-[10px] font-black shadow-xs">
              S
            </span>
          </div>

          <!-- Center Icon Thumbnail -->
          <div class="flex items-center justify-center my-auto text-2xl text-white/90">
            <i class="fas ${m.icon || 'fa-user'}"></i>
          </div>

          <!-- Bottom Model Details -->
          <div class="w-full pt-1">
            <p class="text-xs font-black text-white truncate leading-tight drop-shadow-xs">
              ${m.name}
            </p>
            <div class="flex items-center gap-1 mt-0.5">
              ${statusDisplay}
            </div>
          </div>
        </button>
      `;
    }

    const row1 = CHARACTER_3D_MODELS_DATA.slice(0, 3);
    const row2 = CHARACTER_3D_MODELS_DATA.slice(3);

    let html = `<div class="grid grid-cols-3 gap-2 sm:gap-3">${row1.map(renderModelCardHTML).join('')}</div>`;
    if (row2.length > 0) {
      html += `<div class="grid grid-cols-3 gap-2 sm:gap-3 overflow-x-auto pb-0.5 no-scrollbar">${row2.map(renderModelCardHTML).join('')}</div>`;
    }
    container.innerHTML = html;
  }

  // Update Floating Action Button
  if (footerAction) {
    const isUnlocked = is3DModelUnlocked(profile, selectedModel);
    const isEquipped = isUnlocked && (activeFileName === selectedModel.fileName || (selectedModel.id === 'classic_boy' && activeFileName === 'character_boy_1_fbx.glb'));

    if (isEquipped) {
      footerAction.innerHTML = `
        <div class="bg-emerald-500/90 text-slate-950 font-black text-xs px-4 py-2 rounded-2xl shadow-[0_4px_16px_rgba(16,185,129,0.35)] flex items-center gap-1.5 uppercase tracking-wider backdrop-blur-md">
          <i class="fas fa-check-circle text-xs"></i>
          <span>Active</span>
        </div>
      `;
    } else if (isUnlocked) {
      footerAction.innerHTML = `
        <button
          type="button"
          onclick="window.equipSelected3DModel('${selectedModel.id}')"
          class="bg-[#24d9c8] hover:bg-[#1eccba] active:scale-95 text-[#051c24] font-black text-xs px-4 py-2 rounded-2xl shadow-[0_4px_16px_rgba(36,217,200,0.35)] flex items-center gap-1.5 transition-all cursor-pointer uppercase tracking-wider"
        >
          <i class="fas fa-magic text-xs"></i>
          <span>Equip</span>
        </button>
      `;
    } else {
      footerAction.innerHTML = `
        <button
          id="btnViewerFooterBuy"
          type="button"
          onclick="window.purchaseSelected3DModel('${selectedModel.id}')"
          class="bg-[#24d9c8] hover:bg-[#1eccba] active:scale-95 text-[#051c24] font-black text-xs px-4 py-2 rounded-2xl shadow-[0_4px_16px_rgba(36,217,200,0.35)] flex items-center gap-2 transition-all cursor-pointer uppercase tracking-wider"
        >
          <i class="fas fa-shopping-cart text-xs"></i>
          <span>Purchase</span>
          <span class="w-4 h-4 rounded-full bg-[#051c24] text-[#24d9c8] text-[10px] font-black flex items-center justify-center">
            1
          </span>
        </button>
      `;
    }
  }
}

function loadPlayerShowModelFile(fileName) {
  const loadingEl = document.getElementById('pPlayerShow3DLoading');
  const loadingText = document.getElementById('pPlayerShowLoadingText');
  const loadingSub = document.getElementById('pPlayerShowLoadingSub');
  const errorEl = document.getElementById('pPlayerShow3DError');
  const errMsgEl = document.getElementById('pPlayerShow3DErrMsg');
  const hintEl = document.getElementById('pPlayerShow3DHint');

  if (loadingEl) loadingEl.classList.remove('hidden');
  if (loadingText) loadingText.textContent = "Loading 3D Character Model...";
  if (loadingSub) loadingSub.textContent = fileName;
  if (errorEl) errorEl.classList.add('hidden');
  if (hintEl) hintEl.classList.add('hidden');

  // Dispose previous model and mixer
  if (playerShow3DMixer) {
    try { playerShow3DMixer.stopAllAction(); } catch(e) {}
    playerShow3DMixer = null;
  }

  if (playerShow3DModel && playerShow3DScene) {
    playerShow3DScene.remove(playerShow3DModel);
    playerShow3DModel.traverse((child) => {
      if (child.isMesh) {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
          else child.material.dispose();
        }
      }
    });
    playerShow3DModel = null;
  }

  if (playerShowCoinGroup && playerShow3DScene) {
    playerShow3DScene.remove(playerShowCoinGroup);
    playerShowCoinGroup = null;
  }

  const THREE = window.THREE;
  if (!THREE || !playerShow3DScene) return;

  function setupProceduralFallback() {
    console.log("[PlayerShow] Rendering procedural 3D character avatar model...");
    const charData = createProceduralCharacter3D(THREE);
    playerShow3DModel = charData.group;
    playerShowCoinGroup = charData.coinGroup;
    playerShow3DScene.add(playerShow3DModel);
    autoFramePlayerShowCamera(playerShow3DModel, playerShow3DCamera, playerShow3DControls);

    if (loadingEl) loadingEl.classList.add('hidden');
    if (hintEl) hintEl.classList.remove('hidden');
  }

  const cleanFileName = String(fileName || 'character_boy_1_fbx.glb').replace(/^(\.\/|\/)/, '');

  if (typeof preloadArenaX3DModel === 'function') {
    preloadArenaX3DModel(cleanFileName).then((cachedGltf) => {
      if (cachedGltf) {
        const cloned = typeof cloneArenaXGltf === 'function' ? cloneArenaXGltf(cachedGltf) : { scene: cachedGltf.scene.clone(), animations: cachedGltf.animations };
        playerShow3DModel = cloned.scene;

        // ── ANIMATION HANDLING ──
        // FIX 1: Classic Boy (character_boy_1_fbx.glb) has no animations played — completely static default pose.
        // FIX 2: Models with animations (Convert_Waving.glb, model3.glb) play their animation in a loop.
        const isClassicBoy = cleanFileName.includes('character_boy_1');
        
        const animations = cloned.animations || cachedGltf.animations;
        if (!isClassicBoy && animations && animations.length > 0) {
          let activeClip = animations.find(a => 
            a.name && (a.name.toLowerCase().includes('wave') || a.name.toLowerCase().includes('mixamo') || a.name.toLowerCase().includes('idle') || a.name.toLowerCase().includes('action') || a.name.toLowerCase().includes('layer0'))
          ) || animations[0];

          playerShow3DMixer = new THREE.AnimationMixer(playerShow3DModel);
          const action = playerShow3DMixer.clipAction(activeClip);
          action.reset();
          action.setLoop(THREE.LoopRepeat);
          action.play();
          playerShowLoggedAnim = false;
        }

        playerShow3DScene.add(playerShow3DModel);
        autoFramePlayerShowCamera(playerShow3DModel, playerShow3DCamera, playerShow3DControls);
        if (loadingEl) loadingEl.classList.add('hidden');
        if (hintEl) hintEl.classList.remove('hidden');
      } else {
        const isNewModel = ['model4.glb', 'model5.glb', 'model6.glb'].includes(cleanFileName);
        if (isNewModel) {
          if (loadingEl) loadingEl.classList.add('hidden');
          if (errorEl) errorEl.classList.remove('hidden');
          if (errMsgEl) errMsgEl.textContent = `Failed to load 3D model asset: ${cleanFileName}`;
        } else {
          setupProceduralFallback();
        }
      }
    }).catch((err) => {
      const isNewModel = ['model4.glb', 'model5.glb', 'model6.glb'].includes(cleanFileName);
      if (isNewModel) {
        if (loadingEl) loadingEl.classList.add('hidden');
        if (errorEl) errorEl.classList.remove('hidden');
        if (errMsgEl) errMsgEl.textContent = `Failed to load 3D model: ${err?.message || cleanFileName}`;
      } else {
        setupProceduralFallback();
      }
    });
  } else {
    setupProceduralFallback();
  }
}

window.selectPlayerShowModel = function(modelId) {
  const model = CHARACTER_3D_MODELS_DATA.find(m => m.id === modelId);
  if (!model) return;
  currentSelected3DModelId = model.id;
  renderPlayerShowSelectorUI();
  loadPlayerShowModelFile(model.fileName);
};

function openPlayerShowViewer() {
  console.log("[PlayerShow] openPlayerShowViewer initiated...");
  const modal = document.getElementById('pPlayerShowViewerPage');
  if (!modal) {
    console.error("[PlayerShow] #pPlayerShowViewerPage not found in DOM");
    return;
  }

  modal.classList.remove('hidden');

  const canvasContainer = document.getElementById('pPlayerShow3DCanvas');
  const loadingEl = document.getElementById('pPlayerShow3DLoading');
  const errorEl = document.getElementById('pPlayerShow3DError');
  const errMsgEl = document.getElementById('pPlayerShow3DErrMsg');
  const hintEl = document.getElementById('pPlayerShow3DHint');

  if (loadingEl) loadingEl.classList.remove('hidden');
  if (errorEl) errorEl.classList.add('hidden');
  if (hintEl) hintEl.classList.add('hidden');

  closePlayerShowViewerInternal();

  const THREE = window.THREE;
  if (!THREE) {
    console.error("[PlayerShow] window.THREE missing!");
    if (loadingEl) loadingEl.classList.add('hidden');
    if (errorEl) errorEl.classList.remove('hidden');
    if (errMsgEl) errMsgEl.textContent = "Three.js script is missing.";
    return;
  }

  playerShow3DClock = new THREE.Clock();

  const width = canvasContainer.clientWidth || window.innerWidth;
  const height = canvasContainer.clientHeight || (window.innerHeight - 180);

  playerShow3DScene = new THREE.Scene();
  playerShow3DScene.background = null;

  playerShow3DCamera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
  playerShow3DCamera.position.set(0, 1.2, 3.5);

  try {
    playerShow3DRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    playerShow3DRenderer.setSize(width, height);
    playerShow3DRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    if (THREE.SRGBColorSpace) playerShow3DRenderer.outputColorSpace = THREE.SRGBColorSpace;
    if (THREE.sRGBEncoding) playerShow3DRenderer.outputEncoding = THREE.sRGBEncoding;

    canvasContainer.innerHTML = '';
    canvasContainer.appendChild(playerShow3DRenderer.domElement);
  } catch(e) {
    console.error("[PlayerShow] WebGLRenderer error:", e);
    if (loadingEl) loadingEl.classList.add('hidden');
    if (errorEl) errorEl.classList.remove('hidden');
    if (errMsgEl) errMsgEl.textContent = "WebGL initialization failed.";
    return;
  }

  // Lights matching soft sky environment
  playerShow3DScene.add(new THREE.AmbientLight(0xffffff, 1.6));
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x8ba6cb, 1.2);
  hemiLight.position.set(0, 20, 0);
  playerShow3DScene.add(hemiLight);

  const d1 = new THREE.DirectionalLight(0xfffaed, 2.0);
  d1.position.set(3, 6, 4);
  playerShow3DScene.add(d1);
  const d2 = new THREE.DirectionalLight(0xaad0ff, 1.2);
  d2.position.set(-3, 3, -3);
  playerShow3DScene.add(d2);

  // OrbitControls
  const OrbitControlsClass = THREE.OrbitControls || window.OrbitControls;
  if (OrbitControlsClass) {
    playerShow3DControls = new OrbitControlsClass(playerShow3DCamera, playerShow3DRenderer.domElement);
    playerShow3DControls.enableDamping = true;
    playerShow3DControls.dampingFactor = 0.05;
    playerShow3DControls.enableZoom = true;
    playerShow3DControls.minDistance = 1.2;
    playerShow3DControls.maxDistance = 6.0;
    playerShow3DControls.maxPolarAngle = Math.PI / 2 + 0.1;
    playerShow3DControls.autoRotate = true;
    playerShow3DControls.autoRotateSpeed = 2.0;

    playerShow3DControls.addEventListener('start', function() {
      if (playerShow3DControls) playerShow3DControls.autoRotate = false;
      if (playerShow3DAutoRotateTimer) clearTimeout(playerShow3DAutoRotateTimer);
    });

    playerShow3DControls.addEventListener('end', function() {
      playerShow3DAutoRotateTimer = setTimeout(function() {
        if (playerShow3DControls) playerShow3DControls.autoRotate = true;
      }, 2000);
    });
  }

  // Default to active model or current selection
  const profile = window.userProfile || window.currentUser || (typeof window.getActiveUserProfile === 'function' ? window.getActiveUserProfile() : null);
  const activeFileName = getActive3DModelFileName(profile);
  const matchModel = CHARACTER_3D_MODELS_DATA.find(m => m.fileName === activeFileName);
  if (matchModel) {
    currentSelected3DModelId = matchModel.id;
  }

  const initialModel = CHARACTER_3D_MODELS_DATA.find(m => m.id === currentSelected3DModelId) || CHARACTER_3D_MODELS_DATA[0];
  renderPlayerShowSelectorUI();
  loadPlayerShowModelFile(initialModel.fileName);

  window.addEventListener('resize', handlePlayerShowResize);

  function animate() {
    playerShow3DAnimFrame = requestAnimationFrame(animate);

    if (playerShow3DMixer) {
      const delta = playerShow3DClock ? playerShow3DClock.getDelta() : 0.016;
      playerShow3DMixer.update(delta);
      if (!playerShowLoggedAnim) {
        console.log(`[PlayerShow] AnimationMixer is actively updating each frame (delta: ${delta.toFixed(4)}s)`);
        playerShowLoggedAnim = true;
      }
    }

    if (playerShow3DControls) {
      playerShow3DControls.update();
    } else if (playerShow3DModel) {
      playerShow3DModel.rotation.y += 0.008;
    }

    if (playerShowCoinGroup) {
      playerShowCoinGroup.rotation.y += 0.03;
    }

    if (playerShow3DRenderer && playerShow3DScene && playerShow3DCamera) {
      playerShow3DRenderer.render(playerShow3DScene, playerShow3DCamera);
    }
  }
  animate();
}

function handlePlayerShowResize() {
  const container = document.getElementById('pPlayerShow3DCanvas');
  if (!container || !playerShow3DRenderer || !playerShow3DCamera) return;
  const newW = container.clientWidth || window.innerWidth;
  const newH = container.clientHeight || (window.innerHeight - 180);
  playerShow3DCamera.aspect = newW / newH;
  playerShow3DCamera.updateProjectionMatrix();
  playerShow3DRenderer.setSize(newW, newH);
}

function closePlayerShowViewerInternal() {
  if (playerShow3DAnimFrame) {
    cancelAnimationFrame(playerShow3DAnimFrame);
    playerShow3DAnimFrame = null;
  }
  if (playerShow3DAutoRotateTimer) {
    clearTimeout(playerShow3DAutoRotateTimer);
    playerShow3DAutoRotateTimer = null;
  }
  window.removeEventListener('resize', handlePlayerShowResize);

  if (playerShow3DMixer) {
    try { playerShow3DMixer.stopAllAction(); } catch(e) {}
    playerShow3DMixer = null;
  }

  if (playerShow3DControls) {
    try { playerShow3DControls.dispose(); } catch(e) {}
    playerShow3DControls = null;
  }

  if (playerShow3DScene) {
    playerShow3DScene.traverse((child) => {
      if (child.isMesh) {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      }
    });
    playerShow3DScene = null;
  }

  if (playerShow3DRenderer) {
    try {
      playerShow3DRenderer.dispose();
      if (playerShow3DRenderer.domElement && playerShow3DRenderer.domElement.parentNode) {
        playerShow3DRenderer.domElement.parentNode.removeChild(playerShow3DRenderer.domElement);
      }
    } catch(e) {}
    playerShow3DRenderer = null;
  }
  playerShow3DModel = null;
  playerShowCoinGroup = null;
  playerShow3DCamera = null;
  playerShow3DClock = null;
}

function closePlayerShowViewer() {
  console.log("[PlayerShow] closePlayerShowViewer called");
  closePlayerShowViewerInternal();
  const modal = document.getElementById('pPlayerShowViewerPage');
  if (modal) modal.classList.add('hidden');
}

window.openPlayerShowViewer = function() {
  openPlayerShowViewer();
  if (typeof window.updatePlayerShowUI === 'function') window.updatePlayerShowUI();
};
window.closePlayerShowViewer = closePlayerShowViewer;

window.addEventListener('open-player-show-viewer', window.openPlayerShowViewer);
window.addEventListener('open-player-show-modal', window.openPlayerShowViewer);

// ── DYNAMIC 3D PLAYER SHOW UI UPDATER (FOR PROFILE PAGE) ──
window.updatePlayerShowUI = function(p) {
  const profile = p || window.userProfile || window.currentUser || (typeof window.getActiveUserProfile === 'function' ? window.getActiveUserProfile() : null);
  if (!profile) return;
  const isOwned = !!(profile.playerShowUnlocked || profile.character3dUnlocked || (profile.unlocked3dModels && profile.unlocked3dModels.length > 0));

  const desc = document.getElementById('pPlayerShowDesc');
  if (desc) {
    desc.textContent = isOwned ? "6 Models Available • Switch & Equip" : "3D Character Avatars • From 7,000 AX";
  }

  renderPlayerShowSelectorUI();
};

// ── EQUIP 3D MODEL HANDLER ──
window.equipSelected3DModel = async function(modelId) {
  const model = CHARACTER_3D_MODELS_DATA.find(m => m.id === modelId);
  if (!model) return;

  const authObj = typeof auth !== 'undefined' ? auth : window.auth;
  const dbObj = typeof db !== 'undefined' ? db : window.db;
  const docFn = typeof doc !== 'undefined' ? doc : window.doc;
  const updateDocFn = typeof updateDoc !== 'undefined' ? updateDoc : window.updateDoc;
  const serverTsFn = typeof serverTimestamp !== 'undefined' ? serverTimestamp : window.serverTimestamp;

  const activeProfile = window.userProfile || window.currentUser || (typeof window.getActiveUserProfile === 'function' ? window.getActiveUserProfile() : null);
  const fireUser = authObj ? authObj.currentUser : null;
  const targetUid = fireUser ? fireUser.uid : (activeProfile ? (activeProfile.uid || activeProfile.id) : null);

  if (!targetUid) {
    alert("Please log in to equip your 3D avatar.");
    return;
  }

  try {
    if (dbObj && docFn && updateDocFn) {
      const userDocRef = docFn(dbObj, 'users', targetUid);
      await updateDocFn(userDocRef, {
        active3dModel: model.fileName,
        updatedAt: serverTsFn ? serverTsFn() : new Date()
      });
    }

    const updatedProfile = {
      ...(activeProfile || {}),
      active3dModel: model.fileName
    };
    if (typeof userProfile !== 'undefined') userProfile = updatedProfile;
    window.userProfile = updatedProfile;
    window.currentUser = updatedProfile;

    renderPlayerShowSelectorUI();
    if (typeof window.showToastNotification === 'function') {
      window.showToastNotification("Avatar Equipped! 👑", `"${model.name}" is now your active profile 3D character.`);
    } else {
      alert(`🎉 "${model.name}" is now your active 3D character avatar!`);
    }
  } catch (err) {
    console.error("Error equipping 3D character:", err);
    alert("Failed to equip 3D character.");
  }
};

// ── ATOMIC 3D CHARACTER PURCHASE HANDLER ──
window.purchaseSelected3DModel = async function(modelId) {
  if (window._purchasingPlayerShow) return;
  window._purchasingPlayerShow = true;

  const model = CHARACTER_3D_MODELS_DATA.find(m => m.id === modelId) || CHARACTER_3D_MODELS_DATA[0];

  try {
    const authObj = typeof auth !== 'undefined' ? auth : window.auth;
    const dbObj = typeof db !== 'undefined' ? db : window.db;
    const docFn = typeof doc !== 'undefined' ? doc : window.doc;
    const getDocFn = typeof getDoc !== 'undefined' ? getDoc : window.getDoc;
    const runTxFn = typeof runTransaction !== 'undefined' ? runTransaction : window.runTransaction;
    const serverTsFn = typeof serverTimestamp !== 'undefined' ? serverTimestamp : window.serverTimestamp;
    const colFn = typeof collection !== 'undefined' ? collection : window.collection;

    let fireUser = authObj ? authObj.currentUser : null;
    if (!fireUser && authObj && typeof authObj.authStateReady === 'function') {
      try {
        await authObj.authStateReady();
        fireUser = authObj.currentUser;
      } catch (e) {
        console.warn("Auth state ready check failed:", e);
      }
    }

    const activeProfile = window.userProfile || window.currentUser || (typeof window.getActiveUserProfile === 'function' ? window.getActiveUserProfile() : null);
    const targetUid = fireUser ? fireUser.uid : (activeProfile ? (activeProfile.uid || activeProfile.id) : null);
    const isGuestUser = (activeProfile && (activeProfile.isGuest || (typeof targetUid === 'string' && targetUid.startsWith('guest_'))));

    if (!targetUid || isGuestUser) {
      alert(`Please log in to purchase the "${model.name}" 3D Character.`);
      return;
    }

    if (!dbObj || !docFn || !runTxFn) {
      throw new Error("Database service is initializing. Please try again in a moment.");
    }

    const userDocRef = docFn(dbObj, 'users', targetUid);

    let currentCoins = activeProfile?.balance !== undefined ? activeProfile.balance : (activeProfile?.axCoins || 0);
    let unlockedList = activeProfile?.unlocked3dModels || [];

    try {
      const snap = await getDocFn(userDocRef);
      if (snap.exists()) {
        const data = snap.data();
        if (data.balance !== undefined) currentCoins = data.balance;
        else if (data.axCoins !== undefined) currentCoins = data.axCoins;
        if (data.unlocked3dModels && Array.isArray(data.unlocked3dModels)) {
          unlockedList = data.unlocked3dModels;
        }
        if (data.playerShowUnlocked || data.character3dUnlocked) {
          if (!unlockedList.includes('character_boy_1_fbx.glb')) {
            unlockedList = [...unlockedList, 'character_boy_1_fbx.glb', 'classic_boy'];
          }
        }
      }
    } catch (e) {
      console.warn("Pre-fetch error:", e);
    }

    if (unlockedList.includes(model.fileName) || unlockedList.includes(model.id)) {
      alert(`You already own the "${model.name}" 3D Model!`);
      renderPlayerShowSelectorUI();
      return;
    }

    if (currentCoins < model.price) {
      alert(`Not enough AX Coins. Available: ${Number(currentCoins).toLocaleString()} AX, Required: ${Number(model.price).toLocaleString()} AX.`);
      return;
    }

    let newBalance = currentCoins - model.price;

    await runTxFn(dbObj, async (transaction) => {
      const userSnap = await transaction.get(userDocRef);
      let existingUnlocked = [];
      let actualCoins = currentCoins;

      if (!userSnap.exists()) {
        if (actualCoins < model.price) {
          throw new Error(`Not enough AX Coins. Available: ${Number(actualCoins).toLocaleString()} AX, Required: ${Number(model.price).toLocaleString()} AX.`);
        }
        newBalance = actualCoins - model.price;
        existingUnlocked = [model.fileName, model.id];
        transaction.set(userDocRef, {
          balance: newBalance,
          axCoins: newBalance,
          playerShowUnlocked: true,
          character3dUnlocked: true,
          active3dModel: model.fileName,
          unlocked3dModels: existingUnlocked,
          createdAt: serverTsFn ? serverTsFn() : new Date(),
          updatedAt: serverTsFn ? serverTsFn() : new Date()
        }, { merge: true });
      } else {
        const data = userSnap.data();
        existingUnlocked = Array.isArray(data.unlocked3dModels) ? [...data.unlocked3dModels] : [];
        if (data.playerShowUnlocked || data.character3dUnlocked) {
          if (!existingUnlocked.includes('character_boy_1_fbx.glb')) {
            existingUnlocked.push('character_boy_1_fbx.glb', 'classic_boy');
          }
        }

        if (existingUnlocked.includes(model.fileName) || existingUnlocked.includes(model.id)) {
          throw new Error(`You already own the "${model.name}" 3D Model!`);
        }

        actualCoins = data.balance !== undefined ? data.balance : (data.axCoins !== undefined ? data.axCoins : 0);
        if (actualCoins < model.price) {
          throw new Error(`Not enough AX Coins. Available: ${Number(actualCoins).toLocaleString()} AX, Required: ${Number(model.price).toLocaleString()} AX.`);
        }

        newBalance = actualCoins - model.price;
        if (!existingUnlocked.includes(model.fileName)) existingUnlocked.push(model.fileName);
        if (!existingUnlocked.includes(model.id)) existingUnlocked.push(model.id);

        transaction.update(userDocRef, {
          balance: newBalance,
          axCoins: newBalance,
          playerShowUnlocked: true,
          character3dUnlocked: true,
          active3dModel: model.fileName,
          unlocked3dModels: existingUnlocked,
          updatedAt: serverTsFn ? serverTsFn() : new Date()
        });
      }

      if (colFn) {
        const txRef = docFn(colFn(dbObj, 'users', targetUid, 'transactions'));
        transaction.set(txRef, {
          amount: -model.price,
          type: 'purchase_3d_character',
          description: `Purchased 3D Character Avatar (${model.name})`,
          createdAt: serverTsFn ? serverTsFn() : new Date()
        });
      }
    });

    const finalUnlocked = Array.from(new Set([...(activeProfile?.unlocked3dModels || []), model.fileName, model.id]));
    const updatedProfile = {
      ...(activeProfile || {}),
      uid: targetUid,
      id: targetUid,
      balance: newBalance,
      axCoins: newBalance,
      playerShowUnlocked: true,
      character3dUnlocked: true,
      active3dModel: model.fileName,
      unlocked3dModels: finalUnlocked
    };
    if (typeof userProfile !== 'undefined') userProfile = updatedProfile;
    window.userProfile = updatedProfile;
    window.currentUser = updatedProfile;

    if (typeof boot === 'function') boot();
    renderPlayerShowSelectorUI();

    if (typeof window.showToastNotification === 'function') {
      window.showToastNotification("🎉 Purchase Unlocked!", `Successfully unlocked "${model.name}" 3D Avatar!`);
    } else {
      alert(`🎉 Congratulations! You have successfully unlocked the "${model.name}" 3D Character Avatar!`);
    }
  } catch (err) {
    console.error("Error purchasing 3D Character:", err);
    alert(err.message || "Failed to purchase 3D Character.");
  } finally {
    window._purchasingPlayerShow = false;
  }
};

window.handlePurchasePlayerShow = function() {
  window.purchaseSelected3DModel(currentSelected3DModelId);
};
window.purchasePlayerShow = window.handlePurchasePlayerShow;

// Auto initialize moments listener


// Global Window Attachments
window.cloneArenaXGltf = cloneArenaXGltf;
window.preloadArenaX3DModel = preloadArenaX3DModel;
window.initArenaX3DBackgroundPreload = initArenaX3DBackgroundPreload;
window.autoFramePlayerShowCamera = autoFramePlayerShowCamera;
window.is3DModelUnlocked = is3DModelUnlocked;
window.getActive3DModelFileName = getActive3DModelFileName;
window.renderPlayerShowSelectorUI = renderPlayerShowSelectorUI;
window.renderModelCardHTML = renderModelCardHTML;
window.loadPlayerShowModelFile = loadPlayerShowModelFile;
window.setupProceduralFallback = setupProceduralFallback;
window.selectPlayerShowModel = selectPlayerShowModel;
window.openPlayerShowViewer = openPlayerShowViewer;
window.closePlayerShowViewer = closePlayerShowViewer;
window.updatePlayerShowUI = updatePlayerShowUI;
window.equipSelected3DModel = equipSelected3DModel;
window.purchaseSelected3DModel = purchaseSelected3DModel;
window.handlePurchasePlayerShow = handlePurchasePlayerShow;
window.purchasePlayerShow = purchasePlayerShow;
