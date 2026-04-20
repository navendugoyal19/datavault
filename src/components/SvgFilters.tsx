import React from "react";

/**
 * Reusable SVG filter definitions — render once at the top of a composition.
 * Reference filters via `filter="url(#glow-soft)"` etc.
 */
export const SvgFilters: React.FC = () => (
  <svg
    style={{ position: "absolute", width: 0, height: 0 }}
    aria-hidden="true"
  >
    <defs>
      {/* Soft glow — subtle halo around elements */}
      <filter id="glow-soft" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      {/* Strong glow — dramatic bloom effect */}
      <filter id="glow-strong" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="18" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      {/* Neon cyan — tinted glow for cyan accents */}
      <filter id="neon-cyan" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="blur" />
        <feColorMatrix
          in="blur"
          type="matrix"
          values="0 0 0 0 0
                  0 0.9 0 0 0.1
                  0 0 1 0 0
                  0 0 0 0.8 0"
          result="tinted"
        />
        <feMerge>
          <feMergeNode in="tinted" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      {/* Neon amber — tinted glow for amber/gold accents */}
      <filter id="neon-amber" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="blur" />
        <feColorMatrix
          in="blur"
          type="matrix"
          values="1 0 0 0 0
                  0 0.72 0 0 0
                  0 0 0 0 0
                  0 0 0 0.8 0"
          result="tinted"
        />
        <feMerge>
          <feMergeNode in="tinted" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      <filter id="glow-cyan" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
        <feColorMatrix
          in="blur"
          type="matrix"
          values="0 0 0 0 0
                  0 0.9 0 0 0.1
                  0 0 1 0 0
                  0 0 0 0.6 0"
          result="tinted"
        />
        <feMerge>
          <feMergeNode in="tinted" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  </svg>
);
