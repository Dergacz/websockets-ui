import { WebSocket as WS } from 'ws';
import { Db } from './db.js';
import { Player } from './player.js';
import { Room, RoomInfo, UpdateRoomsResponse } from './types.js';

const gameDatabase = Db.getInstance();

function formatRoomData(room: Room): RoomInfo {
  return {
    roomId: room.roomId,
    roomUsers: room.roomUsers.map((user) => ({
      name: user.name,
      index: user.index,
    })),
  };
}

export function sendRoomsToPlayer(player: Player): void {
  if (!player.isPlayerConnected()) {
    console.warn('Attempted to send rooms to disconnected player');
    return;
  }

  try {
    const availableRooms = gameDatabase.getAvailableRoomsRes();
    const formattedRooms = availableRooms.data.map(formatRoomData);

    const response: UpdateRoomsResponse = {
      type: 'update_room',
      data: JSON.stringify(formattedRooms),
      id: 0,
    };

    player.sendResponse(response);
  } catch (error) {
    console.error('Error sending rooms to player:', error);
    player.sendError('Failed to fetch available rooms');
  }
}

export function broadcastRooms(players: Player[]): void {
  if (!players.length) {
    console.warn('No players to broadcast rooms to');
    return;
  }

  players.forEach((player) => {
    if (player.isPlayerConnected()) {
      sendRoomsToPlayer(player);
    }
  });
}

export function updateRooms(ws: WS): void {
  const player = new Player('', '', '', ws);
  sendRoomsToPlayer(player);
}
