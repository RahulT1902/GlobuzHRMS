export const apiResponse = {
  success: (res: any, message: string, data: any = null, statusCode = 200) => {
    return res.status(statusCode).json({ success: true, message, data, error: null });
  },
  error: (res: any, message: string, statusCode = 500, error: any = null) => {
    return res.status(statusCode).json({ success: false, message, data: null, error });
  },
};
