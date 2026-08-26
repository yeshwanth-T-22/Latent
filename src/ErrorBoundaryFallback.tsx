import { AlertCircle, RefreshCw } from 'lucide-react';
import type { FallbackProps } from 'react-error-boundary';

export function ErrorBoundaryFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', padding: '2rem', textAlign: 'center', backgroundColor: '#f9fafb' }}>
      <div style={{ backgroundColor: '#fee2e2', padding: '1rem', borderRadius: '50%', marginBottom: '1.5rem' }}>
        <AlertCircle size={48} color="#ef4444" />
      </div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#111827', marginBottom: '0.5rem' }}>Something went wrong</h1>
      <p style={{ color: '#4b5563', maxWidth: '400px', marginBottom: '2rem' }}>
        We encountered an unexpected error. Don't worry, your progress is saved.
      </p>
      
      <div style={{ backgroundColor: '#fff', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb', marginBottom: '2rem', maxWidth: '500px', width: '100%', overflowX: 'auto', textAlign: 'left' }}>
        <pre style={{ fontSize: '0.875rem', color: '#ef4444', margin: 0 }}>
          {error.message}
        </pre>
      </div>

      <button 
        onClick={resetErrorBoundary}
        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#4ba59a', color: 'white', padding: '0.75rem 1.5rem', borderRadius: '9999px', border: 'none', fontWeight: 500, cursor: 'pointer', transition: 'background-color 0.2s' }}
        onMouseOver={e => (e.currentTarget.style.backgroundColor = '#3a847b')}
        onMouseOut={e => (e.currentTarget.style.backgroundColor = '#4ba59a')}
      >
        <RefreshCw size={18} />
        Try again
      </button>
    </div>
  );
}
