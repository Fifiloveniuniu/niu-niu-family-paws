/** Small fur and expression contours shared by the original illustrated pets. */
export default function PetExpressionDetails({ hero = false }: { hero?: boolean }) {
  return (
    <g transform={hero ? 'translate(94 59) scale(1.5)' : undefined}>
      <g fill="none" stroke="#71513c" strokeWidth="1.8" strokeLinecap="round">
        <path className="pet-eyebrows" d="M83 101q8-6 16-1m42 0q8-5 16 1" />
        <path className="pet-jawline" d="M73 142q7 15 22 17m50 0q15-2 22-17" opacity=".45" />
        <path className="pet-lips" d="M113 149q7 5 14 0" opacity=".65" />
      </g>
      <g fill="#faf1df">
        <path
          className="pet-cheeks"
          d="M76 125q11-6 21 3-4 12-15 7ZM143 128q10-9 21-3l-6 10q-11 5-15-7Z"
          opacity=".45"
        />
        <path className="pet-chin" d="M106 155q14 5 28 0-3 8-14 8t-14-8Z" opacity=".7" />
      </g>
      <g className="pet-mouth-opening">
        <ellipse cx="120" cy="147" rx="8" ry="6" fill="#3e3b31" />
        <path className="pet-tongue" d="M115 148q5-3 10 0v2q-5 6-10 0Z" fill="#cc8d87" />
      </g>
    </g>
  );
}
