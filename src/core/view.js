import { CONFIG } from '../config.js';
import { clamp } from './rng.js';

/**
 * Gestiona el tamaño del canvas: alto lógico fijo (540) y ancho lógico
 * adaptado a la proporción de la pantalla, dentro de [minWidth, maxWidth].
 */
export class View {
  constructor(canvas, stage) {
    this.canvas = canvas;
    this.stage = stage;
    this.ctx = canvas.getContext('2d');
    this.h = CONFIG.view.height;
    this.w = CONFIG.view.minWidth;
    this.scale = 1;
    this.dpr = 1;
    this.resize();
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('orientationchange', () => setTimeout(() => this.resize(), 150));
  }

  get groundY() {
    return this.h - CONFIG.world.groundHeight;
  }

  resize() {
    const cw = window.innerWidth;
    const ch = window.innerHeight;
    const { height, minWidth, maxWidth, maxDpr } = CONFIG.view;
    this.w = Math.round(clamp(height * (cw / ch), minWidth, maxWidth));
    this.scale = Math.min(cw / this.w, ch / this.h);
    this.dpr = Math.min(window.devicePixelRatio || 1, maxDpr);

    const cssW = Math.floor(this.w * this.scale);
    const cssH = Math.floor(this.h * this.scale);
    this.canvas.style.width = `${cssW}px`;
    this.canvas.style.height = `${cssH}px`;
    this.canvas.width = Math.floor(cssW * this.dpr);
    this.canvas.height = Math.floor(cssH * this.dpr);
    this.stage.style.width = `${cssW}px`;
    this.stage.style.height = `${cssH}px`;
    this.stage.style.setProperty('--s', this.scale.toFixed(3));
  }

  /** Prepara el contexto para dibujar en coordenadas lógicas. */
  begin() {
    const k = this.scale * this.dpr;
    this.ctx.setTransform(k, 0, 0, k, 0, 0);
  }

  /** Convierte coordenadas de cliente (ratón/dedo) a coordenadas lógicas. */
  toLogical(clientX, clientY) {
    const r = this.canvas.getBoundingClientRect();
    return {
      x: ((clientX - r.left) / r.width) * this.w,
      y: ((clientY - r.top) / r.height) * this.h,
    };
  }
}
