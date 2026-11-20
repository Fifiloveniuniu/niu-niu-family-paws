import Button from './button';
import React from 'react';
import { apiOptionalJson, apiJson } from './api-client';
import { uiText } from './i18n.ts';
import CancellationPolicyPage, {
  initialCancellationPolicy,
  type CancellationPolicy,
} from './cancellation-policy';
import type { components } from '../../../packages/contracts/generated';
type Draft = components['schemas']['CancellationDraft'];
export default function SavedCancellationPolicy() {
  const [draft, setDraft] = React.useState<Draft | null>(null),
    [loading, setLoading] = React.useState(true),
    [error, setError] = React.useState(false);
  const loaded = React.useRef(false);
  const operation = React.useRef(crypto.randomUUID()),
    generation = React.useRef(0);
  const load = React.useCallback(async () => {
    const current = ++generation.current;
    setLoading(true);
    setError(false);
    try {
      const value = await apiOptionalJson<Draft>('/settings/cancellation-draft');
      if (current === generation.current) {
        loaded.current = true;
        setDraft(value);
      }
    } catch {
      if (current === generation.current) setError(true);
    } finally {
      if (current === generation.current) setLoading(false);
    }
  }, []);
  React.useEffect(() => {
    void load();
    return () => {
      generation.current++;
    };
  }, [load]);
  async function save(policy: CancellationPolicy) {
    const result = await apiJson<Draft>('/settings/cancellation-draft', {
      body: { ...policy, version: draft?.version ?? 0, operationId: operation.current },
    });
    setDraft(result);
    operation.current = crypto.randomUUID();
  }
  if (loading && !loaded.current) return <p role="status">{uiText('ui.workspace.loading')}</p>;
  if (error)
    return (
      <div role="alert">
        <p>{uiText('ui.workspace.loadError')}</p>
        <Button icon="reset" variant="secondary" onClick={() => void load()}>
          {uiText('ui.workspace.retry')}
        </Button>
      </div>
    );
  return (
    <section className="saved-cancellation-policy" aria-busy={loading}>
      <div className="workspace-section-actions">
        <a href="/app/balances/" className="language">
          {uiText('ui.workspace.balances')}
        </a>
        <a href="/pricing/#cancellation-policy" className="language">
          {uiText('ui.houseCalendar.cancellationPolicy')}
        </a>
      </div>
      <CancellationPolicyPage
        policy={draft ?? initialCancellationPolicy}
        onSave={save}
        onEditorClosed={() => void load()}
      />
    </section>
  );
}
