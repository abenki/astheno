import { useState } from 'react'
import {
  ArrowUp,
  Calendar,
  ChevronDown,
  GitBranch,
  Mail,
  MessageSquare,
  Mic,
  Paperclip,
  Plus,
  Search,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  Users
} from 'lucide-react'
import { Logo } from '../components/Logo'
import { Button } from '../components/ui/Button'
import { IconButton } from '../components/ui/IconButton'
import { Card } from '../components/ui/Card'
import { Tabs } from '../components/ui/Tabs'
import { SidebarItem } from '../components/ui/SidebarItem'
import { PillInput } from '../components/ui/PillInput'

const colorGroups: { title: string; swatches: { name: string; varName: string }[] }[] = [
  {
    title: 'Surface',
    swatches: [
      { name: 'Sidebar', varName: '--color-surface-sidebar' },
      { name: 'Canvas', varName: '--color-surface-canvas' },
      { name: 'Raised', varName: '--color-surface-raised' },
      { name: 'Sunken', varName: '--color-surface-sunken' }
    ]
  },
  {
    title: 'Border',
    swatches: [
      { name: 'Subtle', varName: '--color-border-subtle' },
      { name: 'Default', varName: '--color-border-default' },
      { name: 'Strong', varName: '--color-border-strong' }
    ]
  },
  {
    title: 'Text',
    swatches: [
      { name: 'Primary', varName: '--color-text-primary' },
      { name: 'Secondary', varName: '--color-text-secondary' },
      { name: 'Tertiary', varName: '--color-text-tertiary' },
      { name: 'Disabled', varName: '--color-text-disabled' }
    ]
  },
  {
    title: 'Accent & semantic',
    swatches: [
      { name: 'Accent', varName: '--color-accent' },
      { name: 'Accent subtle', varName: '--color-accent-subtle' },
      { name: 'Danger', varName: '--color-danger' },
      { name: 'Success', varName: '--color-success' },
      { name: 'Warning', varName: '--color-warning' }
    ]
  }
]

const typeScale = [
  { label: 'text-2xl / 24px', className: 'text-2xl font-semibold' },
  { label: 'text-xl / 20px', className: 'text-xl font-semibold' },
  { label: 'text-lg / 18px', className: 'text-lg font-medium' },
  { label: 'text-base / 16px', className: 'text-base font-normal' },
  { label: 'text-sm / 14px', className: 'text-sm font-normal' },
  { label: 'text-xs / 12px', className: 'text-xs font-normal' }
]

const spacingScale = [4, 8, 12, 16, 20, 24, 32, 40]

function SectionHeading({
  title,
  description
}: {
  title: string
  description?: string
}): React.JSX.Element {
  return (
    <div className="mb-4">
      <h2 className="text-[15px] font-semibold text-(--color-text-primary)">{title}</h2>
      {description && (
        <p className="mt-0.5 text-[13px] text-(--color-text-secondary)">{description}</p>
      )}
    </div>
  )
}

function Swatch({ name, varName }: { name: string; varName: string }): React.JSX.Element {
  return (
    <div className="flex items-center gap-3">
      <div
        className="h-10 w-10 shrink-0 rounded-(--radius-md) border border-(--color-border-subtle)"
        style={{ backgroundColor: `var(${varName})` }}
      />
      <div>
        <div className="text-[13px] font-medium text-(--color-text-primary)">{name}</div>
        <div className="text-[12px] text-(--color-text-tertiary)">{varName}</div>
      </div>
    </div>
  )
}

function MockSidebar(): React.JSX.Element {
  const [active, setActive] = useState('chats')
  return (
    <div className="flex h-full w-60 shrink-0 flex-col gap-4 border-r border-(--color-border-subtle) bg-(--color-surface-sidebar) p-3">
      <Button variant="secondary" size="md" className="w-full justify-start gap-2">
        <Plus className="h-4 w-4" />
        New chat
      </Button>

      <div className="flex flex-col gap-0.5">
        <SidebarItem
          icon={<MessageSquare />}
          label="Chats"
          active={active === 'chats'}
          onClick={() => setActive('chats')}
        />
        <SidebarItem
          icon={<Users />}
          label="Cowork"
          active={active === 'cowork'}
          onClick={() => setActive('cowork')}
        />
        <SidebarItem
          icon={<Search />}
          label="Search"
          active={active === 'search'}
          onClick={() => setActive('search')}
        />
      </div>

      <div className="flex flex-col gap-0.5">
        <div className="px-2.5 pb-1 text-[11px] font-medium uppercase tracking-wide text-(--color-text-tertiary)">
          Connectors
        </div>
        <SidebarItem icon={<GitBranch />} label="GitHub" />
        <SidebarItem icon={<Mail />} label="Mail" />
        <SidebarItem icon={<Calendar />} label="Calendar" />
      </div>

      <div className="mt-auto flex flex-col gap-0.5">
        <SidebarItem icon={<Settings2 />} label="Settings" />
      </div>
    </div>
  )
}

