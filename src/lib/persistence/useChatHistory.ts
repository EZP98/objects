/**
 * Hook for managing chat history with IndexedDB persistence
 * Handles messages, snapshots, and chat sessions
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ChatData,
  ChatMessage,
  FileSnapshot,
  saveChat,
  getChat,
  getChatsByProject,
  deleteChat,
  saveSnapshot,
  getSnapshot,
  generateChatId,
  generateMessageId,
  forkChat,
} from './db';

interface UseChatHistoryOptions {
  projectName: string;
  currentFiles?: Record<string, string>;
  onRestoreSnapshot?: (files: FileSnapshot) => void;
}

interface UseChatHistoryReturn {
  // Current chat
  chatId: string | null;
  messages: ChatMessage[];
  isLoading: boolean;

  // Chat operations
  addMessage: (role: 'user' | 'assistant', content: string, isError?: boolean) => ChatMessage;
  updateMessage: (messageId: string, content: string) => void;
  clearChat: () => Promise<void>;

  // Chat history
  chatHistory: ChatData[];
  loadChat: (chatId: string) => Promise<void>;
  newChat: () => void;
  deleteCurrentChat: () => Promise<void>;

  // Snapshots
  takeSnapshot: (messageId: string) => Promise<void>;
  restoreSnapshot: (messageId: string) => Promise<void>;

  // Fork
  forkFromMessage: (messageId: string) => Promise<void>;
}

export function useChatHistory({
  projectName,
  currentFiles,
  onRestoreSnapshot,
}: UseChatHistoryOptions): UseChatHistoryReturn {
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const currentFilesRef = useRef(currentFiles);
  currentFilesRef.current = currentFiles;

  // Load chat history for project
  const loadChatHistory = useCallback(async () => {
    try {
      const chats = await getChatsByProject(projectName);
      setChatHistory(chats);
      return chats;
    } catch (e) {
      console.error('Failed to load chat history:', e);
      return [];
    }
  }, [projectName]);

  // Initialize - load most recent chat or create new one
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      try {
        const chats = await loadChatHistory();

        if (chats.length > 0) {
          // Load most recent chat
          const mostRecent = chats[0];
          setChatId(mostRecent.id);
          setMessages(mostRecent.messages);
        } else {
          // Create new chat
          const newId = generateChatId();
          setChatId(newId);
          setMessages([]);
        }
      } catch (e) {
        console.error('Failed to initialize chat:', e);
        const newId = generateChatId();
        setChatId(newId);
        setMessages([]);
      }
      setIsLoading(false);
    };

    init();
  }, [projectName, loadChatHistory]);

  // Save chat whenever messages change
  useEffect(() => {
    if (!chatId || isLoading) return;

    const saveCurrentChat = async () => {
      try {
        const existingChat = await getChat(chatId);
        const chatData: ChatData = {
          id: chatId,
          projectName,
          messages,
          description: messages[0]?.content.slice(0, 50) || 'New chat',
          createdAt: existingChat?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await saveChat(chatData);
        // Refresh history
        loadChatHistory();
      } catch (e) {
        console.error('Failed to save chat:', e);
      }
    };

    if (messages.length > 0) {
      saveCurrentChat();
    }
  }, [chatId, messages, projectName, isLoading, loadChatHistory]);

  // Add a new message
  const addMessage = useCallback((
    role: 'user' | 'assistant',
    content: string,
    isError?: boolean
  ): ChatMessage => {
    const message: ChatMessage = {
      id: generateMessageId(),
      role,
      content,
      timestamp: new Date().toISOString(),
      isError,
    };
    setMessages(prev => [...prev, message]);
    return message;
  }, []);

  // Update an existing message
  const updateMessage = useCallback((messageId: string, content: string) => {
    setMessages(prev => prev.map(msg =>
      msg.id === messageId ? { ...msg, content } : msg
    ));
  }, []);

  // Clear current chat
  const clearChat = useCallback(async () => {
    if (chatId) {
      await deleteChat(chatId);
    }
    const newId = generateChatId();
    setChatId(newId);
    setMessages([]);
    await loadChatHistory();
  }, [chatId, loadChatHistory]);

  // Load a specific chat
  const loadChat = useCallback(async (id: string) => {
    try {
      const chat = await getChat(id);
      if (chat) {
        setChatId(chat.id);
        setMessages(chat.messages);
      }
    } catch (e) {
      console.error('Failed to load chat:', e);
    }
  }, []);

  // Start a new chat
  const newChat = useCallback(() => {
    const newId = generateChatId();
    setChatId(newId);
    setMessages([]);
  }, []);

  // Delete current chat
  const deleteCurrentChat = useCallback(async () => {
    if (chatId) {
      await deleteChat(chatId);
      const chats = await loadChatHistory();

      if (chats.length > 0) {
        setChatId(chats[0].id);
        setMessages(chats[0].messages);
      } else {
        const newId = generateChatId();
        setChatId(newId);
        setMessages([]);
      }
    }
  }, [chatId, loadChatHistory]);

  // Take a snapshot of current files
  const takeSnapshot = useCallback(async (messageId: string) => {
    if (!chatId || !currentFilesRef.current) return;

    try {
      await saveSnapshot({
        chatId,
        messageId,
        files: currentFilesRef.current,
        timestamp: new Date().toISOString(),
      });
    } catch (e) {
      console.error('Failed to save snapshot:', e);
    }
  }, [chatId]);

  // Restore files from a snapshot
  const restoreSnapshot = useCallback(async (messageId: string) => {
    if (!chatId) return;

    try {
      const snapshot = await getSnapshot(chatId, messageId);
      if (snapshot && onRestoreSnapshot) {
        onRestoreSnapshot(snapshot.files);
      }
    } catch (e) {
      console.error('Failed to restore snapshot:', e);
    }
  }, [chatId, onRestoreSnapshot]);

  // Fork chat from a specific message
  const forkFromMessage = useCallback(async (messageId: string) => {
    if (!chatId) return;

    try {
      const forkedChat = await forkChat(chatId, messageId);
      if (forkedChat) {
        setChatId(forkedChat.id);
        setMessages(forkedChat.messages);
        await loadChatHistory();
      }
    } catch (e) {
      console.error('Failed to fork chat:', e);
    }
  }, [chatId, loadChatHistory]);

  return {
    chatId,
    messages,
    isLoading,
    addMessage,
    updateMessage,
    clearChat,
    chatHistory,
    loadChat,
    newChat,
    deleteCurrentChat,
    takeSnapshot,
    restoreSnapshot,
    forkFromMessage,
  };
}
