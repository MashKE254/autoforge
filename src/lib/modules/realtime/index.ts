/**
 * Real-time/WebSocket Module
 *
 * Provides real-time communication capabilities using Socket.io or Supabase Realtime
 */

export type RealtimeProvider = 'socketio' | 'supabase-realtime' | 'ably' | 'pusher';

export interface RealtimeModuleConfig {
  provider: RealtimeProvider;
  channels?: string[];
  features?: Array<'broadcast' | 'presence' | 'typing-indicators'>;
}

export interface RealtimeModuleOutput {
  files: Array<{ path: string; content: string }>;
  envVars: string[];
  dependencies: string[];
  instructions: string[];
}

const socketioTemplate = `import { Server } from 'socket.io';
import { NextApiRequest } from 'next';
import { Server as HTTPServer } from 'http';
import { Socket as NetSocket } from 'net';

interface SocketServer extends HTTPServer {
  io?: Server | undefined;
}

interface SocketWithIO extends NetSocket {
  server: SocketServer;
}

interface NextApiResponseWithSocket extends Response {
  socket: SocketWithIO;
}

export default function handler(
  req: NextApiRequest,
  res: NextApiResponseWithSocket
) {
  if (res.socket.server.io) {
    console.log('Socket.io already initialized');
    res.end();
    return;
  }

  const io = new Server(res.socket.server);
  res.socket.server.io = io;

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('join-room', (room: string) => {
      socket.join(room);
      console.log(\`Client \${socket.id} joined room: \${room}\`);
    });

    socket.on('leave-room', (room: string) => {
      socket.leave(room);
      console.log(\`Client \${socket.id} left room: \${room}\`);
    });

    socket.on('send-message', (data: { room: string; message: any }) => {
      io.to(data.room).emit('receive-message', data.message);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  console.log('Socket.io initialized');
  res.end();
}`;

const supabaseRealtimeTemplate = `import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export function subscribeToChannel(
  channelName: string,
  event: string,
  callback: (payload: any) => void
) {
  const channel = supabase.channel(channelName);

  channel
    .on('broadcast', { event }, callback)
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export async function broadcastToChannel(
  channelName: string,
  event: string,
  payload: any
) {
  const channel = supabase.channel(channelName);
  await channel.send({
    type: 'broadcast',
    event,
    payload,
  });
}`;

const useRealtimeHook = `'use client';

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

let socket: Socket;

export function useRealtime(room?: string) {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);

  useEffect(() => {
    // Initialize socket connection
    socketInitializer();

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    if (room && socket?.connected) {
      socket.emit('join-room', room);
    }
  }, [room]);

  async function socketInitializer() {
    await fetch('/api/socket');

    socket = io();

    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('receive-message', (message: any) => {
      setMessages((prev) => [...prev, message]);
    });
  }

  const sendMessage = (message: any) => {
    if (room) {
      socket.emit('send-message', { room, message });
    }
  };

  return { isConnected, messages, sendMessage };
}`;

export function generateRealtimeModule(config: RealtimeModuleConfig): RealtimeModuleOutput {
  const files: Array<{ path: string; content: string }> = [];
  const envVars: string[] = [];
  const dependencies: string[] = [];
  const instructions: string[] = [];

  if (config.provider === 'socketio') {
    files.push(
      { path: 'pages/api/socket.ts', content: socketioTemplate },
      { path: 'hooks/use-realtime.ts', content: useRealtimeHook }
    );
    dependencies.push('socket.io', 'socket.io-client');
    instructions.push('Socket.io will be automatically initialized on first connection');
  } else if (config.provider === 'supabase-realtime') {
    files.push({ path: 'lib/realtime/supabase.ts', content: supabaseRealtimeTemplate });
    envVars.push('NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY');
    instructions.push('Supabase Realtime is included with your Supabase project');
  }

  return { files, envVars, dependencies, instructions };
}

export function getRealtimeModulePrompt(config: RealtimeModuleConfig): string {
  return `## Real-time Module\n\nProvider: ${config.provider}\nChannels: ${config.channels?.join(', ') || 'default'}\n\nIncludes WebSocket connection, room-based messaging, and real-time updates.`;
}
