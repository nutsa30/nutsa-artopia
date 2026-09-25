/**
 * 3D პრევიუ: GLB მოდელი (public/models/engraving) + გრავირების ფენა.
 *
 * გრავირების ფენის გეომეტრია თითოეულ მოდელზე ცალკე, მისი ბადის ზომებიდან
 * არის გაზომილი (კალმის ღერძი/რადიუსი, ბრელოკის ზედაპირი) და რეალურ
 * მილიმეტრებზეა მიბმული:
 *   • კალამი — 138 მმ = 1.911 ერთეული → 72.2 მმ/ერთ. ზონა 54×6 მმ ქვედა ნაწილზე
 *     (რგოლსა და წვერს შორის), სამაგრის მოპირდაპირე მხარეს. კორპუსი ოდნავ
 *     კონუსურია, ამიტომ ფენაც კონუსურია — ტექსტი ზედაპირს ზუსტად მიჰყვება.
 *   • ბრელოკი — ფირფიტა 35 მმ = 0.977 ერთეული → 35.8 მმ/ერთ. ზონა 29×29 მმ
 *     ბრტყელ ზედაპირზე, წინა და უკანა მხარეს.
 *
 * ref API: snapshot(side) → Promise<Blob PNG>, setView(side)
 */
import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { ENGRAVING_PRODUCTS } from "../../utils/engraving";
import styles from "./EngravingViewer.module.css";

/* ---------- მოდელების გაზომილი გეომეტრია (GLB-ის ლოკალურ ერთეულებში) ---------- */
const PEN_MM_PER_UNIT = 138 / 1.911;
const PEN = {
  xCap: 0.047, // ზონის კიდე რგოლის მხარეს (+x — ქუდისკენ)
  xTip: -0.701, // ზონის კიდე წვერის მხარეს
  axisY: 0,
  axisZ: 0.019, // კორპუსის ღერძი (სამაგრი −z მხარესაა)
  radius: (x) => 0.073 + 0.01187 * (x - 0.019), // კონუსური კორპუსი
  lift: 0.0012, // ფენა ზედაპირიდან ~0.09 მმ-ით — წახნაგები რომ არ გადაფაროს
};
const KEY_MM_PER_UNIT = 35 / 0.977;
const KEY = {
  cx: 0,
  cy: -0.468,
  zFront: 0.14,
  zBack: -0.1425,
  lift: 0.0008,
};

const VIEWS = {
  pen: { target: [0, 0, 0], halfW: 1.08, halfH: 0.42 },
  keychain: { target: [0, 0, 0], halfW: 0.62, halfH: 1.04 },
};

function penShellGeometry(zoneMm) {
  const [lenMm, hMm] = zoneMm;
  const arc = hMm / PEN_MM_PER_UNIT;
  const segU = 96;
  const segV = 12;
  const pos = [];
  const nrm = [];
  const uv = [];
  const idx = [];
  // ზონის სიგრძე მმ-ით: ცენტრი რგოლ-წვერს შორის
  const mid = (PEN.xCap + PEN.xTip) / 2;
  const half = lenMm / PEN_MM_PER_UNIT / 2;
  const x0 = mid + half; // u = 0 (ქუდის მხარე, ეკრანზე მარცხნივ)
  const x1 = mid - half; // u = 1 (წვერის მხარე)
  for (let i = 0; i <= segU; i++) {
    const u = i / segU;
    const x = x0 + (x1 - x0) * u;
    const r = PEN.radius(x) + PEN.lift;
    const span = arc / r;
    for (let j = 0; j <= segV; j++) {
      const v = j / segV;
      const th = (0.5 - v) * span; // v = 1 → −y ლოკალურად → ზემოთ ეკრანზე
      const sy = Math.sin(th);
      const cz = Math.cos(th);
      pos.push(x, PEN.axisY + r * sy, PEN.axisZ + r * cz);
      nrm.push(0, sy, cz);
      uv.push(u, v);
    }
  }
  const row = segV + 1;
  for (let i = 0; i < segU; i++) {
    for (let j = 0; j < segV; j++) {
      const a = i * row + j;
      const b = a + row;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

function overlayMaterial(productKey) {
  const pen = productKey === "pen";
  return new THREE.MeshStandardMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
    roughness: pen ? 0.6 : 0.95,
    metalness: pen ? 0.15 : 0,
    visible: false,
  });
}

function buildOverlays(productKey) {
  const zone = ENGRAVING_PRODUCTS[productKey].zoneMm;
  if (productKey === "pen") {
    const front = new THREE.Mesh(penShellGeometry(zone), overlayMaterial(productKey));
    front.renderOrder = 2;
    return { front, back: null };
  }
  const size = zone[0] / KEY_MM_PER_UNIT;
  const front = new THREE.Mesh(new THREE.PlaneGeometry(size, size), overlayMaterial(productKey));
  front.position.set(KEY.cx, KEY.cy, KEY.zFront + KEY.lift);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(size, size), overlayMaterial(productKey));
  back.position.set(KEY.cx, KEY.cy, KEY.zBack - KEY.lift);
  back.rotation.y = Math.PI; // უკნიდან რომ იკითხებოდეს
  front.renderOrder = 2;
  back.renderOrder = 2;
  return { front, back };
}

