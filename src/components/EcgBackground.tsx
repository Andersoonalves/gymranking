import { useEffect, useRef } from "react";
import { HeartPulse } from "lucide-react";

/**
 * Eletrocardiograma ao vivo do login: complexo PQRST sintetizado por gaussianas,
 * varredura de monitor (a cabeça escreve e apaga o rastro velho), faíscas no pico R
 * e resposta ao ponteiro — aproximar o dedo/cursor do traçado eleva o BPM.
 * Com prefers-reduced-motion: varredura mais lenta, sem faíscas.
 */
export function EcgBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bpmRef = useRef<HTMLSpanElement>(null);
  const stateRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const host = cv.parentElement;
    if (!host) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    const W = Math.round(host.clientWidth);
    const H = Math.round(host.clientHeight);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = W * dpr;
    cv.height = H * dpr;
    cv.style.width = `${W}px`;
    cv.style.height = `${H}px`;
    ctx.scale(dpr, dpr);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const bpmEl = bpmRef.current;
    const stateEl = stateRef.current;

    // geometria das duas derivações
    const L1 = { y: H * 0.34, amp: Math.min(132, H * 0.16), w: 2.4 };
    const L2 = { y: H * 0.6, amp: Math.min(52, H * 0.06), w: 1.3 };
    const SPEED = 1.9; // px por frame ~ 25 mm/s
    const LIFE = W * 0.96;

    const y1 = new Float32Array(W);
    const y2 = new Float32Array(W);
    const age = new Float32Array(W).fill(1e6);

    // complexo PQRST por gaussianas somadas
    const g = (x: number, c: number, w: number) => Math.exp(-((x - c) * (x - c)) / (2 * w * w));
    const pqrst = (ph: number) =>
      0.12 * g(ph, 0.14, 0.02) -
      0.08 * g(ph, 0.283, 0.0065) +
      1.0 * g(ph, 0.31, 0.0075) -
      0.26 * g(ph, 0.347, 0.01) +
      0.26 * g(ph, 0.52, 0.033);

    const pointer = { x: W / 2, y: H * 0.42, active: false, tremor: 0 };
    const onMove = (e: PointerEvent) => {
      const bb = cv.getBoundingClientRect();
      const nx = (e.clientX - bb.left) * (W / bb.width);
      const ny = (e.clientY - bb.top) * (H / bb.height);
      pointer.tremor = Math.min(1, Math.hypot(nx - pointer.x, ny - pointer.y) / 30);
      pointer.x = nx;
      pointer.y = ny;
      pointer.active = true;
    };
    const onLeave = () => {
      pointer.active = false;
    };
    host.addEventListener("pointermove", onMove);
    host.addEventListener("pointerleave", onLeave);

    type Spark = { x: number; y: number; vx: number; vy: number; life: number; r: number; hot: boolean };
    const sparks: Spark[] = [];
    let head = 0;
    let phase = 0;
    let bpm = 58;
    let shown = -1;
    let carry = 0;
    let raf = 0;

    const grid = () => {
      ctx.lineWidth = 1;
      for (let x = 0; x <= W; x += 13) {
        ctx.beginPath();
        ctx.moveTo(x + 0.5, 0);
        ctx.lineTo(x + 0.5, H);
        ctx.strokeStyle = x % 65 === 0 ? "rgba(198,242,78,.055)" : "rgba(198,242,78,.022)";
        ctx.stroke();
      }
      for (let y = 0; y <= H; y += 13) {
        ctx.beginPath();
        ctx.moveTo(0, y + 0.5);
        ctx.lineTo(W, y + 0.5);
        ctx.strokeStyle = y % 65 === 0 ? "rgba(198,242,78,.055)" : "rgba(198,242,78,.022)";
        ctx.stroke();
      }
    };

    const trace = (buf: Float32Array, lead: { w: number }, hue: string) => {
      const CH = 6;
      for (let s = 0; s < W - CH; s += CH) {
        const aAge = age[s];
        if (aAge > LIFE) continue;
        const al = Math.max(0, 1 - aAge / LIFE);
        const fade = al * al;
        ctx.beginPath();
        ctx.moveTo(s, buf[s]);
        for (let k = 1; k <= CH; k++) ctx.lineTo(s + k, buf[s + k]);
        ctx.strokeStyle = hue + (fade * 0.85).toFixed(3) + ")";
        ctx.lineWidth = lead.w;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.stroke();
        if (fade > 0.55) {
          ctx.strokeStyle = hue + ((fade - 0.55) * 0.5).toFixed(3) + ")";
          ctx.lineWidth = lead.w * 3.4;
          ctx.stroke();
        }
      }
    };

    const frame = () => {
      let target = 58;
      if (pointer.active) {
        const prox = Math.max(0, 1 - Math.abs(pointer.y - L1.y) / 260);
        target = 58 + prox * 92 + pointer.tremor * 14;
      }
      bpm += (target - bpm) * (reduce ? 0.02 : 0.035);
      pointer.tremor *= 0.92;

      carry += reduce ? SPEED * 0.55 : SPEED;
      const step = Math.floor(carry);
      carry -= step;
      const perBeat = 60 / bpm;
      const dPhase = 1 / 60 / perBeat;

      for (let n = 0; n < step; n++) {
        phase += dPhase / Math.max(1, step);
        if (phase >= 1) phase -= 1;
        head = (head + 1) % W;
        const noise = (Math.random() - 0.5) * (0.006 + pointer.tremor * 0.05);
        const v = pqrst(phase) + noise;
        const v2 = pqrst((phase + 0.93) % 1) * 0.8 + noise * 0.6;
        y1[head] = L1.y - v * L1.amp;
        y2[head] = L2.y - v2 * L2.amp;
        age[head] = 0;
        if (!reduce && v > 0.82 && Math.random() < 0.55) {
          sparks.push({
            x: head,
            y: y1[head],
            vx: (Math.random() - 0.5) * 1.4,
            vy: -1.6 - Math.random() * 2.6,
            life: 1,
            r: 0.8 + Math.random() * 1.6,
            hot: Math.random() < 0.35,
          });
        }
      }
      for (let i = 0; i < W; i++) age[i] += step;
      age[head] = 0;

      ctx.clearRect(0, 0, W, H);
      grid();

      ctx.beginPath();
      ctx.moveTo(0, L1.y);
      ctx.lineTo(W, L1.y);
      ctx.strokeStyle = "rgba(198,242,78,.06)";
      ctx.lineWidth = 1;
      ctx.stroke();

      trace(y2, L2, "rgba(255,107,44,");
      trace(y1, L1, "rgba(198,242,78,");

      // cabeça de escrita
      const hx = head;
      const hy = y1[head];
      const grd = ctx.createRadialGradient(hx, hy, 0, hx, hy, 34);
      grd.addColorStop(0, "rgba(198,242,78,.34)");
      grd.addColorStop(1, "rgba(198,242,78,0)");
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(hx, hy, 34, 0, 6.2832);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(hx, hy, 2.8, 0, 6.2832);
      ctx.fillStyle = "#F5F1E8";
      ctx.fill();

      // banda de apagamento à frente da cabeça
      const er = ctx.createLinearGradient(hx, 0, hx + 46, 0);
      er.addColorStop(0, "rgba(10,9,7,.9)");
      er.addColorStop(1, "rgba(10,9,7,0)");
      ctx.fillStyle = er;
      ctx.fillRect(hx + 1, 0, 46, H);

      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.vy += 0.052;
        s.vx *= 0.99;
        s.vy *= 0.995;
        s.x += s.vx;
        s.y += s.vy;
        s.life -= 0.016;
        if (s.life <= 0) {
          sparks.splice(i, 1);
          continue;
        }
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * s.life, 0, 6.2832);
        ctx.fillStyle = (s.hot ? "rgba(255,107,44," : "rgba(198,242,78,") + (s.life * 0.8).toFixed(3) + ")";
        ctx.fill();
      }

      const round = Math.round(bpm);
      if (bpmEl && round !== shown) {
        shown = round;
        bpmEl.textContent = String(round);
        if (stateEl) {
          const esforco = round > 96;
          stateEl.textContent = esforco ? "EM ESFORÇO" : "EM REPOUSO";
          stateEl.style.color = esforco ? "#FF6B2C" : "#7E7768";
        }
      }

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <>
      <canvas ref={canvasRef} className="absolute inset-0 block" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent from-[46%] via-[#0A0907]/80 via-[72%] to-[#0A0907] to-[88%]" />
      <div className="relative flex items-center gap-2 px-7 pt-3 font-mono">
        <HeartPulse className="h-4 w-4 animate-[flame_1s_cubic-bezier(0.3,0.7,0.3,1)_infinite] text-primary" />
        <span ref={bpmRef} className="text-[17px] font-bold tabular-nums text-foreground">
          58
        </span>
        <span className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground">BPM</span>
        <span className="flex-1" />
        <span ref={stateRef} className="text-[10px] font-bold tracking-[0.14em] text-muted-foreground">
          EM REPOUSO
        </span>
        <span className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground/50">25 mm/s</span>
      </div>
    </>
  );
}
