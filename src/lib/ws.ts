const WS_BASE = import.meta.env.VITE_WS_URL || 'ws://local.revolt.chat:14703';

export function connectSocket(
  token: string,
  onMessage: (event: MessageEvent<string>) => void,
  onOpen?: () => void,
  onClose?: () => void,
) {
  const url = `${WS_BASE}?token=${encodeURIComponent(token)}`;
  const socket = new WebSocket(url);

  socket.onopen = () => {
    onOpen?.();
  };

  socket.onmessage = (event) => {
    onMessage(event);
  };

  socket.onclose = () => {
    onClose?.();
  };

  return socket;
}
