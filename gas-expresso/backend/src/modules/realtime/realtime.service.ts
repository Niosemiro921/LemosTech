import { Injectable } from '@nestjs/common';
import { Response } from 'express';

interface Connection {
  response: Response;
  heartbeat: NodeJS.Timeout;
}

@Injectable()
export class RealtimeService {
  private readonly connections = new Map<string, Set<Connection>>();

  subscribe(orderId: string, response: Response) {
    response.status(200);
    response.setHeader('Content-Type', 'text/event-stream');
    response.setHeader('Cache-Control', 'no-cache, no-transform');
    response.setHeader('Connection', 'keep-alive');
    response.setHeader('X-Accel-Buffering', 'no');
    response.flushHeaders?.();
    response.write(`event: connected\ndata: ${JSON.stringify({ orderId })}\n\n`);

    const connection: Connection = {
      response,
      heartbeat: setInterval(() => {
        try { response.write(': heartbeat\\n\\n'); } catch { this.remove(orderId, connection); }
      }, 15000),
    };
    let bucket = this.connections.get(orderId);
    if (!bucket) { bucket = new Set(); this.connections.set(orderId, bucket); }
    bucket.add(connection);

    return () => this.remove(orderId, connection);
  }

  emit(orderId: string, event: string, payload: unknown) {
    const bucket = this.connections.get(orderId);
    if (!bucket?.size) return;
    const frame = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
    for (const connection of [...bucket]) {
      try { connection.response.write(frame); }
      catch { this.remove(orderId, connection); }
    }
  }

  emitOrderLocation(orderId: string, payload: unknown) {
    this.emit(orderId, 'driver:location', payload);
  }

  emitChatMessage(orderId: string, payload: unknown) {
    this.emit(orderId, 'chat:message', payload);
  }

  emitOrderEvent(orderId: string, event: string, payload: unknown) {
    this.emit(orderId, event, payload);
  }

  private remove(orderId: string, connection: Connection) {
    clearInterval(connection.heartbeat);
    const bucket = this.connections.get(orderId);
    if (!bucket) return;
    bucket.delete(connection);
    if (!bucket.size) this.connections.delete(orderId);
  }
}
