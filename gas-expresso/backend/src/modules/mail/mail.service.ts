import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { connect as connectNet, Socket } from 'node:net';
import { connect as connectTls, TLSSocket } from 'node:tls';

@Injectable()
export class MailService {
  constructor(private readonly config: ConfigService) {}

  async send(to: string, subject: string, text: string) {
    const host = this.config.get<string>('smtpHost')?.trim();
    const port = Number(this.config.get<string | number>('smtpPort') ?? 587);
    const user = this.config.get<string>('smtpUser')?.trim();
    const pass = this.config.get<string>('smtpPass');
    const from = this.config.get<string>('mailFrom')?.trim() || user;
    const secure = this.config.get<boolean | string>('smtpSecure') === true || String(this.config.get('smtpSecure')) === 'true';
    const startTls = this.config.get<boolean | string>('smtpStartTls') === true || String(this.config.get('smtpStartTls')) === 'true';
    if (!host || !Number.isFinite(port) || !from) throw new ServiceUnavailableException('O envio de email não está configurado no ambiente.');
    const cleanTo = to.replace(/[\r\n]/g, '');
    const cleanFrom = from.replace(/[\r\n]/g, '');
    const cleanSubject = subject.replace(/[\r\n]/g, ' ').trim();
    if (!cleanTo || !cleanSubject || !text.trim()) throw new ServiceUnavailableException('Destinatário, assunto e mensagem são obrigatórios.');

    let socket: Socket | TLSSocket = await this.open(host, port, secure);
    let buffer = '';
    const read = async () => {
      return new Promise<string>((resolve, reject) => {
        const onData = (chunk: Buffer) => {
          buffer += chunk.toString('utf8');
          const match = buffer.match(/(?:^|\\r?\\n)(\\d{3}[- ].*(?:\\r?\\n\\d{3}[- ].*)*?\\r?\\n\\d{3} .*)/s);
          const lineMatch = buffer.match(/(?:^|\\r?\\n)(\\d{3} .*)\\r?\\n/);
          if (lineMatch) {
            const end = (lineMatch.index ?? 0) + lineMatch[0].length;
            const out = buffer.slice(0, end);
            buffer = buffer.slice(end);
            socket.off('data', onData); socket.off('error', onError); resolve(out);
          }
          void match;
        };
        const onError = (err: Error) => { socket.off('data', onData); socket.off('error', onError); reject(err); };
        socket.on('data', onData); socket.once('error', onError);
      });
    };
    const command = async (cmd: string, expected: number[]) => { socket.write(`${cmd}\\r\\n`); const response = await read(); const code = Number(response.slice(0, 3)); if (!expected.includes(code)) throw new Error(`SMTP ${code}: ${response.trim()}`); return response; };
    try {
      const greeting = await read();
      if (!greeting.startsWith('220')) throw new Error(`SMTP ${greeting.trim()}`);
      await command(`EHLO ${this.config.get<string>('smtpEhlo')?.trim() || 'gas-expresso'}`, [250]);
      if (!secure && startTls) {
        await command('STARTTLS', [220]);
        socket = await this.upgradeTls(socket, host, port);
        buffer = '';
        await command(`EHLO ${this.config.get<string>('smtpEhlo')?.trim() || 'gas-expresso'}`, [250]);
      }
      if (user && pass) {
        const auth = Buffer.from(`\\0${user}\\0${pass}`).toString('base64');
        await command(`AUTH PLAIN ${auth}`, [235, 503]);
      }
      await command(`MAIL FROM:<${cleanFrom}>`, [250]);
      await command(`RCPT TO:<${cleanTo}>`, [250, 251]);
      await command('DATA', [354]);
      const body = text.trim().replace(/^\./gm, '..');
      const message = `From: ${cleanFrom}\\r\\nTo: ${cleanTo}\\r\\nSubject: ${cleanSubject}\\r\\nContent-Type: text/plain; charset=utf-8\\r\\nMIME-Version: 1.0\\r\\n\\r\\n${body}\\r\\n.`;
      socket.write(`${message}\\r\\n`);
      const delivered = await read();
      if (!delivered.startsWith('250')) throw new Error(`SMTP ${delivered.trim()}`);
      await command('QUIT', [221, 250]).catch(() => undefined);
      return { sent: true, to: cleanTo, subject: cleanSubject };
    } catch (error) {
      throw new ServiceUnavailableException(`Falha no envio de email: ${error instanceof Error ? error.message : 'erro SMTP'}`);
    } finally { socket.destroy(); }
  }

  private open(host: string, port: number, secure: boolean): Promise<Socket | TLSSocket> {
    return new Promise((resolve, reject) => {
      const socket = secure ? connectTls({ host, port, servername: host, rejectUnauthorized: true }) : connectNet({ host, port });
      const cleanup = () => { socket.off('connect', onConnect); socket.off('secureConnect', onConnect); socket.off('error', onError); };
      const onConnect = () => { cleanup(); resolve(socket); };
      const onError = (err: Error) => { cleanup(); reject(err); };
      socket.once('connect', onConnect); socket.once('secureConnect', onConnect); socket.once('error', onError);
    });
  }

  private upgradeTls(socket: Socket | TLSSocket, host: string, port: number): Promise<TLSSocket> {
    return new Promise((resolve, reject) => {
      const secureSocket = connectTls({ socket, host, port, servername: host, rejectUnauthorized: true });
      const onSecure = () => { secureSocket.off('error', onError); resolve(secureSocket); };
      const onError = (err: Error) => { secureSocket.off('secureConnect', onSecure); reject(err); };
      secureSocket.once('secureConnect', onSecure); secureSocket.once('error', onError);
    });
  }
}
