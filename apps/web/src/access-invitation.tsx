import React from 'react';
import { useTranslation } from 'react-i18next';
import { useDialogState } from './dialog-routing';
import { auth } from './auth-client';
import { accessText as text, useAccessMutation } from './identity-access';
import type { AccessAccount } from '../../../packages/access/types';
import Modal from './modal';
import Button from './button';
import UnsavedChanges, { confirmDiscardChanges } from './unsaved-changes';
export default function AccessInvitationAcceptance() {
  const [open, setOpen] = useDialogState('access-accept', false);
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        {text('acceptInvitation')}
      </Button>
      {open && <AcceptForm onClose={() => setOpen(false)} />}
    </>
  );
}
function AcceptForm({ onClose }: { onClose: () => void }) {
  const { i18n } = useTranslation();
  const [code, setCode] = React.useState(''),
    [accepted, setAccepted] = React.useState(false);
  const operationId = React.useRef(crypto.randomUUID());
  const mutation = useAccessMutation<AccessAccount>(() => {
    setCode('');
    setAccepted(true);
  });
  const close = () => {
    if (!mutation.busy && confirmDiscardChanges(i18n.language)) {
      onClose();
      if (accepted) window.dispatchEvent(new Event('family-paws:access-changed'));
    }
  };
  return (
    <Modal title={text('acceptInvitation')} onClose={close} disabled={mutation.busy}>
      {accepted ? (
        <>
          <p role="status">{text('invitationAccepted')}</p>
          <Button onClick={close}>{text('done')}</Button>
        </>
      ) : (
        <form
          className="iam-editor"
          onSubmit={(event) => {
            event.preventDefault();
            void mutation.save(
              '/access/invitations/accept',
              { code: code.trim(), operationId: operationId.current },
              event.currentTarget,
              'POST',
            );
          }}
        >
          <UnsavedChanges active={!!code || mutation.uncertain} />
          <p>{text('acceptHelp')}</p>
          <p>{auth.currentUser?.email}</p>
          <fieldset className="iam-form-fields" disabled={mutation.frozen}>
            <label className="iam-input-label">
              {text('invitationCode')}
              <input
                type="text"
                required
                minLength={85}
                maxLength={85}
                autoComplete="off"
                spellCheck={false}
                value={code}
                onChange={(event) => setCode(event.target.value)}
              />
            </label>
          </fieldset>
          {mutation.error && <p role="alert">{mutation.error}</p>}
          <div className="iam-actions">
            <Button type="button" variant="secondary" disabled={mutation.busy} onClick={close}>
              {text('close')}
            </Button>
            <Button type="submit" disabled={mutation.busy || !code.trim()}>
              {text(mutation.busy ? 'saving' : mutation.uncertain ? 'retry' : 'acceptInvitation')}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
