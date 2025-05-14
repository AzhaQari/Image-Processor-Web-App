import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { randomUUID } from 'crypto';
import { FastifyInstance } from 'fastify';

// Map to store userId to WebSocket connections
// Allows multiple sockets per user if they open multiple tabs/clients
const userSockets = new Map<string, Set<WebSocket>>();
let fastifyApp: FastifyInstance | null = null;

export function setupWebSocketServer(server: Server, app: FastifyInstance): void {
  fastifyApp = app;
  
  const wss = new WebSocketServer({ server });
  app.log.info('WebSocket Server initialized and attached to HTTP server.');

  wss.on('connection', (ws: WebSocket, req) => {
    // For debugging - log the headers we receive
    app.log.info('WebSocket connection received with headers:', req.headers);
    
    // Generate a connection ID for tracking this specific connection
    const connectionId = randomUUID();
    app.log.info(`WebSocket connected with ID: ${connectionId}`);
    
    // For simplicity in this demo, store connections without immediate user binding
    // Users will identify themselves in the first message
    if (!userSockets.has('unidentified')) {
      userSockets.set('unidentified', new Set());
    }
    userSockets.get('unidentified')!.add(ws);
    
    ws.on('message', (message: Buffer) => {
      try {
        // Parse the message to get the user ID
        const messageData = JSON.parse(message.toString());
        app.log.info(`Received WebSocket message:`, messageData);
        
        if (messageData.type === 'IDENTIFY' && messageData.userId) {
          // Move connection from unidentified to the correct user
          const userId = messageData.userId;
          app.log.info(`Identifying WebSocket connection ${connectionId} as user ${userId}`);
          
          // Remove from unidentified
          userSockets.get('unidentified')?.delete(ws);
          
          // Add to user's connections
          if (!userSockets.has(userId)) {
            userSockets.set(userId, new Set());
          }
          userSockets.get(userId)!.add(ws);
          
          // Confirm identification
          ws.send(JSON.stringify({
            type: 'IDENTIFIED',
            message: `Connection now associated with user ${userId}`
          }));
        }
      } catch (error) {
        app.log.error('Error processing WebSocket message:', error);
      }
    });

    ws.on('close', () => {
      app.log.info(`WebSocket disconnected: ${connectionId}`);
      
      // Clean up all possible places this connection might be
      for (const [userId, sockets] of userSockets.entries()) {
        if (sockets.has(ws)) {
          sockets.delete(ws);
          app.log.info(`Removed WebSocket connection from user ${userId}`);
          if (sockets.size === 0) {
            userSockets.delete(userId);
            app.log.info(`Removed empty user entry for ${userId}`);
          }
          break;
        }
      }
    });

    ws.on('error', (error: Error) => {
      app.log.error(`WebSocket error for connection ${connectionId}:`, error);
    });

    // Send welcome message
    ws.send(JSON.stringify({ type: 'CONNECTION_ESTABLISHED', connectionId }));
  });
}

export function sendWebSocketMessageToUser(userId: string, message: any): void {
  if (!fastifyApp) {
    console.error('WebSocket service not initialized');
    return;
  }
  
  fastifyApp.log.info(`Attempting to send message to user ${userId}. Current connections: ${userSockets.size}`);
  
  // First try sending to specific user
  const sockets = userSockets.get(userId);
  let messageCount = 0;
  
  if (sockets && sockets.size > 0) {
    const serializedMessage = JSON.stringify(message);
    sockets.forEach(socket => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(serializedMessage);
        messageCount++;
        if (fastifyApp) {
          fastifyApp.log.info(`Sent WebSocket message to userId ${userId}`);
        } else {
          console.log(`Sent WebSocket message to userId ${userId}`);
        }
      }
    });
  }
  
  // Also check unidentified connections - this is for development/testing
  // In production, you would not want to broadcast to unidentified connections
  // But this helps us during development when session management is tricky
  const unidentifiedSockets = userSockets.get('unidentified');
  if (unidentifiedSockets && unidentifiedSockets.size > 0) {
    if (fastifyApp) {
      fastifyApp.log.info(`Also broadcasting to ${unidentifiedSockets.size} unidentified connections`);
    } else {
      console.log(`Also broadcasting to ${unidentifiedSockets.size} unidentified connections`);
    }
    const serializedMessage = JSON.stringify(message);
    unidentifiedSockets.forEach(socket => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(serializedMessage);
        messageCount++;
      }
    });
  }
  
  if (messageCount === 0) {
    if (fastifyApp) {
      fastifyApp.log.info(`No active WebSocket connections for userId ${userId} to send message.`);
    } else {
      console.log(`No active WebSocket connections for userId ${userId} to send message.`);
    }
  } else {
    if (fastifyApp) {
      fastifyApp.log.info(`Sent message to ${messageCount} total connections`);
    } else {
      console.log(`Sent message to ${messageCount} total connections`);
    }
  }
} 