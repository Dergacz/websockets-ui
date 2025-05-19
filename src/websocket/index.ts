import { WebSocketServer, WebSocket as WS } from 'ws';
import handleRequest from './handleRequest.js';
import { Db } from './db.js';
import { updateRooms } from './roomManager.js';
import { sendWinnersToPlayer } from './gameState.js';
import { Player } from './player.js';

const gameDatabase = Db.getInstance();

function setupConnection(ws: WS): { player: Player; cleanup: () => void } {
  const player = new Player('', '', '', ws);
  const updateRoomsListener = updateRooms.bind(null, ws);
  const sendWinnersListener = () => sendWinnersToPlayer(player);

  gameDatabase.on('update_rooms', updateRoomsListener);
  gameDatabase.on('update_winners', sendWinnersListener);

  return {
    player,
    cleanup: () => {
      gameDatabase.removePlayer(player);
      gameDatabase.removeListener('update_rooms', updateRoomsListener);
      gameDatabase.removeListener('update_winners', sendWinnersListener);
    },
  };
}

function handleIncomingMessage(message: Buffer, ws: WS, player: Player): void {
  try {
    const messageString = message.toString();
    const messageObject = JSON.parse(messageString);
    handleRequest(messageObject, ws, player);
  } catch (error) {
    console.error('Error handling message:', error);
  }
}

function shutdownServer(wss: WebSocketServer): void {
  console.log('Shutting down WebSocket server...');

  wss.clients.forEach((client) => {
    client.terminate();
  });

  wss.close(() => {
    console.log('WebSocket server closed');
    process.exit(0);
  });
}

export default function startWebSocketServer(port: number): void {
  const wss = new WebSocketServer({ port });

  wss.on('connection', (ws: WS) => {
    console.log('WebSocket connection opened');

    const { player, cleanup } = setupConnection(ws);

    ws.on('message', (message: Buffer) => {
      handleIncomingMessage(message, ws, player);
    });

    ws.on('close', () => {
      cleanup();
      console.log('WebSocket connection closed');
    });
  });

  process.on('SIGINT', () => shutdownServer(wss));
}
