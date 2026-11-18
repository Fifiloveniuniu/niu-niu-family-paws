import { useId } from 'react';
import { GardenBlossom } from './garden-art';

/** A single landscape carries through every chapter rather than restarting per scene. */
export default function StoryLandscape() {
  const mask = useId();
  return (
    <>
      <div className="chapter-window" aria-hidden="true" />
      <svg
        className="story-landscape"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
        focusable="false"
      >
        <path data-journey-hill="back" fill="#c9cfb5" opacity=".17" />
        <path data-journey-hill="front" fill="#cbbca3" opacity=".16" />
        <path data-journey-thread fill="none" stroke="#a28a67" strokeWidth="1.5" opacity=".3" />
      </svg>
      <div className="shared-flower" aria-hidden="true">
        <GardenBlossom />
      </div>
      <svg className="story-sun" viewBox="0 0 180 180" aria-hidden="true" focusable="false">
        <defs>
          <mask id={mask} maskUnits="userSpaceOnUse" x="-90" y="-90" width="180" height="180">
            <circle r="54" fill="white" />
            <circle data-journey-moon cx="115" cy="-16" r="50" fill="black" />
          </mask>
        </defs>
        <g data-journey-orb transform="translate(90 90)">
          <g className="journey-rays" stroke="currentColor" strokeWidth="2" opacity=".45">
            {Array.from({ length: 12 }, (_, index) => (
              <path key={index} d="M0-67v-14" transform={`rotate(${index * 30})`} />
            ))}
          </g>
          <circle
            data-celestial-body
            r="54"
            fill="currentColor"
            opacity="var(--orb-strength, .4)"
            mask={`url(#${mask})`}
          />
          <g className="journey-stars" fill="currentColor" opacity="var(--orb-strength, .55)">
            <path d="m66-60 3 8 8 3-8 3-3 8-3-8-8-3 8-3Z" />
            <circle cx="72" cy="9" r="3" />
          </g>
        </g>
      </svg>
    </>
  );
}

export function CareSymbol({ kind }: { kind: 'day' | 'night' | 'heart' | 'orbit' | 'check' }) {
  return (
    <svg
      className={`care-symbol care-symbol-${kind}`}
      viewBox="0 0 100 100"
      aria-hidden="true"
      focusable="false"
    >
      {kind === 'day' ? (
        <>
          <g className="symbol-rays" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            {Array.from({ length: 12 }, (_, index) => (
              <g key={index} transform={`rotate(${index * 30} 50 50)`}>
                <path className="symbol-ray" d="M50 9v11" />
              </g>
            ))}
          </g>
          <path
            className="symbol-disc"
            d="M50 27C64 27 73 38 73 50S64 73 50 73 27 64 27 50 36 27 50 27Z"
            fill="currentColor"
          />
          <path
            className="symbol-glint"
            pathLength="1"
            d="M44 37q-10 4-10 14"
            fill="none"
            stroke="#fffaf0"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </>
      ) : kind === 'night' ? (
        <>
          <path
            className="symbol-crescent"
            d="M65 14C21 12 9 71 52 85Q69 91 82 77C42 84 31 36 65 14Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          />
          <path
            className="symbol-star"
            d="m76 21 3 9 9 3-9 3-3 9-3-9-9-3 9-3Z"
            fill="currentColor"
          />
          <circle className="symbol-satellite" cx="87" cy="57" r="2.5" fill="currentColor" />
        </>
      ) : kind === 'heart' ? (
        <>
          <path
            className="symbol-heart"
            pathLength="1"
            d="M50 79C-8 43 28 4 50 31C72 4 108 43 50 79Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
          />
          <path
            className="symbol-glint"
            pathLength="1"
            d="M23 39q-4 11 5 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
        </>
      ) : kind === 'orbit' ? (
        <>
          <ellipse
            className="symbol-orbit"
            cx="50"
            cy="50"
            rx="36"
            ry="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
          <ellipse
            className="symbol-orbit reverse"
            cx="50"
            cy="50"
            rx="20"
            ry="36"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
          <circle className="symbol-disc" cx="50" cy="50" r="6" fill="currentColor" />
        </>
      ) : (
        <>
          <path
            className="symbol-ring"
            d="M50 12A38 38 0 1 1 12 50"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            pathLength="1"
          />
          <path
            className="symbol-check"
            d="m30 48 15 17 34-39"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength="1"
          />
        </>
      )}
    </svg>
  );
}
