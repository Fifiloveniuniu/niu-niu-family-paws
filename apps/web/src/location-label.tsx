import { useTranslation } from 'react-i18next';
import { uiText } from './i18n.ts';
import Icon from './icons';
import './location-label.css';

export default function LocationLabel({ kind, name }: { kind: 'house' | 'room'; name: string }) {
  const { i18n } = useTranslation();
  return (
    <span className={`location-label location-label-${kind}`}>
      <span className="location-label-kind">
        <Icon name={kind} />
        <span>{uiText(`ui.workspace.${kind}`, {}, i18n.language)}</span>
      </span>
      <strong className="location-label-name">{name}</strong>
    </span>
  );
}
