export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function validationError(
  issues: readonly {
    code: string;
    path: readonly (string | number | symbol)[];
    message: string;
  }[],
): AppError {
  const details = issues.map((issue) => ({
    code: issue.code,
    path: issue.path.map(String),
    message: issue.message,
  }));
  return new AppError(
    400,
    "VALIDATION_ERROR",
    "Request validation failed",
    details,
  );
}
