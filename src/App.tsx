import { useEffect, useState } from 'react';
import Changelog from './ui/Changelog.tsx';
import Wizard from './ui/Wizard.tsx';

const CHANGELOG_HASH = '#/changelog';

function isChangelog(): boolean {
  return window.location.hash === CHANGELOG_HASH;
}

export default function App() {
  const [changelog, setChangelog] = useState(isChangelog);

  useEffect(() => {
    const onHashChange = () => setChangelog(isChangelog());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  return changelog ? <Changelog /> : <Wizard />;
}