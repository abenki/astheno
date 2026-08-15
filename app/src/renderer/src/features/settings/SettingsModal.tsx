import { useEffect, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'

interface ProviderRow {
  id: string
  name: string
  configured: boolean
}

interface SettingsModalProps {
  open: boolean
  onClose: () => void
}

export function SettingsModal({ open, onClose }: SettingsModalProps): React.JSX.Element | null {
  const [providers, setProviders] = useState<ProviderRow[]>([])
  const [keyDrafts, setKeyDrafts] = useState<Record<string, string>>({})
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    window.api.settings.getProviderStatus().then(setProviders)
  }, [open])

  async function refresh(): Promise<void> {
    setProviders(await window.api.settings.getProviderStatus())
  }

  async function handleSave(providerId: string): Promise<void> {
    const key = keyDrafts[providerId]?.trim()
    if (!key) return
    setBusyId(providerId)
    await window.api.settings.setApiKey(providerId, key)
    setKeyDrafts((prev) => ({ ...prev, [providerId]: '' }))
    await refresh()
    setBusyId(null)
  }

  async function handleClear(providerId: string): Promise<void> {
    setBusyId(providerId)
    await window.api.settings.clearApiKey(providerId)
    await refresh()
    setBusyId(null)
  }

  if (!open) return null

  return (
    <Modal title="Settings" onClose={onClose}>
      <h3 className="mb-3 text-[13px] font-medium text-(--color-text-secondary)">Model providers</h3>
      <div className="flex flex-col gap-2">
        {providers.map((provider) => (
          <div
            key={provider.id}
            className="flex items-center gap-2 rounded-(--radius-md) border border-(--color-border-subtle) p-3"
          >
            <div className="flex-1">
              <div className="text-[14px] text-(--color-text-primary)">{provider.name}</div>
              <div
                className={`text-[12px] ${
                  provider.configured ? 'text-(--color-success)' : 'text-(--color-text-tertiary)'
                }`}
              >
                {provider.configured ? 'Connected' : 'Not connected'}
              </div>
            </div>
            {provider.configured ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleClear(provider.id)}
                disabled={busyId === provider.id}
              >
                Remove
              </Button>
            ) : (
              <>
                <input
                  type="password"
                  autoComplete="off"
                  value={keyDrafts[provider.id] ?? ''}
                  onChange={(e) => setKeyDrafts((prev) => ({ ...prev, [provider.id]: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && handleSave(provider.id)}
                  placeholder="API key"
                  className="w-44 rounded-(--radius-sm) border border-(--color-border-default) px-2.5 py-1.5 text-[13px] text-(--color-text-primary) focus:border-(--color-border-strong) focus:outline-none"
                />
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleSave(provider.id)}
                  disabled={busyId === provider.id || !keyDrafts[provider.id]?.trim()}
                >
                  Save
                </Button>
              </>
            )}
          </div>
        ))}
      </div>
    </Modal>
  )
}
