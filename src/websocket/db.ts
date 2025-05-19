import crypto from 'crypto';
import {
  AddShipsData,
  AttackData,
  Field,
  FieldCell,
  NeighborsCell,
  RandomAttackData,
  RegRequestData,
  Ships,
} from './types.ts';
import { EventEmitter } from 'events';
import { WebSocket } from 'ws';
import { PlayerInterface } from './types.js';
import { Room, Winner } from './types.js';

export class Db extends EventEmitter {
  private static instance: Db | null = null;
  private users: PlayerInterface[] = [];
  private winners: Winner[] = [];
  private rooms: Room[] = [];
  private games: any[] = [];
  private constructor() {
    super();
  }

  static getInstance() {
    if (this.instance === null) {
      this.instance = new Db();
    }
    return this.instance;
  }

  addUser(player: PlayerInterface) {
    const index = crypto.randomBytes(16).toString('hex');
    player.index = index;

    this.users.push(player);
  }

  findUserInDatabase(name: string) {
    const userInDatabase = this.users.find((user) => user.name === name);
    if (userInDatabase) {
      return userInDatabase;
    } else {
      return false;
    }
  }

  checkUser(userData: RegRequestData, player: PlayerInterface) {
    const userInDatabase = this.findUserInDatabase(userData.name);
    if (userInDatabase) {
      if (userInDatabase.password === userData.password) {
        return userInDatabase;
      } else {
        return false;
      }
    } else {
      player.name = userData.name;
      player.password = userData.password;
      this.addUser(player);
      return player;
    }
  }

  updateWinners(name: string) {
    const winner = this.winners.find((winner) => winner.name === name);
    if (winner) {
      winner.wins++;
    } else {
      this.winners.push({ name, wins: 1 });
    }
    this.emit('update_winners');
  }

  getWinnersData() {
    return this.winners;
  }

  createRoom(player: PlayerInterface) {
    if (this.rooms.some((room) => room.roomUsers.some((roomUser) => roomUser === player))) {
      console.log('User already in room');
      return;
    }
    const roomId = crypto.randomBytes(16).toString('hex');
    const room = {
      roomId,
      roomUsers: [player],
    };
    this.rooms.push(room);
    this.emit('update_rooms');
  }

  getAvailableRoomsRes() {
    const availableRooms = this.rooms.filter((room) => room.roomUsers.length === 1);
    return {
      type: 'update_room',
      data: availableRooms,
      id: 0,
    };
  }

  addUserToRoom(player: PlayerInterface, indexRoom: number | string, _ws: WebSocket) {
    const roomIndex = this.rooms.findIndex((room) => room.roomId === indexRoom);
    if (roomIndex !== -1) {
      if (this.rooms[roomIndex].roomUsers.some((roomUser) => roomUser === player)) {
        console.log('User already in room');
        return;
      }

      if (this.rooms[roomIndex].roomUsers.length < 2) {
        this.rooms[roomIndex].roomUsers.push(player);
        this.createGame(this.rooms[roomIndex]);
        this.emit('update_rooms');
      } else {
        console.log('Room is full');
      }
    } else {
      console.log('Room not found');
    }
  }

  createGame(room: Room) {
    const idGame = crypto.randomBytes(16).toString('hex');
    const idPlayer1 = crypto.randomBytes(16).toString('hex');
    const idPlayer2 = crypto.randomBytes(16).toString('hex');
    const game = {
      idGame,
      player1: { id: idPlayer1, player: room.roomUsers[0] },
      player2: { id: idPlayer2, player: room.roomUsers[1] },
      playersTurn: Math.random() > 0.5 ? idPlayer1 : idPlayer2,
    };
    this.games.push(game);

    const response1 = {
      type: 'create_game',
      data: JSON.stringify({ idGame, idPlayer: game.player1.id }),
      id: 0,
    };

    const response2 = {
      type: 'create_game',
      data: JSON.stringify({ idGame, idPlayer: game.player2.id }),
      id: 0,
    };

    game.player1.player.sendResponse(response1);
    game.player2.player.sendResponse(response2);
  }

