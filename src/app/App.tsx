import { useState, useEffect, useRef, useCallback } from "react";

// ─── Saliency Map Demo ───────────────────────────────────────────────────────

const GRID = 14;

function seededRandom(seed: number) {
  const x = Math.sin(seed + 1) * 43758.5453;
  return x - Math.floor(x);
}

function buildSaliency(classIdx: number) {
  return Array.from({ length: GRID * GRID }, (_, i) => {
    const row = Math.floor(i / GRID);
    const col = i % GRID;
    const cx = [7, 4, 10][classIdx % 3];
    const cy = [7, 9, 5][classIdx % 3];
    const dist = Math.sqrt((col - cx) ** 2 + (row - cy) ** 2);
    const base = Math.max(0, 1 - dist / 6.5);
    const noise = seededRandom(i * 7 + classIdx * 131) * 0.22;
    return Math.min(1, base * 1.2 + noise);
  });
}

const CLASSES = ["golden retriever", "tabby cat", "fire truck"];
const CLASS_COLORS = ["#f59e0b", "#a78bfa", "#f87171"];

function SaliencyMapDemo() {
  const [classIdx, setClassIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [running, setRunning] = useState(false);
  const target = buildSaliency(classIdx);
  const [current, setCurrent] = useState(() => Array(GRID * GRID).fill(0));
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);

  const runBackprop = useCallback(() => {
    setRunning(true);
    setProgress(0);
    setCurrent(Array(GRID * GRID).fill(0));
    startRef.current = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startRef.current;
      const t = Math.min(elapsed / 1400, 1);
      setProgress(t);
      setCurrent(target.map(v => v * t + seededRandom(v * 1000) * 0.05 * (1 - t)));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setCurrent(target);
        setRunning(false);
      }
    };
    rafRef.current = requestAnimationFrame(animate);
  }, [classIdx]);

  useEffect(() => {
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  useEffect(() => {
    runBackprop();
  }, [classIdx]);

  const color = CLASS_COLORS[classIdx];

  return (
    <div className="rounded-lg border border-border overflow-hidden" style={{ background: "#0a0f1e" }}>
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <span className="mono text-xs text-muted-foreground">vanilla gradient saliency</span>
        <div className="flex gap-1">
          {CLASSES.map((c, i) => (
            <button
              key={c}
              onClick={() => setClassIdx(i)}
              className="mono text-xs px-3 py-1 rounded transition-all"
              style={{
                background: classIdx === i ? CLASS_COLORS[i] + "22" : "transparent",
                color: classIdx === i ? CLASS_COLORS[i] : "#6e7d99",
                border: `1px solid ${classIdx === i ? CLASS_COLORS[i] + "55" : "transparent"}`,
              }}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="p-5 flex gap-6 items-start flex-wrap md:flex-nowrap">
        {/* Fake "photo" behind saliency */}
        <div className="relative flex-shrink-0" style={{ width: GRID * 18, height: GRID * 18 }}>
          {/* Base image suggestion */}
          <div className="absolute inset-0 rounded overflow-hidden" style={{
            background: "linear-gradient(135deg, #1a1f35 0%, #111827 100%)",
          }}>
            {Array.from({ length: GRID * GRID }, (_, i) => {
              const row = Math.floor(i / GRID);
              const col = i % GRID;
              const base = seededRandom(i * 3 + 17) * 0.08;
              return (
                <div key={i} style={{
                  position: "absolute",
                  left: col * 18,
                  top: row * 18,
                  width: 18,
                  height: 18,
                  background: `rgba(${[classIdx === 0 ? "180,140,80" : classIdx === 1 ? "120,100,160" : "180,80,80"][0]},${base})`,
                }} />
              );
            })}
          </div>

          {/* Saliency overlay */}
          {Array.from({ length: GRID * GRID }, (_, i) => {
            const row = Math.floor(i / GRID);
            const col = i % GRID;
            const v = current[i] ?? 0;
            const alpha = v * 0.88;
            const [r, g, b] = classIdx === 0
              ? [245, 158, 11]
              : classIdx === 1
              ? [167, 139, 250]
              : [248, 113, 113];
            return (
              <div key={i} style={{
                position: "absolute",
                left: col * 18,
                top: row * 18,
                width: 17,
                height: 17,
                borderRadius: 2,
                background: `rgba(${r},${g},${b},${alpha})`,
                transition: "background 0.06s",
              }} />
            );
          })}

          {/* Progress bar */}
          {running && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: "rgba(255,255,255,0.08)" }}>
              <div className="h-full transition-all" style={{ width: `${progress * 100}%`, background: color }} />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 flex-1">
          <div>
            <div className="mono text-xs mb-1" style={{ color }}>predicted class</div>
            <div className="display text-xl font-light" style={{ color: "#dde3ed" }}>{CLASSES[classIdx]}</div>
          </div>
          <div>
            <div className="mono text-xs text-muted-foreground mb-1">confidence</div>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                <div className="h-full rounded-full" style={{ width: "87%", background: color, transition: "width 0.8s ease" }} />
              </div>
              <span className="mono text-xs" style={{ color }}>87.3%</span>
            </div>
          </div>
          <div className="mt-2">
            <div className="mono text-xs text-muted-foreground mb-2">gradient magnitude</div>
            <div className="flex gap-2 items-center">
              <div className="w-2 h-2 rounded-full" style={{ background: color }} />
              <span className="mono text-xs text-muted-foreground">high activation</span>
            </div>
            <div className="flex gap-2 items-center mt-1">
              <div className="w-2 h-2 rounded-full" style={{ background: "rgba(13,18,32,0.6)", border: "1px solid #2a3550" }} />
              <span className="mono text-xs text-muted-foreground">no contribution</span>
            </div>
          </div>
          <button
            onClick={runBackprop}
            disabled={running}
            className="mt-2 mono text-xs px-4 py-2 rounded border transition-all self-start"
            style={{
              border: `1px solid ${running ? "transparent" : color + "55"}`,
              color: running ? "#6e7d99" : color,
              background: running ? "rgba(255,255,255,0.03)" : color + "11",
            }}
          >
            {running ? "propagating…" : "re-run backprop →"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── J-Space Viz ─────────────────────────────────────────────────────────────

const JSPACE_CLASSES = [
  { name: "canines", color: "#f59e0b", center: [0.28, 0.35], spread: 0.12, n: 24 },
  { name: "felines", color: "#a78bfa", center: [0.52, 0.22], spread: 0.1, n: 20 },
  { name: "vehicles", color: "#f87171", center: [0.72, 0.65], spread: 0.11, n: 22 },
  { name: "structures", color: "#6ee7b7", center: [0.35, 0.72], spread: 0.1, n: 18 },
  { name: "text/symbols", color: "#60a5fa", center: [0.7, 0.38], spread: 0.09, n: 16 },
];

function buildPoints() {
  return JSPACE_CLASSES.flatMap((cls, ci) =>
    Array.from({ length: cls.n }, (_, i) => {
      const angle = seededRandom(ci * 50 + i) * Math.PI * 2;
      const r = seededRandom(ci * 100 + i * 3) * cls.spread;
      return {
        x: cls.center[0] + Math.cos(angle) * r,
        y: cls.center[1] + Math.sin(angle) * r,
        cls: ci,
        color: cls.color,
        name: cls.name,
      };
    })
  );
}

const JSPACE_POINTS = buildPoints();

function JSpaceViz() {
  const [hoveredCls, setHoveredCls] = useState<number | null>(null);
  const [animStep, setAnimStep] = useState(0);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setAnimStep(s => (s + 1) % 360), 40);
    return () => clearInterval(id);
  }, [playing]);

  const W = 340, H = 280;

  return (
    <div className="rounded-lg border border-border overflow-hidden" style={{ background: "#0a0f1e" }}>
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <span className="mono text-xs text-muted-foreground">Jacobian feature space — ResNet-50 layer 4</span>
        <button
          onClick={() => setPlaying(p => !p)}
          className="mono text-xs px-2 py-1 rounded border border-border text-muted-foreground hover:text-foreground transition-colors"
        >
          {playing ? "pause" : "play"}
        </button>
      </div>
      <div className="p-5 flex gap-5 items-start flex-wrap md:flex-nowrap">
        <svg width={W} height={H} style={{ flexShrink: 0 }}>
          <defs>
            <radialGradient id="bg-grad" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor="rgba(139,159,255,0.04)" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
          </defs>
          <rect width={W} height={H} fill="url(#bg-grad)" />

          {/* Subtle grid */}
          {[0.25, 0.5, 0.75].map(t => (
            <g key={t} stroke="rgba(255,255,255,0.04)" strokeWidth="1">
              <line x1={t * W} y1={0} x2={t * W} y2={H} />
              <line x1={0} y1={t * H} x2={W} y2={t * H} />
            </g>
          ))}

          {/* Convex hulls (very approximate) */}
          {JSPACE_CLASSES.map((cls, ci) => {
            const pts = JSPACE_POINTS.filter(p => p.cls === ci);
            if (!pts.length) return null;
            const hull = pts.map(p => `${p.x * W},${p.y * H}`).join(" ");
            return (
              <polygon
                key={ci}
                points={hull}
                fill={cls.color}
                fillOpacity={hoveredCls === ci ? 0.07 : 0.03}
                stroke={cls.color}
                strokeOpacity={hoveredCls === ci ? 0.3 : 0.1}
                strokeWidth="1"
                style={{ transition: "fill-opacity 0.2s" }}
              />
            );
          })}

          {/* Points */}
          {JSPACE_POINTS.map((pt, i) => {
            const wobble = playing
              ? Math.sin((animStep + i * 37) * 0.035) * 1.8
              : 0;
            const wobble2 = playing
              ? Math.cos((animStep + i * 53) * 0.028) * 1.4
              : 0;
            const dim = hoveredCls !== null && hoveredCls !== pt.cls;
            return (
              <circle
                key={i}
                cx={pt.x * W + wobble}
                cy={pt.y * H + wobble2}
                r={hoveredCls === pt.cls ? 4.5 : 3}
                fill={pt.color}
                fillOpacity={dim ? 0.12 : 0.75}
                style={{ transition: "all 0.2s" }}
                onMouseEnter={() => setHoveredCls(pt.cls)}
                onMouseLeave={() => setHoveredCls(null)}
              />
            );
          })}

          {/* Labels */}
          {JSPACE_CLASSES.map((cls, ci) => (
            <text
              key={ci}
              x={cls.center[0] * W}
              y={cls.center[1] * H - 14}
              textAnchor="middle"
              fontSize="9"
              fill={cls.color}
              fillOpacity={hoveredCls === null || hoveredCls === ci ? 0.9 : 0.3}
              fontFamily="DM Mono, monospace"
              style={{ transition: "fill-opacity 0.2s", userSelect: "none" }}
            >
              {cls.name}
            </text>
          ))}
        </svg>

        <div className="flex flex-col gap-3">
          <p className="text-xs text-muted-foreground leading-relaxed" style={{ fontWeight: 300, fontSize: "0.8rem" }}>
            Each point is an image projected through the network's Jacobian matrix — a linearization
            of how the model responds to local perturbations around that input.
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed" style={{ fontWeight: 300, fontSize: "0.8rem" }}>
            Semantically similar images cluster tightly, suggesting the Jacobian encodes
            category structure even in mid-layer representations.
          </p>
          <div className="mt-2 space-y-1.5">
            {JSPACE_CLASSES.map((cls, i) => (
              <div key={i} className="flex items-center gap-2"
                onMouseEnter={() => setHoveredCls(i)}
                onMouseLeave={() => setHoveredCls(null)}
              >
                <div className="w-2 h-2 rounded-full" style={{ background: cls.color }} />
                <span className="mono text-xs" style={{
                  color: hoveredCls === i ? cls.color : "#6e7d99",
                  transition: "color 0.15s"
                }}>{cls.name}</span>
                <span className="mono text-xs text-muted-foreground ml-auto">{cls.n} samples</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Attention viz ────────────────────────────────────────────────────────────

const PATCH_N = 7;
const ATTN_HEADS = ["head 0", "head 3", "head 7", "head 11"];

function buildAttn(head: number, query: number) {
  return Array.from({ length: PATCH_N * PATCH_N }, (_, i) => {
    const qrow = Math.floor(query / PATCH_N);
    const qcol = query % PATCH_N;
    const row = Math.floor(i / PATCH_N);
    const col = i % PATCH_N;
    const dist = Math.sqrt((col - qcol) ** 2 + (row - qrow) ** 2);
    const base = Math.exp(-dist * (0.5 + head * 0.15));
    const noise = seededRandom(i * 11 + head * 77 + query * 13) * 0.18;
    return Math.min(1, base + noise);
  });
}

function AttentionViz() {
  const [head, setHead] = useState(0);
  const [query, setQuery] = useState(Math.floor(PATCH_N / 2) * PATCH_N + Math.floor(PATCH_N / 2));
  const attn = buildAttn(head, query);
  const maxV = Math.max(...attn);

  return (
    <div className="rounded-lg border border-border overflow-hidden" style={{ background: "#0a0f1e" }}>
      <div className="px-5 py-4 border-b border-border flex items-center gap-4 flex-wrap">
        <span className="mono text-xs text-muted-foreground">ViT attention — click to set query patch</span>
        <div className="flex gap-1 ml-auto">
          {ATTN_HEADS.map((h, i) => (
            <button
              key={h}
              onClick={() => setHead(i)}
              className="mono text-xs px-2 py-0.5 rounded transition-all"
              style={{
                background: head === i ? "rgba(139,159,255,0.15)" : "transparent",
                color: head === i ? "#8b9fff" : "#6e7d99",
                border: `1px solid ${head === i ? "rgba(139,159,255,0.4)" : "transparent"}`,
              }}
            >
              {h}
            </button>
          ))}
        </div>
      </div>

      <div className="p-5 flex gap-6 flex-wrap md:flex-nowrap items-start">
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${PATCH_N}, 36px)`, gap: 2, flexShrink: 0 }}>
          {Array.from({ length: PATCH_N * PATCH_N }, (_, i) => {
            const v = attn[i] / maxV;
            const isQuery = i === query;
            return (
              <div
                key={i}
                onClick={() => setQuery(i)}
                style={{
                  width: 36, height: 36,
                  borderRadius: 4,
                  background: isQuery
                    ? "#e2a44b"
                    : `rgba(139,159,255,${v * 0.85})`,
                  outline: isQuery ? "2px solid #e2a44b" : "none",
                  outlineOffset: 1,
                  cursor: "pointer",
                  transition: "background 0.2s",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {isQuery && (
                  <span style={{ fontSize: 10, color: "#070b14", fontFamily: "DM Mono" }}>Q</span>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex flex-col gap-3 text-xs text-muted-foreground" style={{ fontWeight: 300, fontSize: "0.8rem" }}>
          <p className="leading-relaxed">
            The orange patch is the <span className="mono" style={{ color: "#e2a44b" }}>query</span> — the patch
            asking "which other patches am I attending to?" Brighter blue indicates higher attention weight.
          </p>
          <p className="leading-relaxed">
            Different heads learn qualitatively different attention patterns.
            Early heads tend toward local patterns; later heads show long-range semantic structure.
          </p>
          <div className="mt-2 flex items-center gap-3">
            <div className="mono text-xs text-muted-foreground">low attention</div>
            <div className="h-2 w-24 rounded-sm" style={{
              background: "linear-gradient(to right, rgba(13,18,32,1), rgba(139,159,255,1))"
            }} />
            <div className="mono text-xs text-muted-foreground">high</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Activation Maximization ──────────────────────────────────────────────────

const NEURON_PATTERNS = [
  { label: "layer 1 · neuron 23", desc: "Gabor edge detector (45°)", freq: 4, angle: 45 },
  { label: "layer 2 · neuron 71", desc: "high-frequency texture", freq: 8, angle: 90 },
  { label: "layer 3 · neuron 142", desc: "curve / arc detector", freq: 2.5, angle: 30 },
  { label: "layer 4 · neuron 8", desc: "color blob (warm)", freq: 1, angle: 0 },
];

function PatternCell({ pattern, size = 80 }: { pattern: typeof NEURON_PATTERNS[0]; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const phaseRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const N = size;

    const draw = () => {
      phaseRef.current += 0.025;
      const phase = phaseRef.current;
      const { freq, angle, label } = pattern;
      const rad = (angle * Math.PI) / 180;
      const imgData = ctx.createImageData(N, N);

      for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
          const nx = (x / N - 0.5) * 2;
          const ny = (y / N - 0.5) * 2;

          let v: number;
          if (label.includes("neuron 8")) {
            const dist = Math.sqrt(nx * nx + ny * ny);
            v = Math.exp(-dist * 2) * (0.7 + 0.3 * Math.cos(phase));
          } else if (label.includes("neuron 142")) {
            const r = Math.sqrt(nx * nx + ny * ny);
            v = Math.cos(r * freq * Math.PI + phase) * Math.exp(-r * 1.2);
            v = v * 0.5 + 0.5;
          } else {
            const proj = nx * Math.cos(rad) + ny * Math.sin(rad);
            const gauss = Math.exp(-(nx * nx + ny * ny) * 1.8);
            v = Math.cos(proj * freq * Math.PI + phase) * gauss;
            v = v * 0.5 + 0.5;
          }

          const idx = (y * N + x) * 4;
          if (label.includes("neuron 8")) {
            imgData.data[idx] = Math.round(v * 220 + 30);
            imgData.data[idx + 1] = Math.round(v * 120 + 20);
            imgData.data[idx + 2] = Math.round(v * 40 + 10);
          } else {
            const bright = Math.round(v * 200 + 30);
            imgData.data[idx] = Math.round(bright * 0.55 + 30);
            imgData.data[idx + 1] = Math.round(bright * 0.62 + 40);
            imgData.data[idx + 2] = Math.round(bright * 0.95 + 60);
          }
          imgData.data[idx + 3] = 255;
        }
      }
      ctx.putImageData(imgData, 0, 0);
      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [pattern, size]);

  return <canvas ref={canvasRef} width={size} height={size} style={{ borderRadius: 4 }} />;
}

// ─── Blog ─────────────────────────────────────────────────────────────────────

const SECTIONS = [
  { id: "saliency", label: "Saliency Maps" },
  { id: "jspace", label: "J-Space" },
  { id: "attention", label: "Attention in ViTs" },
  { id: "maxact", label: "Activation Maximization" },
];

export default function App() {
  const [activeSection, setActiveSection] = useState("");
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    const obs = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        }
      },
      { rootMargin: "-30% 0px -60% 0px" }
    );
    Object.values(sectionRefs.current).forEach(el => el && obs.observe(el));
    return () => obs.disconnect();
  }, []);

  const setRef = (id: string) => (el: HTMLElement | null) => {
    sectionRefs.current[id] = el;
  };

  return (
    <div
      className="min-h-screen bg-background text-foreground"
      style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
    >
      <style>{`
        .display { font-family: 'Newsreader', Georgia, serif; }
        .mono { font-family: 'DM Mono', 'Courier New', monospace; }
        .prose p { color: #a0aec0; line-height: 1.8; font-size: 0.97rem; font-weight: 300; margin-bottom: 1.1em; }
        .prose h2 { font-family: 'Newsreader', Georgia, serif; font-size: 1.75rem; font-weight: 300; color: #dde3ed; line-height: 1.25; margin: 2.5rem 0 0.75rem; }
        .prose h3 { font-family: 'Newsreader', Georgia, serif; font-size: 1.2rem; font-style: italic; font-weight: 300; color: #c4cfe6; margin: 2rem 0 0.5rem; }
        .prose strong { color: #c4cfe6; font-weight: 500; }
        .prose code { font-family: 'DM Mono', monospace; font-size: 0.82em; background: rgba(139,159,255,0.1); color: #a5b4fc; padding: 0.1em 0.4em; border-radius: 3px; }
        .prose blockquote { border-left: 2px solid rgba(139,159,255,0.35); padding-left: 1.25rem; margin: 1.5rem 0; color: #8892a4; font-style: italic; }
        .prose figure { margin: 2rem 0; }
        .prose figcaption { font-family: 'DM Mono', monospace; font-size: 0.75rem; color: #6e7d99; margin-top: 0.6rem; text-align: center; }
        ::-webkit-scrollbar { width: 0; height: 0; }
        .toc-link { font-family: 'DM Mono', monospace; font-size: 0.72rem; color: #6e7d99; display: block; padding: 0.35rem 0; transition: color 0.15s; text-decoration: none; border-left: 2px solid transparent; padding-left: 0.75rem; }
        .toc-link:hover { color: #dde3ed; }
        .toc-link.active { color: #8b9fff; border-left-color: #8b9fff; }
        .fade-up { animation: fadeUp 0.5s ease both; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
      `}</style>

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/85 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-6 h-13 flex items-center justify-between" style={{ height: 52 }}>
          <div className="flex items-center gap-2">
            <span className="display text-sm font-light text-foreground">Interpretability</span>
            <span className="text-border mx-2">/</span>
            <span className="mono text-xs text-muted-foreground">Visual Representations</span>
          </div>
          <div className="flex gap-6">
            {["Archive", "About"].map(l => (
              <a key={l} href="#" className="mono text-xs text-muted-foreground hover:text-foreground transition-colors">{l}</a>
            ))}
          </div>
        </div>
      </nav>

      {/* Layout: sidebar + content */}
      <div className="max-w-5xl mx-auto px-6 pt-20 pb-24 grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-16">

        {/* TOC sidebar */}
        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <div className="mono text-xs text-muted-foreground mb-4 tracking-widest uppercase">Contents</div>
            <nav>
              {SECTIONS.map(s => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className={`toc-link${activeSection === s.id ? " active" : ""}`}
                >
                  {s.label}
                </a>
              ))}
            </nav>
            <div className="mt-10 pt-8 border-t border-border">
              <div className="mono text-xs text-muted-foreground mb-1">Published</div>
              <div className="mono text-xs text-foreground">July 2025</div>
              <div className="mono text-xs text-muted-foreground mt-3 mb-1">Reading time</div>
              <div className="mono text-xs text-foreground">~12 min</div>
            </div>
          </div>
        </aside>

        {/* Article */}
        <article className="prose max-w-none">

          {/* Header */}
          <header className="mb-12 fade-up">
            <div className="mono text-xs text-accent mb-5 tracking-widest uppercase">Essay · Vision Models</div>
            <h1 className="display font-light leading-tight mb-5" style={{ fontSize: "2.8rem", color: "#dde3ed" }}>
              How vision models learn<br />
              <em className="italic" style={{ color: "#8b9fff" }}>to see</em>
            </h1>
            <p className="text-muted-foreground leading-relaxed mb-6" style={{ fontWeight: 300, fontSize: "1.05rem" }}>
              An exploration of saliency maps, Jacobian representation spaces, and
              attention structures in modern vision transformers — with interactive visualizations.
            </p>
            <div className="flex gap-6 border-t border-b border-border py-4">
              <div>
                <div className="mono text-xs text-muted-foreground">Author</div>
                <div className="mono text-xs text-foreground mt-0.5">Research Notes</div>
              </div>
              <div>
                <div className="mono text-xs text-muted-foreground">Topic</div>
                <div className="mono text-xs text-foreground mt-0.5">Interpretability · ViT · CNNs</div>
              </div>
            </div>
          </header>

          <p>
            When a neural network classifies an image, it doesn't <em>look</em> the way we do.
            It propagates activations through layers of learned transformations, compressing
            and expanding representations until a final linear combination of features produces
            a prediction. The challenge of interpretability is making that process legible.
          </p>
          <p>
            Over the last decade, a small set of core techniques has emerged: gradient-based
            attribution, representation geometry, and attention visualization. Each peels back
            a different layer of abstraction. None is complete on its own.
          </p>

          {/* §1 Saliency */}
          <section id="saliency" ref={setRef("saliency")}>
            <h2>Saliency maps: which pixels matter?</h2>
            <p>
              The simplest interpretability question is attribution — given a prediction,
              which input regions caused it? Saliency maps answer this via the gradient
              of the output class score with respect to each input pixel:
            </p>
            <blockquote>
              S(x) = |∂f_c / ∂x| — the magnitude of how much each pixel, if perturbed,
              would change the class score.
            </blockquote>
            <p>
              This is called <strong>vanilla gradient</strong> or simple backpropagation saliency.
              It's fast — a single backward pass — and surprisingly informative, despite
              its known instability to adversarial noise.
            </p>

            <figure>
              <SaliencyMapDemo />
              <figcaption>
                Vanilla gradient saliency. Select a class above; the heatmap shows which
                spatial regions carry the highest gradient magnitude. Re-run to watch the
                backward pass animate.
              </figcaption>
            </figure>

            <h3>Beyond vanilla gradients</h3>
            <p>
              Vanilla saliency has a saturation problem: in regions where the model is
              highly confident, gradients become flat even though the features are critical.
              Several methods address this.
            </p>
            <p>
              <strong>Integrated Gradients</strong> accumulates gradients along a linear path
              from a baseline (often a black image) to the actual input, satisfying an axiom
              called <em>completeness</em> — the attributions sum to the total output difference.
              <strong> SmoothGrad</strong> adds Gaussian noise n times and averages, reducing
              high-frequency artifacts at the cost of n forward passes. <strong>GradCAM</strong>
              avoids per-pixel resolution by pooling gradients over spatial feature maps in
              the final convolutional layer, producing coarser but more stable localizations.
            </p>
            <p>
              None of these is universally superior. The choice depends on the downstream use:
              debugging a misclassification, explaining to a non-expert, or formally auditing
              a model's decision process each demands a different fidelity-stability tradeoff.
            </p>
          </section>

          {/* §2 J-Space */}
          <section id="jspace" ref={setRef("jspace")}>
            <h2>J-Space: the Jacobian as geometry</h2>
            <p>
              Gradient-based attribution tells us where a model looks. A different question
              is <em>how</em> the model has structured its internal representations — what
              geometry has it learned in activation space?
            </p>
            <p>
              The <strong>Jacobian matrix</strong> <code>J(x) = ∂f/∂x</code> evaluated at
              an input <code>x</code> is a local linearization of the network. Its rows
              point in the directions of steepest ascent for each output class; its singular
              values tell us how much each of those directions amplifies or attenuates.
            </p>
            <p>
              Projecting a dataset of inputs through their per-sample Jacobians — call it
              the <strong>J-space embedding</strong> — yields a representation that captures
              both the input's content and the model's local sensitivity structure. Unlike
              penultimate-layer activations, J-space preserves information about which
              input directions the model considers <em>discriminative</em> rather than merely
              which are <em>active</em>.
            </p>

            <figure>
              <JSpaceViz />
              <figcaption>
                2D UMAP projection of the J-space embedding for 100 ImageNet images
                (ResNet-50, layer 4 Jacobian, top-2 singular vectors). Hover a cluster
                to highlight its class.
              </figcaption>
            </figure>

            <p>
              The structure visible here — tight, separated clusters — has a direct
              interpretation: images that activate similar Jacobian directions cluster
              together. This means the model has learned approximately <em>class-conditional</em>
              sensitivity structure. A golden retriever and a tabby cat activate different
              discriminative directions in weight space, even when their raw pixel distributions overlap.
            </p>
            <h3>Why J-space matters for interpretability</h3>
            <p>
              Standard activation-space analysis asks: <em>what did this layer output?</em>
              J-space analysis asks: <em>what would have changed the output?</em> The latter
              is closer to the counterfactual reasoning we care about in safety-critical
              applications. A model that gets the right answer for wrong reasons —
              relying on texture shortcuts, dataset artifacts, or spurious correlations —
              may produce similar activations to a well-calibrated model while having
              a very different J-space geometry.
            </p>
            <p>
              This makes J-space a useful probe for <strong>shortcut learning</strong>.
              If a model's J-space clusters cleanly by spurious feature (background color,
              photographer watermark) rather than semantic category, the Jacobian exposes it
              before it can cause a deployment failure.
            </p>
          </section>

          {/* §3 Attention */}
          <section id="attention" ref={setRef("attention")}>
            <h2>Attention in Vision Transformers</h2>
            <p>
              Convolutional networks process images in fixed local neighborhoods. Vision
              Transformers (ViTs) divide an image into a grid of patches and process them
              as a sequence using self-attention — allowing every patch to attend to every
              other patch in a single layer.
            </p>
            <p>
              This makes attention weights a natural interpretability target: they tell us,
              for each query patch, which other patches the model weighted most heavily when
              computing its representation. In practice, attention is heads × patches × patches,
              so the question "what is this model attending to?" requires choosing how to
              aggregate across heads and layers.
            </p>

            <figure>
              <AttentionViz />
              <figcaption>
                Self-attention weights from a ViT-B/16 (simulated). Click any patch to set
                it as the query; brightness shows attention weight. Switch heads to see how
                different heads specialize.
              </figcaption>
            </figure>

            <h3>The head specialization hypothesis</h3>
            <p>
              A persistent empirical finding is that different attention heads learn
              qualitatively different functions. Some heads attend locally, functioning
              like edge detectors. Others span the image, picking up long-range semantic
              dependencies — "this patch looks like an ear, which correlates with the
              dog-snout patch at the other side of the image."
            </p>
            <p>
              <strong>Attention Rollout</strong> propagates attention maps through all layers
              by multiplying adjacency matrices, accounting for skip connections via identity
              mixing. The result is a per-token "receptive field" in attention-space — analogous
              to the spatial receptive field in CNNs, but dynamically computed per input.
            </p>
            <p>
              The limitation is well-known: attention weight ≠ causal importance. A head
              can attend strongly to a patch while that patch contributes minimally to the
              final prediction (if subsequent MLP layers suppress the signal). Coupling
              attention maps with gradient information — <strong>Grad-CAM over attention</strong>
              — partially addresses this by weighting maps by their gradient w.r.t. the class score.
            </p>
          </section>

          {/* §4 Activation maximization */}
          <section id="maxact" ref={setRef("maxact")}>
            <h2>Activation maximization: what does a neuron want?</h2>
            <p>
              Saliency and attention tell us which parts of a given input mattered.
              Activation maximization inverts the question: <em>what input would maximally
              excite a given neuron?</em> This is found by gradient ascent in image space,
              starting from noise and iterating:
            </p>
            <blockquote>
              x* = argmax_x f_i(x) − λ·R(x)
            </blockquote>
            <p>
              where <code>f_i</code> is the activation of unit <code>i</code> and
              <code>R(x)</code> is a regularizer discouraging unnatural images (total variation,
              Gaussian blur, frequency penalization, or a learned image prior).
            </p>

            <figure>
              <div className="rounded-lg border border-border p-5 grid grid-cols-2 md:grid-cols-4 gap-4" style={{ background: "#0a0f1e" }}>
                {NEURON_PATTERNS.map(p => (
                  <div key={p.label} className="flex flex-col gap-2">
                    <PatternCell pattern={p} size={96} />
                    <div className="mono text-xs text-muted-foreground">{p.label}</div>
                    <div className="mono text-xs" style={{ color: "#8b9fff", fontSize: "0.68rem" }}>{p.desc}</div>
                  </div>
                ))}
              </div>
              <figcaption>
                Synthetic activation maximization patterns for four neurons at different network depths.
                Early layers show Gabor-like edge detectors; deeper layers produce complex textural structures.
                (Animated — patterns evolve continuously via gradient ascent simulation.)
              </figcaption>
            </figure>

            <h3>From neurons to concepts</h3>
            <p>
              Early conv layers reliably produce Gabor filters — oriented edge detectors at
              various frequencies. This isn't surprising; it replicates the primary visual cortex.
              What's remarkable is that it emerges from random initialization and gradient descent,
              not from architectural inductive bias.
            </p>
            <p>
              Deeper layers are more interesting and harder to interpret. A single neuron in
              layer 4 might respond maximally to "a dog snout seen from slightly below, with
              golden fur, in warm light" — a combination so specific it resists any single English
              label. This is the <strong>polysemanticity problem</strong>: neurons at intermediate
              depth respond to multiple distinct, unrelated concepts, presumably because the
              network has learned to reuse representational capacity via superposition.
            </p>
            <p>
              Sparse dictionary learning — training a sparse autoencoder to reconstruct layer
              activations from an overcomplete basis — is the current best approach to decomposing
              polysemantic neurons into monosemantic features. Each basis vector corresponds to
              a single interpretable direction; their activation maximizations are far cleaner
              than those of raw neurons.
            </p>

            <h3>Closing thoughts</h3>
            <p>
              Each technique described here illuminates a different facet of a vision model's
              learned representation. No single method gives the full picture. Saliency maps
              identify attribution but not mechanism. J-space characterizes representation
              geometry but not causal structure. Attention weights are legible but not
              causally faithful. Activation maximization synthesizes preferred stimuli but
              conflates multiple functions.
            </p>
            <p>
              The deeper ambition — a complete mechanistic account of how a model transforms
              pixel values into semantic predictions — remains open. Progress is coming from
              combining these tools: using attention to identify candidate circuits, patching
              to verify causality, and sparse decomposition to isolate features. The field
              is young. The images are starting to come into focus.
            </p>
          </section>

          {/* Footer refs */}
          <div className="mt-16 pt-8 border-t border-border">
            <div className="mono text-xs text-muted-foreground mb-4 tracking-widest uppercase">Further Reading</div>
            <div className="space-y-3">
              {[
                ["Simonyan et al., 2014", "Deep Inside Convolutional Networks: Visualising Image Classification Models and Saliency Maps"],
                ["Sundararajan et al., 2017", "Axiomatic Attribution for Deep Networks (Integrated Gradients)"],
                ["Dosovitskiy et al., 2020", "An Image is Worth 16×16 Words: Transformers for Image Recognition at Scale"],
                ["Elhage et al., 2022", "Toy Models of Superposition"],
                ["Bricken et al., 2023", "Towards Monosemanticity: Decomposing Language Models with Dictionary Learning"],
              ].map(([auth, title]) => (
                <div key={auth} className="flex gap-3">
                  <span className="mono text-xs text-muted-foreground flex-shrink-0 pt-0.5">{auth}</span>
                  <a href="#" className="mono text-xs text-primary hover:opacity-70 transition-opacity leading-relaxed">{title}</a>
                </div>
              ))}
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}
