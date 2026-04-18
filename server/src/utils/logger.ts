export const logger = {
  info: (msg: string, meta?: object) =>
    console.log(JSON.stringify({ level: "info",  msg, ...meta, ts: new Date() })),
  error: (msg: string, meta?: object) =>
    console.error(JSON.stringify({ level: "error", msg, ...meta, ts: new Date() })),
  warn: (msg: string, meta?: object) =>
    console.warn(JSON.stringify({ level: "warn",  msg, ...meta, ts: new Date() })),
};