  addShips(data: AddShipsData) {
    const gameIndex = this.games.findIndex((game) => game.idGame === data.gameId);
    if (gameIndex !== -1) {
      if (this.games[gameIndex].player1.id === data.indexPlayer) {
        this.games[gameIndex].player1.ships = data.ships;
        this.games[gameIndex].player1.numberOfShipsOnWater = data.ships.length;
        this.games[gameIndex].player1.field = this.drawPlayersField(data.ships);
      } else {
        this.games[gameIndex].player2.ships = data.ships;
        this.games[gameIndex].player2.numberOfShipsOnWater = data.ships.length;
        this.games[gameIndex].player2.field = this.drawPlayersField(data.ships);
      }

      if (this.games[gameIndex].player1.ships && this.games[gameIndex].player2.ships) {
        this.startGame(this.games[gameIndex]);
      }
    }
  }

  startGame(game: any) {
    const response1 = {
      type: 'start_game',
      data: JSON.stringify({
        ships: game.player1.ships,
        currentPlayerIndex: game.player1.id,
      }),
      id: 0,
    };

    const response2 = {
      type: 'start_game',
      data: JSON.stringify({
        ships: game.player2.ships,
        currentPlayerIndex: game.player2.id,
      }),
      id: 0,
    };

    game.player1.player.sendResponse(response1);
    game.player2.player.sendResponse(response2);
    this.sendTurnInfo(game);
  }

  sendTurnInfo(game: any) {
    const response = {
      type: 'turn',
      data: JSON.stringify({ currentPlayer: game.playersTurn }),
      id: 0,
    };
    game.player1.player.sendResponse(response);
    game.player2.player.sendResponse(response);
  }

  switchTurn(game: any) {
    game.playersTurn = game.playersTurn === game.player1.id ? game.player2.id : game.player1.id;
    this.sendTurnInfo(game);
  }

  removePlayer(player: PlayerInterface) {
    this.users = this.users.filter((user) => user !== player);

    const roomWithPlayer = this.rooms.find((room) =>
      room.roomUsers.some((roomUser) => roomUser === player)
    );
    if (roomWithPlayer) {
      roomWithPlayer.roomUsers = roomWithPlayer.roomUsers.filter((roomUser) => roomUser !== player);
      this.emit('update_rooms');
    }

    this.games.forEach((game) => {
      if (game.player1.player === player || game.player2.player === player) {
        this.finishGame(game.idGame, player);
      }
    });
  }

  handleAttackResponse(
    game: any,
    cell: { x: number; y: number },
    status: string,
    playerId: string
  ) {
    const response1 = {
      type: 'attack',
      data: JSON.stringify({
        position: {
          x: cell.x,
          y: cell.y,
        },
        currentPlayer: playerId,
        status: status,
      }),
      id: 0,
    };
    const response2 = {
      type: 'attack',
      data: JSON.stringify({
        position: {
          x: cell.x,
          y: cell.y,
        },
        currentPlayer: playerId,
        status: status,
      }),
      id: 0,
    };
    game.player1.player.sendResponse(response1);
    game.player2.player.sendResponse(response2);
  }

  attack(data: AttackData) {
    const game = this.games.find((game) => game.idGame === data.gameId);
    if (game && game.playersTurn === data.indexPlayer) {
      const enemyPlayer = game.player1.id === data.indexPlayer ? 'player2' : 'player1';

      const currentPlayerId =
        game.player1.id === data.indexPlayer ? game.player1.id : game.player2.id;
      const fieldCell = game[enemyPlayer].field.cells[data.x][data.y];
      if (fieldCell.hit) {
        return;
      }

      fieldCell.hit = true;
      if (fieldCell.ship) {
        fieldCell.ship.hp--;
        if (fieldCell.ship.hp === 0) {
          this.handleAttackResponse(game, { x: data.x, y: data.y }, 'shot', currentPlayerId);
          game[enemyPlayer].numberOfShipsOnWater--;
          game[enemyPlayer].field.cells[data.x][data.y].ship.neighborCells.forEach(
            (cell: NeighborsCell) => {
              if (
                !game[enemyPlayer].field.cells[cell.x][cell.y].hit &&
                !game[enemyPlayer].field.cells[cell.x][cell.y].ship
              ) {
                game[enemyPlayer].field.cells[cell.x][cell.y].hit = true;
                this.handleAttackResponse(game, { x: cell.x, y: cell.y }, 'miss', currentPlayerId);
              }

              if (game[enemyPlayer].field.cells[cell.x][cell.y].ship) {
                game[enemyPlayer].field.cells[cell.x][cell.y].hit = true;
                this.handleAttackResponse(game, { x: cell.x, y: cell.y }, 'shot', currentPlayerId);
              }
            }
          );
        } else {
          this.handleAttackResponse(game, { x: data.x, y: data.y }, 'killed', currentPlayerId);
        }
      } else {
        this.handleAttackResponse(game, { x: data.x, y: data.y }, 'miss', currentPlayerId);
        this.switchTurn(game);
      }

      if (game[enemyPlayer].numberOfShipsOnWater === 0) {
        this.finishGame(game.idGame);
      }
    }
  }

