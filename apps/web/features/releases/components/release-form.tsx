import { useState, type FormEvent } from "react";
import type { Release, ReleaseInput, ReleaseStatus } from "../types";
import { RELEASE_STATUSES, RELEASE_STATUS_LABELS } from "../constants";

type ReleaseFormProps = {
  initial?: Release;
  onCancel: () => void;
  onSave: (input: ReleaseInput) => Promise<void>;
};

export function ReleaseForm({ initial, onCancel, onSave }: ReleaseFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [version, setVersion] = useState(initial?.version ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [status, setStatus] = useState<ReleaseStatus>(
    initial?.status ?? "DRAFT",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(undefined);
    try {
      await onSave({ name, version, status, description: description || null });
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "The release could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="release-form" onSubmit={submit}>
      <div className="form-heading">
        <div>
          <p className="eyebrow">
            {initial ? "Update release" : "New release"}
          </p>
          <h2>{initial ? "Edit release details" : "Create a release"}</h2>
        </div>
        <button
          className="icon-button"
          type="button"
          aria-label="Close release form"
          onClick={onCancel}
        >
          ×
        </button>
      </div>
      <div className="form-grid">
        <label>
          Release name
          <input
            required
            maxLength={120}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Production API"
          />
        </label>
        <label>
          Version
          <input
            required
            maxLength={64}
            value={version}
            onChange={(event) => setVersion(event.target.value)}
            placeholder="v1.4.0"
          />
        </label>
        <label>
          Status
          <select
            value={status}
            onChange={(event) => {
              const nextStatus = RELEASE_STATUSES.find(
                (value) => value === event.currentTarget.value,
              );
              if (nextStatus) {
                setStatus(nextStatus);
              }
            }}
          >
            {Object.entries(RELEASE_STATUS_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="wide-field">
          Notes <span className="optional-label">Optional</span>
          <textarea
            rows={3}
            maxLength={2000}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="What changed in this release?"
          />
        </label>
      </div>
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
      <div className="form-actions">
        <button
          className="button button-secondary"
          type="button"
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </button>
        <button
          className="button button-primary"
          type="submit"
          disabled={saving}
        >
          {saving ? "Saving…" : initial ? "Save changes" : "Create release"}
        </button>
      </div>
    </form>
  );
}
