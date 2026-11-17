import { useId } from 'react';

/** A single landscape carries through every chapter rather than restarting per scene. */
export default function StoryLandscape() {
  const mask = useId();
  return (
    <svg
      className="story-landscape"
      viewBox="0 0 1440 900"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <mask id={mask}>
          <circle r="54" fill="white" />
          <circle data-journey-moon cx="95" cy="-16" r="46" fill="black" />
        </mask>
      </defs>
      <path data-journey-hill="back" fill="#c9cfb5" opacity=".17" />
      <path data-journey-hill="front" fill="#cbbca3" opacity=".16" />
      <path data-journey-thread fill="none" stroke="#a28a67" strokeWidth="1.5" opacity=".3" />
      <g data-journey-orb>
        <g className="journey-rays" stroke="#bba26e" strokeWidth="2" opacity=".45">
          {Array.from({ length: 12 }, (_, index) => (
            <path key={index} d="M0-67v-14" transform={`rotate(${index * 30})`} />
          ))}
        </g>
        <circle r="54" fill="#d9bd85" opacity=".3" mask={`url(#${mask})`} />
      </g>
      <g data-journey-seed fill="none" stroke="#9a8263" strokeWidth="2" opacity=".4">
        <path d="M0 0Q-15-40 0-62Q15-40 0 0ZM0 0Q-40-15-62 0Q-40 15 0 0ZM0 0Q15 40 0 62Q-15 40 0 0ZM0 0Q40 15 62 0Q40-15 0 0Z" />
        <circle r="9" fill="#d9bd85" stroke="none" />
      </g>
    </svg>
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
              <path key={index} d="M50 9v11" transform={`rotate(${index * 30} 50 50)`} />
            ))}
          </g>
          <path
            className="symbol-disc"
            d="M50 27C64 27 73 38 73 50S64 73 50 73 27 64 27 50 36 27 50 27Z"
            fill="currentColor"
          />
          <path
            className="symbol-glint"
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
            d="M50 79C-8 43 28 4 50 31C72 4 108 43 50 79Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
          />
          <path
            className="symbol-glint"
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
