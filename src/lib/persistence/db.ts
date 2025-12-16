/**
 * IndexedDB persistence layer for chat history and file snapshots
 * Inspired by bolt.diy's approach
 */

const DB_NAME = 'designEditorHistory';
const DB_VERSION = 1;

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isError?: boolean;
}

export interface FileSnapshot {
  [path: string]: string;
}

export interface ChatData {
  id: string;
  projectName: string;
  messages: ChatMessage[];
  description: string;
  createdAt: string;
  updatedAt: string;
  metadata?: {
    gitUrl?: string;
    gitBranch?: string;
  };
}

export interface SnapshotData {
  chatId: string;
  messageId: string;
  files: FileSnapshot;
  timestamp: string;
}

let dbInstance: IDBDatabase | null = null;

export async function openDatabase(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Chats store
      if (!db.objectStoreNames.contains('chats')) {
        const chatsStore = db.createObjectStore('chats', { keyPath: 'id' });
        chatsStore.createIndex('projectName', 'projectName', { unique: false });
        chatsStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      }

      // Snapshots store
      if (!db.objectStoreNames.contains('snapshots')) {
        const snapshotsStore = db.createObjectStore('snapshots', { keyPath: ['chatId', 'messageId'] });
        snapshotsStore.createIndex('chatId', 'chatId', { unique: false });
      }
    };
  });
}

// Chat operations
export async function saveChat(chat: ChatData): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['chats'], 'readwrite');
    const store = transaction.objectStore('chats');
    const request = store.put(chat);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function getChat(id: string): Promise<ChatData | undefined> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['chats'], 'readonly');
    const store = transaction.objectStore('chats');
    const request = store.get(id);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

export async function getChatsByProject(projectName: string): Promise<ChatData[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['chats'], 'readonly');
    const store = transaction.objectStore('chats');
    const index = store.index('projectName');
    const request = index.getAll(projectName);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      // Sort by updatedAt descending
      const chats = request.result.sort((a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      resolve(chats);
    };
  });
}

export async function getAllChats(): Promise<ChatData[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['chats'], 'readonly');
    const store = transaction.objectStore('chats');
    const request = store.getAll();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const chats = request.result.sort((a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      resolve(chats);
    };
  });
}

export async function deleteChat(id: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['chats', 'snapshots'], 'readwrite');

    // Delete chat
    const chatsStore = transaction.objectStore('chats');
    chatsStore.delete(id);

    // Delete associated snapshots
    const snapshotsStore = transaction.objectStore('snapshots');
    const snapshotsIndex = snapshotsStore.index('chatId');
    const snapshotsCursor = snapshotsIndex.openCursor(IDBKeyRange.only(id));

    snapshotsCursor.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

// Snapshot operations
export async function saveSnapshot(snapshot: SnapshotData): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['snapshots'], 'readwrite');
    const store = transaction.objectStore('snapshots');
    const request = store.put(snapshot);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function getSnapshot(chatId: string, messageId: string): Promise<SnapshotData | undefined> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['snapshots'], 'readonly');
    const store = transaction.objectStore('snapshots');
    const request = store.get([chatId, messageId]);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

export async function getSnapshotsByChat(chatId: string): Promise<SnapshotData[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['snapshots'], 'readonly');
    const store = transaction.objectStore('snapshots');
    const index = store.index('chatId');
    const request = index.getAll(chatId);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

// Utility functions
export function generateChatId(): string {
  return `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Fork a chat from a specific message
export async function forkChat(
  originalChatId: string,
  fromMessageId: string,
  newProjectName?: string
): Promise<ChatData | null> {
  const originalChat = await getChat(originalChatId);
  if (!originalChat) return null;

  const messageIndex = originalChat.messages.findIndex(m => m.id === fromMessageId);
  if (messageIndex === -1) return null;

  const newChat: ChatData = {
    id: generateChatId(),
    projectName: newProjectName || originalChat.projectName,
    messages: originalChat.messages.slice(0, messageIndex + 1),
    description: `Fork of: ${originalChat.description}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    metadata: originalChat.metadata,
  };

  await saveChat(newChat);
  return newChat;
}

// Duplicate entire chat
export async function duplicateChat(chatId: string): Promise<ChatData | null> {
  const originalChat = await getChat(chatId);
  if (!originalChat) return null;

  const newChat: ChatData = {
    ...originalChat,
    id: generateChatId(),
    description: `Copy of: ${originalChat.description}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await saveChat(newChat);
  return newChat;
}
