export type User = {
  id: string;
  username: string;
  email?: string;
  avatar?: string;
  status?: string;
};

export type Session = {
  token: string;
  user: User;
};

export type Server = {
  id: string;
  name: string;
  icon?: string;
};

export type Channel = {
  id: string;
  serverId: string;
  name: string;
  type: 'text' | 'voice';
};

export type Message = {
  id: string;
  channelId: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
};

export type VoiceRoom = {
  id: string;
  name: string;
  participants: number;
};
