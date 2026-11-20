import React from 'react';
import assets from './theme-icons.json';
const families = assets as Record<
  string,
  Record<
    string,
    { viewBox: string; shapes: { tag: string; attrs: Record<string, string | undefined> }[] }
  >
>;
function iconAsset(family: string, name: string) {
  if (name === 'check')
    return {
      viewBox: '0 0 24 24',
      shapes: [
        {
          tag: 'path',
          attrs: {
            d:
              family === 'apple' ? 'm5 12 4 4L19 6' : 'M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4Z',
          },
        },
      ],
    };
  return families[family][name];
}
export default function Icon({
  name,
  className = '',
}: {
  name:
    | 'check'
    | 'download'
    | 'metrics'
    | 'address'
    | 'calendar'
    | 'customers'
    | 'balance'
    | 'account'
    | 'edit'
    | 'link'
    | 'close'
    | 'logout'
    | 'settings'
    | 'plus'
    | 'reset'
    | 'palette'
    | 'house'
    | 'room'
    | 'house-add'
    | 'pet-add'
    | 'trash'
    | 'globe'
    | 'chevron-down'
    | 'chevron-left'
    | 'chevron-right'
    | 'menu'
    | 'clock'
    | 'search';
  className?: string;
}) {
  return (
    <svg
      className={'paws-icon ' + className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {['google', 'apple', 'microsoft'].map((family) => (
        <g key={family} className={'icon-family icon-' + family} data-icon-family={family}>
          <g
            transform={(() => {
              const [x, y, width, height] = iconAsset(family, name)
                .viewBox.split(/\s+/)
                .map(Number);
              return `scale(${24 / width} ${24 / height}) translate(${-x} ${-y})`;
            })()}
          >
            {iconAsset(family, name).shapes.map((shape, index) =>
              React.createElement(shape.tag, { ...shape.attrs, key: index }),
            )}
          </g>
        </g>
      ))}
      <g className="icon-legacy">
        {name === 'check' ? (
          <path d="m5 12 4 4L19 6" />
        ) : name === 'globe' ? (
          <>
            <circle cx="12" cy="12" r="9" />
            <path d="M3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18Z" />
          </>
        ) : name.startsWith('chevron') ? (
          <path
            d={
              name === 'chevron-down'
                ? 'm7 10 5 5 5-5'
                : name === 'chevron-left'
                  ? 'm14 6-6 6 6 6'
                  : 'm10 6 6 6-6 6'
            }
          />
        ) : name === 'menu' ? (
          <path d="M4 6h16M4 12h16M4 18h16" />
        ) : name === 'clock' ? (
          <>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </>
        ) : name === 'search' ? (
          <>
            <circle cx="10" cy="10" r="6" />
            <path d="m15 15 5 5" />
          </>
        ) : name === 'address' ? (
          <>
            <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z" />
            <circle cx="12" cy="10" r="2.5" />
          </>
        ) : name === 'calendar' ? (
          <>
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M7 3v4m10-4v4M3 11h18M7 15h2m4 0h2m-8 3h2" />
          </>
        ) : name === 'customers' ? (
          <>
            <circle cx="9" cy="8" r="3" />
            <path d="M3 21v-3a6 6 0 0 1 12 0v3m1-16a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 4v2" />
          </>
        ) : name === 'balance' ? (
          <>
            <rect x="3" y="5" width="18" height="15" rx="2" />
            <path d="M3 9h18m-6 5h6m-3 0h.01" />
          </>
        ) : name === 'account' ? (
          <>
            <circle cx="12" cy="8" r="4" />
            <path d="M4 22v-2a8 8 0 0 1 16 0v2" />
          </>
        ) : name === 'trash' ? (
          <>
            <path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7" />
          </>
        ) : name === 'plus' ? (
          <path d="M12 5v14M5 12h14" />
        ) : name === 'reset' ? (
          <>
            <path d="M3 10a9 9 0 1 1 2 8M3 4v6h6" />
          </>
        ) : name === 'palette' ? (
          <>
            <path d="M12 3a9 9 0 1 0 0 18h1a2 2 0 0 0 1.4-3.4 1.5 1.5 0 0 1 1.1-2.6H17a4 4 0 0 0 4-4c0-4.4-4-8-9-8Z" />
            <circle cx="7.5" cy="10" r=".6" />
            <circle cx="10" cy="6.8" r=".6" />
            <circle cx="14.5" cy="7.2" r=".6" />
            <circle cx="17.4" cy="10.2" r=".6" />
          </>
        ) : name === 'house' ? (
          <path d="m3 10 9-7 9 7M5 9v12h14V9M9 21v-8h6v8" />
        ) : name === 'room' ? (
          <>
            <rect x="5" y="3" width="14" height="18" rx="1" />
            <path d="M15 12h.01M3 21h18" />
          </>
        ) : name === 'house-add' ? (
          <>
            <path d="m3 10 8-7 8 7M5 9v12h8M9 21v-7h4M18 14v8m-4-4h8" />
          </>
        ) : name === 'pet-add' ? (
          <>
            <ellipse cx="8" cy="6" rx="2" ry="3" />
            <ellipse cx="15" cy="6" rx="2" ry="3" />
            <path d="M11 12c-4 0-8 7-4 8l4-1 2 1M18 13v8m-4-4h8" />
          </>
        ) : name === 'settings' ? (
          <>
            <path d="m10 3-.6 2.4-2 .8-2.1-1.1-2 3.5 1.8 1.6v2.6l-1.8 1.6 2 3.5 2.1-1.1 2 .8L10 21h4l.6-2.4 2-.8 2.1 1.1 2-3.5-1.8-1.6v-2.6l1.8-1.6-2-3.5-2.1 1.1-2-.8L14 3Z" />
            <circle cx="12" cy="12" r="3" />
          </>
        ) : name === 'edit' ? (
          <>
            <path d="m15 4 5 5M4 20l4-1L20 7a2.1 2.1 0 0 0-3-3L5 16l-1 4Z" />
          </>
        ) : name === 'link' ? (
          <>
            <path
              d="m10 13 4-4M8 16l-1 1a4.2 4.2 0 0 1-6-6l4-4a4.2 4.2 0 0 1 6 0M13 8l1-1a4.2 4.2 0 0 1 6 6l-4 4a4.2 4.2 0 0 1-6 0"
              transform="translate(1 0)"
            />
          </>
        ) : name === 'close' ? (
          <path d="m6 6 12 12M6 18 18 6" />
        ) : (
          <>
            <path d="M9 4H5v16h4M10 12h11m-4-4 4 4-4 4" />
          </>
        )}
      </g>
    </svg>
  );
}
