import { WebSocket } from 'ws';
import { EventEmitter } from 'events';
import { PlayerResponse } from './types.js';

export class Player extends EventEmitter {
  private isConnected: boolean = true;

  constructor(
    public name: string,
    public password: string,
    public index: string | number,
    public ws: WebSocket,
  ) {
    super();
    this.setupWebSocketHandlers();
  }

  private setupWebSocketHandlers(): void {
    this.ws.on('close', () => {
      this.isConnected = false;
      this.emit('disconnect');
    });

    this.ws.on('error', (error) => {
      console.error(`WebSocket error for player ${this.name}:`, error);
      this.emit('error', error);
    });
  }

  public sendResponse(response: PlayerResponse): void {
    if (!this.isConnected) {
      throw new Error(`Cannot send response to disconnected player: ${this.name}`);
    }

    try {
      const message = JSON.stringify(response);
      this.ws.send(message);
      this.emit('message:sent', response);
    } catch (error) {
      console.error(`Error sending response to player ${this.name}:`, error);
      this.emit('error', error);
      throw error;
    }
  }

  public sendError(errorMessage: string, id: number = 0): void {
    this.sendResponse({
      type: 'error',
      data: JSON.stringify({ error: true, errorText: errorMessage }),
      id,
    });
  }

  public isPlayerConnected(): boolean {
    return this.isConnected;
  }

  public disconnect(): void {
    if (this.isConnected) {
      this.ws.close();
      this.isConnected = false;
      this.emit('disconnect');
    }
  }
}
