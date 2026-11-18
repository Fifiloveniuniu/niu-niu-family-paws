import { useId } from 'react';

/** Original decorative vector artwork, shared by the public garden scenes. */
export function GardenBranch({ mirrored = false }: { mirrored?: boolean }) {
  return (
    <svg
      className="garden-branch"
      viewBox="0 0 220 400"
      aria-hidden="true"
      focusable="false"
      style={mirrored ? { scale: '-1 1' } : undefined}
    >
      <path
        className="garden-stem"
        d="M94 391Q171 214 77 21"
        fill="none"
        stroke="#597b68"
        strokeWidth="3"
      />
      <g className="garden-leaves" fill="#8ca58a">
        <path d="M108 326Q9 322 28 245q79 12 80 81" />
        <path d="M124 275q87-3 75-81-72 12-75 81" />
        <path d="M126 218Q44 201 54 138q70 18 72 80" />
        <path d="M119 165q74-13 60-75-61 13-60 75" />
        <path d="M99 101Q33 80 49 27q56 17 50 74" />
      </g>
      <g className="garden-veins" fill="none" stroke="#597b68" strokeWidth="1" opacity=".6">
        <path d="m106 321-52-49m72-3 50-50m-51-7-46-48m40-6 39-44M99 95 65 49" />
      </g>
    </svg>
  );
}

export function GardenBlossom() {
  const mask = useId();
  return (
    <svg viewBox="0 0 160 160" aria-hidden="true" focusable="false">
      <defs>
        <mask id={mask}>
          <rect width="160" height="160" fill="white" />
          <circle
            cx="80"
            cy="80"
            r="24"
            fill="black"
            style={{ opacity: 'var(--flower-green, 0)' }}
          />
        </mask>
      </defs>
      <g fill="currentColor" mask={`url(#${mask})`}>
        {[0, 60, 120, 180, 240, 300].map((angle) => (
          <g key={angle} transform={`rotate(${angle} 80 80)`}>
            <ellipse className="garden-petal" cx="80" cy="42" rx="23" ry="36" />
          </g>
        ))}
      </g>
      <circle
        className="garden-core"
        cx="80"
        cy="80"
        r="24"
        fill="#f6e5bc"
        style={{ opacity: 'calc(1 - var(--flower-green, 0))' }}
      />
      <circle className="garden-center" cx="80" cy="80" r="13" fill="#b28353" opacity=".65" />
    </svg>
  );
}

/** A single coordinate system keeps the blossom attached to its stem. */
export function GardenFlower() {
  return (
    <svg
      className="question-whole-flower"
      viewBox="0 -15 240 320"
      aria-hidden="true"
      focusable="false"
    >
      <g className="question-stem-and-leaves">
        <path
          className="question-flower-stem"
          d="M120 90V360"
          fill="none"
          stroke="#597b68"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path
          d="M120 218Q49 219 51 161q67 3 69 57ZM120 253q70-4 69-62-65 5-69 62Z"
          fill="#8ca58a"
        />
        <path d="m120 218-46-35m46 70 46-39" fill="none" stroke="#597b68" strokeWidth="2" />
      </g>
      <svg
        className="question-flower-dock"
        x="40"
        y="0"
        width="160"
        height="160"
        viewBox="0 0 160 160"
      >
        <GardenBlossom />
      </svg>
    </svg>
  );
}

export function GardenArch() {
  return (
    <svg className="garden-arch" viewBox="0 0 600 650" aria-hidden="true" focusable="false">
      <path d="M48 612V286a252 252 0 0 1 504 0v326Z" fill="#dae4d2" />
      <path d="M72 586V288a228 228 0 0 1 456 0v298Z" fill="none" stroke="#6b8771" opacity=".4" />
      <circle className="garden-sun" cx="430" cy="166" r="58" fill="#edba9c" />
      <path className="garden-hill-back" d="M48 471q160-135 296-27t208-25v193H48Z" fill="#b9ccb2" />
      <path className="garden-hill-front" d="M48 558q125-95 249-26t255-24v104H48Z" fill="#91af96" />
      <path d="M48 612h504" stroke="#58785e" strokeWidth="2" />
      <g fill="#fff9ed" opacity=".9">
        <path d="m180 116 4 10 11 4-11 4-4 10-4-10-11-4 11-4z" />
        <path d="m370 275 3 7 8 3-8 3-3 8-3-8-8-3 8-3z" />
      </g>
    </svg>
  );
}
