/**
 * 3D პრევიუ: GLB მოდელი (public/models/engraving) + გრავირების ფენა.
 *
 * გრავირების ფენის გეომეტრია თითოეულ მოდელზე ცალკე, მისი ბადიდან არის
 * გაზომილი და რეალურ მილიმეტრებზეა მიბმული (იხ. PEN_GEOM / PLATE_GEOM):
 *   • კალამი — ღერძი, ამოწვის მიმართულება (სამაგრის მოპირდაპირე მხარე) და
 *     კორპუსის რადიუსი ზონის გასწვრივ (ცხრილით — კორპუსი ხშირად კონუსურია),
 *     ფენა ზედაპირს ~0.09 მმ-ით მიჰყვება. სიგრძე: 14 სმ (ოქროსფერი — 13.8 სმ).
 *   • ბრელოკი — ბრტყელი წინა და უკანა ზედაპირის სიბრტყე, ზონის ცენტრი და
 *     მასშტაბი ფირფიტის რეალური ზომიდან.
 * ტყავის ბრელოკის ფერი შეიცვლება მხოლოდ ტყავზე (ლითონის რგოლი უცვლელია):
 * შეიდერში ფერი მრავლდება მხოლოდ იქ, სადაც მასალა ლითონი არ არის.
 *
 * ref API: snapshot(side) → Promise<Blob PNG>, setView(side), isReady()
 */
import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { ENGRAVING_PRODUCTS, MODEL_VERSION, colorById, engraveLook } from "../../utils/engraving";
import styles from "./EngravingViewer.module.css";

/* ---------- მოდელების გაზომილი გეომეტრია (GLB-ის ლოკალურ ერთეულებში) ---------- */
// dir — ამოწვის მიმართულება ღერძის გარშემო (გრადუსი, +Z-იდან +Y-ისკენ);
// tipAtNegX — წვერი −X მხარესაა (ეკრანზე მარჯვნივ რომ მოხვდეს, 180°-ით ვაბრუნებთ).
const PEN_GEOM = {
  pen: {
    mmPerUnit: 138 / 1.9111,
    axis: [0, 0.019],
    dir: 0,
    tipAtNegX: true,
    zoneCenterX: -0.327,
    radius: [[-0.701, 0.0645], [-0.576, 0.0661], [-0.514, 0.0671], [-0.452, 0.068], [-0.389, 0.0689], [-0.327, 0.0695], [-0.265, 0.0705], [-0.202, 0.0713], [-0.14, 0.0721], [-0.078, 0.0729], [-0.015, 0.0737], [0.047, 0.0745]],
  },
  "pen-silver": {
    mmPerUnit: 140 / 1.8997,
    axis: [-0.0125, -0.0047],
    dir: -90,
    tipAtNegX: true,
    zoneCenterX: -0.27,
    radius: [[-0.61, 0.0689], [-0.553, 0.0715], [-0.497, 0.0731], [-0.44, 0.0753], [-0.383, 0.0764], [-0.327, 0.077], [-0.27, 0.0777], [-0.213, 0.0779], [-0.157, 0.078], [-0.1, 0.0778], [-0.043, 0.0774], [0.013, 0.0767], [0.07, 0.0759]],
  },
  "pen-fullsilver": {
    mmPerUnit: 140 / 1.9063,
    axis: [-0.0007, -0.0151],
    dir: 180,
    tipAtNegX: true,
    zoneCenterX: -0.29,
    radius: [[-0.617, 0.0578], [-0.563, 0.0595], [-0.508, 0.0611], [-0.454, 0.0625], [-0.399, 0.0635], [-0.344, 0.0649], [-0.29, 0.066], [-0.235, 0.0667], [-0.181, 0.0673], [-0.127, 0.0679], [-0.072, 0.0683], [-0.017, 0.0686], [0.037, 0.0686]],
  },
  "pen-red": {
    mmPerUnit: 140 / 1.9008,
    axis: [0.0098, -0.0005],
    dir: 90,
    tipAtNegX: false,
    zoneCenterX: 0.2865,
    radius: [[-0.08, 0.0762], [0.653, 0.0763]],
  },
  "pen-rifle": {
    mmPerUnit: 140 / 1.9119,
    axis: [-0.0085, -0.0414],
    dir: 0,
    tipAtNegX: true,
    zoneCenterX: 0.03,
    radius: [[-0.27, 0.0906], [-0.22, 0.0907], [-0.17, 0.0926], [-0.12, 0.0939], [-0.07, 0.0944], [-0.02, 0.0946], [0.03, 0.0947], [0.08, 0.0949], [0.13, 0.0949], [0.18, 0.0947], [0.23, 0.0936], [0.28, 0.092], [0.33, 0.0899]],
  },
};
const PEN_LIFT = 0.0012; // ~0.09 მმ — წახნაგები რომ არ გადაფარონ

