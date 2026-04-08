import React from 'react'
import { ChopsPlayer } from './components/PlayerLayout.tsx'

const BUILD_TS = 'v9 · Wed Apr 8 2026 16:45 IDT'

export function App(): React.JSX.Element {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-6">
      <h1 className="text-3xl font-bold tracking-tight mb-1 text-emerald-400">
        Chops Player
      </h1>
      <h2 className="text-base font-normal text-neutral-400 mb-1">
        Phase I — MIDI Playback Demo
      </h2>
      <p className="text-xs text-neutral-600 mb-6 font-mono">{BUILD_TS}</p>
      <ChopsPlayer midiUrl="/demo/bags-groove.mid" />
    </div>
  )
}
