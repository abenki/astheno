import { useEffect, useState } from 'react'
import { AppShell } from './AppShell'
import { StyleGuide } from './pages/StyleGuide'

function App(): React.JSX.Element {
  const [hash, setHash] = useState(window.location.hash)

  useEffect(() => {
    const onHashChange = (): void => setHash(window.location.hash)
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  if (hash === '#/styleguide') return <StyleGuide />
  return <AppShell />
}

export default App
