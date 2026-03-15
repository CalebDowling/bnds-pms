/**
 * Safely extract an error message from an unknown error.
 * Use in catch blocks instead of `catch (err: any)`.
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'An unexpected error occurred';
}

/**
 * Type guard for checking if an error has a specific code property
 * (useful for Prisma errors, etc.)
 */
export function isPrismaError(error: unknown): error is { code: string; message: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as any).code === 'string'
  );
}
