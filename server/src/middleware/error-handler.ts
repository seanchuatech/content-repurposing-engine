import { Elysia } from 'elysia';

export const errorHandler = new Elysia().onError(({ code, error, set }) => {
  console.error(
    `[ERROR] ${code}: ${error instanceof Error ? error.message : JSON.stringify(error)}`,
  );

  if (code === 'NOT_FOUND') {
    set.status = 404;
    return { error: 'Not Found', code };
  }

  if (code === 'VALIDATION') {
    set.status = 400;
    // @ts-ignore - Elysia validation error type is complex, safely extracting all
    const details = 'all' in error ? error.all : error;
    return { error: 'Validation Error', details, code };
  }

  set.status = 500;
  return {
    error: 'Internal Server Error',
    message: error instanceof Error ? error.message : 'Unknown error',
    code,
  };
});
