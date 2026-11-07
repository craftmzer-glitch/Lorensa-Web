import type { Channel, Message, Server, Session, User } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://local.revolt.chat:14702';

async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }

  return (await res.json()) as T;
}

export { API_BASE };

export async function login(email: string, password: string): Promise<Session> {
  try {
    const data = await request<{ token: string; user: User }>('/auth/session/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    return {
      token: data.token,
      user: data.user,
    };
  } catch {
    return {
      token: 'demo-token',
      user: {
        id: 'demo-user',
        username: 'Demo User',
        email,
        status: 'online',
      },
    };
  }
}

export async function fetchServers(token: string): Promise<Server[]> {
  try {
    return await request<Server[]>('/servers', {}, token);
  } catch {
    return [
      { id: 'demo-server-1', name: 'Lorensa' },
      { id: 'demo-server-2', name: 'Topluluk' },
      { id: 'demo-server-3', name: 'Destek' },
    ];
  }
}

export async function fetchChannels(serverId: string, token: string): Promise<Channel[]> {
  try {
    return await request<Channel[]>(`/servers/${serverId}/channels`, {}, token);
  } catch {
    const fallback: Record<string, Channel[]> = {
      'demo-server-1': [
        { id: 'chan-general', serverId: 'demo-server-1', name: 'genel', type: 'text' },
        { id: 'chan-random', serverId: 'demo-server-1', name: 'random', type: 'text' },
        { id: 'chan-voice', serverId: 'demo-server-1', name: 'oda-1', type: 'voice' },
      ],
      'demo-server-2': [
        { id: 'chan-announcements', serverId: 'demo-server-2', name: 'duyurular', type: 'text' },
        { id: 'chan-dev', serverId: 'demo-server-2', name: 'geliştirici', type: 'text' },
      ],
      'demo-server-3': [
        { id: 'chan-support', serverId: 'demo-server-3', name: 'destek', type: 'text' },
      ],
    };

    return fallback[serverId] || [];
  }
}

export async function fetchMessages(channelId: string, token: string): Promise<Message[]> {
  try {
    return await request<Message[]>(`/channels/${channelId}/messages`, {}, token);
  } catch {
    const fallback: Record<string, Message[]> = {
      'chan-general': [
        {
          id: 'msg-1',
          channelId: 'chan-general',
          authorId: 'bot-1',
          authorName: 'Lorensa Bot',
          content: 'Lorensa web istemcisi açıldı. Hoş geldin!',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'msg-2',
          channelId: 'chan-general',
          authorId: 'user-1',
          authorName: 'Aysel',
          content: 'Merhaba! Günaydın.',
          createdAt: new Date().toISOString(),
        },
      ],
      'chan-random': [],
      'chan-voice': [],
      'chan-announcements': [],
      'chan-dev': [],
      'chan-support': [],
    };

    return fallback[channelId] || [];
  }
}

export async function sendMessage(channelId: string, content: string, token: string): Promise<Message> {
  try {
    return await request<Message>(`/channels/${channelId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }, token);
  } catch {
    return {
      id: crypto.randomUUID(),
      channelId,
      authorId: 'local-user',
      authorName: 'You',
      content,
      createdAt: new Date().toISOString(),
    };
  }
}
