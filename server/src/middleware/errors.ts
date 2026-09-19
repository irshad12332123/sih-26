import type {
  ErrorRequestHandler,
  RequestHandler,
  Request,
  Response,
} from "express";
import { ZodError } from "zod";

export const notFound: RequestHandler = (_req: Request, res: Response) =>
  res
    .status(404)
    .json({ error: { code: "NOT_FOUND", message: "Resource not found." } });
export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  if (error instanceof ZodError)
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Request validation failed.",
        details: error.flatten(),
      },
    });
  console.error(
    JSON.stringify({
      level: "error",
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      path: req.originalUrl || req.url,
      method: req.method,
    }),
  );
  return res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: error instanceof Error ? error.message : "Unexpected server error.",
    },
  });
};
