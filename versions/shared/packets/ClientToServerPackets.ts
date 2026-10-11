
import { CharacterClassNumber } from '../../../src/core/types';
import { SetByteValue, GetByteValue, GetBoolean, SetBoolean, readWireString } from '../../../src/core/binaryUtils';

export enum TradeButtonStateEnum {
  Unchecked = 0,
  Checked = 1,
  Red = 2
}

export enum StorageTypeEnum {
  Inventory = 0,
  Vault = 1,
  TradeOwn = 2,
  TradeOther = 3,
  Crafting = 4,
  PersonalShop = 5,
  NpcShop = 6,
  InventoryPetSlot = 254
}

export enum PetTypeEnum {
  DarkRaven = 0,
  DarkHorse = 1
}

export enum PetCommandModeEnum {
  Normal = 0,
  AttackRandom = 1,
  AttackWithOwner = 2,
  AttackTarget = 3
}

export enum GensTypeEnum {
  Undefined = 0,
  Duprian = 1,
  Vanert = 2
}

export enum GuildRelationshipTypeEnum {
  Undefined = 0,
  Alliance = 1,
  Hostility = 2
}

export enum GuildRequestTypeEnum {
  Undefined = 0,
  Join = 1,
  Leave = 2
}

export enum CastleSiegeTaxTypeEnum {
  Undefined = 0,
  ChaosMachine = 1,
  Store = 2,
  HuntingZoneEntranceFee = 3
}

export enum CastleSiegeGuildCommandTypeEnum {
  Attack = 0,
  Defend = 1,
  Wait = 2
}

export class PingPacket {
  buffer!: DataView;
  static readonly Name = `Ping`;
  static readonly HeaderType = `C3HeaderWithSubCode`;
  static readonly HeaderCode = 0xC3;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `This packet is sent by the client every few seconds. It contains the current "TickCount" of the client operating system and the attack speed of the selected character.`;
  static readonly CausedReaction = `By the original server this is used to detect speed hacks.`;
  static readonly Length = 12;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x0E;
  static readonly SubCode = 0x00;

  static getRequiredSize(dataSize:number){
    return PingPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, PingPacket.HeaderCode);
    b.setUint8(PingPacket.DataOffset, PingPacket.Code);
  b.setUint8(PingPacket.DataOffset + 1, PingPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = PingPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 12): PingPacket {
    const p = new PingPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get TickCount(){
    return this.buffer.getUint32(4, true);
  }
  set TickCount(value: number){
    this.buffer.setUint32(4, value, true);
  }
  get AttackSpeed(){
    return this.buffer.getUint16(8, true);
  }
  set AttackSpeed(value: number){
    this.buffer.setUint16(8, value, true);
  }
}
export class ChecksumResponsePacket {
  buffer!: DataView;
  static readonly Name = `ChecksumResponse`;
  static readonly HeaderType = `C3Header`;
  static readonly HeaderCode = 0xC3;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `This packet is sent by the client as a response to a request with a challenge value.`;
  static readonly CausedReaction = `By the original server, this is used to detect a modified client.`;
  static readonly Length = 8;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x03;

  static getRequiredSize(dataSize:number){
    return ChecksumResponsePacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, ChecksumResponsePacket.HeaderCode);
    b.setUint8(ChecksumResponsePacket.DataOffset, ChecksumResponsePacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = ChecksumResponsePacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 8): ChecksumResponsePacket {
    const p = new ChecksumResponsePacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Checksum(){
    return this.buffer.getUint32(4, true);
  }
  set Checksum(value: number){
    this.buffer.setUint32(4, value, true);
  }
}
export class PublicChatMessagePacket {
  buffer!: DataView;
  static readonly Name = `PublicChatMessage`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `A player sends a public chat message.`;
  static readonly CausedReaction = `The message is forwarded to all surrounding players, including the sender.`;
  static readonly Length = undefined;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x00;

