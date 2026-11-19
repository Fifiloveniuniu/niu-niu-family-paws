import React from 'react';
import { speciesText } from './i18n.ts';
export const petTypes = ['dog', 'cat', 'rabbit'] as const;
export function PetTypeIcon({ species }: { species: string }) {
  const icon = { dog: '🐕', cat: '🐈', rabbit: '🐇' }[species];
  return icon ? (
    <span className="pet-type-icon" aria-hidden="true">
      {icon}
    </span>
  ) : null;
}
export function petTypeChoice(species: string, label = speciesText(species)) {
  return (
    <span className="pet-type-choice">
      <PetTypeIcon species={species} />
      {label}
    </span>
  );
}
