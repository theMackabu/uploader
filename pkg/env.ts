export const PORT = parseInt(process.env.PORT || '3000', 10);
export const APP_URL = process.env.APP_URL || `http://localhost:${PORT}`;
export const APP_START_TIME = Date.now();
