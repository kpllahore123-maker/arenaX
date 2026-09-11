import"./modulepreload-polyfill-B5Qt9EMX.js";import"./firebase-config-CNkvsigh.js";import"./account-standing-CAwonEds.js";import"https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";import"https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";import"https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";import"https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";async function za(e,t){var o;try{if(!e||!t)return;const i=window.db,n=window.collection,r=window.addDoc,s=window.serverTimestamp,d=window.doc,c=window.getDoc;if(!i||!n||!r){console.warn("Firestore not ready for sendPersonalNotification");return}const l=((o=t.data)==null?void 0:o.senderUid)||t.senderUid;if(l&&d&&c)try{const[p,f]=await Promise.all([c(d(i,"users",e,"muted",l)),c(d(i,"users",e,"blocked",l))]);if(p.exists()){console.log(`Notification silenced: recipient ${e} has muted sender ${l}`);return}if(f.exists()){console.log(`Notification suppressed: recipient ${e} has blocked sender ${l}`);return}}catch(p){console.warn("Mute/block notification check notice:",p)}const u={type:t.type||"info",title:t.title||"Notification",body:t.body||t.message||"",icon:t.icon||"bell",read:!1,createdAt:s?s():new Date,data:t.data||{},actionUrl:t.actionUrl||null};await r(n(i,"users",e,"notifications"),u)}catch(i){console.error("sendPersonalNotification error:",i)}}function Ya(e){e&&(window.matchMedia("(display-mode: standalone)").matches||window.navigator.standalone===!0||document.referrer.includes("android-app://"),e.addEventListener("updatefound",()=>{const t=e.installing;t&&t.addEventListener("statechange",()=>{t.state==="installed"&&navigator.serviceWorker.controller&&Yi(e)})}))}function Yi(e){const t=document.getElementById("mPwaUpdateModal");if(t){t.classList.remove("hidden");const o=document.getElementById("btnApplyPwaUpdate");o&&(o.onclick=()=>Ji(e))}}function Ji(e){e&&e.waiting&&e.waiting.postMessage({type:"SKIP_WAITING"}),setTimeout(()=>{window.location.reload()},300)}async function Ja(e,t){var o,i,n;if("serviceWorker"in navigator)try{const r=await navigator.serviceWorker.getRegistrations();for(const s of r){const d=((o=s.active)==null?void 0:o.scriptURL)||((i=s.installing)==null?void 0:i.scriptURL)||((n=s.waiting)==null?void 0:n.scriptURL);d&&!d.includes(e)&&await s.unregister()}}catch(r){console.warn("SW cleanup notice:",r)}}async function Ka(e=!1){try{if(!("Notification"in window))return e&&typeof window.showToast=="function"&&window.showToast("Push notifications are not supported in this browser.","error"),null;const t=await Notification.requestPermission();return t==="granted"?(e&&typeof window.showToast=="function"&&window.showToast("Notifications enabled successfully!","success"),jo(),!0):(e&&typeof window.showToast=="function"&&window.showToast("Notification permission was "+t,"warning"),!1)}catch(t){return console.error("requestFCMToken error:",t),null}}function Qa(){const e=document.getElementById("diagnosticFcmToken");e&&e.innerText&&navigator.clipboard.writeText(e.innerText).then(()=>{typeof window.showToast=="function"&&window.showToast("Token copied to clipboard!","success")})}function jo(){const e=document.getElementById("diagnosticNotifPermission");e&&"Notification"in window&&(e.innerText=Notification.permission)}function Za(e){console.warn("[FCM Diagnostic]",e)}function en(){jo()}window.sendPersonalNotification=za;window.setupPwaUpdateDetection=Ya;window.showPwaUpdateModal=Yi;window.triggerPwaUpdate=Ji;window.cleanupStaleServiceWorkers=Ja;window.requestFCMToken=Ka;window.copyFCMToken=Qa;window.updateDiagnosticUI=jo;window.showDiagnosticError=Za;window.initBrowserPushNotifications=en;let K=null,Ee=null,O=null,ce=null,j=null,U=null,Je=null,_t=null;window.ARENAX_3D_CACHE=window.ARENAX_3D_CACHE||{parsedGltf:{},loadingPromises:{}};function di(e){if(!e||!e.scene)return null;const t=window.THREE;if(!t)return e.scene.clone();const o=e.scene,i={animations:e.animations||[],scene:o.clone(!0)},n=(d,c,l)=>{if(l(d,c),d.children&&c.children)for(let u=0;u<d.children.length;++u)n(d.children[u],c.children[u],l)},r={},s=[];n(o,i.scene,(d,c)=>{d.isBone&&(r[d.name||d.uuid]=c),d.isSkinnedMesh&&s.push({source:d,target:c})});for(const{source:d,target:c}of s)if(d.skeleton){const l=d.skeleton.bones,u=[];for(let p=0;p<l.length;p++){const f=l[p];u.push(r[f.name||f.uuid]||f)}c.bind(new t.Skeleton(u,d.skeleton.boneInverses),c.matrixWorld)}return i}function Po(e){if(!e)return Promise.resolve(null);const t=String(e).replace(/^(\.\/|\/)/,"");if(window.ARENAX_3D_CACHE.parsedGltf[t])return Promise.resolve(window.ARENAX_3D_CACHE.parsedGltf[t]);if(window.ARENAX_3D_CACHE.loadingPromises[t])return window.ARENAX_3D_CACHE.loadingPromises[t];const o=window.THREE,i=(o==null?void 0:o.GLTFLoader)||window.GLTFLoader;if(!i)return Promise.resolve(null);const n=new i,r=(o==null?void 0:o.DRACOLoader)||window.DRACOLoader;if(r)try{const l=new r;l.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.6/"),l.setDecoderConfig({type:"js"}),n.setDRACOLoader(l)}catch(l){console.warn("[ArenaX 3D] DRACOLoader setup error:",l)}const s=["/"+t,"./"+t,t];if(typeof window.getAppBasePath=="function")try{const l=window.getAppBasePath();l&&l!=="/"&&l!=="./"&&s.push(l.endsWith("/")?l+t:l+"/"+t)}catch{}const d=Array.from(new Set(s)),c=new Promise(l=>{const u=p=>{if(p>=d.length){console.warn(`[ArenaX 3D] Failed to load model "${t}" from any candidate URL (${d.join(", ")}). Using procedural fallback.`),l(null);return}const f=d[p];n.load(f,b=>{console.log(`[ArenaX 3D] Successfully loaded model "${t}" from ${f}`),b&&b.scene&&b.scene.traverse(g=>{g.isMesh&&g.material&&(Array.isArray(g.material)?g.material:[g.material]).forEach(h=>{h.map&&(o.SRGBColorSpace&&(h.map.colorSpace=o.SRGBColorSpace),o.sRGBEncoding&&(h.map.encoding=o.sRGBEncoding),h.map.flipY=!1,h.map.needsUpdate=!0),h.emissiveMap&&(o.SRGBColorSpace&&(h.emissiveMap.colorSpace=o.SRGBColorSpace),o.sRGBEncoding&&(h.emissiveMap.encoding=o.sRGBEncoding),h.emissiveMap.flipY=!1,h.emissiveMap.needsUpdate=!0),h.needsUpdate=!0})}),window.ARENAX_3D_CACHE.parsedGltf[t]=b,l(b)},void 0,b=>{console.warn(`[ArenaX 3D] Attempt ${p+1}/${d.length} failed for "${f}":`,(b==null?void 0:b.message)||b),u(p+1)})};u(0)});return window.ARENAX_3D_CACHE.loadingPromises[t]=c,c}function Ki(){const e=["character_boy_1_fbx.glb","Convert_Waving.glb","model3.glb","model4.glb","model5.glb","model6.glb"];Array.isArray(window.CHARACTER_3D_MODELS_DATA)&&window.CHARACTER_3D_MODELS_DATA.forEach(t=>{t.fileName&&!e.includes(t.fileName)&&e.push(t.fileName)}),e.forEach(t=>{Po(t).catch(()=>{})})}window.initArenaX3DBackgroundPreload=Ki;typeof window<"u"&&setTimeout(()=>{Ki()},50);const ae=[{id:"classic_boy",name:"Classic Boy",subtitle:"Static 3D Character Avatar",fileName:"character_boy_1_fbx.glb",price:7e3,icon:"fa-cube",isAnimated:!1,badgeText:"Classic"},{id:"waving_hero",name:"Waving Hero",subtitle:"Animated Waving Avatar",fileName:"Convert_Waving.glb",price:7e3,icon:"fa-child",isAnimated:!0,badgeText:"Animated"},{id:"model3",name:"Cyber Guardian",subtitle:"Premium 3D Avatar",fileName:"model3.glb",price:9999,icon:"fa-robot",isAnimated:!0,badgeText:"9,999 AX"},{id:"model4",name:"Cyber Titan",subtitle:"Heavy Armor 3D Avatar",fileName:"model4.glb",price:9999,icon:"fa-shield-halved",isAnimated:!0,badgeText:"9,999 AX"},{id:"model5",name:"Shadow Striker",subtitle:"Stealth 3D Avatar",fileName:"model5.glb",price:9999,icon:"fa-bolt",isAnimated:!0,badgeText:"9,999 AX"},{id:"model6",name:"Nexus Ranger",subtitle:"Futuristic 3D Avatar",fileName:"model6.glb",price:9999,icon:"fa-crosshairs",isAnimated:!0,badgeText:"9,999 AX"}];let ot="classic_boy",Gt=null,fe=null,To=!1;function li(e,t,o,i,n){if(!e||!t)return;const r=window.THREE;if(!r)return;e.rotation.set(0,0,0),e.scale.set(1,1,1),e.updateMatrixWorld(!0);const s=new r.Box3().setFromObject(e),d=s.getCenter(new r.Vector3);s.getSize(new r.Vector3),e.position.set(-d.x,-d.y,-d.z),e.updateMatrixWorld(!0);const l=new r.Box3().setFromObject(e).getSize(new r.Vector3),u=Math.max(l.x,l.y,l.z),p=t.fov*(Math.PI/180);let f=u/2/Math.tan(p/2);const b=t.aspect||1;t.aspect=b,b<1&&(f=f/b),f=Math.max(f*1.45,2.5);const g=l.y*.05;t.position.set(0,g,f),t.lookAt(0,0,0),t.updateProjectionMatrix(),o&&(o.target.set(0,0,0),o.minDistance=f*.25,o.maxDistance=f*3.5,o.update())}function Qi(e,t){return e?!!(e.unlocked3dModels&&Array.isArray(e.unlocked3dModels)&&(e.unlocked3dModels.includes(t.id)||e.unlocked3dModels.includes(t.fileName)||e.unlocked3dModels.includes(t.fileName.toLowerCase())||e.unlocked3dModels.includes(t.id.toLowerCase()))||t.id==="classic_boy"&&(e.playerShowUnlocked||e.character3dUnlocked)):!1}function Oo(e){if(!e)return"character_boy_1_fbx.glb";if(e.active3dModel){const t=String(e.active3dModel).toLowerCase();return t.includes("model6")?"model6.glb":t.includes("model5")?"model5.glb":t.includes("model4")?"model4.glb":t.includes("model3")?"model3.glb":t.includes("waving")||t.includes("hero")?"Convert_Waving.glb":t.includes("classic")||t.includes("boy")?"character_boy_1_fbx.glb":e.active3dModel}if(e.unlocked3dModels&&Array.isArray(e.unlocked3dModels)){const t=e.unlocked3dModels[e.unlocked3dModels.length-1];if(typeof t=="string"){if(t.includes("model6"))return"model6.glb";if(t.includes("model5"))return"model5.glb";if(t.includes("model4"))return"model4.glb";if(t.includes("model3"))return"model3.glb";if(t.toLowerCase().includes("waving")||t.toLowerCase().includes("hero"))return"Convert_Waving.glb"}}return"character_boy_1_fbx.glb"}function Ao(e,t,o,i){if(!e)return"";const n=t||ae.find(p=>p.id===ot)||ae[0],r=o||window.userProfile||window.currentUser||(typeof window.getActiveUserProfile=="function"?window.getActiveUserProfile():null),s=i||Oo(r),d=e.id===n.id,c=Qi(r,e),l=c&&(s===e.fileName||e.id==="classic_boy"&&s==="character_boy_1_fbx.glb");let u="";return l?u='<span class="text-[10px] text-emerald-300 font-black flex items-center gap-0.5"><i class="fas fa-check-circle text-[9px]"></i> Active</span>':c?u='<span class="text-[10px] text-amber-300 font-black flex items-center gap-0.5"><i class="fas fa-unlock text-[9px]"></i> Owned</span>':u=`<span class="text-[10px] text-[#f7d154] font-black font-mono flex items-center gap-1"><span>🪙</span> ${(e.price||0).toLocaleString()}</span>`,`
    <button
      type="button"
      onclick="window.selectPlayerShowModel('${e.id}')"
      class="relative p-3 rounded-2xl border-2 text-left flex flex-col justify-between transition-all duration-200 cursor-pointer overflow-hidden h-32 ${d?"bg-gradient-to-br from-[#4d637f] to-[#36475d] border-[#24d9c8] shadow-[0_0_18px_rgba(36,217,200,0.45)] ring-2 ring-[#24d9c8]/50":"bg-[#4b5e78]/80 hover:bg-[#576c88] border-white/15 hover:border-white/30"}"
    >
      <!-- Top Card Badges -->
      <div class="flex items-center justify-between w-full">
        <span class="text-[10px] font-bold text-white/80 uppercase tracking-wider font-mono">
          ${e.isAnimated?"ANIM":"3D"}
        </span>
        <span class="px-1.5 py-0.5 rounded-md bg-[#f0c040] text-slate-950 text-[10px] font-black shadow-xs">
          S
        </span>
      </div>

      <!-- Center Icon Thumbnail -->
      <div class="flex items-center justify-center my-auto text-2xl text-white/90">
        <i class="fas ${e.icon||"fa-user"}"></i>
      </div>

      <!-- Bottom Model Details -->
      <div class="w-full pt-1">
        <p class="text-xs font-black text-white truncate leading-tight drop-shadow-xs">
          ${e.name}
        </p>
        <div class="flex items-center gap-1 mt-0.5">
          ${u}
        </div>
      </div>
    </button>
  `}window.renderModelCardHTML=Ao;function it(){const e=window.userProfile||window.currentUser||(typeof window.getActiveUserProfile=="function"?window.getActiveUserProfile():null),t=document.getElementById("pPlayerShowModelCardsList"),o=document.getElementById("pPlayerShowViewerUserBalance"),i=document.getElementById("pPlayerShowViewerFooterAction"),n=(e==null?void 0:e.balance)!==void 0?e.balance:(e==null?void 0:e.axCoins)||0;o&&(o.textContent=Number(n).toLocaleString());const r=Oo(e),s=ae.find(d=>d.id===ot)||ae[0];if(t){const d=ae.slice(0,3),c=ae.slice(3);let l=`<div class="grid grid-cols-3 gap-2 sm:gap-3">${d.map(u=>Ao(u,s,e,r)).join("")}</div>`;c.length>0&&(l+=`<div class="grid grid-cols-3 gap-2 sm:gap-3 overflow-x-auto pb-0.5 no-scrollbar">${c.map(u=>Ao(u,s,e,r)).join("")}</div>`),t.innerHTML=l}if(i){const d=Qi(e,s);d&&(r===s.fileName||s.id==="classic_boy"&&r==="character_boy_1_fbx.glb")?i.innerHTML=`
        <div class="bg-emerald-500/90 text-slate-950 font-black text-xs px-4 py-2 rounded-2xl shadow-[0_4px_16px_rgba(16,185,129,0.35)] flex items-center gap-1.5 uppercase tracking-wider backdrop-blur-md">
          <i class="fas fa-check-circle text-xs"></i>
          <span>Active</span>
        </div>
      `:d?i.innerHTML=`
        <button
          type="button"
          onclick="window.equipSelected3DModel('${s.id}')"
          class="bg-[#24d9c8] hover:bg-[#1eccba] active:scale-95 text-[#051c24] font-black text-xs px-4 py-2 rounded-2xl shadow-[0_4px_16px_rgba(36,217,200,0.35)] flex items-center gap-1.5 transition-all cursor-pointer uppercase tracking-wider"
        >
          <i class="fas fa-magic text-xs"></i>
          <span>Equip</span>
        </button>
      `:i.innerHTML=`
        <button
          id="btnViewerFooterBuy"
          type="button"
          onclick="window.purchaseSelected3DModel('${s.id}')"
          class="bg-[#24d9c8] hover:bg-[#1eccba] active:scale-95 text-[#051c24] font-black text-xs px-4 py-2 rounded-2xl shadow-[0_4px_16px_rgba(36,217,200,0.35)] flex items-center gap-2 transition-all cursor-pointer uppercase tracking-wider"
        >
          <i class="fas fa-shopping-cart text-xs"></i>
          <span>Purchase</span>
          <span class="w-4 h-4 rounded-full bg-[#051c24] text-[#24d9c8] text-[10px] font-black flex items-center justify-center">
            1
          </span>
        </button>
      `}}function Zi(e){const t=document.getElementById("pPlayerShow3DLoading"),o=document.getElementById("pPlayerShowLoadingText"),i=document.getElementById("pPlayerShowLoadingSub"),n=document.getElementById("pPlayerShow3DError"),r=document.getElementById("pPlayerShow3DErrMsg"),s=document.getElementById("pPlayerShow3DHint");if(t&&t.classList.remove("hidden"),o&&(o.textContent="Loading 3D Character Model..."),i&&(i.textContent=e),n&&n.classList.add("hidden"),s&&s.classList.add("hidden"),fe){try{fe.stopAllAction()}catch{}fe=null}K&&O&&(O.remove(K),K.traverse(u=>{u.isMesh&&(u.geometry&&u.geometry.dispose(),u.material&&(Array.isArray(u.material)?u.material.forEach(p=>p.dispose()):u.material.dispose()))}),K=null),Ee&&O&&(O.remove(Ee),Ee=null);const d=window.THREE;if(!d||!O)return;function c(){console.log("[PlayerShow] Rendering procedural 3D character avatar model...");const u=createProceduralCharacter3D(d);K=u.group,Ee=u.coinGroup,O.add(K),li(K,ce,U),t&&t.classList.add("hidden"),s&&s.classList.remove("hidden")}const l=String(e||"character_boy_1_fbx.glb").replace(/^(\.\/|\/)/,"");typeof Po=="function"?Po(l).then(u=>{if(u){const p=typeof di=="function"?di(u):{scene:u.scene.clone(),animations:u.animations};K=p.scene;const f=l.includes("character_boy_1"),b=p.animations||u.animations;if(!f&&b&&b.length>0){let g=b.find(h=>h.name&&(h.name.toLowerCase().includes("wave")||h.name.toLowerCase().includes("mixamo")||h.name.toLowerCase().includes("idle")||h.name.toLowerCase().includes("action")||h.name.toLowerCase().includes("layer0")))||b[0];fe=new d.AnimationMixer(K);const w=fe.clipAction(g);w.reset(),w.setLoop(d.LoopRepeat),w.play(),To=!1}O.add(K),li(K,ce,U),t&&t.classList.add("hidden"),s&&s.classList.remove("hidden")}else["model4.glb","model5.glb","model6.glb"].includes(l)?(t&&t.classList.add("hidden"),n&&n.classList.remove("hidden"),r&&(r.textContent=`Failed to load 3D model asset: ${l}`)):c()}).catch(u=>{["model4.glb","model5.glb","model6.glb"].includes(l)?(t&&t.classList.add("hidden"),n&&n.classList.remove("hidden"),r&&(r.textContent=`Failed to load 3D model: ${(u==null?void 0:u.message)||l}`)):c()}):c()}window.selectPlayerShowModel=function(e){const t=ae.find(o=>o.id===e);t&&(ot=t.id,it(),Zi(t.fileName))};function tn(){console.log("[PlayerShow] openPlayerShowViewer initiated...");const e=document.getElementById("pPlayerShowViewerPage");if(!e){console.error("[PlayerShow] #pPlayerShowViewerPage not found in DOM");return}e.classList.remove("hidden");const t=document.getElementById("pPlayerShow3DCanvas"),o=document.getElementById("pPlayerShow3DLoading"),i=document.getElementById("pPlayerShow3DError"),n=document.getElementById("pPlayerShow3DErrMsg"),r=document.getElementById("pPlayerShow3DHint");o&&o.classList.remove("hidden"),i&&i.classList.add("hidden"),r&&r.classList.add("hidden"),ta();const s=window.THREE;if(!s){console.error("[PlayerShow] window.THREE missing!"),o&&o.classList.add("hidden"),i&&i.classList.remove("hidden"),n&&(n.textContent="Three.js script is missing.");return}Gt=new s.Clock;const d=t.clientWidth||window.innerWidth,c=t.clientHeight||window.innerHeight-180;O=new s.Scene,O.background=null,ce=new s.PerspectiveCamera(45,d/c,.1,1e3),ce.position.set(0,1.2,3.5);try{j=new s.WebGLRenderer({antialias:!0,alpha:!0,powerPreference:"high-performance"}),j.setSize(d,c),j.setPixelRatio(Math.min(window.devicePixelRatio,2)),s.SRGBColorSpace&&(j.outputColorSpace=s.SRGBColorSpace),s.sRGBEncoding&&(j.outputEncoding=s.sRGBEncoding),t.innerHTML="",t.appendChild(j.domElement)}catch(L){console.error("[PlayerShow] WebGLRenderer error:",L),o&&o.classList.add("hidden"),i&&i.classList.remove("hidden"),n&&(n.textContent="WebGL initialization failed.");return}O.add(new s.AmbientLight(16777215,1.6));const l=new s.HemisphereLight(16777215,9152203,1.2);l.position.set(0,20,0),O.add(l);const u=new s.DirectionalLight(16775917,2);u.position.set(3,6,4),O.add(u);const p=new s.DirectionalLight(11194623,1.2);p.position.set(-3,3,-3),O.add(p);const f=s.OrbitControls||window.OrbitControls;f&&(U=new f(ce,j.domElement),U.enableDamping=!0,U.dampingFactor=.05,U.enableZoom=!0,U.minDistance=1.2,U.maxDistance=6,U.maxPolarAngle=Math.PI/2+.1,U.autoRotate=!0,U.autoRotateSpeed=2,U.addEventListener("start",function(){U&&(U.autoRotate=!1),Je&&clearTimeout(Je)}),U.addEventListener("end",function(){Je=setTimeout(function(){U&&(U.autoRotate=!0)},2e3)}));const b=window.userProfile||window.currentUser||(typeof window.getActiveUserProfile=="function"?window.getActiveUserProfile():null),g=Oo(b),w=ae.find(L=>L.fileName===g);w&&(ot=w.id);const h=ae.find(L=>L.id===ot)||ae[0];it(),Zi(h.fileName),window.addEventListener("resize",ea);function M(){if(_t=requestAnimationFrame(M),fe){const L=Gt?Gt.getDelta():.016;fe.update(L),To||(console.log(`[PlayerShow] AnimationMixer is actively updating each frame (delta: ${L.toFixed(4)}s)`),To=!0)}U?U.update():K&&(K.rotation.y+=.008),Ee&&(Ee.rotation.y+=.03),j&&O&&ce&&j.render(O,ce)}M()}function ea(){const e=document.getElementById("pPlayerShow3DCanvas");if(!e||!j||!ce)return;const t=e.clientWidth||window.innerWidth,o=e.clientHeight||window.innerHeight-180;ce.aspect=t/o,ce.updateProjectionMatrix(),j.setSize(t,o)}function ta(){if(_t&&(cancelAnimationFrame(_t),_t=null),Je&&(clearTimeout(Je),Je=null),window.removeEventListener("resize",ea),fe){try{fe.stopAllAction()}catch{}fe=null}if(U){try{U.dispose()}catch{}U=null}if(O&&(O.traverse(e=>{e.isMesh&&(e.geometry&&e.geometry.dispose(),e.material&&(Array.isArray(e.material)?e.material.forEach(t=>t.dispose()):e.material.dispose()))}),O=null),j){try{j.dispose(),j.domElement&&j.domElement.parentNode&&j.domElement.parentNode.removeChild(j.domElement)}catch{}j=null}K=null,Ee=null,ce=null,Gt=null}function on(){console.log("[PlayerShow] closePlayerShowViewer called"),ta();const e=document.getElementById("pPlayerShowViewerPage");e&&e.classList.add("hidden")}window.openPlayerShowViewer=function(){tn(),typeof window.updatePlayerShowUI=="function"&&window.updatePlayerShowUI()};window.closePlayerShowViewer=on;window.addEventListener("open-player-show-viewer",window.openPlayerShowViewer);window.addEventListener("open-player-show-modal",window.openPlayerShowViewer);window.updatePlayerShowUI=function(e){const t=e||window.userProfile||window.currentUser||(typeof window.getActiveUserProfile=="function"?window.getActiveUserProfile():null);if(!t)return;const o=!!(t.playerShowUnlocked||t.character3dUnlocked||t.unlocked3dModels&&t.unlocked3dModels.length>0),i=document.getElementById("pPlayerShowDesc");i&&(i.textContent=o?"6 Models Available • Switch & Equip":"3D Character Avatars • From 7,000 AX"),it()};window.equipSelected3DModel=async function(e){const t=ae.find(u=>u.id===e);if(!t)return;const o=typeof auth<"u"?auth:window.auth,i=typeof db<"u"?db:window.db,n=typeof doc<"u"?doc:window.doc,r=typeof updateDoc<"u"?updateDoc:window.updateDoc,s=typeof serverTimestamp<"u"?serverTimestamp:window.serverTimestamp,d=window.userProfile||window.currentUser||(typeof window.getActiveUserProfile=="function"?window.getActiveUserProfile():null),c=o?o.currentUser:null,l=c?c.uid:d?d.uid||d.id:null;if(!l){alert("Please log in to equip your 3D avatar.");return}try{if(i&&n&&r){const p=n(i,"users",l);await r(p,{active3dModel:t.fileName,updatedAt:s?s():new Date})}const u={...d||{},active3dModel:t.fileName};typeof userProfile<"u"&&(userProfile=u),window.userProfile=u,window.currentUser=u,it(),typeof window.showToastNotification=="function"?window.showToastNotification("Avatar Equipped! 👑",`"${t.name}" is now your active profile 3D character.`):alert(`🎉 "${t.name}" is now your active 3D character avatar!`)}catch(u){console.error("Error equipping 3D character:",u),alert("Failed to equip 3D character.")}};window.purchaseSelected3DModel=async function(e){if(window._purchasingPlayerShow)return;window._purchasingPlayerShow=!0;const t=ae.find(o=>o.id===e)||ae[0];try{const o=typeof auth<"u"?auth:window.auth,i=typeof db<"u"?db:window.db,n=typeof doc<"u"?doc:window.doc,r=typeof getDoc<"u"?getDoc:window.getDoc,s=typeof runTransaction<"u"?runTransaction:window.runTransaction,d=typeof serverTimestamp<"u"?serverTimestamp:window.serverTimestamp,c=typeof collection<"u"?collection:window.collection;let l=o?o.currentUser:null;if(!l&&o&&typeof o.authStateReady=="function")try{await o.authStateReady(),l=o.currentUser}catch(A){console.warn("Auth state ready check failed:",A)}const u=window.userProfile||window.currentUser||(typeof window.getActiveUserProfile=="function"?window.getActiveUserProfile():null),p=l?l.uid:u?u.uid||u.id:null,f=u&&(u.isGuest||typeof p=="string"&&p.startsWith("guest_"));if(!p||f){alert(`Please log in to purchase the "${t.name}" 3D Character.`);return}if(!i||!n||!s)throw new Error("Database service is initializing. Please try again in a moment.");const b=n(i,"users",p);let g=(u==null?void 0:u.balance)!==void 0?u.balance:(u==null?void 0:u.axCoins)||0,w=(u==null?void 0:u.unlocked3dModels)||[];try{const A=await r(b);if(A.exists()){const P=A.data();P.balance!==void 0?g=P.balance:P.axCoins!==void 0&&(g=P.axCoins),P.unlocked3dModels&&Array.isArray(P.unlocked3dModels)&&(w=P.unlocked3dModels),(P.playerShowUnlocked||P.character3dUnlocked)&&(w.includes("character_boy_1_fbx.glb")||(w=[...w,"character_boy_1_fbx.glb","classic_boy"]))}}catch(A){console.warn("Pre-fetch error:",A)}if(w.includes(t.fileName)||w.includes(t.id)){alert(`You already own the "${t.name}" 3D Model!`),it();return}if(g<t.price){alert(`Not enough AX Coins. Available: ${Number(g).toLocaleString()} AX, Required: ${Number(t.price).toLocaleString()} AX.`);return}let h=g-t.price;await s(i,async A=>{const P=await A.get(b);let k=[],E=g;if(P.exists()){const y=P.data();if(k=Array.isArray(y.unlocked3dModels)?[...y.unlocked3dModels]:[],(y.playerShowUnlocked||y.character3dUnlocked)&&(k.includes("character_boy_1_fbx.glb")||k.push("character_boy_1_fbx.glb","classic_boy")),k.includes(t.fileName)||k.includes(t.id))throw new Error(`You already own the "${t.name}" 3D Model!`);if(E=y.balance!==void 0?y.balance:y.axCoins!==void 0?y.axCoins:0,E<t.price)throw new Error(`Not enough AX Coins. Available: ${Number(E).toLocaleString()} AX, Required: ${Number(t.price).toLocaleString()} AX.`);h=E-t.price,k.includes(t.fileName)||k.push(t.fileName),k.includes(t.id)||k.push(t.id),A.update(b,{balance:h,axCoins:h,playerShowUnlocked:!0,character3dUnlocked:!0,active3dModel:t.fileName,unlocked3dModels:k,updatedAt:d?d():new Date})}else{if(E<t.price)throw new Error(`Not enough AX Coins. Available: ${Number(E).toLocaleString()} AX, Required: ${Number(t.price).toLocaleString()} AX.`);h=E-t.price,k=[t.fileName,t.id],A.set(b,{balance:h,axCoins:h,playerShowUnlocked:!0,character3dUnlocked:!0,active3dModel:t.fileName,unlocked3dModels:k,createdAt:d?d():new Date,updatedAt:d?d():new Date},{merge:!0})}if(c){const y=n(c(i,"users",p,"transactions"));A.set(y,{amount:-t.price,type:"purchase_3d_character",description:`Purchased 3D Character Avatar (${t.name})`,createdAt:d?d():new Date})}});const M=Array.from(new Set([...(u==null?void 0:u.unlocked3dModels)||[],t.fileName,t.id])),L={...u||{},uid:p,id:p,balance:h,axCoins:h,playerShowUnlocked:!0,character3dUnlocked:!0,active3dModel:t.fileName,unlocked3dModels:M};typeof userProfile<"u"&&(userProfile=L),window.userProfile=L,window.currentUser=L,typeof boot=="function"&&boot(),it(),typeof window.showToastNotification=="function"?window.showToastNotification("🎉 Purchase Unlocked!",`Successfully unlocked "${t.name}" 3D Avatar!`):alert(`🎉 Congratulations! You have successfully unlocked the "${t.name}" 3D Character Avatar!`)}catch(o){console.error("Error purchasing 3D Character:",o),alert(o.message||"Failed to purchase 3D Character.")}finally{window._purchasingPlayerShow=!1}};window.handlePurchasePlayerShow=function(){window.purchaseSelected3DModel(ot)};window.purchasePlayerShow=window.handlePurchasePlayerShow;window.openPopularityHistoryModal=async function(){const e=$("mPopularityHistoryModal"),t=$("popHistoryListContainer"),o=$("popHistorySubtitle");if(!e||!t)return;const i=window.currentViewingPlayerId||window.currentViewedUser&&window.currentViewedUser.uid,n=window.currentViewingPlayerName||"Player";if(o&&(o.textContent=`Recent gifts received by ${n}`),e.classList.remove("hidden"),t.innerHTML=`
    <div class="p-8 text-center text-gray-400 text-xs">
      <i class="fas fa-circle-notch animate-spin text-lg text-rose-400 mb-2"></i>
      <p>Loading popularity history...</p>
    </div>
  `,!i){t.innerHTML='<div class="p-8 text-center text-gray-400 text-xs">No history found</div>';return}try{const r=query(collection(db,"users",i,"popularityHistory"),orderBy("timestamp","desc"),limit(50)),s=await getDocs(r);if(s.empty){t.innerHTML=`
        <div class="p-8 text-center text-gray-400 space-y-2">
          <div class="text-3xl">🌹</div>
          <p class="text-xs font-bold text-gray-300">No popularity gifts received yet</p>
          <p class="text-[10px] text-gray-500">Be the first to send a Rose, Rocket, or Trophy!</p>
        </div>
      `;return}const d=typeof window.getAppBasePath=="function"?window.getAppBasePath():"./";t.innerHTML="",s.docs.forEach(c=>{const l=c.data(),u=l.type==="rose",p=l.type==="rocket",f=l.type==="trophy";let b=d+"rose.png",g="Rose 🌹",w=1;p?(b=d+"rocket.png",g="Rocket 🚀",w=10):f&&(b=d+"poptrophy.png",g="Trophy 🏆",w=20);const h=l.popGain||w;let M="Recently",L="";if(l.timestamp&&l.timestamp.toDate){const P=l.timestamp.toDate();M=P.toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}),L=P.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit",hour12:!0})}const A=document.createElement("div");A.className="p-3 rounded-2xl bg-[#141726] border border-white/5 flex items-center justify-between gap-3 hover:border-white/10 transition",A.innerHTML=`
        <div class="flex items-center gap-3 min-w-0">
          <img src="${l.senderAv||"https://api.dicebear.com/7.x/bottts/svg?seed=ax"}" onclick="window.openPlayerProfileCard('${l.senderUid}')" class="w-10 h-10 rounded-full object-cover border border-white/10 shrink-0 cursor-pointer shadow-xs hover:scale-105 transition" />
          <div class="min-w-0">
            <div onclick="window.openPlayerProfileCard('${l.senderUid}')" class="font-bold text-xs text-white truncate cursor-pointer hover:text-rose-400 transition">
              ${l.senderName||"Anonymous"}
            </div>
            <div class="flex items-center gap-1.5 mt-0.5 text-[11px] font-semibold ${f?"text-amber-300":p?"text-amber-400":"text-rose-300"}">
              <img src="${b}" class="w-4 h-4 object-contain inline-block" />
              <span>Sent ${g} (+${h})</span>
            </div>
          </div>
        </div>

        <div class="text-right shrink-0">
          <div class="text-[11px] font-bold text-gray-300 font-mono">${M}</div>
          <div class="text-[10px] text-gray-500 font-medium font-mono">${L}</div>
        </div>
      `,t.appendChild(A)})}catch(r){console.error("Error loading popularity history:",r),t.innerHTML='<div class="p-8 text-center text-red-400 text-xs">Failed to load history</div>'}};window.closePopularityHistoryModal=function(){const e=$("mPopularityHistoryModal");e&&e.classList.add("hidden")};window.selectedGiftItemType="rose";window.openGiftBottomSheet=function(){const e=$("mGiftBottomSheet");if(!e)return;const t=typeof window.getAppBasePath=="function"?window.getAppBasePath():"./";$("bsImgRose")&&($("bsImgRose").src=t+"rose.png"),$("bsImgRocket")&&($("bsImgRocket").src=t+"rocket.png"),$("bsImgTrophy")&&($("bsImgTrophy").src=t+"poptrophy.png");const o=window.currentViewedUser&&(window.currentViewedUser.name||window.currentViewedUser.userName)||window.currentViewingPlayerName||"Player",i=window.currentViewedUser&&(window.currentViewedUser.av||window.currentViewedUser.avatar)||window.currentViewingPlayerAvatar||"https://api.dicebear.com/7.x/bottts/svg?seed=ax";$("bsGiftRecipientName")&&($("bsGiftRecipientName").textContent=o),$("bsGiftRecipientAv")&&($("bsGiftRecipientAv").src=i);const n=userProfile||window.userProfile||window.currentUser,r=n&&n.balance!==void 0?n.balance:0;$("bsUserCoinBalance")&&($("bsUserCoinBalance").textContent=Number(r).toLocaleString()),window.selectGiftItem("rose"),e.classList.remove("hidden")};window.closeGiftBottomSheet=function(){const e=$("mGiftBottomSheet");e&&e.classList.add("hidden")};window.selectGiftItem=function(e){window.selectedGiftItemType=e;const t=$("bsCardRose"),o=$("bsCardRocket"),i=$("bsCardTrophy"),n=$("bsCheckRose"),r=$("bsCheckRocket"),s=$("bsCheckTrophy"),d=$("bsGiftHelperText"),c="relative p-2.5 sm:p-3.5 rounded-2xl border flex flex-col items-center justify-center gap-1 sm:gap-1.5 cursor-pointer transition-all bg-gradient-to-b from-pink-500/15 via-[#1a1e34] to-[#121526] border-pink-500 shadow-[0_0_15px_rgba(236,72,153,0.3)] ring-1 ring-pink-500/50 scale-[1.02]",l="relative p-2.5 sm:p-3.5 rounded-2xl border flex flex-col items-center justify-center gap-1 sm:gap-1.5 cursor-pointer transition-all bg-[#141727] border-[#252b47] hover:border-pink-500/40";t&&(t.className=e==="rose"?c:l),o&&(o.className=e==="rocket"?c:l),i&&(i.className=e==="trophy"?c:l),n&&n.classList.toggle("hidden",e!=="rose"),r&&r.classList.toggle("hidden",e!=="rocket"),s&&s.classList.toggle("hidden",e!=="trophy"),d&&(e==="rose"?d.textContent="Receiver's Charm +1 • Gain popularity & status boost":e==="rocket"?d.textContent="Receiver's Charm +10 • Supercharge popularity & status boost":e==="trophy"&&(d.textContent="Receiver's Charm +20 • Ultimate popularity & prestige boost"))};window.sendPopularityGiftItem=async function(e){const t=userProfile||window.userProfile||window.currentUser;if(!t||!t.uid){alert("Please sign in to send popularity! ❌");return}const o=window.currentViewingPlayerId||window.currentViewedUser&&(window.currentViewedUser.uid||window.currentViewedUser.id);if(!o){alert("No recipient selected! ❌");return}if(o===t.uid){alert("You cannot send popularity to yourself! ❌");return}if(typeof window.isLocallyBlockedByMe=="function"&&window.isLocallyBlockedByMe(t==null?void 0:t.uid,o)){alert("You have blocked this user. Unblock them first to send gifts. ❌");return}try{const b=typeof getDoc<"u"?getDoc:window.getDoc,g=typeof doc<"u"?doc:window.doc,w=typeof db<"u"?db:window.db;if(b&&g&&w){const[h,M]=await Promise.all([b(g(w,"users",o,"blocked",t.uid)),b(g(w,"users",t.uid,"blocked",o))]);if(h.exists()){alert("You cannot send gifts to this user because they have blocked you. ❌");return}if(M.exists()){alert("You have blocked this user. Unblock them first to send gifts. ❌");return}}}catch(b){console.warn("Blocked check in gifts warning:",b)}const i=e==="rose",n=e==="rocket",r=e==="trophy";let s=10,d=1,c="Rose",l="🌹";n?(s=100,d=10,c="Rocket",l="🚀"):r&&(s=190,d=20,c="Trophy",l="🏆");const u=Number(t.balance||0);if(u<s){alert(`Insufficient AX Coins! You need ${s} AX Coins to send a ${c} ${l}. You currently have ${u} AX Coins. Please deposit coins first. ❌`);return}const p=$("bsSendGiftSubmitBtn");let f="";p&&(p.disabled=!0,f=p.innerHTML,p.innerHTML='<i class="fas fa-circle-notch animate-spin text-white"></i> Sending...');try{const b=doc(db,"users",t.uid);await updateDoc(b,{balance:increment(-s)});const g=Math.max(0,u-s);t.balance=g,userProfile&&(userProfile.balance=g),window.userProfile&&(window.userProfile.balance=g),window.currentUser&&(window.currentUser.balance=g),$("bsUserCoinBalance")&&($("bsUserCoinBalance").textContent=Number(g).toLocaleString()),$("homeCoinsVal")&&($("homeCoinsVal").textContent=Number(g).toLocaleString()),$("wBal")&&($("wBal").textContent=Number(g).toLocaleString()),$("userCoinBalance")&&($("userCoinBalance").textContent=Number(g).toLocaleString());const w=doc(db,"users",o);await updateDoc(w,{popularity:increment(d),giftCount:increment(d),roseCount:increment(i?1:0),rocketCount:increment(n?1:0),trophyCount:increment(r?1:0)});try{const y=t.name||t.userName||"Player",B=t.av||t.avatar||`https://api.dicebear.com/7.x/bottts/svg?seed=${t.uid}`;if(await addDoc(collection(db,"users",o,"popularityHistory"),{senderUid:t.uid,senderName:y,senderAv:B,type:e,popGain:d,timestamp:serverTimestamp()}),typeof window.sendPersonalNotification=="function"){const V=typeof window.formatGiftDisplayName=="function"?window.formatGiftDisplayName(e):e||"Gift";window.sendPersonalNotification(o,{title:"New Gift! 🎁",body:`${y} sent you a ${V}`,icon:"rose.png",url:"https://arenax.cyou/#profile",data:{type:"gift",senderUid:t.uid,giftType:e}}).catch(console.warn)}}catch(y){console.warn("Could not log popularity history:",y)}if(window.currentViewedUser&&(window.currentViewedUser.uid===o||window.currentViewedUser.id===o)&&(window.currentViewedUser.popularity=(window.currentViewedUser.popularity||0)+d,window.currentViewedUser.giftCount=(window.currentViewedUser.giftCount||0)+d,i?window.currentViewedUser.roseCount=(window.currentViewedUser.roseCount||0)+1:n?window.currentViewedUser.rocketCount=(window.currentViewedUser.rocketCount||0)+1:r&&(window.currentViewedUser.trophyCount=(window.currentViewedUser.trophyCount||0)+1)),$("vPartPopularityVal")){const y=parseInt($("vPartPopularityVal").textContent)||0;$("vPartPopularityVal").textContent=y+d}if($("vppPopularityVal")){const y=parseInt($("vppPopularityVal").textContent)||0;$("vppPopularityVal").textContent=y+d}if($("vppGiftCount")){const y=parseInt($("vppGiftCount").textContent)||0;$("vppGiftCount").textContent=y+d}if(i&&$("vppRoseCountVal")){const y=parseInt($("vppRoseCountVal").textContent)||0;$("vppRoseCountVal").textContent=y+1}if(n&&$("vppRocketCountVal")){const y=parseInt($("vppRocketCountVal").textContent)||0;$("vppRocketCountVal").textContent=y+1}if(r&&$("vppTrophyCountVal")){const y=parseInt($("vppTrophyCountVal").textContent)||0;$("vppTrophyCountVal").textContent=y+1}if(window.currentViewedUser){const y=window.currentViewedUser.roseCount||0,B=window.currentViewedUser.rocketCount||0,V=window.currentViewedUser.trophyCount||0,F=[];y>0&&F.push("rose"),B>0&&F.push("rocket"),V>0&&F.push("trophy"),typeof window.startVppCarousel=="function"&&window.startVppCarousel(F)}const h="POP-"+Math.floor(1e5+Math.random()*9e5),M=window.currentViewingPlayerName||window.currentViewedUser&&(window.currentViewedUser.name||window.currentViewedUser.userName)||"Player";await addDoc(collection(db,"deposit_requests"),{userId:t.uid,userName:t.name||t.userName||"Player",userHandle:t.handle||"",amountPKR:0,amountAX:s,method:`Popularity ${c} Sent to ${M}`,txnId:h,status:"approved",type:"withdrawal",submittedAt:serverTimestamp()});const L=$("popSuccessMsg");L&&(L.textContent=`You sent a ${c} to ${M}! +${d} Popularity! ${l}`,L.classList.remove("hidden")),window.closeGiftBottomSheet();const A=i?"rose-popularity-splash":n?"rocket-popularity-splash":"trophy-popularity-splash",P=i?"roseSplashLottie":n?"rocketSplashLottie":"trophySplashLottie",k=$(A),E=document.getElementById(P);E&&typeof E.stop=="function"&&(E.stop(),E.play()),k&&(k.classList.remove("hidden"),k.offsetHeight,k.style.opacity="1",setTimeout(()=>{k.style.opacity="0",setTimeout(()=>{k.classList.add("hidden")},300)},i?2e3:n?3e3:3500)),typeof showToastNotification=="function"&&showToastNotification(`${c} Sent ${l}`,`+${d} Popularity sent to ${M}! (-${s} AX Coins)`)}catch(b){console.error("Error sending popularity:",b),alert("Failed to send popularity: "+(b.message||b))}finally{p&&(p.disabled=!1,f&&(p.innerHTML=f))}};window.submitGiftSendFromBottomSheet=function(){window.sendPopularityGiftItem(window.selectedGiftItemType)};$("btnTogglePopularity")&&$("btnTogglePopularity").addEventListener("click",()=>{window.openGiftBottomSheet()});$("btnSendRose")&&$("btnSendRose").addEventListener("click",()=>{window.sendPopularityGiftItem("rose")});$("btnSendRocket")&&$("btnSendRocket").addEventListener("click",()=>{window.sendPopularityGiftItem("rocket")});window.openPopularityHistoryModal=window.openPopularityHistoryModal;window.closePopularityHistoryModal=window.closePopularityHistoryModal;window.openGiftBottomSheet=window.openGiftBottomSheet;window.closeGiftBottomSheet=window.closeGiftBottomSheet;window.selectGiftItem=window.selectGiftItem;window.sendPopularityGiftItem=window.sendPopularityGiftItem;window.submitGiftSendFromBottomSheet=window.submitGiftSendFromBottomSheet;window.triggerFloatingGiftAnimation=window.triggerFloatingGiftAnimation;let Et=null,Dt=null,bo=null,go=null,mt=null,io=0,ao="global",It=null,Nt=null,Mo=[];function an(){const e=userProfile||guestProfile;if(!(!e||guestProfile)){if(Et){try{Et()}catch{}Et=null}if(Dt){try{Dt()}catch{}Dt=null}Et=onSnapshot(collection(db,"users",e.uid,"friendRequests"),t=>{var d,c,l,u;const o=$("friendReqsList"),i=$("friendReqsListModal");o&&(o.innerHTML=""),i&&(i.innerHTML="");const n=t.size,r=$("friendRequestsCountBadge"),s=$("modalReqsBadge");n>0?(r&&(r.textContent=n,r.classList.remove("hidden")),s&&(s.textContent=n),(d=$("friendReqsWrap"))==null||d.classList.remove("hidden"),(c=$("friendReqsWrapModal"))==null||c.classList.remove("hidden")):(r&&r.classList.add("hidden"),(l=$("friendReqsWrap"))==null||l.classList.add("hidden"),(u=$("friendReqsWrapModal"))==null||u.classList.add("hidden")),!t.empty&&t.forEach(p=>{var g,w;const f=p.data(),b=document.createElement("div");b.className="p-3 bg-ele border border-bdr rounded-xl flex items-center justify-between text-xs font-semibold",b.innerHTML=`
        <div class="flex items-center gap-3 min-w-0">
          <img src="${f.av||"https://api.dicebear.com/7.x/bottts/svg?seed="+f.uid}" class="w-8 h-8 rounded-full border border-bdr shrink-0 object-cover"/>
          <div class="truncate">
            <div class="text-white font-bold leading-tight truncate">${f.name}</div>
            <div class="text-[9px] text-t3 font-medium truncate">${f.handle}</div>
          </div>
        </div>
        <div class="flex gap-1.5 shrink-0">
          <button class="b-acc w-7 h-7 bg-green/10 hover:bg-green/20 text-green rounded-full border border-green/20 transition flex items-center justify-center text-[10px] cursor-pointer" data-uid="${f.uid}" data-name="${f.name}" data-handle="${f.handle}" data-av="${f.av}"><i class="fas fa-check"></i></button>
          <button class="b-dec w-7 h-7 bg-red/10 hover:bg-red/20 text-red rounded-full border border-red/20 transition flex items-center justify-center text-[10px] cursor-pointer" data-uid="${f.uid}"><i class="fas fa-times"></i></button>
        </div>
      `,(g=b.querySelector(".b-acc"))==null||g.addEventListener("click",h=>oa(h.currentTarget.dataset)),(w=b.querySelector(".b-dec"))==null||w.addEventListener("click",h=>ia(h.currentTarget.dataset.uid)),o&&o.appendChild(b),i&&i.appendChild(b.cloneNode(!0))})},t=>{console.warn("Friend requests listen warning:",t)}),Dt=onSnapshot(collection(db,"users",e.uid,"friends"),t=>{const o=$("friendsList"),i=$("friendsModalList"),n=t.size,r=$("friendsCountBadge");if(r&&(r.textContent=n),t.empty){o&&(o.innerHTML=`
          <div class="p-8 bg-card border border-bdr rounded-xl text-center text-xs text-t3">
            <i class="fas fa-user-friends text-2xl mb-2"></i>
            <p>No active friends yet. Click the + button to search and add friends!</p>
          </div>`),i&&(i.innerHTML=`
          <div class="p-8 bg-card border border-bdr rounded-xl text-center text-xs text-t3">
            <i class="fas fa-user-friends text-2xl mb-2"></i>
            <p>No friends added yet. Search players using the + button.</p>
          </div>`);return}const s=[];t.forEach(c=>{s.push(c.data())});const d=c=>{o&&(o.innerHTML=""),i&&(i.innerHTML=""),c.forEach(l=>{var L,A;const u=document.createElement("div");u.className="p-3 bg-card border border-bdr hover:border-gold rounded-xl flex items-center gap-3.5 cursor-pointer transition relative group";const p=l.uid==="arenax_moderators";p&&(l.name="ArenaX Moderators",l.av="Moderator.png",l.hasBlueTick=!0,l.isOfficial=!0);const f=l.unreadCount||Math.floor(Math.random()*3)+1,b=l.lastMsgDate||"30/07/2026",g=l.lastMsg||"Tap to start direct messaging...",w=p||l.isOfficial||((L=l.name)==null?void 0:L.toLowerCase().includes("bot"))||((A=l.name)==null?void 0:A.toLowerCase().includes("official")),h=p?"Official Verified":"ID: "+getNumericPlayerId(l.uid,l.handle),M=p?"Moderator.png":l.av||"https://api.dicebear.com/7.x/bottts/svg?seed="+l.uid;if(u.innerHTML=`
          <div class="relative shrink-0">
            <img src="${M}" class="w-11 h-11 rounded-full ${p?"border-2 border-blue-400":"border border-bdr"} object-cover"/>
            <span class="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white font-bold text-[9px] rounded-full flex items-center justify-center border border-card shadow-xs">
              ${f}
            </span>
          </div>
          <div class="min-w-0 flex-1 space-y-0.5">
            <div class="flex items-center justify-between gap-2">
              <div class="text-xs font-bold text-white truncate flex items-center gap-1">
                <span>${l.name}</span>
                ${p?'<img src="bluetick.png" class="w-3.5 h-3.5 object-contain inline-block shrink-0" alt="Verified" /><span class="bg-blue-500/20 text-blue-400 font-semibold text-[8px] px-1.5 py-0.2 rounded-full border border-blue-500/30">Official</span>':w?'<span class="bg-cyan-400/20 text-cyan-400 font-semibold text-[8px] px-1.5 py-0.2 rounded-full border border-cyan-400/30">Official</span>':""}
                ${!p&&window.getBlueTickBadgeHtml?window.getBlueTickBadgeHtml(l):""}
              </div>
              <span class="text-[9px] text-t3 shrink-0 font-medium">${b}</span>
            </div>
            <p class="text-[11px] text-t3 truncate leading-snug font-normal">${g}</p>
          </div>
        `,u.addEventListener("click",()=>vt(l)),o&&o.appendChild(u),i){const P=document.createElement("div");P.className="p-3 bg-card border border-bdr hover:border-gold rounded-xl flex items-center justify-between gap-3 text-xs transition cursor-pointer",P.innerHTML=`
            <div class="flex items-center gap-3 min-w-0">
              <img src="${M}" class="w-10 h-10 rounded-full ${p?"border-2 border-blue-400":"border border-bdr"} object-cover shrink-0"/>
              <div class="min-w-0">
                <div class="font-bold text-white truncate flex items-center gap-1">
                  <span>${l.name}</span>
                  ${p?'<img src="bluetick.png" class="w-3.5 h-3.5 object-contain shrink-0" alt="Verified" />':""}
                </div>
                <div class="text-[10px] text-t3 truncate font-mono">${h}</div>
              </div>
            </div>
            <button class="px-3 py-1.5 bg-gold hover:bg-[#e8b830] text-bg text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1 shrink-0">
              <i class="fas fa-paper-plane"></i> View
            </button>
          `,P.addEventListener("click",()=>{var k;(k=$("mFriendsModal"))==null||k.classList.add("hidden"),vt(l)}),i.appendChild(P)}})};d(s),Promise.all(s.map(async c=>{try{if(c.uid){const l=await getDoc(doc(db,"users",c.uid));if(l.exists()){const u=l.data();return{...c,name:u.name||c.name,av:u.av||c.av,handle:u.handle||c.handle}}}}catch{}return c})).then(c=>{d(c)}).catch(c=>console.warn("Friend enrich warning:",c))},t=>{console.warn("Friends list listen warning:",t)})}}async function oa(e){const t=userProfile||guestProfile;try{await setDoc(doc(db,"users",t.uid,"friends",e.uid),{uid:e.uid,name:e.name,handle:e.handle,av:e.av,addedAt:serverTimestamp()}),await setDoc(doc(db,"users",e.uid,"friends",t.uid),{uid:t.uid,name:t.name,handle:t.handle,av:t.av,addedAt:serverTimestamp()}),await deleteDoc(doc(db,"users",t.uid,"friendRequests",e.uid)),typeof window.sendPersonalNotification=="function"&&window.sendPersonalNotification(e.uid,{title:"Friend Request Accepted ✅",body:`${t.name||"Someone"} accepted your friend request`,icon:t.av||"arenax_logo.jpg",url:"https://arenax.cyou/#friends",data:{type:"friend_accepted",friendUid:t.uid}}).catch(console.warn),alert(`Friendship accepted with ${e.name}! ✓`)}catch(o){alert(o.message)}}async function ia(e){const t=userProfile||guestProfile;try{await deleteDoc(doc(db,"users",t.uid,"friendRequests",e))}catch(o){console.error(o)}}var qi;(qi=$("btnOpenFriendsModal"))==null||qi.addEventListener("click",()=>{var e;if(guestProfile){alert("Guest profiles are restricted. Register a real account!");return}(e=$("mFriendsModal"))==null||e.classList.remove("hidden")});var ji;(ji=$("bCloseFriendsModal"))==null||ji.addEventListener("click",()=>{var e;return(e=$("mFriendsModal"))==null?void 0:e.classList.add("hidden")});var Oi;(Oi=$("bCloseFriendsModalDone"))==null||Oi.addEventListener("click",()=>{var e;return(e=$("mFriendsModal"))==null?void 0:e.classList.add("hidden")});window.openTasksModal=function(){const e=$("mTasksModal");if(e&&e.classList.remove("hidden"),Ot(),typeof window.reactOpenTasksModal=="function")try{window.reactOpenTasksModal()}catch{}};window.closeTasksModal=function(){const e=$("mTasksModal");e&&e.classList.add("hidden")};function nn(){window.openTasksModal()}function rn(){window.closeTasksModal()}window.getActiveUserProfile=function(){var t;let e=window.userProfile||window.guestProfile||window.currentUser;if(!e)if(typeof auth<"u"&&auth&&auth.currentUser)e={uid:auth.currentUser.uid,id:auth.currentUser.uid,name:auth.currentUser.displayName||((t=auth.currentUser.email)==null?void 0:t.split("@")[0])||"Player",av:auth.currentUser.photoURL||`https://api.dicebear.com/7.x/bottts/svg?seed=${auth.currentUser.uid}`,hasFrame:localStorage.getItem("user_has_frame")==="true",frameEquipped:localStorage.getItem("user_frame_equipped")==="true"},window.currentUser=e,window.userProfile=e;else{const o=localStorage.getItem("guest_id")||Math.floor(1e5+Math.random()*9e5);localStorage.setItem("guest_id",String(o)),e={uid:`guest_${o}`,id:`guest_${o}`,name:"Guest Player",handle:`@guest#${o}`,av:`https://api.dicebear.com/7.x/bottts/svg?seed=g${o}`,hasFrame:localStorage.getItem("user_has_frame")==="true",frameEquipped:localStorage.getItem("user_frame_equipped")==="true"},window.currentUser=e,window.guestProfile=e}return e};function Ot(){const e=window.getActiveUserProfile();if(e){const t=$("btnTaskClaimFrame"),o=$("taskModalUserAv");o&&e.av&&(o.src=e.av);const i=!!(e.hasFrame||localStorage.getItem("user_has_frame")==="true"),n=!!(e.frameEquipped||localStorage.getItem("user_frame_equipped")==="true");t&&(i?n?(t.textContent="Equipped ✓",t.className="px-3 py-1.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-bold transition shrink-0 cursor-pointer"):(t.textContent="Equip Frame",t.className="px-3 py-1.5 bg-[#f0c040] text-[#0a0c12] hover:bg-[#e8b830] rounded-lg text-xs font-bold transition shrink-0 cursor-pointer"):(t.textContent="Claim Frame",t.className="px-3 py-1.5 bg-[#f0c040] text-[#0a0c12] hover:bg-[#e8b830] rounded-lg text-xs font-bold transition shrink-0 shadow-[0_0_12px_rgba(240,192,64,0.4)] cursor-pointer"))}}window.updateCustomizeFrameButtonState=function(){const e=window.getActiveUserProfile();if(!e)return;const t=$("btnCustModalToggleFrame"),o=$("custModalFrameStatusText"),i=$("custModalFrameAvatar");i&&e.av&&(i.src=e.av);const n=!!(e.hasFrame||localStorage.getItem("user_has_frame")==="true"),r=!!(e.frameEquipped||localStorage.getItem("user_frame_equipped")==="true");t&&(n?r?(t.textContent="Unequip Frame",t.className="px-3 py-1.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 rounded-lg text-xs font-bold transition shrink-0 cursor-pointer",o&&(o.textContent="Currently Active across Profile ✓")):(t.textContent="Equip Frame",t.className="px-3 py-1.5 bg-[#f0c040] text-[#0a0c12] hover:bg-[#e8b830] rounded-lg text-xs font-bold transition shrink-0 cursor-pointer",o&&(o.textContent="Unlocked & Ready to Equip")):(t.textContent="Get Frame (Tasks)",t.className="px-3 py-1.5 bg-[#f0c040]/20 text-[#f0c040] border border-[#f0c040]/30 hover:bg-[#f0c040]/30 rounded-lg text-xs font-bold transition shrink-0 cursor-pointer",o&&(o.textContent="Locked - Complete 1 Day Login in Tasks"))),window.updateAllAvatarFrames&&window.updateAllAvatarFrames()};window.handleClaimOrToggleFrameFromVanilla=async function(){const e=window.getActiveUserProfile(),t=$("btnTaskClaimFrame"),o=$("btnCustModalToggleFrame");t&&(t.disabled=!0),o&&(o.disabled=!0);try{const i=!!(e.hasFrame||localStorage.getItem("user_has_frame")==="true"),n=!!(e.frameEquipped||localStorage.getItem("user_frame_equipped")==="true");if(!i)e.hasFrame=!0,e.frameEquipped=!0,localStorage.setItem("user_has_frame","true"),localStorage.setItem("user_frame_equipped","true"),localStorage.setItem("user_frame_expiry",String(Date.now()+4320*60*1e3)),e.uid&&!e.uid.startsWith("guest_")&&typeof db<"u"&&typeof doc<"u"&&typeof updateDoc<"u"&&await updateDoc(doc(db,"users",e.uid),{hasFrame:!0,frameEquipped:!0,frameExpiresAt:new Date(Date.now()+4320*60*1e3).toISOString()}).catch(r=>console.warn(r)),typeof spawnConfetti=="function"&&spawnConfetti(["#f0c040","#a78bfa","#38bdf8"]),typeof showToastNotification=="function"&&showToastNotification("VIP Frame Unlocked! ✨","You claimed the 3-Day VIP Avatar Frame!");else{const r=!n;e.frameEquipped=r,localStorage.setItem("user_frame_equipped",String(r)),e.uid&&!e.uid.startsWith("guest_")&&typeof db<"u"&&typeof doc<"u"&&typeof updateDoc<"u"&&await updateDoc(doc(db,"users",e.uid),{frameEquipped:r}).catch(s=>console.warn(s)),typeof showToastNotification=="function"&&showToastNotification(r?"Frame Equipped! ✨":"Frame Unequipped",r?"VIP Frame active across profile!":"Avatar frame unequipped.")}window.updateAllAvatarFrames&&window.updateAllAvatarFrames(),typeof Ot=="function"&&Ot(),typeof window.updateCustomizeFrameButtonState=="function"&&window.updateCustomizeFrameButtonState(),typeof boot=="function"&&boot()}catch(i){console.error("Frame action error:",i),alert("Action failed: "+(i.message||i))}finally{t&&(t.disabled=!1),o&&(o.disabled=!1)}};window.cachedRankingPlayers=null;window.isPreloadingRanking=!1;window.preloadRankingData=async function(e=!1){if(window.isPreloadingRanking&&!e)return window.cachedRankingPlayers;if(!e&&window.cachedRankingPlayers&&window.cachedRankingPlayers.length>0)return $("homeRankingAv")&&window.cachedRankingPlayers[0]&&($("homeRankingAv").src=window.cachedRankingPlayers[0].av),window.cachedRankingPlayers;window.isPreloadingRanking=!0;try{const t=query(collection(db,"users"),limit(100)),o=await getDocs(t);let i=[];if(o.forEach(n=>{const r=n.data();i.push({uid:n.id,name:r.name||r.displayName||r.username||"Player",balance:Number(r.balance||r.coins||0),av:r.av||r.avatar||r.photoURL||`https://api.dicebear.com/7.x/bottts/svg?seed=${n.id}`,premium:!!r.premium,goldenNameEnabled:r.goldenNameEnabled!==!1,nameColor:r.nameColor||""})}),window.userProfile){const n=window.userProfile.uid||window.userProfile.id;i.some(s=>s.uid===n)?i=i.map(s=>s.uid===n?{...s,name:window.userProfile.name||s.name,balance:Number(window.userProfile.balance??s.balance),av:window.userProfile.av||s.av,premium:window.userProfile.premium!==void 0?window.userProfile.premium:s.premium,goldenNameEnabled:window.userProfile.goldenNameEnabled!==void 0?window.userProfile.goldenNameEnabled:s.goldenNameEnabled,nameColor:window.userProfile.nameColor||s.nameColor}:s):i.push({uid:n||"me",name:window.userProfile.name||"You",balance:Number(window.userProfile.balance||0),av:window.userProfile.av||"https://api.dicebear.com/7.x/bottts/svg?seed=me",premium:!!window.userProfile.premium,goldenNameEnabled:window.userProfile.goldenNameEnabled!==!1,nameColor:window.userProfile.nameColor||""})}return i.sort((n,r)=>r.balance-n.balance),window.cachedRankingPlayers=i,i.length>0&&$("homeRankingAv")&&($("homeRankingAv").src=i[0].av),i}catch(t){return console.warn("Error preloading ranking data:",t),window.cachedRankingPlayers||[]}finally{window.isPreloadingRanking=!1}};setTimeout(()=>{typeof window.preloadRankingData=="function"&&window.preloadRankingData().catch(()=>{})},300);window.openRankingModal=function(){const e=$("mRankingModal");e&&e.classList.remove("hidden"),aa()};window.closeRankingModal=function(){const e=$("mRankingModal");e&&e.classList.add("hidden")};function sn(){window.openRankingModal()}window.setRkCategory=function(e){const t=$("rkTabCoins"),o=$("rkTabWeekly");e==="AX Coins"?(t&&(t.className="px-6 py-1.5 rounded-full text-xs font-bold transition bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg"),o&&(o.className="px-6 py-1.5 rounded-full text-xs font-bold transition text-white/70 hover:text-white")):(o&&(o.className="px-6 py-1.5 rounded-full text-xs font-bold transition bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg"),t&&(t.className="px-6 py-1.5 rounded-full text-xs font-bold transition text-white/70 hover:text-white"))};window.renderRankingUI=function(e){const t=$("rkListContainer");if(!t||!e)return;e.length>0&&$("homeRankingAv")&&($("homeRankingAv").src=e[0].av);const o=e[0]||{name:"No Player",balance:0,av:"https://api.dicebear.com/7.x/bottts/svg?seed=p1"},i=e[1]||{name:"—",balance:0,av:"https://api.dicebear.com/7.x/bottts/svg?seed=p2"},n=e[2]||{name:"—",balance:0,av:"https://api.dicebear.com/7.x/bottts/svg?seed=p3"},r=(s,d)=>{s&&(d.premium&&d.goldenNameEnabled!==!1?(s.classList.add("golden-name-shimmer"),s.style.background="",s.style.webkitBackgroundClip="",s.style.webkitTextFillColor="",s.style.fontWeight="",s.style.fontStyle="italic"):d.premium&&d.nameColor?(s.classList.remove("golden-name-shimmer"),s.style.background="none",s.style.webkitBackgroundClip="initial",s.style.webkitTextFillColor="initial",s.style.color=d.nameColor,s.style.fontWeight="",s.style.fontStyle=""):(s.classList.remove("golden-name-shimmer"),s.style.background="none",s.style.webkitBackgroundClip="initial",s.style.webkitTextFillColor="initial",s.style.color="",s.style.fontWeight="",s.style.fontStyle=""))};if($("rk1Name")&&($("rk1Name").textContent=o.name,r($("rk1Name"),o),o.uid&&($("rk1Name").onclick=()=>window.openPlayerProfileCard(o.uid),$("rk1Name").style.cursor="pointer")),$("rk1Bal")&&($("rk1Bal").textContent=o.balance.toLocaleString()+" AX"),$("rk1Av")&&($("rk1Av").src=o.av,o.uid&&($("rk1Av").onclick=()=>window.openPlayerProfileCard(o.uid),$("rk1Av").style.cursor="pointer")),$("rk2Name")&&($("rk2Name").textContent=i.name,r($("rk2Name"),i),i.uid&&($("rk2Name").onclick=()=>window.openPlayerProfileCard(i.uid),$("rk2Name").style.cursor="pointer")),$("rk2Bal")&&($("rk2Bal").textContent=i.balance.toLocaleString()+" AX"),$("rk2Av")&&($("rk2Av").src=i.av,i.uid&&($("rk2Av").onclick=()=>window.openPlayerProfileCard(i.uid),$("rk2Av").style.cursor="pointer")),$("rk3Name")&&($("rk3Name").textContent=n.name,r($("rk3Name"),n),n.uid&&($("rk3Name").onclick=()=>window.openPlayerProfileCard(n.uid),$("rk3Name").style.cursor="pointer")),$("rk3Bal")&&($("rk3Bal").textContent=n.balance.toLocaleString()+" AX"),$("rk3Av")&&($("rk3Av").src=n.av,n.uid&&($("rk3Av").onclick=()=>window.openPlayerProfileCard(n.uid),$("rk3Av").style.cursor="pointer")),t.innerHTML="",e.length<=3)t.innerHTML='<div class="text-center text-gray-400 py-8 text-xs font-semibold">No additional ranked players yet</div>';else for(let s=3;s<e.length;s++){const d=e[s],c=s+1,l=document.createElement("div");l.className="flex items-center justify-between p-3 rounded-2xl bg-gray-50/90 hover:bg-gray-100 border border-gray-100 transition cursor-pointer",d.uid&&(l.onclick=()=>window.openPlayerProfileCard(d.uid));const u=d.premium&&d.goldenNameEnabled!==!1,p=u?"golden-name-shimmer":"",f=u?'style="font-style: italic;"':d.premium&&d.nameColor?`style="color: ${d.nameColor};"`:"";l.innerHTML=`
        <div class="flex items-center gap-3.5 min-w-0">
          <span class="font-extrabold text-sm text-gray-400 w-5 text-center shrink-0">${c}</span>
          <img src="${d.av}" alt="${d.name}" class="w-11 h-11 rounded-full object-cover border border-gray-200 shrink-0 shadow-xs hover:scale-105 transition cursor-pointer"/>
          <div class="min-w-0">
            <div class="font-bold text-sm text-gray-900 truncate ${p}" ${f}>${d.name}</div>
            <div class="text-[11px] text-gray-400 font-medium truncate mt-0.5">Rank #${c} • Player</div>
          </div>
        </div>
        <div class="bg-gradient-to-r from-amber-50 to-yellow-100/80 border border-amber-200/90 text-amber-900 px-3.5 py-1.5 rounded-full text-xs font-black flex items-center gap-1.5 shrink-0 shadow-xs">
          <i class="fas fa-coins text-amber-500 text-xs"></i>
          <span>${d.balance.toLocaleString()} AX</span>
        </div>
      `,t.appendChild(l)}};async function aa(){if(window.cachedRankingPlayers&&window.cachedRankingPlayers.length>0){window.renderRankingUI(window.cachedRankingPlayers),window.preloadRankingData(!0).then(t=>{t&&t.length>0&&window.renderRankingUI(t)});return}const e=await window.preloadRankingData();e&&e.length>0&&window.renderRankingUI(e)}var Wi;(Wi=$("btnAddFriend"))==null||Wi.addEventListener("click",()=>{var e,t;if(guestProfile){alert("Guest profiles are restricted from finding players. Register a real account!");return}$("friendHandleInp").value="",$("friendSearchResult").innerHTML="",(e=$("bSendFriendReq"))==null||e.classList.add("hidden"),(t=$("mAddFriend"))==null||t.classList.remove("hidden")});var Xi;(Xi=$("bCloseAddFriend"))==null||Xi.addEventListener("click",()=>{var e;return(e=$("mAddFriend"))==null?void 0:e.classList.add("hidden")});var zi;(zi=$("bCloseAddFriendTop"))==null||zi.addEventListener("click",()=>{var e;return(e=$("mAddFriend"))==null?void 0:e.classList.add("hidden")});function dn(){if(bo&&bo(),go&&go(),!(userProfile||guestProfile))return;const t=query(collection(db,"global_chat"),orderBy("createdAt","desc"),limit(60));bo=onSnapshot(t,i=>{const n=[];i.forEach(r=>{n.push({id:r.id,...r.data()})}),n.reverse(),((window.activeMainTab||"Profile")!=="Chat"||ao!=="global")&&(io=!0,Wo(),Xo()),na(n)},i=>{console.warn("Global chat listen error:",i)});const o=query(collection(db,"global_chat_typing"),where("typing","==",!0));go=onSnapshot(o,i=>{const n=[],r=Date.now();i.forEach(c=>{var p;const l=c.data(),u=(p=userProfile||guestProfile)==null?void 0:p.uid;c.id!==u&&r-(l.timestamp||0)<6e3&&n.push(l.name||"Anonymous")});const s=$("globalTypingIndicator"),d=$("globalTypingText");s&&d&&(n.length>0?(d.textContent=`${n.join(", ")} ${n.length===1?"is":"are"} typing...`,s.classList.remove("hidden")):s.classList.add("hidden"))},i=>{console.warn("Global chat typing listener error (expected for guests):",i)})}function na(e){var i;const t=$("globalChatMsgs");if(!t)return;t.innerHTML="";const o=(i=userProfile||guestProfile)==null?void 0:i.uid;if(!e||e.length===0){t.innerHTML=`
      <div class="h-full flex flex-col items-center justify-center text-t3 text-center p-6">
        <i class="fas fa-globe text-3xl mb-1"></i>
        <p class="text-xs">No messages in Global Chat yet.</p>
        <p class="text-[10px]">Be the first to say hello!</p>
      </div>
    `;return}e.forEach(n=>{const r=document.createElement("div");if(n.isDeletedByAdmin){r.className="flex justify-center w-full my-2 px-4",r.innerHTML=`
        <div class="flex items-center gap-2 bg-red-500/10 border border-red-500/25 px-4 py-2 rounded-xl text-[11px] text-red-400 font-bold uppercase tracking-wider font-sans">
          <i class="fas fa-shield-halved text-xs animate-pulse"></i> This message was deleted by administration.
        </div>
      `,t.appendChild(r);return}if(n.isSystemAnnouncement){r.className="flex justify-center w-full my-3 px-4",r.innerHTML=`
        <div class="flex flex-col items-center text-center bg-amber-500/15 border border-amber-500/25 px-5 py-3 rounded-2xl max-w-[90%] text-xs text-amber-400 font-bold shadow-lg shadow-amber-500/5">
          <div class="flex items-center gap-2 text-[10px] uppercase tracking-wider font-extrabold mb-1.5 text-amber-400">
            <i class="fas fa-bullhorn text-xs"></i> Official Announcement
          </div>
          <p class="font-medium text-white leading-relaxed select-text">${n.text||""}</p>
        </div>
      `,t.appendChild(r);return}if(n.isAdminMessage){r.className="flex gap-2.5 max-w-[85%] mr-auto",r.innerHTML=`
        <div class="w-7 h-7 rounded-full bg-red-500/15 border border-red-500/35 flex items-center justify-center shrink-0 shadow-md">
          <i class="fas fa-shield-alt text-red-500 text-xs"></i>
        </div>
        <div>
          <div class="text-[9px] text-red-400 font-extrabold mb-0.5 tracking-wider uppercase flex items-center gap-1.5">
            ${n.userName||"System Admin"}${window.getBlueTickBadgeHtml(n)} <span class="bg-red-500 text-white text-[7px] font-black px-1.5 py-0.5 rounded uppercase leading-none">Staff</span>
          </div>
          <div class="p-3 rounded-xl text-xs leading-relaxed bg-[#1b1216] border border-red-500/30 text-white rounded-tl-none font-semibold shadow-lg shadow-red-500/5">
            ${n.text||""}
          </div>
        </div>
      `,t.appendChild(r);return}const s=n.userId===o;r.className=`flex gap-2.5 max-w-[85%] ${s?"ml-auto flex-row-reverse":""}`;const c=n.avatarFrame==="gold_football"?"border-2 border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.6)] animate-pulse":"border border-bdr";n.isVoiceRoomInvite?r.innerHTML=`
        <img
          src="${n.userAvatar||"https://api.dicebear.com/7.x/bottts/svg?seed=ax1"}"
          alt="Avatar"
          class="w-7 h-7 rounded-full bg-panel shrink-0 object-cover ${c} cursor-pointer hover:scale-105 transition duration-150"
          onclick="openPlayerProfileCard('${n.userId}')"
          title="Click to view profile"
        />
        <div class="space-y-1">
          <div class="text-[9px] text-t3 mb-0.5 font-semibold ${s?"text-right":""} flex items-center gap-1.5 ${s?"justify-end":""}">
            <span class="cursor-pointer hover:text-white hover:underline transition duration-150 flex items-center gap-1" onclick="openPlayerProfileCard('${n.userId}')">${n.userName||"Anonymous"}${window.getBlueTickBadgeHtml(n)}</span>
          </div>
          <div class="p-3 bg-gradient-to-br from-emerald-950/90 via-[#064e3b]/30 to-[#0a120f] border border-emerald-500/40 rounded-xl space-y-2.5 max-w-[280px] shadow-lg shadow-emerald-500/5">
            <div class="flex items-center gap-1.5 text-emerald-400 font-bold uppercase text-[9px] tracking-wider animate-pulse">
              <i class="fas fa-microphone-alt"></i> Live Voice Invite
            </div>
            <p class="text-white text-[11px] font-medium leading-relaxed">
              Hey! Join my squad voice room: <strong class="text-gold">"${n.voiceRoomName}"</strong> (${n.voiceRoomGame})
            </p>
            <button class="w-full py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-[9px] font-black uppercase tracking-wider transition shadow-md flex items-center justify-center gap-1.5 cursor-pointer" onclick="joinVoiceRoom('${n.voiceRoomId}').then(() => { goTo('sVoice'); })">
              <i class="fas fa-sign-in-alt"></i> Connect Live Audio
            </button>
          </div>
        </div>
      `:r.innerHTML=`
        <img
          src="${n.userAvatar||"https://api.dicebear.com/7.x/bottts/svg?seed=ax1"}"
          alt="Avatar"
          class="w-7 h-7 rounded-full bg-panel shrink-0 object-cover ${c} cursor-pointer hover:scale-105 transition duration-150"
          onclick="openPlayerProfileCard('${n.userId}')"
          title="Click to view profile"
        />
        <div>
          <div class="text-[9px] text-t3 mb-0.5 font-semibold ${s?"text-right":""} flex items-center gap-1.5 ${s?"justify-end":""}">
            <span class="cursor-pointer hover:text-white hover:underline transition duration-150 flex items-center gap-1" onclick="openPlayerProfileCard('${n.userId}')">${n.userName||"Anonymous"}${window.getBlueTickBadgeHtml(n)}</span>
          </div>
          <div class="p-3 rounded-xl text-xs leading-relaxed ${s?"bg-gold text-bg font-semibold rounded-tr-none":"bg-card border border-bdr text-white rounded-tl-none"}">
            ${n.text||""}
          </div>
        </div>
      `,t.appendChild(r)}),t.scrollTop=t.scrollHeight}function Wo(){const e=$("chatDot");e&&(io?(e.classList.remove("hidden"),e.classList.add("bg-gold")):e.classList.add("hidden"))}function Xo(){const e=$("subGlobalDot");e&&(io&&ao!=="global"?e.classList.remove("hidden"):e.classList.add("hidden"))}async function Wt(e){const t=userProfile||guestProfile;if(!(!t||guestProfile))try{await setDoc(doc(db,"global_chat_typing",t.uid),{name:t.name||"Anonymous Player",typing:e,timestamp:Date.now()},{merge:!0})}catch(o){console.warn("Typing update error:",o)}}function ra(){Wt(!0),mt&&clearTimeout(mt),mt=setTimeout(()=>{Wt(!1)},2500)}$("btnSubGlobal").addEventListener("click",()=>{var t;ao="global",$("btnSubGlobal").className="pb-2 text-xs font-bold uppercase tracking-wider text-gold relative transition cursor-pointer",$("btnSubDM").className="pb-2 text-xs font-bold uppercase tracking-wider text-t2 hover:text-white relative transition cursor-pointer",$("subGlobalIndicator").classList.remove("hidden"),$("subDMIndicator").classList.add("hidden"),$("globalChatWindow").classList.remove("hidden"),$("dmChatContainer").classList.add("hidden"),(t=$("chatTopActionBtns"))==null||t.classList.add("hidden"),io=!1,Wo(),Xo();const e=$("globalChatMsgs");e&&(e.scrollTop=e.scrollHeight)});$("btnSubDM").addEventListener("click",()=>{var e;ao="dm",$("btnSubDM").className="pb-2 text-xs font-bold uppercase tracking-wider text-gold relative transition cursor-pointer",$("btnSubGlobal").className="pb-2 text-xs font-bold uppercase tracking-wider text-t2 hover:text-white relative transition cursor-pointer",$("subDMIndicator").classList.remove("hidden"),$("subGlobalIndicator").classList.add("hidden"),$("dmChatContainer").classList.remove("hidden"),$("globalChatWindow").classList.add("hidden"),guestProfile||(e=$("chatTopActionBtns"))==null||e.classList.remove("hidden")});function zo(){const e=userProfile||guestProfile;if(!e||guestProfile)return!1;if(e.banned||e.accountStatus==="permanently_blocked"||e.accountStatus==="temporarily_blocked")return alert(`❌ Account Blocked!
Reason: ${e.banReason||"Safety Violations"}`),!0;if(e.restricted||e.accountStatus==="restricted")if(e.restrictedUntil){const t=e.restrictedUntil.toDate?e.restrictedUntil.toDate().getTime():new Date(e.restrictedUntil).getTime();if(Date.now()>t)updateDoc(doc(db,"users",e.uid),{restricted:!1,accountStatus:"active",restrictedUntil:null}).catch(console.warn),e.restricted=!1,e.accountStatus="active";else{const o=new Date(t).toLocaleString();return alert(`⚠️ Your account features are suspended until ${o}.
Reason: ${e.restrictedReason||e.banReason||"Safety Violation"}`),!0}}else return alert(`⚠️ Your account features are suspended.
Reason: ${e.restrictedReason||e.banReason||"Safety Violation"}`),!0;if(e.muted)if(e.muteUntil){const t=new Date(e.muteUntil).getTime();if(Date.now()>t)return updateDoc(doc(db,"users",e.uid),{muted:!1,muteReason:"",muteUntil:null}).catch(console.warn),!1;{const o=new Date(t).toLocaleString();return alert(`🔇 You are muted until ${o}.
Reason: ${e.muteReason||"No reason specified"}`),!0}}else return alert(`🔇 You are permanently muted from chat.
Reason: ${e.muteReason||"No reason specified"}`),!0;return!1}$("globalChatInput").addEventListener("input",()=>{ra()});$("globalChatForm").addEventListener("submit",async e=>{if(e.preventDefault(),guestProfile){alert("Create an account to participate in Global Chat!");return}if(zo())return;const t=$("globalChatInput"),o=t.value.trim();if(!o)return;t.value="",Wt(!1),mt&&clearTimeout(mt);const i=userProfile||guestProfile,n=["bkl","mc","bc","chutiya","gand","gandi","gali","fuck","bitch","asshole","shitty","randi","loda","lunde","kutta","saala","saale","madarchod","behenchod","harami","bhonsri"];let r=o,s=!1;const d=o.toLowerCase();n.forEach(c=>{const l=new RegExp(c,"gi");l.test(d)&&(s=!0,r=r.replace(l,"***"))});try{const c=await addDoc(collection(db,"global_chat"),{userId:i.uid,userName:i.name,hasBlueTick:!!(i.hasBlueTick||i.isVerified),userAvatar:i.av||"https://api.dicebear.com/7.x/bottts/svg?seed=ax1",text:r,originalText:o,isAbusive:s,avatarFrame:i.avatarFrame||localStorage.getItem("selectedAvatarFrame")||"none",createdAt:serverTimestamp()});if(i&&!i.guest){const l=new Date(Date.now()+18e6).toISOString().split("T")[0];await updateDoc(doc(db,"users",i.uid),{"dailyTasks.chat":!0,"dailyTasks.date":l,"welcomeBonus.chat":!0}).catch(u=>console.warn("Failed to update chat tasks: ",u))}s&&await addDoc(collection(db,"chat_reports"),{userId:i.uid,userName:i.name,userEmail:i.email||"",messageId:c.id,messageText:o,createdAt:serverTimestamp(),status:"open"})}catch(c){console.warn("Failed to send message:",c)}});let Re=null;$("btnSearchFriend").addEventListener("click",async()=>{var o;const e=$("friendHandleInp").value.trim(),t=e.replace(/^ID:\s*/i,"").replace(/^ID\s*/i,"").replace(/^@/,"").trim().toLowerCase();if(!t){alert("Please enter a Numeric Player ID (e.g. 849201) or Username to search!");return}$("friendSearchResult").innerHTML='<div class="text-xs text-t3 animate-pulse">Scanning database for player ID...</div>',$("bSendFriendReq").classList.add("hidden");try{let i=null;const n=(o=userProfile||guestProfile)==null?void 0:o.uid,r=query(collection(db,"users"),where("handle","==",t));if((await getDocs(r)).forEach(c=>{const l=c.data();!i&&l.uid!==n&&(i={id:c.id,...l})}),!i){const c=query(collection(db,"users"),where("handle","==","@"+t));(await getDocs(c)).forEach(u=>{const p=u.data();!i&&p.uid!==n&&(i={id:u.id,...p})})}if(i||(await getDocs(query(collection(db,"users"),limit(100)))).forEach(l=>{const u=l.data();if(!i&&u.uid!==n){const p=getNumericPlayerId(u.uid,u.handle),f=(u.handle||"").replace(/^@/,"").toLowerCase(),b=(u.name||"").toLowerCase();(p===t||f===t||b.includes(t)||u.uid===t)&&(i={id:l.id,...u})}}),!i||i.uid==="arenax_moderators"){$("friendSearchResult").innerHTML='<div class="text-xs text-red font-semibold">No player found matching ID "'+e+'". Double check the ID!</div>';return}Re=i;const d="ID: "+getNumericPlayerId(i.uid,i.handle);$("friendSearchResult").innerHTML=`
      <div class="p-3 bg-card border border-bdr rounded-xl flex items-center gap-3">
        <img src="${i.av||"https://api.dicebear.com/7.x/bottts/svg?seed="+i.uid}" class="w-9 h-9 rounded-full border border-bdr object-cover"/>
        <div>
          <div class="text-xs font-bold text-white">${i.name}</div>
          <div class="text-[10px] text-gold font-bold font-mono">${d}</div>
        </div>
      </div>
    `,$("bSendFriendReq").classList.remove("hidden")}catch(i){$("friendSearchResult").innerHTML=`<div class="text-xs text-red">Search Error: ${i.message}</div>`}});$("bSendFriendReq").addEventListener("click",async()=>{if(Re)try{const[e,t]=await Promise.all([getDoc(doc(db,"users",Re.uid,"blocked",userProfile.uid)),getDoc(doc(db,"users",userProfile.uid,"blocked",Re.uid))]);if(e.exists()){alert("You cannot send friend requests to this player because they have blocked you.");return}if(t.exists()){alert("You have blocked this player. Unblock them first to send a friend request.");return}await setDoc(doc(db,"users",Re.uid,"friendRequests",userProfile.uid),{uid:userProfile.uid,name:userProfile.name,handle:userProfile.handle,av:userProfile.av,sentAt:serverTimestamp()}),typeof window.sendPersonalNotification=="function"&&window.sendPersonalNotification(Re.uid,{title:"New Friend Request 👥",body:`${userProfile.name||"Someone"} wants to be your friend`,icon:userProfile.av||"arenax_logo.jpg",url:"https://arenax.cyou/#friends",data:{type:"friend_request",senderUid:userProfile.uid}}).catch(console.warn),$("mAddFriend").classList.add("hidden"),alert(`Friend request sent successfully to ${Re.name}!`)}catch(e){alert(e.message)}});let De=null,Ie=null,re="";function vt(e){var c,l,u,p;const t=userProfile||guestProfile;if(!t)return;re=e.uid;const o=e.uid==="arenax_moderators";Ie&&(Ie(),Ie=null),o?((c=$("dmInputBar"))==null||c.classList.add("hidden"),(l=$("dmModeratorChannelBanner"))==null||l.classList.remove("hidden"),e.av="Moderator.png",e.name="ArenaX Moderators",e.hasBlueTick=!0,e.isOfficial=!0,$("dmChatName")&&($("dmChatName").innerHTML='<span class="text-sm font-bold text-gray-900">ArenaX Moderators</span><img src="bluetick.png" class="w-4 h-4 inline-block align-middle ml-1 shrink-0 drop-shadow-[0_0_6px_rgba(29,155,240,0.5)]" alt="Verified" /><span class="bg-blue-500/20 text-blue-600 font-semibold text-[9px] px-1.5 py-0.5 rounded-full border border-blue-500/30 ml-1">Official</span>'),$("dmChatAv")&&($("dmChatAv").src="Moderator.png"),$("dmChatNum")&&($("dmChatNum").textContent="M")):((u=$("dmInputBar"))==null||u.classList.remove("hidden"),(p=$("dmModeratorChannelBanner"))==null||p.classList.add("hidden"),e.uid&&(Ie=onSnapshot(doc(db,"users",e.uid),f=>{if(f.exists()){const b=f.data();b.av&&(e.av=b.av),b.name&&(e.name=b.name),b.isVerified!==void 0&&(e.isVerified=b.isVerified),b.hasBlueTick!==void 0&&(e.hasBlueTick=b.hasBlueTick),$("dmChatName")&&($("dmChatName").innerHTML=window.formatPlayerNameHtml(e,"text-sm font-bold text-gray-900")),$("dmChatAv")&&($("dmChatAv").src=e.av||`https://api.dicebear.com/7.x/bottts/svg?seed=${e.uid}`),document.querySelectorAll(`.dm-msg-av-${e.uid}`).forEach(g=>{g.src=e.av})}})),$("dmChatName")&&($("dmChatName").innerHTML=window.formatPlayerNameHtml(e,"text-sm font-bold text-gray-900")),$("dmChatAv")&&($("dmChatAv").src=e.av||`https://api.dicebear.com/7.x/bottts/svg?seed=${e.uid}`),$("dmChatNum")&&($("dmChatNum").textContent=e.badgeNum||"6")),$("dmMsgs").innerHTML='<div class="text-center text-xs text-gray-400 py-6 font-medium animate-pulse">Loading chat history...</div>',$("mDMChat").classList.remove("hidden"),De&&(De(),De=null);const i=t.uid||t.id,n=t.av||`https://api.dicebear.com/7.x/bottts/svg?seed=${i}`,r=o?"Moderator.png":e.av||`https://api.dicebear.com/7.x/bottts/svg?seed=${e.uid}`,s=[i,e.uid].sort().join("_"),d=query(collection(db,"dms",s,"messages"),orderBy("createdAt","asc"));De=onSnapshot(d,f=>{const b=$("dmMsgs");b.innerHTML="";let g="";f.forEach(w=>{const h=w.data(),M=h.sender===i,L=h.sender==="arenax_moderators"||!M&&o;let A="";if(h.createdAt){const k=h.createdAt.toDate?h.createdAt.toDate():new Date(h.createdAt),E=String(k.getDate()).padStart(2,"0"),y=String(k.getMonth()+1).padStart(2,"0"),B=k.getFullYear(),V=String(k.getHours()).padStart(2,"0"),F=String(k.getMinutes()).padStart(2,"0");A=`${E}/${y}/${B} ${V}:${F}`}else{const k=new Date,E=String(k.getDate()).padStart(2,"0"),y=String(k.getMonth()+1).padStart(2,"0"),B=k.getFullYear(),V=String(k.getHours()).padStart(2,"0"),F=String(k.getMinutes()).padStart(2,"0");A=`${E}/${y}/${B} ${V}:${F}`}if(A&&A!==g){g=A;const k=document.createElement("div");k.className="flex justify-center my-2.5",k.innerHTML=`<span class="bg-[#d1d5db] text-white text-[10px] px-2.5 py-0.5 rounded-md font-semibold tracking-wide shadow-2xs">${A}</span>`,b.appendChild(k)}const P=document.createElement("div");h.isVoiceRoomInvite?(P.className=M?"flex justify-end":"flex justify-start",P.innerHTML=`
          <div class="p-3 bg-gradient-to-br from-emerald-900 to-teal-950 text-white border border-emerald-500/40 rounded-2xl text-xs space-y-2 shadow-md max-w-[80%]">
            <div class="flex items-center gap-1.5 text-emerald-300 font-bold uppercase text-[9px] tracking-wider animate-pulse">
              <i class="fas fa-headset"></i> Voice Channel Invite
            </div>
            <p class="text-white text-[11px] font-medium leading-snug">
              Come talk! Join my room: <strong class="text-amber-300">"${h.voiceRoomName}"</strong>
            </p>
            <button class="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[9px] font-black uppercase tracking-wider transition shadow cursor-pointer flex items-center justify-center gap-1" onclick="joinVoiceRoom('${h.voiceRoomId}').then(() => { goTo('sVoice'); $('mDMChat').classList.add('hidden'); })">
              <i class="fas fa-sign-in-alt"></i> Join Room
            </button>
          </div>
        `):L?(P.className="flex items-start justify-start gap-2.5 max-w-[92%]",P.innerHTML=`
          <img src="Moderator.png" class="w-8 h-8 rounded-full border border-blue-400 object-cover shrink-0 mt-0.5 shadow-sm" alt="ArenaX Moderators"/>
          <div class="space-y-1 max-w-[88%]">
            <div class="flex items-center gap-1.5">
              <span class="text-xs font-bold text-slate-900">ArenaX Moderators</span>
              <img src="bluetick.png" class="w-3.5 h-3.5 object-contain inline-block shrink-0" alt="Verified" />
              <span class="bg-blue-500/20 text-blue-700 font-bold text-[8px] px-1.5 py-0.2 rounded-full border border-blue-400/40">Official Notice</span>
            </div>
            <div class="px-3.5 py-2.5 bg-[#0f172a] text-white rounded-2xl rounded-tl-xs text-xs font-normal shadow-md border border-blue-500/30 break-words leading-relaxed whitespace-pre-wrap">
              ${h.text}
            </div>
            <div class="text-[9px] text-slate-400 flex items-center gap-1 pl-1">
              <i class="fas fa-lock text-[8px]"></i> Official moderation channel • Replies disabled
            </div>
          </div>
        `):M?(P.className="flex items-start justify-end gap-2 max-w-[88%] ml-auto",P.innerHTML=`
            <div class="flex items-center gap-1 max-w-[80%]">
              ${h.status==="error"?'<span class="w-4 h-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center font-bold shrink-0">!</span>':""}
              <div class="px-3.5 py-2 bg-[#dcf8ff] text-slate-900 rounded-2xl rounded-tr-xs text-xs font-normal shadow-2xs border border-sky-100 break-words leading-relaxed">
                ${h.text}
              </div>
            </div>
            <img src="${n}" class="dm-msg-av-${i} w-8 h-8 rounded-full border border-gray-200 object-cover shrink-0 mt-0.5 shadow-2xs"/>
          `):(P.className="flex items-start justify-start gap-2 max-w-[88%]",P.innerHTML=`
            <img src="${r}" class="dm-msg-av-${e.uid} w-8 h-8 rounded-full border border-gray-200 object-cover shrink-0 mt-0.5 shadow-2xs"/>
            <div class="px-3.5 py-2 bg-white text-slate-900 rounded-2xl rounded-tl-xs text-xs font-normal shadow-2xs border border-gray-100 max-w-[80%] break-words leading-relaxed">
              ${h.text}
            </div>
          `),b.appendChild(P)}),f.empty&&(b.innerHTML=`
        <div class="flex flex-col items-center justify-center h-full py-12 text-center text-gray-400 space-y-1">
          <i class="far fa-comments text-3xl text-gray-300"></i>
          <p class="text-xs font-medium">No messages yet with ${e.name}</p>
          <p class="text-[10px] text-gray-400">Say hello to start the conversation!</p>
        </div>
      `),b.scrollTop=b.scrollHeight})}$("bCloseDMChat").addEventListener("click",()=>{$("mDMChat").classList.add("hidden"),De&&(De(),De=null),Ie&&(Ie(),Ie=null)});$("dmChatAv")&&$("dmChatAv").addEventListener("click",()=>{re&&openPlayerProfileCard(re)});$("dmChatName")&&$("dmChatName").addEventListener("click",()=>{re&&openPlayerProfileCard(re)});window.renderNonInteractive3DCharacter=function(e,t){const o=document.getElementById(e);if(!o)return;o.innerHTML="";const i=window.THREE;if(!i)return;const n=o.clientWidth||360,r=o.clientHeight||340,s=new i.Scene;s.background=null;const d=32,c=new i.PerspectiveCamera(d,n/r,.1,100),l=new i.WebGLRenderer({antialias:!0,alpha:!0,powerPreference:"high-performance"});l.setSize(n,r),l.setPixelRatio(Math.min(window.devicePixelRatio,2)),i.SRGBColorSpace&&(l.outputColorSpace=i.SRGBColorSpace),i.sRGBEncoding&&(l.outputEncoding=i.sRGBEncoding),o.appendChild(l.domElement);const u=new i.AmbientLight(16777215,1.8);s.add(u);const p=new i.DirectionalLight(16775917,2.2);p.position.set(3,5,4),s.add(p);const f=new i.DirectionalLight(10309375,1.2);f.position.set(-3,2,-3),s.add(f);const b=new i.PointLight(15777856,1.5,10);b.position.set(0,1,2),s.add(b);let g=null,w=null;const h=new i.Clock,M=(y,B,V)=>{if(!y||!c||!s)return;y.position.set(0,0,0),y.rotation.set(0,0,0),y.scale.set(1,1,1),y.updateMatrixWorld(!0);const F=new i.Box3,H=new i.Vector3;let J=!1;y.traverse(ee=>{if(ee.isBone&&(ee.getWorldPosition(H),F.expandByPoint(H),J=!0),ee.isMesh&&ee.geometry){ee.geometry.boundingBox||ee.geometry.computeBoundingBox();const I=ee.geometry.boundingBox;I&&([new i.Vector3(I.min.x,I.min.y,I.min.z),new i.Vector3(I.min.x,I.min.y,I.max.z),new i.Vector3(I.min.x,I.max.y,I.min.z),new i.Vector3(I.min.x,I.max.y,I.max.z),new i.Vector3(I.max.x,I.min.y,I.min.z),new i.Vector3(I.max.x,I.min.y,I.max.z),new i.Vector3(I.max.x,I.max.y,I.min.z),new i.Vector3(I.max.x,I.max.y,I.max.z)].forEach(ct=>{ct.applyMatrix4(ee.matrixWorld),F.expandByPoint(ct)}),J=!0)}}),(!J||F.isEmpty())&&F.setFromObject(y);const z=F.getSize(new i.Vector3),ne=F.getCenter(new i.Vector3),D=z.y>.05?z.y:2,pe=z.x>.05?z.x:.8,Q=2/D;y.scale.set(Q,Q,Q);const Z=.1;y.position.set(-ne.x*Q,-ne.y*Q+Z,-ne.z*Q),y.updateMatrixWorld(!0);const Ae=o.clientWidth||n,st=o.clientHeight||r,qe=st>0?Ae/st:1;c.aspect=qe;const dt=d*(Math.PI/180),At=2,Mt=pe*Q,lt=At/2/Math.tan(dt/2),Rt=Mt/2/(Math.tan(dt/2)*qe);let je=Math.max(lt,Rt)*1.42;if(qe<1&&(je=Math.max(je,lt/qe*1.25)),c.position.set(0,Z,je),c.lookAt(0,Z,0),c.near=.1,c.far=100,c.updateProjectionMatrix(),V&&B&&B.length>0){let ee=B.find(ye=>ye.name&&(ye.name.toLowerCase().includes("wave")||ye.name.toLowerCase().includes("mixamo")||ye.name.toLowerCase().includes("layer0")))||B[0];w=new i.AnimationMixer(y);const I=w.clipAction(ee);I.reset(),I.setLoop(i.LoopRepeat),I.play()}s.add(y)},L=()=>{const y=new i.Group,B=new i.MeshStandardMaterial({color:1580075,roughness:.3,metalness:.8}),V=new i.MeshStandardMaterial({color:15777856,roughness:.2,metalness:.9}),F=new i.MeshBasicMaterial({color:61695}),H=new i.MeshBasicMaterial({color:15777856}),J=new i.Mesh(new i.CylinderGeometry(.35,.25,.7,8),B);y.add(J);const z=new i.Mesh(new i.BoxGeometry(.4,.35,.2),V);z.position.set(0,.1,.12),y.add(z);const ne=new i.Mesh(new i.SphereGeometry(.08,16,16),H);ne.position.set(0,.1,.23),y.add(ne);const D=new i.Mesh(new i.BoxGeometry(.32,.32,.32),B);D.position.y=.55,y.add(D);const pe=new i.Mesh(new i.BoxGeometry(.28,.1,.08),F);pe.position.set(0,.58,.14),y.add(pe);const Q=new i.Mesh(new i.CylinderGeometry(.7,.75,.08,32),new i.MeshStandardMaterial({color:1185318,roughness:.4,metalness:.8}));Q.position.y=-.98,y.add(Q);const Z=new i.Mesh(new i.RingGeometry(.68,.74,32),new i.MeshBasicMaterial({color:15777856,side:i.DoubleSide}));return Z.rotation.x=Math.PI/2,Z.position.y=-.93,y.add(Z),y},P=String(t||"character_boy_1_fbx.glb").replace(/^(\.\/|\/)/,""),k=P.includes("Convert_Waving")||P.toLowerCase().includes("waving");typeof preloadArenaX3DModel=="function"?preloadArenaX3DModel(P).then(y=>{if(y){const B=typeof cloneArenaXGltf=="function"?cloneArenaXGltf(y):{scene:y.scene.clone(),animations:y.animations};g=B.scene,M(g,B.animations||y.animations,k)}else g=L(),M(g,[],!1)}).catch(()=>{g=L(),M(g,[],!1)}):(g=L(),M(g,[],!1));const E=()=>{requestAnimationFrame(E);const y=h.getDelta();w&&w.update(y),l&&s&&c&&l.render(s,c)};E()};let S=null;function no(){var t,o;const e=window.userProfile||(typeof userProfile<"u"?userProfile:null)||window.currentUser||window.guestProfile||(typeof guestProfile<"u"?guestProfile:null);if(e!=null&&e.uid)return e.uid;if(e!=null&&e.id)return e.id;if((o=(t=window.auth)==null?void 0:t.currentUser)!=null&&o.uid)return window.auth.currentUser.uid;try{const i=localStorage.getItem("arenaX_guest_profile");if(i){const n=JSON.parse(i);if(n!=null&&n.uid)return n.uid;if(n!=null&&n.id)return n.id}}catch{}return null}function ro(e,t){if(!t)return!1;try{if(e){const i=localStorage.getItem(`arenax_blocked_${e}`);if(i){const n=JSON.parse(i);if(Array.isArray(n)&&n.includes(t))return!0}}const o=localStorage.getItem("arenax_global_blocked_users");if(o){const i=JSON.parse(o);if(Array.isArray(i)&&i.includes(t))return!0}}catch{}return!1}function Yo(e,t){if(t)try{if(e){const r=`arenax_blocked_${e}`,s=localStorage.getItem(r);let d=s?JSON.parse(s):[];Array.isArray(d)||(d=[]),d.includes(t)||(d.push(t),localStorage.setItem(r,JSON.stringify(d)))}const o="arenax_global_blocked_users",i=localStorage.getItem(o);let n=i?JSON.parse(i):[];Array.isArray(n)||(n=[]),n.includes(t)||(n.push(t),localStorage.setItem(o,JSON.stringify(n)))}catch{}}function sa(e,t){if(t)try{if(e){const n=`arenax_blocked_${e}`,r=localStorage.getItem(n);if(r){let s=JSON.parse(r);Array.isArray(s)&&(s=s.filter(d=>d!==t),localStorage.setItem(n,JSON.stringify(s)))}}const o="arenax_global_blocked_users",i=localStorage.getItem(o);if(i){let n=JSON.parse(i);Array.isArray(n)&&(n=n.filter(r=>r!==t),localStorage.setItem(o,JSON.stringify(n)))}}catch{}}window.isLocallyBlockedByMe=ro;window.saveLocallyBlockedUser=Yo;window.removeLocallyBlockedUser=sa;window.openPlayerProfileCard=async function(e){var t,o,i,n,r,s,d,c,l;if(e){(t=$("vppUidContainer"))==null||t.classList.remove("hidden"),(o=$("vppScoreBadge"))==null||o.classList.remove("hidden"),(i=$("vppCountryRow"))==null||i.classList.remove("hidden"),(n=$("vppPopularitySection"))==null||n.classList.remove("hidden"),(r=$("vppTeamSection"))==null||r.classList.remove("hidden"),(s=$("vppMomentsSection"))==null||s.classList.remove("hidden"),(d=$("vppGuardSection"))==null||d.classList.remove("hidden"),(c=$("vppStatsOverviewSection"))==null||c.classList.remove("hidden"),(l=$("vppBottomActionBar"))==null||l.classList.remove("hidden"),window.vppCarouselTimer&&(clearInterval(window.vppCarouselTimer),window.vppCarouselTimer=null),$("vppName")&&($("vppName").textContent="Loading Profile..."),$("vppAv")&&($("vppAv").src="https://api.dicebear.com/7.x/bottts/svg?seed=loading"),$("vppBio")&&($("vppBio").textContent="Loading signature..."),$("vppCountryFlag")&&($("vppCountryFlag").textContent="🌍"),$("vppCountryName")&&($("vppCountryName").textContent="Unknown"),$("vppGameUID")&&($("vppGameUID").textContent=`ID: ${getNumericPlayerId(e)}`),$("vppGiftCount")&&($("vppGiftCount").textContent="0"),$("vppStarCount")&&($("vppStarCount").textContent="0"),$("mViewPlayerProfile")&&$("mViewPlayerProfile").classList.remove("hidden");try{const u=doc(db,"users",e),p=await getDoc(u);if(!p.exists()){$("vppName")&&($("vppName").textContent="Unknown Player");return}const f=p.data();S={uid:e,...f},window.currentViewedUser=S,window.currentViewingPlayerId=e,window.currentViewingPlayerName=f.name||f.userName||"ArenaX Player",window.currentViewingPlayerAvatar=f.av||f.avatar||`https://api.dicebear.com/7.x/bottts/svg?seed=${e}`;const b=document.getElementById("vppMoreMenuDropdown");b&&(b.classList.add("hidden"),b.style.display="none");const g=no(),w=!!(g&&g===e);let h=!1,M=!1;if(!w){if(ro(g,e)&&(h=!0),!h&&g)try{const D=await getDoc(doc(db,"users",g,"blocked",e));D&&D.exists()&&(h=!0,Yo(g,e))}catch(D){console.warn("I blocked them check notice:",D)}if(g)if(Array.isArray(f.blockedUserIds)&&f.blockedUserIds.includes(g))M=!0;else try{const D=await getDoc(doc(db,"users",e,"blocked",g));D&&D.exists()&&(M=!0)}catch{}}if(w)$("btnVppOptBlock")&&$("btnVppOptBlock").classList.add("hidden"),$("btnVppOptReport")&&$("btnVppOptReport").classList.add("hidden"),$("btnVppOptMute")&&$("btnVppOptMute").classList.add("hidden"),$("vppBottomActionBar")&&$("vppBottomActionBar").classList.add("hidden"),$("btnVppSendDM")&&$("btnVppSendDM").classList.add("hidden"),$("btnVppSendGiftBottom")&&$("btnVppSendGiftBottom").classList.add("hidden");else if($("btnVppOptBlock")&&$("btnVppOptBlock").classList.remove("hidden"),$("btnVppOptReport")&&$("btnVppOptReport").classList.remove("hidden"),$("btnVppOptMute")&&$("btnVppOptMute").classList.remove("hidden"),$("vppOptBlockText")&&($("vppOptBlockText").textContent=h?"Unblock User":"Block User"),$("vppOptBlockIcon")&&($("vppOptBlockIcon").innerHTML=h?'<i class="fas fa-user-check text-emerald-400"></i>':'<i class="fas fa-ban text-rose-400"></i>'),g)try{const D=await getDoc(doc(db,"users",g,"muted",e)),pe=D&&D.exists();$("vppOptMuteText")&&($("vppOptMuteText").textContent=pe?"Unmute Notifications":"Mute Notifications"),$("vppOptMuteIcon")&&($("vppOptMuteIcon").innerHTML=pe?'<i class="fas fa-bell text-emerald-400"></i>':'<i class="fas fa-bell-slash text-slate-300"></i>')}catch(D){console.warn("I muted them check notice:",D)}const L=document.getElementById("vppTopHeaderBar"),A=document.getElementById("vppTopHero3DCanvas"),P=document.getElementById("vppBlessingBadge");if(h){$("vppName")&&($("vppName").innerHTML='<span class="text-rose-500 font-black tracking-tight flex items-center gap-1.5"><i class="fas fa-ban text-rose-500 text-sm"></i> Blocked User</span>'),window.currentViewingPlayerName="Blocked User",$("vppAv")&&($("vppAv").src="https://api.dicebear.com/7.x/bottts/svg?seed=blocked_user"),$("vppCountryRow")&&$("vppCountryRow").classList.add("hidden"),$("vppUidContainer")&&$("vppUidContainer").classList.add("hidden"),$("vppScoreBadge")&&$("vppScoreBadge").classList.add("hidden"),L&&(L.className="relative h-20 bg-gradient-to-r from-[#1b1528] via-[#241a38] to-[#171024] px-5 pt-4 flex items-start justify-between shrink-0 z-0 transition-all duration-300"),A&&(A.classList.add("hidden"),A.innerHTML=""),P&&P.classList.add("hidden"),$("vpp3DCharacterSection")&&$("vpp3DCharacterSection").classList.add("hidden"),$("vppPopularitySection")&&$("vppPopularitySection").classList.add("hidden"),$("vppTeamSection")&&$("vppTeamSection").classList.add("hidden"),$("vppMomentsSection")&&$("vppMomentsSection").classList.add("hidden"),$("vppGuardSection")&&$("vppGuardSection").classList.add("hidden"),$("vppStatsOverviewSection")&&$("vppStatsOverviewSection").classList.add("hidden"),$("vppBio")&&($("vppBio").textContent="You have blocked this user. To view their full profile or allow messages and gifts, tap the 3 dots (⋮) above and choose 'Unblock User'."),$("vppBottomActionBar")&&$("vppBottomActionBar").classList.add("hidden"),$("btnVppSendDM")&&$("btnVppSendDM").classList.add("hidden"),$("btnVppSendGiftBottom")&&$("btnVppSendGiftBottom").classList.add("hidden"),$("btnVppSendPopularity")&&$("btnVppSendPopularity").classList.add("hidden");return}if(M){$("vppName")&&($("vppName").innerHTML=window.formatPlayerNameHtml(f,"text-xl sm:text-2xl font-black text-gray-900 tracking-tight")),$("vppAv")&&($("vppAv").src=f.av||f.avatar||`https://api.dicebear.com/7.x/bottts/svg?seed=${e}`),$("vppCountryRow")&&$("vppCountryRow").classList.remove("hidden"),$("vppUidContainer")&&$("vppUidContainer").classList.add("hidden"),$("vppScoreBadge")&&$("vppScoreBadge").classList.add("hidden"),L&&(L.className="relative h-20 bg-gradient-to-r from-[#1b1528] via-[#241a38] to-[#171024] px-5 pt-4 flex items-start justify-between shrink-0 z-0 transition-all duration-300"),A&&(A.classList.add("hidden"),A.innerHTML=""),P&&P.classList.add("hidden"),$("vpp3DCharacterSection")&&$("vpp3DCharacterSection").classList.add("hidden"),$("vppPopularitySection")&&$("vppPopularitySection").classList.add("hidden"),$("vppTeamSection")&&$("vppTeamSection").classList.add("hidden"),$("vppMomentsSection")&&$("vppMomentsSection").classList.add("hidden"),$("vppGuardSection")&&$("vppGuardSection").classList.add("hidden"),$("vppStatsOverviewSection")&&$("vppStatsOverviewSection").classList.add("hidden"),$("vppBio")&&($("vppBio").textContent="This profile is unavailable."),$("vppBottomActionBar")&&$("vppBottomActionBar").classList.add("hidden"),$("btnVppSendDM")&&$("btnVppSendDM").classList.add("hidden"),$("btnVppSendGiftBottom")&&$("btnVppSendGiftBottom").classList.add("hidden"),$("btnVppSendPopularity")&&$("btnVppSendPopularity").classList.add("hidden");return}$("vppName")&&($("vppName").innerHTML=window.formatPlayerNameHtml(f,"text-xl sm:text-2xl font-black text-gray-900 tracking-tight")),$("vppAv")&&($("vppAv").src=f.av||f.avatar||`https://api.dicebear.com/7.x/bottts/svg?seed=${e}`);const k={PK:{flag:"🇵🇰",name:"Pakistan"},IN:{flag:"🇮🇳",name:"India"},BD:{flag:"🇧🇩",name:"Bangladesh"},SA:{flag:"🇸🇦",name:"Saudi Arabia"},AE:{flag:"🇦🇪",name:"UAE"},US:{flag:"🇺🇸",name:"USA"},GB:{flag:"🇬🇧",name:"UK"},Other:{flag:"🌍",name:"Other"}};f.country&&k[f.country]?($("vppCountryFlag")&&($("vppCountryFlag").textContent=k[f.country].flag),$("vppCountryName")&&($("vppCountryName").textContent=k[f.country].name)):f.countryName?($("vppCountryFlag")&&($("vppCountryFlag").textContent=f.countryFlag||"🌍"),$("vppCountryName")&&($("vppCountryName").textContent=f.countryName)):($("vppCountryFlag")&&($("vppCountryFlag").textContent="🇵🇰"),$("vppCountryName")&&($("vppCountryName").textContent="Pakistan"));const E=getNumericPlayerId(f.uid||e,f.gameUID||f.handle);$("vppGameUID")&&($("vppGameUID").textContent=`ID: ${E}`),$("vppBio")&&($("vppBio").textContent=f.bio||f.signature||"This person says nothing!");const y=f.popularity!==void 0?f.popularity:f.giftCount!==void 0?f.giftCount:0,B=f.roseCount!==void 0?f.roseCount:0,V=f.rocketCount!==void 0?f.rocketCount:0,F=f.trophyCount!==void 0?f.trophyCount:0;$("vppPopularityVal")&&($("vppPopularityVal").textContent=Number(y).toLocaleString()),$("vppRoseCountVal")&&($("vppRoseCountVal").textContent=Number(B).toLocaleString()),$("vppRocketCountVal")&&($("vppRocketCountVal").textContent=Number(V).toLocaleString()),$("vppTrophyCountVal")&&($("vppTrophyCountVal").textContent=Number(F).toLocaleString()),$("vppGiftCount")&&($("vppGiftCount").textContent=Number(y).toLocaleString());const H=[];B>0&&H.push("rose"),V>0&&H.push("rocket"),F>0&&H.push("trophy"),typeof window.startVppCarousel=="function"&&window.startVppCarousel(H),window.renderVppTeamSection(e);const J=(typeof allMomentsList<"u"?allMomentsList:[]).filter(D=>D.userId===e);$("vppMomentsCount")&&($("vppMomentsCount").textContent=J.length);const z=$("vppMomentsContainer");if(z&&(J.length===0?z.innerHTML='<p class="text-xs text-gray-400 italic py-1">No moments yet</p>':z.innerHTML=`
          <div class="flex items-center gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar">
            ${J.map(D=>`
              <div onclick="openMomentsFeedModalFiltered('${e}', '${safeMomentTxt(f.name||f.userName||"Player")}')" class="relative w-16 h-16 rounded-xl overflow-hidden border border-amber-500/30 shrink-0 cursor-pointer group shadow-sm bg-black hover:scale-105 transition">
                ${D.mediaType==="video"?`
                  <div class="w-full h-full relative">
                    <video src="${D.mediaUrl}" class="w-full h-full object-cover"></video>
                    <div class="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <i class="fas fa-play text-white text-xs drop-shadow"></i>
                    </div>
                  </div>
                `:`
                  <img src="${D.mediaUrl}" alt="Moment" class="w-full h-full object-cover group-hover:scale-105 transition" />
                `}
              </div>
            `).join("")}
          </div>
        `),!!(f.playerShowUnlocked||f.character3dUnlocked||Array.isArray(f.unlocked3dModels)&&f.unlocked3dModels.length>0||f.active3dModel)){if(L&&(L.className="relative h-[330px] sm:h-[350px] bg-gradient-to-b from-[#120e24] via-[#1c1635] to-[#2a2046] overflow-hidden shrink-0 z-0 transition-all duration-300"),A&&(A.classList.remove("hidden"),typeof window.renderNonInteractive3DCharacter=="function")){let D=typeof getActive3DModelFileName=="function"?getActive3DModelFileName(f):"character_boy_1_fbx.glb";window.renderNonInteractive3DCharacter("vppTopHero3DCanvas",D)}P&&(P.classList.remove("hidden"),$("vppBlessingVal")&&($("vppBlessingVal").textContent=f.blessingLevel||f.score||72),$("vppBlessingAv")&&($("vppBlessingAv").src=f.av||f.avatar||`https://api.dicebear.com/7.x/bottts/svg?seed=${e}`))}else L&&(L.className="relative h-20 bg-gradient-to-r from-[#1b1528] via-[#241a38] to-[#171024] px-5 pt-4 flex items-start justify-between shrink-0 z-0 transition-all duration-300"),A&&(A.classList.add("hidden"),A.innerHTML=""),P&&P.classList.add("hidden");$("vpp3DCharacterSection")&&$("vpp3DCharacterSection").classList.add("hidden"),w||($("btnVppSendDM")&&$("btnVppSendDM").classList.remove("hidden"),$("btnVppSendGiftBottom")&&$("btnVppSendGiftBottom").classList.remove("hidden"))}catch(u){console.error("Error fetching target player details:",u),$("vppName")&&($("vppName").textContent="Player Profile")}}};$("bCloseViewPlayerProfile")&&$("bCloseViewPlayerProfile").addEventListener("click",()=>{$("mViewPlayerProfile")&&$("mViewPlayerProfile").classList.add("hidden")});$("btnCloseViewPlayerProfileX")&&$("btnCloseViewPlayerProfileX").addEventListener("click",()=>{$("mViewPlayerProfile")&&$("mViewPlayerProfile").classList.add("hidden")});$("btnVppCopyUID")&&$("btnVppCopyUID").addEventListener("click",()=>{if(!$("vppGameUID"))return;const e=$("vppGameUID").textContent.replace("ID: ","").trim();navigator.clipboard?(navigator.clipboard.writeText(e),typeof showToastNotification=="function"?showToastNotification("Copied! 📋",`User ID ${e} copied to clipboard.`):alert(`Copied User ID: ${e}`)):alert(`User ID: ${e}`)});$("btnVppSendPopularity")&&$("btnVppSendPopularity").addEventListener("click",()=>{window.openGiftBottomSheet()});$("btnVppSendGiftBottom")&&$("btnVppSendGiftBottom").addEventListener("click",()=>{window.openGiftBottomSheet()});$("btnVppSendDM")&&$("btnVppSendDM").addEventListener("click",()=>{S&&($("mViewPlayerProfile")&&$("mViewPlayerProfile").classList.add("hidden"),typeof vt=="function"&&vt(S))});let ci=0;window.toggleVppMoreMenu=function(e){console.log("3 dots clicked",e);const t=Date.now();if(t-ci<250){console.log("[ArenaX Debug] 3-dots toggle debounced (duplicate event suppressed)"),e&&(typeof e.stopPropagation=="function"&&e.stopPropagation(),typeof e.stopImmediatePropagation=="function"&&e.stopImmediatePropagation());return}ci=t,e&&(typeof e.stopPropagation=="function"&&e.stopPropagation(),typeof e.stopImmediatePropagation=="function"&&e.stopImmediatePropagation(),typeof e.preventDefault=="function"&&e.preventDefault());const o=document.getElementById("vppMoreMenuDropdown");if(console.log("[ArenaX Debug] 3-dots dropdown element:",o),o){const i=o.classList.contains("hidden")||o.style.display==="none";console.log("[ArenaX Debug] Dropdown was hidden:",i,"-> toggling to:",!i),i?(o.classList.remove("hidden"),o.style.display="block",o.style.visibility="visible"):(o.classList.add("hidden"),o.style.display="none",o.style.visibility="hidden")}else console.error("[ArenaX Debug] Dropdown element #vppMoreMenuDropdown was not found in DOM!")};const ui=document.getElementById("btnVppMoreOpts");ui&&(ui.onclick=function(e){window.toggleVppMoreMenu(e)});document.addEventListener("click",e=>{const t=document.getElementById("vppMoreMenuDropdown"),o=document.getElementById("btnVppMoreOpts");if(t&&!t.classList.contains("hidden")&&t.style.display!=="none"){if(t.contains(e.target)||o&&o.contains(e.target))return;console.log("[ArenaX Debug] Clicked outside 3-dots dropdown, closing"),t.classList.add("hidden"),t.style.display="none",t.style.visibility="hidden"}});$("btnVppOptCopyLink")&&$("btnVppOptCopyLink").addEventListener("click",()=>{var o;(o=$("vppMoreMenuDropdown"))==null||o.classList.add("hidden");const e=(S==null?void 0:S.uid)||window.currentViewingPlayerId;if(!e)return;const t=`https://arenax.cyou/profile?uid=${e}`;navigator.clipboard?navigator.clipboard.writeText(t).then(()=>{typeof showToastNotification=="function"?showToastNotification("Profile Link Copied! 📋",t):alert(`Profile link copied:
${t}`)}).catch(()=>{prompt("Copy profile link:",t)}):prompt("Copy profile link:",t)});let Ye=null;window.closeBlockUserConfirmationModal=function(){var o;(o=$("mBlockUserConfirmModal"))==null||o.classList.add("hidden");const e=$("lblBlockError");e&&(e.classList.add("hidden"),e.textContent="");const t=$("btnConfirmBlockUser");t&&(t.disabled=!1,t.innerHTML='<i class="fas fa-ban text-xs"></i> Block'),Ye=null};window.openBlockUserConfirmationModal=async function(e){var u,p;(u=$("vppMoreMenuDropdown"))==null||u.classList.add("hidden");const t=no();let o=typeof e=="string"?e:(e==null?void 0:e.uid)||(e==null?void 0:e.id)||(S==null?void 0:S.uid)||window.currentViewingPlayerId;if(!o)return;if(t&&o===t){typeof showToastNotification=="function"?showToastNotification("Action Not Allowed","You cannot block your own profile."):alert("You cannot block your own profile.");return}let i=ro(t,o);if(!i&&t)try{const f=doc(db,"users",t,"blocked",o),b=await getDoc(f);b&&b.exists()&&(i=!0)}catch(f){console.warn("Check block error:",f)}let n=typeof e=="object"&&((e==null?void 0:e.name)||(e==null?void 0:e.userName))||(S==null?void 0:S.name)||(S==null?void 0:S.userName)||window.currentViewingPlayerName,r=typeof e=="object"&&((e==null?void 0:e.av)||(e==null?void 0:e.avatar))||(S==null?void 0:S.av)||(S==null?void 0:S.avatar)||window.currentViewingPlayerAvatar,s=typeof e=="object"&&((e==null?void 0:e.handle)||(e==null?void 0:e.gameUID))||(S==null?void 0:S.handle)||(S==null?void 0:S.gameUID);if(i){const f=n||"this user";if(confirm(`Unblock ${f}? They will be able to message you and send gifts again.`)){if(sa(t,o),t){try{await deleteDoc(doc(db,"users",t,"blocked",o))}catch{}try{await updateDoc(doc(db,"users",t),{blockedUserIds:arrayRemove(o)})}catch{}}$("vppOptBlockText")&&($("vppOptBlockText").textContent="Block User"),$("vppOptBlockIcon")&&($("vppOptBlockIcon").innerHTML='<i class="fas fa-ban text-rose-400"></i>'),typeof showToastNotification=="function"?showToastNotification("User Unblocked",`${f} has been unblocked.`):alert(`${f} has been unblocked.`),window.openPlayerProfileCard(o)}return}if(!n||!r)try{const f=await getDoc(doc(db,"users",o));if(f&&f.exists()){const b=f.data();n=n||b.name||b.userName,r=r||b.av||b.avatar,s=s||b.handle||b.gameUID}}catch(f){console.warn("Could not fetch target user details for block modal:",f)}n=n||"ArenaX Player",r=r||`https://api.dicebear.com/7.x/bottts/svg?seed=${o}`;const d=da(o,s);Ye={uid:o,name:n,avatar:r,numericId:d},$("lblBlockConfirmTitle")&&($("lblBlockConfirmTitle").textContent=`Block ${n}?`),$("blockTargetAvatar")&&($("blockTargetAvatar").src=r),$("lblBlockTargetId")&&($("lblBlockTargetId").textContent=d?`ID: ${d}`:"",$("lblBlockTargetId").classList.toggle("hidden",!d));const c=$("lblBlockError");c&&(c.classList.add("hidden"),c.textContent="");const l=$("btnConfirmBlockUser");l&&(l.disabled=!1,l.innerHTML='<i class="fas fa-ban text-xs"></i> Block'),(p=$("mBlockUserConfirmModal"))==null||p.classList.remove("hidden")};$("btnVppOptBlock")&&$("btnVppOptBlock").addEventListener("click",()=>{window.openBlockUserConfirmationModal(S)});$("btnCancelBlockUser")&&$("btnCancelBlockUser").addEventListener("click",()=>{window.closeBlockUserConfirmationModal()});$("btnCloseBlockModalX")&&$("btnCloseBlockModalX").addEventListener("click",()=>{window.closeBlockUserConfirmationModal()});const wo=$("mBlockUserConfirmModal");wo&&wo.addEventListener("click",e=>{e.target===wo&&window.closeBlockUserConfirmationModal()});$("btnConfirmBlockUser")&&$("btnConfirmBlockUser").addEventListener("click",async()=>{if(!Ye||!Ye.uid)return;const e=no(),t=Ye.uid,o=Ye.name,i=$("btnConfirmBlockUser"),n=$("lblBlockError");if(n&&(n.classList.add("hidden"),n.textContent=""),!e){n&&(n.textContent="Please sign in to block players.",n.classList.remove("hidden"));return}if(e===t){n&&(n.textContent="You cannot block yourself.",n.classList.remove("hidden"));return}i.disabled=!0,i.innerHTML='<i class="fas fa-circle-notch animate-spin text-xs"></i> Blocking...';try{Yo(e,t);const r=doc(db,"users",e,"blocked",t);(await getDoc(r)).exists()||await setDoc(r,{blockedAt:serverTimestamp(),blockedUid:t,blockedName:o},{merge:!0});try{await updateDoc(doc(db,"users",e),{blockedUserIds:arrayUnion(t)})}catch(d){console.warn("Firestore blockedUserIds update error:",d)}window.closeBlockUserConfirmationModal(),$("vppOptBlockText")&&($("vppOptBlockText").textContent="Unblock User"),$("vppOptBlockIcon")&&($("vppOptBlockIcon").innerHTML='<i class="fas fa-user-check text-emerald-400"></i>'),typeof showToastNotification=="function"?showToastNotification("User Blocked",`${o} has been blocked.`):alert(`${o} has been blocked.`),window.openPlayerProfileCard(t)}catch(r){console.error("Block operation error:",r),n&&(n.textContent="Something went wrong. Please try again.",n.classList.remove("hidden")),i.disabled=!1,i.innerHTML='<i class="fas fa-ban text-xs"></i> Block'}});$("btnVppOptMute")&&$("btnVppOptMute").addEventListener("click",async()=>{var i;(i=$("vppMoreMenuDropdown"))==null||i.classList.add("hidden");const e=no(),t=(S==null?void 0:S.uid)||window.currentViewingPlayerId,o=(S==null?void 0:S.name)||(S==null?void 0:S.userName)||window.currentViewingPlayerName||"this user";if(!e||!t){alert("Please sign in to manage notifications.");return}try{const n=doc(db,"users",e,"muted",t);(await getDoc(n)).exists()?(await deleteDoc(n),$("vppOptMuteText")&&($("vppOptMuteText").textContent="Mute Notifications"),$("vppOptMuteIcon")&&($("vppOptMuteIcon").innerHTML='<i class="fas fa-bell-slash text-slate-300"></i>'),typeof showToastNotification=="function"?showToastNotification("Notifications Unmuted 🔔",`You will receive notifications from ${o}.`):alert(`Notifications unmuted for ${o}.`)):(await setDoc(n,{mutedAt:serverTimestamp(),mutedUid:t,mutedName:o}),$("vppOptMuteText")&&($("vppOptMuteText").textContent="Unmute Notifications"),$("vppOptMuteIcon")&&($("vppOptMuteIcon").innerHTML='<i class="fas fa-bell text-emerald-400"></i>'),typeof showToastNotification=="function"?showToastNotification("Notifications Muted 🔕",`Notifications from ${o} have been silenced.`):alert(`Notifications muted for ${o}.`))}catch(n){console.error("Mute error:",n),alert("Failed to update notification settings: "+n.message)}});const ln=[{id:"profile_photo_name",label:"Their photo, Their name",icon:"fa-user-circle",desc:"Inappropriate or offensive avatar, banner, or display name"},{id:"harassment",label:"Harassment or Bullying",icon:"fa-user-slash",desc:"Threats, intimidation, hate speech, or persistent harassment"},{id:"spam",label:"Spam or Scamming",icon:"fa-envelope-open-text",desc:"Unsolicited promotional links, phishing, or financial scams"},{id:"cheating",label:"Cheating or Game Exploits",icon:"fa-shield-virus",desc:"Hacking, modded scripts, lag abuse, or tournament match fixing"},{id:"impersonation",label:"Fake Account or Impersonation",icon:"fa-user-secret",desc:"Pretending to be someone else, a tournament host, or staff"},{id:"underage",label:"Underage User",icon:"fa-child",desc:"Account suspected of belonging to an unauthorized minor"},{id:"other",label:"Other Violation",icon:"fa-ellipsis-h",desc:"Any other violation of ArenaX Community Guidelines"}];let de="Their photo, Their name",oe=null;function da(e,t){if(typeof window.getNumericPlayerId=="function")return window.getNumericPlayerId(e,t);if(typeof getNumericPlayerId=="function")return getNumericPlayerId(e,t);if(!e)return"12345678";let o=0;for(let i=0;i<e.length;i++)o=(o<<5)-o+e.charCodeAt(i),o|=0;return String(1e5+Math.abs(o)%9e5)}function Ge(e){const t=$("reportStep1"),o=$("reportStep2"),i=$("reportStep3");t&&t.classList.toggle("hidden",e!==1),o&&o.classList.toggle("hidden",e!==2),i&&i.classList.toggle("hidden",e!==3),e===2?la():e===3&&cn()}function la(){const e=$("reportCategoryContainer");if(!e)return;e.innerHTML=ln.map(i=>{const n=de===i.label;return`
      <div 
        onclick="window.selectReportCategory('${i.label.replace(/'/g,"\\'")}')"
        class="p-3 sm:p-3.5 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-3 ${n?"bg-[#232736] border-indigo-500/80 shadow-md shadow-indigo-950/40 ring-1 ring-indigo-500/40":"bg-[#1f2129] hover:bg-[#252834] border-white/5"}"
      >
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-8 h-8 rounded-xl ${n?"bg-indigo-500 text-white":"bg-slate-800/90 text-slate-300 border border-white/5"} flex items-center justify-center text-xs flex-shrink-0 transition">
            <i class="fas ${i.icon}"></i>
          </div>
          <div class="min-w-0">
            <div class="text-xs sm:text-sm font-bold ${n?"text-white":"text-slate-200"} truncate">${i.label}</div>
            <div class="text-[10px] sm:text-[11px] text-slate-400 truncate mt-0.5">${i.desc}</div>
          </div>
        </div>

        <div class="w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 transition ${n?"border-indigo-500 bg-indigo-500 text-white":"border-slate-500/70 bg-transparent"}">
          ${n?'<i class="fas fa-check text-[10px] font-black pointer-events-none"></i>':""}
        </div>
      </div>
    `}).join("");const t=$("reportOtherCategoryWrap");t&&(de==="Other Violation"?t.classList.remove("hidden"):t.classList.add("hidden"));const o=$("btnReportNextStep2");o&&(o.disabled=!de,o.classList.toggle("opacity-50",!de))}window.selectReportCategory=function(e){de=e,la()};function cn(){var l,u,p;if(!oe)return;oe.uid;const e=oe.name,t=oe.avatar,o=oe.numericId;$("summaryTargetName")&&($("summaryTargetName").textContent=e),$("summaryTargetNumericId")&&($("summaryTargetNumericId").textContent=`ID: ${o}`),$("summaryTargetAv")&&($("summaryTargetAv").src=t);let i=de;if(de==="Other Violation"){const f=(l=$("reportOtherCategoryInp"))==null?void 0:l.value.trim();f&&(i=`Other: ${f}`)}$("summaryCategoryLabel")&&($("summaryCategoryLabel").textContent=i);const n=((u=$("reportDetailsInp"))==null?void 0:u.value.trim())||"",r=((p=$("reportEvidenceUrlInp"))==null?void 0:p.value.trim())||"",s=$("summaryDetailsPreview"),d=$("summaryDetailsText"),c=$("summaryEvidenceText");s&&(n||r?(s.classList.remove("hidden"),d&&(d.textContent=n?`"${n}"`:""),c&&(c.textContent=r?`Proof: ${r}`:"")):s.classList.add("hidden"))}function un(){var r,s;(r=$("vppMoreMenuDropdown"))==null||r.classList.add("hidden");const e=(S==null?void 0:S.uid)||window.currentViewingPlayerId;if(!e){alert("Please select a player to report.");return}const t=(S==null?void 0:S.name)||(S==null?void 0:S.userName)||window.currentViewingPlayerName||"ArenaX Player",o=(S==null?void 0:S.handle)||"",i=(S==null?void 0:S.av)||(S==null?void 0:S.avatar)||window.currentViewingPlayerAvatar||`https://api.dicebear.com/7.x/bottts/svg?seed=${e}`,n=da(e,(S==null?void 0:S.gameUID)||o);oe={uid:e,name:t,handle:o,avatar:i,numericId:n},$("reportTargetName")&&($("reportTargetName").textContent=t),$("reportTargetNumericId")&&($("reportTargetNumericId").textContent=`ID: ${n}`),$("reportTargetAv")&&($("reportTargetAv").src=i),$("reportDetailsInp")&&($("reportDetailsInp").value=""),$("reportEvidenceUrlInp")&&($("reportEvidenceUrlInp").value=""),$("reportOtherCategoryInp")&&($("reportOtherCategoryInp").value=""),$("reportOptionalDetailsWrap")&&$("reportOptionalDetailsWrap").classList.add("hidden"),$("iconToggleReportOptional")&&($("iconToggleReportOptional").className="fas fa-plus text-[10px] text-slate-500"),de="Their photo, Their name",Ge(1),(s=$("mReportUserModal"))==null||s.classList.remove("hidden")}$("btnVppOptReport")&&$("btnVppOptReport").addEventListener("click",un);function $t(){var e,t;(e=$("mReportUserModal"))==null||e.classList.add("hidden"),(t=$("mReportLearnMoreModal"))==null||t.classList.add("hidden")}$("btnCloseReportPage1")&&$("btnCloseReportPage1").addEventListener("click",$t);$("btnCloseReportPage2")&&$("btnCloseReportPage2").addEventListener("click",$t);$("btnCloseReportPage3")&&$("btnCloseReportPage3").addEventListener("click",$t);$("btnCloseReportUserModal")&&$("btnCloseReportUserModal").addEventListener("click",$t);$("btnBackReportPage2")&&$("btnBackReportPage2").addEventListener("click",()=>Ge(1));$("btnBackReportPage3")&&$("btnBackReportPage3").addEventListener("click",()=>Ge(2));$("btnReportNextStep1")&&$("btnReportNextStep1").addEventListener("click",()=>{Ge(2)});$("btnReportNextStep2")&&$("btnReportNextStep2").addEventListener("click",()=>{var e,t;if(!de){alert("Please select a violation category to continue.");return}if(de==="Other Violation"&&!((e=$("reportOtherCategoryInp"))==null?void 0:e.value.trim())){alert("Please specify the violation in the text box."),(t=$("reportOtherCategoryInp"))==null||t.focus();return}Ge(3)});$("btnReportLearnMore")&&$("btnReportLearnMore").addEventListener("click",()=>{var e;(e=$("mReportLearnMoreModal"))==null||e.classList.remove("hidden")});$("btnSummaryOpenGuidelines")&&$("btnSummaryOpenGuidelines").addEventListener("click",()=>{var e;(e=$("mReportLearnMoreModal"))==null||e.classList.remove("hidden")});$("btnCloseReportLearnMoreModal")&&$("btnCloseReportLearnMoreModal").addEventListener("click",()=>{var e;(e=$("mReportLearnMoreModal"))==null||e.classList.add("hidden")});$("btnDismissReportLearnMore")&&$("btnDismissReportLearnMore").addEventListener("click",()=>{var e;(e=$("mReportLearnMoreModal"))==null||e.classList.add("hidden")});$("btnToggleReportOptionalDetails")&&$("btnToggleReportOptionalDetails").addEventListener("click",()=>{const e=$("reportOptionalDetailsWrap"),t=$("iconToggleReportOptional");if(!e)return;const o=e.classList.contains("hidden");e.classList.toggle("hidden",!o),t&&(t.className=o?"fas fa-minus text-[10px] text-slate-500":"fas fa-plus text-[10px] text-slate-500")});$("btnSubmitProfileReport")&&$("btnSubmitProfileReport").addEventListener("click",async()=>{var s,d,c,l;const e=userProfile||window.userProfile||window.currentUser;if(!e||!e.uid){alert("Please sign in to submit a report.");return}if(!oe||!oe.uid){alert("Target user is not specified.");return}if(!de){alert("Please select a report violation."),Ge(2);return}let t=de;if(t==="Other Violation"){const u=(s=$("reportOtherCategoryInp"))==null?void 0:s.value.trim();if(!u){alert("Please specify the violation reason in the text box."),Ge(2),(d=$("reportOtherCategoryInp"))==null||d.focus();return}t=`Other: ${u}`}const o=((c=$("reportDetailsInp"))==null?void 0:c.value.trim())||"",i=((l=$("reportEvidenceUrlInp"))==null?void 0:l.value.trim())||"",n=$("btnSubmitProfileReport"),r=n.innerHTML;n.disabled=!0,n.innerHTML='<i class="fas fa-circle-notch animate-spin"></i> Submitting...';try{await addDoc(collection(db,"profile_reports"),{reportedUid:oe.uid,reportedName:oe.name,reportedHandle:oe.handle||"",reportedNumericId:oe.numericId,reportedAvatar:oe.avatar||"",reporterUid:e.uid,reporterName:e.name||e.userName||"ArenaX Player",reporterHandle:e.handle||"",reporterEmail:e.email||"",reporterAvatar:e.av||e.avatar||"",category:t,details:o,evidenceUrl:i,status:"pending",timestamp:serverTimestamp()}),$t(),typeof showToastNotification=="function"?showToastNotification("Report Submitted ✅","Thank you for helping keep ArenaX safe. Our moderation team will review this report."):alert("Report submitted successfully. Thank you for keeping ArenaX safe!")}catch(u){console.error("Report submit error:",u),alert("Failed to submit report: "+u.message)}finally{n.disabled=!1,n.innerHTML=r}});window.currentVppTeam=null;window.renderVppTeamSection=async function(e){const t=$("vppTeamCardContainer");if(t){t.innerHTML='<div class="p-3 bg-gray-50 border border-gray-100 rounded-2xl text-center text-xs text-gray-400">Loading team info...</div>';try{let o=(window.allGuilds||allGuilds||[]).find(s=>s.leaderId===e||s.members&&s.members.includes(e));if(!o)try{const s=query(collection(db,"teams"),where("leaderId","==",e)),d=await getDocs(s);if(!d.empty)o={id:d.docs[0].id,...d.docs[0].data()};else{const c=query(collection(db,"teams"),where("members","array-contains",e)),l=await getDocs(c);l.empty||(o={id:l.docs[0].id,...l.docs[0].data()})}}catch(s){console.warn("Direct team query failed:",s)}if(window.currentVppTeam=o,!o){t.innerHTML=`
        <div class="bg-gray-50 border border-gray-100 rounded-2xl p-3 flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-full bg-gray-200/80 flex items-center justify-center text-gray-400 text-sm">
              🛡️
            </div>
            <div>
              <span class="text-xs font-bold text-gray-600 block leading-tight">Not in a team</span>
              <span class="text-[10px] text-gray-400 font-medium">This player hasn't joined a squad</span>
            </div>
          </div>
        </div>
      `;return}let i="Member",n="bg-purple-600 text-white";o.leaderId===e?(i="Leader",n="bg-emerald-500 text-white"):o.guards&&o.guards.includes(e)&&(i="Guard",n="bg-sky-500 text-white");const r=o.logoUrl&&o.logoUrl.startsWith("data:")?`<img src="${o.logoUrl}" class="w-full h-full object-cover rounded-full" />`:o.logoUrl||"🦁";t.innerHTML=`
      <div onclick="window.openTeamDetailPage('${o.id}')" class="bg-gradient-to-r from-gray-900 via-slate-900 to-gray-950 rounded-2xl p-3 flex items-center justify-between border border-amber-400/30 shadow-md cursor-pointer hover:border-amber-400 transition active:scale-[0.99] group">
        <div class="flex items-center gap-3 min-w-0">
          <div class="relative shrink-0">
            <div class="w-12 h-12 rounded-full border-2 border-amber-400/80 bg-gray-950 p-0.5 overflow-hidden flex items-center justify-center text-2xl shadow-md">
              ${r}
            </div>
          </div>
          <div class="min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <h4 class="font-display font-black text-xs sm:text-sm text-white uppercase tracking-wide truncate">
                ${o.name}
              </h4>
              <span class="px-2 py-0.5 ${n} text-[9px] font-black uppercase rounded-md shadow-xs shrink-0">
                ${i}
              </span>
            </div>
            <div class="flex items-center gap-2 mt-1 text-[10px] font-bold">
              <span class="px-2 py-0.5 bg-sky-500/20 border border-sky-400/30 text-sky-300 rounded-md font-mono flex items-center gap-1">
                🛡️ Lv. ${o.level||1}
              </span>
              <span class="px-2 py-0.5 bg-amber-400/15 border border-amber-400/30 text-amber-300 rounded-md font-mono uppercase">
                [${o.tag||"SQUAD"}]
              </span>
            </div>
          </div>
        </div>
        <div class="flex items-center gap-1 text-amber-400 font-bold text-xs group-hover:translate-x-1 transition">
          <i class="fas fa-chevron-right text-xs"></i>
        </div>
      </div>
    `}catch(o){console.error("Error rendering VPP team section:",o),t.innerHTML='<div class="p-3 bg-gray-50 border border-gray-100 rounded-2xl text-center text-xs text-gray-400">Not in a team</div>'}}};window.onVppTeamClick=function(){window.currentVppTeam&&window.openTeamDetailPage(window.currentVppTeam.id)};window.openTeamDetailPage=async function(e){if(!e)return;const t=$("mTeamDetailPage"),o=$("teamDetailPageContent");if(!(!t||!o)){t.classList.remove("hidden"),o.innerHTML=`
    <div class="w-full h-full bg-[#0a0c12] flex flex-col items-center justify-center text-amber-400 space-y-3 p-6">
      <div class="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
      <span class="text-xs font-mono font-bold uppercase tracking-widest text-gray-400">Loading Team Details...</span>
    </div>
  `;try{let i=(window.allGuilds||allGuilds||[]).find(l=>l.id===e);if(!i){const l=await getDoc(doc(db,"teams",e));l.exists()&&(i={id:l.id,...l.data()})}if(!i){o.innerHTML=`
        <div class="w-full h-full bg-[#0a0c12] flex flex-col items-center justify-center text-white p-6 space-y-4">
          <p class="text-sm font-bold text-red-400">Team not found or removed.</p>
          <button onclick="window.closeTeamDetailPage()" class="px-5 py-2 bg-white/10 text-white rounded-full text-xs font-bold cursor-pointer">Go Back</button>
        </div>
      `;return}const n=i.members&&i.members.length>0?i.members:[i.leaderId],r=await window.fetchGuildMembers(n);let s=r.find(l=>l.uid===i.leaderId);if(!s&&i.leaderId)try{const l=await getDoc(doc(db,"users",i.leaderId));l.exists()&&(s=l.data(),r.unshift(s))}catch(l){console.warn("Could not fetch leader profile:",l)}const d=i.logoUrl&&i.logoUrl.startsWith("data:")?`<img src="${i.logoUrl}" class="w-full h-full object-cover rounded-full" />`:i.logoUrl||"🦁",c=userProfile&&(i.leaderId===userProfile.uid||i.members&&i.members.includes(userProfile.uid));o.innerHTML=`
      <!-- Top Banner & Header -->
      <div class="relative w-full h-52 bg-[#0a0c12] overflow-hidden shrink-0 border-b border-white/10">
        <!-- Background Blur Image -->
        <div class="absolute inset-0 z-0">
          ${i.logoUrl&&i.logoUrl.startsWith("data:")?`<img src="${i.logoUrl}" class="w-full h-full object-cover filter blur-2xl opacity-40 scale-125" />`:'<div class="w-full h-full bg-gradient-to-b from-amber-950/60 via-gray-900 to-[#0a0c12]"></div>'}
          <div class="absolute inset-0 bg-gradient-to-b from-black/60 via-black/20 to-[#0a0c12]"></div>
        </div>

        <!-- Header Actions: Back Button & Weekly Rank -->
        <div class="relative z-20 p-4 flex items-center justify-between">
          <button onclick="window.closeTeamDetailPage()" class="w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 border border-white/20 text-white flex items-center justify-center transition active:scale-95 cursor-pointer shadow-lg" title="Back">
            <i class="fas fa-chevron-left text-sm"></i>
          </button>

          <div class="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white font-black text-xs rounded-full shadow-lg border border-amber-300/30 flex items-center gap-1.5">
            <span>Weekly Rank:</span>
            <span class="text-white font-mono font-extrabold text-xs">#${i.weeklyRank||i.rank||2}</span>
          </div>
        </div>

        <!-- Overlapping Team Info Row -->
        <div class="absolute bottom-3 left-4 right-4 z-20 flex items-end gap-3.5">
          <div class="relative shrink-0">
            <div class="w-20 h-20 rounded-full border-2 border-amber-400 bg-[#121422] p-0.5 overflow-hidden flex items-center justify-center text-4xl shadow-2xl">
              ${d}
            </div>
          </div>

          <div class="flex-1 min-w-0 pb-0.5">
            <h2 class="font-display font-black text-base sm:text-lg text-white uppercase tracking-wider truncate flex items-center gap-2">
              ${i.name}
            </h2>
            <div class="flex items-center gap-2 mt-1 flex-wrap text-xs">
              <span class="px-2 py-0.5 bg-sky-500/20 border border-sky-400/40 text-sky-300 font-extrabold rounded-md text-[10px] font-mono flex items-center gap-1">
                🛡️ Lv. ${i.level||1}
              </span>
              <span class="px-2.5 py-0.5 bg-amber-400/20 border border-amber-400/40 text-amber-300 font-black rounded-md text-[10px] font-mono uppercase tracking-wider">
                ${i.tag||"SQUAD"}
              </span>
            </div>
            <div class="flex items-center gap-3 mt-1.5 text-[11px] text-gray-400 font-mono">
              <span>ID: <strong class="text-gray-200 select-all font-bold">${(i.id||"N157").substring(0,8).toUpperCase()}</strong></span>
              <span class="text-amber-400 font-bold flex items-center gap-1">
                🔥 Activeness: ${(i.xp||i.activeness||4601346).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Scrollable Detail Body -->
      <div class="flex-1 overflow-y-auto p-4 space-y-5 pb-24">
        
        <!-- MAJOR MEMBERS SECTION -->
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="w-1.5 h-4 bg-amber-400 rounded-full"></span>
              <h3 class="text-xs font-black text-white uppercase tracking-wider">Major Members</h3>
            </div>
            <span class="text-xs text-gray-400 font-mono font-bold flex items-center gap-1">
              ${n.length}/${i.maxMembers||120} <i class="fas fa-chevron-right text-[10px] text-gray-500"></i>
            </span>
          </div>

          <!-- Horizontal Avatars Row -->
          <div class="flex items-center gap-3.5 overflow-x-auto pb-2 pt-1 no-scrollbar">
            ${n.map(l=>{const u=r.find(L=>L.uid===l)||{uid:l,name:"Member"},p=l===i.leaderId,f=i.guards&&i.guards.includes(l);let b="Member",g="bg-sky-500",w="border-sky-500/60";p?(b="Leader",g="bg-gradient-to-r from-pink-500 to-rose-600",w="border-pink-500"):f&&(b="Deputy",g="bg-gradient-to-r from-cyan-500 to-blue-600",w="border-cyan-400");const h=u.name||u.userName||"Player",M=u.av||u.avatar||`https://api.dicebear.com/7.x/bottts/svg?seed=${l}`;return`
                <div onclick="window.openPlayerProfileCard('${l}')" class="flex flex-col items-center shrink-0 w-16 cursor-pointer active:scale-95 transition">
                  <div class="relative mb-1">
                    <div class="w-14 h-14 rounded-full border-2 ${w} bg-gray-900 p-0.5 overflow-hidden shadow-lg">
                      <img src="${M}" class="w-full h-full object-cover rounded-full" />
                    </div>
                    <span class="absolute -bottom-1 left-1/2 -translate-x-1/2 ${g} text-white text-[8px] font-black px-1.5 py-0.2 rounded-full uppercase tracking-tighter whitespace-nowrap shadow-md border border-white/20">
                      ${b}
                    </span>
                  </div>
                  <span class="text-[10px] font-bold text-gray-200 truncate w-full text-center mt-1">
                    ${h}
                  </span>
                </div>
              `}).join("")}
          </div>
        </div>

        <!-- INTRODUCTION SECTION -->
        <div class="space-y-2">
          <div class="flex items-center gap-2">
            <span class="w-1.5 h-4 bg-amber-400 rounded-full"></span>
            <h3 class="text-xs font-black text-white uppercase tracking-wider">Introduction</h3>
          </div>
          <div class="bg-[#121522] border border-white/10 rounded-2xl p-4 text-xs text-gray-300 font-medium leading-relaxed shadow-sm">
            <p>${i.description||"Welcome to our family! This isn't just a group—it's a legacy. Built on loyalty, respect, and unity. Here, we stand together, grow together, and win together. Stay real, stay active, and represent the family with pride. 💜"}</p>
          </div>
        </div>

        <!-- REQUIREMENTS SECTION -->
        <div class="space-y-2">
          <div class="flex items-center gap-2">
            <span class="w-1.5 h-4 bg-amber-400 rounded-full"></span>
            <h3 class="text-xs font-black text-white uppercase tracking-wider">Requirements</h3>
          </div>
          <div class="bg-[#121522] border border-white/10 rounded-2xl p-3.5 flex items-center justify-between text-xs">
            <span class="text-gray-400 font-semibold">Join Permission</span>
            ${i.joinType==="application"?'<span class="px-3 py-1 bg-amber-400/15 border border-amber-400/40 text-amber-300 font-bold rounded-full text-[11px] flex items-center gap-1.5">📝 Application Required</span>':'<span class="px-3 py-1 bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 font-bold rounded-full text-[11px] flex items-center gap-1.5">⚡ Free to Join</span>'}
          </div>
        </div>

      </div>

      <!-- FIXED BOTTOM ACTION BUTTON -->
      <div class="fixed bottom-0 left-0 right-0 p-4 bg-[#0a0c12]/95 backdrop-blur-md border-t border-white/10 z-30 flex items-center">
        ${c?`<button onclick="window.enterUserTeam('${i.id}')" class="w-full h-12 rounded-full bg-gradient-to-r from-cyan-400 via-sky-500 to-blue-600 text-white font-black text-sm uppercase tracking-wider shadow-lg shadow-cyan-500/25 active:scale-95 transition cursor-pointer flex items-center justify-center gap-2">
               <span>Enter my family</span> <i class="fas fa-arrow-right text-xs"></i>
             </button>`:i.joinType==="application"?`<button onclick="window.applyToTeamFromDetail('${i.id}')" class="w-full h-12 rounded-full bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 text-black font-black text-sm uppercase tracking-wider shadow-lg shadow-amber-400/25 active:scale-95 transition cursor-pointer flex items-center justify-center gap-2">
                   <span>Apply to Join</span>
                 </button>`:`<button onclick="window.joinTeamFromDetail('${i.id}')" class="w-full h-12 rounded-full bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 text-black font-black text-sm uppercase tracking-wider shadow-lg shadow-amber-400/25 active:scale-95 transition cursor-pointer flex items-center justify-center gap-2">
                   <span>Join Team</span>
                 </button>`}
      </div>
    `}catch(i){console.error("Error opening team detail page:",i),o.innerHTML=`
      <div class="w-full h-full bg-[#0a0c12] flex flex-col items-center justify-center text-white p-6 space-y-4">
        <p class="text-sm font-bold text-red-400">Failed to load team details.</p>
        <button onclick="window.closeTeamDetailPage()" class="px-5 py-2 bg-white/10 text-white rounded-full text-xs font-bold cursor-pointer">Close</button>
      </div>
    `}}};window.closeTeamDetailPage=function(){const e=$("mTeamDetailPage");e&&e.classList.add("hidden")};window.enterUserTeam=function(e){window.closeTeamDetailPage(),$("mViewPlayerProfile")&&$("mViewPlayerProfile").classList.add("hidden");const t=$("mGuildSystemModal");t&&(t.classList.remove("hidden"),typeof window.renderGuildSystemModalContent=="function"&&window.renderGuildSystemModalContent())};window.joinTeamFromDetail=async function(e){await window.joinTeamDirect(e),window.openTeamDetailPage(e)};window.applyToTeamFromDetail=function(e){window.applyToTeam(e)};$("btnShareVoiceGlobal")&&$("btnShareVoiceGlobal").addEventListener("click",async()=>{if(!currentVoiceRoomId||!userProfile){showToastNotification("Lobby Required ⚠️","Join or create a live voice channel first!");return}try{const e=$("activeRoomName").textContent,t=$("activeRoomGame").textContent;await addDoc(collection(db,"global_chat"),{userId:userProfile.uid,userName:userProfile.name,userAvatar:userProfile.av||"https://api.dicebear.com/7.x/bottts/svg?seed=ax1",text:`[Voice Invite to "${e}"]`,originalText:`[Voice Invite to "${e}"]`,isVoiceRoomInvite:!0,voiceRoomId:currentVoiceRoomId,voiceRoomName:e,voiceRoomGame:t,avatarFrame:userProfile.avatarFrame||localStorage.getItem("selectedAvatarFrame")||"none",createdAt:serverTimestamp()}),$("mInviteFriendToVoice").classList.add("hidden"),showToastNotification("Broadcasted 📣","Live Squad invitation posted to Global Chat successfully!")}catch(e){console.error("Error broadcasting voice room to global:",e),showToastNotification("Error","Could not broadcast invite.")}});$("btnShareVoiceDMs")&&$("btnShareVoiceDMs").addEventListener("click",()=>{showToastNotification("Select Friend ✉️","Click 'Invite' next to any online friend below to send a DM invite instantly!");const e=$("voiceInviteFriendsList");e&&e.scrollIntoView({behavior:"smooth"})});$("dmSendBtn").addEventListener("click",()=>Jo());$("dmInp").addEventListener("keydown",e=>{e.key==="Enter"&&Jo()});async function Jo(){if(zo())return;const e=$("dmInp").value.trim();if(!e||!re)return;if(re==="arenax_moderators"){typeof showToastNotification=="function"?showToastNotification("Replies Disabled 🔒","This is an official administrative channel from ArenaX Moderators. Direct replies are disabled."):alert("This is an official administrative channel from ArenaX Moderators. Direct replies are disabled."),$("dmInp").value="";return}if(ro(userProfile.uid,re)){typeof showToastNotification=="function"?showToastNotification("User Blocked 🚫","You have blocked this player. Unblock them first to send a message."):alert("You have blocked this player. Unblock them first to send a message.");return}try{const[o,i]=await Promise.all([getDoc(doc(db,"users",re,"blocked",userProfile.uid)),getDoc(doc(db,"users",userProfile.uid,"blocked",re))]);if(o.exists()){typeof showToastNotification=="function"?showToastNotification("Message Blocked 🚫","You cannot send messages to this user because they have blocked you."):alert("You cannot send messages to this user because they have blocked you.");return}if(i.exists()){typeof showToastNotification=="function"?showToastNotification("User Blocked 🚫","You have blocked this player. Unblock them first to send a message."):alert("You have blocked this player. Unblock them first to send a message.");return}}catch(o){console.warn("Block check in DM error:",o)}$("dmInp").value="";const t=[userProfile.uid,re].sort().join("_");try{await addDoc(collection(db,"dms",t,"messages"),{text:e,sender:userProfile.uid,senderName:userProfile.name,createdAt:serverTimestamp()}),typeof window.sendPersonalNotification=="function"&&window.sendPersonalNotification(re,{title:userProfile.name||"ArenaX Player",body:e.length>100?e.slice(0,97)+"...":e,icon:userProfile.av||"arenax_logo.jpg",url:"https://arenax.cyou/#chat",data:{type:"dm",chatId:t,senderUid:userProfile.uid}}).catch(console.warn)}catch(o){console.error("Error sending DM: ",o)}}let bt=!1,ca="none",Ro=5;function pn(){const e=userProfile||guestProfile;if(!e||guestProfile)return;const t=e.uid||e.id,o=t+"_ticket";It&&(It(),It=null),Nt&&(Nt(),Nt=null),Nt=onSnapshot(doc(db,"support_requests",t),n=>{const r=$("chatBox"),s=$("ratingBox"),d=$("statusIndicatorText"),c=$("statusIndicatorDot"),l=$("bConnectAdmin"),u=$("bEndChat");if(!n.exists())d.textContent="AI Chatbot Active",c.className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse",l.classList.remove("hidden"),u.classList.add("hidden"),r.classList.remove("hidden"),s.classList.add("hidden");else{const p=n.data(),f=p.status,b=p.adminName||"Admin";ca=p.adminId||"none",f==="waiting"?(d.textContent="⏳ Waiting for Admin...",c.className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse",l.classList.add("hidden"),u.classList.remove("hidden"),r.classList.remove("hidden"),s.classList.add("hidden")):f==="connected"?(d.textContent=`🟢 Connected with Admin (${b})`,c.className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse",l.classList.add("hidden"),u.classList.remove("hidden"),r.classList.remove("hidden"),s.classList.add("hidden")):f==="ended"&&(r.classList.add("hidden"),s.classList.remove("hidden"))}},n=>{console.warn("Error listening to support request status:",n)}),getDoc(doc(db,"support_tickets",o)).then(n=>{n.exists()?bt=n.data().status==="escalated":bt=!1}).catch(n=>console.warn("Failed to fetch ticket status:",n));const i=query(collection(db,"support",o,"messages"),orderBy("createdAt","asc"));It=onSnapshot(i,n=>{Mo=[];const r=$("chatMsgs");r.innerHTML="",n.forEach(s=>{const d=s.data();Mo.push(d);const c=d.sender==="user",l=d.sender==="bot",u=d.sender==="admin";let p="bg-card border-bdr text-t1 rounded-tl-none",f="",b=d.senderName||"Player",g='<i class="fas fa-headset"></i>';c?(p="bg-gold border-gold text-bg font-semibold rounded-tr-none",f="flex-row-reverse",b="You",g='<i class="fas fa-user"></i>'):l?(p="bg-ele border-bdr text-t1 rounded-tl-none",b="Support Bot",g='<i class="fas fa-robot"></i>'):u&&(p="bg-red/15 border-red/25 text-red rounded-tl-none font-medium",b="Moderator Admin",g='<i class="fas fa-shield-alt text-red"></i>');const w=document.createElement("div");w.className=`flex ${f} gap-2.5 max-w-[85%] ${c?"ml-auto":""}`,w.innerHTML=`
        <div class="w-7 h-7 bg-card border border-bdr rounded-full flex items-center justify-center text-[10px] flex-shrink-0">
          ${g}
        </div>
        <div class="min-w-0 flex-1">
          <span class="text-[9px] text-t3 uppercase font-bold tracking-wider block mb-0.5 ${c?"text-right":""}">${b}</span>
          <div class="p-3 border rounded-xl text-xs leading-relaxed break-words ${p}">
            ${d.text}
          </div>
        </div>
      `,r.appendChild(w)}),n.empty&&(r.innerHTML=`
        <div class="flex gap-2">
          <div class="w-7 h-7 rounded-full bg-gold/10 text-gold border border-gold/20 flex items-center justify-center text-xs flex-shrink-0">
            <i class="fas fa-robot"></i>
          </div>
          <div class="max-w-[75%] bg-ele border border-bdr text-t1 rounded-xl p-3 rounded-tl-none space-y-2 leading-relaxed">
            <p>👋 Welcome to ArenaX support chat! How can we assist you today?</p>
            <div class="flex flex-wrap gap-1.5 pt-1.5">
              <button class="qrb px-2.5 py-1 bg-gold/5 border border-gold/20 hover:bg-gold/10 text-gold text-[10px] rounded-full transition" data-m="How to deposit?">How to deposit?</button>
              <button class="qrb px-2.5 py-1 bg-gold/5 border border-gold/20 hover:bg-gold/10 text-gold text-[10px] rounded-full transition" data-m="How to register for tournament?">Tournament Registration</button>
              <button class="qrb px-2.5 py-1 bg-gold/5 border border-gold/20 hover:bg-gold/10 text-gold text-[10px] rounded-full transition" data-m="How to withdraw?">How to withdraw?</button>
              <button class="qrb px-2.5 py-1 bg-gold/5 border border-gold/20 hover:bg-gold/10 text-gold text-[10px] rounded-full transition" data-m="Account banned?">Account Banned?</button>
            </div>
          </div>
        </div>`),r.scrollTop=r.scrollHeight})}document.addEventListener("click",e=>{const t=e.target.closest(".qrb");t&&so(t.dataset.m)});$("chatSend").addEventListener("click",()=>so());$("chatIn").addEventListener("keydown",e=>{e.key==="Enter"&&so()});$("bConnectAdmin").addEventListener("click",async()=>{const e=userProfile||guestProfile;if(!e||guestProfile)return;const t=e.uid||e.id,o=t+"_ticket";try{await setDoc(doc(db,"support_requests",t),{userId:t,userName:userProfile.name||"Player",status:"waiting",createdAt:serverTimestamp()});const i=collection(db,"support",o,"messages");await addDoc(i,{text:"⏳ Connecting you to a live agent... Please wait while an administrator joins the chat.",sender:"bot",senderName:"Support Bot",createdAt:serverTimestamp()}),await setDoc(doc(db,"support_tickets",o),{id:o,ticketId:o,uid:t,userName:userProfile.name||"Player",userHandle:userProfile.handle||"player",lastMsg:"[Bot]: Connecting live agent...",status:"open",updatedAt:serverTimestamp()},{merge:!0})}catch(i){console.error("Error connecting to admin:",i)}});$("bEndChat").addEventListener("click",async()=>{const e=userProfile||guestProfile;if(!e||guestProfile)return;const t=e.uid||e.id;if(confirm("Are you sure you want to end this live support session?"))try{await updateDoc(doc(db,"support_requests",t),{status:"ended",endedAt:serverTimestamp()})}catch(o){console.error("Error ending chat:",o)}});document.querySelectorAll(".star-btn").forEach(e=>{e.addEventListener("click",t=>{const o=parseInt(e.dataset.val);Ro=o,document.querySelectorAll(".star-btn").forEach(i=>{parseInt(i.dataset.val)<=o?(i.classList.add("text-gold"),i.classList.remove("text-t3")):(i.classList.remove("text-gold"),i.classList.add("text-t3"))})})});$("bSubmitRating").addEventListener("click",async()=>{const e=userProfile||guestProfile;if(!e||guestProfile)return;const t=e.uid||e.id;try{await addDoc(collection(db,"support_ratings"),{userId:t,adminId:ca||"none",rating:Ro,feedback:$("feedbackText").value.trim(),createdAt:serverTimestamp()}),await deleteDoc(doc(db,"support_requests",t)),$("feedbackText").value="",Ro=5,document.querySelectorAll(".star-btn").forEach(o=>{o.classList.add("text-gold"),o.classList.remove("text-t3")}),alert("Thank you for your feedback! Your rating was submitted successfully. ✅")}catch(o){console.error("Error submitting rating:",o)}});const fn=[{keys:["deposit","recharge","pay","paisa"],ans:'💰 To deposit funds, go to the Wallet tab, click "Recharge", send PKR to JazzCash (0302-4686897) or NayaPay (0303-9229405), and submit your TXN ID. Admin will credit your AX Coins within 15-30 minutes!'},{keys:["register","join","tournament","slot"],ans:'🏆 To register for a tournament, browse available tournaments on the Dashboard, select one, click "Register / Join Slot", and fill in your game profile details. Waiting for admin approval takes around 10-15 mins.'},{keys:["withdraw","cashout","earnings"],ans:"💸 To withdraw your AX Coins, head to Wallet -> Withdraw, input your desired cashout amount and JazzCash or NayaPay account details. Approved withdrawals are processed within 24-48 hours."},{keys:["ban","suspend","block","cheat"],ans:'🚫 If your account is banned or you have reports of illegal scripts, our Anti-Cheat system issues permanent locks. You can file a "Red Report" under the Help Desk or contact our support staff for manual verification.'}];async function so(e){const t=(e||$("chatIn").value).trim();if(!t)return;e||($("chatIn").value="");const o=userProfile||guestProfile;if(!o)return;const i=o.uid||o.id,n=i+"_ticket",r=collection(db,"support",n,"messages");try{if(await addDoc(r,{text:t,sender:"user",senderName:o.name||"Player",createdAt:serverTimestamp()}),await setDoc(doc(db,"support_tickets",n),{id:n,ticketId:n,uid:i,userName:o.name||"Player",userHandle:o.handle||"player",lastMsg:t,status:bt?"escalated":"open",updatedAt:serverTimestamp()},{merge:!0}),bt)return;const s=t.toLowerCase();if(["agent","human","mod","admin","connect"].some(d=>s.includes(d))){setTimeout(async()=>{await addDoc(r,{text:'Connecting you to a live agent... Click the "🔴 Connect with Admin" button above or let me queue you automatically!',sender:"bot",senderName:"Support Bot",createdAt:serverTimestamp()}),$("bConnectAdmin").click()},500);return}try{const d=(Mo||[]).filter(b=>b.sender==="user"||b.sender==="bot").map(b=>({role:b.sender==="user"?"user":"model",text:b.text})),c=o?{name:o.name,handle:o.handle,balance:o.balance||0,premium:o.premium||!1}:null,l=(toursData||[]).map(b=>({name:b.name,game:b.game,entryFee:b.entryFee,prize:b.prize,status:b.status,registered:b.registered,maxPlayers:b.maxPlayers})),u=await fetch("/api/support-chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:t,history:d,userProfile:c,tournaments:l})});if(!u.ok)throw new Error("API server returned error");let f=(await u.json()).text;f.includes("[ESCALATE]")?(bt=!0,f=f.replace("[ESCALATE]","").trim(),setTimeout(async()=>{await addDoc(r,{text:f,sender:"bot",senderName:"Support Bot",createdAt:serverTimestamp()}),await addDoc(r,{text:"🔄 [Ticket Escalated]: Connecting to live human agent moderator... Your query has been marked as high-priority. Please wait!",sender:"bot",senderName:"Support Bot",createdAt:serverTimestamp()}),await updateDoc(doc(db,"support_tickets",n),{status:"escalated",lastMsg:"[Bot]: Ticket escalated to live admin.",updatedAt:serverTimestamp()})},700)):setTimeout(async()=>{await addDoc(r,{text:f,sender:"bot",senderName:"Support Bot",createdAt:serverTimestamp()}),await updateDoc(doc(db,"support_tickets",n),{lastMsg:`[Bot]: ${f}`,updatedAt:serverTimestamp()})},700)}catch(d){console.warn("Gemini support API failed, falling back to keywords:",d);const c=fn.find(u=>u.keys.some(p=>s.includes(p))),l=c?c.ans:'I am support bot assistant. Type "agent" to connect with a live administrator moderator directly.';setTimeout(async()=>{await addDoc(r,{text:l,sender:"bot",senderName:"Support Bot",createdAt:serverTimestamp()}),await updateDoc(doc(db,"support_tickets",n),{lastMsg:`[Bot]: ${l}`,updatedAt:serverTimestamp()})},700)}}catch(s){console.error("Error writing support log: ",s)}}window.loadFriendSystem=an;window.acceptFriendRequest=oa;window.declineFriendRequest=ia;window.openTasksModal=nn;window.closeTasksModal=rn;window.updateTasksFrameButtonState=Ot;window.openRankingModal=sn;window.renderVanillaRankingList=aa;window.initGlobalChat=dn;window.renderGlobalMessages=na;window.updateChatUnreadDot=Wo;window.updateSubGlobalDot=Xo;window.setGlobalTypingState=Wt;window.handleGlobalInputKeyPress=ra;window.checkIfMuted=zo;window.openFriendDM=vt;window.sendDirectMessage=Jo;window.loadLiveSupportChat=pn;window.sendSupportMessage=so;let q=null,ge="list",Xt=null,Ke=null,se=[],v=null,_="myGuild",lo=!1,Ne=null,pi=null,ue=null,ho=!1;window.showTeamGuide=function(){const e=$("mTeamGuideModal");e&&e.classList.remove("hidden")};window.openTeamsModal=function(){if(guestProfile){alert("Please log in or register a profile to access Teams!");return}const e=$("mGuildSystemModal");e&&e.classList.remove("hidden"),v?(q=v,ge="profile"):ge="list",typeof Ve=="function"&&Ve(),window.renderGuildSystemModalContent()};window.openGuildsModal=window.openTeamsModal;window.handleTeamLogoUpload=function(e){const t=e.target.files&&e.target.files[0];if(!t)return;const o=new FileReader;o.onload=function(i){Xt=i.target.result;const n=$("ctLogoPreviewImg"),r=$("ctLogoPreviewIco");n&&r&&(n.src=Xt,n.classList.remove("hidden"),r.classList.add("hidden"))},o.readAsDataURL(t)};function Ve(){Ke&&Ke();const e=query(collection(db,"teams"),orderBy("createdAt","desc"));Ke=onSnapshot(e,t=>{if(se=[],v=null,t.forEach(o=>{const i={id:o.id,...o.data()};if(se.push(i),userProfile){const n=i.leaderId===userProfile.uid,r=i.members&&i.members.includes(userProfile.uid);(n||r)&&(v=i)}}),!q&&se.length>0)q=v||se[0];else if(q){const o=se.find(i=>i.id===q.id);o&&(q=o)}window.allGuilds=se,window.userGuild=v,window.selectedTeamData=q,window.selectedGuild=ue,window.renderGuildSystemModalContent()},t=>{console.error("Error listening to teams:",t)})}window.openDonateModal=function(){if(!userProfile)return;const e=$("dtUserBalance");e&&(e.textContent=userProfile.balance||0),$("mDonateTreasuryModal").classList.remove("hidden")};window.confirmTreasuryDonation=async function(){if(!userProfile)return;const e=$("dtAmountInput"),t=parseInt(e?e.value:0,10);if(isNaN(t)||t<=0){alert("Please enter a valid donation amount (minimum 10 AX).");return}const o=userProfile.balance||0;if(o<t){alert(`Insufficient AX Coins balance! You have ${o} AX, but tried to donate ${t} AX.`);return}const i=q||v;if(!i){alert("No active team selected.");return}try{await updateDoc(doc(db,"users",userProfile.uid),{balance:increment(-t)}),userProfile.balance=Math.max(0,o-t);const n=Math.floor(t/10);await updateDoc(doc(db,"teams",i.id),{treasury:increment(t),exp:increment(n)}),await addDoc(collection(db,"deposit_requests"),{userId:userProfile.uid,userName:userProfile.name,amountAX:t,method:"Team Treasury Donation",status:"approved",type:"payment",message:`Donated ${t} AX Coins to Team Treasury (${i.name})`,createdAt:serverTimestamp()}),alert(`🎉 Thank you! Successfully donated ${t} AX Coins to ${i.name}'s Treasury!
+${n} Team EXP gained!`),$("mDonateTreasuryModal").classList.add("hidden"),e&&(e.value=""),window.renderGuildSystemModalContent()}catch(n){alert("Failed to process donation: "+n.message)}};window.openEditAnnouncementModal=function(){const e=q||v;if(!e)return;const t=$("eaAnnouncementInput");t&&(t.value=e.announcement||e.description||""),$("mEditAnnouncementModal").classList.remove("hidden")};window.saveTeamAnnouncement=async function(){const e=q||v;if(!e)return;const t=$("eaAnnouncementInput"),o=t?t.value.trim():"";if(o)try{await updateDoc(doc(db,"teams",e.id),{announcement:o,description:o}),e.announcement=o,e.description=o,alert("✅ Team Announcement updated successfully!"),$("mEditAnnouncementModal").classList.add("hidden"),window.renderGuildSystemModalContent()}catch(i){alert("Failed to update announcement: "+i.message)}};window.promoteToGuard=async function(e,t){const o=q||v;if(!o)return;if(o.leaderId!==userProfile.uid){alert("Only the Leader can promote members to Guard!");return}if((o.guards||[]).length>=2){alert("Maximum 2 Guards allowed per team! Demote an existing Guard first.");return}try{await updateDoc(doc(db,"teams",o.id),{guards:arrayUnion(e)}),alert(`🛡️ Successfully promoted ${t} to Guard!`),window.renderGuildSystemModalContent()}catch(n){alert("Failed to promote Guard: "+n.message)}};window.demoteGuard=async function(e,t){const o=q||v;if(o){if(o.leaderId!==userProfile.uid){alert("Only the Leader can demote Guards!");return}try{await updateDoc(doc(db,"teams",o.id),{guards:arrayRemove(e)}),alert(`Successfully demoted ${t} to regular Member.`),window.renderGuildSystemModalContent()}catch(i){alert("Failed to demote Guard: "+i.message)}}};window.joinTeamDirect=async function(e){if(!userProfile){alert("Please log in to join a team!");return}if(v){alert("You are already in a team! Leave your current team first to join another.");return}try{const t=doc(db,"teams",e),o=await getDoc(t);if(!o.exists()){alert("Team no longer exists.");return}const i=o.data();if((i.members||[]).length>=(i.maxMembers||8)){alert("This team is already full (maximum 8 members)!");return}await updateDoc(t,{members:arrayUnion(userProfile.uid),memberCount:increment(1)}),alert(`🎉 Successfully joined "${i.name}"!`),typeof Ve=="function"&&Ve()}catch(t){alert("Failed to join team: "+t.message)}};window.applyToTeam=function(e){if(!userProfile){alert("Please log in to apply!");return}if(v){alert("You are already in a team!");return}window.selectedTeamIdForApplication=e,pa()};window.registerForTeamFight=async function(e,t){const o=q||v;if(!o){alert("You must be in a team to register for Team Fight tournaments!");return}const i=o.leaderId===userProfile.uid,n=o.guards&&o.guards.includes(userProfile.uid);if(!i&&!n){alert("Only the Leader or Guards can register the team for Team Fights!");return}const r=Math.floor(Math.random()*151)+50;try{await updateDoc(doc(db,"teams",o.id),{exp:increment(r),registeredFights:arrayUnion(t||e)}),await addDoc(collection(db,"teamFights"),{teamId:o.id,teamName:o.name,tournamentName:e,registeredBy:userProfile.name,expGained:r,createdAt:serverTimestamp()}),alert(`🏆 TOURNEY REGISTRATION SUCCESSFUL!

Your team "${o.name}" is officially registered for "${e}"!

✨ Team Bonus Earned: +${r} Team EXP! 🔥`),window.renderGuildSystemModalContent()}catch(s){alert("Failed to register for Team Fight: "+s.message)}};window.createNewTeamSubmit=async function(){if(!userProfile){alert("Please log in first!");return}if(v){alert("You are already a member/leader of a team! Leave your current team first.");return}const e=$("ctNameInput"),t=$("ctTagSelect"),o=$("ctDescInput"),i=document.querySelector('input[name="ctJoinType"]:checked'),n=e?e.value.trim():"",r=t?t.value:"PRO",s=o?o.value.trim():"",d=i?i.value:"free",c=Xt||"🦁";if(!n){alert("Please enter a Team Name!");return}try{const l=await addDoc(collection(db,"teams"),{name:n,tag:r,description:s||`Welcome to ${n}! Participate in Team Fights & donate to Treasury to rank up!`,announcement:s||`Welcome to ${n}! Participate in Team Fights & donate to Treasury to rank up!`,logoUrl:c,joinType:d,leaderId:userProfile.uid,leaderName:userProfile.name||"Leader",members:[userProfile.uid],guards:[],memberCount:1,maxMembers:8,treasury:0,exp:0,level:1,rank:1,registeredFights:[],createdAt:serverTimestamp()});alert(`🎉 TEAM CREATED SUCCESSFULLY!

Your team "${n}" [${r}] is established!`),Xt="",q={id:l.id,name:n,tag:r,description:s,logoUrl:c,joinType:d,leaderId:userProfile.uid,leaderName:userProfile.name,members:[userProfile.uid],guards:[],memberCount:1,maxMembers:8,treasury:0,exp:0,level:1,rank:1},v=q,ge="profile",_="profile",window.renderGuildSystemModalContent()}catch(l){alert("Failed to create team: "+l.message)}};window.disbandTeamSubmit=async function(){const e=q||v;if(e){if(e.leaderId!==userProfile.uid){alert("Only the Leader can disband the team!");return}if(confirm(`⚠️ Are you sure you want to DISBAND "${e.name}" permanently?
This action cannot be undone.`))try{await deleteDoc(doc(db,"teams",e.id)),alert(`Team "${e.name}" disbanded.`),v=null,q=null,ge="list",window.renderGuildSystemModalContent()}catch(t){alert("Failed to disband team: "+t.message)}}};window.leaveTeamSubmit=async function(){const e=q||v;if(e){if(e.leaderId===userProfile.uid){alert("Leader cannot leave. You must disband the team or promote someone else!");return}if(confirm(`Are you sure you want to leave "${e.name}"?`))try{await updateDoc(doc(db,"teams",e.id),{members:arrayRemove(userProfile.uid),guards:arrayRemove(userProfile.uid),memberCount:increment(-1)}),alert(`You left "${e.name}".`),v=null,q=null,ge="list",window.renderGuildSystemModalContent()}catch(t){alert("Failed to leave team: "+t.message)}}};window.kickMemberSubmit=async function(e,t){const o=q||v;if(!o)return;const i=o.leaderId===userProfile.uid,n=o.guards&&o.guards.includes(userProfile.uid);if(!i&&!n){alert("Only Leader or Guards can kick members!");return}if(confirm(`Kick "${t}" from the team?`))try{await updateDoc(doc(db,"teams",o.id),{members:arrayRemove(e),guards:arrayRemove(e),memberCount:increment(-1)}),alert(`Kicked "${t}".`),window.renderGuildSystemModalContent()}catch(r){alert("Failed to kick member: "+r.message)}};window.renderGuildSystemModalContent=async function(){const e=$("mGuildSystemModal"),t=$("guildSystemModalContent");if(!(!e||!t)&&!e.classList.contains("hidden")){if(ge==="list"){const o=se.filter(n=>!0);let i="";o.length===0?i=`
        <div class="col-span-full text-center py-12 text-t3 bg-card/20 border border-bdr/20 rounded-2xl">
          <i class="fas fa-shield-alt text-3xl mb-2 text-gold/30"></i>
          <p class="text-xs font-bold uppercase">No Teams Found</p>
          <p class="text-[10px] mt-1">Be the first to establish a team for your squad!</p>
        </div>
      `:o.forEach((n,r)=>{const s=(n.members||[]).length,d=v&&v.id===n.id,c=r+1;let l="";d?l=`<button onclick="window.viewTeamById('${n.id}')" class="px-3 py-1.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase rounded-xl hover:bg-emerald-500/25 transition">My Team</button>`:v?l=`<button onclick="window.viewTeamById('${n.id}')" class="px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-bdr text-white text-[10px] font-black uppercase rounded-xl transition">View</button>`:n.joinType==="application"?l=`<button onclick="window.applyToTeam('${n.id}')" class="px-3 py-1.5 bg-gold/15 hover:bg-gold/30 border border-gold/40 text-gold text-[10px] font-black uppercase rounded-xl transition">Apply</button>`:l=`<button onclick="window.joinTeamDirect('${n.id}')" class="px-3 py-1.5 bg-gradient-to-r from-gold to-yellow-500 text-bg text-[10px] font-black uppercase rounded-xl transition shadow-md">Join</button>`,i+=`
          <div class="bg-card/40 hover:bg-card/70 border border-bdr/30 hover:border-gold/40 rounded-2xl p-4 transition flex flex-col justify-between space-y-3">
            <div class="flex items-start justify-between gap-3">
              <div class="flex items-center gap-3 min-w-0">
                <div class="w-12 h-12 rounded-full bg-[#0e101f] border-2 border-gold/40 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-lg">
                  ${n.logoUrl&&n.logoUrl.startsWith("data:")?`<img src="${n.logoUrl}" class="w-full h-full object-cover" />`:`<span class="text-2xl">${n.logoUrl||"🦁"}</span>`}
                </div>
                <div class="min-w-0">
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <h4 class="font-display text-sm font-black text-white uppercase tracking-wider truncate">${n.name}</h4>
                    <span class="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-gold/10 text-gold border border-gold/25">[${n.tag||"PRO"}]</span>
                  </div>
                  <p class="text-[10px] text-t3 font-mono mt-0.5">Leader: <strong class="text-white">${n.leaderName||"Admin"}</strong></p>
                </div>
              </div>
              <span class="text-xs font-black font-mono text-gold bg-gold/10 border border-gold/20 px-2 py-0.5 rounded-lg flex-shrink-0">#${n.rank||c}</span>
            </div>

            <p class="text-[10px] text-t2 line-clamp-2 italic leading-relaxed">"${n.description||"Ready for squad battles & tournaments!"}"</p>

            <div class="flex items-center justify-between pt-2 border-t border-bdr/20">
              <span class="text-[10px] font-mono text-t3 flex items-center gap-1">
                <i class="fas fa-users text-gold"></i> <strong class="text-white">${s}</strong> / 8 Members
              </span>
              ${l}
            </div>
          </div>
        `}),t.innerHTML=`
      <!-- TEAMS LIST HEADER -->
      <div class="p-4 border-b border-bdr/40 flex items-center justify-between bg-[#0b0c16] flex-shrink-0">
        <div class="flex items-center gap-3">
          <button onclick="window.closeGuildsModal()" class="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-t2 hover:text-white flex items-center justify-center transition cursor-pointer">
            <i class="fas fa-arrow-left text-xs"></i>
          </button>
          <h3 class="font-display text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
            <i class="fas fa-users text-gold"></i> Teams
          </h3>
        </div>

        <div class="flex items-center gap-2">
          <button onclick="window.setTeamsView('rankings')" class="w-9 h-9 rounded-xl bg-gold/10 border border-gold/30 text-gold hover:bg-gold hover:text-bg transition flex items-center justify-center cursor-pointer" title="Team Rankings">
            <i class="fas fa-trophy text-sm"></i>
          </button>
          <button onclick="window.toggleTeamsSearch()" class="w-9 h-9 rounded-xl bg-white/5 border border-bdr text-t2 hover:text-white transition flex items-center justify-center cursor-pointer" title="Search Teams">
            <i class="fas fa-search text-sm"></i>
          </button>
          <button onclick="window.setTeamsView('create')" class="px-3 py-2 bg-gradient-to-r from-gold via-yellow-400 to-amber-500 text-bg text-[10px] font-black uppercase rounded-xl transition shadow-lg flex items-center gap-1.5 cursor-pointer">
            <i class="fas fa-plus"></i> Create Team
          </button>
          <button onclick="window.showTeamGuide()" class="w-9 h-9 rounded-xl bg-white/5 border border-bdr text-t2 hover:text-white transition flex items-center justify-center cursor-pointer" title="Team Guide">
            <i class="fas fa-book text-sm"></i>
          </button>
        </div>
      </div>

      <!-- INLINE SEARCH INPUT CONTAINER -->
      <div id="teamsSearchInputContainer" class="px-4 pt-3 hidden">
        <div class="relative">
          <i class="fas fa-search absolute left-3 top-2.5 text-t3 text-xs"></i>
          <input oninput="window.updateTeamsSearch(this.value)" type="text" placeholder="Search by team name, tag, or leader..." class="w-full bg-card border border-bdr rounded-xl pl-9 pr-4 py-2 text-xs text-white outline-none focus:border-gold transition" />
        </div>
      </div>

      <!-- USER TEAM BANNER IF MEMBER -->
      ${v?`
        <div class="mx-4 mt-3 p-3.5 bg-gradient-to-r from-gold/15 via-yellow-500/10 to-amber-500/15 border border-gold/40 rounded-2xl flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-gold/20 border border-gold flex items-center justify-center text-xl">
              ${v.logoUrl&&v.logoUrl.startsWith("data:")?`<img src="${v.logoUrl}" class="w-full h-full object-cover rounded-full" />`:v.logoUrl||"🦁"}
            </div>
            <div>
              <p class="text-[9px] text-gold uppercase font-mono font-bold">YOUR ACTIVE TEAM</p>
              <h4 class="font-display text-xs font-black text-white uppercase">${v.name} <span class="text-gold">[${v.tag||"PRO"}]</span></h4>
            </div>
          </div>
          <button onclick="window.viewMyTeamProfile()" class="px-3.5 py-1.5 bg-gold hover:bg-[#e8b830] text-bg text-[10px] font-black uppercase rounded-xl transition shadow-md cursor-pointer">
            My Team Profile 🚀
          </button>
        </div>
      `:""}

      <!-- TEAMS SCROLLABLE LIST -->
      <div class="flex-1 p-4 overflow-y-auto min-h-0 scrollbar-thin">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          ${i}
        </div>
      </div>

      <!-- BOTTOM REFRESH BAR -->
      <div class="p-3 bg-[#080911] border-t border-bdr/20 flex items-center justify-between flex-shrink-0">
        <span class="text-[10px] text-t3 font-mono">Total Teams: <strong class="text-white">${se.length}</strong></span>
        <button onclick="listenToGuilds()" class="px-3 py-1 bg-white/5 hover:bg-white/10 border border-bdr/30 text-t2 hover:text-white text-[10px] font-bold uppercase rounded-lg transition cursor-pointer flex items-center gap-1.5">
          <i class="fas fa-sync-alt"></i> Refresh List
        </button>
      </div>
    `}else if(ge==="create")t.innerHTML=`
      <div class="p-4 border-b border-bdr/40 flex items-center justify-between bg-[#0b0c16] flex-shrink-0">
        <div class="flex items-center gap-3">
          <button onclick="window.setTeamsView('list')" class="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-t2 hover:text-white flex items-center justify-center transition cursor-pointer">
            <i class="fas fa-arrow-left text-xs"></i>
          </button>
          <h3 class="font-display text-base font-black text-white uppercase tracking-wider">Create Team</h3>
        </div>
      </div>

      <div class="flex-1 p-6 overflow-y-auto max-w-2xl mx-auto w-full space-y-5 scrollbar-thin">
        <!-- Image Upload Section -->
        <div class="flex flex-col items-center justify-center space-y-3">
          <label class="block text-[10px] text-gold uppercase font-bold tracking-wider">Team Logo (Upload Image or Pick Crest)</label>
          
          <div class="relative group cursor-pointer" onclick="$('ctLogoFileInput').click()">
            <div class="w-24 h-24 rounded-full bg-[#0e101f] border-2 border-gold flex items-center justify-center shadow-2xl overflow-hidden relative">
              <span id="ctLogoPreviewIco" class="text-4xl text-gold">🦁</span>
              <img id="ctLogoPreviewImg" class="w-full h-full object-cover hidden" />
              <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center text-white text-[9px] font-bold">
                <i class="fas fa-camera text-base mb-1"></i> Upload
              </div>
            </div>
          </div>

          <input id="ctLogoFileInput" type="file" accept="image/*" onchange="window.handleTeamLogoUpload(event)" class="hidden" />

          <!-- Preset Crests -->
          <div class="flex items-center gap-2 pt-1">
            ${["🦁","🐺","🐯","👑","🐉","⚔️","💀","⚡"].map(o=>`
              <button onclick="customTeamLogoDataUrl = '${o}'; $('ctLogoPreviewImg').classList.add('hidden'); $('ctLogoPreviewIco').classList.remove('hidden'); $('ctLogoPreviewIco').textContent = '${o}';" class="w-8 h-8 rounded-lg bg-card border border-bdr hover:border-gold text-lg flex items-center justify-center transition cursor-pointer">${o}</button>
            `).join("")}
          </div>
        </div>

        <!-- Name Input -->
        <div>
          <label class="block text-[10px] text-t3 uppercase font-bold tracking-wider mb-1.5">Team Name</label>
          <input id="ctNameInput" type="text" placeholder="e.g. Apex Predators" class="w-full bg-card border border-bdr rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-gold transition" />
        </div>

        <!-- Tag Selector -->
        <div>
          <label class="block text-[10px] text-t3 uppercase font-bold tracking-wider mb-1.5">Team Tag / Category</label>
          <select id="ctTagSelect" class="w-full bg-card border border-bdr rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-gold transition">
            <option value="PRO">PRO</option>
            <option value="COMPETITIVE">COMPETITIVE</option>
            <option value="CASUAL">CASUAL</option>
            <option value="ESPORTS">ESPORTS</option>
          </select>
        </div>

        <!-- Description -->
        <div>
          <label class="block text-[10px] text-t3 uppercase font-bold tracking-wider mb-1.5">Team Description / Slogan</label>
          <textarea id="ctDescInput" rows="3" placeholder="Describe your squad goals and playstyle..." class="w-full bg-card border border-bdr rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-gold transition scrollbar-thin"></textarea>
        </div>

        <!-- Join Requirement Toggle -->
        <div>
          <label class="block text-[10px] text-t3 uppercase font-bold tracking-wider mb-2">Join Requirement</label>
          <div class="grid grid-cols-2 gap-3">
            <label class="p-3 bg-card border border-bdr rounded-xl flex items-center gap-2.5 cursor-pointer hover:border-gold transition">
              <input type="radio" name="ctJoinType" value="free" checked class="accent-gold" />
              <div>
                <span class="text-xs font-bold text-white block">Free to Join</span>
                <span class="text-[9px] text-t3">Anyone can join instantly</span>
              </div>
            </label>
            <label class="p-3 bg-card border border-bdr rounded-xl flex items-center gap-2.5 cursor-pointer hover:border-gold transition">
              <input type="radio" name="ctJoinType" value="application" class="accent-gold" />
              <div>
                <span class="text-xs font-bold text-white block">Application Required</span>
                <span class="text-[9px] text-t3">Leader / Guard must approve</span>
              </div>
            </label>
          </div>
        </div>

        <!-- Submit Button -->
        <button onclick="window.createNewTeamSubmit()" class="w-full py-3.5 bg-gradient-to-r from-gold via-yellow-400 to-amber-500 text-bg text-xs font-black uppercase tracking-wider rounded-xl transition shadow-xl active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2">
          <i class="fas fa-shield-alt"></i> Create Team
        </button>
      </div>
    `;else if(ge==="profile"){const o=q||v||se[0];if(!o){ge="list",window.renderGuildSystemModalContent();return}const i=o.leaderId===(userProfile&&userProfile.uid),n=o.guards&&o.guards.includes(userProfile&&userProfile.uid),r=o.members||[o.leaderId],s=o.guards||[];let d="";if(_==="profile")d=`
        <div class="space-y-4">
          <!-- Activeness / EXP Progress Bar -->
          <div class="bg-card/25 border border-bdr/20 rounded-2xl p-4 space-y-3">
            <div class="flex items-center justify-between text-xs">
              <span class="text-gold font-black uppercase tracking-wider flex items-center gap-1.5">
                <i class="fas fa-fire text-amber-500"></i> Activeness & EXP
              </span>
              <span class="font-mono text-white font-bold">${o.exp||0} / 5,000 EXP</span>
            </div>
            <div class="w-full bg-bg border border-bdr/30 rounded-full h-3 overflow-hidden p-[2px]">
              <div class="bg-gradient-to-r from-gold via-yellow-400 to-amber-500 h-full rounded-full shadow-[0_0_10px_rgba(240,192,64,0.4)]" style="width: ${Math.min(100,(o.exp||0)/5e3*100)}%"></div>
            </div>

            <!-- Milestone Rewards Chests -->
            <div class="grid grid-cols-4 gap-2 pt-2">
              <div class="bg-card/40 border border-bdr/20 p-2 rounded-xl text-center">
                <i class="fas fa-box text-gold text-base"></i>
                <span class="block text-[8px] font-bold text-t3 mt-1 font-mono">800 EXP</span>
              </div>
              <div class="bg-card/40 border border-bdr/20 p-2 rounded-xl text-center">
                <i class="fas fa-gift text-amber-400 text-base"></i>
                <span class="block text-[8px] font-bold text-t3 mt-1 font-mono">2,000 EXP</span>
              </div>
              <div class="bg-card/40 border border-bdr/20 p-2 rounded-xl text-center">
                <i class="fas fa-gem text-yellow-300 text-base"></i>
                <span class="block text-[8px] font-bold text-t3 mt-1 font-mono">5,000 EXP</span>
              </div>
              <div class="bg-card/40 border border-bdr/20 p-2 rounded-xl text-center">
                <i class="fas fa-crown text-gold text-base"></i>
                <span class="block text-[8px] font-bold text-t3 mt-1 font-mono">10,000 EXP</span>
              </div>
            </div>
          </div>

          <!-- Team Treasury Section -->
          <div class="bg-gradient-to-br from-[#121425] to-[#0a0b14] border border-gold/30 rounded-2xl p-5 space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <span class="text-[9px] text-gold uppercase font-mono font-bold">TEAM TREASURY</span>
                <h4 class="text-sm font-black text-white uppercase flex items-center gap-2 mt-0.5">
                  <i class="fas fa-vault text-gold"></i> Treasury Funds
                </h4>
              </div>
              <button onclick="window.openDonateModal()" class="px-4 py-2 bg-gradient-to-r from-gold via-yellow-400 to-amber-500 text-bg text-[10px] font-black uppercase rounded-xl transition shadow-lg cursor-pointer flex items-center gap-1.5">
                <i class="fas fa-plus-circle"></i> Donate AX Coins
              </button>
            </div>

            <div class="bg-card/40 border border-bdr/20 p-4 rounded-xl flex items-center justify-between">
              <span class="text-xs text-t3 uppercase font-bold">Total Treasury Balance</span>
              <span class="text-lg font-black text-gold font-mono flex items-center gap-1.5">
                <i class="fas fa-coins"></i> ${o.treasury||0} AX
              </span>
            </div>
          </div>

          <!-- Announcement Section -->
          <div class="bg-card/25 border border-bdr/20 rounded-2xl p-4 space-y-2">
            <div class="flex items-center justify-between">
              <h4 class="text-xs font-black uppercase text-white tracking-wider flex items-center gap-1.5">
                <i class="fas fa-bullhorn text-gold"></i> Team Announcement
              </h4>
              ${i||n?`
                <button onclick="window.openEditAnnouncementModal()" class="text-gold text-[10px] font-bold hover:underline cursor-pointer">
                  <i class="fas fa-edit"></i> Edit
                </button>
              `:""}
            </div>
            <p class="text-xs text-t2 italic leading-relaxed bg-black/30 p-3 rounded-xl border border-bdr/10">
              "${o.announcement||o.description||"Welcome to the team! Participate in Team Fights & donate to Treasury to rank up!"}"
            </p>
          </div>
        </div>
      `;else if(_==="members")d=`
        <div class="space-y-4">
          <div class="flex items-center justify-between bg-card/25 border border-bdr/20 p-3.5 rounded-2xl">
            <div>
              <h4 class="text-xs font-black uppercase text-white">Roster Ranks</h4>
              <p class="text-[9px] text-t3 font-mono">Members: ${r.length}/8 | Guards: ${s.length}/2</p>
            </div>
          </div>

          <div class="bg-card/20 border border-bdr/20 rounded-2xl p-4 overflow-x-auto scrollbar-thin">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="border-b border-bdr/20 text-[9px] text-t3 font-bold uppercase tracking-wider">
                  <th class="pb-2 pl-2">Member</th>
                  <th class="pb-2 text-center">Role</th>
                  <th class="pb-2 text-right pr-2">Actions</th>
                </tr>
              </thead>
              <tbody id="teamMembersListTbody" class="text-xs">
                <tr><td colspan="3" class="py-6 text-center text-t3"><i class="fas fa-spinner animate-spin text-gold mr-1"></i> Loading member roster...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      `,setTimeout(async()=>{const c=await window.fetchGuildMembers(r),l=$("teamMembersListTbody");l&&(l.innerHTML="",c.forEach(u=>{const p=u.uid===o.leaderId,f=s.includes(u.uid),b=u.uid===(userProfile&&userProfile.uid);let g='<span class="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-card border border-bdr text-t2">👤 Member</span>';p?g='<span class="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-gold/15 text-gold border border-gold/30">👑 Leader</span>':f&&(g='<span class="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">🛡️ Guard</span>');let w="-";i&&!b?w=`
              <div class="flex items-center justify-end gap-1">
                ${f?`<button onclick="window.demoteGuard('${u.uid}', '${u.name}')" class="px-2 py-1 bg-white/5 border border-bdr text-t2 text-[9px] font-bold uppercase rounded-md transition cursor-pointer">Demote</button>`:`<button onclick="window.promoteToGuard('${u.uid}', '${u.name}')" class="px-2 py-1 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500 hover:text-bg text-[9px] font-bold uppercase rounded-md transition cursor-pointer">Promote Guard</button>`}
                <button onclick="window.kickMemberSubmit('${u.uid}', '${u.name}')" class="px-2 py-1 bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white text-[9px] font-bold uppercase rounded-md transition cursor-pointer">Kick</button>
              </div>
            `:n&&!p&&!f&&!b?w=`<button onclick="window.kickMemberSubmit('${u.uid}', '${u.name}')" class="px-2 py-1 bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white text-[9px] font-bold uppercase rounded-md transition cursor-pointer">Kick</button>`:b&&!p&&(w='<button onclick="window.leaveTeamSubmit()" class="px-2 py-1 bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white text-[9px] font-bold uppercase rounded-md transition cursor-pointer">Leave Team</button>');const h=document.createElement("tr");h.className="border-b border-bdr/10 hover:bg-white/[0.02] transition",h.innerHTML=`
            <td class="py-3 pl-2 flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-full bg-gold/10 border border-gold/25 flex items-center justify-center text-xs font-bold text-gold uppercase">
                ${u.name?u.name.substring(0,2):"PL"}
              </div>
              <div>
                <p class="font-bold text-white flex items-center gap-1">${u.name||"Player"} ${b?'<span class="text-[8px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1 py-0.2 rounded">Me</span>':""}</p>
                <p class="text-[9px] text-t3 font-mono">@${u.handle||"player"}</p>
              </div>
            </td>
            <td class="py-3 text-center">${g}</td>
            <td class="py-3 text-right pr-2">${w}</td>
          `,l.appendChild(h)}))},50);else if(_==="tasks")d=`
        <div class="space-y-3">
          <div class="p-3 bg-card/30 border border-bdr/20 rounded-xl flex items-center justify-between">
            <div>
              <h5 class="text-xs font-black text-white uppercase">Daily Treasury Contribution</h5>
              <p class="text-[10px] text-t3">Donate 50 AX Coins to Treasury</p>
            </div>
            <span class="px-2.5 py-1 bg-gold/15 border border-gold/30 text-gold text-[9px] font-bold uppercase rounded-lg">+100 EXP</span>
          </div>
          <div class="p-3 bg-card/30 border border-bdr/20 rounded-xl flex items-center justify-between">
            <div>
              <h5 class="text-xs font-black text-white uppercase">Participate in 1 Team Fight</h5>
              <p class="text-[10px] text-t3">Register for active squad tournaments</p>
            </div>
            <span class="px-2.5 py-1 bg-gold/15 border border-gold/30 text-gold text-[9px] font-bold uppercase rounded-lg">+150 EXP</span>
          </div>
        </div>
      `;else if(_==="team_fight"){const c=o.registeredFights||[];d=`
        <div class="space-y-4">
          <div class="bg-gradient-to-r from-red-500/15 via-gold/15 to-amber-500/15 border border-gold/30 rounded-2xl p-4">
            <h4 class="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
              <i class="fas fa-swords text-gold"></i> Team vs Team Tournaments
            </h4>
            <p class="text-[10px] text-t3 mt-1 leading-relaxed">
              Register your team for 4v4 / 5v5 tournaments! Participating earns random <strong>50–200 Team EXP</strong> & AX prize pools.
            </p>
          </div>

          <div class="space-y-3">
            <!-- Fight 1 -->
            <div class="bg-card/30 border border-bdr/30 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
              <div class="space-y-1 text-center md:text-left">
                <span class="px-2 py-0.5 bg-red-500/10 border border-red-500/20 text-red-400 text-[8px] font-black uppercase rounded">🔥 5v5 SQUAD MATCH</span>
                <h5 class="font-display text-sm font-black text-white uppercase">Cyber Clash Premier</h5>
                <p class="text-[10px] text-gold font-mono font-bold"><i class="fas fa-coins"></i> Prize Pool: 10,000 AX Coins</p>
              </div>
              ${c.includes("cyber_clash")?`
                <span class="px-4 py-2 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-black uppercase rounded-xl">Registered ✅</span>
              `:`
                <button onclick="window.registerForTeamFight('Cyber Clash Premier', 'cyber_clash')" class="px-5 py-2.5 bg-gradient-to-r from-gold via-yellow-400 to-amber-500 text-bg text-[10px] font-black uppercase rounded-xl transition shadow-lg cursor-pointer">
                  Register Team (+50-200 EXP)
                </button>
              `}
            </div>

            <!-- Fight 2 -->
            <div class="bg-card/30 border border-bdr/30 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
              <div class="space-y-1 text-center md:text-left">
                <span class="px-2 py-0.5 bg-gold/10 border border-gold/20 text-gold text-[8px] font-black uppercase rounded">🏆 ESPORTS SHOWDOWN</span>
                <h5 class="font-display text-sm font-black text-white uppercase">Apex Squad Showdown</h5>
                <p class="text-[10px] text-gold font-mono font-bold"><i class="fas fa-coins"></i> Prize Pool: 25,000 AX Coins</p>
              </div>
              ${c.includes("apex_showdown")?`
                <span class="px-4 py-2 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-black uppercase rounded-xl">Registered ✅</span>
              `:`
                <button onclick="window.registerForTeamFight('Apex Squad Showdown', 'apex_showdown')" class="px-5 py-2.5 bg-gradient-to-r from-gold via-yellow-400 to-amber-500 text-bg text-[10px] font-black uppercase rounded-xl transition shadow-lg cursor-pointer">
                  Register Team (+50-200 EXP)
                </button>
              `}
            </div>
          </div>
        </div>
      `}else _==="manage"&&(d=`
        <div class="space-y-4">
          <div class="bg-card/25 border border-bdr/20 p-4 rounded-2xl space-y-3">
            <h4 class="text-xs font-black uppercase text-white tracking-wider">Team Management</h4>
            ${i?`
              <button onclick="window.disbandTeamSubmit()" class="px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white text-[10px] font-black uppercase rounded-xl transition cursor-pointer">
                Disband Team Permanently
              </button>
            `:`
              <button onclick="window.leaveTeamSubmit()" class="px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white text-[10px] font-black uppercase rounded-xl transition cursor-pointer">
                Leave Team
              </button>
            `}
          </div>
        </div>
      `);t.innerHTML=`
      <!-- PROFILE HEADER CARD -->
      <div class="p-5 border-b border-bdr/40 bg-[#0b0c16] flex flex-col md:flex-row items-center justify-between gap-4 flex-shrink-0">
        <div class="flex items-center gap-3.5">
          <button onclick="window.setTeamsView('list')" class="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-t2 hover:text-white flex items-center justify-center transition cursor-pointer">
            <i class="fas fa-arrow-left text-xs"></i>
          </button>
          
          <div class="w-14 h-14 rounded-full bg-[#0e101f] border-2 border-gold flex items-center justify-center shadow-xl overflow-hidden flex-shrink-0">
            ${o.logoUrl&&o.logoUrl.startsWith("data:")?`<img src="${o.logoUrl}" class="w-full h-full object-cover" />`:`<span class="text-2xl">${o.logoUrl||"🦁"}</span>`}
          </div>

          <div>
            <div class="flex items-center gap-2">
              <h3 class="font-display text-lg font-black text-white uppercase tracking-wider">${o.name}</h3>
              <span class="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-gold/15 text-gold border border-gold/30">[${o.tag||"PRO"}]</span>
            </div>
            <p class="text-[10px] text-t3 font-mono mt-0.5">ID: <span class="text-white">AX-${o.id.substring(0,6).toUpperCase()}</span> | Weekly Rank: <strong class="text-gold">#${o.rank||1}</strong></p>
          </div>
        </div>

        <!-- TABS NAV -->
        <div class="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-bdr/20">
          ${[{id:"profile",label:"Profile",icon:"fa-id-card"},{id:"members",label:"Members",icon:"fa-users"},{id:"tasks",label:"Tasks",icon:"fa-tasks"},{id:"team_fight",label:"Team Fight",icon:"fa-swords"},...i||n?[{id:"manage",label:"Manage",icon:"fa-cog"}]:[]].map(c=>`
            <button onclick="window.setTeamsTab('${c.id}')" class="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition flex items-center gap-1.5 cursor-pointer ${_===c.id?"bg-gold text-bg shadow-md":"text-t3 hover:text-white hover:bg-white/5"}">
              <i class="fas ${c.icon}"></i> ${c.label}
            </button>
          `).join("")}
        </div>
      </div>

      <!-- MAIN TAB CONTENT -->
      <div class="flex-1 p-5 overflow-y-auto min-h-0 scrollbar-thin">
        ${d}
      </div>
    `}}};window.switchGuildTab=function(e){_=e,lo=!1,window.renderGuildSystemModalContent()};window.openSquadStore=function(){if(typeof guestProfile<"u"&&guestProfile){alert("Please log in or register a profile to access the Squad Store!");return}lo=!1,_="crates";const e=$("mGuildSystemModal");e&&e.classList.remove("hidden"),typeof Ve=="function"&&Ve(),window.renderGuildSystemModalContent()};window.toggleGuildBrowser=function(e){lo=e,window.renderGuildSystemModalContent()};window.openCreateGuildModal=function(){$("mCreateGuild").classList.remove("hidden")};window.closeGuildsModal=function(){$("mGuildSystemModal").classList.add("hidden"),Ne&&(Ne(),Ne=null)};window.fetchGuildMembers=async function(e){if(!e||e.length===0)return[];try{const t=query(collection(db,"users"),where("uid","in",e)),o=await getDocs(t),i=[];return o.forEach(n=>{i.push(n.data())}),i}catch(t){return console.error("Error fetching guild members:",t),[]}};window.listenToGuildChat=function(e){Ne&&(Ne(),Ne=null),pi=e;const t=query(collection(db,"teams",e,"chat"),orderBy("createdAt","desc"),limit(30));Ne=onSnapshot(t,o=>{if(pi!==e)return;const i=[];o.forEach(n=>{i.push({id:n.id,...n.data()})}),i.reverse(),window.renderGuildChatMessages(i)},o=>{console.error("Error listening to guild chat:",o)})};window.renderGuildChatMessages=function(e){const t=$("guildChatLogsContainer");if(t){if(t.innerHTML="",e.length===0){t.innerHTML=`
      <div class="text-center text-t3 py-8 flex flex-col items-center justify-center gap-1">
        <i class="far fa-comments text-lg opacity-40"></i>
        <span>No messages in Guild feed yet. Say hello to your squad!</span>
      </div>
    `;return}e.forEach(o=>{const i=o.senderId===userProfile.uid,n=o.senderRole==="Leader",r=document.createElement("div");r.className=`flex flex-col max-w-[85%] rounded-xl p-2.5 text-xs ${i?"ml-auto bg-gold/10 border border-gold/25 text-white":"bg-card border border-bdr/30 text-t2"}`,r.innerHTML=`
      <div class="flex items-center gap-1.5 mb-1 text-[9px] font-mono text-t3">
        <span class="font-bold text-white">${o.senderName||"Squad Player"}</span>
        ${n?'<span class="text-gold font-bold bg-gold/5 border border-gold/20 px-1 rounded">Leader</span>':""}
      </div>
      <p class="leading-relaxed whitespace-pre-wrap">${o.text}</p>
    `,t.appendChild(r)}),t.scrollTop=t.scrollHeight}};window.sendGuildChatMessage=async function(){const e=$("guildChatInput");if(!e)return;const t=e.value.trim();if(t){e.value="";try{await addDoc(collection(db,"teams",v.id,"chat"),{senderId:userProfile.uid,senderName:userProfile.name,senderRole:v.leaderId===userProfile.uid?"Leader":"Member",text:t,createdAt:serverTimestamp()})}catch(o){console.error("Error sending guild chat:",o)}}};window.pendingCrateReward=null;window.startSquadCrateOpening=async function(){if(!userProfile){alert("Please log in to open mystery crates!");return}const e=userProfile.balance||0;if(e<50){alert("⚠️ Insufficient AX Coins! Opening a Mystery Crate requires 50 AX Coins. Please top up your wallet.");return}try{await updateDoc(doc(db,"users",userProfile.uid),{balance:increment(-50)}),userProfile.balance=Math.max(0,e-50)}catch(l){console.error("Deduct error:",l)}const t=[{id:"xp_24h",title:"XP Booster (24h)",type:"xp_booster",durationHours:24,icon:"fa-bolt-lightning",icoClass:"text-yellow-300",rarity:"LEGENDARY DROP",rarityBg:"bg-yellow-400/20 border-yellow-400/40 text-yellow-300",desc:"You unlocked 2x XP Multiplier active across all matches & lobbies for a full 24 hours!",weight:12},{id:"xp_1h",title:"XP Booster (1h)",type:"xp_booster",durationHours:1,icon:"fa-bolt",icoClass:"text-amber-400",rarity:"RARE DROP",rarityBg:"bg-amber-500/20 border-amber-500/40 text-amber-400",desc:"You unlocked 2x XP Multiplier active across all matches & lobbies for 1 hour!",weight:25},{id:"squad_boost",title:"Squad Boost (+25%)",type:"squad_boost",durationHours:48,icon:"fa-shield-halved",icoClass:"text-emerald-400",rarity:"EPIC DROP",rarityBg:"bg-emerald-500/20 border-emerald-500/40 text-emerald-400",desc:"You unlocked +25% Squad Activity points & tournament XP multiplier for 48 hours!",weight:20},{id:"ax_500",title:"AX Coin Pack (500 AX)",type:"ax_coins",amount:500,icon:"fa-coins",icoClass:"text-gold",rarity:"EPIC DROP",rarityBg:"bg-gold/20 border-gold/40 text-gold",desc:"Jackpot! 500 AX Coins directly credited into your profile wallet balance!",weight:8},{id:"ax_150",title:"AX Coin Pack (150 AX)",type:"ax_coins",amount:150,icon:"fa-coins",icoClass:"text-gold",rarity:"RARE DROP",rarityBg:"bg-gold/20 border-gold/40 text-gold",desc:"Lucky spin! 150 AX Coins directly credited into your profile wallet balance!",weight:15},{id:"ax_50",title:"AX Coin Pack (50 AX)",type:"ax_coins",amount:50,icon:"fa-coins",icoClass:"text-amber-200",rarity:"COMMON DROP",rarityBg:"bg-white/10 border-white/20 text-t2",desc:"50 AX Coins credited into your profile wallet balance (Refund Spin)!",weight:20}],o=t.reduce((l,u)=>l+u.weight,0);let i=Math.random()*o,n=t[0];for(const l of t){if(i<l.weight){n=l;break}i-=l.weight}window.pendingCrateReward=n;const r=$("mCrateVideoModal"),s=$("crateRevealOverlay"),d=$("crateFallbackAnim"),c=$("vCrateVideo");if(s&&s.classList.add("hidden"),r&&r.classList.remove("hidden"),c){c.currentTime=0;const l=c.play();l!==void 0&&l.then(()=>{d&&d.classList.add("hidden")}).catch(u=>{console.warn("Video play error / crate.mp4 not found:",u),d&&d.classList.remove("hidden"),setTimeout(()=>{window.triggerCrateReveal()},2200)}),c.onended=function(){window.triggerCrateReveal()}}else d&&d.classList.remove("hidden"),setTimeout(()=>{window.triggerCrateReveal()},2200)};window.skipCrateVideo=function(){const e=$("vCrateVideo");if(e)try{e.pause()}catch{}window.triggerCrateReveal()};window.triggerCrateReveal=function(){const e=$("crateRevealOverlay"),t=window.pendingCrateReward;if(!t)return;const o=$("rRarityTag"),i=$("rRarityText");$("rIcoContainer");const n=$("rIco"),r=$("rTitle"),s=$("rDesc");o&&(o.className=`relative inline-flex items-center gap-1.5 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${t.rarityBg}`),i&&(i.textContent=t.rarity),n&&(n.className=`fas ${t.icon} ${t.icoClass}`),r&&(r.textContent=t.title),s&&(s.textContent=t.desc),e&&e.classList.remove("hidden")};window.claimCrateReward=async function(){const e=window.pendingCrateReward;if(!e||!userProfile){$("mCrateVideoModal")&&$("mCrateVideoModal").classList.add("hidden");return}try{if(e.type==="ax_coins")await updateDoc(doc(db,"users",userProfile.uid),{balance:increment(e.amount)}),userProfile.balance=(userProfile.balance||0)+e.amount;else if(e.type==="xp_booster"){const t=Date.now()+e.durationHours*3600*1e3,o={type:e.id,title:e.title,expiresAt:t,multiplier:2};await updateDoc(doc(db,"users",userProfile.uid),{activeXpBooster:o}),userProfile.activeXpBooster=o}else if(e.type==="squad_boost"){const o={active:!0,expiresAt:Date.now()+e.durationHours*3600*1e3,boostPct:25};await updateDoc(doc(db,"users",userProfile.uid),{activeSquadBoost:o}),userProfile.activeSquadBoost=o}window.pendingCrateReward=null,$("mCrateVideoModal")&&$("mCrateVideoModal").classList.add("hidden"),$("crateRevealOverlay")&&$("crateRevealOverlay").classList.add("hidden"),alert(`🎉 Successfully equipped & claimed ${e.title}!`),window.renderGuildSystemModalContent()}catch(t){alert("Error claiming item: "+t.message)}};window.buySquadItem=async function(e,t){if(!userProfile){alert("Please log in first!");return}if((userProfile.balance||0)<t){alert(`⚠️ Insufficient AX Coins! You need ${t} AX Coins to purchase this item. Top up your wallet to proceed.`);return}let o="",i=24;if(e==="squad_boost"?(o="Squad Boost (+25%)",i=48):e==="xp_1h"?(o="XP Booster (1h)",i=1):e==="xp_24h"&&(o="XP Booster (24h)",i=24),!!confirm(`Confirm purchase of ${o} for ${t} AX Coins?`))try{await updateDoc(doc(db,"users",userProfile.uid),{balance:increment(-t)}),userProfile.balance=Math.max(0,(userProfile.balance||0)-t);const n=Date.now()+i*3600*1e3;if(e==="squad_boost"){const r={active:!0,expiresAt:n,boostPct:25};await updateDoc(doc(db,"users",userProfile.uid),{activeSquadBoost:r}),userProfile.activeSquadBoost=r}else{const r={type:e,title:o,expiresAt:n,multiplier:2};await updateDoc(doc(db,"users",userProfile.uid),{activeXpBooster:r}),userProfile.activeXpBooster=r}alert(`⚡ Item acquired! ${o} is now active on your profile.`),window.renderGuildSystemModalContent()}catch(n){alert("Purchase error: "+n.message)}};window.claimGuildMilestone=async function(e,t){if(!v)return;if((userProfile.claimedGuildRewards||[]).includes(e)){alert("You have already claimed this weekly activity reward! 📦");return}try{await updateDoc(doc(db,"users",userProfile.uid),{balance:increment(t),claimedGuildRewards:arrayUnion(e)}),await addDoc(collection(db,"deposit_requests"),{userId:userProfile.uid,userName:userProfile.name,userEmail:userProfile.email||"",type:"deposit",method:"Guild Reward",message:`Claimed Weekly Guild Activity Reward (+${t} AX Coins)`,amountPKR:0,amountAX:t,txnId:"RWD-"+Math.floor(1e5+Math.random()*9e5),status:"approved",timestamp:"Just now",createdAt:serverTimestamp()}),alert(`🎉 Success! Claimed weekly activity reward of ${t} AX Coins successfully!`),userProfile&&(userProfile.balance=(userProfile.balance||0)+t,userProfile.claimedGuildRewards||(userProfile.claimedGuildRewards=[]),userProfile.claimedGuildRewards.push(e)),window.renderGuildSystemModalContent()}catch(i){alert("Failed to claim reward: "+i.message)}};window.disbandGuild=async function(){if(v){if(v.leaderId!==userProfile.uid){alert("Only the Leader can disband the Guild!");return}if(confirm(`⚠️ WARNING: Are you sure you want to DISBAND your Guild "${v.name}" permanently?
This action is irreversible and will remove all members.`))try{await deleteDoc(doc(db,"teams",v.id)),alert(`Guild "${v.name}" has been disbanded successfully.`),v=null,window.renderGuildSystemModalContent()}catch(e){alert("Failed to disband Guild: "+e.message)}}};window.leaveGuild=async function(){if(v){if(v.leaderId===userProfile.uid){alert("As the Leader, you cannot leave. You must disband the Guild or promote someone else!");return}if(confirm(`Are you sure you want to leave the Guild "${v.name}"?`))try{await updateDoc(doc(db,"teams",v.id),{members:arrayRemove(userProfile.uid)}),alert(`You successfully left the Guild "${v.name}".`),v=null,window.renderGuildSystemModalContent()}catch(e){alert("Failed to leave Guild: "+e.message)}}};window.kickGuildMember=async function(e,t){if(v){if(v.leaderId!==userProfile.uid){alert("Only the Leader can kick members!");return}if(confirm(`Are you sure you want to kick "${t}" from the Guild?`))try{await updateDoc(doc(db,"teams",v.id),{members:arrayRemove(e)}),alert(`Successfully kicked "${t}" from the Guild.`),window.renderGuildSystemModalContent()}catch(o){alert("Failed to kick member: "+o.message)}}};window.legacyRenderGuildSystemModalContent=async function(){const e=$("mGuildSystemModal"),t=$("guildSystemModalContent");if(!e||!t||e.classList.contains("hidden"))return;const o=userProfile;if(o)if((v||_==="crates")&&!lo){let i=v?`
      <button onclick="window.switchGuildTab('overview')" class="w-full text-left px-4 py-3.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-3 transition-all duration-200 ${_==="overview"?"bg-gradient-to-r from-gold to-yellow-600 text-bg shadow-[0_4px_12px_rgba(240,192,64,0.25)]":"text-t3 hover:text-white hover:bg-white/5"}">
        <i class="fas fa-eye text-sm"></i> Overview
      </button>
      <button onclick="window.switchGuildTab('members')" class="w-full text-left px-4 py-3.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-3 transition-all duration-200 ${_==="members"?"bg-gradient-to-r from-gold to-yellow-600 text-bg shadow-[0_4px_12px_rgba(240,192,64,0.25)]":"text-t3 hover:text-white hover:bg-white/5"}">
        <i class="fas fa-users-cog text-sm"></i> Members Online
      </button>
      <button onclick="window.switchGuildTab('rewards')" class="w-full text-left px-4 py-3.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-3 transition-all duration-200 ${_==="rewards"?"bg-gradient-to-r from-gold to-yellow-600 text-bg shadow-[0_4px_12px_rgba(240,192,64,0.25)]":"text-t3 hover:text-white hover:bg-white/5"}">
        <i class="fas fa-trophy text-sm"></i> Activity Rewards
      </button>
      <button onclick="window.switchGuildTab('events')" class="w-full text-left px-4 py-3.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-3 transition-all duration-200 ${_==="events"?"bg-gradient-to-r from-gold to-yellow-600 text-bg shadow-[0_4px_12px_rgba(240,192,64,0.25)]":"text-t3 hover:text-white hover:bg-white/5"}">
        <i class="fas fa-shield-halved text-sm"></i> Team Wars
      </button>
      <button onclick="window.switchGuildTab('crates')" class="w-full text-left px-4 py-3.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-3 transition-all duration-200 ${_==="crates"?"bg-gradient-to-r from-gold to-yellow-600 text-bg shadow-[0_4px_12px_rgba(240,192,64,0.25)]":"text-t3 hover:text-white hover:bg-white/5"}">
        <i class="fas fa-box-open text-sm ${_==="crates"?"text-bg":"text-yellow-400 animate-pulse"}"></i> Squad Crates & Boosts
      </button>
    `:`
      <button onclick="window.toggleGuildBrowser(true)" class="w-full text-left px-4 py-3.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-3 transition-all duration-200 text-t3 hover:text-white hover:bg-white/5">
        <i class="fas fa-users text-sm"></i> Find / Join Squad
      </button>
      <button onclick="window.openCreateGuildModal()" class="w-full text-left px-4 py-3.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-3 transition-all duration-200 text-t3 hover:text-white hover:bg-white/5">
        <i class="fas fa-plus text-sm"></i> Establish Squad
      </button>
      <button onclick="window.switchGuildTab('crates')" class="w-full text-left px-4 py-3.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-3 transition-all duration-200 bg-gradient-to-r from-gold to-yellow-600 text-bg shadow-[0_4px_12px_rgba(240,192,64,0.25)]">
        <i class="fas fa-box-open text-sm text-bg"></i> Squad Store & Crates
      </button>
    `,n="";if(_==="overview")n=`
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full overflow-hidden min-h-0">
          <!-- CENTER OVERVIEW: Crest logo & general level progress -->
          <div class="lg:col-span-7 flex flex-col justify-between bg-card/15 border border-bdr/20 rounded-2xl p-6 relative overflow-hidden min-h-0">
            <div class="absolute inset-0 bg-radial-gradient from-gold/5 via-transparent to-transparent pointer-events-none"></div>
            
            <div class="flex flex-col items-center text-center space-y-4 my-auto">
              <div class="relative group">
                <div class="absolute -inset-4 bg-gradient-to-r from-gold/30 via-yellow-500/20 to-orange-500/30 rounded-full blur-xl opacity-75 group-hover:opacity-100 transition duration-1000 animate-pulse"></div>
                <div class="relative w-36 h-36 bg-[#0e101f] border-2 border-gold rounded-full flex items-center justify-center shadow-2xl">
                  <span class="text-7xl filter drop-shadow-[0_4px_10px_rgba(240,192,64,0.4)] select-none">${v.logoUrl||"🦁"}</span>
                </div>
              </div>
              
              <div class="space-y-1">
                <h2 class="font-display text-2xl font-black text-white uppercase tracking-widest flex items-center justify-center gap-2">
                  ${v.name}
                  <span class="text-xs font-black bg-gold/10 border border-gold/30 text-gold px-2.5 py-1 rounded-lg">[${v.tag||"TEAM"}]</span>
                </h2>
                <div class="flex items-center justify-center gap-1.5 text-t3 text-[10px] font-mono">
                  <span>SQUAD ID: <strong class="text-white select-all font-bold">${v.id}</strong></span>
                  <button onclick="navigator.clipboard.writeText('${v.id}'); alert('Squad ID copied to clipboard! ✅')" class="hover:text-white transition cursor-pointer" title="Copy ID">
                    <i class="fas fa-copy"></i>
                  </button>
                </div>
              </div>

              <div class="flex items-center gap-4 bg-bg/80 border border-bdr/30 px-6 py-2.5 rounded-2xl shadow-lg">
                <div class="text-center px-4 border-r border-bdr/40">
                  <p class="text-[9px] text-t3 uppercase font-bold tracking-wider">Members</p>
                  <p class="font-black text-sm text-white mt-0.5 flex items-center gap-1">
                    <i class="fas fa-users text-gold text-xs"></i>
                    ${v.members?v.members.length:1} / 4
                  </p>
                </div>
                <div class="text-center px-4">
                  <p class="text-[9px] text-t3 uppercase font-bold tracking-wider">Lobby Voice</p>
                  <p class="font-black text-sm text-green-400 mt-0.5 flex items-center gap-1">
                    <span class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    Active
                  </p>
                </div>
              </div>

              <div class="w-full max-w-sm space-y-2 pt-2">
                <div class="flex items-center justify-between text-xs font-bold">
                  <span class="text-gold uppercase tracking-wider flex items-center gap-1.5">
                    <i class="fas fa-medal"></i> Squad Level ${v.level||1}
                  </span>
                  <span class="text-t2 font-mono">${v.xp||0} / 4200 XP</span>
                </div>
                <div class="w-full bg-bg border border-bdr/30 rounded-full h-3 overflow-hidden p-[2px]">
                  <div class="bg-gradient-to-r from-gold via-yellow-400 to-amber-500 h-full rounded-full shadow-[0_0_10px_rgba(240,192,64,0.4)]" style="width: ${Math.min(100,(v.xp||0)/4200*100)}%"></div>
                </div>
              </div>
            </div>

            <div class="bg-[#0e101d]/60 border border-bdr/20 p-3 rounded-xl flex items-center justify-between mt-2 flex-shrink-0">
              <div class="min-w-0">
                <p class="text-[8px] text-t3 uppercase font-bold tracking-widest">Squad Slogan</p>
                <p class="text-xs text-t2 font-medium truncate italic mt-0.5">"${v.description||"Play together, win together!"}"</p>
              </div>
              <button onclick="window.switchGuildTab('members')" class="text-[10px] font-bold text-gold hover:underline shrink-0 pl-3">
                Manage <i class="fas fa-arrow-right ml-1"></i>
              </button>
            </div>
          </div>

          <!-- RIGHT COLUMN: Mini Leaderboard / Weekly Rewards / Functional Feed -->
          <div class="lg:col-span-5 flex flex-col justify-between h-full space-y-4 overflow-hidden min-h-0">
            <div class="grid grid-cols-2 gap-3 flex-shrink-0">
              <button onclick="alert('🏆 Squad Activity Leaderboard:\\n\\nOur Squad is currently ranked #1 among active weekend challengers! Keep earning points to secure top tier weekly badges! 🥇')" class="py-2.5 bg-gradient-to-r from-[#181a30] to-[#121324] hover:from-[#212442] hover:to-[#171930] border border-gold/15 hover:border-gold/30 rounded-xl text-[10px] font-black uppercase tracking-wider text-white flex items-center justify-center gap-2 transition duration-200">
                <i class="fas fa-chart-line text-gold"></i> Activity Leaderboard
              </button>
              <button onclick="window.switchGuildTab('crates')" class="py-2.5 bg-gradient-to-r from-[#181a30] to-[#121324] hover:from-[#212442] hover:to-[#171930] border border-gold/15 hover:border-gold/30 rounded-xl text-[10px] font-black uppercase tracking-wider text-white flex items-center justify-center gap-2 transition duration-200">
                <i class="fas fa-shopping-bag text-gold"></i> Squad Store
              </button>
            </div>

            <!-- WEEKLY PROGRESS MILESTONES -->
            <div class="bg-card/25 border border-bdr/20 rounded-2xl p-4 space-y-3.5 flex-shrink-0">
              <div class="flex items-center justify-between">
                <h4 class="text-xs font-black uppercase text-white tracking-wider flex items-center gap-1.5">
                  <i class="fas fa-gift text-gold"></i> Squad Weekly Activity Rewards
                </h4>
                <span class="text-[9px] bg-gold/10 text-gold font-bold px-2 py-0.5 rounded border border-gold/20 font-mono">0 Points</span>
              </div>
              
              <div class="relative py-2 px-1">
                <div class="absolute left-0 right-0 top-1/2 h-1 bg-[#101222] border border-bdr/20 -translate-y-1/2 rounded-full"></div>
                <div class="relative flex justify-between">
                  <div class="flex flex-col items-center">
                    <button onclick="window.claimGuildMilestone('m500', 50)" class="relative z-10 w-11 h-11 rounded-lg bg-bg border border-gold/20 flex flex-col items-center justify-center hover:border-gold/60 transition cursor-pointer">
                      <i class="fas fa-ticket text-amber-500 text-sm"></i>
                      <span class="text-[8px] font-bold text-t2 mt-0.5">x15</span>
                    </button>
                    <span class="text-[9px] font-mono text-t3 mt-1.5 font-bold">500 pts</span>
                  </div>
                  <div class="flex flex-col items-center">
                    <button onclick="window.claimGuildMilestone('m1500', 100)" class="relative z-10 w-11 h-11 rounded-lg bg-bg border border-gold/20 flex flex-col items-center justify-center hover:border-gold/60 transition cursor-pointer">
                      <i class="fas fa-ticket text-amber-500 text-sm"></i>
                      <span class="text-[8px] font-bold text-t2 mt-0.5">x20</span>
                    </button>
                    <span class="text-[9px] font-mono text-t3 mt-1.5 font-bold">1500 pts</span>
                  </div>
                  <div class="flex flex-col items-center">
                    <button onclick="window.claimGuildMilestone('m2000', 150)" class="relative z-10 w-11 h-11 rounded-lg bg-bg border border-gold/20 flex flex-col items-center justify-center hover:border-gold/60 transition cursor-pointer">
                      <i class="fas fa-ticket text-amber-500 text-sm"></i>
                      <span class="text-[8px] font-bold text-t2 mt-0.5">x30</span>
                    </button>
                    <span class="text-[9px] font-mono text-t3 mt-1.5 font-bold">2000 pts</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- CHAT FEED PANEL -->
            <div class="flex-1 bg-[#0b0c16] border border-bdr/20 rounded-2xl flex flex-col overflow-hidden min-h-[160px]">
              <div class="px-4 py-2 bg-card/10 border-b border-bdr/20 flex items-center justify-between flex-shrink-0">
                <div class="flex items-center gap-1.5">
                  <span class="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                  <span class="text-[10px] font-bold uppercase tracking-wider text-t2">Guild Feed & Chat</span>
                </div>
                <span class="text-[8px] font-mono text-t3">Real-Time Sync</span>
              </div>
              
              <div id="guildChatLogsContainer" class="flex-1 p-3 overflow-y-auto space-y-2.5 text-[11px] scrollbar-thin">
                <div class="text-center text-t3 py-4">
                  <i class="fas fa-spinner animate-spin text-gold mr-1"></i> Loading Guild Feed...
                </div>
              </div>
              
              <div class="p-2 border-t border-bdr/20 bg-card/15 flex items-center gap-2 flex-shrink-0">
                <div class="relative flex-1">
                  <i class="far fa-comments absolute left-3 top-2.5 text-t3"></i>
                  <input id="guildChatInput" type="text" placeholder="Message your squad..." class="w-full bg-[#07080e] border border-bdr rounded-full pl-9 pr-4 py-2 text-xs text-white outline-none focus:border-gold/40 transition" />
                </div>
                <button id="btnSendGuildChat" class="w-8 h-8 rounded-full bg-gold hover:bg-[#e8b830] text-bg flex items-center justify-center transition active:scale-95 cursor-pointer flex-shrink-0">
                  <i class="fas fa-paper-plane text-xs"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      `;else if(_==="members")n=`
        <div class="flex flex-col h-full bg-card/10 border border-bdr/20 rounded-2xl p-4 overflow-hidden min-h-0">
          <div class="flex items-center justify-between pb-3 border-b border-bdr/20 flex-shrink-0">
            <div>
              <h4 class="text-xs font-black uppercase text-white tracking-wider">Guild Members List</h4>
              <p class="text-[9px] text-t3 mt-0.5">Manage squad rosters and invitation roles</p>
            </div>
            <div class="flex items-center gap-2">
              ${v.leaderId===userProfile.uid?`
                <button onclick="window.closeGuildsModal(); window.switchTab('Chat'); alert('Share your Guild ID to invite friends in the Global Feed! 🏆')" class="px-3 py-1.5 bg-gold hover:bg-[#e8b830] text-bg text-[10px] font-black uppercase rounded-lg transition cursor-pointer">
                  <i class="fas fa-plus"></i> Recruit Members
                </button>
                <button onclick="window.disbandGuild()" class="px-3 py-1.5 bg-red-500/10 hover:bg-red-500 border border-red-500/30 text-red hover:text-white text-[10px] font-black uppercase rounded-lg transition cursor-pointer">
                  <i class="fas fa-trash"></i> Disband Guild
                </button>
              `:`
                <button onclick="window.leaveGuild()" class="px-3 py-1.5 bg-red-500/10 hover:bg-red-500 border border-red-500/30 text-red hover:text-white text-[10px] font-black uppercase rounded-lg transition cursor-pointer">
                  <i class="fas fa-sign-out-alt"></i> Leave Guild
                </button>
              `}
            </div>
          </div>

          <div class="flex-1 overflow-y-auto mt-3 pr-1 scrollbar-thin">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="border-b border-bdr/10 text-[9px] text-t3 font-bold uppercase tracking-wider">
                  <th class="py-2.5 pl-3">Player</th>
                  <th class="py-2.5 text-center">Role</th>
                  <th class="py-2.5 text-center">Status</th>
                  <th class="py-2.5 text-right pr-3">Actions</th>
                </tr>
              </thead>
              <tbody id="guildMembersTableBody" class="text-xs">
                <tr>
                  <td colspan="4" class="py-8 text-center text-t3">
                    <i class="fas fa-spinner animate-spin text-gold mr-1"></i> Fetching roster details...
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      `,setTimeout(async()=>{const r=await window.fetchGuildMembers(v.members||[v.leaderId]),s=$("guildMembersTableBody");if(s){if(s.innerHTML="",r.length===0){s.innerHTML='<tr><td colspan="4" class="py-8 text-center text-t3">No member details retrieved.</td></tr>';return}r.forEach(d=>{const c=d.uid===v.leaderId,l=d.uid===userProfile.uid,u=document.createElement("tr");u.className="border-b border-bdr/10 hover:bg-white/[0.02] transition",u.innerHTML=`
            <td class="py-3 pl-3 flex items-center gap-2.5 min-w-0">
              <div class="w-8 h-8 rounded-full bg-gold/10 border border-gold/25 flex items-center justify-center text-sm font-bold text-gold flex-shrink-0 uppercase font-display">
                ${d.name?d.name.substring(0,2):"PL"}
              </div>
              <div class="min-w-0">
                <p class="font-bold text-white truncate flex items-center gap-1">
                  ${d.name||"Anonymous Player"}
                  ${l?'<span class="text-[8px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1 py-0.2 rounded">Me</span>':""}
                </p>
                <p class="text-[9px] text-t3 font-mono">@${d.handle||"player"}</p>
              </div>
            </td>
            <td class="py-3 text-center">
              <span class="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${c?"bg-gold/10 text-gold border border-gold/20":"bg-card border border-bdr/50 text-t2"}">
                ${c?"👑 Leader":"⚔️ Member"}
              </span>
            </td>
            <td class="py-3 text-center">
              <span class="inline-flex items-center gap-1.5 text-[10px] text-green-400 font-bold">
                <span class="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> Online
              </span>
            </td>
            <td class="py-3 text-right pr-3">
              ${c||l?"-":`
                ${v.leaderId===userProfile.uid?`
                  <button onclick="window.kickGuildMember('${d.uid}', '${d.name}')" class="px-2 py-1 bg-red-500/10 hover:bg-red text-red hover:text-white border border-red-500/20 text-[9px] font-black uppercase rounded-md transition cursor-pointer">
                    Kick
                  </button>
                `:"-"}
              `}
            </td>
          `,s.appendChild(u)})}},50);else if(_==="rewards")n=`
        <div class="flex flex-col h-full space-y-4 overflow-y-auto scrollbar-thin">
          <div class="bg-card/15 border border-bdr/20 rounded-2xl p-4 space-y-2">
            <h4 class="text-xs font-black uppercase text-white tracking-wider">How to Earn Guild Activity Points</h4>
            <p class="text-[11px] text-t3 leading-relaxed">
              Your Guild earns XP and activity points through active participation of its roster members across the ArenaX platform:
            </p>
            <ul class="space-y-1.5 text-[11px] text-t2 list-disc list-inside">
              <li><strong class="text-white">Daily Login:</strong> Earn +10 Points automatically for checking into your dashboard daily.</li>
              <li><strong class="text-white">Squad Tournaments:</strong> Earn +50 Points for every team registration submitted for active slots.</li>
              <li><strong class="text-white">Voice Lobbies:</strong> Earn +25 Points per 10 minutes spent coordinating in team voice rooms.</li>
              <li><strong class="text-white">Tournament Wins:</strong> Earn +200 Points for securing 1st place in official tournaments!</li>
            </ul>
          </div>

          <div class="bg-[#0b0c16] border border-bdr/20 rounded-2xl p-4 space-y-4">
            <h4 class="text-xs font-black uppercase text-gold tracking-wider flex items-center gap-1.5">
              <i class="fas fa-ticket-alt"></i> Available Claims & Vouchers
            </h4>
            
            <div class="space-y-3">
              <div class="p-3 bg-card/25 border border-bdr/20 rounded-xl flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-lg bg-gold/5 border border-gold/15 flex items-center justify-center text-gold text-lg">
                    <i class="fas fa-award"></i>
                  </div>
                  <div>
                    <h5 class="text-xs font-black text-white uppercase">Milestone 1 Vouchers (500 pts)</h5>
                    <p class="text-[10px] text-t3">Instant reward of 50 AX Coins directly to your active profile!</p>
                  </div>
                </div>
                <button onclick="window.claimGuildMilestone('m500', 50)" class="px-4 py-1.5 bg-gold hover:bg-[#e8b830] text-bg text-[10px] font-black uppercase rounded-lg transition cursor-pointer">
                  Claim 50 AX
                </button>
              </div>

              <div class="p-3 bg-card/25 border border-bdr/20 rounded-xl flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-lg bg-gold/5 border border-gold/15 flex items-center justify-center text-gold text-lg">
                    <i class="fas fa-star"></i>
                  </div>
                  <div>
                    <h5 class="text-xs font-black text-white uppercase">Milestone 2 Vouchers (1500 pts)</h5>
                    <p class="text-[10px] text-t3">Instant reward of 100 AX Coins directly to your active profile!</p>
                  </div>
                </div>
                <button onclick="window.claimGuildMilestone('m1500', 100)" class="px-4 py-1.5 bg-gold hover:bg-[#e8b830] text-bg text-[10px] font-black uppercase rounded-lg transition cursor-pointer">
                  Claim 100 AX
                </button>
              </div>

              <div class="p-3 bg-card/25 border border-bdr/20 rounded-xl flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-lg bg-gold/5 border border-gold/15 flex items-center justify-center text-gold text-lg">
                    <i class="fas fa-trophy"></i>
                  </div>
                  <div>
                    <h5 class="text-xs font-black text-white uppercase">Milestone 3 Vouchers (2000 pts)</h5>
                    <p class="text-[10px] text-t3">Instant reward of 150 AX Coins directly to your active profile!</p>
                  </div>
                </div>
                <button onclick="window.claimGuildMilestone('m2000', 150)" class="px-4 py-1.5 bg-gold hover:bg-[#e8b830] text-bg text-[10px] font-black uppercase rounded-lg transition cursor-pointer">
                  Claim 150 AX
                </button>
              </div>
            </div>
          </div>
        </div>
      `;else if(_==="events"){const r=(toursData||[]).filter(d=>d.teamType==="Team War");let s="";r.length===0?s=`
          <div class="col-span-full flex flex-col items-center justify-center text-center p-8 border border-bdr/20 bg-card/10 rounded-xl space-y-2">
            <i class="fas fa-skull text-3xl text-t3/40 animate-pulse"></i>
            <h5 class="text-xs font-bold text-white uppercase">No Team War Tournaments Active</h5>
            <p class="text-[10px] text-t3 max-w-sm">Administration has not posted any active Team War tournaments. Check back soon for the ultimate clash of squads!</p>
          </div>
        `:r.forEach(d=>{const c=userRegs[d.id];c&&c.status,c&&c.status;const l={upcoming:"Upcoming Match",live:"🔴 LIVE NOW",ended:"Ended",cancelled:"❌ Cancelled"};s+=`
            <div class="bg-card/30 border border-bdr/30 rounded-xl p-4 flex flex-col justify-between space-y-3 hover:border-gold/30 transition">
              <div class="flex justify-between items-start">
                <div>
                  <span class="text-[8px] bg-red/10 border border-red-500/20 text-red px-1.5 py-0.5 rounded font-black uppercase tracking-widest">🔥 TEAM WAR MATCH</span>
                  <h4 class="font-display text-sm font-black text-white uppercase mt-1 leading-tight">${d.name}</h4>
                  <p class="text-[9px] font-mono text-t3 mt-0.5"><i class="fas fa-award text-gold"></i> Prize: <strong class="text-gold">${d.prize||"TBD"}</strong></p>
                </div>
                <span class="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${d.status==="live"?"bg-red text-white animate-pulse":"bg-gold/10 text-gold border border-gold/25"}">
                  ${l[d.status]||d.status}
                </span>
              </div>
              
              <!-- Mini stats grid -->
              <div class="grid grid-cols-2 gap-2 bg-black/40 p-2.5 rounded-lg text-[10px] font-mono text-t2 border border-bdr/10">
                <div>Slots filled: <strong class="text-white">${d.registered||0}/${d.maxPlayers||32}</strong></div>
                <div>Entry Fee: <strong class="text-white">${d.entryFee||"Free"}</strong></div>
                <div>Date: <strong class="text-white">${d.date||"TBD"}</strong></div>
                <div>Time: <strong class="text-white">${d.time||"TBD"}</strong></div>
              </div>
              
              <div class="bg-gold/5 border border-gold/10 p-2 rounded-lg text-[9px] text-gold font-medium leading-relaxed">
                🛡️ <strong class="text-white">+100 Squad XP Awarded</strong> to your Squad roster upon filled registration & slot confirmation!
              </div>
              
              <div class="flex items-center gap-2 pt-1">
                <button onclick="window.closeGuildsModal(); window.openTournamentParticipationById('${d.id}')" class="flex-1 py-1.5 bg-[#181a30] hover:bg-[#212442] border border-bdr/40 text-t2 hover:text-white text-[10px] font-bold uppercase rounded-lg transition">
                  <i class="fas fa-users mr-1"></i> Slots
                </button>
                
                ${d.status==="upcoming"?`
                  <button onclick="window.closeGuildsModal(); window.openTournamentRegisterById('${d.id}')" class="flex-1 py-1.5 bg-gold hover:bg-[#e8b830] text-bg text-[10px] font-black uppercase rounded-lg transition">
                    <i class="fas fa-gamepad mr-1"></i> Participate
                  </button>
                `:""}
                
                ${d.status==="ended"?`
                  <button onclick="window.closeGuildsModal(); window.openTournamentLeaderboardById('${d.id}')" class="flex-1 py-1.5 bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-400 text-[10px] font-bold uppercase rounded-lg transition">
                    <i class="fas fa-poll mr-1"></i> Result
                  </button>
                `:""}
              </div>
            </div>
          `}),n=`
        <div class="flex flex-col h-full bg-card/10 border border-bdr/20 rounded-2xl p-4 overflow-hidden min-h-0">
          <div class="flex items-center justify-between pb-3 border-b border-bdr/20 flex-shrink-0">
            <div>
              <h4 class="text-xs font-black uppercase text-white tracking-wider">🔥 Elite Team War Matches</h4>
              <p class="text-[9px] text-t3 mt-0.5">Admin-posted squad vs squad battles. Earn extra EXP & climb the rankings!</p>
            </div>
            <span class="text-[10px] bg-red/10 border border-red-500/25 text-red px-2.5 py-0.5 rounded font-black uppercase tracking-widest animate-pulse">Exclusive Mode</span>
          </div>
          
          <div class="flex-1 overflow-y-auto mt-4 pr-1 scrollbar-thin">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              ${s}
            </div>
          </div>
        </div>
      `}else if(_==="crates"){const r=userProfile?userProfile.activeXpBooster:null,s=r&&r.expiresAt>Date.now(),d=s?Math.ceil((r.expiresAt-Date.now())/(3600*1e3)):0,c=userProfile?userProfile.activeSquadBoost:null,l=c&&c.expiresAt>Date.now(),u=l?Math.ceil((c.expiresAt-Date.now())/(3600*1e3)):0;n=`
        <div class="flex flex-col h-full space-y-4 overflow-y-auto pr-1 scrollbar-thin">
          <!-- Active Boosters Status Bar -->
          <div class="bg-gradient-to-r from-[#121324] via-[#0d0e1c] to-[#121324] border border-gold/30 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-lg">
            <div>
              <span class="text-[9px] text-gold font-mono uppercase font-bold tracking-widest">Active Equipment Status</span>
              <h4 class="text-xs font-black text-white uppercase mt-0.5">My Active Squad & XP Boosters</h4>
            </div>
            <div class="flex items-center gap-3">
              <div class="px-3 py-1.5 bg-black/40 border border-bdr/20 rounded-xl flex items-center gap-2">
                <i class="fas fa-bolt text-yellow-400 text-sm"></i>
                <div class="text-[10px]">
                  <span class="text-t3 block text-[8px] uppercase">XP Booster</span>
                  <strong class="${s?"text-emerald-400":"text-t3"} font-bold">
                    ${s?`2x Active (${d}h left)`:"Inactive"}
                  </strong>
                </div>
              </div>
              <div class="px-3 py-1.5 bg-black/40 border border-bdr/20 rounded-xl flex items-center gap-2">
                <i class="fas fa-shield-halved text-emerald-400 text-sm"></i>
                <div class="text-[10px]">
                  <span class="text-t3 block text-[8px] uppercase">Squad Boost</span>
                  <strong class="${l?"text-emerald-400":"text-t3"} font-bold">
                    ${l?`+25% Active (${u}h left)`:"Inactive"}
                  </strong>
                </div>
              </div>
            </div>
          </div>

          <!-- Hero Mystery Crate Opening Box -->
          <div class="bg-gradient-to-br from-[#1b1d36] via-[#111222] to-[#0a0b14] border-2 border-gold/40 rounded-2xl p-5 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 shadow-[0_0_40px_rgba(240,192,64,0.15)]">
            <div class="space-y-2 text-center md:text-left z-10">
              <span class="px-2.5 py-0.5 bg-gold/15 border border-gold/30 text-gold text-[9px] font-black uppercase rounded-full tracking-widest">
                <i class="fas fa-gem"></i> MYSTERY GACHA CRATE
              </span>
              <h3 class="font-display text-xl font-black text-white uppercase tracking-wider">
                Squad Mystery Crate
              </h3>
              <p class="text-[11px] text-t3 max-w-md leading-relaxed">
                Test your luck! Click below to trigger the crate opening video (<strong class="text-gold">crate.mp4</strong>) and win <strong class="text-white">Squad Boosts</strong>, <strong class="text-white">AX Coin Packs</strong>, or <strong class="text-white">24h XP Boosters</strong>!
              </p>
              <div class="pt-2 flex flex-wrap items-center justify-center md:justify-start gap-3">
                <button onclick="window.startSquadCrateOpening()" class="px-6 py-3 bg-gradient-to-r from-gold via-yellow-400 to-amber-500 hover:from-yellow-400 hover:to-amber-600 text-bg text-xs font-black uppercase tracking-widest rounded-xl shadow-[0_4px_20px_rgba(240,192,64,0.4)] transition cursor-pointer flex items-center gap-2">
                  <i class="fas fa-box-open text-sm"></i> OPEN CRATE (50 AX)
                </button>
                <span class="text-[10px] text-t3 font-mono">Cost: 50 AX Coins per spin</span>
              </div>
            </div>

            <div class="relative group shrink-0 my-2 z-10">
              <div class="absolute -inset-4 bg-gold/25 rounded-full blur-xl group-hover:bg-gold/40 transition"></div>
              <div class="relative w-32 h-32 bg-card/60 border-2 border-gold rounded-2xl flex flex-col items-center justify-center text-gold shadow-2xl cursor-pointer hover:scale-105 transition" onclick="window.startSquadCrateOpening()">
                <i class="fas fa-box-open text-5xl drop-shadow-[0_0_15px_rgba(240,192,64,0.8)] animate-pulse"></i>
                <span class="text-[9px] font-black uppercase tracking-widest text-white mt-2">CLICK TO OPEN</span>
              </div>
            </div>
          </div>

          <!-- Items Showcase Grid -->
          <div class="space-y-3">
            <h4 class="text-xs font-black uppercase text-white tracking-wider flex items-center gap-2">
              <i class="fas fa-store text-gold"></i> Crate Drop Items & Direct Boost Shop
            </h4>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <!-- Item 1: Squad Boost -->
              <div class="p-4 bg-card/20 border border-bdr/30 rounded-xl flex items-center justify-between hover:border-emerald-500/40 transition">
                <div class="flex items-center gap-3">
                  <div class="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-2xl shrink-0">
                    <i class="fas fa-shield-halved"></i>
                  </div>
                  <div>
                    <div class="flex items-center gap-2">
                      <h5 class="text-xs font-black text-white uppercase">Squad Boost (+25%)</h5>
                      <span class="px-1.5 py-0.5 rounded text-[8px] font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 uppercase">EPIC DROP</span>
                    </div>
                    <p class="text-[10px] text-t3 mt-0.5 leading-tight">+25% Squad activity points & team tournament XP multiplier for 48h.</p>
                  </div>
                </div>
                <button onclick="window.buySquadItem('squad_boost', 100)" class="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black uppercase rounded-lg transition shrink-0 ml-2 cursor-pointer">
                  100 AX
                </button>
              </div>

              <!-- Item 2: AX Coin Pack -->
              <div class="p-4 bg-card/20 border border-bdr/30 rounded-xl flex items-center justify-between hover:border-gold/40 transition">
                <div class="flex items-center gap-3">
                  <div class="w-12 h-12 rounded-xl bg-gold/10 border border-gold/30 flex items-center justify-center text-gold text-2xl shrink-0">
                    <i class="fas fa-coins"></i>
                  </div>
                  <div>
                    <div class="flex items-center gap-2">
                      <h5 class="text-xs font-black text-white uppercase">AX Coin Pack</h5>
                      <span class="px-1.5 py-0.5 rounded text-[8px] font-bold bg-gold/15 border border-gold/30 text-gold uppercase">WIN 50 - 500 AX</span>
                    </div>
                    <p class="text-[10px] text-t3 mt-0.5 leading-tight">Win up to 500 AX Coins instantly deposited into your balance!</p>
                  </div>
                </div>
                <button onclick="window.startSquadCrateOpening()" class="px-3 py-1.5 bg-gold hover:bg-[#e8b830] text-bg text-[10px] font-black uppercase rounded-lg transition shrink-0 ml-2 cursor-pointer">
                  Win Crate
                </button>
              </div>

              <!-- Item 3: XP Booster (1h) -->
              <div class="p-4 bg-card/20 border border-bdr/30 rounded-xl flex items-center justify-between hover:border-amber-500/40 transition">
                <div class="flex items-center gap-3">
                  <div class="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 text-2xl shrink-0">
                    <i class="fas fa-bolt"></i>
                  </div>
                  <div>
                    <div class="flex items-center gap-2">
                      <h5 class="text-xs font-black text-white uppercase">XP Booster (1h)</h5>
                      <span class="px-1.5 py-0.5 rounded text-[8px] font-bold bg-amber-500/15 border border-amber-500/30 text-amber-400 uppercase">RARE DROP</span>
                    </div>
                    <p class="text-[10px] text-t3 mt-0.5 leading-tight">2x XP Multiplier active across all matches & lobbies for 1 hour.</p>
                  </div>
                </div>
                <button onclick="window.buySquadItem('xp_1h', 30)" class="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-bg text-[10px] font-black uppercase rounded-lg transition shrink-0 ml-2 cursor-pointer">
                  30 AX
                </button>
              </div>

              <!-- Item 4: XP Booster (24h) -->
              <div class="p-4 bg-card/20 border border-bdr/30 rounded-xl flex items-center justify-between hover:border-yellow-400/50 transition">
                <div class="flex items-center gap-3">
                  <div class="w-12 h-12 rounded-xl bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center text-yellow-300 text-2xl shrink-0">
                    <i class="fas fa-bolt-lightning"></i>
                  </div>
                  <div>
                    <div class="flex items-center gap-2">
                      <h5 class="text-xs font-black text-white uppercase">XP Booster (24h)</h5>
                      <span class="px-1.5 py-0.5 rounded text-[8px] font-bold bg-yellow-400/20 border border-yellow-400/40 text-yellow-300 uppercase">LEGENDARY</span>
                    </div>
                    <p class="text-[10px] text-t3 mt-0.5 leading-tight">2x XP Multiplier active across all matches & lobbies for a full 24 hours.</p>
                  </div>
                </div>
                <button onclick="window.buySquadItem('xp_24h', 120)" class="px-3 py-1.5 bg-yellow-400 hover:bg-yellow-500 text-bg text-[10px] font-black uppercase rounded-lg transition shrink-0 ml-2 cursor-pointer">
                  120 AX
                </button>
              </div>
            </div>
          </div>
        </div>
      `}t.innerHTML=`
      <!-- Dashboard Header -->
      <div class="p-4 border-b border-bdr/40 flex items-center justify-between bg-card/60 flex-shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-gold/10 text-gold border border-gold/25 flex items-center justify-center text-lg font-black font-mono">
            ${v?v.logoUrl||"🦁":"🎁"}
          </div>
          <div>
            <div class="flex items-center gap-1.5">
              ${v?`<span class="text-[9px] bg-gold/10 text-gold font-bold px-1.5 py-0.5 rounded border border-gold/20 font-mono">Lv. ${v.level||1}</span>`:""}
              <h3 class="font-display text-sm font-black text-white uppercase tracking-wider">${v?v.name:"Squad Store & Mystery Crates"}</h3>
            </div>
            <p class="text-[9px] text-t3 font-mono">${v?"My Active Tournament Squad":"Exclusive Boosts & Crate Drops"}</p>
          </div>
        </div>
        
        <div class="flex items-center gap-2 bg-[#090a12] border border-bdr/30 px-3 py-1.5 rounded-full shrink-0">
          <i class="fas fa-coins text-gold text-xs"></i>
          <span class="text-xs font-black text-white font-mono">${(o.balance||0).toLocaleString()} AX</span>
          <button onclick="window.closeGuildsModal(); window.switchTab('Wallet')" class="text-gold hover:text-white text-[10px] ml-1 cursor-pointer" title="Recharge wallet">
            <i class="fas fa-plus-circle"></i>
          </button>
        </div>

        <div class="flex items-center gap-3">
          <button onclick="window.toggleGuildBrowser(true)" class="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 border border-bdr/40 text-t2 hover:text-white text-[9px] font-black uppercase rounded-lg transition flex items-center gap-1.5 cursor-pointer">
            <i class="fas fa-globe"></i> Squad List >>
          </button>
          <button onclick="alert('❓ Squad & Teams FAQ:\\n- Team creation costs 500 AX.\\n- Max limit is 4 players.\\n- Complete tournament participations to level up!')" class="text-t3 hover:text-white transition cursor-pointer text-xs flex items-center gap-1">
            <i class="fas fa-question-circle"></i> SQUAD
          </button>
          <button onclick="window.closeGuildsModal()" class="text-t3 hover:text-white transition cursor-pointer text-sm w-8 h-8 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center">
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>

      <!-- Dashboard Body Layout -->
      <div class="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 overflow-hidden min-h-0">
        <div class="lg:col-span-3 flex flex-col gap-2.5 pr-2 border-r border-bdr/10 overflow-y-auto scrollbar-none">
          ${i}
        </div>
        
        <div class="lg:col-span-9 h-full overflow-hidden min-h-0">
          ${n}
        </div>
      </div>
    `,_==="overview"&&v&&(window.listenToGuildChat(v.id),setTimeout(()=>{const r=$("btnSendGuildChat"),s=$("guildChatInput");r&&s&&(r.addEventListener("click",window.sendGuildChatMessage),s.addEventListener("keydown",d=>{d.key==="Enter"&&window.sendGuildChatMessage()}))},50))}else t.innerHTML=`
      <div class="p-4 border-b border-bdr/40 flex items-center justify-between bg-card/60 flex-shrink-0">
        <div class="flex items-center gap-2">
          <i class="fas fa-users text-gold text-lg"></i>
          <h3 class="font-display text-sm font-black text-white uppercase tracking-wider">🛡️ Guild & Teams Hub</h3>
        </div>
        
        <div class="flex items-center gap-3">
          ${v?`
            <button onclick="window.toggleGuildBrowser(false)" class="px-2.5 py-1.5 bg-gold/10 hover:bg-gold/20 border border-gold/30 text-gold text-[9px] font-black uppercase rounded-lg transition flex items-center gap-1.5 cursor-pointer">
              << My Guild Dashboard
            </button>
          `:""}
          <button onclick="window.closeGuildsModal()" class="text-t3 hover:text-white transition cursor-pointer text-sm w-8 h-8 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center">
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>

      <div class="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 overflow-hidden min-h-0">
        <div class="lg:col-span-7 flex flex-col h-full min-h-0 space-y-3">
          <div class="flex flex-wrap items-center justify-between gap-2.5">
            <button id="btnCreateGuildTrigger" onclick="window.openCreateGuildModal()" class="px-3 py-2 bg-gold hover:bg-[#e8b830] text-bg text-[11px] font-black uppercase rounded-lg transition active:scale-[0.98] cursor-pointer flex items-center gap-1.5">
              <i class="fas fa-plus"></i> Create Guild <span class="bg-black/10 text-black px-1.5 py-0.2 rounded text-[9px]">500 AX</span>
            </button>
            
            <div class="flex items-center gap-2 flex-1 max-w-sm ml-auto">
              <div class="relative flex-1">
                <i class="fas fa-search absolute left-3 top-2.5 text-t3 text-xs"></i>
                <input id="guildSearchInput" oninput="window.renderGuildsListUI()" type="text" placeholder="Search by name, tag, or leader..." class="w-full bg-card border border-bdr rounded-xl pl-9 pr-4 py-2 text-xs text-white outline-none focus:border-gold/50 transition" />
              </div>
            </div>
          </div>

          <div class="grid grid-cols-12 px-3 py-1.5 bg-card/20 rounded-lg text-[10px] text-t3 font-bold uppercase tracking-wider border border-bdr/20">
            <div class="col-span-5 flex items-center">Guild Info</div>
            <div class="col-span-2 text-center">Level</div>
            <div class="col-span-2 text-center">Members</div>
            <div class="col-span-3 text-right">Slogan Type</div>
          </div>

          <div id="guildsRowsContainer" class="flex-1 overflow-y-auto space-y-2 pr-1 min-h-0">
            <!-- Populated dynamically -->
          </div>
        </div>

        <div id="guildDetailsPanel" class="lg:col-span-5 flex flex-col h-full bg-[#111322] border border-bdr/60 rounded-xl p-4 overflow-y-auto space-y-4">
          <!-- Populated dynamically -->
        </div>
      </div>
    `,setTimeout(()=>{window.renderGuildsListUI(),window.renderSelectedGuildDetailsUI()},10)};function ua(){const e=$("guildsRowsContainer");if(!e)return;e.innerHTML="";const t=$("guildSearchInput"),o=t?t.value.trim().toLowerCase():"",i=se.filter(n=>o?n.name.toLowerCase().includes(o)||n.tag&&n.tag.toLowerCase().includes(o)||n.leaderName&&n.leaderName.toLowerCase().includes(o)||n.id.toLowerCase().includes(o):!0);if(i.length===0){e.innerHTML=`
      <div class="p-8 text-center text-t3 text-xs bg-card/10 border border-bdr/20 rounded-xl mt-4">
        <i class="fas fa-shield-alt text-lg text-t3/40 mb-2 block animate-pulse"></i>
        No guilds found matching your search.
      </div>
    `;return}i.forEach(n=>{const r=ue&&ue.id===n.id,s=v&&v.id===n.id,d=(n.members||[]).length,c=document.createElement("div");c.className=`grid grid-cols-12 px-3 py-3 rounded-xl border items-center transition cursor-pointer hover:scale-[1.01] ${r?"bg-[#1b1e32] border-gold/40 shadow-[0_0_15px_rgba(192,160,48,0.08)] text-white":"bg-card/40 hover:bg-card/75 border-bdr/30 text-t2 hover:text-white"}`;const l=document.createElement("div");l.className="col-span-5 flex items-center gap-3 min-w-0";const u=document.createElement("div");u.className="w-9 h-9 rounded-lg bg-gold/10 text-gold border border-gold/20 flex items-center justify-center text-base flex-shrink-0",u.textContent=n.logoUrl||"🔥";const p=document.createElement("div");p.className="min-w-0";const f=document.createElement("p");f.className="font-bold text-xs truncate flex items-center gap-1.5 text-white",f.innerHTML=`${n.name} <span class="text-[9px] bg-gold/10 text-gold px-1 py-0.5 rounded border border-gold/20 font-mono">[${n.tag||"TEAM"}]</span>`;const b=document.createElement("p");b.className="text-[10px] text-t3 truncate mt-0.5",b.textContent=`Leader: ${n.leaderName||"Admin"}`,p.appendChild(f),p.appendChild(b),l.appendChild(u),l.appendChild(p),c.appendChild(l);const g=document.createElement("div");g.className="col-span-2 text-center text-xs font-bold font-mono",g.innerHTML=`<span class="text-gold">Lv.</span> ${n.level||1}`,c.appendChild(g);const w=document.createElement("div");w.className="col-span-2 text-center text-xs font-medium font-mono text-t2",w.innerHTML=`<i class="fas fa-user text-[10px] text-t3 mr-1"></i>${d}`,c.appendChild(w);const h=document.createElement("div");h.className="col-span-3 text-right text-[10px] font-bold uppercase tracking-wider text-t3",s?h.innerHTML='<span class="bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[9px]">My Guild</span>':h.textContent=n.type||"CASUAL",c.appendChild(h),c.addEventListener("click",()=>{ue=n,ua(),mn()}),e.appendChild(c)})}function mn(){const e=$("guildDetailsPanel");if(!e)return;e.innerHTML="";let t=ue;if(!t&&se.length>0&&(t=se[0],ue=t),!t){e.innerHTML=`
      <div class="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-3 h-full">
        <div class="w-14 h-14 rounded-full bg-gold/5 border border-gold/15 flex items-center justify-center text-gold/40 text-2xl animate-pulse">
          <i class="fas fa-shield-alt"></i>
        </div>
        <div class="space-y-1">
          <h4 class="font-display text-xs font-black text-white uppercase tracking-wider">No Guild Selected</h4>
          <p class="text-[10px] text-t3 leading-relaxed max-w-[240px] mx-auto">
            Select a team from the list to view its active details, requirements, level progression, and rosters! Or click "Create Guild" to establish your own.
          </p>
        </div>
      </div>
    `;return}const o=t.leaderId===(userProfile&&userProfile.uid),i=t.members&&t.members.includes(userProfile&&userProfile.uid),n=o||i,r=t.level||1,s=t.xp||0,d=r*100,c=(r-1)*100,l=d-c,u=s-c,p=Math.min(100,Math.max(0,u/l*100));if(e.innerHTML=`
    <!-- Top Details Card -->
    <div class="flex items-center gap-3 bg-card/25 border border-bdr/20 p-3.5 rounded-xl">
      <div class="w-12 h-12 bg-gold/10 text-gold border border-gold/20 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
        ${t.logoUrl||"🔥"}
      </div>
      <div class="min-w-0 flex-1">
        <div class="flex items-center justify-between gap-2">
          <h3 class="font-display text-sm font-black text-white uppercase tracking-wider truncate flex-1">${t.name}</h3>
          <span class="text-[9px] font-bold font-mono text-gold bg-gold/10 border border-gold/20 px-1.5 py-0.5 rounded uppercase">[${t.tag||"TEAM"}]</span>
        </div>
        <p class="text-[10px] text-t3 font-mono mt-0.5">ID: <span class="text-t2">${t.id}</span></p>
      </div>
    </div>

    <!-- Stats Panel -->
    <div class="grid grid-cols-2 gap-3.5">
      <div class="bg-card/25 border border-bdr/20 p-3 rounded-xl flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg bg-gold/5 text-gold flex items-center justify-center text-sm border border-gold/15">
          <i class="fas fa-crown"></i>
        </div>
        <div class="min-w-0 flex-1">
          <p class="text-[9px] text-t3 uppercase font-bold tracking-wider">Leader</p>
          <p class="font-bold text-xs text-white truncate mt-0.5">${t.leaderName||"Admin"}</p>
        </div>
      </div>

      <div class="bg-card/25 border border-bdr/20 p-3 rounded-xl flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg bg-blue-500/5 text-blue-400 flex items-center justify-center text-sm border border-blue-500/15">
          <i class="fas fa-user-friends"></i>
        </div>
        <div>
          <p class="text-[9px] text-t3 uppercase font-bold tracking-wider">Members</p>
          <p class="font-bold text-xs text-white mt-0.5">${(t.members||[]).length} / 30</p>
        </div>
      </div>
    </div>

    <!-- XP / Level Progress -->
    <div class="bg-card/20 border border-bdr/20 p-3.5 rounded-xl space-y-2">
      <div class="flex items-center justify-between text-xs">
        <div class="flex items-center gap-1.5 font-bold">
          <i class="fas fa-star text-gold"></i>
          <span class="text-white">GUILD LEVEL:</span>
          <span class="text-gold font-mono">${r}</span>
        </div>
        <span class="text-[10px] font-mono text-t3">${s} / ${d} XP</span>
      </div>
      <div class="w-full bg-bg border border-bdr/40 rounded-full h-2.5 overflow-hidden">
        <div class="bg-gradient-to-r from-gold to-[#f0c040] h-full rounded-full shadow-[0_0_8px_rgba(240,192,64,0.3)]" style="width: ${p}%"></div>
      </div>
      <p class="text-[9px] text-t3 leading-relaxed mt-1">Earn 50 XP per filled tournament registration squad. Next level increases squad capabilities!</p>
    </div>

    <!-- Description Slogan -->
    <div class="bg-card/15 border border-bdr/10 p-3.5 rounded-xl space-y-1.5 relative">
      <div class="flex items-center justify-between">
        <label class="text-[9px] text-t3 uppercase font-bold tracking-wider">Guild Slogan / Motto</label>
        ${o?`
          <button id="btnEditSlogan" class="text-gold hover:text-white text-[10px] flex items-center gap-1 cursor-pointer">
            <i class="fas fa-edit"></i> Edit
          </button>
        `:""}
      </div>
      <p id="sloganTextContainer" class="text-xs text-t2 italic font-medium leading-relaxed">"${t.description||"No slogan set."}"</p>
    </div>

    <!-- Joining Requirements -->
    <div class="bg-card/15 border border-bdr/10 p-3.5 rounded-xl space-y-1.5 relative flex-1 flex flex-col min-h-[120px]">
      <div class="flex items-center justify-between flex-shrink-0">
        <label class="text-[9px] text-t3 uppercase font-bold tracking-wider">Joining Requirements</label>
        ${o?`
          <button id="btnEditRequirements" class="text-gold hover:text-white text-[10px] flex items-center gap-1 cursor-pointer">
            <i class="fas fa-edit"></i> Edit
          </button>
        `:""}
      </div>
      <div class="flex-1 overflow-y-auto max-h-[120px] scrollbar-thin text-xs text-t2 leading-relaxed">
        <p id="requirementsTextContainer" class="whitespace-pre-line">${t.requirements||"No special requirements specified. Anyone is welcome to apply!"}</p>
      </div>
    </div>

    <!-- CTA Join Request Buttons -->
    <div class="pt-2 border-t border-bdr/30 flex-shrink-0">
      ${n?`
        ${o?`
          <p class="text-[10px] text-center text-gold font-bold uppercase tracking-wider py-2 border border-gold/10 rounded-xl bg-gold/5">
            👑 You are the Leader of this Guild
          </p>
        `:`
          <div class="flex flex-col gap-2">
            <p class="text-[10px] text-center text-emerald-400 font-bold uppercase tracking-wider py-1 border border-emerald-500/10 rounded-xl bg-emerald-500/5">
              🛡️ Active Guild Member
            </p>
            <button id="btnLeaveGuild" class="w-full py-2 bg-red/10 hover:bg-red/20 border border-red/20 hover:border-red/40 text-red text-xs font-bold uppercase rounded-xl transition cursor-pointer">
              Leave Guild
            </button>
          </div>
        `}
      `:`
        ${v?`
          <p class="text-[10px] text-center text-t3 leading-relaxed px-4 py-2 bg-card/15 border border-bdr/20 rounded-xl">
            You are already a member of <strong class="text-white">[${v.tag}] ${v.name}</strong>. Please leave your current guild to join another.
          </p>
        `:`
          <button id="btnRequestToJoinGuild" class="w-full py-3 bg-gold hover:bg-[#e8b830] text-bg text-xs font-black uppercase rounded-xl transition active:scale-[0.98] cursor-pointer shadow-[0_4px_15px_rgba(240,192,64,0.15)] flex items-center justify-center gap-2">
            <i class="fas fa-door-open"></i> Request to Join Guild
          </button>
        `}
      `}
    </div>
  `,!n&&!v){const f=$("btnRequestToJoinGuild");f&&f.addEventListener("click",()=>{pa()})}o&&($("btnEditSlogan").addEventListener("click",async()=>{const f=prompt("Enter new Guild slogan/motto:",t.description||"");if(f!==null){if(!f.trim()){alert("Slogan cannot be empty.");return}try{await updateDoc(doc(db,"teams",t.id),{description:f.trim()}),alert("Guild slogan updated! 🛡️")}catch(b){alert("Failed to update slogan: "+b.message)}}}),$("btnEditRequirements").addEventListener("click",async()=>{const f=prompt("Enter new Guild joining requirements:",t.requirements||"");if(f!==null){if(!f.trim()){alert("Requirements cannot be empty.");return}try{await updateDoc(doc(db,"teams",t.id),{requirements:f.trim()}),alert("Guild joining requirements updated! 🛡️")}catch(b){alert("Failed to update requirements: "+b.message)}}})),!o&&i&&$("btnLeaveGuild").addEventListener("click",async()=>{if(confirm(`Are you sure you want to leave the guild "${t.name}"?`))try{await updateDoc(doc(db,"teams",t.id),{members:arrayRemove(userProfile.uid)}),alert(`You successfully left the guild "${t.name}".`)}catch(f){alert("Failed to leave guild: "+f.message)}})}function bn(){if(guestProfile){alert("Please log in or register a profile to access the Guilds & Teams Hub!");return}$("mGuildSystemModal").classList.remove("hidden"),Ve()}function pa(){$("joinRequestOptionalMsg").value="",$("mTeamJoinRequestMsgModal").classList.remove("hidden")}window.acceptTeamJoinRequest=async function(e,t,o,i,n){n&&(n.disabled=!0,n.textContent="Accepting...");try{const r=doc(db,"teams",o),s=await getDoc(r);if(!s.exists()){alert("This team/guild no longer exists.");return}const d=s.data();if(d.members&&d.members.length>=4){alert("This squad is already full (4 members max)!");return}await updateDoc(r,{members:arrayUnion(t)});const c=doc(db,"users",userProfile.uid,"mails",e);await updateDoc(c,{status:"accepted",read:!0});const l=collection(db,"users",t,"mails");await addDoc(l,{type:"team_join_confirm",sender:"Guild Admin",title:"Guild Request Accepted! 🎉",body:`Congratulations! Your request to join the Guild "${i}" has been accepted by the Guild Leader.`,teamId:o,teamName:i,createdAt:serverTimestamp()}),alert(`🎉 Successfully accepted! User has been added to "${i}".`),typeof window.renderInboxUI=="function"&&window.renderInboxUI()}catch(r){alert("Failed to accept join request: "+r.message),n&&(n.disabled=!1,n.textContent="Accept")}};window.declineTeamJoinRequest=async function(e,t,o,i,n){n&&(n.disabled=!0,n.textContent="Declining...");try{const r=doc(db,"users",userProfile.uid,"mails",e);await updateDoc(r,{status:"declined",read:!0});const s=collection(db,"users",t,"mails");await addDoc(s,{type:"team_join_decline",sender:"Guild Admin",title:"Guild Request Declined",body:`We regret to inform you that your request to join the Guild "${i}" was declined by the Guild Leader.`,teamId:o,teamName:i,createdAt:serverTimestamp()}),alert("Request declined successfully."),typeof window.renderInboxUI=="function"&&window.renderInboxUI()}catch(r){alert("Failed to decline request: "+r.message),n&&(n.disabled=!1,n.textContent="Decline")}};window.joinTournamentViaInvite=async function(e,t,o,i,n){if(userProfile){n&&(n.disabled=!0,n.textContent="Joining...");try{const r=doc(db,"tournament_registrations",o,"teamMembers",userProfile.uid);await setDoc(r,{userId:userProfile.uid,userName:userProfile.name,joinedAt:serverTimestamp()});const s=doc(db,"users",userProfile.uid,"mails",e);await updateDoc(s,{status:"joined",read:!0}),await window.checkAndAwardTeamXP(t,o,userProfile.uid),alert(`🎉 Successfully joined your Guild squad for the tournament "${i}"!`),typeof window.renderInboxUI=="function"&&window.renderInboxUI()}catch(r){alert("Failed to join tournament: "+r.message),n&&(n.disabled=!1,n.textContent="Join Tournament")}}};window.checkAndAwardTeamXP=async function(e,t,o){const i=doc(db,"teams",e,"tournamentParticipations",t),n=doc(db,"teams",e);try{await runTransaction(db,async r=>{const s=await r.get(i);if(!s.exists())return;const d=s.data();if(d.xpAwarded)return;const c=d.joinedMembers||[];c.includes(o)||c.push(o);const u=(d.invitedMembers||[]).every(f=>c.includes(f)),p=c.length+1>=4;if((u||p)&&!d.xpAwarded){const f=await r.get(n);if(f.exists()){const g=f.data().xp||0;let w=50;const h=(toursData||[]).find(A=>A.id===t);h&&h.teamType==="Team War"&&(w=100);const M=g+w,L=Math.floor(M/100)+1;r.update(n,{xp:M,level:L}),r.update(i,{joinedMembers:c,xpAwarded:!0})}}else r.update(i,{joinedMembers:c})})}catch(r){throw console.error("Error in checkAndAwardTeamXP transaction: ",r),r}};window.openTournamentParticipationById=function(e){const t=toursData.find(o=>o.id===e);t&&openTournamentParticipation(t)};window.openTournamentRegisterById=function(e){const t=toursData.find(o=>o.id===e);t&&handleTourCardClick(t)};window.openTournamentLeaderboardById=function(e){const t=toursData.find(o=>o.id===e);t&&openTournamentLeaderboard(t)};const fi=$("btnHubGuilds");fi&&fi.addEventListener("click",()=>{typeof window.closeRedReportHubDrawer=="function"&&window.closeRedReportHubDrawer(),bn()});const mi=$("bCloseGuildsSystem");mi&&mi.addEventListener("click",()=>{$("mGuildSystemModal")&&$("mGuildSystemModal").classList.add("hidden"),Ke&&(Ke(),Ke=null)});const bi=$("guildSearchInput");bi&&bi.addEventListener("input",()=>{ua()});const gi=$("btnCreateGuildTrigger");gi&&gi.addEventListener("click",()=>{if(v){alert("You are already in a guild! You must leave your current guild to create a new one.");return}$("cgName")&&($("cgName").value=""),$("cgTag")&&($("cgTag").value=""),$("cgDesc")&&($("cgDesc").value=""),$("cgRequirements")&&($("cgRequirements").value=""),$("mCreateGuild")&&$("mCreateGuild").classList.remove("hidden")});const wi=$("bCloseCreateGuild");wi&&wi.addEventListener("click",()=>{$("mCreateGuild")&&$("mCreateGuild").classList.add("hidden")});const Oe=$("btnSubmitCreateGuild");Oe&&Oe.addEventListener("click",async()=>{if(!userProfile){alert("You must be logged in to establish a Guild!");return}if(v){alert("You are already in a guild!");return}const e=500,t=userProfile.balance||0;if(t<e){alert(`Insufficient AX Coins! Establishing a Guild costs 500 AX. You currently have ${t} AX.`);return}const o=$("cgName")?$("cgName").value.trim():"",i=$("cgTag")?$("cgTag").value.trim().toUpperCase():"",n=$("cgLogo")?$("cgLogo").value:"",r=$("cgType")?$("cgType").value:"",s=$("cgDesc")?$("cgDesc").value.trim():"",d=$("cgRequirements")?$("cgRequirements").value.trim():"";if(!o||!i||!s||!d){alert("Please fill out all required fields to establish your Guild!");return}if(i.length>5){alert("Guild Tag must be maximum 5 characters.");return}Oe.disabled=!0,Oe.textContent="Establishing...";try{const c=await addDoc(collection(db,"teams"),{name:o,tag:i,logoUrl:n,type:r,description:s,requirements:d,leaderId:userProfile.uid,leaderName:userProfile.name,members:[userProfile.uid],xp:0,level:1,createdAt:serverTimestamp()}),l=doc(db,"users",userProfile.uid);await updateDoc(l,{balance:increment(-e)});const u=`GLD-${Math.floor(1e5+Math.random()*9e5)}`;await addDoc(collection(db,"deposit_requests"),{userId:userProfile.uid,userName:userProfile.name,userHandle:userProfile.handle||"",userEmail:userProfile.email||"",amountPKR:0,amountAX:e,method:"Guild Establishment",txnId:u,status:"approved",type:"payment",message:`Established Guild "${o}" (-500 AX)`,submittedAt:serverTimestamp(),createdAt:serverTimestamp()}),alert(`🎉 Congratulations! Your new Guild "${o}" has been established successfully!
-500 AX Coins deducted from your wallet.`),$("mCreateGuild")&&$("mCreateGuild").classList.add("hidden")}catch(c){alert("Failed to create Guild: "+c.message)}finally{Oe.disabled=!1,Oe.textContent="Establish Guild (500 AX)"}});const hi=$("btnCancelJoinRequest");hi&&hi.addEventListener("click",()=>{$("mTeamJoinRequestMsgModal")&&$("mTeamJoinRequestMsgModal").classList.add("hidden")});const We=$("btnSendJoinRequest");We&&We.addEventListener("click",async()=>{if(!ue)return;const e=$("joinRequestOptionalMsg")?$("joinRequestOptionalMsg").value.trim():"",t=ue.leaderId;if(!t){alert("This guild does not have an active leader.");return}We.disabled=!0,We.textContent="Sending...";try{const o=collection(db,"users",t,"mails");await addDoc(o,{type:"team_join_request",sender:"Guild Application",title:"New Join Request",body:`User @${userProfile.handle} requested to join your Guild "${ue.name}". Message: "${e||"No message"}"`,fromUserId:userProfile.uid,fromUserName:userProfile.name,fromUserHandle:userProfile.handle,teamId:ue.id,teamName:ue.name,message:e,status:"pending",createdAt:serverTimestamp()}),alert("Join request sent to the Guild Leader's Inbox successfully! 🛡️"),$("mTeamJoinRequestMsgModal")&&$("mTeamJoinRequestMsgModal").classList.add("hidden")}catch(o){alert("Failed to send request: "+o.message)}finally{We.disabled=!1,We.textContent="Send Request"}});const xi=$("btnSquadInviteNo");xi&&xi.addEventListener("click",()=>{$("mSquadInvitePromptModal")&&$("mSquadInvitePromptModal").classList.add("hidden")});const Xe=$("btnSquadInviteYes");Xe&&Xe.addEventListener("click",async()=>{const e=window.activeSquadInviteTeam,t=window.activeSquadInviteTour;if(!(!e||!t)){Xe.disabled=!0,Xe.textContent="Inviting...";try{const o=(e.members||[]).filter(n=>n!==userProfile.uid);if(o.length===0){alert("Your guild does not have any other members to invite yet."),$("mSquadInvitePromptModal")&&$("mSquadInvitePromptModal").classList.add("hidden");return}const i=doc(db,"teams",e.id,"tournamentParticipations",t.id);await setDoc(i,{invitedMembers:o,joinedMembers:[],xpAwarded:!1,createdAt:serverTimestamp()});for(const n of o){const r=collection(db,"users",n,"mails");await addDoc(r,{type:"tournament_invite",sender:"Guild Tournament Squad",title:"Squad Tournament Invitation! 🏆",body:`Your Guild leader ${userProfile.name} has registered the team for the tournament "${t.name}". Click the button below to join the squad slot!`,tournamentId:t.id,tournamentName:t.name,teamId:e.id,status:"pending",createdAt:serverTimestamp()})}alert(`🎉 Invites successfully sent to your ${o.length} Guild members!`),$("mSquadInvitePromptModal")&&$("mSquadInvitePromptModal").classList.add("hidden")}catch(o){alert("Failed to send invites: "+o.message)}finally{Xe.disabled=!1,Xe.textContent="Yes, Invite All!"}}});window.renderLaunchFestUI=function(){};window.switchEventsSubTab=function(){};$("btnClaimDailyLogin")&&$("btnClaimDailyLogin").addEventListener("click",async()=>{if(!userProfile)return;const e=$("btnClaimDailyLogin");e.disabled=!0;try{const t=new Date(Date.now()+18e6).toISOString().split("T")[0],o=[10,15,20,25,30,35,50];let i=userProfile.loginStreak||0;const n=userProfile.lastClaimDate||"";if(n){const l=new Date(n),u=new Date(t),p=Math.abs(u-l);Math.ceil(p/(1e3*60*60*24))>1&&n!==t&&(i=0)}if(n===t){alert("You have already claimed today's login reward!");return}const r=i%7,s=o[r],d=i+1,c={balance:increment(s),loginStreak:d,lastClaimDate:t};d%7===0&&(c.badges=arrayUnion("launch_fest_badge")),await updateDoc(doc(db,"users",userProfile.uid),c),spawnConfetti(["#f0c040","#e8404a","#3ddc84"]),showToastNotification("Reward Claimed! 🏆",`streak: +${s} AX Coins credited to wallet!`),d%7===0&&showToastNotification("Badge Earned! 🎖️","You received the 'Launch Fest Badge' for completing 7 day login streak!")}catch(t){alert("Daily login claim failed: "+t.message),e.disabled=!1}});$("btnClaimPioneer")&&$("btnClaimPioneer").addEventListener("click",async()=>{if(!userProfile)return;const e=$("btnClaimPioneer");e.disabled=!0;try{await updateDoc(doc(db,"users",userProfile.uid),{balance:increment(20),badges:arrayUnion("pioneer_badge"),"welcomeBonusClaims.all":!0}),spawnConfetti(["#a855f7","#ec4899","#f0c040"]),showToastNotification("Grand Prize Unlocked! 🚀","You received +20 AX and the prestigious 'Pioneer Badge'!")}catch(t){alert("Claim failed: "+t.message),e.disabled=!1}});$("btnRegisterWeeklyTour")&&$("btnRegisterWeeklyTour").addEventListener("click",async()=>{if(!userProfile)return;const e=$("btnRegisterWeeklyTour"),t=(toursData||[]).find(o=>o.isWeeklyFree===!0);if(t)handleTourCardClick(t);else{e.disabled=!0;try{await updateDoc(doc(db,"users",userProfile.uid),{weeklyTourRegistered:!0}),spawnConfetti(["#e8404a","#f0c040"]),showToastNotification("Successfully Registered! 🏆","You're in! Join Weekly Free Tournament this Sunday at 8:00 PM PKT!")}catch(o){alert("Failed to register: "+o.message),e.disabled=!1}}});$("btnSpinFree")&&$("btnSpinFree").addEventListener("click",()=>fa(!0));$("btnSpinPaid")&&$("btnSpinPaid").addEventListener("click",()=>fa(!1));$("btnCloseMiniGame")&&$("btnCloseMiniGame").addEventListener("click",()=>{$("miniGameCard").classList.add("hidden")});async function fa(e){if(ho||!userProfile)return;if(!e&&(userProfile.balance||0)<10){alert("Insufficient balance! You need 10 AX to spin the lucky wheel.");return}ho=!0;const t=$("btnSpinFree"),o=$("btnSpinPaid");t&&(t.disabled=!0),o&&(o.disabled=!0);const i=[10,15,20,25,30,50],n=Math.floor(Math.random()*i.length),r=i[n],s=n*60+30,d=$("wheelSpinner");d&&(d.style.transition="transform 3.5s cubic-bezier(0.25, 0.1, 0.1, 1)",d.style.transform=`rotate(${3600+s}deg)`);const c=$("wheelPrizeText");c&&(c.textContent="SPINNING..."),setTimeout(async()=>{try{c&&(c.textContent=`${r} AX`);const l=doc(db,"users",userProfile.uid),u=new Date(Date.now()+300*60*1e3).toISOString().split("T")[0],f=r-(e?0:10);await updateDoc(l,{balance:increment(f),"dailyTasks.date":u,"dailyTasks.game":!0}),spawnConfetti(["#f0c040","#3ddc84","#ff4500"]),showToastNotification("You Won! 🎡",`Congratulations! You received +${r} AX Coins from Lucky Wheel!`)}catch(l){alert("Spin payout failed: "+l.message)}finally{ho=!1,t&&(t.disabled=!1),o&&(o.disabled=!1)}},3600)}$("btnCopyRefLink")&&$("btnCopyRefLink").addEventListener("click",()=>{if(!userProfile)return;const e=window.location.origin+window.location.pathname+"?ref="+userProfile.uid.slice(0,8).toUpperCase();navigator.clipboard.writeText(e).then(()=>{showToastNotification("Copied! 📋","Your referral invite link has been copied to your clipboard!")}).catch(()=>{alert("Referral Link: "+e)})});$("btnShareWhatsApp")&&$("btnShareWhatsApp").addEventListener("click",()=>{if(!userProfile)return;const e=window.location.origin+window.location.pathname+"?ref="+userProfile.uid.slice(0,8).toUpperCase(),t=encodeURIComponent(`🎮 Join ArenaX Gaming platform & play free tournaments to win real coin rewards! Sign up now using my referral link to get 50 AX Coins: ${e}`);window.open(`https://api.whatsapp.com/send?text=${t}`)});$("btnViewFullLeaderboard")&&$("btnViewFullLeaderboard").addEventListener("click",()=>{showToastNotification("Full Leaderboard 👑","The full leaderboard will be revealed after Launch Fest ends on August 1st!")});window.renderLaunchFestUI=function(){};let R=null,Eo=[],xo=null,gt=null,wt=null,ht=null,Qe=null,Ce=null,ut=30,zt=!1,Be={},_e={},G=null,he={},Yt={},gn={},Do={},Io=new Set;const wn={iceServers:[{urls:"stun:stun.relay.metered.ca:80"},{urls:"turn:global.relay.metered.ca:80",username:"716b790d0c0f402d3c231ddc",credential:"t3yPYOapJ5VoWN13"},{urls:"turn:global.relay.metered.ca:80?transport=tcp",username:"716b790d0c0f402d3c231ddc",credential:"t3yPYOapJ5VoWN13"},{urls:"turn:global.relay.metered.ca:443",username:"716b790d0c0f402d3c231ddc",credential:"t3yPYOapJ5VoWN13"},{urls:"turns:global.relay.metered.ca:443?transport=tcp",username:"716b790d0c0f402d3c231ddc",credential:"t3yPYOapJ5VoWN13"}]};let le=!1,ie=!1,No=!1,Bo=!1,te=null,pt=null,Bt=null;function yt(e){if(pt){try{pt.disconnect()}catch{}pt=null}if(te){try{te.close()}catch{}te=null}if(!(!e||!G||le||ie))try{const t=window.AudioContext||window.webkitAudioContext;te=new t,pt=te.createMediaStreamSource(G);const o=te.createBiquadFilter();o.type="bandpass",o.frequency.setValueAtTime(1e3,te.currentTime),o.Q.setValueAtTime(1.2,te.currentTime);const i=te.createDelay(1);i.delayTime.setValueAtTime(.22,te.currentTime),Bt=te.createGain(),Bt.gain.setValueAtTime(.25,te.currentTime),pt.connect(o),o.connect(i),i.connect(Bt),Bt.connect(te.destination),console.log("[Audio Engine] Active tactical squad loopback initialized (feedback-safe bandpass + 220ms radio delay).")}catch(t){console.warn("Could not start local mic loopback:",t)}}function Fo(e){if(!ie)try{const t=window.AudioContext||window.webkitAudioContext,o=new t,i=o.sampleRate*(e?.15:.08),n=o.createBuffer(1,i,o.sampleRate),r=n.getChannelData(0);for(let l=0;l<i;l++)r[l]=Math.random()*2-1;const s=o.createBufferSource();s.buffer=n;const d=o.createBiquadFilter();d.type="bandpass",d.frequency.setValueAtTime(e?700:1200,o.currentTime),d.Q.setValueAtTime(1.8,o.currentTime);const c=o.createGain();c.gain.setValueAtTime(e?.04:.06,o.currentTime),c.gain.exponentialRampToValueAtTime(.001,o.currentTime+(e?.15:.08)),s.connect(d),d.connect(c),c.connect(o.destination),s.start()}catch{}}function hn(){var I,ye,ct,ai,ni,ri,si;const e=$("btnCreateVoiceRoom"),t=$("bCloseCreateVoiceRoom"),o=$("mCreateVoiceRoom"),i=$("createVoiceRoomForm"),n=$("cvType"),r=document.querySelectorAll(".game-filter-pill"),s=$("voiceSearchInput"),d=$("btnRefreshVoiceLobby");let c=null;const l=$("cvCoverInput"),u=$("cvCoverBox"),p=$("cvCoverPreview"),f=$("cvCoverPlaceholder");u&&l&&(u.addEventListener("click",()=>l.click()),l.addEventListener("change",x=>{if(x.target.files&&x.target.files[0]){c=x.target.files[0];const C=new FileReader;C.onload=N=>{p.src=N.target.result,p.classList.remove("hidden"),f.classList.add("hidden")},C.readAsDataURL(c)}}));let b="Talk";const g=document.querySelectorAll(".cv-tag-pill");g.forEach(x=>{x.addEventListener("click",()=>{g.forEach(C=>{C.classList.remove("bg-emerald-500/20","text-emerald-300","border-emerald-500/50"),C.classList.add("bg-card","text-t2","border-bdr")}),x.classList.remove("bg-card","text-t2","border-bdr"),x.classList.add("bg-emerald-500/20","text-emerald-300","border-emerald-500/50"),b=x.dataset.tag||"Talk"})});let w=8;const h=document.querySelectorAll(".cv-seat-pill");h.forEach(x=>{x.addEventListener("click",()=>{h.forEach(C=>{C.classList.remove("bg-emerald-500/20","text-emerald-300","border-emerald-500/50"),C.classList.add("bg-card","text-t2","border-bdr")}),x.classList.remove("bg-card","text-t2","border-bdr"),x.classList.add("bg-emerald-500/20","text-emerald-300","border-emerald-500/50"),w=parseInt(x.dataset.seats)||8})});async function M(x){const C="drxzyeghf",N="unsigned_preset",W=new FormData;W.append("file",x),W.append("upload_preset",N);const Y=await fetch(`https://api.cloudinary.com/v1_1/${C}/auto/upload`,{method:"POST",body:W});if(!Y.ok)throw new Error("Cloudinary upload failed");return(await Y.json()).secure_url}const L=document.querySelector('.ni[data-t="Voice"]');L&&L.addEventListener("click",()=>{Uo()}),e&&e.addEventListener("click",()=>{if(!userProfile){showToastNotification("Authentication Required","Please sign in to create a voice room!");return}o.classList.remove("hidden")}),t&&t.addEventListener("click",()=>{o.classList.add("hidden")}),n&&n.addEventListener("change",x=>{x.target.value==="private"?$("cvPasswordWrap").classList.remove("hidden"):$("cvPasswordWrap").classList.add("hidden")}),i&&i.addEventListener("submit",async x=>{x.preventDefault();try{const C=$("cvName").value.trim(),N=$("cvType").value,W=N==="private"?$("cvPassword").value.trim():"",Y=$("cvRegion").value;if(!C)return;let ke="";if(c){showToastNotification("Uploading Cover... 📸","Preparing your room background...");try{ke=await M(c)}catch(Le){console.warn("Cover upload fallback:",Le)}}const me=doc(collection(db,"voice_rooms"));await setDoc(me,{name:C,roomTitle:C,tag:b,game:b,roomTag:b,maxPlayers:w,seats:w,maxSeats:w,coverUrl:ke,coverImageUrl:ke,type:N,isPrivate:N==="private",password:W,region:Y,hostId:userProfile.uid,hostName:userProfile.name,hostAvatar:userProfile.av||"https://api.dicebear.com/7.x/bottts/svg?seed="+userProfile.uid,memberCount:0,locked:!1,createdAt:serverTimestamp()},{merge:!0}),o.classList.add("hidden"),i.reset(),$("cvPasswordWrap").classList.add("hidden"),p&&p.classList.add("hidden"),f&&f.classList.remove("hidden"),c=null,await co(me.id),showToastNotification("Voice Room Live 🚀",`"${C}" is now ready!`)}catch(C){console.error("Error creating room:",C),showToastNotification("Creation Failed ❌","Could not deploy voice room. Try again.")}}),d&&d.addEventListener("click",()=>{Uo(),showToastNotification("Lobby Refreshed 🔄","Fetched latest active voice rooms.")}),s&&s.addEventListener("input",()=>{_o()}),r.forEach(x=>{x.addEventListener("click",()=>{r.forEach(N=>{N.classList.remove("bg-emerald-500/20","border-emerald-500/50","text-emerald-300"),N.classList.add("bg-card","border-bdr","text-t2")}),x.classList.remove("bg-card","border-bdr","text-t2"),x.classList.add("bg-emerald-500/20","border-emerald-500/50","text-emerald-300");const C=x.dataset.game;_o(C)})}),onAuthStateChanged(auth,x=>{x&&Rn(x.uid)});const A=$("btnVoiceToggleMute");A&&A.addEventListener("click",()=>{Pn()});const P=$("btnVoiceToggleDeafen");P&&P.addEventListener("click",()=>{Tn()});const k=$("btnHostTools"),E=$("mHostToolsModal"),y=$("bCloseHostTools");k&&E&&k.addEventListener("click",()=>{E.classList.remove("hidden")}),y&&E&&y.addEventListener("click",()=>{E.classList.add("hidden")}),(I=$("btnToolWipeScreen"))==null||I.addEventListener("click",async()=>{if(R)try{(await getDocs(collection(db,"voice_rooms",R,"chats"))).forEach(C=>deleteDoc(C.ref)),showToastNotification("Screen Wiped 🧹","Cleared all messages in current room."),E.classList.add("hidden")}catch(x){console.error(x)}});const B=$("btnToolChangeBg"),V=$("cvCoverInputChange");B&&V&&(B.addEventListener("click",()=>V.click()),V.addEventListener("change",async x=>{if(x.target.files&&x.target.files[0]&&R){showToastNotification("Updating Cover... 🖼️","Uploading new cover background...");try{const C=await M(x.target.files[0]);await updateDoc(doc(db,"voice_rooms",R),{coverUrl:C}),showToastNotification("Cover Updated 🖼️","Room background updated successfully."),E.classList.add("hidden")}catch{showToastNotification("Upload Error","Could not update cover.")}}})),(ye=$("btnToolDeleteChat"))==null||ye.addEventListener("click",async()=>{if(R)try{(await getDocs(collection(db,"voice_rooms",R,"chats"))).forEach(C=>deleteDoc(C.ref)),showToastNotification("Chat Cleared 🗑️","Deleted all messages."),E.classList.add("hidden")}catch{}}),(ct=$("btnToolShare"))==null||ct.addEventListener("click",()=>{var C;if(!R)return;const x=window.location.origin+window.location.pathname+"?vroom="+R;(C=navigator.clipboard)==null||C.writeText(x),showToastNotification("Link Copied 🔗","Share link copied to clipboard!"),E.classList.add("hidden")}),(ai=$("btnToolLockSeats"))==null||ai.addEventListener("click",()=>{yi(),E.classList.add("hidden")}),(ni=$("btnToolPKMode"))==null||ni.addEventListener("click",()=>{const x=$("activeRoomPkBanner");x&&(x.classList.toggle("hidden"),showToastNotification("PK Battle Mode ⚔️",x.classList.contains("hidden")?"PK Battle hidden.":"PK Battle Mode Active!"),E.classList.add("hidden"))});const F=$("btnOpenVoiceTheme"),H=$("mVoiceThemeModal"),J=$("bCloseVoiceTheme");F&&H&&F.addEventListener("click",()=>{H.classList.remove("hidden")}),J&&H&&J.addEventListener("click",()=>{H.classList.add("hidden")}),(ri=$("btnToolOpenThemes"))==null||ri.addEventListener("click",()=>{E&&E.classList.add("hidden"),H&&H.classList.remove("hidden")});function z(x){switch(x){case"cyber":return"bg-gradient-to-b from-[#0e0b1f] via-[#160d2e] to-[#0a0c12]";case"purple":return"bg-gradient-to-b from-[#1a0b2e] via-[#120720] to-[#0a0c12]";case"emerald":return"bg-gradient-to-b from-[#061a14] via-[#04120e] to-[#0a0c12]";case"sunset":return"bg-gradient-to-b from-[#1f0a0e] via-[#140609] to-[#0a0c12]";case"gold":return"bg-gradient-to-b from-[#1f1a08] via-[#141004] to-[#0a0c12]";default:return"bg-[#0a0c12]"}}document.querySelectorAll(".vr-theme-btn").forEach(x=>{x.addEventListener("click",()=>{const C=x.getAttribute("data-theme"),N=$("voiceActiveRoomView");N&&(N.className="fixed inset-0 z-[100] flex flex-col overflow-hidden transition-all duration-500 "+z(C)),document.querySelectorAll(".vr-theme-btn").forEach(W=>{W.className="vr-theme-btn p-3 bg-[#171b2e] border border-[#252a45] hover:border-amber-500/40 text-gray-200 rounded-xl flex flex-col items-center justify-center gap-1.5 transition text-center cursor-pointer group"}),x.className="vr-theme-btn p-3 bg-[#1e2338] border border-amber-400 text-amber-300 rounded-xl flex flex-col items-center justify-center gap-1.5 transition text-center cursor-pointer group shadow-md ring-1 ring-amber-400/50",H&&H.classList.add("hidden"),showToastNotification("Theme Applied 🎨","Switched room atmosphere theme!")})});const ne=$("btnOpenVoiceGiftModal"),D=$("mVoiceRoomGiftModal"),pe=$("bCloseVoiceGiftModal"),Q=$("btnVrGiftDeposit");let Z=null,Ae="rose";Q&&Q.addEventListener("click",()=>{D&&D.classList.add("hidden"),typeof window.openDepositModal=="function"?window.openDepositModal():alert("Opening wallet deposit...")}),ne&&D&&ne.addEventListener("click",()=>{st()}),pe&&D&&pe.addEventListener("click",()=>{D.classList.add("hidden")}),document.querySelectorAll(".vr-quick-gift-btn").forEach(x=>{x.addEventListener("click",()=>{Ae=x.dataset.type||"rose",st()})}),document.querySelectorAll(".vr-gift-card").forEach(x=>{x.addEventListener("click",()=>{document.querySelectorAll(".vr-gift-card").forEach(W=>{W.className="vr-gift-card relative p-2.5 sm:p-3.5 rounded-2xl border flex flex-col items-center justify-center gap-1 sm:gap-1.5 cursor-pointer transition-all bg-[#141727] border-[#252b47] hover:border-pink-500/40";const Y=W.querySelector('[id^="vrGiftCheck"]');Y&&(Y.classList.add("hidden"),Y.classList.remove("flex"))}),x.className="vr-gift-card relative p-2.5 sm:p-3.5 rounded-2xl border flex flex-col items-center justify-center gap-1 sm:gap-1.5 cursor-pointer transition-all bg-gradient-to-b from-pink-500/15 via-[#1a1e34] to-[#121526] border-pink-500 shadow-[0_0_15px_rgba(236,72,153,0.3)] ring-1 ring-pink-500/50 scale-[1.02]";const C=x.querySelector('[id^="vrGiftCheck"]');C&&(C.classList.remove("hidden"),C.classList.add("flex")),Ae=x.dataset.type||"rose";const N=$("vrGiftHelpText");N&&(Ae==="rose"?N.textContent="Receiver's Charm +1 • Gain popularity & status boost":Ae==="rocket"?N.textContent="Receiver's Charm +10 • Supercharge popularity & status boost":N.textContent="Receiver's Charm +20 • Ultimate popularity & prestige boost")})}),(si=$("btnVrSendGiftSubmit"))==null||si.addEventListener("click",async()=>{if(!R||!userProfile)return;if(!Z){showToastNotification("Select Player","Please select a participant to receive the gift!");return}const x={rose:{name:"Rose",cost:10,pop:1,anim:"rose"},rocket:{name:"Rocket",cost:100,pop:10,anim:"rocket"},trophy:{name:"Trophy",cost:190,pop:20,anim:"poptrophy"}}[Ae]||{name:"Rose",cost:10,pop:1,anim:"rose"};if((userProfile.balance!==void 0?userProfile.balance:userProfile.axCoins||0)<x.cost){showToastNotification("Insufficient AX Coins 🪙",`You need ${x.cost} AX Coins to send a ${x.name}!`);return}try{const N=doc(db,"users",userProfile.uid);await updateDoc(N,{balance:increment(-x.cost),axCoins:increment(-x.cost)}),userProfile.balance=(userProfile.balance||userProfile.axCoins||0)-x.cost,userProfile.axCoins=(userProfile.axCoins||0)-x.cost,$("vrGiftUserCoinBal")&&($("vrGiftUserCoinBal").textContent=(userProfile.balance||0).toLocaleString());const W=doc(db,"users",Z);if(await updateDoc(W,{popularity:increment(x.pop)}),await addDoc(collection(db,"users",Z,"popularityHistory"),{senderUid:userProfile.uid,senderName:userProfile.name,giftType:x.name,amount:x.pop,timestamp:serverTimestamp()}),typeof window.sendPersonalNotification=="function"){const Y=typeof window.formatGiftDisplayName=="function"?window.formatGiftDisplayName(x.name):x.name||"Gift";window.sendPersonalNotification(Z,{title:"New Gift! 🎁",body:`${userProfile.name||"Player"} sent you a ${Y}`,icon:"rose.png",url:"https://arenax.cyou/#profile",data:{type:"gift",senderUid:userProfile.uid,giftType:x.name}}).catch(console.warn)}await addDoc(collection(db,"voice_rooms",R,"chats"),{userId:userProfile.uid,userName:userProfile.name,userAvatar:userProfile.av||"https://api.dicebear.com/7.x/bottts/svg?seed="+userProfile.uid,message:`🎁 Sent ${x.name} (+${x.pop} Pop) to participant!`,createdAt:serverTimestamp()}),qe(x.anim),D.classList.add("hidden"),showToastNotification("Gift Sent! 🎁",`Sent ${x.name}! Recipient gained +${x.pop} Popularity.`)}catch(N){console.error("Error sending voice gift:",N),showToastNotification("Gift Failed ❌","Could not send gift. Try again.")}});function st(){if(!R)return;const x=$("vrGiftRecipientsRow");if(x){if($("vrGiftUserCoinBal")&&userProfile){const C=userProfile.balance!==void 0?userProfile.balance:userProfile.axCoins||0;$("vrGiftUserCoinBal").textContent=C.toLocaleString()}x.innerHTML="",getDocs(collection(db,"voice_rooms",R,"members")).then(C=>{if(C.empty){x.innerHTML='<span class="text-xs text-gray-400 italic">No participants in room.</span>';return}let N=0;const W=new Set;if(C.forEach(Y=>{const ke=Y.data(),me=ke.uid||Y.id;if(!me||me===userProfile.uid||W.has(me))return;W.add(me),N++;const Le=document.createElement("button");Le.type="button",Le.className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold transition shrink-0 cursor-pointer border-[#293050] bg-[#141727] text-gray-400 hover:text-white",Le.innerHTML=`
          <img src="${ke.avatar||"https://api.dicebear.com/7.x/bottts/svg?seed="+me}" class="w-5 h-5 rounded-full object-cover shrink-0 border border-purple-500/30">
          ${window.formatPlayerNameHtml(ke,"truncate max-w-[80px] text-xs font-bold","w-3 h-3")}
        `,Le.addEventListener("click",()=>{x.querySelectorAll("button").forEach(Xa=>{Xa.className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold transition shrink-0 cursor-pointer border-[#293050] bg-[#141727] text-gray-400 hover:text-white"}),Le.className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold transition shrink-0 cursor-pointer bg-gradient-to-r from-pink-500/20 to-rose-500/20 border-pink-500 text-white ring-1 ring-pink-500/50",Z=me}),x.appendChild(Le)}),N===0)x.innerHTML='<span class="text-xs text-gray-400 italic">No other players seated.</span>';else{const Y=x.querySelector("button");Y&&Y.click()}D.classList.remove("hidden")})}}function qe(x){let C=null;x==="rose"?C=document.getElementById("rose-popularity-splash"):x==="rocket"?C=document.getElementById("rocket-popularity-splash"):x==="poptrophy"&&(C=document.getElementById("trophy-popularity-splash")),C&&(C.classList.remove("hidden"),setTimeout(()=>{C.classList.add("hidden")},3500))}const dt=$("roomChatForm");dt&&dt.addEventListener("submit",async x=>{if(x.preventDefault(),!R||!userProfile)return;const C=$("roomChatInput"),N=C.value.trim();if(N)try{await addDoc(collection(db,"voice_rooms",R,"chats"),{userId:userProfile.uid,userName:userProfile.name,userAvatar:userProfile.av||"https://api.dicebear.com/7.x/bottts/svg?seed="+userProfile.uid,message:N,createdAt:serverTimestamp()}),C.value=""}catch(W){console.error("Error sending room chat:",W)}});const At=$("btnLeaveVoiceRoom");At&&At.addEventListener("click",()=>{xe()});const Mt=$("btnInviteFriendToVoice");Mt&&Mt.addEventListener("click",()=>{Li()});const lt=$("aloneWarningBtnInvite");lt&&lt.addEventListener("click",()=>{Li()});const Rt=$("bCloseInviteFriendToVoice");Rt&&Rt.addEventListener("click",()=>{$("mInviteFriendToVoice").classList.add("hidden")});const je=$("btnToggleLockRoom");je&&je.addEventListener("click",()=>{yi()});const ee=$("btnDeleteRoom");ee&&ee.addEventListener("click",async()=>{if(!(!R||!confirm("Are you sure you want to end and delete this voice room?")))try{const C=R,N=doc(db,"voice_rooms",C);await deleteDoc(N),showToastNotification("Room Deleted 🗑️","The voice room has been permanently deleted."),await xe(!0)}catch(C){console.error("Error deleting room:",C)}})}let ma="All";function Uo(){xo&&xo();const e=query(collection(db,"voice_rooms"),orderBy("createdAt","desc"),limit(50));xo=onSnapshot(e,t=>{Eo=[],t.forEach(o=>{Eo.push({id:o.id,...o.data()})}),_o(ma)},t=>{console.error("Firestore Error reading voice_rooms:",t)})}function _o(e="All"){var s;ma=e;const t=(((s=$("voiceSearchInput"))==null?void 0:s.value)||"").toLowerCase().trim(),o=$("voiceRoomsGrid");if(!o)return;const i=Eo||[],n=$("welcomeVoiceBanner");n&&(i.length>0?n.classList.add("hidden"):n.classList.remove("hidden"));const r=i.filter(d=>{const c=e==="All"||d.tag&&d.tag===e||d.game===e,l=!t||d.name.toLowerCase().includes(t)||d.tag&&d.tag.toLowerCase().includes(t)||d.hostName.toLowerCase().includes(t);return c&&l});if(r.length===0){o.innerHTML=`
      <div class="h-full flex flex-col items-center justify-center text-t3 text-center p-8 bg-card/20 border border-bdr/50 rounded-2xl">
        <i class="fas fa-search text-2xl text-emerald-500/25 mb-1.5 animate-pulse"></i>
        <p class="text-xs text-white font-semibold">No Voice Rooms Found</p>
        <p class="text-[10px] text-t3 max-w-[180px] mt-0.5">Try changing category or search terms. Or create your own room!</p>
      </div>
    `;return}o.innerHTML="",r.forEach(d=>{var f;const c=document.createElement("div");c.className="p-3 bg-card/85 backdrop-blur-md border border-emerald-500/15 hover:border-emerald-500/40 rounded-2xl relative overflow-hidden transition-all duration-300 hover:translate-y-[-2px] flex items-center justify-between gap-3 group shadow-xl",d.memberCount>0&&c.classList.add("border-emerald-500/30");const l=d.type==="private"||d.isPrivate,u=d.tag||d.game||"Talk",p=d.coverUrl||d.coverImageUrl||"https://images.unsplash.com/photo-1511512578047-dfb367046420?w=300";c.innerHTML=`
      <!-- Left: Thumbnail Cover Image -->
      <div class="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-[#1a1e34] shrink-0 border border-white/10 relative shadow-inner">
        <img src="${p}" alt="Room Cover" class="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
        <span class="absolute top-1 left-1 px-1.5 py-0.5 bg-black/75 backdrop-blur-md border border-emerald-500/40 text-[7px] font-extrabold uppercase text-emerald-300 rounded-md">${u}</span>
      </div>

      <!-- Middle: Room Info -->
      <div class="space-y-1 flex-1 min-w-0 pr-1">
        <div class="flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981] animate-pulse shrink-0"></span>
          <span class="text-xs font-black uppercase text-white tracking-wide truncate group-hover:text-emerald-300 transition">${d.name||d.roomTitle||"Voice Room"}</span>
          ${l?'<i class="fas fa-lock text-[9px] text-amber-400 shrink-0" title="Password Protected"></i>':""}
        </div>
        
        <div class="flex flex-wrap items-center gap-2 text-[9px] text-gray-300">
          <span class="text-t2 flex items-center gap-1"><i class="fas fa-user text-[8px] text-emerald-400"></i>Host: <span class="text-white font-bold truncate max-w-[90px]">${d.hostName||"Host"}</span></span>
          <span class="text-t3">•</span>
          <span class="text-t3"><i class="fas fa-globe text-[8px] mr-0.5"></i>${d.region||"Global"}</span>
        </div>
      </div>

      <!-- Right: Seats & Join -->
      <div class="flex flex-col items-end gap-1.5 shrink-0">
        <div class="text-right">
          <span class="text-xs font-black text-white">${d.memberCount||0}</span><span class="text-[10px] text-t3 font-bold">/${d.seats||d.maxPlayers||d.maxSeats||8}</span>
        </div>
        <button class="btn-join-voice px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl border border-emerald-500/30 text-[10px] font-black uppercase tracking-wider transition duration-150 cursor-pointer shadow-md" data-id="${d.id}">
          Join
        </button>
      </div>
    `,(f=c.querySelector(".btn-join-voice"))==null||f.addEventListener("click",()=>{if(l&&prompt("Enter room password:")!==d.password){alert("Incorrect password!");return}co(d.id)}),o.appendChild(c)})}function xn(e){Qe&&Qe(),Qe=onSnapshot(doc(db,"voice_rooms",e),t=>{if(!t.exists())R===e&&(showToastNotification("Room Closed ⏱️","This voice channel has been closed or ended."),xe(!0));else{const o=t.data();$("activeRoomName").textContent=o.name||o.roomTitle||"Voice Room",$("activeRoomTagPill")&&($("activeRoomTagPill").textContent=o.tag||o.roomTag||o.game||"Talk"),$("activeRoomMax").textContent=o.seats||o.maxPlayers||o.maxSeats||8,$("activeSeatsTotalCount")&&($("activeSeatsTotalCount").textContent=o.seats||o.maxPlayers||o.maxSeats||8);const i=$("activeRoomBgOverlay");i&&(i.style.backgroundImage="none");const n=userProfile&&o.hostId===userProfile.uid,r=$("btnHostTools");r&&(n?r.classList.remove("hidden"):r.classList.add("hidden")),o.locked?$("activeRoomLockIcon").classList.remove("hidden"):$("activeRoomLockIcon").classList.add("hidden")}},t=>{console.error("Error watching active room doc:",t)})}async function co(e){if(!userProfile){showToastNotification("Access Denied","Please sign in to join the voice arena.");return}if(auth.currentUser)try{await auth.currentUser.getIdToken(!0)}catch{}R&&await xe(!1);try{G=await navigator.mediaDevices.getUserMedia({audio:!0,video:!1}),G.getAudioTracks().forEach(t=>{t.enabled=!le}),yt(!le),Fo(!1)}catch(t){console.warn("Microphone access denied or unavailable:",t),showToastNotification("Microphone Blocked ⚠️","Continuing in listen-only mode.")}try{zt=!1,R=e;const t=await getDoc(doc(db,"voice_rooms",e));if(!t.exists()){showToastNotification("Error","Room no longer exists."),R=null,G&&(G.getTracks().forEach(s=>s.stop()),G=null);return}const o=t.data();$("voiceLobbyView").classList.add("hidden"),$("voiceActiveRoomView").classList.remove("hidden"),$("activeRoomName").textContent=o.name,$("activeRoomTagPill")&&($("activeRoomTagPill").textContent=o.tag||o.game||"Talk"),$("activeRoomMax").textContent=o.seats||o.maxPlayers||8;const i=$("activeRoomBgOverlay");i&&(o.coverUrl?(i.style.backgroundImage=`url(${o.coverUrl})`,i.style.opacity="0.35"):i.style.backgroundImage="none"),o.locked?$("activeRoomLockIcon").classList.remove("hidden"):$("activeRoomLockIcon").classList.add("hidden");const n=userProfile.av||"https://api.dicebear.com/7.x/bottts/svg?seed="+userProfile.uid,r=userProfile.uid;await setDoc(doc(db,"voice_rooms",e,"members",r),{uid:userProfile.uid,name:userProfile.name,handle:userProfile.handle||"@player",avatar:n,seatIndex:1,isPremium:!!(userProfile.premium||userProfile.isPremium||userProfile.isVIP||userProfile.vip),isVerified:!!(userProfile.isVerified||userProfile.hasBlueTick||userProfile.blueTick||userProfile.verified),muted:le,deafened:ie,speaking:!1,handRaised:!1,micStatus:!le,joinedAt:serverTimestamp()},{merge:!0}),await updateDoc(doc(db,"voice_rooms",e),{memberCount:increment(1)}).catch(()=>{}),window.dispatchEvent(new CustomEvent("voice-room-joined",{detail:{roomId:e}})),yn(e),An(e),Sn(e),xn(e)}catch(t){console.error("Error joining voice room:",t),showToastNotification("Join Failed","Could not connect to voice room."),R=null,G&&(G.getTracks().forEach(o=>o.stop()),G=null)}}window.joinVoiceRoom=co;let ba=null,Ze=null;function vn(){if(G)try{const e=new(window.AudioContext||window.webkitAudioContext),t=e.createMediaStreamSource(G),o=e.createAnalyser();o.fftSize=256,t.connect(o);const i=o.frequencyBinCount,n=new Uint8Array(i);Ze&&clearInterval(Ze);let r=!1;Ze=setInterval(()=>{if(le||Bo&&!No){r&&(r=!1,vi(!1));return}o.getByteFrequencyData(n);let s=0;for(let l=0;l<i;l++)s+=n[l];const c=s/i>20;c!==r&&(r=c,vi(c))},150)}catch(e){console.warn("Could not setup voice analyser:",e)}}async function vi(e){if(!(!R||!userProfile))try{await updateDoc(doc(db,"voice_rooms",R,"members",userProfile.uid),{speaking:e})}catch{}}function yn(e){gt&&gt();const t=collection(db,"voice_rooms",e,"members");gt=onSnapshot(t,async o=>{const i=$("roomSeatsGrid"),n=$("activeRoomTopAvatars");if(!i)return;let r=[];o.forEach(l=>{r.push(l.data())});const s=r.length;$("activeRoomCount").textContent=s,$("activeSeatsOccupiedCount")&&($("activeSeatsOccupiedCount").textContent=s);let d=8;try{const l=await getDoc(doc(db,"voice_rooms",e));l.exists()&&(d=l.data().seats||l.data().maxPlayers||8)}catch{}n&&(n.innerHTML="",r.slice(0,4).forEach(l=>{const u=document.createElement("img");u.src=l.avatar,u.className="w-6 h-6 rounded-full border border-emerald-500 object-cover shadow-sm bg-card",n.appendChild(u)})),i.innerHTML="";for(let l=1;l<=d;l++){const u=r.find(f=>f.seatIndex===l)||(r[l-1]&&!r[l-1].seatIndex?r[l-1]:null),p=document.createElement("div");if(p.className=u?"p-2.5 rounded-2xl border flex flex-col items-center justify-center text-center transition cursor-pointer relative group bg-[#14182b]/80 border-[#282f50] hover:border-emerald-500/50 shadow-md backdrop-blur-sm":"p-2.5 rounded-2xl border flex flex-col items-center justify-center text-center transition cursor-pointer relative group bg-[#0f1222]/40 border-dashed border-[#222742] hover:border-emerald-500/30 backdrop-blur-sm",u){const f=u.speaking,b=u.uid===(userProfile==null?void 0:userProfile.uid);p.innerHTML=`
          <div class="relative my-1 flex items-center justify-center">
            ${f?`
              <span class="absolute inline-flex h-12 w-12 rounded-full bg-emerald-500/30 animate-ping"></span>
              <span class="absolute inline-flex h-14 w-14 rounded-full bg-emerald-500/15 animate-pulse"></span>
            `:""}
            <div class="w-11 h-11 sm:w-12 sm:h-12 rounded-full overflow-hidden border-2 relative z-10 ${f?"border-emerald-400 shadow-[0_0_12px_#10b981]":"border-[#282f50]"}">
              <img src="${u.avatar||`https://api.dicebear.com/7.x/bottts/svg?seed=${u.uid}`}" class="w-full h-full object-cover">
            </div>
            
            <!-- Mic Mute Icon Badge -->
            <span class="absolute -bottom-1 -right-1 w-4 h-4 rounded-full ${u.muted?"bg-red-500":"bg-emerald-500"} border border-black flex items-center justify-center z-20 text-[8px] text-white">
              <i class="fas ${u.muted?"fa-microphone-slash":"fa-microphone"}"></i>
            </span>

            <!-- Seat Index Badge -->
            <span class="absolute -top-1 -left-1 px-1 bg-black/80 border border-white/20 text-[7px] font-black text-amber-400 rounded-full z-20">#${l}</span>
          </div>

          <span class="text-[10px] font-bold text-white truncate max-w-full mt-0.5 flex items-center justify-center gap-0.5">
            ${window.formatPlayerNameHtml(u,"text-[10px] font-bold truncate","w-3 h-3")}
          </span>
          ${b?'<span class="text-[8px] text-emerald-400 font-extrabold uppercase mt-0.5">Host / Me</span>':'<span class="text-[8px] text-gray-400 uppercase mt-0.5">Seated</span>'}
        `,userProfile&&userProfile.uid!==u.uid&&p.addEventListener("click",()=>{getDoc(doc(db,"voice_rooms",e)).then(g=>{g.exists()&&g.data().hostId===userProfile.uid&&confirm(`Manage ${u.name}:
Click OK to kick player from seat/room.`)&&kn(u.uid)})})}else p.innerHTML=`
          <div class="w-11 h-11 sm:w-12 sm:h-12 rounded-full border-2 border-dashed border-[#282f50] flex items-center justify-center text-[#8890b0] group-hover:text-emerald-400 group-hover:border-emerald-500/40 my-1 relative transition">
            <i class="fas fa-plus text-xs"></i>
            <span class="absolute -top-1 -left-1 px-1 bg-black/80 border border-white/20 text-[7px] font-black text-gray-400 rounded-full z-20">#${l}</span>
          </div>
          <span class="text-[9px] font-semibold text-[#8890b0]">Seat ${l}</span>
        `,p.addEventListener("click",async()=>{if(!(!userProfile||!R))try{await updateDoc(doc(db,"voice_rooms",R,"members",userProfile.uid),{seatIndex:l}),showToastNotification("Moved Seat 🛋️",`You moved to Seat ${l}`)}catch{}});i.appendChild(p)}R&&userProfile&&getDoc(doc(db,"voice_rooms",R)).then(l=>{if(l.exists()){const p=l.data().hostId===userProfile.uid,f=$("aloneWarningBanner");p&&s===1&&r[0]&&r[0].uid===userProfile.uid?f&&f.classList.contains("hidden")&&(f.classList.remove("hidden"),$n()):f&&!f.classList.contains("hidden")&&(f.classList.add("hidden"),ha())}}).catch(l=>console.error("Error checking host status:",l));const c=r.some(l=>l.uid===userProfile.uid);zt&&!c&&R&&(showToastNotification("Kicked from Room 🚫","The host has removed you from the voice channel."),xe(!1)),c&&(zt=!0),G&&Ln(r)},o=>{console.error("Firestore error watching members:",o)})}setInterval(()=>{G&&!ba&&vn()},1e3);async function kn(e){if(R)try{await deleteDoc(doc(db,"voice_rooms",R,"members",e)),showToastNotification("Player Removed 👞","You kicked the player from the room.")}catch(t){console.error(t)}}function Ln(e){userProfile&&(e.forEach(t=>{if(t.uid===userProfile.uid)return;const o=userProfile.uid<t.uid;he[t.uid]||ga(t.uid,o)}),Object.keys(he).forEach(t=>{e.some(o=>o.uid===t)||wa(t)}))}function ga(e,t){console.log(`[WebRTC] Creating connection to ${e}, initiator: ${t}`);const o=new RTCPeerConnection(wn);he[e]=o,G&&G.getTracks().forEach(i=>{o.addTrack(i,G)}),o.onicecandidate=i=>{if(i.candidate){const n=typeof i.candidate.toJSON=="function"?i.candidate.toJSON():{candidate:i.candidate.candidate,sdpMid:i.candidate.sdpMid,sdpMLineIndex:i.candidate.sdpMLineIndex};Go(e,"candidate",JSON.stringify(n))}},o.ontrack=i=>{console.log(`[WebRTC] Got remote audio track from ${e}`);const n=i.streams&&i.streams[0]?i.streams[0]:new MediaStream([i.track]);Cn(e,n)},o.onconnectionstatechange=()=>{console.log(`[WebRTC] Connection state to ${e}: ${o.connectionState}`)},t&&(Yt[e]=!0,o.createOffer().then(i=>o.setLocalDescription(i)).then(()=>{const i=typeof o.localDescription.toJSON=="function"?o.localDescription.toJSON():{type:o.localDescription.type,sdp:o.localDescription.sdp};Go(e,"offer",JSON.stringify(i))}).catch(i=>{console.error("Error creating SDP offer:",i)}).finally(()=>{Yt[e]=!1}))}async function Go(e,t,o){if(!(!R||!userProfile))try{await addDoc(collection(db,"voice_rooms",R,"signaling"),{fromId:userProfile.uid,toId:e,type:t,payload:o,createdAt:serverTimestamp()})}catch{}}function Sn(e){ht&&ht();const t=collection(db,"voice_rooms",e,"signaling"),o=query(t,where("toId","==",userProfile.uid));ht=onSnapshot(o,async i=>{if(userProfile)for(const n of i.docs){const r=n.data();if(await deleteDoc(doc(db,"voice_rooms",e,"signaling",n.id)).catch(()=>{}),Io.has(n.id))continue;Io.add(n.id);let s=he[r.fromId];if(s||(console.log(`[WebRTC] On-demand peer connection creation for ${r.fromId}`),ga(r.fromId,!1),s=he[r.fromId]),!s)continue;const d=JSON.parse(r.payload),c=()=>{s.iceCandidateQueue&&s.iceCandidateQueue.length>0&&(s.iceCandidateQueue.forEach(l=>{s.addIceCandidate(new RTCIceCandidate(l)).catch(u=>console.warn("Error flushing ICE candidate:",u))}),s.iceCandidateQueue=[])};if(s.iceCandidateQueue||(s.iceCandidateQueue=[]),r.type==="offer"){if(Do[r.fromId]===d.sdp){console.log(`[WebRTC] Ignoring duplicate SDP offer from ${r.fromId}`);continue}Do[r.fromId]=d.sdp;const l=userProfile.uid>r.fromId;if(Yt[r.fromId]||s.signalingState!=="stable"){if(!l){console.log(`[WebRTC] Glare/collision detected and we are impolite. Ignoring offer from ${r.fromId}`);continue}console.log(`[WebRTC] Glare/collision detected and we are polite. Rolling back local offer to process remote offer from ${r.fromId}`);try{await s.setLocalDescription({type:"rollback"})}catch(p){console.warn("[WebRTC] Error during polite offer rollback (ignoring):",p)}}try{if(await s.setRemoteDescription(new RTCSessionDescription(d)),s.signalingState==="have-remote-offer"){const p=await s.createAnswer();await s.setLocalDescription(p);const f=typeof s.localDescription.toJSON=="function"?s.localDescription.toJSON():{type:s.localDescription.type,sdp:s.localDescription.sdp};await Go(r.fromId,"answer",JSON.stringify(f)),c()}else console.warn(`[WebRTC] Skipping createAnswer because signalingState is ${s.signalingState} instead of have-remote-offer`)}catch(p){console.error("Error processing SDP offer:",p)}}else if(r.type==="answer"){if(s.signalingState!=="stable")try{await s.setRemoteDescription(new RTCSessionDescription(d)),c()}catch(l){console.error("Error processing SDP answer:",l)}}else if(r.type==="candidate")if(s.remoteDescription&&s.remoteDescription.type)try{await s.addIceCandidate(new RTCIceCandidate(d))}catch(l){console.warn("Error adding ICE candidate:",l)}else s.iceCandidateQueue.push(d)}})}function Cn(e,t){if(Be[e]){try{Be[e].close()}catch{}delete Be[e]}_e[e]&&delete _e[e];let o=document.getElementById(`audio-remote-keepalive-${e}`);o||(o=document.createElement("audio"),o.id=`audio-remote-keepalive-${e}`,o.autoplay=!0,o.muted=!0,o.className="hidden",document.body.appendChild(o)),o.srcObject=t;let i=document.getElementById(`audio-remote-${e}`);i||(i=document.createElement("audio"),i.id=`audio-remote-${e}`,i.autoplay=!0,i.className="hidden",document.body.appendChild(i));try{const n=window.AudioContext||window.webkitAudioContext;if(n){const r=new n,s=r.createMediaStreamSource(t),d=r.createGain();d.gain.value=ie?0:4.5;const c=r.createMediaStreamDestination();if(s.connect(d),d.connect(c),i.srcObject=c.stream,i.muted=ie,r.state==="suspended"){const l=()=>{r.resume(),document.removeEventListener("click",l)};document.addEventListener("click",l),r.resume().catch(()=>{})}Be[e]=r,_e[e]=d,console.log(`[WebRTC] Audio stream for peer ${e} boosted by 4.5x using Web Audio API MediaStreamDestination.`)}else i.srcObject=t,i.muted=ie}catch(n){console.warn("Could not boost remote stream with Web Audio API, falling back to standard audio element:",n),i.srcObject=t,i.muted=ie}}function wa(e){const t=he[e];t&&(t.close(),delete he[e]);const o=document.getElementById(`audio-remote-${e}`);o&&o.remove();const i=document.getElementById(`audio-remote-keepalive-${e}`);if(i&&i.remove(),Be[e]){try{Be[e].close()}catch{}delete Be[e]}_e[e]&&delete _e[e]}function $n(){Ce&&clearInterval(Ce),ut=30;const e=$("aloneCountdown");e&&(e.textContent=ut),Ce=setInterval(()=>{ut--;const t=$("aloneCountdown");t&&(t.textContent=ut),ut<=0&&(clearInterval(Ce),Ce=null,xe(!0),showToastNotification("Room Closed ⏱️","The room was closed automatically because no one else joined."))},1e3)}function ha(){Ce&&(clearInterval(Ce),Ce=null);const e=$("aloneWarningBanner");e&&e.classList.add("hidden")}async function xe(e=!0){if(!R&&!userProfile)return;const t=R;R=null,zt=!1,window.dispatchEvent(new CustomEvent("voice-room-left",{detail:{roomId:t}})),ha();const o=()=>{if(e){const i=$("voiceActiveRoomView");i&&i.classList.add("hidden");const n=$("voiceLobbyView");n&&n.classList.remove("hidden"),showToastNotification("Squad Voice Disconnected 👋","You safely disconnected from voice communication.")}};try{try{const i=new(window.AudioContext||window.webkitAudioContext),n=i.createOscillator(),r=i.createGain();n.type="sine",n.frequency.setValueAtTime(659.25,i.currentTime),n.frequency.setValueAtTime(554.37,i.currentTime+.1),n.frequency.setValueAtTime(440,i.currentTime+.2),r.gain.setValueAtTime(.06,i.currentTime),r.gain.exponentialRampToValueAtTime(.001,i.currentTime+.35),n.connect(r),r.connect(i.destination),n.start(),n.stop(i.currentTime+.35)}catch{}if(Ze&&clearInterval(Ze),Ze=null,ba=null,yt(!1),G&&(G.getTracks().forEach(i=>i.stop()),G=null),Object.keys(he).forEach(wa),Yt={},gn={},Do={},Io.clear(),gt&&gt(),wt&&wt(),ht&&ht(),Qe&&(Qe(),Qe=null),t&&userProfile){await deleteDoc(doc(db,"voice_rooms",t,"members",userProfile.uid)).catch(s=>console.warn("Error deleting member on leave:",s));const i=collection(db,"voice_rooms",t,"members"),n=await getDocs(i).catch(()=>({empty:!0,size:0})),r=doc(db,"voice_rooms",t);if(n.empty||n.size===0)try{await deleteDoc(r),console.log("Empty room deleted completely:",t)}catch(s){console.warn("Could not delete empty room:",s)}else try{await updateDoc(r,{memberCount:n.size})}catch(s){console.warn("Could not update room member count:",s)}}}catch(i){console.error("Error leaving voice room cleanly:",i)}finally{o()}}window.leaveVoiceRoom=xe;async function yi(){if(R)try{const e=doc(db,"voice_rooms",R),t=await getDoc(e);if(t.exists()){const i=!(t.data().locked||!1);await updateDoc(e,{locked:i}),$("btnToggleLockRoom").innerHTML=i?'<i class="fas fa-unlock"></i> Unlock Room':'<i class="fas fa-lock"></i> Lock Room',i?(showToastNotification("Room Locked 🔒","No new players can join the channel."),$("activeRoomLockIcon").classList.remove("hidden")):(showToastNotification("Room Unlocked 🔓","The voice channel is now open for joins."),$("activeRoomLockIcon").classList.add("hidden"))}}catch{}}function Pn(){le=!le;const e=$("btnVoiceToggleMute").querySelector("i");le?(e.className="fas fa-microphone-slash text-red",$("btnVoiceToggleMute").classList.add("border-red-500/30","bg-red-500/10"),showToastNotification("Microphone Muted 🔇","Other players can't hear you."),ki(!0),Fo(!0)):(e.className="fas fa-microphone text-emerald-400",$("btnVoiceToggleMute").classList.remove("border-red-500/30","bg-red-500/10"),showToastNotification("Microphone Active 🎙️","You are unmuted."),ki(!1),Fo(!1)),xa()}function ki(e){G&&G.getAudioTracks().forEach(t=>{t.enabled=!e}),yt(!e)}function Tn(){ie=!ie;const e=$("btnVoiceToggleDeafen").querySelector("i");ie?(e.className="fas fa-volume-mute text-red",$("btnVoiceToggleDeafen").classList.add("border-red-500/30","bg-red-500/10"),showToastNotification("Speakers Deafened 🙉","You won't hear other team players."),yt(!1)):(e.className="fas fa-volume-up text-emerald-400",$("btnVoiceToggleDeafen").classList.remove("border-red-500/30","bg-red-500/10"),showToastNotification("Speakers Active 🔊","Listening to tactical audio..."),yt(!le)),Object.keys(_e).forEach(t=>{const o=_e[t];o&&(o.gain.value=ie?0:3.5)}),Object.keys(he).forEach(t=>{const o=document.getElementById(`audio-remote-${t}`);o&&(o.muted=ie)}),xa()}async function xa(){if(!(!R||!userProfile))try{await updateDoc(doc(db,"voice_rooms",R,"members",userProfile.uid),{muted:le||Bo&&!No,deafened:ie,micStatus:!le&&(!Bo||No)})}catch{}}function An(e){wt&&wt();const t=collection(db,"voice_rooms",e,"chats"),o=query(t,orderBy("createdAt","asc"),limit(50));wt=onSnapshot(o,i=>{const n=$("roomChatMsgs");if(n){if(n.innerHTML="",i.empty){n.innerHTML=`
        <div class="h-full flex flex-col items-center justify-center text-t3 text-center p-4">
          <i class="far fa-comments text-xl text-emerald-500/20 mb-1"></i>
          <p class="text-[10px]">No messages in this squad room yet.</p>
        </div>
      `;return}i.forEach(r=>{const s=r.data(),d=document.createElement("div");d.className="flex items-start gap-2 text-[10px] leading-relaxed",d.innerHTML=`
        <img src="${s.userAvatar}" class="w-6 h-6 rounded-full border border-bdr shrink-0 mt-0.5 bg-card/40"/>
        <div>
          ${window.formatPlayerNameHtml({name:s.userName,isPremium:s.isPremium||s.premium,isVerified:s.isVerified||s.hasBlueTick||s.verified},"font-black mr-1 text-white","w-3 h-3")}
          <span class="text-t2 break-all font-medium">${s.message}</span>
        </div>
      `,n.appendChild(d)}),n.scrollTop=n.scrollHeight}},i=>{console.error("Firestore error watching room chat:",i)})}function Li(){const e=$("voiceInviteFriendsList");if(e){if(e.innerHTML='<div class="text-center p-4 animate-pulse text-t3">Loading squad list...</div>',$("mInviteFriendToVoice").classList.remove("hidden"),!friendList||friendList.length===0){e.innerHTML=`
      <div class="text-center p-6 text-t3">
        <i class="fas fa-users-slash text-xl mb-1 text-emerald-500/30"></i>
        <p>No active online friends found. Add friends in the Chat tab first!</p>
      </div>
    `;return}e.innerHTML="",friendList.forEach(t=>{var i;const o=document.createElement("div");o.className="p-2.5 bg-card border border-bdr rounded-xl flex items-center justify-between text-xs font-semibold",o.innerHTML=`
      <div class="flex items-center gap-2.5 truncate flex-1 pr-2">
        <img src="${t.av||"https://api.dicebear.com/7.x/bottts/svg?seed="+t.uid}" class="w-7 h-7 rounded-full border border-bdr shrink-0 bg-card/40"/>
        <div class="truncate">
          <div class="text-white truncate">${t.name}</div>
          <div class="text-[9px] text-t3 truncate">${t.handle}</div>
        </div>
      </div>
      <button class="btn-send-room-invite px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/25 hover:border-transparent rounded-lg text-[9px] font-bold uppercase tracking-wider transition cursor-pointer" data-uid="${t.uid}">
        Invite
      </button>
    `,(i=o.querySelector(".btn-send-room-invite"))==null||i.addEventListener("click",n=>{Mn(t.uid,t.name,n.target)}),e.appendChild(o)})}}async function Mn(e,t,o){if(!(!R||!userProfile))try{o.disabled=!0,o.textContent="Sending...",o.classList.add("opacity-50"),await addDoc(collection(db,"users",e,"invitations"),{roomId:R,roomName:$("activeRoomName").textContent,hostName:userProfile.name,invitedBy:userProfile.uid,createdAt:serverTimestamp()});try{const i=[userProfile.uid,e].sort().join("_");await addDoc(collection(db,"dms",i,"messages"),{text:`[Voice Invite to "${$("activeRoomName").textContent}"]`,sender:userProfile.uid,senderName:userProfile.name,isVoiceRoomInvite:!0,voiceRoomId:R,voiceRoomName:$("activeRoomName").textContent,voiceRoomGame:$("activeRoomGame").textContent,createdAt:serverTimestamp()})}catch(i){console.warn("Failed to post invite to DM chat history:",i)}o.textContent="Sent ✓",o.classList.remove("bg-emerald-500/10","text-emerald-400"),o.classList.add("bg-emerald-600","text-white"),showToastNotification("Invitation Dispatched 🎮",`Sent squad invite to ${t}!`)}catch(i){console.error("Error sending voice invitation:",i),o.disabled=!1,o.textContent="Invite",o.classList.remove("opacity-50")}}let vo=null;function Rn(e){vo&&vo();const t=collection(db,"users",e,"invitations"),o=query(t,orderBy("createdAt","desc"),limit(5));vo=onSnapshot(o,i=>{i.docChanges().forEach(n=>{if(n.type==="added"){const r=n.doc.data();if((r.createdAt?(Date.now()-r.createdAt.seconds*1e3)/1e3:0)>120){deleteDoc(doc(db,"users",e,"invitations",n.doc.id)).catch(()=>{});return}En(n.doc.id,r)}})})}function En(e,t){var i,n;let o=document.createElement("div");o.id=`invite-toast-${e}`,o.className="fixed top-16 right-4 p-4 bg-gradient-to-br from-[#0c0e17] to-[#121c21] border border-emerald-500/45 rounded-2xl shadow-[0_0_25px_rgba(16,185,129,0.3)] z-[999] flex flex-col gap-3 max-w-[320px] w-full animate-bounce",o.innerHTML=`
    <div class="flex items-start gap-3 text-xs">
      <div class="w-9 h-9 rounded-xl bg-emerald-950 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
        <i class="fas fa-gamepad text-lg animate-pulse"></i>
      </div>
      <div>
        <div class="font-black text-white uppercase tracking-wider text-[11px]">SQUAD INVITATION</div>
        <p class="text-t2 text-[10px] mt-0.5"><strong class="text-white">${t.hostName}</strong> wants you to join their voice channel: <strong class="text-emerald-400">"${t.roomName}"</strong></p>
      </div>
    </div>
    <div class="flex gap-2">
      <button class="btn-accept-invite flex-1 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black uppercase rounded-lg text-[9px] border border-emerald-500/30 transition shadow-lg cursor-pointer">Join voice</button>
      <button class="btn-reject-invite px-3 py-1.5 bg-card/80 hover:bg-card border border-bdr hover:text-white text-t3 font-bold uppercase rounded-lg text-[9px] transition cursor-pointer">Decline</button>
    </div>
  `,(i=o.querySelector(".btn-accept-invite"))==null||i.addEventListener("click",()=>{switchTab("Voice"),co(t.roomId),o.remove(),userProfile&&deleteDoc(doc(db,"users",userProfile.uid,"invitations",e)).catch(()=>{})}),(n=o.querySelector(".btn-reject-invite"))==null||n.addEventListener("click",()=>{o.remove(),userProfile&&deleteDoc(doc(db,"users",userProfile.uid,"invitations",e)).catch(()=>{})}),document.body.appendChild(o),setTimeout(()=>{o&&o.remove()},3e4)}window.addEventListener("beforeunload",()=>{R&&xe(!1)});window.addEventListener("pagehide",()=>{R&&xe(!1)});let va=[];function Dn(e){try{return new URL(e),!0}catch{return!1}}function In(e){const t=new Date,o=t.getMonth(),i=t.getFullYear();return e.some(n=>{let r;return n.submittedAt?(n.submittedAt.seconds?r=new Date(n.submittedAt.seconds*1e3):r=new Date(n.submittedAt),r.getMonth()===o&&r.getFullYear()===i):!1})}function ya(e){if(window.userSubmissionsUnsub){try{window.userSubmissionsUnsub()}catch{}window.userSubmissionsUnsub=null}const t=query(collection(db,"video_submissions"),where("userId","==",e));window.userSubmissionsUnsub=onSnapshot(t,o=>{const i=[];o.forEach(n=>{i.push({id:n.id,...n.data()})}),i.sort((n,r)=>{var c,l;const s=(c=n.submittedAt)!=null&&c.seconds?n.submittedAt.seconds*1e3:n.submittedAt?new Date(n.submittedAt).getTime():0;return((l=r.submittedAt)!=null&&l.seconds?r.submittedAt.seconds*1e3:r.submittedAt?new Date(r.submittedAt).getTime():0)-s}),va=i,ka(i)},o=>{console.error("Submissions listener error: ",o)})}function Nn(){const e=userProfile||guestProfile;e&&ya(e.uid)}function ka(e){const t=$("mySubmissionsList");if(t){if(e.length===0){t.innerHTML=`
      <tr>
        <td colspan="5" class="p-8 text-center text-t3">No video submissions recorded yet. Create your first promotional video and claim epic rewards! 🎬</td>
      </tr>
    `;return}t.innerHTML=e.map(o=>{let i="Unknown";o.submittedAt&&(i=(o.submittedAt.seconds?new Date(o.submittedAt.seconds*1e3):new Date(o.submittedAt)).toLocaleString());let n="bg-yellow-500/10 text-yellow-500 border-yellow-500/20";o.status==="approved"&&(n="bg-emerald-500/10 text-emerald-400 border-emerald-500/20"),o.status==="rejected"&&(n="bg-red/10 text-red border-red/20");const r=`<span class="px-2.5 py-1 text-[10px] font-bold rounded-md border uppercase tracking-wider ${n}">${o.status}</span>`;let s="Pending Review";return o.status==="approved"?s=o.reward?`${o.reward}`:"Approved":o.status==="rejected"&&(s=`<span class="text-red">Rejected (${o.rejectReason||"Does not meet requirements"})</span>`),`
      <tr class="hover:bg-white/[0.01] transition">
        <td class="p-3 font-semibold text-white">${o.platform}</td>
        <td class="p-3 max-w-[200px] truncate"><a href="${o.videoLink}" target="_blank" class="text-blue-400 hover:underline inline-flex items-center gap-1">${o.videoLink} <i class="fas fa-external-link-alt text-[9px]"></i></a></td>
        <td class="p-3 text-[11px] text-t3 font-mono">${i}</td>
        <td class="p-3">${r}</td>
        <td class="p-3 font-semibold text-gold text-[11px]">${s}</td>
      </tr>
    `}).join("")}}document.addEventListener("DOMContentLoaded",()=>{const e=$("btnSubmitVideo");e&&e.addEventListener("click",async()=>{const t=$("subVideoErr"),o=$("subVideoSuccess"),i=$("btnSubmitVideo");t.classList.add("hidden"),o.classList.add("hidden");const n=$("subVideoPlatform").value,r=$("subVideoLink").value.trim(),s=userProfile||guestProfile;if(!s){t.textContent="Please sign in to submit a promo video. ❌",t.classList.remove("hidden");return}if(!r){t.textContent="Please enter a valid video link. ❌",t.classList.remove("hidden");return}if(!Dn(r)){t.textContent="Invalid URL format. Please enter a complete website link. ❌",t.classList.remove("hidden");return}if(In(va)){t.textContent="You have already submitted a video this calendar month. Limits are 1 submission per user per month. ❌",t.classList.remove("hidden");return}try{i.disabled=!0,i.innerHTML='<i class="fas fa-spinner animate-spin"></i> Submitting...',await addDoc(collection(db,"video_submissions"),{userId:s.uid,username:s.name,userEmail:s.email||"Guest Player",platform:n,videoLink:r,status:"pending",submittedAt:serverTimestamp(),reward:null}),o.textContent="Your video has been submitted successfully! ArenaX Staff will review it and reward you shortly. 🍃 Scroll down to see history.",o.classList.remove("hidden"),$("subVideoLink").value=""}catch(d){console.error("Submission error: ",d),t.textContent="Failed to submit video: "+d.message,t.classList.remove("hidden")}finally{i.disabled=!1,i.innerHTML='<i class="fas fa-scroll"></i> Submit Promo Jutsu'}})});window.initVoiceRoomsSystem=hn;window.listenToVoiceRooms=Uo;window.startUserSubmissionsListener=ya;window.loadUserSubmissions=Nn;window.renderUserSubmissions=ka;function Bn(){if(document.getElementById("submission-splash-overlay"))return;const e=document.createElement("div");e.id="submission-splash-overlay",e.className="fixed inset-0 bg-black flex flex-col items-center justify-center opacity-100 transition-opacity duration-[800ms] ease-out",e.style.zIndex="999999";const t=document.createElement("video");t.src="071702_1784293531987.mp4",t.className="max-w-[80%] max-h-[70%] object-contain pointer-events-none mb-6",t.playsInline=!0,t.controls=!1,t.loop=!0,e.appendChild(t);let o=!1;const i=()=>{o||(o=!0,e.classList.replace("opacity-100","opacity-0"),setTimeout(()=>{try{t.pause(),t.src="",t.load()}catch{}e.remove()},850))},n=document.createElement("button");n.className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-widest rounded-full border border-white/20 transition active:scale-95 cursor-pointer flex items-center gap-2",n.innerHTML='Skip <i class="fas fa-forward text-[10px]"></i>',n.addEventListener("click",i),e.appendChild(n),document.body.appendChild(e),t.play().then(()=>{console.log("Splash promo video playing with sound successfully!")}).catch(r=>{console.log("Audio-enabled autoplay blocked. Falling back to muted playback.",r),t.muted=!0,t.play().catch(s=>console.error("Muted playback failed:",s))}),setTimeout(i,1e4)}function Fn(){const e=$("btnRedeemPromo"),t=$("inpPromoCode"),o=$("promoMsg");if(!e||!t||!o)return;const i=(n,r)=>{o.textContent=n,o.classList.remove("hidden"),r==="success"?o.className="text-green bg-green-500/10 border border-green-500/20 text-[10px] p-2.5 rounded-lg border leading-normal mt-2":r==="error"?o.className="text-red bg-red-500/10 border border-red-500/20 text-[10px] p-2.5 rounded-lg border leading-normal mt-2":o.className="text-gold bg-gold/10 border border-gold/20 text-[10px] p-2.5 rounded-lg border leading-normal mt-2"};e.addEventListener("click",async()=>{if(o.classList.add("hidden"),!userProfile){i("Please sign in to redeem a promo code. ❌","error");return}const n=t.value.trim().toUpperCase();if(!n){i("Please enter a promo code first! ⚠️","warning");return}const r={WELCOME50:50,ARENAX100:100,NINJA150:150,HOKAGE500:500,GEMINI77:77,AXCOIN200:200};if(!(n in r)){i("Invalid promo code! Please check and try again. ❌","error");return}const s=r[n];if((userProfile.redeemedPromoCodes||[]).includes(n)){i(`This promo code (${n}) has already been redeemed on your account! ⚠️`,"warning");return}e.disabled=!0,e.textContent="Applying...";try{const c=doc(db,"users",userProfile.uid);await updateDoc(c,{balance:increment(s),redeemedPromoCodes:arrayUnion(n)});const l="PROMO-"+n+"-"+Math.floor(1e5+Math.random()*9e5);await addDoc(collection(db,"deposit_requests"),{userId:userProfile.uid,userName:userProfile.name,userHandle:userProfile.handle,amountPKR:0,amountAX:s,method:`Promo Code (${n})`,txnId:l,status:"approved",type:"deposit",submittedAt:serverTimestamp()}),t.value="",i(`Success! Promo code ${n} applied. ${s} AX Coins have been added to your wallet! 🎉🍃`,"success")}catch(c){console.error("Error applying promo code:",c),i("Failed to apply promo code. Please try again. Error: "+c.message,"error")}finally{e.disabled=!1,e.textContent="Apply"}})}Fn();window.playSubmissionSplash=Bn;window.openVoiceRoomModal=function(){const e=$("mCreateVoiceRoom");e&&e.classList.remove("hidden")};window.closeVoiceRoomModal=function(){const e=$("mCreateVoiceRoom");e&&e.classList.add("hidden")};window.openVoiceRoomGiftModal=typeof openVoiceRoomGiftModal=="function"?openVoiceRoomGiftModal:function(){const e=$("mVoiceRoomGiftModal");e&&e.classList.remove("hidden")};window.closeVoiceRoomGiftModal=typeof closeVoiceRoomGiftModal=="function"?closeVoiceRoomGiftModal:function(){const e=$("mVoiceRoomGiftModal");e&&e.classList.add("hidden")};const Si={BASE_URL:"./",DEV:!1,MODE:"production",PROD:!0,SSR:!1};let Pe=[],et=null,Jt="image",Ci=!1;function at(e){return String(e||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}let Pt={},$i=!1;function uo(){if(!Ci){Ci=!0;try{const e=query(collection(db,"moments"),orderBy("createdAt","desc"));onSnapshot(e,t=>{Pe=[],t.forEach(o=>{Pe.push({id:o.id,...o.data()})}),Un(),$("mMomentsProfileModal")&&!$("mMomentsProfileModal").classList.contains("hidden")&&La(),$("mMomentsFeedModal")&&!$("mMomentsFeedModal").classList.contains("hidden")&&nt()},t=>{console.warn("Error listening to moments:",t)})}catch(e){console.warn("Failed to subscribe to moments:",e)}if(!$i){$i=!0;try{const e=query(collectionGroup(db,"premiumReactions"));onSnapshot(e,t=>{const o={};t.forEach(i=>{var s,d;const n=i.data(),r=n.momentId||((d=(s=i.ref.parent)==null?void 0:s.parent)==null?void 0:d.id);r&&(o[r]||(o[r]=[]),o[r].push({id:i.id,...n,momentId:r}))}),Pt=o,$("mMomentsFeedModal")&&!$("mMomentsFeedModal").classList.contains("hidden")&&nt()},t=>{console.warn("Error listening to reactions:",t)})}catch(e){console.warn("Failed to subscribe to reactions:",e)}}}}function Un(){const e=userProfile||guestProfile||window.currentUser,t=Pe.filter(i=>e&&i.userId===e.uid);$("myMomentsCount")&&($("myMomentsCount").textContent=t.length);const o=$("profileMomentsActionArea");o&&(t.length===0?o.innerHTML=`
      <button
        id="btnShareMomentsProfile"
        type="button"
        onclick="openUploadMomentModal()"
        class="w-full py-3 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:brightness-110 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition cursor-pointer tracking-wide uppercase"
      >
        <i class="fas fa-camera text-sm"></i> Share your moments!
      </button>
    `:o.innerHTML=`
      <div class="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 no-scrollbar">
        <button
          type="button"
          onclick="openUploadMomentModal()"
          class="w-16 h-16 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-500 hover:brightness-110 text-slate-950 flex flex-col items-center justify-center shrink-0 font-black shadow-md hover:scale-105 transition cursor-pointer"
          title="Share new moment"
        >
          <i class="fas fa-plus text-base"></i>
          <span class="text-[9px] uppercase font-extrabold mt-0.5">Add</span>
        </button>
        ${t.map(i=>`
          <div onclick="openViewMomentModal('${i.id}')" class="relative w-16 h-16 rounded-xl overflow-hidden border border-amber-500/30 shrink-0 cursor-pointer group shadow-sm bg-black">
            ${i.mediaType==="video"?`
              <div class="w-full h-full relative">
                <video src="${i.mediaUrl}" class="w-full h-full object-cover"></video>
                <div class="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <i class="fas fa-play text-white text-xs drop-shadow"></i>
                </div>
              </div>
            `:`
              <img src="${i.mediaUrl}" alt="Moment" class="w-full h-full object-cover group-hover:scale-105 transition" />
            `}
          </div>
        `).join("")}
      </div>
    `)}function La(){const e=userProfile||guestProfile||window.currentUser,t=Pe.filter(i=>e&&i.userId===e.uid),o=$("momentsProfilePageContent");o&&(t.length===0?o.innerHTML=`
      <div class="py-12 px-4 text-center space-y-6">
        <div class="w-24 h-24 mx-auto rounded-full bg-[#1b1e2e] border-2 border-[#f0c040]/30 flex items-center justify-center shadow-2xl text-[#f0c040] text-4xl">
          <i class="fas fa-camera"></i>
        </div>
        <div class="space-y-1">
          <h3 class="text-lg font-extrabold text-white">Share Your Moments!</h3>
          <p class="text-xs text-gray-400 max-w-xs mx-auto">
            No moments uploaded yet. Post your videos (up to 30s) or photos to display them on your profile!
          </p>
        </div>
        <button onclick="openUploadMomentModal()" class="w-full max-w-xs mx-auto py-3.5 bg-gradient-to-r from-[#f0c040] via-amber-400 to-yellow-500 hover:brightness-110 text-slate-950 font-black rounded-2xl text-xs flex items-center justify-center gap-2 shadow-xl shadow-amber-500/20 active:scale-95 transition cursor-pointer tracking-wider uppercase">
          <i class="fas fa-camera text-base"></i> Share Your Moments!
        </button>
      </div>
    `:o.innerHTML=`
      <div class="space-y-3">
        <div class="flex items-center justify-between px-1">
          <span class="text-xs font-bold text-gray-400">Your Highlights (${t.length})</span>
          <button onclick="openUploadMomentModal()" class="px-3 py-1.5 bg-gradient-to-r from-[#f0c040] to-amber-500 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition cursor-pointer">
            <i class="fas fa-plus"></i> Add New
          </button>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
          ${t.map(i=>`
            <div onclick="openViewMomentModal('${i.id}')" class="relative rounded-xl overflow-hidden border border-[#252a45] bg-[#141724] group cursor-pointer shadow-md hover:border-[#f0c040]/60 transition">
              <div class="w-full h-36 relative bg-black">
                ${i.mediaType==="video"?`
                  <video src="${i.mediaUrl}" class="w-full h-full object-cover"></video>
                  <div class="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/20 transition">
                    <i class="fas fa-play text-white text-lg drop-shadow"></i>
                  </div>
                  <span class="absolute bottom-2 right-2 bg-black/70 text-[9px] text-amber-400 px-1.5 py-0.5 rounded font-bold border border-amber-400/30">
                    <i class="fas fa-video mr-1"></i>30s
                  </span>
                `:`
                  <img src="${i.mediaUrl}" alt="Moment" class="w-full h-full object-cover group-hover:scale-105 transition" />
                `}
                <button
                  onclick="event.stopPropagation(); deleteMoment('${i.id}')"
                  class="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-600/80 hover:bg-red-600 text-white flex items-center justify-center text-xs transition z-10"
                  title="Delete moment"
                >
                  <i class="fas fa-trash"></i>
                </button>
              </div>
              ${i.caption?`<div class="p-2 text-[11px] font-medium text-gray-200 truncate">${at(i.caption)}</div>`:""}
            </div>
          `).join("")}
        </div>
      </div>
    `)}window.momentsFeedFilterUserId=null;window.momentsFeedFilterUserName=null;function _n(e,t){window.momentsFeedFilterUserId=e,window.momentsFeedFilterUserName=t,Sa()}function nt(){const e=$("momentsFeedPageContent");if(!e)return;const t=userProfile||guestProfile||window.currentUser,o=!!(t&&(t.premium||t.isPremium||t.isVIP));$("momentsFeedTitle")&&($("momentsFeedTitle").innerHTML=`<i class="fas fa-camera text-[#f0c040] mr-2"></i>${window.momentsFeedFilterUserName?at(window.momentsFeedFilterUserName)+"'s Moments":"Community Moments"}`);const i=window.momentsFeedFilterUserId?Pe.filter(n=>n.userId===window.momentsFeedFilterUserId):Pe;i.length===0?e.innerHTML=`
      <div class="py-16 text-center space-y-3">
        <i class="fas fa-photo-video text-4xl text-[#f0c040]/40"></i>
        <p class="text-sm font-semibold text-gray-400">No moments found.</p>
        ${window.momentsFeedFilterUserId?`
          <button onclick="window.momentsFeedFilterUserId = null; window.momentsFeedFilterUserName = null; renderMomentsFeedPage();" class="px-4 py-2 bg-[#f0c040] text-slate-950 font-bold text-xs rounded-xl cursor-pointer">
            View All Community Moments
          </button>
        `:`
          <button onclick="openUploadMomentModal()" class="px-4 py-2 bg-[#f0c040] text-slate-950 font-bold text-xs rounded-xl cursor-pointer">
            Post First Moment
          </button>
        `}
      </div>
    `:e.innerHTML=i.map(n=>{const r=t&&n.likes&&n.likes.includes(t.uid),s=t&&n.userId===t.uid,d=n.createdAt&&n.createdAt.seconds?new Date(n.createdAt.seconds*1e3).toLocaleDateString():"Just now",c=window.formatPlayerNameHtml(n,"text-xs font-bold"),l=Pt[n.id]||[],u=l.filter(b=>b.reactionType==="cat").length,p=l.filter(b=>b.reactionType==="teasing").length,f=t?l.find(b=>b.userId===t.uid):null;return`
        <div class="bg-[#141726] border border-[#252a45] rounded-2xl overflow-hidden shadow-xl space-y-3 p-3.5">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <img src="${n.userAv||"https://api.dicebear.com/7.x/bottts/svg?seed="+n.userId}" class="w-10 h-10 rounded-full object-cover border border-[#f0c040]/30 bg-[#111420]" />
              <div>
                <div class="flex items-center gap-1">${c}</div>
                <span class="text-[10px] text-gray-400">${d}</span>
              </div>
            </div>
            ${s?`
              <button onclick="deleteMoment('${n.id}')" class="text-gray-400 hover:text-red-400 text-xs p-1.5 transition cursor-pointer" title="Delete">
                <i class="fas fa-trash"></i>
              </button>
            `:""}
          </div>

          <div class="rounded-xl overflow-hidden bg-black border border-white/5 relative">
            ${n.mediaType==="video"?`
              <video src="${n.mediaUrl}" controls playsinline class="w-full max-h-[450px] object-contain mx-auto bg-black"></video>
            `:`
              <img src="${n.mediaUrl}" class="w-full max-h-[450px] object-cover mx-auto" />
            `}
          </div>

          ${n.caption?`<p class="text-xs text-gray-200 font-medium px-1 leading-relaxed">${at(n.caption)}</p>`:""}

          <div class="flex items-center justify-between pt-1 border-t border-[#22273f]">
            <div class="flex items-center gap-2">
              <div class="heart-container" title="Like">
                <input 
                  type="checkbox" 
                  class="checkbox" 
                  id="like-html-${n.id}" 
                  ${r?"checked":""} 
                  onchange="toggleLikeMoment('${n.id}')"
                />
                <div class="svg-container">
                  <svg viewBox="0 0 24 24" class="svg-outline" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17.5,1.917a6.4,6.4,0,0,0-5.5,3.3,6.4,6.4,0,0,0-5.5-3.3A6.8,6.8,0,0,0,0,8.967c0,4.547,4.786,9.513,8.8,12.88a4.974,4.974,0,0,0,6.4,0C19.214,18.48,24,13.514,24,8.967A6.8,6.8,0,0,0,17.5,1.917Zm-3.585,18.4a2.973,2.973,0,0,1-3.83,0C4.947,16.006,2,11.87,2,8.967a4.8,4.8,0,0,1,4.5-5.05A4.8,4.8,0,0,1,11,8.967a1,1,0,0,0,2,0,4.8,4.8,0,0,1,4.5-5.05A4.8,4.8,0,0,1,22,8.967C22,11.87,19.053,16.006,13.915,20.313Z">
                    </path>
                  </svg>
                  <svg viewBox="0 0 24 24" class="svg-filled" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17.5,1.917a6.4,6.4,0,0,0-5.5,3.3,6.4,6.4,0,0,0-5.5-3.3A6.8,6.8,0,0,0,0,8.967c0,4.547,4.786,9.513,8.8,12.88a4.974,4.974,0,0,0,6.4,0C19.214,18.48,24,13.514,24,8.967A6.8,6.8,0,0,0,17.5,1.917Z">
                    </path>
                  </svg>
                  <svg class="svg-celebrate" width="100" height="100" xmlns="http://www.w3.org/2000/svg">
                    <polygon points="10,10 20,20"></polygon>
                    <polygon points="10,50 20,50"></polygon>
                    <polygon points="20,80 30,70"></polygon>
                    <polygon points="90,10 80,20"></polygon>
                    <polygon points="90,50 80,50"></polygon>
                    <polygon points="80,80 70,70"></polygon>
                  </svg>
                </div>
              </div>
              <span class="text-xs font-bold text-gray-300">
                ${n.likeCount||(n.likes?n.likes.length:0)}
              </span>
            </div>

            <!-- Right Area: Premium Reactions UI -->
            <div class="flex items-center gap-2">
              ${l.length>0?`
                <button
                  type="button"
                  onclick="openWhoReactedModal('${n.id}')"
                  class="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-[#1b1f35] hover:bg-[#252c4a] border border-amber-400/30 text-amber-300 active:scale-95 transition cursor-pointer shadow-xs"
                  title="View who reacted"
                >
                  ${u>0?`
                    <span class="flex items-center gap-1">
                      <img src="/cat.gif" alt="Cat" class="w-5 h-5 object-contain" />
                      <span class="text-[11px] font-extrabold text-amber-300">${u}</span>
                    </span>
                  `:""}
                  ${p>0?`
                    <span class="flex items-center gap-1">
                      <img src="/teasing.gif" alt="Teasing" class="w-5 h-5 object-contain" />
                      <span class="text-[11px] font-extrabold text-amber-300">${p}</span>
                    </span>
                  `:""}
                </button>
              `:""}

              ${o?`
                <button
                  type="button"
                  onclick="openPremiumReactionPicker('${n.id}')"
                  class="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border transition active:scale-95 cursor-pointer shadow-xs ${f?"bg-amber-500/20 border-amber-400 text-amber-300 shadow-[0_0_10px_rgba(240,192,64,0.2)]":"bg-gradient-to-r from-purple-500/15 via-[#1b1e32] to-amber-500/15 hover:from-purple-500/25 hover:to-amber-500/25 border-amber-400/40 hover:border-amber-400 text-amber-300"}"
                  title="Premium Reaction"
                >
                  <i class="fas fa-crown text-[10px] text-amber-400"></i>
                  <span>${f?"Reacted":"React"}</span>
                  ${f?`
                    <img src="${f.reactionType==="cat"?"/cat.gif":"/teasing.gif"}" alt="Reaction" class="w-4 h-4 object-contain inline-block ml-0.5" />
                  `:""}
                </button>
              `:""}

              ${!o&&l.length===0?`
                <span class="text-[10px] text-gray-500 uppercase font-semibold tracking-wider">ArenaX Moments</span>
              `:""}
            </div>
          </div>
        </div>
      `}).join("")}function Gn(e){const t=userProfile||guestProfile||window.currentUser;if(!t){alert("Please sign in to react.");return}if(!!!(t.premium||t.isPremium||t.isVIP)){alert("👑 Premium Reactions are exclusive to ArenaX Premium members!");return}const n=(Pt[e]||[]).find(d=>d.userId===t.uid),r=$("premiumReactionPickerOptions");r&&(r.innerHTML=`
      <button
        onclick="submitPremiumReaction('${e}', 'cat')"
        class="p-3.5 rounded-2xl border flex flex-col items-center gap-2 transition cursor-pointer active:scale-95 group ${n&&n.reactionType==="cat"?"bg-amber-500/15 border-amber-400 shadow-[0_0_15px_rgba(240,192,64,0.25)]":"bg-[#1a1e33] border-[#292f50] hover:border-amber-400/50 hover:bg-[#20253e]"}"
      >
        <div class="w-20 h-20 rounded-xl overflow-hidden bg-black/40 border border-white/5 flex items-center justify-center p-1 group-hover:scale-105 transition">
          <img src="/cat.gif" alt="Cat Reaction" class="w-full h-full object-contain" />
        </div>
        <div class="text-center">
          <span class="text-xs font-bold text-white block">Cat Wink</span>
          <span class="text-[10px] text-amber-400/80 font-semibold">${n&&n.reactionType==="cat"?"✓ Selected":"Tap to React"}</span>
        </div>
      </button>

      <button
        onclick="submitPremiumReaction('${e}', 'teasing')"
        class="p-3.5 rounded-2xl border flex flex-col items-center gap-2 transition cursor-pointer active:scale-95 group ${n&&n.reactionType==="teasing"?"bg-amber-500/15 border-amber-400 shadow-[0_0_15px_rgba(240,192,64,0.25)]":"bg-[#1a1e33] border-[#292f50] hover:border-amber-400/50 hover:bg-[#20253e]"}"
      >
        <div class="w-20 h-20 rounded-xl overflow-hidden bg-black/40 border border-white/5 flex items-center justify-center p-1 group-hover:scale-105 transition">
          <img src="/teasing.gif" alt="Teasing Reaction" class="w-full h-full object-contain" />
        </div>
        <div class="text-center">
          <span class="text-xs font-bold text-white block">Teasing Wink</span>
          <span class="text-[10px] text-amber-400/80 font-semibold">${n&&n.reactionType==="teasing"?"✓ Selected":"Tap to React"}</span>
        </div>
      </button>
    `);const s=$("premiumReactionPickerRemoveArea");s&&(n?(s.classList.remove("hidden"),s.innerHTML=`
        <button
          onclick="removePremiumReaction('${e}')"
          class="text-xs text-red-400 hover:text-red-300 font-semibold py-1 px-3 rounded-lg hover:bg-red-500/10 transition cursor-pointer"
        >
          <i class="fas fa-trash-alt mr-1"></i> Remove My Reaction
        </button>
      `):s.classList.add("hidden")),$("mPremiumReactionPickerModal")&&$("mPremiumReactionPickerModal").classList.remove("hidden")}function Ko(){$("mPremiumReactionPickerModal")&&$("mPremiumReactionPickerModal").classList.add("hidden")}async function Vn(e,t){const o=userProfile||guestProfile||window.currentUser;if(!o)return;const n=(Pt[e]||[]).find(r=>r.userId===o.uid);try{const r=doc(db,"moments",e,"premiumReactions",o.uid);n&&n.reactionType===t?await deleteDoc(r):await setDoc(r,{momentId:e,userId:o.uid,username:o.name||"Player",profilePhoto:o.av||`https://api.dicebear.com/7.x/bottts/svg?seed=${o.uid}`,reactionType:t,createdAt:serverTimestamp()},{merge:!0}),Ko()}catch(r){console.error("Failed to submit reaction:",r),alert("Failed to save reaction: "+(r.message||"Error"))}}async function Hn(e){const t=userProfile||guestProfile||window.currentUser;if(t)try{const o=doc(db,"moments",e,"premiumReactions",t.uid);await deleteDoc(o),Ko()}catch(o){console.error("Failed to delete reaction:",o)}}function qn(e){const t=Pt[e]||[];$("whoReactedSubtitle")&&($("whoReactedSubtitle").textContent=`${t.length} total reaction${t.length===1?"":"s"}`);const o=$("whoReactedList");o&&(t.length===0?o.innerHTML='<div class="py-8 text-center text-gray-400 text-xs">No reactions yet.</div>':o.innerHTML=t.map(i=>{const n=i.reactionType==="cat",r=n?"/cat.gif":"/teasing.gif",s=n?"Cat Wink":"Teasing Wink";return`
          <div class="flex items-center justify-between p-2.5 rounded-xl bg-[#1b1f35] border border-[#262c4c]">
            <div class="flex items-center gap-2.5">
              <img
                src="${i.profilePhoto||"https://api.dicebear.com/7.x/bottts/svg?seed="+i.userId}"
                alt="${at(i.username)}"
                class="w-9 h-9 rounded-full object-cover border border-amber-400/40 bg-[#101320]"
              />
              <div>
                <h5 class="text-xs font-bold text-white flex items-center gap-1">
                  <span class="golden-name-shimmer text-amber-300 font-extrabold">${at(i.username)}</span>
                  <i class="fas fa-crown text-amber-400 text-[10px]" title="Premium"></i>
                </h5>
                <span class="text-[10px] text-gray-400">
                  ${i.createdAt&&i.createdAt.seconds?new Date(i.createdAt.seconds*1e3).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}):"Recently"}
                </span>
              </div>
            </div>
            <div class="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-black/40 border border-white/10">
              <img src="${r}" alt="${s}" class="w-6 h-6 object-contain" />
              <span class="text-[10px] font-bold text-amber-300 hidden xs:inline">${s}</span>
            </div>
          </div>
        `}).join("")),$("mWhoReactedModal")&&$("mWhoReactedModal").classList.remove("hidden")}function jn(){$("mWhoReactedModal")&&$("mWhoReactedModal").classList.add("hidden")}window.openPremiumReactionPicker=Gn;window.closePremiumReactionPicker=Ko;window.submitPremiumReaction=Vn;window.removePremiumReaction=Hn;window.openWhoReactedModal=qn;window.closeWhoReactedModal=jn;function On(){uo(),La(),$("mMomentsProfileModal")&&$("mMomentsProfileModal").classList.remove("hidden")}function Wn(){$("mMomentsProfileModal")&&$("mMomentsProfileModal").classList.add("hidden")}function Sa(){uo(),nt(),$("mMomentsFeedModal")&&$("mMomentsFeedModal").classList.remove("hidden")}function Xn(){window.momentsFeedFilterUserId=null,window.momentsFeedFilterUserName=null,$("mMomentsFeedModal")&&$("mMomentsFeedModal").classList.add("hidden")}function zn(){uo(),Qo(),$("txtMomentCaption")&&($("txtMomentCaption").value=""),$("momentUploadErrorBanner")&&$("momentUploadErrorBanner").classList.add("hidden"),$("mUploadMomentModal")&&$("mUploadMomentModal").classList.remove("hidden")}function Ca(){$("mUploadMomentModal")&&$("mUploadMomentModal").classList.add("hidden")}function Yn(e){const t=Pe.find(c=>c.id===e);if(!t)return;const o=$("viewMomentModalContainer");if(!o)return;const i=userProfile||guestProfile||window.currentUser,n=i&&t.likes&&t.likes.includes(i.uid),r=i&&t.userId===i.uid,s=t.createdAt&&t.createdAt.seconds?new Date(t.createdAt.seconds*1e3).toLocaleDateString():"Just now",d=window.formatPlayerNameHtml(t,"text-xs font-bold");o.innerHTML=`
    <button onclick="closeViewMomentModal()" class="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/60 text-white hover:bg-black flex items-center justify-center text-xs transition cursor-pointer">
      <i class="fas fa-times"></i>
    </button>
    <div class="flex items-center gap-2.5">
      <img src="${t.userAv||"https://api.dicebear.com/7.x/bottts/svg?seed="+t.userId}" class="w-10 h-10 rounded-full object-cover border border-[#f0c040]/30" />
      <div>
        <div class="flex items-center gap-1">${d}</div>
        <span class="text-[10px] text-gray-400">${s}</span>
      </div>
    </div>
    <div class="rounded-xl overflow-hidden bg-black max-h-[480px] flex items-center justify-center">
      ${t.mediaType==="video"?`
        <video src="${t.mediaUrl}" controls autoplay class="w-full max-h-[480px] object-contain"></video>
      `:`
        <img src="${t.mediaUrl}" class="w-full max-h-[480px] object-contain" />
      `}
    </div>
    ${t.caption?`<p class="text-xs text-gray-200 font-medium px-1">${at(t.caption)}</p>`:""}
    <div class="flex items-center justify-between pt-2 border-t border-[#22273f]">
      <div class="flex items-center gap-2">
        <div class="heart-container" title="Like">
          <input 
            type="checkbox" 
            class="checkbox" 
            id="like-modal-${t.id}" 
            ${n?"checked":""} 
            onchange="toggleLikeMoment('${t.id}')"
          />
          <div class="svg-container">
            <svg viewBox="0 0 24 24" class="svg-outline" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.5,1.917a6.4,6.4,0,0,0-5.5,3.3,6.4,6.4,0,0,0-5.5-3.3A6.8,6.8,0,0,0,0,8.967c0,4.547,4.786,9.513,8.8,12.88a4.974,4.974,0,0,0,6.4,0C19.214,18.48,24,13.514,24,8.967A6.8,6.8,0,0,0,17.5,1.917Zm-3.585,18.4a2.973,2.973,0,0,1-3.83,0C4.947,16.006,2,11.87,2,8.967a4.8,4.8,0,0,1,4.5-5.05A4.8,4.8,0,0,1,11,8.967a1,1,0,0,0,2,0,4.8,4.8,0,0,1,4.5-5.05A4.8,4.8,0,0,1,22,8.967C22,11.87,19.053,16.006,13.915,20.313Z">
              </path>
            </svg>
            <svg viewBox="0 0 24 24" class="svg-filled" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.5,1.917a6.4,6.4,0,0,0-5.5,3.3,6.4,6.4,0,0,0-5.5-3.3A6.8,6.8,0,0,0,0,8.967c0,4.547,4.786,9.513,8.8,12.88a4.974,4.974,0,0,0,6.4,0C19.214,18.48,24,13.514,24,8.967A6.8,6.8,0,0,0,17.5,1.917Z">
              </path>
            </svg>
            <svg class="svg-celebrate" width="100" height="100" xmlns="http://www.w3.org/2000/svg">
              <polygon points="10,10 20,20"></polygon>
              <polygon points="10,50 20,50"></polygon>
              <polygon points="20,80 30,70"></polygon>
              <polygon points="90,10 80,20"></polygon>
              <polygon points="90,50 80,50"></polygon>
              <polygon points="80,80 70,70"></polygon>
            </svg>
          </div>
        </div>
        <span class="text-xs font-bold text-gray-300">
          ${t.likeCount||(t.likes?t.likes.length:0)}
        </span>
      </div>
      ${r?`
        <button onclick="deleteMoment('${t.id}')" class="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/40 border border-red-500/30 text-red-400 text-xs font-bold rounded-xl flex items-center gap-1 transition cursor-pointer">
          <i class="fas fa-trash"></i> Delete
        </button>
      `:""}
    </div>
  `,$("mViewMomentModal")&&$("mViewMomentModal").classList.remove("hidden")}function $a(){$("mViewMomentModal")&&$("mViewMomentModal").classList.add("hidden")}function Jn(e){const t=e.target.files&&e.target.files[0],o=$("momentUploadErrorBanner");if(o&&o.classList.add("hidden"),!t)return;const i=t.type.startsWith("video/"),n=t.type.startsWith("image/");if(!i&&!n){o&&(o.textContent="Please select a valid image or video file.",o.classList.remove("hidden"));return}if(i){const r=document.createElement("video");r.preload="metadata";const s=URL.createObjectURL(t);r.src=s,r.onloadedmetadata=()=>{URL.revokeObjectURL(s),r.duration>30.5?(o&&(o.textContent="⚠️ Video length exceeds 30 seconds limit! Please pick a video under 30 seconds.",o.classList.remove("hidden")),Qo()):(et=t,Jt="video",Pi(URL.createObjectURL(t),"video"))},r.onerror=()=>{o&&(o.textContent="Failed to load video file preview.",o.classList.remove("hidden"))}}else et=t,Jt="image",Pi(URL.createObjectURL(t),"image")}function Pi(e,t){const o=$("momentFilePreviewArea"),i=$("momentFileSelectorArea"),n=$("momentPreviewContent");!o||!i||!n||(t==="video"?n.innerHTML=`<video src="${e}" controls class="max-h-52 w-full object-contain"></video>`:n.innerHTML=`<img src="${e}" class="max-h-52 w-full object-contain" />`,i.classList.add("hidden"),o.classList.remove("hidden"))}function Qo(){et=null,Jt="image",$("fileInputMoment")&&($("fileInputMoment").value=""),$("momentFilePreviewArea")&&$("momentFilePreviewArea").classList.add("hidden"),$("momentFileSelectorArea")&&$("momentFileSelectorArea").classList.remove("hidden")}async function Kn(){var n;const e=$("momentUploadErrorBanner");if(e&&e.classList.add("hidden"),!et){e?(e.textContent="Please select a photo or video to post.",e.classList.remove("hidden")):alert("Please select a photo or video to post.");return}const t=userProfile||guestProfile||window.currentUser;if(!t||!t.uid){alert("Please log in to post a moment.");return}const o=20*1024*1024;if(et.size>o){const r="File size exceeds 20MB limit. Please pick a smaller file.";e?(e.textContent=r,e.classList.remove("hidden")):alert(r);return}const i=$("btnPublishMomentSubmit");i&&(i.disabled=!0,i.innerHTML='<i class="fas fa-spinner animate-spin mr-1"></i> Uploading...');try{const r=import.meta&&Si&&void 0||typeof window<"u"&&window.VITE_CLOUDINARY_CLOUD_NAME,s=import.meta&&Si&&void 0||typeof window<"u"&&window.VITE_CLOUDINARY_UPLOAD_PRESET;if(!r||!s)throw new Error("Cloudinary configuration missing. Please ensure VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET are set.");const d=new FormData;d.append("file",et),d.append("upload_preset",s);const c=await fetch(`https://api.cloudinary.com/v1_1/${r}/auto/upload`,{method:"POST",body:d});if(!c.ok){const f=await c.json().catch(()=>({}));throw new Error(((n=f.error)==null?void 0:n.message)||`Cloudinary upload failed with status ${c.status}`)}const u=(await c.json()).secure_url;if(!u)throw new Error("Cloudinary upload succeeded but no secure_url was returned.");const p=($("txtMomentCaption")?$("txtMomentCaption").value:"").trim();await addDoc(collection(db,"moments"),{userId:t.uid,userName:t.name||t.userName||"Player",userAv:t.av||t.avatar||`https://api.dicebear.com/7.x/bottts/svg?seed=${t.uid}`,isPremium:!!(t.premium||t.isPremium||t.isVIP),isVerified:!!(t.isVerified||t.hasBlueTick||t.blueTick||t.verified),mediaUrl:u,mediaType:Jt,caption:p,createdAt:serverTimestamp(),likes:[],likeCount:0}),Ca(),typeof showToastNotification=="function"?showToastNotification("🎉 Moment Posted!","Your moment is live!"):alert("🎉 Moment posted successfully!")}catch(r){console.error("Error publishing moment:",r),e?(e.textContent=r.message||"Failed to publish moment.",e.classList.remove("hidden")):alert(r.message||"Failed to publish moment.")}finally{i&&(i.disabled=!1,i.innerHTML='<i class="fas fa-paper-plane mr-1"></i> Publish Moment')}}async function Qn(e){if(e&&confirm("Are you sure you want to delete this moment?"))try{await deleteDoc(doc(db,"moments",e)),$a()}catch(t){console.error("Failed to delete moment:",t),alert("Failed to delete moment.")}}async function Zn(e){const t=userProfile||guestProfile||window.currentUser;if(!t||!t.uid){alert("Please log in to like moments.");return}const o=Pe.find(r=>r.id===e);if(!o)return;const i=o.likes&&o.likes.includes(t.uid),n=doc(db,"moments",e);o.likes||(o.likes=[]),i?(o.likes=o.likes.filter(r=>r!==t.uid),o.likeCount=Math.max(0,(o.likeCount||1)-1)):(o.likes.push(t.uid),o.likeCount=(o.likeCount||0)+1),nt();try{i?await updateDoc(n,{likes:arrayRemove(t.uid),likeCount:increment(-1)}):await updateDoc(n,{likes:arrayUnion(t.uid),likeCount:increment(1)})}catch(r){console.error("Error toggling like:",r)}}window.renderMomentsFeed=nt;window.renderMomentsFeedPage=nt;window.openMomentsProfileModal=On;window.closeMomentsProfileModal=Wn;window.openMomentsFeedModal=Sa;window.openMomentsFeedModalFiltered=_n;window.closeMomentsFeedModal=Xn;window.openUploadMomentModal=zn;window.closeUploadMomentModal=Ca;window.openViewMomentModal=Yn;window.closeViewMomentModal=$a;window.handleMomentFileSelected=Jn;window.resetMomentFileSelection=Qo;window.publishMoment=Kn;window.deleteMoment=Qn;window.toggleLikeMoment=Zn;try{uo()}catch(e){console.warn("initMomentsListener deferred:",e)}const er="modulepreload",tr=function(e,t){return new URL(e,t).href},Ti={},Pa=function(t,o,i){let n=Promise.resolve();if(o&&o.length>0){let s=function(u){return Promise.all(u.map(p=>Promise.resolve(p).then(f=>({status:"fulfilled",value:f}),f=>({status:"rejected",reason:f}))))};const d=document.getElementsByTagName("link"),c=document.querySelector("meta[property=csp-nonce]"),l=(c==null?void 0:c.nonce)||(c==null?void 0:c.getAttribute("nonce"));n=s(o.map(u=>{if(u=tr(u,i),u in Ti)return;Ti[u]=!0;const p=u.endsWith(".css"),f=p?'[rel="stylesheet"]':"";if(!!i)for(let w=d.length-1;w>=0;w--){const h=d[w];if(h.href===u&&(!p||h.rel==="stylesheet"))return}else if(document.querySelector(`link[href="${u}"]${f}`))return;const g=document.createElement("link");if(g.rel=p?"stylesheet":er,p||(g.as="script"),g.crossOrigin="",g.href=u,l&&g.setAttribute("nonce",l),document.head.appendChild(g),p)return new Promise((w,h)=>{g.addEventListener("load",w),g.addEventListener("error",()=>h(new Error(`Unable to preload CSS for ${u}`)))})}))}function r(s){const d=new Event("vite:preloadError",{cancelable:!0});if(d.payload=s,window.dispatchEvent(d),!d.defaultPrevented)throw s}return n.then(s=>{for(const d of s||[])d.status==="rejected"&&r(d.reason);return t().catch(r)})};function Zo(e,t){if(t){const n=String(t).replace(/^ID:\s*/i,"").replace(/^@/,"").trim();if(/^\d{6,8}$/.test(n))return n}if(!e)return String(Math.floor(1e5+Math.random()*9e5));let o=0;for(let n=0;n<e.length;n++)o=(o<<5)-o+e.charCodeAt(n),o|=0;const i=1e5+Math.abs(o)%9e5;return String(i)}window.getNumericPlayerId=Zo;const Ta=window.storage||(window.getStorage?window.getStorage(window.app):null),or=window.googleProvider||(window.GoogleAuthProvider?new window.GoogleAuthProvider:null);let xt=null;if("serviceWorker"in navigator){let e=function(d){if(!(window.matchMedia("(display-mode: standalone)").matches||window.navigator.standalone===!0||document.referrer.includes("android-app://"))){console.log("PWA Update Detection: Running in standard browser tab. Update modal suppressed.");return}console.log("PWA Update Detection: Running in PWA standalone mode. Monitoring for updates..."),d.waiting&&o(d),d.addEventListener("updatefound",()=>{const l=d.installing;l&&l.addEventListener("statechange",()=>{l.state==="installed"&&navigator.serviceWorker.controller&&o(d)})}),setInterval(()=>{d.update().catch(l=>console.warn("Failed to check for SW update:",l))},900*1e3)},o=function(d){const c=document.getElementById("pwaUpdateModal"),l=document.getElementById("pwaUpdatePercent"),u=document.getElementById("pwaUpdateBar"),p=document.getElementById("pwaUpdateNowBtn"),f=document.getElementById("pwaUpdateLaterBtn"),b=document.getElementById("pwaAutoUpdateToggle");if(!c)return;l&&u&&(l.textContent="0%",u.style.width="0%");const g=localStorage.getItem("pwa_auto_update_enabled")!=="false";if(b&&(b.checked=g),g){console.log("PWA Auto-Update enabled. Automatically updating app..."),i(d);return}c.classList.remove("hidden"),c.classList.add("flex"),p&&(p.onclick=()=>{i(d)}),f&&(f.onclick=()=>{c.classList.remove("flex"),c.classList.add("hidden")}),b&&(b.onchange=w=>{localStorage.setItem("pwa_auto_update_enabled",w.target.checked),w.target.checked&&i(d)})},i=function(d){if(t)return;t=!0;const c=document.getElementById("pwaUpdatePercent"),l=document.getElementById("pwaUpdateBar"),u=document.getElementById("pwaUpdateModal");u&&u.classList.contains("hidden")&&(u.classList.remove("hidden"),u.classList.add("flex"));const p=document.getElementById("pwaUpdateNowBtn"),f=document.getElementById("pwaUpdateLaterBtn");p&&(p.disabled=!0),f&&(f.disabled=!0);let b=0;const g=setInterval(()=>{b+=Math.floor(Math.random()*15)+5,b>=100&&(b=100,clearInterval(g),setTimeout(()=>{d.waiting?d.waiting.postMessage({type:"SKIP_WAITING"}):window.location.reload()},500)),c&&l&&(c.textContent=`${b}%`,l.style.width=`${b}%`)},150)},t=!1,n=!1;navigator.serviceWorker.addEventListener("controllerchange",()=>{n||(n=!0,console.log("[SW Lifecycle] Service Worker controller changed. Reloading page..."),window.location.reload())});async function r(d,c){var l,u,p;try{const f=await navigator.serviceWorker.getRegistrations();console.log("[SW Diagnostics] Active Service Worker registrations count:",f.length);for(const b of f){const g=((l=b.active)==null?void 0:l.scriptURL)||((u=b.waiting)==null?void 0:u.scriptURL)||((p=b.installing)==null?void 0:p.scriptURL)||"",w=g.includes(d),h=c?b.scope===c:!0;console.log(`[SW Diagnostics] Registration inspect -> Scope: ${b.scope} | Script: ${g}`),(!w||!h)&&(console.warn(`[SW Cleanup] Unregistering conflicting/stale worker: ${g} at scope: ${b.scope}`),await b.unregister())}}catch(f){console.warn("[SW Cleanup] Error cleaning up stale registrations:",f)}}const s=async()=>{try{const d=typeof window.getAppBasePath=="function"?window.getAppBasePath():"./",c=d+"firebase-messaging-sw.js",l=new URL(d,window.location.href).href;console.log("=== [ArenaX Push Notification & Service Worker Diagnostics] ==="),console.log("1. Base Path:",d),console.log("2. SW Script Path:",c),console.log("3. Target Scope:",l),console.log("4. Active Controller:",navigator.serviceWorker.controller?navigator.serviceWorker.controller.scriptURL:"None (Uncontrolled on first boot)"),console.log("5. Current Notification Permission:",typeof Notification<"u"?Notification.permission:"Unsupported"),console.log("================================================================="),await r("firebase-messaging-sw.js",l);let u;try{u=await navigator.serviceWorker.register(c,{scope:d})}catch(p){console.warn("Fallback registering sw.js at scope:",d,p),u=await navigator.serviceWorker.register(d+"sw.js",{scope:d})}console.log("Service Worker registered successfully with scope:",u.scope),u.waiting&&(console.log("[SW Lifecycle] Waiting worker detected. Sending SKIP_WAITING signal..."),u.waiting.postMessage({type:"SKIP_WAITING",action:"skipWaiting"})),u.addEventListener("updatefound",()=>{const p=u.installing;p&&p.addEventListener("statechange",()=>{p.state==="installed"&&(console.log("[SW Lifecycle] New service worker installed. Forcing immediate skipWaiting..."),u.waiting&&u.waiting.postMessage({type:"SKIP_WAITING",action:"skipWaiting"}))})}),e(u);try{const{getMessaging:p,onMessage:f,isSupported:b}=await Pa(async()=>{const{getMessaging:w,onMessage:h,isSupported:M}=await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging.js");return{getMessaging:w,onMessage:h,isSupported:M}},[],import.meta.url);await b()?(xt=p(app),f(xt,w=>{var h,M,L,A,P,k,E,y,B,V,F,H;if(console.log("FCM: Foreground message received:",w),Notification.permission==="granted"){const J=((h=w.notification)==null?void 0:h.title)||((M=w.data)==null?void 0:M.title)||"ArenaX Tournament Alert",z=typeof window.getAppBasePath=="function"?window.getAppBasePath():"./",ne={body:((L=w.notification)==null?void 0:L.body)||((A=w.data)==null?void 0:A.body)||"",icon:((P=w.notification)==null?void 0:P.icon)||((k=w.data)==null?void 0:k.icon)||z+"icon-192.png",badge:((E=w.notification)==null?void 0:E.badge)||((y=w.data)==null?void 0:y.badge)||z+"favicon.ico",data:{url:((B=w.fcmOptions)==null?void 0:B.link)||((V=w.notification)==null?void 0:V.click_action)||((F=w.data)==null?void 0:F.click_action)||((H=w.data)==null?void 0:H.url)||"./",...w.data}};new Notification(J,ne)}})):console.log("FCM is not supported in this browser environment.")}catch(p){console.error("FCM: Failed to initialize messaging after SW registration:",p)}}catch(d){console.error("Service Worker registration failed:",d)}};document.readyState==="complete"||document.readyState==="interactive"?s():window.addEventListener("load",s)}async function ir(e=!1){Me(null);try{if(typeof Notification>"u"){Me("Push notifications are not supported by this browser.");return}if(console.log("FCM: Checking notification permission. Current state:",Notification.permission),Notification.permission==="denied"){const u="Notifications are blocked in your browser settings. Tap the lock icon 🔒 in your browser address bar → Site Settings → Notifications → Allow, then refresh the page.";console.warn("FCM: Permission is blocked at browser level."),Me(u),e&&alert(`⚠️ Notifications are blocked in your browser settings.

To enable them:
1. Click the Lock/Tune icon (🔒) in your address bar.
2. Open 'Site Settings' (or Permissions).
3. Set 'Notifications' to 'Allow'.
4. Refresh this page.`),Vt();return}let t=Notification.permission;if(t==="default"&&(console.log("FCM: Prompting user for permission..."),t=await Notification.requestPermission()),Vt(),t!=="granted"){const u="Notification permission was denied. Tap the lock icon 🔒 in your address bar → Site Settings → Notifications → Allow, then refresh.";Me(u),e&&alert("⚠️ "+u);return}const{getMessaging:o,getToken:i,isSupported:n}=await Pa(async()=>{const{getMessaging:u,getToken:p,isSupported:f}=await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging.js");return{getMessaging:u,getToken:p,isSupported:f}},[],import.meta.url);if(!await n()){Me("FCM is not supported in this browser environment.");return}xt||(xt=o(app));const s=typeof window.getAppBasePath=="function"?window.getAppBasePath():"./",d=s+"firebase-messaging-sw.js";let c;try{c=await navigator.serviceWorker.register(d,{scope:s})}catch{c=await navigator.serviceWorker.register(s+"sw.js",{scope:s})}c.waiting&&c.waiting.postMessage({type:"SKIP_WAITING",action:"skipWaiting"}),await navigator.serviceWorker.ready;const l=await i(xt,{vapidKey:"BDdgfDjDrlojgRVmno7aaRuIpUyZMBI7Dh-EnXLBvXzXMsIsvojEag3SvYX63M67MtIClFHUMkyiCmmIwA00FEM",serviceWorkerRegistration:c});if(l){console.log("FCM: Manual token success:",l),localStorage.setItem("fcm_token_arena_x",l),Vt();const u=auth.currentUser;u&&(await setDoc(doc(db,"users",u.uid),{fcmToken:l,fcmTokenUpdatedAt:serverTimestamp()},{merge:!0}),console.log("FCM: Saved token to user profile in Firestore")),e&&alert("🎉 FCM Token generated and saved successfully!")}else Me("Failed to retrieve token. No token returned from FCM.")}catch(t){console.error("FCM: Error requesting token:",t),Me("FCM Error: "+(t.message||String(t)))}}function ar(){const e=localStorage.getItem("fcm_token_arena_x");e&&navigator.clipboard.writeText(e).then(()=>alert("📋 FCM Token copied to clipboard!")).catch(()=>alert("Failed to copy. Please manually select the token and copy it."))}function Vt(){const e=typeof Notification<"u"?Notification.permission:"default",t=a("diagnosticPermission");t&&(t.textContent=e,e==="granted"?t.className="font-bold px-1.5 py-0.5 rounded text-[10px] uppercase bg-green-500/10 text-green-500 border border-green-500/20":e==="denied"?t.className="font-bold px-1.5 py-0.5 rounded text-[10px] uppercase bg-red-500/10 text-red-500 border border-red-500/20":t.className="font-bold px-1.5 py-0.5 rounded text-[10px] uppercase bg-ele text-t3 border border-bdr");const o=a("diagnosticPermissionRequestBox");o&&(e!=="granted"?o.classList.remove("hidden"):o.classList.add("hidden"));const i=localStorage.getItem("fcm_token_arena_x"),n=a("diagnosticTokenBox"),r=a("btnCopyFcmToken"),s=a("btnGenerateFcmToken");i?(n&&(n.textContent=i,n.classList.remove("hidden")),r&&r.classList.remove("hidden"),s&&(s.textContent="Regenerate Token",s.className="w-full py-1.5 bg-ele text-t2 hover:text-white text-[10px] font-bold rounded transition cursor-pointer")):(n&&n.classList.add("hidden"),r&&r.classList.add("hidden"),s&&(s.textContent="Generate Token",s.className="w-full py-1.5 bg-gold hover:bg-[#e8b830] text-bg text-[10px] font-bold rounded transition cursor-pointer"))}function Me(e){const t=a("diagnosticErrorDiv");t&&(e?(t.textContent=e,t.classList.remove("hidden")):t.classList.add("hidden"))}window.requestFCMToken=ir;window.copyFCMToken=ar;window.updateDiagnosticUI=Vt;let m=null,T=null,Aa="Profile";window.activeMainTab=Aa;let ze=[],Kt={},ft=null,Ma=[],Ra=[];const Ea=["ax1","ax2","ax3","ax4","bot1","bot2","bot3","bot4"];let Qt=Ea[0],Ai=!1,Mi=!1,we=0,Ht=null;const tt=[{title:"Aapka Profile Hub 👤",text:"Aao gamer! Yeh aapka personal Profile Hub hai. Yahan aap apna display name, unique handle, level ranks, wallet AX balance aur total hearts popularity rating live dekh sakte hain.",tab:"Profile",highlight:"profileCard"},{title:"Esports Tournaments 🏆",text:"Events page par aapko saare live, upcoming aur ended matches milenge. Apni pasand ke esports contest me register karke cash prize pools jeeten!",tab:"Tour",highlight:"toursWrapper"},{title:"Secure AX Wallet 💰",text:"Wallet section se aap asani se Recharge kar sakte hain (JazzCash, NayaPay ke zariye) aur apni winnings ko seedha bank ya wallet me instant withdraw kar sakte hain.",tab:"Wallet",highlight:"wCard"},{title:"Global Chat & Voice Lobbies 🎤",text:"Dosre gamers ke sath connect hon! Global feed me chat karen, friends add karen aur high-quality low-latency audio room channels join karke dosto se voice chat karen.",tab:"Chat",highlight:"tChat"},{title:"Profile Customization 🎨",text:"Edit Display Name ya Customize Profile par click karke bio, social links aur custom avatar set karen. Premium VIP lekar golden frames aur glowing banners unlock karen! 👑",tab:"Profile",highlight:"btnCustomize"}];let Zt="dark",eo="#ffffff",rt=null;const Da=()=>{const e=(...t)=>Da();return e.classList={add:()=>{},remove:()=>{},toggle:()=>{},contains:()=>!1},e.style={},e.dataset={},e.children=[],e.files=[],e.value="",e.textContent="",e.innerHTML="",e.className="",e.addEventListener=()=>{},e.removeEventListener=()=>{},e.setAttribute=()=>{},e.getAttribute=()=>null,e.removeAttribute=()=>{},e.focus=()=>{},e.blur=()=>{},e.click=()=>{},e.scrollTo=()=>{},e.scrollIntoView=()=>{},e.appendChild=()=>{},e.removeChild=()=>{},e.querySelector=()=>null,e.querySelectorAll=()=>[],new Proxy(e,{get(t,o){return o in t?t[o]:o===Symbol.toPrimitive||o==="toString"||o==="valueOf"?()=>"":e},set(t,o,i){return t[o]=i,!0}})},a=e=>document.getElementById(e)||Da();window.$=a;const Ri=new URLSearchParams(window.location.search),Ei=Ri.get("ref")||Ri.get("referrer");Ei&&localStorage.setItem("arenaX_ref",Ei);const Se=a("cur"),Ft=a("curR");let yo=0,ko=0,Lo=0,So=0;if(Se&&Ft){let e=function(){Ft&&(Lo+=(yo-Lo)*.12,So+=(ko-So)*.12,Ft.style.left=Lo+"px",Ft.style.top=So+"px",requestAnimationFrame(e))};document.addEventListener("mousemove",t=>{yo=t.clientX,ko=t.clientY,Se&&(Se.style.left=yo+"px",Se.style.top=ko+"px")}),e(),document.addEventListener("mousedown",()=>{Se&&Se.classList.add("scale-150")}),document.addEventListener("mouseup",()=>{Se&&Se.classList.remove("scale-150")})}typeof window<"u"&&setTimeout(()=>{typeof window.initArenaX3DBackgroundPreload=="function"&&window.initArenaX3DBackgroundPreload()},50);function X(e){document.querySelectorAll(".scr, #sLogin, #sDash").forEach(o=>o.classList.add("hidden"));const t=a(e);t&&t.classList.remove("hidden"),window.ArenaSplash&&window.ArenaSplash.finish()}window.goTo=X;window.getBlueTickBadgeHtml=function(e,t="w-4 h-4"){return e&&(e.hasBlueTick||e.isVerified||e.blueTick||e.verified)?`<img src="bluetick.png" class="${t} inline-block align-middle ml-1 shrink-0 drop-shadow-[0_0_6px_rgba(29,155,240,0.5)]" alt="Verified" title="Verified Badge"/>`:""};window.formatPlayerNameHtml=function(e,t="",o="w-4 h-4"){if(!e)return"";const i=e.name||e.userName||e.playerName||"Player",n=!!(e.premium||e.isPremium||e.isVIP||e.vip),r=!!(e.isVerified||e.hasBlueTick||e.blueTick||e.verified),s=n&&e.selectedFont?e.selectedFont:"";let d=`<span class="${n?"golden-name-shimmer text-amber-400 font-extrabold ":""}${s?s+" ":""}${t}">${i}</span>`;return n&&(d+='<i class="fas fa-crown text-amber-400 text-xs ml-1 shrink-0" title="VIP Premium"></i>'),r&&(d+=window.getBlueTickBadgeHtml(e,o)),d};window.applyAvatarFrame=function(e,t){if(!e)return;const o=e.parentElement;if(!o)return;window.getComputedStyle(o).position==="static"&&(o.style.position="relative"),t&&(o.classList.contains("overflow-hidden")&&o.classList.remove("overflow-hidden"),e.classList.add("rounded-full","object-cover"));let n=o.querySelector(".avatar-frame-overlay");t?n||(n=document.createElement("img"),n.className="avatar-frame-overlay absolute -inset-[22%] w-[144%] h-[144%] pointer-events-none z-20 max-w-none object-contain",n.src="/arenaX/avatarframe1.svg",n.onerror=function(){this.src.includes("/arenaX/avatarframe1.svg")?this.src="/avatarframe1.svg":this.src.includes("/avatarframe1.svg")&&(this.src="/avatarframe1.png")},n.alt="Avatar Frame",o.appendChild(n)):n&&n.remove()};window.updateAllAvatarFrames=function(){const e=window.userProfile||window.guestProfile||window.currentUser,t=localStorage.getItem("user_frame_equipped")==="true",o=!!(e&&e.frameEquipped!==void 0?e.frameEquipped:t);e&&e.av&&["avImg","homeAvImg","pAv","setAv","voiceMyAvatar","custAvPreview","taskModalUserAv","custModalFrameAvatar"].forEach(i=>{const n=document.getElementById(i);n&&(n.src=e.av)}),["avImg","homeAvImg","pAv","setAv","voiceMyAvatar","custAvPreview","taskModalUserAv","custModalFrameAvatar"].forEach(i=>{const n=document.getElementById(i);n&&window.applyAvatarFrame(n,o)})};function kt(){const e=m||T,t="ID: "+Zo(e.uid,e.handle);a("pName").innerHTML=`${e.name||"Player"}${window.getBlueTickBadgeHtml(e)}`,a("pHandle").textContent=t,a("pAv").src=e.av,a("avImg").src=e.av,a("homeAvImg")&&(a("homeAvImg").src=e.av),a("homeCoinsVal")&&(a("homeCoinsVal").textContent=(e.balance||0).toLocaleString()),a("setName")&&(a("setName").innerHTML=`${e.name||"Player"}${window.getBlueTickBadgeHtml(e)}`),a("setHandle")&&(a("setHandle").textContent=t),a("setAv")&&(a("setAv").src=e.av),a("wBal").textContent=(e.balance||0).toLocaleString(),a("pPopularityVal").textContent=e.popularity||0,window.updateAllAvatarFrames&&window.updateAllAvatarFrames(),typeof window.preloadRankingData=="function"&&window.preloadRankingData(),typeof window.updatePlayerShowUI=="function"&&window.updatePlayerShowUI(e);const o=a("profileCard");if(e.premium&&e.bannerTheme){const d={red:"linear-gradient(135deg, #3f0f15 0%, #1a0508 100%)",gold:"linear-gradient(135deg, #3b2f0f 0%, #1a1405 100%)",blue:"linear-gradient(135deg, #0f233f 0%, #050e1a 100%)",purple:"linear-gradient(135deg, #2b0f3f 0%, #12051a 100%)",green:"linear-gradient(135deg, #0f3f1e 0%, #051a0b 100%)",sunset:"linear-gradient(135deg, #3f1e0f 0%, #1a0512 100%)",ocean:"linear-gradient(135deg, #0f3f3b 0%, #051a18 100%)",dark:"linear-gradient(135deg, #151821 0%, #0a0b10 100%)"};o.style.background=d[e.bannerTheme]||""}else o.style.background="";const i=a("pName");if(i){e.premium&&e.goldenNameEnabled!==!1?(i.classList.add("golden-name-shimmer"),i.style.background="",i.style.webkitBackgroundClip="",i.style.webkitTextFillColor="",i.style.fontWeight="",i.style.fontStyle="italic",i.style.color=""):e.premium&&e.nameColor?(i.classList.remove("golden-name-shimmer"),i.style.background="none",i.style.webkitBackgroundClip="initial",i.style.webkitTextFillColor="initial",i.style.color=e.nameColor,i.style.fontWeight="",i.style.fontStyle=""):(i.classList.remove("golden-name-shimmer"),i.style.background="none",i.style.webkitBackgroundClip="initial",i.style.webkitTextFillColor="initial",i.style.color="",i.style.fontWeight="",i.style.fontStyle="");const d=["font-poppins","font-orbitron","font-luckiest-guy","font-fredoka","font-bungee","font-chakra","font-press-start","font-cinzel","font-rajdhani","font-unifraktur","font-permanent-marker","font-pacifico"];d.forEach(c=>i.classList.remove(c)),(e.premium||e.isVIP||e.isPremium)&&e.selectedFont&&i.classList.add(e.selectedFont),a("setName")&&(d.forEach(c=>a("setName").classList.remove(c)),(e.premium||e.isVIP||e.isPremium)&&e.selectedFont&&a("setName").classList.add(e.selectedFont))}const n=a("pAv");if(e.premium&&e.avatarFrame&&e.avatarFrame!=="none"){const c={gold:"#c0a030",fire:"#ff4500",ice:"#00bfff",royal:"#8b5cf6"}[e.avatarFrame];n.style.boxShadow=`0 0 12px ${c}`,n.style.borderColor=c}else n.style.boxShadow="",n.style.borderColor="";e.badge?(a("pBadgeText").textContent=e.badge,a("pBadge").classList.remove("hidden")):a("pBadge").classList.add("hidden"),Ha(),e.bio?(a("pBio").textContent=e.bio,a("pBio").classList.remove("hidden")):a("pBio").classList.add("hidden");let r=!1;if(e.country){const d={PK:"🇵🇰 Pakistan",IN:"🇮🇳 India",BD:"🇧🇩 Bangladesh",SA:"🇸🇦 Saudi Arabia",AE:"🇦🇪 UAE",US:"🇺🇸 USA",GB:"🇬🇧 UK",Other:"🌍 Other"};a("pDetailCountry").textContent=d[e.country]||e.country,a("pDetailCountryContainer").classList.remove("hidden"),r=!0}else a("pDetailCountryContainer").classList.add("hidden");e.favoriteGame?(a("pDetailFavGame").textContent=e.favoriteGame,a("pDetailFavGameContainer").classList.remove("hidden"),r=!0):a("pDetailFavGameContainer").classList.add("hidden"),e.gameUID?(a("pDetailGameUID").textContent=e.gameUID,a("pDetailGameUIDContainer").classList.remove("hidden"),r=!0):a("pDetailGameUIDContainer").classList.add("hidden");let s=!1;e.socialDiscord?(a("pSocialDiscordText").textContent=e.socialDiscord,a("pSocialDiscord").href=`https://discord.com/users/${e.socialDiscord}`,a("pSocialDiscord").classList.remove("hidden"),s=!0):a("pSocialDiscord").classList.add("hidden"),e.socialInstagram?(a("pSocialInstagramText").textContent=e.socialInstagram,a("pSocialInstagram").href=`https://instagram.com/${e.socialInstagram.replace("@","")}`,a("pSocialInstagram").classList.remove("hidden"),s=!0):a("pSocialInstagram").classList.add("hidden"),e.socialYoutube?(a("pSocialYoutube").href=e.socialYoutube.startsWith("http")?e.socialYoutube:`https://youtube.com/${e.socialYoutube}`,a("pSocialYoutube").classList.remove("hidden"),s=!0):a("pSocialYoutube").classList.add("hidden"),s?(a("pDetailSocials").classList.remove("hidden"),r=!0):a("pDetailSocials").classList.add("hidden"),r?a("pDetailsCard").classList.remove("hidden"):a("pDetailsCard").classList.add("hidden"),T?(a("gBanner").classList.remove("hidden"),a("badgeGuest").classList.remove("hidden"),a("wLock").classList.remove("hidden"),a("sLock").classList.remove("hidden"),a("chatBox").classList.add("hidden"),a("wCard").classList.add("opacity-35","pointer-events-none"),a("prmPromo").classList.add("hidden"),a("badgePrm").classList.add("hidden"),a("prmBanner").classList.add("hidden")):(a("gBanner").classList.add("hidden"),a("badgeGuest").classList.add("hidden"),a("wLock").classList.add("hidden"),a("sLock").classList.add("hidden"),a("chatBox").classList.remove("hidden"),a("wCard").classList.remove("opacity-35","pointer-events-none"),m.premium?(a("badgePrm").classList.remove("hidden"),a("prmBanner").classList.remove("hidden"),a("prmPromo").classList.add("hidden"),a("profileCard").classList.add("prm-glow")):(a("badgePrm").classList.add("hidden"),a("prmBanner").classList.add("hidden"),a("prmPromo").classList.remove("hidden"),a("profileCard").classList.remove("prm-glow"))),m?a("referralLinkInput").value=window.location.origin+window.location.pathname+"?ref="+m.uid:a("referralLinkInput").value="Link restricted. Please authenticate fully to get a referral code!",nr(),window.tournamentAutoRefreshInterval||(window.tournamentAutoRefreshInterval=setInterval(()=>{typeof Ue=="function"&&Ue()},3e3)),pr(),typeof window.initGlobalChat=="function"&&window.initGlobalChat(),window.ArenaSplash&&(window.ArenaSplash.status("Ready"),window.ArenaSplash.finish()),X("sDash"),Ai||(a("mUnderDevPopup").classList.remove("hidden"),Ai=!0),typeof initVoiceRoomsSystem=="function"&&initVoiceRoomsSystem(),typeof renderProfileMomentsSection=="function"&&renderProfileMomentsSection(),Tt(),typeof window.updateDiscordSecurityUI=="function"&&window.updateDiscordSecurityUI(),typeof window.checkDiscordJustLinked=="function"&&window.checkDiscordJustLinked(),typeof window.checkAndProcessDiscordCallback=="function"&&window.checkAndProcessDiscordCallback(),e&&e.uid&&auth.currentUser&&typeof window.initUserSessionAndDevice=="function"&&window.initUserSessionAndDevice(auth.currentUser,e);try{(new URLSearchParams(window.location.search).get("open")==="security-devices"||window.pendingOpenSecurityDevices)&&(window.pendingOpenSecurityDevices=!1,setTimeout(()=>{typeof window.openAxSecurityModal=="function"&&window.openAxSecurityModal(),typeof window.showLoggedInDevicesView=="function"&&window.showLoggedInDevicesView()},500))}catch{}}function Tt(){const e=m||T,t=e?!!e.premium:!1,o=document.getElementById("prmPurchaseView"),i=document.getElementById("prmActiveView"),n=document.getElementById("prmActiveVideo");o&&i&&(t?(o.classList.add("hidden"),i.classList.remove("hidden"),n&&n.play().catch(r=>console.log("Premium video playback error:",r))):(o.classList.remove("hidden"),i.classList.add("hidden")))}window.syncPremiumModalState=Tt;function Te(e){if(e==="Support"){typeof window.openSupportDrawer=="function"&&window.openSupportDrawer();return}if(e==="Voice"&&typeof window.listenToVoiceRooms=="function"&&window.listenToVoiceRooms(),Aa=e,window.activeMainTab=e,document.querySelectorAll(".tab").forEach(t=>t.classList.add("hidden")),a("t"+e).classList.remove("hidden"),document.querySelectorAll(".ni").forEach(t=>{t.dataset.t===e?(t.classList.add("text-gold"),t.classList.remove("text-t3")):(t.classList.remove("text-gold"),t.classList.add("text-t3"));const i=a("centerEventBtnCircle");i&&(e==="Tour"?(i.classList.add("ring-4","ring-indigo-400/60","scale-105"),a("navEventsText")&&(a("navEventsText").classList.add("text-indigo-400"),a("navEventsText").classList.remove("text-t3"))):(i.classList.remove("ring-4","ring-indigo-400/60","scale-105"),a("navEventsText")&&(a("navEventsText").classList.remove("text-indigo-400"),a("navEventsText").classList.add("text-t3"))))}),e==="Chat"&&(loadFriendSystem(),updateChatUnreadDot(),updateSubGlobalDot()),e==="Tour"&&(typeof window.renderTournaments=="function"&&window.renderTournaments(),m)){const t=new Date(Date.now()+18e6).toISOString().split("T")[0];updateDoc(doc(db,"users",m.uid),{"dailyTasks.visit":!0,"dailyTasks.date":t}).catch(o=>console.warn(o))}e==="Submission"&&typeof window.playSubmissionSplash=="function"&&window.playSubmissionSplash()}window.switchTab=Te;document.querySelectorAll(".ni").forEach(e=>{e.addEventListener("click",()=>Te(e.dataset.t))});function Di(){const e=[...Ma,...Ra];e.sort((t,o)=>{let i=0;t.submittedAt?i=t.submittedAt.seconds?t.submittedAt.seconds*1e3:new Date(t.submittedAt).getTime():t.timestamp?i=new Date(t.timestamp).getTime():t.createdAt&&(i=t.createdAt.seconds?t.createdAt.seconds*1e3:new Date(t.createdAt).getTime());let n=0;return o.submittedAt?n=o.submittedAt.seconds?o.submittedAt.seconds*1e3:new Date(o.submittedAt).getTime():o.timestamp?n=new Date(o.timestamp).getTime():o.createdAt&&(n=o.createdAt.seconds?o.createdAt.seconds*1e3:new Date(o.createdAt).getTime()),n-i}),dr(e)}let qt=null,Fe=null;function Lt(){if(console.log("[Auth Engine] Cleaning up all active user-specific snapshot listeners..."),qt){try{qt()}catch{}qt=null}if(typeof ft<"u"&&ft){try{ft()}catch{}ft=null}if(window.userMailsUnsub){try{window.userMailsUnsub()}catch{}window.userMailsUnsub=null}if(window.userSubmissionsUnsub){try{window.userSubmissionsUnsub()}catch{}window.userSubmissionsUnsub=null}if(Fe){try{Fe()}catch{}Fe=null}}onAuthStateChanged(auth,async e=>{if(Lt(),e&&!T){if(e.providerData.some(n=>n.providerId==="password")||e.email&&!e.providerData.some(n=>n.providerId==="google.com")){try{await e.reload()}catch{}if(!e.emailVerified){console.warn("[Auth Engine] Unverified email. Access blocked until verified."),m=null,Lt(),await signOut(auth),a("loginErr")&&(a("loginErr").textContent="⚠️ Email Not Verified! A verification link was sent to "+(e.email||"")+". Please verify your email in your inbox before entering ArenaX.",a("loginErr").classList.remove("hidden")),a("btnResendVerifyLogin")&&a("btnResendVerifyLogin").classList.remove("hidden"),X("sLogin");return}}typeof window.startUserSubmissionsListener=="function"&&window.startUserSubmissionsListener(e.uid);const o=query(collection(db,"deposit_requests"),where("userId","==",e.uid));ft=onSnapshot(o,n=>{let r=[];n.forEach(s=>{r.push({id:s.id,...s.data()})}),Ma=r,Di()},n=>{console.warn("Deposits listen warning:",n)});const i=query(collection(db,"users",e.uid,"mails"),orderBy("createdAt","desc"));window.userMailsUnsub=onSnapshot(i,n=>{let r=[],s=0;n.forEach(d=>{const c=d.data();r.push({id:d.id,...c}),c.read?c.giftBadgeId&&!c.collected&&s++:s++}),window.userMails=r,a("mInboxBadges")&&!a("mInboxBadges").classList.contains("hidden")&&Ct(),yr(s)},n=>{console.error("Error fetching player mails: ",n)}),qt=onSnapshot(doc(db,"users",e.uid),n=>{if(n.exists()){if(m={...n.data(),id:e.uid,uid:e.uid},window.userProfile=m,window.currentUser=m,Ra=m.transactions||[],Di(),m.banned&&m.banType==="full"||m.accountStatus==="permanently_blocked"){const d=m.banRule?`
Violation Reference: ${m.banRule}`:"";alert(`❌ Account Permanently Banned!

Reason: ${m.banReason||"Severe Rule Violations"}${d}

This account has been permanently suspended by ArenaX Moderation.`),signOut(auth),m=null,X("sLogin");return}if(m.banned&&m.banType==="temporary"||m.accountStatus==="temporarily_blocked"){const d=m.blockedUntil||m.banUntil,c=d?d.toDate?d.toDate():new Date(d):null;if(c&&Date.now()<c.getTime()){const l=c.toLocaleString();alert(`⏳ Account Temporarily Blocked!

Access blocked until: ${l}
Reason: ${m.banReason||"Policy Violation"}

Your account will be restored once the block duration expires.`),signOut(auth),m=null,X("sLogin");return}else c&&Date.now()>=c.getTime()&&(updateDoc(doc(db,"users",e.uid),{banned:!1,banType:"none",accountStatus:"active",blockedUntil:null,banUntil:null}).catch(console.warn),m.banned=!1,m.accountStatus="active")}if((m.restricted||m.accountStatus==="restricted")&&m.restrictedUntil){const d=m.restrictedUntil.toDate?m.restrictedUntil.toDate():new Date(m.restrictedUntil);Date.now()>=d.getTime()&&(updateDoc(doc(db,"users",e.uid),{restricted:!1,accountStatus:"active",restrictedUntil:null}).catch(console.warn),m.restricted=!1,m.accountStatus="active")}if(m.twoFactorEnabled===!0&&!(sessionStorage.getItem("ax_2fa_verified_"+e.uid)==="true")){console.log("[2FA] Active 2FA detected for profile. Enforcing verification step before booting app."),typeof window.startTwoFactorLoginFlow=="function"&&window.startTwoFactorLoginFlow(e,m);return}kt()}else{const r=e.displayName||(e.email?e.email.split("@")[0]:"ArenaX Player"),s=Zo(e.uid),d=e.photoURL||`https://api.dicebear.com/7.x/bottts/svg?seed=${e.uid}`,c=localStorage.getItem("arenaX_ref"),l={uid:e.uid,name:r,handle:s,av:d,email:e.email||"",premium:!1,banned:!1,banType:"none",banReason:"",banUntil:null,balance:0,createdAt:new Date().toISOString()};c&&c!==e.uid&&(l.referredBy=c),setDoc(doc(db,"users",e.uid),l).then(async()=>{if(m={...l,id:e.uid,uid:e.uid},c&&c!==e.uid){localStorage.removeItem("arenaX_ref");try{const u=doc(db,"users",c),p=await getDoc(u);if(p.exists()){const f=p.data();await updateDoc(u,{balance:increment(50)});const b="REF-BONUS-"+Math.floor(1e5+Math.random()*9e5);await addDoc(collection(db,"deposit_requests"),{userId:c,userName:f.name,userHandle:f.handle,amountPKR:0,amountAX:50,method:"Referral Bonus",txnId:b,status:"approved",type:"deposit",notes:`Referred new player: ${r}`,submittedAt:serverTimestamp()}),await addDoc(collection(db,"notifications"),{userId:c,title:"Referral Reward Credited! 🎁",body:`Your friend ${r} joined ArenaX! You have been rewarded 50 AX Coins.`,createdAt:serverTimestamp(),read:!1}),await addDoc(collection(db,"referrals"),{referredBy:c,referredUserId:e.uid,referredUserName:r,createdAt:serverTimestamp()})}}catch(u){console.error("Failed to reward referrer:",u)}}kt()}).catch(u=>console.error("Bootstrap profile error: ",u))}},n=>{console.warn("Firestore user profile snapshot listener warning (non-fatal):",n),n.code==="permission-denied"&&(console.log("[Auth Engine] Attempting to refresh user authentication session..."),auth.currentUser&&auth.currentUser.getIdToken(!0).then(()=>console.log("[Auth Engine] Session re-verified and token refreshed successfully.")).catch(r=>console.error("[Auth Engine] Failed to refresh token during snapshot failure:",r)))})}else if(!T){if(window.unsubReferrals){try{window.unsubReferrals()}catch{}window.unsubReferrals=null}m=null,X("sLogin")}});a("bGoogle").addEventListener("click",async()=>{if(!a("termsCheckbox").checked){a("loginErr").textContent="⚠️ You must agree to the Terms & Conditions and Privacy Policy to enter the Arena!",a("loginErr").classList.remove("hidden");return}a("loginErr").classList.add("hidden");try{await signInWithPopup(auth,or)}catch(e){e.code!=="auth/popup-closed-by-user"&&(a("loginErr").textContent=e.message,a("loginErr").classList.remove("hidden"))}});let jt="login";a("lnkSignup").addEventListener("click",()=>{jt==="login"?(jt="signup",a("loginTitle").textContent="Create Account",a("iUsername").classList.remove("hidden"),a("bEmail").textContent="Sign up",a("lnkForgot").classList.add("hidden"),a("txtTogglePrompt").textContent="Have an account?",a("lnkSignup").textContent="Sign in",a("loginErr").classList.add("hidden")):(jt="login",a("loginTitle").textContent="Welcome back",a("iUsername").classList.add("hidden"),a("bEmail").textContent="Log in",a("lnkForgot").classList.remove("hidden"),a("txtTogglePrompt").textContent="Don't have an account?",a("lnkSignup").textContent="Sign up",a("loginErr").classList.add("hidden"))});a("bEmail").addEventListener("click",async()=>{var i;if(!a("termsCheckbox").checked){a("loginErr").textContent="⚠️ You must agree to the Terms & Conditions and Privacy Policy to enter the Arena!",a("loginErr").classList.remove("hidden");return}const e=a("iEmail").value.trim(),t=a("iPass").value.trim(),o=n=>/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(n);if(!e||!t){a("loginErr").textContent="⚠️ Please enter both email address and password.",a("loginErr").classList.remove("hidden");return}if(!o(e)){a("loginErr").textContent="⚠️ Please enter a valid real email address (e.g. name@example.com).",a("loginErr").classList.remove("hidden");return}if(t.length<6){a("loginErr").textContent="⚠️ Password must be at least 6 characters.",a("loginErr").classList.remove("hidden");return}if(jt==="signup"){const n=a("iUsername").value.trim();if(!n){a("loginErr").textContent="Please enter a username.",a("loginErr").classList.remove("hidden");return}a("loginErr").classList.add("hidden");try{const r=await createUserWithEmailAndPassword(auth,e,t);await updateProfile(r.user,{displayName:n});try{await setDoc(doc(db,"users",r.user.uid),{uid:r.user.uid,email:e,username:n,emailVerified:!1,createdAt:Date.now()},{merge:!0})}catch(s){console.warn("Initial profile doc write:",s)}try{await sendEmailVerification(r.user)}catch(s){console.warn("Verification email error:",s)}await signOut(auth),alert(`✉️ Account created successfully!

A verification email has been sent to: `+e+`

Please check your inbox and spam folder, and click the verification link before signing in.`),(i=a("toggleLoginMode"))==null||i.click()}catch(r){r.code==="auth/email-already-in-use"?a("loginErr").textContent="⚠️ This email address is already registered. Please sign in or reset password.":r.code==="auth/invalid-email"?a("loginErr").textContent="⚠️ Please enter a valid email address.":r.code==="auth/weak-password"?a("loginErr").textContent="⚠️ Password must be at least 6 characters.":a("loginErr").textContent=r.message,a("loginErr").classList.remove("hidden")}}else{a("loginErr").classList.add("hidden");try{const n=await signInWithEmailAndPassword(auth,e,t);let r=n.user.emailVerified,s=null;try{const d=await getDoc(doc(db,"users",n.user.uid));d.exists()&&(s=d.data(),s.emailVerified===!0&&(r=!0))}catch(d){console.warn("Firestore verification check error:",d)}if(!r){await signOut(auth),a("loginErr").textContent="⚠️ Email Not Verified! Please check your inbox for "+e+" and click the verification link before logging in.",a("loginErr").classList.remove("hidden");return}if(s&&s.twoFactorEnabled===!0&&!(sessionStorage.getItem("ax_2fa_verified_"+n.user.uid)==="true")){typeof window.startTwoFactorLoginFlow=="function"&&await window.startTwoFactorLoginFlow(n.user,s);return}}catch(n){n.code==="auth/user-not-found"||n.code==="auth/invalid-credential"||n.code==="auth/wrong-password"?a("loginErr").textContent="⚠️ Incorrect email or password. Please try again or click Forgot Password!":n.code==="auth/invalid-email"?a("loginErr").textContent="⚠️ Please enter a valid email address.":a("loginErr").textContent=n.message,a("loginErr").classList.remove("hidden")}}});async function to(e){const t={email:e,origin:window.location.origin},i=window.location.hostname==="arenax.cyou"||window.location.hostname.endsWith("github.io")?"https://arena-x-beta.vercel.app/api/request-password-reset":"/api/request-password-reset";let n;try{n=await fetch(i,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)}),(n.status===405||n.status===404)&&!i.startsWith("https://arena-x-beta.vercel.app")&&(n=await fetch("https://arena-x-beta.vercel.app/api/request-password-reset",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)}))}catch(s){if(!i.startsWith("https://arena-x-beta.vercel.app"))n=await fetch("https://arena-x-beta.vercel.app/api/request-password-reset",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)});else throw s}const r=await n.json();if(!n.ok||!r.success)throw new Error(r.error||"Failed to dispatch password reset email.");return r}a("lnkForgot").addEventListener("click",async()=>{const e=a("iEmail").value.trim();if(!e){a("loginErr").textContent="⚠️ Please enter your email address in the Email field above to reset your password.",a("loginErr").classList.remove("hidden");return}a("loginErr").classList.add("hidden");const t=a("lnkForgot").textContent;a("lnkForgot").textContent="Sending reset email...";try{await to(e),alert(`✉️ Password Reset Email Sent!

We have sent a branded email with a secure "Reset Password" button link to:
`+e+`

Please check your inbox and spam folder (valid for 30 minutes).`)}catch(o){o.message&&(o.message.includes("No registered account")||o.message.includes("user-not-found"))?a("loginErr").textContent="⚠️ No registered user found with this email address. Please sign up!":o.message&&o.message.includes("Too many password reset requests")?a("loginErr").textContent="⚠️ Rate limit reached: Please wait 10 minutes before requesting another reset email.":a("loginErr").textContent="⚠️ "+o.message,a("loginErr").classList.remove("hidden")}finally{a("lnkForgot").textContent=t}});a("bGuest").addEventListener("click",()=>{if(!a("termsCheckbox").checked){a("loginErr").textContent="⚠️ You must agree to the Terms & Conditions and Privacy Policy to enter the Arena!",a("loginErr").classList.remove("hidden");return}a("mGuest").classList.remove("hidden")});a("bGBack").addEventListener("click",()=>a("mGuest").classList.add("hidden"));a("bGConfirm").addEventListener("click",()=>{if(!a("termsCheckbox").checked){alert("You must agree to the Terms & Conditions and Privacy Policy to enter the Arena!");return}a("mGuest").classList.add("hidden");const e=Math.floor(1e5+Math.random()*9e5);T={uid:`guest_${e}`,name:"Guest Player",handle:`@guest#${e}`,av:`https://api.dicebear.com/7.x/bottts/svg?seed=g${e}`,email:"",premium:!1,banned:!1,balance:0},m=null,kt()});a("btnResendVerifyLogin")&&a("btnResendVerifyLogin").addEventListener("click",async()=>{const e=a("iEmail").value.trim(),t=a("iPass").value.trim();if(!e||!t){alert("Please enter your registered Email and Password above to resend the verification email.");return}try{const o=await signInWithEmailAndPassword(auth,e,t);o.user.emailVerified?(alert("Your email is already verified! You can log in now."),a("btnResendVerifyLogin").classList.add("hidden")):(await sendEmailVerification(o.user),alert("✉️ Verification email sent! Please check your inbox and spam folder at: "+e)),await signOut(auth)}catch(o){alert("Error: "+(o.message||o))}});a("bLogout").addEventListener("click",async()=>{if(confirm("Are you sure you want to sign out?")){T=null,m=null,Lt();try{sessionStorage.clear()}catch{}X("sLogin");try{await signOut(auth)}catch(e){console.warn("Sign out error:",e)}}});a("bDeleteAccount")&&a("bDeleteAccount").addEventListener("click",async()=>{if(!confirm(`⚠️ Are you sure you want to PERMANENTLY delete your ArenaX account?

This action cannot be undone. All your stats, wallet balance, and tournament records will be permanently erased.`))return;if(T){T=null,m=null,Lt(),X("sLogin"),alert("Guest profile cleared.");return}const e=auth.currentUser;if(e)try{const t=e.uid;try{await deleteDoc(doc(db,"users",t))}catch(o){console.warn("Error deleting Firestore user doc:",o)}await deleteUser(e),m=null,Lt(),X("sLogin"),alert("Your ArenaX account has been permanently deleted.")}catch(t){t.code==="auth/requires-recent-login"?alert("For security reasons, please sign out and sign in again before deleting your account."):alert("Delete account error: "+(t.message||t))}});function nr(){const e=query(collection(db,"tournaments"));onSnapshot(e,t=>{ze=[],t.forEach(i=>{ze.push({id:i.id,...i.data()})}),ze.sort((i,n)=>{var d,c;const r=((d=i.createdAt)==null?void 0:d.seconds)||i.createdAt||0;return(((c=n.createdAt)==null?void 0:c.seconds)||n.createdAt||0)-r}),ze.forEach(i=>{i.name&&(i.name.toLowerCase().includes("champions")||i.name.toLowerCase().includes("soccer")||i.name.toLowerCase().includes("football"))&&(i.accentTheme="soccer")});const o=m||T;if(o&&!T){const i=query(collection(db,"tournament_registrations"),where("userId","==",o.uid));onSnapshot(i,n=>{Kt={},n.forEach(r=>{const s=r.data();Kt[s.tournamentId]={id:r.id,...s}}),Ue()},n=>{console.warn("Registrations listen error:",n),Ue()})}else Ue()},t=>{console.warn("Tournaments listen error:",t),ze=[{id:"demo_champions",name:"ArenaX Champions Cup",game:"eFootball / FC 24",status:"upcoming",registered:12,maxPlayers:32,prize:"50,000 AX Coins",date:"Jul 15, 2026",time:"08:00 PM PKT",entryFee:"Rs 200",teamType:"Squad (4 Players)",hasTeams:!0,accentTheme:"soccer"},{id:"demo1",name:"Grand RP Duo Showdown",game:"Grand RP Mobile",status:"live",registered:18,maxPlayers:32,prize:"10,000 AX",date:"Live Now",time:"08:00 PM",entryFee:"Rs 150",teamType:"Duo (2 Players)",accentTheme:"crimson"},{id:"demo2",name:"City Cup Championship",game:"Grand RP Mobile",status:"upcoming",registered:4,maxPlayers:64,prize:"25,000 AX",date:"July 5, 2026",time:"09:00 PM",entryFee:"Free",teamType:"Squad (4 Players)",accentTheme:"ice"}],Ue()})}function Ii(e){if(e.status!=="live")return"";const t=e.totalPlayers!==void 0?e.totalPlayers:e.registered||0,o=e.alivePlayers!==void 0?e.alivePlayers:t,i=e.eliminatedPlayers!==void 0?e.eliminatedPlayers:0,n=t>0?o/t*100:0;let r="";return o===1?r=`
      <div class="mt-2 text-center text-xs font-black text-gold animate-bounce flex items-center justify-center gap-1">
        <span>🏆 Winner Announced Soon!</span>
      </div>
    `:o===0&&e.winnerName&&(r=`
      <div class="mt-2 text-center p-1.5 bg-gold/15 border border-gold/30 rounded-lg">
        <div class="text-[9px] uppercase tracking-widest text-gold font-black">MATCH CHAMPION</div>
        <div class="text-xs font-black text-white flex items-center justify-center gap-1.5 mt-0.5">
          <i class="fas fa-trophy text-gold"></i> ${e.winnerName}
        </div>
      </div>
    `),`
    <div class="bg-[#0b0e17] border border-red/40 rounded-xl p-3.5 space-y-2.5 relative overflow-hidden shadow-[0_0_15px_rgba(232,64,74,0.08)] mb-3">
      <!-- Glow effect -->
      <div class="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-red to-transparent"></div>
      
      <div class="flex items-center justify-between">
        <span class="text-[10px] font-black text-red tracking-wider flex items-center gap-1.5 uppercase">
          <span class="relative flex h-2 w-2">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red opacity-75"></span>
            <span class="relative inline-flex rounded-full h-2 w-2 bg-red"></span>
          </span>
          LIVE MATCH IN PROGRESS
        </span>
        <span class="text-[9px] text-t3 font-mono font-bold uppercase tracking-wider">Tracker Mode</span>
      </div>
      
      <div class="grid grid-cols-2 gap-3 text-xs pt-1">
        <div class="bg-[#121625]/40 border border-bdr/20 p-2 rounded-lg flex flex-col justify-center">
          <div class="text-[9px] text-t3 uppercase font-black tracking-wider mb-0.5">Total Players</div>
          <div class="text-white font-mono font-black text-sm flex items-center gap-1">
            <i class="fas fa-users text-t3 text-xs"></i> ${t}
          </div>
        </div>
        
        <div class="bg-[#121625]/40 border border-bdr/20 p-2 rounded-lg space-y-1.5">
          <div class="flex justify-between text-[9px] font-black uppercase tracking-wider">
            <span class="text-green">🟢 Alive: ${o}</span>
            <span class="text-red">💀 Dead: ${i}</span>
          </div>
          <!-- Mini Progress Bar -->
          <div class="w-full h-2 bg-red rounded-full overflow-hidden flex border border-bdr/10">
            <div class="h-full bg-green transition-all duration-500" style="width: ${n}%;"></div>
          </div>
        </div>
      </div>
      
      ${r}
    </div>
  `}function Ue(){const e=a("tList");if(!e)return;e.innerHTML="";const t=rr(),i=(ze||[]).filter(n=>n.teamType==="Team War"?!1:t==="all"||n.status===t);if(i.length===0){e.innerHTML=`
      <div class="p-8 bg-card border border-bdr rounded-xl text-center text-xs text-t3">
        <i class="fas fa-calendar-times text-2xl mb-2"></i>
        <p>No tournaments matches found in this category.</p>
      </div>`;return}i.forEach(n=>{const r=Kt[n.id];let d=`p-4 bg-card border ${r&&r.status==="approved"?"border-green bg-green/5":r&&r.status==="rejected"?"border-red/40 bg-red/5":"border-bdr"} rounded-xl space-y-3 relative transition hover:border-gold duration-200 cursor-pointer`;n.accentTheme==="crimson"?d="p-4 bg-gradient-to-b from-red/10 to-card/95 border border-red/40 rounded-xl space-y-3 relative transition hover:border-red duration-200 cursor-pointer shadow-[0_0_12px_rgba(232,64,74,0.05)]":n.accentTheme==="gold"?d="p-4 bg-gradient-to-b from-gold/10 to-card/95 border border-gold/40 rounded-xl space-y-3 relative transition hover:border-gold duration-200 cursor-pointer shadow-[0_0_12px_rgba(240,192,64,0.05)]":n.accentTheme==="royal"?d="p-4 bg-gradient-to-b from-purple/10 to-card/95 border border-purple/40 rounded-xl space-y-3 relative transition hover:border-purple duration-200 cursor-pointer shadow-[0_0_12px_rgba(167,139,250,0.05)]":n.accentTheme==="mint"?d="p-4 bg-gradient-to-b from-green/10 to-card/95 border border-green/40 rounded-xl space-y-3 relative transition hover:border-green duration-200 cursor-pointer shadow-[0_0_12px_rgba(61,220,132,0.05)]":n.accentTheme==="ice"?d="p-4 bg-gradient-to-b from-blue/10 to-card/95 border border-blue/40 rounded-xl space-y-3 relative transition hover:border-blue duration-200 cursor-pointer shadow-[0_0_12px_rgba(79,158,255,0.05)]":n.accentTheme==="soccer"&&(d="p-5 bg-gradient-to-br from-[#0c2e1f] via-[#101917] to-[#0a0c12] border-2 border-emerald-500/50 hover:border-emerald-300 rounded-2xl space-y-3.5 relative overflow-hidden transition-all duration-300 hover:shadow-[0_0_25px_rgba(16,185,129,0.25)] cursor-pointer group");const c=document.createElement("div");c.className=d,n.accentTheme==="soccer"?c.innerHTML=`
        <!-- Soccer Pitch Visual Gridlines -->
        <div class="absolute inset-0 opacity-[0.05] pointer-events-none select-none">
          <div class="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[1px] bg-white"></div>
          <div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 rounded-full border border-white"></div>
          <div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white"></div>
          <div class="absolute inset-4 border border-white"></div>
        </div>
        
        <!-- Glowing Ambient Lights -->
        <div class="absolute top-0 left-1/4 w-16 h-1 bg-emerald-400 blur-sm"></div>
        <div class="absolute top-0 right-1/4 w-16 h-1 bg-emerald-400 blur-sm"></div>
        
        <!-- Background Icon -->
        <div class="absolute -right-8 -bottom-8 opacity-10 text-emerald-400 text-8xl rotate-12 transition-transform duration-500 group-hover:rotate-45 pointer-events-none select-none">
          <i class="fas fa-futbol"></i>
        </div>

        ${Ii(n)}

        <div class="flex justify-between items-start gap-3 relative z-10">
          <div>
            <div class="flex flex-wrap items-center gap-1.5 mb-1.5">
              <span class="px-2 py-0.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[8px] font-black uppercase tracking-widest rounded-md">
                🏆 HYBRID SOCCER
              </span>
              <span class="px-2 py-0.5 bg-gold/15 border border-gold/30 text-gold text-[8px] font-black uppercase tracking-widest rounded-md">
                SPECIAL EVENT
              </span>
              ${n.isComingSoon?`
                <span class="px-2 py-0.5 bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[8px] font-black uppercase tracking-widest rounded-md animate-pulse">
                  🔒 COMING SOON
                </span>
              `:""}
            </div>
            <h4 class="font-display font-black text-lg text-white leading-tight uppercase tracking-wide group-hover:text-emerald-300 transition-colors">${n.name}</h4>
            <p class="text-[10px] text-emerald-400 font-bold mt-0.5 flex items-center gap-1">
              <i class="fas fa-gamepad"></i> ${n.game||"Grand RP Mobile"}
            </p>
          </div>
          <span class="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${n.isComingSoon?"bg-amber-500/20 text-amber-300 border border-amber-500/35":n.status==="live"?"bg-red text-white animate-pulse":n.status==="cancelled"?"bg-amber-500/20 text-amber-300 border border-amber-500/35":n.status==="ended"?"bg-neutral-800 text-t3 border border-neutral-700":"bg-emerald-500/20 text-emerald-300 border border-emerald-500/35"}">
            ${n.isComingSoon?"Coming Soon":n.status==="live"?"🔴 Live":n.status==="cancelled"?"❌ Cancelled":n.status==="ended"?"Ended":"Upcoming"}
          </span>
        </div>

        <!-- Scoreboard Style Grid -->
        <div class="grid grid-cols-3 gap-2 text-xs font-semibold text-t2 bg-black/50 p-3 rounded-xl border border-emerald-500/15 relative z-10">
          <div class="text-center border-r border-emerald-500/10">
            <span class="text-[9px] text-emerald-400/60 uppercase font-black tracking-wider block mb-0.5">Prize Pool</span>
            <span class="text-gold font-display text-base font-black tracking-tight">${n.isComingSoon?"Coming Soon":n.prize||"TBD"}</span>
          </div>
          <div class="text-center border-r border-emerald-500/10">
            <span class="text-[9px] text-emerald-400/60 uppercase font-black tracking-wider block mb-0.5">Slots Filled</span>
            <span class="text-white font-mono text-sm font-bold">${n.isComingSoon?"Coming Soon":`${n.registered||0}/${n.maxPlayers||32}`}</span>
          </div>
          <div class="text-center">
            <span class="text-[9px] text-emerald-400/60 uppercase font-black tracking-wider block mb-0.5">Entry Fee</span>
            <span class="text-emerald-300 font-bold font-mono text-sm">${n.isComingSoon?"Coming Soon":n.entryFee||"Free"}</span>
          </div>
        </div>

        <div class="flex flex-wrap gap-x-4 gap-y-1.5 text-[10px] text-t3 font-medium relative z-10 pt-1">
          <span class="flex items-center gap-1 text-emerald-400/90"><i class="fas fa-calendar-alt text-emerald-400"></i> ${n.isComingSoon?"Coming Soon":n.date||"TBA"}</span>
          <span class="flex items-center gap-1 text-emerald-400/90"><i class="fas fa-clock text-emerald-400"></i> ${n.isComingSoon?"Coming Soon":n.time||"TBA"}</span>
          <span class="flex items-center gap-1 text-emerald-400/90"><i class="fas fa-users text-emerald-400"></i> ${n.teamType||"Solo"}</span>
          ${n.map?`<span class="flex items-center gap-1 text-emerald-400/90"><i class="fas fa-map-marked-alt text-emerald-400"></i> Map: <strong class="text-white">${n.map}</strong></span>`:""}
          ${n.perKill?`<span class="flex items-center gap-1 text-emerald-400/90"><i class="fas fa-crosshairs text-emerald-400"></i> Per Kill: <strong class="text-white">${n.perKill}</strong></span>`:""}
        </div>

        ${r&&!n.isComingSoon?`
          <div class="pt-2 border-t border-emerald-500/10 flex justify-between items-center text-xs relative z-10">
            <span class="font-bold uppercase tracking-wider text-[10px] ${r.status==="approved"?"text-emerald-400":r.status==="rejected"?"text-red":"text-gold"}">
              ${r.status==="approved"?"✓ Registered":r.status==="rejected"?"Rejected":"Verification Pending..."}
            </span>
            <span class="text-[10px] text-t3 font-mono">TXN: ${r.txnId}</span>
          </div>
        `:""}

        ${n.liveMessage?`
          <div class="p-2.5 ${n.status==="cancelled"?"bg-amber-500/5 border border-amber-500/20 text-amber-400":"bg-emerald-500/5 border border-emerald-500/20 text-emerald-300"} rounded-lg text-[11px] font-medium flex gap-2 items-start leading-normal relative z-10">
            <i class="fas ${n.status==="cancelled"?"fa-exclamation-triangle animate-pulse text-amber-400":"fa-bullhorn animate-bounce text-emerald-400"} text-xs mt-0.5"></i>
            <div>
              <span class="font-bold uppercase text-[9px] block mb-0.5 tracking-wider ${n.status==="cancelled"?"text-amber-400":"text-emerald-400"}">
                ${n.status==="cancelled"?"⚠️ Cancellation Notice":"🔴 Live Notice"}
              </span>
              ${n.liveMessage}
            </div>
          </div>
        `:""}

        <div class="pt-2 flex gap-2 flex-wrap relative z-10">
          ${n.isComingSoon?`
            <button class="b-coming-soon flex-1 py-2 bg-neutral-800/80 border border-neutral-700 hover:bg-neutral-800 text-t3 text-[11px] font-black uppercase tracking-wider rounded-lg transition">
              🔒 Locked (Coming Soon)
            </button>
          `:n.status==="cancelled"?"":`
            <button class="b-part flex-1 min-w-[120px] py-1.5 bg-emerald-500/15 border border-emerald-500/35 hover:bg-emerald-500/25 text-emerald-300 text-[11px] font-black uppercase tracking-wider rounded-lg transition" data-tid="${n.id}" data-tname="${n.name}">
              <i class="fas fa-users mr-1"></i> Slots
            </button>
            ${n.status==="ended"?`
              <button class="b-result flex-1 min-w-[120px] py-1.5 bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/25 text-blue-400 text-[11px] font-black uppercase tracking-wider rounded-lg transition" data-tid="${n.id}" data-tname="${n.name}">
                <i class="fas fa-poll mr-1"></i> Match Result
              </button>
            `:n.status==="upcoming"?`
              <button class="b-register flex-1 min-w-[120px] py-1.5 bg-gold/15 border border-gold/30 hover:bg-gold/25 text-gold text-[11px] font-black uppercase tracking-wider rounded-lg transition" data-tid="${n.id}" data-tname="${n.name}">
                <i class="fas fa-gamepad mr-1"></i> Participate
              </button>
            `:""}
          `}
        </div>
      `:c.innerHTML=`
        ${Ii(n)}

        <div class="flex justify-between items-start gap-3">
          <div>
            <div class="flex flex-wrap items-center gap-1.5 mb-1">
              <h4 class="font-display font-bold text-base text-white leading-tight">${n.name}</h4>
              ${n.isComingSoon?`
                <span class="px-2 py-0.5 bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[8px] font-black uppercase tracking-widest rounded-md">
                  COMING SOON
                </span>
              `:""}
            </div>
            <p class="text-[10px] text-t3 font-medium mt-0.5">${n.game||"Grand RP Mobile"}</p>
          </div>
          <span class="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide ${n.isComingSoon?"bg-amber-500/15 text-amber-400 border border-amber-500/25":n.status==="live"?"bg-red/15 text-red border border-red/25":n.status==="upcoming"?"bg-blue/15 text-blue border border-blue/25":n.status==="cancelled"?"bg-amber-500/15 text-amber-400 border border-amber-500/25":"bg-neutral-800 text-t3 border border-neutral-700"}">
            ${n.isComingSoon?"Coming Soon":n.status==="live"?"🔴 Live":n.status==="upcoming"?"Upcoming":n.status==="cancelled"?"❌ Cancelled":"Ended"}
          </span>
        </div>

        <div class="grid grid-cols-3 gap-2 text-xs font-semibold text-t2 bg-[#111420]/40 p-2.5 rounded-lg border border-bdr/20">
          <div>
            <span class="text-[9px] text-t3 uppercase font-bold block">Prize Pool</span>
            <span class="text-gold font-display text-sm font-bold">${n.isComingSoon?"Coming Soon":n.prize||"TBD"}</span>
          </div>
          <div>
            <span class="text-[9px] text-t3 uppercase font-bold block">Size Slots</span>
            <span class="text-white">${n.isComingSoon?"Coming Soon":`${n.registered||0}/${n.maxPlayers||32}`}</span>
          </div>
          <div>
            <span class="text-[9px] text-t3 uppercase font-bold block">Entry Fee</span>
            <span class="text-gold font-medium">${n.isComingSoon?"Coming Soon":n.entryFee||"Free"}</span>
          </div>
        </div>

        <div class="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-t3 font-medium">
          <span><i class="fas fa-calendar mr-1 text-gold"></i> ${n.isComingSoon?"Coming Soon":n.date||"TBA"}</span>
          <span><i class="fas fa-clock mr-1 text-gold"></i> ${n.isComingSoon?"Coming Soon":n.time||"TBA"}</span>
          <span><i class="fas fa-users mr-1 text-gold"></i> ${n.teamType||"Solo"}</span>
          ${n.map?`<span><i class="fas fa-map-marked-alt mr-1 text-emerald-400"></i> Map: <strong class="text-white">${n.map}</strong></span>`:""}
          ${n.perKill?`<span><i class="fas fa-crosshairs mr-1 text-red"></i> Per Kill: <strong class="text-white">${n.perKill}</strong></span>`:""}
        </div>

        ${r&&!n.isComingSoon?`
          <div class="pt-2 border-t border-bdr/20 flex justify-between items-center text-xs">
            <div class="flex flex-col gap-0.5">
              <span class="font-bold uppercase tracking-wider text-[10px] ${r.status==="approved"?"text-green":r.status==="rejected"?"text-red":r.status==="cancelled"?"text-t3":"text-gold"}">
                ${r.status==="approved"?"Slots Verified ✓":r.status==="rejected"?"Registration Rejected":r.status==="cancelled"?"Slot Cancelled ✕":"Verification Pending..."}
              </span>
              ${r.revokeReason?`<span class="text-[9px] text-red leading-tight max-w-[150px] whitespace-normal">Reason: ${r.revokeReason}</span>`:""}
              <span class="text-[9px] text-t3 font-mono">TXN: ${r.txnId.slice(0,16)}</span>
            </div>
            ${n.status==="upcoming"&&(r.status==="pending"||r.status==="approved")?`
              <button class="b-self-cancel px-2.5 py-1 bg-red/10 border border-red/20 hover:bg-red/25 text-red text-[10px] font-bold uppercase rounded-lg transition" data-tid="${n.id}" data-regid="${r.id}">
                Cancel Slot
              </button>
            `:""}
          </div>
        `:""}

        ${n.liveMessage?`
          <div class="p-2.5 ${n.status==="cancelled"?"bg-amber-500/5 border border-amber-500/20 text-amber-400":"bg-red/5 border border-red/20 text-red/90"} rounded-lg text-[11px] font-medium flex gap-2 items-start leading-normal">
            <i class="fas ${n.status==="cancelled"?"fa-exclamation-triangle animate-pulse text-amber-400":"fa-bullhorn animate-bounce text-red"} text-xs mt-0.5"></i>
            <div>
              <span class="font-bold uppercase text-[9px] block mb-0.5 tracking-wider ${n.status==="cancelled"?"text-amber-400":"text-red"}">
                ${n.status==="cancelled"?"⚠️ Cancellation Notice":"🔴 Live Notice"}
              </span>
              ${n.liveMessage}
            </div>
          </div>
        `:""}

        ${n.status==="live"&&n.youtubeLink?`
          <div class="pt-1">
            <a href="${n.youtubeLink}" target="_blank" rel="noopener noreferrer" class="b-live-stream flex items-center justify-center gap-2 w-full py-1.5 bg-red hover:bg-[#cc3540] text-white text-[11px] font-bold rounded-lg transition shadow-md shadow-red/20">
              <i class="fab fa-youtube text-sm"></i> Watch Live YouTube Stream
            </a>
          </div>
        `:""}

        <div class="pt-2 flex gap-2 flex-wrap">
          ${n.isComingSoon?`
            <button class="b-coming-soon flex-1 py-2 bg-neutral-800/80 border border-neutral-700 text-t3 text-[11px] font-black uppercase tracking-wider rounded-lg transition">
              🔒 Locked (Coming Soon)
            </button>
          `:n.status==="cancelled"?"":`
            <button class="b-part flex-1 min-w-[120px] py-1.5 bg-gold/10 border border-gold/20 hover:bg-gold/25 text-gold text-[11px] font-bold rounded-lg transition" data-tid="${n.id}" data-tname="${n.name}">
              <i class="fas fa-users mr-1"></i> Slots
            </button>
            ${n.status==="ended"?`
              <button class="b-result flex-1 min-w-[120px] py-1.5 bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/25 text-blue-400 text-[11px] font-bold rounded-lg transition" data-tid="${n.id}" data-tname="${n.name}">
                <i class="fas fa-poll mr-1"></i> Match Result
              </button>
            `:n.status==="upcoming"?`
              <button class="b-register flex-1 min-w-[120px] py-1.5 bg-gold/10 border border-gold/20 hover:bg-gold/25 text-gold text-[11px] font-bold rounded-lg transition" data-tid="${n.id}" data-tname="${n.name}">
                <i class="fas fa-gamepad mr-1"></i> Participate
              </button>
            `:""}
          `}
        </div>
      `,c.addEventListener("click",g=>{if(n.isComingSoon){alert("Coming soon! This tournament is not open for registration yet.");return}if(n.status==="cancelled"){alert("This tournament has been cancelled! All registration and participation options are disabled.");return}g.target.closest(".b-part")||g.target.closest(".b-result")||g.target.closest(".b-register")||g.target.closest(".b-live-stream")||g.target.closest(".b-self-cancel")||Ni(n)});const l=c.querySelector(".b-coming-soon");l&&l.addEventListener("click",g=>{g.stopPropagation(),alert("Coming soon! This tournament is not open for registration yet.")});const u=c.querySelector(".b-part");u&&u.addEventListener("click",g=>{if(g.stopPropagation(),n.isComingSoon){alert("Coming soon! This tournament is not open for registration yet.");return}openTournamentParticipation(n)});const p=c.querySelector(".b-result");p&&p.addEventListener("click",g=>{g.stopPropagation(),openTournamentLeaderboard(n)});const f=c.querySelector(".b-register");f&&f.addEventListener("click",g=>{if(g.stopPropagation(),n.isComingSoon){alert("Coming soon! This tournament is not open for registration yet.");return}Ni(n)});const b=c.querySelector(".b-self-cancel");b&&b.addEventListener("click",async g=>{g.stopPropagation();const w=b.dataset.regid,h=b.dataset.tid;await window.selfCancelRegistration(w,h,n.name,n.entryFee)}),e.appendChild(c)})}function rr(){const e=document.querySelector(".fb.on");return e?e.dataset.f:"all"}document.querySelectorAll(".fb").forEach(e=>{e.addEventListener("click",()=>{document.querySelectorAll(".fb").forEach(t=>t.classList.remove("on","bg-gold","text-bg")),e.classList.add("on"),Ue()})});function Ni(e){if(e.isComingSoon){alert("This tournament is coming soon!");return}if(e.status==="cancelled"){alert("This tournament has been cancelled! All registration and participation options are disabled.");return}const t=m||T;if(t&&(t.banType==="tournament"||t.banned)){const i=t.banRule?`

Rule Violation: ${t.banRule}`:"";alert(`❌ Tournament Access Blocked!

You are banned from participating in tournaments.

Reason: ${t.banReason||"Unspecified Rule Violations"}${i}

If you feel this is unfair, try contacting live support.`);return}const o=Kt[e.id];if(o&&o.status==="approved"){alert("you are already registered");return}if(t&&!t.discordVerified){window.openDiscordVerificationGate(e);return}St(e)}let be=null;function St(e){if(T){alert("Guest accounts are restricted from registering for tournaments. Please register a real profile!");return}const t=m||T;if(t&&!t.discordVerified){window.openDiscordVerificationGate(e);return}be=e,a("tdetName").textContent=e.name,a("tdetGame").textContent=e.game||"Grand RP Mobile",a("tdetPlayers").textContent=`${e.registered||0}/${e.maxPlayers||32}`,a("tdetPrize").textContent=e.prize||"TBD";const o={upcoming:"Upcoming",live:"🔴 Live Now",ended:"Ended",cancelled:"❌ Cancelled"};a("tdetStatus").textContent=o[e.status]||e.status,a("tdetExtra").textContent=`Format: ${e.teamType||"Solo"} — Entry: ${e.entryFee||"Free"}`,e.status==="cancelled"?a("bParticipate").classList.add("hidden"):a("bParticipate").classList.remove("hidden"),document.querySelectorAll("#tregStep1, #tregStep2, #tregStep3, #tregStep4").forEach(i=>i.classList.add("hidden")),a("tregStep1").classList.remove("hidden"),a("tregRealName").value="",a("tregGameName").value="",a("tregUID").value=m&&m.gameUID?m.gameUID:"",a("tregAge").value="",a("tregCheck1").checked=!1,a("tregCheck2").checked=!1,a("mTourDetail").classList.remove("hidden")}a("bCloseTourDetail").addEventListener("click",()=>a("mTourDetail").classList.add("hidden"));a("bParticipate").addEventListener("click",()=>{if(be.status==="ended"){alert("This tournament has already ended!");return}if(be.status==="cancelled"){alert("This tournament has been cancelled!");return}a("tregStep1").classList.add("hidden"),a("tregStep2").classList.remove("hidden")});a("tregDecline").addEventListener("click",()=>a("mTourDetail").classList.add("hidden"));a("tregAgree").addEventListener("click",()=>{if(!a("tregRealName").value.trim()||!a("tregGameName").value.trim()||!a("tregUID").value.trim()||!a("tregAge").value.trim()){alert("Please fill out all required fields!");return}if(!a("tregCheckRules").checked){alert("You must read and agree to the ArenaX rules to participate in tournaments!");return}if(!a("tregCheck1").checked||!a("tregCheck2").checked){alert("You must accept the terms & anti-cheat guidelines!");return}const e=be.entryFee||"";let t=0;if(e&&!e.toLowerCase().includes("free")){const i=e.match(/\d+/);i&&(t=parseInt(i[0],10))}const o=m&&m.balance||0;a("tregFeeAX").textContent=`${t} AX Coins`,a("tregBalanceAX").textContent=`${o} AX Coins`,o<t?(a("tregBalanceAfterAX").textContent="Insufficient Balance",a("tregBalanceAfterAX").className="font-bold text-red",a("tregStatusMsg").innerHTML=`<p class="text-red font-semibold">⚠️ Insufficient coins! You need ${t} AX Coins to register but you only have ${o} AX Coins. Please deposit coins first.</p>`,a("tregSubmit").disabled=!0,a("tregSubmit").classList.add("opacity-50","cursor-not-allowed"),a("tregSubmit").textContent="Insufficient Balance"):(a("tregBalanceAfterAX").textContent=`${o-t} AX Coins`,a("tregBalanceAfterAX").className="font-bold text-green",a("tregStatusMsg").innerHTML=`<p class="text-t2 font-medium">✅ You have enough coins. ${t} AX Coins will be deducted from your ArenaX wallet automatically when the admin approves your registration slot.</p>`,a("tregSubmit").disabled=!1,a("tregSubmit").classList.remove("opacity-50","cursor-not-allowed"),a("tregSubmit").textContent="Confirm & Submit Entry"),a("tregStep2").classList.add("hidden"),a("tregStep3").classList.remove("hidden")});a("tregBack").addEventListener("click",()=>{a("tregStep3").classList.add("hidden"),a("tregStep2").classList.remove("hidden")});a("tregSubmit").addEventListener("click",async()=>{const e=be.entryFee||"";let t=0;if(e&&!e.toLowerCase().includes("free")){const i=e.match(/\d+/);i&&(t=parseInt(i[0],10))}if((m&&m.balance||0)<t){alert("Insufficient coins! Please deposit more coins to register. ❌");return}a("tregSubmit").disabled=!0,a("tregSubmit").textContent="Submitting...";try{const i="AX-WALLET-REG-"+Math.floor(1e5+Math.random()*9e5);if(await addDoc(collection(db,"tournament_registrations"),{tournamentId:be.id,tournamentName:be.name,userId:m.uid,userName:m.name,userHandle:m.handle,realName:a("tregRealName").value.trim(),gameName:a("tregGameName").value.trim(),gameUID:a("tregUID").value.trim(),age:a("tregAge").value.trim(),txnId:i,screenshot:"Auto-verified ArenaX Wallet Hold",status:"pending",submittedAt:serverTimestamp()}),m&&m.uid)try{await updateDoc(doc(db,"users",m.uid),{hasSubmittedRegistration:!0}),m.hasSubmittedRegistration=!0}catch(n){console.error("Error setting hasSubmittedRegistration in Firestore:",n)}a("tregStep3").classList.add("hidden"),a("tregStep4").classList.remove("hidden");try{const n=collection(db,"teams"),r=query(n,where("leaderId","==",m.uid),limit(1)),s=await getDocs(r);if(!s.empty){const d=s.docs[0],c=d.data(),l=d.id;window.activeSquadInviteTeam={id:l,...c},window.activeSquadInviteTour=be,a("squadInvitePromptMsg").textContent=`You successfully registered for the tournament "${be.name}"! Do you want to invite your Guild "${c.name}" members to join your tournament squad?`,a("mSquadInvitePromptModal").classList.remove("hidden")}}catch(n){console.error("Error checking leading teams on register success:",n)}}catch(i){alert("Registration error: "+i.message)}finally{a("tregSubmit").disabled=!1,a("tregSubmit").textContent="Confirm & Submit Entry"}});a("tregDone").addEventListener("click",()=>a("mTourDetail").classList.add("hidden"));window.selfCancelRegistration=async function(e,t,o,i){if(confirm(`Are you sure you want to cancel your slot and leave the tournament "${o}"?`))try{const n=doc(db,"tournament_registrations",e),r=await getDoc(n);if(!r.exists()){alert("Registration record not found.");return}const s=r.data();let d=0;if(i&&!i.toLowerCase().includes("free")){const l=i.match(/\d+/);l&&(d=parseInt(l[0],10))}const c=s.status==="approved";if(c&&d>0&&(await updateDoc(doc(db,"users",s.userId),{balance:increment(d)}),await addDoc(collection(db,"deposit_requests"),{userId:s.userId,userName:s.userName||"",userEmail:"",type:"deposit",method:"Tournament Fee Refund (User Cancelled)",amountPKR:0,amountAX:d,txnId:"REF-"+Math.floor(1e5+Math.random()*9e5),status:"approved",submittedAt:serverTimestamp()})),await updateDoc(n,{status:"cancelled",cancelledAt:serverTimestamp(),cancelledBy:"user"}),c){await updateDoc(doc(db,"tournaments",t),{registered:increment(-1)});try{const l=query(collection(db,"leaderboards"),where("tournamentId","==",t),where("userId","==",s.userId)),u=await getDocs(l);for(const p of u.docs)await deleteDoc(doc(db,"leaderboards",p.id))}catch(l){console.error("Error removing player from leaderboard on self-cancel:",l)}}alert(`Successfully cancelled your slot for "${o}".${c&&d>0?` ${d} AX Coins have been refunded to your wallet.`:""} ✅`)}catch(n){alert("Error cancelling registration: "+n.message)}};window.activeRedReportSlab="Support";window.activeRedReportFilter="open";window.uploadedEvidenceUrl="";window.uploadedEvidenceType="link";window.activeReviewReportId="";window.openSupportDrawer=function(){const e=a("dSupportDrawer"),t=a("mSupportDrawerBackdrop");if(!e)return;e.classList.remove("hidden"),t&&t.classList.remove("hidden"),setTimeout(()=>{e.classList.remove("opacity-0"),e.classList.add("opacity-100"),t&&t.classList.add("opacity-100")},20);const o=a("vHelpSupportSticker");if(o){const i=typeof window.getAppBasePath=="function"?window.getAppBasePath():"./",n=o.querySelector("source");n&&!n.src.includes("help.mp4")&&(n.src=i+"help.mp4"),o.play().catch(r=>console.log("Auto-play help sticker:",r))}window.activeRedReportSlab==="Support"||!window.activeRedReportSlab?switchSupportSubSlab("Support"):window.activeRedReportSlab==="RedReport"?switchSupportSubSlab("RedReport"):window.activeRedReportSlab==="Rating"?switchSupportSubSlab("Rating"):window.activeRedReportSlab==="FAQ"&&switchSupportSubSlab("FAQ")};window.closeSupportDrawer=function(){const e=a("dSupportDrawer"),t=a("mSupportDrawerBackdrop");e&&(e.classList.remove("opacity-100"),e.classList.add("opacity-0"),t&&t.classList.remove("opacity-100"),setTimeout(()=>{e.classList.add("hidden"),t&&t.classList.add("hidden")},300))};a("bCloseSupportDrawer")&&a("bCloseSupportDrawer").addEventListener("click",()=>closeSupportDrawer());a("mSupportDrawerBackdrop")&&a("mSupportDrawerBackdrop").addEventListener("click",()=>closeSupportDrawer());window.openRedReportHubDrawer=function(){const e=a("dRedReportHubDrawer"),t=a("mRedReportHubDrawerBackdrop");!e||!t||(e.classList.remove("hidden"),t.classList.remove("hidden"),setTimeout(()=>{e.classList.remove("translate-x-full"),t.classList.remove("opacity-0"),t.classList.add("opacity-100")},20))};window.closeRedReportHubDrawer=function(){const e=a("dRedReportHubDrawer"),t=a("mRedReportHubDrawerBackdrop");!e||!t||(e.classList.add("translate-x-full"),t.classList.remove("opacity-100"),t.classList.add("opacity-0"),setTimeout(()=>{e.classList.add("hidden"),t.classList.add("hidden")},300))};a("bTopbarMenu")&&a("bTopbarMenu").addEventListener("click",()=>openRedReportHubDrawer());a("bCloseRedReportHubDrawer")&&a("bCloseRedReportHubDrawer").addEventListener("click",()=>closeRedReportHubDrawer());a("mRedReportHubDrawerBackdrop")&&a("mRedReportHubDrawerBackdrop").addEventListener("click",()=>closeRedReportHubDrawer());a("btnHubChat")&&a("btnHubChat").addEventListener("click",()=>{closeRedReportHubDrawer(),Te("Chat")});a("btnHubRules").addEventListener("click",()=>{closeRedReportHubDrawer(),Te("Rules")});a("btnHubSupport").addEventListener("click",()=>{closeRedReportHubDrawer(),switchSupportSubSlab("Support"),openSupportDrawer()});a("btnHubRedReport").addEventListener("click",()=>{closeRedReportHubDrawer(),switchSupportSubSlab("RedReport"),openSupportDrawer()});window.switchSupportSubSlab=function(e){window.activeRedReportSlab=e,a("dSupportMainHeader")&&a("dSupportMainHeader").classList.remove("hidden"),a("dSupportMobileTabs")&&a("dSupportMobileTabs").classList.remove("hidden"),document.querySelectorAll(".sub-slab-btn").forEach(o=>{o.classList.remove("bg-amber-400","text-slate-950"),o.classList.add("text-slate-400","hover:text-white")}),a("dSupportChatContent").classList.add("hidden"),a("dRedReportContent").classList.add("hidden"),a("dSupportFAQContent").classList.add("hidden"),e==="Support"?(a("bSubSlabSupport")&&(a("bSubSlabSupport").classList.add("bg-amber-400","text-slate-950"),a("bSubSlabSupport").classList.remove("text-slate-400")),a("dSupportChatContent").classList.remove("hidden"),a("dSupportIntroView")&&a("dSupportIntroView").classList.remove("hidden"),a("dSupportActiveChatView")&&a("dSupportActiveChatView").classList.add("hidden"),a("ratingBox")&&a("ratingBox").classList.add("hidden")):e==="Rating"?(a("bSubSlabRating")&&(a("bSubSlabRating").classList.add("bg-amber-400","text-slate-950"),a("bSubSlabRating").classList.remove("text-slate-400")),a("dSupportChatContent").classList.remove("hidden"),a("dSupportIntroView")&&a("dSupportIntroView").classList.add("hidden"),a("dSupportActiveChatView")&&a("dSupportActiveChatView").classList.add("hidden"),a("ratingBox")&&a("ratingBox").classList.remove("hidden")):e==="RedReport"?(a("bSubSlabRedReport")&&(a("bSubSlabRedReport").classList.add("bg-amber-400","text-slate-950"),a("bSubSlabRedReport").classList.remove("text-slate-400")),a("dRedReportContent").classList.remove("hidden"),initRedReportsListener()):e==="FAQ"&&(a("bSubSlabFAQ")&&(a("bSubSlabFAQ").classList.add("bg-amber-400","text-slate-950"),a("bSubSlabFAQ").classList.remove("text-slate-400")),a("dSupportFAQContent").classList.remove("hidden"))};a("bSubSlabSupport")&&a("bSubSlabSupport").addEventListener("click",()=>switchSupportSubSlab("Support"));a("bSubSlabRating")&&a("bSubSlabRating").addEventListener("click",()=>switchSupportSubSlab("Rating"));a("bSubSlabRedReport")&&a("bSubSlabRedReport").addEventListener("click",()=>switchSupportSubSlab("RedReport"));a("bSubSlabFAQ")&&a("bSubSlabFAQ").addEventListener("click",()=>switchSupportSubSlab("FAQ"));a("bStartLiveChatBtn")&&a("bStartLiveChatBtn").addEventListener("click",()=>{a("dSupportMainHeader")&&a("dSupportMainHeader").classList.add("hidden"),a("dSupportMobileTabs")&&a("dSupportMobileTabs").classList.add("hidden"),a("dSupportIntroView")&&a("dSupportIntroView").classList.add("hidden"),a("dSupportActiveChatView")&&a("dSupportActiveChatView").classList.remove("hidden"),loadLiveSupportChat();const e=a("chatMsgs");e&&(e.scrollTop=e.scrollHeight)});a("bBackToIntro")&&a("bBackToIntro").addEventListener("click",()=>{a("dSupportMainHeader")&&a("dSupportMainHeader").classList.remove("hidden"),a("dSupportMobileTabs")&&a("dSupportMobileTabs").classList.remove("hidden"),a("dSupportActiveChatView")&&a("dSupportActiveChatView").classList.add("hidden"),a("dSupportIntroView")&&a("dSupportIntroView").classList.remove("hidden")});window.activeRedReportFilter="all";window.switchRedReportFilter=function(e){window.activeRedReportFilter=e,document.querySelectorAll(".red-sub-tab").forEach(o=>{o.classList.remove("bg-red/20","text-white"),o.classList.add("text-t3","hover:text-white")}),e==="all"?(a("bRedSubAll").classList.add("bg-red/20","text-white"),a("bRedSubAll").classList.remove("text-t3")):e==="created"?(a("bRedSubCreated").classList.add("bg-red/20","text-white"),a("bRedSubCreated").classList.remove("text-t3")):e==="reviewed"?(a("bRedSubReviewed").classList.add("bg-red/20","text-white"),a("bRedSubReviewed").classList.remove("text-t3")):e==="from_me"&&(a("bRedSubFromMe").classList.add("bg-red/20","text-white"),a("bRedSubFromMe").classList.remove("text-t3")),renderRedReports()};a("bRedSubAll").addEventListener("click",()=>switchRedReportFilter("all"));a("bRedSubCreated").addEventListener("click",()=>switchRedReportFilter("created"));a("bRedSubReviewed").addEventListener("click",()=>switchRedReportFilter("reviewed"));a("bRedSubFromMe").addEventListener("click",()=>switchRedReportFilter("from_me"));const ei=a("rrFileInput");a("rrUploadArea").addEventListener("click",()=>ei.click());a("rrUploadArea").addEventListener("dragover",e=>{e.preventDefault(),a("rrUploadArea").classList.add("border-red-500")});a("rrUploadArea").addEventListener("dragleave",()=>{a("rrUploadArea").classList.remove("border-red-500")});a("rrUploadArea").addEventListener("drop",e=>{e.preventDefault(),a("rrUploadArea").classList.remove("border-red-500"),e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files.length>0&&(ei.files=e.dataTransfer.files,Ia(e.dataTransfer.files[0]))});ei.addEventListener("change",e=>{e.target&&e.target.files&&e.target.files.length>0&&Ia(e.target.files[0])});function Ia(e){if(!e)return;if(e.size>20*1024*1024){alert("Evidence file size exceeds the 20MB limit!");return}a("rrUploadProgress").classList.remove("hidden"),a("rrUploadSuccess").classList.add("hidden"),a("rrUploadTitle").classList.add("hidden");const t=ref(Ta,"red_reports/"+Date.now()+"_"+e.name);uploadBytes(t,e).then(async o=>{const i=await getDownloadURL(o.ref);window.uploadedEvidenceUrl=i,window.uploadedEvidenceType=e.type.startsWith("image/")?"image":"video",a("rrUploadProgress").classList.add("hidden"),a("rrUploadSuccess").classList.remove("hidden"),a("rrUploadSuccess").textContent=`✓ Uploaded: ${e.name}`,a("rrProofUrl").value=i}).catch(o=>{console.error(o),a("rrUploadProgress").classList.add("hidden"),a("rrUploadTitle").classList.remove("hidden"),alert("Upload error: "+o.message)})}async function ti(e){if(!e)return null;const t=query(collection(db,"users"),where("name","==",e)),o=await getDocs(t);if(!o.empty)return o.docs[0].data();let i=e.startsWith("@")?e.slice(1):e;const n=query(collection(db,"users"),where("handle","==",i)),r=await getDocs(n);if(!r.empty)return r.docs[0].data();const s=query(collection(db,"users"),limit(500)),d=await getDocs(s),c=e.toLowerCase().replace(/^@/,"");let l=null;return d.forEach(u=>{if(l)return;const p=u.data(),f=(p.name||"").toLowerCase(),b=(p.handle||"").toLowerCase();(f===c||b===c)&&(l=p)}),l}let Vo=null;async function Na(){const e=a("rrPlayerName").value.trim(),t=a("rrPlayerNameStatus");if(!e){t.classList.add("hidden"),t.textContent="";return}t.classList.remove("hidden"),t.className="text-[9px] mt-1 text-gold/80 font-semibold flex items-center gap-1",t.innerHTML='<i class="fas fa-spinner animate-spin mr-1"></i> Checking player name...';try{const o=await ti(e);o?(t.className="text-[9px] mt-1 text-emerald-400 font-semibold flex items-center gap-1",t.innerHTML=`<i class="fas fa-check-circle text-emerald-400 mr-1"></i> Player found: <span class="text-white">${o.name}</span>${o.handle?` (@${o.handle})`:""}`,o.gameUID&&(a("rrPlayerUID").value=o.gameUID)):(t.className="text-[9px] mt-1 text-red-400 font-semibold flex items-center gap-1",t.innerHTML='<i class="fas fa-times-circle text-red-400 mr-1"></i> Wrong name or username! Player not found.')}catch(o){t.className="text-[9px] mt-1 text-red-400",t.textContent="Verification error: "+o.message}}a("rrPlayerName").addEventListener("input",()=>{clearTimeout(Vo),Vo=setTimeout(Na,600)});a("rrPlayerName").addEventListener("blur",()=>{clearTimeout(Vo),Na()});a("bFileRedReport").addEventListener("click",()=>{if(T){alert("Guest profiles are restricted from filing Red Reports.");return}window.uploadedEvidenceUrl="",window.uploadedEvidenceType="link",a("rrYourName").value=m.name,a("rrPlayerName").value="",a("rrPlayerUID").value="",a("rrCheatCategory").value="Aimbot / Headshot Lock",a("rrDescription").value="",a("rrProofUrl").value="",a("rrPlayerNameStatus").classList.add("hidden"),a("rrPlayerNameStatus").textContent="",a("rrUploadProgress").classList.add("hidden"),a("rrUploadSuccess").classList.add("hidden"),a("rrUploadTitle").classList.remove("hidden"),a("mFileRedReport").classList.remove("hidden")});a("bCloseRedReportModal").addEventListener("click",()=>{a("mFileRedReport").classList.add("hidden")});a("bSubmitRedReport").addEventListener("click",async()=>{const e=a("rrPlayerName").value.trim(),t=a("rrPlayerUID").value.trim(),o=a("rrCheatCategory").value,i=a("rrDescription").value.trim();let n=a("rrProofUrl").value.trim();if(!e||!t||!i){alert("Please fill out all required fields marked with *!");return}a("bSubmitRedReport").disabled=!0,a("bSubmitRedReport").textContent="Verifying player...";try{const r=await ti(e);if(!r){alert("❌ Wrong name or username! This player does not exist in our database. Please enter the exact registered name or username (e.g. saadanadnan)."),a("bSubmitRedReport").disabled=!1,a("bSubmitRedReport").textContent="Submit Report";return}window.uploadedEvidenceUrl&&(n=window.uploadedEvidenceUrl),a("bSubmitRedReport").textContent="Submitting report...",await addDoc(collection(db,"red_reports"),{reporterUid:m.uid,reporterName:m.name,reportedNickname:r.name,gameUID:t,cheatType:o,description:i,evidenceUrl:n||"",evidenceType:window.uploadedEvidenceUrl?window.uploadedEvidenceType:"link",status:"created",verdict:"",createdAt:serverTimestamp()}),a("mFileRedReport").classList.add("hidden"),alert(`Red Report filed successfully! 🚨

It is now live under the Created tab. Staff and moderators will inspect logs and evidence within 12 hours.`)}catch(r){alert("Submission error: "+r.message)}finally{a("bSubmitRedReport").disabled=!1,a("bSubmitRedReport").textContent="Submit Report"}});window.redReportsUnsub=null;window.allRedReports=[];window.initRedReportsListener=function(){if(window.redReportsUnsub)return;const e=query(collection(db,"red_reports"),orderBy("createdAt","desc"));window.redReportsUnsub=onSnapshot(e,t=>{window.allRedReports=[],t.forEach(o=>{window.allRedReports.push({id:o.id,...o.data()})}),renderRedReports(),updateRedReportTabsCount()},t=>{console.error("Red Reports database error:",t)})};window.updateRedReportTabsCount=function(){const e=window.allRedReports||[],t=e.length,o=e.filter(r=>r.status==="created").length,i=e.filter(r=>r.status==="reviewed").length,n=e.filter(r=>r.reporterUid===(m==null?void 0:m.uid)).length;a("allReportsCount").textContent=t,a("createdReportsCount").textContent=o,a("reviewedReportsCount").textContent=i,a("fromMeReportsCount").textContent=n};window.renderRedReports=function(){const e=a("dRedReportsList");if(!e)return;e.innerHTML="";const t=window.allRedReports||[];let o=[];if(window.activeRedReportFilter==="all"?o=t:window.activeRedReportFilter==="created"?o=t.filter(i=>i.status==="created"):window.activeRedReportFilter==="reviewed"?o=t.filter(i=>i.status==="reviewed"):window.activeRedReportFilter==="from_me"&&(o=t.filter(i=>i.reporterUid===(m==null?void 0:m.uid))),o.length===0){e.innerHTML=`
      <div class="text-center py-10 text-t3 text-xs space-y-2">
        <i class="fas fa-folder-open text-2xl opacity-40"></i>
        <p>No reports found in this category.</p>
      </div>
    `;return}o.forEach(i=>{const n=document.createElement("div");n.className="p-4 bg-card border border-bdr rounded-xl space-y-3";const r=i.createdAt?new Date(i.createdAt.seconds*1e3).toLocaleString():"Just now";let s="";i.evidenceUrl&&(i.evidenceType==="image"?s=`
          <div class="mt-2.5">
            <img src="${i.evidenceUrl}" class="rounded-lg max-h-48 object-cover border border-bdr cursor-zoom-in active:scale-95 transition" onclick="window.open('${i.evidenceUrl}', '_blank')" alt="evidence-proof" referrerPolicy="no-referrer"/>
            <span class="text-[9px] text-t3 block mt-1"><i class="fas fa-search-plus mr-1"></i> Click to enlarge image</span>
          </div>
        `:i.evidenceType==="video"?s=`
          <div class="mt-2.5">
            <video src="${i.evidenceUrl}" controls class="rounded-lg max-h-48 border border-bdr w-full"></video>
          </div>
        `:i.evidenceUrl.startsWith("http")&&(s=`
          <div class="mt-2">
            <a href="${i.evidenceUrl}" target="_blank" class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red/10 border border-red/20 hover:bg-red/25 text-red text-[11px] font-bold rounded-lg transition">
              <i class="fas fa-external-link-alt"></i> Open Proof Evidence Link
            </a>
          </div>
        `));let d="",c="";if(i.status==="created")c='<span class="px-2 py-0.5 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded text-[9px] font-bold uppercase tracking-wider">Created</span>';else{let l="text-emerald-400 bg-emerald-500/10 border border-emerald-500/20";i.verdict==="Confirmed Cheat"?l="text-red bg-red/10 border border-red/20":i.verdict==="False Report"&&(l="text-slate-400 bg-slate-500/10 border border-slate-500/20"),c='<span class="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded text-[9px] font-bold uppercase tracking-wider">Reviewed</span>',d=`
        <div class="p-2.5 ${l} rounded-lg text-xs mt-2.5 space-y-1">
          <div class="font-extrabold text-[9px] uppercase tracking-wider flex items-center gap-1">
            <i class="fas fa-gavel"></i> VERDICT: ${i.verdict||"Reviewed"}
          </div>
          ${i.verdictComment?`<p class="text-[11px] text-t2 font-medium leading-relaxed bg-black/20 p-2 rounded border border-white/5 mt-1 select-text">${i.verdictComment}</p>`:""}
          <span class="text-[9px] text-t3 block font-mono">Resolved: ${i.closedAt?new Date(i.closedAt.seconds*1e3).toLocaleString():"Recently"}</span>
        </div>
      `}n.innerHTML=`
      <div class="flex justify-between items-start gap-2">
        <div>
          <h4 class="text-white text-sm font-bold flex items-center gap-1.5">
            <span class="w-1.5 h-1.5 rounded-full ${i.status==="created"?"bg-yellow-500 animate-pulse":"bg-emerald-400"}"></span>
            ${i.reportedNickname||"N/A"}
          </h4>
          <p class="text-[10px] text-red-400 font-semibold uppercase tracking-wider mt-0.5">${i.cheatType||"N/A"}</p>
        </div>
        ${c}
      </div>

      <div class="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[10px] text-t3 font-medium border-t border-b border-bdr/40 py-2">
        <span><i class="fas fa-id-card text-t2 mr-1"></i> Player UID: <strong class="text-t2">${i.gameUID||"N/A"}</strong></span>
        <span><i class="fas fa-user-circle text-t2 mr-1"></i> Reported By: <strong class="text-t2">${i.reporterName||"N/A"}</strong></span>
        <span><i class="fas fa-calendar-alt text-t2 mr-1"></i> Filed Date: <strong class="text-t2">${r}</strong></span>
      </div>

      <div class="text-xs text-t2 leading-relaxed">
        <p class="whitespace-pre-line">${i.description||""}</p>
      </div>

      ${s}

      ${(()=>{let l="";const u=m!=null&&m.gameUID?String(m.gameUID).trim().toLowerCase():"",p=i.gameUID?String(i.gameUID).trim().toLowerCase():"",f=m!=null&&m.name?String(m.name).trim().toLowerCase().replace(/^@/,""):"",b=m!=null&&m.handle?String(m.handle).trim().toLowerCase().replace(/^@/,""):"",g=i.reportedNickname?String(i.reportedNickname).trim().toLowerCase().replace(/^@/,""):"",w=!!(m&&(p&&u===p||g&&(f===g||b===g)));return i.defendantComment?l=`
            <div class="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg text-xs space-y-1 mt-2.5">
              <div class="font-bold text-[10px] text-amber-400 uppercase tracking-wider flex items-center gap-1">
                <i class="fas fa-shield-alt"></i> ${w?"Your Statement / Explanation":"Accused Player's Explanation"}:
              </div>
              <p class="text-[11px] text-t2 font-medium leading-relaxed select-text whitespace-pre-line bg-black/20 p-2 rounded border border-white/5 mt-1">${i.defendantComment}</p>
              <span class="text-[9px] text-t3 block font-mono">Submitted: ${i.defendantCommentAt?i.defendantCommentAt.seconds?new Date(i.defendantCommentAt.seconds*1e3).toLocaleString():new Date(i.defendantCommentAt).toLocaleString():"Recently"}</span>
            </div>
          `:w&&(l=`
            <div class="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg text-xs space-y-2 mt-2.5">
              <div class="font-bold text-[10px] text-amber-400 uppercase tracking-wider flex items-center gap-1">
                <i class="fas fa-shield-alt"></i> Submit Your Explanation / Statement (Optional)
              </div>
              <p class="text-[10px] text-t3 leading-relaxed">A complaint has been filed against you. You may optionally submit your statement or explanation here so the administration can review your side of the case.</p>
              <textarea id="defTxt-${i.id}" rows="3" placeholder="Enter your explanation, details, or links to counter-proof..." class="w-full bg-card border border-bdr rounded-lg px-2.5 py-2 text-t1 outline-none text-xs focus:border-amber-500 transition resize-none font-medium"></textarea>
              <button onclick="window.submitDefComment('${i.id}', document.getElementById('defTxt-${i.id}').value)" class="w-full py-1.5 bg-amber-500 hover:bg-amber-600 text-bg text-[10px] font-bold rounded transition">Submit Statement</button>
            </div>
          `),l})()}

      ${d}
    `,e.appendChild(n)})};window.toggleEditDefendantComment=function(e){const t=document.getElementById("editSec-"+e);t&&t.classList.toggle("hidden")};window.submitDefComment=async function(e,t){if(!t||!t.trim()){alert("Please write a detailed statement or defense!");return}const o=event==null?void 0:event.target;o&&(o.disabled=!0,o.textContent="Submitting...");try{const i=doc(db,"red_reports",e);await updateDoc(i,{defendantComment:t.trim(),defendantCommentAt:serverTimestamp()}),alert("Defense statement submitted successfully! ✅")}catch(i){alert("Error submitting defense: "+i.message)}finally{o&&(o.disabled=!1,o.textContent="Submit Statement")}};window.submitRedReportComment=async function(e){if(!m){alert("Please sign in to comment on reports.");return}const t=document.getElementById(`commTxt-${e}`),o=t?t.value.trim():"";if(!o){alert("Please enter a comment or reply text!");return}const i=window.allRedReports.find(w=>w.id===e);if(!i){alert("Report not found.");return}const n=m.gameUID?String(m.gameUID).trim().toLowerCase():"",r=i.gameUID?String(i.gameUID).trim().toLowerCase():"",s=m.name?String(m.name).trim().toLowerCase().replace(/^@/,""):"",d=m.handle?String(m.handle).trim().toLowerCase().replace(/^@/,""):"",c=i.reportedNickname?String(i.reportedNickname).trim().toLowerCase().replace(/^@/,""):"",l=i.reporterUid||"",u=r&&n===r||c&&(s===c||d===c)||i.reportedUid&&m.uid===i.reportedUid,p=m.uid===l,f=m.email==="admin@arenax.com"||m.email&&m.email.includes("kpllahore");let b="player";f?b="moderator":u?b="accused":p&&(b="reporter");const g=document.getElementById(`commBtn-${e}`);g&&(g.disabled=!0,g.innerHTML='<i class="fas fa-spinner animate-spin"></i> Posting...');try{const w=doc(db,"red_reports",e),h={authorName:m.name||m.handle||"ArenaX Player",authorUid:m.uid,text:o,role:b,createdAt:new Date().toISOString()};await updateDoc(w,{comments:arrayUnion(h)}),t&&(t.value="")}catch(w){alert("Error posting comment: "+w.message)}finally{g&&(g.disabled=!1,g.innerHTML='<i class="fas fa-paper-plane text-[9px]"></i> Comment')}};window.openReviewReportModal=async function(e,t){window.activeReviewReportId=e,a("revPlayerTitle").textContent=`Reviewing Player: ${t}`,a("revVerdict").value="",a("revPunishment").value="none";const o=a("revMatchedUserStatus");o.className="text-[9px] mt-1 text-gold/80 font-semibold flex items-center gap-1",o.innerHTML='<i class="fas fa-spinner animate-spin"></i> Finding linked player...',a("mReviewRedReport").classList.remove("hidden");try{const i=await ti(t);i?(o.className="text-[9px] mt-1 text-emerald-400 font-semibold flex items-center gap-1",o.innerHTML=`<i class="fas fa-check-circle"></i> Linked Account: <strong class="text-white">${i.name}</strong>${i.handle?` (@${i.handle})`:""} - UID: ${i.uid||i.id}`,window.activeReviewMatchedUser=i,a("revPunishment").value="full_perm"):(o.className="text-[9px] mt-1 text-red-400 font-semibold flex items-center gap-1",o.innerHTML='<i class="fas fa-times-circle"></i> Accused player account not found in database.',window.activeReviewMatchedUser=null)}catch(i){o.className="text-[9px] mt-1 text-red-400",o.textContent="Error linking player: "+i.message,window.activeReviewMatchedUser=null}};a("bCloseReviewModal").addEventListener("click",()=>{a("mReviewRedReport").classList.add("hidden")});a("bSubmitReview").addEventListener("click",async()=>{const e=a("revVerdict").value.trim();if(!e){alert("Please write a detailed verdict explaining the moderator action!");return}const t=a("revPunishment").value;a("bSubmitReview").disabled=!0,a("bSubmitReview").textContent="Saving decision...";try{if(t!=="none"&&window.activeReviewMatchedUser){const i=window.activeReviewMatchedUser,n=i.uid||i.id;let r={};if(t.startsWith("full_")){let s=t.split("_")[1],d=null;if(s!=="perm"){let c=parseInt(s);d=new Date(Date.now()+c*24*60*60*1e3).toISOString()}r={banned:!0,banType:"full",banReason:`[Auto punishment via Red Report #${window.activeReviewReportId}]: ${e}`,banUntil:d}}else if(t.startsWith("tour_")){let s=t.split("_")[1],d=null;if(s!=="perm"){let c=parseInt(s);d=new Date(Date.now()+c*24*60*60*1e3).toISOString()}r={banned:!0,banType:"tournament",banReason:`[Auto punishment via Red Report #${window.activeReviewReportId}]: ${e}`,banUntil:d}}else if(t.startsWith("mute_")){let s=t.split("_")[1],d=null;s!=="perm"&&(d=new Date(Date.now()+1440*60*1e3).toISOString()),r={muted:!0,muteReason:`[Auto punishment via Red Report #${window.activeReviewReportId}]: ${e}`,muteUntil:d}}await updateDoc(doc(db,"users",n),r)}const o=doc(db,"red_reports",window.activeReviewReportId);await updateDoc(o,{status:"closed",verdict:"Confirmed Cheat",verdictComment:e,closedAt:serverTimestamp()}),a("mReviewRedReport").classList.add("hidden"),alert(`Report closed and verdict published successfully! ✅${t!=="none"?" Direct punishment applied to the player!":""}`)}catch(o){alert("Error submitting verdict: "+o.message)}finally{a("bSubmitReview").disabled=!1,a("bSubmitReview").textContent="Close & Save Verdict"}});window.openTournamentParticipation=async function(e){a("partTourName").textContent=e.name;const t=a("participantsContainer");t.innerHTML=`
    <div class="p-8 text-center text-t3 text-xs">
      <i class="fas fa-circle-notch animate-spin text-2xl text-gold mb-2"></i>
      <p>Loading verified registrations...</p>
    </div>
  `,a("participationCountText").textContent="Loading...",a("mTournamentParticipation").classList.remove("hidden");try{const o=query(collection(db,"tournament_registrations"),where("tournamentId","==",e.id),where("status","==","approved")),i=await getDocs(o);if(t.innerHTML="",i.empty){t.innerHTML=`
        <div class="p-8 text-center text-t3 text-xs border border-dashed border-bdr/40 rounded-xl bg-card/40">
          <i class="fas fa-user-slash text-2xl mb-2"></i>
          <p>No verified participants yet for this event.</p>
        </div>
      `,a("participationCountText").textContent="0 Approved Slots";return}a("participationCountText").textContent=`${i.size} Approved Slot(s)`,i.forEach(n=>{const r=n.data(),s=r.userId,d=r.userName||"Anonymous Player",c=r.gameName||d,l=r.gameUID||"No Game ID",p=`https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(s||d)}`,f=document.createElement("div");f.className="p-3 bg-card/60 border border-bdr/60 hover:border-gold/40 hover:bg-card rounded-xl flex items-center justify-between gap-3 transition duration-200 cursor-pointer";const b=`part-av-${s}-${n.id}`,g=`part-name-${s}-${n.id}`,w=`part-badges-${s}-${n.id}`,h=`part-right-${s}-${n.id}`;f.innerHTML=`
        <div class="flex items-center gap-3">
          <img class="w-10 h-10 rounded-full border border-bdr object-cover transition" src="${p}" alt="Avatar" id="${b}"/>
          <div>
            <div class="font-display font-bold text-sm text-white flex flex-wrap items-center gap-1" id="${g}">
              <span>${d}</span>
              <i class="fas fa-check-circle text-green text-[10px]" title="Slot Verified"></i>
            </div>
            <div class="text-[10px] text-t3 font-medium">IGN: <span class="text-gold font-mono">${c}</span></div>
            <div class="flex gap-1 mt-0.5" id="${w}"></div>
          </div>
        </div>
        <div class="text-right flex flex-col items-end gap-1" id="${h}">
          <span class="px-2 py-0.5 text-[8px] font-bold bg-green/10 text-green rounded border border-green/20 uppercase tracking-wider">Slot OK</span>
          <span class="text-[9px] text-t3 font-mono">UID: ${l}</span>
        </div>
      `,f.addEventListener("click",()=>{openParticipantProfileCard(s,r)}),getDoc(doc(db,"users",s)).then(M=>{if(M.exists()){const L=M.data();if(L.av){const k=f.querySelector(`#${b}`);k&&(k.src=L.av)}if(L.premium&&L.avatarFrame){const k=f.querySelector(`#${b}`);k&&(L.avatarFrame==="gold"?k.className="w-10 h-10 rounded-full border border-gold shadow-[0_0_8px_rgba(240,192,64,0.3)] object-cover":L.avatarFrame==="fire"?k.className="w-10 h-10 rounded-full border border-red shadow-[0_0_8px_rgba(232,64,74,0.3)] object-cover":L.avatarFrame==="ice"?k.className="w-10 h-10 rounded-full border border-blue shadow-[0_0_8px_rgba(79,158,255,0.3)] object-cover":L.avatarFrame==="royal"&&(k.className="w-10 h-10 rounded-full border border-purple shadow-[0_0_8px_rgba(167,139,250,0.3)] object-cover"))}const A=f.querySelector(`#${g}`);if(A){const k=A.querySelector("span");k&&(k.textContent=L.name||d,L.premium&&L.nameColor&&(k.style.color=L.nameColor))}const P=f.querySelector(`#${w}`);if(P){let k="";L.premium&&(k+='<span class="px-1.5 py-0.2 text-[7px] font-bold bg-purple/10 text-purple rounded border border-purple/20 uppercase flex items-center gap-0.5"><i class="fas fa-crown text-[6px]"></i> Premium</span>'),L.rank&&(k+=`<span class="px-1.5 py-0.2 text-[7px] font-bold bg-gold/10 text-gold rounded border border-gold/20 uppercase">${L.rank}</span>`),P.innerHTML=k}}}).catch(M=>console.error("Error fetching participant details in check participation list: ",M)),t.appendChild(f)})}catch(o){t.innerHTML=`
      <div class="p-6 bg-red/10 border border-red/20 rounded-xl text-center text-xs text-red">
        <i class="fas fa-exclamation-triangle text-xl mb-1.5"></i>
        <p>Failed loading players: ${o.message}</p>
      </div>
    `,a("participationCountText").textContent="Error"}};a("bCloseParticipation").addEventListener("click",()=>a("mTournamentParticipation").classList.add("hidden"));window.openParticipantProfileCard=async function(e,t){openPlayerProfileCard(e)};a("bCloseParticipantProfile").addEventListener("click",()=>a("mViewParticipantProfile").classList.add("hidden"));window.vppCarouselTimer=null;window.startVppCarousel=function(e){window.vppCarouselTimer&&(clearInterval(window.vppCarouselTimer),window.vppCarouselTimer=null);const t=a("vppCarouselImg")||a("vppCarouselImgReact"),o=a("vppCarouselDots");if(!t)return;const i=typeof window.getAppBasePath=="function"?window.getAppBasePath():"./",n=e&&e.length>0?e:["rose"];let r=0;const s=c=>c==="rocket"?i+"rocket.png":c==="trophy"?i+"poptrophy.png":i+"rose.png",d=c=>{const l=n[c],u=s(l);t.style.opacity="0",t.style.transform="scale(0.8)",setTimeout(()=>{t.src=u,t.style.opacity="1",t.style.transform="scale(1)"},150),o&&(n.length<=1?o.innerHTML='<span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span>':o.innerHTML=n.map((p,f)=>`<span class="w-1.5 h-1.5 rounded-full ${f===c?"bg-rose-500 scale-125":"bg-gray-300"} transition-all"></span>`).join(""))};d(0),n.length>1&&(window.vppCarouselTimer=setInterval(()=>{r=(r+1)%n.length,d(r)},2800))};window.openTournamentLeaderboard=async function(e){a("leadTourName").textContent=e.name;const t=a("leaderboardListContainer"),o=a("leaderboardPodium");o.classList.add("hidden"),t.innerHTML=`
    <div class="p-8 text-center text-t3 text-xs">
      <i class="fas fa-circle-notch animate-spin text-2xl text-gold mb-2"></i>
      <p>Fetching leaderboard statistics...</p>
    </div>
  `,a("leadTotalEntries").textContent="Loading...",a("mTournamentLeaderboard").classList.remove("hidden");try{const i=query(collection(db,"leaderboards"),where("tournamentId","==",e.id)),n=await getDocs(i);if(t.innerHTML="",n.empty){t.innerHTML=`
        <div class="p-8 text-center text-t3 text-xs border border-dashed border-bdr/40 rounded-xl bg-card/40">
          <i class="fas fa-trophy text-2xl mb-2 text-t3"></i>
          <p>No leaderboard records found for this tournament yet.</p>
          <p class="text-[10px] text-t3/80 mt-1">Staff will update rankings as matches finalize.</p>
        </div>
      `,a("leadTotalEntries").textContent="0 Entries";return}a("leadTotalEntries").textContent=`${n.size} ENTRANT(S)`;const r=[];n.forEach(l=>{r.push({id:l.id,...l.data()})}),r.sort((l,u)=>Number(l.rank)-Number(u.rank));const s=r.find(l=>Number(l.rank)===1),d=r.find(l=>Number(l.rank)===2),c=r.find(l=>Number(l.rank)===3);(s||d||c)&&(o.classList.remove("hidden"),s?(a("podium1Name").innerHTML=`${s.playerName}${window.getBlueTickBadgeHtml(s)}`,a("podium1Score").textContent=s.score||"Champion",a("podium1Av").src=s.avatar||`https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(s.playerName)}`):(a("podium1Name").textContent="TBA",a("podium1Score").textContent="-",a("podium1Av").src="https://api.dicebear.com/7.x/bottts/svg?seed=tba1"),d?(a("podium2Name").innerHTML=`${d.playerName}${window.getBlueTickBadgeHtml(d)}`,a("podium2Score").textContent=d.score||"Runner-up",a("podium2Av").src=d.avatar||`https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(d.playerName)}`):(a("podium2Name").textContent="TBA",a("podium2Score").textContent="-",a("podium2Av").src="https://api.dicebear.com/7.x/bottts/svg?seed=tba2"),c?(a("podium3Name").innerHTML=`${c.playerName}${window.getBlueTickBadgeHtml(c)}`,a("podium3Score").textContent=c.score||"3rd Place",a("podium3Av").src=c.avatar||`https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(c.playerName)}`):(a("podium3Name").textContent="TBA",a("podium3Score").textContent="-",a("podium3Av").src="https://api.dicebear.com/7.x/bottts/svg?seed=tba3")),r.forEach(l=>{var f;const u=Number(l.rank)===1?"bg-gold/15 text-gold border-gold/30":Number(l.rank)===2?"bg-slate-400/10 text-slate-300 border-slate-500/20":Number(l.rank)===3?"bg-amber-700/15 text-amber-500 border-amber-800/20":"bg-[#1e2440] text-t2 border-bdr/60",p=document.createElement("div");p.className="p-3 bg-card/60 border border-bdr/50 rounded-xl flex items-center justify-between gap-3 transition hover:bg-card",p.innerHTML=`
        <div class="flex items-center gap-3">
          <div class="w-6 h-6 rounded-full border flex items-center justify-center font-mono font-bold text-xs ${u}">
            ${l.rank}
          </div>
          <img class="w-8 h-8 rounded-full border border-bdr object-cover" src="${l.avatar||"https://api.dicebear.com/7.x/bottts/svg?seed="+encodeURIComponent(l.playerName)}"/>
          <div>
            <div class="font-bold text-sm text-white flex items-center gap-1.5">
              ${l.playerName}${window.getBlueTickBadgeHtml(l)}
              ${l.userId?'<span class="text-[8px] bg-gold/10 text-gold px-1.5 py-0.2 rounded border border-gold/20 flex items-center gap-0.5"><i class="fas fa-check-circle text-[7px]"></i> Verified</span>':""}
            </div>
            ${l.playerHandle?`<div class="text-[9px] text-t3 font-medium">${l.playerHandle}</div>`:""}
          </div>
        </div>
        <div class="text-right flex flex-col items-end gap-0.5">
          <span class="text-xs font-bold font-mono text-gold">${l.score||"Completed"}</span>
          ${l.userId?`
            <button class="b-view-p-card text-[9px] text-blue-400 hover:text-white hover:underline font-bold" data-uid="${l.userId}">
              View Profile <i class="fas fa-chevron-right text-[7px]"></i>
            </button>
          `:""}
        </div>
      `,l.userId&&((f=p.querySelector(".b-view-p-card"))==null||f.addEventListener("click",b=>{b.stopPropagation();const g={userName:l.playerName,userHandle:l.playerHandle||"@player#0000",gameUID:"Linked Profile"};openParticipantProfileCard(l.userId,g)})),t.appendChild(p)})}catch(i){t.innerHTML=`
      <div class="p-6 bg-red/10 border border-red/20 rounded-xl text-center text-xs text-red">
        <i class="fas fa-exclamation-triangle text-xl mb-1.5"></i>
        <p>Failed loading leaderboard: ${i.message}</p>
      </div>
    `,a("leadTotalEntries").textContent="Error"}};a("bCloseLeaderboard").addEventListener("click",()=>a("mTournamentLeaderboard").classList.add("hidden"));window.toggleAccordion=e=>{const t=document.querySelectorAll(".ai .ab"),o=document.querySelectorAll(".ai i.fa-chevron-down");t.forEach((i,n)=>{n===e?(i.classList.toggle("hidden"),o[n].classList.toggle("rotate-180")):(i.classList.add("hidden"),o[n].classList.remove("rotate-180"))})};a("rSearch").addEventListener("input",e=>{const t=e.target.value.toLowerCase();document.querySelectorAll(".ai").forEach(o=>{const i=o.textContent.toLowerCase();o.classList.toggle("hidden",!i.includes(t))})});let Ho="jc";const sr={jc:'<strong>JazzCash Transfer:</strong><br/>1. Open your JazzCash Mobile App.<br/>2. Select Send Money → Mobile Account.<br/>3. Enter Receiver Number: <strong class="text-gold">0302-4686897</strong>.<br/>4. Enter PKR Amount & confirm.<br/>5. Put Ref Key: <strong class="text-gold">AX-COINS</strong>.<br/>6. Enter Transaction ID (TXN ID) below to claim coins instantly.',ep:'<strong>NayaPay Transfer:</strong><br/>1. Open your NayaPay Mobile App.<br/>2. Select Send Money → NayaPay User Account.<br/>3. Enter Receiver Number: <strong class="text-gold">0303-9229405</strong>.<br/>4. Enter PKR Amount & confirm.<br/>5. Put Ref Key: <strong class="text-gold">AX-COINS</strong>.<br/>6. Enter Transaction ID (TXN ID) below to claim coins instantly.'};a("bDep").addEventListener("click",()=>{a("payStep1").classList.remove("hidden"),a("payStep2").classList.add("hidden"),a("payAmtInp").value="",a("mPayment").classList.remove("hidden")});document.querySelectorAll(".pm-btn").forEach(e=>{e.addEventListener("click",()=>{Ho=e.dataset.m,a("payInstr").innerHTML=sr[Ho],a("payStep1").classList.add("hidden"),a("payStep2").classList.remove("hidden")})});a("payBackBtn").addEventListener("click",()=>{a("payStep2").classList.add("hidden"),a("payStep1").classList.remove("hidden")});document.querySelectorAll(".amt-chip").forEach(e=>{e.addEventListener("click",()=>{document.querySelectorAll(".amt-chip").forEach(t=>t.classList.remove("border-gold","text-gold")),e.classList.add("border-gold","text-gold"),a("payAmtInp").value=e.dataset.v,a("payAmtInp").dispatchEvent(new Event("input"))})});a("payAmtInp").addEventListener("input",()=>{const e=parseFloat(a("payAmtInp").value)||0;if(e>0){const t=Math.floor(e*1.15);a("payEstimatedAX").textContent=`${t.toLocaleString()} AX`,a("payEstimatedAXLabel").innerHTML='Includes <strong class="text-green">15% bonus</strong> coins!'}else a("payEstimatedAX").textContent="0 AX",a("payEstimatedAXLabel").innerHTML='Get <strong class="text-green">15% bonus</strong> AX coins on every deposit!'});a("payConfirmBtn").addEventListener("click",async()=>{if(!m){alert("Connect a full account to deposit real money.");return}const e=parseFloat(a("payAmtInp").value);if(!e||e<50){alert("Minimum deposit is Rs 50!");return}const t=a("payTxnId").value.trim();if(!t){alert("Please enter your payment Transaction ID (TXN ID / TID) to claim coins!");return}try{const o=Math.floor(e*1.15),i=Ho==="jc"?"JazzCash":"NayaPay";await addDoc(collection(db,"deposit_requests"),{userId:m.uid,userName:m.name,userHandle:m.handle,amountPKR:e,amountAX:o,method:i,txnId:t,status:"pending",rejectionReason:"",submittedAt:serverTimestamp()}),a("mPayment").classList.add("hidden"),a("payAmtInp").value="",a("payTxnId").value="",a("payEstimatedAX").textContent="0 AX",alert(`Deposit request submitted successfully! ⏳

Your transaction ID: ${t}
PKR Amount: Rs ${e}
AX Coins: ${o} AX

Please wait for administration to review your request. We are verifying your payment.`)}catch(o){alert("Error submitting deposit request: "+o.message)}});function dr(e){const t=a("wHist");if(t){if(!e||e.length===0){t.innerHTML=`
      <div class="p-6 bg-card border border-bdr rounded-xl text-center text-xs text-t3">
        <i class="fas fa-receipt text-2xl mb-1.5"></i>
        <p>No recorded transactions yet.</p>
      </div>
    `;return}t.innerHTML="",e.forEach(o=>{const i=o.type==="withdrawal"||o.type==="withdraw"||o.type==="adjustment"&&o.amount<0,n=document.createElement("div");n.className="p-3.5 bg-card border border-bdr rounded-xl flex flex-col gap-2.5";let r="",s="",d="",c="";if(o.type==="adjustment"){const l=o.amount>=0;s=l?"text-green bg-green/10 border border-green/20":"text-red bg-red/10 border border-red/20",d=l?"bg-green/10 border border-green/20 text-green":"bg-red/10 border border-red/20 text-red",c=l?"text-green":"text-red",r=`
        <div class="flex items-center gap-1 text-[10px] font-bold ${l?"text-green":"text-red"} uppercase">
          <i class="fas ${l?"fa-check-circle":"fa-times-circle"}"></i> Balance Adjusted
        </div>
        <p class="text-[9px] text-t3 leading-normal mt-0.5">${o.message||(l?"Coins added by Admin.":"Coins deducted by Admin.")}</p>
      `;const u=o.timestamp||"Just now",p=Math.abs(o.amount),f=o.account||"Admin Adjustment",b=o.id||"ADJ";n.innerHTML=`
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs ${d}">
              <i class="fas ${l?"fa-arrow-down":"fa-arrow-up"}"></i>
            </div>
            <div>
              <div class="text-white font-bold uppercase text-[10px]">${f}</div>
              <div class="text-[9px] text-t3 font-mono mt-0.5">${u}</div>
            </div>
          </div>
          <div class="text-right">
            <div class="font-display font-black text-sm ${c}">
              ${l?"+":"-"}${p} AX
            </div>
            <div class="text-[9px] text-t3 font-mono">-</div>
          </div>
        </div>
        
        <div class="p-2.5 bg-[#0a0d16]/60 border border-bdr/55 rounded-lg flex flex-col">
          <div class="flex justify-between items-center text-[9px] border-b border-bdr/35 pb-1 mb-1 font-mono">
            <span class="text-t3 uppercase">ID: ${b}</span>
            <span class="px-1.5 py-0.5 rounded text-[8px] ${s} uppercase font-bold tracking-wider">approved</span>
          </div>
          ${r}
        </div>
      `}else{o.status==="pending"?(s="text-gold bg-gold/10 border border-gold/20",d="bg-gold/10 border border-gold/20 text-gold",c="text-gold",r=i?`
          <div class="flex items-center gap-1.5 text-[10px] font-black uppercase text-gold">
            <span class="w-1.5 h-1.5 rounded-full bg-gold animate-pulse"></span>
            Withdrawal Pending Review
          </div>
          <p class="text-[9px] text-t3 leading-normal mt-0.5">⏳ Wait for administration to process your withdrawal request... Will be credited in 24-48 hours.</p>
        `:`
          <div class="flex items-center gap-1.5 text-[10px] font-black uppercase text-gold">
            <span class="w-1.5 h-1.5 rounded-full bg-gold animate-pulse"></span>
            Pending Administration Review
          </div>
          <p class="text-[9px] text-t3 leading-normal mt-0.5">⏳ Wait for administration to review your request... We are checking your TXN ID.</p>
        `):o.status==="approved"?(s="text-green bg-green/10 border border-green/20",d=i?"bg-red/10 border border-red/20 text-red":"bg-green/10 border border-green/20 text-green",c=i?"text-red":"text-green",r=i?`
          <div class="flex items-center gap-1 text-[10px] font-bold text-red uppercase">
            <i class="fas fa-arrow-up"></i> Successful Withdrawal
          </div>
          <p class="text-[9px] text-t3 leading-normal mt-0.5">Successfully processed! Rs ${o.amountPKR} sent to ${o.method}.</p>
        `:`
          <div class="flex items-center gap-1 text-[10px] font-bold text-green uppercase">
            <i class="fas fa-check-circle"></i> Successful deposit
          </div>
          <p class="text-[9px] text-t3 leading-normal mt-0.5">Successfully processed! ${o.amountAX} AX Coins credited to wallet.</p>
        `):(s="text-red bg-red/10 border border-red/20",d="bg-red/10 border border-red/20 text-red",c="text-red",r=`
          <div class="flex items-center gap-1 text-[10px] font-bold text-red uppercase">
            <i class="fas fa-times-circle"></i> Rejected ${i?"Withdrawal":"Deposit"}
          </div>
          <p class="text-[9px] text-red/80 font-semibold leading-normal mt-0.5">Reason: ${o.rejectionReason||"Invalid details."}</p>
        `);const l=o.submittedAt?new Date(o.submittedAt.seconds*1e3).toLocaleString():"Just now";n.innerHTML=`
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs ${d}">
              <i class="fas ${i?"fa-arrow-up":"fa-arrow-down"}"></i>
            </div>
            <div>
              <div class="text-white font-bold uppercase text-[10px]">${i?"Withdrawal":"Deposit"} (${o.method})</div>
              <div class="text-[9px] text-t3 font-mono mt-0.5">${l}</div>
            </div>
          </div>
          <div class="text-right">
            <div class="font-display font-black text-sm ${c}">
              ${i?"-":"+"}${o.amountAX} AX
            </div>
            <div class="text-[9px] text-t3 font-mono">Rs ${o.amountPKR}</div>
          </div>
        </div>
        
        <div class="p-2.5 bg-[#0a0d16]/60 border border-bdr/55 rounded-lg flex flex-col">
          <div class="flex justify-between items-center text-[9px] border-b border-bdr/35 pb-1 mb-1 font-mono">
            <span class="text-t3 uppercase">ID: ${o.txnId}</span>
            <span class="px-1.5 py-0.5 rounded text-[8px] ${s} uppercase font-bold tracking-wider">${o.status}</span>
          </div>
          ${r}
        </div>
      `}t.appendChild(n)})}}a("bWith").addEventListener("click",async()=>{if(!m){alert("Connect a full account to request withdrawals.");return}let e=!1;if(m.hasSubmittedRegistration)e=!0;else try{const r=query(collection(db,"tournament_registrations"),where("userId","==",m.uid));(await getDocs(r)).empty||(e=!0)}catch(r){console.warn("Error querying registrations, falling back to false:",r)}if(!e){alert(`⚠️ Withdrawal Locked!

You have to play at least one tournament to unlock withdrawals.`);return}const t=m.balance||0;if(t<=0){alert("No balance available to withdraw!");return}const o=prompt(`Withdraw how many AX Coins? (Minimum 300 AX. Max: ${t})`);if(!o)return;const i=parseFloat(o);if(isNaN(i)||i<=0||i>t){alert("Invalid withdrawal amount!");return}if(i<300){alert("The minimum withdrawal limit is 300 AX Coins. Please enter a valid amount of 300 AX Coins or more to proceed.");return}const n=prompt("Enter your JazzCash / NayaPay Account Number and Name to receive PKR:");if(!n||!n.trim()){alert("Withdrawal account details are required!");return}try{const r=t-i;await updateDoc(doc(db,"users",m.uid),{balance:r});const s=`WTH-${Math.floor(1e5+Math.random()*9e5)}`;await addDoc(collection(db,"deposit_requests"),{userId:m.uid,userName:m.name,userHandle:m.handle,amountPKR:i,amountAX:i,method:"JazzCash/NayaPay",txnId:s,status:"pending",type:"withdrawal",accountDetails:n.trim(),rejectionReason:"",submittedAt:serverTimestamp()}),alert(`Withdrawal request submitted successfully! ⏳

Coins Deducted: ${i} AX
Transaction ID: ${s}

Our team will review and verify your request within 24-48 hours. PKR will be sent to:
${n}`)}catch(r){alert("Failed to submit withdrawal: "+r.message)}});a("bClosePayment").addEventListener("click",()=>a("mPayment").classList.add("hidden"));a("bClosePayment2").addEventListener("click",()=>a("mPayment").classList.add("hidden"));a("bCopyReferral").addEventListener("click",()=>{if(!m){alert("Please register and login to get a unique referral link.");return}const e=a("referralLinkInput");if(navigator.clipboard)navigator.clipboard.writeText(e.value).then(()=>{const t=a("bCopyReferral"),o=t.innerHTML;t.innerHTML='<i class="fas fa-check"></i> Copied!',t.classList.add("bg-green-500","text-white"),t.classList.remove("bg-gold","text-bg"),setTimeout(()=>{t.innerHTML=o,t.classList.remove("bg-green-500","text-white"),t.classList.add("bg-gold","text-bg")},2e3)}).catch(t=>{console.error("Copy failed: ",t),e.select()});else{e.select(),document.execCommand("copy");const t=a("bCopyReferral"),o=t.innerHTML;t.innerHTML='<i class="fas fa-check"></i> Copied!',setTimeout(()=>{t.innerHTML=o},2e3)}});window.VIP_FONTS=[{id:"poppins",name:"Poppins",className:"font-poppins",desc:"Modern Clean"},{id:"orbitron",name:"Orbitron",className:"font-orbitron",desc:"Futuristic Sci-Fi"},{id:"luckiest-guy",name:"Luckiest Guy",className:"font-luckiest-guy",desc:"Bold Bubble"},{id:"fredoka",name:"Fredoka",className:"font-fredoka",desc:"Rounded Casual"},{id:"bungee",name:"Bungee",className:"font-bungee",desc:"Urban Block"},{id:"chakra",name:"Chakra Petch",className:"font-chakra",desc:"Esports Angular"},{id:"press-start",name:"Press Start 2P",className:"font-press-start",desc:"8-Bit Retro Pixel"},{id:"cinzel",name:"Cinzel",className:"font-cinzel",desc:"Roman Serif"},{id:"rajdhani",name:"Rajdhani",className:"font-rajdhani",desc:"Tactical Cyber"},{id:"unifraktur",name:"Unifraktur",className:"font-unifraktur",desc:"Gothic Medieval"},{id:"permanent-marker",name:"Permanent Marker",className:"font-permanent-marker",desc:"Street Marker"},{id:"pacifico",name:"Pacifico",className:"font-pacifico",desc:"Flowing Script"}];let He="font-poppins",Ba="gg";window.updateCustomizeFontPreview=function(){const t=He||(m||T||{}).selectedFont||"font-poppins",o=window.VIP_FONTS.find(r=>r.className===t)||window.VIP_FONTS[0],i=a("custCurrentFontBadge");i&&(window.VIP_FONTS.forEach(r=>i.classList.remove(r.className)),i.classList.add(o.className),i.textContent="Gg");const n=a("custCurrentFontName");n&&(n.textContent=`${o.name} (${o.desc})`)};window.setFontPreviewMode=function(e){Ba=e;const t=a("btnFontPreviewGg"),o=a("btnFontPreviewName");t&&o&&(e==="gg"?(t.className="px-2.5 py-1 rounded-md text-[11px] font-bold transition bg-blue-600 text-white shadow-sm cursor-pointer",o.className="px-2.5 py-1 rounded-md text-[11px] font-bold transition text-gray-400 hover:text-white cursor-pointer"):(o.className="px-2.5 py-1 rounded-md text-[11px] font-bold transition bg-blue-600 text-white shadow-sm cursor-pointer",t.className="px-2.5 py-1 rounded-md text-[11px] font-bold transition text-gray-400 hover:text-white cursor-pointer")),window.renderFontPickerGrid()};window.renderFontPickerGrid=function(){const e=a("fontPickerGrid");if(!e)return;const t=m||T||{},o=!!(t.isVIP||t.isPremium||t.premium||t.vip),i=He||t.selectedFont||"font-poppins",n=Ba==="gg"?"Gg":t.name||"Player",r=a("fontModalCurrentNamePreview");r&&(window.VIP_FONTS.forEach(c=>r.classList.remove(c.className)),r.classList.add(i),r.textContent=t.name||"Player");const s=a("fontModalVipBadge");s&&(o?(s.className="px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-300 border border-amber-500/40 rounded-full flex items-center gap-1",s.innerHTML='<i class="fas fa-crown text-amber-400 text-[9px]"></i> VIP Unlocked'):(s.className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-full flex items-center gap-1",s.innerHTML='<i class="fas fa-lock text-purple-300 text-[9px]"></i> VIP Exclusive'));const d=a("btnUnlockVipFromFontModal");d&&(o?d.classList.add("hidden"):d.classList.remove("hidden")),e.innerHTML=window.VIP_FONTS.map(c=>{const l=i===c.className;return`
      <button
        type="button"
        id="font-card-${c.id}"
        onclick="window.handleFontCardClick('${c.className}')"
        class="relative flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl transition-all duration-200 cursor-pointer min-h-[96px] sm:min-h-[108px] text-center select-none group ${l?"border-2 border-[#3b82f6] bg-[#161c2e] ring-2 ring-blue-500/40 shadow-[0_0_18px_rgba(59,130,246,0.35)] scale-[1.03]":"border border-[#262c47] bg-[#131622] hover:bg-[#1b2033] hover:border-slate-500 hover:scale-[1.02]"} ${o?"":"opacity-85"}"
      >
        ${l?'<div class="absolute top-2 right-2 w-4 h-4 rounded-full bg-blue-500 text-white flex items-center justify-center text-[9px] shadow-md"><i class="fas fa-check"></i></div>':o?"":'<div class="absolute top-2 right-2 text-amber-400/80"><i class="fas fa-lock text-[10px]"></i></div>'}
        <div class="text-2xl sm:text-3xl text-white font-black tracking-wide drop-shadow transition-transform duration-200 group-hover:scale-105 ${c.className} truncate max-w-full px-1">
          ${n}
        </div>
        <div class="text-[10px] sm:text-[11px] text-gray-400 font-medium mt-1.5 truncate max-w-full group-hover:text-gray-200">
          ${c.name}
        </div>
      </button>
    `}).join("")};window.handleFontCardClick=async function(e){const t=m||T||{};if(!!!(t.isVIP||t.isPremium||t.premium||t.vip)){const i=a("fontModalToast"),n=a("fontModalToastText");i&&n&&(i.className="mx-4 sm:mx-5 mt-3 p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center gap-2 animate-fade-in",n.innerHTML="🔒 VIP Fonts require a VIP / Premium Pass! Upgrade to equip.",i.classList.remove("hidden"),setTimeout(()=>{i&&i.classList.add("hidden")},3500));return}He=e,window.renderFontPickerGrid(),window.updateCustomizeFontPreview(),await window.saveSelectedFont(e)};window.saveSelectedFont=async function(e){if(!(m||T))return;const o=window.VIP_FONTS.find(i=>i.className===e)||{name:"Custom"};try{if(m&&m.uid)await updateDoc(doc(db,"users",m.uid),{selectedFont:e}),m.selectedFont=e;else if(T){T.selectedFont=e;try{localStorage.setItem("arenaX_guest_profile",JSON.stringify(T))}catch{}}window.applySelectedFontToUI&&window.applySelectedFontToUI(e);const i=a("fontModalToast"),n=a("fontModalToastText");i&&n&&(i.className="mx-4 sm:mx-5 mt-3 p-2.5 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs font-semibold flex items-center gap-2 animate-fade-in",n.innerHTML=`✨ Successfully applied <b>${o.name}</b> font to your IGN!`,i.classList.remove("hidden"),setTimeout(()=>{i&&i.classList.add("hidden")},2500))}catch(i){console.error("Failed to save selected font:",i)}};window.applySelectedFontToUI=function(e){const t=window.VIP_FONTS.map(r=>r.className),o=a("pName"),i=a("setName"),n=a("goldenNamePreviewText");[o,i,n].forEach(r=>{r&&(t.forEach(s=>r.classList.remove(s)),e&&r.classList.add(e))})};window.openFontPickerModal=function(){He=(m||T||{}).selectedFont||"font-poppins",window.renderFontPickerGrid(),window.updateCustomizeFontPreview();const t=a("mChooseFont");t&&t.classList.remove("hidden")};window.closeFontPickerModal=function(){const e=a("mChooseFont");e&&e.classList.add("hidden"),window.updateCustomizeFontPreview(),window.updateGoldenNamePreview&&window.updateGoldenNamePreview()};const Bi={red:"linear-gradient(135deg, #3f0f15 0%, #1a0508 100%)",gold:"linear-gradient(135deg, #3b2f0f 0%, #1a1405 100%)",blue:"linear-gradient(135deg, #0f233f 0%, #050e1a 100%)",purple:"linear-gradient(135deg, #2b0f3f 0%, #12051a 100%)",green:"linear-gradient(135deg, #0f3f1e 0%, #051a0b 100%)",sunset:"linear-gradient(135deg, #3f1e0f 0%, #1a0512 100%)",ocean:"linear-gradient(135deg, #0f3f3b 0%, #051a18 100%)",dark:"linear-gradient(135deg, #151821 0%, #0a0b10 100%)"},Ut={white:"#ffffff",gold:"#c0a030",red:"#ff4d4d",blue:"#3b82f6",green:"#10b981",purple:"#8b5cf6",orange:"#f97316",cyan:"#06b6d4"};function lr(){const e=a("custBannerThemes"),t=m?m.premium:!1;e.innerHTML=Object.keys(Bi).map(o=>`
    <button type="button" class="theme-opt h-10 rounded-lg border border-bdr relative transition flex items-center justify-center cursor-pointer ${t?"":"opacity-60"}" data-theme="${o}" style="background: ${Bi[o]}">
      <span class="text-[9px] font-bold uppercase tracking-wider text-white/90 bg-black/40 px-1.5 py-0.5 rounded">${o}</span>
      <div class="theme-check absolute inset-0 border border-gold rounded-lg ${Zt===o?"":"hidden"} flex items-center justify-center bg-black/25">
        <i class="fas fa-check text-gold text-xs"></i>
      </div>
    </button>
  `).join(""),e.querySelectorAll(".theme-opt").forEach(o=>{o.addEventListener("click",()=>{if(m&&!m.premium){alert(`🔒 Profile Banner Theme is a Premium feature!

Upgrade to VIP Premium Pass to unlock this feature!`);return}e.querySelectorAll(".theme-opt .theme-check").forEach(i=>i.classList.add("hidden")),o.querySelector(".theme-check").classList.remove("hidden"),Zt=o.dataset.theme})})}function cr(){const e=a("custNameColors"),t=m?m.premium:!1;e.innerHTML=Object.keys(Ut).map(o=>`
    <button type="button" class="color-opt w-full aspect-square rounded-full border border-bdr relative transition flex items-center justify-center cursor-pointer ${t?"":"opacity-60"}" data-color="${Ut[o]}" style="background-color: ${Ut[o]}">
      <div class="color-check absolute inset-0 border border-white rounded-full ${eo.toLowerCase()===Ut[o].toLowerCase()?"":"hidden"} flex items-center justify-center bg-black/20">
        <i class="fas fa-check text-white text-[9px]"></i>
      </div>
    </button>
  `).join(""),e.querySelectorAll(".color-opt").forEach(o=>{o.addEventListener("click",()=>{if(m&&!m.premium){alert(`🔒 Username Color is a Premium feature!

Upgrade to VIP Premium Pass to unlock this feature!`);return}e.querySelectorAll(".color-opt .color-check").forEach(i=>i.classList.add("hidden")),o.querySelector(".color-check").classList.remove("hidden"),eo=o.dataset.color,window.updateGoldenNamePreview&&window.updateGoldenNamePreview()})})}function Fa(){const e=a("custAvatars"),t=m&&m.av&&m.av.includes("seed=")?m.av.split("seed=")[1]:null,o=m?m.premium:!1;e.innerHTML=Ea.map((i,n)=>`
      <button class="cav-opt bg-ele border border-bdr rounded-xl p-1.5 transition overflow-hidden relative ${o?"":"opacity-60"} ${t===i||!t&&n===0?"border-gold scale-105":""}" data-seed="${i}">
        <img src="https://api.dicebear.com/7.x/bottts/svg?seed=${i}" class="w-full h-auto object-cover rounded-lg" alt=""/>
      </button>
    `).join(""),e.querySelectorAll(".cav-opt").forEach(i=>{i.addEventListener("click",()=>{e.querySelectorAll(".cav-opt").forEach(n=>n.classList.remove("border-gold","scale-105")),i.classList.add("border-gold","scale-105"),Qt=i.dataset.seed,rt=null,a("custAvPreview").src=`https://api.dicebear.com/7.x/bottts/svg?seed=${Qt}`})})}function ur(e,t=300,o=300,i=.85){return new Promise((n,r)=>{const s=new FileReader;s.onload=d=>{const c=new Image;c.onload=()=>{let l=c.width,u=c.height;l>u?l>t&&(u=Math.round(u*t/l),l=t):u>o&&(l=Math.round(l*o/u),u=o);const p=document.createElement("canvas");p.width=l,p.height=u,p.getContext("2d").drawImage(c,0,0,l,u);const b=p.toDataURL("image/jpeg",i);n(b)},c.onerror=l=>r(l),c.src=d.target.result},s.onerror=d=>r(d),s.readAsDataURL(e)})}a("btnBrowseAvatar").addEventListener("click",e=>{e.preventDefault(),a("fileAvatar").click()});a("fileAvatar").addEventListener("change",async e=>{const t=e.target.files[0];if(!t)return;if(!t.type.startsWith("image/")){alert("❌ Invalid file type! Please upload an image file (PNG, JPG, WEBP).");return}if(t.size>5*1024*1024){alert("❌ File is too large! Maximum size allowed is 5MB.");return}const o=a("uploadStatus");o.classList.remove("hidden"),o.innerHTML=`<span class="text-purple flex items-center gap-1.5"><i class="fas fa-spinner fa-spin"></i> Processing ${t.name}...</span>`;try{const i=await ur(t,300,300,.85);if(a("custAvPreview").src=i,rt=i,o.innerHTML='<span class="text-green-400 font-semibold flex items-center gap-1.5"><i class="fas fa-check-circle"></i> Photo loaded! Click "Save Changes" to apply.</span>',m&&m.uid&&typeof ref=="function"&&typeof uploadBytes=="function")try{const n=Date.now(),r=t.name.replace(/[^a-zA-Z0-9.]/g,"_"),s=`avatars/${m.uid}_${n}_${r}`,d=ref(Ta,s);uploadBytes(d,t).then(async c=>{const l=await getDownloadURL(c.ref);l&&(rt=l,a("custAvPreview").src=l)}).catch(c=>console.warn("Background storage upload fallback:",c))}catch(n){console.warn("Background storage exception:",n)}}catch(i){console.error("File processing failed:",i),o.innerHTML=`<span class="text-red-400 font-semibold"><i class="fas fa-exclamation-triangle mr-1"></i> Failed to process image: ${i.message}</span>`}});a("bCloseCustomize").addEventListener("click",()=>a("mCustomize").classList.add("hidden"));a("bCloseCustomizeCross").addEventListener("click",()=>a("mCustomize").classList.add("hidden"));a("bSaveCustomize").addEventListener("click",async()=>{const e=m||T;if(!e)return;const t=a("custName").value.trim(),o=a("custCountry").value,i=a("custFavGame").value,n=a("custGameUID").value.trim(),r=a("custDiscord").value.trim(),s=a("custInstagram").value.trim(),d=a("custYoutube").value.trim();if(!t){alert("Display Name is required!");return}const c=336*60*60*1e3,l=t!==e.name;if(l&&e.lastNameChangeAt&&Date.now()-e.lastNameChangeAt<c){const p=c-(Date.now()-e.lastNameChangeAt),f=Math.ceil(p/(1440*60*1e3));alert(`You can change your name only after 14 days! Please wait ${f} more day(s).`);return}const u={name:t,country:o,favoriteGame:i,gameUID:n,socialDiscord:r,socialInstagram:s,socialYoutube:d,bio:a("custBio")?a("custBio").value.trim():""};l&&(u.lastNameChangeAt=Date.now()),rt?u.av=rt:Qt&&(u.av=`https://api.dicebear.com/7.x/bottts/svg?seed=${Qt}`),(e.premium||e.isVIP||e.isPremium)&&(u.bannerTheme=Zt,u.avatarFrame=a("custAvatarFrame").value,u.nameColor=eo,u.goldenNameEnabled=a("chkGoldenName")?a("chkGoldenName").checked:!0,He&&(u.selectedFont=He));try{if(m&&m.uid){await updateDoc(doc(db,"users",m.uid),u),Object.assign(m,u);try{if(u.av||u.name){const f={};u.av&&(f.av=u.av),u.name&&(f.name=u.name),(await getDocs(collection(db,"users",m.uid,"friends"))).forEach(g=>{updateDoc(doc(db,"users",g.id,"friends",m.uid),f).catch(()=>{})})}}catch(f){console.warn("Failed syncing profile update to friends:",f)}}else if(T){Object.assign(T,u);try{localStorage.setItem("arenaX_guest_profile",JSON.stringify(T))}catch{}}const p=u.av||e.av;p&&(a("pAv")&&(a("pAv").src=p),a("avImg")&&(a("avImg").src=p),a("homeAvImg")&&(a("homeAvImg").src=p),a("custAvPreview")&&(a("custAvPreview").src=p)),a("pName")&&(a("pName").textContent=u.name),a("mCustomize").classList.add("hidden"),alert("Profile customizations saved successfully! ✅")}catch(p){console.error(p),alert("Error saving profile: "+p.message)}});let oo="weekly";a("prmWeekly").addEventListener("click",()=>{oo="weekly",a("prmWeekly").classList.add("border-purple"),a("prmWeekly").classList.remove("border-bdr"),a("prmMonthly").classList.remove("border-purple"),a("prmMonthly").classList.add("border-bdr"),a("bBuyPremium").textContent="Upgrade Weekly — 199 AX Coins"});a("prmMonthly").addEventListener("click",()=>{oo="monthly",a("prmMonthly").classList.add("border-purple"),a("prmMonthly").classList.remove("border-bdr"),a("prmWeekly").classList.remove("border-purple"),a("prmWeekly").classList.add("border-bdr"),a("bBuyPremium").textContent="Upgrade Monthly — 399 AX Coins"});a("bBuyPremium").addEventListener("click",async()=>{if(!m){alert("Please connect a full account to purchase premium.");return}const e=oo==="weekly"?199:399,t=m.balance||0;if(t<e){alert("Insufficient coins! Please deposit more coins into your ArenaX wallet to purchase premium. ❌");return}if(confirm(`Confirm activating Premium pass? This will deduct ${e} AX Coins from your ArenaX wallet immediately.`))try{const o=t-e;await updateDoc(doc(db,"users",m.uid),{premium:!0,balance:o}),await addDoc(collection(db,"deposit_requests"),{userId:m.uid,userName:m.name,userEmail:m.email||"",type:"withdrawal",method:oo==="weekly"?"Weekly Sub":"Monthly Sub",amountPKR:0,amountAX:e,txnId:"PRM-"+Math.floor(1e5+Math.random()*9e5),status:"approved",submittedAt:serverTimestamp()}),m.premium=!0,Tt(),alert(`Congratulations! ArenaX Premium VIP activated. ${e} AX Coins deducted. Access all benefits now! ✅`)}catch(o){alert(o.message)}});a("bClosePremium").addEventListener("click",()=>a("mPremium").classList.add("hidden"));function pr(){const e=m||T;if(!e||T)return;if(Fe){try{Fe()}catch{}Fe=null}let t=!0;const o=query(collection(db,"notifications"),where("userId","==",e.uid));Fe=onSnapshot(o,i=>{let n=0;const r=[];i.forEach(d=>{const c=d.data();r.push({id:d.id,...c}),c.read||n++});const s=a("notifDot");n>0?s.classList.remove("hidden"):s.classList.add("hidden"),i.docChanges().forEach(d=>{if(d.type==="added"&&!t){const c=d.doc.data();if(!c.read){const l=c.title||"New Notification",u=c.message||c.body||"";ve(l,u)}}}),t=!1},i=>{console.warn("Notifications listen warning:",i),i.code==="permission-denied"&&(console.log("[Auth Engine] Attempting token refresh on notifications snapshot permission denied..."),auth.currentUser&&auth.currentUser.getIdToken(!0).catch(n=>console.warn(n)))})}function ve(e,t){let o=document.getElementById("toastContainer");o||(o=document.createElement("div"),o.id="toastContainer",o.className="fixed top-5 right-5 z-[9999] flex flex-col gap-3 max-w-sm w-full px-4 sm:px-0 pointer-events-none",document.body.appendChild(o));const i=document.createElement("div");i.className="bg-[#111420] border border-[#252a45] text-white rounded-xl shadow-2xl p-4 flex flex-col gap-1 transform translate-x-full opacity-0 transition-all duration-300 pointer-events-auto cursor-pointer hover:bg-[#171b2e]",i.innerHTML=`
    <div class="flex items-center justify-between gap-2">
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 rounded-full bg-[#f0c040]/10 flex items-center justify-center text-[#f0c040] text-sm">
          <i class="fas fa-bell"></i>
        </div>
        <span class="font-display font-bold text-xs text-[#f0c040] tracking-wide uppercase">${e}</span>
      </div>
      <button class="text-[#4a5070] hover:text-white transition text-xs"><i class="fas fa-times"></i></button>
    </div>
    <p class="text-xs text-[#8890b0] pl-10 leading-relaxed">${t}</p>
  `;const n=i.querySelector("button"),r=()=>{i.classList.add("translate-x-full","opacity-0"),setTimeout(()=>{i.remove()},300)};n.addEventListener("click",s=>{s.stopPropagation(),r()}),i.addEventListener("click",()=>{r();const s=a("bBell");s&&s.click()}),o.appendChild(i),setTimeout(()=>{i.classList.remove("translate-x-full","opacity-0")},10),setTimeout(()=>{i.parentElement&&r()},7e3)}a("bBell").addEventListener("click",async()=>{if(T){alert("Log in to see your verified slot notifications!");return}try{const e=query(collection(db,"notifications"),where("userId","==",m.uid)),t=await getDocs(e),o=[],i=[];t.forEach(n=>{const r=n.data(),s=r.message||(r.title?`${r.title}
${r.body}`:r.body)||"New Notification";i.push(s),r.read||o.push(n.id)});for(const n of o)await updateDoc(doc(db,"notifications",n),{read:!0});i.length===0?alert("No new notifications yet!"):alert(`🔔 Notifications:

${i.map(n=>`• ${n}`).join(`

`)}`)}catch{alert("No notifications loaded.")}});a("gUpgradeBtn").addEventListener("click",()=>alert("Exit guest profile, and connect real Google or email ID to save AX earnings!"));a("btnEditProfile").addEventListener("click",()=>{if(a("mSettings")&&a("mSettings").classList.add("hidden"),T){alert("Connect a full account first to change Display Name!");return}const e=336*60*60*1e3;if(m&&m.lastNameChangeAt&&Date.now()-m.lastNameChangeAt<e){const i=e-(Date.now()-m.lastNameChangeAt),n=Math.ceil(i/(1440*60*1e3));alert(`You can change your name only after 14 days! Please wait ${n} more day(s).`);return}const t=m?m.name:"Player",o=prompt("Enter your new Display Name:",t);o&&o.trim()&&m&&o.trim()!==m.name&&updateDoc(doc(db,"users",m.uid),{name:o.trim(),lastNameChangeAt:Date.now()}).then(()=>alert("Name updated successfully!")).catch(i=>alert(i.message))});a("btnCustomize").addEventListener("click",()=>{a("mSettings")&&a("mSettings").classList.add("hidden");const e=m||T;e&&(a("custName").value=e.name||"",a("custCountry").value=e.country||"",a("custFavGame").value=e.favoriteGame||"",a("custGameUID").value=e.gameUID||"",a("custBadgeVal").textContent=e.badge||"No badge awarded yet",a("custDiscord").value=e.socialDiscord||"",a("custInstagram").value=e.socialInstagram||"",a("custYoutube").value=e.socialYoutube||"",a("custBio").value=e.bio||"",a("custAvPreview").src=e.av||`https://api.dicebear.com/7.x/bottts/svg?seed=${e.uid||"ax"}`,rt=null,a("uploadStatus").classList.add("hidden"),a("uploadStatus").innerHTML="",Zt=e.bannerTheme||"dark",e.avatarFrame,eo=e.nameColor||"#ffffff",He=e.selectedFont||"font-poppins",window.updateCustomizeFontPreview&&window.updateCustomizeFontPreview(),a("custBio").disabled=!1,a("custBio").classList.remove("opacity-60","pointer-events-none"),a("btnBrowseAvatar").disabled=!1,a("btnBrowseAvatar").classList.remove("opacity-60","pointer-events-none"),e.premium?(a("custPrmBadge").textContent="Premium Active",a("custPrmBadge").classList.remove("bg-purple/20","text-purple"),a("custPrmBadge").classList.add("bg-green-500/20","text-green-400"),a("custAvatarFrame").disabled=!1,a("custAvatarFrame").classList.remove("opacity-60","pointer-events-none"),a("custGoldenNameBox")&&a("custGoldenNameBox").classList.remove("opacity-60","pointer-events-none"),a("chkGoldenName")&&(a("chkGoldenName").disabled=!1,a("chkGoldenName").checked=e.goldenNameEnabled!==!1)):(a("custPrmBadge").textContent="Standard Account",a("custPrmBadge").classList.remove("bg-purple/20","text-purple"),a("custPrmBadge").classList.add("bg-gold/20","text-gold"),a("custAvatarFrame").disabled=!0,a("custAvatarFrame").classList.add("opacity-60","pointer-events-none"),a("custGoldenNameBox")&&a("custGoldenNameBox").classList.add("opacity-60","pointer-events-none"),a("chkGoldenName")&&(a("chkGoldenName").disabled=!0,a("chkGoldenName").checked=!1)),a("custName")&&!a("custName").dataset.goldenBound&&(a("custName").dataset.goldenBound="true",a("custName").addEventListener("input",()=>{window.updateGoldenNamePreview&&window.updateGoldenNamePreview()})),a("chkGoldenName")&&!a("chkGoldenName").dataset.goldenBound&&(a("chkGoldenName").dataset.goldenBound="true",a("chkGoldenName").addEventListener("change",()=>{window.updateGoldenNamePreview&&window.updateGoldenNamePreview()})),Fa(),lr(),cr(),window.updateCustomizeFrameButtonState&&window.updateCustomizeFrameButtonState(),a("mCustomize").classList.remove("hidden"))});a("btnChangeAv").addEventListener("click",()=>a("btnCustomize").click());a("btnPlayerChat").addEventListener("click",()=>{a("mSettings")&&a("mSettings").classList.add("hidden"),Te("Chat")});a("btnPremium").addEventListener("click",()=>{a("mSettings")&&a("mSettings").classList.add("hidden"),Tt(),a("mPremium").classList.remove("hidden")});const Fi=document.getElementById("bOpenPremium");Fi&&Fi.addEventListener("click",()=>{a("mSettings")&&a("mSettings").classList.add("hidden"),Tt(),a("mPremium").classList.remove("hidden")});let Co="weekly";const Ui=a("prmScrollNextBtn");Ui&&Ui.addEventListener("click",()=>{const e=a("prmCardScrollContainer");Co==="weekly"?(a("prmMonthly")&&a("prmMonthly").click(),e&&e.scrollTo({left:e.scrollWidth,behavior:"smooth"}),Co="monthly",a("prmScrollIcon")&&(a("prmScrollIcon").className="fas fa-chevron-left")):(a("prmWeekly")&&a("prmWeekly").click(),e&&e.scrollTo({left:0,behavior:"smooth"}),Co="weekly",a("prmScrollIcon")&&(a("prmScrollIcon").className="fas fa-chevron-right"))});a("bTopbarMenu")&&a("bTopbarMenu").addEventListener("click",()=>{typeof window.openRedReportHubDrawer=="function"&&window.openRedReportHubDrawer()});a("btnHubPatchNotes")&&a("btnHubPatchNotes").addEventListener("click",()=>{typeof window.closeRedReportHubDrawer=="function"&&window.closeRedReportHubDrawer(),a("mPatchNotes")&&a("mPatchNotes").classList.remove("hidden")});a("bClosePatchNotes")&&a("bClosePatchNotes").addEventListener("click",()=>{a("mPatchNotes")&&a("mPatchNotes").classList.add("hidden")});a("bClosePatchNotesCross")&&a("bClosePatchNotesCross").addEventListener("click",()=>{a("mPatchNotes")&&a("mPatchNotes").classList.add("hidden")});window.addEventListener("beforeinstallprompt",e=>{e.preventDefault(),window.pwaDeferredPrompt=e});const _i=a("btnHubInstallApp");_i&&_i.addEventListener("click",()=>{typeof window.closeRedReportHubDrawer=="function"&&window.closeRedReportHubDrawer(),a("mSettings")&&a("mSettings").classList.add("hidden"),a("mAppDownloadOptions")&&a("mAppDownloadOptions").classList.remove("hidden")});window.addEventListener("appinstalled",e=>{console.log("App successfully installed:",e);const t=a("btnHubInstallApp");t&&t.classList.add("hidden"),alert("ArenaX Esports installed successfully! 🎉")});a("btnProfileManage")&&a("btnProfileManage").addEventListener("click",()=>{a("mSettings")&&a("mSettings").classList.add("hidden"),a("btnCustomize")?a("btnCustomize").click():a("mCustomize").classList.remove("hidden")});a("btnProfileSecurity")&&a("btnProfileSecurity").addEventListener("click",()=>{a("mSettings")&&a("mSettings").classList.add("hidden"),a("mPrivacy")&&a("mPrivacy").classList.remove("hidden")});a("btnResendVerifyEmail")&&a("btnResendVerifyEmail").addEventListener("click",async()=>{if(!auth.currentUser){alert("⚠️ Please sign in with your email account first.");return}if(auth.currentUser.emailVerified){alert("✅ Your email address ("+auth.currentUser.email+") is already verified!");return}try{await sendEmailVerification(auth.currentUser),alert("✉️ Verification email sent to "+auth.currentUser.email+`!

Please check your inbox and spam folder, and click the verification link.`)}catch(e){alert("⚠️ Could not send verification email: "+e.message)}});a("btnSendResetPassword")&&a("btnSendResetPassword").addEventListener("click",async()=>{if(!auth.currentUser||!auth.currentUser.email){alert("⚠️ Please sign in with an email account first.");return}const e=auth.currentUser.email,t=a("btnSendResetPassword"),o=t.style.opacity;t.style.opacity="0.5";try{await to(e),alert(`✉️ Branded Password Reset Link Sent!

We have dispatched a custom reset email with a secure "Reset Password" button link to:
`+e+`

Please check your inbox and spam folder (valid for 30 minutes).`)}catch(i){alert("⚠️ Could not send password reset email: "+i.message)}finally{t.style.opacity=o||"1"}});a("btnProfileNotifications")&&a("btnProfileNotifications").addEventListener("click",()=>{a("mEnableNotifications")&&a("mEnableNotifications").classList.remove("hidden")});a("btnProfileLanguage")&&a("btnProfileLanguage").addEventListener("click",()=>{a("mSettings")&&a("mSettings").classList.add("hidden"),a("mLanguageSelectionModal")&&a("mLanguageSelectionModal").classList.remove("hidden")});a("btnProfileHelp")&&a("btnProfileHelp").addEventListener("click",()=>{a("mSettings")&&a("mSettings").classList.add("hidden"),typeof window.openSupportDrawer=="function"&&window.openSupportDrawer()});a("btnProfileTerms")&&a("btnProfileTerms").addEventListener("click",()=>{a("mSettings")&&a("mSettings").classList.add("hidden"),a("mTerms")&&a("mTerms").classList.remove("hidden")});a("btnProfileAbout")&&a("btnProfileAbout").addEventListener("click",()=>{a("mSettings")&&a("mSettings").classList.add("hidden"),a("mPatchNotes")&&a("mPatchNotes").classList.remove("hidden")});function Ua(){const e=m||T;a("setName")&&(a("setName").innerHTML=`${e.name||"Player"}${window.getBlueTickBadgeHtml(e)}`),a("setHandle")&&(a("setHandle").textContent=e.handle||"@player#0000"),a("setAv")&&(a("setAv").src=e.av),a("lblVerifyStatus")&&(auth.currentUser?auth.currentUser.emailVerified?(a("lblVerifyStatus").textContent="✅ Verified ("+auth.currentUser.email+")",a("lblVerifyStatus").className="text-[10px] text-emerald-400 font-bold"):(a("lblVerifyStatus").textContent="⚠️ Unverified - Click to resend verification link to "+auth.currentUser.email,a("lblVerifyStatus").className="text-[10px] text-amber-400 font-medium"):(a("lblVerifyStatus").textContent="Send verification link to inbox",a("lblVerifyStatus").className="text-[10px] text-t3 font-normal")),a("mSettings").classList.remove("hidden"),typeof window.updateDiagnosticUI=="function"&&window.updateDiagnosticUI()}a("bSettingsTop")&&a("bSettingsTop").addEventListener("click",Ua);a("bSettings")&&a("bSettings").addEventListener("click",Ua);a("bCloseSettingsCross").addEventListener("click",()=>a("mSettings").classList.add("hidden"));a("bCloseSettings").addEventListener("click",()=>a("mSettings").classList.add("hidden"));a("bSaveSettings").addEventListener("click",()=>{alert("⚙️ Settings saved successfully!"),a("mSettings").classList.add("hidden")});a("bViewTerms").addEventListener("click",()=>a("mTerms").classList.remove("hidden"));a("lnkTerms").addEventListener("click",e=>{e.preventDefault(),a("mTerms").classList.remove("hidden")});a("bCloseTerms").addEventListener("click",()=>a("mTerms").classList.add("hidden"));a("bViewPrivacy").addEventListener("click",()=>a("mPrivacy").classList.remove("hidden"));a("lnkPrivacy").addEventListener("click",e=>{e.preventDefault(),a("mPrivacy").classList.remove("hidden")});a("bClosePrivacy").addEventListener("click",()=>a("mPrivacy").classList.add("hidden"));const Gi=document.querySelector('.ni[data-t="Support"]');Gi&&Gi.addEventListener("click",()=>{typeof window.openSupportDrawer=="function"&&window.openSupportDrawer()});window.completeFootballMission=function(e){};window.checkAndRechargeBalls=function(){};window.checkAndSyncWorldCupTasks=async function(){};window.renderWorldCupCampaignQuests=function(){};window.claimWorldCupCampaignGifts=async function(){};function _a(){const e=a("mUnderDevPopup");e&&(e.classList.add("hidden"),e.style.display="none"),window.ArenaSplash&&window.ArenaSplash.finish(),typeof window.checkAndShowNotificationPopup=="function"&&window.checkAndShowNotificationPopup()}a("bCloseUnderDev")&&a("bCloseUnderDev").addEventListener("click",e=>{e&&e.preventDefault(),_a()});a("bCloseUnderDevCross")&&a("bCloseUnderDevCross").addEventListener("click",e=>{e&&e.preventDefault(),_a()});window.checkAndShowNotificationPopup=function(){if(Mi){typeof window.checkAndPromptTutorial=="function"&&window.checkAndPromptTutorial();return}if(window.Notification&&Notification.permission==="granted"){typeof window.checkAndPromptTutorial=="function"&&window.checkAndPromptTutorial();return}if(T||!m){typeof window.checkAndPromptTutorial=="function"&&window.checkAndPromptTutorial();return}const e=localStorage.getItem("notifAsked");if(e){const t=parseInt(e,10),o=4320*60*1e3;if(Date.now()-t<o){typeof window.checkAndPromptTutorial=="function"&&window.checkAndPromptTutorial();return}}a("mEnableNotifications").classList.remove("hidden"),Mi=!0};a("btnNotifNotNow").addEventListener("click",()=>{a("mEnableNotifications").classList.add("hidden"),localStorage.setItem("notifAsked",Date.now().toString()),typeof window.checkAndPromptTutorial=="function"&&window.checkAndPromptTutorial()});a("btnNotifAllow").addEventListener("click",async()=>{if(a("mEnableNotifications").classList.add("hidden"),window.Notification)try{if(Notification.permission==="denied"){alert(`⚠️ Notifications are currently blocked in your browser settings.

To enable them:
1. Click the Lock/Tune icon (🔒) in your browser address bar.
2. Tap 'Site settings' or 'Permissions'.
3. Set 'Notifications' to 'Allow'.
4. Refresh this page.`),localStorage.setItem("notifAsked",Date.now().toString()),typeof window.checkAndPromptTutorial=="function"&&window.checkAndPromptTutorial();return}let e=Notification.permission;if(e==="default"&&(e=await Notification.requestPermission()),e==="granted"){if(m&&m.uid)try{await updateDoc(doc(db,"users",m.uid),{notificationsEnabled:!0,notificationPermission:"granted",notificationGrantedAt:new Date().toISOString()}),typeof window.requestFCMToken=="function"&&(console.log("FCM: Registering and requesting token automatically..."),await window.requestFCMToken(!1))}catch(t){console.error("Failed to update notification settings in user profile:",t)}ve("🔔 Notifications Enabled!","You will now receive real-time alerts for tournaments, rewards, and match status!");try{new Notification("ArenaX Notifications Active!",{body:"You've successfully enabled real-time esports notifications!",icon:(typeof window.getAppBasePath=="function"?window.getAppBasePath():"./")+"favicon.ico"})}catch(t){console.warn("Could not display initial test notification:",t)}}else localStorage.setItem("notifAsked",Date.now().toString()),alert("⚠️ Notification permission was blocked. You can enable it anytime by clicking the Lock icon (🔒) next to the URL in your address bar.")}catch(e){console.error("Error requesting notification permission:",e)}else ve("⚠️ Unsupported Browser","Push notifications are not supported in your browser.");typeof window.checkAndPromptTutorial=="function"&&window.checkAndPromptTutorial()});window.appLanguage="ur";const Vi={en:{navProfile:"Profile",navEvents:"Events",navWallet:"Wallet",navVoice:"Voice",navChat:"Chat",navSupport:"Support",accNavHeader:"Account Navigation",editDisplayName:"Edit Display Name",customizeProfile:"Customize Profile",directMessages:"Direct Messages",premiumPasses:"Premium Passes",signOut:"Sign Out",lblTournaments:"Tournaments",lblWins:"Wins",lblWinRate:"Win Rate",lblBestFinish:"Best Finish",lblMyProfileHeader:"My Profile",lblMyWalletHeader:"My Wallet",tutorialSteps:[{title:"Your Profile Hub 👤",text:"Welcome gamer! This is your personal Profile Hub. Here you can view your display name, unique handle, level ranks, wallet AX balance, and total hearts popularity rating live.",tab:"Profile",highlight:"profileCard"},{title:"Esports Tournaments 🏆",text:"On the Events page, you will find all live, upcoming, and ended matches. Register in your favorite esports contest to win AX coins and real cash prizes!",tab:"Tour",highlight:"toursWrapper"},{title:"Secure AX Wallet 💰",text:"From the Wallet section, you can easily deposit funds and withdraw your winnings directly to your bank account or local digital wallets.",tab:"Wallet",highlight:"wCard"},{title:"Global Chat & Voice Lobbies 🎤",text:"Connect with other players! Chat in the global feed, add friends, and join high-quality low-latency voice channels to coordinate with your team.",tab:"Chat",highlight:"tChat"},{title:"Profile Customization 🎨",text:"Click Edit Display Name or Customize Profile to set your bio, social links, and avatars. Unlock premium golden frames and glowing banners! 👑",tab:"Profile",highlight:"btnCustomize"}]},ur:{navProfile:"پروفائل",navEvents:"ٹورنامنٹس",navWallet:"والٹ",navVoice:"وائس چیٹ",navChat:"چیٹ",navSupport:"سپورٹ",accNavHeader:"اکاؤنٹ نیویگیشن",editDisplayName:"نام تبدیل کریں",customizeProfile:"پروفائل سجائیں",directMessages:"ڈائریکٹ میسجز",premiumPasses:"پریمیئم پاسز",signOut:"سائن آؤٹ",lblTournaments:"ٹورنامنٹس",lblWins:"جیتیں",lblWinRate:"جیت کا تناسب",lblBestFinish:"بہترین پوزیشن",lblMyProfileHeader:"میری پروفائل",lblMyWalletHeader:"میرا والٹ",tutorialSteps:[{title:"Aapka Profile Hub 👤",text:"Aao gamer! Yeh aapka personal Profile Hub hai. Yahan aap apna display name, unique handle, level ranks, wallet AX balance aur total hearts popularity rating live dekh sakte hain.",tab:"Profile",highlight:"profileCard"},{title:"Esports Tournaments 🏆",text:"Events page par aapko saare live, upcoming aur ended matches milenge. Apni pasand ke esports contest me register karke cash prize pools jeeten!",tab:"Tour",highlight:"toursWrapper"},{title:"Secure AX Wallet 💰",text:"Wallet section se aap asani se Recharge kar sakte hain aur apni winnings ko seedha bank ya digital wallet me instant withdraw kar sakte hain.",tab:"Wallet",highlight:"wCard"},{title:"Global Chat & Voice Lobbies 🎤",text:"Dosre gamers ke sath connect hon! Global feed me chat karen, friends add karen aur high-quality low-latency audio room channels join karke dosto se voice chat karen.",tab:"Chat",highlight:"tChat"},{title:"Profile Customization 🎨",text:"Edit Display Name ya Customize Profile par click karke bio, social links aur custom avatar set karen. Premium VIP lekar golden frames aur glowing banners unlock karen! 👑",tab:"Profile",highlight:"btnCustomize"}]}};window.applyAppLanguage=function(e){window.appLanguage=e;const t=Vi[e]||Vi.ur,o=m||T;o&&o.uid&&localStorage.setItem("arenaX_language_"+o.uid,e),localStorage.setItem("arenaX_global_lang",e),a("navProfileText")&&(a("navProfileText").textContent=t.navProfile),a("navEventsText")&&(a("navEventsText").textContent=t.navEvents),a("navWalletText")&&(a("navWalletText").textContent=t.navWallet),a("navVoiceText")&&(a("navVoiceText").textContent=t.navVoice),a("navChatText")&&(a("navChatText").textContent=t.navChat),a("navSupportText")&&(a("navSupportText").textContent=t.navSupport),a("lblTournaments")&&(a("lblTournaments").textContent=t.lblTournaments),a("lblWins")&&(a("lblWins").textContent=t.lblWins),a("lblWinRate")&&(a("lblWinRate").textContent=t.lblWinRate),a("lblBestFinish")&&(a("lblBestFinish").textContent=t.lblBestFinish);const i=a("lblMyProfileHeader");i&&(i.innerHTML=`<i class="fas fa-user-circle text-gold"></i> ${t.lblMyProfileHeader}`);const n=a("lblMyWalletHeader");if(n&&(n.innerHTML=`<i class="fas fa-wallet text-gold"></i> ${t.lblMyWalletHeader}`),a("lblAccNavHeader")&&(a("lblAccNavHeader").textContent=t.accNavHeader),a("lblEditDisplayName")&&(a("lblEditDisplayName").textContent=t.editDisplayName),a("lblCustomizeProfile")&&(a("lblCustomizeProfile").textContent=t.customizeProfile),a("lblDirectMessages")&&(a("lblDirectMessages").textContent=t.directMessages),a("lblPremiumPasses")&&(a("lblPremiumPasses").textContent=t.premiumPasses),a("lblSignOut")&&(a("lblSignOut").textContent=t.signOut),a("mTutorialChoiceModal")){const r=a("mTutorialChoiceModal").querySelector("h3"),s=a("mTutorialChoiceModal").querySelector("p.text-xs");e==="en"?(r&&(r.textContent="New Player Tour"),s&&(s.textContent="Welcome gamer! 🎮 Would you like to take a quick 1-minute interactive tour of ArenaX to easily understand matches, tournaments, wallet and chat systems?"),a("btnTutorialSkip")&&(a("btnTutorialSkip").textContent="No, Skip ❌"),a("btnTutorialStart")&&(a("btnTutorialStart").textContent="Yes, Start! 🚀")):(r&&(r.textContent="New Player Tour"),s&&(s.textContent="Aao gamer! 🎮 Kya aap ArenaX ka quick 1-minute interactive tour lena chahenge taake matches, tournaments, wallet aur chat systems ko asani se samajh saken?"),a("btnTutorialSkip")&&(a("btnTutorialSkip").textContent="Nahi, Skip ❌"),a("btnTutorialStart")&&(a("btnTutorialStart").textContent="Haan, Start! 🚀"))}fr(),tt.length=0,t.tutorialSteps.forEach(r=>tt.push(r)),a("mTutorialTourCard")&&!a("mTutorialTourCard").classList.contains("hidden")&&po(we)};function fr(){const e=a("btnSettingsLangEn"),t=a("btnSettingsLangUr");e&&t&&(window.appLanguage==="en"?(e.className="flex-1 py-2 px-3 bg-gold text-bg border border-gold rounded-lg text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer",t.className="flex-1 py-2 px-3 bg-card border border-bdr text-t2 hover:text-white rounded-lg text-xs font-semibold transition hover:border-gold/30 flex items-center justify-center gap-1.5 cursor-pointer"):(e.className="flex-1 py-2 px-3 bg-card border border-bdr text-t2 hover:text-white rounded-lg text-xs font-semibold transition hover:border-gold/30 flex items-center justify-center gap-1.5 cursor-pointer",t.className="flex-1 py-2 px-3 bg-gold text-bg border border-gold rounded-lg text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer"))}a("btnSettingsLangEn")&&a("btnSettingsLangEn").addEventListener("click",()=>{window.applyAppLanguage("en"),ve("🇺🇸 Language Set","Interface language changed to English.")});a("btnSettingsLangUr")&&a("btnSettingsLangUr").addEventListener("click",()=>{window.applyAppLanguage("ur"),ve("🇵🇰 زبان تبدیل","زبان کامیابی سے اردو میں تبدیل ہو گئی ہے۔")});a("btnLangEn")&&a("btnLangEn").addEventListener("click",()=>{window.applyAppLanguage("en"),a("mLanguageSelectionModal").classList.add("hidden");const e=m||T;e&&!localStorage.getItem("arenaX_tutorial_done_"+e.uid)&&a("mTutorialChoiceModal").classList.remove("hidden")});a("btnLangUr")&&a("btnLangUr").addEventListener("click",()=>{window.applyAppLanguage("ur"),a("mLanguageSelectionModal").classList.add("hidden");const e=m||T;e&&!localStorage.getItem("arenaX_tutorial_done_"+e.uid)&&a("mTutorialChoiceModal").classList.remove("hidden")});window.checkAndPromptTutorial=function(){const e=m||T;if(!e)return;const t=e.uid;if(!t)return;const o=localStorage.getItem("arenaX_language_"+t)||localStorage.getItem("arenaX_global_lang");if(!o){a("mLanguageSelectionModal").classList.remove("hidden");return}window.applyAppLanguage(o),!localStorage.getItem("arenaX_tutorial_done_"+t)&&a("mTutorialChoiceModal").classList.remove("hidden")};function mr(e){Ga();const t=a(e);if(t){Ht=e,t.classList.add("ring-4","ring-emerald-500","ring-offset-2","ring-offset-[#070913]","animate-pulse","relative","z-40","transition-all","duration-300");try{t.scrollIntoView({behavior:"smooth",block:"center"})}catch{}}}function Ga(){if(Ht){const e=a(Ht);e&&e.classList.remove("ring-4","ring-emerald-500","ring-offset-2","ring-offset-[#070913]","animate-pulse","relative","z-40","transition-all","duration-300"),Ht=null}}function br(){a("mTutorialChoiceModal").classList.add("hidden");const e=m||T;e&&localStorage.setItem("arenaX_tutorial_done_"+e.uid,"completed"),we=0,a("mTutorialTourCard").classList.remove("hidden"),po(we)}function gr(){a("mTutorialChoiceModal").classList.add("hidden");const e=m||T;e&&localStorage.setItem("arenaX_tutorial_done_"+e.uid,"skipped"),window.appLanguage==="en"?ve("ℹ️ Tour Skipped","You can explore matches directly from the Events tab!"):ve("ℹ️ Tour Skipped","Aap jab chahein events tab se matches explore kar sakte hain!")}function Va(){a("mTutorialTourCard").classList.add("hidden"),Ga(),Te("Profile"),window.appLanguage==="en"?ve("🏆 Tour Completed!","You have successfully completed the ArenaX tour. Join matches now and dominate!"):ve("🏆 Tour Completed!","Aapne ArenaX ka tour complete kar liya hai. Ab matches join karen aur dominate karen!")}function wr(){we<tt.length-1?(we++,po(we)):Va()}function hr(){we>0&&(we--,po(we))}function po(e){const t=tt[e];t&&(Te(t.tab),a("tutorialStepIndicator").textContent=`Step ${e+1} of ${tt.length}`,a("tutorialStepTitle").textContent=t.title,a("tutorialStepText").textContent=t.text,e===0?a("btnTutorialPrev").classList.add("hidden"):a("btnTutorialPrev").classList.remove("hidden"),e===tt.length-1?(a("btnTutorialNext").innerHTML="Finish Tour 🏆",a("btnTutorialNext").className="px-4 py-1.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-bg text-[10px] font-black uppercase tracking-wider rounded-lg transition active:scale-95 flex items-center gap-1 cursor-pointer"):(a("btnTutorialNext").innerHTML='Next Step <i class="fas fa-arrow-right text-[9px]"></i>',a("btnTutorialNext").className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold rounded-lg transition active:scale-95 flex items-center gap-1 cursor-pointer"),setTimeout(()=>{mr(t.highlight)},120))}a("btnTutorialStart").addEventListener("click",br);a("btnTutorialSkip").addEventListener("click",gr);a("btnTutorialEnd").addEventListener("click",Va);a("btnTutorialPrev").addEventListener("click",hr);a("btnTutorialNext").addEventListener("click",wr);Fa();const fo=[{id:"blue_tick",name:"Verified Blue Tick",description:"Official verified badge granted by administration, displayed next to user name everywhere.",icon:"fa-check-circle",color:"text-blue-400 border-blue-500/30 bg-blue-500/10"},{id:"champion",name:"Arena Champion",description:"Earned by winning a premier ArenaX tournament.",icon:"fa-trophy",color:"text-amber-400 border-amber-500/30 bg-amber-500/10"},{id:"veteran",name:"Veteran Warrior",description:"Assigned to players with exceptional career activity.",icon:"fa-shield-halved",color:"text-indigo-400 border-indigo-500/30 bg-indigo-500/10"},{id:"moderator",name:"Staff Moderator",description:"Authorized ArenaX moderator and community manager.",icon:"fa-crown",color:"text-cyan-400 border-cyan-500/30 bg-cyan-500/10"},{id:"sniper",name:"Sharp Shooter",description:"Exemplary performance and precision in gaming tournaments.",icon:"fa-crosshairs",color:"text-red-400 border-red-500/30 bg-red-500/10"},{id:"mvp",name:"Most Valuable Player",description:"Awarded for exceptional skill and turning the tides of battle.",icon:"fa-wand-magic-sparkles",color:"text-orange-400 border-orange-500/30 bg-orange-500/10"},{id:"vip",name:"VIP Premium Member",description:"Exclusive gold membership tier for valued subscribers.",icon:"fa-bolt",color:"text-yellow-400 border-yellow-500/30 bg-yellow-500/10"},{id:"supporter",name:"Platform Supporter",description:"Contributed to the growth and development of ArenaX.",icon:"fa-heart",color:"text-rose-400 border-rose-500/30 bg-rose-500/10"},{id:"high_roller",name:"High Roller",description:"Demonstrated bold wagers and high-stakes deposit records.",icon:"fa-coins",color:"text-emerald-400 border-emerald-500/30 bg-emerald-500/10"},{id:"early_bird",name:"Early Bird Access",description:"Joined the ArenaX alpha/beta test phase early on.",icon:"fa-clock",color:"text-blue-400 border-blue-500/30 bg-blue-500/10"},{id:"fair_play",name:"Fair Play Hero",description:"Exceptional sportsmanship and clean report card.",icon:"fa-face-smile",color:"text-green-400 border-green-500/30 bg-green-500/10"},{id:"helper",name:"Community Helper",description:"Helped other players and was highly rated in live chats.",icon:"fa-comment-dots",color:"text-lime-400 border-lime-500/30 bg-lime-500/10"},{id:"tactician",name:"Master Tactician",description:"Acknowledged for deep strategic planning and tournament setup.",icon:"fa-layer-group",color:"text-fuchsia-400 border-fuchsia-500/30 bg-fuchsia-500/10"},{id:"launch_fest_badge",name:"Launch Fest Badge",description:"Claimed Day 7 daily reward during ArenaX Launch Fest.",icon:"fa-award",color:"text-red-400 border-red-500/30 bg-red-500/10"},{id:"pioneer_badge",name:"Pioneer Badge",description:"Completed all Welcome Pack challenges during the Launch Fest.",icon:"fa-rocket",color:"text-violet-400 border-violet-500/30 bg-violet-500/10"},{id:"champion_badge",name:"Champion Badge",description:"Finished 1st place in the Weekly Free Tournament during Launch Fest.",icon:"fa-trophy",color:"text-amber-400 border-amber-500/30 bg-amber-500/10"},{id:"runner_up_badge",name:"Runner Up Badge",description:"Finished 2nd place in the Weekly Free Tournament during Launch Fest.",icon:"fa-medal",color:"text-slate-400 border-slate-500/30 bg-slate-500/10"},{id:"hokage_badge",name:"ArenaX Hokage",description:"Earned from ArenaX Promotion Video Submission Event (Hokage Tier).",icon:"fa-fire",color:"text-amber-500 border-amber-500 bg-amber-500/10 shadow-[0_0_10px_rgba(245,158,11,0.4)] font-bold animate-pulse"}];window.PREDEFINED_BADGES=fo;function Ha(){const e=a("userEarnedBadges");if(!e)return;e.innerHTML="";const t=m||T;!t||!t.badges||!Array.isArray(t.badges)||t.badges.forEach(o=>{const i=fo.find(n=>n.id===o);if(i){const n=document.createElement("span");n.className=`px-2 py-0.5 text-[9px] font-bold rounded border uppercase flex items-center gap-1 cursor-pointer transition ${i.color}`,n.title=i.description,n.innerHTML=`<i class="fas ${i.icon}"></i> ${i.name}`,n.addEventListener("click",()=>{alert(`🎖️ Badge: ${i.name}

Description: ${i.description}

You own this active profile credential!`)}),e.appendChild(n)}})}window.renderEarnedBadgesUI=Ha;a("btnHubInbox").addEventListener("click",()=>{typeof window.closeRedReportHubDrawer=="function"&&window.closeRedReportHubDrawer(),qo()});a("btnHubSubmission").addEventListener("click",()=>{typeof window.closeRedReportHubDrawer=="function"&&window.closeRedReportHubDrawer(),Te("Submission"),typeof window.loadUserSubmissions=="function"&&window.loadUserSubmissions()});a("bCloseInboxBadges").addEventListener("click",()=>{a("mInboxBadges").classList.add("hidden")});a("tabMailInbox").addEventListener("click",()=>{oi("mail")});a("tabBadgeCollection").addEventListener("click",()=>{oi("badge")});function oi(e){e==="mail"?(a("tabMailInbox").className="flex-1 py-1.5 text-center text-xs font-bold rounded-md transition text-white bg-emerald-500/15 border border-emerald-500/20",a("tabBadgeCollection").className="flex-1 py-1.5 text-center text-xs font-bold rounded-md transition text-t3 hover:text-white hover:bg-white/5",a("secMailInbox").classList.remove("hidden"),a("secBadgeCollection").classList.add("hidden")):(a("tabMailInbox").className="flex-1 py-1.5 text-center text-xs font-bold rounded-md transition text-t3 hover:text-white hover:bg-white/5",a("tabBadgeCollection").className="flex-1 py-1.5 text-center text-xs font-bold rounded-md transition text-white bg-emerald-500/15 border border-emerald-500/20",a("secMailInbox").classList.add("hidden"),a("secBadgeCollection").classList.remove("hidden"),vr())}function qo(){a("mInboxBadges").classList.remove("hidden"),oi("mail"),Ct()}function Ct(){const e=a("inboxMailsList");if(!e)return;e.innerHTML="";const t=window.userMails||[];if(t.length===0){e.innerHTML=`
      <div class="p-8 text-center text-t3 space-y-2">
        <i class="fas fa-envelope-open text-3xl opacity-40"></i>
        <p class="text-xs">Your Inbox is currently empty!</p>
      </div>`;return}t.forEach(o=>{!o.read&&m&&setTimeout(async()=>{try{const p=doc(db,"users",m.uid,"mails",o.id);await updateDoc(p,{read:!0})}catch(p){console.error("Error marking mail as read:",p)}},1500);const i=o.createdAt?new Date(o.createdAt.seconds?o.createdAt.seconds*1e3:o.createdAt).toLocaleDateString([],{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}):"Just now";let n="";if(o.giftBadgeId){const p=fo.find(f=>f.id===o.giftBadgeId);p&&(o.collected?n=`
            <div class="mt-3 p-2.5 bg-green-500/5 border border-green-500/20 rounded-xl flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="px-2 py-0.5 text-[9px] font-bold rounded border uppercase ${p.color}">
                  <i class="fas ${p.icon} mr-1"></i> ${p.name}
                </span>
                <span class="text-[9px] text-t3">Claimed successfully</span>
              </div>
              <span class="text-[10px] text-green-400 font-bold flex items-center gap-1"><i class="fas fa-check-circle"></i> Collected</span>
            </div>`:n=`
            <div class="mt-3 p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="px-2 py-0.5 text-[9px] font-bold rounded border uppercase ${p.color}">
                  <i class="fas ${p.icon} mr-1"></i> ${p.name}
                </span>
              </div>
              <button class="b-collect-gift px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-bg font-black text-[10px] rounded-lg transition cursor-pointer" data-mail-id="${o.id}" data-badge-id="${p.id}">
                Collect Gift!
              </button>
            </div>`)}let r="";o.type==="team_join_request"?o.status==="pending"?r=`
          <div class="mt-3 flex items-center gap-2 p-2.5 bg-gold/10 border border-gold/20 rounded-xl justify-between">
            <span class="text-[9px] text-t3 font-bold">Request Pending</span>
            <div class="flex gap-2">
              <button class="b-decline-req px-3 py-1 bg-red-500/20 hover:bg-red-500 hover:text-white border border-red-500/30 text-red-400 font-bold text-[10px] rounded-lg transition cursor-pointer" data-mail-id="${o.id}" data-from-user-id="${o.fromUserId}" data-team-id="${o.teamId}" data-team-name="${o.teamName}">
                Decline
              </button>
              <button class="b-accept-req px-3 py-1 bg-gold hover:bg-[#e8b830] text-bg font-black text-[10px] rounded-lg transition cursor-pointer" data-mail-id="${o.id}" data-from-user-id="${o.fromUserId}" data-team-id="${o.teamId}" data-team-name="${o.teamName}">
                Accept
              </button>
            </div>
          </div>`:o.status==="accepted"?r=`
          <div class="mt-3 p-2.5 bg-green-500/5 border border-green-500/20 rounded-xl flex items-center justify-between">
            <span class="text-[9px] text-t3 font-bold">Status</span>
            <span class="text-[10px] text-green-400 font-bold flex items-center gap-1"><i class="fas fa-check-circle"></i> Accepted ✔</span>
          </div>`:o.status==="declined"&&(r=`
          <div class="mt-3 p-2.5 bg-red-500/5 border border-red-500/20 rounded-xl flex items-center justify-between">
            <span class="text-[9px] text-t3 font-bold">Status</span>
            <span class="text-[10px] text-red-400 font-bold flex items-center gap-1"><i class="fas fa-times-circle"></i> Declined ✖</span>
          </div>`):o.type==="tournament_invite"&&(o.status==="pending"?r=`
          <div class="mt-3 flex items-center gap-2 p-2.5 bg-gold/10 border border-gold/20 rounded-xl justify-between">
            <span class="text-[9px] text-t3 font-bold">Squad Invite</span>
            <button class="b-join-tour px-3 py-1 bg-gold hover:bg-[#e8b830] text-bg font-black text-[10px] rounded-lg transition cursor-pointer" data-mail-id="${o.id}" data-team-id="${o.teamId}" data-tour-id="${o.tournamentId}" data-tour-name="${o.tournamentName}">
              Join Tournament Slot
            </button>
          </div>`:o.status==="joined"&&(r=`
          <div class="mt-3 p-2.5 bg-green-500/5 border border-green-500/20 rounded-xl flex items-center justify-between">
            <span class="text-[9px] text-t3 font-bold">Status</span>
            <span class="text-[10px] text-green-400 font-bold flex items-center gap-1"><i class="fas fa-check-circle"></i> Joined Slot ✔</span>
          </div>`));const s=document.createElement("div");s.className=`p-4 bg-card border ${o.read?"border-bdr/50":"border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.05)]"} rounded-xl relative overflow-hidden transition duration-150`,s.innerHTML=`
      <div class="flex items-center justify-between">
        <span class="text-[9px] uppercase font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-mono">
          <i class="fas fa-user-shield mr-1"></i> ${o.sender||"Admin Staff"}
        </span>
        <span class="text-[9px] text-t3 font-mono">${i}</span>
      </div>
      <h4 class="font-display font-bold text-xs text-white mt-2 leading-snug flex items-center gap-1.5">
        ${o.read?"":'<span class="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse flex-shrink-0"></span>'}
        ${o.title}
      </h4>
      <p class="text-[10px] text-t2 mt-1 leading-relaxed whitespace-pre-wrap font-sans">${o.body}</p>
      ${n}
      ${r}
    `;const d=s.querySelector(".b-collect-gift");d&&d.addEventListener("click",async p=>{const f=p.target.dataset.mailId,b=p.target.dataset.badgeId;p.target.disabled=!0,p.target.textContent="Collecting...",await xr(f,b,p.target)});const c=s.querySelector(".b-accept-req");c&&c.addEventListener("click",async p=>{const f=p.currentTarget,b=f.dataset.mailId,g=f.dataset.fromUserId,w=f.dataset.teamId,h=f.dataset.teamName;await window.acceptTeamJoinRequest(b,g,w,h,f)});const l=s.querySelector(".b-decline-req");l&&l.addEventListener("click",async p=>{const f=p.currentTarget,b=f.dataset.mailId,g=f.dataset.fromUserId,w=f.dataset.teamId,h=f.dataset.teamName;await window.declineTeamJoinRequest(b,g,w,h,f)});const u=s.querySelector(".b-join-tour");u&&u.addEventListener("click",async p=>{const f=p.currentTarget,b=f.dataset.mailId,g=f.dataset.teamId,w=f.dataset.tourId,h=f.dataset.tourName;await window.joinTournamentViaInvite(b,g,w,h,f)}),e.appendChild(s)})}async function xr(e,t,o){if(m)try{const i=doc(db,"users",m.uid),n=doc(db,"users",m.uid,"mails",e),r={badges:arrayUnion(t)};t==="blue_tick"&&(r.hasBlueTick=!0,r.isVerified=!0),await updateDoc(i,r),await updateDoc(n,{collected:!0,read:!0}),alert("🎁 Congratulations! Your gifted badge has been successfully added to your profile credentials!"),Ct()}catch(i){alert("Failed to collect gift: "+i.message),o&&(o.disabled=!1,o.textContent="Collect Gift!")}}function vr(){const e=a("badgesGrid");if(!e)return;e.innerHTML="";const t=m||T,o=t&&t.badges||[];fo.forEach(i=>{const n=o.includes(i.id),r=document.createElement("div");r.className=`p-3 bg-card border ${n?"border-gold/30 shadow-[0_0_15px_rgba(192,160,48,0.05)]":"border-bdr/40 opacity-40 grayscale"} rounded-xl flex flex-col items-center text-center space-y-1.5 relative overflow-hidden transition hover:scale-[1.02] cursor-pointer`,r.innerHTML=`
      ${n?"":'<div class="absolute top-1.5 right-1.5 text-[8px] text-t3 bg-white/5 w-4 h-4 rounded-full flex items-center justify-center border border-bdr"><i class="fas fa-lock"></i></div>'}
      <div class="w-10 h-10 rounded-full flex items-center justify-center text-lg ${i.color} border border-current/20">
        <i class="fas ${i.icon}"></i>
      </div>
      <div class="text-[10px] font-black uppercase text-white tracking-wide">${i.name}</div>
      <p class="text-[8px] text-t3 leading-normal max-w-[130px] font-medium font-sans">${i.description}</p>
      <div class="text-[8px] font-bold uppercase ${n?"text-gold":"text-t3"} pt-0.5 font-mono">
        ${n?'<i class="fas fa-check-circle mr-0.5"></i> Earned':"Locked"}
      </div>
    `,r.addEventListener("click",()=>{alert(`🎖️ ${i.name}

Description: ${i.description}

Status: ${n?"✓ Earned":"🔒 Locked (Must be gifted by Admin Staff)"}`)}),e.appendChild(r)})}function yr(e){const t=a("inboxBadgeCount");t&&(e>0?(t.textContent=e,t.classList.remove("hidden")):t.classList.add("hidden"))}let qa=[],kr=null,ja=null,Oa="profile",mo="list",ii=null;window.allGuilds=qa;window.selectedGuild=kr;window.userGuild=ja;window.teamsView=mo;window.currentGuildTab=Oa;window.selectedTeamData=ii;window.viewTeamById=function(e){const o=(window.allGuilds||qa||[]).find(i=>i.id===e);o&&(ii=o,window.selectedTeamData=o,mo="profile",window.teamsView="profile",window.renderGuildSystemModalContent())};window.viewMyTeamProfile=function(){const e=window.userGuild||ja;e&&(ii=e,window.selectedTeamData=e,mo="profile",window.teamsView="profile",window.renderGuildSystemModalContent())};window.closeGuildsModal=function(){const e=a("mGuildSystemModal");e&&e.classList.add("hidden")};window.setTeamsView=function(e){mo=e,window.teamsView=e,window.renderGuildSystemModalContent()};window.setTeamsTab=function(e){Oa=e,window.currentGuildTab=e,window.renderGuildSystemModalContent()};window.toggleTeamsSearch=function(){const e=a("teamsSearchInputContainer");e&&e.classList.toggle("hidden")};window.updateTeamsSearch=function(e){(e||"").toLowerCase().trim(),window.renderGuildSystemModalContent()};window.renderInboxUI=typeof Ct=="function"?Ct:function(){};window.openInboxBadgesModal=typeof qo=="function"?qo:function(){const e=a("mInboxBadges");e&&e.classList.remove("hidden")};window.closeInboxBadgesModal=function(){const e=a("mInboxBadges");e&&e.classList.add("hidden")};window.openDepositModal=function(){const e=window.$("mDeposit");e&&e.classList.remove("hidden")};window.closeDepositModal=function(){const e=window.$("mDeposit");e&&e.classList.add("hidden")};window.openWithdrawModal=function(){const e=window.$("mWithdraw");e&&e.classList.remove("hidden")};window.closeWithdrawModal=function(){const e=window.$("mWithdraw");e&&e.classList.add("hidden")};window.toggleAccordion=function(e){const t=window.$(e);t&&t.classList.toggle("hidden")};const Lr="1524144298289791127",Sr="https://arenax.cyou/discord-callback",Cr="https://arena-x-beta.vercel.app/api/discord-callback";let $e=null;window.initiateDiscordOAuthFlow=function(e="general"){if(T){alert("Guest accounts cannot link a Discord profile. Please create or log in to a permanent ArenaX account first!");return}const t=m||window.userProfile;if(!t||!t.uid){alert("Please log in before connecting Discord.");return}const o="ax_"+Math.random().toString(36).substring(2,15)+"_"+Date.now(),i={token:o,uid:t.uid,source:e,timestamp:Date.now()};try{sessionStorage.setItem("ax_discord_oauth_state",JSON.stringify(i))}catch(c){console.warn("SessionStorage unavailable for OAuth state, continuing anyway",c)}const n=window.DISCORD_CLIENT_ID||Lr,r=encodeURIComponent(Sr),s=encodeURIComponent(o),d=`https://discord.com/api/oauth2/authorize?client_id=${n}&redirect_uri=${r}&response_type=code&scope=identify&state=${s}`;window.location.href=d};window.checkAndProcessDiscordCallback=async function(){const e=new URLSearchParams(window.location.search);if(!(window.location.pathname.includes("discord-callback")||e.has("code")))return;const i=e.get("code"),n=e.get("state"),r=e.get("error"),s=e.get("error_description");if(r){alert(`Discord Verification Cancelled: ${s||r}`),$o();return}if(!i)return;let d=null;try{const l=sessionStorage.getItem("ax_discord_oauth_state");l&&(d=JSON.parse(l))}catch{}if(d&&d.token&&n&&d.token!==n){console.warn("Discord OAuth state mismatch! Potential CSRF prevented."),alert("Security Warning: Discord authentication state mismatch. Please retry verification."),$o();return}const c=document.createElement("div");c.id="discordVerifyingToast",c.className="fixed top-5 left-1/2 -translate-x-1/2 z-[300] bg-indigo-600 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-xs font-bold border border-indigo-400 animate-bounce",c.innerHTML='<i class="fab fa-discord text-base"></i> Verifying Discord identity with ArenaX...',document.body.appendChild(c);try{let l;try{l=await fetch(Cr,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({code:i})})}catch{l=await fetch("/api/discord-callback",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({code:i})})}const u=await l.json();if(!l.ok||!u.success||!u.discord)throw new Error(u.error||"Failed to exchange Discord authorization code");const p=u.discord,f=m&&m.uid||d&&d.uid||auth.currentUser&&auth.currentUser.uid;if(!f)throw new Error("No active ArenaX player session found to link Discord profile.");const b=doc(db,"users",f);if(await updateDoc(b,{discordUserId:p.id,discordUsername:p.username,discordAvatar:p.avatar,discordGlobalName:p.globalName||"",discordVerified:!0,discordLinkedAt:serverTimestamp()}),m&&(m.discordUserId=p.id,m.discordUsername=p.username,m.discordAvatar=p.avatar,m.discordGlobalName=p.globalName||"",m.discordVerified=!0),window.renderDiscordAuthWidget(),window.updateDiscordSecurityUI(),window.closeDiscordVerificationGate(),c.className="fixed top-5 left-1/2 -translate-x-1/2 z-[300] bg-emerald-600 text-white px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 text-xs font-bold border border-emerald-400 animate-fade-in",c.innerHTML=`<i class="fas fa-check-circle text-base"></i> Discord Connected: <span class="underline text-emerald-200">@${p.username}</span> is now verified!`,setTimeout(()=>{c.parentNode&&c.parentNode.removeChild(c)},5e3),(d?d.source:"general")==="settings"&&typeof window.openAxSecurityModal=="function")window.openAxSecurityModal();else if($e){const w=$e;$e=null,typeof St=="function"&&St(w)}else typeof X=="function"&&typeof currentScreen<"u"&&!currentScreen&&X("sDash")}catch(l){console.error("Discord Verification Error:",l),alert("❌ Discord Verification Failed: "+(l.message||l)),c.parentNode&&c.parentNode.removeChild(c)}finally{sessionStorage.removeItem("ax_discord_oauth_state"),$o()}};function $o(){try{const e=window.location.origin+window.location.pathname.replace(/\/discord-callback$/,"")||"/";window.history.replaceState({},document.title,e)}catch{try{window.location.replace("/")}catch{}}}window.checkDiscordJustLinked=function(){try{const e=sessionStorage.getItem("ax_discord_just_linked");if(!e)return;sessionStorage.removeItem("ax_discord_just_linked");const t=JSON.parse(e);if(!t||!t.username)return;m&&(m.discordUserId=t.id,m.discordUsername=t.username,m.discordAvatar=t.avatar,m.discordGlobalName=t.globalName||"",m.discordVerified=!0),typeof window.renderDiscordAuthWidget=="function"&&window.renderDiscordAuthWidget(),typeof window.updateDiscordSecurityUI=="function"&&window.updateDiscordSecurityUI(),typeof window.closeDiscordVerificationGate=="function"&&window.closeDiscordVerificationGate();const o=document.createElement("div");if(o.id="discordJustLinkedToast",o.className="fixed top-5 left-1/2 -translate-x-1/2 z-[300] bg-emerald-600 text-white px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 text-xs font-bold border border-emerald-400 animate-fade-in",o.innerHTML=`<i class="fas fa-check-circle text-base text-emerald-200"></i> Discord Connected: <span class="underline text-white">@${t.username}</span> is now linked!`,document.body.appendChild(o),setTimeout(()=>{o.parentNode&&o.parentNode.removeChild(o)},5e3),t.source==="settings"&&typeof window.openAxSecurityModal=="function")window.openAxSecurityModal();else if(typeof $e<"u"&&$e){const i=$e;$e=null,typeof St=="function"&&St(i)}}catch(e){console.warn("Error evaluating checkDiscordJustLinked:",e)}};window.unlinkDiscordAccount=async function(){if(!(T||!m||!confirm("Are you sure you want to unlink your Discord account? You will need to reconnect it before registering for future tournaments.")))try{const t=doc(db,"users",m.uid);await updateDoc(t,{discordUserId:null,discordUsername:null,discordAvatar:null,discordGlobalName:null,discordVerified:!1,discordUnlinkedAt:serverTimestamp()}),m.discordUserId=null,m.discordUsername=null,m.discordAvatar=null,m.discordVerified=!1,window.renderDiscordAuthWidget(),window.updateDiscordSecurityUI(),alert("✓ Discord account unlinked successfully.")}catch(t){alert("Failed to unlink Discord: "+t.message)}};window.renderDiscordAuthWidget=function(){const e=m||T,o=e&&e.discordVerified===!0?`
    <div class="p-4 bg-gradient-to-r from-indigo-950/40 via-card to-card border border-indigo-500/40 rounded-xl flex items-center justify-between gap-3 shadow-md">
      <div class="flex items-center gap-3">
        <div class="relative">
          <img src="${e.discordAvatar||"https://cdn.discordapp.com/embed/avatars/0.png"}" alt="Discord Avatar" class="w-11 h-11 rounded-full object-cover border-2 border-indigo-500/60 bg-slate-900 shadow-md" onerror="this.src='https://cdn.discordapp.com/embed/avatars/0.png'"/>
          <span class="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-slate-950 flex items-center justify-center text-[8px] text-white font-bold" title="Verified">
            ✓
          </span>
        </div>
        <div class="space-y-0.5">
          <div class="flex items-center gap-1.5">
            <span class="text-xs font-bold text-white leading-tight font-display">${e.discordUsername||"Discord User"}</span>
            <span class="px-1.5 py-0.2 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[8px] font-black uppercase rounded">Verified</span>
          </div>
          <p class="text-[10px] text-t3 font-mono">ID: ${e.discordUserId||"Connected"}</p>
        </div>
      </div>
      <button onclick="window.unlinkDiscordAccount()" class="px-3 py-1.5 bg-red/10 border border-red/30 hover:bg-red/20 text-red text-[10px] font-bold uppercase rounded-lg transition active:scale-95 cursor-pointer">
        Unlink
      </button>
    </div>
  `:`
    <div class="space-y-3">
      <div class="p-3.5 bg-bg/60 border border-bdr rounded-xl flex items-center justify-between gap-2">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-full bg-slate-800 border border-bdr flex items-center justify-center text-t3 text-sm">
            <i class="fab fa-discord"></i>
          </div>
          <div>
            <div class="text-xs font-bold text-slate-200">No Discord Linked</div>
            <div class="text-[10px] text-t3">Required for tournament entry & verification</div>
          </div>
        </div>
        <span class="text-[9px] bg-amber-500/15 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold uppercase">
          Unlinked
        </span>
      </div>

      <button onclick="window.initiateDiscordOAuthFlow()" class="w-full py-3 bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition shadow-lg shadow-indigo-500/20 active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer">
        <i class="fab fa-discord text-base"></i> Connect Discord Account
      </button>
    </div>
  `;a("discordGateWidget")&&(a("discordGateWidget").innerHTML=o),a("discordSettingsWidget")&&(a("discordSettingsWidget").innerHTML=o),typeof window.renderTwoFactorAuthWidget=="function"&&window.renderTwoFactorAuthWidget()};window.renderTwoFactorAuthWidget=function(){const e=m||T,t=e&&e.twoFactorEnabled===!0,o=a("ax2FaStatusHeaderBadge");o&&(t?(o.textContent="Active",o.className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono"):(o.textContent="Disabled",o.className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 font-mono"));const i=a("ax2FaSettingsWidget");if(!i)return;const n=t?`
    <div class="p-4 bg-gradient-to-r from-emerald-950/40 via-card to-card border border-emerald-500/40 rounded-xl flex items-center justify-between gap-3 shadow-md">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-lg shadow-sm">
          <i class="fas fa-shield-halved"></i>
        </div>
        <div class="space-y-0.5">
          <div class="flex items-center gap-1.5">
            <span class="text-xs font-bold text-white font-display">2FA Login Verification</span>
            <span class="px-1.5 py-0.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[8px] font-black uppercase rounded flex items-center gap-1">
              <i class="fas fa-check text-[7px]"></i> 2FA Enabled
            </span>
          </div>
          <p class="text-[10px] text-slate-300 leading-tight">Every login attempt requires email confirmation link.</p>
        </div>
      </div>
      <button onclick="window.toggleTwoFactorAuth(false)" class="px-3 py-1.5 bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 text-rose-400 text-[10px] font-bold uppercase rounded-lg transition active:scale-95 cursor-pointer whitespace-nowrap">
        Disable 2FA
      </button>
    </div>
  `:`
    <div class="space-y-3">
      <div class="p-3.5 bg-bg/60 border border-bdr rounded-xl flex items-center justify-between gap-2">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-full bg-slate-800 border border-bdr flex items-center justify-center text-[#f0c040] text-sm">
            <i class="fas fa-shield-halved"></i>
          </div>
          <div>
            <div class="text-xs font-bold text-slate-200">2FA Login Verification is OFF</div>
            <div class="text-[10px] text-t3">Protect your account with email login confirmations</div>
          </div>
        </div>
        <span class="text-[9px] bg-slate-800 text-slate-400 border border-slate-700 px-2 py-0.5 rounded-full font-bold uppercase font-mono">
          Disabled
        </span>
      </div>

      <button onclick="window.toggleTwoFactorAuth(true)" class="w-full py-3 bg-gradient-to-r from-[#f0c040] to-[#e5a820] hover:brightness-110 text-black text-xs font-extrabold uppercase tracking-wider rounded-xl transition shadow-lg shadow-gold/20 active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer">
        <i class="fas fa-lock"></i> Enable 2FA
      </button>
    </div>
  `;i.innerHTML=n};window.toggleTwoFactorAuth=async function(e){const t=m||T;if(!t||!t.uid){alert("Please sign in to configure Two-Factor Authentication.");return}const o=typeof e=="boolean"?e:!t.twoFactorEnabled;if(!(!o&&!confirm("Are you sure you want to disable Two-Factor Authentication (2FA)? Your account will be less protected against unauthorized logins.")))try{t.twoFactorEnabled=o,window.renderTwoFactorAuthWidget(),await updateDoc(doc(db,"users",t.uid),{twoFactorEnabled:o,twoFactorUpdatedAt:new Date().toISOString()}),o?(sessionStorage.setItem("ax_2fa_verified_"+t.uid,"true"),alert("Two-Factor Authentication (2FA) is now ENABLED! Future login sessions will require email confirmation.")):(sessionStorage.removeItem("ax_2fa_verified_"+t.uid),alert("Two-Factor Authentication (2FA) has been disabled."))}catch(i){console.error("[2FA] Error toggling 2FA:",i),alert("Failed to update 2FA setting: "+i.message),window.renderTwoFactorAuthWidget()}};window.updateDiscordSecurityUI=function(){const e=m||T;if(e)if(window.accountStanding){if(e.uid&&typeof window.accountStanding.initUserStandingListener=="function"&&window.accountStanding.initUserStandingListener(e.uid),typeof window.accountStanding.reevaluateAndRender=="function")window.accountStanding.reevaluateAndRender();else if(typeof window.accountStanding.computeAccountStanding=="function"){const t=window.accountStanding.computeAccountStanding(e);window.accountStanding.renderAccountStandingUI(t,e)}}else{const t=e&&e.discordVerified===!0,o=a("badgeAxSecurityStatus");if(o){const i=(Number(e.warningCount)||0)>0||e.accountStatus==="warned",n=!!(e.restricted||e.accountStatus==="restricted");!!(e.banned||(Number(e.warningCount)||0)>=2)?(o.textContent="At Risk ✕",o.className="text-[9px] bg-rose-500/15 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded-full font-bold uppercase"):i||n?(o.textContent="Limited !",o.className="text-[9px] bg-amber-500/15 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold uppercase"):(o.textContent=t?"All Good ✓":"All Good",o.className="text-[9px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold uppercase")}}};window.openDiscordVerificationGate=function(e){$e=e,window.renderDiscordAuthWidget();const t=a("mDiscordVerifyGate");t&&t.classList.remove("hidden")};window.closeDiscordVerificationGate=function(){const e=a("mDiscordVerifyGate");e&&e.classList.add("hidden")};window.openAxSecurityModal=function(){window.renderDiscordAuthWidget(),typeof window.renderTwoFactorAuthWidget=="function"&&window.renderTwoFactorAuthWidget();const e=m||T||{};if(window.accountStanding){if(e.uid&&typeof window.accountStanding.refreshUserStanding=="function")window.accountStanding.refreshUserStanding(e.uid);else if(typeof window.accountStanding.reevaluateAndRender=="function")window.accountStanding.reevaluateAndRender();else if(typeof window.accountStanding.computeAccountStanding=="function"){const o=window.accountStanding.computeAccountStanding(e);window.accountStanding.renderAccountStandingUI(o,e)}typeof window.accountStanding.fetchAiStandingRecommendations=="function"&&window.accountStanding.fetchAiStandingRecommendations(!1)}else window.updateDiscordSecurityUI();window.axCachedSessions?window.renderLoggedInDevices(window.axCachedSessions):e.uid&&window.refreshLoggedInDevices();const t=a("mAxSecurityModal");t&&t.classList.remove("hidden")};window.closeAxSecurityModal=function(){const e=a("mAxSecurityModal");e&&e.classList.add("hidden"),window.hideLoggedInDevicesView()};function $r(){let e=null;try{e=localStorage.getItem("ax_device_id")}catch{}if(!e){e="axdev_"+Math.random().toString(36).substring(2,11)+"_"+Date.now().toString(36);try{localStorage.setItem("ax_device_id",e)}catch{}}return e}function Wa(){const e=navigator.userAgent||"";let t="Unknown Platform",o="desktop";/Android/i.test(e)?(t="Android",o="mobile"):/iPhone|iPad|iPod/i.test(e)?(t=/iPad/i.test(e)?"iPadOS":"iOS",o="mobile"):/Windows NT 10.0/i.test(e)||/Windows/i.test(e)?(t="Windows",o="desktop"):/Macintosh|Mac OS X/i.test(e)?(t="macOS",o="desktop"):/CrOS/i.test(e)?(t="ChromeOS",o="desktop"):/Linux/i.test(e)&&(t="Linux",o="desktop");let i="Browser";return/Edg\//i.test(e)?i="Edge":/OPR\/|Opera\//i.test(e)?i="Opera":/Chrome\//i.test(e)&&!/Edg\//i.test(e)?i="Chrome":/Firefox\//i.test(e)?i="Firefox":/Safari\//i.test(e)&&!/Chrome\//i.test(e)&&(i="Safari"),{platform:t,browser:i,deviceType:o,timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||"",screen:`${window.screen.width||0}x${window.screen.height||0}`}}function Hi(e,t){const o=(e||"").toLowerCase();return o.includes("android")?'<i class="fa-brands fa-android text-emerald-400 text-xl"></i>':o.includes("ios")||o.includes("iphone")||o.includes("ipad")||o.includes("mac")?'<i class="fa-brands fa-apple text-slate-200 text-xl"></i>':o.includes("win")?'<i class="fa-brands fa-windows text-blue-400 text-xl"></i>':o.includes("linux")?'<i class="fa-brands fa-linux text-amber-400 text-xl"></i>':o.includes("chrome")?'<i class="fa-brands fa-chrome text-teal-400 text-xl"></i>':t==="mobile"?'<i class="fas fa-mobile-screen text-slate-300 text-xl"></i>':'<i class="fas fa-desktop text-slate-300 text-xl"></i>'}function Pr(e){if(!e)return"Recently";const t=typeof e=="number"?e:e.toDate?e.toDate().getTime():new Date(e).getTime(),o=Date.now()-t,i=Math.floor(o/1e3);if(i<60)return"Active now";const n=Math.floor(i/60);if(n<60)return`${n}m ago`;const r=Math.floor(n/60);if(r<24)return`${r}h ago`;const s=Math.floor(r/24);return s<7?`${s}d ago`:new Date(t).toLocaleDateString("en-US",{month:"short",day:"numeric"})}window.initUserSessionAndDevice=async function(e,t){if(!e||!t||!t.uid)return;const o=t.uid,i=$r();let n=null;try{n=localStorage.getItem("ax_session_id")}catch{}if(!n){n="axsess_"+Math.random().toString(36).substring(2,11)+"_"+Date.now().toString(36);try{localStorage.setItem("ax_session_id",n)}catch{}}const r=Wa(),d=window.location.hostname==="arenax.cyou"||window.location.hostname.endsWith("github.io")?"https://arena-x-beta.vercel.app/api/record-login-device":"/api/record-login-device";try{const c={uid:o,email:e.email||t.email||"",displayName:t.name||"ArenaX Player",deviceId:i,sessionId:n,clientHints:r};let l;try{l=await fetch(d,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(c)}),(l.status===404||l.status===405)&&!d.startsWith("https://arena-x-beta.vercel.app")&&(l=await fetch("https://arena-x-beta.vercel.app/api/record-login-device",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(c)}))}catch{d.startsWith("https://arena-x-beta.vercel.app")||(l=await fetch("https://arena-x-beta.vercel.app/api/record-login-device",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(c)}))}if(l&&l.ok){const u=await l.json();if(u.sessionId){n=u.sessionId;try{localStorage.setItem("ax_session_id",n)}catch{}}u.isNewDevice&&console.log("[Account Activity] New login device registered. Security notification email dispatched to user inbox.")}}catch(c){console.warn("[Account Activity] Device recording API error (will fallback to direct Firestore sync):",c)}try{const c=doc(db,"users",o,"sessions",n);(await getDoc(c)).exists()?await updateDoc(c,{lastActiveAt:Date.now()}).catch(()=>{}):await setDoc(c,{sessionId:n,userId:o,deviceId:i,platform:r.platform,browser:r.browser,deviceType:r.deviceType,approximateLocation:"Lahore, Punjab, Pakistan",createdAt:Date.now(),lastActiveAt:Date.now(),isRevoked:!1,revokedAt:null},{merge:!0})}catch(c){console.warn("[Account Activity] Direct Firestore session sync warning:",c)}window.initSessionSecurityListener(e,n),window.initLoggedInDevicesListener(t)};window.initSessionSecurityListener=function(e,t){if(!(!e||!t)){if(window.axSessionUnsub){try{window.axSessionUnsub()}catch{}window.axSessionUnsub=null}try{const o=doc(db,"users",e.uid,"sessions",t);window.axSessionUnsub=onSnapshot(o,i=>{if(i.exists()){const n=i.data();if(n&&n.isRevoked===!0){if(console.warn("[Session Security] This session has been revoked from another device."),window.axSessionUnsub){try{window.axSessionUnsub()}catch{}window.axSessionUnsub=null}try{localStorage.removeItem("ax_session_id"),sessionStorage.clear()}catch{}alert("⚠️ Session Terminated: Your session has been remotely logged out from another device."),signOut(auth).catch(()=>{}),X("sLogin")}}},i=>{console.warn("[Session Security] Session snapshot listener warning:",i)})}catch(o){console.warn("[Session Security] Failed to attach session watcher:",o)}}};window.initLoggedInDevicesListener=function(e){if(!(!e||!e.uid)){if(window.axAllDevicesUnsub){try{window.axAllDevicesUnsub()}catch{}window.axAllDevicesUnsub=null}try{const t=collection(db,"users",e.uid,"sessions");window.axAllDevicesUnsub=onSnapshot(t,o=>{const i=[];o.forEach(n=>{i.push(n.data())}),i.sort((n,r)=>(r.createdAt||0)-(n.createdAt||0)),window.axCachedSessions=i,window.renderLoggedInDevices(i)},o=>{console.warn("[Account Activity] Sessions snapshot warning:",o)})}catch(t){console.warn("[Account Activity] Failed to subscribe to sessions collection:",t)}}};window.renderLoggedInDevices=function(e){let t=null;try{t=localStorage.getItem("ax_session_id")}catch{}const o=Array.isArray(e)?e:[],i=o.filter(p=>!p.isRevoked).length,n=a("axActiveDevicesSummaryText");n&&(n.textContent=`${i||1} Active Session${i===1?"":"s"}`);let r=o.find(p=>p.sessionId===t);if(!r){const p=Wa();r={sessionId:t||"current_device",platform:p.platform,browser:p.browser,deviceType:p.deviceType,approximateLocation:"Lahore, Punjab, Pakistan",createdAt:Date.now(),lastActiveAt:Date.now(),isRevoked:!1}}const s=o.filter(p=>p.sessionId!==r.sessionId),d=s.filter(p=>!p.isRevoked).length,c=a("axOtherDevicesCountBadge");c&&(c.textContent=`${d} other active session${d===1?"":"s"}`);const l=a("axCurrentDeviceCard");if(l){const p=Hi(r.platform,r.deviceType),b=new Date(r.createdAt||Date.now()).toLocaleString("en-US",{month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit"});l.innerHTML=`
      <div class="flex items-start justify-between gap-3 sm:gap-4">
        <div class="flex items-start gap-3 sm:gap-3.5 min-w-0">
          <div class="w-12 h-12 rounded-xl bg-slate-800/90 border border-slate-700/80 flex items-center justify-center flex-shrink-0 shadow-inner">
            ${p}
          </div>
          <div class="min-w-0 space-y-1">
            <div class="text-sm font-bold text-white flex items-center gap-2 flex-wrap">
              <span>${r.platform||"Current Device"}</span>
              <span class="text-slate-500">•</span>
              <span class="text-slate-300 font-medium">${r.browser||"Browser"}</span>
            </div>
            <div class="text-xs text-slate-300 flex items-center gap-1.5 font-medium">
              <i class="fas fa-location-dot text-slate-500 text-[10px]"></i>
              <span class="truncate">${r.approximateLocation||"Lahore, Punjab, Pakistan"}</span>
              <span class="text-[10px] text-slate-500 font-normal whitespace-nowrap">(Approximate)</span>
            </div>
            <div class="text-[11px] text-slate-400 font-mono flex items-center gap-2 pt-0.5">
              <span>Login: ${b}</span>
            </div>
          </div>
        </div>
        <div class="flex-shrink-0">
          <span class="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm whitespace-nowrap">
            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Current Device
          </span>
        </div>
      </div>
    `}const u=a("axOtherDevicesList");u&&(s.length===0?u.innerHTML=`
        <div class="p-5 bg-bg/50 border border-dashed border-bdr/70 rounded-2xl text-center space-y-1.5">
          <div class="w-10 h-10 mx-auto rounded-full bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-400 text-sm">
            <i class="fas fa-shield-halved text-indigo-400"></i>
          </div>
          <div class="text-xs font-bold text-slate-200">No other active devices</div>
          <p class="text-[11px] text-slate-400 max-w-sm mx-auto leading-relaxed">
            Your ArenaX account is currently only signed in on this device. Any new login from another phone, tablet, or PC will appear here.
          </p>
        </div>
      `:u.innerHTML=s.map(p=>{const f=Hi(p.platform,p.deviceType),b=Pr(p.lastActiveAt||p.createdAt),g=p.isRevoked===!0;return`
          <div class="p-3.5 sm:p-4 bg-card/90 border ${g?"border-bdr/40 opacity-60":"border-bdr/80 hover:border-slate-600/70"} rounded-xl flex items-center justify-between gap-3 transition shadow-sm">
            <div class="flex items-center gap-3.5 min-w-0">
              <div class="w-11 h-11 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-center flex-shrink-0">
                ${f}
              </div>
              <div class="min-w-0 space-y-0.5">
                <div class="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5 flex-wrap">
                  <span>${p.platform||"Device"}</span>
                  <span class="text-slate-500">•</span>
                  <span class="text-slate-300 font-medium">${p.browser||"Browser"}</span>
                </div>
                <div class="text-[11px] text-slate-400 flex items-center gap-1.5 flex-wrap">
                  <span class="truncate max-w-[180px] sm:max-w-xs">${p.approximateLocation||"Approximate Location"}</span>
                  <span class="text-slate-500">•</span>
                  <span class="whitespace-nowrap font-mono text-[10px] text-slate-400">${b}</span>
                </div>
                ${g?'<span class="inline-block text-[10px] font-bold text-rose-400 font-mono">Logged Out Remotely</span>':'<span class="inline-block text-[10px] font-medium text-emerald-400/90 font-mono">Active Session</span>'}
              </div>
            </div>
            <div class="flex-shrink-0 pl-2">
              ${g?`
                <span class="text-[10px] text-slate-500 font-mono px-2.5 py-1 bg-slate-800/60 rounded-lg border border-slate-700/50">Revoked</span>
              `:`
                <button onclick="window.revokeDeviceSession('${p.sessionId}')" type="button" class="w-9 h-9 rounded-xl bg-slate-800/90 hover:bg-rose-500/20 border border-slate-700 hover:border-rose-500/50 text-slate-400 hover:text-rose-400 flex items-center justify-center transition cursor-pointer active:scale-95 shadow-sm" title="Log out this device">
                  <i class="fas fa-xmark text-sm"></i>
                </button>
              `}
            </div>
          </div>
        `}).join(""))};window.showLoggedInDevicesView=function(){a("axSecurityMainView")&&a("axSecurityMainView").classList.add("hidden"),a("axSecurityDevicesView")&&a("axSecurityDevicesView").classList.remove("hidden"),a("axSecurityModalTitle")&&(a("axSecurityModalTitle").textContent="Logged-in Devices"),a("axSecurityModalSubtitle")&&(a("axSecurityModalSubtitle").textContent="Account Activity & Devices"),window.axCachedSessions?window.renderLoggedInDevices(window.axCachedSessions):window.refreshLoggedInDevices()};window.hideLoggedInDevicesView=function(){a("axSecurityMainView")&&a("axSecurityMainView").classList.remove("hidden"),a("axSecurityDevicesView")&&a("axSecurityDevicesView").classList.add("hidden"),a("axSecurityModalTitle")&&(a("axSecurityModalTitle").textContent="AX Security"),a("axSecurityModalSubtitle")&&(a("axSecurityModalSubtitle").textContent="Standing & Account Safety Hub")};window.refreshLoggedInDevices=async function(){const e=m||T;if(!e||!e.uid)return;const t=a("axRefreshDevicesIcon");t&&t.classList.add("fa-spin");try{const o=await getDocs(collection(db,"users",e.uid,"sessions")),i=[];o.forEach(n=>i.push(n.data())),i.sort((n,r)=>(r.createdAt||0)-(n.createdAt||0)),window.axCachedSessions=i,window.renderLoggedInDevices(i)}catch(o){console.warn("[Account Activity] Manual refresh warning:",o)}finally{t&&t.classList.remove("fa-spin")}};window.revokeDeviceSession=async function(e){const t=m||T;if(!t||!t.uid||!e||!confirm("Are you sure you want to remotely log out this device? Any active session on that device will be terminated immediately."))return;let o=null;try{o=localStorage.getItem("ax_session_id")}catch{}try{const i=doc(db,"users",t.uid,"sessions",e);await updateDoc(i,{isRevoked:!0,revokedAt:Date.now()}).catch(()=>{});const r=window.location.hostname==="arenax.cyou"||window.location.hostname.endsWith("github.io")?"https://arena-x-beta.vercel.app/api/revoke-session":"/api/revoke-session",s={uid:t.uid,sessionId:o,targetSessionId:e};try{let d=await fetch(r,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(s)});(d.status===404||d.status===405)&&!r.startsWith("https://arena-x-beta.vercel.app")&&await fetch("https://arena-x-beta.vercel.app/api/revoke-session",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(s)})}catch{r.startsWith("https://arena-x-beta.vercel.app")||await fetch("https://arena-x-beta.vercel.app/api/revoke-session",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(s)}).catch(()=>{})}alert("Device has been successfully logged out.")}catch(i){console.error("[Account Activity] Error revoking device session:",i),alert("Failed to log out device: "+i.message)}};window.confirmRevokeAllOtherDevices=async function(){const e=m||T;if(!e||!e.uid)return;let t=null;try{t=localStorage.getItem("ax_session_id")}catch{}if(!confirm(`Log Out All Other Devices?

You will have to log back in on all other devices. Your current device will remain logged in and active.`))return;const o=a("btnLogOutAllOtherDevices");o&&(o.disabled=!0,o.innerHTML='<i class="fas fa-spinner fa-spin"></i> Logging out devices...');try{if(window.axCachedSessions&&Array.isArray(window.axCachedSessions)){for(const s of window.axCachedSessions)if(s.sessionId!==t&&!s.isRevoked)try{await updateDoc(doc(db,"users",e.uid,"sessions",s.sessionId),{isRevoked:!0,revokedAt:Date.now()})}catch{}}const n=window.location.hostname==="arenax.cyou"||window.location.hostname.endsWith("github.io")?"https://arena-x-beta.vercel.app/api/revoke-session":"/api/revoke-session",r={uid:e.uid,sessionId:t,allOther:!0};try{let s=await fetch(n,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(r)});(s.status===404||s.status===405)&&!n.startsWith("https://arena-x-beta.vercel.app")&&await fetch("https://arena-x-beta.vercel.app/api/revoke-session",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(r)})}catch{n.startsWith("https://arena-x-beta.vercel.app")||await fetch("https://arena-x-beta.vercel.app/api/revoke-session",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(r)}).catch(()=>{})}alert("✅ Success: All other logged-in devices have been logged out. Your current device remains active.")}catch(i){console.error("[Account Activity] Error logging out all other devices:",i),alert("Failed to log out all devices: "+i.message)}finally{o&&(o.disabled=!1,o.innerHTML='<i class="fas fa-arrow-right-from-bracket"></i> Log Out All Other Devices')}};window.openForgotPasswordModal=async function(){const e=m||T,t=e&&e.email||auth.currentUser&&auth.currentUser.email||"";if(!t){alert("Please enter your email to receive a password reset link.");return}if(confirm(`Send password reset email to ${t}?`))try{typeof to=="function"&&await to(t),alert(`✉️ Branded Password Reset Link Sent!

We have dispatched a custom reset email to:
${t}

Please check your inbox and spam folder.`)}catch(o){alert("Could not send password reset email: "+o.message)}};document.addEventListener("DOMContentLoaded",()=>{const e=a("btnAxSecurity");e&&e.addEventListener("click",()=>window.openAxSecurityModal());const t=a("bCloseAxSecurity");t&&t.addEventListener("click",()=>window.closeAxSecurityModal());const o=a("bCloseAxSecurityCross");o&&o.addEventListener("click",()=>{a("axSecurityDevicesView")&&!a("axSecurityDevicesView").classList.contains("hidden")?window.hideLoggedInDevicesView():window.closeAxSecurityModal()});const i=a("bCloseDiscordGate");i&&i.addEventListener("click",()=>window.closeDiscordVerificationGate());const n=a("bCancelDiscordGate");n&&n.addEventListener("click",()=>window.closeDiscordVerificationGate())});window.closeEmailVerificationModal=async function(){if(a("mEmailVerification")&&a("mEmailVerification").classList.add("hidden"),auth.currentUser)try{await signOut(auth)}catch{}};a("btnCloseVerificationModal")&&a("btnCloseVerificationModal").addEventListener("click",()=>window.closeEmailVerificationModal());a("btnCancelResetPassword")&&(a("btnCancelResetPassword").onclick=()=>{a("mResetPassword")&&a("mResetPassword").classList.add("hidden"),X("sLogin")});a("btnProceedToLogin")&&(a("btnProceedToLogin").onclick=()=>{a("mResetPassword")&&a("mResetPassword").classList.add("hidden"),X("sLogin")});async function Tr(){const e=new URLSearchParams(window.location.search),t=e.get("resetToken")||e.get("token"),o=window.location.pathname;if(t||o.includes("reset-password")){const i=t||e.get("token")||e.get("resetToken");if(!i)return;window.ArenaSplash&&typeof window.ArenaSplash.finish=="function"&&window.ArenaSplash.finish(!0),a("mResetPassword")&&a("mResetPassword").classList.remove("hidden"),a("mAuth")&&a("mAuth").classList.add("hidden");const r=window.location.hostname==="arenax.cyou"||window.location.hostname.endsWith("github.io")?"https://arena-x-beta.vercel.app":"";try{let s=await fetch(`${r}/api/complete-password-reset?token=${encodeURIComponent(i)}`);(s.status===404||s.status===405)&&!r&&(s=await fetch(`https://arena-x-beta.vercel.app/api/complete-password-reset?token=${encodeURIComponent(i)}`));const d=await s.json();if(!s.ok||!d.valid){a("resetPasswordErr")&&(a("resetPasswordErr").textContent=d.error||"This password reset link is invalid or has expired.",a("resetPasswordErr").classList.remove("hidden")),a("formResetPassword")&&a("formResetPassword").classList.add("hidden");return}d.email&&a("txtResetPasswordEmail")&&(a("txtResetPasswordEmail").textContent=`Resetting password for: ${d.email}`)}catch(s){a("resetPasswordErr")&&(a("resetPasswordErr").textContent="Unable to validate reset link: "+s.message,a("resetPasswordErr").classList.remove("hidden"))}a("formResetPassword")&&(a("formResetPassword").onsubmit=async s=>{var l,u;s.preventDefault();const d=((l=a("iResetNewPass"))==null?void 0:l.value)||"",c=((u=a("iResetConfirmPass"))==null?void 0:u.value)||"";if(d!==c){a("resetPasswordErr")&&(a("resetPasswordErr").textContent="Passwords do not match.",a("resetPasswordErr").classList.remove("hidden"));return}if(d.length<6){a("resetPasswordErr")&&(a("resetPasswordErr").textContent="Password must be at least 6 characters.",a("resetPasswordErr").classList.remove("hidden"));return}a("resetPasswordErr")&&a("resetPasswordErr").classList.add("hidden"),a("btnSubmitNewPassword")&&(a("btnSubmitNewPassword").disabled=!0,a("btnSubmitNewPassword").textContent="Updating Password...");try{let p=await fetch(`${r}/api/complete-password-reset`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token:i,newPassword:d})});(p.status===404||p.status===405)&&!r&&(p=await fetch("https://arena-x-beta.vercel.app/api/complete-password-reset",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token:i,newPassword:d})}));const f=await p.json();if(!p.ok||!f.success)throw new Error(f.error||"Failed to update password.");a("formResetPassword")&&a("formResetPassword").classList.add("hidden"),a("resetPasswordSuccess")&&a("resetPasswordSuccess").classList.remove("hidden")}catch(p){a("resetPasswordErr")&&(a("resetPasswordErr").textContent="⚠️ "+p.message,a("resetPasswordErr").classList.remove("hidden"))}finally{a("btnSubmitNewPassword")&&(a("btnSubmitNewPassword").disabled=!1,a("btnSubmitNewPassword").textContent="Save New Password")}})}}Tr();window.startTwoFactorLoginFlow=async function(e,t){if(!e||!e.email)return;const o=e.email,i=(t==null?void 0:t.name)||e.displayName||o.split("@")[0]||"ArenaX Player";a("sDash")&&a("sDash").classList.add("hidden"),a("mAuth")&&a("mAuth").classList.add("hidden");const n=a("mTwoFactorWaitingModal");if(n&&n.classList.remove("hidden"),a("txt2FaWaitingEmail")&&(a("txt2FaWaitingEmail").textContent=o),a("txt2FaWaitingStatus")&&(a("txt2FaWaitingStatus").textContent="Generating secure verification link..."),window.twoFactorUnsub){try{window.twoFactorUnsub()}catch{}window.twoFactorUnsub=null}let r="";try{const p=new Uint8Array(24);crypto.getRandomValues(p),r=Array.from(p,f=>f.toString(16).padStart(2,"0")).join("")}catch{r=Math.random().toString(36).substring(2)+Date.now().toString(36)+Math.random().toString(36).substring(2)}try{await setDoc(doc(db,"login_verifications",r),{token:r,uid:e.uid,email:o,expiry:Date.now()+600*1e3,used:!1,createdAt:Date.now()})}catch(p){console.error("[2FA] Error storing verification token:",p),a("txt2FaWaitingStatus")&&(a("txt2FaWaitingStatus").textContent="⚠️ Token error: "+(p.message||"Check connection."));return}let s="https://arenax.cyou";window.location.origin&&window.location.origin!=="null"&&!window.location.origin.startsWith("file:")&&(s=window.location.origin);const d=`${s}/?loginVerify=${r}`,c=`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirm Your ArenaX Login</title>
</head>
<body style="margin:0;padding:0;background-color:#05070a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#ffffff;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#05070a;padding:40px 15px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:520px;background-color:#0a0c12;border:1px solid #1f2538;border-radius:18px;overflow:hidden;box-shadow:0 20px 40px rgba(0,0,0,0.6);">
          <!-- Header Banner -->
          <tr>
            <td align="center" style="padding:32px 24px 20px 24px;background:linear-gradient(180deg,#121624 0%,#0a0c12 100%);border-bottom:1px solid #1a2030;">
              <div style="display:inline-block;padding:8px 16px;border-radius:30px;background-color:#161c2b;border:1px solid #28334d;margin-bottom:12px;">
                <span style="color:#f0c040;font-weight:900;font-size:16px;letter-spacing:2px;text-transform:uppercase;">ARENAX ESPORTS</span>
              </div>
              <h1 style="margin:8px 0 0 0;color:#ffffff;font-size:24px;font-weight:800;letter-spacing:0.5px;">Confirm Your Login</h1>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding:32px 28px;">
              <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#cbd5e1;">
                Hello <strong style="color:#ffffff;">${i}</strong>,
              </p>
              <p style="margin:0 0 24px 0;font-size:14px;line-height:1.6;color:#94a3b8;">
                We detected a login attempt to your ArenaX account. If this was you, click below to continue:
              </p>

              <!-- Prominent Gold Login Button -->
              <div style="text-align:center;margin:32px 0;">
                <a href="${d}" target="_blank" style="display:inline-block;padding:16px 40px;background:linear-gradient(135deg,#f0c040 0%,#d4a017 100%);color:#000000;font-size:16px;font-weight:900;letter-spacing:1px;text-decoration:none;border-radius:50px;box-shadow:0 6px 20px rgba(240,192,64,0.35);text-transform:uppercase;">
                  Login
                </a>
              </div>

              <div style="background-color:#0d111a;border-left:3px solid #f0c040;padding:14px 16px;border-radius:6px;margin:24px 0;">
                <p style="margin:0;font-size:13px;line-height:1.5;color:#94a3b8;">
                  ⚠️ <strong style="color:#cbd5e1;">Security Notice:</strong> If this wasn't you, ignore this email and consider changing your password immediately.
                </p>
              </div>

              <p style="margin:0;font-size:12px;line-height:1.5;color:#64748b;text-align:center;">
                This one-time verification link will expire in <strong style="color:#cbd5e1;">10 minutes</strong>.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding:20px;background-color:#07090d;border-top:1px solid #141824;">
              <p style="margin:0;font-size:11px;color:#475569;">
                &copy; ${new Date().getFullYear()} ArenaX Esports • Two-Factor Login Verification
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,u=window.location.hostname==="arenax.cyou"||window.location.hostname.endsWith("github.io")?"https://arena-x-beta.vercel.app":"";try{let p=await fetch(`${u}/api/send-email`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({to:o,subject:"Confirm Your ArenaX Login",htmlBody:c,recipientName:i})});(p.status===404||p.status===405)&&!u&&await fetch("https://arena-x-beta.vercel.app/api/send-email",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({to:o,subject:"Confirm Your ArenaX Login",htmlBody:c,recipientName:i})}),a("txt2FaWaitingStatus")&&(a("txt2FaWaitingStatus").textContent="Verification email sent! Waiting for your confirmation...")}catch(p){console.warn("[2FA] Email dispatch warning:",p),a("txt2FaWaitingStatus")&&(a("txt2FaWaitingStatus").textContent="Waiting for email confirmation...")}window.twoFactorUnsub=onSnapshot(doc(db,"login_verifications",r),p=>{p.exists()&&(p.data()||{}).used===!0&&(console.log("[2FA] Verification detected in real-time on waiting session!"),window.twoFactorUnsub&&(window.twoFactorUnsub(),window.twoFactorUnsub=null),sessionStorage.setItem("ax_2fa_verified_"+e.uid,"true"),a("mTwoFactorWaitingModal")&&a("mTwoFactorWaitingModal").classList.add("hidden"),kt())}),a("btnResend2FaEmail")&&(a("btnResend2FaEmail").onclick=async()=>{a("btnResend2FaEmail").disabled=!0,a("btnResend2FaEmail").innerHTML='<i class="fas fa-circle-notch animate-spin"></i> Resending...',await window.startTwoFactorLoginFlow(e,t),setTimeout(()=>{a("btnResend2FaEmail")&&(a("btnResend2FaEmail").disabled=!1,a("btnResend2FaEmail").innerHTML='<i class="fas fa-envelope"></i> Resend Verification Email')},15e3)}),a("btnCancel2FaWaiting")&&(a("btnCancel2FaWaiting").onclick=async()=>{window.twoFactorUnsub&&(window.twoFactorUnsub(),window.twoFactorUnsub=null),a("mTwoFactorWaitingModal")&&a("mTwoFactorWaitingModal").classList.add("hidden"),sessionStorage.removeItem("ax_2fa_verified_"+e.uid);try{await signOut(auth)}catch{}X("sLogin")})};window.checkLoginVerificationRoute=async function(){const t=new URLSearchParams(window.location.search).get("loginVerify");if(!t)return;window.ArenaSplash&&typeof window.ArenaSplash.finish=="function"&&window.ArenaSplash.finish(!0);const o=a("mLoginVerifyModal");o&&o.classList.remove("hidden"),a("mAuth")&&a("mAuth").classList.add("hidden"),a("loginVerifyStateLoading")&&a("loginVerifyStateLoading").classList.remove("hidden"),a("loginVerifyStateSuccess")&&a("loginVerifyStateSuccess").classList.add("hidden"),a("loginVerifyStateError")&&a("loginVerifyStateError").classList.add("hidden");const n=window.location.hostname==="arenax.cyou"||window.location.hostname.endsWith("github.io")?"https://arena-x-beta.vercel.app":"";try{let r=await fetch(`${n}/api/complete-login-verification?token=${encodeURIComponent(t.trim())}`);(r.status===404||r.status===405)&&!n&&(r=await fetch(`https://arena-x-beta.vercel.app/api/complete-login-verification?token=${encodeURIComponent(t.trim())}`));const s=await r.json();if(!r.ok||!s.success)throw new Error(s.error||"This login verification link is invalid or has expired.");s.uid&&sessionStorage.setItem("ax_2fa_verified_"+s.uid,"true"),a("loginVerifyStateLoading")&&a("loginVerifyStateLoading").classList.add("hidden"),a("loginVerifyStateSuccess")&&a("loginVerifyStateSuccess").classList.remove("hidden"),a("btnContinueToArenaX")&&(a("btnContinueToArenaX").onclick=()=>{o&&o.classList.add("hidden");try{const d=window.location.pathname+(window.location.hash||"");window.history.replaceState({},document.title,d)}catch{}auth.currentUser&&m?kt():X("sLogin")})}catch(r){a("loginVerifyStateLoading")&&a("loginVerifyStateLoading").classList.add("hidden"),a("loginVerifyStateError")&&a("loginVerifyStateError").classList.remove("hidden"),a("txtLoginVerifyErrorMsg")&&(a("txtLoginVerifyErrorMsg").textContent=r.message||"This login link is invalid or has expired."),a("btnRetryLogin2Fa")&&(a("btnRetryLogin2Fa").onclick=()=>{o&&o.classList.add("hidden");try{const s=window.location.pathname+(window.location.hash||"");window.history.replaceState({},document.title,s)}catch{}X("sLogin")})}};checkLoginVerificationRoute();