  static getRequiredSize(dataSize:number){
    return PublicChatMessagePacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, PublicChatMessagePacket.HeaderCode);
    b.setUint8(PublicChatMessagePacket.DataOffset, PublicChatMessagePacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = PublicChatMessagePacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  private _readString (from :number, to: number): string {
    return readWireString(this.buffer, from, to);
  }

  static createPacket(requiredSize: number): PublicChatMessagePacket {
    const p = new PublicChatMessagePacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Character(){
    const to = 13;
              
    return this._readString(3, to);
  }
  setCharacter(str: string, count = 10){
    const from = 3;
    for(let i = 0; i < str.length; i++){
      const char = str.charCodeAt(i);
      this.buffer.setUint8(from + i, char);
    }
}
  get Message(){
    const to = this.buffer.byteLength;
              
    return this._readString(13, to);
  }
  setMessage(str: string, count = NaN){
    const from = 13;
    for(let i = 0; i < str.length; i++){
      const char = str.charCodeAt(i);
      this.buffer.setUint8(from + i, char);
    }
}
}
export class WhisperMessagePacket {
  buffer!: DataView;
  static readonly Name = `WhisperMessage`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `A player sends a private chat message to a specific target player.`;
  static readonly CausedReaction = `The message is forwarded to the target player.`;
  static readonly Length = undefined;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x02;

  static getRequiredSize(dataSize:number){
    return WhisperMessagePacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, WhisperMessagePacket.HeaderCode);
    b.setUint8(WhisperMessagePacket.DataOffset, WhisperMessagePacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = WhisperMessagePacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  private _readString (from :number, to: number): string {
    return readWireString(this.buffer, from, to);
  }

  static createPacket(requiredSize: number): WhisperMessagePacket {
    const p = new WhisperMessagePacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get ReceiverName(){
    const to = 13;
              
    return this._readString(3, to);
  }
  setReceiverName(str: string, count = 10){
    const from = 3;
    for(let i = 0; i < str.length; i++){
      const char = str.charCodeAt(i);
      this.buffer.setUint8(from + i, char);
    }
}
  get Message(){
    const to = this.buffer.byteLength;
              
    return this._readString(13, to);
  }
  setMessage(str: string, count = NaN){
    const from = 13;
    for(let i = 0; i < str.length; i++){
      const char = str.charCodeAt(i);
      this.buffer.setUint8(from + i, char);
    }
}
}
export class LoginLongPasswordPacket {
  buffer!: DataView;
  static readonly Name = `LoginLongPassword`;
  static readonly HeaderType = `C3HeaderWithSubCode`;
  static readonly HeaderCode = 0xC3;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `The player tries to log into the game.`;
  static readonly CausedReaction = `The server is authenticating the sent login name and password. If it's correct, the state of the player is proceeding to be logged in.`;
  static readonly Length = 60;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xF1;
  static readonly SubCode = 0x01;

  static getRequiredSize(dataSize:number){
    return LoginLongPasswordPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, LoginLongPasswordPacket.HeaderCode);
    b.setUint8(LoginLongPasswordPacket.DataOffset, LoginLongPasswordPacket.Code);
  b.setUint8(LoginLongPasswordPacket.DataOffset + 1, LoginLongPasswordPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = LoginLongPasswordPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 60): LoginLongPasswordPacket {
    const p = new LoginLongPasswordPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Username(){
    const to = 14;
    const i = 4;
              
    return new DataView(this.buffer.buffer.slice(i,to));
  }
  setUsername(data: ArrayLike<number>, count = 10){
    if (data.length !== count) throw new Error(`data.length must be ${count}`);
    const from = 4;

    for (let i = 0; i < data.length; i++) {
      this.buffer.setUint8(from + i, data[i]);
    }
}
  get Password(){
    const to = 34;
    const i = 14;
              
    return new DataView(this.buffer.buffer.slice(i,to));
  }
  setPassword(data: ArrayLike<number>, count = 20){
    if (data.length !== count) throw new Error(`data.length must be ${count}`);
    const from = 14;

    for (let i = 0; i < data.length; i++) {
      this.buffer.setUint8(from + i, data[i]);
    }
}
  get TickCount(){
    return this.buffer.getUint32(34, false);
  }
  set TickCount(value: number){
    this.buffer.setUint32(34, value, false);
  }
  get ClientVersion(){
    const to = 43;
    const i = 38;
              
    return new DataView(this.buffer.buffer.slice(i,to));
  }
  setClientVersion(data: ArrayLike<number>, count = 5){
    if (data.length !== count) throw new Error(`data.length must be ${count}`);
    const from = 38;

    for (let i = 0; i < data.length; i++) {
      this.buffer.setUint8(from + i, data[i]);
    }
}
  get ClientSerial(){
    const to = 59;
    const i = 43;
              
    return new DataView(this.buffer.buffer.slice(i,to));
  }
  setClientSerial(data: ArrayLike<number>, count = 16){
    if (data.length !== count) throw new Error(`data.length must be ${count}`);
    const from = 43;

    for (let i = 0; i < data.length; i++) {
      this.buffer.setUint8(from + i, data[i]);
    }
}
}
export class LoginShortPasswordPacket {
  buffer!: DataView;
  static readonly Name = `LoginShortPassword`;
  static readonly HeaderType = `C3HeaderWithSubCode`;
  static readonly HeaderCode = 0xC3;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `The player tries to log into the game.`;
  static readonly CausedReaction = `The server is authenticating the sent login name and password. If it's correct, the state of the player is proceeding to be logged in.`;
  static readonly Length = 50;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xF1;
  static readonly SubCode = 0x01;

  static getRequiredSize(dataSize:number){
    return LoginShortPasswordPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, LoginShortPasswordPacket.HeaderCode);
    b.setUint8(LoginShortPasswordPacket.DataOffset, LoginShortPasswordPacket.Code);
  b.setUint8(LoginShortPasswordPacket.DataOffset + 1, LoginShortPasswordPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = LoginShortPasswordPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 50): LoginShortPasswordPacket {
    const p = new LoginShortPasswordPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Username(){
    const to = 14;
    const i = 4;
              
    return new DataView(this.buffer.buffer.slice(i,to));
  }
  setUsername(data: ArrayLike<number>, count = 10){
    if (data.length !== count) throw new Error(`data.length must be ${count}`);
    const from = 4;

    for (let i = 0; i < data.length; i++) {
      this.buffer.setUint8(from + i, data[i]);
    }
}
  get Password(){
    const to = 24;
    const i = 14;
              
    return new DataView(this.buffer.buffer.slice(i,to));
  }
  setPassword(data: ArrayLike<number>, count = 10){
    if (data.length !== count) throw new Error(`data.length must be ${count}`);
    const from = 14;

    for (let i = 0; i < data.length; i++) {
      this.buffer.setUint8(from + i, data[i]);
    }
}
  get TickCount(){
    return this.buffer.getUint32(24, false);
  }
  set TickCount(value: number){
    this.buffer.setUint32(24, value, false);
  }
  get ClientVersion(){
    const to = 33;
    const i = 28;
              
    return new DataView(this.buffer.buffer.slice(i,to));
  }
  setClientVersion(data: ArrayLike<number>, count = 5){
    if (data.length !== count) throw new Error(`data.length must be ${count}`);
    const from = 28;

    for (let i = 0; i < data.length; i++) {
      this.buffer.setUint8(from + i, data[i]);
    }
}
  get ClientSerial(){
    const to = 49;
    const i = 33;
              
    return new DataView(this.buffer.buffer.slice(i,to));
  }
  setClientSerial(data: ArrayLike<number>, count = 16){
    if (data.length !== count) throw new Error(`data.length must be ${count}`);
    const from = 33;

    for (let i = 0; i < data.length; i++) {
      this.buffer.setUint8(from + i, data[i]);
    }
}
}
export class Login075Packet {
  buffer!: DataView;
  static readonly Name = `Login075`;
  static readonly HeaderType = `C3HeaderWithSubCode`;
  static readonly HeaderCode = 0xC3;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `The player tries to log into the game.`;
  static readonly CausedReaction = `The server is authenticating the sent login name and password. If it's correct, the state of the player is proceeding to be logged in.`;
  static readonly Length = 48;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xF1;
  static readonly SubCode = 0x01;

  static getRequiredSize(dataSize:number){
    return Login075Packet.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, Login075Packet.HeaderCode);
    b.setUint8(Login075Packet.DataOffset, Login075Packet.Code);
  b.setUint8(Login075Packet.DataOffset + 1, Login075Packet.SubCode);
    return this;
  }

  writeLength(l: number|undefined = Login075Packet.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 48): Login075Packet {
    const p = new Login075Packet();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Username(){
    const to = 14;
    const i = 4;
              
    return new DataView(this.buffer.buffer.slice(i,to));
  }
  setUsername(data: ArrayLike<number>, count = 10){
    if (data.length !== count) throw new Error(`data.length must be ${count}`);
    const from = 4;

    for (let i = 0; i < data.length; i++) {
      this.buffer.setUint8(from + i, data[i]);
    }
}
  get Password(){
    const to = 24;
    const i = 14;
              
    return new DataView(this.buffer.buffer.slice(i,to));
  }
  setPassword(data: ArrayLike<number>, count = 10){
    if (data.length !== count) throw new Error(`data.length must be ${count}`);
    const from = 14;

    for (let i = 0; i < data.length; i++) {
      this.buffer.setUint8(from + i, data[i]);
    }
}
  get TickCount(){
    return this.buffer.getUint32(24, false);
  }
  set TickCount(value: number){
    this.buffer.setUint32(24, value, false);
  }
  get ClientVersion(){
    const to = 31;
    const i = 28;
              
    return new DataView(this.buffer.buffer.slice(i,to));
  }
  setClientVersion(data: ArrayLike<number>, count = 3){
    if (data.length !== count) throw new Error(`data.length must be ${count}`);
    const from = 28;

    for (let i = 0; i < data.length; i++) {
      this.buffer.setUint8(from + i, data[i]);
    }
}
  get ClientSerial(){
    const to = 47;
    const i = 31;
              
    return new DataView(this.buffer.buffer.slice(i,to));
  }
  setClientSerial(data: ArrayLike<number>, count = 16){
    if (data.length !== count) throw new Error(`data.length must be ${count}`);
    const from = 31;

    for (let i = 0; i < data.length; i++) {
      this.buffer.setUint8(from + i, data[i]);
    }
}
}
export class LogOutPacket {
  buffer!: DataView;
  static readonly Name = `LogOut`;
  static readonly HeaderType = `C3HeaderWithSubCode`;
  static readonly HeaderCode = 0xC3;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `When the client wants to leave the game in various ways.`;
  static readonly CausedReaction = `Depending on the LogOutType, the game server does several checks and sends a response back to the client. If the request was successful, the game client either closes the game, goes back to server or character selection.`;
  static readonly Length = 5;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xF1;
  static readonly SubCode = 0x02;

  static getRequiredSize(dataSize:number){
    return LogOutPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, LogOutPacket.HeaderCode);
    b.setUint8(LogOutPacket.DataOffset, LogOutPacket.Code);
  b.setUint8(LogOutPacket.DataOffset + 1, LogOutPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = LogOutPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 5): LogOutPacket {
    const p = new LogOutPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Type():Byte{
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set Type(value: Byte){
    const oldValue = this.Type;
    this.buffer.setUint8(4, SetByteValue(oldValue, value, 8, 0));
  }
}
export class LogOutByCheatDetectionPacket {
  buffer!: DataView;
  static readonly Name = `LogOutByCheatDetection`;
  static readonly HeaderType = `C3HeaderWithSubCode`;
  static readonly HeaderCode = 0xC3;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `When the client wants to leave the game in various ways.`;
  static readonly CausedReaction = `Depending on the LogOutType, the game server does several checks and sends a response back to the client. If the request was successful, the game client either closes the game, goes back to server or character selection.`;
  static readonly Length = 6;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xF1;
  static readonly SubCode = 0x03;

  static getRequiredSize(dataSize:number){
    return LogOutByCheatDetectionPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, LogOutByCheatDetectionPacket.HeaderCode);
    b.setUint8(LogOutByCheatDetectionPacket.DataOffset, LogOutByCheatDetectionPacket.Code);
  b.setUint8(LogOutByCheatDetectionPacket.DataOffset + 1, LogOutByCheatDetectionPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = LogOutByCheatDetectionPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 6): LogOutByCheatDetectionPacket {
    const p = new LogOutByCheatDetectionPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Type() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set Type(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }
  get Param() {
    return GetByteValue(this.buffer.getUint8(5), 8, 0);
  }
  set Param(value: number) {
    const oldByte = this.buffer.getUint8(5);
    this.buffer.setUint8(5, SetByteValue(oldByte, value, 8, 0));
  }
}
export class ResetCharacterPointRequestPacket {
  buffer!: DataView;
  static readonly Name = `ResetCharacterPointRequest`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `Unknown?`;
  static readonly CausedReaction = `Unknown?`;
  static readonly Length = 4;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xF2;
  static readonly SubCode = 0x00;

  static getRequiredSize(dataSize:number){
    return ResetCharacterPointRequestPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, ResetCharacterPointRequestPacket.HeaderCode);
    b.setUint8(ResetCharacterPointRequestPacket.DataOffset, ResetCharacterPointRequestPacket.Code);
  b.setUint8(ResetCharacterPointRequestPacket.DataOffset + 1, ResetCharacterPointRequestPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = ResetCharacterPointRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 4): ResetCharacterPointRequestPacket {
    const p = new ResetCharacterPointRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
}
export class PlayerShopSetItemPricePacket {
  buffer!: DataView;
  static readonly Name = `PlayerShopSetItemPrice`;
  static readonly HeaderType = `C3HeaderWithSubCode`;
  static readonly HeaderCode = 0xC3;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `The player wants to set a price of an item which is inside his personal item shop.`;
  static readonly CausedReaction = `The price is set for the specified item. Works only if the shop is currently closed.`;
  static readonly Length = 9;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x3F;
  static readonly SubCode = 0x01;

  static getRequiredSize(dataSize:number){
    return PlayerShopSetItemPricePacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, PlayerShopSetItemPricePacket.HeaderCode);
    b.setUint8(PlayerShopSetItemPricePacket.DataOffset, PlayerShopSetItemPricePacket.Code);
  b.setUint8(PlayerShopSetItemPricePacket.DataOffset + 1, PlayerShopSetItemPricePacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = PlayerShopSetItemPricePacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 9): PlayerShopSetItemPricePacket {
    const p = new PlayerShopSetItemPricePacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get ItemSlot() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set ItemSlot(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }
  get Price(){
    return this.buffer.getUint32(5, true);
  }
  set Price(value: number){
    this.buffer.setUint32(5, value, true);
  }
}
export class PlayerShopOpenPacket {
  buffer!: DataView;
  static readonly Name = `PlayerShopOpen`;
  static readonly HeaderType = `C3HeaderWithSubCode`;
  static readonly HeaderCode = 0xC3;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `The player wants to open his personal item shop.`;
  static readonly CausedReaction = `The personal item shop is opened and the surrounding players are informed about it, including the own player.`;
  static readonly Length = 30;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x3F;
  static readonly SubCode = 0x02;

  static getRequiredSize(dataSize:number){
    return PlayerShopOpenPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, PlayerShopOpenPacket.HeaderCode);
    b.setUint8(PlayerShopOpenPacket.DataOffset, PlayerShopOpenPacket.Code);
  b.setUint8(PlayerShopOpenPacket.DataOffset + 1, PlayerShopOpenPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = PlayerShopOpenPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  private _readString (from :number, to: number): string {
    return readWireString(this.buffer, from, to);
  }

  static createPacket(requiredSize: number = 30): PlayerShopOpenPacket {
    const p = new PlayerShopOpenPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get StoreName(){
    const to = 30;
              
    return this._readString(4, to);
  }
  setStoreName(str: string, count = 26){
    const from = 4;
    for(let i = 0; i < str.length; i++){
      const char = str.charCodeAt(i);
      this.buffer.setUint8(from + i, char);
    }
}
}
export class PlayerShopClosePacket {
  buffer!: DataView;
  static readonly Name = `PlayerShopClose`;
  static readonly HeaderType = `C3HeaderWithSubCode`;
  static readonly HeaderCode = 0xC3;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `The player wants to close his personal item shop.`;
  static readonly CausedReaction = `The personal item shop is closed and the surrounding players are informed about it, including the own player.`;
  static readonly Length = 4;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x3F;
  static readonly SubCode = 0x03;

  static getRequiredSize(dataSize:number){
    return PlayerShopClosePacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, PlayerShopClosePacket.HeaderCode);
    b.setUint8(PlayerShopClosePacket.DataOffset, PlayerShopClosePacket.Code);
  b.setUint8(PlayerShopClosePacket.DataOffset + 1, PlayerShopClosePacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = PlayerShopClosePacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 4): PlayerShopClosePacket {
    const p = new PlayerShopClosePacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
}
export class PlayerShopItemListRequestPacket {
  buffer!: DataView;
  static readonly Name = `PlayerShopItemListRequest`;
  static readonly HeaderType = `C3HeaderWithSubCode`;
  static readonly HeaderCode = 0xC3;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `A player opens a shop of another player.`;
  static readonly CausedReaction = `The list of items is sent back, if the shop of the player is currently open.`;
  static readonly Length = 16;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x3F;
  static readonly SubCode = 0x05;

  static getRequiredSize(dataSize:number){
    return PlayerShopItemListRequestPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, PlayerShopItemListRequestPacket.HeaderCode);
    b.setUint8(PlayerShopItemListRequestPacket.DataOffset, PlayerShopItemListRequestPacket.Code);
  b.setUint8(PlayerShopItemListRequestPacket.DataOffset + 1, PlayerShopItemListRequestPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = PlayerShopItemListRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  private _readString (from :number, to: number): string {
    return readWireString(this.buffer, from, to);
  }

  static createPacket(requiredSize: number = 16): PlayerShopItemListRequestPacket {
    const p = new PlayerShopItemListRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get PlayerId(){
    return this.buffer.getUint16(4, false);
  }
  set PlayerId(value: number){
    this.buffer.setUint16(4, value, false);
  }
  get PlayerName(){
    const to = 16;
              
    return this._readString(6, to);
  }
  setPlayerName(str: string, count = 10){
    const from = 6;
    for(let i = 0; i < str.length; i++){
      const char = str.charCodeAt(i);
      this.buffer.setUint8(from + i, char);
    }
}
}
export class PlayerShopItemBuyRequestPacket {
  buffer!: DataView;
  static readonly Name = `PlayerShopItemBuyRequest`;
  static readonly HeaderType = `C3HeaderWithSubCode`;
  static readonly HeaderCode = 0xC3;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `A player wants to buy the item of another players shop.`;
  static readonly CausedReaction = `If the buyer has enough money, the item is sold to the player. Both players will get notifications about that.`;
  static readonly Length = 17;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x3F;
  static readonly SubCode = 0x06;

  static getRequiredSize(dataSize:number){
    return PlayerShopItemBuyRequestPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, PlayerShopItemBuyRequestPacket.HeaderCode);
    b.setUint8(PlayerShopItemBuyRequestPacket.DataOffset, PlayerShopItemBuyRequestPacket.Code);
  b.setUint8(PlayerShopItemBuyRequestPacket.DataOffset + 1, PlayerShopItemBuyRequestPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = PlayerShopItemBuyRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  private _readString (from :number, to: number): string {
    return readWireString(this.buffer, from, to);
  }

  static createPacket(requiredSize: number = 17): PlayerShopItemBuyRequestPacket {
    const p = new PlayerShopItemBuyRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get PlayerId(){
    return this.buffer.getUint16(4, false);
  }
  set PlayerId(value: number){
    this.buffer.setUint16(4, value, false);
  }
  get PlayerName(){
    const to = 16;
              
    return this._readString(6, to);
  }
  setPlayerName(str: string, count = 10){
    const from = 6;
    for(let i = 0; i < str.length; i++){
      const char = str.charCodeAt(i);
      this.buffer.setUint8(from + i, char);
    }
}
  get ItemSlot() {
    return GetByteValue(this.buffer.getUint8(16), 8, 0);
  }
  set ItemSlot(value: number) {
    const oldByte = this.buffer.getUint8(16);
    this.buffer.setUint8(16, SetByteValue(oldByte, value, 8, 0));
  }
}
export class PlayerShopCloseOtherPacket {
  buffer!: DataView;
  static readonly Name = `PlayerShopCloseOther`;
  static readonly HeaderType = `C3HeaderWithSubCode`;
  static readonly HeaderCode = 0xC3;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `A player closes the dialog of another players shop.`;
  static readonly CausedReaction = `The server handles that by unsubscribing the player from changes of the shop.`;
  static readonly Length = 16;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x3F;
  static readonly SubCode = 0x07;

  static getRequiredSize(dataSize:number){
    return PlayerShopCloseOtherPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, PlayerShopCloseOtherPacket.HeaderCode);
    b.setUint8(PlayerShopCloseOtherPacket.DataOffset, PlayerShopCloseOtherPacket.Code);
  b.setUint8(PlayerShopCloseOtherPacket.DataOffset + 1, PlayerShopCloseOtherPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = PlayerShopCloseOtherPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  private _readString (from :number, to: number): string {
    return readWireString(this.buffer, from, to);
  }

  static createPacket(requiredSize: number = 16): PlayerShopCloseOtherPacket {
    const p = new PlayerShopCloseOtherPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get PlayerId(){
    return this.buffer.getUint16(4, false);
  }
  set PlayerId(value: number){
    this.buffer.setUint16(4, value, false);
  }
  get PlayerName(){
    const to = 16;
              
    return this._readString(6, to);
  }
  setPlayerName(str: string, count = 10){
    const from = 6;
    for(let i = 0; i < str.length; i++){
      const char = str.charCodeAt(i);
      this.buffer.setUint8(from + i, char);
    }
}
}
export class PickupItemRequestPacket {
  buffer!: DataView;
  static readonly Name = `PickupItemRequest`;
  static readonly HeaderType = `C3Header`;
  static readonly HeaderCode = 0xC3;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `A player requests to pick up an item which is laying on the ground in the near of the players character.`;
  static readonly CausedReaction = `If the player is allowed to pick the item up, and is the first player which tried that, it tries to add the item to the inventory. The server sends a response about the result of the request.`;
  static readonly Length = 5;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x22;

  static getRequiredSize(dataSize:number){
    return PickupItemRequestPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, PickupItemRequestPacket.HeaderCode);
    b.setUint8(PickupItemRequestPacket.DataOffset, PickupItemRequestPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = PickupItemRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 5): PickupItemRequestPacket {
    const p = new PickupItemRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get ItemId(){
    return this.buffer.getUint16(3, false);
  }
  set ItemId(value: number){
    this.buffer.setUint16(3, value, false);
  }
}
export class PickupItemRequest075Packet {
  buffer!: DataView;
  static readonly Name = `PickupItemRequest075`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `A player requests to pick up an item which is laying on the ground in the near of the players character.`;
  static readonly CausedReaction = `If the player is allowed to pick the item up, and is the first player which tried that, it tries to add the item to the inventory. The server sends a response about the result of the request.`;
  static readonly Length = 5;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x22;

  static getRequiredSize(dataSize:number){
    return PickupItemRequest075Packet.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, PickupItemRequest075Packet.HeaderCode);
    b.setUint8(PickupItemRequest075Packet.DataOffset, PickupItemRequest075Packet.Code);
  
    return this;
  }

  writeLength(l: number|undefined = PickupItemRequest075Packet.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 5): PickupItemRequest075Packet {
    const p = new PickupItemRequest075Packet();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get ItemId(){
    return this.buffer.getUint16(3, false);
  }
  set ItemId(value: number){
    this.buffer.setUint16(3, value, false);
  }
}
export class DropItemRequestPacket {
  buffer!: DataView;
  static readonly Name = `DropItemRequest`;
  static readonly HeaderType = `C3Header`;
  static readonly HeaderCode = 0xC3;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `A player requests to drop on item of his inventory on the ground.`;
  static readonly CausedReaction = `When the specified coordinates are valid, and the item is allowed to be dropped, it will be dropped on the ground and the surrounding players are notified.`;
  static readonly Length = 6;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x23;

  static getRequiredSize(dataSize:number){
    return DropItemRequestPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, DropItemRequestPacket.HeaderCode);
    b.setUint8(DropItemRequestPacket.DataOffset, DropItemRequestPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = DropItemRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 6): DropItemRequestPacket {
    const p = new DropItemRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get TargetX() {
    return GetByteValue(this.buffer.getUint8(3), 8, 0);
  }
  set TargetX(value: number) {
    const oldByte = this.buffer.getUint8(3);
    this.buffer.setUint8(3, SetByteValue(oldByte, value, 8, 0));
  }
  get TargetY() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set TargetY(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }
  get ItemSlot() {
    return GetByteValue(this.buffer.getUint8(5), 8, 0);
  }
  set ItemSlot(value: number) {
    const oldByte = this.buffer.getUint8(5);
    this.buffer.setUint8(5, SetByteValue(oldByte, value, 8, 0));
  }
}
export class ItemMoveRequestPacket {
  buffer!: DataView;
  static readonly Name = `ItemMoveRequest`;
  static readonly HeaderType = `C3Header`;
  static readonly HeaderCode = 0xC3;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `A player requests to move an item within or between his available item storage, such as inventory, vault, trade or chaos machine.`;
  static readonly CausedReaction = `undefined`;
  static readonly Length = 19;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x24;

  static getRequiredSize(dataSize:number){
    return ItemMoveRequestPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, ItemMoveRequestPacket.HeaderCode);
    b.setUint8(ItemMoveRequestPacket.DataOffset, ItemMoveRequestPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = ItemMoveRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 19): ItemMoveRequestPacket {
    const p = new ItemMoveRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get FromStorage():Byte{
    return GetByteValue(this.buffer.getUint8(3), 8, 0);
  }
  set FromStorage(value: Byte){
    const oldValue = this.FromStorage;
    this.buffer.setUint8(3, SetByteValue(oldValue, value, 8, 0));
  }
  get FromSlot() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set FromSlot(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }
  get ItemData(){
    const to = 17;
    const i = 5;
              
    return new DataView(this.buffer.buffer.slice(i,to));
  }
  setItemData(data: ArrayLike<number>, count = 12){
    if (data.length !== count) throw new Error(`data.length must be ${count}`);
    const from = 5;

    for (let i = 0; i < data.length; i++) {
      this.buffer.setUint8(from + i, data[i]);
    }
}
  get ToStorage():Byte{
    return GetByteValue(this.buffer.getUint8(17), 8, 0);
  }
  set ToStorage(value: Byte){
    const oldValue = this.ToStorage;
    this.buffer.setUint8(17, SetByteValue(oldValue, value, 8, 0));
  }
  get ToSlot() {
    return GetByteValue(this.buffer.getUint8(18), 8, 0);
  }
  set ToSlot(value: number) {
    const oldByte = this.buffer.getUint8(18);
    this.buffer.setUint8(18, SetByteValue(oldByte, value, 8, 0));
  }
}
export class ItemMoveRequestExtendedPacket {
  buffer!: DataView;
  static readonly Name = `ItemMoveRequestExtended`;
  static readonly HeaderType = `C3Header`;
  static readonly HeaderCode = 0xC3;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `A player requests to move an item within or between his available item storage, such as inventory, vault, trade or chaos machine.`;
  static readonly CausedReaction = `undefined`;
  static readonly Length = 7;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x24;

  static getRequiredSize(dataSize:number){
    return ItemMoveRequestExtendedPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, ItemMoveRequestExtendedPacket.HeaderCode);
    b.setUint8(ItemMoveRequestExtendedPacket.DataOffset, ItemMoveRequestExtendedPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = ItemMoveRequestExtendedPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 7): ItemMoveRequestExtendedPacket {
    const p = new ItemMoveRequestExtendedPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get FromStorage():Byte{
    return GetByteValue(this.buffer.getUint8(3), 8, 0);
  }
  set FromStorage(value: Byte){
    const oldValue = this.FromStorage;
    this.buffer.setUint8(3, SetByteValue(oldValue, value, 8, 0));
  }
  get FromSlot() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set FromSlot(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }
  get ToStorage():Byte{
    return GetByteValue(this.buffer.getUint8(5), 8, 0);
  }
  set ToStorage(value: Byte){
    const oldValue = this.ToStorage;
    this.buffer.setUint8(5, SetByteValue(oldValue, value, 8, 0));
  }
  get ToSlot() {
    return GetByteValue(this.buffer.getUint8(6), 8, 0);
  }
  set ToSlot(value: number) {
    const oldByte = this.buffer.getUint8(6);
    this.buffer.setUint8(6, SetByteValue(oldByte, value, 8, 0));
  }
}
export enum ConsumeItemRequestFruitUsageEnum {
    AddPoints = 0,
RemovePoints = 1
  }export class ConsumeItemRequestPacket {
  buffer!: DataView;
  static readonly Name = `ConsumeItemRequest`;
  static readonly HeaderType = `C3Header`;
  static readonly HeaderCode = 0xC3;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `A player requests to 'consume' an item. This can be a potion which recovers some kind of attribute, or a jewel to upgrade a target item.`;
  static readonly CausedReaction = `The server tries to 'consume' the specified item and responses accordingly.`;
  static readonly Length = 6;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x26;

  static getRequiredSize(dataSize:number){
    return ConsumeItemRequestPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, ConsumeItemRequestPacket.HeaderCode);
    b.setUint8(ConsumeItemRequestPacket.DataOffset, ConsumeItemRequestPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = ConsumeItemRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 6): ConsumeItemRequestPacket {
    const p = new ConsumeItemRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get ItemSlot() {
    return GetByteValue(this.buffer.getUint8(3), 8, 0);
  }
  set ItemSlot(value: number) {
    const oldByte = this.buffer.getUint8(3);
    this.buffer.setUint8(3, SetByteValue(oldByte, value, 8, 0));
  }
  get TargetSlot() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set TargetSlot(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }
  get FruitConsumption():ConsumeItemRequestFruitUsageEnum{
    return GetByteValue(this.buffer.getUint8(5), 8, 0);
  }
  set FruitConsumption(value: ConsumeItemRequestFruitUsageEnum){
    const oldValue = this.FruitConsumption;
    this.buffer.setUint8(5, SetByteValue(oldValue, value, 8, 0));
  }
}
export class ConsumeItemRequest075Packet {
  buffer!: DataView;
  static readonly Name = `ConsumeItemRequest075`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `A player requests to 'consume' an item. This can be a potion which recovers some kind of attribute, or a jewel to upgrade a target item.`;
  static readonly CausedReaction = `The server tries to 'consume' the specified item and responses accordingly.`;
  static readonly Length = 5;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x26;

  static getRequiredSize(dataSize:number){
    return ConsumeItemRequest075Packet.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, ConsumeItemRequest075Packet.HeaderCode);
    b.setUint8(ConsumeItemRequest075Packet.DataOffset, ConsumeItemRequest075Packet.Code);
  
    return this;
  }

  writeLength(l: number|undefined = ConsumeItemRequest075Packet.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 5): ConsumeItemRequest075Packet {
    const p = new ConsumeItemRequest075Packet();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get ItemSlot() {
    return GetByteValue(this.buffer.getUint8(3), 8, 0);
  }
  set ItemSlot(value: number) {
    const oldByte = this.buffer.getUint8(3);
    this.buffer.setUint8(3, SetByteValue(oldByte, value, 8, 0));
  }
  get TargetSlot() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set TargetSlot(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }
}
export class TalkToNpcRequestPacket {
  buffer!: DataView;
  static readonly Name = `TalkToNpcRequest`;
  static readonly HeaderType = `C3Header`;
  static readonly HeaderCode = 0xC3;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `A player wants to talk to an NPC.`;
  static readonly CausedReaction = `Based on the NPC type, the server sends a response back to the game client. For example, if it's a merchant NPC, it sends back that a merchant dialog should be opened and which items are offered by this NPC.`;
  static readonly Length = 5;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x30;

  static getRequiredSize(dataSize:number){
    return TalkToNpcRequestPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, TalkToNpcRequestPacket.HeaderCode);
    b.setUint8(TalkToNpcRequestPacket.DataOffset, TalkToNpcRequestPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = TalkToNpcRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 5): TalkToNpcRequestPacket {
    const p = new TalkToNpcRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get NpcId(){
    return this.buffer.getUint16(3, false);
  }
  set NpcId(value: number){
    this.buffer.setUint16(3, value, false);
  }
}
export class CloseNpcRequestPacket {
  buffer!: DataView;
  static readonly Name = `CloseNpcRequest`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `A player closes the dialog which was opened by an interaction with a NPC.`;
  static readonly CausedReaction = `The server updates the state of the player accordingly.`;
  static readonly Length = 3;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x31;

  static getRequiredSize(dataSize:number){
    return CloseNpcRequestPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, CloseNpcRequestPacket.HeaderCode);
    b.setUint8(CloseNpcRequestPacket.DataOffset, CloseNpcRequestPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = CloseNpcRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 3): CloseNpcRequestPacket {
    const p = new CloseNpcRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
}
export class BuyItemFromNpcRequestPacket {
  buffer!: DataView;
  static readonly Name = `BuyItemFromNpcRequest`;
  static readonly HeaderType = `C3Header`;
  static readonly HeaderCode = 0xC3;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `A player wants to buy an item from an opened NPC merchant.`;
  static readonly CausedReaction = `If the player has enough money, the item is added to the inventory and money is removed. Corresponding messages are sent back to the game client.`;
  static readonly Length = 4;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x32;

  static getRequiredSize(dataSize:number){
    return BuyItemFromNpcRequestPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, BuyItemFromNpcRequestPacket.HeaderCode);
    b.setUint8(BuyItemFromNpcRequestPacket.DataOffset, BuyItemFromNpcRequestPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = BuyItemFromNpcRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 4): BuyItemFromNpcRequestPacket {
    const p = new BuyItemFromNpcRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get ItemSlot() {
    return GetByteValue(this.buffer.getUint8(3), 8, 0);
  }
  set ItemSlot(value: number) {
    const oldByte = this.buffer.getUint8(3);
    this.buffer.setUint8(3, SetByteValue(oldByte, value, 8, 0));
  }
}
export class SellItemToNpcRequestPacket {
  buffer!: DataView;
  static readonly Name = `SellItemToNpcRequest`;
  static readonly HeaderType = `C3Header`;
  static readonly HeaderCode = 0xC3;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `A player wants to sell an item of his inventory to the opened NPC merchant.`;
  static readonly CausedReaction = `The item is sold for money to the NPC. The item is removed from the inventory and money is added. Corresponding messages are sent back to the game client.`;
  static readonly Length = 4;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x33;

  static getRequiredSize(dataSize:number){
    return SellItemToNpcRequestPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, SellItemToNpcRequestPacket.HeaderCode);
    b.setUint8(SellItemToNpcRequestPacket.DataOffset, SellItemToNpcRequestPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = SellItemToNpcRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 4): SellItemToNpcRequestPacket {
    const p = new SellItemToNpcRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get ItemSlot() {
    return GetByteValue(this.buffer.getUint8(3), 8, 0);
  }
  set ItemSlot(value: number) {
    const oldByte = this.buffer.getUint8(3);
    this.buffer.setUint8(3, SetByteValue(oldByte, value, 8, 0));
  }
}
export class RepairItemRequestPacket {
  buffer!: DataView;
  static readonly Name = `RepairItemRequest`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `A player wants to repair an item of his inventory.`;
  static readonly CausedReaction = `The item is repaired if the player has enough money in its inventory. A corresponding response is sent.`;
  static readonly Length = 5;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x34;

  static getRequiredSize(dataSize:number){
    return RepairItemRequestPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, RepairItemRequestPacket.HeaderCode);
    b.setUint8(RepairItemRequestPacket.DataOffset, RepairItemRequestPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = RepairItemRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 5): RepairItemRequestPacket {
    const p = new RepairItemRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get ItemSlot() {
    return GetByteValue(this.buffer.getUint8(3), 8, 0);
  }
  set ItemSlot(value: number) {
    const oldByte = this.buffer.getUint8(3);
    this.buffer.setUint8(3, SetByteValue(oldByte, value, 8, 0));
  }
  get IsSelfRepair(){
    return GetBoolean(this.buffer.getUint8(4), 0);
  }
  set IsSelfRepair(value: boolean){
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetBoolean(oldByte, value, 0));
  }
}
export class WarpCommandRequestPacket {
  buffer!: DataView;
  static readonly Name = `WarpCommandRequest`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `A player selected to warp by selecting an entry in the warp list (configured in game client files).`;
  static readonly CausedReaction = `If the player has enough money and is allowed to enter the map, it's getting moved to there.`;
  static readonly Length = 10;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x8E;
  static readonly SubCode = 0x02;

  static getRequiredSize(dataSize:number){
    return WarpCommandRequestPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, WarpCommandRequestPacket.HeaderCode);
    b.setUint8(WarpCommandRequestPacket.DataOffset, WarpCommandRequestPacket.Code);
  b.setUint8(WarpCommandRequestPacket.DataOffset + 1, WarpCommandRequestPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = WarpCommandRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 10): WarpCommandRequestPacket {
    const p = new WarpCommandRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get CommandKey(){
    return this.buffer.getUint32(4, true);
  }
  set CommandKey(value: number){
    this.buffer.setUint32(4, value, true);
  }
  get WarpInfoIndex(){
    return this.buffer.getUint16(8, true);
  }
  set WarpInfoIndex(value: number){
    this.buffer.setUint16(8, value, true);
  }
}
export class EnterGateRequestPacket {
  buffer!: DataView;
  static readonly Name = `EnterGateRequest`;
  static readonly HeaderType = `C3Header`;
  static readonly HeaderCode = 0xC3;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `Usually: When the player enters an area on the game map which is configured as gate at the client data files. In the special case of wizards, this packet is also used for the teleport skill. When this is the case, GateNumber is 0 and the target coordinates are specified.`;
  static readonly CausedReaction = `If the player is allowed to enter the "gate", it's moved to the corresponding exit gate area.`;
  static readonly Length = 8;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x1C;

  static getRequiredSize(dataSize:number){
    return EnterGateRequestPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, EnterGateRequestPacket.HeaderCode);
    b.setUint8(EnterGateRequestPacket.DataOffset, EnterGateRequestPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = EnterGateRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 8): EnterGateRequestPacket {
    const p = new EnterGateRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get GateNumber(){
    return this.buffer.getUint16(4, true);
  }
  set GateNumber(value: number){
    this.buffer.setUint16(4, value, true);
  }
  get TeleportTargetX() {
    return GetByteValue(this.buffer.getUint8(6), 8, 0);
  }
  set TeleportTargetX(value: number) {
    const oldByte = this.buffer.getUint8(6);
    this.buffer.setUint8(6, SetByteValue(oldByte, value, 8, 0));
  }
  get TeleportTargetY() {
    return GetByteValue(this.buffer.getUint8(7), 8, 0);
  }
  set TeleportTargetY(value: number) {
    const oldByte = this.buffer.getUint8(7);
    this.buffer.setUint8(7, SetByteValue(oldByte, value, 8, 0));
  }
}
export class EnterGateRequest075Packet {
  buffer!: DataView;
  static readonly Name = `EnterGateRequest075`;
  static readonly HeaderType = `C3Header`;
  static readonly HeaderCode = 0xC3;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `Usually: When the player enters an area on the game map which is configured as gate at the client data files. In the special case of wizards, this packet is also used for the teleport skill. When this is the case, GateNumber is 0 and the target coordinates are specified.`;
  static readonly CausedReaction = `If the player is allowed to enter the "gate", it's moved to the corresponding exit gate area.`;
  static readonly Length = 6;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x1C;

  static getRequiredSize(dataSize:number){
    return EnterGateRequest075Packet.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, EnterGateRequest075Packet.HeaderCode);
    b.setUint8(EnterGateRequest075Packet.DataOffset, EnterGateRequest075Packet.Code);
  
    return this;
  }

  writeLength(l: number|undefined = EnterGateRequest075Packet.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 6): EnterGateRequest075Packet {
    const p = new EnterGateRequest075Packet();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get GateNumber() {
    return GetByteValue(this.buffer.getUint8(3), 8, 0);
  }
  set GateNumber(value: number) {
    const oldByte = this.buffer.getUint8(3);
    this.buffer.setUint8(3, SetByteValue(oldByte, value, 8, 0));
  }
  get TeleportTargetX() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set TeleportTargetX(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }
  get TeleportTargetY() {
    return GetByteValue(this.buffer.getUint8(5), 8, 0);
  }
  set TeleportTargetY(value: number) {
    const oldByte = this.buffer.getUint8(5);
    this.buffer.setUint8(5, SetByteValue(oldByte, value, 8, 0));
  }
}
export class TeleportTargetPacket {
  buffer!: DataView;
  static readonly Name = `TeleportTarget`;
  static readonly HeaderType = `C3Header`;
  static readonly HeaderCode = 0xC3;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `A wizard uses the 'Teleport Ally' skill to teleport a party member of his view range to a nearby coordinate.`;
  static readonly CausedReaction = `If the target player is in the same party and in the range, it will teleported to the specified coordinates.`;
  static readonly Length = 7;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xB0;

  static getRequiredSize(dataSize:number){
    return TeleportTargetPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, TeleportTargetPacket.HeaderCode);
    b.setUint8(TeleportTargetPacket.DataOffset, TeleportTargetPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = TeleportTargetPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 7): TeleportTargetPacket {
    const p = new TeleportTargetPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get TargetId(){
    return this.buffer.getUint16(3, true);
  }
  set TargetId(value: number){
    this.buffer.setUint16(3, value, true);
  }
  get TeleportTargetX() {
    return GetByteValue(this.buffer.getUint8(5), 8, 0);
  }
  set TeleportTargetX(value: number) {
    const oldByte = this.buffer.getUint8(5);
    this.buffer.setUint8(5, SetByteValue(oldByte, value, 8, 0));
  }
  get TeleportTargetY() {
    return GetByteValue(this.buffer.getUint8(6), 8, 0);
  }
  set TeleportTargetY(value: number) {
    const oldByte = this.buffer.getUint8(6);
    this.buffer.setUint8(6, SetByteValue(oldByte, value, 8, 0));
  }
}
export class ServerChangeAuthenticationPacket {
  buffer!: DataView;
  static readonly Name = `ServerChangeAuthentication`;
  static readonly HeaderType = `C3HeaderWithSubCode`;
  static readonly HeaderCode = 0xC3;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `After the client connected to another server due map change.`;
  static readonly CausedReaction = `The player spawns on the new server.`;
  static readonly Length = 69;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xB1;
  static readonly SubCode = 0x01;

  static getRequiredSize(dataSize:number){
    return ServerChangeAuthenticationPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, ServerChangeAuthenticationPacket.HeaderCode);
    b.setUint8(ServerChangeAuthenticationPacket.DataOffset, ServerChangeAuthenticationPacket.Code);
  b.setUint8(ServerChangeAuthenticationPacket.DataOffset + 1, ServerChangeAuthenticationPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = ServerChangeAuthenticationPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 69): ServerChangeAuthenticationPacket {
    const p = new ServerChangeAuthenticationPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get AccountXor3(){
    const to = 16;
    const i = 4;
              
    return new DataView(this.buffer.buffer.slice(i,to));
  }
  setAccountXor3(data: ArrayLike<number>, count = 12){
    if (data.length !== count) throw new Error(`data.length must be ${count}`);
    const from = 4;

    for (let i = 0; i < data.length; i++) {
      this.buffer.setUint8(from + i, data[i]);
    }
}
  get CharacterNameXor3(){
    const to = 28;
    const i = 16;
              
    return new DataView(this.buffer.buffer.slice(i,to));
  }
  setCharacterNameXor3(data: ArrayLike<number>, count = 12){
    if (data.length !== count) throw new Error(`data.length must be ${count}`);
    const from = 16;

    for (let i = 0; i < data.length; i++) {
      this.buffer.setUint8(from + i, data[i]);
    }
}
  get AuthCode1(){
    return this.buffer.getUint32(28, true);
  }
  set AuthCode1(value: number){
    this.buffer.setUint32(28, value, true);
  }
  get AuthCode2(){
    return this.buffer.getUint32(32, true);
  }
  set AuthCode2(value: number){
    this.buffer.setUint32(32, value, true);
  }
  get AuthCode3(){
    return this.buffer.getUint32(36, true);
  }
  set AuthCode3(value: number){
    this.buffer.setUint32(36, value, true);
  }
  get AuthCode4(){
    return this.buffer.getUint32(40, true);
  }
  set AuthCode4(value: number){
    this.buffer.setUint32(40, value, true);
  }
  get TickCount(){
    return this.buffer.getUint32(44, true);
  }
  set TickCount(value: number){
    this.buffer.setUint32(44, value, true);
  }
  get ClientVersion(){
    const to = 53;
    const i = 48;
              
    return new DataView(this.buffer.buffer.slice(i,to));
  }
  setClientVersion(data: ArrayLike<number>, count = 5){
    if (data.length !== count) throw new Error(`data.length must be ${count}`);
    const from = 48;

    for (let i = 0; i < data.length; i++) {
      this.buffer.setUint8(from + i, data[i]);
    }
}
  get ClientSerial(){
    const to = 69;
    const i = 53;
              
    return new DataView(this.buffer.buffer.slice(i,to));
  }
  setClientSerial(data: ArrayLike<number>, count = 16){
    if (data.length !== count) throw new Error(`data.length must be ${count}`);
    const from = 53;

    for (let i = 0; i < data.length; i++) {
      this.buffer.setUint8(from + i, data[i]);
    }
}
}
export class CastleSiegeStatusRequestPacket {
  buffer!: DataView;
  static readonly Name = `CastleSiegeStatusRequest`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `The player opened a castle siege npc and requests the current castle siege status information.`;
  static readonly CausedReaction = `The server returns the status of the castle siege event.`;
  static readonly Length = 4;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xB2;
  static readonly SubCode = 0x00;

  static getRequiredSize(dataSize:number){
    return CastleSiegeStatusRequestPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, CastleSiegeStatusRequestPacket.HeaderCode);
    b.setUint8(CastleSiegeStatusRequestPacket.DataOffset, CastleSiegeStatusRequestPacket.Code);
  b.setUint8(CastleSiegeStatusRequestPacket.DataOffset + 1, CastleSiegeStatusRequestPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = CastleSiegeStatusRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 4): CastleSiegeStatusRequestPacket {
    const p = new CastleSiegeStatusRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
}
export class CastleSiegeRegistrationRequestPacket {
  buffer!: DataView;
  static readonly Name = `CastleSiegeRegistrationRequest`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `The player opened a castle siege npc to register his guild alliance.`;
  static readonly CausedReaction = `The server returns the result of the castle siege registration.`;
  static readonly Length = 4;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xB2;
  static readonly SubCode = 0x01;

  static getRequiredSize(dataSize:number){
    return CastleSiegeRegistrationRequestPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, CastleSiegeRegistrationRequestPacket.HeaderCode);
    b.setUint8(CastleSiegeRegistrationRequestPacket.DataOffset, CastleSiegeRegistrationRequestPacket.Code);
  b.setUint8(CastleSiegeRegistrationRequestPacket.DataOffset + 1, CastleSiegeRegistrationRequestPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = CastleSiegeRegistrationRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 4): CastleSiegeRegistrationRequestPacket {
    const p = new CastleSiegeRegistrationRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
}
export class CastleSiegeUnregisterRequestPacket {
  buffer!: DataView;
  static readonly Name = `CastleSiegeUnregisterRequest`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `The player opened a castle siege npc to un-register his guild alliance.`;
  static readonly CausedReaction = `The server returns the result of the castle siege un-registration.`;
  static readonly Length = 5;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xB2;
  static readonly SubCode = 0x02;

  static getRequiredSize(dataSize:number){
    return CastleSiegeUnregisterRequestPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, CastleSiegeUnregisterRequestPacket.HeaderCode);
    b.setUint8(CastleSiegeUnregisterRequestPacket.DataOffset, CastleSiegeUnregisterRequestPacket.Code);
  b.setUint8(CastleSiegeUnregisterRequestPacket.DataOffset + 1, CastleSiegeUnregisterRequestPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = CastleSiegeUnregisterRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 5): CastleSiegeUnregisterRequestPacket {
    const p = new CastleSiegeUnregisterRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get IsGivingUp(){
    return GetBoolean(this.buffer.getUint8(4), 0);
  }
  set IsGivingUp(value: boolean){
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetBoolean(oldByte, value, 0));
  }
}
export class CastleSiegeRegistrationStateRequestPacket {
  buffer!: DataView;
  static readonly Name = `CastleSiegeRegistrationStateRequest`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `The player opened a castle siege npc and requests the state about the own registration.`;
  static readonly CausedReaction = `The server returns the state of the castle siege registration, which includes the number of submitted guild marks.`;
  static readonly Length = 4;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xB2;
  static readonly SubCode = 0x03;

  static getRequiredSize(dataSize:number){
    return CastleSiegeRegistrationStateRequestPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, CastleSiegeRegistrationStateRequestPacket.HeaderCode);
    b.setUint8(CastleSiegeRegistrationStateRequestPacket.DataOffset, CastleSiegeRegistrationStateRequestPacket.Code);
  b.setUint8(CastleSiegeRegistrationStateRequestPacket.DataOffset + 1, CastleSiegeRegistrationStateRequestPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = CastleSiegeRegistrationStateRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 4): CastleSiegeRegistrationStateRequestPacket {
    const p = new CastleSiegeRegistrationStateRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
}
export class CastleSiegeMarkRegistrationPacket {
  buffer!: DataView;
  static readonly Name = `CastleSiegeMarkRegistration`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `The player opened a castle siege npc and adds a guild mark to his guilds registration.`;
  static readonly CausedReaction = `The server returns a response, which includes the number of submitted guild marks.`;
  static readonly Length = 5;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xB2;
  static readonly SubCode = 0x04;

  static getRequiredSize(dataSize:number){
    return CastleSiegeMarkRegistrationPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, CastleSiegeMarkRegistrationPacket.HeaderCode);
    b.setUint8(CastleSiegeMarkRegistrationPacket.DataOffset, CastleSiegeMarkRegistrationPacket.Code);
  b.setUint8(CastleSiegeMarkRegistrationPacket.DataOffset + 1, CastleSiegeMarkRegistrationPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = CastleSiegeMarkRegistrationPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 5): CastleSiegeMarkRegistrationPacket {
    const p = new CastleSiegeMarkRegistrationPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get ItemIndex() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set ItemIndex(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }
}
export class CastleSiegeDefenseBuyRequestPacket {
  buffer!: DataView;
  static readonly Name = `CastleSiegeDefenseBuyRequest`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `The player opened a castle siege npc and requests to buy a gate or statue for a specific position (index)..`;
  static readonly CausedReaction = `The server returns a response.`;
  static readonly Length = 12;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xB2;
  static readonly SubCode = 0x05;

  static getRequiredSize(dataSize:number){
    return CastleSiegeDefenseBuyRequestPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, CastleSiegeDefenseBuyRequestPacket.HeaderCode);
    b.setUint8(CastleSiegeDefenseBuyRequestPacket.DataOffset, CastleSiegeDefenseBuyRequestPacket.Code);
  b.setUint8(CastleSiegeDefenseBuyRequestPacket.DataOffset + 1, CastleSiegeDefenseBuyRequestPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = CastleSiegeDefenseBuyRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 12): CastleSiegeDefenseBuyRequestPacket {
    const p = new CastleSiegeDefenseBuyRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get NpcNumber(){
    return this.buffer.getUint32(4, true);
  }
  set NpcNumber(value: number){
    this.buffer.setUint32(4, value, true);
  }
  get NpcIndex(){
    return this.buffer.getUint32(8, true);
  }
  set NpcIndex(value: number){
    this.buffer.setUint32(8, value, true);
  }
}
export class CastleSiegeDefenseRepairRequestPacket {
  buffer!: DataView;
  static readonly Name = `CastleSiegeDefenseRepairRequest`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `The player opened a castle siege npc and requests to repair a gate or statue at a specific position (index)..`;
  static readonly CausedReaction = `The server returns a response.`;
  static readonly Length = 12;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xB2;
  static readonly SubCode = 0x06;

  static getRequiredSize(dataSize:number){
    return CastleSiegeDefenseRepairRequestPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, CastleSiegeDefenseRepairRequestPacket.HeaderCode);
    b.setUint8(CastleSiegeDefenseRepairRequestPacket.DataOffset, CastleSiegeDefenseRepairRequestPacket.Code);
  b.setUint8(CastleSiegeDefenseRepairRequestPacket.DataOffset + 1, CastleSiegeDefenseRepairRequestPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = CastleSiegeDefenseRepairRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 12): CastleSiegeDefenseRepairRequestPacket {
    const p = new CastleSiegeDefenseRepairRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get NpcNumber(){
    return this.buffer.getUint32(4, true);
  }
  set NpcNumber(value: number){
    this.buffer.setUint32(4, value, true);
  }
  get NpcIndex(){
    return this.buffer.getUint32(8, true);
  }
  set NpcIndex(value: number){
    this.buffer.setUint32(8, value, true);
  }
}
export class CastleSiegeDefenseUpgradeRequestPacket {
  buffer!: DataView;
  static readonly Name = `CastleSiegeDefenseUpgradeRequest`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `The player opened a castle siege npc and requests to upgrade a gate or statue at a specific position (index)..`;
  static readonly CausedReaction = `The server returns a response.`;
  static readonly Length = 20;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xB2;
  static readonly SubCode = 0x07;

  static getRequiredSize(dataSize:number){
    return CastleSiegeDefenseUpgradeRequestPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, CastleSiegeDefenseUpgradeRequestPacket.HeaderCode);
    b.setUint8(CastleSiegeDefenseUpgradeRequestPacket.DataOffset, CastleSiegeDefenseUpgradeRequestPacket.Code);
  b.setUint8(CastleSiegeDefenseUpgradeRequestPacket.DataOffset + 1, CastleSiegeDefenseUpgradeRequestPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = CastleSiegeDefenseUpgradeRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 20): CastleSiegeDefenseUpgradeRequestPacket {
    const p = new CastleSiegeDefenseUpgradeRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get NpcNumber(){
    return this.buffer.getUint32(4, true);
  }
  set NpcNumber(value: number){
    this.buffer.setUint32(4, value, true);
  }
  get NpcIndex(){
    return this.buffer.getUint32(8, true);
  }
  set NpcIndex(value: number){
    this.buffer.setUint32(8, value, true);
  }
  get NpcUpgradeType(){
    return this.buffer.getUint32(12, true);
  }
  set NpcUpgradeType(value: number){
    this.buffer.setUint32(12, value, true);
  }
  get NpcUpgradeValue(){
    return this.buffer.getUint32(16, true);
  }
  set NpcUpgradeValue(value: number){
    this.buffer.setUint32(16, value, true);
  }
}
export class CastleSiegeTaxInfoRequestPacket {
  buffer!: DataView;
  static readonly Name = `CastleSiegeTaxInfoRequest`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `The guild master opened a castle siege npc to manage the castle.`;
  static readonly CausedReaction = `The server returns the tax information.`;
  static readonly Length = 4;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xB2;
  static readonly SubCode = 0x08;

  static getRequiredSize(dataSize:number){
    return CastleSiegeTaxInfoRequestPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, CastleSiegeTaxInfoRequestPacket.HeaderCode);
    b.setUint8(CastleSiegeTaxInfoRequestPacket.DataOffset, CastleSiegeTaxInfoRequestPacket.Code);
  b.setUint8(CastleSiegeTaxInfoRequestPacket.DataOffset + 1, CastleSiegeTaxInfoRequestPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = CastleSiegeTaxInfoRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 4): CastleSiegeTaxInfoRequestPacket {
    const p = new CastleSiegeTaxInfoRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
}
export class CastleSiegeTaxChangeRequestPacket {
  buffer!: DataView;
  static readonly Name = `CastleSiegeTaxChangeRequest`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `The guild master wants to change the tax rate in the castle npc.`;
  static readonly CausedReaction = `The server changes the tax rates accordingly.`;
  static readonly Length = 9;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xB2;
  static readonly SubCode = 0x09;

  static getRequiredSize(dataSize:number){
    return CastleSiegeTaxChangeRequestPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, CastleSiegeTaxChangeRequestPacket.HeaderCode);
    b.setUint8(CastleSiegeTaxChangeRequestPacket.DataOffset, CastleSiegeTaxChangeRequestPacket.Code);
  b.setUint8(CastleSiegeTaxChangeRequestPacket.DataOffset + 1, CastleSiegeTaxChangeRequestPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = CastleSiegeTaxChangeRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 9): CastleSiegeTaxChangeRequestPacket {
    const p = new CastleSiegeTaxChangeRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get TaxType():CastleSiegeTaxTypeEnum{
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set TaxType(value: CastleSiegeTaxTypeEnum){
    const oldValue = this.TaxType;
    this.buffer.setUint8(4, SetByteValue(oldValue, value, 8, 0));
  }
  get TaxValue(){
    return this.buffer.getUint32(5, false);
  }
  set TaxValue(value: number){
    this.buffer.setUint32(5, value, false);
  }
}
export class CastleSiegeTaxMoneyWithdrawPacket {
  buffer!: DataView;
  static readonly Name = `CastleSiegeTaxMoneyWithdraw`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `The guild master wants to withdraw the tax money from the castle npc.`;
  static readonly CausedReaction = `The server moves the money into the inventory of the guild master.`;
  static readonly Length = 8;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xB2;
  static readonly SubCode = 0x10;

  static getRequiredSize(dataSize:number){
    return CastleSiegeTaxMoneyWithdrawPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, CastleSiegeTaxMoneyWithdrawPacket.HeaderCode);
    b.setUint8(CastleSiegeTaxMoneyWithdrawPacket.DataOffset, CastleSiegeTaxMoneyWithdrawPacket.Code);
  b.setUint8(CastleSiegeTaxMoneyWithdrawPacket.DataOffset + 1, CastleSiegeTaxMoneyWithdrawPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = CastleSiegeTaxMoneyWithdrawPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 8): CastleSiegeTaxMoneyWithdrawPacket {
    const p = new CastleSiegeTaxMoneyWithdrawPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Amount(){
    return this.buffer.getUint32(4, false);
  }
  set Amount(value: number){
    this.buffer.setUint32(4, value, false);
  }
}
export class ToggleCastleGateRequestPacket {
  buffer!: DataView;
  static readonly Name = `ToggleCastleGateRequest`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `The guild member of the castle owner wants to toggle the gate switch.`;
  static readonly CausedReaction = `The castle gate is getting opened or closed.`;
  static readonly Length = 7;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xB2;
  static readonly SubCode = 0x12;

  static getRequiredSize(dataSize:number){
    return ToggleCastleGateRequestPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, ToggleCastleGateRequestPacket.HeaderCode);
    b.setUint8(ToggleCastleGateRequestPacket.DataOffset, ToggleCastleGateRequestPacket.Code);
  b.setUint8(ToggleCastleGateRequestPacket.DataOffset + 1, ToggleCastleGateRequestPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = ToggleCastleGateRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 7): ToggleCastleGateRequestPacket {
    const p = new ToggleCastleGateRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get IsOpen(){
    return GetBoolean(this.buffer.getUint8(4), 0);
  }
  set IsOpen(value: boolean){
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetBoolean(oldByte, value, 0));
  }
  get GateId(){
    return this.buffer.getUint16(5, false);
  }
  set GateId(value: number){
    this.buffer.setUint16(5, value, false);
  }
}
export class CastleGuildCommandPacket {
  buffer!: DataView;
  static readonly Name = `CastleGuildCommand`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `The guild master sent a command to his guild during the castle siege event.`;
  static readonly CausedReaction = `The command is shown on the mini map of the guild members.`;
  static readonly Length = 8;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xB2;
  static readonly SubCode = 0x1D;

  static getRequiredSize(dataSize:number){
    return CastleGuildCommandPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, CastleGuildCommandPacket.HeaderCode);
    b.setUint8(CastleGuildCommandPacket.DataOffset, CastleGuildCommandPacket.Code);
  b.setUint8(CastleGuildCommandPacket.DataOffset + 1, CastleGuildCommandPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = CastleGuildCommandPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 8): CastleGuildCommandPacket {
    const p = new CastleGuildCommandPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Team() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set Team(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }
  get PositionX() {
    return GetByteValue(this.buffer.getUint8(5), 8, 0);
  }
  set PositionX(value: number) {
    const oldByte = this.buffer.getUint8(5);
    this.buffer.setUint8(5, SetByteValue(oldByte, value, 8, 0));
  }
  get PositionY() {
    return GetByteValue(this.buffer.getUint8(6), 8, 0);
  }
  set PositionY(value: number) {
    const oldByte = this.buffer.getUint8(6);
    this.buffer.setUint8(6, SetByteValue(oldByte, value, 8, 0));
  }
  get Command():CastleSiegeGuildCommandTypeEnum{
    return GetByteValue(this.buffer.getUint8(7), 8, 0);
  }
  set Command(value: CastleSiegeGuildCommandTypeEnum){
    const oldValue = this.Command;
    this.buffer.setUint8(7, SetByteValue(oldValue, value, 8, 0));
  }
}
export class CastleSiegeHuntingZoneEntranceSettingPacket {
  buffer!: DataView;
  static readonly Name = `CastleSiegeHuntingZoneEntranceSetting`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `A guild member of the castle owners wants to enter the hunting zone (e.g. Land of Trials).`;
  static readonly CausedReaction = `The server changes the entrance setting of the hunting zone.`;
  static readonly Length = 5;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xB2;
  static readonly SubCode = 0x1F;

  static getRequiredSize(dataSize:number){
    return CastleSiegeHuntingZoneEntranceSettingPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, CastleSiegeHuntingZoneEntranceSettingPacket.HeaderCode);
    b.setUint8(CastleSiegeHuntingZoneEntranceSettingPacket.DataOffset, CastleSiegeHuntingZoneEntranceSettingPacket.Code);
  b.setUint8(CastleSiegeHuntingZoneEntranceSettingPacket.DataOffset + 1, CastleSiegeHuntingZoneEntranceSettingPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = CastleSiegeHuntingZoneEntranceSettingPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 5): CastleSiegeHuntingZoneEntranceSettingPacket {
    const p = new CastleSiegeHuntingZoneEntranceSettingPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get IsPublic(){
    return GetBoolean(this.buffer.getUint8(4), 0);
  }
  set IsPublic(value: boolean){
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetBoolean(oldByte, value, 0));
  }
}
export class CastleSiegeGateListRequestPacket {
  buffer!: DataView;
  static readonly Name = `CastleSiegeGateListRequest`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `The guild master opened the castle npc and the client needs a list of all gates.`;
  static readonly CausedReaction = `The server returns the list of gates and their status.`;
  static readonly Length = 4;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xB3;
  static readonly SubCode = 0x01;

  static getRequiredSize(dataSize:number){
    return CastleSiegeGateListRequestPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, CastleSiegeGateListRequestPacket.HeaderCode);
    b.setUint8(CastleSiegeGateListRequestPacket.DataOffset, CastleSiegeGateListRequestPacket.Code);
  b.setUint8(CastleSiegeGateListRequestPacket.DataOffset + 1, CastleSiegeGateListRequestPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = CastleSiegeGateListRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 4): CastleSiegeGateListRequestPacket {
    const p = new CastleSiegeGateListRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
}
export class CastleSiegeStatueListRequestPacket {
  buffer!: DataView;
  static readonly Name = `CastleSiegeStatueListRequest`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `The guild master opened the castle npc and the client needs a list of all statues.`;
  static readonly CausedReaction = `The server returns the list of statues and their status.`;
  static readonly Length = 4;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xB3;
  static readonly SubCode = 0x02;

  static getRequiredSize(dataSize:number){
    return CastleSiegeStatueListRequestPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, CastleSiegeStatueListRequestPacket.HeaderCode);
    b.setUint8(CastleSiegeStatueListRequestPacket.DataOffset, CastleSiegeStatueListRequestPacket.Code);
  b.setUint8(CastleSiegeStatueListRequestPacket.DataOffset + 1, CastleSiegeStatueListRequestPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = CastleSiegeStatueListRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 4): CastleSiegeStatueListRequestPacket {
    const p = new CastleSiegeStatueListRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
}
export class CastleSiegeRegisteredGuildsListRequestPacket {
  buffer!: DataView;
  static readonly Name = `CastleSiegeRegisteredGuildsListRequest`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `The guild master opened an npc and needs the list of registered guilds for the next siege.`;
  static readonly CausedReaction = `The server returns the list of guilds for the next siege.`;
  static readonly Length = 3;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xB4;

  static getRequiredSize(dataSize:number){
    return CastleSiegeRegisteredGuildsListRequestPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, CastleSiegeRegisteredGuildsListRequestPacket.HeaderCode);
    b.setUint8(CastleSiegeRegisteredGuildsListRequestPacket.DataOffset, CastleSiegeRegisteredGuildsListRequestPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = CastleSiegeRegisteredGuildsListRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 3): CastleSiegeRegisteredGuildsListRequestPacket {
    const p = new CastleSiegeRegisteredGuildsListRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
}
export class CastleOwnerListRequestPacket {
  buffer!: DataView;
  static readonly Name = `CastleOwnerListRequest`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `The guild master opened an npc and needs the list of current guilds which are the castle owners.`;
  static readonly CausedReaction = `The server returns the list of guilds which are the castle owners.`;
  static readonly Length = 3;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xB5;

  static getRequiredSize(dataSize:number){
    return CastleOwnerListRequestPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, CastleOwnerListRequestPacket.HeaderCode);
    b.setUint8(CastleOwnerListRequestPacket.DataOffset, CastleOwnerListRequestPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = CastleOwnerListRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 3): CastleOwnerListRequestPacket {
    const p = new CastleOwnerListRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
}
export class FireCatapultRequestPacket {
  buffer!: DataView;
  static readonly Name = `FireCatapultRequest`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `A player wants to fire a catapult during the castle siege event.`;
  static readonly CausedReaction = `The server fires the catapult.`;
  static readonly Length = 7;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xB7;
  static readonly SubCode = 0x01;

  static getRequiredSize(dataSize:number){
    return FireCatapultRequestPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, FireCatapultRequestPacket.HeaderCode);
    b.setUint8(FireCatapultRequestPacket.DataOffset, FireCatapultRequestPacket.Code);
  b.setUint8(FireCatapultRequestPacket.DataOffset + 1, FireCatapultRequestPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = FireCatapultRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 7): FireCatapultRequestPacket {
    const p = new FireCatapultRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get CatapultId(){
    return this.buffer.getUint16(4, false);
  }
  set CatapultId(value: number){
    this.buffer.setUint16(4, value, false);
  }
  get TargetAreaIndex() {
    return GetByteValue(this.buffer.getUint8(6), 8, 0);
  }
  set TargetAreaIndex(value: number) {
    const oldByte = this.buffer.getUint8(6);
    this.buffer.setUint8(6, SetByteValue(oldByte, value, 8, 0));
  }
}
export class WeaponExplosionRequestPacket {
  buffer!: DataView;
  static readonly Name = `WeaponExplosionRequest`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `After the player fired a catapult and hit another catapult.`;
  static readonly CausedReaction = `The server damages the other catapult.`;
  static readonly Length = 6;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xB7;
  static readonly SubCode = 0x04;

  static getRequiredSize(dataSize:number){
    return WeaponExplosionRequestPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, WeaponExplosionRequestPacket.HeaderCode);
    b.setUint8(WeaponExplosionRequestPacket.DataOffset, WeaponExplosionRequestPacket.Code);
  b.setUint8(WeaponExplosionRequestPacket.DataOffset + 1, WeaponExplosionRequestPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = WeaponExplosionRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 6): WeaponExplosionRequestPacket {
    const p = new WeaponExplosionRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get CatapultId(){
    return this.buffer.getUint16(4, false);
  }
  set CatapultId(value: number){
    this.buffer.setUint16(4, value, false);
  }
}
export class GuildLogoOfCastleOwnerRequestPacket {
  buffer!: DataView;
  static readonly Name = `GuildLogoOfCastleOwnerRequest`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `The client requests the guild logo of the current castle owner guild.`;
  static readonly CausedReaction = `The server returns the guild logo.`;
  static readonly Length = 4;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xB9;
  static readonly SubCode = 0x02;

  static getRequiredSize(dataSize:number){
    return GuildLogoOfCastleOwnerRequestPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, GuildLogoOfCastleOwnerRequestPacket.HeaderCode);
    b.setUint8(GuildLogoOfCastleOwnerRequestPacket.DataOffset, GuildLogoOfCastleOwnerRequestPacket.Code);
  b.setUint8(GuildLogoOfCastleOwnerRequestPacket.DataOffset + 1, GuildLogoOfCastleOwnerRequestPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = GuildLogoOfCastleOwnerRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 4): GuildLogoOfCastleOwnerRequestPacket {
    const p = new GuildLogoOfCastleOwnerRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
}
export class CastleSiegeHuntingZoneEnterRequestPacket {
  buffer!: DataView;
  static readonly Name = `CastleSiegeHuntingZoneEnterRequest`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `A guild member of the castle owners wants to enter the hunting zone (e.g. Land of Trials).`;
  static readonly CausedReaction = `The server takes the entrance money, puts it into the tax wallet and warps the player to the hunting zone.`;
  static readonly Length = 8;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xB9;
  static readonly SubCode = 0x05;

  static getRequiredSize(dataSize:number){
    return CastleSiegeHuntingZoneEnterRequestPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, CastleSiegeHuntingZoneEnterRequestPacket.HeaderCode);
    b.setUint8(CastleSiegeHuntingZoneEnterRequestPacket.DataOffset, CastleSiegeHuntingZoneEnterRequestPacket.Code);
  b.setUint8(CastleSiegeHuntingZoneEnterRequestPacket.DataOffset + 1, CastleSiegeHuntingZoneEnterRequestPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = CastleSiegeHuntingZoneEnterRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 8): CastleSiegeHuntingZoneEnterRequestPacket {
    const p = new CastleSiegeHuntingZoneEnterRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Money(){
    return this.buffer.getUint32(4, true);
  }
  set Money(value: number){
    this.buffer.setUint32(4, value, true);
  }
}
export class CrywolfInfoRequestPacket {
  buffer!: DataView;
  static readonly Name = `CrywolfInfoRequest`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `A player enters the crywolf map.`;
  static readonly CausedReaction = `The server returns data about the state of the crywolf map.`;
  static readonly Length = 4;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xBD;
  static readonly SubCode = 0x00;

  static getRequiredSize(dataSize:number){
    return CrywolfInfoRequestPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, CrywolfInfoRequestPacket.HeaderCode);
    b.setUint8(CrywolfInfoRequestPacket.DataOffset, CrywolfInfoRequestPacket.Code);
  b.setUint8(CrywolfInfoRequestPacket.DataOffset + 1, CrywolfInfoRequestPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = CrywolfInfoRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 4): CrywolfInfoRequestPacket {
    const p = new CrywolfInfoRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
}
export class CrywolfContractRequestPacket {
  buffer!: DataView;
  static readonly Name = `CrywolfContractRequest`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `A player wants to make a contract at the crywolf statue for the crywolf event.`;
  static readonly CausedReaction = `The server tries to enter a contract with the player and the specified statue.`;
  static readonly Length = 6;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xBD;
  static readonly SubCode = 0x03;

  static getRequiredSize(dataSize:number){
    return CrywolfContractRequestPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, CrywolfContractRequestPacket.HeaderCode);
    b.setUint8(CrywolfContractRequestPacket.DataOffset, CrywolfContractRequestPacket.Code);
  b.setUint8(CrywolfContractRequestPacket.DataOffset + 1, CrywolfContractRequestPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = CrywolfContractRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 6): CrywolfContractRequestPacket {
    const p = new CrywolfContractRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get StatueId(){
    return this.buffer.getUint16(4, false);
  }
  set StatueId(value: number){
    this.buffer.setUint16(4, value, false);
  }
}
export class CrywolfChaosRateBenefitRequestPacket {
  buffer!: DataView;
  static readonly Name = `CrywolfChaosRateBenefitRequest`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `A player opens an item crafting dialog, e.g. the chaos machine.`;
  static readonly CausedReaction = `The server returns data about the state of the benefit of the crywolf event. If it was won before, the chaos rate wents up a few percent.`;
  static readonly Length = 4;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xBD;
  static readonly SubCode = 0x09;

  static getRequiredSize(dataSize:number){
    return CrywolfChaosRateBenefitRequestPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, CrywolfChaosRateBenefitRequestPacket.HeaderCode);
    b.setUint8(CrywolfChaosRateBenefitRequestPacket.DataOffset, CrywolfChaosRateBenefitRequestPacket.Code);
  b.setUint8(CrywolfChaosRateBenefitRequestPacket.DataOffset + 1, CrywolfChaosRateBenefitRequestPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = CrywolfChaosRateBenefitRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 4): CrywolfChaosRateBenefitRequestPacket {
    const p = new CrywolfChaosRateBenefitRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
}
export class WhiteAngelItemRequestPacket {
  buffer!: DataView;
  static readonly Name = `WhiteAngelItemRequest`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `?.`;
  static readonly CausedReaction = `?.`;
  static readonly Length = 4;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xD0;
  static readonly SubCode = 0x03;

  static getRequiredSize(dataSize:number){
    return WhiteAngelItemRequestPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, WhiteAngelItemRequestPacket.HeaderCode);
    b.setUint8(WhiteAngelItemRequestPacket.DataOffset, WhiteAngelItemRequestPacket.Code);
  b.setUint8(WhiteAngelItemRequestPacket.DataOffset + 1, WhiteAngelItemRequestPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = WhiteAngelItemRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 4): WhiteAngelItemRequestPacket {
    const p = new WhiteAngelItemRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
}
export class EnterOnWerewolfRequestPacket {
  buffer!: DataView;
  static readonly Name = `EnterOnWerewolfRequest`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `A player is running the quest "Infiltrate The Barracks of Balgass" (nr. 5), talking to the Werewolf npc in Crywolf.`;
  static readonly CausedReaction = `It will warp the player to the map 'Barracks of Balgass' where the required monsters have to be killed to proceed with the quest.`;
  static readonly Length = 4;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xD0;
  static readonly SubCode = 0x07;

  static getRequiredSize(dataSize:number){
    return EnterOnWerewolfRequestPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, EnterOnWerewolfRequestPacket.HeaderCode);
    b.setUint8(EnterOnWerewolfRequestPacket.DataOffset, EnterOnWerewolfRequestPacket.Code);
  b.setUint8(EnterOnWerewolfRequestPacket.DataOffset + 1, EnterOnWerewolfRequestPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = EnterOnWerewolfRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 4): EnterOnWerewolfRequestPacket {
    const p = new EnterOnWerewolfRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
}
export class EnterOnGatekeeperRequestPacket {
  buffer!: DataView;
  static readonly Name = `EnterOnGatekeeperRequest`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `A player is running the quest "Into the 'Darkness' Zone" (nr. 6), talking to the gatekeeper npc in 'Barracks of Balgass'.`;
  static readonly CausedReaction = `It will warp the player to the map 'Balgass Refuge' where the required monsters have to be killed to proceed with the quest.`;
  static readonly Length = 4;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xD0;
  static readonly SubCode = 0x08;

  static getRequiredSize(dataSize:number){
    return EnterOnGatekeeperRequestPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, EnterOnGatekeeperRequestPacket.HeaderCode);
    b.setUint8(EnterOnGatekeeperRequestPacket.DataOffset, EnterOnGatekeeperRequestPacket.Code);
  b.setUint8(EnterOnGatekeeperRequestPacket.DataOffset + 1, EnterOnGatekeeperRequestPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = EnterOnGatekeeperRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 4): EnterOnGatekeeperRequestPacket {
    const p = new EnterOnGatekeeperRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
}
export class LeoHelperItemRequestPacket {
  buffer!: DataView;
  static readonly Name = `LeoHelperItemRequest`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `The player talks to the npc "Leo the Helper" and requests an item.`;
  static readonly CausedReaction = `The item will drop on the ground.`;
  static readonly Length = 4;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xD0;
  static readonly SubCode = 0x09;

  static getRequiredSize(dataSize:number){
    return LeoHelperItemRequestPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, LeoHelperItemRequestPacket.HeaderCode);
    b.setUint8(LeoHelperItemRequestPacket.DataOffset, LeoHelperItemRequestPacket.Code);
  b.setUint8(LeoHelperItemRequestPacket.DataOffset + 1, LeoHelperItemRequestPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = LeoHelperItemRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 4): LeoHelperItemRequestPacket {
    const p = new LeoHelperItemRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
}
export class MoveToDeviasBySnowmanRequestPacket {
  buffer!: DataView;
  static readonly Name = `MoveToDeviasBySnowmanRequest`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `The player talks to the npc "Snowman" in Santa Village and requests to warp back to devias.`;
  static readonly CausedReaction = `The player will be warped back to Devias.`;
  static readonly Length = 4;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xD0;
  static readonly SubCode = 0x0A;

  static getRequiredSize(dataSize:number){
    return MoveToDeviasBySnowmanRequestPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, MoveToDeviasBySnowmanRequestPacket.HeaderCode);
    b.setUint8(MoveToDeviasBySnowmanRequestPacket.DataOffset, MoveToDeviasBySnowmanRequestPacket.Code);
  b.setUint8(MoveToDeviasBySnowmanRequestPacket.DataOffset + 1, MoveToDeviasBySnowmanRequestPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = MoveToDeviasBySnowmanRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 4): MoveToDeviasBySnowmanRequestPacket {
    const p = new MoveToDeviasBySnowmanRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
}
export class SantaClausItemRequestPacket {
  buffer!: DataView;
  static readonly Name = `SantaClausItemRequest`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `The player talks to the npc "Santa Claus" and requests an item.`;
  static readonly CausedReaction = `The item will drop on the ground.`;
  static readonly Length = 4;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xD0;
  static readonly SubCode = 0x10;

  static getRequiredSize(dataSize:number){
    return SantaClausItemRequestPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, SantaClausItemRequestPacket.HeaderCode);
    b.setUint8(SantaClausItemRequestPacket.DataOffset, SantaClausItemRequestPacket.Code);
  b.setUint8(SantaClausItemRequestPacket.DataOffset + 1, SantaClausItemRequestPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = SantaClausItemRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 4): SantaClausItemRequestPacket {
    const p = new SantaClausItemRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
}
export class KanturuInfoRequestPacket {
  buffer!: DataView;
  static readonly Name = `KanturuInfoRequest`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `A player talks with the kanturu entrance npc, and shows the enter dialog.`;
  static readonly CausedReaction = `The server returns data about the state of the kanturu event map.`;
  static readonly Length = 4;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xD1;
  static readonly SubCode = 0x00;

  static getRequiredSize(dataSize:number){
    return KanturuInfoRequestPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, KanturuInfoRequestPacket.HeaderCode);
    b.setUint8(KanturuInfoRequestPacket.DataOffset, KanturuInfoRequestPacket.Code);
  b.setUint8(KanturuInfoRequestPacket.DataOffset + 1, KanturuInfoRequestPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = KanturuInfoRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 4): KanturuInfoRequestPacket {
    const p = new KanturuInfoRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
}
export class KanturuEnterRequestPacket {
  buffer!: DataView;
  static readonly Name = `KanturuEnterRequest`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `A player requests to enter the kanturu event map.`;
  static readonly CausedReaction = `The server checks, if entrance is possible and acts accordingly.`;
  static readonly Length = 4;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xD1;
  static readonly SubCode = 0x01;

  static getRequiredSize(dataSize:number){
    return KanturuEnterRequestPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, KanturuEnterRequestPacket.HeaderCode);
    b.setUint8(KanturuEnterRequestPacket.DataOffset, KanturuEnterRequestPacket.Code);
  b.setUint8(KanturuEnterRequestPacket.DataOffset + 1, KanturuEnterRequestPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = KanturuEnterRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 4): KanturuEnterRequestPacket {
    const p = new KanturuEnterRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
}
export class RaklionStateInfoRequestPacket {
  buffer!: DataView;
  static readonly Name = `RaklionStateInfoRequest`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `?`;
  static readonly CausedReaction = `?`;
  static readonly Length = 4;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xD1;
  static readonly SubCode = 0x10;

  static getRequiredSize(dataSize:number){
    return RaklionStateInfoRequestPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, RaklionStateInfoRequestPacket.HeaderCode);
    b.setUint8(RaklionStateInfoRequestPacket.DataOffset, RaklionStateInfoRequestPacket.Code);
  b.setUint8(RaklionStateInfoRequestPacket.DataOffset + 1, RaklionStateInfoRequestPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = RaklionStateInfoRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 4): RaklionStateInfoRequestPacket {
    const p = new RaklionStateInfoRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
}
export class CashShopPointInfoRequestPacket {
  buffer!: DataView;
  static readonly Name = `CashShopPointInfoRequest`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `The client needs information about how many cash shop points (WCoinC, WCoinP, GoblinPoints) are available to the player.`;
  static readonly CausedReaction = `The server returns the cash shop points information.`;
  static readonly Length = 4;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xD2;
  static readonly SubCode = 0x01;

  static getRequiredSize(dataSize:number){
    return CashShopPointInfoRequestPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, CashShopPointInfoRequestPacket.HeaderCode);
    b.setUint8(CashShopPointInfoRequestPacket.DataOffset, CashShopPointInfoRequestPacket.Code);
  b.setUint8(CashShopPointInfoRequestPacket.DataOffset + 1, CashShopPointInfoRequestPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = CashShopPointInfoRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 4): CashShopPointInfoRequestPacket {
    const p = new CashShopPointInfoRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
}
export class CashShopOpenStatePacket {
  buffer!: DataView;
  static readonly Name = `CashShopOpenState`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `The player opens or closes the cash shop dialog.`;
  static readonly CausedReaction = `In case of opening, the server returns if the cash shop is available. If the player is in the safezone, it's not.`;
  static readonly Length = 5;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xD2;
  static readonly SubCode = 0x02;

  static getRequiredSize(dataSize:number){
    return CashShopOpenStatePacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, CashShopOpenStatePacket.HeaderCode);
    b.setUint8(CashShopOpenStatePacket.DataOffset, CashShopOpenStatePacket.Code);
  b.setUint8(CashShopOpenStatePacket.DataOffset + 1, CashShopOpenStatePacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = CashShopOpenStatePacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 5): CashShopOpenStatePacket {
    const p = new CashShopOpenStatePacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get IsClosed(){
    return GetBoolean(this.buffer.getUint8(4), 0);
  }
  set IsClosed(value: boolean){
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetBoolean(oldByte, value, 0));
  }
}
export class CashShopItemBuyRequestPacket {
  buffer!: DataView;
  static readonly Name = `CashShopItemBuyRequest`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `The player wants to buy an item in the cash shop.`;
  static readonly CausedReaction = `The item is bought and added to the cash shop item storage of the player.`;
  static readonly Length = 23;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xD2;
  static readonly SubCode = 0x03;

  static getRequiredSize(dataSize:number){
    return CashShopItemBuyRequestPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, CashShopItemBuyRequestPacket.HeaderCode);
    b.setUint8(CashShopItemBuyRequestPacket.DataOffset, CashShopItemBuyRequestPacket.Code);
  b.setUint8(CashShopItemBuyRequestPacket.DataOffset + 1, CashShopItemBuyRequestPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = CashShopItemBuyRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 23): CashShopItemBuyRequestPacket {
    const p = new CashShopItemBuyRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get PackageMainIndex(){
    return this.buffer.getUint32(4, true);
  }
  set PackageMainIndex(value: number){
    this.buffer.setUint32(4, value, true);
  }
  get Category(){
    return this.buffer.getUint32(8, true);
  }
  set Category(value: number){
    this.buffer.setUint32(8, value, true);
  }
  get ProductMainIndex(){
    return this.buffer.getUint32(12, true);
  }
  set ProductMainIndex(value: number){
    this.buffer.setUint32(12, value, true);
  }
  get ItemIndex(){
    return this.buffer.getUint16(16, true);
  }
  set ItemIndex(value: number){
    this.buffer.setUint16(16, value, true);
  }
  get CoinIndex(){
    return this.buffer.getUint32(18, true);
  }
  set CoinIndex(value: number){
    this.buffer.setUint32(18, value, true);
  }
  get MileageFlag() {
    return GetByteValue(this.buffer.getUint8(22), 8, 0);
  }
  set MileageFlag(value: number) {
    const oldByte = this.buffer.getUint8(22);
    this.buffer.setUint8(22, SetByteValue(oldByte, value, 8, 0));
  }
}
export class CashShopItemGiftRequestPacket {
  buffer!: DataView;
  static readonly Name = `CashShopItemGiftRequest`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `The player wants to send a gift to another player.`;
  static readonly CausedReaction = `The server buys the item with the credits of the player and sends it as gift to the other player.`;
  static readonly Length = 234;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xD2;
  static readonly SubCode = 0x04;

  static getRequiredSize(dataSize:number){
    return CashShopItemGiftRequestPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, CashShopItemGiftRequestPacket.HeaderCode);
    b.setUint8(CashShopItemGiftRequestPacket.DataOffset, CashShopItemGiftRequestPacket.Code);
  b.setUint8(CashShopItemGiftRequestPacket.DataOffset + 1, CashShopItemGiftRequestPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = CashShopItemGiftRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  private _readString (from :number, to: number): string {
    return readWireString(this.buffer, from, to);
  }

  static createPacket(requiredSize: number = 234): CashShopItemGiftRequestPacket {
    const p = new CashShopItemGiftRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get PackageMainIndex(){
    return this.buffer.getUint32(4, true);
  }
  set PackageMainIndex(value: number){
    this.buffer.setUint32(4, value, true);
  }
  get Category(){
    return this.buffer.getUint32(8, true);
  }
  set Category(value: number){
    this.buffer.setUint32(8, value, true);
  }
  get ProductMainIndex(){
    return this.buffer.getUint32(12, true);
  }
  set ProductMainIndex(value: number){
    this.buffer.setUint32(12, value, true);
  }
  get ItemIndex(){
    return this.buffer.getUint16(16, true);
  }
  set ItemIndex(value: number){
    this.buffer.setUint16(16, value, true);
  }
  get CoinIndex(){
    return this.buffer.getUint32(18, true);
  }
  set CoinIndex(value: number){
    this.buffer.setUint32(18, value, true);
  }
  get MileageFlag() {
    return GetByteValue(this.buffer.getUint8(22), 8, 0);
  }
  set MileageFlag(value: number) {
    const oldByte = this.buffer.getUint8(22);
    this.buffer.setUint8(22, SetByteValue(oldByte, value, 8, 0));
  }
  get GiftReceiverName(){
    const to = 34;
              
    return this._readString(23, to);
  }
  setGiftReceiverName(str: string, count = 11){
    const from = 23;
    for(let i = 0; i < str.length; i++){
      const char = str.charCodeAt(i);
      this.buffer.setUint8(from + i, char);
    }
}
  get GiftText(){
    const to = 234;
              
    return this._readString(34, to);
  }
  setGiftText(str: string, count = 200){
    const from = 34;
    for(let i = 0; i < str.length; i++){
      const char = str.charCodeAt(i);
      this.buffer.setUint8(from + i, char);
    }
}
}
export class CashShopStorageListRequestPacket {
  buffer!: DataView;
  static readonly Name = `CashShopStorageListRequest`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `The player opened the cash shop dialog or used paging of the storage.`;
  static readonly CausedReaction = `In case of opening, the server returns if the cash shop is available. If the player is in the safezone, it's not.`;
  static readonly Length = 10;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xD2;
  static readonly SubCode = 0x05;

  static getRequiredSize(dataSize:number){
    return CashShopStorageListRequestPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, CashShopStorageListRequestPacket.HeaderCode);
    b.setUint8(CashShopStorageListRequestPacket.DataOffset, CashShopStorageListRequestPacket.Code);
  b.setUint8(CashShopStorageListRequestPacket.DataOffset + 1, CashShopStorageListRequestPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = CashShopStorageListRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 10): CashShopStorageListRequestPacket {
    const p = new CashShopStorageListRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get PageIndex(){
    return this.buffer.getUint32(4, true);
  }
  set PageIndex(value: number){
    this.buffer.setUint32(4, value, true);
  }
  get InventoryType() {
    return GetByteValue(this.buffer.getUint8(8), 8, 0);
  }
  set InventoryType(value: number) {
    const oldByte = this.buffer.getUint8(8);
    this.buffer.setUint8(8, SetByteValue(oldByte, value, 8, 0));
  }
}
export class CashShopDeleteStorageItemRequestPacket {
  buffer!: DataView;
  static readonly Name = `CashShopDeleteStorageItemRequest`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `The player wants to delete an item of the cash shop storage.`;
  static readonly CausedReaction = `The server removes the item from cash shop storage.`;
  static readonly Length = 234;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xD2;
  static readonly SubCode = 0x0A;

  static getRequiredSize(dataSize:number){
    return CashShopDeleteStorageItemRequestPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, CashShopDeleteStorageItemRequestPacket.HeaderCode);
    b.setUint8(CashShopDeleteStorageItemRequestPacket.DataOffset, CashShopDeleteStorageItemRequestPacket.Code);
  b.setUint8(CashShopDeleteStorageItemRequestPacket.DataOffset + 1, CashShopDeleteStorageItemRequestPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = CashShopDeleteStorageItemRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 234): CashShopDeleteStorageItemRequestPacket {
    const p = new CashShopDeleteStorageItemRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get BaseItemCode(){
    return this.buffer.getUint32(4, true);
  }
  set BaseItemCode(value: number){
    this.buffer.setUint32(4, value, true);
  }
  get MainItemCode(){
    return this.buffer.getUint32(8, true);
  }
  set MainItemCode(value: number){
    this.buffer.setUint32(8, value, true);
  }
  get ProductType() {
    return GetByteValue(this.buffer.getUint8(12), 8, 0);
  }
  set ProductType(value: number) {
    const oldByte = this.buffer.getUint8(12);
    this.buffer.setUint8(12, SetByteValue(oldByte, value, 8, 0));
  }
}
export class CashShopStorageItemConsumeRequestPacket {
  buffer!: DataView;
  static readonly Name = `CashShopStorageItemConsumeRequest`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `The player wants to get or consume an item which is in the cash shop storage.`;
  static readonly CausedReaction = `The item is applied or added to the inventory.`;
  static readonly Length = 15;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xD2;
  static readonly SubCode = 0x0B;

  static getRequiredSize(dataSize:number){
    return CashShopStorageItemConsumeRequestPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, CashShopStorageItemConsumeRequestPacket.HeaderCode);
    b.setUint8(CashShopStorageItemConsumeRequestPacket.DataOffset, CashShopStorageItemConsumeRequestPacket.Code);
  b.setUint8(CashShopStorageItemConsumeRequestPacket.DataOffset + 1, CashShopStorageItemConsumeRequestPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = CashShopStorageItemConsumeRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 15): CashShopStorageItemConsumeRequestPacket {
    const p = new CashShopStorageItemConsumeRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get BaseItemCode(){
    return this.buffer.getUint32(4, true);
  }
  set BaseItemCode(value: number){
    this.buffer.setUint32(4, value, true);
  }
  get MainItemCode(){
    return this.buffer.getUint32(8, true);
  }
  set MainItemCode(value: number){
    this.buffer.setUint32(8, value, true);
  }
  get ItemIndex(){
    return this.buffer.getUint16(12, true);
  }
  set ItemIndex(value: number){
    this.buffer.setUint16(12, value, true);
  }
  get ProductType() {
    return GetByteValue(this.buffer.getUint8(14), 8, 0);
  }
  set ProductType(value: number) {
    const oldByte = this.buffer.getUint8(14);
    this.buffer.setUint8(14, SetByteValue(oldByte, value, 8, 0));
  }
}
export class CashShopEventItemListRequestPacket {
  buffer!: DataView;
  static readonly Name = `CashShopEventItemListRequest`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `When the player wants to see through the event item list.`;
  static readonly CausedReaction = `The server sends a list with event items back.`;
  static readonly Length = 8;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xD2;
  static readonly SubCode = 0x13;

  static getRequiredSize(dataSize:number){
    return CashShopEventItemListRequestPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, CashShopEventItemListRequestPacket.HeaderCode);
    b.setUint8(CashShopEventItemListRequestPacket.DataOffset, CashShopEventItemListRequestPacket.Code);
  b.setUint8(CashShopEventItemListRequestPacket.DataOffset + 1, CashShopEventItemListRequestPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = CashShopEventItemListRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 8): CashShopEventItemListRequestPacket {
    const p = new CashShopEventItemListRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get CategoryIndex(){
    return this.buffer.getUint32(4, true);
  }
  set CategoryIndex(value: number){
    this.buffer.setUint32(4, value, true);
  }
}
export class UnlockVaultPacket {
  buffer!: DataView;
  static readonly Name = `UnlockVault`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `The player wants to unlock the protected vault with a pin.`;
  static readonly CausedReaction = `The vault lock state on the server is updated. VaultProtectionInformation is sent as response.`;
  static readonly Length = 7;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x83;
  static readonly SubCode = 0x00;

  static getRequiredSize(dataSize:number){
    return UnlockVaultPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, UnlockVaultPacket.HeaderCode);
    b.setUint8(UnlockVaultPacket.DataOffset, UnlockVaultPacket.Code);
  b.setUint8(UnlockVaultPacket.DataOffset + 1, UnlockVaultPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = UnlockVaultPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 7): UnlockVaultPacket {
    const p = new UnlockVaultPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Pin(){
    return this.buffer.getUint16(4, true);
  }
  set Pin(value: number){
    this.buffer.setUint16(4, value, true);
  }
}
export class SetVaultPinPacket {
  buffer!: DataView;
  static readonly Name = `SetVaultPin`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `The player wants to set a new pin for the vault when it's in unlocked state.`;
  static readonly CausedReaction = `The vault pin is set. VaultProtectionInformation is sent as response.`;
  static readonly Length = 27;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x83;
  static readonly SubCode = 0x01;

  static getRequiredSize(dataSize:number){
    return SetVaultPinPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, SetVaultPinPacket.HeaderCode);
    b.setUint8(SetVaultPinPacket.DataOffset, SetVaultPinPacket.Code);
  b.setUint8(SetVaultPinPacket.DataOffset + 1, SetVaultPinPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = SetVaultPinPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  private _readString (from :number, to: number): string {
    return readWireString(this.buffer, from, to);
  }

  static createPacket(requiredSize: number = 27): SetVaultPinPacket {
    const p = new SetVaultPinPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Pin(){
    return this.buffer.getUint16(4, true);
  }
  set Pin(value: number){
    this.buffer.setUint16(4, value, true);
  }
  get Password(){
    const to = 26;
              
    return this._readString(6, to);
  }
  setPassword(str: string, count = 20){
    const from = 6;
    for(let i = 0; i < str.length; i++){
      const char = str.charCodeAt(i);
      this.buffer.setUint8(from + i, char);
    }
}
}
export class RemoveVaultPinPacket {
  buffer!: DataView;
  static readonly Name = `RemoveVaultPin`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `The player wants to remove the pin for the vault when it's in unlocked state.`;
  static readonly CausedReaction = `The vault pin is removed. VaultProtectionInformation is sent as response.`;
  static readonly Length = 27;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x83;
  static readonly SubCode = 0x02;

  static getRequiredSize(dataSize:number){
    return RemoveVaultPinPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, RemoveVaultPinPacket.HeaderCode);
    b.setUint8(RemoveVaultPinPacket.DataOffset, RemoveVaultPinPacket.Code);
  b.setUint8(RemoveVaultPinPacket.DataOffset + 1, RemoveVaultPinPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = RemoveVaultPinPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  private _readString (from :number, to: number): string {
    return readWireString(this.buffer, from, to);
  }

  static createPacket(requiredSize: number = 27): RemoveVaultPinPacket {
    const p = new RemoveVaultPinPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Password(){
    const to = 26;
              
    return this._readString(6, to);
  }
  setPassword(str: string, count = 20){
    const from = 6;
    for(let i = 0; i < str.length; i++){
      const char = str.charCodeAt(i);
      this.buffer.setUint8(from + i, char);
    }
}
}
export class VaultClosedPacket {
  buffer!: DataView;
  static readonly Name = `VaultClosed`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `The player closed an opened vault dialog.`;
  static readonly CausedReaction = `The state on the server is updated.`;
  static readonly Length = 3;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x82;

  static getRequiredSize(dataSize:number){
    return VaultClosedPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, VaultClosedPacket.HeaderCode);
    b.setUint8(VaultClosedPacket.DataOffset, VaultClosedPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = VaultClosedPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 3): VaultClosedPacket {
    const p = new VaultClosedPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
}
export enum VaultMoveMoneyRequestVaultMoneyMoveDirectionEnum {
    InventoryToVault = 0,
VaultToInventory = 1
  }export class VaultMoveMoneyRequestPacket {
  buffer!: DataView;
  static readonly Name = `VaultMoveMoneyRequest`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `The player wants to move money from or to the vault storage.`;
  static readonly CausedReaction = `The money is moved, if possible.`;
  static readonly Length = 8;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x81;

  static getRequiredSize(dataSize:number){
    return VaultMoveMoneyRequestPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, VaultMoveMoneyRequestPacket.HeaderCode);
    b.setUint8(VaultMoveMoneyRequestPacket.DataOffset, VaultMoveMoneyRequestPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = VaultMoveMoneyRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 8): VaultMoveMoneyRequestPacket {
    const p = new VaultMoveMoneyRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Direction():VaultMoveMoneyRequestVaultMoneyMoveDirectionEnum{
    return GetByteValue(this.buffer.getUint8(3), 8, 0);
  }
  set Direction(value: VaultMoveMoneyRequestVaultMoneyMoveDirectionEnum){
    const oldValue = this.Direction;
    this.buffer.setUint8(3, SetByteValue(oldValue, value, 8, 0));
  }
  get Amount(){
    return this.buffer.getUint32(4, true);
  }
  set Amount(value: number){
    this.buffer.setUint32(4, value, true);
  }
}
export enum LahapJewelMixRequestMixTypeEnum {
    Mix = 0,
Unmix = 1
  }export enum LahapJewelMixRequestStackSizeEnum {
    Ten = 0,
Twenty = 1,
Thirty = 2
  }export enum LahapJewelMixRequestItemTypeEnum {
    JewelOfBless = 0,
JewelOfSoul = 1,
JewelOfLife = 2,
JewelOfCreation = 3,
JewelOfGuardian = 4,
Gemstone = 5,
JewelOfHarmony = 6,
JewelOfChaos = 7,
LowerRefineStone = 8,
HigherRefineStone = 9
  }export class LahapJewelMixRequestPacket {
  buffer!: DataView;
  static readonly Name = `LahapJewelMixRequest`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `When a player has the Lahap npc dialog open and wants to combine or disband jewel stacks.`;
  static readonly CausedReaction = `If successful, the inventory is updated and the game client gets corresponding responses.`;
  static readonly Length = 7;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xBC;

  static getRequiredSize(dataSize:number){
    return LahapJewelMixRequestPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, LahapJewelMixRequestPacket.HeaderCode);
    b.setUint8(LahapJewelMixRequestPacket.DataOffset, LahapJewelMixRequestPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = LahapJewelMixRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 7): LahapJewelMixRequestPacket {
    const p = new LahapJewelMixRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Operation():LahapJewelMixRequestMixTypeEnum{
    return GetByteValue(this.buffer.getUint8(3), 8, 0);
  }
  set Operation(value: LahapJewelMixRequestMixTypeEnum){
    const oldValue = this.Operation;
    this.buffer.setUint8(3, SetByteValue(oldValue, value, 8, 0));
  }
  get Item():LahapJewelMixRequestItemTypeEnum{
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set Item(value: LahapJewelMixRequestItemTypeEnum){
    const oldValue = this.Item;
    this.buffer.setUint8(4, SetByteValue(oldValue, value, 8, 0));
  }
  get MixingStackSize():LahapJewelMixRequestStackSizeEnum{
    return GetByteValue(this.buffer.getUint8(5), 8, 0);
  }
  set MixingStackSize(value: LahapJewelMixRequestStackSizeEnum){
    const oldValue = this.MixingStackSize;
    this.buffer.setUint8(5, SetByteValue(oldValue, value, 8, 0));
  }
  get UnmixingSourceSlot() {
    return GetByteValue(this.buffer.getUint8(6), 8, 0);
  }
  set UnmixingSourceSlot(value: number) {
    const oldByte = this.buffer.getUint8(6);
    this.buffer.setUint8(6, SetByteValue(oldByte, value, 8, 0));
  }
}
export class PartyListRequestPacket {
  buffer!: DataView;
  static readonly Name = `PartyListRequest`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `When the player opens the party menu in the game client.`;
  static readonly CausedReaction = `If the player is in a party, the server sends back a list with information about all players of the party.`;
  static readonly Length = 3;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x42;

  static getRequiredSize(dataSize:number){
    return PartyListRequestPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, PartyListRequestPacket.HeaderCode);
    b.setUint8(PartyListRequestPacket.DataOffset, PartyListRequestPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = PartyListRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 3): PartyListRequestPacket {
    const p = new PartyListRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
}
export class PartyPlayerKickRequestPacket {
  buffer!: DataView;
  static readonly Name = `PartyPlayerKickRequest`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `A party master wants to kick another player from his party, or when a player wants to kick himself from his party.`;
  static readonly CausedReaction = `If the sending player is the party master, or the player wants to kick himself, the target player is removed from the party.`;
  static readonly Length = 4;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x43;

  static getRequiredSize(dataSize:number){
    return PartyPlayerKickRequestPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, PartyPlayerKickRequestPacket.HeaderCode);
    b.setUint8(PartyPlayerKickRequestPacket.DataOffset, PartyPlayerKickRequestPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = PartyPlayerKickRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 4): PartyPlayerKickRequestPacket {
    const p = new PartyPlayerKickRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get PlayerIndex() {
    return GetByteValue(this.buffer.getUint8(3), 8, 0);
  }
  set PlayerIndex(value: number) {
    const oldByte = this.buffer.getUint8(3);
    this.buffer.setUint8(3, SetByteValue(oldByte, value, 8, 0));
  }
}
export class PartyInviteRequestPacket {
  buffer!: DataView;
  static readonly Name = `PartyInviteRequest`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `A party master wants to invite another player to his party.`;
  static readonly CausedReaction = `If the requesting player has no party, or is the party master, a request is sent to the target player.`;
  static readonly Length = 5;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x40;

  static getRequiredSize(dataSize:number){
    return PartyInviteRequestPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, PartyInviteRequestPacket.HeaderCode);
    b.setUint8(PartyInviteRequestPacket.DataOffset, PartyInviteRequestPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = PartyInviteRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 5): PartyInviteRequestPacket {
    const p = new PartyInviteRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get TargetPlayerId(){
    return this.buffer.getUint16(3, false);
  }
  set TargetPlayerId(value: number){
    this.buffer.setUint16(3, value, false);
  }
}
export class PartyInviteResponsePacket {
  buffer!: DataView;
  static readonly Name = `PartyInviteResponse`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `A player was invited by another player to join a party and this player sent the response back.`;
  static readonly CausedReaction = `If the sender accepts the request, it's added to the party.`;
  static readonly Length = 6;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x41;

  static getRequiredSize(dataSize:number){
    return PartyInviteResponsePacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, PartyInviteResponsePacket.HeaderCode);
    b.setUint8(PartyInviteResponsePacket.DataOffset, PartyInviteResponsePacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = PartyInviteResponsePacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 6): PartyInviteResponsePacket {
    const p = new PartyInviteResponsePacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Accepted(){
    return GetBoolean(this.buffer.getUint8(3), 0);
  }
  set Accepted(value: boolean){
    const oldByte = this.buffer.getUint8(3);
    this.buffer.setUint8(3, SetBoolean(oldByte, value, 0));
  }
  get RequesterId(){
    return this.buffer.getUint16(4, false);
  }
  set RequesterId(value: number){
    this.buffer.setUint16(4, value, false);
  }
}
export class WalkRequestPacket {
  buffer!: DataView;
  static readonly Name = `WalkRequest`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `A player wants to walk on the game map.`;
  static readonly CausedReaction = `The player gets moved on the map, visible for other surrounding players.`;
  static readonly Length = undefined;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xD4;

  static getRequiredSize(dataSize:number){
    return WalkRequestPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, WalkRequestPacket.HeaderCode);
    b.setUint8(WalkRequestPacket.DataOffset, WalkRequestPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = WalkRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number): WalkRequestPacket {
    const p = new WalkRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get SourceX() {
    return GetByteValue(this.buffer.getUint8(3), 8, 0);
  }
  set SourceX(value: number) {
    const oldByte = this.buffer.getUint8(3);
    this.buffer.setUint8(3, SetByteValue(oldByte, value, 8, 0));
  }
  get SourceY() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set SourceY(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }
  get StepCount(){
    return GetByteValue(this.buffer.getUint8(5), 4, 0);
  }
  set StepCount(value: number) {
    const oldByte = this.buffer.getUint8(5);
    this.buffer.setUint8(5, SetByteValue(oldByte, value, 4, 0));
  }
  get TargetRotation(){
    return GetByteValue(this.buffer.getUint8(5), 4, 4);
  }
  set TargetRotation(value: number) {
    const oldByte = this.buffer.getUint8(5);
    this.buffer.setUint8(5, SetByteValue(oldByte, value, 4, 4));
  }
  get Directions(){
    const to = this.buffer.byteLength;
    const i = 6;
              
    return new DataView(this.buffer.buffer.slice(i,to));
  }
  setDirections(data: ArrayLike<number>, count = NaN){
    if (data.length !== count) throw new Error(`data.length must be ${count}`);
    const from = 6;

    for (let i = 0; i < data.length; i++) {
      this.buffer.setUint8(from + i, data[i]);
    }
}
}
export class WalkRequest075Packet {
  buffer!: DataView;
  static readonly Name = `WalkRequest075`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `A player wants to walk on the game map.`;
  static readonly CausedReaction = `The player gets moved on the map, visible for other surrounding players.`;
  static readonly Length = undefined;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x10;

  static getRequiredSize(dataSize:number){
    return WalkRequest075Packet.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, WalkRequest075Packet.HeaderCode);
    b.setUint8(WalkRequest075Packet.DataOffset, WalkRequest075Packet.Code);
  
    return this;
  }

  writeLength(l: number|undefined = WalkRequest075Packet.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number): WalkRequest075Packet {
    const p = new WalkRequest075Packet();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get SourceX() {
    return GetByteValue(this.buffer.getUint8(3), 8, 0);
  }
  set SourceX(value: number) {
    const oldByte = this.buffer.getUint8(3);
    this.buffer.setUint8(3, SetByteValue(oldByte, value, 8, 0));
  }
  get SourceY() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set SourceY(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }
  get StepCount(){
    return GetByteValue(this.buffer.getUint8(5), 4, 0);
  }
  set StepCount(value: number) {
    const oldByte = this.buffer.getUint8(5);
    this.buffer.setUint8(5, SetByteValue(oldByte, value, 4, 0));
  }
  get TargetRotation(){
    return GetByteValue(this.buffer.getUint8(5), 4, 4);
  }
  set TargetRotation(value: number) {
    const oldByte = this.buffer.getUint8(5);
    this.buffer.setUint8(5, SetByteValue(oldByte, value, 4, 4));
  }
  get Directions(){
    const to = this.buffer.byteLength;
    const i = 6;
              
    return new DataView(this.buffer.buffer.slice(i,to));
  }
  setDirections(data: ArrayLike<number>, count = NaN){
    if (data.length !== count) throw new Error(`data.length must be ${count}`);
    const from = 6;

    for (let i = 0; i < data.length; i++) {
      this.buffer.setUint8(from + i, data[i]);
    }
}
}
export class InstantMoveRequestPacket {
  buffer!: DataView;
  static readonly Name = `InstantMoveRequest`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `It's sent when the player performs specific skills.`;
  static readonly CausedReaction = `Usually, the player is moved instantly to the specified coordinates on the current map. In OpenMU, this request is not handled, because it allows hackers to "teleport" to any coordinates.`;
  static readonly Length = 5;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x15;

  static getRequiredSize(dataSize:number){
    return InstantMoveRequestPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, InstantMoveRequestPacket.HeaderCode);
    b.setUint8(InstantMoveRequestPacket.DataOffset, InstantMoveRequestPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = InstantMoveRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 5): InstantMoveRequestPacket {
    const p = new InstantMoveRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get TargetX() {
    return GetByteValue(this.buffer.getUint8(3), 8, 0);
  }
  set TargetX(value: number) {
    const oldByte = this.buffer.getUint8(3);
    this.buffer.setUint8(3, SetByteValue(oldByte, value, 8, 0));
  }
  get TargetY() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set TargetY(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }
}
export class AnimationRequestPacket {
  buffer!: DataView;
  static readonly Name = `AnimationRequest`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `A player does any kind of animation.`;
  static readonly CausedReaction = `The animation number and rotation is forwarded to all surrounding players.`;
  static readonly Length = 5;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x18;

  static getRequiredSize(dataSize:number){
    return AnimationRequestPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, AnimationRequestPacket.HeaderCode);
    b.setUint8(AnimationRequestPacket.DataOffset, AnimationRequestPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = AnimationRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 5): AnimationRequestPacket {
    const p = new AnimationRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Rotation() {
    return GetByteValue(this.buffer.getUint8(3), 8, 0);
  }
  set Rotation(value: number) {
    const oldByte = this.buffer.getUint8(3);
    this.buffer.setUint8(3, SetByteValue(oldByte, value, 8, 0));
  }
  get AnimationNumber() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set AnimationNumber(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }
}
export class RequestCharacterListPacket {
  buffer!: DataView;
  static readonly Name = `RequestCharacterList`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `After a successful login or after the player decided to leave the game world to go back to the character selection screen.`;
  static readonly CausedReaction = `The server sends the character list with all available characters.`;
  static readonly Length = 5;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xF3;
  static readonly SubCode = 0x00;

  static getRequiredSize(dataSize:number){
    return RequestCharacterListPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, RequestCharacterListPacket.HeaderCode);
    b.setUint8(RequestCharacterListPacket.DataOffset, RequestCharacterListPacket.Code);
  b.setUint8(RequestCharacterListPacket.DataOffset + 1, RequestCharacterListPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = RequestCharacterListPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 5): RequestCharacterListPacket {
    const p = new RequestCharacterListPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Language() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set Language(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }
}
export class CreateCharacterPacket {
  buffer!: DataView;
  static readonly Name = `CreateCharacter`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `The game client is at the character selection screen and the player requests to add a new character.`;
  static readonly CausedReaction = `The server checks if the player is allowed to create the character and sends a response back.`;
  static readonly Length = 15;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xF3;
  static readonly SubCode = 0x01;

  static getRequiredSize(dataSize:number){
    return CreateCharacterPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, CreateCharacterPacket.HeaderCode);
    b.setUint8(CreateCharacterPacket.DataOffset, CreateCharacterPacket.Code);
  b.setUint8(CreateCharacterPacket.DataOffset + 1, CreateCharacterPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = CreateCharacterPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  private _readString (from :number, to: number): string {
    return readWireString(this.buffer, from, to);
  }

  static createPacket(requiredSize: number = 15): CreateCharacterPacket {
    const p = new CreateCharacterPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Name(){
    const to = 14;
              
    return this._readString(4, to);
  }
  setName(str: string, count = 10){
    const from = 4;
    for(let i = 0; i < str.length; i++){
      const char = str.charCodeAt(i);
      this.buffer.setUint8(from + i, char);
    }
}
  get Class():CharacterClassNumber{
    return GetByteValue(this.buffer.getUint8(14), 6, 2);
  }
  set Class(value: CharacterClassNumber){
    const oldValue = this.Class;
    this.buffer.setUint8(14, SetByteValue(oldValue, value, 6, 2));
  }
}
export class DeleteCharacterPacket {
  buffer!: DataView;
  static readonly Name = `DeleteCharacter`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `The game client is at the character selection screen and the player requests to delete an existing character.`;
  static readonly CausedReaction = `The server checks if the player transmitted the correct security code and if the character actually exists. If all is valid, it deletes the character from the account. It then sends a response with a result code back to the game client.`;
  static readonly Length = 24;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xF3;
  static readonly SubCode = 0x02;

  static getRequiredSize(dataSize:number){
    return DeleteCharacterPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, DeleteCharacterPacket.HeaderCode);
    b.setUint8(DeleteCharacterPacket.DataOffset, DeleteCharacterPacket.Code);
  b.setUint8(DeleteCharacterPacket.DataOffset + 1, DeleteCharacterPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = DeleteCharacterPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  private _readString (from :number, to: number): string {
    return readWireString(this.buffer, from, to);
  }

  static createPacket(requiredSize: number = 24): DeleteCharacterPacket {
    const p = new DeleteCharacterPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Name(){
    const to = 14;
              
    return this._readString(4, to);
  }
  setName(str: string, count = 10){
    const from = 4;
    for(let i = 0; i < str.length; i++){
      const char = str.charCodeAt(i);
      this.buffer.setUint8(from + i, char);
    }
}
  get SecurityCode(){
    const to = this.buffer.byteLength;
              
    return this._readString(14, to);
  }
  setSecurityCode(str: string, count = NaN){
    const from = 14;
    for(let i = 0; i < str.length; i++){
      const char = str.charCodeAt(i);
      this.buffer.setUint8(from + i, char);
    }
}
}
export class SelectCharacterPacket {
  buffer!: DataView;
  static readonly Name = `SelectCharacter`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `The player selects a character to enter the game world on the character selection screen.`;
  static readonly CausedReaction = `The player joins the game world with the specified character.`;
  static readonly Length = 14;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xF3;
  static readonly SubCode = 0x03;

  static getRequiredSize(dataSize:number){
    return SelectCharacterPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, SelectCharacterPacket.HeaderCode);
    b.setUint8(SelectCharacterPacket.DataOffset, SelectCharacterPacket.Code);
  b.setUint8(SelectCharacterPacket.DataOffset + 1, SelectCharacterPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = SelectCharacterPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  private _readString (from :number, to: number): string {
    return readWireString(this.buffer, from, to);
  }

  static createPacket(requiredSize: number = 14): SelectCharacterPacket {
    const p = new SelectCharacterPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Name(){
    const to = 14;
              
    return this._readString(4, to);
  }
  setName(str: string, count = 10){
    const from = 4;
    for(let i = 0; i < str.length; i++){
      const char = str.charCodeAt(i);
      this.buffer.setUint8(from + i, char);
    }
}
}
export class FocusCharacterPacket {
  buffer!: DataView;
  static readonly Name = `FocusCharacter`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `The player focuses (clicks on it) a character with which he plans to enter the game world on the character selection screen.`;
  static readonly CausedReaction = `The server checks if this character exists and sends a response back. If successful, the game client highlights the focused character.`;
  static readonly Length = 14;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xF3;
  static readonly SubCode = 0x15;

  static getRequiredSize(dataSize:number){
    return FocusCharacterPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, FocusCharacterPacket.HeaderCode);
    b.setUint8(FocusCharacterPacket.DataOffset, FocusCharacterPacket.Code);
  b.setUint8(FocusCharacterPacket.DataOffset + 1, FocusCharacterPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = FocusCharacterPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  private _readString (from :number, to: number): string {
    return readWireString(this.buffer, from, to);
  }

  static createPacket(requiredSize: number = 14): FocusCharacterPacket {
    const p = new FocusCharacterPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Name(){
    const to = 14;
              
    return this._readString(4, to);
  }
  setName(str: string, count = 10){
    const from = 4;
    for(let i = 0; i < str.length; i++){
      const char = str.charCodeAt(i);
      this.buffer.setUint8(from + i, char);
    }
}
}
export class IncreaseCharacterStatPointPacket {
  buffer!: DataView;
  static readonly Name = `IncreaseCharacterStatPoint`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `The player decides to add a stat point to a specific stat type, by pressing a plus-button in the character info menu.`;
  static readonly CausedReaction = `The server checks if a level-up-point is available. If yes, it adds the point to the specified stat type. It sends a response back to the client.`;
  static readonly Length = 5;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xF3;
  static readonly SubCode = 0x06;

  static getRequiredSize(dataSize:number){
    return IncreaseCharacterStatPointPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, IncreaseCharacterStatPointPacket.HeaderCode);
    b.setUint8(IncreaseCharacterStatPointPacket.DataOffset, IncreaseCharacterStatPointPacket.Code);
  b.setUint8(IncreaseCharacterStatPointPacket.DataOffset + 1, IncreaseCharacterStatPointPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = IncreaseCharacterStatPointPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 5): IncreaseCharacterStatPointPacket {
    const p = new IncreaseCharacterStatPointPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get StatType():Byte{
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set StatType(value: Byte){
    const oldValue = this.StatType;
    this.buffer.setUint8(4, SetByteValue(oldValue, value, 8, 0));
  }
}
export class InventoryRequestPacket {
  buffer!: DataView;
  static readonly Name = `InventoryRequest`;
  static readonly HeaderType = `C3HeaderWithSubCode`;
  static readonly HeaderCode = 0xC3;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `The player bought or sold an item through his personal shop.`;
  static readonly CausedReaction = `The server sends the inventory list back to the client.`;
  static readonly Length = 4;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xF3;
  static readonly SubCode = 0x10;

  static getRequiredSize(dataSize:number){
    return InventoryRequestPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, InventoryRequestPacket.HeaderCode);
    b.setUint8(InventoryRequestPacket.DataOffset, InventoryRequestPacket.Code);
  b.setUint8(InventoryRequestPacket.DataOffset + 1, InventoryRequestPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = InventoryRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 4): InventoryRequestPacket {
    const p = new InventoryRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
}
export class ClientReadyAfterMapChangePacket {
  buffer!: DataView;
  static readonly Name = `ClientReadyAfterMapChange`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `After the server sent a map change message and the client has initialized the game map visualization.`;
  static readonly CausedReaction = `The character is added to the internal game map and ready to interact with other entities.`;
  static readonly Length = 4;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xF3;
  static readonly SubCode = 0x12;

  static getRequiredSize(dataSize:number){
    return ClientReadyAfterMapChangePacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, ClientReadyAfterMapChangePacket.HeaderCode);
    b.setUint8(ClientReadyAfterMapChangePacket.DataOffset, ClientReadyAfterMapChangePacket.Code);
  b.setUint8(ClientReadyAfterMapChangePacket.DataOffset + 1, ClientReadyAfterMapChangePacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = ClientReadyAfterMapChangePacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 4): ClientReadyAfterMapChangePacket {
    const p = new ClientReadyAfterMapChangePacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
}
export class SaveKeyConfigurationPacket {
  buffer!: DataView;
  static readonly Name = `SaveKeyConfiguration`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `When leaving the game world with a character.`;
  static readonly CausedReaction = `The server saves this configuration in its database.`;
  static readonly Length = undefined;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xF3;
  static readonly SubCode = 0x30;

  static getRequiredSize(dataSize:number){
    return SaveKeyConfigurationPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, SaveKeyConfigurationPacket.HeaderCode);
    b.setUint8(SaveKeyConfigurationPacket.DataOffset, SaveKeyConfigurationPacket.Code);
  b.setUint8(SaveKeyConfigurationPacket.DataOffset + 1, SaveKeyConfigurationPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = SaveKeyConfigurationPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number): SaveKeyConfigurationPacket {
    const p = new SaveKeyConfigurationPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Configuration(){
    const to = this.buffer.byteLength;
    const i = 4;
              
    return new DataView(this.buffer.buffer.slice(i,to));
  }
  setConfiguration(data: ArrayLike<number>, count = NaN){
    if (data.length !== count) throw new Error(`data.length must be ${count}`);
    const from = 4;

    for (let i = 0; i < data.length; i++) {
      this.buffer.setUint8(from + i, data[i]);
    }
}
}
export class AddMasterSkillPointPacket {
  buffer!: DataView;
  static readonly Name = `AddMasterSkillPoint`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `The player wants to add or increase the level of a specific master skill of the master skill tree.`;
  static readonly CausedReaction = `Adds or increases the master skill level of the specified skill, if the character is allowed to do that. A response is sent back to the client.`;
  static readonly Length = 6;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xF3;
  static readonly SubCode = 0x52;

  static getRequiredSize(dataSize:number){
    return AddMasterSkillPointPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, AddMasterSkillPointPacket.HeaderCode);
    b.setUint8(AddMasterSkillPointPacket.DataOffset, AddMasterSkillPointPacket.Code);
  b.setUint8(AddMasterSkillPointPacket.DataOffset + 1, AddMasterSkillPointPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = AddMasterSkillPointPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 6): AddMasterSkillPointPacket {
    const p = new AddMasterSkillPointPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get SkillId(){
    return this.buffer.getUint16(4, true);
  }
  set SkillId(value: number){
    this.buffer.setUint16(4, value, true);
  }
}
export class HitRequestPacket {
  buffer!: DataView;
  static readonly Name = `HitRequest`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `A player attacks a target without using a skill.`;
  static readonly CausedReaction = `Damage is calculated and the target is hit, if the attack was successful. A response is sent back with the caused damage, and all surrounding players get an animation message.`;
  static readonly Length = 7;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x11;

  static getRequiredSize(dataSize:number){
    return HitRequestPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, HitRequestPacket.HeaderCode);
    b.setUint8(HitRequestPacket.DataOffset, HitRequestPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = HitRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 7): HitRequestPacket {
    const p = new HitRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get TargetId(){
    return this.buffer.getUint16(3, false);
  }
  set TargetId(value: number){
    this.buffer.setUint16(3, value, false);
  }
  get AttackAnimation() {
    return GetByteValue(this.buffer.getUint8(5), 8, 0);
  }
  set AttackAnimation(value: number) {
    const oldByte = this.buffer.getUint8(5);
    this.buffer.setUint8(5, SetByteValue(oldByte, value, 8, 0));
  }
  get LookingDirection() {
    return GetByteValue(this.buffer.getUint8(6), 8, 0);
  }
  set LookingDirection(value: number) {
    const oldByte = this.buffer.getUint8(6);
    this.buffer.setUint8(6, SetByteValue(oldByte, value, 8, 0));
  }
}
export class TargetedSkillPacket {
  buffer!: DataView;
  static readonly Name = `TargetedSkill`;
  static readonly HeaderType = `C3Header`;
  static readonly HeaderCode = 0xC3;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `A player performs a skill with a target, e.g. attacking or buffing.`;
  static readonly CausedReaction = `Damage is calculated and the target is hit, if the attack was successful. A response is sent back with the caused damage, and all surrounding players get an animation message.`;
  static readonly Length = 7;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x19;

  static getRequiredSize(dataSize:number){
    return TargetedSkillPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, TargetedSkillPacket.HeaderCode);
    b.setUint8(TargetedSkillPacket.DataOffset, TargetedSkillPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = TargetedSkillPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 7): TargetedSkillPacket {
    const p = new TargetedSkillPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get SkillId(){
    return this.buffer.getUint16(3, false);
  }
  set SkillId(value: number){
    this.buffer.setUint16(3, value, false);
  }
  get TargetId(){
    return this.buffer.getUint16(5, false);
  }
  set TargetId(value: number){
    this.buffer.setUint16(5, value, false);
  }
}
export class TargetedSkill075Packet {
  buffer!: DataView;
  static readonly Name = `TargetedSkill075`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `A player performs a skill with a target, e.g. attacking or buffing.`;
  static readonly CausedReaction = `Damage is calculated and the target is hit, if the attack was successful. A response is sent back with the caused damage, and all surrounding players get an animation message.`;
  static readonly Length = 6;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x19;

  static getRequiredSize(dataSize:number){
    return TargetedSkill075Packet.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, TargetedSkill075Packet.HeaderCode);
    b.setUint8(TargetedSkill075Packet.DataOffset, TargetedSkill075Packet.Code);
  
    return this;
  }

  writeLength(l: number|undefined = TargetedSkill075Packet.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 6): TargetedSkill075Packet {
    const p = new TargetedSkill075Packet();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get SkillIndex() {
    return GetByteValue(this.buffer.getUint8(3), 8, 0);
  }
  set SkillIndex(value: number) {
    const oldByte = this.buffer.getUint8(3);
    this.buffer.setUint8(3, SetByteValue(oldByte, value, 8, 0));
  }
  get TargetId(){
    return this.buffer.getUint16(4, false);
  }
  set TargetId(value: number){
    this.buffer.setUint16(4, value, false);
  }
}
export class TargetedSkill095Packet {
  buffer!: DataView;
  static readonly Name = `TargetedSkill095`;
  static readonly HeaderType = `C3Header`;
  static readonly HeaderCode = 0xC3;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `A player performs a skill with a target, e.g. attacking or buffing.`;
  static readonly CausedReaction = `Damage is calculated and the target is hit, if the attack was successful. A response is sent back with the caused damage, and all surrounding players get an animation message.`;
  static readonly Length = 6;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x19;

  static getRequiredSize(dataSize:number){
    return TargetedSkill095Packet.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, TargetedSkill095Packet.HeaderCode);
    b.setUint8(TargetedSkill095Packet.DataOffset, TargetedSkill095Packet.Code);
  
    return this;
  }

  writeLength(l: number|undefined = TargetedSkill095Packet.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 6): TargetedSkill095Packet {
    const p = new TargetedSkill095Packet();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get SkillIndex() {
    return GetByteValue(this.buffer.getUint8(3), 8, 0);
  }
  set SkillIndex(value: number) {
    const oldByte = this.buffer.getUint8(3);
    this.buffer.setUint8(3, SetByteValue(oldByte, value, 8, 0));
  }
  get TargetId(){
    return this.buffer.getUint16(4, false);
  }
  set TargetId(value: number){
    this.buffer.setUint16(4, value, false);
  }
}
export class MagicEffectCancelRequestPacket {
  buffer!: DataView;
  static readonly Name = `MagicEffectCancelRequest`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `A player cancels a specific magic effect of a skill, usually 'Infinity Arrow' and 'Wizardry Enhance'.`;
  static readonly CausedReaction = `The effect is cancelled and an update is sent to the player and all surrounding players.`;
  static readonly Length = 7;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x1B;

  static getRequiredSize(dataSize:number){
    return MagicEffectCancelRequestPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, MagicEffectCancelRequestPacket.HeaderCode);
    b.setUint8(MagicEffectCancelRequestPacket.DataOffset, MagicEffectCancelRequestPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = MagicEffectCancelRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 7): MagicEffectCancelRequestPacket {
    const p = new MagicEffectCancelRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get SkillId(){
    return this.buffer.getUint16(3, false);
  }
  set SkillId(value: number){
    this.buffer.setUint16(3, value, false);
  }
  get PlayerId(){
    return this.buffer.getUint16(5, false);
  }
  set PlayerId(value: number){
    this.buffer.setUint16(5, value, false);
  }
}
export class AreaSkillPacket {
  buffer!: DataView;
  static readonly Name = `AreaSkill`;
  static readonly HeaderType = `C3Header`;
  static readonly HeaderCode = 0xC3;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `A player is performing an skill which affects an area of the map.`;
  static readonly CausedReaction = `It's forwarded to all surrounding players, so that the animation is visible. In the original server implementation, no damage is done yet for attack skills - there are separate hit packets.`;
  static readonly Length = 13;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x1E;

  static getRequiredSize(dataSize:number){
    return AreaSkillPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, AreaSkillPacket.HeaderCode);
    b.setUint8(AreaSkillPacket.DataOffset, AreaSkillPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = AreaSkillPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 13): AreaSkillPacket {
    const p = new AreaSkillPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get SkillId(){
    return this.buffer.getUint16(3, false);
  }
  set SkillId(value: number){
    this.buffer.setUint16(3, value, false);
  }
  get TargetX() {
    return GetByteValue(this.buffer.getUint8(5), 8, 0);
  }
  set TargetX(value: number) {
    const oldByte = this.buffer.getUint8(5);
    this.buffer.setUint8(5, SetByteValue(oldByte, value, 8, 0));
  }
  get TargetY() {
    return GetByteValue(this.buffer.getUint8(6), 8, 0);
  }
  set TargetY(value: number) {
    const oldByte = this.buffer.getUint8(6);
    this.buffer.setUint8(6, SetByteValue(oldByte, value, 8, 0));
  }
  get Rotation() {
    return GetByteValue(this.buffer.getUint8(7), 8, 0);
  }
  set Rotation(value: number) {
    const oldByte = this.buffer.getUint8(7);
    this.buffer.setUint8(7, SetByteValue(oldByte, value, 8, 0));
  }
  get ExtraTargetId(){
    return this.buffer.getUint16(10, false);
  }
  set ExtraTargetId(value: number){
    this.buffer.setUint16(10, value, false);
  }
  get AnimationCounter() {
    return GetByteValue(this.buffer.getUint8(12), 8, 0);
  }
  set AnimationCounter(value: number) {
    const oldByte = this.buffer.getUint8(12);
    this.buffer.setUint8(12, SetByteValue(oldByte, value, 8, 0));
  }
}
export class AreaSkillHitPacket {
  buffer!: DataView;
  static readonly Name = `AreaSkillHit`;
  static readonly HeaderType = `C3Header`;
  static readonly HeaderCode = 0xC3;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `An area skill was performed and the client decided to hit a target.`;
  static readonly CausedReaction = `The server is calculating the damage and applying it to the target. The attacker gets a response back with the caused damage.`;
  static readonly Length = undefined;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xDB;

  static getRequiredSize(dataSize:number){
    return AreaSkillHitPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, AreaSkillHitPacket.HeaderCode);
    b.setUint8(AreaSkillHitPacket.DataOffset, AreaSkillHitPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = AreaSkillHitPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number): AreaSkillHitPacket {
    const p = new AreaSkillHitPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get SkillId(){
    return this.buffer.getUint16(3, false);
  }
  set SkillId(value: number){
    this.buffer.setUint16(3, value, false);
  }
  get TargetX() {
    return GetByteValue(this.buffer.getUint8(5), 8, 0);
  }
  set TargetX(value: number) {
    const oldByte = this.buffer.getUint8(5);
    this.buffer.setUint8(5, SetByteValue(oldByte, value, 8, 0));
  }
  get TargetY() {
    return GetByteValue(this.buffer.getUint8(6), 8, 0);
  }
  set TargetY(value: number) {
    const oldByte = this.buffer.getUint8(6);
    this.buffer.setUint8(6, SetByteValue(oldByte, value, 8, 0));
  }
  get HitCounter() {
    return GetByteValue(this.buffer.getUint8(7), 8, 0);
  }
  set HitCounter(value: number) {
    const oldByte = this.buffer.getUint8(7);
    this.buffer.setUint8(7, SetByteValue(oldByte, value, 8, 0));
  }
  get TargetCount() {
    return GetByteValue(this.buffer.getUint8(8), 8, 0);
  }
  set TargetCount(value: number) {
    const oldByte = this.buffer.getUint8(8);
    this.buffer.setUint8(8, SetByteValue(oldByte, value, 8, 0));
  }

  getTargets(count: number = this.TargetCount): {
  TargetId: ShortBigEndian;
  AnimationCounter: Byte;

}[]{
    const b = this.buffer;
    let bi = 0;

    const Targets_count = count;
    const Targets: any[] = new Array(Targets_count);
    
    let Targets_StartOffset = bi + 9;
    for (let i = 0; i < Targets_count; i++) {
      const TargetId = b.getUint16(Targets_StartOffset + 0, false);
      const AnimationCounter = b.getUint8(Targets_StartOffset + 2);
      Targets[i] = {
        TargetId,
        AnimationCounter
      };
      Targets_StartOffset += 3;
    }
    
    return Targets;
  }}
export class AreaSkill075Packet {
  buffer!: DataView;
  static readonly Name = `AreaSkill075`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `A player is performing an skill which affects an area of the map.`;
  static readonly CausedReaction = `It's forwarded to all surrounding players, so that the animation is visible. In the original server implementation, no damage is done yet for attack skills - there are separate hit packets.`;
  static readonly Length = 7;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x1E;

  static getRequiredSize(dataSize:number){
    return AreaSkill075Packet.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, AreaSkill075Packet.HeaderCode);
    b.setUint8(AreaSkill075Packet.DataOffset, AreaSkill075Packet.Code);
  
    return this;
  }

  writeLength(l: number|undefined = AreaSkill075Packet.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 7): AreaSkill075Packet {
    const p = new AreaSkill075Packet();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get SkillIndex() {
    return GetByteValue(this.buffer.getUint8(3), 8, 0);
  }
  set SkillIndex(value: number) {
    const oldByte = this.buffer.getUint8(3);
    this.buffer.setUint8(3, SetByteValue(oldByte, value, 8, 0));
  }
  get TargetX() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set TargetX(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }
  get TargetY() {
    return GetByteValue(this.buffer.getUint8(5), 8, 0);
  }
  set TargetY(value: number) {
    const oldByte = this.buffer.getUint8(5);
    this.buffer.setUint8(5, SetByteValue(oldByte, value, 8, 0));
  }
  get Rotation() {
    return GetByteValue(this.buffer.getUint8(6), 8, 0);
  }
  set Rotation(value: number) {
    const oldByte = this.buffer.getUint8(6);
    this.buffer.setUint8(6, SetByteValue(oldByte, value, 8, 0));
  }
}
export class AreaSkillHit075Packet {
  buffer!: DataView;
  static readonly Name = `AreaSkillHit075`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `An area skill was performed and the client decided to hit one or more targets.`;
  static readonly CausedReaction = `The server is calculating the damage and applying it to the targets. The attacker gets a response back with the caused damage.`;
  static readonly Length = undefined;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x1D;

  static getRequiredSize(dataSize:number){
    return AreaSkillHit075Packet.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, AreaSkillHit075Packet.HeaderCode);
    b.setUint8(AreaSkillHit075Packet.DataOffset, AreaSkillHit075Packet.Code);
  
    return this;
  }

  writeLength(l: number|undefined = AreaSkillHit075Packet.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number): AreaSkillHit075Packet {
    const p = new AreaSkillHit075Packet();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get SkillIndex() {
    return GetByteValue(this.buffer.getUint8(3), 8, 0);
  }
  set SkillIndex(value: number) {
    const oldByte = this.buffer.getUint8(3);
    this.buffer.setUint8(3, SetByteValue(oldByte, value, 8, 0));
  }
  get TargetX() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set TargetX(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }
  get TargetY() {
    return GetByteValue(this.buffer.getUint8(5), 8, 0);
  }
  set TargetY(value: number) {
    const oldByte = this.buffer.getUint8(5);
    this.buffer.setUint8(5, SetByteValue(oldByte, value, 8, 0));
  }
  get TargetCount() {
    return GetByteValue(this.buffer.getUint8(6), 8, 0);
  }
  set TargetCount(value: number) {
    const oldByte = this.buffer.getUint8(6);
    this.buffer.setUint8(6, SetByteValue(oldByte, value, 8, 0));
  }

  getTargets(count: number = this.TargetCount): {
  TargetId: ShortBigEndian;

}[]{
    const b = this.buffer;
    let bi = 0;

    const Targets_count = count;
    const Targets: any[] = new Array(Targets_count);
    
    let Targets_StartOffset = bi + 7;
    for (let i = 0; i < Targets_count; i++) {
      const TargetId = b.getUint16(Targets_StartOffset + 0, false);
      Targets[i] = {
        TargetId
      };
      Targets_StartOffset += 2;
    }
    
    return Targets;
  }}
export class AreaSkill095Packet {
  buffer!: DataView;
  static readonly Name = `AreaSkill095`;
  static readonly HeaderType = `C3Header`;
  static readonly HeaderCode = 0xC3;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `A player is performing an skill which affects an area of the map.`;
  static readonly CausedReaction = `It's forwarded to all surrounding players, so that the animation is visible. In the original server implementation, no damage is done yet for attack skills - there are separate hit packets.`;
  static readonly Length = 7;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x1E;

  static getRequiredSize(dataSize:number){
    return AreaSkill095Packet.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, AreaSkill095Packet.HeaderCode);
    b.setUint8(AreaSkill095Packet.DataOffset, AreaSkill095Packet.Code);
  
    return this;
  }

  writeLength(l: number|undefined = AreaSkill095Packet.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 7): AreaSkill095Packet {
    const p = new AreaSkill095Packet();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get SkillIndex() {
    return GetByteValue(this.buffer.getUint8(3), 8, 0);
  }
  set SkillIndex(value: number) {
    const oldByte = this.buffer.getUint8(3);
    this.buffer.setUint8(3, SetByteValue(oldByte, value, 8, 0));
  }
  get TargetX() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set TargetX(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }
  get TargetY() {
    return GetByteValue(this.buffer.getUint8(5), 8, 0);
  }
  set TargetY(value: number) {
    const oldByte = this.buffer.getUint8(5);
    this.buffer.setUint8(5, SetByteValue(oldByte, value, 8, 0));
  }
  get Rotation() {
    return GetByteValue(this.buffer.getUint8(6), 8, 0);
  }
  set Rotation(value: number) {
    const oldByte = this.buffer.getUint8(6);
    this.buffer.setUint8(6, SetByteValue(oldByte, value, 8, 0));
  }
}
export class AreaSkillHit095Packet {
  buffer!: DataView;
  static readonly Name = `AreaSkillHit095`;
  static readonly HeaderType = `C3Header`;
  static readonly HeaderCode = 0xC3;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `An area skill was performed and the client decided to hit one or more targets.`;
  static readonly CausedReaction = `The server is calculating the damage and applying it to the targets. The attacker gets a response back with the caused damage.`;
  static readonly Length = undefined;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x1D;

  static getRequiredSize(dataSize:number){
    return AreaSkillHit095Packet.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, AreaSkillHit095Packet.HeaderCode);
    b.setUint8(AreaSkillHit095Packet.DataOffset, AreaSkillHit095Packet.Code);
  
    return this;
  }

  writeLength(l: number|undefined = AreaSkillHit095Packet.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number): AreaSkillHit095Packet {
    const p = new AreaSkillHit095Packet();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get SkillIndex() {
    return GetByteValue(this.buffer.getUint8(3), 8, 0);
  }
  set SkillIndex(value: number) {
    const oldByte = this.buffer.getUint8(3);
    this.buffer.setUint8(3, SetByteValue(oldByte, value, 8, 0));
  }
  get TargetX() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set TargetX(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }
  get TargetY() {
    return GetByteValue(this.buffer.getUint8(5), 8, 0);
  }
  set TargetY(value: number) {
    const oldByte = this.buffer.getUint8(5);
    this.buffer.setUint8(5, SetByteValue(oldByte, value, 8, 0));
  }
  get Counter() {
    return GetByteValue(this.buffer.getUint8(6), 8, 0);
  }
  set Counter(value: number) {
    const oldByte = this.buffer.getUint8(6);
    this.buffer.setUint8(6, SetByteValue(oldByte, value, 8, 0));
  }
  get TargetCount() {
    return GetByteValue(this.buffer.getUint8(7), 8, 0);
  }
  set TargetCount(value: number) {
    const oldByte = this.buffer.getUint8(7);
    this.buffer.setUint8(7, SetByteValue(oldByte, value, 8, 0));
  }

  getTargets(count: number = this.TargetCount): {
  TargetId: ShortBigEndian;

}[]{
    const b = this.buffer;
    let bi = 0;

    const Targets_count = count;
    const Targets: any[] = new Array(Targets_count);
    
    let Targets_StartOffset = bi + 8;
    for (let i = 0; i < Targets_count; i++) {
      const TargetId = b.getUint16(Targets_StartOffset + 0, false);
      Targets[i] = {
        TargetId
      };
      Targets_StartOffset += 2;
    }
    
    return Targets;
  }}
export class RageAttackRequestPacket {
  buffer!: DataView;
  static readonly Name = `RageAttackRequest`;
  static readonly HeaderType = `C3Header`;
  static readonly HeaderCode = 0xC3;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `A player performs a skill with a target, e.g. attacking or buffing.`;
  static readonly CausedReaction = `Damage is calculated and the target is hit, if the attack was successful. A response is sent back with the caused damage, and all surrounding players get an animation message.`;
  static readonly Length = 8;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x4A;

  static getRequiredSize(dataSize:number){
    return RageAttackRequestPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, RageAttackRequestPacket.HeaderCode);
    b.setUint8(RageAttackRequestPacket.DataOffset, RageAttackRequestPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = RageAttackRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 8): RageAttackRequestPacket {
    const p = new RageAttackRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get SkillId(){
    return this.buffer.getUint16(3, false);
  }
  set SkillId(value: number){
    this.buffer.setUint16(3, value, false);
  }
  get TargetId(){
    return this.buffer.getUint16(6, false);
  }
  set TargetId(value: number){
    this.buffer.setUint16(6, value, false);
  }
}
export class RageAttackRangeRequestPacket {
  buffer!: DataView;
  static readonly Name = `RageAttackRangeRequest`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `A player (rage fighter) performs the dark side skill on a target.`;
  static readonly CausedReaction = `The targets (up to 5) are determined and sent back to the player with the RageAttackRangeResponse.`;
  static readonly Length = 7;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x4B;

  static getRequiredSize(dataSize:number){
    return RageAttackRangeRequestPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, RageAttackRangeRequestPacket.HeaderCode);
    b.setUint8(RageAttackRangeRequestPacket.DataOffset, RageAttackRangeRequestPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = RageAttackRangeRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 7): RageAttackRangeRequestPacket {
    const p = new RageAttackRangeRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get SkillId(){
    return this.buffer.getUint16(3, false);
  }
  set SkillId(value: number){
    this.buffer.setUint16(3, value, false);
  }
  get TargetId(){
    return this.buffer.getUint16(5, false);
  }
  set TargetId(value: number){
    this.buffer.setUint16(5, value, false);
  }
}
export class TradeCancelPacket {
  buffer!: DataView;
  static readonly Name = `TradeCancel`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `The player wants to cancel the trade.`;
  static readonly CausedReaction = `The trade is cancelled and the previous inventory state is restored.`;
  static readonly Length = 3;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x3D;

  static getRequiredSize(dataSize:number){
    return TradeCancelPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, TradeCancelPacket.HeaderCode);
    b.setUint8(TradeCancelPacket.DataOffset, TradeCancelPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = TradeCancelPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 3): TradeCancelPacket {
    const p = new TradeCancelPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
}
export class TradeButtonStateChangePacket {
  buffer!: DataView;
  static readonly Name = `TradeButtonStateChange`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `The player presses the trade button.`;
  static readonly CausedReaction = `The state change is forwarded to the trade partner. If both players press the trade button at the same time, the server will try to complete the trade by exchanging the items and money.`;
  static readonly Length = 4;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x3C;

  static getRequiredSize(dataSize:number){
    return TradeButtonStateChangePacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, TradeButtonStateChangePacket.HeaderCode);
    b.setUint8(TradeButtonStateChangePacket.DataOffset, TradeButtonStateChangePacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = TradeButtonStateChangePacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 4): TradeButtonStateChangePacket {
    const p = new TradeButtonStateChangePacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get NewState():TradeButtonStateEnum{
    return GetByteValue(this.buffer.getUint8(3), 8, 0);
  }
  set NewState(value: TradeButtonStateEnum){
    const oldValue = this.NewState;
    this.buffer.setUint8(3, SetByteValue(oldValue, value, 8, 0));
  }
}
export class TradeRequestPacket {
  buffer!: DataView;
  static readonly Name = `TradeRequest`;
  static readonly HeaderType = `C3Header`;
  static readonly HeaderCode = 0xC3;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `The player requests to open a trade with another player.`;
  static readonly CausedReaction = `The request is forwarded to the requested player.`;
  static readonly Length = 5;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x36;

  static getRequiredSize(dataSize:number){
    return TradeRequestPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, TradeRequestPacket.HeaderCode);
    b.setUint8(TradeRequestPacket.DataOffset, TradeRequestPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = TradeRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 5): TradeRequestPacket {
    const p = new TradeRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get PlayerId(){
    return this.buffer.getUint16(3, false);
  }
  set PlayerId(value: number){
    this.buffer.setUint16(3, value, false);
  }
}
export class TradeRequestResponsePacket {
  buffer!: DataView;
  static readonly Name = `TradeRequestResponse`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `A requested player responded to a trade request of another player.`;
  static readonly CausedReaction = `When the trade request was accepted, the server tries to open a new trade and sends corresponding responses to both players.`;
  static readonly Length = 4;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x37;

  static getRequiredSize(dataSize:number){
    return TradeRequestResponsePacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, TradeRequestResponsePacket.HeaderCode);
    b.setUint8(TradeRequestResponsePacket.DataOffset, TradeRequestResponsePacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = TradeRequestResponsePacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 4): TradeRequestResponsePacket {
    const p = new TradeRequestResponsePacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get TradeAccepted(){
    return GetBoolean(this.buffer.getUint8(3), 0);
  }
  set TradeAccepted(value: boolean){
    const oldByte = this.buffer.getUint8(3);
    this.buffer.setUint8(3, SetBoolean(oldByte, value, 0));
  }
}
export class SetTradeMoneyPacket {
  buffer!: DataView;
  static readonly Name = `SetTradeMoney`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `A player requests to set an amount of money in the trade.`;
  static readonly CausedReaction = `It's taken from the available money of the inventory. If the new money amount is lower than the amount which was set before, it's added back to the inventory. The trade partner is informed about any change.`;
  static readonly Length = 8;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x3A;

  static getRequiredSize(dataSize:number){
    return SetTradeMoneyPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, SetTradeMoneyPacket.HeaderCode);
    b.setUint8(SetTradeMoneyPacket.DataOffset, SetTradeMoneyPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = SetTradeMoneyPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 8): SetTradeMoneyPacket {
    const p = new SetTradeMoneyPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Amount(){
    return this.buffer.getUint32(4, true);
  }
  set Amount(value: number){
    this.buffer.setUint32(4, value, true);
  }
}
export class LetterDeleteRequestPacket {
  buffer!: DataView;
  static readonly Name = `LetterDeleteRequest`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `A player requests to delete a letter.`;
  static readonly CausedReaction = `The letter is getting deleted.`;
  static readonly Length = 6;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xC8;

  static getRequiredSize(dataSize:number){
    return LetterDeleteRequestPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, LetterDeleteRequestPacket.HeaderCode);
    b.setUint8(LetterDeleteRequestPacket.DataOffset, LetterDeleteRequestPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = LetterDeleteRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 6): LetterDeleteRequestPacket {
    const p = new LetterDeleteRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get LetterIndex(){
    return this.buffer.getUint16(4, true);
  }
  set LetterIndex(value: number){
    this.buffer.setUint16(4, value, true);
  }
}
export class LetterListRequestPacket {
  buffer!: DataView;
  static readonly Name = `LetterListRequest`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `The game client requests the current list of letters.`;
  static readonly CausedReaction = `The server sends the list of available letters to the client.`;
  static readonly Length = 3;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xC9;

  static getRequiredSize(dataSize:number){
    return LetterListRequestPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, LetterListRequestPacket.HeaderCode);
    b.setUint8(LetterListRequestPacket.DataOffset, LetterListRequestPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = LetterListRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 3): LetterListRequestPacket {
    const p = new LetterListRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
}
export class LetterSendRequestPacket {
  buffer!: DataView;
  static readonly Name = `LetterSendRequest`;
  static readonly HeaderType = `C4Header`;
  static readonly HeaderCode = 0xC4;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `A player wants to send a letter to another players character.`;
  static readonly CausedReaction = `The letter is sent to the other character, if it exists and the player has the required money.`;
  static readonly Length = undefined;
  static readonly LengthSize = 2;
  static readonly DataOffset = 3;
  static readonly Code = 0xC5;

  static getRequiredSize(dataSize:number){
    return LetterSendRequestPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, LetterSendRequestPacket.HeaderCode);
    b.setUint8(LetterSendRequestPacket.DataOffset, LetterSendRequestPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = LetterSendRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint16(1, l);
    return this;
  }

  private _readString (from :number, to: number): string {
    return readWireString(this.buffer, from, to);
  }

  static createPacket(requiredSize: number): LetterSendRequestPacket {
    const p = new LetterSendRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get LetterId(){
    return this.buffer.getUint32(4, true);
  }
  set LetterId(value: number){
    this.buffer.setUint32(4, value, true);
  }
  get Receiver(){
    const to = 18;
              
    return this._readString(8, to);
  }
  setReceiver(str: string, count = 10){
    const from = 8;
    for(let i = 0; i < str.length; i++){
      const char = str.charCodeAt(i);
      this.buffer.setUint8(from + i, char);
    }
}
  get Title(){
    const to = 78;
              
    return this._readString(18, to);
  }
  setTitle(str: string, count = 60){
    const from = 18;
    for(let i = 0; i < str.length; i++){
      const char = str.charCodeAt(i);
      this.buffer.setUint8(from + i, char);
    }
}
  get Rotation() {
    return GetByteValue(this.buffer.getUint8(78), 8, 0);
  }
  set Rotation(value: number) {
    const oldByte = this.buffer.getUint8(78);
    this.buffer.setUint8(78, SetByteValue(oldByte, value, 8, 0));
  }
  get Animation() {
    return GetByteValue(this.buffer.getUint8(79), 8, 0);
  }
  set Animation(value: number) {
    const oldByte = this.buffer.getUint8(79);
    this.buffer.setUint8(79, SetByteValue(oldByte, value, 8, 0));
  }
  get MessageLength(){
    return this.buffer.getUint16(80, true);
  }
  set MessageLength(value: number){
    this.buffer.setUint16(80, value, true);
  }
  get Message(){
    const to = this.buffer.byteLength;
              
    return this._readString(82, to);
  }
  setMessage(str: string, count = NaN){
    const from = 82;
    for(let i = 0; i < str.length; i++){
      const char = str.charCodeAt(i);
      this.buffer.setUint8(from + i, char);
    }
}
}
export class LetterReadRequestPacket {
  buffer!: DataView;
  static readonly Name = `LetterReadRequest`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `A player requests to read a specific letter of his letter list.`;
  static readonly CausedReaction = `The server sends the requested letter content back to the game client.`;
  static readonly Length = 6;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xC7;

  static getRequiredSize(dataSize:number){
    return LetterReadRequestPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, LetterReadRequestPacket.HeaderCode);
    b.setUint8(LetterReadRequestPacket.DataOffset, LetterReadRequestPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = LetterReadRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 6): LetterReadRequestPacket {
    const p = new LetterReadRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get LetterIndex(){
    return this.buffer.getUint16(4, true);
  }
  set LetterIndex(value: number){
    this.buffer.setUint16(4, value, true);
  }
}
export class GuildKickPlayerRequestPacket {
  buffer!: DataView;
  static readonly Name = `GuildKickPlayerRequest`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `A guild member wants to kick himself or a guild master wants to kick another player from its guild.`;
  static readonly CausedReaction = `If the player is allowed to kick the player, it's removed from the guild. If the guild master kicks himself, the guild is disbanded. Corresponding responses are sent to all involved players.`;
  static readonly Length = undefined;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x53;

  static getRequiredSize(dataSize:number){
    return GuildKickPlayerRequestPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, GuildKickPlayerRequestPacket.HeaderCode);
    b.setUint8(GuildKickPlayerRequestPacket.DataOffset, GuildKickPlayerRequestPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = GuildKickPlayerRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  private _readString (from :number, to: number): string {
    return readWireString(this.buffer, from, to);
  }

  static createPacket(requiredSize: number): GuildKickPlayerRequestPacket {
    const p = new GuildKickPlayerRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get PlayerName(){
    const to = 13;
              
    return this._readString(3, to);
  }
  setPlayerName(str: string, count = 10){
    const from = 3;
    for(let i = 0; i < str.length; i++){
      const char = str.charCodeAt(i);
      this.buffer.setUint8(from + i, char);
    }
}
  get SecurityCode(){
    const to = this.buffer.byteLength;
              
    return this._readString(13, to);
  }
  setSecurityCode(str: string, count = NaN){
    const from = 13;
    for(let i = 0; i < str.length; i++){
      const char = str.charCodeAt(i);
      this.buffer.setUint8(from + i, char);
    }
}
}
export class GuildJoinRequestPacket {
  buffer!: DataView;
  static readonly Name = `GuildJoinRequest`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `A player (non-guild member) requests to join a guild.`;
  static readonly CausedReaction = `The request is forwarded to the guild master. There can only be one request at a time. If the guild master already has an open request, a corresponding response is directly sent back to the requesting player.`;
  static readonly Length = 5;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x50;

  static getRequiredSize(dataSize:number){
    return GuildJoinRequestPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, GuildJoinRequestPacket.HeaderCode);
    b.setUint8(GuildJoinRequestPacket.DataOffset, GuildJoinRequestPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = GuildJoinRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 5): GuildJoinRequestPacket {
    const p = new GuildJoinRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get GuildMasterPlayerId(){
    return this.buffer.getUint16(3, false);
  }
  set GuildMasterPlayerId(value: number){
    this.buffer.setUint16(3, value, false);
  }
}
export class GuildJoinResponsePacket {
  buffer!: DataView;
  static readonly Name = `GuildJoinResponse`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `A guild master responded to a previously sent request.`;
  static readonly CausedReaction = `If the request was accepted by the guild master, the previously requesting player is added to the guild.`;
  static readonly Length = 6;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x51;

  static getRequiredSize(dataSize:number){
    return GuildJoinResponsePacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, GuildJoinResponsePacket.HeaderCode);
    b.setUint8(GuildJoinResponsePacket.DataOffset, GuildJoinResponsePacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = GuildJoinResponsePacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 6): GuildJoinResponsePacket {
    const p = new GuildJoinResponsePacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Accepted(){
    return GetBoolean(this.buffer.getUint8(3), 0);
  }
  set Accepted(value: boolean){
    const oldByte = this.buffer.getUint8(3);
    this.buffer.setUint8(3, SetBoolean(oldByte, value, 0));
  }
  get RequesterId(){
    return this.buffer.getUint16(4, false);
  }
  set RequesterId(value: number){
    this.buffer.setUint16(4, value, false);
  }
}
export class GuildListRequestPacket {
  buffer!: DataView;
  static readonly Name = `GuildListRequest`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `A guild player opens its guild menu in the game client.`;
  static readonly CausedReaction = `A list of all guild members and their state is sent back as response.`;
  static readonly Length = 3;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x52;

  static getRequiredSize(dataSize:number){
    return GuildListRequestPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, GuildListRequestPacket.HeaderCode);
    b.setUint8(GuildListRequestPacket.DataOffset, GuildListRequestPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = GuildListRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 3): GuildListRequestPacket {
    const p = new GuildListRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
}
export class GuildCreateRequestPacket {
  buffer!: DataView;
  static readonly Name = `GuildCreateRequest`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `When a player wants to create a guild.`;
  static readonly CausedReaction = `The guild is created and the player is set as the new guild master of the guild.`;
  static readonly Length = 44;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x55;

  static getRequiredSize(dataSize:number){
    return GuildCreateRequestPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, GuildCreateRequestPacket.HeaderCode);
    b.setUint8(GuildCreateRequestPacket.DataOffset, GuildCreateRequestPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = GuildCreateRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  private _readString (from :number, to: number): string {
    return readWireString(this.buffer, from, to);
  }

  static createPacket(requiredSize: number = 44): GuildCreateRequestPacket {
    const p = new GuildCreateRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get GuildName(){
    const to = 12;
              
    return this._readString(4, to);
  }
  setGuildName(str: string, count = 8){
    const from = 4;
    for(let i = 0; i < str.length; i++){
      const char = str.charCodeAt(i);
      this.buffer.setUint8(from + i, char);
    }
}
  get GuildEmblem(){
    const to = 44;
    const i = 12;
              
    return new DataView(this.buffer.buffer.slice(i,to));
  }
  setGuildEmblem(data: ArrayLike<number>, count = 32){
    if (data.length !== count) throw new Error(`data.length must be ${count}`);
    const from = 12;

    for (let i = 0; i < data.length; i++) {
      this.buffer.setUint8(from + i, data[i]);
    }
}
}
export class GuildCreateRequest075Packet {
  buffer!: DataView;
  static readonly Name = `GuildCreateRequest075`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `When a player wants to create a guild.`;
  static readonly CausedReaction = `The guild is created and the player is set as the new guild master of the guild.`;
  static readonly Length = 43;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x55;

  static getRequiredSize(dataSize:number){
    return GuildCreateRequest075Packet.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, GuildCreateRequest075Packet.HeaderCode);
    b.setUint8(GuildCreateRequest075Packet.DataOffset, GuildCreateRequest075Packet.Code);
  
    return this;
  }

  writeLength(l: number|undefined = GuildCreateRequest075Packet.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  private _readString (from :number, to: number): string {
    return readWireString(this.buffer, from, to);
  }

  static createPacket(requiredSize: number = 43): GuildCreateRequest075Packet {
    const p = new GuildCreateRequest075Packet();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get GuildName(){
    const to = 11;
              
    return this._readString(3, to);
  }
  setGuildName(str: string, count = 8){
    const from = 3;
    for(let i = 0; i < str.length; i++){
      const char = str.charCodeAt(i);
      this.buffer.setUint8(from + i, char);
    }
}
  get GuildEmblem(){
    const to = 43;
    const i = 11;
              
    return new DataView(this.buffer.buffer.slice(i,to));
  }
  setGuildEmblem(data: ArrayLike<number>, count = 32){
    if (data.length !== count) throw new Error(`data.length must be ${count}`);
    const from = 11;

    for (let i = 0; i < data.length; i++) {
      this.buffer.setUint8(from + i, data[i]);
    }
}
}
export class GuildMasterAnswerPacket {
  buffer!: DataView;
  static readonly Name = `GuildMasterAnswer`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `The player has the dialog of the guild master NPC opened and decided about its next step.`;
  static readonly CausedReaction = `It either cancels the guild creation or proceeds with the guild creation dialog where the player can enter the guild name and symbol.`;
  static readonly Length = 4;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x54;

  static getRequiredSize(dataSize:number){
    return GuildMasterAnswerPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, GuildMasterAnswerPacket.HeaderCode);
    b.setUint8(GuildMasterAnswerPacket.DataOffset, GuildMasterAnswerPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = GuildMasterAnswerPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 4): GuildMasterAnswerPacket {
    const p = new GuildMasterAnswerPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get ShowCreationDialog(){
    return GetBoolean(this.buffer.getUint8(3), 0);
  }
  set ShowCreationDialog(value: boolean){
    const oldByte = this.buffer.getUint8(3);
    this.buffer.setUint8(3, SetBoolean(oldByte, value, 0));
  }
}
export class CancelGuildCreationPacket {
  buffer!: DataView;
  static readonly Name = `CancelGuildCreation`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `The player has the dialog of the guild creation dialog opened and decided against creating a guild.`;
  static readonly CausedReaction = `It either cancels the guild creation.`;
  static readonly Length = 3;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x57;

  static getRequiredSize(dataSize:number){
    return CancelGuildCreationPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, CancelGuildCreationPacket.HeaderCode);
    b.setUint8(CancelGuildCreationPacket.DataOffset, CancelGuildCreationPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = CancelGuildCreationPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 3): CancelGuildCreationPacket {
    const p = new CancelGuildCreationPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
}
export class GuildWarResponsePacket {
  buffer!: DataView;
  static readonly Name = `GuildWarResponse`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `A guild master requested a guild war against another guild.`;
  static readonly CausedReaction = `If the guild master confirms, the war is declared.`;
  static readonly Length = 4;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x61;

  static getRequiredSize(dataSize:number){
    return GuildWarResponsePacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, GuildWarResponsePacket.HeaderCode);
    b.setUint8(GuildWarResponsePacket.DataOffset, GuildWarResponsePacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = GuildWarResponsePacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 4): GuildWarResponsePacket {
    const p = new GuildWarResponsePacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Accepted(){
    return GetBoolean(this.buffer.getUint8(3), 0);
  }
  set Accepted(value: boolean){
    const oldByte = this.buffer.getUint8(3);
    this.buffer.setUint8(3, SetBoolean(oldByte, value, 0));
  }
}
export class GuildInfoRequestPacket {
  buffer!: DataView;
  static readonly Name = `GuildInfoRequest`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `A player gets another player into view range which is in a guild, and the guild identifier is unknown (=not cached yet by previous requests) to him.`;
  static readonly CausedReaction = `The server sends a response which includes the guild name and emblem.`;
  static readonly Length = 8;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x66;

  static getRequiredSize(dataSize:number){
    return GuildInfoRequestPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, GuildInfoRequestPacket.HeaderCode);
    b.setUint8(GuildInfoRequestPacket.DataOffset, GuildInfoRequestPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = GuildInfoRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 8): GuildInfoRequestPacket {
    const p = new GuildInfoRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get GuildId(){
    return this.buffer.getUint32(4, true);
  }
  set GuildId(value: number){
    this.buffer.setUint32(4, value, true);
  }
}
export class GuildRoleAssignRequestPacket {
  buffer!: DataView;
  static readonly Name = `GuildRoleAssignRequest`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `A guild master wants to change the role of a guild member.`;
  static readonly CausedReaction = `The server changes the role of the guild member.`;
  static readonly Length = 15;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xE1;

  static getRequiredSize(dataSize:number){
    return GuildRoleAssignRequestPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, GuildRoleAssignRequestPacket.HeaderCode);
    b.setUint8(GuildRoleAssignRequestPacket.DataOffset, GuildRoleAssignRequestPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = GuildRoleAssignRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  private _readString (from :number, to: number): string {
    return readWireString(this.buffer, from, to);
  }

  static createPacket(requiredSize: number = 15): GuildRoleAssignRequestPacket {
    const p = new GuildRoleAssignRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Type() {
    return GetByteValue(this.buffer.getUint8(3), 8, 0);
  }
  set Type(value: number) {
    const oldByte = this.buffer.getUint8(3);
    this.buffer.setUint8(3, SetByteValue(oldByte, value, 8, 0));
  }
  get Role():Byte{
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set Role(value: Byte){
    const oldValue = this.Role;
    this.buffer.setUint8(4, SetByteValue(oldValue, value, 8, 0));
  }
  get PlayerName(){
    const to = 15;
              
    return this._readString(5, to);
  }
  setPlayerName(str: string, count = 10){
    const from = 5;
    for(let i = 0; i < str.length; i++){
      const char = str.charCodeAt(i);
      this.buffer.setUint8(from + i, char);
    }
}
}
export class GuildTypeChangeRequestPacket {
  buffer!: DataView;
  static readonly Name = `GuildTypeChangeRequest`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `A guild master wants to change the type of its guild. Didn't find any place in the client where this is sent.`;
  static readonly CausedReaction = `The server changes the kind of the guild. We assume it's whether the guild should be the main guild of an alliance, or not. Shouldn't be handled, because this is constant for the lifetime of an alliance.`;
  static readonly Length = 4;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xE2;

  static getRequiredSize(dataSize:number){
    return GuildTypeChangeRequestPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, GuildTypeChangeRequestPacket.HeaderCode);
    b.setUint8(GuildTypeChangeRequestPacket.DataOffset, GuildTypeChangeRequestPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = GuildTypeChangeRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 4): GuildTypeChangeRequestPacket {
    const p = new GuildTypeChangeRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get GuildType() {
    return GetByteValue(this.buffer.getUint8(3), 8, 0);
  }
  set GuildType(value: number) {
    const oldByte = this.buffer.getUint8(3);
    this.buffer.setUint8(3, SetByteValue(oldByte, value, 8, 0));
  }
}
export class GuildRelationshipChangeRequestPacket {
  buffer!: DataView;
  static readonly Name = `GuildRelationshipChangeRequest`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `A guild master sends a request to another guild master about changing the relationship between their guilds.`;
  static readonly CausedReaction = `The server sends a response with the result.`;
  static readonly Length = 7;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xE5;

  static getRequiredSize(dataSize:number){
    return GuildRelationshipChangeRequestPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, GuildRelationshipChangeRequestPacket.HeaderCode);
    b.setUint8(GuildRelationshipChangeRequestPacket.DataOffset, GuildRelationshipChangeRequestPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = GuildRelationshipChangeRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 7): GuildRelationshipChangeRequestPacket {
    const p = new GuildRelationshipChangeRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get RelationshipType():GuildRelationshipTypeEnum{
    return GetByteValue(this.buffer.getUint8(3), 8, 0);
  }
  set RelationshipType(value: GuildRelationshipTypeEnum){
    const oldValue = this.RelationshipType;
    this.buffer.setUint8(3, SetByteValue(oldValue, value, 8, 0));
  }
  get RequestType():GuildRequestTypeEnum{
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set RequestType(value: GuildRequestTypeEnum){
    const oldValue = this.RequestType;
    this.buffer.setUint8(4, SetByteValue(oldValue, value, 8, 0));
  }
  get TargetPlayerId(){
    return this.buffer.getUint16(5, false);
  }
  set TargetPlayerId(value: number){
    this.buffer.setUint16(5, value, false);
  }
}
export class GuildRelationshipChangeResponsePacket {
  buffer!: DataView;
  static readonly Name = `GuildRelationshipChangeResponse`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `A guild master answered the request to another guild master about changing the relationship between their guilds.`;
  static readonly CausedReaction = `The server sends a response back to the requester. If the guild master agreed, it takes the necessary actions.`;
  static readonly Length = 8;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xE6;

  static getRequiredSize(dataSize:number){
    return GuildRelationshipChangeResponsePacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, GuildRelationshipChangeResponsePacket.HeaderCode);
    b.setUint8(GuildRelationshipChangeResponsePacket.DataOffset, GuildRelationshipChangeResponsePacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = GuildRelationshipChangeResponsePacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 8): GuildRelationshipChangeResponsePacket {
    const p = new GuildRelationshipChangeResponsePacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get RelationshipType():GuildRelationshipTypeEnum{
    return GetByteValue(this.buffer.getUint8(3), 8, 0);
  }
  set RelationshipType(value: GuildRelationshipTypeEnum){
    const oldValue = this.RelationshipType;
    this.buffer.setUint8(3, SetByteValue(oldValue, value, 8, 0));
  }
  get RequestType():GuildRequestTypeEnum{
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set RequestType(value: GuildRequestTypeEnum){
    const oldValue = this.RequestType;
    this.buffer.setUint8(4, SetByteValue(oldValue, value, 8, 0));
  }
  get Response(){
    return GetBoolean(this.buffer.getUint8(5), 0);
  }
  set Response(value: boolean){
    const oldByte = this.buffer.getUint8(5);
    this.buffer.setUint8(5, SetBoolean(oldByte, value, 0));
  }
  get TargetPlayerId(){
    return this.buffer.getUint16(6, false);
  }
  set TargetPlayerId(value: number){
    this.buffer.setUint16(6, value, false);
  }
}
export class RequestAllianceListPacket {
  buffer!: DataView;
  static readonly Name = `RequestAllianceList`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `The player opens the alliance list dialog.`;
  static readonly CausedReaction = `The server answers with the list of the guilds of the alliance.`;
  static readonly Length = 3;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xE9;

  static getRequiredSize(dataSize:number){
    return RequestAllianceListPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, RequestAllianceListPacket.HeaderCode);
    b.setUint8(RequestAllianceListPacket.DataOffset, RequestAllianceListPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = RequestAllianceListPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 3): RequestAllianceListPacket {
    const p = new RequestAllianceListPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
}
export class RemoveAllianceGuildRequestPacket {
  buffer!: DataView;
  static readonly Name = `RemoveAllianceGuildRequest`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `An alliance guild master wants to remove a guild from the alliance.`;
  static readonly CausedReaction = `The server removes the guild from the alliance.`;
  static readonly Length = 12;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xEB;
  static readonly SubCode = 0x01;

  static getRequiredSize(dataSize:number){
    return RemoveAllianceGuildRequestPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, RemoveAllianceGuildRequestPacket.HeaderCode);
    b.setUint8(RemoveAllianceGuildRequestPacket.DataOffset, RemoveAllianceGuildRequestPacket.Code);
  b.setUint8(RemoveAllianceGuildRequestPacket.DataOffset + 1, RemoveAllianceGuildRequestPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = RemoveAllianceGuildRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  private _readString (from :number, to: number): string {
    return readWireString(this.buffer, from, to);
  }

  static createPacket(requiredSize: number = 12): RemoveAllianceGuildRequestPacket {
    const p = new RemoveAllianceGuildRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get GuildName(){
    const to = 12;
              
    return this._readString(4, to);
  }
  setGuildName(str: string, count = 8){
    const from = 4;
    for(let i = 0; i < str.length; i++){
      const char = str.charCodeAt(i);
      this.buffer.setUint8(from + i, char);
    }
}
}
export class PingResponsePacket {
  buffer!: DataView;
  static readonly Name = `PingResponse`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `After the server sent a ping request.`;
  static readonly CausedReaction = `The server knows the latency between server and client.`;
  static readonly Length = 3;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x71;

  static getRequiredSize(dataSize:number){
    return PingResponsePacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, PingResponsePacket.HeaderCode);
    b.setUint8(PingResponsePacket.DataOffset, PingResponsePacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = PingResponsePacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 3): PingResponsePacket {
    const p = new PingResponsePacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
}
export class ItemRepairPacket {
  buffer!: DataView;
  static readonly Name = `ItemRepair`;
  static readonly HeaderType = `C3Header`;
  static readonly HeaderCode = 0xC3;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `A player wants to repair an item of his inventory, either himself or with the usage of an NPC.`;
  static readonly CausedReaction = `If the item is damaged and repairable, the durability of the item is maximized and corresponding responses are sent back to the client.`;
  static readonly Length = 4;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x34;

  static getRequiredSize(dataSize:number){
    return ItemRepairPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, ItemRepairPacket.HeaderCode);
    b.setUint8(ItemRepairPacket.DataOffset, ItemRepairPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = ItemRepairPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 4): ItemRepairPacket {
    const p = new ItemRepairPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get InventoryItemSlot() {
    return GetByteValue(this.buffer.getUint8(3), 8, 0);
  }
  set InventoryItemSlot(value: number) {
    const oldByte = this.buffer.getUint8(3);
    this.buffer.setUint8(3, SetByteValue(oldByte, value, 8, 0));
  }
}
export enum ChaosMachineMixRequestChaosMachineMixTypeEnum {
    ChaosWeapon = 1,
UpgradeItemLevelTo10 = 3,
UpgradeItemLevelTo11 = 4,
UpgradeItemLevelTo12 = 22,
UpgradeItemLevelTo13 = 23,
UpgradeItemLevelTo14 = 49,
UpgradeItemLevelTo15 = 50,
FruitCreation = 6,
GemstoneRefinery = 41,
PotionOfBless = 15,
PotionOfSoul = 16
  }export class ChaosMachineMixRequestPacket {
  buffer!: DataView;
  static readonly Name = `ChaosMachineMixRequest`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `The player has the dialog of the chaos machine open and decided to mix (craft) the items which he put into the chaos machine dialog.`;
  static readonly CausedReaction = `Based on the type of mix and it's corresponding success rate, the mix succeeds or fails. The client gets a corresponding response with the created, changed or lost items.`;
  static readonly Length = 5;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x86;

  static getRequiredSize(dataSize:number){
    return ChaosMachineMixRequestPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, ChaosMachineMixRequestPacket.HeaderCode);
    b.setUint8(ChaosMachineMixRequestPacket.DataOffset, ChaosMachineMixRequestPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = ChaosMachineMixRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 5): ChaosMachineMixRequestPacket {
    const p = new ChaosMachineMixRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get MixType():ChaosMachineMixRequestChaosMachineMixTypeEnum{
    return GetByteValue(this.buffer.getUint8(3), 8, 0);
  }
  set MixType(value: ChaosMachineMixRequestChaosMachineMixTypeEnum){
    const oldValue = this.MixType;
    this.buffer.setUint8(3, SetByteValue(oldValue, value, 8, 0));
  }
  get SocketSlot() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set SocketSlot(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }
}
export class CraftingDialogCloseRequestPacket {
  buffer!: DataView;
  static readonly Name = `CraftingDialogCloseRequest`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `A player closes the dialog which was opened by an interaction with the chaos machine goblin.`;
  static readonly CausedReaction = `The server updates the state of the player accordingly.`;
  static readonly Length = 3;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x87;

  static getRequiredSize(dataSize:number){
    return CraftingDialogCloseRequestPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, CraftingDialogCloseRequestPacket.HeaderCode);
    b.setUint8(CraftingDialogCloseRequestPacket.DataOffset, CraftingDialogCloseRequestPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = CraftingDialogCloseRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 3): CraftingDialogCloseRequestPacket {
    const p = new CraftingDialogCloseRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
}
export class FriendListRequestPacket {
  buffer!: DataView;
  static readonly Name = `FriendListRequest`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `The client requests the current friend list.`;
  static readonly CausedReaction = `The server sends the friend list to the client.`;
  static readonly Length = 3;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xC0;

  static getRequiredSize(dataSize:number){
    return FriendListRequestPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, FriendListRequestPacket.HeaderCode);
    b.setUint8(FriendListRequestPacket.DataOffset, FriendListRequestPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = FriendListRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 3): FriendListRequestPacket {
    const p = new FriendListRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
}
export class FriendAddRequestPacket {
  buffer!: DataView;
  static readonly Name = `FriendAddRequest`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `A player wants to add another players character into his friend list of the messenger.`;
  static readonly CausedReaction = `A request is sent to the other player. If the player is currently offline, the request will be sent as soon as he is online again.`;
  static readonly Length = 13;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xC1;

  static getRequiredSize(dataSize:number){
    return FriendAddRequestPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, FriendAddRequestPacket.HeaderCode);
    b.setUint8(FriendAddRequestPacket.DataOffset, FriendAddRequestPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = FriendAddRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  private _readString (from :number, to: number): string {
    return readWireString(this.buffer, from, to);
  }

  static createPacket(requiredSize: number = 13): FriendAddRequestPacket {
    const p = new FriendAddRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get FriendName(){
    const to = 13;
              
    return this._readString(3, to);
  }
  setFriendName(str: string, count = 10){
    const from = 3;
    for(let i = 0; i < str.length; i++){
      const char = str.charCodeAt(i);
      this.buffer.setUint8(from + i, char);
    }
}
}
export class FriendDeletePacket {
  buffer!: DataView;
  static readonly Name = `FriendDelete`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `A player wants to delete another players character from his friend list of the messenger.`;
  static readonly CausedReaction = `The entry in the friend list is removed. The player is shown as offline in the other players friends list.`;
  static readonly Length = 13;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xC3;

  static getRequiredSize(dataSize:number){
    return FriendDeletePacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, FriendDeletePacket.HeaderCode);
    b.setUint8(FriendDeletePacket.DataOffset, FriendDeletePacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = FriendDeletePacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  private _readString (from :number, to: number): string {
    return readWireString(this.buffer, from, to);
  }

  static createPacket(requiredSize: number = 13): FriendDeletePacket {
    const p = new FriendDeletePacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get FriendName(){
    const to = 13;
              
    return this._readString(3, to);
  }
  setFriendName(str: string, count = 10){
    const from = 3;
    for(let i = 0; i < str.length; i++){
      const char = str.charCodeAt(i);
      this.buffer.setUint8(from + i, char);
    }
}
}
export class ChatRoomCreateRequestPacket {
  buffer!: DataView;
  static readonly Name = `ChatRoomCreateRequest`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `A player wants to open a chat with another player of his friend list.`;
  static readonly CausedReaction = `If both players are online, a chat room is created on the chat server. Authentication data is sent to both game clients, which will then try to connect to the chat server using this data.`;
  static readonly Length = 13;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xCA;

  static getRequiredSize(dataSize:number){
    return ChatRoomCreateRequestPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, ChatRoomCreateRequestPacket.HeaderCode);
    b.setUint8(ChatRoomCreateRequestPacket.DataOffset, ChatRoomCreateRequestPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = ChatRoomCreateRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  private _readString (from :number, to: number): string {
    return readWireString(this.buffer, from, to);
  }

  static createPacket(requiredSize: number = 13): ChatRoomCreateRequestPacket {
    const p = new ChatRoomCreateRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get FriendName(){
    const to = 13;
              
    return this._readString(3, to);
  }
  setFriendName(str: string, count = 10){
    const from = 3;
    for(let i = 0; i < str.length; i++){
      const char = str.charCodeAt(i);
      this.buffer.setUint8(from + i, char);
    }
}
}
export class FriendAddResponsePacket {
  buffer!: DataView;
  static readonly Name = `FriendAddResponse`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `A player received a friend request from another player and responded to it.`;
  static readonly CausedReaction = `If the player accepted, the friend is added to the players friend list and both players get subscribed about each others online status.`;
  static readonly Length = 14;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xC2;

  static getRequiredSize(dataSize:number){
    return FriendAddResponsePacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, FriendAddResponsePacket.HeaderCode);
    b.setUint8(FriendAddResponsePacket.DataOffset, FriendAddResponsePacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = FriendAddResponsePacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  private _readString (from :number, to: number): string {
    return readWireString(this.buffer, from, to);
  }

  static createPacket(requiredSize: number = 14): FriendAddResponsePacket {
    const p = new FriendAddResponsePacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Accepted(){
    return GetBoolean(this.buffer.getUint8(3), 0);
  }
  set Accepted(value: boolean){
    const oldByte = this.buffer.getUint8(3);
    this.buffer.setUint8(3, SetBoolean(oldByte, value, 0));
  }
  get FriendRequesterName(){
    const to = 14;
              
    return this._readString(4, to);
  }
  setFriendRequesterName(str: string, count = 10){
    const from = 4;
    for(let i = 0; i < str.length; i++){
      const char = str.charCodeAt(i);
      this.buffer.setUint8(from + i, char);
    }
}
}
export class SetFriendOnlineStatePacket {
  buffer!: DataView;
  static readonly Name = `SetFriendOnlineState`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `A player wants to set himself on- or offline.`;
  static readonly CausedReaction = `Depending on the state, the player is shown as offline or online in all friend lists of his friends.`;
  static readonly Length = 4;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xC4;

  static getRequiredSize(dataSize:number){
    return SetFriendOnlineStatePacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, SetFriendOnlineStatePacket.HeaderCode);
    b.setUint8(SetFriendOnlineStatePacket.DataOffset, SetFriendOnlineStatePacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = SetFriendOnlineStatePacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 4): SetFriendOnlineStatePacket {
    const p = new SetFriendOnlineStatePacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get OnlineState(){
    return GetBoolean(this.buffer.getUint8(3), 0);
  }
  set OnlineState(value: boolean){
    const oldByte = this.buffer.getUint8(3);
    this.buffer.setUint8(3, SetBoolean(oldByte, value, 0));
  }
}
export class ChatRoomInvitationRequestPacket {
  buffer!: DataView;
  static readonly Name = `ChatRoomInvitationRequest`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `A player wants to invite additional players from his friend list to an existing chat room.`;
  static readonly CausedReaction = `The player additional gets authentication data sent to his game client. It then connects to the chat server and joins the chat room.`;
  static readonly Length = 19;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xCB;

  static getRequiredSize(dataSize:number){
    return ChatRoomInvitationRequestPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, ChatRoomInvitationRequestPacket.HeaderCode);
    b.setUint8(ChatRoomInvitationRequestPacket.DataOffset, ChatRoomInvitationRequestPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = ChatRoomInvitationRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  private _readString (from :number, to: number): string {
    return readWireString(this.buffer, from, to);
  }

  static createPacket(requiredSize: number = 19): ChatRoomInvitationRequestPacket {
    const p = new ChatRoomInvitationRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get FriendName(){
    const to = 13;
              
    return this._readString(3, to);
  }
  setFriendName(str: string, count = 10){
    const from = 3;
    for(let i = 0; i < str.length; i++){
      const char = str.charCodeAt(i);
      this.buffer.setUint8(from + i, char);
    }
}
  get RoomId(){
    return this.buffer.getUint16(13, false);
  }
  set RoomId(value: number){
    this.buffer.setUint16(13, value, false);
  }
  get RequestId(){
    return this.buffer.getUint32(15, false);
  }
  set RequestId(value: number){
    this.buffer.setUint32(15, value, false);
  }
}
export class LegacyQuestStateRequestPacket {
  buffer!: DataView;
  static readonly Name = `LegacyQuestStateRequest`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `After the player entered the game world with a character.`;
  static readonly CausedReaction = `The quest state is sent back as response.`;
  static readonly Length = 3;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xA0;

  static getRequiredSize(dataSize:number){
    return LegacyQuestStateRequestPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, LegacyQuestStateRequestPacket.HeaderCode);
    b.setUint8(LegacyQuestStateRequestPacket.DataOffset, LegacyQuestStateRequestPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = LegacyQuestStateRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 3): LegacyQuestStateRequestPacket {
    const p = new LegacyQuestStateRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
}
export class LegacyQuestStateSetRequestPacket {
  buffer!: DataView;
  static readonly Name = `LegacyQuestStateSetRequest`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `The player wants to change the state of a quest, e.g. to start or to finish a quest.`;
  static readonly CausedReaction = `Depending on the requested new state, a response is sent back.`;
  static readonly Length = 5;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xA2;

  static getRequiredSize(dataSize:number){
    return LegacyQuestStateSetRequestPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, LegacyQuestStateSetRequestPacket.HeaderCode);
    b.setUint8(LegacyQuestStateSetRequestPacket.DataOffset, LegacyQuestStateSetRequestPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = LegacyQuestStateSetRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 5): LegacyQuestStateSetRequestPacket {
    const p = new LegacyQuestStateSetRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get QuestNumber() {
    return GetByteValue(this.buffer.getUint8(3), 8, 0);
  }
  set QuestNumber(value: number) {
    const oldByte = this.buffer.getUint8(3);
    this.buffer.setUint8(3, SetByteValue(oldByte, value, 8, 0));
  }
  get NewState():Byte{
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set NewState(value: Byte){
    const oldValue = this.NewState;
    this.buffer.setUint8(4, SetByteValue(oldValue, value, 8, 0));
  }
}
export class PetCommandRequestPacket {
  buffer!: DataView;
  static readonly Name = `PetCommandRequest`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `The player wants to command its equipped pet (raven).`;
  static readonly CausedReaction = `undefined`;
  static readonly Length = 7;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xA7;

  static getRequiredSize(dataSize:number){
    return PetCommandRequestPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, PetCommandRequestPacket.HeaderCode);
    b.setUint8(PetCommandRequestPacket.DataOffset, PetCommandRequestPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = PetCommandRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 7): PetCommandRequestPacket {
    const p = new PetCommandRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get PetType():PetTypeEnum{
    return GetByteValue(this.buffer.getUint8(3), 8, 0);
  }
  set PetType(value: PetTypeEnum){
    const oldValue = this.PetType;
    this.buffer.setUint8(3, SetByteValue(oldValue, value, 8, 0));
  }
  get CommandMode():PetCommandModeEnum{
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set CommandMode(value: PetCommandModeEnum){
    const oldValue = this.CommandMode;
    this.buffer.setUint8(4, SetByteValue(oldValue, value, 8, 0));
  }
  get TargetId(){
    return this.buffer.getUint16(5, false);
  }
  set TargetId(value: number){
    this.buffer.setUint16(5, value, false);
  }
}
export class PetInfoRequestPacket {
  buffer!: DataView;
  static readonly Name = `PetInfoRequest`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `The player hovers over a pet. The client sends this request to retrieve information (level, experience) of the pet (dark raven, horse).`;
  static readonly CausedReaction = `The server sends a PetInfoResponse.`;
  static readonly Length = 6;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xA9;

  static getRequiredSize(dataSize:number){
    return PetInfoRequestPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, PetInfoRequestPacket.HeaderCode);
    b.setUint8(PetInfoRequestPacket.DataOffset, PetInfoRequestPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = PetInfoRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 6): PetInfoRequestPacket {
    const p = new PetInfoRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Pet():PetTypeEnum{
    return GetByteValue(this.buffer.getUint8(3), 8, 0);
  }
  set Pet(value: PetTypeEnum){
    const oldValue = this.Pet;
    this.buffer.setUint8(3, SetByteValue(oldValue, value, 8, 0));
  }
  get Storage():StorageTypeEnum{
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set Storage(value: StorageTypeEnum){
    const oldValue = this.Storage;
    this.buffer.setUint8(4, SetByteValue(oldValue, value, 8, 0));
  }
  get ItemSlot() {
    return GetByteValue(this.buffer.getUint8(5), 8, 0);
  }
  set ItemSlot(value: number) {
    const oldByte = this.buffer.getUint8(5);
    this.buffer.setUint8(5, SetByteValue(oldByte, value, 8, 0));
  }
}
export class IllusionTempleEnterRequestPacket {
  buffer!: DataView;
  static readonly Name = `IllusionTempleEnterRequest`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `The client has the NPC dialog for the illusion temple opened, and wants to enter the event map.`;
  static readonly CausedReaction = `The server checks if the player has the required ticket and moves the player to the event map.`;
  static readonly Length = 6;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xBF;
  static readonly SubCode = 0x00;

  static getRequiredSize(dataSize:number){
    return IllusionTempleEnterRequestPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, IllusionTempleEnterRequestPacket.HeaderCode);
    b.setUint8(IllusionTempleEnterRequestPacket.DataOffset, IllusionTempleEnterRequestPacket.Code);
  b.setUint8(IllusionTempleEnterRequestPacket.DataOffset + 1, IllusionTempleEnterRequestPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = IllusionTempleEnterRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 6): IllusionTempleEnterRequestPacket {
    const p = new IllusionTempleEnterRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get MapNumber() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set MapNumber(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }
  get ItemSlot() {
    return GetByteValue(this.buffer.getUint8(5), 8, 0);
  }
  set ItemSlot(value: number) {
    const oldByte = this.buffer.getUint8(5);
    this.buffer.setUint8(5, SetByteValue(oldByte, value, 8, 0));
  }
}
export class IllusionTempleSkillRequestPacket {
  buffer!: DataView;
  static readonly Name = `IllusionTempleSkillRequest`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `The player is in the illusion temple event and wants to perform a special skill (210 - 213), Order of Protection, Restraint, Tracking or Weaken.`;
  static readonly CausedReaction = `The server checks if the player is inside the event etc. and performs the skills accordingly.`;
  static readonly Length = 8;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xBF;
  static readonly SubCode = 0x02;

  static getRequiredSize(dataSize:number){
    return IllusionTempleSkillRequestPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, IllusionTempleSkillRequestPacket.HeaderCode);
    b.setUint8(IllusionTempleSkillRequestPacket.DataOffset, IllusionTempleSkillRequestPacket.Code);
  b.setUint8(IllusionTempleSkillRequestPacket.DataOffset + 1, IllusionTempleSkillRequestPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = IllusionTempleSkillRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 8): IllusionTempleSkillRequestPacket {
    const p = new IllusionTempleSkillRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get SkillNumber(){
    return this.buffer.getUint16(4, false);
  }
  set SkillNumber(value: number){
    this.buffer.setUint16(4, value, false);
  }
  get TargetObjectIndex() {
    return GetByteValue(this.buffer.getUint8(6), 8, 0);
  }
  set TargetObjectIndex(value: number) {
    const oldByte = this.buffer.getUint8(6);
    this.buffer.setUint8(6, SetByteValue(oldByte, value, 8, 0));
  }
  get Distance() {
    return GetByteValue(this.buffer.getUint8(7), 8, 0);
  }
  set Distance(value: number) {
    const oldByte = this.buffer.getUint8(7);
    this.buffer.setUint8(7, SetByteValue(oldByte, value, 8, 0));
  }
}
export class IllusionTempleRewardRequestPacket {
  buffer!: DataView;
  static readonly Name = `IllusionTempleRewardRequest`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `The player requests the reward of the event.`;
  static readonly CausedReaction = `The server checks if the player is in the winning game and returns a reward, usually as item drop.`;
  static readonly Length = 4;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xBF;
  static readonly SubCode = 0x05;

  static getRequiredSize(dataSize:number){
    return IllusionTempleRewardRequestPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, IllusionTempleRewardRequestPacket.HeaderCode);
    b.setUint8(IllusionTempleRewardRequestPacket.DataOffset, IllusionTempleRewardRequestPacket.Code);
  b.setUint8(IllusionTempleRewardRequestPacket.DataOffset + 1, IllusionTempleRewardRequestPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = IllusionTempleRewardRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 4): IllusionTempleRewardRequestPacket {
    const p = new IllusionTempleRewardRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
}
export class LuckyCoinCountRequestPacket {
  buffer!: DataView;
  static readonly Name = `LuckyCoinCountRequest`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `The player has the lucky coin dialog open and requests the current count of the registered coins.`;
  static readonly CausedReaction = `The server returns the count of the registered coins.`;
  static readonly Length = 4;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xBF;
  static readonly SubCode = 0x0B;

  static getRequiredSize(dataSize:number){
    return LuckyCoinCountRequestPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, LuckyCoinCountRequestPacket.HeaderCode);
    b.setUint8(LuckyCoinCountRequestPacket.DataOffset, LuckyCoinCountRequestPacket.Code);
  b.setUint8(LuckyCoinCountRequestPacket.DataOffset + 1, LuckyCoinCountRequestPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = LuckyCoinCountRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 4): LuckyCoinCountRequestPacket {
    const p = new LuckyCoinCountRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
}
export class LuckyCoinRegistrationRequestPacket {
  buffer!: DataView;
  static readonly Name = `LuckyCoinRegistrationRequest`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `The player has the lucky coin dialog open and requests to register one lucky coin, which is in his inventory.`;
  static readonly CausedReaction = `The server returns the result of the registration increases the coin count and decreases the coin durability by one.`;
  static readonly Length = 4;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xBF;
  static readonly SubCode = 0x0C;

  static getRequiredSize(dataSize:number){
    return LuckyCoinRegistrationRequestPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, LuckyCoinRegistrationRequestPacket.HeaderCode);
    b.setUint8(LuckyCoinRegistrationRequestPacket.DataOffset, LuckyCoinRegistrationRequestPacket.Code);
  b.setUint8(LuckyCoinRegistrationRequestPacket.DataOffset + 1, LuckyCoinRegistrationRequestPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = LuckyCoinRegistrationRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 4): LuckyCoinRegistrationRequestPacket {
    const p = new LuckyCoinRegistrationRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
}
export class LuckyCoinExchangeRequestPacket {
  buffer!: DataView;
  static readonly Name = `LuckyCoinExchangeRequest`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `The player has the lucky coin dialog open and requests an exchange for the specified number of registered coins.`;
  static readonly CausedReaction = `The server adds an item to the inventory of the character and sends a response with a result code.`;
  static readonly Length = 8;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xBF;
  static readonly SubCode = 0x0D;

  static getRequiredSize(dataSize:number){
    return LuckyCoinExchangeRequestPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, LuckyCoinExchangeRequestPacket.HeaderCode);
    b.setUint8(LuckyCoinExchangeRequestPacket.DataOffset, LuckyCoinExchangeRequestPacket.Code);
  b.setUint8(LuckyCoinExchangeRequestPacket.DataOffset + 1, LuckyCoinExchangeRequestPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = LuckyCoinExchangeRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 8): LuckyCoinExchangeRequestPacket {
    const p = new LuckyCoinExchangeRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get CoinCount(){
    return this.buffer.getUint32(4, true);
  }
  set CoinCount(value: number){
    this.buffer.setUint32(4, value, true);
  }
}
export class DoppelgangerEnterRequestPacket {
  buffer!: DataView;
  static readonly Name = `DoppelgangerEnterRequest`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `The player wants to enter the doppelganger event.`;
  static readonly CausedReaction = `The server checks the event ticket and moves the player to the event map.`;
  static readonly Length = 5;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xBF;
  static readonly SubCode = 0x0E;

  static getRequiredSize(dataSize:number){
    return DoppelgangerEnterRequestPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, DoppelgangerEnterRequestPacket.HeaderCode);
    b.setUint8(DoppelgangerEnterRequestPacket.DataOffset, DoppelgangerEnterRequestPacket.Code);
  b.setUint8(DoppelgangerEnterRequestPacket.DataOffset + 1, DoppelgangerEnterRequestPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = DoppelgangerEnterRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 5): DoppelgangerEnterRequestPacket {
    const p = new DoppelgangerEnterRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get TicketItemSlot() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set TicketItemSlot(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }
}
export class EnterMarketPlaceRequestPacket {
  buffer!: DataView;
  static readonly Name = `EnterMarketPlaceRequest`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `The player wants to enter the market place map.`;
  static readonly CausedReaction = `The server moves the player to the market place map.`;
  static readonly Length = 4;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xBF;
  static readonly SubCode = 0x17;

  static getRequiredSize(dataSize:number){
    return EnterMarketPlaceRequestPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, EnterMarketPlaceRequestPacket.HeaderCode);
    b.setUint8(EnterMarketPlaceRequestPacket.DataOffset, EnterMarketPlaceRequestPacket.Code);
  b.setUint8(EnterMarketPlaceRequestPacket.DataOffset + 1, EnterMarketPlaceRequestPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = EnterMarketPlaceRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 4): EnterMarketPlaceRequestPacket {
    const p = new EnterMarketPlaceRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
}
export class MuHelperStatusChangeRequestPacket {
  buffer!: DataView;
  static readonly Name = `MuHelperStatusChangeRequest`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `The client clicked on MU Helper play or pause button.`;
  static readonly CausedReaction = `The server validates, if user can use the helper and sends the status back.`;
  static readonly Length = 5;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xBF;
  static readonly SubCode = 0x51;

  static getRequiredSize(dataSize:number){
    return MuHelperStatusChangeRequestPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, MuHelperStatusChangeRequestPacket.HeaderCode);
    b.setUint8(MuHelperStatusChangeRequestPacket.DataOffset, MuHelperStatusChangeRequestPacket.Code);
  b.setUint8(MuHelperStatusChangeRequestPacket.DataOffset + 1, MuHelperStatusChangeRequestPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = MuHelperStatusChangeRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 5): MuHelperStatusChangeRequestPacket {
    const p = new MuHelperStatusChangeRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get PauseStatus(){
    return GetBoolean(this.buffer.getUint8(4), 0);
  }
  set PauseStatus(value: boolean){
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetBoolean(oldByte, value, 0));
  }
}
export class MuHelperSaveDataRequestPacket {
  buffer!: DataView;
  static readonly Name = `MuHelperSaveDataRequest`;
  static readonly HeaderType = `C2Header`;
  static readonly HeaderCode = 0xC2;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `The client want to save current MU Helper data.`;
  static readonly CausedReaction = `The server should save supplied MU Helper data.`;
  static readonly Length = 261;
  static readonly LengthSize = 2;
  static readonly DataOffset = 3;
  static readonly Code = 0xAE;

  static getRequiredSize(dataSize:number){
    return MuHelperSaveDataRequestPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, MuHelperSaveDataRequestPacket.HeaderCode);
    b.setUint8(MuHelperSaveDataRequestPacket.DataOffset, MuHelperSaveDataRequestPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = MuHelperSaveDataRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint16(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 261): MuHelperSaveDataRequestPacket {
    const p = new MuHelperSaveDataRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get HelperData(){
    const to = 261;
    const i = 4;
              
    return new DataView(this.buffer.buffer.slice(i,to));
  }
  setHelperData(data: ArrayLike<number>, count = 257){
    if (data.length !== count) throw new Error(`data.length must be ${count}`);
    const from = 4;

    for (let i = 0; i < data.length; i++) {
      this.buffer.setUint8(from + i, data[i]);
    }
}
}
export class QuestSelectRequestPacket {
  buffer!: DataView;
  static readonly Name = `QuestSelectRequest`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `The client opened an quest NPC dialog and selected an available quests.`;
  static readonly CausedReaction = `If the quest is already active, it responds with the QuestProgress. If the quest is inactive, the server decides if the character can start the quest and responds with a QuestStepInfo with the StartingNumber. A character can run up to 3 concurrent quests at a time.`;
  static readonly Length = 9;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xF6;
  static readonly SubCode = 0x0A;

  static getRequiredSize(dataSize:number){
    return QuestSelectRequestPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, QuestSelectRequestPacket.HeaderCode);
    b.setUint8(QuestSelectRequestPacket.DataOffset, QuestSelectRequestPacket.Code);
  b.setUint8(QuestSelectRequestPacket.DataOffset + 1, QuestSelectRequestPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = QuestSelectRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 9): QuestSelectRequestPacket {
    const p = new QuestSelectRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get QuestNumber(){
    return this.buffer.getUint16(4, true);
  }
  set QuestNumber(value: number){
    this.buffer.setUint16(4, value, true);
  }
  get QuestGroup(){
    return this.buffer.getUint16(6, true);
  }
  set QuestGroup(value: number){
    this.buffer.setUint16(6, value, true);
  }
  get SelectedTextIndex() {
    return GetByteValue(this.buffer.getUint8(8), 8, 0);
  }
  set SelectedTextIndex(value: number) {
    const oldByte = this.buffer.getUint8(8);
    this.buffer.setUint8(8, SetByteValue(oldByte, value, 8, 0));
  }
}
export enum QuestProceedRequestQuestProceedActionEnum {
    Undefined = 0,
AcceptQuest = 1,
RefuseQuest = 2
  }export class QuestProceedRequestPacket {
  buffer!: DataView;
  static readonly Name = `QuestProceedRequest`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `After the server started a quest (and sent a F60B message) the game client requests to proceed with the quest.`;
  static readonly CausedReaction = `The quest state is set accordingly on the server. The next response seems to depend on the quest configuration. Depending on the action of the next quest state, the server will send either a quest progress message (F60C) or again a quest start message (F60B).`;
  static readonly Length = 9;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xF6;
  static readonly SubCode = 0x0B;

  static getRequiredSize(dataSize:number){
    return QuestProceedRequestPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, QuestProceedRequestPacket.HeaderCode);
    b.setUint8(QuestProceedRequestPacket.DataOffset, QuestProceedRequestPacket.Code);
  b.setUint8(QuestProceedRequestPacket.DataOffset + 1, QuestProceedRequestPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = QuestProceedRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 9): QuestProceedRequestPacket {
    const p = new QuestProceedRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get QuestNumber(){
    return this.buffer.getUint16(4, true);
  }
  set QuestNumber(value: number){
    this.buffer.setUint16(4, value, true);
  }
  get QuestGroup(){
    return this.buffer.getUint16(6, true);
  }
  set QuestGroup(value: number){
    this.buffer.setUint16(6, value, true);
  }
  get ProceedAction():QuestProceedRequestQuestProceedActionEnum{
    return GetByteValue(this.buffer.getUint8(8), 8, 0);
  }
  set ProceedAction(value: QuestProceedRequestQuestProceedActionEnum){
    const oldValue = this.ProceedAction;
    this.buffer.setUint8(8, SetByteValue(oldValue, value, 8, 0));
  }
}
export class QuestCompletionRequestPacket {
  buffer!: DataView;
  static readonly Name = `QuestCompletionRequest`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `The game client requests to complete an active quest.`;
  static readonly CausedReaction = `The server checks the conditions to complete the quest. If this fails, nothing happens. If all conditions are met, the reward is given to the player and the quest state is set accordingly, so that the player can select to start the next quest. Additionally, the quest completion response message (F60D) is sent to the client.`;
  static readonly Length = 8;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xF6;
  static readonly SubCode = 0x0D;

  static getRequiredSize(dataSize:number){
    return QuestCompletionRequestPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, QuestCompletionRequestPacket.HeaderCode);
    b.setUint8(QuestCompletionRequestPacket.DataOffset, QuestCompletionRequestPacket.Code);
  b.setUint8(QuestCompletionRequestPacket.DataOffset + 1, QuestCompletionRequestPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = QuestCompletionRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 8): QuestCompletionRequestPacket {
    const p = new QuestCompletionRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get QuestNumber(){
    return this.buffer.getUint16(4, true);
  }
  set QuestNumber(value: number){
    this.buffer.setUint16(4, value, true);
  }
  get QuestGroup(){
    return this.buffer.getUint16(6, true);
  }
  set QuestGroup(value: number){
    this.buffer.setUint16(6, value, true);
  }
}
export class QuestCancelRequestPacket {
  buffer!: DataView;
  static readonly Name = `QuestCancelRequest`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `The game client requests to cancel an active quest.`;
  static readonly CausedReaction = `The server checks if the quest is currently in progress. In this case, the quest state is reset and a response (F60F) is sent back to the client.`;
  static readonly Length = 8;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xF6;
  static readonly SubCode = 0x0F;

  static getRequiredSize(dataSize:number){
    return QuestCancelRequestPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, QuestCancelRequestPacket.HeaderCode);
    b.setUint8(QuestCancelRequestPacket.DataOffset, QuestCancelRequestPacket.Code);
  b.setUint8(QuestCancelRequestPacket.DataOffset + 1, QuestCancelRequestPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = QuestCancelRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 8): QuestCancelRequestPacket {
    const p = new QuestCancelRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get QuestNumber(){
    return this.buffer.getUint16(4, true);
  }
  set QuestNumber(value: number){
    this.buffer.setUint16(4, value, true);
  }
  get QuestGroup(){
    return this.buffer.getUint16(6, true);
  }
  set QuestGroup(value: number){
    this.buffer.setUint16(6, value, true);
  }
}
export class QuestClientActionRequestPacket {
  buffer!: DataView;
  static readonly Name = `QuestClientActionRequest`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `The game client requests to complete a client action, e.g. completing a tutorial.`;
  static readonly CausedReaction = `The server checks if the specified quest is currently in progress. If the quest got a Condition (condition type 0x10) for this flag, the condition is flagged as fulfilled.`;
  static readonly Length = 8;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xF6;
  static readonly SubCode = 0x10;

  static getRequiredSize(dataSize:number){
    return QuestClientActionRequestPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, QuestClientActionRequestPacket.HeaderCode);
    b.setUint8(QuestClientActionRequestPacket.DataOffset, QuestClientActionRequestPacket.Code);
  b.setUint8(QuestClientActionRequestPacket.DataOffset + 1, QuestClientActionRequestPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = QuestClientActionRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 8): QuestClientActionRequestPacket {
    const p = new QuestClientActionRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get QuestNumber(){
    return this.buffer.getUint16(4, true);
  }
  set QuestNumber(value: number){
    this.buffer.setUint16(4, value, true);
  }
  get QuestGroup(){
    return this.buffer.getUint16(6, true);
  }
  set QuestGroup(value: number){
    this.buffer.setUint16(6, value, true);
  }
}
export class ActiveQuestListRequestPacket {
  buffer!: DataView;
  static readonly Name = `ActiveQuestListRequest`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `The clients requests the states of all quests, usually after entering the game.`;
  static readonly CausedReaction = `The list of active quests is sent back (F61A) without changing any state. This list just contains all running or completed quests for each group.`;
  static readonly Length = 4;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xF6;
  static readonly SubCode = 0x1A;

  static getRequiredSize(dataSize:number){
    return ActiveQuestListRequestPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, ActiveQuestListRequestPacket.HeaderCode);
    b.setUint8(ActiveQuestListRequestPacket.DataOffset, ActiveQuestListRequestPacket.Code);
  b.setUint8(ActiveQuestListRequestPacket.DataOffset + 1, ActiveQuestListRequestPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = ActiveQuestListRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 4): ActiveQuestListRequestPacket {
    const p = new ActiveQuestListRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
}
export class QuestStateRequestPacket {
  buffer!: DataView;
  static readonly Name = `QuestStateRequest`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `The game client requests the state of a specific active quests.`;
  static readonly CausedReaction = `The quest state is sent back (F61B) without changing any state, if the quest is currently in progress.`;
  static readonly Length = 8;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xF6;
  static readonly SubCode = 0x1B;

  static getRequiredSize(dataSize:number){
    return QuestStateRequestPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, QuestStateRequestPacket.HeaderCode);
    b.setUint8(QuestStateRequestPacket.DataOffset, QuestStateRequestPacket.Code);
  b.setUint8(QuestStateRequestPacket.DataOffset + 1, QuestStateRequestPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = QuestStateRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 8): QuestStateRequestPacket {
    const p = new QuestStateRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get QuestNumber(){
    return this.buffer.getUint16(4, true);
  }
  set QuestNumber(value: number){
    this.buffer.setUint16(4, value, true);
  }
  get QuestGroup(){
    return this.buffer.getUint16(6, true);
  }
  set QuestGroup(value: number){
    this.buffer.setUint16(6, value, true);
  }
}
export class EventQuestStateListRequestPacket {
  buffer!: DataView;
  static readonly Name = `EventQuestStateListRequest`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `The game client requests the list of event quests, usually after entering the game.`;
  static readonly CausedReaction = `The server may answer with a response which seems to depend if the character is member of a Gen or not. If it's not in a gen, it sends a response (F603).`;
  static readonly Length = 4;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xF6;
  static readonly SubCode = 0x21;

  static getRequiredSize(dataSize:number){
    return EventQuestStateListRequestPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, EventQuestStateListRequestPacket.HeaderCode);
    b.setUint8(EventQuestStateListRequestPacket.DataOffset, EventQuestStateListRequestPacket.Code);
  b.setUint8(EventQuestStateListRequestPacket.DataOffset + 1, EventQuestStateListRequestPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = EventQuestStateListRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 4): EventQuestStateListRequestPacket {
    const p = new EventQuestStateListRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
}
export class AvailableQuestsRequestPacket {
  buffer!: DataView;
  static readonly Name = `AvailableQuestsRequest`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `The client opened an quest NPC dialog and requests a list of available quests.`;
  static readonly CausedReaction = `The list of available quests of this NPC is sent back (F60A).`;
  static readonly Length = 4;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xF6;
  static readonly SubCode = 0x30;

  static getRequiredSize(dataSize:number){
    return AvailableQuestsRequestPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, AvailableQuestsRequestPacket.HeaderCode);
    b.setUint8(AvailableQuestsRequestPacket.DataOffset, AvailableQuestsRequestPacket.Code);
  b.setUint8(AvailableQuestsRequestPacket.DataOffset + 1, AvailableQuestsRequestPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = AvailableQuestsRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 4): AvailableQuestsRequestPacket {
    const p = new AvailableQuestsRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
}
export class NpcBuffRequestPacket {
  buffer!: DataView;
  static readonly Name = `NpcBuffRequest`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `The game client requests to get a buff from the currently interacting quest npc. As far as we know, only the Elf Soldier NPC offers such a buff until a certain character level (150 or 220).`;
  static readonly CausedReaction = `The server should check if the correct Quest NPC (e.g. Elf Soldier) dialog is opened and the player didn't reach the level limit yet. If that's both the case, it adds a defined buff (MagicEffect) to the player; Otherwise, a message is sent to the player.`;
  static readonly Length = 4;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xF6;
  static readonly SubCode = 0x31;

  static getRequiredSize(dataSize:number){
    return NpcBuffRequestPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, NpcBuffRequestPacket.HeaderCode);
    b.setUint8(NpcBuffRequestPacket.DataOffset, NpcBuffRequestPacket.Code);
  b.setUint8(NpcBuffRequestPacket.DataOffset + 1, NpcBuffRequestPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = NpcBuffRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 4): NpcBuffRequestPacket {
    const p = new NpcBuffRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
}
export class EnterEmpireGuardianEventPacket {
  buffer!: DataView;
  static readonly Name = `EnterEmpireGuardianEvent`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `The player wants to enter the empire guardian event due an npc dialog.`;
  static readonly CausedReaction = `The checks if the player can enter the event, and moves it to the event, if possible.`;
  static readonly Length = 5;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xF7;
  static readonly SubCode = 0x01;

  static getRequiredSize(dataSize:number){
    return EnterEmpireGuardianEventPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, EnterEmpireGuardianEventPacket.HeaderCode);
    b.setUint8(EnterEmpireGuardianEventPacket.DataOffset, EnterEmpireGuardianEventPacket.Code);
  b.setUint8(EnterEmpireGuardianEventPacket.DataOffset + 1, EnterEmpireGuardianEventPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = EnterEmpireGuardianEventPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 5): EnterEmpireGuardianEventPacket {
    const p = new EnterEmpireGuardianEventPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get ItemSlot() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set ItemSlot(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }
}
export class GensJoinRequestPacket {
  buffer!: DataView;
  static readonly Name = `GensJoinRequest`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `The player has opened one of the gens NPCs and requests to join it.`;
  static readonly CausedReaction = `The server checks if the player is not in a gens already and joins the player to the selected gens.`;
  static readonly Length = 5;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xF8;
  static readonly SubCode = 0x01;

  static getRequiredSize(dataSize:number){
    return GensJoinRequestPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, GensJoinRequestPacket.HeaderCode);
    b.setUint8(GensJoinRequestPacket.DataOffset, GensJoinRequestPacket.Code);
  b.setUint8(GensJoinRequestPacket.DataOffset + 1, GensJoinRequestPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = GensJoinRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 5): GensJoinRequestPacket {
    const p = new GensJoinRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get GensType():GensTypeEnum{
    return GetByteValue(this.buffer.getUint8(3), 8, 0);
  }
  set GensType(value: GensTypeEnum){
    const oldValue = this.GensType;
    this.buffer.setUint8(3, SetByteValue(oldValue, value, 8, 0));
  }
}
export class GensLeaveRequestPacket {
  buffer!: DataView;
  static readonly Name = `GensLeaveRequest`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `The player wants to leave the current gens.`;
  static readonly CausedReaction = `The server the player from the gens.`;
  static readonly Length = 4;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xF8;
  static readonly SubCode = 0x03;

  static getRequiredSize(dataSize:number){
    return GensLeaveRequestPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, GensLeaveRequestPacket.HeaderCode);
    b.setUint8(GensLeaveRequestPacket.DataOffset, GensLeaveRequestPacket.Code);
  b.setUint8(GensLeaveRequestPacket.DataOffset + 1, GensLeaveRequestPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = GensLeaveRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 4): GensLeaveRequestPacket {
    const p = new GensLeaveRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
}
export class GensRewardRequestPacket {
  buffer!: DataView;
  static readonly Name = `GensRewardRequest`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `The game client requests to get a reward from the gens npc.`;
  static readonly CausedReaction = `The server checks if the player has enough points to get the reward, and sends a response.`;
  static readonly Length = 5;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xF8;
  static readonly SubCode = 0x09;

  static getRequiredSize(dataSize:number){
    return GensRewardRequestPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, GensRewardRequestPacket.HeaderCode);
    b.setUint8(GensRewardRequestPacket.DataOffset, GensRewardRequestPacket.Code);
  b.setUint8(GensRewardRequestPacket.DataOffset + 1, GensRewardRequestPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = GensRewardRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 5): GensRewardRequestPacket {
    const p = new GensRewardRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get GensType():GensTypeEnum{
    return GetByteValue(this.buffer.getUint8(3), 8, 0);
  }
  set GensType(value: GensTypeEnum){
    const oldValue = this.GensType;
    this.buffer.setUint8(3, SetByteValue(oldValue, value, 8, 0));
  }
}
export class GensRankingRequestPacket {
  buffer!: DataView;
  static readonly Name = `GensRankingRequest`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `The game client requests information about the current gens ranking.`;
  static readonly CausedReaction = `The server returns the current gens rankinginformation.`;
  static readonly Length = 4;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xF8;
  static readonly SubCode = 0x0B;

  static getRequiredSize(dataSize:number){
    return GensRankingRequestPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, GensRankingRequestPacket.HeaderCode);
    b.setUint8(GensRankingRequestPacket.DataOffset, GensRankingRequestPacket.Code);
  b.setUint8(GensRankingRequestPacket.DataOffset + 1, GensRankingRequestPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = GensRankingRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 4): GensRankingRequestPacket {
    const p = new GensRankingRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
}
export class DevilSquareEnterRequestPacket {
  buffer!: DataView;
  static readonly Name = `DevilSquareEnterRequest`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `The player requests to enter the devil square through the Charon NPC.`;
  static readonly CausedReaction = `The server checks if the player can enter the event and sends a response (Code 0x90) back to the client. If it was successful, the character gets moved to the event map.`;
  static readonly Length = 5;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x90;

  static getRequiredSize(dataSize:number){
    return DevilSquareEnterRequestPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, DevilSquareEnterRequestPacket.HeaderCode);
    b.setUint8(DevilSquareEnterRequestPacket.DataOffset, DevilSquareEnterRequestPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = DevilSquareEnterRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 5): DevilSquareEnterRequestPacket {
    const p = new DevilSquareEnterRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get SquareLevel() {
    return GetByteValue(this.buffer.getUint8(3), 8, 0);
  }
  set SquareLevel(value: number) {
    const oldByte = this.buffer.getUint8(3);
    this.buffer.setUint8(3, SetByteValue(oldByte, value, 8, 0));
  }
  get TicketItemInventoryIndex() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set TicketItemInventoryIndex(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }
}
export class MiniGameOpeningStateRequestPacket {
  buffer!: DataView;
  static readonly Name = `MiniGameOpeningStateRequest`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `The player requests to get the remaining time of the currently entered event.`;
  static readonly CausedReaction = `The remaining time is sent back to the client.`;
  static readonly Length = 5;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x91;

  static getRequiredSize(dataSize:number){
    return MiniGameOpeningStateRequestPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, MiniGameOpeningStateRequestPacket.HeaderCode);
    b.setUint8(MiniGameOpeningStateRequestPacket.DataOffset, MiniGameOpeningStateRequestPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = MiniGameOpeningStateRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 5): MiniGameOpeningStateRequestPacket {
    const p = new MiniGameOpeningStateRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get EventType():Byte{
    return GetByteValue(this.buffer.getUint8(3), 8, 0);
  }
  set EventType(value: Byte){
    const oldValue = this.EventType;
    this.buffer.setUint8(3, SetByteValue(oldValue, value, 8, 0));
  }
  get EventLevel() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set EventLevel(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }
}
export class EventChipRegistrationRequestPacket {
  buffer!: DataView;
  static readonly Name = `EventChipRegistrationRequest`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `The player registers an event item at an NPC, usually the golden archer.`;
  static readonly CausedReaction = `A response is sent back to the client with the current event chip count.`;
  static readonly Length = 5;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x95;

  static getRequiredSize(dataSize:number){
    return EventChipRegistrationRequestPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, EventChipRegistrationRequestPacket.HeaderCode);
    b.setUint8(EventChipRegistrationRequestPacket.DataOffset, EventChipRegistrationRequestPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = EventChipRegistrationRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 5): EventChipRegistrationRequestPacket {
    const p = new EventChipRegistrationRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Type() {
    return GetByteValue(this.buffer.getUint8(3), 8, 0);
  }
  set Type(value: number) {
    const oldByte = this.buffer.getUint8(3);
    this.buffer.setUint8(3, SetByteValue(oldByte, value, 8, 0));
  }
  get ItemIndex() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set ItemIndex(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }
}
export class MutoNumberRequestPacket {
  buffer!: DataView;
  static readonly Name = `MutoNumberRequest`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `The player requests information about the Muto number. Unused.`;
  static readonly CausedReaction = `A response is sent back to the client with the current Muto number.`;
  static readonly Length = 3;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x96;

  static getRequiredSize(dataSize:number){
    return MutoNumberRequestPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, MutoNumberRequestPacket.HeaderCode);
    b.setUint8(MutoNumberRequestPacket.DataOffset, MutoNumberRequestPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = MutoNumberRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 3): MutoNumberRequestPacket {
    const p = new MutoNumberRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
}
export class EventChipExitDialogPacket {
  buffer!: DataView;
  static readonly Name = `EventChipExitDialog`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `The player requests to close the event chip dialog.`;
  static readonly CausedReaction = `The event chip dialog will be closed.`;
  static readonly Length = 3;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x97;

  static getRequiredSize(dataSize:number){
    return EventChipExitDialogPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, EventChipExitDialogPacket.HeaderCode);
    b.setUint8(EventChipExitDialogPacket.DataOffset, EventChipExitDialogPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = EventChipExitDialogPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 3): EventChipExitDialogPacket {
    const p = new EventChipExitDialogPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
}
export class EventChipExchangeRequestPacket {
  buffer!: DataView;
  static readonly Name = `EventChipExchangeRequest`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `The player requests to exchange the event chips to something else.`;
  static readonly CausedReaction = `A response is sent back to the client with the exchange result.`;
  static readonly Length = 4;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x98;

  static getRequiredSize(dataSize:number){
    return EventChipExchangeRequestPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, EventChipExchangeRequestPacket.HeaderCode);
    b.setUint8(EventChipExchangeRequestPacket.DataOffset, EventChipExchangeRequestPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = EventChipExchangeRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 4): EventChipExchangeRequestPacket {
    const p = new EventChipExchangeRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Type() {
    return GetByteValue(this.buffer.getUint8(3), 8, 0);
  }
  set Type(value: number) {
    const oldByte = this.buffer.getUint8(3);
    this.buffer.setUint8(3, SetByteValue(oldByte, value, 8, 0));
  }
}
export class ServerImmigrationRequestPacket {
  buffer!: DataView;
  static readonly Name = `ServerImmigrationRequest`;
  static readonly HeaderType = `C3Header`;
  static readonly HeaderCode = 0xC3;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `Unknown?`;
  static readonly CausedReaction = `Unknown?`;
  static readonly Length = undefined;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x99;

  static getRequiredSize(dataSize:number){
    return ServerImmigrationRequestPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, ServerImmigrationRequestPacket.HeaderCode);
    b.setUint8(ServerImmigrationRequestPacket.DataOffset, ServerImmigrationRequestPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = ServerImmigrationRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  private _readString (from :number, to: number): string {
    return readWireString(this.buffer, from, to);
  }

  static createPacket(requiredSize: number): ServerImmigrationRequestPacket {
    const p = new ServerImmigrationRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get SecurityCode(){
    const to = this.buffer.byteLength;
              
    return this._readString(3, to);
  }
  setSecurityCode(str: string, count = NaN){
    const from = 3;
    for(let i = 0; i < str.length; i++){
      const char = str.charCodeAt(i);
      this.buffer.setUint8(from + i, char);
    }
}
}
export class LuckyNumberRequestPacket {
  buffer!: DataView;
  static readonly Name = `LuckyNumberRequest`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `The player requests to redeem a coupon code (lucky number) which is 12 alphanumeric digits long.`;
  static readonly CausedReaction = `A response is sent back to the client with the result. An item could be rewarded to the inventory.`;
  static readonly Length = 18;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x9D;

  static getRequiredSize(dataSize:number){
    return LuckyNumberRequestPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, LuckyNumberRequestPacket.HeaderCode);
    b.setUint8(LuckyNumberRequestPacket.DataOffset, LuckyNumberRequestPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = LuckyNumberRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  private _readString (from :number, to: number): string {
    return readWireString(this.buffer, from, to);
  }

  static createPacket(requiredSize: number = 18): LuckyNumberRequestPacket {
    const p = new LuckyNumberRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Serial1(){
    const to = 7;
              
    return this._readString(3, to);
  }
  setSerial1(str: string, count = 4){
    const from = 3;
    for(let i = 0; i < str.length; i++){
      const char = str.charCodeAt(i);
      this.buffer.setUint8(from + i, char);
    }
}
  get Serial2(){
    const to = 12;
              
    return this._readString(8, to);
  }
  setSerial2(str: string, count = 4){
    const from = 8;
    for(let i = 0; i < str.length; i++){
      const char = str.charCodeAt(i);
      this.buffer.setUint8(from + i, char);
    }
}
  get Serial3(){
    const to = 17;
              
    return this._readString(13, to);
  }
  setSerial3(str: string, count = 4){
    const from = 13;
    for(let i = 0; i < str.length; i++){
      const char = str.charCodeAt(i);
      this.buffer.setUint8(from + i, char);
    }
}
}
export class BloodCastleEnterRequestPacket {
  buffer!: DataView;
  static readonly Name = `BloodCastleEnterRequest`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `The player requests to enter the blood castle through the Archangel Messenger NPC.`;
  static readonly CausedReaction = `The server checks if the player can enter the event and sends a response (Code 0x9A) back to the client. If it was successful, the character gets moved to the event map.`;
  static readonly Length = 5;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x9A;

  static getRequiredSize(dataSize:number){
    return BloodCastleEnterRequestPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, BloodCastleEnterRequestPacket.HeaderCode);
    b.setUint8(BloodCastleEnterRequestPacket.DataOffset, BloodCastleEnterRequestPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = BloodCastleEnterRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 5): BloodCastleEnterRequestPacket {
    const p = new BloodCastleEnterRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get CastleLevel() {
    return GetByteValue(this.buffer.getUint8(3), 8, 0);
  }
  set CastleLevel(value: number) {
    const oldByte = this.buffer.getUint8(3);
    this.buffer.setUint8(3, SetByteValue(oldByte, value, 8, 0));
  }
  get TicketItemInventoryIndex() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set TicketItemInventoryIndex(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }
}
export class MiniGameEventCountRequestPacket {
  buffer!: DataView;
  static readonly Name = `MiniGameEventCountRequest`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `The player requests to get the entering count of the specified mini game.`;
  static readonly CausedReaction = `The remaining time is sent back to the client. However, it's not really handled on the known server sources.`;
  static readonly Length = 4;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x9F;

  static getRequiredSize(dataSize:number){
    return MiniGameEventCountRequestPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, MiniGameEventCountRequestPacket.HeaderCode);
    b.setUint8(MiniGameEventCountRequestPacket.DataOffset, MiniGameEventCountRequestPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = MiniGameEventCountRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 4): MiniGameEventCountRequestPacket {
    const p = new MiniGameEventCountRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get MiniGame():Byte{
    return GetByteValue(this.buffer.getUint8(3), 8, 0);
  }
  set MiniGame(value: Byte){
    const oldValue = this.MiniGame;
    this.buffer.setUint8(3, SetByteValue(oldValue, value, 8, 0));
  }
}
export class ChaosCastleEnterRequestPacket {
  buffer!: DataView;
  static readonly Name = `ChaosCastleEnterRequest`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `The player requests to enter the chaos castle by using the 'Armor of Guardsman' item.`;
  static readonly CausedReaction = `The server checks if the player can enter the event and sends a response (Code 0xAF) back to the client. If it was successful, the character gets moved to the event map.`;
  static readonly Length = 6;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xAF;
  static readonly SubCode = 0x01;

  static getRequiredSize(dataSize:number){
    return ChaosCastleEnterRequestPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, ChaosCastleEnterRequestPacket.HeaderCode);
    b.setUint8(ChaosCastleEnterRequestPacket.DataOffset, ChaosCastleEnterRequestPacket.Code);
  b.setUint8(ChaosCastleEnterRequestPacket.DataOffset + 1, ChaosCastleEnterRequestPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = ChaosCastleEnterRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 6): ChaosCastleEnterRequestPacket {
    const p = new ChaosCastleEnterRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get CastleLevel() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set CastleLevel(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }
  get TicketItemInventoryIndex() {
    return GetByteValue(this.buffer.getUint8(5), 8, 0);
  }
  set TicketItemInventoryIndex(value: number) {
    const oldByte = this.buffer.getUint8(5);
    this.buffer.setUint8(5, SetByteValue(oldByte, value, 8, 0));
  }
}
export class ChaosCastlePositionSetPacket {
  buffer!: DataView;
  static readonly Name = `ChaosCastlePositionSet`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `The game client noticed, that the coordinates of the player is not on the ground anymore. It requests to set the specified coordinates.`;
  static readonly CausedReaction = `The server sets the player on the new coordinates. Not handled on OpenMU.`;
  static readonly Length = 6;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xAF;
  static readonly SubCode = 0x02;

  static getRequiredSize(dataSize:number){
    return ChaosCastlePositionSetPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, ChaosCastlePositionSetPacket.HeaderCode);
    b.setUint8(ChaosCastlePositionSetPacket.DataOffset, ChaosCastlePositionSetPacket.Code);
  b.setUint8(ChaosCastlePositionSetPacket.DataOffset + 1, ChaosCastlePositionSetPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = ChaosCastlePositionSetPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 6): ChaosCastlePositionSetPacket {
    const p = new ChaosCastlePositionSetPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get PositionX() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set PositionX(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }
  get PositionY() {
    return GetByteValue(this.buffer.getUint8(5), 8, 0);
  }
  set PositionY(value: number) {
    const oldByte = this.buffer.getUint8(5);
    this.buffer.setUint8(5, SetByteValue(oldByte, value, 8, 0));
  }
}
export class DuelStartRequestPacket {
  buffer!: DataView;
  static readonly Name = `DuelStartRequest`;
  static readonly HeaderType = `C3HeaderWithSubCode`;
  static readonly HeaderCode = 0xC3;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `The player requests to start a duel with another player.`;
  static readonly CausedReaction = `The server sends a request to the other player.`;
  static readonly Length = 16;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xAA;
  static readonly SubCode = 0x01;

  static getRequiredSize(dataSize:number){
    return DuelStartRequestPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, DuelStartRequestPacket.HeaderCode);
    b.setUint8(DuelStartRequestPacket.DataOffset, DuelStartRequestPacket.Code);
  b.setUint8(DuelStartRequestPacket.DataOffset + 1, DuelStartRequestPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = DuelStartRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  private _readString (from :number, to: number): string {
    return readWireString(this.buffer, from, to);
  }

  static createPacket(requiredSize: number = 16): DuelStartRequestPacket {
    const p = new DuelStartRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get PlayerId(){
    return this.buffer.getUint16(4, false);
  }
  set PlayerId(value: number){
    this.buffer.setUint16(4, value, false);
  }
  get PlayerName(){
    const to = 16;
              
    return this._readString(6, to);
  }
  setPlayerName(str: string, count = 10){
    const from = 6;
    for(let i = 0; i < str.length; i++){
      const char = str.charCodeAt(i);
      this.buffer.setUint8(from + i, char);
    }
}
}
export class DuelStartResponsePacket {
  buffer!: DataView;
  static readonly Name = `DuelStartResponse`;
  static readonly HeaderType = `C3HeaderWithSubCode`;
  static readonly HeaderCode = 0xC3;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `A player requested to start a duel with the sending player.`;
  static readonly CausedReaction = `Depending on the response, the server starts the duel, or not.`;
  static readonly Length = 17;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xAA;
  static readonly SubCode = 0x02;

  static getRequiredSize(dataSize:number){
    return DuelStartResponsePacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, DuelStartResponsePacket.HeaderCode);
    b.setUint8(DuelStartResponsePacket.DataOffset, DuelStartResponsePacket.Code);
  b.setUint8(DuelStartResponsePacket.DataOffset + 1, DuelStartResponsePacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = DuelStartResponsePacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  private _readString (from :number, to: number): string {
    return readWireString(this.buffer, from, to);
  }

  static createPacket(requiredSize: number = 17): DuelStartResponsePacket {
    const p = new DuelStartResponsePacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Response(){
    return GetBoolean(this.buffer.getUint8(4), 0);
  }
  set Response(value: boolean){
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetBoolean(oldByte, value, 0));
  }
  get PlayerId(){
    return this.buffer.getUint16(5, true);
  }
  set PlayerId(value: number){
    this.buffer.setUint16(5, value, true);
  }
  get PlayerName(){
    const to = 17;
              
    return this._readString(7, to);
  }
  setPlayerName(str: string, count = 10){
    const from = 7;
    for(let i = 0; i < str.length; i++){
      const char = str.charCodeAt(i);
      this.buffer.setUint8(from + i, char);
    }
}
}
export class DuelStopRequestPacket {
  buffer!: DataView;
  static readonly Name = `DuelStopRequest`;
  static readonly HeaderType = `C3HeaderWithSubCode`;
  static readonly HeaderCode = 0xC3;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `A player requested to stop the duel.`;
  static readonly CausedReaction = `The server stops the duel.`;
  static readonly Length = 4;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xAA;
  static readonly SubCode = 0x03;

  static getRequiredSize(dataSize:number){
    return DuelStopRequestPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, DuelStopRequestPacket.HeaderCode);
    b.setUint8(DuelStopRequestPacket.DataOffset, DuelStopRequestPacket.Code);
  b.setUint8(DuelStopRequestPacket.DataOffset + 1, DuelStopRequestPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = DuelStopRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 4): DuelStopRequestPacket {
    const p = new DuelStopRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
}
export class DuelChannelJoinRequestPacket {
  buffer!: DataView;
  static readonly Name = `DuelChannelJoinRequest`;
  static readonly HeaderType = `C3HeaderWithSubCode`;
  static readonly HeaderCode = 0xC3;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `A player requested to join the duel as a spectator.`;
  static readonly CausedReaction = `The server will add the player as spectator.`;
  static readonly Length = 5;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xAA;
  static readonly SubCode = 0x07;

  static getRequiredSize(dataSize:number){
    return DuelChannelJoinRequestPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, DuelChannelJoinRequestPacket.HeaderCode);
    b.setUint8(DuelChannelJoinRequestPacket.DataOffset, DuelChannelJoinRequestPacket.Code);
  b.setUint8(DuelChannelJoinRequestPacket.DataOffset + 1, DuelChannelJoinRequestPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = DuelChannelJoinRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 5): DuelChannelJoinRequestPacket {
    const p = new DuelChannelJoinRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get ChannelId() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set ChannelId(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }
}
export class DuelChannelQuitRequestPacket {
  buffer!: DataView;
  static readonly Name = `DuelChannelQuitRequest`;
  static readonly HeaderType = `C3HeaderWithSubCode`;
  static readonly HeaderCode = 0xC3;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `A player requested to quit the duel as a spectator.`;
  static readonly CausedReaction = `The server will remove the player as spectator.`;
  static readonly Length = 4;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xAA;
  static readonly SubCode = 0x09;

  static getRequiredSize(dataSize:number){
    return DuelChannelQuitRequestPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, DuelChannelQuitRequestPacket.HeaderCode);
    b.setUint8(DuelChannelQuitRequestPacket.DataOffset, DuelChannelQuitRequestPacket.Code);
  b.setUint8(DuelChannelQuitRequestPacket.DataOffset + 1, DuelChannelQuitRequestPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = DuelChannelQuitRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 4): DuelChannelQuitRequestPacket {
    const p = new DuelChannelQuitRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
}
export class ChatCommandListRequestPacket {
  buffer!: DataView;
  static readonly Name = `ChatCommandListRequest`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `A client which supports a user interface for chat commands requests the list of commands which are available to the player. It's usually sent after the character entered the game world.`;
  static readonly CausedReaction = `The server sends an AvailableChatCommand message for each available chat command.`;
  static readonly Length = 4;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xF5;
  static readonly SubCode = 0x00;

  static getRequiredSize(dataSize:number){
    return ChatCommandListRequestPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, ChatCommandListRequestPacket.HeaderCode);
    b.setUint8(ChatCommandListRequestPacket.DataOffset, ChatCommandListRequestPacket.Code);
  b.setUint8(ChatCommandListRequestPacket.DataOffset + 1, ChatCommandListRequestPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = ChatCommandListRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 4): ChatCommandListRequestPacket {
    const p = new ChatCommandListRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
}
export class MarketplaceEscrowRequestPacket {
  buffer!: DataView;
  static readonly Name = `MarketplaceEscrowRequest`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `The marketplace window relays a signed escrow token the marketplace service minted for a list, cancel, buy or collect.`;
  static readonly CausedReaction = `The server verifies the token, moves the item or the Zen in the player's own session and answers with a MarketplaceEscrowResult.`;
  static readonly Length = undefined;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xE7;
  static readonly SubCode = 0x01;

  static getRequiredSize(dataSize:number){
    return MarketplaceEscrowRequestPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, MarketplaceEscrowRequestPacket.HeaderCode);
    b.setUint8(MarketplaceEscrowRequestPacket.DataOffset, MarketplaceEscrowRequestPacket.Code);
  b.setUint8(MarketplaceEscrowRequestPacket.DataOffset + 1, MarketplaceEscrowRequestPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = MarketplaceEscrowRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number): MarketplaceEscrowRequestPacket {
    const p = new MarketplaceEscrowRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Token(){
    const to = this.buffer.byteLength;
    const i = 4;
              
    return new DataView(this.buffer.buffer.slice(i,to));
  }
  setToken(data: ArrayLike<number>, count = NaN){
    if (data.length !== count) throw new Error(`data.length must be ${count}`);
    const from = 4;

    for (let i = 0; i < data.length; i++) {
      this.buffer.setUint8(from + i, data[i]);
    }
}
}
export class LoginTokenRequestPacket {
  buffer!: DataView;
  static readonly Name = `LoginTokenRequest`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `After a password login, at the character list, on a world whose server.json offers login tokens, when the player ticked "remember".`;
  static readonly CausedReaction = `Our OpenMU plugin issues a login token for the account (at most one per connection) and answers with a LoginTokenAnswer.`;
  static readonly Length = 4;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xE7;
  static readonly SubCode = 0x03;

  static getRequiredSize(dataSize:number){
    return LoginTokenRequestPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, LoginTokenRequestPacket.HeaderCode);
    b.setUint8(LoginTokenRequestPacket.DataOffset, LoginTokenRequestPacket.Code);
  b.setUint8(LoginTokenRequestPacket.DataOffset + 1, LoginTokenRequestPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = LoginTokenRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 4): LoginTokenRequestPacket {
    const p = new LoginTokenRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
}
export class TokenLoginPacket {
  buffer!: DataView;
  static readonly Name = `TokenLogin`;
  static readonly HeaderType = `C3HeaderWithSubCode`;
  static readonly HeaderCode = 0xC3;
  static readonly Direction = 'ClientToServer';
  static readonly SentWhen = `Instead of the login (LoginShortPassword), when the client keeps a login token for the account on this world.`;
  static readonly CausedReaction = `Our OpenMU plugin checks the token and logs the account in the way OpenMU's own login does, answering with a LoginResponse. On success it replaces the token with a new one and sends it in a LoginTokenAnswer.`;
  static readonly Length = 51;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xE7;
  static readonly SubCode = 0x05;

  static getRequiredSize(dataSize:number){
    return TokenLoginPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, TokenLoginPacket.HeaderCode);
    b.setUint8(TokenLoginPacket.DataOffset, TokenLoginPacket.Code);
  b.setUint8(TokenLoginPacket.DataOffset + 1, TokenLoginPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = TokenLoginPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 51): TokenLoginPacket {
    const p = new TokenLoginPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Username(){
    const to = 14;
    const i = 4;
              
    return new DataView(this.buffer.buffer.slice(i,to));
  }
  setUsername(data: ArrayLike<number>, count = 10){
    if (data.length !== count) throw new Error(`data.length must be ${count}`);
    const from = 4;

    for (let i = 0; i < data.length; i++) {
      this.buffer.setUint8(from + i, data[i]);
    }
}
  get Token(){
    const to = 46;
    const i = 14;
              
    return new DataView(this.buffer.buffer.slice(i,to));
  }
  setToken(data: ArrayLike<number>, count = 32){
    if (data.length !== count) throw new Error(`data.length must be ${count}`);
    const from = 14;

    for (let i = 0; i < data.length; i++) {
      this.buffer.setUint8(from + i, data[i]);
    }
}
  get ClientVersion(){
    const to = 51;
    const i = 46;
              
    return new DataView(this.buffer.buffer.slice(i,to));
  }
  setClientVersion(data: ArrayLike<number>, count = 5){
    if (data.length !== count) throw new Error(`data.length must be ${count}`);
    const from = 46;

    for (let i = 0; i < data.length; i++) {
      this.buffer.setUint8(from + i, data[i]);
    }
}
}

export const ClientToServerPackets = [
  PingPacket,
  ChecksumResponsePacket,
  PublicChatMessagePacket,
  WhisperMessagePacket,
  LoginLongPasswordPacket,
  LoginShortPasswordPacket,
  Login075Packet,
  LogOutPacket,
  LogOutByCheatDetectionPacket,
  ResetCharacterPointRequestPacket,
  PlayerShopSetItemPricePacket,
  PlayerShopOpenPacket,
  PlayerShopClosePacket,
  PlayerShopItemListRequestPacket,
  PlayerShopItemBuyRequestPacket,
  PlayerShopCloseOtherPacket,
  PickupItemRequestPacket,
  PickupItemRequest075Packet,
  DropItemRequestPacket,
  ItemMoveRequestPacket,
  ItemMoveRequestExtendedPacket,
  ConsumeItemRequestPacket,
  ConsumeItemRequest075Packet,
  TalkToNpcRequestPacket,
  CloseNpcRequestPacket,
  BuyItemFromNpcRequestPacket,
  SellItemToNpcRequestPacket,
  RepairItemRequestPacket,
  WarpCommandRequestPacket,
  EnterGateRequestPacket,
  EnterGateRequest075Packet,
  TeleportTargetPacket,
  ServerChangeAuthenticationPacket,
  CastleSiegeStatusRequestPacket,
  CastleSiegeRegistrationRequestPacket,
  CastleSiegeUnregisterRequestPacket,
  CastleSiegeRegistrationStateRequestPacket,
  CastleSiegeMarkRegistrationPacket,
  CastleSiegeDefenseBuyRequestPacket,
  CastleSiegeDefenseRepairRequestPacket,
  CastleSiegeDefenseUpgradeRequestPacket,
  CastleSiegeTaxInfoRequestPacket,
  CastleSiegeTaxChangeRequestPacket,
  CastleSiegeTaxMoneyWithdrawPacket,
  ToggleCastleGateRequestPacket,
  CastleGuildCommandPacket,
  CastleSiegeHuntingZoneEntranceSettingPacket,
  CastleSiegeGateListRequestPacket,
  CastleSiegeStatueListRequestPacket,
  CastleSiegeRegisteredGuildsListRequestPacket,
  CastleOwnerListRequestPacket,
  FireCatapultRequestPacket,
  WeaponExplosionRequestPacket,
  GuildLogoOfCastleOwnerRequestPacket,
  CastleSiegeHuntingZoneEnterRequestPacket,
  CrywolfInfoRequestPacket,
  CrywolfContractRequestPacket,
  CrywolfChaosRateBenefitRequestPacket,
  WhiteAngelItemRequestPacket,
  EnterOnWerewolfRequestPacket,
  EnterOnGatekeeperRequestPacket,
  LeoHelperItemRequestPacket,
  MoveToDeviasBySnowmanRequestPacket,
  SantaClausItemRequestPacket,
  KanturuInfoRequestPacket,
  KanturuEnterRequestPacket,
  RaklionStateInfoRequestPacket,
  CashShopPointInfoRequestPacket,
  CashShopOpenStatePacket,
  CashShopItemBuyRequestPacket,
  CashShopItemGiftRequestPacket,
  CashShopStorageListRequestPacket,
  CashShopDeleteStorageItemRequestPacket,
  CashShopStorageItemConsumeRequestPacket,
  CashShopEventItemListRequestPacket,
  UnlockVaultPacket,
  SetVaultPinPacket,
  RemoveVaultPinPacket,
  VaultClosedPacket,
  VaultMoveMoneyRequestPacket,
  LahapJewelMixRequestPacket,
  PartyListRequestPacket,
  PartyPlayerKickRequestPacket,
  PartyInviteRequestPacket,
  PartyInviteResponsePacket,
  WalkRequestPacket,
  WalkRequest075Packet,
  InstantMoveRequestPacket,
  AnimationRequestPacket,
  RequestCharacterListPacket,
  CreateCharacterPacket,
  DeleteCharacterPacket,
  SelectCharacterPacket,
  FocusCharacterPacket,
  IncreaseCharacterStatPointPacket,
  InventoryRequestPacket,
  ClientReadyAfterMapChangePacket,
  SaveKeyConfigurationPacket,
  AddMasterSkillPointPacket,
  HitRequestPacket,
  TargetedSkillPacket,
  TargetedSkill075Packet,
  TargetedSkill095Packet,
  MagicEffectCancelRequestPacket,
  AreaSkillPacket,
  AreaSkillHitPacket,
  AreaSkill075Packet,
  AreaSkillHit075Packet,
  AreaSkill095Packet,
  AreaSkillHit095Packet,
  RageAttackRequestPacket,
  RageAttackRangeRequestPacket,
  TradeCancelPacket,
  TradeButtonStateChangePacket,
  TradeRequestPacket,
  TradeRequestResponsePacket,
  SetTradeMoneyPacket,
  LetterDeleteRequestPacket,
  LetterListRequestPacket,
  LetterSendRequestPacket,
  LetterReadRequestPacket,
  GuildKickPlayerRequestPacket,
  GuildJoinRequestPacket,
  GuildJoinResponsePacket,
  GuildListRequestPacket,
  GuildCreateRequestPacket,
  GuildCreateRequest075Packet,
  GuildMasterAnswerPacket,
  CancelGuildCreationPacket,
  GuildWarResponsePacket,
  GuildInfoRequestPacket,
  GuildRoleAssignRequestPacket,
  GuildTypeChangeRequestPacket,
  GuildRelationshipChangeRequestPacket,
  GuildRelationshipChangeResponsePacket,
  RequestAllianceListPacket,
  RemoveAllianceGuildRequestPacket,
  PingResponsePacket,
  ItemRepairPacket,
  ChaosMachineMixRequestPacket,
  CraftingDialogCloseRequestPacket,
  FriendListRequestPacket,
  FriendAddRequestPacket,
  FriendDeletePacket,
  ChatRoomCreateRequestPacket,
  FriendAddResponsePacket,
  SetFriendOnlineStatePacket,
  ChatRoomInvitationRequestPacket,
  LegacyQuestStateRequestPacket,
  LegacyQuestStateSetRequestPacket,
  PetCommandRequestPacket,
  PetInfoRequestPacket,
  IllusionTempleEnterRequestPacket,
  IllusionTempleSkillRequestPacket,
  IllusionTempleRewardRequestPacket,
  LuckyCoinCountRequestPacket,
  LuckyCoinRegistrationRequestPacket,
  LuckyCoinExchangeRequestPacket,
  DoppelgangerEnterRequestPacket,
  EnterMarketPlaceRequestPacket,
  MuHelperStatusChangeRequestPacket,
  MuHelperSaveDataRequestPacket,
  QuestSelectRequestPacket,
  QuestProceedRequestPacket,
  QuestCompletionRequestPacket,
  QuestCancelRequestPacket,
  QuestClientActionRequestPacket,
  ActiveQuestListRequestPacket,
  QuestStateRequestPacket,
  EventQuestStateListRequestPacket,
  AvailableQuestsRequestPacket,
  NpcBuffRequestPacket,
  EnterEmpireGuardianEventPacket,
  GensJoinRequestPacket,
  GensLeaveRequestPacket,
  GensRewardRequestPacket,
  GensRankingRequestPacket,
  DevilSquareEnterRequestPacket,
  MiniGameOpeningStateRequestPacket,
  EventChipRegistrationRequestPacket,
  MutoNumberRequestPacket,
  EventChipExitDialogPacket,
  EventChipExchangeRequestPacket,
  ServerImmigrationRequestPacket,
  LuckyNumberRequestPacket,
  BloodCastleEnterRequestPacket,
  MiniGameEventCountRequestPacket,
  ChaosCastleEnterRequestPacket,
  ChaosCastlePositionSetPacket,
  DuelStartRequestPacket,
  DuelStartResponsePacket,
  DuelStopRequestPacket,
  DuelChannelJoinRequestPacket,
  DuelChannelQuitRequestPacket,
  ChatCommandListRequestPacket,
  MarketplaceEscrowRequestPacket,
  LoginTokenRequestPacket,
  TokenLoginPacket
] as const;