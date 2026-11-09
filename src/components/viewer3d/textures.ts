"use client";

import * as THREE from "three";

/**
 * Procedural textures for the illustrative models, drawn on a canvas in the browser
 * (no image files to download). They suggest real materials — a printed training panel,
 * a green circuit board with copper tracks, a meter face — without copying any real product.
 */
type Kind = "pcb" | "panel" | "meter" | "grille" | "label";
const cache = new Map<Kind, THREE.CanvasTexture>();

/** Deterministic pseudo-random numbers so every visitor sees the same board. */
function rng(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return { c, g: c.getContext("2d")! };
}

function drawPcb() {
  const { c, g } = canvas(1024, 768);
  const r = rng(7);
  g.fillStyle = "#11633f";
  g.fillRect(0, 0, c.width, c.height);
  // copper tracks
  g.strokeStyle = "#c8a34a";
  g.lineCap = "round";
  for (let i = 0; i < 140; i++) {
    g.lineWidth = 2 + r() * 4;
    let x = r() * c.width;
    let y = r() * c.height;
    g.beginPath();
    g.moveTo(x, y);
    for (let k = 0; k < 3; k++) {
      if (r() > 0.5) x += (r() - 0.5) * 260;
      else y += (r() - 0.5) * 200;
      g.lineTo(x, y);
    }
    g.stroke();
  }
  // pads and vias
  for (let i = 0; i < 420; i++) {
    const x = r() * c.width;
    const y = r() * c.height;
    g.fillStyle = "#d9b45a";
    g.beginPath();
    g.arc(x, y, 3 + r() * 4, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#0d3b27";
    g.beginPath();
    g.arc(x, y, 1.5, 0, Math.PI * 2);
    g.fill();
  }
  // white silkscreen outlines
  g.strokeStyle = "rgba(255,255,255,0.75)";
  g.lineWidth = 2;
  for (let i = 0; i < 60; i++) g.strokeRect(r() * c.width, r() * c.height, 20 + r() * 60, 12 + r() * 30);
  g.fillStyle = "rgba(255,255,255,0.8)";
  g.font = "bold 18px monospace";
  for (let i = 0; i < 40; i++) g.fillText(["R", "C", "Q", "U", "D", "L", "VR", "TP"][Math.floor(r() * 8)] + Math.floor(r() * 90 + 1), r() * c.width, r() * c.height);
  return c;
}

/** Printed training panel: white board with a circuit diagram and labels. */
function drawPanel() {
  const { c, g } = canvas(1024, 768);
  const r = rng(11);
  g.fillStyle = "#f3f5f4";
  g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = "#1d2b33";
  g.lineWidth = 6;
  g.strokeRect(16, 16, c.width - 32, c.height - 32);
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(16, 84);
  g.lineTo(c.width - 16, 84);
  g.stroke();
  g.fillStyle = "#1d2b33";
  g.font = "bold 34px sans-serif";
  g.fillText("TRAINING MODULE", 40, 64);
  g.font = "18px sans-serif";
  g.fillText("ILLUSTRATIVE", c.width - 190, 62);

  const symbol = (x: number, y: number, k: number) => {
    g.save();
    g.translate(x, y);
    g.lineWidth = 2;
    switch (k) {
      case 0: // resistor
        g.beginPath();
        g.moveTo(-26, 0);
        for (let i = 0; i < 6; i++) g.lineTo(-18 + i * 7, i % 2 ? 7 : -7);
        g.lineTo(26, 0);
        g.stroke();
        break;
      case 1: // capacitor
        g.beginPath();
        g.moveTo(-24, 0); g.lineTo(-4, 0); g.moveTo(-4, -12); g.lineTo(-4, 12);
        g.moveTo(4, -12); g.lineTo(4, 12); g.moveTo(4, 0); g.lineTo(24, 0);
        g.stroke();
        break;
      case 2: // transistor
        g.beginPath();
        g.arc(0, 0, 16, 0, Math.PI * 2);
        g.moveTo(-6, -10); g.lineTo(-6, 10); g.moveTo(-6, -4); g.lineTo(10, -14); g.moveTo(-6, 4); g.lineTo(10, 14);
        g.stroke();
        break;
      case 3: // coil
        g.beginPath();
        for (let i = 0; i < 4; i++) g.arc(-15 + i * 10, 0, 5, Math.PI, 0);
        g.stroke();
        break;
      default: // ground
        g.beginPath();
        g.moveTo(0, -14); g.lineTo(0, 0); g.moveTo(-12, 0); g.lineTo(12, 0); g.moveTo(-8, 5); g.lineTo(8, 5); g.moveTo(-4, 10); g.lineTo(4, 10);
        g.stroke();
    }
    g.restore();
  };

  // wires on a grid with components on them
  g.strokeStyle = "#1d2b33";
  for (let row = 0; row < 6; row++) {
    const y = 150 + row * 100;
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(60, y);
    g.lineTo(c.width - 60, y);
    g.stroke();
    for (let col = 0; col < 7; col++) {
      const x = 110 + col * 130 + (r() - 0.5) * 30;
      g.fillStyle = "#f3f5f4";
      g.fillRect(x - 28, y - 16, 56, 32);
      symbol(x, y, Math.floor(r() * 5));
      if (r() > 0.55) {
        g.beginPath();
        g.moveTo(x + 40, y);
        g.lineTo(x + 40, y + 100);
        g.stroke();
      }
      g.fillStyle = "#c0392b";
      g.font = "13px monospace";
      g.fillText(["R", "C", "Q", "L", "TP"][Math.floor(r() * 5)] + (row * 7 + col + 1), x - 14, y - 22);
    }
  }
  g.fillStyle = "#1d2b33";
  g.font = "bold 16px sans-serif";
  ["FREQUENCY ADJUST", "AUDIO INPUT", "OUTPUT", "+12V", "GND"].forEach((t, i) => g.fillText(t, 60 + i * 190, c.height - 40));
  return c;
}

function drawMeter() {
  const { c, g } = canvas(512, 384);
  g.fillStyle = "#f7f3e8";
  g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = "#222";
  g.lineWidth = 3;
  g.beginPath();
  g.arc(256, 330, 230, Math.PI * 1.15, Math.PI * 1.85);
  g.stroke();
  for (let i = 0; i <= 20; i++) {
    const a = Math.PI * 1.15 + (i / 20) * Math.PI * 0.7;
    const len = i % 5 === 0 ? 28 : 14;
    g.beginPath();
    g.moveTo(256 + Math.cos(a) * 230, 330 + Math.sin(a) * 230);
    g.lineTo(256 + Math.cos(a) * (230 - len), 330 + Math.sin(a) * (230 - len));
    g.stroke();
  }
  g.fillStyle = "#222";
  g.font = "bold 44px serif";
  g.fillText("µA", 228, 250);
  g.strokeStyle = "#c0392b";
  g.lineWidth = 4;
  g.beginPath();
  g.moveTo(256, 330);
  g.lineTo(256 + Math.cos(Math.PI * 1.62) * 220, 330 + Math.sin(Math.PI * 1.62) * 220);
  g.stroke();
  return c;
}

function drawGrille() {
  const { c, g } = canvas(256, 256);
  g.fillStyle = "#2a2f33";
  g.fillRect(0, 0, 256, 256);
  g.fillStyle = "#0b0d0e";
  for (let y = 16; y < 256; y += 22) for (let x = 16 + ((y / 22) % 2) * 11; x < 256; x += 22) {
    g.beginPath();
    g.arc(x, y, 7, 0, Math.PI * 2);
    g.fill();
  }
  return c;
}

function drawLabel() {
  const { c, g } = canvas(512, 256);
  g.fillStyle = "#fbfbf8";
  g.fillRect(0, 0, 512, 256);
  g.fillStyle = "#333";
  g.font = "22px monospace";
  ["MODEL ______", "SERIAL ______", "INPUT 12V DC", "MADE FOR EDUCATION"].forEach((t, i) => g.fillText(t, 24, 52 + i * 50));
  return c;
}

const DRAW: Record<Kind, () => HTMLCanvasElement> = { pcb: drawPcb, panel: drawPanel, meter: drawMeter, grille: drawGrille, label: drawLabel };

export function getTexture(kind: Kind): THREE.CanvasTexture {
  let t = cache.get(kind);
  if (!t) {
    t = new THREE.CanvasTexture(DRAW[kind]());
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    cache.set(kind, t);
  }
  return t;
}