  randomAttack(data: RandomAttackData) {
    const game = this.games.find((game) => game.idGame === data.gameId);
    const currentPlayer = game.player1.id === data.indexPlayer ? 'player1' : 'player2';
    let position = { x: 0, y: 0 };
    let found = false;
    while (!found) {
      position = {
        x: Math.floor(Math.random() * 10),
        y: Math.floor(Math.random() * 10),
      };
      if (game[currentPlayer].field.cells[position.x][position.y].hit === false) {
        found = true;
      }
    }

    this.attack({
      gameId: data.gameId,
      indexPlayer: data.indexPlayer,
      x: position.x,
      y: position.y,
    });
  }

  drawPlayersField(ships: Ships[]) {
    const field: Field = { cells: [] };

    class ShipOnField {
      constructor(
        public hp: number,
        public neighborCells: { x: number; y: number }[]
      ) {}
    }

    for (let i = 0; i < 10; i++) {
      const column: FieldCell[] = [];
      for (let j = 0; j < 10; j++) {
        column.push({ ship: null, hit: false });
      }
      field.cells.push(column);
    }
    ships.forEach((ship) => {
      const shipOnField = new ShipOnField(ship.length, []);
      for (let i = 0; i < ship.length; i++) {
        if (ship.direction) {
          const xPos = ship.position.x;
          const yPos = ship.position.y + i;
          field.cells[xPos][yPos].ship = shipOnField;
          shipOnField.neighborCells.push(...this.getNeighborsCells(xPos, yPos));
        } else {
          const xPos = ship.position.x + i;
          const yPos = ship.position.y;
          field.cells[xPos][yPos].ship = shipOnField;
          shipOnField.neighborCells.push(...this.getNeighborsCells(xPos, yPos));
        }
      }
    });

    return field;
  }

  getNeighborsCells(xPos: number, yPos: number) {
    const neighborsCells = [];
    for (let i = xPos - 1; i < xPos + 2; i++) {
      for (let j = yPos - 1; j < yPos + 2; j++) {
        if (i >= 0 && j >= 0 && i < 10 && j < 10) {
          neighborsCells.push({ x: i, y: j });
        }
      }
    }
    return neighborsCells;
  }

  finishGame(gameId: string, exitedPlayer?: PlayerInterface) {
    const gameIndex = this.games.findIndex((game) => game.idGame === gameId);
    if (gameIndex !== -1) {
      let winnerId = '';
      let winnerName = '';
      if (exitedPlayer) {
        const winner =
          this.games[gameIndex].player1.player === exitedPlayer
            ? this.games[gameIndex].player2
            : this.games[gameIndex].player1;
        winnerId = winner.id;
        winnerName = winner.player.name;
      } else {
        if (!this.games[gameIndex].player1.numberOfShipsOnWater) {
          winnerId = this.games[gameIndex].player2.id;
          winnerName = this.games[gameIndex].player2.player.name;
        } else {
          winnerId = this.games[gameIndex].player1.id;
          winnerName = this.games[gameIndex].player1.player.name;
        }
      }
      const response = {
        type: 'finish',
        data: JSON.stringify({ winPlayer: winnerId }),
        id: 0,
      };
      this.games[gameIndex].player1.player.sendResponse(response);
      this.games[gameIndex].player2.player.sendResponse(response);
      this.games = this.games.filter((game) => game.idGame !== gameId);
      this.updateWinners(winnerName);
    }
  }
}
