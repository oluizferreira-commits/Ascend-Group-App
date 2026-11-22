import { Ball } from "./ball";

export function TrophyRow({ gold, silver, className }: { gold: number; silver: number; className?: string }) {
  if (!gold && !silver) return null;
  return (
    <span className={`inline-flex items-center gap-3 ${className ?? ""}`} aria-label={`${gold} Bola(s) de Ouro e ${silver} Bola(s) de Prata`}>
      {gold > 0 && <span className="inline-flex items-center gap-1 font-display font-bold"><Ball kind="gold" size={20} />×{gold}</span>}
      {silver > 0 && <span className="inline-flex items-center gap-1 font-display font-bold"><Ball kind="silver" size={20} />×{silver}</span>}
    </span>
  );
}
