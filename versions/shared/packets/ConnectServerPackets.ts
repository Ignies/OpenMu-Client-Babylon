
import { SetByteValue, GetByteValue, readWireString } from '../../../src/core/binaryUtils';

export class ConnectionInfoRequest075Packet {
  buffer!: DataView;
  static readonly Name = `ConnectionInfoRequest075`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `This packet is sent by the client after the user clicked on an entry of the server list.`;
  static readonly CausedReaction = `The server will send a ConnectionInfo back to the client.`;
  static readonly Length = 5;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xF4;
  static readonly SubCode = 0x03;

  static getRequiredSize(dataSize:number){
    return ConnectionInfoRequest075Packet.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, ConnectionInfoRequest075Packet.HeaderCode);
    b.setUint8(ConnectionInfoRequest075Packet.DataOffset, ConnectionInfoRequest075Packet.Code);
  b.setUint8(ConnectionInfoRequest075Packet.DataOffset + 1, ConnectionInfoRequest075Packet.SubCode);
    return this;
  }

  writeLength(l: number|undefined = ConnectionInfoRequest075Packet.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 5): ConnectionInfoRequest075Packet {
    const p = new ConnectionInfoRequest075Packet();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get ServerId() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set ServerId(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }
}
export class ConnectionInfoRequestPacket {
  buffer!: DataView;
  static readonly Name = `ConnectionInfoRequest`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `This packet is sent by the client after the user clicked on an entry of the server list.`;
  static readonly CausedReaction = `The server will send a ConnectionInfo back to the client.`;
  static readonly Length = 6;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xF4;
  static readonly SubCode = 0x03;

  static getRequiredSize(dataSize:number){
    return ConnectionInfoRequestPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, ConnectionInfoRequestPacket.HeaderCode);
    b.setUint8(ConnectionInfoRequestPacket.DataOffset, ConnectionInfoRequestPacket.Code);
  b.setUint8(ConnectionInfoRequestPacket.DataOffset + 1, ConnectionInfoRequestPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = ConnectionInfoRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 6): ConnectionInfoRequestPacket {
    const p = new ConnectionInfoRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get ServerId(){
    return this.buffer.getUint16(4, true);
  }
  set ServerId(value: number){
    this.buffer.setUint16(4, value, true);
  }
}
export class ConnectionInfoPacket {
  buffer!: DataView;
  static readonly Name = `ConnectionInfo`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `This packet is sent by the server after the client requested the connection information of a server. This happens after the user clicked on a server.`;
  static readonly CausedReaction = `The client will try to connect to the server with the specified information.`;
  static readonly Length = 22;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xF4;
  static readonly SubCode = 0x03;

