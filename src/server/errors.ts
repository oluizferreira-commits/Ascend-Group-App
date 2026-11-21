export class AppError extends Error {
  constructor(message: string, readonly code: "unauthenticated" | "forbidden" | "not_found" | "validation" | "conflict") {
    super(message);
  }
}
export const forbiddenError = (msg = "Você não tem permissão para esta ação.") => new AppError(msg, "forbidden");
export const notFoundError = (msg = "Registro não encontrado.") => new AppError(msg, "not_found");
export const conflictError = (msg: string) => new AppError(msg, "conflict");
export const validationError = (msg: string) => new AppError(msg, "validation");

export type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[] | undefined> };

/** Postgres unique-violation / check-violation helpers for friendly messages. */
export function pgErrorCode(e: unknown): string | undefined {
  let cur: unknown = e;
  for (let i = 0; i < 4 && cur; i++) {
    const code = (cur as { code?: unknown }).code;
    if (typeof code === "string" && /^[0-9A-Z]{5}$/.test(code)) return code;
    cur = (cur as { cause?: unknown }).cause;
  }
  return undefined;
}
export function pgConstraint(e: unknown): string | undefined {
  let cur: unknown = e;
  for (let i = 0; i < 4 && cur; i++) {
    const c = (cur as { constraint_name?: unknown }).constraint_name;
    if (typeof c === "string") return c;
    cur = (cur as { cause?: unknown }).cause;
  }
  return undefined;
}
