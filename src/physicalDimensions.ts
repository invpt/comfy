export class PhysicalDimensions {
  #dotPitch: number;

  constructor(dotPitch: number) {
    this.#dotPitch = dotPitch;
  }

  dotPitch() {
    return this.#dotPitch;
  }

  mmToPx(mm: number) {
    return mm / this.#dotPitch;
  }

  pxToMm(px: number) {
    return px * this.#dotPitch;
  }
}

/**
 * @returns The physical dimensions of the screen in millimeters.
 */
export function usePhysicalDimensions(): PhysicalDimensions {
  return new PhysicalDimensions(0.1571);
}
