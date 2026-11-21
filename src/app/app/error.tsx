"use client";
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="card mx-auto max-w-lg p-6 text-center">
      <h1 className="font-display text-2xl font-bold uppercase">Algo deu errado</h1>
      <p className="mt-2 text-sm text-ink-400">{error.message && !error.digest ? error.message : "Erro inesperado. A equipe técnica pode consultar os logs do servidor."}</p>
      {error.digest && <p className="mt-1 text-xs text-ink-400">Código: {error.digest}</p>}
      <button onClick={reset} className="btn-primary mt-4">Tentar novamente</button>
    </div>
  );
}
