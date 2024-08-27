import { KeyVaultService } from './../kayvault/KeyVaultService ';
import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({ cors: true })
export class PdfGateway implements OnGatewayConnection, OnGatewayDisconnect {
  // constructor(private KeyVaultService: KeyVaultService)
  @WebSocketServer()
  server: Server;

  private readonly userSockets = new Map<string, string>();

  sendProgressUpdate(data: any) {
    this.server.emit('pdfProgress', data);
  }
  sendFleetProgressUpdate(data: any) {
    this.server.emit('exelProgress', data);
  }
  sendNotification(data: any) {
    [...this.userSockets.entries()]
      .map(([key, value]) => {
        this.server.to(value).emit('newNotification', data);
      });
  }



  @SubscribeMessage('events')
  handleEvent(@MessageBody() data: string): string {
    return data;
  }

  @SubscribeMessage('updateToken')
  async handleUpdateTokenEvent(@MessageBody() data: any): Promise<any> {
    const user = data;

    if (user) {
      const token = await new JwtService().signAsync(
        { id: user.id, email: user.email, role: user.role },
        { secret: process.env.JWT_SECRET, expiresIn: "1d" }
      );

      
      // we are enable keyvalut in production after configure keyvalut on azure
  
      //   const jwtSecret = await this.KeyVaultService.getSecret('PROD-DB-JWT_SECRET');
      //   const token = await new JwtService().signAsync(
      //     { id: user.id, email: user.email, role: user.role },
      //     { secret: jwtSecret, expiresIn: "1d" }
      //   );
      this.emitTokenUpdate(user.id, { ...user, token });
    }




    return data;
  }

  emitTokenUpdate(userId: string, newToken: any): void {
    const socketId = this.userSockets.get(userId?.toString());
    if (socketId) {
      this.server.to(socketId).emit('tokenUpdated', newToken);
    } 
  }



  handleConnection(client: Socket, ...args: any[]) {
    const userId = client.handshake.query.userId as string;
    if (userId) {
      this.userSockets.set(userId, client.id);
    } 
  }

  handleDisconnect(client: Socket) {
    const userId = [...this.userSockets.entries()]
      .find(([key, value]) => value === client.id)?.[0];
    if (userId) {
      this.userSockets.delete(userId);  
    } 
    
  }
}