const PLATE_GEOM = {
  keychain: { mmPerUnit: 35 / 0.977, center: [0, -0.468], zFront: 0.1404, zBack: -0.1429 },
  "keychain-round": { mmPerUnit: 40 / 1.0253, center: [0, -0.422], zFront: 0.064, zBack: -0.0676 },
  "leather-square": { mmPerUnit: 40 / 0.8367, center: [0, -0.335], zFront: 0.0477, zBack: -0.0449 },
  // ზონა თასმის კიდესა (y = −0.208) და ქვედა ნაკერს შორის
  "leather-round": { mmPerUnit: 50 / 1.1755, center: [-0.0016, -0.532], zFront: 0.0646, zBack: -0.0659 },
};
const PLATE_LIFT = 0.0008;

const VIEWS = {
  pen: { halfW: 1.08, halfH: 0.42 },
  keychain: { halfW: 0.62, halfH: 1.04 },
};

const lerpTable = (table, x) => {
  if (x <= table[0][0]) return table[0][1];
  for (let i = 1; i < table.length; i++) {
    const [x1, r1] = table[i];
    if (x <= x1) {
      const [x0, r0] = table[i - 1];
      return r0 + ((r1 - r0) * (x - x0)) / (x1 - x0);
    }
  }
  return table[table.length - 1][1];
};

function penShellGeometry(g, zoneMm) {
  const [lenMm, hMm] = zoneMm;
  const arc = hMm / g.mmPerUnit;
  const half = lenMm / g.mmPerUnit / 2;
  // u = 0 — ქუდის მხარე (ეკრანზე მარცხნივ), u = 1 — წვერის მხარე
  const x0 = g.tipAtNegX ? g.zoneCenterX + half : g.zoneCenterX - half;
  const x1 = g.tipAtNegX ? g.zoneCenterX - half : g.zoneCenterX + half;
  const phi = THREE.MathUtils.degToRad(g.dir);
  const segU = 120;
  const segV = 14;
  const pos = [];
  const nrm = [];
  const uv = [];
  const idx = [];
  for (let i = 0; i <= segU; i++) {
    const u = i / segU;
    const x = x0 + (x1 - x0) * u;
    const r = lerpTable(g.radius, x) + PEN_LIFT;
    const span = arc / r;
    for (let j = 0; j <= segV; j++) {
      const v = j / segV;
      // v = 1 (ტექსტურის ზედა კიდე) ეკრანზე ზემოთ უნდა მოხვდეს
      const th = (g.tipAtNegX ? 0.5 - v : v - 0.5) * span;
      const psi = phi + th;
      const sy = Math.sin(psi);
      const cz = Math.cos(psi);
      pos.push(x, g.axis[0] + r * sy, g.axis[1] + r * cz);
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
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(nrm, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  return geo;
}

function overlayMaterial() {
  return new THREE.MeshStandardMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
    roughness: 0.9,
    metalness: 0,
    emissive: new THREE.Color("#ffffff"),
    emissiveIntensity: 0,
    visible: false,
  });
}

function buildOverlays(productKey) {
  const zone = ENGRAVING_PRODUCTS[productKey].zoneMm;
  if (PEN_GEOM[productKey]) {
    const front = new THREE.Mesh(penShellGeometry(PEN_GEOM[productKey], zone), overlayMaterial());
    front.renderOrder = 2;
    return { front, back: null };
  }
  const g = PLATE_GEOM[productKey];
  const w = zone[0] / g.mmPerUnit;
  const h = zone[1] / g.mmPerUnit;
  const front = new THREE.Mesh(new THREE.PlaneGeometry(w, h), overlayMaterial());
  front.position.set(g.center[0], g.center[1], g.zFront + PLATE_LIFT);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(w, h), overlayMaterial());
  back.position.set(g.center[0], g.center[1], g.zBack - PLATE_LIFT);
  back.rotation.y = Math.PI; // უკნიდან რომ იკითხებოდეს
  front.renderOrder = 2;
  back.renderOrder = 2;
  return { front, back };
}

/** ტყავის ფერი: შეიდერში base color მრავლდება uTint-ზე მხოლოდ არალითონურ ნაწილზე */
function applyTint(root, tintUniform) {
  root.traverse((o) => {
    if (!o.isMesh || !o.material || o.material.userData.tintPatched) return;
    const mat = o.material;
    mat.userData.tintPatched = true;
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTint = tintUniform;
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <common>", "#include <common>\nuniform vec3 uTint;")
        .replace(
          "#include <metalnessmap_fragment>",
          "#include <metalnessmap_fragment>\n  diffuseColor.rgb *= mix(uTint, vec3(1.0), step(0.5, metalnessFactor));"
        );
    };
    mat.customProgramCacheKey = () => "engr-tint";
    mat.needsUpdate = true;
  });
}

const modelCache = new Map(); // url -> Promise<gltf>

/** GLB ჩატვირთვა; ქსელის გაწყვეტისას (მობილური ინტერნეტი) თავად ცდის კიდევ ორჯერ */
function loadModel(path, onProgress) {
  const url = `${path}?v=${MODEL_VERSION}`;
  if (!modelCache.has(url)) {
    const loader = new GLTFLoader();
    const attempt = (n) =>
      new Promise((resolve, reject) => {
        loader.load(url, resolve, onProgress, reject);
      }).catch((err) => {
        if (n >= 2) throw err;
        return new Promise((r) => setTimeout(r, 1500 * (n + 1))).then(() => attempt(n + 1));
      });
    const p = attempt(0);
    p.catch(() => modelCache.delete(url));
    modelCache.set(url, p);
  }
  return modelCache.get(url);
}

