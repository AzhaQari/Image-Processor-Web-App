import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';

// Define message types
export type WebSocketMessageType = 
  | 'CONNECTION_ESTABLISHED'
  | 'IMAGE_STATUS_UPDATE'
  | 'IDENTIFIED';

export interface WebSocketMessage {
  type: WebSocketMessageType;
  payload: any;
  connectionId?: string;
  message?: string;
}

interface ImageStatusUpdatePayload {
  id: string;
  status: 'uploaded' | 'processing' | 'processed' | 'failed';
  fileName: string;
  thumbnailPath?: string;
  errorMessage?: string;
}

// Context value type
interface WebSocketContextValue {
  connected: boolean;
  lastMessage: WebSocketMessage | null;
  // Function to subscribe to specific message types
  subscribeToImageStatusUpdates: (callback: (data: ImageStatusUpdatePayload) => void) => () => void;
}

// Websocket endpoint
const WS_ENDPOINT = 'ws://localhost:3000';

// Connection attempt retry settings
const RETRY_BACKOFF_MS = 3000; // Initial retry delay
const MAX_RETRY_BACKOFF_MS = 30000; // Maximum retry delay

// Create context with default values
const WebSocketContext = createContext<WebSocketContextValue | undefined>(undefined);

// Provider component
export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const webSocket = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  
  // Map of callback functions for image status updates
  const imageStatusUpdateCallbacks = useRef<Set<(data: ImageStatusUpdatePayload) => void>>(new Set());
  
  // Function to subscribe to image status updates
  const subscribeToImageStatusUpdates = useCallback((callback: (data: ImageStatusUpdatePayload) => void) => {
    console.log('Adding new image status update subscription');
    imageStatusUpdateCallbacks.current.add(callback);
    
    // Return unsubscribe function
    return () => {
      console.log('Removing image status update subscription');
      imageStatusUpdateCallbacks.current.delete(callback);
    };
  }, []);
  
  // Clean up function for websocket and timeouts
  const cleanupWebSocket = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      window.clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (webSocket.current) {
      // Remove all event listeners to prevent potential memory leaks
      webSocket.current.onopen = null;
      webSocket.current.onclose = null;
      webSocket.current.onerror = null;
      webSocket.current.onmessage = null;
      
      if (webSocket.current.readyState === WebSocket.OPEN || 
          webSocket.current.readyState === WebSocket.CONNECTING) {
        webSocket.current.close();
      }
      webSocket.current = null;
    }
    
    setConnected(false);
  }, []);
  
  // Function to connect WebSocket
  const connectWebSocket = useCallback(() => {
    if (!isAuthenticated || !user || webSocket.current) {
      // Don't create a new connection if:
      // - User is not authenticated
      // - User info is not available
      // - There's already an active connection
      return;
    }
    
    // Clean up any existing connection first
    cleanupWebSocket();
    
    try {
      console.log(`Attempting WebSocket connection to ${WS_ENDPOINT} (attempt #${reconnectAttemptsRef.current + 1})`);
      
      // Create new connection
      const ws = new WebSocket(WS_ENDPOINT);
      webSocket.current = ws;
      
      ws.onopen = () => {
        console.log('WebSocket connection established successfully');
        setConnected(true);
        reconnectAttemptsRef.current = 0; // Reset retry counter on successful connection
        
        // Send an identify message if authenticated
        if (user && user.id) {
          console.log('🔑 Sending IDENTIFY message with userId:', user.id);
          try {
            ws.send(JSON.stringify({
              type: 'IDENTIFY',
              userId: user.id
            }));
          } catch (err) {
            console.error('Error sending IDENTIFY message:', err);
          }
        } else {
          console.warn('Could not send identify message - user not available', user);
        }
      };
      
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage;
          console.log('WebSocket message received:', message);
          setLastMessage(message);
          
          // Route messages to appropriate handlers
          if (message.type === 'IMAGE_STATUS_UPDATE') {
            console.log('📢 Received IMAGE_STATUS_UPDATE:', message.payload);
            console.log(`Status: ${message.payload.status}, ID: ${message.payload.id}, Filename: ${message.payload.fileName}`);
            
            const imageStatusData = message.payload as ImageStatusUpdatePayload;
            
            // Log number of active subscribers
            console.log(`Notifying ${imageStatusUpdateCallbacks.current.size} subscribers about status update`);
            
            imageStatusUpdateCallbacks.current.forEach(callback => {
              try {
                callback(imageStatusData);
              } catch (err) {
                console.error('Error in image status update callback:', err);
              }
            });
          } else if (message.type === 'CONNECTION_ESTABLISHED') {
            console.log('🔌 WebSocket connection established with ID:', message.connectionId);
            
            // Send an identify message if authenticated
            if (user && user.id) {
              console.log('🔑 Sending IDENTIFY message with userId:', user.id);
              try {
                ws.send(JSON.stringify({
                  type: 'IDENTIFY',
                  userId: user.id
                }));
              } catch (err) {
                console.error('Error sending IDENTIFY message:', err);
              }
            }
          } else if (message.type === 'IDENTIFIED') {
            console.log('✓ Successfully identified with server:', message.message);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      ws.onclose = (event) => {
        console.log(`WebSocket connection closed. Code: ${event.code}. Reason: ${event.reason || 'No reason provided'}`);
        setConnected(false);
        
        // Clear current connection
        webSocket.current = null;
        
        // Attempt to reconnect only if not explicitly closed by us (wasClean is false)
        if (!event.wasClean && isAuthenticated) {
          scheduleReconnect();
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        // Don't set connected to false here, let onclose handle it
      };
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      setConnected(false);
      webSocket.current = null;
      
      // Attempt to reconnect
      if (isAuthenticated) {
        scheduleReconnect();
      }
    }
  }, [isAuthenticated, user, cleanupWebSocket]);
  
  // Schedule a reconnection attempt with exponential backoff
  const scheduleReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      window.clearTimeout(reconnectTimeoutRef.current);
    }
    
    // Calculate delay with exponential backoff
    const delay = Math.min(
      RETRY_BACKOFF_MS * Math.pow(1.5, reconnectAttemptsRef.current),
      MAX_RETRY_BACKOFF_MS
    );
    
    console.log(`Scheduling reconnection attempt in ${delay}ms`);
    
    reconnectTimeoutRef.current = window.setTimeout(() => {
      reconnectAttemptsRef.current += 1;
      connectWebSocket();
    }, delay);
  }, [connectWebSocket]);
  
  // Handle authentication state changes
  useEffect(() => {
    if (isAuthenticated && user) {
      connectWebSocket();
    } else {
      cleanupWebSocket();
    }
    
    // Cleanup on unmount
    return cleanupWebSocket;
  }, [isAuthenticated, user, connectWebSocket, cleanupWebSocket]);
  
  const contextValue: WebSocketContextValue = {
    connected,
    lastMessage,
    subscribeToImageStatusUpdates
  };
  
  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
};

// Custom hook to use WebSocket
export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}; 