import { Db } from './db.js';
import { Player } from './player.js';

const gameDatabase = Db.getInstance();

export function sendWinnersToPlayer(player: Player): void {
  if (!player.isPlayerConnected()) {
    console.warn('Attempted to send winners to disconnected player');
    return;
  }

  try {
    const winners = gameDatabase.getWinnersData();
    player.sendResponse({
      type: 'update_winners',
      data: JSON.stringify(winners),
      id: 0,
    });
  } catch (error) {
    console.error('Error sending winners to player:', error);
    player.sendError('Failed to fetch winners list');
  }
}

export function broadcastWinners(players: Player[]): void {
  if (!players.length) {
    console.warn('No players to broadcast winners to');
    return;
  }

  players.forEach((player) => {
    if (player.isPlayerConnected()) {
      sendWinnersToPlayer(player);
    }
  });
}

export function updateWinnersList(winnerName: string): void {
  if (!winnerName) {
    console.warn('Attempted to update winners with empty name');
    return;
  }

  try {
    gameDatabase.updateWinners(winnerName);
  } catch (error) {
    console.error('Error updating winners list:', error);
  }
}