const disposeOverlays = (overlays) => {
  if (!overlays) return;
  for (const m of [overlays.front, overlays.back]) {
    if (!m) continue;
    m.material.map?.dispose();
    m.material.dispose();
    m.geometry.dispose();
  }
};

const EngravingViewer = forwardRef(function EngravingViewer({ productKey, color, textures }, ref) {
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
      productKey: null,
      tint: { value: new THREE.Color("#ffffff") },
      view: "front",
      suspended: false,
    };
    resize();

    return () => {
      ro.disconnect();
      if (frame) cancelAnimationFrame(frame);
      controls.dispose();
      disposeOverlays(threeRef.current?.overlays);
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
  const fitView = (side = "front", angled = false, aspectOverride = null) => {
    const t = threeRef.current;
    if (!t || !t.productKey) return;
    const v = VIEWS[ENGRAVING_PRODUCTS[t.productKey].category];
    const aspect = aspectOverride || t.camera.aspect || 1;
    const tanV = Math.tan(THREE.MathUtils.degToRad(t.camera.fov / 2));
    const dist = Math.max(v.halfH / tanV, v.halfW / (tanV * aspect));
    const target = new THREE.Vector3(0, 0, 0);
    const dir = side === "back" ? new THREE.Vector3(0, 0, -1) : new THREE.Vector3(0, 0, 1);
    if (angled) {
      // ოდნავ ზემოდან და გვერდიდან — რომ მოცულობა ჩანდეს
      dir.add(new THREE.Vector3(side === "back" ? -0.28 : 0.28, 0.18, 0)).normalize();
    }
    t.camera.position.copy(target).addScaledVector(dir, dist);
    t.camera.up.set(0, 1, 0);
    t.controls.target.copy(target);
    t.controls.minDistance = dist * 0.35;
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
          disposeOverlays(t.overlays);
        }
        // outer: წვერი მარჯვნივ; inner: ამოწვის მხარე კამერისკენ
        const outer = new THREE.Group();
        const inner = new THREE.Group();
        outer.add(inner);
        inner.add(gltf.scene);
        const overlays = buildOverlays(productKey);
        inner.add(overlays.front);
        if (overlays.back) inner.add(overlays.back);
        const pg = PEN_GEOM[productKey];
        if (pg) {
          inner.rotation.x = THREE.MathUtils.degToRad(pg.dir);
          if (pg.tipAtNegX) outer.rotation.z = Math.PI;
        }
        if (product.colors) applyTint(gltf.scene, t.tint);
        t.scene.add(outer);
        t.root = outer;
        t.overlays = overlays;
        t.productKey = productKey;
        t.applyColor?.();
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

  /* ---------- ტყავის ფერი ---------- */
  useEffect(() => {
    const t = threeRef.current;
    if (!t) return;
    t.applyColor = () => {
      const c = colorById(productKey, color);
      t.tint.value.set(c ? c.tint : "#ffffff");
      t.tint.value.multiplyScalar(ENGRAVING_PRODUCTS[productKey]?.tintBoost || 1);
      t.render();
    };
    t.applyColor();
  }, [productKey, color]);

  /* ---------- გრავირების ტექსტურები ---------- */
  useEffect(() => {
    const t = threeRef.current;
    if (!t) return;
    t.applyTextures = () => {
      const tt = threeRef.current;
      if (!tt?.overlays || tt.productKey !== productKey) return;
      const look = engraveLook(productKey, color);
      for (const side of ["front", "back"]) {
        const mesh = tt.overlays[side];
        if (!mesh) continue;
        const src = textures?.[side] || null;
        const mat = mesh.material;
        mat.metalness = look.metalness;
        mat.roughness = look.roughness;
        mat.emissiveIntensity = look.glow || 0;
        if (mat.userData.src !== src) {
          mat.map?.dispose();
          if (src) {
            const tex = new THREE.CanvasTexture(src);
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.anisotropy = tt.renderer.capabilities.getMaxAnisotropy();
            mat.map = tex;
            mat.emissiveMap = tex;
            mat.visible = true;
          } else {
            mat.map = null;
            mat.emissiveMap = null;
            mat.visible = false;
          }
          mat.userData.src = src;
          mat.needsUpdate = true;
        }
      }
      tt.render();
    };
    t.applyTextures();
  }, [textures, productKey, color]);

  /* ---------- ref API ---------- */
  useImperativeHandle(ref, () => ({
    setView: (side) => fitView(side, true),
    isReady: () => !!threeRef.current?.overlays && threeRef.current.productKey === productKey,
    async snapshot(side = "front") {
      const t = threeRef.current;
      if (!t?.overlays) throw new Error("viewer not ready");
      const [w, h] = ENGRAVING_PRODUCTS[productKey].category === "pen" ? [1600, 600] : [1000, 1000];
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
