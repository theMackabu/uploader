export const APP_START_TIME = Date.now();
export const PORT = parseInt(process.env.PORT || '3000', 10);

// biome-ignore lint/style/noNonNullAssertion: ensure ACCESS_KEY exists
export const ACCESS_KEY = process.env.ACCESS_KEY!;
