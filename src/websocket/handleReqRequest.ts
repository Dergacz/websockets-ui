import { WebSocket as WS } from 'ws';
import { RegRequestData, PlayerInterface, RegResponseObject, RegResponseData } from './types.ts';
import { Db } from './db.js';
import { updateRooms } from './roomManager.js';
import { sendWinnersToPlayer } from './gameState.js';
import { Player } from './player.js';

const gameDatabase = Db.getInstance();

function createRegResponseData(userInDatabase: PlayerInterface | false): RegResponseData {
  if (userInDatabase) {
    return {
      name: userInDatabase.name,
      index: userInDatabase.index,
      error: false,
      errorText: '',
    };
  }

  return {
    name: '',
    index: '',
    error: true,
    errorText: 'Password is incorrect',
  };
}

function createRegResponseMessage(data: RegResponseData): RegResponseObject {
  return {
    type: 'reg',
    data: JSON.stringify(data),
    id: 0,
  };
}

export function handleReqRequest(
  reqData: RegRequestData,
  ws: WS,
  player: PlayerInterface
): { name: string; index: number | string } {
  try {
    const userInDatabase = gameDatabase.checkUser(reqData, player);
    const responseData = createRegResponseData(userInDatabase);
    const responseMessage = createRegResponseMessage(responseData);

    ws.send(JSON.stringify(responseMessage));

    if ('sendResponse' in player) {
      sendWinnersToPlayer(player as Player);
    }

    updateRooms(ws);

    return {
      name: responseData.name,
      index: responseData.index,
    };
  } catch (error) {
    console.error('Error handling registration request:', error);
    throw error;
  }
}
