import HomePage from './pages/HomePage';
import ErrorBoundary from './components/ErrorBoundary';
import BirthdaySurpriseModal from './components/BirthdaySurpriseModal';

export default function App() {
  return (
    <ErrorBoundary>
      <HomePage />
      <BirthdaySurpriseModal />
    </ErrorBoundary>
  );
}