  static getRequiredSize(dataSize:number){
    return ConnectionInfoPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, ConnectionInfoPacket.HeaderCode);
    b.setUint8(ConnectionInfoPacket.DataOffset, ConnectionInfoPacket.Code);
  b.setUint8(ConnectionInfoPacket.DataOffset + 1, ConnectionInfoPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = ConnectionInfoPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  private _readString (from :number, to: number): string {
    return readWireString(this.buffer, from, to);
  }

  static createPacket(requiredSize: number = 22): ConnectionInfoPacket {
    const p = new ConnectionInfoPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get IpAddress(){
    const to = 20;
              
    return this._readString(4, to);
  }
  setIpAddress(str: string, count = 16){
    const from = 4;
    for(let i = 0; i < str.length; i++){
      const char = str.charCodeAt(i);
      this.buffer.setUint8(from + i, char);
    }
}
  get Port(){
    return this.buffer.getUint16(20, true);
  }
  set Port(value: number){
    this.buffer.setUint16(20, value, true);
  }
}
export class ServerListRequestPacket {
  buffer!: DataView;
  static readonly Name = `ServerListRequest`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `This packet is sent by the client after it connected and received the 'Hello' message.`;
  static readonly CausedReaction = `The server will send a ServerListResponse back to the client.`;
  static readonly Length = 4;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xF4;
  static readonly SubCode = 0x06;

  static getRequiredSize(dataSize:number){
    return ServerListRequestPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, ServerListRequestPacket.HeaderCode);
    b.setUint8(ServerListRequestPacket.DataOffset, ServerListRequestPacket.Code);
  b.setUint8(ServerListRequestPacket.DataOffset + 1, ServerListRequestPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = ServerListRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 4): ServerListRequestPacket {
    const p = new ServerListRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
}
export class ServerListResponsePacket {
  buffer!: DataView;
  static readonly Name = `ServerListResponse`;
  static readonly HeaderType = `C2HeaderWithSubCode`;
  static readonly HeaderCode = 0xC2;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `This packet is sent by the server after the client requested the current server list.`;
  static readonly CausedReaction = `The client shows the available servers with their load information.`;
  static readonly Length = undefined;
  static readonly LengthSize = 2;
  static readonly DataOffset = 3;
  static readonly Code = 0xF4;
  static readonly SubCode = 0x06;

  static getRequiredSize(dataSize:number){
    return ServerListResponsePacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, ServerListResponsePacket.HeaderCode);
    b.setUint8(ServerListResponsePacket.DataOffset, ServerListResponsePacket.Code);
  b.setUint8(ServerListResponsePacket.DataOffset + 1, ServerListResponsePacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = ServerListResponsePacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint16(1, l);
    return this;
  }

  static createPacket(requiredSize: number): ServerListResponsePacket {
    const p = new ServerListResponsePacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get ServerCount(){
    return this.buffer.getUint16(5, false);
  }
  set ServerCount(value: number){
    this.buffer.setUint16(5, value, false);
  }

  getServers(count: number): {
  ServerId: ShortLittleEndian;
  LoadPercentage: Byte;

}[]{
    const b = this.buffer;
    let bi = 0;

    const Servers_count = count;
    const Servers: any[] = new Array(Servers_count);
    
    let Servers_StartOffset = bi + 7;
    for (let i = 0; i < Servers_count; i++) {
      const ServerId = b.getUint16(Servers_StartOffset + 0, true);
      const LoadPercentage = b.getUint8(Servers_StartOffset + 2);
      Servers[i] = {
        ServerId,
        LoadPercentage
      };
      Servers_StartOffset += 4;
    }
    
    return Servers;
  }}
export class ServerListRequestOldPacket {
  buffer!: DataView;
  static readonly Name = `ServerListRequestOld`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `This packet is sent by the client (below season 1) after it connected and received the 'Hello' message.`;
  static readonly CausedReaction = `The server will send a ServerListResponseOld back to the client.`;
  static readonly Length = 4;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xF4;
  static readonly SubCode = 0x02;

  static getRequiredSize(dataSize:number){
    return ServerListRequestOldPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, ServerListRequestOldPacket.HeaderCode);
    b.setUint8(ServerListRequestOldPacket.DataOffset, ServerListRequestOldPacket.Code);
  b.setUint8(ServerListRequestOldPacket.DataOffset + 1, ServerListRequestOldPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = ServerListRequestOldPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 4): ServerListRequestOldPacket {
    const p = new ServerListRequestOldPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
}
export class ServerListResponseOldPacket {
  buffer!: DataView;
  static readonly Name = `ServerListResponseOld`;
  static readonly HeaderType = `C2HeaderWithSubCode`;
  static readonly HeaderCode = 0xC2;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `This packet is sent by the server (below season 1) after the client requested the current server list.`;
  static readonly CausedReaction = `The client shows the available servers with their load information.`;
  static readonly Length = undefined;
  static readonly LengthSize = 2;
  static readonly DataOffset = 3;
  static readonly Code = 0xF4;
  static readonly SubCode = 0x02;

  static getRequiredSize(dataSize:number){
    return ServerListResponseOldPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, ServerListResponseOldPacket.HeaderCode);
    b.setUint8(ServerListResponseOldPacket.DataOffset, ServerListResponseOldPacket.Code);
  b.setUint8(ServerListResponseOldPacket.DataOffset + 1, ServerListResponseOldPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = ServerListResponseOldPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint16(1, l);
    return this;
  }

  static createPacket(requiredSize: number): ServerListResponseOldPacket {
    const p = new ServerListResponseOldPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get ServerCount() {
    return GetByteValue(this.buffer.getUint8(5), 8, 0);
  }
  set ServerCount(value: number) {
    const oldByte = this.buffer.getUint8(5);
    this.buffer.setUint8(5, SetByteValue(oldByte, value, 8, 0));
  }

  getServers(count: number): {
  ServerId: Byte;
  LoadPercentage: Byte;

}[]{
    const b = this.buffer;
    let bi = 0;

    const Servers_count = count;
    const Servers: any[] = new Array(Servers_count);
    
    let Servers_StartOffset = bi + 6;
    for (let i = 0; i < Servers_count; i++) {
      const ServerId = b.getUint8(Servers_StartOffset + 0);
      const LoadPercentage = b.getUint8(Servers_StartOffset + 1);
      Servers[i] = {
        ServerId,
        LoadPercentage
      };
      Servers_StartOffset += 2;
    }
    
    return Servers;
  }}
export class HelloPacket {
  buffer!: DataView;
  static readonly Name = `Hello`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `This packet is sent by the server after the client connected to the server.`;
  static readonly CausedReaction = `A game client will request the server list. The launcher would request the patch state.`;
  static readonly Length = 4;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x00;
  static readonly SubCode = 0x01;

  static getRequiredSize(dataSize:number){
    return HelloPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, HelloPacket.HeaderCode);
    b.setUint8(HelloPacket.DataOffset, HelloPacket.Code);
  b.setUint8(HelloPacket.DataOffset + 1, HelloPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = HelloPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 4): HelloPacket {
    const p = new HelloPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
}
export class PatchCheckRequestPacket {
  buffer!: DataView;
  static readonly Name = `PatchCheckRequest`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `This packet is sent by the client (launcher) to check if the patch version is high enough to be able to connect to the server.`;
  static readonly CausedReaction = `The connect server will check the version and sends a 'PatchVersionOkay' or a 'ClientNeedsPatch' message.`;
  static readonly Length = 6;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x02;

  static getRequiredSize(dataSize:number){
    return PatchCheckRequestPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, PatchCheckRequestPacket.HeaderCode);
    b.setUint8(PatchCheckRequestPacket.DataOffset, PatchCheckRequestPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = PatchCheckRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 6): PatchCheckRequestPacket {
    const p = new PatchCheckRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get MajorVersion() {
    return GetByteValue(this.buffer.getUint8(3), 8, 0);
  }
  set MajorVersion(value: number) {
    const oldByte = this.buffer.getUint8(3);
    this.buffer.setUint8(3, SetByteValue(oldByte, value, 8, 0));
  }
  get MinorVersion() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set MinorVersion(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }
  get PatchVersion() {
    return GetByteValue(this.buffer.getUint8(5), 8, 0);
  }
  set PatchVersion(value: number) {
    const oldByte = this.buffer.getUint8(5);
    this.buffer.setUint8(5, SetByteValue(oldByte, value, 8, 0));
  }
}
export class PatchVersionOkayPacket {
  buffer!: DataView;
  static readonly Name = `PatchVersionOkay`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `This packet is sent by the server after the client (launcher) requested the to check the patch version and it was high enough.`;
  static readonly CausedReaction = `The launcher will activate its start button.`;
  static readonly Length = 4;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x02;

  static getRequiredSize(dataSize:number){
    return PatchVersionOkayPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, PatchVersionOkayPacket.HeaderCode);
    b.setUint8(PatchVersionOkayPacket.DataOffset, PatchVersionOkayPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = PatchVersionOkayPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 4): PatchVersionOkayPacket {
    const p = new PatchVersionOkayPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
}
export class ClientNeedsPatchPacket {
  buffer!: DataView;
  static readonly Name = `ClientNeedsPatch`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `This packet is sent by the server after the client (launcher) requested to check the patch version and it requires an update.`;
  static readonly CausedReaction = `The launcher will download the required patches and then activate the start button.`;
  static readonly Length = 138;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x05;
  static readonly SubCode = 0x01;

  static getRequiredSize(dataSize:number){
    return ClientNeedsPatchPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, ClientNeedsPatchPacket.HeaderCode);
    b.setUint8(ClientNeedsPatchPacket.DataOffset, ClientNeedsPatchPacket.Code);
  b.setUint8(ClientNeedsPatchPacket.DataOffset + 1, ClientNeedsPatchPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = ClientNeedsPatchPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  private _readString (from :number, to: number): string {
    return readWireString(this.buffer, from, to);
  }

  static createPacket(requiredSize: number = 138): ClientNeedsPatchPacket {
    const p = new ClientNeedsPatchPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get PatchVersion() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set PatchVersion(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }
  get PatchAddress(){
    const to = this.buffer.byteLength;
              
    return this._readString(6, to);
  }
  setPatchAddress(str: string, count = NaN){
    const from = 6;
    for(let i = 0; i < str.length; i++){
      const char = str.charCodeAt(i);
      this.buffer.setUint8(from + i, char);
    }
}
}

export const ConnectServerPackets = [
  ConnectionInfoRequest075Packet,
  ConnectionInfoRequestPacket,
  ConnectionInfoPacket,
  ServerListRequestPacket,
  ServerListResponsePacket,
  ServerListRequestOldPacket,
  ServerListResponseOldPacket,
  HelloPacket,
  PatchCheckRequestPacket,
  PatchVersionOkayPacket,
  ClientNeedsPatchPacket
] as const;