const modelCache = new Map(); // url -> Promise<gltf>

function loadModel(url, onProgress) {
  if (!modelCache.has(url)) {
    const loader = new GLTFLoader();
    const p = new Promise((resolve, reject) => {
      loader.load(url, resolve, onProgress, reject);
    });
    p.catch(() => modelCache.delete(url));
    modelCache.set(url, p);
  }
  return modelCache.get(url);
}

const EngravingViewer = forwardRef(function EngravingViewer({ productKey, textures }, ref) {
  const hostRef = useRef(null);
  const threeRef = useRef(null);
  const [status, setStatus] = useState({ loading: false, progress: 0, error: "" });

  /* ---------- სცენა (ერთხელ) ---------- */
  useEffect(() => {
    const host = hostRef.current;
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true, // snapshot-ისთვის
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    const key = new THREE.DirectionalLight(0xffffff, 1.4);
    key.position.set(1.5, 2.5, 3);
    scene.add(key);
    scene.add(new THREE.AmbientLight(0xffffff, 0.25));

    const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 50);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.rotateSpeed = 0.8;

    let frame = 0;
    const render = () => {
      if (threeRef.current?.suspended) return;
      renderer.render(scene, camera);
    };
    const tick = () => {
      frame = 0;
      const moving = controls.update();
      render();
      if (moving) frame = requestAnimationFrame(tick);
    };
    const requestRender = () => {
      if (!frame) frame = requestAnimationFrame(tick);
      // rAF ფარულ ჩანართში არ მუშაობს — ცვლილება მაინც დაიხატოს
      render();
    };
    controls.addEventListener("change", requestRender);
    controls.addEventListener("start", () => {
      if (!frame) frame = requestAnimationFrame(tick);
    });

    const resize = () => {
      const w = host.clientWidth || 1;
      const h = host.clientHeight || 1;
      renderer.setSize(w, h, true);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      render();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    threeRef.current = {
      renderer,
      scene,
      camera,
      controls,
      render,
      requestRender,
      root: null,
      overlays: null,
      view: "front",
      suspended: false,
    };
    resize();

    return () => {
      ro.disconnect();
      if (frame) cancelAnimationFrame(frame);
      controls.dispose();
      const t = threeRef.current;
      if (t?.overlays) {
        for (const m of [t.overlays.front, t.overlays.back]) {
          if (!m) continue;
          m.material.map?.dispose();
          m.material.dispose();
          m.geometry.dispose();
        }
      }
      envTex.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.forceContextLoss?.();
      renderer.domElement.remove();
      threeRef.current = null;
      if (import.meta.env.DEV) delete window.__engravingViewer;
    };
  }, []);

  /* ---------- კამერის ხედები ---------- */
  const fitView = (side = "front", animate = false, aspectOverride = null) => {
    const t = threeRef.current;
    if (!t || !t.productKey) return;
    const v = VIEWS[t.productKey];
    const aspect = aspectOverride || t.camera.aspect || 1;
    const tanV = Math.tan(THREE.MathUtils.degToRad(t.camera.fov / 2));
    const dist = Math.max(v.halfH / tanV, v.halfW / (tanV * aspect));
    const target = new THREE.Vector3(...v.target);
    const dir = side === "back" ? new THREE.Vector3(0, 0, -1) : new THREE.Vector3(0, 0, 1);
    if (animate) {
      // ოდნავ ზემოდან და გვერდიდან — რომ მოცულობა ჩანდეს
      dir.add(new THREE.Vector3(side === "back" ? -0.28 : 0.28, 0.18, 0)).normalize();
    }
    t.camera.position.copy(target).addScaledVector(dir, dist);
    t.camera.up.set(0, 1, 0);
    t.controls.target.copy(target);
    t.controls.minDistance = dist * 0.45;
    t.controls.maxDistance = dist * 1.8;
    t.camera.updateProjectionMatrix();
    t.controls.update();
    t.view = side;
    t.render();
  };

  /* ---------- მოდელის ჩატვირთვა ---------- */
  useEffect(() => {
    const t = threeRef.current;
    if (!t || !productKey) return undefined;
    let cancelled = false;
    const product = ENGRAVING_PRODUCTS[productKey];
    setStatus({ loading: true, progress: 0, error: "" });

    loadModel(product.model, (e) => {
      if (!cancelled && e.total) {
        setStatus((s) => ({ ...s, progress: Math.round((e.loaded / e.total) * 100) }));
      }
    })
      .then((gltf) => {
        if (cancelled || !threeRef.current) return;
        if (t.root) {
          t.scene.remove(t.root);
          if (t.overlays) {
            for (const m of [t.overlays.front, t.overlays.back]) {
              if (!m) continue;
              m.material.map?.dispose();
              m.material.dispose();
              m.geometry.dispose();
            }
          }
        }
        const root = new THREE.Group();
        root.add(gltf.scene);
        const overlays = buildOverlays(productKey);
        root.add(overlays.front);
        if (overlays.back) root.add(overlays.back);
        if (productKey === "pen") root.rotation.z = Math.PI; // წვერი მარჯვნივ, წარწერა კამერისკენ
        t.scene.add(root);
        t.root = root;
        t.overlays = overlays;
        t.productKey = productKey;
        t.fitView = fitView;
        fitView("front", true);
        setStatus({ loading: false, progress: 100, error: "" });
        t.applyTextures?.();
      })
      .catch((err) => {
        console.error("engraving model load failed:", err);
        if (!cancelled) {
          setStatus({ loading: false, progress: 0, error: "3D მოდელი ვერ ჩაიტვირთა — გადატვირთეთ გვერდი" });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [productKey]);

  /* ---------- გრავირების ტექსტურები ---------- */
  useEffect(() => {
    const t = threeRef.current;
    if (!t) return;
    t.applyTextures = () => {
      const tt = threeRef.current;
      if (!tt?.overlays || tt.productKey !== productKey) return;
      for (const side of ["front", "back"]) {
        const mesh = tt.overlays[side];
        if (!mesh) continue;
        const src = textures?.[side] || null;
        const mat = mesh.material;
        if (mat.userData.src === src) continue;
        mat.map?.dispose();
        if (src) {
          const tex = new THREE.CanvasTexture(src);
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.anisotropy = tt.renderer.capabilities.getMaxAnisotropy();
          mat.map = tex;
          mat.visible = true;
        } else {
          mat.map = null;
          mat.visible = false;
        }
        mat.userData.src = src;
        mat.needsUpdate = true;
      }
      tt.render();
    };
    t.applyTextures();
  }, [textures, productKey]);

  /* ---------- ref API ---------- */
  useImperativeHandle(ref, () => ({
    setView: (side) => fitView(side, true),
    isReady: () => !!threeRef.current?.overlays && threeRef.current.productKey === productKey,
    async snapshot(side = "front") {
      const t = threeRef.current;
      if (!t?.overlays) throw new Error("viewer not ready");
      const [w, h] = productKey === "pen" ? [1600, 600] : [1000, 1000];
      const prev = {
        pos: t.camera.position.clone(),
        target: t.controls.target.clone(),
        aspect: t.camera.aspect,
        ratio: t.renderer.getPixelRatio(),
        bg: t.scene.background,
        view: t.view,
        minD: t.controls.minDistance,
        maxD: t.controls.maxDistance,
      };
      t.suspended = true;
      try {
        t.renderer.setPixelRatio(1);
        t.renderer.setSize(w, h, false);
        t.camera.aspect = w / h;
        t.scene.background = new THREE.Color("#eef1f5");
        t.suspended = false;
        fitView(side, false, w / h); // პირდაპირ, წარწერის მხრიდან
        t.renderer.render(t.scene, t.camera);
        t.suspended = true;
        return await new Promise((resolve, reject) =>
          t.renderer.domElement.toBlob((b) => (b ? resolve(b) : reject(new Error("snapshot failed"))), "image/png")
        );
      } finally {
        t.scene.background = prev.bg;
        t.renderer.setPixelRatio(prev.ratio);
        const host = hostRef.current;
        t.renderer.setSize(host.clientWidth || 1, host.clientHeight || 1, true);
        t.camera.aspect = prev.aspect;
        t.camera.position.copy(prev.pos);
        t.controls.target.copy(prev.target);
        t.controls.minDistance = prev.minD;
        t.controls.maxDistance = prev.maxD;
        t.camera.updateProjectionMatrix();
        t.controls.update();
        t.view = prev.view;
        t.suspended = false;
        t.render();
      }
    },
  }));

  useEffect(() => {
    if (import.meta.env.DEV) window.__engravingViewer = threeRef.current;
  });

  return (
    <div className={styles.viewer}>
      <div ref={hostRef} className={styles.canvasHost} />
      {status.loading && (
        <div className={styles.overlay}>
          <div className={styles.spinner} />
          <span>3D მოდელი იტვირთება… {status.progress ? `${status.progress}%` : ""}</span>
        </div>
      )}
      {status.error && <div className={styles.overlay}>{status.error}</div>}
    </div>
  );
});

export default EngravingViewer;
