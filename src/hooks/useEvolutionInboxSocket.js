import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { API_URL } from '../config.js';
import { getToken } from '../api/auth.js';

function resolveSocketOrigin() {
  if (API_URL) return API_URL;
  if (typeof window !== 'undefined') return window.location.origin;
  return '';
}

export function useEvolutionInboxSocket({ enabled, instanceFilter, activeThread, onThreadsUpdated, onThreadActivity }) {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const handlersRef = useRef({ onThreadsUpdated, onThreadActivity });
  handlersRef.current = { onThreadsUpdated, onThreadActivity };

  useEffect(() => {
    if (!enabled) return undefined;

    const token = getToken();
    if (!token) return undefined;

    const origin = resolveSocketOrigin();
    const socket = io(`${origin}/evolution-inbox`, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      auth: { token },
      reconnection: true,
      reconnectionAttempts: Infinity,
    });
    socketRef.current = socket;

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('threads_updated', (payload) => {
      handlersRef.current.onThreadsUpdated?.(payload);
    });
    socket.on('thread_activity', (payload) => {
      handlersRef.current.onThreadActivity?.(payload);
    });

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.removeAllListeners('threads_updated');
      socket.removeAllListeners('thread_activity');
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [enabled]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket?.connected) return;
    const instanceId = instanceFilter?.trim() || null;
    socket.emit('subscribe_inbox', { instanceId });
  }, [connected, instanceFilter]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket?.connected || !activeThread) return;

    const body = {
      instanceId: activeThread.instanceId,
      contactPhone: activeThread.contactPhone,
    };
    socket.emit('subscribe_thread', body);

    return () => {
      if (socket.connected) {
        socket.emit('unsubscribe_thread', body);
      }
    };
  }, [
    connected,
    activeThread?.instanceId,
    activeThread?.contactPhone,
  ]);

  return { connected };
}
