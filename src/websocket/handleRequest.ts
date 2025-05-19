import { WebSocket } from 'ws';
import {
  AddShipsData,
  AddUserToRoomData,
  AttackData,
  Message,
  RandomAttackData,
  RegRequestData,
  PlayerInterface,
  MessageHandler,
} from './types.ts';
import { handleReqRequest } from './handleReqRequest.js';
import { Db } from './db.js';

const gameDatabase = Db.getInstance();

const messageHandlers: Record<Message['type'], MessageHandler> = {
  reg: (data, ws, player) => {
    const regData = JSON.parse(data) as RegRequestData;
    handleReqRequest(regData, ws, player);
  },

  create_room: (_, __, player) => {
    gameDatabase.createRoom(player);
  },

  add_user_to_room: (data, ws, player) => {
    const roomData = JSON.parse(data) as AddUserToRoomData;
    gameDatabase.addUserToRoom(player, roomData.indexRoom, ws);
  },

  add_ships: (data) => {
    const shipsData = JSON.parse(data) as AddShipsData;
    gameDatabase.addShips(shipsData);
  },

  attack: (data) => {
    const attackData = JSON.parse(data) as AttackData;
    gameDatabase.attack(attackData);
  },

  randomAttack: (data) => {
    const randomAttackData = JSON.parse(data) as RandomAttackData;
    gameDatabase.randomAttack(randomAttackData);
  },
};

export default function handleRequest(
  message: Message,
  ws: WebSocket,
  player: PlayerInterface,
): void {
  try {
    const handler = messageHandlers[message.type];
    if (!handler) {
      console.warn(`Unknown message type: ${message.type}`);
      return;
    }

    handler(message.data, ws, player);
  } catch (error) {
    console.error('Error handling message:', error);
  }
}
