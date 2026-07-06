import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useMe } from '../hooks/useMe';
import { LoadingBlock } from './Spinner';

/** Gate for authenticated routes. Redirects to the landing page when signed out. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { data: user, isLoading, isError } = useMe();

  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <LoadingBlock label="Waking the Professor…" />
      </div>
    );
  }

  if (isError || !user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
