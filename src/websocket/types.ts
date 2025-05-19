import { WebSocket as WS } from 'ws';

export interface PlayerInterface {
  name: string;
  password: string;
  index: string | number;
  ws: WS;

  sendResponse(response: object): void;
}

export interface Winner {
  name: string;
  wins: number;
}

export interface Room {
  roomId: number | string;
  roomUsers: PlayerInterface[];
}

export interface RoomUserInfo {
  name: string;
  index: string | number;
}

export interface RoomInfo {
  roomId: string | number;
  roomUsers: RoomUserInfo[];
}

export interface UpdateRoomsResponse {
  type: 'update_room';
  data: string;
  id: number;
}

export interface GamePlayer {
  id: string;
  player: PlayerInterface;
  ships?: Ships[];
  numberOfShipsOnWater?: number;
  field?: Field;
}

export interface Game {
  idGame: string;
  player1: GamePlayer;
  player2: GamePlayer;
  playersTurn: string;
}

export interface Message {
  type: string;
  data: any;
  id: 0;
}

export interface RegRequestData {
  name: string;
  password: string;
}

export interface AddUserToRoomData {
  indexRoom: number | string;
}

export interface AddShipsData {
  gameId: string;
  ships: Ships[];
  indexPlayer: string;
}

export interface Ships {
  position: {
    x: number;
    y: number;
  };
  direction: boolean;
  length: number;
  type: 'small' | 'medium' | 'large' | 'huge';
}

export interface AttackData {
  gameId: string;
  x: number;
  y: number;
  indexPlayer: string;
}

export interface RandomAttackData {
  gameId: string;
  indexPlayer: string;
}

export interface NeighborsCell {
  x: number;
  y: number;
}

export interface FieldCell {
  ship: any | null;
  hit: boolean;
}

export interface Field {
  cells: FieldCell[][];
}

export interface Position {
  x: number;
  y: number;
}

export interface GameResponse {
  type: string;
  data: string;
  id: 0;
}

export interface RegResponseData {
  name: string;
  index: number | string;
  error: boolean;
  errorText: string;
}

export interface RegResponseObject {
  type: 'reg';
  data: string;
  id: number;
}

export type MessageHandler = (data: string, ws: WS, player: PlayerInterface) => void;

export interface PlayerResponse {
  type: string;
  data: string;
  id: number;
}
