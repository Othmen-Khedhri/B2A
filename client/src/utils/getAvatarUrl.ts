const API_BASE = import.meta.env.VITE_API_URL ?? "";

export const getAvatarUrl = (avatarUrl?: string | null): string | null =>
  avatarUrl ? `${API_BASE}${avatarUrl}` : null;
