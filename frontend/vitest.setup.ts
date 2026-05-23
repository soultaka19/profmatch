import "@testing-library/jest-dom/vitest";

// Mock ResizeObserver (absent de jsdom, requis par Radix Slider)
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
