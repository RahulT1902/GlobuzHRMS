import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";

export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      console.error("Validation Error:", result.error.flatten().fieldErrors);
      return res.status(422).json({
        success: false,
        message: "Validation failed",
        data: null,
        error: result.error.flatten().fieldErrors,
      });
    }
    req.body = result.data;
    next();
  };
};
