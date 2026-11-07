import { useEffect, useMemo, useState } from 'react';
import { fetchChannels, fetchMessages, fetchServers, login, sendMessage } from './lib/api';
import { connectSocket } from './lib/ws';
import type { Channel, Message, Server, Session, VoiceRoom } from './types';

const demoVoiceRooms: VoiceRoom[] = [
  { id: 'voice-1', name: 'Toplantı Odası', participants: 8 },
  { id: 'voice-2', name: 'Geliştirme', participants: 3 },
  { id: 'voice-3', name: 'Canlı Sohbet', participants: 14 },
];

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [servers, setServers] = useState<Server[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedServerId, setSelectedServerId] = useState('demo-server-1');
  const [selectedChannelId, setSelectedChannelId] = useState('chan-general');
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [email, setEmail] = useState('demo@lorensa.local');
  const [password, setPassword] = useState('password123');
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);

  const activeServer = useMemo(
    () => servers.find((server) => server.id === selectedServerId) ?? servers[0],
    [servers, selectedServerId],
  );

  const loadServerData = async (serverId: string, token: string) => {
    setLoading(true);
    try {
      const nextServers = await fetchServers(token);
      setServers(nextServers);

      const nextChannels = await fetchChannels(serverId, token);
      setChannels(nextChannels);

      if (nextChannels.length > 0) {
        const nextChannel = nextChannels[0].id;
        setSelectedChannelId(nextChannel);
        const nextMessages = await fetchMessages(nextChannel, token);
        setMessages(nextMessages);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!session) return;

    const socket = connectSocket(
      session.token,
      (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload?.type === 'message' && payload.channelId === selectedChannelId) {
            setMessages((current) => [
              ...current,
              {
                id: payload.id || crypto.randomUUID(),
                channelId: payload.channelId,
                authorId: payload.authorId || 'live-user',
                authorName: payload.authorName || 'User',
                content: payload.content || '',
                createdAt: payload.createdAt || new Date().toISOString(),
              },
            ]);
          }
        } catch {
          console.info('Raw websocket payload', event.data);
        }
      },
      () => setConnected(true),
      () => setConnected(false),
    );

    return () => socket.close();
  }, [session, selectedChannelId]);

  useEffect(() => {
    if (!session) return;
    loadServerData(selectedServerId, session.token);
  }, [session, selectedServerId]);

  useEffect(() => {
    if (!session || !selectedChannelId) return;
    fetchMessages(selectedChannelId, session.token)
      .then(setMessages)
      .catch(() => setMessages([]));
  }, [selectedChannelId, session]);

  const handleLogin = async () => {
    const result = await login(email, password);
    setSession(result);
    setSelectedServerId('demo-server-1');
    setSelectedChannelId('chan-general');
  };

  const handleSend = async () => {
    if (!session || !draft.trim()) return;

    const content = draft.trim();
    setDraft('');

    const optimistic = {
      id: crypto.randomUUID(),
      channelId: selectedChannelId,
      authorId: session.user.id,
      authorName: session.user.username,
      content,
      createdAt: new Date().toISOString(),
    };

    setMessages((current) => [...current, optimistic]);

    const message = await sendMessage(selectedChannelId, content, session.token);
    setMessages((current) =>
      current.map((item) => (item.id === optimistic.id ? message : item)),
    );
  };

  if (!session) {
    return (
      <div className="login-shell">
        <div className="login-card">
          <div className="brand-mark">L</div>
          <div className="brand-title">Lorensa</div>
          <h1>Giriş yap</h1>

          <label>
            E-posta
            <input value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>

          <label>
            Şifre
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          <button onClick={handleLogin}>Devam et</button>

          <p className="muted-text">
            Bu arayüz, backend çalışırken gerçek API ile bağlanır. Sunucu kapalıysa demo modda çalışır.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-pill">L</div>

        <div className="server-list">
          {servers.map((server) => (
            <button
              key={server.id}
              className={`server-button ${selectedServerId === server.id ? 'active' : ''}`}
              onClick={() => setSelectedServerId(server.id)}
              title={server.name}
            >
              {server.name.slice(0, 1).toUpperCase()}
            </button>
          ))}
        </div>

        <div className="profile-card">
          <div className="profile-name">{session.user.username}</div>
          <span className={`status-dot ${connected ? 'online' : 'offline'}`} />
          {connected ? 'Çevrimiçi' : 'Bağlantı yok'}
        </div>
      </aside>

      <nav className="channel-panel">
        <div className="panel-header">{activeServer?.name ?? 'Sunucu'}</div>

        {channels.map((channel) => (
          <button
            key={channel.id}
            className={`channel-button ${selectedChannelId === channel.id ? 'active' : ''}`}
            onClick={() => setSelectedChannelId(channel.id)}
          >
            <span className="hash">#</span>
            {channel.name}
          </button>
        ))}
      </nav>

      <main className="chat-panel">
        <header className="chat-header">
          <div>
            <strong># {channels.find((channel) => channel.id === selectedChannelId)?.name || 'genel'}</strong>
          </div>
          <div className={`header-status ${connected ? 'connected' : 'disconnected'}`}>
            {connected ? 'WebSocket bağlı' : 'WebSocket kapalı'}
          </div>
        </header>

        <div className="messages-wrap">
          <div className="messages-panel">
            {messages.map((message) => (
              <div key={message.id} className="message-row">
                <div className="message-avatar">{message.authorName.slice(0, 1).toUpperCase()}</div>
                <div className="message-body">
                  <div className="message-meta">
                    <span>{message.authorName}</span>
                    <time>{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
                  </div>
                  <div className="message-content">{message.content}</div>
                </div>
              </div>
            ))}
          </div>

          <aside className="voice-panel">
            <div className="voice-header">Ses / Video</div>
            {demoVoiceRooms.map((room) => (
              <div key={room.id} className="voice-room">
                <div>
                  <div className="voice-name">{room.name}</div>
                  <div className="voice-meta">{room.participants} katılımcı</div>
                </div>
                <button>Katıl</button>
              </div>
            ))}
          </aside>
        </div>

        <div className="composer">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Mesaj yaz..."
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                handleSend();
              }
            }}
          />
          <button onClick={handleSend} disabled={loading || !draft.trim()}>
            Gönder
          </button>
        </div>
      </main>
    </div>
  );
}
