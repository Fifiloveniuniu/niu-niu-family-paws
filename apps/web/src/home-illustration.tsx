import PetExpressionDetails from './pet-expression-details';
import { useTranslation } from 'react-i18next';

export default function HomeIllustration() {
  const { t } = useTranslation();
  return (
    <svg viewBox="0 0 600 540" role="img" aria-label={t('illustration')}>
      <circle cx="302" cy="268" r="224" fill="#e9d9bb" />
      <path d="M58 443 Q300 393 551 443" fill="none" stroke="#baaa87" strokeWidth="2" />
      <path
        d="M446 424v-157m0 81q-75-20-56-72 58 9 56 72m0-28q68-34 61-85-58 13-61 85m0-55q-47-26-31-64 45 14 31 64"
        fill="#63836a"
        stroke="#4c6e58"
        strokeWidth="6"
      />
      <path d="M408 406h74l-12 49h-49z" fill="#bd7455" />
      <ellipse cx="272" cy="433" rx="138" ry="18" fill="#cebd9d" />
      <path
        className="pet-tail"
        d="M201 365q-73-68-75-5-4 30 56 39"
        fill="none"
        stroke="#b66c43"
        strokeWidth="26"
        strokeLinecap="round"
      />
      <path d="M181 415q-27-141 88-151 96-4 100 149" fill="#c98656" />
      <path d="M240 310q-45 84-25 114h110q8-72-38-114" fill="#f6ead4" />
      <g className="pet-face">
        <path
          className="pet-ears"
          d="M188 263q-64-81-44-105 33-26 94 21m78 0q69-45 91-16 18 31-50 105"
          fill="#875338"
        />
        <path
          className="pet-head"
          d="M178 228q-3-84 92-88 98-5 103 91 13 90-99 94-108-1-96-97"
          fill="#d49764"
        />
        <path
          className="pet-muzzle"
          d="M234 150q36-13 64 0l-8 73 29 32q-10 48-47 48-38 0-49-46l27-35z"
          fill="#fcf0d9"
        />
        <ellipse className="pet-eye" cx="230" cy="225" rx="7" ry="9" fill="#382f29" />
        <ellipse className="pet-eye" cx="316" cy="225" rx="7" ry="9" fill="#382f29" />
        <path className="pet-nose" d="M257 255q16-9 31 0-4 18-15 18-12-2-16-18" fill="#382f29" />
        <path
          className="pet-mouth"
          d="M273 272v10m-18 0q18 18 36 0"
          fill="none"
          stroke="#382f29"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <PetExpressionDetails hero />
      </g>
      <path d="M194 317q75 31 154-5" fill="none" stroke="#31594c" strokeWidth="14" />
      <circle cx="274" cy="334" r="12" fill="#ddb754" />
      <rect x="177" y="405" width="70" height="25" rx="12" fill="#d49764" />
      <rect x="305" y="405" width="69" height="25" rx="12" fill="#d49764" />
      <path
        d="M99 125l5-18m-24 18-11-9m45 28 16-6"
        stroke="#b87855"
        strokeWidth="5"
        strokeLinecap="round"
      />
    </svg>
  );
}
