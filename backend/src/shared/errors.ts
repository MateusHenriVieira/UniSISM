/**
 * Erros tipados para mapear para o formato padrão da especificação (§1.7):
 *   { error: { code, message, details? } }
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: Record<string, unknown>;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export const BadRequest = (code: string, message: string, details?: Record<string, unknown>) =>
  new AppError(400, code, message, details);

export const Unauthorized = (code: string, message: string, details?: Record<string, unknown>) =>
  new AppError(401, code, message, details);

export const Forbidden = (code: string, message: string, details?: Record<string, unknown>) =>
  new AppError(403, code, message, details);

export const NotFound = (code: string, message: string, details?: Record<string, unknown>) =>
  new AppError(404, code, message, details);

export const Conflict = (code: string, message: string, details?: Record<string, unknown>) =>
  new AppError(409, code, message, details);

export const PayloadTooLarge = (code: string, message: string, details?: Record<string, unknown>) =>
  new AppError(413, code, message, details);

export const UnsupportedMediaType = (
  code: string,
  message: string,
  details?: Record<string, unknown>,
) => new AppError(415, code, message, details);

export const Unprocessable = (code: string, message: string, details?: Record<string, unknown>) =>
  new AppError(422, code, message, details);

export const TooManyRequests = (
  code: string,
  message: string,
  details?: Record<string, unknown>,
) => new AppError(429, code, message, details);
