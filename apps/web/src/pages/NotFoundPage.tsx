import { Link } from 'react-router-dom';
import { Mascot } from '../components/Mascot';

export function NotFoundPage() {
  return (
    <div className="grid min-h-screen place-items-center px-6 text-center">
      <div className="animate-spring-in">
        <Mascot size={160} />
        <h1 className="mt-4 text-5xl font-black">404</h1>
        <p className="mt-2 text-muted">This card isn’t in the binder. Let’s get you back.</p>
        <Link to="/app" className="pd-btn-primary mt-6">
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
