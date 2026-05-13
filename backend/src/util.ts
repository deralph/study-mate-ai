import { randomUUID } from 'node:crypto';
export const uid = () => randomUUID();
export const nowIso = () => new Date().toISOString();
