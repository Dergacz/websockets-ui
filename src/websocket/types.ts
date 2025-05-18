export interface Player {
  name: string;
  password: string;
  index: number;
  wins: number;
}

export interface Ship {
  position: {
    x: number;
    y: number;
  };
  direction: boolean;
  length: number;
  type: 'small' | 'medium' | 'large' | 'huge';
}

export interface GameRoom {
  roomId: number;
  players: {
    name: string;
    index: number;
  }[];
  gameId?: number;
  ships?: {
    [playerIndex: number]: Ship[];
  };
  currentPlayer?: number;
  gameBoard?: {
    [playerIndex: number]: {
      [key: string]: 'miss' | 'shot' | 'killed';
    };
  };
}

export interface WebSocketMessage {
  type: string;
  data: any;
  id: number;
}

export interface GameState {
  players: Map<number, Player>;
  rooms: Map<number, GameRoom>;
  games: Map<number, GameRoom>;
  nextPlayerId: number;
  nextRoomId: number;
  nextGameId: number;
}
