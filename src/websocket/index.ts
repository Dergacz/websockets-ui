import { WebSocketServer } from 'ws';
import { handleMessage } from './messageHandler.ts';
import { WebSocketMessage } from './types.ts';

export function startWsServer(port: number) {
  const wss = new WebSocketServer({ port });

  wss.on('connection', (ws) => {
    ws.on('message', (message) => {
      try {
        const messageStr = message.toString();
        console.log('Received message:', messageStr);
        const data: WebSocketMessage = JSON.parse(messageStr);
        console.log('Parsed data:', data);
        handleMessage(ws, data);
      } catch (error) {
        console.error('Error parsing message:', error);
        const errorResponse = {
          type: 'error',
          data: { errorText: 'Invalid JSON' },
          id: 0,
        };
        ws.send(JSON.stringify(errorResponse));
      }
    });

    ws.on('close', () => {
      console.log('WebSocket connection closed');
    });
  });
}