function MockTopBar(): React.JSX.Element {
  const [mode, setMode] = useState('chat')
  return (
    <div className="drag flex h-12 shrink-0 items-center border-b border-(--color-border-subtle) bg-white pl-20 pr-3">
      <div className="flex items-center gap-2 text-(--color-text-primary)">
        <Logo size={16} />
        <span className="text-[13px] font-semibold">Astheno</span>
      </div>
      <div className="ml-6">
        <Tabs
          value={mode}
          onChange={setMode}
          items={[
            { value: 'chat', label: 'Chat', icon: <Sparkles className="h-3.5 w-3.5" /> },
            { value: 'cowork', label: 'Cowork', icon: <Users className="h-3.5 w-3.5" /> }
          ]}
        />
      </div>
      <div className="ml-auto flex items-center gap-1">
        <IconButton aria-label="Search">
          <Search />
        </IconButton>
        <IconButton aria-label="Settings">
          <Settings2 />
        </IconButton>
      </div>
    </div>
  )
}

function ShellPreview(): React.JSX.Element {
  return (
    <Card elevation="md" className="overflow-hidden">
      <div className="flex h-[420px] flex-col">
        <MockTopBar />
        <div className="flex flex-1 overflow-hidden">
          <MockSidebar />
          <div className="flex flex-1 flex-col items-center justify-center gap-6 bg-white px-8">
            <div className="flex items-center gap-2 text-(--color-text-primary)">
              <Logo size={28} />
            </div>
            <p className="text-lg text-(--color-text-primary)">Where should we begin?</p>
            <div className="w-full max-w-lg">
              <PillInput
                placeholder="Ask anything..."
                leading={
                  <>
                    <IconButton aria-label="Attach" size="sm">
                      <Plus />
                    </IconButton>
                    <IconButton aria-label="Tools" size="sm">
                      <SlidersHorizontal />
                    </IconButton>
                  </>
                }
                trailing={
                  <>
                    <button className="no-drag inline-flex h-7 items-center gap-1 rounded-(--radius-pill) px-2 text-[12.5px] font-medium text-(--color-text-secondary) hover:bg-(--color-surface-sunken)">
                      Opus 5
                      <ChevronDown className="h-3 w-3" />
                    </button>
                    <IconButton aria-label="Voice" size="sm">
                      <Mic />
                    </IconButton>
                    <IconButton aria-label="Send" size="sm" className="bg-(--color-accent-subtle) text-(--color-accent) hover:bg-(--color-accent-subtle)">
                      <ArrowUp />
                    </IconButton>
                  </>
                }
              />
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}

function TabsDemo(): React.JSX.Element {
  const [value, setValue] = useState('chat')
  return (
    <Tabs
      value={value}
      onChange={setValue}
      items={[
        { value: 'chat', label: 'Chat', icon: <Sparkles className="h-3.5 w-3.5" /> },
        { value: 'cowork', label: 'Cowork', icon: <Users className="h-3.5 w-3.5" /> }
      ]}
    />
  )
}

export function StyleGuide(): React.JSX.Element {
  return (
    <div className="flex h-screen flex-col bg-white">
      <div className="drag h-8 shrink-0" />
      <div className="flex-1 overflow-y-auto px-10 pb-24">
        <div className="mx-auto flex max-w-4xl flex-col gap-14 pt-4">
          <header>
            <div className="flex items-center gap-2 text-(--color-text-primary)">
              <Logo size={22} />
              <span className="text-lg font-semibold">Astheno</span>
            </div>
            <h1 className="mt-4 text-2xl font-semibold text-(--color-text-primary)">
              Design system
            </h1>
            <p className="mt-1.5 max-w-xl text-[14px] text-(--color-text-secondary)">
              Flat, neutral, quiet. White canvas, near-white sidebar, one blue accent used
              sparingly. This page documents the tokens and primitives before any real screen is
              built on top of them.
            </p>
            <p className="mt-3 text-[12.5px] text-(--color-text-tertiary)">
              <a href="#/" className="no-drag underline hover:text-(--color-text-secondary)">
                ← Back to app
              </a>
            </p>
          </header>

          <section>
            <SectionHeading title="Shell preview" description="Sidebar, top bar, and the pill input composed together." />
            <ShellPreview />
          </section>

          <section>
            <SectionHeading title="Color" description="Flat surfaces — #fcfcfc sidebar, #ffffff canvas — with a single accent." />
            <div className="grid grid-cols-2 gap-x-8 gap-y-8 sm:grid-cols-4">
              {colorGroups.map((group) => (
                <div key={group.title} className="flex flex-col gap-3">
                  <div className="text-[11px] font-medium uppercase tracking-wide text-(--color-text-tertiary)">
                    {group.title}
                  </div>
                  {group.swatches.map((s) => (
                    <Swatch key={s.varName} {...s} />
                  ))}
                </div>
              ))}
            </div>
          </section>

          <section>
            <SectionHeading title="Typography" description="System font stack — SF Pro on macOS, with cross-platform fallbacks." />
            <div className="flex flex-col gap-3">
              {typeScale.map((t) => (
                <div key={t.label} className="flex items-baseline gap-4">
                  <span className="w-32 shrink-0 text-[12px] text-(--color-text-tertiary)">
                    {t.label}
                  </span>
                  <span className={`${t.className} text-(--color-text-primary)`}>
                    The quick brown fox
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <SectionHeading title="Spacing" description="4px base unit." />
            <div className="flex items-end gap-3">
              {spacingScale.map((s) => (
                <div key={s} className="flex flex-col items-center gap-1.5">
                  <div className="bg-(--color-accent-subtle)" style={{ width: s, height: s }} />
                  <span className="text-[11px] text-(--color-text-tertiary)">{s}</span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <SectionHeading title="Radius" />
            <div className="flex items-center gap-6">
              {(
                [
                  ['sm', '--radius-sm'],
                  ['md', '--radius-md'],
                  ['lg', '--radius-lg'],
                  ['xl', '--radius-xl'],
                  ['pill', '--radius-pill']
                ] as const
              ).map(([label, varName]) => (
                <div key={label} className="flex flex-col items-center gap-2">
                  <div
                    className="h-14 w-14 border border-(--color-border-default) bg-(--color-surface-sunken)"
                    style={{ borderRadius: `var(${varName})` }}
                  />
                  <span className="text-[11px] text-(--color-text-tertiary)">{label}</span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <SectionHeading title="Elevation" description="Soft, low-contrast shadows — flat by default, lifted on hover/focus." />
            <div className="flex items-center gap-6">
              {(['flat', 'sm', 'md', 'lg'] as const).map((e) => (
                <div key={e} className="flex flex-col items-center gap-2">
                  <Card elevation={e} className="flex h-16 w-24 items-center justify-center">
                    <span className="text-[11px] text-(--color-text-tertiary)">{e}</span>
                  </Card>
                </div>
              ))}
            </div>
          </section>

          <section>
            <SectionHeading title="Buttons" />
            <div className="flex flex-col gap-4">
              {(['primary', 'accent', 'secondary', 'ghost', 'danger'] as const).map((variant) => (
                <div key={variant} className="flex items-center gap-3">
                  <span className="w-20 shrink-0 text-[12px] text-(--color-text-tertiary)">
                    {variant}
                  </span>
                  <Button variant={variant} size="sm">
                    Small
                  </Button>
                  <Button variant={variant} size="md">
                    Medium
                  </Button>
                  <Button variant={variant} size="lg">
                    Large
                  </Button>
                  <Button variant={variant} size="md" disabled>
                    Disabled
                  </Button>
                </div>
              ))}
            </div>
          </section>

          <section>
            <SectionHeading title="Icon buttons" />
            <div className="flex items-center gap-3">
              <IconButton aria-label="Default" size="lg">
                <Plus />
              </IconButton>
              <IconButton aria-label="Active" size="lg" active>
                <Search />
              </IconButton>
              <IconButton aria-label="Disabled" size="lg" disabled>
                <Paperclip />
              </IconButton>
            </div>
          </section>

          <section>
            <SectionHeading title="Tabs" />
            <TabsDemo />
          </section>

          <section className="pb-4">
            <SectionHeading title="Pill input" description="Hero input, used for the empty-state chat composer." />
            <div className="max-w-lg">
              <PillInput
                placeholder="Ask anything..."
                leading={
                  <>
                    <IconButton aria-label="Attach" size="sm">
                      <Plus />
                    </IconButton>
                  </>
                }
                trailing={
                  <IconButton aria-label="Send" size="sm">
                    <ArrowUp />
                  </IconButton>
                }
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
