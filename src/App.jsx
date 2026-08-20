import React, { useCallback, useEffect, useState } from 'react'
import CozyBackdrop from './components/CozyBackdrop'
import WelcomeScreen from './components/WelcomeScreen'
import PuzzleScreen from './components/PuzzleScreen'
import RevealScreen from './components/RevealScreen'
import ColoringScreen from './components/ColoringScreen'
import { memories } from './data/memories'
import { useStickyState } from './hooks/useStickyState'

/** Change this and the app greets her by name everywhere. */
const HER_NAME = 'Zukhra'

/* gallery -> puzzle -> reveal -> coloring, and back to the gallery whenever
 * she likes. Four phases is the whole router; anything more would be overkill
 * for a single-page gift. */
export default function App() {
  const [phase, setPhase] = useState('gallery')
  const [activeId, setActiveId] = useState(null)
  const [completed, setCompleted] = useStickyState('cozy:completed', [])

  const memory = memories.find((m) => m.id === activeId) || null

  // A phase change is a page change as far as she is concerned.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [phase, activeId])

  const openMemory = useCallback((picked) => {
    setActiveId(picked.id)
    setPhase('puzzle')
  }, [])

  const backToGallery = useCallback(() => {
    setPhase('gallery')
    setActiveId(null)
  }, [])

  const handleSolved = useCallback(() => {
    setCompleted((done) => (done.includes(activeId) ? done : [...done, activeId]))
    setPhase('reveal')
  }, [activeId, setCompleted])

  return (
    <div className="relative min-h-full">
      <CozyBackdrop />

      <main key={`${phase}-${activeId ?? 'none'}`} className="animate-fade-up">
        {phase === 'gallery' && (
          <WelcomeScreen name={HER_NAME} completed={completed} onPick={openMemory} />
        )}

        {phase === 'puzzle' && memory && (
          <PuzzleScreen memory={memory} onSolved={handleSolved} onBack={backToGallery} />
        )}

        {phase === 'reveal' && memory && (
          <RevealScreen
            memory={memory}
            onColor={() => setPhase('coloring')}
            onBack={backToGallery}
          />
        )}

        {phase === 'coloring' && memory && (
          <ColoringScreen
            key={memory.id}
            memory={memory}
            artistName={HER_NAME}
            onBack={backToGallery}
          />
        )}
      </main>
    </div>
  )
}
