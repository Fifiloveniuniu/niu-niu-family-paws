import { useDialogState } from './dialog-routing';
import Button from './button';
import IconButton from './icon-button';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { uiText } from './i18n.ts';
import Modal from './modal';
import Icon from './icons';
import { palettes, useAppearance, changeAppearance, resetAppearance } from './theme-preferences';
import { themes } from './theme-catalog';
import './appearance.css';
export default function AppearanceControl() {
  const { i18n } = useTranslation();
  const t = (key: string) => uiText('ui.appearance.' + key, {}, i18n.language);
  const [open, setOpen] = useDialogState('appearance', false);
  const value = useAppearance();
  return (
    <>
      <IconButton
        type="button"
        className="appearance-trigger"
        title={t('title')}
        aria-label={t('title')}
        onClick={() => setOpen(true)}
      >
        <Icon name="palette" />
        <span className="appearance-trigger-label">{t('title')}</span>
      </IconButton>
      {open && (
        <Modal title={t('title')} className="appearance-dialog" onClose={() => setOpen(false)}>
          <p className="appearance-scope">{t(value.memoryOnly ? 'memoryOnly' : 'scope')}</p>
          <fieldset className="appearance-group">
            <legend>{t('colors')}</legend>
            <div className="appearance-options">
              {palettes.map((palette) => (
                <label
                  className="appearance-choice appearance-palette-choice"
                  key={palette}
                  data-preset={palette}
                >
                  <input
                    type="radio"
                    name="appearance-palette"
                    aria-label={t(palette)}
                    value={palette}
                    checked={value.palette === palette}
                    onChange={() => changeAppearance({ palette })}
                  />
                  <span className="appearance-choice-copy">
                    <strong>{t(palette)}</strong>
                    <span>{t(palette + 'Hint')}</span>
                    <span
                      className="appearance-palette-preview"
                      data-palette={palette}
                      aria-hidden="true"
                    >
                      <span className="appearance-preview-bar">
                        <i />
                        <i />
                        <i />
                      </span>
                      <span className="appearance-preview-house">
                        <Icon name="house" />
                        <i />
                      </span>
                      <span className="appearance-preview-room">
                        <Icon name="room" />
                        <i />
                        <b />
                      </span>
                      <span className="appearance-preview-room">
                        <Icon name="room" />
                        <i />
                        <b />
                      </span>
                      <span className="appearance-preview-footer">
                        <i />
                        <b />
                      </span>
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <p className="appearance-source">
            <a
              href={themes.find((theme) => theme.id === value.palette)!.source}
              target="_blank"
              rel="noreferrer"
            >
              {t('source')}
            </a>
            {' · '}
            <a href="/licenses/attribution.txt" target="_blank" rel="noreferrer">
              {t('credits')}
            </a>
          </p>
          <div className="appearance-actions">
            <Button icon="reset" type="button" variant="secondary" onClick={resetAppearance}>
              {t('reset')}
            </Button>
            <Button icon="check" type="button" variant="primary" onClick={() => setOpen(false)}>
              {t('done')}
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
