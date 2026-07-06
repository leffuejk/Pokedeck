import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from './components/ThemeProvider';
import { AppShell } from './components/AppShell';
import { RequireAuth } from './components/RequireAuth';
import { LandingPage } from './pages/LandingPage';
import { DashboardPage } from './pages/DashboardPage';
import { CollectionPage } from './pages/CollectionPage';
import { DecksPage } from './pages/DecksPage';
import { DeckBuilderPage } from './pages/DeckBuilderPage';
import { DeckAnalysisPage } from './pages/DeckAnalysisPage';
import { CoachPage } from './pages/CoachPage';
import { NotFoundPage } from './pages/NotFoundPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30 * 1000,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route
              path="/app"
              element={
                <RequireAuth>
                  <AppShell />
                </RequireAuth>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="collection" element={<CollectionPage />} />
              <Route path="decks" element={<DecksPage />} />
              <Route path="decks/:id" element={<DeckBuilderPage />} />
              <Route path="decks/:id/analysis" element={<DeckAnalysisPage />} />
              <Route path="coach" element={<CoachPage />} />
            </Route>
            <Route path="/404" element={<NotFoundPage />} />
            <Route path="*" element={<Navigate to="/404" replace />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
