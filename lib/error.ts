export class AppError extends Error {
  statusCode?: number;
  additionalInfo?: string;

  constructor(message: string, statusCode?: number, additionalInfo?: string) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.additionalInfo = additionalInfo;
  }
}

export const getErrorMessage = (error: any): string => {
  if (error?.response?.data?._embedded?.errors) {
    return error.response.data._embedded.errors
      .map((e: any) => e.message)
      .join(", ");
  } else if (error?.response?.message) {
    return error.response.message;
  } else if (error?.message) {
    return error.message;
  } else {
    return "An unknown error occurred";
  }
};
