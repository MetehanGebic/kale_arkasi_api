import { ZodError } from 'zod';
import AppError from '../core/errors/AppError.js';
export const errorHandler = (err, req, res, next) => {
  // Eğer özel bir status code atanmamışsa 500 (Internal Server Error)
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';
  // 1. Zod Validation Hataları
  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: 'Geçersiz veri formatı.',
      errors: err.issues.map((e) => e.message),
    });
  }
  // 2. Kendi Fırlattığımız Kontrollü Hatalar (AppError)
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }
  // 3. Beklenmeyen Programcı Hataları / Sunucu Hataları
  console.error('[UNHANDLED ERROR] 💥', err);
  return res.status(500).json({
    success: false,
    message: 'Sunucu tarafında beklenmeyen bir hata oluştu.',
  });
};