export function remainingRestSeconds(endsAtMs: number, nowMs: number): number {
  if (!Number.isFinite(endsAtMs) || !Number.isFinite(nowMs)) return 0;
  return Math.max(0, Math.ceil((endsAtMs - nowMs) / 1000));
}

export function formatRestTime(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(Number.isFinite(totalSeconds) ? totalSeconds : 0));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
