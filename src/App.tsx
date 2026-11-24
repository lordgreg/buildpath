import ErrorBoundary from './ui/ErrorBoundary.tsx';
import Wizard from './ui/Wizard.tsx';

export default function App() {
  return (
    <ErrorBoundary>
      <Wizard />
    </ErrorBoundary>
  );
}