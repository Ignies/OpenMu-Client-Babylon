
import { CharacterClassNumber } from '../../../src/core/types';
import { SetByteValue, GetByteValue, GetBoolean, SetBoolean, readWireString } from '../../../src/core/binaryUtils';

export enum GuildMemberRoleEnum {
  NormalMember = 0,
  BattleMaster = 32,
  AssistantMaster = 64,
  GuildMaster = 128,
  Undefined = 255
}

export enum GuildWarTypeEnum {
  Normal = 0,
  Soccer = 1
}

export enum GuildRelationshipTypeEnum {
  Undefined = 0,
  Alliance = 1,
  Hostility = 2
}

export enum GuildRelationshipRequestTypeEnum {
  Undefined = 0,
  Join = 1,
  Leave = 2
}

export enum CharacterStatusEnum {
  Normal = 0,
  Banned = 1,
  GameMaster = 32
}

export enum ConditionTypeEnum {
  None = 0,
  MonsterKills = 1,
  Skill = 2,
  Item = 4,
  Level = 8,
  ClientAction = 16,
  RequestBuff = 32,
  EventMapPlayerKills = 64,
  EventMapMonsterKills = 65,
  BloodCastleGate = 66,
  WinBloodCastle = 256,
  WinChaosCastle = 257,
  WinDevilSquare = 258,
  WinIllusionTemple = 259,
  DevilSquarePoints = 260,
  Money = 261,
  PvpPoints = 262,
  NpcTalk = 263
}

export enum ConditionTypeExtendedEnum {
  None = 0,
  MonsterKills = 1,
  Skill = 2,
  Item = 3,
  Level = 4,
  ClientAction = 5,
  RequestBuff = 6,
  EventMapPlayerKills = 7,
  EventMapMonsterKills = 8,
  BloodCastleGate = 9,
  WinBloodCastle = 10,
  WinChaosCastle = 11,
  WinDevilSquare = 12,
  WinIllusionTemple = 13,
  DevilSquarePoints = 14,
  Money = 15,
  PvpPoints = 16,
  NpcTalk = 17
}

export enum RewardTypeEnum {
  None = 0,
  Experience = 1,
  Money = 2,
  Item = 4,
  GensContribution = 16,
  Random = 32
}

export enum SocketOptionEnum {
  FireAttackWizByLevelIncrease = 0,
  FireAttackSpeedIncrease = 1,
  FireMaxDmgIncrease = 2,
  FireMinDmgIncrease = 3,
  FireAttackWizIncrease = 4,
  FireAgCostDecrease = 5,
  WaterBlockRateIncrease = 10,
  WaterDefenseIncrease = 11,
  WaterShieldProtectionIncrease = 12,
  WaterDamageReduction4 = 13,
  WaterDamageReduction5 = 14,
  IceLifeIncrease = 16,
  IceManaIncrease = 17,
  IceSkillAttackIncrease = 18,
  IceAttackRateIncrease = 19,
  IceDurabilityIncrease = 20,
  WindAutoLifeRecoveryIncrease = 21,
  WindMaxHealthIncrease = 22,
  WindMaxManaIncrease = 23,
  WindAutoManaRecoverIncrease = 24,
  WindMaxAgIncrease = 25,
  WindAutoAgRecoverIncrease = 26,
  LightningExcDmgIncrease = 29,
  LightningExcDmgRateIncrease = 30,
  LightningCritDmgIncrease = 31,
  LightningCritDmgRateIncrease = 32,
  EarthHealhIncrease = 36,
  EmptySocket = 254,
  NoSocket = 255
}

export enum CharacterCreationUnlockFlagsEnum {
  None = 0,
  Summoner = 1,
  DarkLord = 2,
  MagicGladiator = 4,
  RageFighter = 8
}

export enum DamageKindEnum {
  NormalRed = 0,
  IgnoreDefenseCyan = 1,
  ExcellentLightGreen = 2,
  CriticalBlue = 3,
  ReflectedLightPink = 4,
  PoisonDarkGreen = 5,
  DarkPink = 6,
  White = 7
}

export enum ChatCommandParameterTypeEnum {
  Text = 0,
  Number = 1,
  Boolean = 2
}

export enum CastleSiegeStateEnum {
  Idle1 = 0,
  RegisterGuild = 1,
  Idle2 = 2,
  RegisterMark = 3,
  Idle3 = 4,
  Notify = 5,
  Ready = 6,
  Start = 7,
  End = 8,
  EndCycle = 9
}

export enum CastleSiegeTaxTypeEnum {
  Undefined = 0,
  ChaosMachine = 1,
  Store = 2,
  HuntingZoneEntranceFee = 3
}

export enum CastleSiegeCrownSwitchStateTypeEnum {
  Released = 0,
  OccupiedByCurrentPlayer = 1,
  OccupiedByOtherPlayer = 2
}

export enum CastleSiegeCrownAccessStateTypeEnum {
  Started = 0,
  Succeeded = 1,
  Failed = 2,
  OccupiedByOtherPlayer = 3,
  OccupiedByOtherSide = 4
}

export enum CastleSiegeCrownStateEnum {
  Accessible = 0,
  Protected = 1,
  RegistrationSucceeded = 2
}

export enum CastleSiegeBattleProcessStateEnum {
  CrownRegistrationStarted = 0,
  CrownRegistrationSucceeded = 1
}

export enum CastleSiegeJoinSideEnum {
  None = 0,
  Defense = 1,
  Attack1 = 2,
  Attack2 = 3,
  Attack3 = 4
}

export enum CastleSiegeGuildCommandTypeEnum {
  Attack = 0,
  Defend = 1,
  Wait = 2
}

export enum CastleSiegeMachineTypeEnum {
  Attack = 1,
  Defense = 2
}

export enum CastleSiegeMiniMapNpcTypeEnum {
  Gate = 0,
  GuardianStatue = 1
}

export class GameServerEnteredPacket {
  buffer!: DataView;
  static readonly Name = `GameServerEntered`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `After a game client has connected to the game.`;
  static readonly CausedReaction = `It shows the login dialog.`;
  static readonly Length = 12;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xF1;
  static readonly SubCode = 0x00;

  static getRequiredSize(dataSize:number){
    return GameServerEnteredPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, GameServerEnteredPacket.HeaderCode);
    b.setUint8(GameServerEnteredPacket.DataOffset, GameServerEnteredPacket.Code);
  b.setUint8(GameServerEnteredPacket.DataOffset + 1, GameServerEnteredPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = GameServerEnteredPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  private _readString (from :number, to: number): string {
    return readWireString(this.buffer, from, to);
  }

  static createPacket(requiredSize: number = 12): GameServerEnteredPacket {
    const p = new GameServerEnteredPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Success(){
    return GetBoolean(this.buffer.getUint8(4), 0);
  }
  set Success(value: boolean){
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetBoolean(oldByte, value, 0));
  }
  get PlayerId(){
    return this.buffer.getUint16(5, false);
  }
  set PlayerId(value: number){
    this.buffer.setUint16(5, value, false);
  }
  get VersionString(){
    const to = 12;
              
    return this._readString(7, to);
  }
  setVersionString(str: string, count = 5){
    const from = 7;
    for(let i = 0; i < str.length; i++){
      const char = str.charCodeAt(i);
      this.buffer.setUint8(from + i, char);
    }
}
  get Version(){
    const to = 12;
    const i = 7;
              
    return new DataView(this.buffer.buffer.slice(i,to));
  }
  setVersion(data: ArrayLike<number>, count = 5){
    if (data.length !== count) throw new Error(`data.length must be ${count}`);
    const from = 7;

    for (let i = 0; i < data.length; i++) {
      this.buffer.setUint8(from + i, data[i]);
    }
}
}
export class MagicEffectStatusPacket {
  buffer!: DataView;
  static readonly Name = `MagicEffectStatus`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `A magic effect was added or removed to the own or another player.`;
  static readonly CausedReaction = `The user interface updates itself. If it's the effect of the own player, it's shown as icon at the top of the interface.`;
  static readonly Length = 7;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x07;

  static getRequiredSize(dataSize:number){
    return MagicEffectStatusPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, MagicEffectStatusPacket.HeaderCode);
    b.setUint8(MagicEffectStatusPacket.DataOffset, MagicEffectStatusPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = MagicEffectStatusPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 7): MagicEffectStatusPacket {
    const p = new MagicEffectStatusPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get IsActive(){
    return GetBoolean(this.buffer.getUint8(3), 0);
  }
  set IsActive(value: boolean){
    const oldByte = this.buffer.getUint8(3);
    this.buffer.setUint8(3, SetBoolean(oldByte, value, 0));
  }
  get PlayerId(){
    return this.buffer.getUint16(4, false);
  }
  set PlayerId(value: number){
    this.buffer.setUint16(4, value, false);
  }
  get EffectId() {
    return GetByteValue(this.buffer.getUint8(6), 8, 0);
  }
  set EffectId(value: number) {
    const oldByte = this.buffer.getUint8(6);
    this.buffer.setUint8(6, SetByteValue(oldByte, value, 8, 0));
  }
}
export class WeatherStatusUpdatePacket {
  buffer!: DataView;
  static readonly Name = `WeatherStatusUpdate`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `The weather on the current map has been changed or the player entered the map.`;
  static readonly CausedReaction = `The game client updates the weather effects.`;
  static readonly Length = 4;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x0F;

  static getRequiredSize(dataSize:number){
    return WeatherStatusUpdatePacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, WeatherStatusUpdatePacket.HeaderCode);
    b.setUint8(WeatherStatusUpdatePacket.DataOffset, WeatherStatusUpdatePacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = WeatherStatusUpdatePacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 4): WeatherStatusUpdatePacket {
    const p = new WeatherStatusUpdatePacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Weather(){
    return GetByteValue(this.buffer.getUint8(3), 4, 4);
  }
  set Weather(value: number) {
    const oldByte = this.buffer.getUint8(3);
    this.buffer.setUint8(3, SetByteValue(oldByte, value, 4, 4));
  }
  get Variation(){
    return GetByteValue(this.buffer.getUint8(3), 4, 0);
  }
  set Variation(value: number) {
    const oldByte = this.buffer.getUint8(3);
    this.buffer.setUint8(3, SetByteValue(oldByte, value, 4, 0));
  }
}
export class AddCharacterToScopeExtendedPacket {
  buffer!: DataView;
  static readonly Name = `AddCharacterToScopeExtended`;
  static readonly HeaderType = `C2Header`;
  static readonly HeaderCode = 0xC2;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `One or more character got into the observed scope of the player.`;
  static readonly CausedReaction = `The client adds the character to the shown map.`;
  static readonly Length = undefined;
  static readonly LengthSize = 2;
  static readonly DataOffset = 3;
  static readonly Code = 0x12;

  static getRequiredSize(dataSize:number){
    return AddCharacterToScopeExtendedPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, AddCharacterToScopeExtendedPacket.HeaderCode);
    b.setUint8(AddCharacterToScopeExtendedPacket.DataOffset, AddCharacterToScopeExtendedPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = AddCharacterToScopeExtendedPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint16(1, l);
    return this;
  }

  private _readString (from :number, to: number): string {
    return readWireString(this.buffer, from, to);
  }

  static createPacket(requiredSize: number): AddCharacterToScopeExtendedPacket {
    const p = new AddCharacterToScopeExtendedPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Id(){
    return this.buffer.getUint16(4, true);
  }
  set Id(value: number){
    this.buffer.setUint16(4, value, true);
  }
  get CurrentPositionX() {
    return GetByteValue(this.buffer.getUint8(6), 8, 0);
  }
  set CurrentPositionX(value: number) {
    const oldByte = this.buffer.getUint8(6);
    this.buffer.setUint8(6, SetByteValue(oldByte, value, 8, 0));
  }
  get CurrentPositionY() {
    return GetByteValue(this.buffer.getUint8(7), 8, 0);
  }
  set CurrentPositionY(value: number) {
    const oldByte = this.buffer.getUint8(7);
    this.buffer.setUint8(7, SetByteValue(oldByte, value, 8, 0));
  }
  get TargetPositionX() {
    return GetByteValue(this.buffer.getUint8(8), 8, 0);
  }
  set TargetPositionX(value: number) {
    const oldByte = this.buffer.getUint8(8);
    this.buffer.setUint8(8, SetByteValue(oldByte, value, 8, 0));
  }
  get TargetPositionY() {
    return GetByteValue(this.buffer.getUint8(9), 8, 0);
  }
  set TargetPositionY(value: number) {
    const oldByte = this.buffer.getUint8(9);
    this.buffer.setUint8(9, SetByteValue(oldByte, value, 8, 0));
  }
  get Rotation(){
    return GetByteValue(this.buffer.getUint8(10), 4, 4);
  }
  set Rotation(value: number) {
    const oldByte = this.buffer.getUint8(10);
    this.buffer.setUint8(10, SetByteValue(oldByte, value, 4, 4));
  }
  get HeroState():Byte{
    return GetByteValue(this.buffer.getUint8(10), 4, 0);
  }
  set HeroState(value: Byte){
    const oldValue = this.HeroState;
    this.buffer.setUint8(10, SetByteValue(oldValue, value, 4, 0));
  }
  get AttackSpeed(){
    return this.buffer.getUint16(12, true);
  }
  set AttackSpeed(value: number){
    this.buffer.setUint16(12, value, true);
  }
  get MagicSpeed(){
    return this.buffer.getUint16(14, true);
  }
  set MagicSpeed(value: number){
    this.buffer.setUint16(14, value, true);
  }
  get Name(){
    const to = 26;
              
    return this._readString(16, to);
  }
  setName(str: string, count = 10){
    const from = 16;
    for(let i = 0; i < str.length; i++){
      const char = str.charCodeAt(i);
      this.buffer.setUint8(from + i, char);
    }
}
  get AppearanceAndEffects(){
    const to = this.buffer.byteLength;
    const i = 26;
              
    return new DataView(this.buffer.buffer.slice(i,to));
  }
  setAppearanceAndEffects(data: ArrayLike<number>, count = NaN){
    if (data.length !== count) throw new Error(`data.length must be ${count}`);
    const from = 26;

    for (let i = 0; i < data.length; i++) {
      this.buffer.setUint8(from + i, data[i]);
    }
}
}
export class AddCharactersToScopePacket {
  buffer!: DataView;
  static readonly Name = `AddCharactersToScope`;
  static readonly HeaderType = `C2Header`;
  static readonly HeaderCode = 0xC2;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `One or more character got into the observed scope of the player.`;
  static readonly CausedReaction = `The client adds the character to the shown map.`;
  static readonly Length = undefined;
  static readonly LengthSize = 2;
  static readonly DataOffset = 3;
  static readonly Code = 0x12;

  static getRequiredSize(dataSize:number){
    return AddCharactersToScopePacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, AddCharactersToScopePacket.HeaderCode);
    b.setUint8(AddCharactersToScopePacket.DataOffset, AddCharactersToScopePacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = AddCharactersToScopePacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint16(1, l);
    return this;
  }

  private _readString (from :number, to: number): string {
    return readWireString(this.buffer, from, to);
  }

  private _readDataView (from: number, to: number): DataView {
    return new DataView(this.buffer.buffer.slice(from, to));
  }

  static createPacket(requiredSize: number): AddCharactersToScopePacket {
    const p = new AddCharactersToScopePacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get CharacterCount() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set CharacterCount(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }

  getCharacters(count: number = this.CharacterCount): {
  Id: ShortBigEndian;
  CurrentPositionX: Byte;
  CurrentPositionY: Byte;
  Appearance: Binary;
  Name: string;
  TargetPositionX: Byte;
  TargetPositionY: Byte;
  Rotation: Byte;
  HeroState: Byte;
  EffectCount: Byte;
  Effects: {
  Id: Byte;

}[];

}[]{
    const b = this.buffer;
    let bi = 0;

    const Characters_count = count;
    const Characters: any[] = new Array(Characters_count);
    
    let Characters_StartOffset = bi + 5;
    for (let i = 0; i < Characters_count; i++) {
      const Id = b.getUint16(Characters_StartOffset + 0, false);
      const CurrentPositionX = b.getUint8(Characters_StartOffset + 2);
      const CurrentPositionY = b.getUint8(Characters_StartOffset + 3);
      const Appearance = this._readDataView(Characters_StartOffset + 4, Characters_StartOffset + 4 + 18);
      const Name = this._readString(Characters_StartOffset + 22, Characters_StartOffset + 22 + 10);
      const TargetPositionX = b.getUint8(Characters_StartOffset + 32);
      const TargetPositionY = b.getUint8(Characters_StartOffset + 33);
      const Rotation = GetByteValue(b.getUint8(Characters_StartOffset + 34), 4, 4);
      const HeroState = GetByteValue(b.getUint8(Characters_StartOffset + 34), 4, 0);
      const EffectCount = b.getUint8(Characters_StartOffset + 35);
const Effects_count = EffectCount;
    const Effects: any[] = new Array(Effects_count);
    
    let Effects_StartOffset = Characters_StartOffset + 36;
    for (let i = 0; i < Effects_count; i++) {
      const Id = b.getUint8(Effects_StartOffset + 0);
      Effects[i] = {
        Id
      };
      Effects_StartOffset += 1;
    }
      Characters[i] = {
        Id,
        CurrentPositionX,
        CurrentPositionY,
        Appearance,
        Name,
        TargetPositionX,
        TargetPositionY,
        Rotation,
        HeroState,
        EffectCount,
        Effects
      };
      Characters_StartOffset += 36 + EffectCount * 1;
    }
    
    return Characters;
  }}
export class AddCharactersToScope075Packet {
  buffer!: DataView;
  static readonly Name = `AddCharactersToScope075`;
  static readonly HeaderType = `C2Header`;
  static readonly HeaderCode = 0xC2;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `One or more character got into the observed scope of the player.`;
  static readonly CausedReaction = `The client adds the character to the shown map.`;
  static readonly Length = undefined;
  static readonly LengthSize = 2;
  static readonly DataOffset = 3;
  static readonly Code = 0x12;

  static getRequiredSize(dataSize:number){
    return AddCharactersToScope075Packet.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, AddCharactersToScope075Packet.HeaderCode);
    b.setUint8(AddCharactersToScope075Packet.DataOffset, AddCharactersToScope075Packet.Code);
  
    return this;
  }

  writeLength(l: number|undefined = AddCharactersToScope075Packet.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint16(1, l);
    return this;
  }

  private _readString (from :number, to: number): string {
    return readWireString(this.buffer, from, to);
  }

  private _readDataView (from: number, to: number): DataView {
    return new DataView(this.buffer.buffer.slice(from, to));
  }

  static createPacket(requiredSize: number): AddCharactersToScope075Packet {
    const p = new AddCharactersToScope075Packet();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get CharacterCount() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set CharacterCount(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }

  getCharacters(count: number = this.CharacterCount): {
  Id: ShortBigEndian;
  CurrentPositionX: Byte;
  CurrentPositionY: Byte;
  Appearance: Binary;
  IsPoisoned: Boolean;
  IsIced: Boolean;
  IsDamageBuffed: Boolean;
  IsDefenseBuffed: Boolean;
  Name: string;
  TargetPositionX: Byte;
  TargetPositionY: Byte;
  Rotation: Byte;
  HeroState: Byte;

}[]{
    const b = this.buffer;
    let bi = 0;

    const Characters_count = count;
    const Characters: any[] = new Array(Characters_count);
    
    let Characters_StartOffset = bi + 5;
    for (let i = 0; i < Characters_count; i++) {
      const Id = b.getUint16(Characters_StartOffset + 0, false);
      const CurrentPositionX = b.getUint8(Characters_StartOffset + 2);
      const CurrentPositionY = b.getUint8(Characters_StartOffset + 3);
      const Appearance = this._readDataView(Characters_StartOffset + 4, Characters_StartOffset + 4 + 9);
      const IsPoisoned = GetBoolean(b.getUint8(Characters_StartOffset + 13), 0);
      const IsIced = GetBoolean(b.getUint8(Characters_StartOffset + 13), 1);
      const IsDamageBuffed = GetBoolean(b.getUint8(Characters_StartOffset + 13), 2);
      const IsDefenseBuffed = GetBoolean(b.getUint8(Characters_StartOffset + 13), 3);
      const Name = this._readString(Characters_StartOffset + 14, Characters_StartOffset + 14 + 10);
      const TargetPositionX = b.getUint8(Characters_StartOffset + 24);
      const TargetPositionY = b.getUint8(Characters_StartOffset + 25);
      const Rotation = GetByteValue(b.getUint8(Characters_StartOffset + 26), 4, 4);
      const HeroState = GetByteValue(b.getUint8(Characters_StartOffset + 26), 4, 0);
      Characters[i] = {
        Id,
        CurrentPositionX,
        CurrentPositionY,
        Appearance,
        IsPoisoned,
        IsIced,
        IsDamageBuffed,
        IsDefenseBuffed,
        Name,
        TargetPositionX,
        TargetPositionY,
        Rotation,
        HeroState
      };
      Characters_StartOffset += 27;
    }
    
    return Characters;
  }}
export class AddCharactersToScope095Packet {
  buffer!: DataView;
  static readonly Name = `AddCharactersToScope095`;
  static readonly HeaderType = `C2Header`;
  static readonly HeaderCode = 0xC2;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `One or more character got into the observed scope of the player.`;
  static readonly CausedReaction = `The client adds the character to the shown map.`;
  static readonly Length = undefined;
  static readonly LengthSize = 2;
  static readonly DataOffset = 3;
  static readonly Code = 0x12;

  static getRequiredSize(dataSize:number){
    return AddCharactersToScope095Packet.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, AddCharactersToScope095Packet.HeaderCode);
    b.setUint8(AddCharactersToScope095Packet.DataOffset, AddCharactersToScope095Packet.Code);
  
    return this;
  }

  writeLength(l: number|undefined = AddCharactersToScope095Packet.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint16(1, l);
    return this;
  }

  private _readString (from :number, to: number): string {
    return readWireString(this.buffer, from, to);
  }

  private _readDataView (from: number, to: number): DataView {
    return new DataView(this.buffer.buffer.slice(from, to));
  }

  static createPacket(requiredSize: number): AddCharactersToScope095Packet {
    const p = new AddCharactersToScope095Packet();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get CharacterCount() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set CharacterCount(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }

  getCharacters(count: number = this.CharacterCount): {
  Id: ShortBigEndian;
  CurrentPositionX: Byte;
  CurrentPositionY: Byte;
  Appearance: Binary;
  IsPoisoned: Boolean;
  IsIced: Boolean;
  IsDamageBuffed: Boolean;
  IsDefenseBuffed: Boolean;
  Name: string;
  TargetPositionX: Byte;
  TargetPositionY: Byte;
  Rotation: Byte;
  HeroState: Byte;

}[]{
    const b = this.buffer;
    let bi = 0;

    const Characters_count = count;
    const Characters: any[] = new Array(Characters_count);
    
    let Characters_StartOffset = bi + 5;
    for (let i = 0; i < Characters_count; i++) {
      const Id = b.getUint16(Characters_StartOffset + 0, false);
      const CurrentPositionX = b.getUint8(Characters_StartOffset + 2);
      const CurrentPositionY = b.getUint8(Characters_StartOffset + 3);
      const Appearance = this._readDataView(Characters_StartOffset + 4, Characters_StartOffset + 4 + 13);
      const IsPoisoned = GetBoolean(b.getUint8(Characters_StartOffset + 17), 0);
      const IsIced = GetBoolean(b.getUint8(Characters_StartOffset + 17), 1);
      const IsDamageBuffed = GetBoolean(b.getUint8(Characters_StartOffset + 17), 2);
      const IsDefenseBuffed = GetBoolean(b.getUint8(Characters_StartOffset + 17), 3);
      const Name = this._readString(Characters_StartOffset + 18, Characters_StartOffset + 18 + 10);
      const TargetPositionX = b.getUint8(Characters_StartOffset + 28);
      const TargetPositionY = b.getUint8(Characters_StartOffset + 29);
      const Rotation = GetByteValue(b.getUint8(Characters_StartOffset + 30), 4, 4);
      const HeroState = GetByteValue(b.getUint8(Characters_StartOffset + 30), 4, 0);
      Characters[i] = {
        Id,
        CurrentPositionX,
        CurrentPositionY,
        Appearance,
        IsPoisoned,
        IsIced,
        IsDamageBuffed,
        IsDefenseBuffed,
        Name,
        TargetPositionX,
        TargetPositionY,
        Rotation,
        HeroState
      };
      Characters_StartOffset += 31;
    }
    
    return Characters;
  }}
export class AddNpcsToScopePacket {
  buffer!: DataView;
  static readonly Name = `AddNpcsToScope`;
  static readonly HeaderType = `C2Header`;
  static readonly HeaderCode = 0xC2;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `One or more NPCs got into the observed scope of the player.`;
  static readonly CausedReaction = `The client adds the NPCs to the shown map.`;
  static readonly Length = undefined;
  static readonly LengthSize = 2;
  static readonly DataOffset = 3;
  static readonly Code = 0x13;

  static getRequiredSize(dataSize:number){
    return AddNpcsToScopePacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, AddNpcsToScopePacket.HeaderCode);
    b.setUint8(AddNpcsToScopePacket.DataOffset, AddNpcsToScopePacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = AddNpcsToScopePacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint16(1, l);
    return this;
  }

  static createPacket(requiredSize: number): AddNpcsToScopePacket {
    const p = new AddNpcsToScopePacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get NpcCount() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set NpcCount(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }

  getNPCs(count: number = this.NpcCount): {
  Id: ShortBigEndian;
  TypeNumber: ShortBigEndian;
  CurrentPositionX: Byte;
  CurrentPositionY: Byte;
  TargetPositionX: Byte;
  TargetPositionY: Byte;
  Rotation: Byte;
  EffectCount: Byte;
  Effects: {
  Id: Byte;

}[];

}[]{
    const b = this.buffer;
    let bi = 0;

    const NPCs_count = count;
    const NPCs: any[] = new Array(NPCs_count);
    
    let NPCs_StartOffset = bi + 5;
    for (let i = 0; i < NPCs_count; i++) {
      const Id = b.getUint16(NPCs_StartOffset + 0, false);
      const TypeNumber = b.getUint16(NPCs_StartOffset + 2, false);
      const CurrentPositionX = b.getUint8(NPCs_StartOffset + 4);
      const CurrentPositionY = b.getUint8(NPCs_StartOffset + 5);
      const TargetPositionX = b.getUint8(NPCs_StartOffset + 6);
      const TargetPositionY = b.getUint8(NPCs_StartOffset + 7);
      const Rotation = GetByteValue(b.getUint8(NPCs_StartOffset + 8), 4, 4);
      const EffectCount = b.getUint8(NPCs_StartOffset + 9);
const Effects_count = EffectCount;
    const Effects: any[] = new Array(Effects_count);
    
    let Effects_StartOffset = NPCs_StartOffset + 10;
    for (let i = 0; i < Effects_count; i++) {
      const Id = b.getUint8(Effects_StartOffset + 0);
      Effects[i] = {
        Id
      };
      Effects_StartOffset += 1;
    }
      NPCs[i] = {
        Id,
        TypeNumber,
        CurrentPositionX,
        CurrentPositionY,
        TargetPositionX,
        TargetPositionY,
        Rotation,
        EffectCount,
        Effects
      };
      NPCs_StartOffset += 10 + EffectCount * 1;
    }
    
    return NPCs;
  }}
export class AddNpcsToScope075Packet {
  buffer!: DataView;
  static readonly Name = `AddNpcsToScope075`;
  static readonly HeaderType = `C2Header`;
  static readonly HeaderCode = 0xC2;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `One or more NPCs got into the observed scope of the player.`;
  static readonly CausedReaction = `The client adds the NPCs to the shown map.`;
  static readonly Length = undefined;
  static readonly LengthSize = 2;
  static readonly DataOffset = 3;
  static readonly Code = 0x13;

  static getRequiredSize(dataSize:number){
    return AddNpcsToScope075Packet.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, AddNpcsToScope075Packet.HeaderCode);
    b.setUint8(AddNpcsToScope075Packet.DataOffset, AddNpcsToScope075Packet.Code);
  
    return this;
  }

  writeLength(l: number|undefined = AddNpcsToScope075Packet.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint16(1, l);
    return this;
  }

  static createPacket(requiredSize: number): AddNpcsToScope075Packet {
    const p = new AddNpcsToScope075Packet();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get NpcCount() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set NpcCount(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }

  getNPCs(count: number = this.NpcCount): {
  Id: ShortBigEndian;
  TypeNumber: Byte;
  IsPoisoned: Boolean;
  IsIced: Boolean;
  IsDamageBuffed: Boolean;
  IsDefenseBuffed: Boolean;
  CurrentPositionX: Byte;
  CurrentPositionY: Byte;
  TargetPositionX: Byte;
  TargetPositionY: Byte;
  Rotation: Byte;

}[]{
    const b = this.buffer;
    let bi = 0;

    const NPCs_count = count;
    const NPCs: any[] = new Array(NPCs_count);
    
    let NPCs_StartOffset = bi + 5;
    for (let i = 0; i < NPCs_count; i++) {
      const Id = b.getUint16(NPCs_StartOffset + 0, false);
      const TypeNumber = b.getUint8(NPCs_StartOffset + 2);
      const IsPoisoned = GetBoolean(b.getUint8(NPCs_StartOffset + 3), 0);
      const IsIced = GetBoolean(b.getUint8(NPCs_StartOffset + 3), 1);
      const IsDamageBuffed = GetBoolean(b.getUint8(NPCs_StartOffset + 3), 2);
      const IsDefenseBuffed = GetBoolean(b.getUint8(NPCs_StartOffset + 3), 3);
      const CurrentPositionX = b.getUint8(NPCs_StartOffset + 4);
      const CurrentPositionY = b.getUint8(NPCs_StartOffset + 5);
      const TargetPositionX = b.getUint8(NPCs_StartOffset + 6);
      const TargetPositionY = b.getUint8(NPCs_StartOffset + 7);
      const Rotation = GetByteValue(b.getUint8(NPCs_StartOffset + 8), 4, 4);
      NPCs[i] = {
        Id,
        TypeNumber,
        IsPoisoned,
        IsIced,
        IsDamageBuffed,
        IsDefenseBuffed,
        CurrentPositionX,
        CurrentPositionY,
        TargetPositionX,
        TargetPositionY,
        Rotation
      };
      NPCs_StartOffset += 9;
    }
    
    return NPCs;
  }}
export class AddNpcsToScope095Packet {
  buffer!: DataView;
  static readonly Name = `AddNpcsToScope095`;
  static readonly HeaderType = `C2Header`;
  static readonly HeaderCode = 0xC2;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `One or more NPCs got into the observed scope of the player.`;
  static readonly CausedReaction = `The client adds the NPCs to the shown map.`;
  static readonly Length = undefined;
  static readonly LengthSize = 2;
  static readonly DataOffset = 3;
  static readonly Code = 0x13;

  static getRequiredSize(dataSize:number){
    return AddNpcsToScope095Packet.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, AddNpcsToScope095Packet.HeaderCode);
    b.setUint8(AddNpcsToScope095Packet.DataOffset, AddNpcsToScope095Packet.Code);
  
    return this;
  }

  writeLength(l: number|undefined = AddNpcsToScope095Packet.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint16(1, l);
    return this;
  }

  static createPacket(requiredSize: number): AddNpcsToScope095Packet {
    const p = new AddNpcsToScope095Packet();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get NpcCount() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set NpcCount(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }

  getNPCs(count: number = this.NpcCount): {
  Id: ShortBigEndian;
  TypeNumber: Byte;
  IsPoisoned: Boolean;
  IsIced: Boolean;
  IsDamageBuffed: Boolean;
  IsDefenseBuffed: Boolean;
  CurrentPositionX: Byte;
  CurrentPositionY: Byte;
  TargetPositionX: Byte;
  TargetPositionY: Byte;
  Rotation: Byte;

}[]{
    const b = this.buffer;
    let bi = 0;

    const NPCs_count = count;
    const NPCs: any[] = new Array(NPCs_count);
    
    let NPCs_StartOffset = bi + 5;
    for (let i = 0; i < NPCs_count; i++) {
      const Id = b.getUint16(NPCs_StartOffset + 0, false);
      const TypeNumber = b.getUint8(NPCs_StartOffset + 2);
      const IsPoisoned = GetBoolean(b.getUint8(NPCs_StartOffset + 4), 0);
      const IsIced = GetBoolean(b.getUint8(NPCs_StartOffset + 4), 1);
      const IsDamageBuffed = GetBoolean(b.getUint8(NPCs_StartOffset + 4), 2);
      const IsDefenseBuffed = GetBoolean(b.getUint8(NPCs_StartOffset + 4), 3);
      const CurrentPositionX = b.getUint8(NPCs_StartOffset + 6);
      const CurrentPositionY = b.getUint8(NPCs_StartOffset + 7);
      const TargetPositionX = b.getUint8(NPCs_StartOffset + 8);
      const TargetPositionY = b.getUint8(NPCs_StartOffset + 9);
      const Rotation = GetByteValue(b.getUint8(NPCs_StartOffset + 10), 4, 4);
      NPCs[i] = {
        Id,
        TypeNumber,
        IsPoisoned,
        IsIced,
        IsDamageBuffed,
        IsDefenseBuffed,
        CurrentPositionX,
        CurrentPositionY,
        TargetPositionX,
        TargetPositionY,
        Rotation
      };
      NPCs_StartOffset += 12;
    }
    
    return NPCs;
  }}
export class AddSummonedMonstersToScopePacket {
  buffer!: DataView;
  static readonly Name = `AddSummonedMonstersToScope`;
  static readonly HeaderType = `C2Header`;
  static readonly HeaderCode = 0xC2;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `One or more summoned monsters got into the observed scope of the player.`;
  static readonly CausedReaction = `The client adds the monsters to the shown map.`;
  static readonly Length = undefined;
  static readonly LengthSize = 2;
  static readonly DataOffset = 3;
  static readonly Code = 0x1F;

  static getRequiredSize(dataSize:number){
    return AddSummonedMonstersToScopePacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, AddSummonedMonstersToScopePacket.HeaderCode);
    b.setUint8(AddSummonedMonstersToScopePacket.DataOffset, AddSummonedMonstersToScopePacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = AddSummonedMonstersToScopePacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint16(1, l);
    return this;
  }

  private _readString (from :number, to: number): string {
    return readWireString(this.buffer, from, to);
  }

  static createPacket(requiredSize: number): AddSummonedMonstersToScopePacket {
    const p = new AddSummonedMonstersToScopePacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get MonsterCount() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set MonsterCount(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }

  getSummonedMonsters(count: number = this.MonsterCount): {
  Id: ShortBigEndian;
  TypeNumber: ShortBigEndian;
  CurrentPositionX: Byte;
  CurrentPositionY: Byte;
  TargetPositionX: Byte;
  TargetPositionY: Byte;
  Rotation: Byte;
  OwnerCharacterName: string;
  EffectCount: Byte;
  Effects: {
  Id: Byte;

}[];

}[]{
    const b = this.buffer;
    let bi = 0;

    const SummonedMonsters_count = count;
    const SummonedMonsters: any[] = new Array(SummonedMonsters_count);
    
    let SummonedMonsters_StartOffset = bi + 5;
    for (let i = 0; i < SummonedMonsters_count; i++) {
      const Id = b.getUint16(SummonedMonsters_StartOffset + 0, false);
      const TypeNumber = b.getUint16(SummonedMonsters_StartOffset + 2, false);
      const CurrentPositionX = b.getUint8(SummonedMonsters_StartOffset + 4);
      const CurrentPositionY = b.getUint8(SummonedMonsters_StartOffset + 5);
      const TargetPositionX = b.getUint8(SummonedMonsters_StartOffset + 6);
      const TargetPositionY = b.getUint8(SummonedMonsters_StartOffset + 7);
      const Rotation = GetByteValue(b.getUint8(SummonedMonsters_StartOffset + 8), 4, 4);
      const OwnerCharacterName = this._readString(SummonedMonsters_StartOffset + 9, SummonedMonsters_StartOffset + 9 + 10);
      const EffectCount = b.getUint8(SummonedMonsters_StartOffset + 19);
const Effects_count = EffectCount;
    const Effects: any[] = new Array(Effects_count);
    
    let Effects_StartOffset = SummonedMonsters_StartOffset + 20;
    for (let i = 0; i < Effects_count; i++) {
      const Id = b.getUint8(Effects_StartOffset + 0);
      Effects[i] = {
        Id
      };
      Effects_StartOffset += 1;
    }
      SummonedMonsters[i] = {
        Id,
        TypeNumber,
        CurrentPositionX,
        CurrentPositionY,
        TargetPositionX,
        TargetPositionY,
        Rotation,
        OwnerCharacterName,
        EffectCount,
        Effects
      };
      SummonedMonsters_StartOffset += 20 + EffectCount * 1;
    }
    
    return SummonedMonsters;
  }}
export class AddSummonedMonstersToScope075Packet {
  buffer!: DataView;
  static readonly Name = `AddSummonedMonstersToScope075`;
  static readonly HeaderType = `C2Header`;
  static readonly HeaderCode = 0xC2;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `One or more summoned monsters got into the observed scope of the player.`;
  static readonly CausedReaction = `The client adds the monsters to the shown map.`;
  static readonly Length = undefined;
  static readonly LengthSize = 2;
  static readonly DataOffset = 3;
  static readonly Code = 0x1F;

  static getRequiredSize(dataSize:number){
    return AddSummonedMonstersToScope075Packet.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, AddSummonedMonstersToScope075Packet.HeaderCode);
    b.setUint8(AddSummonedMonstersToScope075Packet.DataOffset, AddSummonedMonstersToScope075Packet.Code);
  
    return this;
  }

  writeLength(l: number|undefined = AddSummonedMonstersToScope075Packet.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint16(1, l);
    return this;
  }

  private _readString (from :number, to: number): string {
    return readWireString(this.buffer, from, to);
  }

  static createPacket(requiredSize: number): AddSummonedMonstersToScope075Packet {
    const p = new AddSummonedMonstersToScope075Packet();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get MonsterCount() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set MonsterCount(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }

  getSummonedMonsters(count: number = this.MonsterCount): {
  Id: ShortBigEndian;
  TypeNumber: Byte;
  IsPoisoned: Boolean;
  IsIced: Boolean;
  IsDamageBuffed: Boolean;
  IsDefenseBuffed: Boolean;
  CurrentPositionX: Byte;
  CurrentPositionY: Byte;
  TargetPositionX: Byte;
  TargetPositionY: Byte;
  Rotation: Byte;
  OwnerCharacterName: string;

}[]{
    const b = this.buffer;
    let bi = 0;

    const SummonedMonsters_count = count;
    const SummonedMonsters: any[] = new Array(SummonedMonsters_count);
    
    let SummonedMonsters_StartOffset = bi + 5;
    for (let i = 0; i < SummonedMonsters_count; i++) {
      const Id = b.getUint16(SummonedMonsters_StartOffset + 0, false);
      const TypeNumber = b.getUint8(SummonedMonsters_StartOffset + 2);
      const IsPoisoned = GetBoolean(b.getUint8(SummonedMonsters_StartOffset + 3), 0);
      const IsIced = GetBoolean(b.getUint8(SummonedMonsters_StartOffset + 3), 1);
      const IsDamageBuffed = GetBoolean(b.getUint8(SummonedMonsters_StartOffset + 3), 2);
      const IsDefenseBuffed = GetBoolean(b.getUint8(SummonedMonsters_StartOffset + 3), 3);
      const CurrentPositionX = b.getUint8(SummonedMonsters_StartOffset + 4);
      const CurrentPositionY = b.getUint8(SummonedMonsters_StartOffset + 5);
      const TargetPositionX = b.getUint8(SummonedMonsters_StartOffset + 6);
      const TargetPositionY = b.getUint8(SummonedMonsters_StartOffset + 7);
      const Rotation = GetByteValue(b.getUint8(SummonedMonsters_StartOffset + 8), 4, 4);
      const OwnerCharacterName = this._readString(SummonedMonsters_StartOffset + 9, SummonedMonsters_StartOffset + 9 + 10);
      SummonedMonsters[i] = {
        Id,
        TypeNumber,
        IsPoisoned,
        IsIced,
        IsDamageBuffed,
        IsDefenseBuffed,
        CurrentPositionX,
        CurrentPositionY,
        TargetPositionX,
        TargetPositionY,
        Rotation,
        OwnerCharacterName
      };
      SummonedMonsters_StartOffset += 19;
    }
    
    return SummonedMonsters;
  }}
export class AddSummonedMonstersToScope095Packet {
  buffer!: DataView;
  static readonly Name = `AddSummonedMonstersToScope095`;
  static readonly HeaderType = `C2Header`;
  static readonly HeaderCode = 0xC2;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `One or more summoned monsters got into the observed scope of the player.`;
  static readonly CausedReaction = `The client adds the monsters to the shown map.`;
  static readonly Length = undefined;
  static readonly LengthSize = 2;
  static readonly DataOffset = 3;
  static readonly Code = 0x1F;

  static getRequiredSize(dataSize:number){
    return AddSummonedMonstersToScope095Packet.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, AddSummonedMonstersToScope095Packet.HeaderCode);
    b.setUint8(AddSummonedMonstersToScope095Packet.DataOffset, AddSummonedMonstersToScope095Packet.Code);
  
    return this;
  }

  writeLength(l: number|undefined = AddSummonedMonstersToScope095Packet.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint16(1, l);
    return this;
  }

  private _readString (from :number, to: number): string {
    return readWireString(this.buffer, from, to);
  }

  static createPacket(requiredSize: number): AddSummonedMonstersToScope095Packet {
    const p = new AddSummonedMonstersToScope095Packet();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get MonsterCount() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set MonsterCount(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }

  getSummonedMonsters(count: number = this.MonsterCount): {
  Id: ShortBigEndian;
  TypeNumber: Byte;
  IsPoisoned: Boolean;
  IsIced: Boolean;
  IsDamageBuffed: Boolean;
  IsDefenseBuffed: Boolean;
  CurrentPositionX: Byte;
  CurrentPositionY: Byte;
  TargetPositionX: Byte;
  TargetPositionY: Byte;
  Rotation: Byte;
  OwnerCharacterName: string;

}[]{
    const b = this.buffer;
    let bi = 0;

    const SummonedMonsters_count = count;
    const SummonedMonsters: any[] = new Array(SummonedMonsters_count);
    
    let SummonedMonsters_StartOffset = bi + 5;
    for (let i = 0; i < SummonedMonsters_count; i++) {
      const Id = b.getUint16(SummonedMonsters_StartOffset + 0, false);
      const TypeNumber = b.getUint8(SummonedMonsters_StartOffset + 2);
      const IsPoisoned = GetBoolean(b.getUint8(SummonedMonsters_StartOffset + 4), 0);
      const IsIced = GetBoolean(b.getUint8(SummonedMonsters_StartOffset + 4), 1);
      const IsDamageBuffed = GetBoolean(b.getUint8(SummonedMonsters_StartOffset + 4), 2);
      const IsDefenseBuffed = GetBoolean(b.getUint8(SummonedMonsters_StartOffset + 4), 3);
      const CurrentPositionX = b.getUint8(SummonedMonsters_StartOffset + 5);
      const CurrentPositionY = b.getUint8(SummonedMonsters_StartOffset + 6);
      const TargetPositionX = b.getUint8(SummonedMonsters_StartOffset + 7);
      const TargetPositionY = b.getUint8(SummonedMonsters_StartOffset + 8);
      const Rotation = GetByteValue(b.getUint8(SummonedMonsters_StartOffset + 9), 4, 4);
      const OwnerCharacterName = this._readString(SummonedMonsters_StartOffset + 10, SummonedMonsters_StartOffset + 10 + 10);
      SummonedMonsters[i] = {
        Id,
        TypeNumber,
        IsPoisoned,
        IsIced,
        IsDamageBuffed,
        IsDefenseBuffed,
        CurrentPositionX,
        CurrentPositionY,
        TargetPositionX,
        TargetPositionY,
        Rotation,
        OwnerCharacterName
      };
      SummonedMonsters_StartOffset += 20;
    }
    
    return SummonedMonsters;
  }}
export class MapObjectOutOfScopePacket {
  buffer!: DataView;
  static readonly Name = `MapObjectOutOfScope`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `One or more objects (player, npc, etc.) on the map got out of scope, e.g. when the own player moved away from it/them or the object itself moved.`;
  static readonly CausedReaction = `The game client removes the objects from the game map.`;
  static readonly Length = undefined;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x14;

  static getRequiredSize(dataSize:number){
    return MapObjectOutOfScopePacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, MapObjectOutOfScopePacket.HeaderCode);
    b.setUint8(MapObjectOutOfScopePacket.DataOffset, MapObjectOutOfScopePacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = MapObjectOutOfScopePacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number): MapObjectOutOfScopePacket {
    const p = new MapObjectOutOfScopePacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get ObjectCount() {
    return GetByteValue(this.buffer.getUint8(3), 8, 0);
  }
  set ObjectCount(value: number) {
    const oldByte = this.buffer.getUint8(3);
    this.buffer.setUint8(3, SetByteValue(oldByte, value, 8, 0));
  }

  getObjects(count: number = this.ObjectCount): {
  Id: ShortBigEndian;

}[]{
    const b = this.buffer;
    let bi = 0;

    const Objects_count = count;
    const Objects: any[] = new Array(Objects_count);
    
    let Objects_StartOffset = bi + 4;
    for (let i = 0; i < Objects_count; i++) {
      const Id = b.getUint16(Objects_StartOffset + 0, false);
      Objects[i] = {
        Id
      };
      Objects_StartOffset += 2;
    }
    
    return Objects;
  }}
export class ObjectGotKilledPacket {
  buffer!: DataView;
  static readonly Name = `ObjectGotKilled`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `An observed object was killed.`;
  static readonly CausedReaction = `The object is shown as dead.`;
  static readonly Length = 9;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x17;

  static getRequiredSize(dataSize:number){
    return ObjectGotKilledPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, ObjectGotKilledPacket.HeaderCode);
    b.setUint8(ObjectGotKilledPacket.DataOffset, ObjectGotKilledPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = ObjectGotKilledPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 9): ObjectGotKilledPacket {
    const p = new ObjectGotKilledPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get KilledId(){
    return this.buffer.getUint16(3, false);
  }
  set KilledId(value: number){
    this.buffer.setUint16(3, value, false);
  }
  get SkillId(){
    return this.buffer.getUint16(5, false);
  }
  set SkillId(value: number){
    this.buffer.setUint16(5, value, false);
  }
  get KillerId(){
    return this.buffer.getUint16(7, false);
  }
  set KillerId(value: number){
    this.buffer.setUint16(7, value, false);
  }
}
export class ObjectAnimationPacket {
  buffer!: DataView;
  static readonly Name = `ObjectAnimation`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `An object performs an animation.`;
  static readonly CausedReaction = `The animation is shown for the specified object.`;
  static readonly Length = 9;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x18;

  static getRequiredSize(dataSize:number){
    return ObjectAnimationPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, ObjectAnimationPacket.HeaderCode);
    b.setUint8(ObjectAnimationPacket.DataOffset, ObjectAnimationPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = ObjectAnimationPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 9): ObjectAnimationPacket {
    const p = new ObjectAnimationPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get ObjectId(){
    return this.buffer.getUint16(3, false);
  }
  set ObjectId(value: number){
    this.buffer.setUint16(3, value, false);
  }
  get Direction() {
    return GetByteValue(this.buffer.getUint8(5), 8, 0);
  }
  set Direction(value: number) {
    const oldByte = this.buffer.getUint8(5);
    this.buffer.setUint8(5, SetByteValue(oldByte, value, 8, 0));
  }
  get Animation() {
    return GetByteValue(this.buffer.getUint8(6), 8, 0);
  }
  set Animation(value: number) {
    const oldByte = this.buffer.getUint8(6);
    this.buffer.setUint8(6, SetByteValue(oldByte, value, 8, 0));
  }
  get TargetId(){
    return this.buffer.getUint16(7, false);
  }
  set TargetId(value: number){
    this.buffer.setUint16(7, value, false);
  }
}
export class AreaSkillAnimationPacket {
  buffer!: DataView;
  static readonly Name = `AreaSkillAnimation`;
  static readonly HeaderType = `C3Header`;
  static readonly HeaderCode = 0xC3;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `An object performs a skill which has effect on an area.`;
  static readonly CausedReaction = `The animation is shown on the user interface.`;
  static readonly Length = 10;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x1E;

  static getRequiredSize(dataSize:number){
    return AreaSkillAnimationPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, AreaSkillAnimationPacket.HeaderCode);
    b.setUint8(AreaSkillAnimationPacket.DataOffset, AreaSkillAnimationPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = AreaSkillAnimationPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 10): AreaSkillAnimationPacket {
    const p = new AreaSkillAnimationPacket();
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
  get PointX() {
    return GetByteValue(this.buffer.getUint8(7), 8, 0);
  }
  set PointX(value: number) {
    const oldByte = this.buffer.getUint8(7);
    this.buffer.setUint8(7, SetByteValue(oldByte, value, 8, 0));
  }
  get PointY() {
    return GetByteValue(this.buffer.getUint8(8), 8, 0);
  }
  set PointY(value: number) {
    const oldByte = this.buffer.getUint8(8);
    this.buffer.setUint8(8, SetByteValue(oldByte, value, 8, 0));
  }
  get Rotation() {
    return GetByteValue(this.buffer.getUint8(9), 8, 0);
  }
  set Rotation(value: number) {
    const oldByte = this.buffer.getUint8(9);
    this.buffer.setUint8(9, SetByteValue(oldByte, value, 8, 0));
  }
}
export class SkillAnimationPacket {
  buffer!: DataView;
  static readonly Name = `SkillAnimation`;
  static readonly HeaderType = `C3Header`;
  static readonly HeaderCode = 0xC3;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `An object performs a skill which is directly targeted to another object.`;
  static readonly CausedReaction = `The animation is shown on the user interface.`;
  static readonly Length = 9;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x19;

  static getRequiredSize(dataSize:number){
    return SkillAnimationPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, SkillAnimationPacket.HeaderCode);
    b.setUint8(SkillAnimationPacket.DataOffset, SkillAnimationPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = SkillAnimationPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 9): SkillAnimationPacket {
    const p = new SkillAnimationPacket();
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
  get TargetId(){
    return this.buffer.getUint16(7, false);
  }
  set TargetId(value: number){
    this.buffer.setUint16(7, value, false);
  }
}
export class AreaSkillAnimation075Packet {
  buffer!: DataView;
  static readonly Name = `AreaSkillAnimation075`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `An object performs a skill which has effect on an area.`;
  static readonly CausedReaction = `The animation is shown on the user interface.`;
  static readonly Length = 9;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x1E;

  static getRequiredSize(dataSize:number){
    return AreaSkillAnimation075Packet.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, AreaSkillAnimation075Packet.HeaderCode);
    b.setUint8(AreaSkillAnimation075Packet.DataOffset, AreaSkillAnimation075Packet.Code);
  
    return this;
  }

  writeLength(l: number|undefined = AreaSkillAnimation075Packet.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 9): AreaSkillAnimation075Packet {
    const p = new AreaSkillAnimation075Packet();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get SkillId() {
    return GetByteValue(this.buffer.getUint8(3), 8, 0);
  }
  set SkillId(value: number) {
    const oldByte = this.buffer.getUint8(3);
    this.buffer.setUint8(3, SetByteValue(oldByte, value, 8, 0));
  }
  get PlayerId(){
    return this.buffer.getUint16(4, false);
  }
  set PlayerId(value: number){
    this.buffer.setUint16(4, value, false);
  }
  get PointX() {
    return GetByteValue(this.buffer.getUint8(6), 8, 0);
  }
  set PointX(value: number) {
    const oldByte = this.buffer.getUint8(6);
    this.buffer.setUint8(6, SetByteValue(oldByte, value, 8, 0));
  }
  get PointY() {
    return GetByteValue(this.buffer.getUint8(7), 8, 0);
  }
  set PointY(value: number) {
    const oldByte = this.buffer.getUint8(7);
    this.buffer.setUint8(7, SetByteValue(oldByte, value, 8, 0));
  }
  get Rotation() {
    return GetByteValue(this.buffer.getUint8(8), 8, 0);
  }
  set Rotation(value: number) {
    const oldByte = this.buffer.getUint8(8);
    this.buffer.setUint8(8, SetByteValue(oldByte, value, 8, 0));
  }
}
export class AreaSkillAnimation095Packet {
  buffer!: DataView;
  static readonly Name = `AreaSkillAnimation095`;
  static readonly HeaderType = `C3Header`;
  static readonly HeaderCode = 0xC3;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `An object performs a skill which has effect on an area.`;
  static readonly CausedReaction = `The animation is shown on the user interface.`;
  static readonly Length = 9;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x1E;

  static getRequiredSize(dataSize:number){
    return AreaSkillAnimation095Packet.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, AreaSkillAnimation095Packet.HeaderCode);
    b.setUint8(AreaSkillAnimation095Packet.DataOffset, AreaSkillAnimation095Packet.Code);
  
    return this;
  }

  writeLength(l: number|undefined = AreaSkillAnimation095Packet.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 9): AreaSkillAnimation095Packet {
    const p = new AreaSkillAnimation095Packet();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get SkillId() {
    return GetByteValue(this.buffer.getUint8(3), 8, 0);
  }
  set SkillId(value: number) {
    const oldByte = this.buffer.getUint8(3);
    this.buffer.setUint8(3, SetByteValue(oldByte, value, 8, 0));
  }
  get PlayerId(){
    return this.buffer.getUint16(4, false);
  }
  set PlayerId(value: number){
    this.buffer.setUint16(4, value, false);
  }
  get PointX() {
    return GetByteValue(this.buffer.getUint8(6), 8, 0);
  }
  set PointX(value: number) {
    const oldByte = this.buffer.getUint8(6);
    this.buffer.setUint8(6, SetByteValue(oldByte, value, 8, 0));
  }
  get PointY() {
    return GetByteValue(this.buffer.getUint8(7), 8, 0);
  }
  set PointY(value: number) {
    const oldByte = this.buffer.getUint8(7);
    this.buffer.setUint8(7, SetByteValue(oldByte, value, 8, 0));
  }
  get Rotation() {
    return GetByteValue(this.buffer.getUint8(8), 8, 0);
  }
  set Rotation(value: number) {
    const oldByte = this.buffer.getUint8(8);
    this.buffer.setUint8(8, SetByteValue(oldByte, value, 8, 0));
  }
}
export class SkillAnimation075Packet {
  buffer!: DataView;
  static readonly Name = `SkillAnimation075`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `An object performs a skill which is directly targeted to another object.`;
  static readonly CausedReaction = `The animation is shown on the user interface.`;
  static readonly Length = 8;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x19;

  static getRequiredSize(dataSize:number){
    return SkillAnimation075Packet.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, SkillAnimation075Packet.HeaderCode);
    b.setUint8(SkillAnimation075Packet.DataOffset, SkillAnimation075Packet.Code);
  
    return this;
  }

  writeLength(l: number|undefined = SkillAnimation075Packet.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 8): SkillAnimation075Packet {
    const p = new SkillAnimation075Packet();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get SkillId() {
    return GetByteValue(this.buffer.getUint8(3), 8, 0);
  }
  set SkillId(value: number) {
    const oldByte = this.buffer.getUint8(3);
    this.buffer.setUint8(3, SetByteValue(oldByte, value, 8, 0));
  }
  get PlayerId(){
    return this.buffer.getUint16(4, false);
  }
  set PlayerId(value: number){
    this.buffer.setUint16(4, value, false);
  }
  get TargetId(){
    return this.buffer.getUint16(6, false);
  }
  set TargetId(value: number){
    this.buffer.setUint16(6, value, false);
  }
  get EffectApplied(){
    return GetBoolean(this.buffer.getUint8(6), 7);
  }
  set EffectApplied(value: boolean){
    const oldByte = this.buffer.getUint8(6);
    this.buffer.setUint8(6, SetBoolean(oldByte, value, 7));
  }
}
export class SkillAnimation095Packet {
  buffer!: DataView;
  static readonly Name = `SkillAnimation095`;
  static readonly HeaderType = `C3Header`;
  static readonly HeaderCode = 0xC3;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `An object performs a skill which is directly targeted to another object.`;
  static readonly CausedReaction = `The animation is shown on the user interface.`;
  static readonly Length = 8;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x19;

  static getRequiredSize(dataSize:number){
    return SkillAnimation095Packet.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, SkillAnimation095Packet.HeaderCode);
    b.setUint8(SkillAnimation095Packet.DataOffset, SkillAnimation095Packet.Code);
  
    return this;
  }

  writeLength(l: number|undefined = SkillAnimation095Packet.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 8): SkillAnimation095Packet {
    const p = new SkillAnimation095Packet();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get SkillId() {
    return GetByteValue(this.buffer.getUint8(3), 8, 0);
  }
  set SkillId(value: number) {
    const oldByte = this.buffer.getUint8(3);
    this.buffer.setUint8(3, SetByteValue(oldByte, value, 8, 0));
  }
  get PlayerId(){
    return this.buffer.getUint16(4, false);
  }
  set PlayerId(value: number){
    this.buffer.setUint16(4, value, false);
  }
  get TargetId(){
    return this.buffer.getUint16(6, false);
  }
  set TargetId(value: number){
    this.buffer.setUint16(6, value, false);
  }
  get EffectApplied(){
    return GetBoolean(this.buffer.getUint8(6), 7);
  }
  set EffectApplied(value: boolean){
    const oldByte = this.buffer.getUint8(6);
    this.buffer.setUint8(6, SetBoolean(oldByte, value, 7));
  }
}
export class MagicEffectCancelledPacket {
  buffer!: DataView;
  static readonly Name = `MagicEffectCancelled`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `A player cancelled a specific magic effect of a skill (Infinity Arrow, Wizardry Enhance), or an effect was removed due a timeout (Ice, Poison) or antidote.`;
  static readonly CausedReaction = `The effect is removed from the target object.`;
  static readonly Length = 7;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x1B;

  static getRequiredSize(dataSize:number){
    return MagicEffectCancelledPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, MagicEffectCancelledPacket.HeaderCode);
    b.setUint8(MagicEffectCancelledPacket.DataOffset, MagicEffectCancelledPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = MagicEffectCancelledPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 7): MagicEffectCancelledPacket {
    const p = new MagicEffectCancelledPacket();
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
export class MagicEffectCancelled075Packet {
  buffer!: DataView;
  static readonly Name = `MagicEffectCancelled075`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `A player cancelled a specific magic effect of a skill (Infinity Arrow, Wizardry Enhance), or an effect was removed due a timeout (Ice, Poison) or antidote.`;
  static readonly CausedReaction = `The effect is removed from the target object.`;
  static readonly Length = 6;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x1B;

  static getRequiredSize(dataSize:number){
    return MagicEffectCancelled075Packet.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, MagicEffectCancelled075Packet.HeaderCode);
    b.setUint8(MagicEffectCancelled075Packet.DataOffset, MagicEffectCancelled075Packet.Code);
  
    return this;
  }

  writeLength(l: number|undefined = MagicEffectCancelled075Packet.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 6): MagicEffectCancelled075Packet {
    const p = new MagicEffectCancelled075Packet();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get SkillId() {
    return GetByteValue(this.buffer.getUint8(3), 8, 0);
  }
  set SkillId(value: number) {
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
export class RageAttackPacket {
  buffer!: DataView;
  static readonly Name = `RageAttack`;
  static readonly HeaderType = `C3Header`;
  static readonly HeaderCode = 0xC3;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `A player (rage fighter) performs the dark side skill on a target and sent a RageAttackRangeRequest.`;
  static readonly CausedReaction = `The targets are attacked with visual effects.`;
  static readonly Length = 9;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x4A;

  static getRequiredSize(dataSize:number){
    return RageAttackPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, RageAttackPacket.HeaderCode);
    b.setUint8(RageAttackPacket.DataOffset, RageAttackPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = RageAttackPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 9): RageAttackPacket {
    const p = new RageAttackPacket();
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
  get SourceId(){
    return this.buffer.getUint16(5, false);
  }
  set SourceId(value: number){
    this.buffer.setUint16(5, value, false);
  }
  get TargetId(){
    return this.buffer.getUint16(7, false);
  }
  set TargetId(value: number){
    this.buffer.setUint16(7, value, false);
  }
}
export class RageAttackRangeResponsePacket {
  buffer!: DataView;
  static readonly Name = `RageAttackRangeResponse`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `A player (rage fighter) performs the dark side skill on a target and sent a RageAttackRangeRequest.`;
  static readonly CausedReaction = `The targets are attacked with visual effects.`;
  static readonly Length = 16;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x4B;

  static getRequiredSize(dataSize:number){
    return RageAttackRangeResponsePacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, RageAttackRangeResponsePacket.HeaderCode);
    b.setUint8(RageAttackRangeResponsePacket.DataOffset, RageAttackRangeResponsePacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = RageAttackRangeResponsePacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 16): RageAttackRangeResponsePacket {
    const p = new RageAttackRangeResponsePacket();
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

  getTargets(count: number): {
  TargetId: ShortLittleEndian;

}[]{
    const b = this.buffer;
    let bi = 0;

    const Targets_count = count;
    const Targets: any[] = new Array(Targets_count);
    
    let Targets_StartOffset = bi + 6;
    for (let i = 0; i < Targets_count; i++) {
      const TargetId = b.getUint16(Targets_StartOffset + 0, true);
      Targets[i] = {
        TargetId
      };
      Targets_StartOffset += 2;
    }
    
    return Targets;
  }}
export class AppearanceChangedPacket {
  buffer!: DataView;
  static readonly Name = `AppearanceChanged`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `The appearance of a player changed, all surrounding players are informed about it.`;
  static readonly CausedReaction = `The appearance of the player is updated.`;
  static readonly Length = undefined;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x25;

  static getRequiredSize(dataSize:number){
    return AppearanceChangedPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, AppearanceChangedPacket.HeaderCode);
    b.setUint8(AppearanceChangedPacket.DataOffset, AppearanceChangedPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = AppearanceChangedPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number): AppearanceChangedPacket {
    const p = new AppearanceChangedPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get ChangedPlayerId(){
    return this.buffer.getUint16(3, false);
  }
  set ChangedPlayerId(value: number){
    this.buffer.setUint16(3, value, false);
  }
  get ItemData(){
    const to = this.buffer.byteLength;
    const i = 5;
              
    return new DataView(this.buffer.buffer.slice(i,to));
  }
  setItemData(data: ArrayLike<number>, count = NaN){
    if (data.length !== count) throw new Error(`data.length must be ${count}`);
    const from = 5;

    for (let i = 0; i < data.length; i++) {
      this.buffer.setUint8(from + i, data[i]);
    }
}
}
export class AppearanceChangedExtendedPacket {
  buffer!: DataView;
  static readonly Name = `AppearanceChangedExtended`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `The appearance of a player changed, all surrounding players are informed about it.`;
  static readonly CausedReaction = `The appearance of the player is updated.`;
  static readonly Length = 14;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x25;

  static getRequiredSize(dataSize:number){
    return AppearanceChangedExtendedPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, AppearanceChangedExtendedPacket.HeaderCode);
    b.setUint8(AppearanceChangedExtendedPacket.DataOffset, AppearanceChangedExtendedPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = AppearanceChangedExtendedPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 14): AppearanceChangedExtendedPacket {
    const p = new AppearanceChangedExtendedPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get ChangedPlayerId(){
    return this.buffer.getUint16(4, true);
  }
  set ChangedPlayerId(value: number){
    this.buffer.setUint16(4, value, true);
  }
  get ItemSlot() {
    return GetByteValue(this.buffer.getUint8(6), 8, 0);
  }
  set ItemSlot(value: number) {
    const oldByte = this.buffer.getUint8(6);
    this.buffer.setUint8(6, SetByteValue(oldByte, value, 8, 0));
  }
  get ItemGroup() {
    return GetByteValue(this.buffer.getUint8(7), 8, 0);
  }
  set ItemGroup(value: number) {
    const oldByte = this.buffer.getUint8(7);
    this.buffer.setUint8(7, SetByteValue(oldByte, value, 8, 0));
  }
  get ItemNumber(){
    return this.buffer.getUint16(8, true);
  }
  set ItemNumber(value: number){
    this.buffer.setUint16(8, value, true);
  }
  get ItemLevel() {
    return GetByteValue(this.buffer.getUint8(10), 8, 0);
  }
  set ItemLevel(value: number) {
    const oldByte = this.buffer.getUint8(10);
    this.buffer.setUint8(10, SetByteValue(oldByte, value, 8, 0));
  }
  get ExcellentFlags() {
    return GetByteValue(this.buffer.getUint8(11), 8, 0);
  }
  set ExcellentFlags(value: number) {
    const oldByte = this.buffer.getUint8(11);
    this.buffer.setUint8(11, SetByteValue(oldByte, value, 8, 0));
  }
  get AncientDiscriminator() {
    return GetByteValue(this.buffer.getUint8(12), 8, 0);
  }
  set AncientDiscriminator(value: number) {
    const oldByte = this.buffer.getUint8(12);
    this.buffer.setUint8(12, SetByteValue(oldByte, value, 8, 0));
  }
  get IsAncientSetComplete(){
    return GetBoolean(this.buffer.getUint8(13), 0);
  }
  set IsAncientSetComplete(value: boolean){
    const oldByte = this.buffer.getUint8(13);
    this.buffer.setUint8(13, SetBoolean(oldByte, value, 0));
  }
}
export class ObjectMessagePacket {
  buffer!: DataView;
  static readonly Name = `ObjectMessage`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `The server wants to show a message above any kind of character, even NPCs.`;
  static readonly CausedReaction = `The message is shown above the character.`;
  static readonly Length = undefined;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x01;

  static getRequiredSize(dataSize:number){
    return ObjectMessagePacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, ObjectMessagePacket.HeaderCode);
    b.setUint8(ObjectMessagePacket.DataOffset, ObjectMessagePacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = ObjectMessagePacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  private _readString (from :number, to: number): string {
    return readWireString(this.buffer, from, to);
  }

  static createPacket(requiredSize: number): ObjectMessagePacket {
    const p = new ObjectMessagePacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get ObjectId(){
    return this.buffer.getUint16(3, false);
  }
  set ObjectId(value: number){
    this.buffer.setUint16(3, value, false);
  }
  get Message(){
    const to = this.buffer.byteLength;
              
    return this._readString(5, to);
  }
  setMessage(str: string, count = NaN){
    const from = 5;
    for(let i = 0; i < str.length; i++){
      const char = str.charCodeAt(i);
      this.buffer.setUint8(from + i, char);
    }
}
}
export class PartyRequestPacket {
  buffer!: DataView;
  static readonly Name = `PartyRequest`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `Another player requests party from the receiver of this message.`;
  static readonly CausedReaction = `The party request is shown.`;
  static readonly Length = 5;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x40;

  static getRequiredSize(dataSize:number){
    return PartyRequestPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, PartyRequestPacket.HeaderCode);
    b.setUint8(PartyRequestPacket.DataOffset, PartyRequestPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = PartyRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 5): PartyRequestPacket {
    const p = new PartyRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get RequesterId(){
    return this.buffer.getUint16(3, false);
  }
  set RequesterId(value: number){
    this.buffer.setUint16(3, value, false);
  }
}
export class PartyListPacket {
  buffer!: DataView;
  static readonly Name = `PartyList`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `A player joined a party or requested the current party list by opening the party dialog.`;
  static readonly CausedReaction = `The party list is updated.`;
  static readonly Length = undefined;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x42;
  static readonly SubCode = 0x01;

  static getRequiredSize(dataSize:number){
    return PartyListPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, PartyListPacket.HeaderCode);
    b.setUint8(PartyListPacket.DataOffset, PartyListPacket.Code);
  b.setUint8(PartyListPacket.DataOffset + 1, PartyListPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = PartyListPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  private _readString (from :number, to: number): string {
    return readWireString(this.buffer, from, to);
  }

  static createPacket(requiredSize: number): PartyListPacket {
    const p = new PartyListPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Count() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set Count(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }

  getMembers(count: number = this.Count): {
  Name: string;
  Index: Byte;
  MapId: Byte;
  PositionX: Byte;
  PositionY: Byte;
  CurrentHealth: IntegerLittleEndian;
  MaximumHealth: IntegerLittleEndian;

}[]{
    const b = this.buffer;
    let bi = 0;

    const Members_count = count;
    const Members: any[] = new Array(Members_count);
    
    let Members_StartOffset = bi + 5;
    for (let i = 0; i < Members_count; i++) {
      const Name = this._readString(Members_StartOffset + 0, Members_StartOffset + 0 + 10);
      const Index = b.getUint8(Members_StartOffset + 10);
      const MapId = b.getUint8(Members_StartOffset + 11);
      const PositionX = b.getUint8(Members_StartOffset + 12);
      const PositionY = b.getUint8(Members_StartOffset + 13);
      const CurrentHealth = b.getUint32(Members_StartOffset + 16, true);
      const MaximumHealth = b.getUint32(Members_StartOffset + 20, true);
      Members[i] = {
        Name,
        Index,
        MapId,
        PositionX,
        PositionY,
        CurrentHealth,
        MaximumHealth
      };
      Members_StartOffset += 24;
    }
    
    return Members;
  }}
export class PartyList075Packet {
  buffer!: DataView;
  static readonly Name = `PartyList075`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `A player joined a party or requested the current party list by opening the party dialog.`;
  static readonly CausedReaction = `The party list is updated.`;
  static readonly Length = undefined;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x42;
  static readonly SubCode = 0x01;

  static getRequiredSize(dataSize:number){
    return PartyList075Packet.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, PartyList075Packet.HeaderCode);
    b.setUint8(PartyList075Packet.DataOffset, PartyList075Packet.Code);
  b.setUint8(PartyList075Packet.DataOffset + 1, PartyList075Packet.SubCode);
    return this;
  }

  writeLength(l: number|undefined = PartyList075Packet.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  private _readString (from :number, to: number): string {
    return readWireString(this.buffer, from, to);
  }

  static createPacket(requiredSize: number): PartyList075Packet {
    const p = new PartyList075Packet();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Count() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set Count(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }

  getMembers(count: number = this.Count): {
  Name: string;
  Index: Byte;
  MapId: Byte;
  PositionX: Byte;
  PositionY: Byte;

}[]{
    const b = this.buffer;
    let bi = 0;

    const Members_count = count;
    const Members: any[] = new Array(Members_count);
    
    let Members_StartOffset = bi + 5;
    for (let i = 0; i < Members_count; i++) {
      const Name = this._readString(Members_StartOffset + 0, Members_StartOffset + 0 + 10);
      const Index = b.getUint8(Members_StartOffset + 10);
      const MapId = b.getUint8(Members_StartOffset + 11);
      const PositionX = b.getUint8(Members_StartOffset + 12);
      const PositionY = b.getUint8(Members_StartOffset + 13);
      Members[i] = {
        Name,
        Index,
        MapId,
        PositionX,
        PositionY
      };
      Members_StartOffset += 14;
    }
    
    return Members;
  }}
export class RemovePartyMemberPacket {
  buffer!: DataView;
  static readonly Name = `RemovePartyMember`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `A party member got removed from a party in which the player is in.`;
  static readonly CausedReaction = `The party member with the specified index is removed from the party list on the user interface.`;
  static readonly Length = 4;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x43;

  static getRequiredSize(dataSize:number){
    return RemovePartyMemberPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, RemovePartyMemberPacket.HeaderCode);
    b.setUint8(RemovePartyMemberPacket.DataOffset, RemovePartyMemberPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = RemovePartyMemberPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 4): RemovePartyMemberPacket {
    const p = new RemovePartyMemberPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Index() {
    return GetByteValue(this.buffer.getUint8(3), 8, 0);
  }
  set Index(value: number) {
    const oldByte = this.buffer.getUint8(3);
    this.buffer.setUint8(3, SetByteValue(oldByte, value, 8, 0));
  }
}
export class PartyHealthUpdatePacket {
  buffer!: DataView;
  static readonly Name = `PartyHealthUpdate`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `Periodically, when the health state of the party changed.`;
  static readonly CausedReaction = `The party health list is updated.`;
  static readonly Length = undefined;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x44;

  static getRequiredSize(dataSize:number){
    return PartyHealthUpdatePacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, PartyHealthUpdatePacket.HeaderCode);
    b.setUint8(PartyHealthUpdatePacket.DataOffset, PartyHealthUpdatePacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = PartyHealthUpdatePacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number): PartyHealthUpdatePacket {
    const p = new PartyHealthUpdatePacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Count() {
    return GetByteValue(this.buffer.getUint8(3), 8, 0);
  }
  set Count(value: number) {
    const oldByte = this.buffer.getUint8(3);
    this.buffer.setUint8(3, SetByteValue(oldByte, value, 8, 0));
  }

  getMembers(count: number = this.Count): {
  Index: Byte;
  Value: Byte;

}[]{
    const b = this.buffer;
    let bi = 0;

    const Members_count = count;
    const Members: any[] = new Array(Members_count);
    
    let Members_StartOffset = bi + 4;
    for (let i = 0; i < Members_count; i++) {
      const Index = GetByteValue(b.getUint8(Members_StartOffset + 0), 4, 4);
      const Value = GetByteValue(b.getUint8(Members_StartOffset + 0), 4, 0);
      Members[i] = {
        Index,
        Value
      };
      Members_StartOffset += 1;
    }
    
    return Members;
  }}
export class PlayerShopOpenSuccessfulPacket {
  buffer!: DataView;
  static readonly Name = `PlayerShopOpenSuccessful`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `After the player requested to open his shop and this request was successful.`;
  static readonly CausedReaction = `The own player shop is shown as open.`;
  static readonly Length = 5;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x3F;
  static readonly SubCode = 0x02;

  static getRequiredSize(dataSize:number){
    return PlayerShopOpenSuccessfulPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, PlayerShopOpenSuccessfulPacket.HeaderCode);
    b.setUint8(PlayerShopOpenSuccessfulPacket.DataOffset, PlayerShopOpenSuccessfulPacket.Code);
  b.setUint8(PlayerShopOpenSuccessfulPacket.DataOffset + 1, PlayerShopOpenSuccessfulPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = PlayerShopOpenSuccessfulPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 5): PlayerShopOpenSuccessfulPacket {
    const p = new PlayerShopOpenSuccessfulPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Success(){
    return GetBoolean(this.buffer.getUint8(4), 0);
  }
  set Success(value: boolean){
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetBoolean(oldByte, value, 0));
  }
}
export enum TradeButtonStateChangedTradeButtonStateEnum {
    Unchecked = 0,
Checked = 1,
Red = 2
  }export class TradeButtonStateChangedPacket {
  buffer!: DataView;
  static readonly Name = `TradeButtonStateChanged`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `After the trading partner checked or unchecked the trade accept button.`;
  static readonly CausedReaction = `The game client updates the trade button state accordingly.`;
  static readonly Length = 4;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x3C;

  static getRequiredSize(dataSize:number){
    return TradeButtonStateChangedPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, TradeButtonStateChangedPacket.HeaderCode);
    b.setUint8(TradeButtonStateChangedPacket.DataOffset, TradeButtonStateChangedPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = TradeButtonStateChangedPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 4): TradeButtonStateChangedPacket {
    const p = new TradeButtonStateChangedPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get State():TradeButtonStateChangedTradeButtonStateEnum{
    return GetByteValue(this.buffer.getUint8(3), 8, 0);
  }
  set State(value: TradeButtonStateChangedTradeButtonStateEnum){
    const oldValue = this.State;
    this.buffer.setUint8(3, SetByteValue(oldValue, value, 8, 0));
  }
}
export class TradeMoneySetResponsePacket {
  buffer!: DataView;
  static readonly Name = `TradeMoneySetResponse`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `The trade money has been set by a previous request of the player.`;
  static readonly CausedReaction = `The money which was set into the trade by the player is updated on the UI.`;
  static readonly Length = 4;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x3A;
  static readonly SubCode = 0x01;

  static getRequiredSize(dataSize:number){
    return TradeMoneySetResponsePacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, TradeMoneySetResponsePacket.HeaderCode);
    b.setUint8(TradeMoneySetResponsePacket.DataOffset, TradeMoneySetResponsePacket.Code);
  b.setUint8(TradeMoneySetResponsePacket.DataOffset + 1, TradeMoneySetResponsePacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = TradeMoneySetResponsePacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 4): TradeMoneySetResponsePacket {
    const p = new TradeMoneySetResponsePacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
}
export class TradeMoneyUpdatePacket {
  buffer!: DataView;
  static readonly Name = `TradeMoneyUpdate`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `This message is sent when the trading partner put a certain amount of money (also 0) into the trade.`;
  static readonly CausedReaction = `It overrides all previous sent money values.`;
  static readonly Length = 8;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x3B;

  static getRequiredSize(dataSize:number){
    return TradeMoneyUpdatePacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, TradeMoneyUpdatePacket.HeaderCode);
    b.setUint8(TradeMoneyUpdatePacket.DataOffset, TradeMoneyUpdatePacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = TradeMoneyUpdatePacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 8): TradeMoneyUpdatePacket {
    const p = new TradeMoneyUpdatePacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get MoneyAmount(){
    return this.buffer.getUint32(4, true);
  }
  set MoneyAmount(value: number){
    this.buffer.setUint32(4, value, true);
  }
}
export class TradeRequestAnswerPacket {
  buffer!: DataView;
  static readonly Name = `TradeRequestAnswer`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `The player which receives this message, sent a trade request to another player. This message is sent when the other player responded to this request.`;
  static readonly CausedReaction = `If the trade was accepted, a trade dialog is opened. Otherwise, a message is shown.`;
  static readonly Length = 20;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x37;

  static getRequiredSize(dataSize:number){
    return TradeRequestAnswerPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, TradeRequestAnswerPacket.HeaderCode);
    b.setUint8(TradeRequestAnswerPacket.DataOffset, TradeRequestAnswerPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = TradeRequestAnswerPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  private _readString (from :number, to: number): string {
    return readWireString(this.buffer, from, to);
  }

  static createPacket(requiredSize: number = 20): TradeRequestAnswerPacket {
    const p = new TradeRequestAnswerPacket();
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
  get TradePartnerLevel(){
    return this.buffer.getUint16(14, false);
  }
  set TradePartnerLevel(value: number){
    this.buffer.setUint16(14, value, false);
  }
  get GuildId(){
    return this.buffer.getUint32(16, true);
  }
  set GuildId(value: number){
    this.buffer.setUint32(16, value, true);
  }
}
export class TradeRequestPacket {
  buffer!: DataView;
  static readonly Name = `TradeRequest`;
  static readonly HeaderType = `C3Header`;
  static readonly HeaderCode = 0xC3;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `A trade was requested by another player.`;
  static readonly CausedReaction = `A trade request dialog is shown.`;
  static readonly Length = 13;
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

  private _readString (from :number, to: number): string {
    return readWireString(this.buffer, from, to);
  }

  static createPacket(requiredSize: number = 13): TradeRequestPacket {
    const p = new TradeRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Name(){
    const to = 13;
              
    return this._readString(3, to);
  }
  setName(str: string, count = 10){
    const from = 3;
    for(let i = 0; i < str.length; i++){
      const char = str.charCodeAt(i);
      this.buffer.setUint8(from + i, char);
    }
}
}
export enum TradeFinishedTradeResultEnum {
    Cancelled = 0,
Success = 1,
FailedByFullInventory = 2,
TimedOut = 3,
FailedByItemsNotAllowedToTrade = 4
  }export class TradeFinishedPacket {
  buffer!: DataView;
  static readonly Name = `TradeFinished`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `A trade was finished.`;
  static readonly CausedReaction = `The trade dialog is closed. Depending on the result, a message is shown.`;
  static readonly Length = 4;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x3D;

  static getRequiredSize(dataSize:number){
    return TradeFinishedPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, TradeFinishedPacket.HeaderCode);
    b.setUint8(TradeFinishedPacket.DataOffset, TradeFinishedPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = TradeFinishedPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 4): TradeFinishedPacket {
    const p = new TradeFinishedPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Result():TradeFinishedTradeResultEnum{
    return GetByteValue(this.buffer.getUint8(3), 8, 0);
  }
  set Result(value: TradeFinishedTradeResultEnum){
    const oldValue = this.Result;
    this.buffer.setUint8(3, SetByteValue(oldValue, value, 8, 0));
  }
}
export class TradeItemAddedPacket {
  buffer!: DataView;
  static readonly Name = `TradeItemAdded`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `The trading partner added an item to the trade.`;
  static readonly CausedReaction = `The item is added in the trade dialog.`;
  static readonly Length = undefined;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x39;

  static getRequiredSize(dataSize:number){
    return TradeItemAddedPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, TradeItemAddedPacket.HeaderCode);
    b.setUint8(TradeItemAddedPacket.DataOffset, TradeItemAddedPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = TradeItemAddedPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number): TradeItemAddedPacket {
    const p = new TradeItemAddedPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get ToSlot() {
    return GetByteValue(this.buffer.getUint8(3), 8, 0);
  }
  set ToSlot(value: number) {
    const oldByte = this.buffer.getUint8(3);
    this.buffer.setUint8(3, SetByteValue(oldByte, value, 8, 0));
  }
  get ItemData(){
    const to = this.buffer.byteLength;
    const i = 4;
              
    return new DataView(this.buffer.buffer.slice(i,to));
  }
  setItemData(data: ArrayLike<number>, count = NaN){
    if (data.length !== count) throw new Error(`data.length must be ${count}`);
    const from = 4;

    for (let i = 0; i < data.length; i++) {
      this.buffer.setUint8(from + i, data[i]);
    }
}
}
export class TradeItemRemovedPacket {
  buffer!: DataView;
  static readonly Name = `TradeItemRemoved`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `The trading partner removed an item from the trade.`;
  static readonly CausedReaction = `The item is removed from the trade dialog.`;
  static readonly Length = 4;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x38;

  static getRequiredSize(dataSize:number){
    return TradeItemRemovedPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, TradeItemRemovedPacket.HeaderCode);
    b.setUint8(TradeItemRemovedPacket.DataOffset, TradeItemRemovedPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = TradeItemRemovedPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 4): TradeItemRemovedPacket {
    const p = new TradeItemRemovedPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Slot() {
    return GetByteValue(this.buffer.getUint8(3), 8, 0);
  }
  set Slot(value: number) {
    const oldByte = this.buffer.getUint8(3);
    this.buffer.setUint8(3, SetByteValue(oldByte, value, 8, 0));
  }
}
export enum LoginResponseLoginResultEnum {
    InvalidPassword = 0,
Okay = 1,
AccountInvalid = 2,
AccountAlreadyConnected = 3,
ServerIsFull = 4,
AccountBlocked = 5,
WrongVersion = 6,
ConnectionError = 7,
ConnectionClosed3Fails = 8,
NoChargeInfo = 9,
SubscriptionTermOver = 10,
SubscriptionTimeOver = 11,
TemporaryBlocked = 14,
OnlyPlayersOver15Yrs = 17,
BadCountry = 210
  }export class LoginResponsePacket {
  buffer!: DataView;
  static readonly Name = `LoginResponse`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `After the login request has been processed by the server.`;
  static readonly CausedReaction = `Shows the result. When it was successful, the client proceeds by sending a character list request.`;
  static readonly Length = 5;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xF1;
  static readonly SubCode = 0x01;

  static getRequiredSize(dataSize:number){
    return LoginResponsePacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, LoginResponsePacket.HeaderCode);
    b.setUint8(LoginResponsePacket.DataOffset, LoginResponsePacket.Code);
  b.setUint8(LoginResponsePacket.DataOffset + 1, LoginResponsePacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = LoginResponsePacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 5): LoginResponsePacket {
    const p = new LoginResponsePacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Success():LoginResponseLoginResultEnum{
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set Success(value: LoginResponseLoginResultEnum){
    const oldValue = this.Success;
    this.buffer.setUint8(4, SetByteValue(oldValue, value, 8, 0));
  }
}
export class LogoutResponsePacket {
  buffer!: DataView;
  static readonly Name = `LogoutResponse`;
  static readonly HeaderType = `C3HeaderWithSubCode`;
  static readonly HeaderCode = 0xC3;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `After the logout request has been processed by the server.`;
  static readonly CausedReaction = `Depending on the result, the game client closes the game or changes to another selection screen.`;
  static readonly Length = 5;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xF1;
  static readonly SubCode = 0x02;

  static getRequiredSize(dataSize:number){
    return LogoutResponsePacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, LogoutResponsePacket.HeaderCode);
    b.setUint8(LogoutResponsePacket.DataOffset, LogoutResponsePacket.Code);
  b.setUint8(LogoutResponsePacket.DataOffset + 1, LogoutResponsePacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = LogoutResponsePacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 5): LogoutResponsePacket {
    const p = new LogoutResponsePacket();
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
export enum ChatMessageChatMessageTypeEnum {
    Normal = 0,
Whisper = 2
  }export class ChatMessagePacket {
  buffer!: DataView;
  static readonly Name = `ChatMessage`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `A player sends a chat message.`;
  static readonly CausedReaction = `The message is shown in the chat box and above the character of the sender.`;
  static readonly Length = undefined;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x00;

  static getRequiredSize(dataSize:number){
    return ChatMessagePacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, ChatMessagePacket.HeaderCode);
    b.setUint8(ChatMessagePacket.DataOffset, ChatMessagePacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = ChatMessagePacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  private _readString (from :number, to: number): string {
    return readWireString(this.buffer, from, to);
  }

  static createPacket(requiredSize: number): ChatMessagePacket {
    const p = new ChatMessagePacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Type():ChatMessageChatMessageTypeEnum{
    return GetByteValue(this.buffer.getUint8(2), 8, 0);
  }
  set Type(value: ChatMessageChatMessageTypeEnum){
    const oldValue = this.Type;
    this.buffer.setUint8(2, SetByteValue(oldValue, value, 8, 0));
  }
  get Sender(){
    const to = 13;
              
    return this._readString(3, to);
  }
  setSender(str: string, count = 10){
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
export class ObjectHitPacket {
  buffer!: DataView;
  static readonly Name = `ObjectHit`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `An object got hit in two cases: 1. When the own player is hit; 2. When the own player attacked some other object which got hit.`;
  static readonly CausedReaction = `The damage is shown at the object which received the hit.`;
  static readonly Length = 10;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x11;

  static getRequiredSize(dataSize:number){
    return ObjectHitPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, ObjectHitPacket.HeaderCode);
    b.setUint8(ObjectHitPacket.DataOffset, ObjectHitPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = ObjectHitPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 10): ObjectHitPacket {
    const p = new ObjectHitPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get HeaderCode() {
    return GetByteValue(this.buffer.getUint8(2), 8, 0);
  }
  set HeaderCode(value: number) {
    const oldByte = this.buffer.getUint8(2);
    this.buffer.setUint8(2, SetByteValue(oldByte, value, 8, 0));
  }
  get ObjectId(){
    return this.buffer.getUint16(3, false);
  }
  set ObjectId(value: number){
    this.buffer.setUint16(3, value, false);
  }
  get HealthDamage(){
    return this.buffer.getUint16(5, false);
  }
  set HealthDamage(value: number){
    this.buffer.setUint16(5, value, false);
  }
  get Kind():DamageKindEnum{
    return GetByteValue(this.buffer.getUint8(7), 4, 0);
  }
  set Kind(value: DamageKindEnum){
    const oldValue = this.Kind;
    this.buffer.setUint8(7, SetByteValue(oldValue, value, 4, 0));
  }
  get IsRageFighterStreakHit(){
    return GetBoolean(this.buffer.getUint8(7), 4);
  }
  set IsRageFighterStreakHit(value: boolean){
    const oldByte = this.buffer.getUint8(7);
    this.buffer.setUint8(7, SetBoolean(oldByte, value, 4));
  }
  get IsRageFighterStreakFinalHit(){
    return GetBoolean(this.buffer.getUint8(7), 5);
  }
  set IsRageFighterStreakFinalHit(value: boolean){
    const oldByte = this.buffer.getUint8(7);
    this.buffer.setUint8(7, SetBoolean(oldByte, value, 5));
  }
  get IsDoubleDamage(){
    return GetBoolean(this.buffer.getUint8(7), 6);
  }
  set IsDoubleDamage(value: boolean){
    const oldByte = this.buffer.getUint8(7);
    this.buffer.setUint8(7, SetBoolean(oldByte, value, 6));
  }
  get IsTripleDamage(){
    return GetBoolean(this.buffer.getUint8(7), 7);
  }
  set IsTripleDamage(value: boolean){
    const oldByte = this.buffer.getUint8(7);
    this.buffer.setUint8(7, SetBoolean(oldByte, value, 7));
  }
  get ShieldDamage(){
    return this.buffer.getUint16(8, false);
  }
  set ShieldDamage(value: number){
    this.buffer.setUint16(8, value, false);
  }
}
export class ObjectHitExtendedPacket {
  buffer!: DataView;
  static readonly Name = `ObjectHitExtended`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `An object got hit in two cases: 1. When the own player is hit; 2. When the own player attacked some other object which got hit.`;
  static readonly CausedReaction = `The damage is shown at the object which received the hit.`;
  static readonly Length = 16;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x11;

  static getRequiredSize(dataSize:number){
    return ObjectHitExtendedPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, ObjectHitExtendedPacket.HeaderCode);
    b.setUint8(ObjectHitExtendedPacket.DataOffset, ObjectHitExtendedPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = ObjectHitExtendedPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 16): ObjectHitExtendedPacket {
    const p = new ObjectHitExtendedPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Kind():DamageKindEnum{
    return GetByteValue(this.buffer.getUint8(3), 4, 0);
  }
  set Kind(value: DamageKindEnum){
    const oldValue = this.Kind;
    this.buffer.setUint8(3, SetByteValue(oldValue, value, 4, 0));
  }
  get IsRageFighterStreakHit(){
    return GetBoolean(this.buffer.getUint8(3), 4);
  }
  set IsRageFighterStreakHit(value: boolean){
    const oldByte = this.buffer.getUint8(3);
    this.buffer.setUint8(3, SetBoolean(oldByte, value, 4));
  }
  get IsRageFighterStreakFinalHit(){
    return GetBoolean(this.buffer.getUint8(3), 5);
  }
  set IsRageFighterStreakFinalHit(value: boolean){
    const oldByte = this.buffer.getUint8(3);
    this.buffer.setUint8(3, SetBoolean(oldByte, value, 5));
  }
  get IsDoubleDamage(){
    return GetBoolean(this.buffer.getUint8(3), 6);
  }
  set IsDoubleDamage(value: boolean){
    const oldByte = this.buffer.getUint8(3);
    this.buffer.setUint8(3, SetBoolean(oldByte, value, 6));
  }
  get IsTripleDamage(){
    return GetBoolean(this.buffer.getUint8(3), 7);
  }
  set IsTripleDamage(value: boolean){
    const oldByte = this.buffer.getUint8(3);
    this.buffer.setUint8(3, SetBoolean(oldByte, value, 7));
  }
  get ObjectId(){
    return this.buffer.getUint16(4, true);
  }
  set ObjectId(value: number){
    this.buffer.setUint16(4, value, true);
  }
  get HealthStatus() {
    return GetByteValue(this.buffer.getUint8(6), 8, 0);
  }
  set HealthStatus(value: number) {
    const oldByte = this.buffer.getUint8(6);
    this.buffer.setUint8(6, SetByteValue(oldByte, value, 8, 0));
  }
  get ShieldStatus() {
    return GetByteValue(this.buffer.getUint8(7), 8, 0);
  }
  set ShieldStatus(value: number) {
    const oldByte = this.buffer.getUint8(7);
    this.buffer.setUint8(7, SetByteValue(oldByte, value, 8, 0));
  }
  get HealthDamage(){
    return this.buffer.getUint32(8, true);
  }
  set HealthDamage(value: number){
    this.buffer.setUint32(8, value, true);
  }
  get ShieldDamage(){
    return this.buffer.getUint32(12, true);
  }
  set ShieldDamage(value: number){
    this.buffer.setUint32(12, value, true);
  }
}
export class ObjectMovedPacket {
  buffer!: DataView;
  static readonly Name = `ObjectMoved`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `An object in the observed scope (including the own player) moved instantly.`;
  static readonly CausedReaction = `The position of the object is updated on client side.`;
  static readonly Length = 8;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x15;

  static getRequiredSize(dataSize:number){
    return ObjectMovedPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, ObjectMovedPacket.HeaderCode);
    b.setUint8(ObjectMovedPacket.DataOffset, ObjectMovedPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = ObjectMovedPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 8): ObjectMovedPacket {
    const p = new ObjectMovedPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get HeaderCode() {
    return GetByteValue(this.buffer.getUint8(2), 8, 0);
  }
  set HeaderCode(value: number) {
    const oldByte = this.buffer.getUint8(2);
    this.buffer.setUint8(2, SetByteValue(oldByte, value, 8, 0));
  }
  get ObjectId(){
    return this.buffer.getUint16(3, false);
  }
  set ObjectId(value: number){
    this.buffer.setUint16(3, value, false);
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
}
export class ObjectWalkedPacket {
  buffer!: DataView;
  static readonly Name = `ObjectWalked`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `An object in the observed scope (including the own player) walked to another position.`;
  static readonly CausedReaction = `The object is animated to walk to the new position.`;
  static readonly Length = undefined;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xD4;

  static getRequiredSize(dataSize:number){
    return ObjectWalkedPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, ObjectWalkedPacket.HeaderCode);
    b.setUint8(ObjectWalkedPacket.DataOffset, ObjectWalkedPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = ObjectWalkedPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number): ObjectWalkedPacket {
    const p = new ObjectWalkedPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get HeaderCode() {
    return GetByteValue(this.buffer.getUint8(2), 8, 0);
  }
  set HeaderCode(value: number) {
    const oldByte = this.buffer.getUint8(2);
    this.buffer.setUint8(2, SetByteValue(oldByte, value, 8, 0));
  }
  get ObjectId(){
    return this.buffer.getUint16(3, false);
  }
  set ObjectId(value: number){
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
  get TargetRotation(){
    return GetByteValue(this.buffer.getUint8(7), 4, 4);
  }
  set TargetRotation(value: number) {
    const oldByte = this.buffer.getUint8(7);
    this.buffer.setUint8(7, SetByteValue(oldByte, value, 4, 4));
  }
  get StepCount(){
    return GetByteValue(this.buffer.getUint8(7), 4, 0);
  }
  set StepCount(value: number) {
    const oldByte = this.buffer.getUint8(7);
    this.buffer.setUint8(7, SetByteValue(oldByte, value, 4, 0));
  }
  get StepData(){
    const to = this.buffer.byteLength;
    const i = 8;
              
    return new DataView(this.buffer.buffer.slice(i,to));
  }
  setStepData(data: ArrayLike<number>, count = NaN){
    if (data.length !== count) throw new Error(`data.length must be ${count}`);
    const from = 8;

    for (let i = 0; i < data.length; i++) {
      this.buffer.setUint8(from + i, data[i]);
    }
}
}
export class ObjectWalkedExtendedPacket {
  buffer!: DataView;
  static readonly Name = `ObjectWalkedExtended`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `An object in the observed scope (including the own player) walked to another position.`;
  static readonly CausedReaction = `The object is animated to walk to the new position.`;
  static readonly Length = undefined;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xD4;

  static getRequiredSize(dataSize:number){
    return ObjectWalkedExtendedPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, ObjectWalkedExtendedPacket.HeaderCode);
    b.setUint8(ObjectWalkedExtendedPacket.DataOffset, ObjectWalkedExtendedPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = ObjectWalkedExtendedPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number): ObjectWalkedExtendedPacket {
    const p = new ObjectWalkedExtendedPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get HeaderCode() {
    return GetByteValue(this.buffer.getUint8(2), 8, 0);
  }
  set HeaderCode(value: number) {
    const oldByte = this.buffer.getUint8(2);
    this.buffer.setUint8(2, SetByteValue(oldByte, value, 8, 0));
  }
  get ObjectId(){
    return this.buffer.getUint16(3, false);
  }
  set ObjectId(value: number){
    this.buffer.setUint16(3, value, false);
  }
  get SourceX() {
    return GetByteValue(this.buffer.getUint8(5), 8, 0);
  }
  set SourceX(value: number) {
    const oldByte = this.buffer.getUint8(5);
    this.buffer.setUint8(5, SetByteValue(oldByte, value, 8, 0));
  }
  get SourceY() {
    return GetByteValue(this.buffer.getUint8(6), 8, 0);
  }
  set SourceY(value: number) {
    const oldByte = this.buffer.getUint8(6);
    this.buffer.setUint8(6, SetByteValue(oldByte, value, 8, 0));
  }
  get TargetX() {
    return GetByteValue(this.buffer.getUint8(7), 8, 0);
  }
  set TargetX(value: number) {
    const oldByte = this.buffer.getUint8(7);
    this.buffer.setUint8(7, SetByteValue(oldByte, value, 8, 0));
  }
  get TargetY() {
    return GetByteValue(this.buffer.getUint8(8), 8, 0);
  }
  set TargetY(value: number) {
    const oldByte = this.buffer.getUint8(8);
    this.buffer.setUint8(8, SetByteValue(oldByte, value, 8, 0));
  }
  get TargetRotation(){
    return GetByteValue(this.buffer.getUint8(9), 4, 4);
  }
  set TargetRotation(value: number) {
    const oldByte = this.buffer.getUint8(9);
    this.buffer.setUint8(9, SetByteValue(oldByte, value, 4, 4));
  }
  get StepCount(){
    return GetByteValue(this.buffer.getUint8(9), 4, 0);
  }
  set StepCount(value: number) {
    const oldByte = this.buffer.getUint8(9);
    this.buffer.setUint8(9, SetByteValue(oldByte, value, 4, 0));
  }
  get StepData(){
    const to = this.buffer.byteLength;
    const i = 10;
              
    return new DataView(this.buffer.buffer.slice(i,to));
  }
  setStepData(data: ArrayLike<number>, count = NaN){
    if (data.length !== count) throw new Error(`data.length must be ${count}`);
    const from = 10;

    for (let i = 0; i < data.length; i++) {
      this.buffer.setUint8(from + i, data[i]);
    }
}
}
export class ObjectWalked075Packet {
  buffer!: DataView;
  static readonly Name = `ObjectWalked075`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `An object in the observed scope (including the own player) walked to another position.`;
  static readonly CausedReaction = `The object is animated to walk to the new position.`;
  static readonly Length = 8;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x10;

  static getRequiredSize(dataSize:number){
    return ObjectWalked075Packet.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, ObjectWalked075Packet.HeaderCode);
    b.setUint8(ObjectWalked075Packet.DataOffset, ObjectWalked075Packet.Code);
  
    return this;
  }

  writeLength(l: number|undefined = ObjectWalked075Packet.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 8): ObjectWalked075Packet {
    const p = new ObjectWalked075Packet();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get ObjectId(){
    return this.buffer.getUint16(3, false);
  }
  set ObjectId(value: number){
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
  get TargetRotation(){
    return GetByteValue(this.buffer.getUint8(7), 4, 4);
  }
  set TargetRotation(value: number) {
    const oldByte = this.buffer.getUint8(7);
    this.buffer.setUint8(7, SetByteValue(oldByte, value, 4, 4));
  }
}
export class ExperienceGainedPacket {
  buffer!: DataView;
  static readonly Name = `ExperienceGained`;
  static readonly HeaderType = `C3Header`;
  static readonly HeaderCode = 0xC3;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `A player gained experience.`;
  static readonly CausedReaction = `The experience is added to the experience counter and bar.`;
  static readonly Length = 9;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x16;

  static getRequiredSize(dataSize:number){
    return ExperienceGainedPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, ExperienceGainedPacket.HeaderCode);
    b.setUint8(ExperienceGainedPacket.DataOffset, ExperienceGainedPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = ExperienceGainedPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 9): ExperienceGainedPacket {
    const p = new ExperienceGainedPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get KilledObjectId(){
    return this.buffer.getUint16(3, false);
  }
  set KilledObjectId(value: number){
    this.buffer.setUint16(3, value, false);
  }
  get AddedExperience(){
    return this.buffer.getUint16(5, false);
  }
  set AddedExperience(value: number){
    this.buffer.setUint16(5, value, false);
  }
  get DamageOfLastHit(){
    return this.buffer.getUint16(7, false);
  }
  set DamageOfLastHit(value: number){
    this.buffer.setUint16(7, value, false);
  }
}
export enum ExperienceGainedExtendedAddResultEnum {
    Undefined = 0,
Normal = 1,
Master = 2,
MaxLevelReached = 16,
MaxMasterLevelReached = 32,
MonsterLevelTooLowForMasterExperience = 33
  }export class ExperienceGainedExtendedPacket {
  buffer!: DataView;
  static readonly Name = `ExperienceGainedExtended`;
  static readonly HeaderType = `C3Header`;
  static readonly HeaderCode = 0xC3;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `A player gained experience.`;
  static readonly CausedReaction = `The experience is added to the experience counter and bar.`;
  static readonly Length = 16;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x16;

  static getRequiredSize(dataSize:number){
    return ExperienceGainedExtendedPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, ExperienceGainedExtendedPacket.HeaderCode);
    b.setUint8(ExperienceGainedExtendedPacket.DataOffset, ExperienceGainedExtendedPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = ExperienceGainedExtendedPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 16): ExperienceGainedExtendedPacket {
    const p = new ExperienceGainedExtendedPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Type():ExperienceGainedExtendedAddResultEnum{
    return GetByteValue(this.buffer.getUint8(3), 8, 0);
  }
  set Type(value: ExperienceGainedExtendedAddResultEnum){
    const oldValue = this.Type;
    this.buffer.setUint8(3, SetByteValue(oldValue, value, 8, 0));
  }
  get AddedExperience(){
    return this.buffer.getUint32(4, true);
  }
  set AddedExperience(value: number){
    this.buffer.setUint32(4, value, true);
  }
  get DamageOfLastHit(){
    return this.buffer.getUint32(8, true);
  }
  set DamageOfLastHit(value: number){
    this.buffer.setUint32(8, value, true);
  }
  get KilledObjectId(){
    return this.buffer.getUint16(12, true);
  }
  set KilledObjectId(value: number){
    this.buffer.setUint16(12, value, true);
  }
  get KillerObjectId(){
    return this.buffer.getUint16(14, true);
  }
  set KillerObjectId(value: number){
    this.buffer.setUint16(14, value, true);
  }
}
export class MapChangedPacket {
  buffer!: DataView;
  static readonly Name = `MapChanged`;
  static readonly HeaderType = `C3HeaderWithSubCode`;
  static readonly HeaderCode = 0xC3;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `The map was changed on the server side.`;
  static readonly CausedReaction = `The game client changes to the specified map and coordinates.`;
  static readonly Length = 15;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x1C;
  static readonly SubCode = 0x0F;

  static getRequiredSize(dataSize:number){
    return MapChangedPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, MapChangedPacket.HeaderCode);
    b.setUint8(MapChangedPacket.DataOffset, MapChangedPacket.Code);
  b.setUint8(MapChangedPacket.DataOffset + 1, MapChangedPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = MapChangedPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 15): MapChangedPacket {
    const p = new MapChangedPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get IsMapChange(){
    return GetBoolean(this.buffer.getUint8(4), 0);
  }
  set IsMapChange(value: boolean){
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetBoolean(oldByte, value, 0));
  }
  get MapNumber(){
    return this.buffer.getUint16(5, false);
  }
  set MapNumber(value: number){
    this.buffer.setUint16(5, value, false);
  }
  get PositionX() {
    return GetByteValue(this.buffer.getUint8(7), 8, 0);
  }
  set PositionX(value: number) {
    const oldByte = this.buffer.getUint8(7);
    this.buffer.setUint8(7, SetByteValue(oldByte, value, 8, 0));
  }
  get PositionY() {
    return GetByteValue(this.buffer.getUint8(8), 8, 0);
  }
  set PositionY(value: number) {
    const oldByte = this.buffer.getUint8(8);
    this.buffer.setUint8(8, SetByteValue(oldByte, value, 8, 0));
  }
  get Rotation() {
    return GetByteValue(this.buffer.getUint8(9), 8, 0);
  }
  set Rotation(value: number) {
    const oldByte = this.buffer.getUint8(9);
    this.buffer.setUint8(9, SetByteValue(oldByte, value, 8, 0));
  }
}
export class MapChanged075Packet {
  buffer!: DataView;
  static readonly Name = `MapChanged075`;
  static readonly HeaderType = `C3Header`;
  static readonly HeaderCode = 0xC3;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `The map was changed on the server side.`;
  static readonly CausedReaction = `The game client changes to the specified map and coordinates.`;
  static readonly Length = 8;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x1C;

  static getRequiredSize(dataSize:number){
    return MapChanged075Packet.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, MapChanged075Packet.HeaderCode);
    b.setUint8(MapChanged075Packet.DataOffset, MapChanged075Packet.Code);
  
    return this;
  }

  writeLength(l: number|undefined = MapChanged075Packet.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 8): MapChanged075Packet {
    const p = new MapChanged075Packet();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get IsMapChange(){
    return GetBoolean(this.buffer.getUint8(3), 0);
  }
  set IsMapChange(value: boolean){
    const oldByte = this.buffer.getUint8(3);
    this.buffer.setUint8(3, SetBoolean(oldByte, value, 0));
  }
  get MapNumber() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set MapNumber(value: number) {
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
  get Rotation() {
    return GetByteValue(this.buffer.getUint8(7), 8, 0);
  }
  set Rotation(value: number) {
    const oldByte = this.buffer.getUint8(7);
    this.buffer.setUint8(7, SetByteValue(oldByte, value, 8, 0));
  }
}
export class ApplyKeyConfigurationPacket {
  buffer!: DataView;
  static readonly Name = `ApplyKeyConfiguration`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `When entering the game world with a character.`;
  static readonly CausedReaction = `The client restores this configuration in its user interface.`;
  static readonly Length = undefined;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xF3;
  static readonly SubCode = 0x30;

  static getRequiredSize(dataSize:number){
    return ApplyKeyConfigurationPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, ApplyKeyConfigurationPacket.HeaderCode);
    b.setUint8(ApplyKeyConfigurationPacket.DataOffset, ApplyKeyConfigurationPacket.Code);
  b.setUint8(ApplyKeyConfigurationPacket.DataOffset + 1, ApplyKeyConfigurationPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = ApplyKeyConfigurationPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number): ApplyKeyConfigurationPacket {
    const p = new ApplyKeyConfigurationPacket();
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
export class ItemsDroppedPacket {
  buffer!: DataView;
  static readonly Name = `ItemsDropped`;
  static readonly HeaderType = `C2Header`;
  static readonly HeaderCode = 0xC2;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `The items dropped on the ground.`;
  static readonly CausedReaction = `The client adds the items to the ground.`;
  static readonly Length = undefined;
  static readonly LengthSize = 2;
  static readonly DataOffset = 3;
  static readonly Code = 0x20;

  static getRequiredSize(dataSize:number){
    return ItemsDroppedPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, ItemsDroppedPacket.HeaderCode);
    b.setUint8(ItemsDroppedPacket.DataOffset, ItemsDroppedPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = ItemsDroppedPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint16(1, l);
    return this;
  }

  private _readDataView (from: number, to: number): DataView {
    return new DataView(this.buffer.buffer.slice(from, to));
  }

  static createPacket(requiredSize: number): ItemsDroppedPacket {
    const p = new ItemsDroppedPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get ItemCount() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set ItemCount(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }

  getItems(count: number = this.ItemCount): {
  Id: ShortBigEndian;
  IsFreshDrop: Boolean;
  PositionX: Byte;
  PositionY: Byte;
  ItemData: Binary;

}[]{
    const b = this.buffer;
    let bi = 0;

    const Items_count = count;
    const Items: any[] = new Array(Items_count);
    
    let Items_StartOffset = bi + 5;
    for (let i = 0; i < Items_count; i++) {
      const Id = b.getUint16(Items_StartOffset + 0, false);
      const IsFreshDrop = GetBoolean(b.getUint8(Items_StartOffset + 0), 7);
      const PositionX = b.getUint8(Items_StartOffset + 2);
      const PositionY = b.getUint8(Items_StartOffset + 3);
      const ItemData = this._readDataView(Items_StartOffset + 4, Items_StartOffset + 4 + 12);
      Items[i] = {
        Id,
        IsFreshDrop,
        PositionX,
        PositionY,
        ItemData
      };
      Items_StartOffset += 16;
    }
    
    return Items;
  }}
export class MoneyDroppedPacket {
  buffer!: DataView;
  static readonly Name = `MoneyDropped`;
  static readonly HeaderType = `C2Header`;
  static readonly HeaderCode = 0xC2;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `Money dropped on the ground.`;
  static readonly CausedReaction = `The client adds the money to the ground.`;
  static readonly Length = 21;
  static readonly LengthSize = 2;
  static readonly DataOffset = 3;
  static readonly Code = 0x20;

  static getRequiredSize(dataSize:number){
    return MoneyDroppedPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, MoneyDroppedPacket.HeaderCode);
    b.setUint8(MoneyDroppedPacket.DataOffset, MoneyDroppedPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = MoneyDroppedPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint16(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 21): MoneyDroppedPacket {
    const p = new MoneyDroppedPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get ItemCount() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set ItemCount(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }
  get Id(){
    return this.buffer.getUint16(5, false);
  }
  set Id(value: number){
    this.buffer.setUint16(5, value, false);
  }
  get IsFreshDrop(){
    return GetBoolean(this.buffer.getUint8(5), 7);
  }
  set IsFreshDrop(value: boolean){
    const oldByte = this.buffer.getUint8(5);
    this.buffer.setUint8(5, SetBoolean(oldByte, value, 7));
  }
  get PositionX() {
    return GetByteValue(this.buffer.getUint8(7), 8, 0);
  }
  set PositionX(value: number) {
    const oldByte = this.buffer.getUint8(7);
    this.buffer.setUint8(7, SetByteValue(oldByte, value, 8, 0));
  }
  get PositionY() {
    return GetByteValue(this.buffer.getUint8(8), 8, 0);
  }
  set PositionY(value: number) {
    const oldByte = this.buffer.getUint8(8);
    this.buffer.setUint8(8, SetByteValue(oldByte, value, 8, 0));
  }
  get MoneyNumber() {
    return GetByteValue(this.buffer.getUint8(9), 8, 0);
  }
  set MoneyNumber(value: number) {
    const oldByte = this.buffer.getUint8(9);
    this.buffer.setUint8(9, SetByteValue(oldByte, value, 8, 0));
  }
  get Amount(){
    return this.buffer.getUint32(10, true);
  }
  set Amount(value: number){
    this.buffer.setUint32(10, value, true);
  }
  get MoneyGroup() {
    return GetByteValue(this.buffer.getUint8(14), 8, 4);
  }
  set MoneyGroup(value: number) {
    const oldByte = this.buffer.getUint8(14);
    this.buffer.setUint8(14, SetByteValue(oldByte, value, 8, 4));
  }
}
export class MoneyDroppedExtendedPacket {
  buffer!: DataView;
  static readonly Name = `MoneyDroppedExtended`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `Money dropped on the ground.`;
  static readonly CausedReaction = `The client adds the money to the ground.`;
  static readonly Length = 12;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x2F;

  static getRequiredSize(dataSize:number){
    return MoneyDroppedExtendedPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, MoneyDroppedExtendedPacket.HeaderCode);
    b.setUint8(MoneyDroppedExtendedPacket.DataOffset, MoneyDroppedExtendedPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = MoneyDroppedExtendedPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 12): MoneyDroppedExtendedPacket {
    const p = new MoneyDroppedExtendedPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get IsFreshDrop(){
    return GetBoolean(this.buffer.getUint8(3), 0);
  }
  set IsFreshDrop(value: boolean){
    const oldByte = this.buffer.getUint8(3);
    this.buffer.setUint8(3, SetBoolean(oldByte, value, 0));
  }
  get Id(){
    return this.buffer.getUint16(4, true);
  }
  set Id(value: number){
    this.buffer.setUint16(4, value, true);
  }
  get PositionX() {
    return GetByteValue(this.buffer.getUint8(6), 8, 0);
  }
  set PositionX(value: number) {
    const oldByte = this.buffer.getUint8(6);
    this.buffer.setUint8(6, SetByteValue(oldByte, value, 8, 0));
  }
  get PositionY() {
    return GetByteValue(this.buffer.getUint8(7), 8, 0);
  }
  set PositionY(value: number) {
    const oldByte = this.buffer.getUint8(7);
    this.buffer.setUint8(7, SetByteValue(oldByte, value, 8, 0));
  }
  get Amount(){
    return this.buffer.getUint32(8, true);
  }
  set Amount(value: number){
    this.buffer.setUint32(8, value, true);
  }
}
export class MoneyDropped075Packet {
  buffer!: DataView;
  static readonly Name = `MoneyDropped075`;
  static readonly HeaderType = `C2Header`;
  static readonly HeaderCode = 0xC2;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `Money dropped on the ground.`;
  static readonly CausedReaction = `The client adds the money to the ground.`;
  static readonly Length = 14;
  static readonly LengthSize = 2;
  static readonly DataOffset = 3;
  static readonly Code = 0x20;

  static getRequiredSize(dataSize:number){
    return MoneyDropped075Packet.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, MoneyDropped075Packet.HeaderCode);
    b.setUint8(MoneyDropped075Packet.DataOffset, MoneyDropped075Packet.Code);
  
    return this;
  }

  writeLength(l: number|undefined = MoneyDropped075Packet.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint16(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 14): MoneyDropped075Packet {
    const p = new MoneyDropped075Packet();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get ItemCount() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set ItemCount(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }
  get Id(){
    return this.buffer.getUint16(5, false);
  }
  set Id(value: number){
    this.buffer.setUint16(5, value, false);
  }
  get IsFreshDrop(){
    return GetBoolean(this.buffer.getUint8(5), 7);
  }
  set IsFreshDrop(value: boolean){
    const oldByte = this.buffer.getUint8(5);
    this.buffer.setUint8(5, SetBoolean(oldByte, value, 7));
  }
  get PositionX() {
    return GetByteValue(this.buffer.getUint8(7), 8, 0);
  }
  set PositionX(value: number) {
    const oldByte = this.buffer.getUint8(7);
    this.buffer.setUint8(7, SetByteValue(oldByte, value, 8, 0));
  }
  get PositionY() {
    return GetByteValue(this.buffer.getUint8(8), 8, 0);
  }
  set PositionY(value: number) {
    const oldByte = this.buffer.getUint8(8);
    this.buffer.setUint8(8, SetByteValue(oldByte, value, 8, 0));
  }
  get MoneyNumber(){
    return GetByteValue(this.buffer.getUint8(9), 4, 0);
  }
  set MoneyNumber(value: number) {
    const oldByte = this.buffer.getUint8(9);
    this.buffer.setUint8(9, SetByteValue(oldByte, value, 4, 0));
  }
  get MoneyGroup(){
    return GetByteValue(this.buffer.getUint8(9), 4, 4);
  }
  set MoneyGroup(value: number) {
    const oldByte = this.buffer.getUint8(9);
    this.buffer.setUint8(9, SetByteValue(oldByte, value, 4, 4));
  }
  get Amount(){
    return this.buffer.getUint32(10, true);
  }
  set Amount(value: number){
    this.buffer.setUint32(10, value, true);
  }
}
export class ItemDropRemovedPacket {
  buffer!: DataView;
  static readonly Name = `ItemDropRemoved`;
  static readonly HeaderType = `C2Header`;
  static readonly HeaderCode = 0xC2;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `A dropped item was removed from the ground of the map, e.g. when it timed out or was picked up.`;
  static readonly CausedReaction = `The client removes the item from the ground of the map.`;
  static readonly Length = undefined;
  static readonly LengthSize = 2;
  static readonly DataOffset = 3;
  static readonly Code = 0x21;

  static getRequiredSize(dataSize:number){
    return ItemDropRemovedPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, ItemDropRemovedPacket.HeaderCode);
    b.setUint8(ItemDropRemovedPacket.DataOffset, ItemDropRemovedPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = ItemDropRemovedPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint16(1, l);
    return this;
  }

  static createPacket(requiredSize: number): ItemDropRemovedPacket {
    const p = new ItemDropRemovedPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get ItemCount() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set ItemCount(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }

  getItemData(count: number = this.ItemCount): {
  Id: ShortBigEndian;

}[]{
    const b = this.buffer;
    let bi = 0;

    const ItemData_count = count;
    const ItemData: any[] = new Array(ItemData_count);
    
    let ItemData_StartOffset = bi + 5;
    for (let i = 0; i < ItemData_count; i++) {
      const Id = b.getUint16(ItemData_StartOffset + 0, false);
      ItemData[i] = {
        Id
      };
      ItemData_StartOffset += 2;
    }
    
    return ItemData;
  }}
export class ItemAddedToInventoryPacket {
  buffer!: DataView;
  static readonly Name = `ItemAddedToInventory`;
  static readonly HeaderType = `C3Header`;
  static readonly HeaderCode = 0xC3;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `A new item was added to the inventory.`;
  static readonly CausedReaction = `The client adds the item to the inventory user interface.`;
  static readonly Length = undefined;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x22;

  static getRequiredSize(dataSize:number){
    return ItemAddedToInventoryPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, ItemAddedToInventoryPacket.HeaderCode);
    b.setUint8(ItemAddedToInventoryPacket.DataOffset, ItemAddedToInventoryPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = ItemAddedToInventoryPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number): ItemAddedToInventoryPacket {
    const p = new ItemAddedToInventoryPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get InventorySlot() {
    return GetByteValue(this.buffer.getUint8(3), 8, 0);
  }
  set InventorySlot(value: number) {
    const oldByte = this.buffer.getUint8(3);
    this.buffer.setUint8(3, SetByteValue(oldByte, value, 8, 0));
  }
  get ItemData(){
    const to = this.buffer.byteLength;
    const i = 4;
              
    return new DataView(this.buffer.buffer.slice(i,to));
  }
  setItemData(data: ArrayLike<number>, count = NaN){
    if (data.length !== count) throw new Error(`data.length must be ${count}`);
    const from = 4;

    for (let i = 0; i < data.length; i++) {
      this.buffer.setUint8(from + i, data[i]);
    }
}
}
export class ItemDropResponsePacket {
  buffer!: DataView;
  static readonly Name = `ItemDropResponse`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `The player requested to drop an item of his inventory. This message is the response about the success of the request.`;
  static readonly CausedReaction = `If successful, the client removes the item from the inventory user interface.`;
  static readonly Length = 5;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x23;

  static getRequiredSize(dataSize:number){
    return ItemDropResponsePacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, ItemDropResponsePacket.HeaderCode);
    b.setUint8(ItemDropResponsePacket.DataOffset, ItemDropResponsePacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = ItemDropResponsePacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 5): ItemDropResponsePacket {
    const p = new ItemDropResponsePacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Success(){
    return GetBoolean(this.buffer.getUint8(3), 0);
  }
  set Success(value: boolean){
    const oldByte = this.buffer.getUint8(3);
    this.buffer.setUint8(3, SetBoolean(oldByte, value, 0));
  }
  get InventorySlot() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set InventorySlot(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }
}
export enum ItemPickUpRequestFailedItemPickUpFailReasonEnum {
    ItemStacked = 253,
__MaximumInventoryMoneyReached = 254,
General = 255
  }export class ItemPickUpRequestFailedPacket {
  buffer!: DataView;
  static readonly Name = `ItemPickUpRequestFailed`;
  static readonly HeaderType = `C3Header`;
  static readonly HeaderCode = 0xC3;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `The player requested to pick up an item from to ground to add it to his inventory, but it failed.`;
  static readonly CausedReaction = `Depending on the reason, the game client shows a message.`;
  static readonly Length = 4;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x22;

  static getRequiredSize(dataSize:number){
    return ItemPickUpRequestFailedPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, ItemPickUpRequestFailedPacket.HeaderCode);
    b.setUint8(ItemPickUpRequestFailedPacket.DataOffset, ItemPickUpRequestFailedPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = ItemPickUpRequestFailedPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 4): ItemPickUpRequestFailedPacket {
    const p = new ItemPickUpRequestFailedPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get FailReason():ItemPickUpRequestFailedItemPickUpFailReasonEnum{
    return GetByteValue(this.buffer.getUint8(3), 8, 0);
  }
  set FailReason(value: ItemPickUpRequestFailedItemPickUpFailReasonEnum){
    const oldValue = this.FailReason;
    this.buffer.setUint8(3, SetByteValue(oldValue, value, 8, 0));
  }
}
export class InventoryMoneyUpdatePacket {
  buffer!: DataView;
  static readonly Name = `InventoryMoneyUpdate`;
  static readonly HeaderType = `C3HeaderWithSubCode`;
  static readonly HeaderCode = 0xC3;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `The players money amount of the inventory has been changed and needs an update.`;
  static readonly CausedReaction = `The money is updated in the inventory user interface.`;
  static readonly Length = 8;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x22;
  static readonly SubCode = 0xFE;

  static getRequiredSize(dataSize:number){
    return InventoryMoneyUpdatePacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, InventoryMoneyUpdatePacket.HeaderCode);
    b.setUint8(InventoryMoneyUpdatePacket.DataOffset, InventoryMoneyUpdatePacket.Code);
  b.setUint8(InventoryMoneyUpdatePacket.DataOffset + 1, InventoryMoneyUpdatePacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = InventoryMoneyUpdatePacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 8): InventoryMoneyUpdatePacket {
    const p = new InventoryMoneyUpdatePacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Money(){
    return this.buffer.getUint32(4, false);
  }
  set Money(value: number){
    this.buffer.setUint32(4, value, false);
  }
}
export class ItemMovedPacket {
  buffer!: DataView;
  static readonly Name = `ItemMoved`;
  static readonly HeaderType = `C3Header`;
  static readonly HeaderCode = 0xC3;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `An item in the inventory or vault of the player has been moved.`;
  static readonly CausedReaction = `The client updates the position of item in the user interface.`;
  static readonly Length = undefined;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x24;

  static getRequiredSize(dataSize:number){
    return ItemMovedPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, ItemMovedPacket.HeaderCode);
    b.setUint8(ItemMovedPacket.DataOffset, ItemMovedPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = ItemMovedPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number): ItemMovedPacket {
    const p = new ItemMovedPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get TargetStorageType():Byte{
    return GetByteValue(this.buffer.getUint8(3), 8, 0);
  }
  set TargetStorageType(value: Byte){
    const oldValue = this.TargetStorageType;
    this.buffer.setUint8(3, SetByteValue(oldValue, value, 8, 0));
  }
  get TargetSlot() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set TargetSlot(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }
  get ItemData(){
    const to = this.buffer.byteLength;
    const i = 5;
              
    return new DataView(this.buffer.buffer.slice(i,to));
  }
  setItemData(data: ArrayLike<number>, count = NaN){
    if (data.length !== count) throw new Error(`data.length must be ${count}`);
    const from = 5;

    for (let i = 0; i < data.length; i++) {
      this.buffer.setUint8(from + i, data[i]);
    }
}
}
export class ItemMoveRequestFailedPacket {
  buffer!: DataView;
  static readonly Name = `ItemMoveRequestFailed`;
  static readonly HeaderType = `C3HeaderWithSubCode`;
  static readonly HeaderCode = 0xC3;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `An item in the inventory or vault of the player could not be moved as requested by the player.`;
  static readonly CausedReaction = `The client restores the position of item in the user interface.`;
  static readonly Length = undefined;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x24;
  static readonly SubCode = 0xFF;

  static getRequiredSize(dataSize:number){
    return ItemMoveRequestFailedPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, ItemMoveRequestFailedPacket.HeaderCode);
    b.setUint8(ItemMoveRequestFailedPacket.DataOffset, ItemMoveRequestFailedPacket.Code);
  b.setUint8(ItemMoveRequestFailedPacket.DataOffset + 1, ItemMoveRequestFailedPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = ItemMoveRequestFailedPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number): ItemMoveRequestFailedPacket {
    const p = new ItemMoveRequestFailedPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get ItemData(){
    const to = this.buffer.byteLength;
    const i = 5;
              
    return new DataView(this.buffer.buffer.slice(i,to));
  }
  setItemData(data: ArrayLike<number>, count = NaN){
    if (data.length !== count) throw new Error(`data.length must be ${count}`);
    const from = 5;

    for (let i = 0; i < data.length; i++) {
      this.buffer.setUint8(from + i, data[i]);
    }
}
}
export class CurrentHealthAndShieldPacket {
  buffer!: DataView;
  static readonly Name = `CurrentHealthAndShield`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `Periodically, or if the current health or shield changed on the server side, e.g. by hits.`;
  static readonly CausedReaction = `The health and shield bar is updated on the game client user interface.`;
  static readonly Length = 9;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x26;
  static readonly SubCode = 0xFF;

  static getRequiredSize(dataSize:number){
    return CurrentHealthAndShieldPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, CurrentHealthAndShieldPacket.HeaderCode);
    b.setUint8(CurrentHealthAndShieldPacket.DataOffset, CurrentHealthAndShieldPacket.Code);
  b.setUint8(CurrentHealthAndShieldPacket.DataOffset + 1, CurrentHealthAndShieldPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = CurrentHealthAndShieldPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 9): CurrentHealthAndShieldPacket {
    const p = new CurrentHealthAndShieldPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Health(){
    return this.buffer.getUint16(4, false);
  }
  set Health(value: number){
    this.buffer.setUint16(4, value, false);
  }
  get Shield(){
    return this.buffer.getUint16(7, false);
  }
  set Shield(value: number){
    this.buffer.setUint16(7, value, false);
  }
}
export class MaximumHealthAndShieldPacket {
  buffer!: DataView;
  static readonly Name = `MaximumHealthAndShield`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `When the maximum health changed, e.g. by adding stat points or changed items.`;
  static readonly CausedReaction = `The health and shield bar is updated on the game client user interface.`;
  static readonly Length = 9;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x26;
  static readonly SubCode = 0xFE;

  static getRequiredSize(dataSize:number){
    return MaximumHealthAndShieldPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, MaximumHealthAndShieldPacket.HeaderCode);
    b.setUint8(MaximumHealthAndShieldPacket.DataOffset, MaximumHealthAndShieldPacket.Code);
  b.setUint8(MaximumHealthAndShieldPacket.DataOffset + 1, MaximumHealthAndShieldPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = MaximumHealthAndShieldPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 9): MaximumHealthAndShieldPacket {
    const p = new MaximumHealthAndShieldPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Health(){
    return this.buffer.getUint16(4, false);
  }
  set Health(value: number){
    this.buffer.setUint16(4, value, false);
  }
  get Shield(){
    return this.buffer.getUint16(7, false);
  }
  set Shield(value: number){
    this.buffer.setUint16(7, value, false);
  }
}
export class CurrentStatsExtendedPacket {
  buffer!: DataView;
  static readonly Name = `CurrentStatsExtended`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `Periodically, or if the current stats, like health, shield, mana or attack speed changed on the server side, e.g. by hits.`;
  static readonly CausedReaction = `The values are updated on the game client user interface.`;
  static readonly Length = 24;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x26;
  static readonly SubCode = 0xFF;

  static getRequiredSize(dataSize:number){
    return CurrentStatsExtendedPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, CurrentStatsExtendedPacket.HeaderCode);
    b.setUint8(CurrentStatsExtendedPacket.DataOffset, CurrentStatsExtendedPacket.Code);
  b.setUint8(CurrentStatsExtendedPacket.DataOffset + 1, CurrentStatsExtendedPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = CurrentStatsExtendedPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 24): CurrentStatsExtendedPacket {
    const p = new CurrentStatsExtendedPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Health(){
    return this.buffer.getUint32(4, true);
  }
  set Health(value: number){
    this.buffer.setUint32(4, value, true);
  }
  get Shield(){
    return this.buffer.getUint32(8, true);
  }
  set Shield(value: number){
    this.buffer.setUint32(8, value, true);
  }
  get Mana(){
    return this.buffer.getUint32(12, true);
  }
  set Mana(value: number){
    this.buffer.setUint32(12, value, true);
  }
  get Ability(){
    return this.buffer.getUint32(16, true);
  }
  set Ability(value: number){
    this.buffer.setUint32(16, value, true);
  }
  get AttackSpeed(){
    return this.buffer.getUint16(20, true);
  }
  set AttackSpeed(value: number){
    this.buffer.setUint16(20, value, true);
  }
  get MagicSpeed(){
    return this.buffer.getUint16(22, true);
  }
  set MagicSpeed(value: number){
    this.buffer.setUint16(22, value, true);
  }
}
export class MaximumStatsExtendedPacket {
  buffer!: DataView;
  static readonly Name = `MaximumStatsExtended`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `When the maximum stats, like health, shield, mana or attack speed changed on the server side, e.g. by adding stat points or changed items.`;
  static readonly CausedReaction = `The values are updated on the game client user interface.`;
  static readonly Length = 20;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x26;
  static readonly SubCode = 0xFE;

  static getRequiredSize(dataSize:number){
    return MaximumStatsExtendedPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, MaximumStatsExtendedPacket.HeaderCode);
    b.setUint8(MaximumStatsExtendedPacket.DataOffset, MaximumStatsExtendedPacket.Code);
  b.setUint8(MaximumStatsExtendedPacket.DataOffset + 1, MaximumStatsExtendedPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = MaximumStatsExtendedPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 20): MaximumStatsExtendedPacket {
    const p = new MaximumStatsExtendedPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Health(){
    return this.buffer.getUint32(4, true);
  }
  set Health(value: number){
    this.buffer.setUint32(4, value, true);
  }
  get Shield(){
    return this.buffer.getUint32(8, true);
  }
  set Shield(value: number){
    this.buffer.setUint32(8, value, true);
  }
  get Mana(){
    return this.buffer.getUint32(12, true);
  }
  set Mana(value: number){
    this.buffer.setUint32(12, value, true);
  }
  get Ability(){
    return this.buffer.getUint32(16, true);
  }
  set Ability(value: number){
    this.buffer.setUint32(16, value, true);
  }
}
export class ItemConsumptionFailedPacket {
  buffer!: DataView;
  static readonly Name = `ItemConsumptionFailed`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `When the consumption of an item failed.`;
  static readonly CausedReaction = `The game client gets a feedback about a failed consumption, and allows for do further consumption requests.`;
  static readonly Length = 9;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x26;
  static readonly SubCode = 0xFD;

  static getRequiredSize(dataSize:number){
    return ItemConsumptionFailedPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, ItemConsumptionFailedPacket.HeaderCode);
    b.setUint8(ItemConsumptionFailedPacket.DataOffset, ItemConsumptionFailedPacket.Code);
  b.setUint8(ItemConsumptionFailedPacket.DataOffset + 1, ItemConsumptionFailedPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = ItemConsumptionFailedPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 9): ItemConsumptionFailedPacket {
    const p = new ItemConsumptionFailedPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Health(){
    return this.buffer.getUint16(4, false);
  }
  set Health(value: number){
    this.buffer.setUint16(4, value, false);
  }
  get Shield(){
    return this.buffer.getUint16(7, false);
  }
  set Shield(value: number){
    this.buffer.setUint16(7, value, false);
  }
}
export class ItemConsumptionFailedExtendedPacket {
  buffer!: DataView;
  static readonly Name = `ItemConsumptionFailedExtended`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `When the consumption of an item failed.`;
  static readonly CausedReaction = `The game client gets a feedback about a failed consumption, and allows for do further consumption requests.`;
  static readonly Length = 12;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x26;
  static readonly SubCode = 0xFD;

  static getRequiredSize(dataSize:number){
    return ItemConsumptionFailedExtendedPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, ItemConsumptionFailedExtendedPacket.HeaderCode);
    b.setUint8(ItemConsumptionFailedExtendedPacket.DataOffset, ItemConsumptionFailedExtendedPacket.Code);
  b.setUint8(ItemConsumptionFailedExtendedPacket.DataOffset + 1, ItemConsumptionFailedExtendedPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = ItemConsumptionFailedExtendedPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 12): ItemConsumptionFailedExtendedPacket {
    const p = new ItemConsumptionFailedExtendedPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Health(){
    return this.buffer.getUint32(4, true);
  }
  set Health(value: number){
    this.buffer.setUint32(4, value, true);
  }
  get Shield(){
    return this.buffer.getUint32(8, true);
  }
  set Shield(value: number){
    this.buffer.setUint32(8, value, true);
  }
}
export class BaseStatsExtendedPacket {
  buffer!: DataView;
  static readonly Name = `BaseStatsExtended`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `Setting the base stats of a character, e.g. set stats command or after a reset.`;
  static readonly CausedReaction = `The values are updated on the game client user interface.`;
  static readonly Length = 24;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xF3;
  static readonly SubCode = 0x32;

  static getRequiredSize(dataSize:number){
    return BaseStatsExtendedPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, BaseStatsExtendedPacket.HeaderCode);
    b.setUint8(BaseStatsExtendedPacket.DataOffset, BaseStatsExtendedPacket.Code);
  b.setUint8(BaseStatsExtendedPacket.DataOffset + 1, BaseStatsExtendedPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = BaseStatsExtendedPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 24): BaseStatsExtendedPacket {
    const p = new BaseStatsExtendedPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Strength(){
    return this.buffer.getUint32(4, true);
  }
  set Strength(value: number){
    this.buffer.setUint32(4, value, true);
  }
  get Agility(){
    return this.buffer.getUint32(8, true);
  }
  set Agility(value: number){
    this.buffer.setUint32(8, value, true);
  }
  get Vitality(){
    return this.buffer.getUint32(12, true);
  }
  set Vitality(value: number){
    this.buffer.setUint32(12, value, true);
  }
  get Energy(){
    return this.buffer.getUint32(16, true);
  }
  set Energy(value: number){
    this.buffer.setUint32(16, value, true);
  }
  get Command(){
    return this.buffer.getUint32(20, true);
  }
  set Command(value: number){
    this.buffer.setUint32(20, value, true);
  }
}
export class CurrentManaAndAbilityPacket {
  buffer!: DataView;
  static readonly Name = `CurrentManaAndAbility`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `The currently available mana or ability has changed, e.g. by using a skill.`;
  static readonly CausedReaction = `The mana and ability bar is updated on the game client user interface.`;
  static readonly Length = 8;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x27;
  static readonly SubCode = 0xFF;

  static getRequiredSize(dataSize:number){
    return CurrentManaAndAbilityPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, CurrentManaAndAbilityPacket.HeaderCode);
    b.setUint8(CurrentManaAndAbilityPacket.DataOffset, CurrentManaAndAbilityPacket.Code);
  b.setUint8(CurrentManaAndAbilityPacket.DataOffset + 1, CurrentManaAndAbilityPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = CurrentManaAndAbilityPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 8): CurrentManaAndAbilityPacket {
    const p = new CurrentManaAndAbilityPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Mana(){
    return this.buffer.getUint16(4, false);
  }
  set Mana(value: number){
    this.buffer.setUint16(4, value, false);
  }
  get Ability(){
    return this.buffer.getUint16(6, false);
  }
  set Ability(value: number){
    this.buffer.setUint16(6, value, false);
  }
}
export class MaximumManaAndAbilityPacket {
  buffer!: DataView;
  static readonly Name = `MaximumManaAndAbility`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `The maximum available mana or ability has changed, e.g. by adding stat points.`;
  static readonly CausedReaction = `The mana and ability bar is updated on the game client user interface.`;
  static readonly Length = 8;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x27;
  static readonly SubCode = 0xFE;

  static getRequiredSize(dataSize:number){
    return MaximumManaAndAbilityPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, MaximumManaAndAbilityPacket.HeaderCode);
    b.setUint8(MaximumManaAndAbilityPacket.DataOffset, MaximumManaAndAbilityPacket.Code);
  b.setUint8(MaximumManaAndAbilityPacket.DataOffset + 1, MaximumManaAndAbilityPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = MaximumManaAndAbilityPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 8): MaximumManaAndAbilityPacket {
    const p = new MaximumManaAndAbilityPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Mana(){
    return this.buffer.getUint16(4, false);
  }
  set Mana(value: number){
    this.buffer.setUint16(4, value, false);
  }
  get Ability(){
    return this.buffer.getUint16(6, false);
  }
  set Ability(value: number){
    this.buffer.setUint16(6, value, false);
  }
}
export class ItemRemovedPacket {
  buffer!: DataView;
  static readonly Name = `ItemRemoved`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `The item has been removed from the inventory of the player.`;
  static readonly CausedReaction = `The client removes the item in the inventory user interface.`;
  static readonly Length = 5;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x28;

  static getRequiredSize(dataSize:number){
    return ItemRemovedPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, ItemRemovedPacket.HeaderCode);
    b.setUint8(ItemRemovedPacket.DataOffset, ItemRemovedPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = ItemRemovedPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 5): ItemRemovedPacket {
    const p = new ItemRemovedPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get InventorySlot() {
    return GetByteValue(this.buffer.getUint8(3), 8, 0);
  }
  set InventorySlot(value: number) {
    const oldByte = this.buffer.getUint8(3);
    this.buffer.setUint8(3, SetByteValue(oldByte, value, 8, 0));
  }
  get TrueFlag() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set TrueFlag(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }
}
export enum ConsumeItemWithEffectConsumedItemTypeEnum {
    Ale = 0,
RedemyOfLove = 1,
PotionOfSoul = 77
  }export class ConsumeItemWithEffectPacket {
  buffer!: DataView;
  static readonly Name = `ConsumeItemWithEffect`;
  static readonly HeaderType = `C3Header`;
  static readonly HeaderCode = 0xC3;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `The client requested to consume a special item, e.g. a bottle of Ale.`;
  static readonly CausedReaction = `The player is shown in a red color and has increased attack speed.`;
  static readonly Length = 6;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x29;

  static getRequiredSize(dataSize:number){
    return ConsumeItemWithEffectPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, ConsumeItemWithEffectPacket.HeaderCode);
    b.setUint8(ConsumeItemWithEffectPacket.DataOffset, ConsumeItemWithEffectPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = ConsumeItemWithEffectPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 6): ConsumeItemWithEffectPacket {
    const p = new ConsumeItemWithEffectPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get ItemType():ConsumeItemWithEffectConsumedItemTypeEnum{
    return GetByteValue(this.buffer.getUint8(3), 8, 0);
  }
  set ItemType(value: ConsumeItemWithEffectConsumedItemTypeEnum){
    const oldValue = this.ItemType;
    this.buffer.setUint8(3, SetByteValue(oldValue, value, 8, 0));
  }
  get EffectTimeInSeconds(){
    return this.buffer.getUint16(4, true);
  }
  set EffectTimeInSeconds(value: number){
    this.buffer.setUint16(4, value, true);
  }
}
export class ItemDurabilityChangedPacket {
  buffer!: DataView;
  static readonly Name = `ItemDurabilityChanged`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `The durability of an item in the inventory of the player has been changed.`;
  static readonly CausedReaction = `The client updates the item in the inventory user interface.`;
  static readonly Length = 6;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x2A;

  static getRequiredSize(dataSize:number){
    return ItemDurabilityChangedPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, ItemDurabilityChangedPacket.HeaderCode);
    b.setUint8(ItemDurabilityChangedPacket.DataOffset, ItemDurabilityChangedPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = ItemDurabilityChangedPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 6): ItemDurabilityChangedPacket {
    const p = new ItemDurabilityChangedPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get InventorySlot() {
    return GetByteValue(this.buffer.getUint8(3), 8, 0);
  }
  set InventorySlot(value: number) {
    const oldByte = this.buffer.getUint8(3);
    this.buffer.setUint8(3, SetByteValue(oldByte, value, 8, 0));
  }
  get Durability() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set Durability(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }
  get ByConsumption(){
    return GetBoolean(this.buffer.getUint8(5), 0);
  }
  set ByConsumption(value: boolean){
    const oldByte = this.buffer.getUint8(5);
    this.buffer.setUint8(5, SetBoolean(oldByte, value, 0));
  }
}
export enum FruitConsumptionResponseFruitConsumptionResultEnum {
    PlusSuccess = 0,
PlusFailed = 1,
PlusPrevented = 2,
MinusSuccess = 3,
MinusFailed = 4,
MinusPrevented = 5,
MinusSuccessCashShopFruit = 6,
PreventedByEquippedItems = 16,
PlusPreventedByMaximum = 33,
MinusPreventedByMaximum = 37,
MinusPreventedByDefault = 38
  }export enum FruitConsumptionResponseFruitStatTypeEnum {
    Energy = 0,
Vitality = 1,
Agility = 2,
Strength = 3,
Leadership = 4
  }export class FruitConsumptionResponsePacket {
  buffer!: DataView;
  static readonly Name = `FruitConsumptionResponse`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `The player requested to consume a fruit.`;
  static readonly CausedReaction = `The client updates the user interface, by changing the added stat points and used fruit points.`;
  static readonly Length = 7;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x2C;

  static getRequiredSize(dataSize:number){
    return FruitConsumptionResponsePacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, FruitConsumptionResponsePacket.HeaderCode);
    b.setUint8(FruitConsumptionResponsePacket.DataOffset, FruitConsumptionResponsePacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = FruitConsumptionResponsePacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 7): FruitConsumptionResponsePacket {
    const p = new FruitConsumptionResponsePacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Result():FruitConsumptionResponseFruitConsumptionResultEnum{
    return GetByteValue(this.buffer.getUint8(3), 8, 0);
  }
  set Result(value: FruitConsumptionResponseFruitConsumptionResultEnum){
    const oldValue = this.Result;
    this.buffer.setUint8(3, SetByteValue(oldValue, value, 8, 0));
  }
  get StatPoints(){
    return this.buffer.getUint16(4, true);
  }
  set StatPoints(value: number){
    this.buffer.setUint16(4, value, true);
  }
  get StatType():FruitConsumptionResponseFruitStatTypeEnum{
    return GetByteValue(this.buffer.getUint8(6), 8, 0);
  }
  set StatType(value: FruitConsumptionResponseFruitStatTypeEnum){
    const oldValue = this.StatType;
    this.buffer.setUint8(6, SetByteValue(oldValue, value, 8, 0));
  }
}
export enum EffectItemConsumptionEffectOriginEnum {
    Undefined = 0,
HalloweenAndCherryBlossomEvent = 1,
CashShopItem = 2
  }export enum EffectItemConsumptionEffectActionEnum {
    Add = 0,
Remove = 1,
Replace = 2
  }export enum EffectItemConsumptionEffectTypeEnum {
    AttackSpeed = 1,
Damage = 2,
Defense = 3,
MaximumHealth = 4,
MaximumMana = 5,
ExperienceRate = 6,
DropRate = 7,
Sustenance = 8,
Strength = 9,
Agility = 10,
Vitality = 11,
Energy = 12,
Leadership = 13,
PhysicalDamage = 14,
WizardryDamage = 15,
Mobility = 16
  }export class EffectItemConsumptionPacket {
  buffer!: DataView;
  static readonly Name = `EffectItemConsumption`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `The player requested to consume an item which gives a magic effect.`;
  static readonly CausedReaction = `The client updates the user interface, it shows the remaining time at the effect icon.`;
  static readonly Length = 17;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x2D;

  static getRequiredSize(dataSize:number){
    return EffectItemConsumptionPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, EffectItemConsumptionPacket.HeaderCode);
    b.setUint8(EffectItemConsumptionPacket.DataOffset, EffectItemConsumptionPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = EffectItemConsumptionPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 17): EffectItemConsumptionPacket {
    const p = new EffectItemConsumptionPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Origin():EffectItemConsumptionEffectOriginEnum{
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set Origin(value: EffectItemConsumptionEffectOriginEnum){
    const oldValue = this.Origin;
    this.buffer.setUint8(4, SetByteValue(oldValue, value, 8, 0));
  }
  get Type():EffectItemConsumptionEffectTypeEnum{
    return GetByteValue(this.buffer.getUint8(6), 8, 0);
  }
  set Type(value: EffectItemConsumptionEffectTypeEnum){
    const oldValue = this.Type;
    this.buffer.setUint8(6, SetByteValue(oldValue, value, 8, 0));
  }
  get Action():EffectItemConsumptionEffectActionEnum{
    return GetByteValue(this.buffer.getUint8(8), 8, 0);
  }
  set Action(value: EffectItemConsumptionEffectActionEnum){
    const oldValue = this.Action;
    this.buffer.setUint8(8, SetByteValue(oldValue, value, 8, 0));
  }
  get RemainingSeconds(){
    return this.buffer.getUint32(12, true);
  }
  set RemainingSeconds(value: number){
    this.buffer.setUint32(12, value, true);
  }
  get MagicEffectNumber() {
    return GetByteValue(this.buffer.getUint8(16), 8, 0);
  }
  set MagicEffectNumber(value: number) {
    const oldByte = this.buffer.getUint8(16);
    this.buffer.setUint8(16, SetByteValue(oldByte, value, 8, 0));
  }
}
export enum NpcWindowResponseNpcWindowEnum {
    Merchant = 0,
Merchant1 = 1,
VaultStorage = 2,
ChaosMachine = 3,
DevilSquare = 4,
BloodCastle = 6,
PetTrainer = 7,
Lahap = 9,
CastleSeniorNPC = 12,
ElphisRefinery = 17,
RefineStoneMaking = 18,
RemoveJohOption = 19,
IllusionTemple = 20,
ChaosCardCombination = 21,
CherryBlossomBranchesAssembly = 22,
SeedMaster = 23,
SeedResearcher = 24,
StatReInitializer = 25,
DelgadoLuckyCoinRegistration = 32,
DoorkeeperTitusDuelWatch = 33,
LugardDoppelgangerEntry = 35,
JerintGaionEvententry = 36,
JuliaWarpMarketServer = 37,
CombineLuckyItem = 38
  }export class NpcWindowResponsePacket {
  buffer!: DataView;
  static readonly Name = `NpcWindowResponse`;
  static readonly HeaderType = `C3Header`;
  static readonly HeaderCode = 0xC3;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `After the client talked to an NPC which should cause a dialog to open on the client side.`;
  static readonly CausedReaction = `The client opens the specified dialog.`;
  static readonly Length = 11;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x30;

  static getRequiredSize(dataSize:number){
    return NpcWindowResponsePacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, NpcWindowResponsePacket.HeaderCode);
    b.setUint8(NpcWindowResponsePacket.DataOffset, NpcWindowResponsePacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = NpcWindowResponsePacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 11): NpcWindowResponsePacket {
    const p = new NpcWindowResponsePacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Window():NpcWindowResponseNpcWindowEnum{
    return GetByteValue(this.buffer.getUint8(3), 8, 0);
  }
  set Window(value: NpcWindowResponseNpcWindowEnum){
    const oldValue = this.Window;
    this.buffer.setUint8(3, SetByteValue(oldValue, value, 8, 0));
  }
}
export enum StoreItemListItemWindowEnum {
    Normal = 0,
ChaosMachine = 3,
ResurrectionFailed = 5
  }export class StoreItemListPacket {
  buffer!: DataView;
  static readonly Name = `StoreItemList`;
  static readonly HeaderType = `C2Header`;
  static readonly HeaderCode = 0xC2;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `The player opens a merchant npc or the vault. It's sent after the dialog was opened by another message.`;
  static readonly CausedReaction = `The client shows the items in the opened dialog.`;
  static readonly Length = undefined;
  static readonly LengthSize = 2;
  static readonly DataOffset = 3;
  static readonly Code = 0x31;

  static getRequiredSize(dataSize:number){
    return StoreItemListPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, StoreItemListPacket.HeaderCode);
    b.setUint8(StoreItemListPacket.DataOffset, StoreItemListPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = StoreItemListPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint16(1, l);
    return this;
  }

  private _readDataView (from: number, to: number): DataView {
    return new DataView(this.buffer.buffer.slice(from, to));
  }

  static createPacket(requiredSize: number): StoreItemListPacket {
    const p = new StoreItemListPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Type():StoreItemListItemWindowEnum{
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set Type(value: StoreItemListItemWindowEnum){
    const oldValue = this.Type;
    this.buffer.setUint8(4, SetByteValue(oldValue, value, 8, 0));
  }
  get ItemCount() {
    return GetByteValue(this.buffer.getUint8(5), 8, 0);
  }
  set ItemCount(value: number) {
    const oldByte = this.buffer.getUint8(5);
    this.buffer.setUint8(5, SetByteValue(oldByte, value, 8, 0));
  }

  getItems(count: number = this.ItemCount): {
  ItemSlot: Byte;
  ItemData: Binary;

}[]{
    const b = this.buffer;
    let bi = 0;

    const Items_count = count;
    const Items: any[] = new Array(Items_count);
    
    let Items_StartOffset = bi + 6;
    for (let i = 0; i < Items_count; i++) {
      const ItemSlot = b.getUint8(Items_StartOffset + 0);
      const ItemData = this._readDataView(Items_StartOffset + 1, Items_StartOffset + 1 + 12);
      Items[i] = {
        ItemSlot,
        ItemData
      };
      Items_StartOffset += 13;
    }
    
    return Items;
  }}
export class NpcItemBuyFailedPacket {
  buffer!: DataView;
  static readonly Name = `NpcItemBuyFailed`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `The request of buying an item from a NPC failed.`;
  static readonly CausedReaction = `The client is responsive again. Without this message, it may stuck.`;
  static readonly Length = 4;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x32;
  static readonly SubCode = 0xFF;

  static getRequiredSize(dataSize:number){
    return NpcItemBuyFailedPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, NpcItemBuyFailedPacket.HeaderCode);
    b.setUint8(NpcItemBuyFailedPacket.DataOffset, NpcItemBuyFailedPacket.Code);
  b.setUint8(NpcItemBuyFailedPacket.DataOffset + 1, NpcItemBuyFailedPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = NpcItemBuyFailedPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 4): NpcItemBuyFailedPacket {
    const p = new NpcItemBuyFailedPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
}
export class ItemBoughtPacket {
  buffer!: DataView;
  static readonly Name = `ItemBought`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `The request of buying an item from a player or npc was successful.`;
  static readonly CausedReaction = `The bought item is added to the inventory.`;
  static readonly Length = undefined;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x32;

  static getRequiredSize(dataSize:number){
    return ItemBoughtPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, ItemBoughtPacket.HeaderCode);
    b.setUint8(ItemBoughtPacket.DataOffset, ItemBoughtPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = ItemBoughtPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number): ItemBoughtPacket {
    const p = new ItemBoughtPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get InventorySlot() {
    return GetByteValue(this.buffer.getUint8(3), 8, 0);
  }
  set InventorySlot(value: number) {
    const oldByte = this.buffer.getUint8(3);
    this.buffer.setUint8(3, SetByteValue(oldByte, value, 8, 0));
  }
  get ItemData(){
    const to = this.buffer.byteLength;
    const i = 4;
              
    return new DataView(this.buffer.buffer.slice(i,to));
  }
  setItemData(data: ArrayLike<number>, count = NaN){
    if (data.length !== count) throw new Error(`data.length must be ${count}`);
    const from = 4;

    for (let i = 0; i < data.length; i++) {
      this.buffer.setUint8(from + i, data[i]);
    }
}
}
export class NpcItemSellResultPacket {
  buffer!: DataView;
  static readonly Name = `NpcItemSellResult`;
  static readonly HeaderType = `C3Header`;
  static readonly HeaderCode = 0xC3;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `The result of a previous item sell request.`;
  static readonly CausedReaction = `The amount of specified money is set at the players inventory.`;
  static readonly Length = 8;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x33;

  static getRequiredSize(dataSize:number){
    return NpcItemSellResultPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, NpcItemSellResultPacket.HeaderCode);
    b.setUint8(NpcItemSellResultPacket.DataOffset, NpcItemSellResultPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = NpcItemSellResultPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 8): NpcItemSellResultPacket {
    const p = new NpcItemSellResultPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Success(){
    return GetBoolean(this.buffer.getUint8(3), 0);
  }
  set Success(value: boolean){
    const oldByte = this.buffer.getUint8(3);
    this.buffer.setUint8(3, SetBoolean(oldByte, value, 0));
  }
  get Money(){
    return this.buffer.getUint32(4, true);
  }
  set Money(value: number){
    this.buffer.setUint32(4, value, true);
  }
}
export enum PlayerShopSetItemPriceResponseItemPriceSetResultEnum {
    Failed = 0,
Success = 1,
ItemSlotOutOfRange = 2,
ItemNotFound = 3,
PriceNegative = 4,
ItemIsBlocked = 5,
CharacterLevelTooLow = 6
  }export class PlayerShopSetItemPriceResponsePacket {
  buffer!: DataView;
  static readonly Name = `PlayerShopSetItemPriceResponse`;
  static readonly HeaderType = `C3HeaderWithSubCode`;
  static readonly HeaderCode = 0xC3;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `The player requested to set a price for an item of the players shop.`;
  static readonly CausedReaction = `The item gets a price on the user interface.`;
  static readonly Length = 6;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x3F;
  static readonly SubCode = 0x01;

  static getRequiredSize(dataSize:number){
    return PlayerShopSetItemPriceResponsePacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, PlayerShopSetItemPriceResponsePacket.HeaderCode);
    b.setUint8(PlayerShopSetItemPriceResponsePacket.DataOffset, PlayerShopSetItemPriceResponsePacket.Code);
  b.setUint8(PlayerShopSetItemPriceResponsePacket.DataOffset + 1, PlayerShopSetItemPriceResponsePacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = PlayerShopSetItemPriceResponsePacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 6): PlayerShopSetItemPriceResponsePacket {
    const p = new PlayerShopSetItemPriceResponsePacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get InventorySlot() {
    return GetByteValue(this.buffer.getUint8(5), 8, 0);
  }
  set InventorySlot(value: number) {
    const oldByte = this.buffer.getUint8(5);
    this.buffer.setUint8(5, SetByteValue(oldByte, value, 8, 0));
  }
  get Result():PlayerShopSetItemPriceResponseItemPriceSetResultEnum{
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set Result(value: PlayerShopSetItemPriceResponseItemPriceSetResultEnum){
    const oldValue = this.Result;
    this.buffer.setUint8(4, SetByteValue(oldValue, value, 8, 0));
  }
}
export class PlayerShopClosedPacket {
  buffer!: DataView;
  static readonly Name = `PlayerShopClosed`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `After a player in scope requested to close his shop or after all items has been sold.`;
  static readonly CausedReaction = `The player shop not shown as open anymore.`;
  static readonly Length = 7;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x3F;
  static readonly SubCode = 0x03;

  static getRequiredSize(dataSize:number){
    return PlayerShopClosedPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, PlayerShopClosedPacket.HeaderCode);
    b.setUint8(PlayerShopClosedPacket.DataOffset, PlayerShopClosedPacket.Code);
  b.setUint8(PlayerShopClosedPacket.DataOffset + 1, PlayerShopClosedPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = PlayerShopClosedPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 7): PlayerShopClosedPacket {
    const p = new PlayerShopClosedPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Success(){
    return GetBoolean(this.buffer.getUint8(4), 0);
  }
  set Success(value: boolean){
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetBoolean(oldByte, value, 0));
  }
  get PlayerId(){
    return this.buffer.getUint16(5, false);
  }
  set PlayerId(value: number){
    this.buffer.setUint16(5, value, false);
  }
}
export class PlayerShopItemSoldToPlayerPacket {
  buffer!: DataView;
  static readonly Name = `PlayerShopItemSoldToPlayer`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `An item of the players shop was sold to another player.`;
  static readonly CausedReaction = `The item is removed from the players inventory and a blue system message appears.`;
  static readonly Length = 15;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x3F;
  static readonly SubCode = 0x08;

  static getRequiredSize(dataSize:number){
    return PlayerShopItemSoldToPlayerPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, PlayerShopItemSoldToPlayerPacket.HeaderCode);
    b.setUint8(PlayerShopItemSoldToPlayerPacket.DataOffset, PlayerShopItemSoldToPlayerPacket.Code);
  b.setUint8(PlayerShopItemSoldToPlayerPacket.DataOffset + 1, PlayerShopItemSoldToPlayerPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = PlayerShopItemSoldToPlayerPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  private _readString (from :number, to: number): string {
    return readWireString(this.buffer, from, to);
  }

  static createPacket(requiredSize: number = 15): PlayerShopItemSoldToPlayerPacket {
    const p = new PlayerShopItemSoldToPlayerPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get InventorySlot() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set InventorySlot(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }
  get BuyerName(){
    const to = 15;
              
    return this._readString(5, to);
  }
  setBuyerName(str: string, count = 10){
    const from = 5;
    for(let i = 0; i < str.length; i++){
      const char = str.charCodeAt(i);
      this.buffer.setUint8(from + i, char);
    }
}
}
export class ClosePlayerShopDialogPacket {
  buffer!: DataView;
  static readonly Name = `ClosePlayerShopDialog`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `After the player requested to close his shop or after all items has been sold.`;
  static readonly CausedReaction = `The player shop dialog is closed for the shop of the specified player.`;
  static readonly Length = 6;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x3F;
  static readonly SubCode = 0x12;

  static getRequiredSize(dataSize:number){
    return ClosePlayerShopDialogPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, ClosePlayerShopDialogPacket.HeaderCode);
    b.setUint8(ClosePlayerShopDialogPacket.DataOffset, ClosePlayerShopDialogPacket.Code);
  b.setUint8(ClosePlayerShopDialogPacket.DataOffset + 1, ClosePlayerShopDialogPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = ClosePlayerShopDialogPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 6): ClosePlayerShopDialogPacket {
    const p = new ClosePlayerShopDialogPacket();
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
}
export enum PlayerShopItemListActionKindEnum {
    ByRequest = 5,
UpdateAfterItemChange = 19
  }export class PlayerShopItemListPacket {
  buffer!: DataView;
  static readonly Name = `PlayerShopItemList`;
  static readonly HeaderType = `C2HeaderWithSubCode`;
  static readonly HeaderCode = 0xC2;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `After the player requested to open a shop of another player.`;
  static readonly CausedReaction = `The player shop dialog is shown with the provided item data.`;
  static readonly Length = undefined;
  static readonly LengthSize = 2;
  static readonly DataOffset = 3;
  static readonly Code = 0x3F;
  static readonly SubCode = 0x05;

  static getRequiredSize(dataSize:number){
    return PlayerShopItemListPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, PlayerShopItemListPacket.HeaderCode);
    b.setUint8(PlayerShopItemListPacket.DataOffset, PlayerShopItemListPacket.Code);
  b.setUint8(PlayerShopItemListPacket.DataOffset + 1, PlayerShopItemListPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = PlayerShopItemListPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint16(1, l);
    return this;
  }

  private _readString (from :number, to: number): string {
    return readWireString(this.buffer, from, to);
  }

  private _readDataView (from: number, to: number): DataView {
    return new DataView(this.buffer.buffer.slice(from, to));
  }

  static createPacket(requiredSize: number): PlayerShopItemListPacket {
    const p = new PlayerShopItemListPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Action():PlayerShopItemListActionKindEnum{
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set Action(value: PlayerShopItemListActionKindEnum){
    const oldValue = this.Action;
    this.buffer.setUint8(4, SetByteValue(oldValue, value, 8, 0));
  }
  get Success(){
    return GetBoolean(this.buffer.getUint8(5), 0);
  }
  set Success(value: boolean){
    const oldByte = this.buffer.getUint8(5);
    this.buffer.setUint8(5, SetBoolean(oldByte, value, 0));
  }
  get PlayerId(){
    return this.buffer.getUint16(6, false);
  }
  set PlayerId(value: number){
    this.buffer.setUint16(6, value, false);
  }
  get PlayerName(){
    const to = 18;
              
    return this._readString(8, to);
  }
  setPlayerName(str: string, count = 10){
    const from = 8;
    for(let i = 0; i < str.length; i++){
      const char = str.charCodeAt(i);
      this.buffer.setUint8(from + i, char);
    }
}
  get ShopName(){
    const to = 54;
              
    return this._readString(18, to);
  }
  setShopName(str: string, count = 36){
    const from = 18;
    for(let i = 0; i < str.length; i++){
      const char = str.charCodeAt(i);
      this.buffer.setUint8(from + i, char);
    }
}
  get ItemCount() {
    return GetByteValue(this.buffer.getUint8(54), 8, 0);
  }
  set ItemCount(value: number) {
    const oldByte = this.buffer.getUint8(54);
    this.buffer.setUint8(54, SetByteValue(oldByte, value, 8, 0));
  }

  getItems(count: number = this.ItemCount): {
  ItemSlot: Byte;
  ItemData: Binary;
  Price: IntegerLittleEndian;

}[]{
    const b = this.buffer;
    let bi = 0;

    const Items_count = count;
    const Items: any[] = new Array(Items_count);
    
    let Items_StartOffset = bi + 55;
    for (let i = 0; i < Items_count; i++) {
      const ItemSlot = b.getUint8(Items_StartOffset + 0);
      const ItemData = this._readDataView(Items_StartOffset + 1, Items_StartOffset + 1 + 12);
      const Price = b.getUint32(Items_StartOffset + 16, true);
      Items[i] = {
        ItemSlot,
        ItemData,
        Price
      };
      Items_StartOffset += 20;
    }
    
    return Items;
  }}
export enum PlayerShopBuyResultResultKindEnum {
    Undefined = 0,
Success = 1,
NotAvailable = 2,
ShopNotOpened = 3,
InTransaction = 4,
InvalidShopSlot = 5,
NameMismatchOrPriceMissing = 6,
LackOfMoney = 7,
MoneyOverflowOrNotEnoughSpace = 8,
ItemBlock = 9
  }export class PlayerShopBuyResultPacket {
  buffer!: DataView;
  static readonly Name = `PlayerShopBuyResult`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `After the player requested to buy an item of a shop of another player.`;
  static readonly CausedReaction = `The result is shown to the player. If successful, the item is added to the inventory.`;
  static readonly Length = 21;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x3F;
  static readonly SubCode = 0x06;

  static getRequiredSize(dataSize:number){
    return PlayerShopBuyResultPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, PlayerShopBuyResultPacket.HeaderCode);
    b.setUint8(PlayerShopBuyResultPacket.DataOffset, PlayerShopBuyResultPacket.Code);
  b.setUint8(PlayerShopBuyResultPacket.DataOffset + 1, PlayerShopBuyResultPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = PlayerShopBuyResultPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 21): PlayerShopBuyResultPacket {
    const p = new PlayerShopBuyResultPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Result():PlayerShopBuyResultResultKindEnum{
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set Result(value: PlayerShopBuyResultResultKindEnum){
    const oldValue = this.Result;
    this.buffer.setUint8(4, SetByteValue(oldValue, value, 8, 0));
  }
  get SellerId(){
    return this.buffer.getUint16(5, false);
  }
  set SellerId(value: number){
    this.buffer.setUint16(5, value, false);
  }
  get ItemData(){
    const to = 20;
    const i = 7;
              
    return new DataView(this.buffer.buffer.slice(i,to));
  }
  setItemData(data: ArrayLike<number>, count = 13){
    if (data.length !== count) throw new Error(`data.length must be ${count}`);
    const from = 7;

    for (let i = 0; i < data.length; i++) {
      this.buffer.setUint8(from + i, data[i]);
    }
}
  get ItemSlot() {
    return GetByteValue(this.buffer.getUint8(20), 8, 0);
  }
  set ItemSlot(value: number) {
    const oldByte = this.buffer.getUint8(20);
    this.buffer.setUint8(20, SetByteValue(oldByte, value, 8, 0));
  }
}
export enum PlayerShopBuyResultExtendedResultKindEnum {
    Undefined = 0,
Success = 1,
NotAvailable = 2,
ShopNotOpened = 3,
InTransaction = 4,
InvalidShopSlot = 5,
NameMismatchOrPriceMissing = 6,
LackOfMoney = 7,
MoneyOverflowOrNotEnoughSpace = 8,
ItemBlock = 9
  }export class PlayerShopBuyResultExtendedPacket {
  buffer!: DataView;
  static readonly Name = `PlayerShopBuyResultExtended`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `After the player requested to buy an item of a shop of another player.`;
  static readonly CausedReaction = `The result is shown to the player. If successful, the item is added to the inventory.`;
  static readonly Length = undefined;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x3F;
  static readonly SubCode = 0x06;

  static getRequiredSize(dataSize:number){
    return PlayerShopBuyResultExtendedPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, PlayerShopBuyResultExtendedPacket.HeaderCode);
    b.setUint8(PlayerShopBuyResultExtendedPacket.DataOffset, PlayerShopBuyResultExtendedPacket.Code);
  b.setUint8(PlayerShopBuyResultExtendedPacket.DataOffset + 1, PlayerShopBuyResultExtendedPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = PlayerShopBuyResultExtendedPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number): PlayerShopBuyResultExtendedPacket {
    const p = new PlayerShopBuyResultExtendedPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get SellerId(){
    return this.buffer.getUint16(4, true);
  }
  set SellerId(value: number){
    this.buffer.setUint16(4, value, true);
  }
  get Result():PlayerShopBuyResultExtendedResultKindEnum{
    return GetByteValue(this.buffer.getUint8(6), 8, 0);
  }
  set Result(value: PlayerShopBuyResultExtendedResultKindEnum){
    const oldValue = this.Result;
    this.buffer.setUint8(6, SetByteValue(oldValue, value, 8, 0));
  }
  get ItemSlot() {
    return GetByteValue(this.buffer.getUint8(7), 8, 0);
  }
  set ItemSlot(value: number) {
    const oldByte = this.buffer.getUint8(7);
    this.buffer.setUint8(7, SetByteValue(oldByte, value, 8, 0));
  }
  get ItemData(){
    const to = this.buffer.byteLength;
    const i = 8;
              
    return new DataView(this.buffer.buffer.slice(i,to));
  }
  setItemData(data: ArrayLike<number>, count = NaN){
    if (data.length !== count) throw new Error(`data.length must be ${count}`);
    const from = 8;

    for (let i = 0; i < data.length; i++) {
      this.buffer.setUint8(from + i, data[i]);
    }
}
}
export enum PlayerShopItemListExtendedActionKindEnum {
    ByRequest = 5,
UpdateAfterItemChange = 19
  }export class PlayerShopItemListExtendedPacket {
  buffer!: DataView;
  static readonly Name = `PlayerShopItemListExtended`;
  static readonly HeaderType = `C2HeaderWithSubCode`;
  static readonly HeaderCode = 0xC2;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `After the player requested to open a shop of another player.`;
  static readonly CausedReaction = `The player shop dialog is shown with the provided item data.`;
  static readonly Length = undefined;
  static readonly LengthSize = 2;
  static readonly DataOffset = 3;
  static readonly Code = 0x3F;
  static readonly SubCode = 0x05;

  static getRequiredSize(dataSize:number){
    return PlayerShopItemListExtendedPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, PlayerShopItemListExtendedPacket.HeaderCode);
    b.setUint8(PlayerShopItemListExtendedPacket.DataOffset, PlayerShopItemListExtendedPacket.Code);
  b.setUint8(PlayerShopItemListExtendedPacket.DataOffset + 1, PlayerShopItemListExtendedPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = PlayerShopItemListExtendedPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint16(1, l);
    return this;
  }

  private _readString (from :number, to: number): string {
    return readWireString(this.buffer, from, to);
  }

  private _readDataView (from: number, to: number): DataView {
    return new DataView(this.buffer.buffer.slice(from, to));
  }

  static createPacket(requiredSize: number): PlayerShopItemListExtendedPacket {
    const p = new PlayerShopItemListExtendedPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Action():PlayerShopItemListExtendedActionKindEnum{
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set Action(value: PlayerShopItemListExtendedActionKindEnum){
    const oldValue = this.Action;
    this.buffer.setUint8(4, SetByteValue(oldValue, value, 8, 0));
  }
  get Success(){
    return GetBoolean(this.buffer.getUint8(5), 0);
  }
  set Success(value: boolean){
    const oldByte = this.buffer.getUint8(5);
    this.buffer.setUint8(5, SetBoolean(oldByte, value, 0));
  }
  get PlayerId(){
    return this.buffer.getUint16(6, false);
  }
  set PlayerId(value: number){
    this.buffer.setUint16(6, value, false);
  }
  get PlayerName(){
    const to = 18;
              
    return this._readString(8, to);
  }
  setPlayerName(str: string, count = 10){
    const from = 8;
    for(let i = 0; i < str.length; i++){
      const char = str.charCodeAt(i);
      this.buffer.setUint8(from + i, char);
    }
}
  get ShopName(){
    const to = 54;
              
    return this._readString(18, to);
  }
  setShopName(str: string, count = 36){
    const from = 18;
    for(let i = 0; i < str.length; i++){
      const char = str.charCodeAt(i);
      this.buffer.setUint8(from + i, char);
    }
}
  get ItemCount() {
    return GetByteValue(this.buffer.getUint8(54), 8, 0);
  }
  set ItemCount(value: number) {
    const oldByte = this.buffer.getUint8(54);
    this.buffer.setUint8(54, SetByteValue(oldByte, value, 8, 0));
  }

  getItems(count: number = this.ItemCount): {
  MoneyPrice: IntegerLittleEndian;
  PriceItemType: ShortLittleEndian;
  RequiredItemAmount: ShortLittleEndian;
  ItemSlot: Byte;
  ItemData: Binary;

}[]{
    const b = this.buffer;
    let bi = 0;

    const Items_count = count;
    const Items: any[] = new Array(Items_count);
    
    let Items_StartOffset = bi + 55;
    for (let i = 0; i < Items_count; i++) {
      const MoneyPrice = b.getUint32(Items_StartOffset + 0, true);
      const PriceItemType = b.getUint16(Items_StartOffset + 4, true);
      const RequiredItemAmount = b.getUint16(Items_StartOffset + 6, true);
      const ItemSlot = b.getUint8(Items_StartOffset + 8);
      const ItemData = this._readDataView(Items_StartOffset + 9, Items_StartOffset + 9 + 12);
      Items[i] = {
        MoneyPrice,
        PriceItemType,
        RequiredItemAmount,
        ItemSlot,
        ItemData
      };
      Items_StartOffset += 21;
    }
    
    return Items;
  }}
export class PlayerShopsPacket {
  buffer!: DataView;
  static readonly Name = `PlayerShops`;
  static readonly HeaderType = `C2HeaderWithSubCode`;
  static readonly HeaderCode = 0xC2;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `After the player gets into scope of a player with an opened shop.`;
  static readonly CausedReaction = `The player shop title is shown at the specified players.`;
  static readonly Length = undefined;
  static readonly LengthSize = 2;
  static readonly DataOffset = 3;
  static readonly Code = 0x3F;
  static readonly SubCode = 0x00;

  static getRequiredSize(dataSize:number){
    return PlayerShopsPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, PlayerShopsPacket.HeaderCode);
    b.setUint8(PlayerShopsPacket.DataOffset, PlayerShopsPacket.Code);
  b.setUint8(PlayerShopsPacket.DataOffset + 1, PlayerShopsPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = PlayerShopsPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint16(1, l);
    return this;
  }

  private _readString (from :number, to: number): string {
    return readWireString(this.buffer, from, to);
  }

  static createPacket(requiredSize: number): PlayerShopsPacket {
    const p = new PlayerShopsPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get ShopCount() {
    return GetByteValue(this.buffer.getUint8(5), 8, 0);
  }
  set ShopCount(value: number) {
    const oldByte = this.buffer.getUint8(5);
    this.buffer.setUint8(5, SetByteValue(oldByte, value, 8, 0));
  }

  getShops(count: number = this.ShopCount): {
  PlayerId: ShortBigEndian;
  StoreName: string;

}[]{
    const b = this.buffer;
    let bi = 0;

    const Shops_count = count;
    const Shops: any[] = new Array(Shops_count);
    
    let Shops_StartOffset = bi + 6;
    for (let i = 0; i < Shops_count; i++) {
      const PlayerId = b.getUint16(Shops_StartOffset + 0, false);
      const StoreName = this._readString(Shops_StartOffset + 2, Shops_StartOffset + 2 + 36);
      Shops[i] = {
        PlayerId,
        StoreName
      };
      Shops_StartOffset += 38;
    }
    
    return Shops;
  }}
export class AddTransformedCharactersToScope075Packet {
  buffer!: DataView;
  static readonly Name = `AddTransformedCharactersToScope075`;
  static readonly HeaderType = `C2Header`;
  static readonly HeaderCode = 0xC2;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `The player wears a monster transformation ring.`;
  static readonly CausedReaction = `The character appears as monster, defined by the Skin property.`;
  static readonly Length = undefined;
  static readonly LengthSize = 2;
  static readonly DataOffset = 3;
  static readonly Code = 0x45;

  static getRequiredSize(dataSize:number){
    return AddTransformedCharactersToScope075Packet.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, AddTransformedCharactersToScope075Packet.HeaderCode);
    b.setUint8(AddTransformedCharactersToScope075Packet.DataOffset, AddTransformedCharactersToScope075Packet.Code);
  
    return this;
  }

  writeLength(l: number|undefined = AddTransformedCharactersToScope075Packet.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint16(1, l);
    return this;
  }

  private _readString (from :number, to: number): string {
    return readWireString(this.buffer, from, to);
  }

  static createPacket(requiredSize: number): AddTransformedCharactersToScope075Packet {
    const p = new AddTransformedCharactersToScope075Packet();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get CharacterCount() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set CharacterCount(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }

  getCharacters(count: number = this.CharacterCount): {
  Id: ShortBigEndian;
  CurrentPositionX: Byte;
  CurrentPositionY: Byte;
  Skin: Byte;
  IsPoisoned: Boolean;
  IsIced: Boolean;
  IsDamageBuffed: Boolean;
  IsDefenseBuffed: Boolean;
  Name: string;
  TargetPositionX: Byte;
  TargetPositionY: Byte;
  Rotation: Byte;
  HeroState: Byte;

}[]{
    const b = this.buffer;
    let bi = 0;

    const Characters_count = count;
    const Characters: any[] = new Array(Characters_count);
    
    let Characters_StartOffset = bi + 5;
    for (let i = 0; i < Characters_count; i++) {
      const Id = b.getUint16(Characters_StartOffset + 0, false);
      const CurrentPositionX = b.getUint8(Characters_StartOffset + 2);
      const CurrentPositionY = b.getUint8(Characters_StartOffset + 3);
      const Skin = b.getUint8(Characters_StartOffset + 4);
      const IsPoisoned = GetBoolean(b.getUint8(Characters_StartOffset + 5), 0);
      const IsIced = GetBoolean(b.getUint8(Characters_StartOffset + 5), 1);
      const IsDamageBuffed = GetBoolean(b.getUint8(Characters_StartOffset + 5), 2);
      const IsDefenseBuffed = GetBoolean(b.getUint8(Characters_StartOffset + 5), 3);
      const Name = this._readString(Characters_StartOffset + 6, Characters_StartOffset + 6 + 10);
      const TargetPositionX = b.getUint8(Characters_StartOffset + 16);
      const TargetPositionY = b.getUint8(Characters_StartOffset + 17);
      const Rotation = GetByteValue(b.getUint8(Characters_StartOffset + 18), 4, 4);
      const HeroState = GetByteValue(b.getUint8(Characters_StartOffset + 18), 4, 0);
      Characters[i] = {
        Id,
        CurrentPositionX,
        CurrentPositionY,
        Skin,
        IsPoisoned,
        IsIced,
        IsDamageBuffed,
        IsDefenseBuffed,
        Name,
        TargetPositionX,
        TargetPositionY,
        Rotation,
        HeroState
      };
      Characters_StartOffset += 19;
    }
    
    return Characters;
  }}
export class AddTransformedCharactersToScopePacket {
  buffer!: DataView;
  static readonly Name = `AddTransformedCharactersToScope`;
  static readonly HeaderType = `C2Header`;
  static readonly HeaderCode = 0xC2;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `The player wears a monster transformation ring.`;
  static readonly CausedReaction = `The character appears as monster, defined by the Skin property.`;
  static readonly Length = undefined;
  static readonly LengthSize = 2;
  static readonly DataOffset = 3;
  static readonly Code = 0x45;

  static getRequiredSize(dataSize:number){
    return AddTransformedCharactersToScopePacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, AddTransformedCharactersToScopePacket.HeaderCode);
    b.setUint8(AddTransformedCharactersToScopePacket.DataOffset, AddTransformedCharactersToScopePacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = AddTransformedCharactersToScopePacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint16(1, l);
    return this;
  }

  private _readString (from :number, to: number): string {
    return readWireString(this.buffer, from, to);
  }

  private _readDataView (from: number, to: number): DataView {
    return new DataView(this.buffer.buffer.slice(from, to));
  }

  static createPacket(requiredSize: number): AddTransformedCharactersToScopePacket {
    const p = new AddTransformedCharactersToScopePacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get CharacterCount() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set CharacterCount(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }

  getCharacters(count: number = this.CharacterCount): {
  Id: ShortBigEndian;
  CurrentPositionX: Byte;
  CurrentPositionY: Byte;
  Skin: ShortBigEndian;
  Name: string;
  TargetPositionX: Byte;
  TargetPositionY: Byte;
  Rotation: Byte;
  HeroState: Byte;
  Appearance: Binary;
  EffectCount: Byte;
  Effects: {
  Id: Byte;

}[];

}[]{
    const b = this.buffer;
    let bi = 0;

    const Characters_count = count;
    const Characters: any[] = new Array(Characters_count);
    
    let Characters_StartOffset = bi + 5;
    for (let i = 0; i < Characters_count; i++) {
      const Id = b.getUint16(Characters_StartOffset + 0, false);
      const CurrentPositionX = b.getUint8(Characters_StartOffset + 2);
      const CurrentPositionY = b.getUint8(Characters_StartOffset + 3);
      const Skin = b.getUint16(Characters_StartOffset + 4, false);
      const Name = this._readString(Characters_StartOffset + 6, Characters_StartOffset + 6 + 10);
      const TargetPositionX = b.getUint8(Characters_StartOffset + 16);
      const TargetPositionY = b.getUint8(Characters_StartOffset + 17);
      const Rotation = GetByteValue(b.getUint8(Characters_StartOffset + 18), 4, 4);
      const HeroState = GetByteValue(b.getUint8(Characters_StartOffset + 18), 4, 0);
      const Appearance = this._readDataView(Characters_StartOffset + 19, Characters_StartOffset + 19 + 18);
      const EffectCount = b.getUint8(Characters_StartOffset + 37);
const Effects_count = EffectCount;
    const Effects: any[] = new Array(Effects_count);
    
    let Effects_StartOffset = Characters_StartOffset + 38;
    for (let i = 0; i < Effects_count; i++) {
      const Id = b.getUint8(Effects_StartOffset + 0);
      Effects[i] = {
        Id
      };
      Effects_StartOffset += 1;
    }
      Characters[i] = {
        Id,
        CurrentPositionX,
        CurrentPositionY,
        Skin,
        Name,
        TargetPositionX,
        TargetPositionY,
        Rotation,
        HeroState,
        Appearance,
        EffectCount,
        Effects
      };
      Characters_StartOffset += 38 + EffectCount * 1;
    }
    
    return Characters;
  }}
export enum ChangeTerrainAttributesTerrainAttributeTypeEnum {
    Safezone = 1,
Character = 2,
Blocked = 4,
NoGround = 8,
Water = 16
  }export class ChangeTerrainAttributesPacket {
  buffer!: DataView;
  static readonly Name = `ChangeTerrainAttributes`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `The server wants to alter the terrain attributes of a map at runtime.`;
  static readonly CausedReaction = `The client updates the terrain attributes on its side.`;
  static readonly Length = undefined;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x46;

  static getRequiredSize(dataSize:number){
    return ChangeTerrainAttributesPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, ChangeTerrainAttributesPacket.HeaderCode);
    b.setUint8(ChangeTerrainAttributesPacket.DataOffset, ChangeTerrainAttributesPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = ChangeTerrainAttributesPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number): ChangeTerrainAttributesPacket {
    const p = new ChangeTerrainAttributesPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Type(){
    return GetBoolean(this.buffer.getUint8(3), 0);
  }
  set Type(value: boolean){
    const oldByte = this.buffer.getUint8(3);
    this.buffer.setUint8(3, SetBoolean(oldByte, value, 0));
  }
  get Attribute():ChangeTerrainAttributesTerrainAttributeTypeEnum{
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set Attribute(value: ChangeTerrainAttributesTerrainAttributeTypeEnum){
    const oldValue = this.Attribute;
    this.buffer.setUint8(4, SetByteValue(oldValue, value, 8, 0));
  }
  get RemoveAttribute(){
    return GetBoolean(this.buffer.getUint8(5), 0);
  }
  set RemoveAttribute(value: boolean){
    const oldByte = this.buffer.getUint8(5);
    this.buffer.setUint8(5, SetBoolean(oldByte, value, 0));
  }
  get AreaCount() {
    return GetByteValue(this.buffer.getUint8(6), 8, 0);
  }
  set AreaCount(value: number) {
    const oldByte = this.buffer.getUint8(6);
    this.buffer.setUint8(6, SetByteValue(oldByte, value, 8, 0));
  }

  getAreas(count: number = this.AreaCount): {
  StartX: Byte;
  StartY: Byte;
  EndX: Byte;
  EndY: Byte;

}[]{
    const b = this.buffer;
    let bi = 0;

    const Areas_count = count;
    const Areas: any[] = new Array(Areas_count);
    
    let Areas_StartOffset = bi + 7;
    for (let i = 0; i < Areas_count; i++) {
      const StartX = b.getUint8(Areas_StartOffset + 0);
      const StartY = b.getUint8(Areas_StartOffset + 1);
      const EndX = b.getUint8(Areas_StartOffset + 2);
      const EndY = b.getUint8(Areas_StartOffset + 3);
      Areas[i] = {
        StartX,
        StartY,
        EndX,
        EndY
      };
      Areas_StartOffset += 4;
    }
    
    return Areas;
  }}
export enum ShowEffectEffectTypeEnum {
    ShieldPotion = 3,
LevelUp = 16,
ShieldLost = 17
  }export class ShowEffectPacket {
  buffer!: DataView;
  static readonly Name = `ShowEffect`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `After a player achieved or lost something.`;
  static readonly CausedReaction = `An effect is shown for the affected player.`;
  static readonly Length = 6;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x48;

  static getRequiredSize(dataSize:number){
    return ShowEffectPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, ShowEffectPacket.HeaderCode);
    b.setUint8(ShowEffectPacket.DataOffset, ShowEffectPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = ShowEffectPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 6): ShowEffectPacket {
    const p = new ShowEffectPacket();
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
  get Effect():ShowEffectEffectTypeEnum{
    return GetByteValue(this.buffer.getUint8(5), 8, 0);
  }
  set Effect(value: ShowEffectEffectTypeEnum){
    const oldValue = this.Effect;
    this.buffer.setUint8(5, SetByteValue(oldValue, value, 8, 0));
  }
}
export class CharacterListPacket {
  buffer!: DataView;
  static readonly Name = `CharacterList`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `After the game client requested it, usually after a successful login.`;
  static readonly CausedReaction = `The game client shows the available characters of the account.`;
  static readonly Length = undefined;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xF3;
  static readonly SubCode = 0x00;

  static getRequiredSize(dataSize:number){
    return CharacterListPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, CharacterListPacket.HeaderCode);
    b.setUint8(CharacterListPacket.DataOffset, CharacterListPacket.Code);
  b.setUint8(CharacterListPacket.DataOffset + 1, CharacterListPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = CharacterListPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  private _readString (from :number, to: number): string {
    return readWireString(this.buffer, from, to);
  }

  private _readDataView (from: number, to: number): DataView {
    return new DataView(this.buffer.buffer.slice(from, to));
  }

  static createPacket(requiredSize: number): CharacterListPacket {
    const p = new CharacterListPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get UnlockFlags():CharacterCreationUnlockFlagsEnum{
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set UnlockFlags(value: CharacterCreationUnlockFlagsEnum){
    const oldValue = this.UnlockFlags;
    this.buffer.setUint8(4, SetByteValue(oldValue, value, 8, 0));
  }
  get MoveCnt() {
    return GetByteValue(this.buffer.getUint8(5), 8, 0);
  }
  set MoveCnt(value: number) {
    const oldByte = this.buffer.getUint8(5);
    this.buffer.setUint8(5, SetByteValue(oldByte, value, 8, 0));
  }
  get CharacterCount() {
    return GetByteValue(this.buffer.getUint8(6), 8, 0);
  }
  set CharacterCount(value: number) {
    const oldByte = this.buffer.getUint8(6);
    this.buffer.setUint8(6, SetByteValue(oldByte, value, 8, 0));
  }
  get IsVaultExtended(){
    return GetBoolean(this.buffer.getUint8(7), 0);
  }
  set IsVaultExtended(value: boolean){
    const oldByte = this.buffer.getUint8(7);
    this.buffer.setUint8(7, SetBoolean(oldByte, value, 0));
  }

  getCharacters(count: number = this.CharacterCount): {
  SlotIndex: Byte;
  Name: string;
  Level: ShortLittleEndian;
  Status: CharacterStatusEnum;
  IsItemBlockActive: Boolean;
  Appearance: Binary;
  GuildPosition: GuildMemberRoleEnum;

}[]{
    const b = this.buffer;
    let bi = 0;

    const Characters_count = count;
    const Characters: any[] = new Array(Characters_count);
    
    let Characters_StartOffset = bi + 8;
    for (let i = 0; i < Characters_count; i++) {
      const SlotIndex = b.getUint8(Characters_StartOffset + 0);
      const Name = this._readString(Characters_StartOffset + 1, Characters_StartOffset + 1 + 10);
      const Level = b.getUint16(Characters_StartOffset + 12, true);
      const Status = GetByteValue(b.getUint8(Characters_StartOffset + 14), 4, 0);
      const IsItemBlockActive = GetBoolean(b.getUint8(Characters_StartOffset + 14), 4);
      const Appearance = this._readDataView(Characters_StartOffset + 15, Characters_StartOffset + 15 + 18);
      const GuildPosition = GetByteValue(b.getUint8(Characters_StartOffset + 33), 8, 0);
      Characters[i] = {
        SlotIndex,
        Name,
        Level,
        Status,
        IsItemBlockActive,
        Appearance,
        GuildPosition
      };
      Characters_StartOffset += 34;
    }
    
    return Characters;
  }}
export class CharacterListExtendedPacket {
  buffer!: DataView;
  static readonly Name = `CharacterListExtended`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `After the game client requested it, usually after a successful login.`;
  static readonly CausedReaction = `The game client shows the available characters of the account.`;
  static readonly Length = undefined;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xF3;
  static readonly SubCode = 0x00;

  static getRequiredSize(dataSize:number){
    return CharacterListExtendedPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, CharacterListExtendedPacket.HeaderCode);
    b.setUint8(CharacterListExtendedPacket.DataOffset, CharacterListExtendedPacket.Code);
  b.setUint8(CharacterListExtendedPacket.DataOffset + 1, CharacterListExtendedPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = CharacterListExtendedPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  private _readString (from :number, to: number): string {
    return readWireString(this.buffer, from, to);
  }

  private _readDataView (from: number, to: number): DataView {
    return new DataView(this.buffer.buffer.slice(from, to));
  }

  static createPacket(requiredSize: number): CharacterListExtendedPacket {
    const p = new CharacterListExtendedPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get UnlockFlags():CharacterCreationUnlockFlagsEnum{
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set UnlockFlags(value: CharacterCreationUnlockFlagsEnum){
    const oldValue = this.UnlockFlags;
    this.buffer.setUint8(4, SetByteValue(oldValue, value, 8, 0));
  }
  get MoveCnt() {
    return GetByteValue(this.buffer.getUint8(5), 8, 0);
  }
  set MoveCnt(value: number) {
    const oldByte = this.buffer.getUint8(5);
    this.buffer.setUint8(5, SetByteValue(oldByte, value, 8, 0));
  }
  get CharacterCount() {
    return GetByteValue(this.buffer.getUint8(6), 8, 0);
  }
  set CharacterCount(value: number) {
    const oldByte = this.buffer.getUint8(6);
    this.buffer.setUint8(6, SetByteValue(oldByte, value, 8, 0));
  }
  get IsVaultExtended(){
    return GetBoolean(this.buffer.getUint8(7), 0);
  }
  set IsVaultExtended(value: boolean){
    const oldByte = this.buffer.getUint8(7);
    this.buffer.setUint8(7, SetBoolean(oldByte, value, 0));
  }

  getCharacters(count: number = this.CharacterCount): {
  SlotIndex: Byte;
  Name: string;
  Level: ShortLittleEndian;
  Status: CharacterStatusEnum;
  IsItemBlockActive: Boolean;
  Appearance: Binary;
  GuildPosition: GuildMemberRoleEnum;

}[]{
    const b = this.buffer;
    let bi = 0;

    const Characters_count = count;
    const Characters: any[] = new Array(Characters_count);
    
    let Characters_StartOffset = bi + 8;
    for (let i = 0; i < Characters_count; i++) {
      const SlotIndex = b.getUint8(Characters_StartOffset + 0);
      const Name = this._readString(Characters_StartOffset + 1, Characters_StartOffset + 1 + 10);
      const Level = b.getUint16(Characters_StartOffset + 12, true);
      const Status = GetByteValue(b.getUint8(Characters_StartOffset + 14), 4, 0);
      const IsItemBlockActive = GetBoolean(b.getUint8(Characters_StartOffset + 14), 4);
      const Appearance = this._readDataView(Characters_StartOffset + 15, Characters_StartOffset + 15 + 27);
      const GuildPosition = GetByteValue(b.getUint8(Characters_StartOffset + 42), 8, 0);
      Characters[i] = {
        SlotIndex,
        Name,
        Level,
        Status,
        IsItemBlockActive,
        Appearance,
        GuildPosition
      };
      Characters_StartOffset += 44;
    }
    
    return Characters;
  }}
export class CharacterClassCreationUnlockPacket {
  buffer!: DataView;
  static readonly Name = `CharacterClassCreationUnlock`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `It's send right after the CharacterList, in the character selection screen, if the account has any unlocked character classes.`;
  static readonly CausedReaction = `The client unlocks the specified character classes, so they can be created.`;
  static readonly Length = 5;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xDE;
  static readonly SubCode = 0x00;

  static getRequiredSize(dataSize:number){
    return CharacterClassCreationUnlockPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, CharacterClassCreationUnlockPacket.HeaderCode);
    b.setUint8(CharacterClassCreationUnlockPacket.DataOffset, CharacterClassCreationUnlockPacket.Code);
  b.setUint8(CharacterClassCreationUnlockPacket.DataOffset + 1, CharacterClassCreationUnlockPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = CharacterClassCreationUnlockPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 5): CharacterClassCreationUnlockPacket {
    const p = new CharacterClassCreationUnlockPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get UnlockFlags():CharacterCreationUnlockFlagsEnum{
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set UnlockFlags(value: CharacterCreationUnlockFlagsEnum){
    const oldValue = this.UnlockFlags;
    this.buffer.setUint8(4, SetByteValue(oldValue, value, 8, 0));
  }
}
export class CharacterList075Packet {
  buffer!: DataView;
  static readonly Name = `CharacterList075`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `After the game client requested it, usually after a successful login.`;
  static readonly CausedReaction = `The game client shows the available characters of the account.`;
  static readonly Length = undefined;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xF3;
  static readonly SubCode = 0x00;

  static getRequiredSize(dataSize:number){
    return CharacterList075Packet.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, CharacterList075Packet.HeaderCode);
    b.setUint8(CharacterList075Packet.DataOffset, CharacterList075Packet.Code);
  b.setUint8(CharacterList075Packet.DataOffset + 1, CharacterList075Packet.SubCode);
    return this;
  }

  writeLength(l: number|undefined = CharacterList075Packet.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  private _readString (from :number, to: number): string {
    return readWireString(this.buffer, from, to);
  }

  private _readDataView (from: number, to: number): DataView {
    return new DataView(this.buffer.buffer.slice(from, to));
  }

  static createPacket(requiredSize: number): CharacterList075Packet {
    const p = new CharacterList075Packet();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get CharacterCount() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set CharacterCount(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }

  getCharacters(count: number = this.CharacterCount): {
  SlotIndex: Byte;
  Name: string;
  Level: ShortBigEndian;
  Status: CharacterStatusEnum;
  IsItemBlockActive: Boolean;
  Appearance: Binary;

}[]{
    const b = this.buffer;
    let bi = 0;

    const Characters_count = count;
    const Characters: any[] = new Array(Characters_count);
    
    let Characters_StartOffset = bi + 5;
    for (let i = 0; i < Characters_count; i++) {
      const SlotIndex = b.getUint8(Characters_StartOffset + 0);
      const Name = this._readString(Characters_StartOffset + 1, Characters_StartOffset + 1 + 10);
      const Level = b.getUint16(Characters_StartOffset + 11, false);
      const Status = GetByteValue(b.getUint8(Characters_StartOffset + 13), 4, 0);
      const IsItemBlockActive = GetBoolean(b.getUint8(Characters_StartOffset + 13), 4);
      const Appearance = this._readDataView(Characters_StartOffset + 14, Characters_StartOffset + 14 + 9);
      Characters[i] = {
        SlotIndex,
        Name,
        Level,
        Status,
        IsItemBlockActive,
        Appearance
      };
      Characters_StartOffset += 24;
    }
    
    return Characters;
  }}
export class CharacterList095Packet {
  buffer!: DataView;
  static readonly Name = `CharacterList095`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `After the game client requested it, usually after a successful login.`;
  static readonly CausedReaction = `The game client shows the available characters of the account.`;
  static readonly Length = undefined;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xF3;
  static readonly SubCode = 0x00;

  static getRequiredSize(dataSize:number){
    return CharacterList095Packet.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, CharacterList095Packet.HeaderCode);
    b.setUint8(CharacterList095Packet.DataOffset, CharacterList095Packet.Code);
  b.setUint8(CharacterList095Packet.DataOffset + 1, CharacterList095Packet.SubCode);
    return this;
  }

  writeLength(l: number|undefined = CharacterList095Packet.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  private _readString (from :number, to: number): string {
    return readWireString(this.buffer, from, to);
  }

  private _readDataView (from: number, to: number): DataView {
    return new DataView(this.buffer.buffer.slice(from, to));
  }

  static createPacket(requiredSize: number): CharacterList095Packet {
    const p = new CharacterList095Packet();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get CharacterCount() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set CharacterCount(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }

  getCharacters(count: number = this.CharacterCount): {
  SlotIndex: Byte;
  Name: string;
  Level: ShortLittleEndian;
  Status: CharacterStatusEnum;
  IsItemBlockActive: Boolean;
  Appearance: Binary;

}[]{
    const b = this.buffer;
    let bi = 0;

    const Characters_count = count;
    const Characters: any[] = new Array(Characters_count);
    
    let Characters_StartOffset = bi + 5;
    for (let i = 0; i < Characters_count; i++) {
      const SlotIndex = b.getUint8(Characters_StartOffset + 0);
      const Name = this._readString(Characters_StartOffset + 1, Characters_StartOffset + 1 + 10);
      const Level = b.getUint16(Characters_StartOffset + 12, true);
      const Status = GetByteValue(b.getUint8(Characters_StartOffset + 14), 4, 0);
      const IsItemBlockActive = GetBoolean(b.getUint8(Characters_StartOffset + 14), 4);
      const Appearance = this._readDataView(Characters_StartOffset + 15, Characters_StartOffset + 15 + 11);
      Characters[i] = {
        SlotIndex,
        Name,
        Level,
        Status,
        IsItemBlockActive,
        Appearance
      };
      Characters_StartOffset += 26;
    }
    
    return Characters;
  }}
export class CharacterCreationSuccessfulPacket {
  buffer!: DataView;
  static readonly Name = `CharacterCreationSuccessful`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `After the server successfully processed a character creation request.`;
  static readonly CausedReaction = `The new character is shown in the character list`;
  static readonly Length = 42;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xF3;
  static readonly SubCode = 0x01;

  static getRequiredSize(dataSize:number){
    return CharacterCreationSuccessfulPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, CharacterCreationSuccessfulPacket.HeaderCode);
    b.setUint8(CharacterCreationSuccessfulPacket.DataOffset, CharacterCreationSuccessfulPacket.Code);
  b.setUint8(CharacterCreationSuccessfulPacket.DataOffset + 1, CharacterCreationSuccessfulPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = CharacterCreationSuccessfulPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  private _readString (from :number, to: number): string {
    return readWireString(this.buffer, from, to);
  }

  static createPacket(requiredSize: number = 42): CharacterCreationSuccessfulPacket {
    const p = new CharacterCreationSuccessfulPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Success(){
    return GetBoolean(this.buffer.getUint8(4), 0);
  }
  set Success(value: boolean){
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetBoolean(oldByte, value, 0));
  }
  get CharacterName(){
    const to = 15;
              
    return this._readString(5, to);
  }
  setCharacterName(str: string, count = 10){
    const from = 5;
    for(let i = 0; i < str.length; i++){
      const char = str.charCodeAt(i);
      this.buffer.setUint8(from + i, char);
    }
}
  get CharacterSlot() {
    return GetByteValue(this.buffer.getUint8(15), 8, 0);
  }
  set CharacterSlot(value: number) {
    const oldByte = this.buffer.getUint8(15);
    this.buffer.setUint8(15, SetByteValue(oldByte, value, 8, 0));
  }
  get Level(){
    return this.buffer.getUint16(16, true);
  }
  set Level(value: number){
    this.buffer.setUint16(16, value, true);
  }
  get Class():CharacterClassNumber{
    return GetByteValue(this.buffer.getUint8(18), 8, 3);
  }
  set Class(value: CharacterClassNumber){
    const oldValue = this.Class;
    this.buffer.setUint8(18, SetByteValue(oldValue, value, 8, 3));
  }
  get CharacterStatus() {
    return GetByteValue(this.buffer.getUint8(19), 8, 0);
  }
  set CharacterStatus(value: number) {
    const oldByte = this.buffer.getUint8(19);
    this.buffer.setUint8(19, SetByteValue(oldByte, value, 8, 0));
  }
  get PreviewData(){
    const to = this.buffer.byteLength;
    const i = 20;
              
    return new DataView(this.buffer.buffer.slice(i,to));
  }
  setPreviewData(data: ArrayLike<number>, count = NaN){
    if (data.length !== count) throw new Error(`data.length must be ${count}`);
    const from = 20;

    for (let i = 0; i < data.length; i++) {
      this.buffer.setUint8(from + i, data[i]);
    }
}
}
export class CharacterCreationFailedPacket {
  buffer!: DataView;
  static readonly Name = `CharacterCreationFailed`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `After the server processed a character creation request without success.`;
  static readonly CausedReaction = `A message is shown that it failed.`;
  static readonly Length = 5;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xF3;
  static readonly SubCode = 0x01;

  static getRequiredSize(dataSize:number){
    return CharacterCreationFailedPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, CharacterCreationFailedPacket.HeaderCode);
    b.setUint8(CharacterCreationFailedPacket.DataOffset, CharacterCreationFailedPacket.Code);
  b.setUint8(CharacterCreationFailedPacket.DataOffset + 1, CharacterCreationFailedPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = CharacterCreationFailedPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 5): CharacterCreationFailedPacket {
    const p = new CharacterCreationFailedPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
}
export class RespawnAfterDeath075Packet {
  buffer!: DataView;
  static readonly Name = `RespawnAfterDeath075`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `The character respawned after death.`;
  static readonly CausedReaction = `The character respawns with the specified attributes at the specified map.`;
  static readonly Length = 20;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xF3;
  static readonly SubCode = 0x04;

  static getRequiredSize(dataSize:number){
    return RespawnAfterDeath075Packet.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, RespawnAfterDeath075Packet.HeaderCode);
    b.setUint8(RespawnAfterDeath075Packet.DataOffset, RespawnAfterDeath075Packet.Code);
  b.setUint8(RespawnAfterDeath075Packet.DataOffset + 1, RespawnAfterDeath075Packet.SubCode);
    return this;
  }

  writeLength(l: number|undefined = RespawnAfterDeath075Packet.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 20): RespawnAfterDeath075Packet {
    const p = new RespawnAfterDeath075Packet();
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
  get MapNumber() {
    return GetByteValue(this.buffer.getUint8(6), 8, 0);
  }
  set MapNumber(value: number) {
    const oldByte = this.buffer.getUint8(6);
    this.buffer.setUint8(6, SetByteValue(oldByte, value, 8, 0));
  }
  get Direction() {
    return GetByteValue(this.buffer.getUint8(7), 8, 0);
  }
  set Direction(value: number) {
    const oldByte = this.buffer.getUint8(7);
    this.buffer.setUint8(7, SetByteValue(oldByte, value, 8, 0));
  }
  get CurrentHealth(){
    return this.buffer.getUint16(8, true);
  }
  set CurrentHealth(value: number){
    this.buffer.setUint16(8, value, true);
  }
  get CurrentMana(){
    return this.buffer.getUint16(10, true);
  }
  set CurrentMana(value: number){
    this.buffer.setUint16(10, value, true);
  }
  get Experience(){
    return this.buffer.getUint32(12, true);
  }
  set Experience(value: number){
    this.buffer.setUint32(12, value, true);
  }
  get Money(){
    return this.buffer.getUint32(16, true);
  }
  set Money(value: number){
    this.buffer.setUint32(16, value, true);
  }
}
export class RespawnAfterDeath095Packet {
  buffer!: DataView;
  static readonly Name = `RespawnAfterDeath095`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `The character respawned after death.`;
  static readonly CausedReaction = `The character respawns with the specified attributes at the specified map.`;
  static readonly Length = 22;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xF3;
  static readonly SubCode = 0x04;

  static getRequiredSize(dataSize:number){
    return RespawnAfterDeath095Packet.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, RespawnAfterDeath095Packet.HeaderCode);
    b.setUint8(RespawnAfterDeath095Packet.DataOffset, RespawnAfterDeath095Packet.Code);
  b.setUint8(RespawnAfterDeath095Packet.DataOffset + 1, RespawnAfterDeath095Packet.SubCode);
    return this;
  }

  writeLength(l: number|undefined = RespawnAfterDeath095Packet.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 22): RespawnAfterDeath095Packet {
    const p = new RespawnAfterDeath095Packet();
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
  get MapNumber() {
    return GetByteValue(this.buffer.getUint8(6), 8, 0);
  }
  set MapNumber(value: number) {
    const oldByte = this.buffer.getUint8(6);
    this.buffer.setUint8(6, SetByteValue(oldByte, value, 8, 0));
  }
  get Direction() {
    return GetByteValue(this.buffer.getUint8(7), 8, 0);
  }
  set Direction(value: number) {
    const oldByte = this.buffer.getUint8(7);
    this.buffer.setUint8(7, SetByteValue(oldByte, value, 8, 0));
  }
  get CurrentHealth(){
    return this.buffer.getUint16(8, true);
  }
  set CurrentHealth(value: number){
    this.buffer.setUint16(8, value, true);
  }
  get CurrentMana(){
    return this.buffer.getUint16(10, true);
  }
  set CurrentMana(value: number){
    this.buffer.setUint16(10, value, true);
  }
  get CurrentAbility(){
    return this.buffer.getUint16(12, true);
  }
  set CurrentAbility(value: number){
    this.buffer.setUint16(12, value, true);
  }
  get Experience(){
    return this.buffer.getUint32(14, true);
  }
  set Experience(value: number){
    this.buffer.setUint32(14, value, true);
  }
  get Money(){
    return this.buffer.getUint32(18, true);
  }
  set Money(value: number){
    this.buffer.setUint32(18, value, true);
  }
}
export class RespawnAfterDeathPacket {
  buffer!: DataView;
  static readonly Name = `RespawnAfterDeath`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `The character respawned after death.`;
  static readonly CausedReaction = `The character respawns with the specified attributes at the specified map.`;
  static readonly Length = 28;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xF3;
  static readonly SubCode = 0x04;

  static getRequiredSize(dataSize:number){
    return RespawnAfterDeathPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, RespawnAfterDeathPacket.HeaderCode);
    b.setUint8(RespawnAfterDeathPacket.DataOffset, RespawnAfterDeathPacket.Code);
  b.setUint8(RespawnAfterDeathPacket.DataOffset + 1, RespawnAfterDeathPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = RespawnAfterDeathPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 28): RespawnAfterDeathPacket {
    const p = new RespawnAfterDeathPacket();
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
  get MapNumber() {
    return GetByteValue(this.buffer.getUint8(6), 8, 0);
  }
  set MapNumber(value: number) {
    const oldByte = this.buffer.getUint8(6);
    this.buffer.setUint8(6, SetByteValue(oldByte, value, 8, 0));
  }
  get Direction() {
    return GetByteValue(this.buffer.getUint8(7), 8, 0);
  }
  set Direction(value: number) {
    const oldByte = this.buffer.getUint8(7);
    this.buffer.setUint8(7, SetByteValue(oldByte, value, 8, 0));
  }
  get CurrentHealth(){
    return this.buffer.getUint16(8, true);
  }
  set CurrentHealth(value: number){
    this.buffer.setUint16(8, value, true);
  }
  get CurrentMana(){
    return this.buffer.getUint16(10, true);
  }
  set CurrentMana(value: number){
    this.buffer.setUint16(10, value, true);
  }
  get CurrentShield(){
    return this.buffer.getUint16(12, true);
  }
  set CurrentShield(value: number){
    this.buffer.setUint16(12, value, true);
  }
  get CurrentAbility(){
    return this.buffer.getUint16(14, true);
  }
  set CurrentAbility(value: number){
    this.buffer.setUint16(14, value, true);
  }
  get Experience(){
    return this.buffer.getBigUint64(16, false);
  }
  set Experience(value: bigint){
    this.buffer.setBigUint64(16, value, false);
  }
  get Money(){
    return this.buffer.getUint32(24, true);
  }
  set Money(value: number){
    this.buffer.setUint32(24, value, true);
  }
}
export class RespawnAfterDeathExtendedPacket {
  buffer!: DataView;
  static readonly Name = `RespawnAfterDeathExtended`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `The character respawned after death.`;
  static readonly CausedReaction = `The character respawns with the specified attributes at the specified map.`;
  static readonly Length = 36;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xF3;
  static readonly SubCode = 0x04;

  static getRequiredSize(dataSize:number){
    return RespawnAfterDeathExtendedPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, RespawnAfterDeathExtendedPacket.HeaderCode);
    b.setUint8(RespawnAfterDeathExtendedPacket.DataOffset, RespawnAfterDeathExtendedPacket.Code);
  b.setUint8(RespawnAfterDeathExtendedPacket.DataOffset + 1, RespawnAfterDeathExtendedPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = RespawnAfterDeathExtendedPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 36): RespawnAfterDeathExtendedPacket {
    const p = new RespawnAfterDeathExtendedPacket();
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
  get MapNumber() {
    return GetByteValue(this.buffer.getUint8(6), 8, 0);
  }
  set MapNumber(value: number) {
    const oldByte = this.buffer.getUint8(6);
    this.buffer.setUint8(6, SetByteValue(oldByte, value, 8, 0));
  }
  get Direction() {
    return GetByteValue(this.buffer.getUint8(7), 8, 0);
  }
  set Direction(value: number) {
    const oldByte = this.buffer.getUint8(7);
    this.buffer.setUint8(7, SetByteValue(oldByte, value, 8, 0));
  }
  get CurrentHealth(){
    return this.buffer.getUint32(8, true);
  }
  set CurrentHealth(value: number){
    this.buffer.setUint32(8, value, true);
  }
  get CurrentMana(){
    return this.buffer.getUint32(12, true);
  }
  set CurrentMana(value: number){
    this.buffer.setUint32(12, value, true);
  }
  get CurrentShield(){
    return this.buffer.getUint32(16, true);
  }
  set CurrentShield(value: number){
    this.buffer.setUint32(16, value, true);
  }
  get CurrentAbility(){
    return this.buffer.getUint32(20, true);
  }
  set CurrentAbility(value: number){
    this.buffer.setUint32(20, value, true);
  }
  get Experience(){
    throw new Error('not implemented type LongLittleEndian');
  }
  set Experience(value: any){
    throw new Error('not implemented type LongLittleEndian');
  }
  get Money(){
    return this.buffer.getUint32(32, true);
  }
  set Money(value: number){
    this.buffer.setUint32(32, value, true);
  }
}
export class PoisonDamagePacket {
  buffer!: DataView;
  static readonly Name = `PoisonDamage`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `The character got damaged by being poisoned on old client versions.`;
  static readonly CausedReaction = `Removes the damage from the health without showing a damage number.`;
  static readonly Length = 8;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xF3;
  static readonly SubCode = 0x07;

  static getRequiredSize(dataSize:number){
    return PoisonDamagePacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, PoisonDamagePacket.HeaderCode);
    b.setUint8(PoisonDamagePacket.DataOffset, PoisonDamagePacket.Code);
  b.setUint8(PoisonDamagePacket.DataOffset + 1, PoisonDamagePacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = PoisonDamagePacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 8): PoisonDamagePacket {
    const p = new PoisonDamagePacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get HealthDamage(){
    return this.buffer.getUint16(4, false);
  }
  set HealthDamage(value: number){
    this.buffer.setUint16(4, value, false);
  }
  get CurrentShield(){
    return this.buffer.getUint16(6, false);
  }
  set CurrentShield(value: number){
    this.buffer.setUint16(6, value, false);
  }
}
export class HeroStateChangedPacket {
  buffer!: DataView;
  static readonly Name = `HeroStateChanged`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `After a the hero state of an observed character changed.`;
  static readonly CausedReaction = `The color of the name of the character is changed accordingly and a message is shown.`;
  static readonly Length = 7;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xF3;
  static readonly SubCode = 0x08;

  static getRequiredSize(dataSize:number){
    return HeroStateChangedPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, HeroStateChangedPacket.HeaderCode);
    b.setUint8(HeroStateChangedPacket.DataOffset, HeroStateChangedPacket.Code);
  b.setUint8(HeroStateChangedPacket.DataOffset + 1, HeroStateChangedPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = HeroStateChangedPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 7): HeroStateChangedPacket {
    const p = new HeroStateChangedPacket();
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
  get NewState():Byte{
    return GetByteValue(this.buffer.getUint8(6), 8, 0);
  }
  set NewState(value: Byte){
    const oldValue = this.NewState;
    this.buffer.setUint8(6, SetByteValue(oldValue, value, 8, 0));
  }
}
export class SkillAddedPacket {
  buffer!: DataView;
  static readonly Name = `SkillAdded`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `After a skill got added to the skill list, e.g. by equipping an item or learning a skill.`;
  static readonly CausedReaction = `The skill is added to the skill list on client side.`;
  static readonly Length = 10;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xF3;
  static readonly SubCode = 0x11;

  static getRequiredSize(dataSize:number){
    return SkillAddedPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, SkillAddedPacket.HeaderCode);
    b.setUint8(SkillAddedPacket.DataOffset, SkillAddedPacket.Code);
  b.setUint8(SkillAddedPacket.DataOffset + 1, SkillAddedPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = SkillAddedPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 10): SkillAddedPacket {
    const p = new SkillAddedPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Flag() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set Flag(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }
  get SkillIndex() {
    return GetByteValue(this.buffer.getUint8(6), 8, 0);
  }
  set SkillIndex(value: number) {
    const oldByte = this.buffer.getUint8(6);
    this.buffer.setUint8(6, SetByteValue(oldByte, value, 8, 0));
  }
  get SkillNumber(){
    return this.buffer.getUint16(7, true);
  }
  set SkillNumber(value: number){
    this.buffer.setUint16(7, value, true);
  }
  get SkillLevel() {
    return GetByteValue(this.buffer.getUint8(9), 8, 0);
  }
  set SkillLevel(value: number) {
    const oldByte = this.buffer.getUint8(9);
    this.buffer.setUint8(9, SetByteValue(oldByte, value, 8, 0));
  }
}
export class SkillRemovedPacket {
  buffer!: DataView;
  static readonly Name = `SkillRemoved`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `After a skill got removed from the skill list, e.g. by removing an equipped item.`;
  static readonly CausedReaction = `The skill is added to the skill list on client side.`;
  static readonly Length = 10;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xF3;
  static readonly SubCode = 0x11;

  static getRequiredSize(dataSize:number){
    return SkillRemovedPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, SkillRemovedPacket.HeaderCode);
    b.setUint8(SkillRemovedPacket.DataOffset, SkillRemovedPacket.Code);
  b.setUint8(SkillRemovedPacket.DataOffset + 1, SkillRemovedPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = SkillRemovedPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 10): SkillRemovedPacket {
    const p = new SkillRemovedPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Flag() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set Flag(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }
  get SkillIndex() {
    return GetByteValue(this.buffer.getUint8(6), 8, 0);
  }
  set SkillIndex(value: number) {
    const oldByte = this.buffer.getUint8(6);
    this.buffer.setUint8(6, SetByteValue(oldByte, value, 8, 0));
  }
  get SkillNumber(){
    return this.buffer.getUint16(7, true);
  }
  set SkillNumber(value: number){
    this.buffer.setUint16(7, value, true);
  }
}
export class SkillListUpdatePacket {
  buffer!: DataView;
  static readonly Name = `SkillListUpdate`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `Usually, when the player entered the game with a character. When skills get added or removed, this message is sent as well, but with a misleading count.`;
  static readonly CausedReaction = `The skill list gets initialized.`;
  static readonly Length = undefined;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xF3;
  static readonly SubCode = 0x11;

  static getRequiredSize(dataSize:number){
    return SkillListUpdatePacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, SkillListUpdatePacket.HeaderCode);
    b.setUint8(SkillListUpdatePacket.DataOffset, SkillListUpdatePacket.Code);
  b.setUint8(SkillListUpdatePacket.DataOffset + 1, SkillListUpdatePacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = SkillListUpdatePacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number): SkillListUpdatePacket {
    const p = new SkillListUpdatePacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Count() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set Count(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }

  getSkills(count: number = this.Count): {
  SkillIndex: Byte;
  SkillNumber: ShortLittleEndian;
  SkillLevel: Byte;

}[]{
    const b = this.buffer;
    let bi = 0;

    const Skills_count = count;
    const Skills: any[] = new Array(Skills_count);
    
    let Skills_StartOffset = bi + 6;
    for (let i = 0; i < Skills_count; i++) {
      const SkillIndex = b.getUint8(Skills_StartOffset + 0);
      const SkillNumber = b.getUint16(Skills_StartOffset + 1, true);
      const SkillLevel = b.getUint8(Skills_StartOffset + 3);
      Skills[i] = {
        SkillIndex,
        SkillNumber,
        SkillLevel
      };
      Skills_StartOffset += 4;
    }
    
    return Skills;
  }}
export class SkillAdded075Packet {
  buffer!: DataView;
  static readonly Name = `SkillAdded075`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `After a skill got added to the skill list, e.g. by equipping an item or learning a skill.`;
  static readonly CausedReaction = `The skill is added to the skill list on client side.`;
  static readonly Length = 8;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xF3;
  static readonly SubCode = 0x11;

  static getRequiredSize(dataSize:number){
    return SkillAdded075Packet.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, SkillAdded075Packet.HeaderCode);
    b.setUint8(SkillAdded075Packet.DataOffset, SkillAdded075Packet.Code);
  b.setUint8(SkillAdded075Packet.DataOffset + 1, SkillAdded075Packet.SubCode);
    return this;
  }

  writeLength(l: number|undefined = SkillAdded075Packet.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 8): SkillAdded075Packet {
    const p = new SkillAdded075Packet();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Flag() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set Flag(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }
  get SkillIndex() {
    return GetByteValue(this.buffer.getUint8(5), 8, 0);
  }
  set SkillIndex(value: number) {
    const oldByte = this.buffer.getUint8(5);
    this.buffer.setUint8(5, SetByteValue(oldByte, value, 8, 0));
  }
  get SkillNumberAndLevel(){
    return this.buffer.getUint16(6, false);
  }
  set SkillNumberAndLevel(value: number){
    this.buffer.setUint16(6, value, false);
  }
}
export class SkillRemoved075Packet {
  buffer!: DataView;
  static readonly Name = `SkillRemoved075`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `After a skill got removed from the skill list, e.g. by removing an equipped item.`;
  static readonly CausedReaction = `The skill is added to the skill list on client side.`;
  static readonly Length = 10;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xF3;
  static readonly SubCode = 0x11;

  static getRequiredSize(dataSize:number){
    return SkillRemoved075Packet.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, SkillRemoved075Packet.HeaderCode);
    b.setUint8(SkillRemoved075Packet.DataOffset, SkillRemoved075Packet.Code);
  b.setUint8(SkillRemoved075Packet.DataOffset + 1, SkillRemoved075Packet.SubCode);
    return this;
  }

  writeLength(l: number|undefined = SkillRemoved075Packet.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 10): SkillRemoved075Packet {
    const p = new SkillRemoved075Packet();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Flag() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set Flag(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }
  get SkillIndex() {
    return GetByteValue(this.buffer.getUint8(5), 8, 0);
  }
  set SkillIndex(value: number) {
    const oldByte = this.buffer.getUint8(5);
    this.buffer.setUint8(5, SetByteValue(oldByte, value, 8, 0));
  }
  get SkillNumberAndLevel(){
    return this.buffer.getUint16(6, false);
  }
  set SkillNumberAndLevel(value: number){
    this.buffer.setUint16(6, value, false);
  }
}
export class SkillAdded095Packet {
  buffer!: DataView;
  static readonly Name = `SkillAdded095`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `After a skill got added to the skill list, e.g. by equipping an item or learning a skill.`;
  static readonly CausedReaction = `The skill is added to the skill list on client side.`;
  static readonly Length = 8;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xF3;
  static readonly SubCode = 0x11;

  static getRequiredSize(dataSize:number){
    return SkillAdded095Packet.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, SkillAdded095Packet.HeaderCode);
    b.setUint8(SkillAdded095Packet.DataOffset, SkillAdded095Packet.Code);
  b.setUint8(SkillAdded095Packet.DataOffset + 1, SkillAdded095Packet.SubCode);
    return this;
  }

  writeLength(l: number|undefined = SkillAdded095Packet.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 8): SkillAdded095Packet {
    const p = new SkillAdded095Packet();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Flag() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set Flag(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }
  get SkillIndex() {
    return GetByteValue(this.buffer.getUint8(5), 8, 0);
  }
  set SkillIndex(value: number) {
    const oldByte = this.buffer.getUint8(5);
    this.buffer.setUint8(5, SetByteValue(oldByte, value, 8, 0));
  }
  get SkillNumberAndLevel(){
    return this.buffer.getUint16(6, false);
  }
  set SkillNumberAndLevel(value: number){
    this.buffer.setUint16(6, value, false);
  }
}
export class SkillRemoved095Packet {
  buffer!: DataView;
  static readonly Name = `SkillRemoved095`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `After a skill got removed from the skill list, e.g. by removing an equipped item.`;
  static readonly CausedReaction = `The skill is added to the skill list on client side.`;
  static readonly Length = 10;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xF3;
  static readonly SubCode = 0x11;

  static getRequiredSize(dataSize:number){
    return SkillRemoved095Packet.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, SkillRemoved095Packet.HeaderCode);
    b.setUint8(SkillRemoved095Packet.DataOffset, SkillRemoved095Packet.Code);
  b.setUint8(SkillRemoved095Packet.DataOffset + 1, SkillRemoved095Packet.SubCode);
    return this;
  }

  writeLength(l: number|undefined = SkillRemoved095Packet.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 10): SkillRemoved095Packet {
    const p = new SkillRemoved095Packet();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Flag() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set Flag(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }
  get SkillIndex() {
    return GetByteValue(this.buffer.getUint8(5), 8, 0);
  }
  set SkillIndex(value: number) {
    const oldByte = this.buffer.getUint8(5);
    this.buffer.setUint8(5, SetByteValue(oldByte, value, 8, 0));
  }
  get SkillNumberAndLevel(){
    return this.buffer.getUint16(6, false);
  }
  set SkillNumberAndLevel(value: number){
    this.buffer.setUint16(6, value, false);
  }
}
export class SkillListUpdate075Packet {
  buffer!: DataView;
  static readonly Name = `SkillListUpdate075`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `Usually, when the player entered the game with a character. When skills get added or removed, this message is sent as well, but with a misleading count.`;
  static readonly CausedReaction = `The skill list gets initialized.`;
  static readonly Length = undefined;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xF3;
  static readonly SubCode = 0x11;

  static getRequiredSize(dataSize:number){
    return SkillListUpdate075Packet.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, SkillListUpdate075Packet.HeaderCode);
    b.setUint8(SkillListUpdate075Packet.DataOffset, SkillListUpdate075Packet.Code);
  b.setUint8(SkillListUpdate075Packet.DataOffset + 1, SkillListUpdate075Packet.SubCode);
    return this;
  }

  writeLength(l: number|undefined = SkillListUpdate075Packet.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number): SkillListUpdate075Packet {
    const p = new SkillListUpdate075Packet();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Count() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set Count(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }

  getSkills(count: number = this.Count): {
  SkillIndex: Byte;
  SkillNumberAndLevel: ShortBigEndian;

}[]{
    const b = this.buffer;
    let bi = 0;

    const Skills_count = count;
    const Skills: any[] = new Array(Skills_count);
    
    let Skills_StartOffset = bi + 5;
    for (let i = 0; i < Skills_count; i++) {
      const SkillIndex = b.getUint8(Skills_StartOffset + 0);
      const SkillNumberAndLevel = b.getUint16(Skills_StartOffset + 1, false);
      Skills[i] = {
        SkillIndex,
        SkillNumberAndLevel
      };
      Skills_StartOffset += 3;
    }
    
    return Skills;
  }}
export class CharacterFocusedPacket {
  buffer!: DataView;
  static readonly Name = `CharacterFocused`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `After the client focused the character successfully on the server side.`;
  static readonly CausedReaction = `The client highlights the focused character.`;
  static readonly Length = 15;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xF3;
  static readonly SubCode = 0x15;

  static getRequiredSize(dataSize:number){
    return CharacterFocusedPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, CharacterFocusedPacket.HeaderCode);
    b.setUint8(CharacterFocusedPacket.DataOffset, CharacterFocusedPacket.Code);
  b.setUint8(CharacterFocusedPacket.DataOffset + 1, CharacterFocusedPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = CharacterFocusedPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  private _readString (from :number, to: number): string {
    return readWireString(this.buffer, from, to);
  }

  static createPacket(requiredSize: number = 15): CharacterFocusedPacket {
    const p = new CharacterFocusedPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get CharacterName(){
    const to = 14;
              
    return this._readString(4, to);
  }
  setCharacterName(str: string, count = 10){
    const from = 4;
    for(let i = 0; i < str.length; i++){
      const char = str.charCodeAt(i);
      this.buffer.setUint8(from + i, char);
    }
}
}
export class CharacterStatIncreaseResponsePacket {
  buffer!: DataView;
  static readonly Name = `CharacterStatIncreaseResponse`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `After the server processed a character stat increase request packet.`;
  static readonly CausedReaction = `If it was successful, adds a point to the requested stat type.`;
  static readonly Length = 12;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xF3;
  static readonly SubCode = 0x06;

  static getRequiredSize(dataSize:number){
    return CharacterStatIncreaseResponsePacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, CharacterStatIncreaseResponsePacket.HeaderCode);
    b.setUint8(CharacterStatIncreaseResponsePacket.DataOffset, CharacterStatIncreaseResponsePacket.Code);
  b.setUint8(CharacterStatIncreaseResponsePacket.DataOffset + 1, CharacterStatIncreaseResponsePacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = CharacterStatIncreaseResponsePacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 12): CharacterStatIncreaseResponsePacket {
    const p = new CharacterStatIncreaseResponsePacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Success(){
    return GetBoolean(this.buffer.getUint8(4), 4);
  }
  set Success(value: boolean){
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetBoolean(oldByte, value, 4));
  }
  get Attribute():Byte{
    return GetByteValue(this.buffer.getUint8(4), 4, 0);
  }
  set Attribute(value: Byte){
    const oldValue = this.Attribute;
    this.buffer.setUint8(4, SetByteValue(oldValue, value, 4, 0));
  }
  get UpdatedDependentMaximumStat(){
    return this.buffer.getUint16(6, true);
  }
  set UpdatedDependentMaximumStat(value: number){
    this.buffer.setUint16(6, value, true);
  }
  get UpdatedMaximumShield(){
    return this.buffer.getUint16(8, true);
  }
  set UpdatedMaximumShield(value: number){
    this.buffer.setUint16(8, value, true);
  }
  get UpdatedMaximumAbility(){
    return this.buffer.getUint16(10, true);
  }
  set UpdatedMaximumAbility(value: number){
    this.buffer.setUint16(10, value, true);
  }
}
export class CharacterStatIncreaseResponseExtendedPacket {
  buffer!: DataView;
  static readonly Name = `CharacterStatIncreaseResponseExtended`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `After the server processed a character stat increase request packet.`;
  static readonly CausedReaction = `If it was successful, adds a point to the requested stat type.`;
  static readonly Length = 24;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xF3;
  static readonly SubCode = 0x06;

  static getRequiredSize(dataSize:number){
    return CharacterStatIncreaseResponseExtendedPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, CharacterStatIncreaseResponseExtendedPacket.HeaderCode);
    b.setUint8(CharacterStatIncreaseResponseExtendedPacket.DataOffset, CharacterStatIncreaseResponseExtendedPacket.Code);
  b.setUint8(CharacterStatIncreaseResponseExtendedPacket.DataOffset + 1, CharacterStatIncreaseResponseExtendedPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = CharacterStatIncreaseResponseExtendedPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 24): CharacterStatIncreaseResponseExtendedPacket {
    const p = new CharacterStatIncreaseResponseExtendedPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Attribute():Byte{
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set Attribute(value: Byte){
    const oldValue = this.Attribute;
    this.buffer.setUint8(4, SetByteValue(oldValue, value, 8, 0));
  }
  get AddedAmount(){
    return this.buffer.getUint16(6, true);
  }
  set AddedAmount(value: number){
    this.buffer.setUint16(6, value, true);
  }
  get UpdatedMaximumHealth(){
    return this.buffer.getUint32(8, true);
  }
  set UpdatedMaximumHealth(value: number){
    this.buffer.setUint32(8, value, true);
  }
  get UpdatedMaximumMana(){
    return this.buffer.getUint32(12, true);
  }
  set UpdatedMaximumMana(value: number){
    this.buffer.setUint32(12, value, true);
  }
  get UpdatedMaximumShield(){
    return this.buffer.getUint32(16, true);
  }
  set UpdatedMaximumShield(value: number){
    this.buffer.setUint32(16, value, true);
  }
  get UpdatedMaximumAbility(){
    return this.buffer.getUint32(20, true);
  }
  set UpdatedMaximumAbility(value: number){
    this.buffer.setUint32(20, value, true);
  }
}
export enum CharacterDeleteResponseCharacterDeleteResultEnum {
    Unsuccessful = 0,
Successful = 1,
WrongSecurityCode = 2
  }export class CharacterDeleteResponsePacket {
  buffer!: DataView;
  static readonly Name = `CharacterDeleteResponse`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `After the server processed a character delete response of the client.`;
  static readonly CausedReaction = `If successful, the character is deleted from the character selection screen. Otherwise, a message is shown.`;
  static readonly Length = 5;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xF3;
  static readonly SubCode = 0x02;

  static getRequiredSize(dataSize:number){
    return CharacterDeleteResponsePacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, CharacterDeleteResponsePacket.HeaderCode);
    b.setUint8(CharacterDeleteResponsePacket.DataOffset, CharacterDeleteResponsePacket.Code);
  b.setUint8(CharacterDeleteResponsePacket.DataOffset + 1, CharacterDeleteResponsePacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = CharacterDeleteResponsePacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 5): CharacterDeleteResponsePacket {
    const p = new CharacterDeleteResponsePacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Result():CharacterDeleteResponseCharacterDeleteResultEnum{
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set Result(value: CharacterDeleteResponseCharacterDeleteResultEnum){
    const oldValue = this.Result;
    this.buffer.setUint8(4, SetByteValue(oldValue, value, 8, 0));
  }
}
export class CharacterLevelUpdatePacket {
  buffer!: DataView;
  static readonly Name = `CharacterLevelUpdate`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `After a character leveled up.`;
  static readonly CausedReaction = `Updates the level (and other related stats) in the game client and shows an effect.`;
  static readonly Length = 24;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xF3;
  static readonly SubCode = 0x05;

  static getRequiredSize(dataSize:number){
    return CharacterLevelUpdatePacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, CharacterLevelUpdatePacket.HeaderCode);
    b.setUint8(CharacterLevelUpdatePacket.DataOffset, CharacterLevelUpdatePacket.Code);
  b.setUint8(CharacterLevelUpdatePacket.DataOffset + 1, CharacterLevelUpdatePacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = CharacterLevelUpdatePacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 24): CharacterLevelUpdatePacket {
    const p = new CharacterLevelUpdatePacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Level(){
    return this.buffer.getUint16(4, true);
  }
  set Level(value: number){
    this.buffer.setUint16(4, value, true);
  }
  get LevelUpPoints(){
    return this.buffer.getUint16(6, true);
  }
  set LevelUpPoints(value: number){
    this.buffer.setUint16(6, value, true);
  }
  get MaximumHealth(){
    return this.buffer.getUint16(8, true);
  }
  set MaximumHealth(value: number){
    this.buffer.setUint16(8, value, true);
  }
  get MaximumMana(){
    return this.buffer.getUint16(10, true);
  }
  set MaximumMana(value: number){
    this.buffer.setUint16(10, value, true);
  }
  get MaximumShield(){
    return this.buffer.getUint16(12, true);
  }
  set MaximumShield(value: number){
    this.buffer.setUint16(12, value, true);
  }
  get MaximumAbility(){
    return this.buffer.getUint16(14, true);
  }
  set MaximumAbility(value: number){
    this.buffer.setUint16(14, value, true);
  }
  get FruitPoints(){
    return this.buffer.getUint16(16, true);
  }
  set FruitPoints(value: number){
    this.buffer.setUint16(16, value, true);
  }
  get MaximumFruitPoints(){
    return this.buffer.getUint16(18, true);
  }
  set MaximumFruitPoints(value: number){
    this.buffer.setUint16(18, value, true);
  }
  get NegativeFruitPoints(){
    return this.buffer.getUint16(20, true);
  }
  set NegativeFruitPoints(value: number){
    this.buffer.setUint16(20, value, true);
  }
  get MaximumNegativeFruitPoints(){
    return this.buffer.getUint16(22, true);
  }
  set MaximumNegativeFruitPoints(value: number){
    this.buffer.setUint16(22, value, true);
  }
}
export class CharacterInformationPacket {
  buffer!: DataView;
  static readonly Name = `CharacterInformation`;
  static readonly HeaderType = `C3HeaderWithSubCode`;
  static readonly HeaderCode = 0xC3;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `After the character was selected by the player and entered the game.`;
  static readonly CausedReaction = `The characters enters the game world.`;
  static readonly Length = 72;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xF3;
  static readonly SubCode = 0x03;

  static getRequiredSize(dataSize:number){
    return CharacterInformationPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, CharacterInformationPacket.HeaderCode);
    b.setUint8(CharacterInformationPacket.DataOffset, CharacterInformationPacket.Code);
  b.setUint8(CharacterInformationPacket.DataOffset + 1, CharacterInformationPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = CharacterInformationPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 72): CharacterInformationPacket {
    const p = new CharacterInformationPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get X() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set X(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }
  get Y() {
    return GetByteValue(this.buffer.getUint8(5), 8, 0);
  }
  set Y(value: number) {
    const oldByte = this.buffer.getUint8(5);
    this.buffer.setUint8(5, SetByteValue(oldByte, value, 8, 0));
  }
  get MapId(){
    return this.buffer.getUint16(6, true);
  }
  set MapId(value: number){
    this.buffer.setUint16(6, value, true);
  }
  get CurrentExperience(){
    return this.buffer.getBigUint64(8, false);
  }
  set CurrentExperience(value: bigint){
    this.buffer.setBigUint64(8, value, false);
  }
  get ExperienceForNextLevel(){
    return this.buffer.getBigUint64(16, false);
  }
  set ExperienceForNextLevel(value: bigint){
    this.buffer.setBigUint64(16, value, false);
  }
  get LevelUpPoints(){
    return this.buffer.getUint16(24, true);
  }
  set LevelUpPoints(value: number){
    this.buffer.setUint16(24, value, true);
  }
  get Strength(){
    return this.buffer.getUint16(26, true);
  }
  set Strength(value: number){
    this.buffer.setUint16(26, value, true);
  }
  get Agility(){
    return this.buffer.getUint16(28, true);
  }
  set Agility(value: number){
    this.buffer.setUint16(28, value, true);
  }
  get Vitality(){
    return this.buffer.getUint16(30, true);
  }
  set Vitality(value: number){
    this.buffer.setUint16(30, value, true);
  }
  get Energy(){
    return this.buffer.getUint16(32, true);
  }
  set Energy(value: number){
    this.buffer.setUint16(32, value, true);
  }
  get CurrentHealth(){
    return this.buffer.getUint16(34, true);
  }
  set CurrentHealth(value: number){
    this.buffer.setUint16(34, value, true);
  }
  get MaximumHealth(){
    return this.buffer.getUint16(36, true);
  }
  set MaximumHealth(value: number){
    this.buffer.setUint16(36, value, true);
  }
  get CurrentMana(){
    return this.buffer.getUint16(38, true);
  }
  set CurrentMana(value: number){
    this.buffer.setUint16(38, value, true);
  }
  get MaximumMana(){
    return this.buffer.getUint16(40, true);
  }
  set MaximumMana(value: number){
    this.buffer.setUint16(40, value, true);
  }
  get CurrentShield(){
    return this.buffer.getUint16(42, true);
  }
  set CurrentShield(value: number){
    this.buffer.setUint16(42, value, true);
  }
  get MaximumShield(){
    return this.buffer.getUint16(44, true);
  }
  set MaximumShield(value: number){
    this.buffer.setUint16(44, value, true);
  }
  get CurrentAbility(){
    return this.buffer.getUint16(46, true);
  }
  set CurrentAbility(value: number){
    this.buffer.setUint16(46, value, true);
  }
  get MaximumAbility(){
    return this.buffer.getUint16(48, true);
  }
  set MaximumAbility(value: number){
    this.buffer.setUint16(48, value, true);
  }
  get Money(){
    return this.buffer.getUint32(52, true);
  }
  set Money(value: number){
    this.buffer.setUint32(52, value, true);
  }
  get HeroState():Byte{
    return GetByteValue(this.buffer.getUint8(56), 8, 0);
  }
  set HeroState(value: Byte){
    const oldValue = this.HeroState;
    this.buffer.setUint8(56, SetByteValue(oldValue, value, 8, 0));
  }
  get Status():CharacterStatusEnum{
    return GetByteValue(this.buffer.getUint8(57), 8, 0);
  }
  set Status(value: CharacterStatusEnum){
    const oldValue = this.Status;
    this.buffer.setUint8(57, SetByteValue(oldValue, value, 8, 0));
  }
  get UsedFruitPoints(){
    return this.buffer.getUint16(58, true);
  }
  set UsedFruitPoints(value: number){
    this.buffer.setUint16(58, value, true);
  }
  get MaxFruitPoints(){
    return this.buffer.getUint16(60, true);
  }
  set MaxFruitPoints(value: number){
    this.buffer.setUint16(60, value, true);
  }
  get Leadership(){
    return this.buffer.getUint16(62, true);
  }
  set Leadership(value: number){
    this.buffer.setUint16(62, value, true);
  }
  get UsedNegativeFruitPoints(){
    return this.buffer.getUint16(64, true);
  }
  set UsedNegativeFruitPoints(value: number){
    this.buffer.setUint16(64, value, true);
  }
  get MaxNegativeFruitPoints(){
    return this.buffer.getUint16(66, true);
  }
  set MaxNegativeFruitPoints(value: number){
    this.buffer.setUint16(66, value, true);
  }
  get InventoryExtensions() {
    return GetByteValue(this.buffer.getUint8(68), 8, 0);
  }
  set InventoryExtensions(value: number) {
    const oldByte = this.buffer.getUint8(68);
    this.buffer.setUint8(68, SetByteValue(oldByte, value, 8, 0));
  }
}
export class CharacterLevelUpdateExtendedPacket {
  buffer!: DataView;
  static readonly Name = `CharacterLevelUpdateExtended`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `After a character leveled up.`;
  static readonly CausedReaction = `Updates the level (and other related stats) in the game client and shows an effect.`;
  static readonly Length = 32;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xF3;
  static readonly SubCode = 0x05;

  static getRequiredSize(dataSize:number){
    return CharacterLevelUpdateExtendedPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, CharacterLevelUpdateExtendedPacket.HeaderCode);
    b.setUint8(CharacterLevelUpdateExtendedPacket.DataOffset, CharacterLevelUpdateExtendedPacket.Code);
  b.setUint8(CharacterLevelUpdateExtendedPacket.DataOffset + 1, CharacterLevelUpdateExtendedPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = CharacterLevelUpdateExtendedPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 32): CharacterLevelUpdateExtendedPacket {
    const p = new CharacterLevelUpdateExtendedPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Level(){
    return this.buffer.getUint16(4, true);
  }
  set Level(value: number){
    this.buffer.setUint16(4, value, true);
  }
  get LevelUpPoints(){
    return this.buffer.getUint16(6, true);
  }
  set LevelUpPoints(value: number){
    this.buffer.setUint16(6, value, true);
  }
  get MaximumHealth(){
    return this.buffer.getUint32(8, true);
  }
  set MaximumHealth(value: number){
    this.buffer.setUint32(8, value, true);
  }
  get MaximumMana(){
    return this.buffer.getUint32(12, true);
  }
  set MaximumMana(value: number){
    this.buffer.setUint32(12, value, true);
  }
  get MaximumShield(){
    return this.buffer.getUint32(16, true);
  }
  set MaximumShield(value: number){
    this.buffer.setUint32(16, value, true);
  }
  get MaximumAbility(){
    return this.buffer.getUint32(20, true);
  }
  set MaximumAbility(value: number){
    this.buffer.setUint32(20, value, true);
  }
  get FruitPoints(){
    return this.buffer.getUint16(24, true);
  }
  set FruitPoints(value: number){
    this.buffer.setUint16(24, value, true);
  }
  get MaximumFruitPoints(){
    return this.buffer.getUint16(26, true);
  }
  set MaximumFruitPoints(value: number){
    this.buffer.setUint16(26, value, true);
  }
  get NegativeFruitPoints(){
    return this.buffer.getUint16(28, true);
  }
  set NegativeFruitPoints(value: number){
    this.buffer.setUint16(28, value, true);
  }
  get MaximumNegativeFruitPoints(){
    return this.buffer.getUint16(30, true);
  }
  set MaximumNegativeFruitPoints(value: number){
    this.buffer.setUint16(30, value, true);
  }
}
export class CharacterInformationExtendedPacket {
  buffer!: DataView;
  static readonly Name = `CharacterInformationExtended`;
  static readonly HeaderType = `C3HeaderWithSubCode`;
  static readonly HeaderCode = 0xC3;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `After the character was selected by the player and entered the game.`;
  static readonly CausedReaction = `The characters enters the game world.`;
  static readonly Length = 92;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xF3;
  static readonly SubCode = 0x03;

  static getRequiredSize(dataSize:number){
    return CharacterInformationExtendedPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, CharacterInformationExtendedPacket.HeaderCode);
    b.setUint8(CharacterInformationExtendedPacket.DataOffset, CharacterInformationExtendedPacket.Code);
  b.setUint8(CharacterInformationExtendedPacket.DataOffset + 1, CharacterInformationExtendedPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = CharacterInformationExtendedPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 92): CharacterInformationExtendedPacket {
    const p = new CharacterInformationExtendedPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get X() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set X(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }
  get Y() {
    return GetByteValue(this.buffer.getUint8(5), 8, 0);
  }
  set Y(value: number) {
    const oldByte = this.buffer.getUint8(5);
    this.buffer.setUint8(5, SetByteValue(oldByte, value, 8, 0));
  }
  get MapId(){
    return this.buffer.getUint16(6, true);
  }
  set MapId(value: number){
    this.buffer.setUint16(6, value, true);
  }
  get CurrentExperience(){
    return this.buffer.getBigUint64(8, false);
  }
  set CurrentExperience(value: bigint){
    this.buffer.setBigUint64(8, value, false);
  }
  get ExperienceForNextLevel(){
    return this.buffer.getBigUint64(16, false);
  }
  set ExperienceForNextLevel(value: bigint){
    this.buffer.setBigUint64(16, value, false);
  }
  get LevelUpPoints(){
    return this.buffer.getUint16(24, true);
  }
  set LevelUpPoints(value: number){
    this.buffer.setUint16(24, value, true);
  }
  get Strength(){
    return this.buffer.getUint16(26, true);
  }
  set Strength(value: number){
    this.buffer.setUint16(26, value, true);
  }
  get Agility(){
    return this.buffer.getUint16(28, true);
  }
  set Agility(value: number){
    this.buffer.setUint16(28, value, true);
  }
  get Vitality(){
    return this.buffer.getUint16(30, true);
  }
  set Vitality(value: number){
    this.buffer.setUint16(30, value, true);
  }
  get Energy(){
    return this.buffer.getUint16(32, true);
  }
  set Energy(value: number){
    this.buffer.setUint16(32, value, true);
  }
  get Leadership(){
    return this.buffer.getUint16(34, true);
  }
  set Leadership(value: number){
    this.buffer.setUint16(34, value, true);
  }
  get CurrentHealth(){
    return this.buffer.getUint32(36, true);
  }
  set CurrentHealth(value: number){
    this.buffer.setUint32(36, value, true);
  }
  get MaximumHealth(){
    return this.buffer.getUint32(40, true);
  }
  set MaximumHealth(value: number){
    this.buffer.setUint32(40, value, true);
  }
  get CurrentMana(){
    return this.buffer.getUint32(44, true);
  }
  set CurrentMana(value: number){
    this.buffer.setUint32(44, value, true);
  }
  get MaximumMana(){
    return this.buffer.getUint32(48, true);
  }
  set MaximumMana(value: number){
    this.buffer.setUint32(48, value, true);
  }
  get CurrentShield(){
    return this.buffer.getUint32(52, true);
  }
  set CurrentShield(value: number){
    this.buffer.setUint32(52, value, true);
  }
  get MaximumShield(){
    return this.buffer.getUint32(56, true);
  }
  set MaximumShield(value: number){
    this.buffer.setUint32(56, value, true);
  }
  get CurrentAbility(){
    return this.buffer.getUint32(60, true);
  }
  set CurrentAbility(value: number){
    this.buffer.setUint32(60, value, true);
  }
  get MaximumAbility(){
    return this.buffer.getUint32(64, true);
  }
  set MaximumAbility(value: number){
    this.buffer.setUint32(64, value, true);
  }
  get Money(){
    return this.buffer.getUint32(68, true);
  }
  set Money(value: number){
    this.buffer.setUint32(68, value, true);
  }
  get HeroState():Byte{
    return GetByteValue(this.buffer.getUint8(72), 8, 0);
  }
  set HeroState(value: Byte){
    const oldValue = this.HeroState;
    this.buffer.setUint8(72, SetByteValue(oldValue, value, 8, 0));
  }
  get Status():CharacterStatusEnum{
    return GetByteValue(this.buffer.getUint8(73), 8, 0);
  }
  set Status(value: CharacterStatusEnum){
    const oldValue = this.Status;
    this.buffer.setUint8(73, SetByteValue(oldValue, value, 8, 0));
  }
  get UsedFruitPoints(){
    return this.buffer.getUint16(74, true);
  }
  set UsedFruitPoints(value: number){
    this.buffer.setUint16(74, value, true);
  }
  get MaxFruitPoints(){
    return this.buffer.getUint16(76, true);
  }
  set MaxFruitPoints(value: number){
    this.buffer.setUint16(76, value, true);
  }
  get UsedNegativeFruitPoints(){
    return this.buffer.getUint16(78, true);
  }
  set UsedNegativeFruitPoints(value: number){
    this.buffer.setUint16(78, value, true);
  }
  get MaxNegativeFruitPoints(){
    return this.buffer.getUint16(80, true);
  }
  set MaxNegativeFruitPoints(value: number){
    this.buffer.setUint16(80, value, true);
  }
  get AttackSpeed(){
    return this.buffer.getUint16(82, true);
  }
  set AttackSpeed(value: number){
    this.buffer.setUint16(82, value, true);
  }
  get MagicSpeed(){
    return this.buffer.getUint16(84, true);
  }
  set MagicSpeed(value: number){
    this.buffer.setUint16(84, value, true);
  }
  get MaximumAttackSpeed(){
    return this.buffer.getUint16(86, true);
  }
  set MaximumAttackSpeed(value: number){
    this.buffer.setUint16(86, value, true);
  }
  get InventoryExtensions() {
    return GetByteValue(this.buffer.getUint8(88), 8, 0);
  }
  set InventoryExtensions(value: number) {
    const oldByte = this.buffer.getUint8(88);
    this.buffer.setUint8(88, SetByteValue(oldByte, value, 8, 0));
  }
  get Resets(){
    return this.buffer.getUint16(90, true);
  }
  set Resets(value: number){
    this.buffer.setUint16(90, value, true);
  }
}
export class CharacterInformation075Packet {
  buffer!: DataView;
  static readonly Name = `CharacterInformation075`;
  static readonly HeaderType = `C3HeaderWithSubCode`;
  static readonly HeaderCode = 0xC3;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `After the character was selected by the player and entered the game.`;
  static readonly CausedReaction = `The characters enters the game world.`;
  static readonly Length = 42;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xF3;
  static readonly SubCode = 0x03;

  static getRequiredSize(dataSize:number){
    return CharacterInformation075Packet.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, CharacterInformation075Packet.HeaderCode);
    b.setUint8(CharacterInformation075Packet.DataOffset, CharacterInformation075Packet.Code);
  b.setUint8(CharacterInformation075Packet.DataOffset + 1, CharacterInformation075Packet.SubCode);
    return this;
  }

  writeLength(l: number|undefined = CharacterInformation075Packet.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 42): CharacterInformation075Packet {
    const p = new CharacterInformation075Packet();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get X() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set X(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }
  get Y() {
    return GetByteValue(this.buffer.getUint8(5), 8, 0);
  }
  set Y(value: number) {
    const oldByte = this.buffer.getUint8(5);
    this.buffer.setUint8(5, SetByteValue(oldByte, value, 8, 0));
  }
  get MapId() {
    return GetByteValue(this.buffer.getUint8(6), 8, 0);
  }
  set MapId(value: number) {
    const oldByte = this.buffer.getUint8(6);
    this.buffer.setUint8(6, SetByteValue(oldByte, value, 8, 0));
  }
  get CurrentExperience(){
    return this.buffer.getUint32(8, true);
  }
  set CurrentExperience(value: number){
    this.buffer.setUint32(8, value, true);
  }
  get ExperienceForNextLevel(){
    return this.buffer.getUint32(12, true);
  }
  set ExperienceForNextLevel(value: number){
    this.buffer.setUint32(12, value, true);
  }
  get LevelUpPoints(){
    return this.buffer.getUint16(16, true);
  }
  set LevelUpPoints(value: number){
    this.buffer.setUint16(16, value, true);
  }
  get Strength(){
    return this.buffer.getUint16(18, true);
  }
  set Strength(value: number){
    this.buffer.setUint16(18, value, true);
  }
  get Agility(){
    return this.buffer.getUint16(20, true);
  }
  set Agility(value: number){
    this.buffer.setUint16(20, value, true);
  }
  get Vitality(){
    return this.buffer.getUint16(22, true);
  }
  set Vitality(value: number){
    this.buffer.setUint16(22, value, true);
  }
  get Energy(){
    return this.buffer.getUint16(24, true);
  }
  set Energy(value: number){
    this.buffer.setUint16(24, value, true);
  }
  get CurrentHealth(){
    return this.buffer.getUint16(26, true);
  }
  set CurrentHealth(value: number){
    this.buffer.setUint16(26, value, true);
  }
  get MaximumHealth(){
    return this.buffer.getUint16(28, true);
  }
  set MaximumHealth(value: number){
    this.buffer.setUint16(28, value, true);
  }
  get CurrentMana(){
    return this.buffer.getUint16(30, true);
  }
  set CurrentMana(value: number){
    this.buffer.setUint16(30, value, true);
  }
  get MaximumMana(){
    return this.buffer.getUint16(32, true);
  }
  set MaximumMana(value: number){
    this.buffer.setUint16(32, value, true);
  }
  get Money(){
    return this.buffer.getUint32(36, true);
  }
  set Money(value: number){
    this.buffer.setUint32(36, value, true);
  }
  get HeroState():Byte{
    return GetByteValue(this.buffer.getUint8(40), 8, 0);
  }
  set HeroState(value: Byte){
    const oldValue = this.HeroState;
    this.buffer.setUint8(40, SetByteValue(oldValue, value, 8, 0));
  }
  get Status():CharacterStatusEnum{
    return GetByteValue(this.buffer.getUint8(41), 8, 0);
  }
  set Status(value: CharacterStatusEnum){
    const oldValue = this.Status;
    this.buffer.setUint8(41, SetByteValue(oldValue, value, 8, 0));
  }
}
export class CharacterInformation097Packet {
  buffer!: DataView;
  static readonly Name = `CharacterInformation097`;
  static readonly HeaderType = `C3HeaderWithSubCode`;
  static readonly HeaderCode = 0xC3;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `After the character was selected by the player and entered the game.`;
  static readonly CausedReaction = `The characters enters the game world.`;
  static readonly Length = 52;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xF3;
  static readonly SubCode = 0x03;

  static getRequiredSize(dataSize:number){
    return CharacterInformation097Packet.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, CharacterInformation097Packet.HeaderCode);
    b.setUint8(CharacterInformation097Packet.DataOffset, CharacterInformation097Packet.Code);
  b.setUint8(CharacterInformation097Packet.DataOffset + 1, CharacterInformation097Packet.SubCode);
    return this;
  }

  writeLength(l: number|undefined = CharacterInformation097Packet.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 52): CharacterInformation097Packet {
    const p = new CharacterInformation097Packet();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get X() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set X(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }
  get Y() {
    return GetByteValue(this.buffer.getUint8(5), 8, 0);
  }
  set Y(value: number) {
    const oldByte = this.buffer.getUint8(5);
    this.buffer.setUint8(5, SetByteValue(oldByte, value, 8, 0));
  }
  get MapId() {
    return GetByteValue(this.buffer.getUint8(6), 8, 0);
  }
  set MapId(value: number) {
    const oldByte = this.buffer.getUint8(6);
    this.buffer.setUint8(6, SetByteValue(oldByte, value, 8, 0));
  }
  get Direction() {
    return GetByteValue(this.buffer.getUint8(7), 8, 0);
  }
  set Direction(value: number) {
    const oldByte = this.buffer.getUint8(7);
    this.buffer.setUint8(7, SetByteValue(oldByte, value, 8, 0));
  }
  get CurrentExperience(){
    return this.buffer.getUint32(8, true);
  }
  set CurrentExperience(value: number){
    this.buffer.setUint32(8, value, true);
  }
  get ExperienceForNextLevel(){
    return this.buffer.getUint32(12, true);
  }
  set ExperienceForNextLevel(value: number){
    this.buffer.setUint32(12, value, true);
  }
  get LevelUpPoints(){
    return this.buffer.getUint16(16, true);
  }
  set LevelUpPoints(value: number){
    this.buffer.setUint16(16, value, true);
  }
  get Strength(){
    return this.buffer.getUint16(18, true);
  }
  set Strength(value: number){
    this.buffer.setUint16(18, value, true);
  }
  get Agility(){
    return this.buffer.getUint16(20, true);
  }
  set Agility(value: number){
    this.buffer.setUint16(20, value, true);
  }
  get Vitality(){
    return this.buffer.getUint16(22, true);
  }
  set Vitality(value: number){
    this.buffer.setUint16(22, value, true);
  }
  get Energy(){
    return this.buffer.getUint16(24, true);
  }
  set Energy(value: number){
    this.buffer.setUint16(24, value, true);
  }
  get CurrentHealth(){
    return this.buffer.getUint16(26, true);
  }
  set CurrentHealth(value: number){
    this.buffer.setUint16(26, value, true);
  }
  get MaximumHealth(){
    return this.buffer.getUint16(28, true);
  }
  set MaximumHealth(value: number){
    this.buffer.setUint16(28, value, true);
  }
  get CurrentMana(){
    return this.buffer.getUint16(30, true);
  }
  set CurrentMana(value: number){
    this.buffer.setUint16(30, value, true);
  }
  get MaximumMana(){
    return this.buffer.getUint16(32, true);
  }
  set MaximumMana(value: number){
    this.buffer.setUint16(32, value, true);
  }
  get CurrentAbility(){
    return this.buffer.getUint16(34, true);
  }
  set CurrentAbility(value: number){
    this.buffer.setUint16(34, value, true);
  }
  get MaximumAbility(){
    return this.buffer.getUint16(36, true);
  }
  set MaximumAbility(value: number){
    this.buffer.setUint16(36, value, true);
  }
  get Money(){
    return this.buffer.getUint32(40, true);
  }
  set Money(value: number){
    this.buffer.setUint32(40, value, true);
  }
  get HeroState():Byte{
    return GetByteValue(this.buffer.getUint8(44), 8, 0);
  }
  set HeroState(value: Byte){
    const oldValue = this.HeroState;
    this.buffer.setUint8(44, SetByteValue(oldValue, value, 8, 0));
  }
  get Status():CharacterStatusEnum{
    return GetByteValue(this.buffer.getUint8(45), 8, 0);
  }
  set Status(value: CharacterStatusEnum){
    const oldValue = this.Status;
    this.buffer.setUint8(45, SetByteValue(oldValue, value, 8, 0));
  }
  get UsedFruitPoints(){
    return this.buffer.getUint16(46, true);
  }
  set UsedFruitPoints(value: number){
    this.buffer.setUint16(46, value, true);
  }
  get MaxFruitPoints(){
    return this.buffer.getUint16(48, true);
  }
  set MaxFruitPoints(value: number){
    this.buffer.setUint16(48, value, true);
  }
  get Leadership(){
    return this.buffer.getUint16(50, true);
  }
  set Leadership(value: number){
    this.buffer.setUint16(50, value, true);
  }
}
export class CharacterInventoryPacket {
  buffer!: DataView;
  static readonly Name = `CharacterInventory`;
  static readonly HeaderType = `C4HeaderWithSubCode`;
  static readonly HeaderCode = 0xC4;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `The player entered the game or finished a trade.`;
  static readonly CausedReaction = `The user interface of the inventory is initialized with all of its items.`;
  static readonly Length = undefined;
  static readonly LengthSize = 2;
  static readonly DataOffset = 3;
  static readonly Code = 0xF3;
  static readonly SubCode = 0x10;

  static getRequiredSize(dataSize:number){
    return CharacterInventoryPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, CharacterInventoryPacket.HeaderCode);
    b.setUint8(CharacterInventoryPacket.DataOffset, CharacterInventoryPacket.Code);
  b.setUint8(CharacterInventoryPacket.DataOffset + 1, CharacterInventoryPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = CharacterInventoryPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint16(1, l);
    return this;
  }

  private _readDataView (from: number, to: number): DataView {
    return new DataView(this.buffer.buffer.slice(from, to));
  }

  static createPacket(requiredSize: number): CharacterInventoryPacket {
    const p = new CharacterInventoryPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get ItemCount() {
    return GetByteValue(this.buffer.getUint8(5), 8, 0);
  }
  set ItemCount(value: number) {
    const oldByte = this.buffer.getUint8(5);
    this.buffer.setUint8(5, SetByteValue(oldByte, value, 8, 0));
  }

  getItems(count: number = this.ItemCount): {
  ItemSlot: Byte;
  ItemData: Binary;

}[]{
    const b = this.buffer;
    let bi = 0;

    const Items_count = count;
    const Items: any[] = new Array(Items_count);
    
    let Items_StartOffset = bi + 6;
    for (let i = 0; i < Items_count; i++) {
      const ItemSlot = b.getUint8(Items_StartOffset + 0);
      const ItemData = this._readDataView(Items_StartOffset + 1, Items_StartOffset + 1 + 12);
      Items[i] = {
        ItemSlot,
        ItemData
      };
      Items_StartOffset += 13;
    }
    
    return Items;
  }}
export class InventoryItemUpgradedPacket {
  buffer!: DataView;
  static readonly Name = `InventoryItemUpgraded`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `An item in the inventory got upgraded by the player, e.g. by applying a jewel.`;
  static readonly CausedReaction = `The item is updated on the user interface.`;
  static readonly Length = undefined;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xF3;
  static readonly SubCode = 0x14;

  static getRequiredSize(dataSize:number){
    return InventoryItemUpgradedPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, InventoryItemUpgradedPacket.HeaderCode);
    b.setUint8(InventoryItemUpgradedPacket.DataOffset, InventoryItemUpgradedPacket.Code);
  b.setUint8(InventoryItemUpgradedPacket.DataOffset + 1, InventoryItemUpgradedPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = InventoryItemUpgradedPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number): InventoryItemUpgradedPacket {
    const p = new InventoryItemUpgradedPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get InventorySlot() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set InventorySlot(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }
  get ItemData(){
    const to = this.buffer.byteLength;
    const i = 5;
              
    return new DataView(this.buffer.buffer.slice(i,to));
  }
  setItemData(data: ArrayLike<number>, count = NaN){
    if (data.length !== count) throw new Error(`data.length must be ${count}`);
    const from = 5;

    for (let i = 0; i < data.length; i++) {
      this.buffer.setUint8(from + i, data[i]);
    }
}
}
export class SummonHealthUpdatePacket {
  buffer!: DataView;
  static readonly Name = `SummonHealthUpdate`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `When health of a summoned monster (Elf Skill) changed.`;
  static readonly CausedReaction = `The health is updated on the user interface.`;
  static readonly Length = 5;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xF3;
  static readonly SubCode = 0x20;

  static getRequiredSize(dataSize:number){
    return SummonHealthUpdatePacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, SummonHealthUpdatePacket.HeaderCode);
    b.setUint8(SummonHealthUpdatePacket.DataOffset, SummonHealthUpdatePacket.Code);
  b.setUint8(SummonHealthUpdatePacket.DataOffset + 1, SummonHealthUpdatePacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = SummonHealthUpdatePacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 5): SummonHealthUpdatePacket {
    const p = new SummonHealthUpdatePacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get HealthPercent() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set HealthPercent(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }
}
export class GuildSoccerTimeUpdatePacket {
  buffer!: DataView;
  static readonly Name = `GuildSoccerTimeUpdate`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `Every second during a guild soccer match.`;
  static readonly CausedReaction = `The time is updated on the user interface.`;
  static readonly Length = 6;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xF3;
  static readonly SubCode = 0x22;

  static getRequiredSize(dataSize:number){
    return GuildSoccerTimeUpdatePacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, GuildSoccerTimeUpdatePacket.HeaderCode);
    b.setUint8(GuildSoccerTimeUpdatePacket.DataOffset, GuildSoccerTimeUpdatePacket.Code);
  b.setUint8(GuildSoccerTimeUpdatePacket.DataOffset + 1, GuildSoccerTimeUpdatePacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = GuildSoccerTimeUpdatePacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 6): GuildSoccerTimeUpdatePacket {
    const p = new GuildSoccerTimeUpdatePacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Seconds(){
    return this.buffer.getUint16(4, true);
  }
  set Seconds(value: number){
    this.buffer.setUint16(4, value, true);
  }
}
export class GuildSoccerScoreUpdatePacket {
  buffer!: DataView;
  static readonly Name = `GuildSoccerScoreUpdate`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `Whenever the score of the soccer game changed, and at the beginning of the match.`;
  static readonly CausedReaction = `The score is updated on the user interface.`;
  static readonly Length = 22;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xF3;
  static readonly SubCode = 0x23;

  static getRequiredSize(dataSize:number){
    return GuildSoccerScoreUpdatePacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, GuildSoccerScoreUpdatePacket.HeaderCode);
    b.setUint8(GuildSoccerScoreUpdatePacket.DataOffset, GuildSoccerScoreUpdatePacket.Code);
  b.setUint8(GuildSoccerScoreUpdatePacket.DataOffset + 1, GuildSoccerScoreUpdatePacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = GuildSoccerScoreUpdatePacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  private _readString (from :number, to: number): string {
    return readWireString(this.buffer, from, to);
  }

  static createPacket(requiredSize: number = 22): GuildSoccerScoreUpdatePacket {
    const p = new GuildSoccerScoreUpdatePacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get RedTeamName(){
    const to = 12;
              
    return this._readString(4, to);
  }
  setRedTeamName(str: string, count = 8){
    const from = 4;
    for(let i = 0; i < str.length; i++){
      const char = str.charCodeAt(i);
      this.buffer.setUint8(from + i, char);
    }
}
  get RedTeamGoals() {
    return GetByteValue(this.buffer.getUint8(12), 8, 0);
  }
  set RedTeamGoals(value: number) {
    const oldByte = this.buffer.getUint8(12);
    this.buffer.setUint8(12, SetByteValue(oldByte, value, 8, 0));
  }
  get BlueTeamName(){
    const to = 21;
              
    return this._readString(13, to);
  }
  setBlueTeamName(str: string, count = 8){
    const from = 13;
    for(let i = 0; i < str.length; i++){
      const char = str.charCodeAt(i);
      this.buffer.setUint8(from + i, char);
    }
}
  get BlueTeamGoals() {
    return GetByteValue(this.buffer.getUint8(21), 8, 0);
  }
  set BlueTeamGoals(value: number) {
    const oldByte = this.buffer.getUint8(21);
    this.buffer.setUint8(21, SetByteValue(oldByte, value, 8, 0));
  }
}
export class ServerCommandPacket {
  buffer!: DataView;
  static readonly Name = `ServerCommand`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `E.g. when event items are dropped to the floor, or a specific dialog should be shown.`;
  static readonly CausedReaction = `The client shows an effect, e.g. a firework.`;
  static readonly Length = 7;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xF3;
  static readonly SubCode = 0x40;

  static getRequiredSize(dataSize:number){
    return ServerCommandPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, ServerCommandPacket.HeaderCode);
    b.setUint8(ServerCommandPacket.DataOffset, ServerCommandPacket.Code);
  b.setUint8(ServerCommandPacket.DataOffset + 1, ServerCommandPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = ServerCommandPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 7): ServerCommandPacket {
    const p = new ServerCommandPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get CommandType() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set CommandType(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }
  get Parameter1() {
    return GetByteValue(this.buffer.getUint8(5), 8, 0);
  }
  set Parameter1(value: number) {
    const oldByte = this.buffer.getUint8(5);
    this.buffer.setUint8(5, SetByteValue(oldByte, value, 8, 0));
  }
  get Parameter2() {
    return GetByteValue(this.buffer.getUint8(6), 8, 0);
  }
  set Parameter2(value: number) {
    const oldByte = this.buffer.getUint8(6);
    this.buffer.setUint8(6, SetByteValue(oldByte, value, 8, 0));
  }
}
export class ShowFireworksPacket {
  buffer!: DataView;
  static readonly Name = `ShowFireworks`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `E.g. when event items are dropped to the floor.`;
  static readonly CausedReaction = `The client shows an fireworks effect at the specified coordinates.`;
  static readonly Length = 7;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xF3;
  static readonly SubCode = 0x40;

  static getRequiredSize(dataSize:number){
    return ShowFireworksPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, ShowFireworksPacket.HeaderCode);
    b.setUint8(ShowFireworksPacket.DataOffset, ShowFireworksPacket.Code);
  b.setUint8(ShowFireworksPacket.DataOffset + 1, ShowFireworksPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = ShowFireworksPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 7): ShowFireworksPacket {
    const p = new ShowFireworksPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get EffectType() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set EffectType(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }
  get X() {
    return GetByteValue(this.buffer.getUint8(5), 8, 0);
  }
  set X(value: number) {
    const oldByte = this.buffer.getUint8(5);
    this.buffer.setUint8(5, SetByteValue(oldByte, value, 8, 0));
  }
  get Y() {
    return GetByteValue(this.buffer.getUint8(6), 8, 0);
  }
  set Y(value: number) {
    const oldByte = this.buffer.getUint8(6);
    this.buffer.setUint8(6, SetByteValue(oldByte, value, 8, 0));
  }
}
export class ShowChristmasFireworksPacket {
  buffer!: DataView;
  static readonly Name = `ShowChristmasFireworks`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `E.g. when event items are dropped to the floor.`;
  static readonly CausedReaction = `The client shows an christmas fireworks effect at the specified coordinates.`;
  static readonly Length = 7;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xF3;
  static readonly SubCode = 0x40;

  static getRequiredSize(dataSize:number){
    return ShowChristmasFireworksPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, ShowChristmasFireworksPacket.HeaderCode);
    b.setUint8(ShowChristmasFireworksPacket.DataOffset, ShowChristmasFireworksPacket.Code);
  b.setUint8(ShowChristmasFireworksPacket.DataOffset + 1, ShowChristmasFireworksPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = ShowChristmasFireworksPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 7): ShowChristmasFireworksPacket {
    const p = new ShowChristmasFireworksPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get EffectType() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set EffectType(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }
  get X() {
    return GetByteValue(this.buffer.getUint8(5), 8, 0);
  }
  set X(value: number) {
    const oldByte = this.buffer.getUint8(5);
    this.buffer.setUint8(5, SetByteValue(oldByte, value, 8, 0));
  }
  get Y() {
    return GetByteValue(this.buffer.getUint8(6), 8, 0);
  }
  set Y(value: number) {
    const oldByte = this.buffer.getUint8(6);
    this.buffer.setUint8(6, SetByteValue(oldByte, value, 8, 0));
  }
}
export class PlayFanfareSoundPacket {
  buffer!: DataView;
  static readonly Name = `PlayFanfareSound`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `E.g. when event items are dropped to the floor.`;
  static readonly CausedReaction = `The client plays a fanfare sound at the specified coordinates.`;
  static readonly Length = 7;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xF3;
  static readonly SubCode = 0x40;

  static getRequiredSize(dataSize:number){
    return PlayFanfareSoundPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, PlayFanfareSoundPacket.HeaderCode);
    b.setUint8(PlayFanfareSoundPacket.DataOffset, PlayFanfareSoundPacket.Code);
  b.setUint8(PlayFanfareSoundPacket.DataOffset + 1, PlayFanfareSoundPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = PlayFanfareSoundPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 7): PlayFanfareSoundPacket {
    const p = new PlayFanfareSoundPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get EffectType() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set EffectType(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }
  get X() {
    return GetByteValue(this.buffer.getUint8(5), 8, 0);
  }
  set X(value: number) {
    const oldByte = this.buffer.getUint8(5);
    this.buffer.setUint8(5, SetByteValue(oldByte, value, 8, 0));
  }
  get Y() {
    return GetByteValue(this.buffer.getUint8(6), 8, 0);
  }
  set Y(value: number) {
    const oldByte = this.buffer.getUint8(6);
    this.buffer.setUint8(6, SetByteValue(oldByte, value, 8, 0));
  }
}
export class ShowSwirlPacket {
  buffer!: DataView;
  static readonly Name = `ShowSwirl`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `E.g. when event items are dropped to the floor.`;
  static readonly CausedReaction = `The client shows a swirl effect at the specified object.`;
  static readonly Length = 7;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xF3;
  static readonly SubCode = 0x40;

  static getRequiredSize(dataSize:number){
    return ShowSwirlPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, ShowSwirlPacket.HeaderCode);
    b.setUint8(ShowSwirlPacket.DataOffset, ShowSwirlPacket.Code);
  b.setUint8(ShowSwirlPacket.DataOffset + 1, ShowSwirlPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = ShowSwirlPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 7): ShowSwirlPacket {
    const p = new ShowSwirlPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get EffectType() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set EffectType(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }
  get TargetObjectId(){
    return this.buffer.getUint16(5, false);
  }
  set TargetObjectId(value: number){
    this.buffer.setUint16(5, value, false);
  }
}
export class MasterStatsUpdatePacket {
  buffer!: DataView;
  static readonly Name = `MasterStatsUpdate`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `After entering the game with a master class character.`;
  static readonly CausedReaction = `The master related data is available.`;
  static readonly Length = 32;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xF3;
  static readonly SubCode = 0x50;

  static getRequiredSize(dataSize:number){
    return MasterStatsUpdatePacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, MasterStatsUpdatePacket.HeaderCode);
    b.setUint8(MasterStatsUpdatePacket.DataOffset, MasterStatsUpdatePacket.Code);
  b.setUint8(MasterStatsUpdatePacket.DataOffset + 1, MasterStatsUpdatePacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = MasterStatsUpdatePacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 32): MasterStatsUpdatePacket {
    const p = new MasterStatsUpdatePacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get MasterLevel(){
    return this.buffer.getUint16(4, true);
  }
  set MasterLevel(value: number){
    this.buffer.setUint16(4, value, true);
  }
  get MasterExperience(){
    return this.buffer.getBigUint64(6, false);
  }
  set MasterExperience(value: bigint){
    this.buffer.setBigUint64(6, value, false);
  }
  get MasterExperienceOfNextLevel(){
    return this.buffer.getBigUint64(14, false);
  }
  set MasterExperienceOfNextLevel(value: bigint){
    this.buffer.setBigUint64(14, value, false);
  }
  get MasterLevelUpPoints(){
    return this.buffer.getUint16(22, true);
  }
  set MasterLevelUpPoints(value: number){
    this.buffer.setUint16(22, value, true);
  }
  get MaximumHealth(){
    return this.buffer.getUint16(24, true);
  }
  set MaximumHealth(value: number){
    this.buffer.setUint16(24, value, true);
  }
  get MaximumMana(){
    return this.buffer.getUint16(26, true);
  }
  set MaximumMana(value: number){
    this.buffer.setUint16(26, value, true);
  }
  get MaximumShield(){
    return this.buffer.getUint16(28, true);
  }
  set MaximumShield(value: number){
    this.buffer.setUint16(28, value, true);
  }
  get MaximumAbility(){
    return this.buffer.getUint16(30, true);
  }
  set MaximumAbility(value: number){
    this.buffer.setUint16(30, value, true);
  }
}
export class MasterStatsUpdateExtendedPacket {
  buffer!: DataView;
  static readonly Name = `MasterStatsUpdateExtended`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `After entering the game with a master class character.`;
  static readonly CausedReaction = `The master related data is available.`;
  static readonly Length = 40;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xF3;
  static readonly SubCode = 0x50;

  static getRequiredSize(dataSize:number){
    return MasterStatsUpdateExtendedPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, MasterStatsUpdateExtendedPacket.HeaderCode);
    b.setUint8(MasterStatsUpdateExtendedPacket.DataOffset, MasterStatsUpdateExtendedPacket.Code);
  b.setUint8(MasterStatsUpdateExtendedPacket.DataOffset + 1, MasterStatsUpdateExtendedPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = MasterStatsUpdateExtendedPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 40): MasterStatsUpdateExtendedPacket {
    const p = new MasterStatsUpdateExtendedPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get MasterLevel(){
    return this.buffer.getUint16(4, true);
  }
  set MasterLevel(value: number){
    this.buffer.setUint16(4, value, true);
  }
  get MasterExperience(){
    return this.buffer.getBigUint64(6, false);
  }
  set MasterExperience(value: bigint){
    this.buffer.setBigUint64(6, value, false);
  }
  get MasterExperienceOfNextLevel(){
    return this.buffer.getBigUint64(14, false);
  }
  set MasterExperienceOfNextLevel(value: bigint){
    this.buffer.setBigUint64(14, value, false);
  }
  get MasterLevelUpPoints(){
    return this.buffer.getUint16(22, true);
  }
  set MasterLevelUpPoints(value: number){
    this.buffer.setUint16(22, value, true);
  }
  get MaximumHealth(){
    return this.buffer.getUint32(24, true);
  }
  set MaximumHealth(value: number){
    this.buffer.setUint32(24, value, true);
  }
  get MaximumMana(){
    return this.buffer.getUint32(28, true);
  }
  set MaximumMana(value: number){
    this.buffer.setUint32(28, value, true);
  }
  get MaximumShield(){
    return this.buffer.getUint32(32, true);
  }
  set MaximumShield(value: number){
    this.buffer.setUint32(32, value, true);
  }
  get MaximumAbility(){
    return this.buffer.getUint32(36, true);
  }
  set MaximumAbility(value: number){
    this.buffer.setUint32(36, value, true);
  }
}
export class MasterCharacterLevelUpdatePacket {
  buffer!: DataView;
  static readonly Name = `MasterCharacterLevelUpdate`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `After a master character leveled up.`;
  static readonly CausedReaction = `Updates the master level (and other related stats) in the game client and shows an effect.`;
  static readonly Length = 20;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xF3;
  static readonly SubCode = 0x51;

  static getRequiredSize(dataSize:number){
    return MasterCharacterLevelUpdatePacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, MasterCharacterLevelUpdatePacket.HeaderCode);
    b.setUint8(MasterCharacterLevelUpdatePacket.DataOffset, MasterCharacterLevelUpdatePacket.Code);
  b.setUint8(MasterCharacterLevelUpdatePacket.DataOffset + 1, MasterCharacterLevelUpdatePacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = MasterCharacterLevelUpdatePacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 20): MasterCharacterLevelUpdatePacket {
    const p = new MasterCharacterLevelUpdatePacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get MasterLevel(){
    return this.buffer.getUint16(4, true);
  }
  set MasterLevel(value: number){
    this.buffer.setUint16(4, value, true);
  }
  get GainedMasterPoints(){
    return this.buffer.getUint16(6, true);
  }
  set GainedMasterPoints(value: number){
    this.buffer.setUint16(6, value, true);
  }
  get CurrentMasterPoints(){
    return this.buffer.getUint16(8, true);
  }
  set CurrentMasterPoints(value: number){
    this.buffer.setUint16(8, value, true);
  }
  get MaximumMasterPoints(){
    return this.buffer.getUint16(10, true);
  }
  set MaximumMasterPoints(value: number){
    this.buffer.setUint16(10, value, true);
  }
  get MaximumHealth(){
    return this.buffer.getUint16(12, true);
  }
  set MaximumHealth(value: number){
    this.buffer.setUint16(12, value, true);
  }
  get MaximumMana(){
    return this.buffer.getUint16(14, true);
  }
  set MaximumMana(value: number){
    this.buffer.setUint16(14, value, true);
  }
  get MaximumShield(){
    return this.buffer.getUint16(16, true);
  }
  set MaximumShield(value: number){
    this.buffer.setUint16(16, value, true);
  }
  get MaximumAbility(){
    return this.buffer.getUint16(18, true);
  }
  set MaximumAbility(value: number){
    this.buffer.setUint16(18, value, true);
  }
}
export class MasterCharacterLevelUpdateExtendedPacket {
  buffer!: DataView;
  static readonly Name = `MasterCharacterLevelUpdateExtended`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `After a master character leveled up.`;
  static readonly CausedReaction = `Updates the master level (and other related stats) in the game client and shows an effect.`;
  static readonly Length = 28;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xF3;
  static readonly SubCode = 0x51;

  static getRequiredSize(dataSize:number){
    return MasterCharacterLevelUpdateExtendedPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, MasterCharacterLevelUpdateExtendedPacket.HeaderCode);
    b.setUint8(MasterCharacterLevelUpdateExtendedPacket.DataOffset, MasterCharacterLevelUpdateExtendedPacket.Code);
  b.setUint8(MasterCharacterLevelUpdateExtendedPacket.DataOffset + 1, MasterCharacterLevelUpdateExtendedPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = MasterCharacterLevelUpdateExtendedPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 28): MasterCharacterLevelUpdateExtendedPacket {
    const p = new MasterCharacterLevelUpdateExtendedPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get MasterLevel(){
    return this.buffer.getUint16(4, true);
  }
  set MasterLevel(value: number){
    this.buffer.setUint16(4, value, true);
  }
  get GainedMasterPoints(){
    return this.buffer.getUint16(6, true);
  }
  set GainedMasterPoints(value: number){
    this.buffer.setUint16(6, value, true);
  }
  get CurrentMasterPoints(){
    return this.buffer.getUint16(8, true);
  }
  set CurrentMasterPoints(value: number){
    this.buffer.setUint16(8, value, true);
  }
  get MaximumMasterPoints(){
    return this.buffer.getUint16(10, true);
  }
  set MaximumMasterPoints(value: number){
    this.buffer.setUint16(10, value, true);
  }
  get MaximumHealth(){
    return this.buffer.getUint32(12, true);
  }
  set MaximumHealth(value: number){
    this.buffer.setUint32(12, value, true);
  }
  get MaximumMana(){
    return this.buffer.getUint32(16, true);
  }
  set MaximumMana(value: number){
    this.buffer.setUint32(16, value, true);
  }
  get MaximumShield(){
    return this.buffer.getUint32(20, true);
  }
  set MaximumShield(value: number){
    this.buffer.setUint32(20, value, true);
  }
  get MaximumAbility(){
    return this.buffer.getUint32(24, true);
  }
  set MaximumAbility(value: number){
    this.buffer.setUint32(24, value, true);
  }
}
export class MasterSkillLevelUpdatePacket {
  buffer!: DataView;
  static readonly Name = `MasterSkillLevelUpdate`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `After a master skill level has been changed (usually increased).`;
  static readonly CausedReaction = `The level is updated in the master skill tree.`;
  static readonly Length = 28;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xF3;
  static readonly SubCode = 0x52;

  static getRequiredSize(dataSize:number){
    return MasterSkillLevelUpdatePacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, MasterSkillLevelUpdatePacket.HeaderCode);
    b.setUint8(MasterSkillLevelUpdatePacket.DataOffset, MasterSkillLevelUpdatePacket.Code);
  b.setUint8(MasterSkillLevelUpdatePacket.DataOffset + 1, MasterSkillLevelUpdatePacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = MasterSkillLevelUpdatePacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 28): MasterSkillLevelUpdatePacket {
    const p = new MasterSkillLevelUpdatePacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Success(){
    return GetBoolean(this.buffer.getUint8(4), 0);
  }
  set Success(value: boolean){
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetBoolean(oldByte, value, 0));
  }
  get MasterLevelUpPoints(){
    return this.buffer.getUint16(6, true);
  }
  set MasterLevelUpPoints(value: number){
    this.buffer.setUint16(6, value, true);
  }
  get MasterSkillIndex() {
    return GetByteValue(this.buffer.getUint8(8), 8, 0);
  }
  set MasterSkillIndex(value: number) {
    const oldByte = this.buffer.getUint8(8);
    this.buffer.setUint8(8, SetByteValue(oldByte, value, 8, 0));
  }
  get MasterSkillNumber(){
    return this.buffer.getUint16(12, true);
  }
  set MasterSkillNumber(value: number){
    this.buffer.setUint16(12, value, true);
  }
  get Level() {
    return GetByteValue(this.buffer.getUint8(16), 8, 0);
  }
  set Level(value: number) {
    const oldByte = this.buffer.getUint8(16);
    this.buffer.setUint8(16, SetByteValue(oldByte, value, 8, 0));
  }
  get DisplayValue(){
    return this.buffer.getUint32(20);
  }
  set DisplayValue(value: number){
    this.buffer.setUint32(20, value);
  }
  get DisplayValueOfNextLevel(){
    return this.buffer.getUint32(24);
  }
  set DisplayValueOfNextLevel(value: number){
    this.buffer.setUint32(24, value);
  }
}
export class MasterSkillListPacket {
  buffer!: DataView;
  static readonly Name = `MasterSkillList`;
  static readonly HeaderType = `C2HeaderWithSubCode`;
  static readonly HeaderCode = 0xC2;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `Usually after entering the game with a master character.`;
  static readonly CausedReaction = `The data is available in the master skill tree.`;
  static readonly Length = undefined;
  static readonly LengthSize = 2;
  static readonly DataOffset = 3;
  static readonly Code = 0xF3;
  static readonly SubCode = 0x53;

  static getRequiredSize(dataSize:number){
    return MasterSkillListPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, MasterSkillListPacket.HeaderCode);
    b.setUint8(MasterSkillListPacket.DataOffset, MasterSkillListPacket.Code);
  b.setUint8(MasterSkillListPacket.DataOffset + 1, MasterSkillListPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = MasterSkillListPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint16(1, l);
    return this;
  }

  static createPacket(requiredSize: number): MasterSkillListPacket {
    const p = new MasterSkillListPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get MasterSkillCount(){
    return this.buffer.getUint32(8, true);
  }
  set MasterSkillCount(value: number){
    this.buffer.setUint32(8, value, true);
  }

  getSkills(count: number = this.MasterSkillCount): {
  MasterSkillIndex: Byte;
  Level: Byte;
  DisplayValue: Float;
  DisplayValueOfNextLevel: Float;

}[]{
    const b = this.buffer;
    let bi = 0;

    const Skills_count = count;
    const Skills: any[] = new Array(Skills_count);
    
    let Skills_StartOffset = bi + 12;
    for (let i = 0; i < Skills_count; i++) {
      const MasterSkillIndex = b.getUint8(Skills_StartOffset + 0);
      const Level = b.getUint8(Skills_StartOffset + 1);
      const DisplayValue = 0.0;
      const DisplayValueOfNextLevel = 0.0;
      Skills[i] = {
        MasterSkillIndex,
        Level,
        DisplayValue,
        DisplayValueOfNextLevel
      };
      Skills_StartOffset += 12;
    }
    
    return Skills;
  }}
export enum ServerMessageMessageTypeEnum {
    GoldenCenter = 0,
BlueNormal = 1,
GuildNotice = 2
  }export class ServerMessagePacket {
  buffer!: DataView;
  static readonly Name = `ServerMessage`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `undefined`;
  static readonly CausedReaction = `undefined`;
  static readonly Length = undefined;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x0D;

  static getRequiredSize(dataSize:number){
    return ServerMessagePacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, ServerMessagePacket.HeaderCode);
    b.setUint8(ServerMessagePacket.DataOffset, ServerMessagePacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = ServerMessagePacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  private _readString (from :number, to: number): string {
    return readWireString(this.buffer, from, to);
  }

  static createPacket(requiredSize: number): ServerMessagePacket {
    const p = new ServerMessagePacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Type():ServerMessageMessageTypeEnum{
    return GetByteValue(this.buffer.getUint8(3), 8, 0);
  }
  set Type(value: ServerMessageMessageTypeEnum){
    const oldValue = this.Type;
    this.buffer.setUint8(3, SetByteValue(oldValue, value, 8, 0));
  }
  get Message(){
    const to = this.buffer.byteLength;
              
    return this._readString(4, to);
  }
  setMessage(str: string, count = NaN){
    const from = 4;
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
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `A player requested to join a guild. This message is sent then to the guild master.`;
  static readonly CausedReaction = `The guild master gets a message box with the request popping up.`;
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
  get RequesterId(){
    return this.buffer.getUint16(3, false);
  }
  set RequesterId(value: number){
    this.buffer.setUint16(3, value, false);
  }
}
export enum GuildJoinResponseGuildJoinRequestResultEnum {
    Refused = 0,
Accepted = 1,
GuildFull = 2,
Disconnected = 3,
NotTheGuildMaster = 4,
AlreadyHaveGuild = 5,
GuildMasterOrRequesterIsBusy = 6,
MinimumLevel6 = 7
  }export class GuildJoinResponsePacket {
  buffer!: DataView;
  static readonly Name = `GuildJoinResponse`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `After a guild master responded to a request of a player to join his guild. This message is sent back to the requesting player.`;
  static readonly CausedReaction = `The requester gets a corresponding message showing.`;
  static readonly Length = 4;
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

  static createPacket(requiredSize: number = 4): GuildJoinResponsePacket {
    const p = new GuildJoinResponsePacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Result():GuildJoinResponseGuildJoinRequestResultEnum{
    return GetByteValue(this.buffer.getUint8(3), 8, 0);
  }
  set Result(value: GuildJoinResponseGuildJoinRequestResultEnum){
    const oldValue = this.Result;
    this.buffer.setUint8(3, SetByteValue(oldValue, value, 8, 0));
  }
}
export class GuildListPacket {
  buffer!: DataView;
  static readonly Name = `GuildList`;
  static readonly HeaderType = `C2Header`;
  static readonly HeaderCode = 0xC2;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `After a game client requested the list of players of his guild, which is usually the case when the player opens the guild dialog at the game client.`;
  static readonly CausedReaction = `The list of player is available at the client.`;
  static readonly Length = undefined;
  static readonly LengthSize = 2;
  static readonly DataOffset = 3;
  static readonly Code = 0x52;

  static getRequiredSize(dataSize:number){
    return GuildListPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, GuildListPacket.HeaderCode);
    b.setUint8(GuildListPacket.DataOffset, GuildListPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = GuildListPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint16(1, l);
    return this;
  }

  private _readString (from :number, to: number): string {
    return readWireString(this.buffer, from, to);
  }

  static createPacket(requiredSize: number): GuildListPacket {
    const p = new GuildListPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get IsInGuild(){
    return GetBoolean(this.buffer.getUint8(4), 0);
  }
  set IsInGuild(value: boolean){
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetBoolean(oldByte, value, 0));
  }
  get GuildMemberCount() {
    return GetByteValue(this.buffer.getUint8(5), 8, 0);
  }
  set GuildMemberCount(value: number) {
    const oldByte = this.buffer.getUint8(5);
    this.buffer.setUint8(5, SetByteValue(oldByte, value, 8, 0));
  }
  get TotalScore(){
    return this.buffer.getUint32(8, true);
  }
  set TotalScore(value: number){
    this.buffer.setUint32(8, value, true);
  }
  get CurrentScore() {
    return GetByteValue(this.buffer.getUint8(12), 8, 0);
  }
  set CurrentScore(value: number) {
    const oldByte = this.buffer.getUint8(12);
    this.buffer.setUint8(12, SetByteValue(oldByte, value, 8, 0));
  }
  get RivalGuildName(){
    const to = 21;
              
    return this._readString(13, to);
  }
  setRivalGuildName(str: string, count = 8){
    const from = 13;
    for(let i = 0; i < str.length; i++){
      const char = str.charCodeAt(i);
      this.buffer.setUint8(from + i, char);
    }
}

  getMembers(count: number = this.GuildMemberCount): {
  Name: string;
  ServerId: Byte;
  ServerId2: Byte;
  Role: GuildMemberRoleEnum;

}[]{
    const b = this.buffer;
    let bi = 0;

    const Members_count = count;
    const Members: any[] = new Array(Members_count);
    
    let Members_StartOffset = bi + 24;
    for (let i = 0; i < Members_count; i++) {
      const Name = this._readString(Members_StartOffset + 0, Members_StartOffset + 0 + 10);
      const ServerId = b.getUint8(Members_StartOffset + 10);
      const ServerId2 = b.getUint8(Members_StartOffset + 11);
      const Role = GetByteValue(b.getUint8(Members_StartOffset + 12), 8, 0);
      Members[i] = {
        Name,
        ServerId,
        ServerId2,
        Role
      };
      Members_StartOffset += 13;
    }
    
    return Members;
  }}
export class GuildList075Packet {
  buffer!: DataView;
  static readonly Name = `GuildList075`;
  static readonly HeaderType = `C2Header`;
  static readonly HeaderCode = 0xC2;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `After a game client requested the list of players of his guild, which is usually the case when the player opens the guild dialog at the game client.`;
  static readonly CausedReaction = `The list of player is available at the client.`;
  static readonly Length = undefined;
  static readonly LengthSize = 2;
  static readonly DataOffset = 3;
  static readonly Code = 0x52;

  static getRequiredSize(dataSize:number){
    return GuildList075Packet.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, GuildList075Packet.HeaderCode);
    b.setUint8(GuildList075Packet.DataOffset, GuildList075Packet.Code);
  
    return this;
  }

  writeLength(l: number|undefined = GuildList075Packet.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint16(1, l);
    return this;
  }

  private _readString (from :number, to: number): string {
    return readWireString(this.buffer, from, to);
  }

  static createPacket(requiredSize: number): GuildList075Packet {
    const p = new GuildList075Packet();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get IsInGuild(){
    return GetBoolean(this.buffer.getUint8(4), 0);
  }
  set IsInGuild(value: boolean){
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetBoolean(oldByte, value, 0));
  }
  get GuildMemberCount() {
    return GetByteValue(this.buffer.getUint8(5), 8, 0);
  }
  set GuildMemberCount(value: number) {
    const oldByte = this.buffer.getUint8(5);
    this.buffer.setUint8(5, SetByteValue(oldByte, value, 8, 0));
  }
  get TotalScore(){
    return this.buffer.getUint32(8, true);
  }
  set TotalScore(value: number){
    this.buffer.setUint32(8, value, true);
  }
  get CurrentScore() {
    return GetByteValue(this.buffer.getUint8(12), 8, 0);
  }
  set CurrentScore(value: number) {
    const oldByte = this.buffer.getUint8(12);
    this.buffer.setUint8(12, SetByteValue(oldByte, value, 8, 0));
  }

  getMembers(count: number = this.GuildMemberCount): {
  Name: string;
  ServerId: Byte;
  ServerId2: Byte;

}[]{
    const b = this.buffer;
    let bi = 0;

    const Members_count = count;
    const Members: any[] = new Array(Members_count);
    
    let Members_StartOffset = bi + 13;
    for (let i = 0; i < Members_count; i++) {
      const Name = this._readString(Members_StartOffset + 0, Members_StartOffset + 0 + 10);
      const ServerId = b.getUint8(Members_StartOffset + 10);
      const ServerId2 = b.getUint8(Members_StartOffset + 11);
      Members[i] = {
        Name,
        ServerId,
        ServerId2
      };
      Members_StartOffset += 12;
    }
    
    return Members;
  }}
export enum GuildKickResponseGuildKickSuccessEnum {
    FailedPasswordIncorrect = 0,
KickSucceeded = 1,
KickFailedBecausePlayerIsNotGuildMaster = 2,
Failed = 3,
GuildDisband = 4,
GuildMemberWithdrawn = 5
  }export class GuildKickResponsePacket {
  buffer!: DataView;
  static readonly Name = `GuildKickResponse`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `After a guild master sent a request to kick a player from its guild and the server processed this request.`;
  static readonly CausedReaction = `The client shows a message depending on the result.`;
  static readonly Length = 4;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x53;

  static getRequiredSize(dataSize:number){
    return GuildKickResponsePacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, GuildKickResponsePacket.HeaderCode);
    b.setUint8(GuildKickResponsePacket.DataOffset, GuildKickResponsePacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = GuildKickResponsePacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 4): GuildKickResponsePacket {
    const p = new GuildKickResponsePacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Result():GuildKickResponseGuildKickSuccessEnum{
    return GetByteValue(this.buffer.getUint8(3), 8, 0);
  }
  set Result(value: GuildKickResponseGuildKickSuccessEnum){
    const oldValue = this.Result;
    this.buffer.setUint8(3, SetByteValue(oldValue, value, 8, 0));
  }
}
export class ShowGuildMasterDialogPacket {
  buffer!: DataView;
  static readonly Name = `ShowGuildMasterDialog`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `After a player started talking to the guild master NPC and the player is allowed to create a guild.`;
  static readonly CausedReaction = `The client shows the guild master dialog.`;
  static readonly Length = 3;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x54;

  static getRequiredSize(dataSize:number){
    return ShowGuildMasterDialogPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, ShowGuildMasterDialogPacket.HeaderCode);
    b.setUint8(ShowGuildMasterDialogPacket.DataOffset, ShowGuildMasterDialogPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = ShowGuildMasterDialogPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 3): ShowGuildMasterDialogPacket {
    const p = new ShowGuildMasterDialogPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
}
export class ShowGuildCreationDialogPacket {
  buffer!: DataView;
  static readonly Name = `ShowGuildCreationDialog`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `After a player started talking to the guild master NPC and the player proceeds to create a guild.`;
  static readonly CausedReaction = `The client shows the guild creation dialog.`;
  static readonly Length = 3;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x55;

  static getRequiredSize(dataSize:number){
    return ShowGuildCreationDialogPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, ShowGuildCreationDialogPacket.HeaderCode);
    b.setUint8(ShowGuildCreationDialogPacket.DataOffset, ShowGuildCreationDialogPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = ShowGuildCreationDialogPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 3): ShowGuildCreationDialogPacket {
    const p = new ShowGuildCreationDialogPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
}
export enum GuildCreationResultGuildCreationErrorTypeEnum {
    None = 0,
GuildNameAlreadyTaken = 179
  }export class GuildCreationResultPacket {
  buffer!: DataView;
  static readonly Name = `GuildCreationResult`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `After a player requested to create a guild at the guild master NPC.`;
  static readonly CausedReaction = `Depending on the result, a message is shown.`;
  static readonly Length = 5;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x56;

  static getRequiredSize(dataSize:number){
    return GuildCreationResultPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, GuildCreationResultPacket.HeaderCode);
    b.setUint8(GuildCreationResultPacket.DataOffset, GuildCreationResultPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = GuildCreationResultPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 5): GuildCreationResultPacket {
    const p = new GuildCreationResultPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Success(){
    return GetBoolean(this.buffer.getUint8(3), 0);
  }
  set Success(value: boolean){
    const oldByte = this.buffer.getUint8(3);
    this.buffer.setUint8(3, SetBoolean(oldByte, value, 0));
  }
  get Error():GuildCreationResultGuildCreationErrorTypeEnum{
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set Error(value: GuildCreationResultGuildCreationErrorTypeEnum){
    const oldValue = this.Error;
    this.buffer.setUint8(4, SetByteValue(oldValue, value, 8, 0));
  }
}
export class GuildMemberLeftGuildPacket {
  buffer!: DataView;
  static readonly Name = `GuildMemberLeftGuild`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `A player left a guild. This message is sent to the player and all surrounding players.`;
  static readonly CausedReaction = `The player is not longer shown as a guild member.`;
  static readonly Length = 5;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x5D;

  static getRequiredSize(dataSize:number){
    return GuildMemberLeftGuildPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, GuildMemberLeftGuildPacket.HeaderCode);
    b.setUint8(GuildMemberLeftGuildPacket.DataOffset, GuildMemberLeftGuildPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = GuildMemberLeftGuildPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 5): GuildMemberLeftGuildPacket {
    const p = new GuildMemberLeftGuildPacket();
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
  get IsGuildMaster(){
    return GetBoolean(this.buffer.getUint8(3), 7);
  }
  set IsGuildMaster(value: boolean){
    const oldByte = this.buffer.getUint8(3);
    this.buffer.setUint8(3, SetBoolean(oldByte, value, 7));
  }
}
export enum GuildWarRequestResultRequestResultEnum {
    GuildNotFound = 0,
RequestSentToGuildMaster = 1,
GuildMasterOffline = 2,
NotInGuild = 3,
Failed = 4,
NotTheGuildMaster = 5,
AlreadyInWar = 6
  }export class GuildWarRequestResultPacket {
  buffer!: DataView;
  static readonly Name = `GuildWarRequestResult`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `A guild master requested a guild war against another guild.`;
  static readonly CausedReaction = `The guild master of the other guild gets this request.`;
  static readonly Length = 4;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x60;

  static getRequiredSize(dataSize:number){
    return GuildWarRequestResultPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, GuildWarRequestResultPacket.HeaderCode);
    b.setUint8(GuildWarRequestResultPacket.DataOffset, GuildWarRequestResultPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = GuildWarRequestResultPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 4): GuildWarRequestResultPacket {
    const p = new GuildWarRequestResultPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Result():GuildWarRequestResultRequestResultEnum{
    return GetByteValue(this.buffer.getUint8(3), 8, 0);
  }
  set Result(value: GuildWarRequestResultRequestResultEnum){
    const oldValue = this.Result;
    this.buffer.setUint8(3, SetByteValue(oldValue, value, 8, 0));
  }
}
export class GuildWarRequestPacket {
  buffer!: DataView;
  static readonly Name = `GuildWarRequest`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `A guild master requested a guild war against another guild.`;
  static readonly CausedReaction = `The guild master of the other guild gets this request.`;
  static readonly Length = 12;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x61;

  static getRequiredSize(dataSize:number){
    return GuildWarRequestPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, GuildWarRequestPacket.HeaderCode);
    b.setUint8(GuildWarRequestPacket.DataOffset, GuildWarRequestPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = GuildWarRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  private _readString (from :number, to: number): string {
    return readWireString(this.buffer, from, to);
  }

  static createPacket(requiredSize: number = 12): GuildWarRequestPacket {
    const p = new GuildWarRequestPacket();
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
  get Type():GuildWarTypeEnum{
    return GetByteValue(this.buffer.getUint8(11), 8, 0);
  }
  set Type(value: GuildWarTypeEnum){
    const oldValue = this.Type;
    this.buffer.setUint8(11, SetByteValue(oldValue, value, 8, 0));
  }
}
export class GuildWarDeclaredPacket {
  buffer!: DataView;
  static readonly Name = `GuildWarDeclared`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `A guild master requested a guild war against another guild.`;
  static readonly CausedReaction = `The guild master of the other guild gets this request.`;
  static readonly Length = 13;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x62;

  static getRequiredSize(dataSize:number){
    return GuildWarDeclaredPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, GuildWarDeclaredPacket.HeaderCode);
    b.setUint8(GuildWarDeclaredPacket.DataOffset, GuildWarDeclaredPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = GuildWarDeclaredPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  private _readString (from :number, to: number): string {
    return readWireString(this.buffer, from, to);
  }

  static createPacket(requiredSize: number = 13): GuildWarDeclaredPacket {
    const p = new GuildWarDeclaredPacket();
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
  get Type():GuildWarTypeEnum{
    return GetByteValue(this.buffer.getUint8(11), 8, 0);
  }
  set Type(value: GuildWarTypeEnum){
    const oldValue = this.Type;
    this.buffer.setUint8(11, SetByteValue(oldValue, value, 8, 0));
  }
  get TeamCode() {
    return GetByteValue(this.buffer.getUint8(12), 8, 0);
  }
  set TeamCode(value: number) {
    const oldByte = this.buffer.getUint8(12);
    this.buffer.setUint8(12, SetByteValue(oldByte, value, 8, 0));
  }
}
export enum GuildWarEndedGuildWarResultEnum {
    Lost = 0,
Won = 1,
OtherGuildMasterCancelledWar = 2,
CancelledWar = 3
  }export class GuildWarEndedPacket {
  buffer!: DataView;
  static readonly Name = `GuildWarEnded`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `The guild war ended.`;
  static readonly CausedReaction = `The guild war is shown as ended on the client side.`;
  static readonly Length = 12;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x63;

  static getRequiredSize(dataSize:number){
    return GuildWarEndedPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, GuildWarEndedPacket.HeaderCode);
    b.setUint8(GuildWarEndedPacket.DataOffset, GuildWarEndedPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = GuildWarEndedPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  private _readString (from :number, to: number): string {
    return readWireString(this.buffer, from, to);
  }

  static createPacket(requiredSize: number = 12): GuildWarEndedPacket {
    const p = new GuildWarEndedPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Result():GuildWarEndedGuildWarResultEnum{
    return GetByteValue(this.buffer.getUint8(3), 8, 0);
  }
  set Result(value: GuildWarEndedGuildWarResultEnum){
    const oldValue = this.Result;
    this.buffer.setUint8(3, SetByteValue(oldValue, value, 8, 0));
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
export class GuildWarScoreUpdatePacket {
  buffer!: DataView;
  static readonly Name = `GuildWarScoreUpdate`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `The guild war score changed.`;
  static readonly CausedReaction = `The guild score is updated on the client side.`;
  static readonly Length = 6;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x64;

  static getRequiredSize(dataSize:number){
    return GuildWarScoreUpdatePacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, GuildWarScoreUpdatePacket.HeaderCode);
    b.setUint8(GuildWarScoreUpdatePacket.DataOffset, GuildWarScoreUpdatePacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = GuildWarScoreUpdatePacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 6): GuildWarScoreUpdatePacket {
    const p = new GuildWarScoreUpdatePacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get ScoreOfOwnGuild() {
    return GetByteValue(this.buffer.getUint8(3), 8, 0);
  }
  set ScoreOfOwnGuild(value: number) {
    const oldByte = this.buffer.getUint8(3);
    this.buffer.setUint8(3, SetByteValue(oldByte, value, 8, 0));
  }
  get ScoreOfEnemyGuild() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set ScoreOfEnemyGuild(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }
  get Type() {
    return GetByteValue(this.buffer.getUint8(5), 8, 0);
  }
  set Type(value: number) {
    const oldByte = this.buffer.getUint8(5);
    this.buffer.setUint8(5, SetByteValue(oldByte, value, 8, 0));
  }
}
export class GuildRelationshipRequestPacket {
  buffer!: DataView;
  static readonly Name = `GuildRelationshipRequest`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `A guild master sent a relationship change request (alliance or hostility) and the server forwards this request to the target guild master.`;
  static readonly CausedReaction = `The target guild master (receiver of this message) sees the incoming request dialog.`;
  static readonly Length = 7;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xE5;

  static getRequiredSize(dataSize:number){
    return GuildRelationshipRequestPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, GuildRelationshipRequestPacket.HeaderCode);
    b.setUint8(GuildRelationshipRequestPacket.DataOffset, GuildRelationshipRequestPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = GuildRelationshipRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 7): GuildRelationshipRequestPacket {
    const p = new GuildRelationshipRequestPacket();
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
  get RequestType():GuildRelationshipRequestTypeEnum{
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set RequestType(value: GuildRelationshipRequestTypeEnum){
    const oldValue = this.RequestType;
    this.buffer.setUint8(4, SetByteValue(oldValue, value, 8, 0));
  }
  get SenderId(){
    return this.buffer.getUint16(5, false);
  }
  set SenderId(value: number){
    this.buffer.setUint16(5, value, false);
  }
}
export enum GuildRelationshipChangeResultGuildRelationshipChangeResultTypeEnum {
    Failed = 0,
Success = 1,
GuildNotFound = 16,
FailedDuringCastleSiege = 16,
NoAuthorization = 17,
NotExistExtraStatus = 18,
NotExistExtraType = 19,
AlreadyInAlliance = 21,
AlreadyInHostility = 22,
GuildAllianceExists = 23,
HostileGuildExists = 24,
GuildAllianceDoesNotExist = 25,
HostileGuildDoesNotExist = 26,
NotMasterOfGuildAlliance = 27,
NotGuildRival = 28,
IncompleteRequirementsToCreateAlliance = 29,
MaximumNumberOfGuildsInAllianceReached = 30,
RequestCancelled = 32,
AllianceMasterNotInGens = 161,
GuildMasterNotInGens = 162,
DifferentGens = 163
  }export class GuildRelationshipChangeResultPacket {
  buffer!: DataView;
  static readonly Name = `GuildRelationshipChangeResult`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `The result of a guild relationship change request (alliance or hostility) is sent back to the requester.`;
  static readonly CausedReaction = `The requester sees the result of the relationship change.`;
  static readonly Length = 8;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xE6;

  static getRequiredSize(dataSize:number){
    return GuildRelationshipChangeResultPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, GuildRelationshipChangeResultPacket.HeaderCode);
    b.setUint8(GuildRelationshipChangeResultPacket.DataOffset, GuildRelationshipChangeResultPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = GuildRelationshipChangeResultPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 8): GuildRelationshipChangeResultPacket {
    const p = new GuildRelationshipChangeResultPacket();
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
  get RequestType():GuildRelationshipRequestTypeEnum{
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set RequestType(value: GuildRelationshipRequestTypeEnum){
    const oldValue = this.RequestType;
    this.buffer.setUint8(4, SetByteValue(oldValue, value, 8, 0));
  }
  get Result():GuildRelationshipChangeResultGuildRelationshipChangeResultTypeEnum{
    return GetByteValue(this.buffer.getUint8(5), 8, 0);
  }
  set Result(value: GuildRelationshipChangeResultGuildRelationshipChangeResultTypeEnum){
    const oldValue = this.Result;
    this.buffer.setUint8(5, SetByteValue(oldValue, value, 8, 0));
  }
  get GuildMasterId(){
    return this.buffer.getUint16(6, false);
  }
  set GuildMasterId(value: number){
    this.buffer.setUint16(6, value, false);
  }
}
export class AllianceListPacket {
  buffer!: DataView;
  static readonly Name = `AllianceList`;
  static readonly HeaderType = `C2Header`;
  static readonly HeaderCode = 0xC2;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `A player requested the alliance list dialog.`;
  static readonly CausedReaction = `The client shows the list of guilds in the alliance.`;
  static readonly Length = undefined;
  static readonly LengthSize = 2;
  static readonly DataOffset = 3;
  static readonly Code = 0xE9;

  static getRequiredSize(dataSize:number){
    return AllianceListPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, AllianceListPacket.HeaderCode);
    b.setUint8(AllianceListPacket.DataOffset, AllianceListPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = AllianceListPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint16(1, l);
    return this;
  }

  private _readString (from :number, to: number): string {
    return readWireString(this.buffer, from, to);
  }

  private _readDataView (from: number, to: number): DataView {
    return new DataView(this.buffer.buffer.slice(from, to));
  }

  static createPacket(requiredSize: number): AllianceListPacket {
    const p = new AllianceListPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get GuildCount() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set GuildCount(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }
  get Success(){
    return GetBoolean(this.buffer.getUint8(5), 0);
  }
  set Success(value: boolean){
    const oldByte = this.buffer.getUint8(5);
    this.buffer.setUint8(5, SetBoolean(oldByte, value, 0));
  }
  get __RivalCount() {
    return GetByteValue(this.buffer.getUint8(6), 8, 0);
  }
  set __RivalCount(value: number) {
    const oldByte = this.buffer.getUint8(6);
    this.buffer.setUint8(6, SetByteValue(oldByte, value, 8, 0));
  }
  get __UnionCount() {
    return GetByteValue(this.buffer.getUint8(7), 8, 0);
  }
  set __UnionCount(value: number) {
    const oldByte = this.buffer.getUint8(7);
    this.buffer.setUint8(7, SetByteValue(oldByte, value, 8, 0));
  }

  getGuilds(count: number = this.GuildCount): {
  MemberCount: Byte;
  Logo: Binary;
  GuildName: string;

}[]{
    const b = this.buffer;
    let bi = 0;

    const Guilds_count = count;
    const Guilds: any[] = new Array(Guilds_count);
    
    let Guilds_StartOffset = bi + 8;
    for (let i = 0; i < Guilds_count; i++) {
      const MemberCount = b.getUint8(Guilds_StartOffset + 0);
      const Logo = this._readDataView(Guilds_StartOffset + 1, Guilds_StartOffset + 1 + 32);
      const GuildName = this._readString(Guilds_StartOffset + 33, Guilds_StartOffset + 33 + 8);
      Guilds[i] = {
        MemberCount,
        Logo,
        GuildName
      };
      Guilds_StartOffset += 41;
    }
    
    return Guilds;
  }}
export class RemoveAllianceGuildResultPacket {
  buffer!: DataView;
  static readonly Name = `RemoveAllianceGuildResult`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `A guild master sent a message to kick the guild from the alliance and it has been processed.`;
  static readonly CausedReaction = `The list of guilds is updated accordingly.`;
  static readonly Length = 7;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xEB;
  static readonly SubCode = 0x01;

  static getRequiredSize(dataSize:number){
    return RemoveAllianceGuildResultPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, RemoveAllianceGuildResultPacket.HeaderCode);
    b.setUint8(RemoveAllianceGuildResultPacket.DataOffset, RemoveAllianceGuildResultPacket.Code);
  b.setUint8(RemoveAllianceGuildResultPacket.DataOffset + 1, RemoveAllianceGuildResultPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = RemoveAllianceGuildResultPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 7): RemoveAllianceGuildResultPacket {
    const p = new RemoveAllianceGuildResultPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Result(){
    return GetBoolean(this.buffer.getUint8(4), 0);
  }
  set Result(value: boolean){
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetBoolean(oldByte, value, 0));
  }
  get RequestType():GuildRelationshipRequestTypeEnum{
    return GetByteValue(this.buffer.getUint8(5), 8, 0);
  }
  set RequestType(value: GuildRelationshipRequestTypeEnum){
    const oldValue = this.RequestType;
    this.buffer.setUint8(5, SetByteValue(oldValue, value, 8, 0));
  }
  get RelationshipType():GuildRelationshipTypeEnum{
    return GetByteValue(this.buffer.getUint8(6), 8, 0);
  }
  set RelationshipType(value: GuildRelationshipTypeEnum){
    const oldValue = this.RelationshipType;
    this.buffer.setUint8(6, SetByteValue(oldValue, value, 8, 0));
  }
}
export class AssignCharacterToGuildPacket {
  buffer!: DataView;
  static readonly Name = `AssignCharacterToGuild`;
  static readonly HeaderType = `C2Header`;
  static readonly HeaderCode = 0xC2;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `The server wants to visibly assign a player to a guild, e.g. when two players met each other and one of them is a guild member.`;
  static readonly CausedReaction = `The players which belong to the guild are shown as guild players. If the game client doesn't met a player of this guild yet, it will send another request to get the guild information.`;
  static readonly Length = undefined;
  static readonly LengthSize = 2;
  static readonly DataOffset = 3;
  static readonly Code = 0x65;

  static getRequiredSize(dataSize:number){
    return AssignCharacterToGuildPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, AssignCharacterToGuildPacket.HeaderCode);
    b.setUint8(AssignCharacterToGuildPacket.DataOffset, AssignCharacterToGuildPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = AssignCharacterToGuildPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint16(1, l);
    return this;
  }

  static createPacket(requiredSize: number): AssignCharacterToGuildPacket {
    const p = new AssignCharacterToGuildPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get PlayerCount() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set PlayerCount(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }

  getMembers(count: number = this.PlayerCount): {
  GuildId: IntegerLittleEndian;
  Role: GuildMemberRoleEnum;
  IsPlayerAppearingNew: Boolean;
  PlayerId: ShortBigEndian;

}[]{
    const b = this.buffer;
    let bi = 0;

    const Members_count = count;
    const Members: any[] = new Array(Members_count);
    
    let Members_StartOffset = bi + 5;
    for (let i = 0; i < Members_count; i++) {
      const GuildId = b.getUint32(Members_StartOffset + 0, true);
      const Role = GetByteValue(b.getUint8(Members_StartOffset + 4), 8, 0);
      const IsPlayerAppearingNew = GetBoolean(b.getUint8(Members_StartOffset + 7), 7);
      const PlayerId = b.getUint16(Members_StartOffset + 7, false);
      Members[i] = {
        GuildId,
        Role,
        IsPlayerAppearingNew,
        PlayerId
      };
      Members_StartOffset += 12;
    }
    
    return Members;
  }}
export class AssignCharacterToGuild075Packet {
  buffer!: DataView;
  static readonly Name = `AssignCharacterToGuild075`;
  static readonly HeaderType = `C2Header`;
  static readonly HeaderCode = 0xC2;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `The server wants to visibly assign a player to a guild, e.g. when two players met each other and one of them is a guild member.`;
  static readonly CausedReaction = `The players which belong to the guild are shown as guild players. If the game client doesn't met a player of this guild yet, it will send another request to get the guild information.`;
  static readonly Length = undefined;
  static readonly LengthSize = 2;
  static readonly DataOffset = 3;
  static readonly Code = 0x5B;

  static getRequiredSize(dataSize:number){
    return AssignCharacterToGuild075Packet.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, AssignCharacterToGuild075Packet.HeaderCode);
    b.setUint8(AssignCharacterToGuild075Packet.DataOffset, AssignCharacterToGuild075Packet.Code);
  
    return this;
  }

  writeLength(l: number|undefined = AssignCharacterToGuild075Packet.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint16(1, l);
    return this;
  }

  static createPacket(requiredSize: number): AssignCharacterToGuild075Packet {
    const p = new AssignCharacterToGuild075Packet();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get PlayerCount() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set PlayerCount(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }

  getMembers(count: number = this.PlayerCount): {
  PlayerId: ShortBigEndian;
  GuildId: ShortBigEndian;

}[]{
    const b = this.buffer;
    let bi = 0;

    const Members_count = count;
    const Members: any[] = new Array(Members_count);
    
    let Members_StartOffset = bi + 5;
    for (let i = 0; i < Members_count; i++) {
      const PlayerId = b.getUint16(Members_StartOffset + 0, false);
      const GuildId = b.getUint16(Members_StartOffset + 2, false);
      Members[i] = {
        PlayerId,
        GuildId
      };
      Members_StartOffset += 4;
    }
    
    return Members;
  }}
export class GuildInformationPacket {
  buffer!: DataView;
  static readonly Name = `GuildInformation`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `A game client requested the (public) info of a guild, e.g. when it met a player of previously unknown guild.`;
  static readonly CausedReaction = `The players which belong to the guild are shown as guild players.`;
  static readonly Length = 60;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x66;

  static getRequiredSize(dataSize:number){
    return GuildInformationPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, GuildInformationPacket.HeaderCode);
    b.setUint8(GuildInformationPacket.DataOffset, GuildInformationPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = GuildInformationPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  private _readString (from :number, to: number): string {
    return readWireString(this.buffer, from, to);
  }

  static createPacket(requiredSize: number = 60): GuildInformationPacket {
    const p = new GuildInformationPacket();
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
  get GuildType() {
    return GetByteValue(this.buffer.getUint8(8), 8, 0);
  }
  set GuildType(value: number) {
    const oldByte = this.buffer.getUint8(8);
    this.buffer.setUint8(8, SetByteValue(oldByte, value, 8, 0));
  }
  get AllianceGuildName(){
    const to = 17;
              
    return this._readString(9, to);
  }
  setAllianceGuildName(str: string, count = 8){
    const from = 9;
    for(let i = 0; i < str.length; i++){
      const char = str.charCodeAt(i);
      this.buffer.setUint8(from + i, char);
    }
}
  get GuildName(){
    const to = 25;
              
    return this._readString(17, to);
  }
  setGuildName(str: string, count = 8){
    const from = 17;
    for(let i = 0; i < str.length; i++){
      const char = str.charCodeAt(i);
      this.buffer.setUint8(from + i, char);
    }
}
  get Logo(){
    const to = 57;
    const i = 25;
              
    return new DataView(this.buffer.buffer.slice(i,to));
  }
  setLogo(data: ArrayLike<number>, count = 32){
    if (data.length !== count) throw new Error(`data.length must be ${count}`);
    const from = 25;

    for (let i = 0; i < data.length; i++) {
      this.buffer.setUint8(from + i, data[i]);
    }
}
}
export class GuildInformations075Packet {
  buffer!: DataView;
  static readonly Name = `GuildInformations075`;
  static readonly HeaderType = `C2Header`;
  static readonly HeaderCode = 0xC2;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `A player went into the scope of one or more guild members.`;
  static readonly CausedReaction = `The players which belong to the guild are shown as guild players.`;
  static readonly Length = undefined;
  static readonly LengthSize = 2;
  static readonly DataOffset = 3;
  static readonly Code = 0x5A;

  static getRequiredSize(dataSize:number){
    return GuildInformations075Packet.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, GuildInformations075Packet.HeaderCode);
    b.setUint8(GuildInformations075Packet.DataOffset, GuildInformations075Packet.Code);
  
    return this;
  }

  writeLength(l: number|undefined = GuildInformations075Packet.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint16(1, l);
    return this;
  }

  private _readString (from :number, to: number): string {
    return readWireString(this.buffer, from, to);
  }

  private _readDataView (from: number, to: number): DataView {
    return new DataView(this.buffer.buffer.slice(from, to));
  }

  static createPacket(requiredSize: number): GuildInformations075Packet {
    const p = new GuildInformations075Packet();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get GuildCount() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set GuildCount(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }

  getGuilds(count: number = this.GuildCount): {
  GuildId: ShortBigEndian;
  GuildName: string;
  Logo: Binary;

}[]{
    const b = this.buffer;
    let bi = 0;

    const Guilds_count = count;
    const Guilds: any[] = new Array(Guilds_count);
    
    let Guilds_StartOffset = bi + 5;
    for (let i = 0; i < Guilds_count; i++) {
      const GuildId = b.getUint16(Guilds_StartOffset + 0, false);
      const GuildName = this._readString(Guilds_StartOffset + 2, Guilds_StartOffset + 2 + 8);
      const Logo = this._readDataView(Guilds_StartOffset + 10, Guilds_StartOffset + 10 + 32);
      Guilds[i] = {
        GuildId,
        GuildName,
        Logo
      };
      Guilds_StartOffset += 42;
    }
    
    return Guilds;
  }}
export class SingleGuildInformation075Packet {
  buffer!: DataView;
  static readonly Name = `SingleGuildInformation075`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `After a guild has been created. However, in OpenMU, we just send the GuildInformations075 message, because it works just the same.`;
  static readonly CausedReaction = `The players which belong to the guild are shown as guild players.`;
  static readonly Length = 45;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x5C;

  static getRequiredSize(dataSize:number){
    return SingleGuildInformation075Packet.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, SingleGuildInformation075Packet.HeaderCode);
    b.setUint8(SingleGuildInformation075Packet.DataOffset, SingleGuildInformation075Packet.Code);
  
    return this;
  }

  writeLength(l: number|undefined = SingleGuildInformation075Packet.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  private _readString (from :number, to: number): string {
    return readWireString(this.buffer, from, to);
  }

  static createPacket(requiredSize: number = 45): SingleGuildInformation075Packet {
    const p = new SingleGuildInformation075Packet();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get GuildId(){
    return this.buffer.getUint16(3, false);
  }
  set GuildId(value: number){
    this.buffer.setUint16(3, value, false);
  }
  get GuildName(){
    const to = 13;
              
    return this._readString(5, to);
  }
  setGuildName(str: string, count = 8){
    const from = 5;
    for(let i = 0; i < str.length; i++){
      const char = str.charCodeAt(i);
      this.buffer.setUint8(from + i, char);
    }
}
  get Logo(){
    const to = 45;
    const i = 13;
              
    return new DataView(this.buffer.buffer.slice(i,to));
  }
  setLogo(data: ArrayLike<number>, count = 32){
    if (data.length !== count) throw new Error(`data.length must be ${count}`);
    const from = 13;

    for (let i = 0; i < data.length; i++) {
      this.buffer.setUint8(from + i, data[i]);
    }
}
}
export class VaultMoneyUpdatePacket {
  buffer!: DataView;
  static readonly Name = `VaultMoneyUpdate`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `After the player requested to move money between the vault and inventory.`;
  static readonly CausedReaction = `The game client updates the money values of vault and inventory.`;
  static readonly Length = 12;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x81;

  static getRequiredSize(dataSize:number){
    return VaultMoneyUpdatePacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, VaultMoneyUpdatePacket.HeaderCode);
    b.setUint8(VaultMoneyUpdatePacket.DataOffset, VaultMoneyUpdatePacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = VaultMoneyUpdatePacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 12): VaultMoneyUpdatePacket {
    const p = new VaultMoneyUpdatePacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Success(){
    return GetBoolean(this.buffer.getUint8(3), 0);
  }
  set Success(value: boolean){
    const oldByte = this.buffer.getUint8(3);
    this.buffer.setUint8(3, SetBoolean(oldByte, value, 0));
  }
  get VaultMoney(){
    return this.buffer.getUint32(4, true);
  }
  set VaultMoney(value: number){
    this.buffer.setUint32(4, value, true);
  }
  get InventoryMoney(){
    return this.buffer.getUint32(8, true);
  }
  set InventoryMoney(value: number){
    this.buffer.setUint32(8, value, true);
  }
}
export class VaultClosedPacket {
  buffer!: DataView;
  static readonly Name = `VaultClosed`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `After the player requested to close the vault, this confirmation is sent back to the client.`;
  static readonly CausedReaction = `The game client closes the vault dialog.`;
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
export enum VaultProtectionInformationVaultProtectionStateEnum {
    Unprotected = 0,
Locked = 1,
UnlockFailedByWrongPin = 10,
SetPinFailedBecauseLock = 11,
Unlocked = 12,
RemovePinFailedByWrongPassword = 13
  }export class VaultProtectionInformationPacket {
  buffer!: DataView;
  static readonly Name = `VaultProtectionInformation`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `After the player requested to open the vault.`;
  static readonly CausedReaction = `The game client updates the UI to show the current vault protection state.`;
  static readonly Length = 4;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x83;

  static getRequiredSize(dataSize:number){
    return VaultProtectionInformationPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, VaultProtectionInformationPacket.HeaderCode);
    b.setUint8(VaultProtectionInformationPacket.DataOffset, VaultProtectionInformationPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = VaultProtectionInformationPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 4): VaultProtectionInformationPacket {
    const p = new VaultProtectionInformationPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get ProtectionState():VaultProtectionInformationVaultProtectionStateEnum{
    return GetByteValue(this.buffer.getUint8(3), 8, 0);
  }
  set ProtectionState(value: VaultProtectionInformationVaultProtectionStateEnum){
    const oldValue = this.ProtectionState;
    this.buffer.setUint8(3, SetByteValue(oldValue, value, 8, 0));
  }
}
export enum ItemCraftingResultCraftingResultEnum {
    Failed = 0,
Success = 1,
NotEnoughMoney = 2,
TooManyItems = 3,
CharacterLevelTooLow = 4,
LackingMixItems = 6,
IncorrectMixItems = 7,
InvalidItemLevel = 8,
CharacterClassTooLow = 9,
IncorrectBloodCastleItems = 10,
NotEnoughMoneyForBloodCastle = 11
  }export class ItemCraftingResultPacket {
  buffer!: DataView;
  static readonly Name = `ItemCraftingResult`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `After the player requested to execute an item crafting, e.g. at the chaos machine.`;
  static readonly CausedReaction = `The game client updates the UI to show the resulting item.`;
  static readonly Length = undefined;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x86;

  static getRequiredSize(dataSize:number){
    return ItemCraftingResultPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, ItemCraftingResultPacket.HeaderCode);
    b.setUint8(ItemCraftingResultPacket.DataOffset, ItemCraftingResultPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = ItemCraftingResultPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number): ItemCraftingResultPacket {
    const p = new ItemCraftingResultPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Result():ItemCraftingResultCraftingResultEnum{
    return GetByteValue(this.buffer.getUint8(3), 8, 0);
  }
  set Result(value: ItemCraftingResultCraftingResultEnum){
    const oldValue = this.Result;
    this.buffer.setUint8(3, SetByteValue(oldValue, value, 8, 0));
  }
  get ItemData(){
    const to = this.buffer.byteLength;
    const i = 4;
              
    return new DataView(this.buffer.buffer.slice(i,to));
  }
  setItemData(data: ArrayLike<number>, count = NaN){
    if (data.length !== count) throw new Error(`data.length must be ${count}`);
    const from = 4;

    for (let i = 0; i < data.length; i++) {
      this.buffer.setUint8(from + i, data[i]);
    }
}
}
export class CraftingDialogClosed075Packet {
  buffer!: DataView;
  static readonly Name = `CraftingDialogClosed075`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `After the player requested to close the crafting dialog, this confirmation is sent back to the client.`;
  static readonly CausedReaction = `The game client closes the crafting dialog.`;
  static readonly Length = 3;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x87;

  static getRequiredSize(dataSize:number){
    return CraftingDialogClosed075Packet.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, CraftingDialogClosed075Packet.HeaderCode);
    b.setUint8(CraftingDialogClosed075Packet.DataOffset, CraftingDialogClosed075Packet.Code);
  
    return this;
  }

  writeLength(l: number|undefined = CraftingDialogClosed075Packet.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 3): CraftingDialogClosed075Packet {
    const p = new CraftingDialogClosed075Packet();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
}
export class LegacyQuestStateListPacket {
  buffer!: DataView;
  static readonly Name = `LegacyQuestStateList`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `After the player entered the game with his character.`;
  static readonly CausedReaction = `The game client updates the quest state for the quest dialog accordingly.`;
  static readonly Length = undefined;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xA0;

  static getRequiredSize(dataSize:number){
    return LegacyQuestStateListPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, LegacyQuestStateListPacket.HeaderCode);
    b.setUint8(LegacyQuestStateListPacket.DataOffset, LegacyQuestStateListPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = LegacyQuestStateListPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number): LegacyQuestStateListPacket {
    const p = new LegacyQuestStateListPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get QuestCount() {
    return GetByteValue(this.buffer.getUint8(3), 8, 0);
  }
  set QuestCount(value: number) {
    const oldByte = this.buffer.getUint8(3);
    this.buffer.setUint8(3, SetByteValue(oldByte, value, 8, 0));
  }
  get ScrollOfEmperorState():Byte{
    return GetByteValue(this.buffer.getUint8(4), 2, 0);
  }
  set ScrollOfEmperorState(value: Byte){
    const oldValue = this.ScrollOfEmperorState;
    this.buffer.setUint8(4, SetByteValue(oldValue, value, 2, 0));
  }
  get ThreeTreasuresOfMuState():Byte{
    return GetByteValue(this.buffer.getUint8(4), 2, 2);
  }
  set ThreeTreasuresOfMuState(value: Byte){
    const oldValue = this.ThreeTreasuresOfMuState;
    this.buffer.setUint8(4, SetByteValue(oldValue, value, 2, 2));
  }
  get GainHeroStatusState():Byte{
    return GetByteValue(this.buffer.getUint8(4), 2, 4);
  }
  set GainHeroStatusState(value: Byte){
    const oldValue = this.GainHeroStatusState;
    this.buffer.setUint8(4, SetByteValue(oldValue, value, 2, 4));
  }
  get SecretOfDarkStoneState():Byte{
    return GetByteValue(this.buffer.getUint8(4), 2, 6);
  }
  set SecretOfDarkStoneState(value: Byte){
    const oldValue = this.SecretOfDarkStoneState;
    this.buffer.setUint8(4, SetByteValue(oldValue, value, 2, 6));
  }
  get CertificateOfStrengthState():Byte{
    return GetByteValue(this.buffer.getUint8(5), 2, 0);
  }
  set CertificateOfStrengthState(value: Byte){
    const oldValue = this.CertificateOfStrengthState;
    this.buffer.setUint8(5, SetByteValue(oldValue, value, 2, 0));
  }
  get InfiltrationOfBarrackState():Byte{
    return GetByteValue(this.buffer.getUint8(5), 2, 2);
  }
  set InfiltrationOfBarrackState(value: Byte){
    const oldValue = this.InfiltrationOfBarrackState;
    this.buffer.setUint8(5, SetByteValue(oldValue, value, 2, 2));
  }
  get InfiltrationOfRefugeState():Byte{
    return GetByteValue(this.buffer.getUint8(5), 2, 4);
  }
  set InfiltrationOfRefugeState(value: Byte){
    const oldValue = this.InfiltrationOfRefugeState;
    this.buffer.setUint8(5, SetByteValue(oldValue, value, 2, 4));
  }
  get UnusedQuestState():Byte{
    return GetByteValue(this.buffer.getUint8(5), 2, 6);
  }
  set UnusedQuestState(value: Byte){
    const oldValue = this.UnusedQuestState;
    this.buffer.setUint8(5, SetByteValue(oldValue, value, 2, 6));
  }
}
export class LegacyQuestStateDialogPacket {
  buffer!: DataView;
  static readonly Name = `LegacyQuestStateDialog`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `When the player clicks on the quest npc.`;
  static readonly CausedReaction = `The game client shows the next steps in the quest dialog.`;
  static readonly Length = 5;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xA1;

  static getRequiredSize(dataSize:number){
    return LegacyQuestStateDialogPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, LegacyQuestStateDialogPacket.HeaderCode);
    b.setUint8(LegacyQuestStateDialogPacket.DataOffset, LegacyQuestStateDialogPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = LegacyQuestStateDialogPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 5): LegacyQuestStateDialogPacket {
    const p = new LegacyQuestStateDialogPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get QuestIndex() {
    return GetByteValue(this.buffer.getUint8(3), 8, 0);
  }
  set QuestIndex(value: number) {
    const oldByte = this.buffer.getUint8(3);
    this.buffer.setUint8(3, SetByteValue(oldByte, value, 8, 0));
  }
  get State() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set State(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }
}
export class LegacySetQuestStateResponsePacket {
  buffer!: DataView;
  static readonly Name = `LegacySetQuestStateResponse`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `As response to the set state request (C1A2).`;
  static readonly CausedReaction = `The game client shows the new quest state.`;
  static readonly Length = 6;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xA2;

  static getRequiredSize(dataSize:number){
    return LegacySetQuestStateResponsePacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, LegacySetQuestStateResponsePacket.HeaderCode);
    b.setUint8(LegacySetQuestStateResponsePacket.DataOffset, LegacySetQuestStateResponsePacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = LegacySetQuestStateResponsePacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 6): LegacySetQuestStateResponsePacket {
    const p = new LegacySetQuestStateResponsePacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get QuestIndex() {
    return GetByteValue(this.buffer.getUint8(3), 8, 0);
  }
  set QuestIndex(value: number) {
    const oldByte = this.buffer.getUint8(3);
    this.buffer.setUint8(3, SetByteValue(oldByte, value, 8, 0));
  }
  get Result() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set Result(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }
  get NewState() {
    return GetByteValue(this.buffer.getUint8(5), 8, 0);
  }
  set NewState(value: number) {
    const oldByte = this.buffer.getUint8(5);
    this.buffer.setUint8(5, SetByteValue(oldByte, value, 8, 0));
  }
}
export enum LegacyQuestRewardQuestRewardTypeEnum {
    LevelUpPoints = 200,
CharacterEvolutionFirstToSecond = 201,
LevelUpPointsPerLevelIncrease = 202,
ComboSkill = 203,
CharacterEvolutionSecondToThird = 204
  }export class LegacyQuestRewardPacket {
  buffer!: DataView;
  static readonly Name = `LegacyQuestReward`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `As response to the completed quest of a player in scope.`;
  static readonly CausedReaction = `The game client shows the reward accordingly.`;
  static readonly Length = 7;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xA3;

  static getRequiredSize(dataSize:number){
    return LegacyQuestRewardPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, LegacyQuestRewardPacket.HeaderCode);
    b.setUint8(LegacyQuestRewardPacket.DataOffset, LegacyQuestRewardPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = LegacyQuestRewardPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 7): LegacyQuestRewardPacket {
    const p = new LegacyQuestRewardPacket();
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
  get Reward():LegacyQuestRewardQuestRewardTypeEnum{
    return GetByteValue(this.buffer.getUint8(5), 8, 0);
  }
  set Reward(value: LegacyQuestRewardQuestRewardTypeEnum){
    const oldValue = this.Reward;
    this.buffer.setUint8(5, SetByteValue(oldValue, value, 8, 0));
  }
  get Count() {
    return GetByteValue(this.buffer.getUint8(6), 8, 0);
  }
  set Count(value: number) {
    const oldByte = this.buffer.getUint8(6);
    this.buffer.setUint8(6, SetByteValue(oldByte, value, 8, 0));
  }
}
export class LegacyQuestMonsterKillInfoPacket {
  buffer!: DataView;
  static readonly Name = `LegacyQuestMonsterKillInfo`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `As response when a player opens the quest npc with a running quest which requires monster kills.`;
  static readonly CausedReaction = `The game client shows the current state.`;
  static readonly Length = 48;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xA4;
  static readonly SubCode = 0x00;

  static getRequiredSize(dataSize:number){
    return LegacyQuestMonsterKillInfoPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, LegacyQuestMonsterKillInfoPacket.HeaderCode);
    b.setUint8(LegacyQuestMonsterKillInfoPacket.DataOffset, LegacyQuestMonsterKillInfoPacket.Code);
  b.setUint8(LegacyQuestMonsterKillInfoPacket.DataOffset + 1, LegacyQuestMonsterKillInfoPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = LegacyQuestMonsterKillInfoPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 48): LegacyQuestMonsterKillInfoPacket {
    const p = new LegacyQuestMonsterKillInfoPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Result() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set Result(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }
  get QuestIndex() {
    return GetByteValue(this.buffer.getUint8(5), 8, 0);
  }
  set QuestIndex(value: number) {
    const oldByte = this.buffer.getUint8(5);
    this.buffer.setUint8(5, SetByteValue(oldByte, value, 8, 0));
  }

  getKills(count: number): {
  MonsterNumber: IntegerLittleEndian;
  KillCount: IntegerLittleEndian;

}[]{
    const b = this.buffer;
    let bi = 0;

    const Kills_count = count;
    const Kills: any[] = new Array(Kills_count);
    
    let Kills_StartOffset = bi + 8;
    for (let i = 0; i < Kills_count; i++) {
      const MonsterNumber = b.getUint32(Kills_StartOffset + 0, true);
      const KillCount = b.getUint32(Kills_StartOffset + 4, true);
      Kills[i] = {
        MonsterNumber,
        KillCount
      };
      Kills_StartOffset += 8;
    }
    
    return Kills;
  }}
export class PetModePacket {
  buffer!: DataView;
  static readonly Name = `PetMode`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `After the client sent a PetAttackCommand (as confirmation), or when the previous command finished and the pet is reset to Normal-mode.`;
  static readonly CausedReaction = `The client updates the pet mode in its user interface.`;
  static readonly Length = 7;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xA7;

  static getRequiredSize(dataSize:number){
    return PetModePacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, PetModePacket.HeaderCode);
    b.setUint8(PetModePacket.DataOffset, PetModePacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = PetModePacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 7): PetModePacket {
    const p = new PetModePacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Pet():Byte{
    return GetByteValue(this.buffer.getUint8(3), 8, 0);
  }
  set Pet(value: Byte){
    const oldValue = this.Pet;
    this.buffer.setUint8(3, SetByteValue(oldValue, value, 8, 0));
  }
  get PetCommandMode():Byte{
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set PetCommandMode(value: Byte){
    const oldValue = this.PetCommandMode;
    this.buffer.setUint8(4, SetByteValue(oldValue, value, 8, 0));
  }
  get TargetId(){
    return this.buffer.getUint16(5, false);
  }
  set TargetId(value: number){
    this.buffer.setUint16(5, value, false);
  }
}
export enum PetAttackPetSkillTypeEnum {
    SingleTarget = 0,
Range = 1
  }export class PetAttackPacket {
  buffer!: DataView;
  static readonly Name = `PetAttack`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `After the client sent a PetAttackCommand, the pet attacks automatically. For each attack, the player and all observing players get this message.`;
  static readonly CausedReaction = `The client shows the pet attacking the target.`;
  static readonly Length = 9;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xA8;

  static getRequiredSize(dataSize:number){
    return PetAttackPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, PetAttackPacket.HeaderCode);
    b.setUint8(PetAttackPacket.DataOffset, PetAttackPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = PetAttackPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 9): PetAttackPacket {
    const p = new PetAttackPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Pet():Byte{
    return GetByteValue(this.buffer.getUint8(3), 8, 0);
  }
  set Pet(value: Byte){
    const oldValue = this.Pet;
    this.buffer.setUint8(3, SetByteValue(oldValue, value, 8, 0));
  }
  get SkillType():PetAttackPetSkillTypeEnum{
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set SkillType(value: PetAttackPetSkillTypeEnum){
    const oldValue = this.SkillType;
    this.buffer.setUint8(4, SetByteValue(oldValue, value, 8, 0));
  }
  get OwnerId(){
    return this.buffer.getUint16(5, false);
  }
  set OwnerId(value: number){
    this.buffer.setUint16(5, value, false);
  }
  get TargetId(){
    return this.buffer.getUint16(7, false);
  }
  set TargetId(value: number){
    this.buffer.setUint16(7, value, false);
  }
}
export class PetInfoResponsePacket {
  buffer!: DataView;
  static readonly Name = `PetInfoResponse`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `After the client sent a PetInfoRequest for a pet (dark raven, horse).`;
  static readonly CausedReaction = `The client shows the information about the pet.`;
  static readonly Length = 13;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xA9;

  static getRequiredSize(dataSize:number){
    return PetInfoResponsePacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, PetInfoResponsePacket.HeaderCode);
    b.setUint8(PetInfoResponsePacket.DataOffset, PetInfoResponsePacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = PetInfoResponsePacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 13): PetInfoResponsePacket {
    const p = new PetInfoResponsePacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Pet():Byte{
    return GetByteValue(this.buffer.getUint8(3), 8, 0);
  }
  set Pet(value: Byte){
    const oldValue = this.Pet;
    this.buffer.setUint8(3, SetByteValue(oldValue, value, 8, 0));
  }
  get Storage():Byte{
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set Storage(value: Byte){
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
  get Level() {
    return GetByteValue(this.buffer.getUint8(6), 8, 0);
  }
  set Level(value: number) {
    const oldByte = this.buffer.getUint8(6);
    this.buffer.setUint8(6, SetByteValue(oldByte, value, 8, 0));
  }
  get Experience(){
    return this.buffer.getUint32(8, true);
  }
  set Experience(value: number){
    this.buffer.setUint32(8, value, true);
  }
  get Health() {
    return GetByteValue(this.buffer.getUint8(12), 8, 0);
  }
  set Health(value: number) {
    const oldByte = this.buffer.getUint8(12);
    this.buffer.setUint8(12, SetByteValue(oldByte, value, 8, 0));
  }
}
export enum DuelStartResultDuelStartResultTypeEnum {
    Success = 0,
FailedByTooLowLevel = 12,
FailedByError = 14,
Refused = 15,
FailedByNoFreeRoom = 16,
FailedBy_ = 28,
FailedByNotEnoughMoney = 30
  }export class DuelStartResultPacket {
  buffer!: DataView;
  static readonly Name = `DuelStartResult`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `After the client sent a DuelStartRequest, and it either failed or the requested player sent a response.`;
  static readonly CausedReaction = `The client shows the started or aborted duel.`;
  static readonly Length = 17;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xAA;
  static readonly SubCode = 0x01;

  static getRequiredSize(dataSize:number){
    return DuelStartResultPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, DuelStartResultPacket.HeaderCode);
    b.setUint8(DuelStartResultPacket.DataOffset, DuelStartResultPacket.Code);
  b.setUint8(DuelStartResultPacket.DataOffset + 1, DuelStartResultPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = DuelStartResultPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  private _readString (from :number, to: number): string {
    return readWireString(this.buffer, from, to);
  }

  static createPacket(requiredSize: number = 17): DuelStartResultPacket {
    const p = new DuelStartResultPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Result():DuelStartResultDuelStartResultTypeEnum{
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set Result(value: DuelStartResultDuelStartResultTypeEnum){
    const oldValue = this.Result;
    this.buffer.setUint8(4, SetByteValue(oldValue, value, 8, 0));
  }
  get OpponentId(){
    return this.buffer.getUint16(5, false);
  }
  set OpponentId(value: number){
    this.buffer.setUint16(5, value, false);
  }
  get OpponentName(){
    const to = 17;
              
    return this._readString(7, to);
  }
  setOpponentName(str: string, count = 10){
    const from = 7;
    for(let i = 0; i < str.length; i++){
      const char = str.charCodeAt(i);
      this.buffer.setUint8(from + i, char);
    }
}
}
export class DuelStartRequestPacket {
  buffer!: DataView;
  static readonly Name = `DuelStartRequest`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `After another client sent a DuelStartRequest, to ask the requested player for a response.`;
  static readonly CausedReaction = `The client shows the duel request.`;
  static readonly Length = 16;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xAA;
  static readonly SubCode = 0x02;

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
  get RequesterId(){
    return this.buffer.getUint16(4, true);
  }
  set RequesterId(value: number){
    this.buffer.setUint16(4, value, true);
  }
  get RequesterName(){
    const to = 16;
              
    return this._readString(6, to);
  }
  setRequesterName(str: string, count = 10){
    const from = 6;
    for(let i = 0; i < str.length; i++){
      const char = str.charCodeAt(i);
      this.buffer.setUint8(from + i, char);
    }
}
}
export class DuelEndPacket {
  buffer!: DataView;
  static readonly Name = `DuelEnd`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `After a duel ended.`;
  static readonly CausedReaction = `The client updates its state.`;
  static readonly Length = 17;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xAA;
  static readonly SubCode = 0x03;

  static getRequiredSize(dataSize:number){
    return DuelEndPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, DuelEndPacket.HeaderCode);
    b.setUint8(DuelEndPacket.DataOffset, DuelEndPacket.Code);
  b.setUint8(DuelEndPacket.DataOffset + 1, DuelEndPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = DuelEndPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  private _readString (from :number, to: number): string {
    return readWireString(this.buffer, from, to);
  }

  static createPacket(requiredSize: number = 17): DuelEndPacket {
    const p = new DuelEndPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Result() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set Result(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }
  get OpponentId(){
    return this.buffer.getUint16(5, false);
  }
  set OpponentId(value: number){
    this.buffer.setUint16(5, value, false);
  }
  get OpponentName(){
    const to = 17;
              
    return this._readString(7, to);
  }
  setOpponentName(str: string, count = 10){
    const from = 7;
    for(let i = 0; i < str.length; i++){
      const char = str.charCodeAt(i);
      this.buffer.setUint8(from + i, char);
    }
}
}
export class DuelScorePacket {
  buffer!: DataView;
  static readonly Name = `DuelScore`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `When the score of the duel has been changed.`;
  static readonly CausedReaction = `The client updates the displayed duel score.`;
  static readonly Length = 10;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xAA;
  static readonly SubCode = 0x04;

  static getRequiredSize(dataSize:number){
    return DuelScorePacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, DuelScorePacket.HeaderCode);
    b.setUint8(DuelScorePacket.DataOffset, DuelScorePacket.Code);
  b.setUint8(DuelScorePacket.DataOffset + 1, DuelScorePacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = DuelScorePacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 10): DuelScorePacket {
    const p = new DuelScorePacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Player1Id(){
    return this.buffer.getUint16(4, false);
  }
  set Player1Id(value: number){
    this.buffer.setUint16(4, value, false);
  }
  get Player2Id(){
    return this.buffer.getUint16(6, false);
  }
  set Player2Id(value: number){
    this.buffer.setUint16(6, value, false);
  }
  get Player1Score() {
    return GetByteValue(this.buffer.getUint8(8), 8, 0);
  }
  set Player1Score(value: number) {
    const oldByte = this.buffer.getUint8(8);
    this.buffer.setUint8(8, SetByteValue(oldByte, value, 8, 0));
  }
  get Player2Score() {
    return GetByteValue(this.buffer.getUint8(9), 8, 0);
  }
  set Player2Score(value: number) {
    const oldByte = this.buffer.getUint8(9);
    this.buffer.setUint8(9, SetByteValue(oldByte, value, 8, 0));
  }
}
export class DuelHealthUpdatePacket {
  buffer!: DataView;
  static readonly Name = `DuelHealthUpdate`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `When the health/shield of the duel players has been changed.`;
  static readonly CausedReaction = `The client updates the displayed health and shield bars.`;
  static readonly Length = 12;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xAA;
  static readonly SubCode = 0x05;

  static getRequiredSize(dataSize:number){
    return DuelHealthUpdatePacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, DuelHealthUpdatePacket.HeaderCode);
    b.setUint8(DuelHealthUpdatePacket.DataOffset, DuelHealthUpdatePacket.Code);
  b.setUint8(DuelHealthUpdatePacket.DataOffset + 1, DuelHealthUpdatePacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = DuelHealthUpdatePacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 12): DuelHealthUpdatePacket {
    const p = new DuelHealthUpdatePacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Player1Id(){
    return this.buffer.getUint16(4, false);
  }
  set Player1Id(value: number){
    this.buffer.setUint16(4, value, false);
  }
  get Player2Id(){
    return this.buffer.getUint16(6, false);
  }
  set Player2Id(value: number){
    this.buffer.setUint16(6, value, false);
  }
  get Player1HealthPercentage() {
    return GetByteValue(this.buffer.getUint8(8), 8, 0);
  }
  set Player1HealthPercentage(value: number) {
    const oldByte = this.buffer.getUint8(8);
    this.buffer.setUint8(8, SetByteValue(oldByte, value, 8, 0));
  }
  get Player2HealthPercentage() {
    return GetByteValue(this.buffer.getUint8(9), 8, 0);
  }
  set Player2HealthPercentage(value: number) {
    const oldByte = this.buffer.getUint8(9);
    this.buffer.setUint8(9, SetByteValue(oldByte, value, 8, 0));
  }
  get Player1ShieldPercentage() {
    return GetByteValue(this.buffer.getUint8(10), 8, 0);
  }
  set Player1ShieldPercentage(value: number) {
    const oldByte = this.buffer.getUint8(10);
    this.buffer.setUint8(10, SetByteValue(oldByte, value, 8, 0));
  }
  get Player2ShieldPercentage() {
    return GetByteValue(this.buffer.getUint8(11), 8, 0);
  }
  set Player2ShieldPercentage(value: number) {
    const oldByte = this.buffer.getUint8(11);
    this.buffer.setUint8(11, SetByteValue(oldByte, value, 8, 0));
  }
}
export class DuelStatusPacket {
  buffer!: DataView;
  static readonly Name = `DuelStatus`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `When the client requested the list of the current duel rooms.`;
  static readonly CausedReaction = `The client shows the list of duel rooms.`;
  static readonly Length = 92;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xAA;
  static readonly SubCode = 0x06;

  static getRequiredSize(dataSize:number){
    return DuelStatusPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, DuelStatusPacket.HeaderCode);
    b.setUint8(DuelStatusPacket.DataOffset, DuelStatusPacket.Code);
  b.setUint8(DuelStatusPacket.DataOffset + 1, DuelStatusPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = DuelStatusPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  private _readString (from :number, to: number): string {
    return readWireString(this.buffer, from, to);
  }

  static createPacket(requiredSize: number = 92): DuelStatusPacket {
    const p = new DuelStatusPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }

  getRooms(count: number): {
  Player1Name: string;
  Player2Name: string;
  DuelRunning: Boolean;
  DuelOpen: Boolean;

}[]{
    const b = this.buffer;
    let bi = 0;

    const Rooms_count = count;
    const Rooms: any[] = new Array(Rooms_count);
    
    let Rooms_StartOffset = bi + 4;
    for (let i = 0; i < Rooms_count; i++) {
      const Player1Name = this._readString(Rooms_StartOffset + 0, Rooms_StartOffset + 0 + 10);
      const Player2Name = this._readString(Rooms_StartOffset + 10, Rooms_StartOffset + 10 + 10);
      const DuelRunning = GetBoolean(b.getUint8(Rooms_StartOffset + 20), 0);
      const DuelOpen = GetBoolean(b.getUint8(Rooms_StartOffset + 21), 0);
      Rooms[i] = {
        Player1Name,
        Player2Name,
        DuelRunning,
        DuelOpen
      };
      Rooms_StartOffset += 22;
    }
    
    return Rooms;
  }}
export class DuelInitPacket {
  buffer!: DataView;
  static readonly Name = `DuelInit`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `When the duel starts.`;
  static readonly CausedReaction = `The client initializes the duel state.`;
  static readonly Length = 30;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xAA;
  static readonly SubCode = 0x07;

  static getRequiredSize(dataSize:number){
    return DuelInitPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, DuelInitPacket.HeaderCode);
    b.setUint8(DuelInitPacket.DataOffset, DuelInitPacket.Code);
  b.setUint8(DuelInitPacket.DataOffset + 1, DuelInitPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = DuelInitPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  private _readString (from :number, to: number): string {
    return readWireString(this.buffer, from, to);
  }

  static createPacket(requiredSize: number = 30): DuelInitPacket {
    const p = new DuelInitPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Result() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set Result(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }
  get RoomIndex() {
    return GetByteValue(this.buffer.getUint8(5), 8, 0);
  }
  set RoomIndex(value: number) {
    const oldByte = this.buffer.getUint8(5);
    this.buffer.setUint8(5, SetByteValue(oldByte, value, 8, 0));
  }
  get Player1Name(){
    const to = 16;
              
    return this._readString(6, to);
  }
  setPlayer1Name(str: string, count = 10){
    const from = 6;
    for(let i = 0; i < str.length; i++){
      const char = str.charCodeAt(i);
      this.buffer.setUint8(from + i, char);
    }
}
  get Player2Name(){
    const to = 26;
              
    return this._readString(16, to);
  }
  setPlayer2Name(str: string, count = 10){
    const from = 16;
    for(let i = 0; i < str.length; i++){
      const char = str.charCodeAt(i);
      this.buffer.setUint8(from + i, char);
    }
}
  get Player1Id(){
    return this.buffer.getUint16(26, false);
  }
  set Player1Id(value: number){
    this.buffer.setUint16(26, value, false);
  }
  get Player2Id(){
    return this.buffer.getUint16(28, false);
  }
  set Player2Id(value: number){
    this.buffer.setUint16(28, value, false);
  }
}
export class DuelHealthBarInitPacket {
  buffer!: DataView;
  static readonly Name = `DuelHealthBarInit`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `When the duel starts, after the DuelInit message.`;
  static readonly CausedReaction = `The client updates the displayed health and shield bars.`;
  static readonly Length = 4;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xAA;
  static readonly SubCode = 0x0D;

  static getRequiredSize(dataSize:number){
    return DuelHealthBarInitPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, DuelHealthBarInitPacket.HeaderCode);
    b.setUint8(DuelHealthBarInitPacket.DataOffset, DuelHealthBarInitPacket.Code);
  b.setUint8(DuelHealthBarInitPacket.DataOffset + 1, DuelHealthBarInitPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = DuelHealthBarInitPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 4): DuelHealthBarInitPacket {
    const p = new DuelHealthBarInitPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
}
export class DuelSpectatorAddedPacket {
  buffer!: DataView;
  static readonly Name = `DuelSpectatorAdded`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `When a spectator joins a duel.`;
  static readonly CausedReaction = `The client updates the list of spectators.`;
  static readonly Length = 14;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xAA;
  static readonly SubCode = 0x08;

  static getRequiredSize(dataSize:number){
    return DuelSpectatorAddedPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, DuelSpectatorAddedPacket.HeaderCode);
    b.setUint8(DuelSpectatorAddedPacket.DataOffset, DuelSpectatorAddedPacket.Code);
  b.setUint8(DuelSpectatorAddedPacket.DataOffset + 1, DuelSpectatorAddedPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = DuelSpectatorAddedPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  private _readString (from :number, to: number): string {
    return readWireString(this.buffer, from, to);
  }

  static createPacket(requiredSize: number = 14): DuelSpectatorAddedPacket {
    const p = new DuelSpectatorAddedPacket();
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
export class DuelSpectatorRemovedPacket {
  buffer!: DataView;
  static readonly Name = `DuelSpectatorRemoved`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `When a spectator joins a duel.`;
  static readonly CausedReaction = `The client updates the list of spectators.`;
  static readonly Length = 14;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xAA;
  static readonly SubCode = 0x0A;

  static getRequiredSize(dataSize:number){
    return DuelSpectatorRemovedPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, DuelSpectatorRemovedPacket.HeaderCode);
    b.setUint8(DuelSpectatorRemovedPacket.DataOffset, DuelSpectatorRemovedPacket.Code);
  b.setUint8(DuelSpectatorRemovedPacket.DataOffset + 1, DuelSpectatorRemovedPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = DuelSpectatorRemovedPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  private _readString (from :number, to: number): string {
    return readWireString(this.buffer, from, to);
  }

  static createPacket(requiredSize: number = 14): DuelSpectatorRemovedPacket {
    const p = new DuelSpectatorRemovedPacket();
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
export class DuelSpectatorListPacket {
  buffer!: DataView;
  static readonly Name = `DuelSpectatorList`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `When a spectator joins or leaves a duel.`;
  static readonly CausedReaction = `The client updates the list of spectators.`;
  static readonly Length = 105;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xAA;
  static readonly SubCode = 0x0B;

  static getRequiredSize(dataSize:number){
    return DuelSpectatorListPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, DuelSpectatorListPacket.HeaderCode);
    b.setUint8(DuelSpectatorListPacket.DataOffset, DuelSpectatorListPacket.Code);
  b.setUint8(DuelSpectatorListPacket.DataOffset + 1, DuelSpectatorListPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = DuelSpectatorListPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  private _readString (from :number, to: number): string {
    return readWireString(this.buffer, from, to);
  }

  static createPacket(requiredSize: number = 105): DuelSpectatorListPacket {
    const p = new DuelSpectatorListPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Count() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set Count(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }

  getSpectators(count: number): {
  Name: string;

}[]{
    let bi = 0;

    const Spectators_count = count;
    const Spectators: any[] = new Array(Spectators_count);
    
    let Spectators_StartOffset = bi + 5;
    for (let i = 0; i < Spectators_count; i++) {
      const Name = this._readString(Spectators_StartOffset + 0, Spectators_StartOffset + 0 + 10);
      Spectators[i] = {
        Name
      };
      Spectators_StartOffset += 10;
    }
    
    return Spectators;
  }}
export class DuelFinishedPacket {
  buffer!: DataView;
  static readonly Name = `DuelFinished`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `When the duel finished.`;
  static readonly CausedReaction = `The client shows the winner and loser names.`;
  static readonly Length = 24;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xAA;
  static readonly SubCode = 0x0C;

  static getRequiredSize(dataSize:number){
    return DuelFinishedPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, DuelFinishedPacket.HeaderCode);
    b.setUint8(DuelFinishedPacket.DataOffset, DuelFinishedPacket.Code);
  b.setUint8(DuelFinishedPacket.DataOffset + 1, DuelFinishedPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = DuelFinishedPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  private _readString (from :number, to: number): string {
    return readWireString(this.buffer, from, to);
  }

  static createPacket(requiredSize: number = 24): DuelFinishedPacket {
    const p = new DuelFinishedPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Winner(){
    const to = 14;
              
    return this._readString(4, to);
  }
  setWinner(str: string, count = 10){
    const from = 4;
    for(let i = 0; i < str.length; i++){
      const char = str.charCodeAt(i);
      this.buffer.setUint8(from + i, char);
    }
}
  get Loser(){
    const to = 24;
              
    return this._readString(14, to);
  }
  setLoser(str: string, count = 10){
    const from = 14;
    for(let i = 0; i < str.length; i++){
      const char = str.charCodeAt(i);
      this.buffer.setUint8(from + i, char);
    }
}
}
export class SkillStageUpdatePacket {
  buffer!: DataView;
  static readonly Name = `SkillStageUpdate`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `After a player started a skill which needs to load up, like Nova.`;
  static readonly CausedReaction = `The client may show the loading intensity.`;
  static readonly Length = 7;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xBA;

  static getRequiredSize(dataSize:number){
    return SkillStageUpdatePacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, SkillStageUpdatePacket.HeaderCode);
    b.setUint8(SkillStageUpdatePacket.DataOffset, SkillStageUpdatePacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = SkillStageUpdatePacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 7): SkillStageUpdatePacket {
    const p = new SkillStageUpdatePacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get ObjectId(){
    return this.buffer.getUint16(3, true);
  }
  set ObjectId(value: number){
    this.buffer.setUint16(3, value, true);
  }
  get SkillNumber() {
    return GetByteValue(this.buffer.getUint8(5), 8, 0);
  }
  set SkillNumber(value: number) {
    const oldByte = this.buffer.getUint8(5);
    this.buffer.setUint8(5, SetByteValue(oldByte, value, 8, 0));
  }
  get Stage() {
    return GetByteValue(this.buffer.getUint8(6), 8, 0);
  }
  set Stage(value: number) {
    const oldByte = this.buffer.getUint8(6);
    this.buffer.setUint8(6, SetByteValue(oldByte, value, 8, 0));
  }
}
export class IllusionTempleEnterResultPacket {
  buffer!: DataView;
  static readonly Name = `IllusionTempleEnterResult`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `The player requested to enter the illusion temple event.`;
  static readonly CausedReaction = `The client shows the result.`;
  static readonly Length = 5;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xBF;
  static readonly SubCode = 0x00;

  static getRequiredSize(dataSize:number){
    return IllusionTempleEnterResultPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, IllusionTempleEnterResultPacket.HeaderCode);
    b.setUint8(IllusionTempleEnterResultPacket.DataOffset, IllusionTempleEnterResultPacket.Code);
  b.setUint8(IllusionTempleEnterResultPacket.DataOffset + 1, IllusionTempleEnterResultPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = IllusionTempleEnterResultPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 5): IllusionTempleEnterResultPacket {
    const p = new IllusionTempleEnterResultPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Result() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set Result(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }
}
export class IllusionTempleStatePacket {
  buffer!: DataView;
  static readonly Name = `IllusionTempleState`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `The player is in the illusion temple event and the server sends a cyclic update.`;
  static readonly CausedReaction = `The client shows the state in the user interface.`;
  static readonly Length = undefined;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xBF;
  static readonly SubCode = 0x01;

  static getRequiredSize(dataSize:number){
    return IllusionTempleStatePacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, IllusionTempleStatePacket.HeaderCode);
    b.setUint8(IllusionTempleStatePacket.DataOffset, IllusionTempleStatePacket.Code);
  b.setUint8(IllusionTempleStatePacket.DataOffset + 1, IllusionTempleStatePacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = IllusionTempleStatePacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number): IllusionTempleStatePacket {
    const p = new IllusionTempleStatePacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get RemainingSeconds(){
    return this.buffer.getUint16(4, true);
  }
  set RemainingSeconds(value: number){
    this.buffer.setUint16(4, value, true);
  }
  get PlayerIndex(){
    return this.buffer.getUint16(4, true);
  }
  set PlayerIndex(value: number){
    this.buffer.setUint16(4, value, true);
  }
  get PositionX() {
    return GetByteValue(this.buffer.getUint8(6), 8, 0);
  }
  set PositionX(value: number) {
    const oldByte = this.buffer.getUint8(6);
    this.buffer.setUint8(6, SetByteValue(oldByte, value, 8, 0));
  }
  get PositionY() {
    return GetByteValue(this.buffer.getUint8(7), 8, 0);
  }
  set PositionY(value: number) {
    const oldByte = this.buffer.getUint8(7);
    this.buffer.setUint8(7, SetByteValue(oldByte, value, 8, 0));
  }
  get Team1Points() {
    return GetByteValue(this.buffer.getUint8(8), 8, 0);
  }
  set Team1Points(value: number) {
    const oldByte = this.buffer.getUint8(8);
    this.buffer.setUint8(8, SetByteValue(oldByte, value, 8, 0));
  }
  get Team2Points() {
    return GetByteValue(this.buffer.getUint8(9), 8, 0);
  }
  set Team2Points(value: number) {
    const oldByte = this.buffer.getUint8(9);
    this.buffer.setUint8(9, SetByteValue(oldByte, value, 8, 0));
  }
  get MyTeam() {
    return GetByteValue(this.buffer.getUint8(10), 8, 0);
  }
  set MyTeam(value: number) {
    const oldByte = this.buffer.getUint8(10);
    this.buffer.setUint8(10, SetByteValue(oldByte, value, 8, 0));
  }
  get PartyCount() {
    return GetByteValue(this.buffer.getUint8(11), 8, 0);
  }
  set PartyCount(value: number) {
    const oldByte = this.buffer.getUint8(11);
    this.buffer.setUint8(11, SetByteValue(oldByte, value, 8, 0));
  }

  getPartyMembers(count: number): {
  PlayerId: ShortLittleEndian;
  MapNumber: ShortLittleEndian;
  PositionX: Byte;
  PositionY: Byte;

}[]{
    const b = this.buffer;
    let bi = 0;

    const PartyMembers_count = count;
    const PartyMembers: any[] = new Array(PartyMembers_count);
    
    let PartyMembers_StartOffset = bi + 12;
    for (let i = 0; i < PartyMembers_count; i++) {
      const PlayerId = b.getUint16(PartyMembers_StartOffset + 0, true);
      const MapNumber = b.getUint16(PartyMembers_StartOffset + 2, true);
      const PositionX = b.getUint8(PartyMembers_StartOffset + 3);
      const PositionY = b.getUint8(PartyMembers_StartOffset + 4);
      PartyMembers[i] = {
        PlayerId,
        MapNumber,
        PositionX,
        PositionY
      };
      PartyMembers_StartOffset += 5;
    }
    
    return PartyMembers;
  }}
export class IllusionTempleSkillUsageResultPacket {
  buffer!: DataView;
  static readonly Name = `IllusionTempleSkillUsageResult`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `A player requested to use a specific skill in the illusion temple event.`;
  static readonly CausedReaction = `The client shows the result.`;
  static readonly Length = 11;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xBF;
  static readonly SubCode = 0x02;

  static getRequiredSize(dataSize:number){
    return IllusionTempleSkillUsageResultPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, IllusionTempleSkillUsageResultPacket.HeaderCode);
    b.setUint8(IllusionTempleSkillUsageResultPacket.DataOffset, IllusionTempleSkillUsageResultPacket.Code);
  b.setUint8(IllusionTempleSkillUsageResultPacket.DataOffset + 1, IllusionTempleSkillUsageResultPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = IllusionTempleSkillUsageResultPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 11): IllusionTempleSkillUsageResultPacket {
    const p = new IllusionTempleSkillUsageResultPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Result() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set Result(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }
  get SkillNumber(){
    return this.buffer.getUint16(5, false);
  }
  set SkillNumber(value: number){
    this.buffer.setUint16(5, value, false);
  }
  get SourceObjectId(){
    return this.buffer.getUint16(7, true);
  }
  set SourceObjectId(value: number){
    this.buffer.setUint16(7, value, true);
  }
  get TargetObjectId(){
    return this.buffer.getUint16(9, true);
  }
  set TargetObjectId(value: number){
    this.buffer.setUint16(9, value, true);
  }
}
export class IllusionTempleUserCountPacket {
  buffer!: DataView;
  static readonly Name = `IllusionTempleUserCount`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `?`;
  static readonly CausedReaction = `The client shows the counts.`;
  static readonly Length = 10;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xBF;
  static readonly SubCode = 0x03;

  static getRequiredSize(dataSize:number){
    return IllusionTempleUserCountPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, IllusionTempleUserCountPacket.HeaderCode);
    b.setUint8(IllusionTempleUserCountPacket.DataOffset, IllusionTempleUserCountPacket.Code);
  b.setUint8(IllusionTempleUserCountPacket.DataOffset + 1, IllusionTempleUserCountPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = IllusionTempleUserCountPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 10): IllusionTempleUserCountPacket {
    const p = new IllusionTempleUserCountPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get UserCount1() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set UserCount1(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }
  get UserCount2() {
    return GetByteValue(this.buffer.getUint8(5), 8, 0);
  }
  set UserCount2(value: number) {
    const oldByte = this.buffer.getUint8(5);
    this.buffer.setUint8(5, SetByteValue(oldByte, value, 8, 0));
  }
  get UserCount3() {
    return GetByteValue(this.buffer.getUint8(6), 8, 0);
  }
  set UserCount3(value: number) {
    const oldByte = this.buffer.getUint8(6);
    this.buffer.setUint8(6, SetByteValue(oldByte, value, 8, 0));
  }
  get UserCount4() {
    return GetByteValue(this.buffer.getUint8(7), 8, 0);
  }
  set UserCount4(value: number) {
    const oldByte = this.buffer.getUint8(7);
    this.buffer.setUint8(7, SetByteValue(oldByte, value, 8, 0));
  }
  get UserCount5() {
    return GetByteValue(this.buffer.getUint8(8), 8, 0);
  }
  set UserCount5(value: number) {
    const oldByte = this.buffer.getUint8(8);
    this.buffer.setUint8(8, SetByteValue(oldByte, value, 8, 0));
  }
  get UserCount6() {
    return GetByteValue(this.buffer.getUint8(9), 8, 0);
  }
  set UserCount6(value: number) {
    const oldByte = this.buffer.getUint8(9);
    this.buffer.setUint8(9, SetByteValue(oldByte, value, 8, 0));
  }
}
export class IllusionTempleResultPacket {
  buffer!: DataView;
  static readonly Name = `IllusionTempleResult`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `The illusion temple event ended.`;
  static readonly CausedReaction = `The client shows the results.`;
  static readonly Length = undefined;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xBF;
  static readonly SubCode = 0x04;

  static getRequiredSize(dataSize:number){
    return IllusionTempleResultPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, IllusionTempleResultPacket.HeaderCode);
    b.setUint8(IllusionTempleResultPacket.DataOffset, IllusionTempleResultPacket.Code);
  b.setUint8(IllusionTempleResultPacket.DataOffset + 1, IllusionTempleResultPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = IllusionTempleResultPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  private _readString (from :number, to: number): string {
    return readWireString(this.buffer, from, to);
  }

  static createPacket(requiredSize: number): IllusionTempleResultPacket {
    const p = new IllusionTempleResultPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Team1Points() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set Team1Points(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }
  get Team2Points() {
    return GetByteValue(this.buffer.getUint8(5), 8, 0);
  }
  set Team2Points(value: number) {
    const oldByte = this.buffer.getUint8(5);
    this.buffer.setUint8(5, SetByteValue(oldByte, value, 8, 0));
  }
  get PlayerCount() {
    return GetByteValue(this.buffer.getUint8(6), 8, 0);
  }
  set PlayerCount(value: number) {
    const oldByte = this.buffer.getUint8(6);
    this.buffer.setUint8(6, SetByteValue(oldByte, value, 8, 0));
  }

  getPlayers(count: number = this.PlayerCount): {
  Name: string;
  MapNumber: Byte;
  Team: Byte;
  Class: Byte;
  AddedExperience: IntegerLittleEndian;

}[]{
    const b = this.buffer;
    let bi = 0;

    const Players_count = count;
    const Players: any[] = new Array(Players_count);
    
    let Players_StartOffset = bi + 10;
    for (let i = 0; i < Players_count; i++) {
      const Name = this._readString(Players_StartOffset + 0, Players_StartOffset + 0 + 0);
      const MapNumber = b.getUint8(Players_StartOffset + 10);
      const Team = b.getUint8(Players_StartOffset + 11);
      const Class = b.getUint8(Players_StartOffset + 12);
      const AddedExperience = b.getUint32(Players_StartOffset + 13, true);
      Players[i] = {
        Name,
        MapNumber,
        Team,
        Class,
        AddedExperience
      };
      Players_StartOffset += 17;
    }
    
    return Players;
  }}
export class IllusionTempleSkillPointUpdatePacket {
  buffer!: DataView;
  static readonly Name = `IllusionTempleSkillPointUpdate`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `?`;
  static readonly CausedReaction = `The client shows the skill points.`;
  static readonly Length = 5;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xBF;
  static readonly SubCode = 0x06;

  static getRequiredSize(dataSize:number){
    return IllusionTempleSkillPointUpdatePacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, IllusionTempleSkillPointUpdatePacket.HeaderCode);
    b.setUint8(IllusionTempleSkillPointUpdatePacket.DataOffset, IllusionTempleSkillPointUpdatePacket.Code);
  b.setUint8(IllusionTempleSkillPointUpdatePacket.DataOffset + 1, IllusionTempleSkillPointUpdatePacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = IllusionTempleSkillPointUpdatePacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 5): IllusionTempleSkillPointUpdatePacket {
    const p = new IllusionTempleSkillPointUpdatePacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get SkillPoints() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set SkillPoints(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }
}
export class IllusionTempleSkillEndedPacket {
  buffer!: DataView;
  static readonly Name = `IllusionTempleSkillEnded`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `?`;
  static readonly CausedReaction = `The client shows the skill points.`;
  static readonly Length = 8;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xBF;
  static readonly SubCode = 0x07;

  static getRequiredSize(dataSize:number){
    return IllusionTempleSkillEndedPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, IllusionTempleSkillEndedPacket.HeaderCode);
    b.setUint8(IllusionTempleSkillEndedPacket.DataOffset, IllusionTempleSkillEndedPacket.Code);
  b.setUint8(IllusionTempleSkillEndedPacket.DataOffset + 1, IllusionTempleSkillEndedPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = IllusionTempleSkillEndedPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 8): IllusionTempleSkillEndedPacket {
    const p = new IllusionTempleSkillEndedPacket();
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
  get ObjectIndex(){
    return this.buffer.getUint16(6, true);
  }
  set ObjectIndex(value: number){
    this.buffer.setUint16(6, value, true);
  }
}
export class IllusionTempleHolyItemRelicsPacket {
  buffer!: DataView;
  static readonly Name = `IllusionTempleHolyItemRelics`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `?`;
  static readonly CausedReaction = `?.`;
  static readonly Length = 16;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xBF;
  static readonly SubCode = 0x08;

  static getRequiredSize(dataSize:number){
    return IllusionTempleHolyItemRelicsPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, IllusionTempleHolyItemRelicsPacket.HeaderCode);
    b.setUint8(IllusionTempleHolyItemRelicsPacket.DataOffset, IllusionTempleHolyItemRelicsPacket.Code);
  b.setUint8(IllusionTempleHolyItemRelicsPacket.DataOffset + 1, IllusionTempleHolyItemRelicsPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = IllusionTempleHolyItemRelicsPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  private _readString (from :number, to: number): string {
    return readWireString(this.buffer, from, to);
  }

  static createPacket(requiredSize: number = 16): IllusionTempleHolyItemRelicsPacket {
    const p = new IllusionTempleHolyItemRelicsPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get UserIndex(){
    return this.buffer.getUint16(4, true);
  }
  set UserIndex(value: number){
    this.buffer.setUint16(4, value, true);
  }
  get Name(){
    const to = this.buffer.byteLength;
              
    return this._readString(6, to);
  }
  setName(str: string, count = NaN){
    const from = 6;
    for(let i = 0; i < str.length; i++){
      const char = str.charCodeAt(i);
      this.buffer.setUint8(from + i, char);
    }
}
}
export class IllusionTempleSkillEndPacket {
  buffer!: DataView;
  static readonly Name = `IllusionTempleSkillEnd`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `?`;
  static readonly CausedReaction = `The client shows the skill points.`;
  static readonly Length = 6;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xBF;
  static readonly SubCode = 0x07;

  static getRequiredSize(dataSize:number){
    return IllusionTempleSkillEndPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, IllusionTempleSkillEndPacket.HeaderCode);
    b.setUint8(IllusionTempleSkillEndPacket.DataOffset, IllusionTempleSkillEndPacket.Code);
  b.setUint8(IllusionTempleSkillEndPacket.DataOffset + 1, IllusionTempleSkillEndPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = IllusionTempleSkillEndPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 6): IllusionTempleSkillEndPacket {
    const p = new IllusionTempleSkillEndPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get TempleNumber() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set TempleNumber(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }
  get State() {
    return GetByteValue(this.buffer.getUint8(5), 8, 0);
  }
  set State(value: number) {
    const oldByte = this.buffer.getUint8(5);
    this.buffer.setUint8(5, SetByteValue(oldByte, value, 8, 0));
  }
}
export class ChainLightningHitInfoPacket {
  buffer!: DataView;
  static readonly Name = `ChainLightningHitInfo`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `The player applied chain lightning to a target and the server calculated the hits.`;
  static readonly CausedReaction = `The client shows the chain lightning effect.`;
  static readonly Length = undefined;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xBF;
  static readonly SubCode = 0x0A;

  static getRequiredSize(dataSize:number){
    return ChainLightningHitInfoPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, ChainLightningHitInfoPacket.HeaderCode);
    b.setUint8(ChainLightningHitInfoPacket.DataOffset, ChainLightningHitInfoPacket.Code);
  b.setUint8(ChainLightningHitInfoPacket.DataOffset + 1, ChainLightningHitInfoPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = ChainLightningHitInfoPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number): ChainLightningHitInfoPacket {
    const p = new ChainLightningHitInfoPacket();
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
  get PlayerId(){
    return this.buffer.getUint16(6, true);
  }
  set PlayerId(value: number){
    this.buffer.setUint16(6, value, true);
  }
  get TargetCount() {
    return GetByteValue(this.buffer.getUint8(8), 8, 0);
  }
  set TargetCount(value: number) {
    const oldByte = this.buffer.getUint8(8);
    this.buffer.setUint8(8, SetByteValue(oldByte, value, 8, 0));
  }

  getTargets(count: number = this.TargetCount): {
  TargetId: ShortLittleEndian;

}[]{
    const b = this.buffer;
    let bi = 0;

    const Targets_count = count;
    const Targets: any[] = new Array(Targets_count);
    
    let Targets_StartOffset = bi + 10;
    for (let i = 0; i < Targets_count; i++) {
      const TargetId = b.getUint16(Targets_StartOffset + 0, true);
      Targets[i] = {
        TargetId
      };
      Targets_StartOffset += 2;
    }
    
    return Targets;
  }}
export class MuHelperStatusUpdatePacket {
  buffer!: DataView;
  static readonly Name = `MuHelperStatusUpdate`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `The server validated or changed the status of the MU Helper.`;
  static readonly CausedReaction = `The client toggle the MU Helper status.`;
  static readonly Length = 16;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xBF;
  static readonly SubCode = 0x51;

  static getRequiredSize(dataSize:number){
    return MuHelperStatusUpdatePacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, MuHelperStatusUpdatePacket.HeaderCode);
    b.setUint8(MuHelperStatusUpdatePacket.DataOffset, MuHelperStatusUpdatePacket.Code);
  b.setUint8(MuHelperStatusUpdatePacket.DataOffset + 1, MuHelperStatusUpdatePacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = MuHelperStatusUpdatePacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 16): MuHelperStatusUpdatePacket {
    const p = new MuHelperStatusUpdatePacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get ConsumeMoney(){
    return GetBoolean(this.buffer.getUint8(4), 0);
  }
  set ConsumeMoney(value: boolean){
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetBoolean(oldByte, value, 0));
  }
  get Money(){
    return this.buffer.getUint32(8, true);
  }
  set Money(value: number){
    this.buffer.setUint32(8, value, true);
  }
  get PauseStatus(){
    return GetBoolean(this.buffer.getUint8(12), 0);
  }
  set PauseStatus(value: boolean){
    const oldByte = this.buffer.getUint8(12);
    this.buffer.setUint8(12, SetBoolean(oldByte, value, 0));
  }
}
export class MuHelperConfigurationDataPacket {
  buffer!: DataView;
  static readonly Name = `MuHelperConfigurationData`;
  static readonly HeaderType = `C2Header`;
  static readonly HeaderCode = 0xC2;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `The server saved the users MU Helper data.`;
  static readonly CausedReaction = `The user wants to save the MU Helper data.`;
  static readonly Length = 261;
  static readonly LengthSize = 2;
  static readonly DataOffset = 3;
  static readonly Code = 0xAE;

  static getRequiredSize(dataSize:number){
    return MuHelperConfigurationDataPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, MuHelperConfigurationDataPacket.HeaderCode);
    b.setUint8(MuHelperConfigurationDataPacket.DataOffset, MuHelperConfigurationDataPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = MuHelperConfigurationDataPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint16(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 261): MuHelperConfigurationDataPacket {
    const p = new MuHelperConfigurationDataPacket();
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
export class MessengerInitializationPacket {
  buffer!: DataView;
  static readonly Name = `MessengerInitialization`;
  static readonly HeaderType = `C2Header`;
  static readonly HeaderCode = 0xC2;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `After entering the game with a character.`;
  static readonly CausedReaction = `undefined`;
  static readonly Length = undefined;
  static readonly LengthSize = 2;
  static readonly DataOffset = 3;
  static readonly Code = 0xC0;

  static getRequiredSize(dataSize:number){
    return MessengerInitializationPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, MessengerInitializationPacket.HeaderCode);
    b.setUint8(MessengerInitializationPacket.DataOffset, MessengerInitializationPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = MessengerInitializationPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint16(1, l);
    return this;
  }

  private _readString (from :number, to: number): string {
    return readWireString(this.buffer, from, to);
  }

  static createPacket(requiredSize: number): MessengerInitializationPacket {
    const p = new MessengerInitializationPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get LetterCount() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set LetterCount(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }
  get MaximumLetterCount() {
    return GetByteValue(this.buffer.getUint8(5), 8, 0);
  }
  set MaximumLetterCount(value: number) {
    const oldByte = this.buffer.getUint8(5);
    this.buffer.setUint8(5, SetByteValue(oldByte, value, 8, 0));
  }
  get FriendCount() {
    return GetByteValue(this.buffer.getUint8(6), 8, 0);
  }
  set FriendCount(value: number) {
    const oldByte = this.buffer.getUint8(6);
    this.buffer.setUint8(6, SetByteValue(oldByte, value, 8, 0));
  }

  getFriends(count: number = this.FriendCount): {
  Name: string;
  ServerId: Byte;

}[]{
    const b = this.buffer;
    let bi = 0;

    const Friends_count = count;
    const Friends: any[] = new Array(Friends_count);
    
    let Friends_StartOffset = bi + 7;
    for (let i = 0; i < Friends_count; i++) {
      const Name = this._readString(Friends_StartOffset + 0, Friends_StartOffset + 0 + 10);
      const ServerId = b.getUint8(Friends_StartOffset + 10);
      Friends[i] = {
        Name,
        ServerId
      };
      Friends_StartOffset += 11;
    }
    
    return Friends;
  }}
export class FriendAddedPacket {
  buffer!: DataView;
  static readonly Name = `FriendAdded`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `After a friend has been added to the friend list.`;
  static readonly CausedReaction = `The friend appears in the friend list.`;
  static readonly Length = 15;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xC1;
  static readonly SubCode = 0x01;

  static getRequiredSize(dataSize:number){
    return FriendAddedPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, FriendAddedPacket.HeaderCode);
    b.setUint8(FriendAddedPacket.DataOffset, FriendAddedPacket.Code);
  b.setUint8(FriendAddedPacket.DataOffset + 1, FriendAddedPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = FriendAddedPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  private _readString (from :number, to: number): string {
    return readWireString(this.buffer, from, to);
  }

  static createPacket(requiredSize: number = 15): FriendAddedPacket {
    const p = new FriendAddedPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get FriendName(){
    const to = 14;
              
    return this._readString(4, to);
  }
  setFriendName(str: string, count = 10){
    const from = 4;
    for(let i = 0; i < str.length; i++){
      const char = str.charCodeAt(i);
      this.buffer.setUint8(from + i, char);
    }
}
  get ServerId() {
    return GetByteValue(this.buffer.getUint8(14), 8, 0);
  }
  set ServerId(value: number) {
    const oldByte = this.buffer.getUint8(14);
    this.buffer.setUint8(14, SetByteValue(oldByte, value, 8, 0));
  }
}
export class FriendRequestPacket {
  buffer!: DataView;
  static readonly Name = `FriendRequest`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `After a player has requested to add another player as friend. This other player gets this message.`;
  static readonly CausedReaction = `The friend request appears on the user interface.`;
  static readonly Length = 13;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xC2;

  static getRequiredSize(dataSize:number){
    return FriendRequestPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, FriendRequestPacket.HeaderCode);
    b.setUint8(FriendRequestPacket.DataOffset, FriendRequestPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = FriendRequestPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  private _readString (from :number, to: number): string {
    return readWireString(this.buffer, from, to);
  }

  static createPacket(requiredSize: number = 13): FriendRequestPacket {
    const p = new FriendRequestPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Requester(){
    const to = 13;
              
    return this._readString(3, to);
  }
  setRequester(str: string, count = 10){
    const from = 3;
    for(let i = 0; i < str.length; i++){
      const char = str.charCodeAt(i);
      this.buffer.setUint8(from + i, char);
    }
}
}
export class FriendDeletedPacket {
  buffer!: DataView;
  static readonly Name = `FriendDeleted`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `After a friend has been removed from the friend list.`;
  static readonly CausedReaction = `The friend is removed from the friend list.`;
  static readonly Length = 14;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xC3;
  static readonly SubCode = 0x01;

  static getRequiredSize(dataSize:number){
    return FriendDeletedPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, FriendDeletedPacket.HeaderCode);
    b.setUint8(FriendDeletedPacket.DataOffset, FriendDeletedPacket.Code);
  b.setUint8(FriendDeletedPacket.DataOffset + 1, FriendDeletedPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = FriendDeletedPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  private _readString (from :number, to: number): string {
    return readWireString(this.buffer, from, to);
  }

  static createPacket(requiredSize: number = 14): FriendDeletedPacket {
    const p = new FriendDeletedPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get FriendName(){
    const to = 14;
              
    return this._readString(4, to);
  }
  setFriendName(str: string, count = 10){
    const from = 4;
    for(let i = 0; i < str.length; i++){
      const char = str.charCodeAt(i);
      this.buffer.setUint8(from + i, char);
    }
}
}
export class FriendOnlineStateUpdatePacket {
  buffer!: DataView;
  static readonly Name = `FriendOnlineStateUpdate`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `After a friend has been added to the friend list.`;
  static readonly CausedReaction = `The friend appears in the friend list.`;
  static readonly Length = 14;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xC4;

  static getRequiredSize(dataSize:number){
    return FriendOnlineStateUpdatePacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, FriendOnlineStateUpdatePacket.HeaderCode);
    b.setUint8(FriendOnlineStateUpdatePacket.DataOffset, FriendOnlineStateUpdatePacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = FriendOnlineStateUpdatePacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  private _readString (from :number, to: number): string {
    return readWireString(this.buffer, from, to);
  }

  static createPacket(requiredSize: number = 14): FriendOnlineStateUpdatePacket {
    const p = new FriendOnlineStateUpdatePacket();
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
  get ServerId() {
    return GetByteValue(this.buffer.getUint8(13), 8, 0);
  }
  set ServerId(value: number) {
    const oldByte = this.buffer.getUint8(13);
    this.buffer.setUint8(13, SetByteValue(oldByte, value, 8, 0));
  }
}
export enum LetterSendResponseLetterSendRequestResultEnum {
    TryAgain = 0,
Success = 1,
MailboxFull = 2,
ReceiverNotExists = 3,
CantSendToYourself = 4,
NotEnoughMoney = 7
  }export class LetterSendResponsePacket {
  buffer!: DataView;
  static readonly Name = `LetterSendResponse`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `After the player requested to send a letter to another player.`;
  static readonly CausedReaction = `Depending on the result, the letter send dialog closes or an error message appears.`;
  static readonly Length = 8;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xC5;

  static getRequiredSize(dataSize:number){
    return LetterSendResponsePacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, LetterSendResponsePacket.HeaderCode);
    b.setUint8(LetterSendResponsePacket.DataOffset, LetterSendResponsePacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = LetterSendResponsePacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 8): LetterSendResponsePacket {
    const p = new LetterSendResponsePacket();
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
  get Result():LetterSendResponseLetterSendRequestResultEnum{
    return GetByteValue(this.buffer.getUint8(3), 8, 0);
  }
  set Result(value: LetterSendResponseLetterSendRequestResultEnum){
    const oldValue = this.Result;
    this.buffer.setUint8(3, SetByteValue(oldValue, value, 8, 0));
  }
}
export enum AddLetterLetterStateEnum {
    Read = 0,
Unread = 1,
New = 2
  }export class AddLetterPacket {
  buffer!: DataView;
  static readonly Name = `AddLetter`;
  static readonly HeaderType = `C3Header`;
  static readonly HeaderCode = 0xC3;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `After a letter has been received or after the player entered the game with a character.`;
  static readonly CausedReaction = `The letter appears in the letter list.`;
  static readonly Length = 79;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xC6;

  static getRequiredSize(dataSize:number){
    return AddLetterPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, AddLetterPacket.HeaderCode);
    b.setUint8(AddLetterPacket.DataOffset, AddLetterPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = AddLetterPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  private _readString (from :number, to: number): string {
    return readWireString(this.buffer, from, to);
  }

  static createPacket(requiredSize: number = 79): AddLetterPacket {
    const p = new AddLetterPacket();
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
  get SenderName(){
    const to = 16;
              
    return this._readString(6, to);
  }
  setSenderName(str: string, count = 10){
    const from = 6;
    for(let i = 0; i < str.length; i++){
      const char = str.charCodeAt(i);
      this.buffer.setUint8(from + i, char);
    }
}
  get Timestamp(){
    const to = 46;
              
    return this._readString(16, to);
  }
  setTimestamp(str: string, count = 30){
    const from = 16;
    for(let i = 0; i < str.length; i++){
      const char = str.charCodeAt(i);
      this.buffer.setUint8(from + i, char);
    }
}
  get Subject(){
    const to = 78;
              
    return this._readString(46, to);
  }
  setSubject(str: string, count = 32){
    const from = 46;
    for(let i = 0; i < str.length; i++){
      const char = str.charCodeAt(i);
      this.buffer.setUint8(from + i, char);
    }
}
  get State():AddLetterLetterStateEnum{
    return GetByteValue(this.buffer.getUint8(78), 8, 0);
  }
  set State(value: AddLetterLetterStateEnum){
    const oldValue = this.State;
    this.buffer.setUint8(78, SetByteValue(oldValue, value, 8, 0));
  }
}
export class OpenLetterPacket {
  buffer!: DataView;
  static readonly Name = `OpenLetter`;
  static readonly HeaderType = `C4Header`;
  static readonly HeaderCode = 0xC4;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `After the player requested to read a letter.`;
  static readonly CausedReaction = `The letter is opened in a new dialog.`;
  static readonly Length = undefined;
  static readonly LengthSize = 2;
  static readonly DataOffset = 3;
  static readonly Code = 0xC7;

  static getRequiredSize(dataSize:number){
    return OpenLetterPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, OpenLetterPacket.HeaderCode);
    b.setUint8(OpenLetterPacket.DataOffset, OpenLetterPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = OpenLetterPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint16(1, l);
    return this;
  }

  private _readString (from :number, to: number): string {
    return readWireString(this.buffer, from, to);
  }

  static createPacket(requiredSize: number): OpenLetterPacket {
    const p = new OpenLetterPacket();
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
  get MessageSize(){
    return this.buffer.getUint16(6, true);
  }
  set MessageSize(value: number){
    this.buffer.setUint16(6, value, true);
  }
  get SenderAppearance(){
    const to = 26;
    const i = 8;
              
    return new DataView(this.buffer.buffer.slice(i,to));
  }
  setSenderAppearance(data: ArrayLike<number>, count = 18){
    if (data.length !== count) throw new Error(`data.length must be ${count}`);
    const from = 8;

    for (let i = 0; i < data.length; i++) {
      this.buffer.setUint8(from + i, data[i]);
    }
}
  get Rotation() {
    return GetByteValue(this.buffer.getUint8(26), 8, 0);
  }
  set Rotation(value: number) {
    const oldByte = this.buffer.getUint8(26);
    this.buffer.setUint8(26, SetByteValue(oldByte, value, 8, 0));
  }
  get Animation() {
    return GetByteValue(this.buffer.getUint8(27), 8, 0);
  }
  set Animation(value: number) {
    const oldByte = this.buffer.getUint8(27);
    this.buffer.setUint8(27, SetByteValue(oldByte, value, 8, 0));
  }
  get Message(){
    const to = this.buffer.byteLength;
              
    return this._readString(28, to);
  }
  setMessage(str: string, count = NaN){
    const from = 28;
    for(let i = 0; i < str.length; i++){
      const char = str.charCodeAt(i);
      this.buffer.setUint8(from + i, char);
    }
}
}
export class OpenLetterExtendedPacket {
  buffer!: DataView;
  static readonly Name = `OpenLetterExtended`;
  static readonly HeaderType = `C4Header`;
  static readonly HeaderCode = 0xC4;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `After the player requested to read a letter.`;
  static readonly CausedReaction = `The letter is opened in a new dialog.`;
  static readonly Length = undefined;
  static readonly LengthSize = 2;
  static readonly DataOffset = 3;
  static readonly Code = 0xC7;

  static getRequiredSize(dataSize:number){
    return OpenLetterExtendedPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, OpenLetterExtendedPacket.HeaderCode);
    b.setUint8(OpenLetterExtendedPacket.DataOffset, OpenLetterExtendedPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = OpenLetterExtendedPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint16(1, l);
    return this;
  }

  private _readString (from :number, to: number): string {
    return readWireString(this.buffer, from, to);
  }

  static createPacket(requiredSize: number): OpenLetterExtendedPacket {
    const p = new OpenLetterExtendedPacket();
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
  get SenderAppearance(){
    const to = 48;
    const i = 6;
              
    return new DataView(this.buffer.buffer.slice(i,to));
  }
  setSenderAppearance(data: ArrayLike<number>, count = 42){
    if (data.length !== count) throw new Error(`data.length must be ${count}`);
    const from = 6;

    for (let i = 0; i < data.length; i++) {
      this.buffer.setUint8(from + i, data[i]);
    }
}
  get Rotation() {
    return GetByteValue(this.buffer.getUint8(48), 8, 0);
  }
  set Rotation(value: number) {
    const oldByte = this.buffer.getUint8(48);
    this.buffer.setUint8(48, SetByteValue(oldByte, value, 8, 0));
  }
  get Animation() {
    return GetByteValue(this.buffer.getUint8(49), 8, 0);
  }
  set Animation(value: number) {
    const oldByte = this.buffer.getUint8(49);
    this.buffer.setUint8(49, SetByteValue(oldByte, value, 8, 0));
  }
  get Message(){
    const to = this.buffer.byteLength;
              
    return this._readString(50, to);
  }
  setMessage(str: string, count = NaN){
    const from = 50;
    for(let i = 0; i < str.length; i++){
      const char = str.charCodeAt(i);
      this.buffer.setUint8(from + i, char);
    }
}
}
export class RemoveLetterPacket {
  buffer!: DataView;
  static readonly Name = `RemoveLetter`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `After a letter has been deleted by the request of the player.`;
  static readonly CausedReaction = `The letter is removed from the letter list.`;
  static readonly Length = 6;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xC8;

  static getRequiredSize(dataSize:number){
    return RemoveLetterPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, RemoveLetterPacket.HeaderCode);
    b.setUint8(RemoveLetterPacket.DataOffset, RemoveLetterPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = RemoveLetterPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 6): RemoveLetterPacket {
    const p = new RemoveLetterPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get RequestSuccessful(){
    return GetBoolean(this.buffer.getUint8(3), 0);
  }
  set RequestSuccessful(value: boolean){
    const oldByte = this.buffer.getUint8(3);
    this.buffer.setUint8(3, SetBoolean(oldByte, value, 0));
  }
  get LetterIndex(){
    return this.buffer.getUint16(4, true);
  }
  set LetterIndex(value: number){
    this.buffer.setUint16(4, value, true);
  }
}
export class ChatRoomConnectionInfoPacket {
  buffer!: DataView;
  static readonly Name = `ChatRoomConnectionInfo`;
  static readonly HeaderType = `C3Header`;
  static readonly HeaderCode = 0xC3;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `The player is invited to join a chat room on the chat server.`;
  static readonly CausedReaction = `The game client connects to the chat server and joins the chat room with the specified authentication data.`;
  static readonly Length = 36;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xCA;

  static getRequiredSize(dataSize:number){
    return ChatRoomConnectionInfoPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, ChatRoomConnectionInfoPacket.HeaderCode);
    b.setUint8(ChatRoomConnectionInfoPacket.DataOffset, ChatRoomConnectionInfoPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = ChatRoomConnectionInfoPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  private _readString (from :number, to: number): string {
    return readWireString(this.buffer, from, to);
  }

  static createPacket(requiredSize: number = 36): ChatRoomConnectionInfoPacket {
    const p = new ChatRoomConnectionInfoPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get ChatServerIp(){
    const to = 18;
              
    return this._readString(3, to);
  }
  setChatServerIp(str: string, count = 15){
    const from = 3;
    for(let i = 0; i < str.length; i++){
      const char = str.charCodeAt(i);
      this.buffer.setUint8(from + i, char);
    }
}
  get ChatRoomId(){
    return this.buffer.getUint16(18, true);
  }
  set ChatRoomId(value: number){
    this.buffer.setUint16(18, value, true);
  }
  get AuthenticationToken(){
    return this.buffer.getUint32(20, true);
  }
  set AuthenticationToken(value: number){
    this.buffer.setUint32(20, value, true);
  }
  get Type() {
    return GetByteValue(this.buffer.getUint8(24), 8, 0);
  }
  set Type(value: number) {
    const oldByte = this.buffer.getUint8(24);
    this.buffer.setUint8(24, SetByteValue(oldByte, value, 8, 0));
  }
  get FriendName(){
    const to = 35;
              
    return this._readString(25, to);
  }
  setFriendName(str: string, count = 10){
    const from = 25;
    for(let i = 0; i < str.length; i++){
      const char = str.charCodeAt(i);
      this.buffer.setUint8(from + i, char);
    }
}
  get Success(){
    return GetBoolean(this.buffer.getUint8(35), 0);
  }
  set Success(value: boolean){
    const oldByte = this.buffer.getUint8(35);
    this.buffer.setUint8(35, SetBoolean(oldByte, value, 0));
  }
}
export class FriendInvitationResultPacket {
  buffer!: DataView;
  static readonly Name = `FriendInvitationResult`;
  static readonly HeaderType = `C3Header`;
  static readonly HeaderCode = 0xC3;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `The player requested to add another player to his friend list and the server processed this request.`;
  static readonly CausedReaction = `The game client knows if the invitation could be sent to the other player.`;
  static readonly Length = 8;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xCB;

  static getRequiredSize(dataSize:number){
    return FriendInvitationResultPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, FriendInvitationResultPacket.HeaderCode);
    b.setUint8(FriendInvitationResultPacket.DataOffset, FriendInvitationResultPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = FriendInvitationResultPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 8): FriendInvitationResultPacket {
    const p = new FriendInvitationResultPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Success(){
    return GetBoolean(this.buffer.getUint8(3), 0);
  }
  set Success(value: boolean){
    const oldByte = this.buffer.getUint8(3);
    this.buffer.setUint8(3, SetBoolean(oldByte, value, 0));
  }
  get RequestId(){
    return this.buffer.getUint32(4, false);
  }
  set RequestId(value: number){
    this.buffer.setUint32(4, value, false);
  }
}
export class QuestEventResponsePacket {
  buffer!: DataView;
  static readonly Name = `QuestEventResponse`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `After the game client requested the list of event quests after entering the game. It seems to be sent only if the character is not a member of a Gen.`;
  static readonly CausedReaction = `Unknown.`;
  static readonly Length = 12;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xF6;
  static readonly SubCode = 0x03;

  static getRequiredSize(dataSize:number){
    return QuestEventResponsePacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, QuestEventResponsePacket.HeaderCode);
    b.setUint8(QuestEventResponsePacket.DataOffset, QuestEventResponsePacket.Code);
  b.setUint8(QuestEventResponsePacket.DataOffset + 1, QuestEventResponsePacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = QuestEventResponsePacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 12): QuestEventResponsePacket {
    const p = new QuestEventResponsePacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }

  getQuests(count: number): {
  Number: ShortLittleEndian;
  Group: ShortLittleEndian;

}[]{
    const b = this.buffer;
    let bi = 0;

    const Quests_count = count;
    const Quests: any[] = new Array(Quests_count);
    
    let Quests_StartOffset = bi + 4;
    for (let i = 0; i < Quests_count; i++) {
      const Number = b.getUint16(Quests_StartOffset + 0, true);
      const Group = b.getUint16(Quests_StartOffset + 2, true);
      Quests[i] = {
        Number,
        Group
      };
      Quests_StartOffset += 4;
    }
    
    return Quests;
  }}
export class AvailableQuestsPacket {
  buffer!: DataView;
  static readonly Name = `AvailableQuests`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `After the game client requested the list of available quests through an NPC dialog.`;
  static readonly CausedReaction = `The client shows the available quests for the currently interacting NPC.`;
  static readonly Length = undefined;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xF6;
  static readonly SubCode = 0x0A;

  static getRequiredSize(dataSize:number){
    return AvailableQuestsPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, AvailableQuestsPacket.HeaderCode);
    b.setUint8(AvailableQuestsPacket.DataOffset, AvailableQuestsPacket.Code);
  b.setUint8(AvailableQuestsPacket.DataOffset + 1, AvailableQuestsPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = AvailableQuestsPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number): AvailableQuestsPacket {
    const p = new AvailableQuestsPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get QuestNpcNumber(){
    return this.buffer.getUint16(4, true);
  }
  set QuestNpcNumber(value: number){
    this.buffer.setUint16(4, value, true);
  }
  get QuestCount(){
    return this.buffer.getUint16(6, true);
  }
  set QuestCount(value: number){
    this.buffer.setUint16(6, value, true);
  }

  getQuests(count: number = this.QuestCount): {
  Number: ShortLittleEndian;
  Group: ShortLittleEndian;

}[]{
    const b = this.buffer;
    let bi = 0;

    const Quests_count = count;
    const Quests: any[] = new Array(Quests_count);
    
    let Quests_StartOffset = bi + 8;
    for (let i = 0; i < Quests_count; i++) {
      const Number = b.getUint16(Quests_StartOffset + 0, true);
      const Group = b.getUint16(Quests_StartOffset + 2, true);
      Quests[i] = {
        Number,
        Group
      };
      Quests_StartOffset += 4;
    }
    
    return Quests;
  }}
export class QuestStepInfoPacket {
  buffer!: DataView;
  static readonly Name = `QuestStepInfo`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `After the game client clicked on a quest in the quest list, proceeded with a quest or refused to start a quest.`;
  static readonly CausedReaction = `The client shows the corresponding description about the current quest step.`;
  static readonly Length = 11;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xF6;
  static readonly SubCode = 0x0B;

  static getRequiredSize(dataSize:number){
    return QuestStepInfoPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, QuestStepInfoPacket.HeaderCode);
    b.setUint8(QuestStepInfoPacket.DataOffset, QuestStepInfoPacket.Code);
  b.setUint8(QuestStepInfoPacket.DataOffset + 1, QuestStepInfoPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = QuestStepInfoPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 11): QuestStepInfoPacket {
    const p = new QuestStepInfoPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get QuestStepNumber(){
    return this.buffer.getUint16(4, true);
  }
  set QuestStepNumber(value: number){
    this.buffer.setUint16(4, value, true);
  }
  get QuestGroup(){
    return this.buffer.getUint16(6, true);
  }
  set QuestGroup(value: number){
    this.buffer.setUint16(6, value, true);
  }
}
export class QuestProgressPacket {
  buffer!: DataView;
  static readonly Name = `QuestProgress`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `First, after the game client requested to initialize a quest and the quest is already active. Second, after the game client requested the next quest step.`;
  static readonly CausedReaction = `The client shows the quest progress accordingly.`;
  static readonly Length = 251;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xF6;
  static readonly SubCode = 0x0C;

  static getRequiredSize(dataSize:number){
    return QuestProgressPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, QuestProgressPacket.HeaderCode);
    b.setUint8(QuestProgressPacket.DataOffset, QuestProgressPacket.Code);
  b.setUint8(QuestProgressPacket.DataOffset + 1, QuestProgressPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = QuestProgressPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  private _readDataView (from: number, to: number): DataView {
    return new DataView(this.buffer.buffer.slice(from, to));
  }

  static createPacket(requiredSize: number = 251): QuestProgressPacket {
    const p = new QuestProgressPacket();
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
  get ConditionCount() {
    return GetByteValue(this.buffer.getUint8(8), 8, 0);
  }
  set ConditionCount(value: number) {
    const oldByte = this.buffer.getUint8(8);
    this.buffer.setUint8(8, SetByteValue(oldByte, value, 8, 0));
  }
  get RewardCount() {
    return GetByteValue(this.buffer.getUint8(9), 8, 0);
  }
  set RewardCount(value: number) {
    const oldByte = this.buffer.getUint8(9);
    this.buffer.setUint8(9, SetByteValue(oldByte, value, 8, 0));
  }

  getConditions(count: number = this.ConditionCount): {
  Type: ConditionTypeEnum;
  RequirementId: ShortLittleEndian;
  RequiredCount: IntegerLittleEndian;
  CurrentCount: IntegerLittleEndian;
  RequiredItemData: Binary;

}[]{
    const b = this.buffer;
    let bi = 0;

    const Conditions_count = count;
    const Conditions: any[] = new Array(Conditions_count);
    
    let Conditions_StartOffset = bi + 11;
    for (let i = 0; i < Conditions_count; i++) {
      const Type = GetByteValue(b.getUint8(Conditions_StartOffset + 0), 8, 0);
      const RequirementId = b.getUint16(Conditions_StartOffset + 4, true);
      const RequiredCount = b.getUint32(Conditions_StartOffset + 6, true);
      const CurrentCount = b.getUint32(Conditions_StartOffset + 10, true);
      const RequiredItemData = this._readDataView(Conditions_StartOffset + 14, Conditions_StartOffset + 14 + 12);
      Conditions[i] = {
        Type,
        RequirementId,
        RequiredCount,
        CurrentCount,
        RequiredItemData
      };
      Conditions_StartOffset += 26;
    }
    
    return Conditions;
  }
  getRewards(count: number = this.RewardCount): {
  Type: RewardTypeEnum;
  RewardId: ShortLittleEndian;
  RewardCount: IntegerLittleEndian;
  RewardedItemData: Binary;

}[]{
    const b = this.buffer;
    let bi = 0;

    const Rewards_count = count;
    const Rewards: any[] = new Array(Rewards_count);
    
    let Rewards_StartOffset = bi + 141;
    for (let i = 0; i < Rewards_count; i++) {
      const Type = GetByteValue(b.getUint8(Rewards_StartOffset + 0), 8, 0);
      const RewardId = b.getUint16(Rewards_StartOffset + 4, true);
      const RewardCount = b.getUint32(Rewards_StartOffset + 6, true);
      const RewardedItemData = this._readDataView(Rewards_StartOffset + 10, Rewards_StartOffset + 10 + 12);
      Rewards[i] = {
        Type,
        RewardId,
        RewardCount,
        RewardedItemData
      };
      Rewards_StartOffset += 22;
    }
    
    return Rewards;
  }}
export class QuestProgressExtendedPacket {
  buffer!: DataView;
  static readonly Name = `QuestProgressExtended`;
  static readonly HeaderType = `C2HeaderWithSubCode`;
  static readonly HeaderCode = 0xC2;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `First, after the game client requested to initialize a quest and the quest is already active. Second, after the game client requested the next quest step.`;
  static readonly CausedReaction = `The client shows the quest progress accordingly.`;
  static readonly Length = 272;
  static readonly LengthSize = 2;
  static readonly DataOffset = 3;
  static readonly Code = 0xF6;
  static readonly SubCode = 0x0C;

  static getRequiredSize(dataSize:number){
    return QuestProgressExtendedPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, QuestProgressExtendedPacket.HeaderCode);
    b.setUint8(QuestProgressExtendedPacket.DataOffset, QuestProgressExtendedPacket.Code);
  b.setUint8(QuestProgressExtendedPacket.DataOffset + 1, QuestProgressExtendedPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = QuestProgressExtendedPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint16(1, l);
    return this;
  }

  private _readDataView (from: number, to: number): DataView {
    return new DataView(this.buffer.buffer.slice(from, to));
  }

  static createPacket(requiredSize: number = 272): QuestProgressExtendedPacket {
    const p = new QuestProgressExtendedPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get ConditionCount() {
    return GetByteValue(this.buffer.getUint8(5), 8, 0);
  }
  set ConditionCount(value: number) {
    const oldByte = this.buffer.getUint8(5);
    this.buffer.setUint8(5, SetByteValue(oldByte, value, 8, 0));
  }
  get RewardCount() {
    return GetByteValue(this.buffer.getUint8(6), 8, 0);
  }
  set RewardCount(value: number) {
    const oldByte = this.buffer.getUint8(6);
    this.buffer.setUint8(6, SetByteValue(oldByte, value, 8, 0));
  }
  get RandomRewardCount() {
    return GetByteValue(this.buffer.getUint8(7), 8, 0);
  }
  set RandomRewardCount(value: number) {
    const oldByte = this.buffer.getUint8(7);
    this.buffer.setUint8(7, SetByteValue(oldByte, value, 8, 0));
  }
  get QuestNumber(){
    return this.buffer.getUint16(8, true);
  }
  set QuestNumber(value: number){
    this.buffer.setUint16(8, value, true);
  }
  get QuestGroup(){
    return this.buffer.getUint16(10, true);
  }
  set QuestGroup(value: number){
    this.buffer.setUint16(10, value, true);
  }

  getConditions(count: number = this.ConditionCount): {
  Type: ConditionTypeEnum;
  RequirementId: ShortLittleEndian;
  RequiredCount: IntegerLittleEndian;
  CurrentCount: IntegerLittleEndian;
  RequiredItemData: Binary;

}[]{
    const b = this.buffer;
    let bi = 0;

    const Conditions_count = count;
    const Conditions: any[] = new Array(Conditions_count);
    
    let Conditions_StartOffset = bi + 12;
    for (let i = 0; i < Conditions_count; i++) {
      const Type = GetByteValue(b.getUint8(Conditions_StartOffset + 0), 8, 0);
      const RequirementId = b.getUint16(Conditions_StartOffset + 2, true);
      const RequiredCount = b.getUint32(Conditions_StartOffset + 4, true);
      const CurrentCount = b.getUint32(Conditions_StartOffset + 8, true);
      const RequiredItemData = this._readDataView(Conditions_StartOffset + 12, Conditions_StartOffset + 12 + 15);
      Conditions[i] = {
        Type,
        RequirementId,
        RequiredCount,
        CurrentCount,
        RequiredItemData
      };
      Conditions_StartOffset += 28;
    }
    
    return Conditions;
  }
  getRewards(count: number = this.RewardCount): {
  Type: RewardTypeEnum;
  RewardId: ShortLittleEndian;
  RewardCount: IntegerLittleEndian;
  RewardedItemData: Binary;

}[]{
    const b = this.buffer;
    let bi = 0;

    const Rewards_count = count;
    const Rewards: any[] = new Array(Rewards_count);
    
    let Rewards_StartOffset = bi + 152;
    for (let i = 0; i < Rewards_count; i++) {
      const Type = GetByteValue(b.getUint8(Rewards_StartOffset + 0), 8, 0);
      const RewardId = b.getUint16(Rewards_StartOffset + 2, true);
      const RewardCount = b.getUint32(Rewards_StartOffset + 4, true);
      const RewardedItemData = this._readDataView(Rewards_StartOffset + 8, Rewards_StartOffset + 8 + 15);
      Rewards[i] = {
        Type,
        RewardId,
        RewardCount,
        RewardedItemData
      };
      Rewards_StartOffset += 24;
    }
    
    return Rewards;
  }}
export class QuestCompletionResponsePacket {
  buffer!: DataView;
  static readonly Name = `QuestCompletionResponse`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `The server acknowledges the completion of a quest.`;
  static readonly CausedReaction = `The client shows the success and possibly requests for the next available quests.`;
  static readonly Length = 9;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xF6;
  static readonly SubCode = 0x0D;

  static getRequiredSize(dataSize:number){
    return QuestCompletionResponsePacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, QuestCompletionResponsePacket.HeaderCode);
    b.setUint8(QuestCompletionResponsePacket.DataOffset, QuestCompletionResponsePacket.Code);
  b.setUint8(QuestCompletionResponsePacket.DataOffset + 1, QuestCompletionResponsePacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = QuestCompletionResponsePacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 9): QuestCompletionResponsePacket {
    const p = new QuestCompletionResponsePacket();
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
  get IsQuestCompleted(){
    return GetBoolean(this.buffer.getUint8(8), 0);
  }
  set IsQuestCompleted(value: boolean){
    const oldByte = this.buffer.getUint8(8);
    this.buffer.setUint8(8, SetBoolean(oldByte, value, 0));
  }
}
export class QuestCancelledPacket {
  buffer!: DataView;
  static readonly Name = `QuestCancelled`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `The server acknowledges the requested cancellation of a quest.`;
  static readonly CausedReaction = `The client resets the state of the quest and can request a new list of available quests again. This list would then probably contain the cancelled quest again.`;
  static readonly Length = 8;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xF6;
  static readonly SubCode = 0x0F;

  static getRequiredSize(dataSize:number){
    return QuestCancelledPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, QuestCancelledPacket.HeaderCode);
    b.setUint8(QuestCancelledPacket.DataOffset, QuestCancelledPacket.Code);
  b.setUint8(QuestCancelledPacket.DataOffset + 1, QuestCancelledPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = QuestCancelledPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 8): QuestCancelledPacket {
    const p = new QuestCancelledPacket();
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
export class QuestStateListPacket {
  buffer!: DataView;
  static readonly Name = `QuestStateList`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `After the game client requested the list of all quests which are currently in progress or accepted.`;
  static readonly CausedReaction = `Unknown.`;
  static readonly Length = undefined;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xF6;
  static readonly SubCode = 0x1A;

  static getRequiredSize(dataSize:number){
    return QuestStateListPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, QuestStateListPacket.HeaderCode);
    b.setUint8(QuestStateListPacket.DataOffset, QuestStateListPacket.Code);
  b.setUint8(QuestStateListPacket.DataOffset + 1, QuestStateListPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = QuestStateListPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number): QuestStateListPacket {
    const p = new QuestStateListPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get QuestCount() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set QuestCount(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }

  getQuests(count: number = this.QuestCount): {
  Number: ShortLittleEndian;
  Group: ShortLittleEndian;

}[]{
    const b = this.buffer;
    let bi = 0;

    const Quests_count = count;
    const Quests: any[] = new Array(Quests_count);
    
    let Quests_StartOffset = bi + 5;
    for (let i = 0; i < Quests_count; i++) {
      const Number = b.getUint16(Quests_StartOffset + 0, true);
      const Group = b.getUint16(Quests_StartOffset + 2, true);
      Quests[i] = {
        Number,
        Group
      };
      Quests_StartOffset += 4;
    }
    
    return Quests;
  }}
export class QuestStatePacket {
  buffer!: DataView;
  static readonly Name = `QuestState`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `After the game client requested it, when the player opened the quest menu and clicked on a quest.`;
  static readonly CausedReaction = `The client shows the quest progress accordingly.`;
  static readonly Length = 251;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xF6;
  static readonly SubCode = 0x1B;

  static getRequiredSize(dataSize:number){
    return QuestStatePacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, QuestStatePacket.HeaderCode);
    b.setUint8(QuestStatePacket.DataOffset, QuestStatePacket.Code);
  b.setUint8(QuestStatePacket.DataOffset + 1, QuestStatePacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = QuestStatePacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  private _readDataView (from: number, to: number): DataView {
    return new DataView(this.buffer.buffer.slice(from, to));
  }

  static createPacket(requiredSize: number = 251): QuestStatePacket {
    const p = new QuestStatePacket();
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
  get ConditionCount() {
    return GetByteValue(this.buffer.getUint8(8), 8, 0);
  }
  set ConditionCount(value: number) {
    const oldByte = this.buffer.getUint8(8);
    this.buffer.setUint8(8, SetByteValue(oldByte, value, 8, 0));
  }
  get RewardCount() {
    return GetByteValue(this.buffer.getUint8(9), 8, 0);
  }
  set RewardCount(value: number) {
    const oldByte = this.buffer.getUint8(9);
    this.buffer.setUint8(9, SetByteValue(oldByte, value, 8, 0));
  }
  get RandomRewardCount() {
    return GetByteValue(this.buffer.getUint8(10), 8, 0);
  }
  set RandomRewardCount(value: number) {
    const oldByte = this.buffer.getUint8(10);
    this.buffer.setUint8(10, SetByteValue(oldByte, value, 8, 0));
  }

  getConditions(count: number = this.ConditionCount): {
  Type: ConditionTypeEnum;
  RequirementId: ShortLittleEndian;
  RequiredCount: IntegerLittleEndian;
  CurrentCount: IntegerLittleEndian;
  RequiredItemData: Binary;

}[]{
    const b = this.buffer;
    let bi = 0;

    const Conditions_count = count;
    const Conditions: any[] = new Array(Conditions_count);
    
    let Conditions_StartOffset = bi + 11;
    for (let i = 0; i < Conditions_count; i++) {
      const Type = GetByteValue(b.getUint8(Conditions_StartOffset + 0), 8, 0);
      const RequirementId = b.getUint16(Conditions_StartOffset + 4, true);
      const RequiredCount = b.getUint32(Conditions_StartOffset + 6, true);
      const CurrentCount = b.getUint32(Conditions_StartOffset + 10, true);
      const RequiredItemData = this._readDataView(Conditions_StartOffset + 14, Conditions_StartOffset + 14 + 12);
      Conditions[i] = {
        Type,
        RequirementId,
        RequiredCount,
        CurrentCount,
        RequiredItemData
      };
      Conditions_StartOffset += 26;
    }
    
    return Conditions;
  }
  getRewards(count: number = this.RewardCount): {
  Type: RewardTypeEnum;
  RewardId: ShortLittleEndian;
  RewardCount: IntegerLittleEndian;
  RewardedItemData: Binary;

}[]{
    const b = this.buffer;
    let bi = 0;

    const Rewards_count = count;
    const Rewards: any[] = new Array(Rewards_count);
    
    let Rewards_StartOffset = bi + 141;
    for (let i = 0; i < Rewards_count; i++) {
      const Type = GetByteValue(b.getUint8(Rewards_StartOffset + 0), 8, 0);
      const RewardId = b.getUint16(Rewards_StartOffset + 4, true);
      const RewardCount = b.getUint32(Rewards_StartOffset + 6, true);
      const RewardedItemData = this._readDataView(Rewards_StartOffset + 10, Rewards_StartOffset + 10 + 12);
      Rewards[i] = {
        Type,
        RewardId,
        RewardCount,
        RewardedItemData
      };
      Rewards_StartOffset += 22;
    }
    
    return Rewards;
  }}
export class QuestStateExtendedPacket {
  buffer!: DataView;
  static readonly Name = `QuestStateExtended`;
  static readonly HeaderType = `C2HeaderWithSubCode`;
  static readonly HeaderCode = 0xC2;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `After the game client requested it, when the player opened the quest menu and clicked on a quest.`;
  static readonly CausedReaction = `The client shows the quest progress accordingly.`;
  static readonly Length = 272;
  static readonly LengthSize = 2;
  static readonly DataOffset = 3;
  static readonly Code = 0xF6;
  static readonly SubCode = 0x1B;

  static getRequiredSize(dataSize:number){
    return QuestStateExtendedPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, QuestStateExtendedPacket.HeaderCode);
    b.setUint8(QuestStateExtendedPacket.DataOffset, QuestStateExtendedPacket.Code);
  b.setUint8(QuestStateExtendedPacket.DataOffset + 1, QuestStateExtendedPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = QuestStateExtendedPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint16(1, l);
    return this;
  }

  private _readDataView (from: number, to: number): DataView {
    return new DataView(this.buffer.buffer.slice(from, to));
  }

  static createPacket(requiredSize: number = 272): QuestStateExtendedPacket {
    const p = new QuestStateExtendedPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get ConditionCount() {
    return GetByteValue(this.buffer.getUint8(5), 8, 0);
  }
  set ConditionCount(value: number) {
    const oldByte = this.buffer.getUint8(5);
    this.buffer.setUint8(5, SetByteValue(oldByte, value, 8, 0));
  }
  get RewardCount() {
    return GetByteValue(this.buffer.getUint8(6), 8, 0);
  }
  set RewardCount(value: number) {
    const oldByte = this.buffer.getUint8(6);
    this.buffer.setUint8(6, SetByteValue(oldByte, value, 8, 0));
  }
  get RandomRewardCount() {
    return GetByteValue(this.buffer.getUint8(7), 8, 0);
  }
  set RandomRewardCount(value: number) {
    const oldByte = this.buffer.getUint8(7);
    this.buffer.setUint8(7, SetByteValue(oldByte, value, 8, 0));
  }
  get QuestNumber(){
    return this.buffer.getUint16(8, true);
  }
  set QuestNumber(value: number){
    this.buffer.setUint16(8, value, true);
  }
  get QuestGroup(){
    return this.buffer.getUint16(10, true);
  }
  set QuestGroup(value: number){
    this.buffer.setUint16(10, value, true);
  }

  getConditions(count: number = this.ConditionCount): {
  Type: ConditionTypeEnum;
  RequirementId: ShortLittleEndian;
  RequiredCount: IntegerLittleEndian;
  CurrentCount: IntegerLittleEndian;
  RequiredItemData: Binary;

}[]{
    const b = this.buffer;
    let bi = 0;

    const Conditions_count = count;
    const Conditions: any[] = new Array(Conditions_count);
    
    let Conditions_StartOffset = bi + 12;
    for (let i = 0; i < Conditions_count; i++) {
      const Type = GetByteValue(b.getUint8(Conditions_StartOffset + 0), 8, 0);
      const RequirementId = b.getUint16(Conditions_StartOffset + 2, true);
      const RequiredCount = b.getUint32(Conditions_StartOffset + 4, true);
      const CurrentCount = b.getUint32(Conditions_StartOffset + 8, true);
      const RequiredItemData = this._readDataView(Conditions_StartOffset + 12, Conditions_StartOffset + 12 + 15);
      Conditions[i] = {
        Type,
        RequirementId,
        RequiredCount,
        CurrentCount,
        RequiredItemData
      };
      Conditions_StartOffset += 28;
    }
    
    return Conditions;
  }
  getRewards(count: number = this.RewardCount): {
  Type: RewardTypeEnum;
  RewardId: ShortLittleEndian;
  RewardCount: IntegerLittleEndian;
  RewardedItemData: Binary;

}[]{
    const b = this.buffer;
    let bi = 0;

    const Rewards_count = count;
    const Rewards: any[] = new Array(Rewards_count);
    
    let Rewards_StartOffset = bi + 152;
    for (let i = 0; i < Rewards_count; i++) {
      const Type = GetByteValue(b.getUint8(Rewards_StartOffset + 0), 8, 0);
      const RewardId = b.getUint16(Rewards_StartOffset + 2, true);
      const RewardCount = b.getUint32(Rewards_StartOffset + 4, true);
      const RewardedItemData = this._readDataView(Rewards_StartOffset + 8, Rewards_StartOffset + 8 + 15);
      Rewards[i] = {
        Type,
        RewardId,
        RewardCount,
        RewardedItemData
      };
      Rewards_StartOffset += 24;
    }
    
    return Rewards;
  }}
export class OpenNpcDialogPacket {
  buffer!: DataView;
  static readonly Name = `OpenNpcDialog`;
  static readonly HeaderType = `C3HeaderWithSubCode`;
  static readonly HeaderCode = 0xC3;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `The server acknowledges the requested opening of an npc dialog.`;
  static readonly CausedReaction = `The client opens the dialog of the specified npc.`;
  static readonly Length = 12;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xF9;
  static readonly SubCode = 0x01;

  static getRequiredSize(dataSize:number){
    return OpenNpcDialogPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, OpenNpcDialogPacket.HeaderCode);
    b.setUint8(OpenNpcDialogPacket.DataOffset, OpenNpcDialogPacket.Code);
  b.setUint8(OpenNpcDialogPacket.DataOffset + 1, OpenNpcDialogPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = OpenNpcDialogPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 12): OpenNpcDialogPacket {
    const p = new OpenNpcDialogPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get NpcNumber(){
    return this.buffer.getUint16(4, true);
  }
  set NpcNumber(value: number){
    this.buffer.setUint16(4, value, true);
  }
  get GensContributionPoints(){
    return this.buffer.getUint32(8, true);
  }
  set GensContributionPoints(value: number){
    this.buffer.setUint32(8, value, true);
  }
}
export enum DevilSquareEnterResultEnterResultEnum {
    Success = 0,
Failed = 1,
NotOpen = 2,
CharacterLevelTooHigh = 3,
CharacterLevelTooLow = 4,
Full = 5
  }export class DevilSquareEnterResultPacket {
  buffer!: DataView;
  static readonly Name = `DevilSquareEnterResult`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `The player requested to enter the devil square mini game through the Charon NPC.`;
  static readonly CausedReaction = `In case it failed, it shows the corresponding error message.`;
  static readonly Length = 4;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x90;

  static getRequiredSize(dataSize:number){
    return DevilSquareEnterResultPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, DevilSquareEnterResultPacket.HeaderCode);
    b.setUint8(DevilSquareEnterResultPacket.DataOffset, DevilSquareEnterResultPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = DevilSquareEnterResultPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 4): DevilSquareEnterResultPacket {
    const p = new DevilSquareEnterResultPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Result():DevilSquareEnterResultEnterResultEnum{
    return GetByteValue(this.buffer.getUint8(3), 8, 0);
  }
  set Result(value: DevilSquareEnterResultEnterResultEnum){
    const oldValue = this.Result;
    this.buffer.setUint8(3, SetByteValue(oldValue, value, 8, 0));
  }
}
export class MiniGameOpeningStatePacket {
  buffer!: DataView;
  static readonly Name = `MiniGameOpeningState`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `The player requests to get the current opening state of a mini game event, by clicking on an ticket item.`;
  static readonly CausedReaction = `The opening state of the event (remaining entering time, etc.) is shown at the client.`;
  static readonly Length = 7;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x91;

  static getRequiredSize(dataSize:number){
    return MiniGameOpeningStatePacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, MiniGameOpeningStatePacket.HeaderCode);
    b.setUint8(MiniGameOpeningStatePacket.DataOffset, MiniGameOpeningStatePacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = MiniGameOpeningStatePacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 7): MiniGameOpeningStatePacket {
    const p = new MiniGameOpeningStatePacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get GameType():Byte{
    return GetByteValue(this.buffer.getUint8(3), 8, 0);
  }
  set GameType(value: Byte){
    const oldValue = this.GameType;
    this.buffer.setUint8(3, SetByteValue(oldValue, value, 8, 0));
  }
  get RemainingEnteringTimeMinutes() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set RemainingEnteringTimeMinutes(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }
  get UserCount() {
    return GetByteValue(this.buffer.getUint8(5), 8, 0);
  }
  set UserCount(value: number) {
    const oldByte = this.buffer.getUint8(5);
    this.buffer.setUint8(5, SetByteValue(oldByte, value, 8, 0));
  }
  get RemainingEnteringTimeMinutesLow() {
    return GetByteValue(this.buffer.getUint8(6), 8, 0);
  }
  set RemainingEnteringTimeMinutesLow(value: number) {
    const oldByte = this.buffer.getUint8(6);
    this.buffer.setUint8(6, SetByteValue(oldByte, value, 8, 0));
  }
}
export enum UpdateMiniGameStateMiniGameTypeStateEnum {
    DevilSquareClosed = 0,
DevilSquareOpened = 1,
DevilSquareRunning = 2,
BloodCastleClosed = 3,
BloodCastleOpened = 4,
BloodCastleEnding = 5,
BloodCastleFinished = 6,
BloodCastleCongratulations = 7,
ChaosCastleClosed = 10,
ChaosCastleOpened = 11,
ChaosCastleEnding = 12,
ChaosCastleFinished = 13
  }export class UpdateMiniGameStatePacket {
  buffer!: DataView;
  static readonly Name = `UpdateMiniGameState`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `The state of a mini game event is about to change in 30 seconds.`;
  static readonly CausedReaction = `The client side shows a message about the changing state.`;
  static readonly Length = 4;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x92;

  static getRequiredSize(dataSize:number){
    return UpdateMiniGameStatePacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, UpdateMiniGameStatePacket.HeaderCode);
    b.setUint8(UpdateMiniGameStatePacket.DataOffset, UpdateMiniGameStatePacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = UpdateMiniGameStatePacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 4): UpdateMiniGameStatePacket {
    const p = new UpdateMiniGameStatePacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get State():UpdateMiniGameStateMiniGameTypeStateEnum{
    return GetByteValue(this.buffer.getUint8(3), 8, 0);
  }
  set State(value: UpdateMiniGameStateMiniGameTypeStateEnum){
    const oldValue = this.State;
    this.buffer.setUint8(3, SetByteValue(oldValue, value, 8, 0));
  }
}
export class MiniGameScoreTablePacket {
  buffer!: DataView;
  static readonly Name = `MiniGameScoreTable`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `A mini game ended and the score table is sent to the player.`;
  static readonly CausedReaction = `The score table is shown at the client.`;
  static readonly Length = undefined;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x93;

  static getRequiredSize(dataSize:number){
    return MiniGameScoreTablePacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, MiniGameScoreTablePacket.HeaderCode);
    b.setUint8(MiniGameScoreTablePacket.DataOffset, MiniGameScoreTablePacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = MiniGameScoreTablePacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  private _readString (from :number, to: number): string {
    return readWireString(this.buffer, from, to);
  }

  static createPacket(requiredSize: number): MiniGameScoreTablePacket {
    const p = new MiniGameScoreTablePacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get PlayerRank() {
    return GetByteValue(this.buffer.getUint8(3), 8, 0);
  }
  set PlayerRank(value: number) {
    const oldByte = this.buffer.getUint8(3);
    this.buffer.setUint8(3, SetByteValue(oldByte, value, 8, 0));
  }
  get ResultCount() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set ResultCount(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }

  getResults(count: number = this.ResultCount): {
  PlayerName: string;
  TotalScore: IntegerLittleEndian;
  BonusExperience: IntegerLittleEndian;
  BonusMoney: IntegerLittleEndian;

}[]{
    const b = this.buffer;
    let bi = 0;

    const Results_count = count;
    const Results: any[] = new Array(Results_count);
    
    let Results_StartOffset = bi + 5;
    for (let i = 0; i < Results_count; i++) {
      const PlayerName = this._readString(Results_StartOffset + 0, Results_StartOffset + 0 + 10);
      const TotalScore = b.getUint32(Results_StartOffset + 12, true);
      const BonusExperience = b.getUint32(Results_StartOffset + 16, true);
      const BonusMoney = b.getUint32(Results_StartOffset + 20, true);
      Results[i] = {
        PlayerName,
        TotalScore,
        BonusExperience,
        BonusMoney
      };
      Results_StartOffset += 24;
    }
    
    return Results;
  }}
export class BloodCastleScorePacket {
  buffer!: DataView;
  static readonly Name = `BloodCastleScore`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `The blood castle mini game ended and the score of the player is sent to the player.`;
  static readonly CausedReaction = `The score is shown at the client.`;
  static readonly Length = 29;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x93;

  static getRequiredSize(dataSize:number){
    return BloodCastleScorePacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, BloodCastleScorePacket.HeaderCode);
    b.setUint8(BloodCastleScorePacket.DataOffset, BloodCastleScorePacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = BloodCastleScorePacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  private _readString (from :number, to: number): string {
    return readWireString(this.buffer, from, to);
  }

  static createPacket(requiredSize: number = 29): BloodCastleScorePacket {
    const p = new BloodCastleScorePacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Success(){
    return GetBoolean(this.buffer.getUint8(3), 0);
  }
  set Success(value: boolean){
    const oldByte = this.buffer.getUint8(3);
    this.buffer.setUint8(3, SetBoolean(oldByte, value, 0));
  }
  get Type() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set Type(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
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
  get TotalScore(){
    return this.buffer.getUint32(17, true);
  }
  set TotalScore(value: number){
    this.buffer.setUint32(17, value, true);
  }
  get BonusExperience(){
    return this.buffer.getUint32(21, true);
  }
  set BonusExperience(value: number){
    this.buffer.setUint32(21, value, true);
  }
  get BonusMoney(){
    return this.buffer.getUint32(25, true);
  }
  set BonusMoney(value: number){
    this.buffer.setUint32(25, value, true);
  }
}
export enum BloodCastleEnterResultEnterResultEnum {
    Success = 0,
Failed = 1,
NotOpen = 2,
CharacterLevelTooHigh = 3,
CharacterLevelTooLow = 4,
Full = 5
  }export class BloodCastleEnterResultPacket {
  buffer!: DataView;
  static readonly Name = `BloodCastleEnterResult`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `The player requested to enter the blood castle mini game through the Archangel Messenger NPC.`;
  static readonly CausedReaction = `In case it failed, it shows the corresponding error message.`;
  static readonly Length = 4;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x9A;

  static getRequiredSize(dataSize:number){
    return BloodCastleEnterResultPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, BloodCastleEnterResultPacket.HeaderCode);
    b.setUint8(BloodCastleEnterResultPacket.DataOffset, BloodCastleEnterResultPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = BloodCastleEnterResultPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 4): BloodCastleEnterResultPacket {
    const p = new BloodCastleEnterResultPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Result():BloodCastleEnterResultEnterResultEnum{
    return GetByteValue(this.buffer.getUint8(3), 8, 0);
  }
  set Result(value: BloodCastleEnterResultEnterResultEnum){
    const oldValue = this.Result;
    this.buffer.setUint8(3, SetByteValue(oldValue, value, 8, 0));
  }
}
export enum BloodCastleStateStatusEnum {
    BloodCastleStarted = 0,
BloodCastleGateNotDestroyed = 1,
BloodCastleEnded = 2,
BloodCastleGateDestroyed = 4,
ChaosCastleStarted = 5,
ChaosCastleRunning = 6,
ChaosCastleEnded = 7,
ChaosCastleStageOne = 8,
ChaosCastleStageTwo = 9,
ChaosCastleStageThree = 10
  }export class BloodCastleStatePacket {
  buffer!: DataView;
  static readonly Name = `BloodCastleState`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `The state of a blood castle event is about to change.`;
  static readonly CausedReaction = `The client side shows a message about the changing state.`;
  static readonly Length = 13;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x9B;

  static getRequiredSize(dataSize:number){
    return BloodCastleStatePacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, BloodCastleStatePacket.HeaderCode);
    b.setUint8(BloodCastleStatePacket.DataOffset, BloodCastleStatePacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = BloodCastleStatePacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 13): BloodCastleStatePacket {
    const p = new BloodCastleStatePacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get State():BloodCastleStateStatusEnum{
    return GetByteValue(this.buffer.getUint8(3), 8, 0);
  }
  set State(value: BloodCastleStateStatusEnum){
    const oldValue = this.State;
    this.buffer.setUint8(3, SetByteValue(oldValue, value, 8, 0));
  }
  get RemainSecond(){
    return this.buffer.getUint16(4, true);
  }
  set RemainSecond(value: number){
    this.buffer.setUint16(4, value, true);
  }
  get MaxMonster(){
    return this.buffer.getUint16(6, true);
  }
  set MaxMonster(value: number){
    this.buffer.setUint16(6, value, true);
  }
  get CurMonster(){
    return this.buffer.getUint16(8, true);
  }
  set CurMonster(value: number){
    this.buffer.setUint16(8, value, true);
  }
  get ItemOwnerId(){
    return this.buffer.getUint16(10, true);
  }
  set ItemOwnerId(value: number){
    this.buffer.setUint16(10, value, true);
  }
  get ItemLevel() {
    return GetByteValue(this.buffer.getUint8(12), 8, 0);
  }
  set ItemLevel(value: number) {
    const oldByte = this.buffer.getUint8(12);
    this.buffer.setUint8(12, SetByteValue(oldByte, value, 8, 0));
  }
}
export enum ChaosCastleEnterResultEnterResultEnum {
    Success = 0,
Failed = 1,
NotOpen = 2,
Full = 5,
NotEnoughMoney = 7,
PlayerKillerCantEnter = 8
  }export class ChaosCastleEnterResultPacket {
  buffer!: DataView;
  static readonly Name = `ChaosCastleEnterResult`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `The player requested to enter the chaos castle mini game by using the 'Armor of Guardsman' item.`;
  static readonly CausedReaction = `In case it failed, it shows the corresponding error message.`;
  static readonly Length = 5;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xAF;
  static readonly SubCode = 0x01;

  static getRequiredSize(dataSize:number){
    return ChaosCastleEnterResultPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, ChaosCastleEnterResultPacket.HeaderCode);
    b.setUint8(ChaosCastleEnterResultPacket.DataOffset, ChaosCastleEnterResultPacket.Code);
  b.setUint8(ChaosCastleEnterResultPacket.DataOffset + 1, ChaosCastleEnterResultPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = ChaosCastleEnterResultPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 5): ChaosCastleEnterResultPacket {
    const p = new ChaosCastleEnterResultPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Result():ChaosCastleEnterResultEnterResultEnum{
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set Result(value: ChaosCastleEnterResultEnterResultEnum){
    const oldValue = this.Result;
    this.buffer.setUint8(4, SetByteValue(oldValue, value, 8, 0));
  }
}
export enum MapEventStateEventsEnum {
    RedDragon = 1,
GoldenDragon = 3
  }export class MapEventStatePacket {
  buffer!: DataView;
  static readonly Name = `MapEventState`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `The state of event is about to change.`;
  static readonly CausedReaction = `The event's effect is shown.`;
  static readonly Length = 5;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x0B;

  static getRequiredSize(dataSize:number){
    return MapEventStatePacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, MapEventStatePacket.HeaderCode);
    b.setUint8(MapEventStatePacket.DataOffset, MapEventStatePacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = MapEventStatePacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 5): MapEventStatePacket {
    const p = new MapEventStatePacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Enable(){
    return GetBoolean(this.buffer.getUint8(3), 0);
  }
  set Enable(value: boolean){
    const oldByte = this.buffer.getUint8(3);
    this.buffer.setUint8(3, SetBoolean(oldByte, value, 0));
  }
  get Event():MapEventStateEventsEnum{
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set Event(value: MapEventStateEventsEnum){
    const oldValue = this.Event;
    this.buffer.setUint8(4, SetByteValue(oldValue, value, 8, 0));
  }
}
export class AvailableChatCommandPacket {
  buffer!: DataView;
  static readonly Name = `AvailableChatCommand`;
  static readonly HeaderType = `C2HeaderWithSubCode`;
  static readonly HeaderCode = 0xC2;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `After the client requested the list of available chat commands. One message is sent for each command which is available to the player.`;
  static readonly CausedReaction = `The client adds the command to its list of known commands, so that it can offer them to the player without requiring him to know or type them.`;
  static readonly Length = undefined;
  static readonly LengthSize = 2;
  static readonly DataOffset = 3;
  static readonly Code = 0xF5;
  static readonly SubCode = 0x01;

  static getRequiredSize(dataSize:number){
    return AvailableChatCommandPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, AvailableChatCommandPacket.HeaderCode);
    b.setUint8(AvailableChatCommandPacket.DataOffset, AvailableChatCommandPacket.Code);
  b.setUint8(AvailableChatCommandPacket.DataOffset + 1, AvailableChatCommandPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = AvailableChatCommandPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint16(1, l);
    return this;
  }

  private _readString (from :number, to: number): string {
    return readWireString(this.buffer, from, to);
  }

  static createPacket(requiredSize: number): AvailableChatCommandPacket {
    const p = new AvailableChatCommandPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Index() {
    return GetByteValue(this.buffer.getUint8(5), 8, 0);
  }
  set Index(value: number) {
    const oldByte = this.buffer.getUint8(5);
    this.buffer.setUint8(5, SetByteValue(oldByte, value, 8, 0));
  }
  get Count() {
    return GetByteValue(this.buffer.getUint8(6), 8, 0);
  }
  set Count(value: number) {
    const oldByte = this.buffer.getUint8(6);
    this.buffer.setUint8(6, SetByteValue(oldByte, value, 8, 0));
  }
  get MinimumCharacterStatus():CharacterStatusEnum{
    return GetByteValue(this.buffer.getUint8(7), 8, 0);
  }
  set MinimumCharacterStatus(value: CharacterStatusEnum){
    const oldValue = this.MinimumCharacterStatus;
    this.buffer.setUint8(7, SetByteValue(oldValue, value, 8, 0));
  }
  get ParameterCount() {
    return GetByteValue(this.buffer.getUint8(8), 8, 0);
  }
  set ParameterCount(value: number) {
    const oldByte = this.buffer.getUint8(8);
    this.buffer.setUint8(8, SetByteValue(oldByte, value, 8, 0));
  }
  get Command(){
    const to = 41;
              
    return this._readString(9, to);
  }
  setCommand(str: string, count = 32){
    const from = 9;
    for(let i = 0; i < str.length; i++){
      const char = str.charCodeAt(i);
      this.buffer.setUint8(from + i, char);
    }
}
  get Name(){
    const to = 89;
              
    return this._readString(41, to);
  }
  setName(str: string, count = 48){
    const from = 41;
    for(let i = 0; i < str.length; i++){
      const char = str.charCodeAt(i);
      this.buffer.setUint8(from + i, char);
    }
}
  get Description(){
    const to = 345;
              
    return this._readString(89, to);
  }
  setDescription(str: string, count = 256){
    const from = 89;
    for(let i = 0; i < str.length; i++){
      const char = str.charCodeAt(i);
      this.buffer.setUint8(from + i, char);
    }
}

  getParameters(count: number = this.ParameterCount): {
  IsRequired: Boolean;
  Type: ChatCommandParameterTypeEnum;
  Name: string;
  ShortName: string;
  ValidValues: string;

}[]{
    const b = this.buffer;
    let bi = 0;

    const Parameters_count = count;
    const Parameters: any[] = new Array(Parameters_count);
    
    let Parameters_StartOffset = bi + 345;
    for (let i = 0; i < Parameters_count; i++) {
      const IsRequired = GetBoolean(b.getUint8(Parameters_StartOffset + 0), 0);
      const Type = GetByteValue(b.getUint8(Parameters_StartOffset + 1), 8, 0);
      const Name = this._readString(Parameters_StartOffset + 2, Parameters_StartOffset + 2 + 32);
      const ShortName = this._readString(Parameters_StartOffset + 34, Parameters_StartOffset + 34 + 20);
      const ValidValues = this._readString(Parameters_StartOffset + 54, Parameters_StartOffset + 54 + 48);
      Parameters[i] = {
        IsRequired,
        Type,
        Name,
        ShortName,
        ValidValues
      };
      Parameters_StartOffset += 102;
    }
    
    return Parameters;
  }}
export class EventChipRegistrationResultPacket {
  buffer!: DataView;
  static readonly Name = `EventChipRegistrationResult`;
  static readonly HeaderType = `C1Header`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `The player receives the result of registering Rena or Event Chips at the Golden Archer NPC.`;
  static readonly CausedReaction = `The client updates the Golden Archer interface with total registered count and remaining count in inventory.`;
  static readonly Length = 10;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0x94;

  static getRequiredSize(dataSize:number){
    return EventChipRegistrationResultPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, EventChipRegistrationResultPacket.HeaderCode);
    b.setUint8(EventChipRegistrationResultPacket.DataOffset, EventChipRegistrationResultPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = EventChipRegistrationResultPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 10): EventChipRegistrationResultPacket {
    const p = new EventChipRegistrationResultPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Result() {
    return GetByteValue(this.buffer.getUint8(3), 8, 0);
  }
  set Result(value: number) {
    const oldByte = this.buffer.getUint8(3);
    this.buffer.setUint8(3, SetByteValue(oldByte, value, 8, 0));
  }
  get RegisteredCount(){
    return this.buffer.getUint32(4, true);
  }
  set RegisteredCount(value: number){
    this.buffer.setUint32(4, value, true);
  }
  get RemainingInventoryCount(){
    return this.buffer.getUint16(8, true);
  }
  set RemainingInventoryCount(value: number){
    this.buffer.setUint16(8, value, true);
  }
}
export class CastleSiegeStatusResponsePacket {
  buffer!: DataView;
  static readonly Name = `CastleSiegeStatusResponse`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `After the player requested the current castle siege status from a castle siege npc.`;
  static readonly CausedReaction = `The client shows the castle siege status.`;
  static readonly Length = 46;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xB2;
  static readonly SubCode = 0x00;

  static getRequiredSize(dataSize:number){
    return CastleSiegeStatusResponsePacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, CastleSiegeStatusResponsePacket.HeaderCode);
    b.setUint8(CastleSiegeStatusResponsePacket.DataOffset, CastleSiegeStatusResponsePacket.Code);
  b.setUint8(CastleSiegeStatusResponsePacket.DataOffset + 1, CastleSiegeStatusResponsePacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = CastleSiegeStatusResponsePacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  private _readString (from :number, to: number): string {
    return readWireString(this.buffer, from, to);
  }

  static createPacket(requiredSize: number = 46): CastleSiegeStatusResponsePacket {
    const p = new CastleSiegeStatusResponsePacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Result() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set Result(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }
  get State():CastleSiegeStateEnum{
    return GetByteValue(this.buffer.getUint8(5), 8, 0);
  }
  set State(value: CastleSiegeStateEnum){
    const oldValue = this.State;
    this.buffer.setUint8(5, SetByteValue(oldValue, value, 8, 0));
  }
  get StartYear(){
    return this.buffer.getUint16(6, false);
  }
  set StartYear(value: number){
    this.buffer.setUint16(6, value, false);
  }
  get StartMonth() {
    return GetByteValue(this.buffer.getUint8(8), 8, 0);
  }
  set StartMonth(value: number) {
    const oldByte = this.buffer.getUint8(8);
    this.buffer.setUint8(8, SetByteValue(oldByte, value, 8, 0));
  }
  get StartDay() {
    return GetByteValue(this.buffer.getUint8(9), 8, 0);
  }
  set StartDay(value: number) {
    const oldByte = this.buffer.getUint8(9);
    this.buffer.setUint8(9, SetByteValue(oldByte, value, 8, 0));
  }
  get StartHour() {
    return GetByteValue(this.buffer.getUint8(10), 8, 0);
  }
  set StartHour(value: number) {
    const oldByte = this.buffer.getUint8(10);
    this.buffer.setUint8(10, SetByteValue(oldByte, value, 8, 0));
  }
  get StartMinute() {
    return GetByteValue(this.buffer.getUint8(11), 8, 0);
  }
  set StartMinute(value: number) {
    const oldByte = this.buffer.getUint8(11);
    this.buffer.setUint8(11, SetByteValue(oldByte, value, 8, 0));
  }
  get EndYear(){
    return this.buffer.getUint16(12, false);
  }
  set EndYear(value: number){
    this.buffer.setUint16(12, value, false);
  }
  get EndMonth() {
    return GetByteValue(this.buffer.getUint8(14), 8, 0);
  }
  set EndMonth(value: number) {
    const oldByte = this.buffer.getUint8(14);
    this.buffer.setUint8(14, SetByteValue(oldByte, value, 8, 0));
  }
  get EndDay() {
    return GetByteValue(this.buffer.getUint8(15), 8, 0);
  }
  set EndDay(value: number) {
    const oldByte = this.buffer.getUint8(15);
    this.buffer.setUint8(15, SetByteValue(oldByte, value, 8, 0));
  }
  get EndHour() {
    return GetByteValue(this.buffer.getUint8(16), 8, 0);
  }
  set EndHour(value: number) {
    const oldByte = this.buffer.getUint8(16);
    this.buffer.setUint8(16, SetByteValue(oldByte, value, 8, 0));
  }
  get EndMinute() {
    return GetByteValue(this.buffer.getUint8(17), 8, 0);
  }
  set EndMinute(value: number) {
    const oldByte = this.buffer.getUint8(17);
    this.buffer.setUint8(17, SetByteValue(oldByte, value, 8, 0));
  }
  get SiegeStartYear(){
    return this.buffer.getUint16(18, false);
  }
  set SiegeStartYear(value: number){
    this.buffer.setUint16(18, value, false);
  }
  get SiegeStartMonth() {
    return GetByteValue(this.buffer.getUint8(20), 8, 0);
  }
  set SiegeStartMonth(value: number) {
    const oldByte = this.buffer.getUint8(20);
    this.buffer.setUint8(20, SetByteValue(oldByte, value, 8, 0));
  }
  get SiegeStartDay() {
    return GetByteValue(this.buffer.getUint8(21), 8, 0);
  }
  set SiegeStartDay(value: number) {
    const oldByte = this.buffer.getUint8(21);
    this.buffer.setUint8(21, SetByteValue(oldByte, value, 8, 0));
  }
  get SiegeStartHour() {
    return GetByteValue(this.buffer.getUint8(22), 8, 0);
  }
  set SiegeStartHour(value: number) {
    const oldByte = this.buffer.getUint8(22);
    this.buffer.setUint8(22, SetByteValue(oldByte, value, 8, 0));
  }
  get SiegeStartMinute() {
    return GetByteValue(this.buffer.getUint8(23), 8, 0);
  }
  set SiegeStartMinute(value: number) {
    const oldByte = this.buffer.getUint8(23);
    this.buffer.setUint8(23, SetByteValue(oldByte, value, 8, 0));
  }
  get GuildName(){
    const to = 32;
              
    return this._readString(24, to);
  }
  setGuildName(str: string, count = 8){
    const from = 24;
    for(let i = 0; i < str.length; i++){
      const char = str.charCodeAt(i);
      this.buffer.setUint8(from + i, char);
    }
}
  get GuildMasterName(){
    const to = 42;
              
    return this._readString(32, to);
  }
  setGuildMasterName(str: string, count = 10){
    const from = 32;
    for(let i = 0; i < str.length; i++){
      const char = str.charCodeAt(i);
      this.buffer.setUint8(from + i, char);
    }
}
  get RemainingTime(){
    return this.buffer.getUint32(42, false);
  }
  set RemainingTime(value: number){
    this.buffer.setUint32(42, value, false);
  }
}
export class CastleSiegeRegistrationResponsePacket {
  buffer!: DataView;
  static readonly Name = `CastleSiegeRegistrationResponse`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `After the player requested to register his guild for the next castle siege.`;
  static readonly CausedReaction = `The client shows the result of the registration attempt.`;
  static readonly Length = 13;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xB2;
  static readonly SubCode = 0x01;

  static getRequiredSize(dataSize:number){
    return CastleSiegeRegistrationResponsePacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, CastleSiegeRegistrationResponsePacket.HeaderCode);
    b.setUint8(CastleSiegeRegistrationResponsePacket.DataOffset, CastleSiegeRegistrationResponsePacket.Code);
  b.setUint8(CastleSiegeRegistrationResponsePacket.DataOffset + 1, CastleSiegeRegistrationResponsePacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = CastleSiegeRegistrationResponsePacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  private _readString (from :number, to: number): string {
    return readWireString(this.buffer, from, to);
  }

  static createPacket(requiredSize: number = 13): CastleSiegeRegistrationResponsePacket {
    const p = new CastleSiegeRegistrationResponsePacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Result() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set Result(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }
  get GuildName(){
    const to = 13;
              
    return this._readString(5, to);
  }
  setGuildName(str: string, count = 8){
    const from = 5;
    for(let i = 0; i < str.length; i++){
      const char = str.charCodeAt(i);
      this.buffer.setUint8(from + i, char);
    }
}
}
export class CastleSiegeUnregisterResponsePacket {
  buffer!: DataView;
  static readonly Name = `CastleSiegeUnregisterResponse`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `After the player requested to un-register his guild from the next castle siege.`;
  static readonly CausedReaction = `The client shows the result of the un-registration attempt.`;
  static readonly Length = 14;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xB2;
  static readonly SubCode = 0x02;

  static getRequiredSize(dataSize:number){
    return CastleSiegeUnregisterResponsePacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, CastleSiegeUnregisterResponsePacket.HeaderCode);
    b.setUint8(CastleSiegeUnregisterResponsePacket.DataOffset, CastleSiegeUnregisterResponsePacket.Code);
  b.setUint8(CastleSiegeUnregisterResponsePacket.DataOffset + 1, CastleSiegeUnregisterResponsePacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = CastleSiegeUnregisterResponsePacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  private _readString (from :number, to: number): string {
    return readWireString(this.buffer, from, to);
  }

  static createPacket(requiredSize: number = 14): CastleSiegeUnregisterResponsePacket {
    const p = new CastleSiegeUnregisterResponsePacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Result() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set Result(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }
  get IsGivingUp(){
    return GetBoolean(this.buffer.getUint8(5), 0);
  }
  set IsGivingUp(value: boolean){
    const oldByte = this.buffer.getUint8(5);
    this.buffer.setUint8(5, SetBoolean(oldByte, value, 0));
  }
  get GuildName(){
    const to = 14;
              
    return this._readString(6, to);
  }
  setGuildName(str: string, count = 8){
    const from = 6;
    for(let i = 0; i < str.length; i++){
      const char = str.charCodeAt(i);
      this.buffer.setUint8(from + i, char);
    }
}
}
export class CastleSiegeRegistrationStateResponsePacket {
  buffer!: DataView;
  static readonly Name = `CastleSiegeRegistrationStateResponse`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `After the player requested the current registration state of his guild.`;
  static readonly CausedReaction = `The client shows the current registration state including the number of submitted guild marks.`;
  static readonly Length = 19;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xB2;
  static readonly SubCode = 0x03;

  static getRequiredSize(dataSize:number){
    return CastleSiegeRegistrationStateResponsePacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, CastleSiegeRegistrationStateResponsePacket.HeaderCode);
    b.setUint8(CastleSiegeRegistrationStateResponsePacket.DataOffset, CastleSiegeRegistrationStateResponsePacket.Code);
  b.setUint8(CastleSiegeRegistrationStateResponsePacket.DataOffset + 1, CastleSiegeRegistrationStateResponsePacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = CastleSiegeRegistrationStateResponsePacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  private _readString (from :number, to: number): string {
    return readWireString(this.buffer, from, to);
  }

  static createPacket(requiredSize: number = 19): CastleSiegeRegistrationStateResponsePacket {
    const p = new CastleSiegeRegistrationStateResponsePacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Result() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set Result(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }
  get GuildName(){
    const to = 13;
              
    return this._readString(5, to);
  }
  setGuildName(str: string, count = 8){
    const from = 5;
    for(let i = 0; i < str.length; i++){
      const char = str.charCodeAt(i);
      this.buffer.setUint8(from + i, char);
    }
}
  get GuildMarkCount(){
    return this.buffer.getUint32(13, false);
  }
  set GuildMarkCount(value: number){
    this.buffer.setUint32(13, value, false);
  }
  get IsGivingUp(){
    return GetBoolean(this.buffer.getUint8(17), 0);
  }
  set IsGivingUp(value: boolean){
    const oldByte = this.buffer.getUint8(17);
    this.buffer.setUint8(17, SetBoolean(oldByte, value, 0));
  }
  get RegistrationRank() {
    return GetByteValue(this.buffer.getUint8(18), 8, 0);
  }
  set RegistrationRank(value: number) {
    const oldByte = this.buffer.getUint8(18);
    this.buffer.setUint8(18, SetByteValue(oldByte, value, 8, 0));
  }
}
export class CastleSiegeMarkRegistrationResponsePacket {
  buffer!: DataView;
  static readonly Name = `CastleSiegeMarkRegistrationResponse`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `After the player submitted a guild mark for the castle siege registration.`;
  static readonly CausedReaction = `The client shows the updated guild mark count.`;
  static readonly Length = 17;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xB2;
  static readonly SubCode = 0x04;

  static getRequiredSize(dataSize:number){
    return CastleSiegeMarkRegistrationResponsePacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, CastleSiegeMarkRegistrationResponsePacket.HeaderCode);
    b.setUint8(CastleSiegeMarkRegistrationResponsePacket.DataOffset, CastleSiegeMarkRegistrationResponsePacket.Code);
  b.setUint8(CastleSiegeMarkRegistrationResponsePacket.DataOffset + 1, CastleSiegeMarkRegistrationResponsePacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = CastleSiegeMarkRegistrationResponsePacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  private _readString (from :number, to: number): string {
    return readWireString(this.buffer, from, to);
  }

  static createPacket(requiredSize: number = 17): CastleSiegeMarkRegistrationResponsePacket {
    const p = new CastleSiegeMarkRegistrationResponsePacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Result() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set Result(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }
  get GuildName(){
    const to = 13;
              
    return this._readString(5, to);
  }
  setGuildName(str: string, count = 8){
    const from = 5;
    for(let i = 0; i < str.length; i++){
      const char = str.charCodeAt(i);
      this.buffer.setUint8(from + i, char);
    }
}
  get GuildMarkCount(){
    return this.buffer.getUint32(13, false);
  }
  set GuildMarkCount(value: number){
    this.buffer.setUint32(13, value, false);
  }
}
export class CastleSiegeDefenseBuyResponsePacket {
  buffer!: DataView;
  static readonly Name = `CastleSiegeDefenseBuyResponse`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `After the player requested to buy a castle siege defense structure (gate or statue).`;
  static readonly CausedReaction = `The client shows the result of the buy request.`;
  static readonly Length = 13;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xB2;
  static readonly SubCode = 0x05;

  static getRequiredSize(dataSize:number){
    return CastleSiegeDefenseBuyResponsePacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, CastleSiegeDefenseBuyResponsePacket.HeaderCode);
    b.setUint8(CastleSiegeDefenseBuyResponsePacket.DataOffset, CastleSiegeDefenseBuyResponsePacket.Code);
  b.setUint8(CastleSiegeDefenseBuyResponsePacket.DataOffset + 1, CastleSiegeDefenseBuyResponsePacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = CastleSiegeDefenseBuyResponsePacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 13): CastleSiegeDefenseBuyResponsePacket {
    const p = new CastleSiegeDefenseBuyResponsePacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Result() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set Result(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }
  get NpcNumber(){
    return this.buffer.getUint32(5, true);
  }
  set NpcNumber(value: number){
    this.buffer.setUint32(5, value, true);
  }
  get NpcIndex(){
    return this.buffer.getUint32(9, true);
  }
  set NpcIndex(value: number){
    this.buffer.setUint32(9, value, true);
  }
}
export class CastleSiegeDefenseRepairResponsePacket {
  buffer!: DataView;
  static readonly Name = `CastleSiegeDefenseRepairResponse`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `After the player requested to repair a castle siege defense structure (gate or statue).`;
  static readonly CausedReaction = `The client shows the result of the repair request.`;
  static readonly Length = 21;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xB2;
  static readonly SubCode = 0x06;

  static getRequiredSize(dataSize:number){
    return CastleSiegeDefenseRepairResponsePacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, CastleSiegeDefenseRepairResponsePacket.HeaderCode);
    b.setUint8(CastleSiegeDefenseRepairResponsePacket.DataOffset, CastleSiegeDefenseRepairResponsePacket.Code);
  b.setUint8(CastleSiegeDefenseRepairResponsePacket.DataOffset + 1, CastleSiegeDefenseRepairResponsePacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = CastleSiegeDefenseRepairResponsePacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 21): CastleSiegeDefenseRepairResponsePacket {
    const p = new CastleSiegeDefenseRepairResponsePacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Result() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set Result(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }
  get NpcNumber(){
    return this.buffer.getUint32(5, true);
  }
  set NpcNumber(value: number){
    this.buffer.setUint32(5, value, true);
  }
  get NpcIndex(){
    return this.buffer.getUint32(9, true);
  }
  set NpcIndex(value: number){
    this.buffer.setUint32(9, value, true);
  }
  get CurrentHp(){
    return this.buffer.getUint32(13, true);
  }
  set CurrentHp(value: number){
    this.buffer.setUint32(13, value, true);
  }
  get MaxHp(){
    return this.buffer.getUint32(17, true);
  }
  set MaxHp(value: number){
    this.buffer.setUint32(17, value, true);
  }
}
export class CastleSiegeDefenseUpgradeResponsePacket {
  buffer!: DataView;
  static readonly Name = `CastleSiegeDefenseUpgradeResponse`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `After the player requested to upgrade a castle siege defense structure (gate or statue).`;
  static readonly CausedReaction = `The client shows the result of the upgrade request and the new upgrade values.`;
  static readonly Length = 21;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xB2;
  static readonly SubCode = 0x07;

  static getRequiredSize(dataSize:number){
    return CastleSiegeDefenseUpgradeResponsePacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, CastleSiegeDefenseUpgradeResponsePacket.HeaderCode);
    b.setUint8(CastleSiegeDefenseUpgradeResponsePacket.DataOffset, CastleSiegeDefenseUpgradeResponsePacket.Code);
  b.setUint8(CastleSiegeDefenseUpgradeResponsePacket.DataOffset + 1, CastleSiegeDefenseUpgradeResponsePacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = CastleSiegeDefenseUpgradeResponsePacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 21): CastleSiegeDefenseUpgradeResponsePacket {
    const p = new CastleSiegeDefenseUpgradeResponsePacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Result() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set Result(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }
  get NpcNumber(){
    return this.buffer.getUint32(5, true);
  }
  set NpcNumber(value: number){
    this.buffer.setUint32(5, value, true);
  }
  get NpcIndex(){
    return this.buffer.getUint32(9, true);
  }
  set NpcIndex(value: number){
    this.buffer.setUint32(9, value, true);
  }
  get NpcUpgradeType(){
    return this.buffer.getUint32(13, true);
  }
  set NpcUpgradeType(value: number){
    this.buffer.setUint32(13, value, true);
  }
  get NpcUpgradeValue(){
    return this.buffer.getUint32(17, true);
  }
  set NpcUpgradeValue(value: number){
    this.buffer.setUint32(17, value, true);
  }
}
export class CastleSiegeTaxInfoResponsePacket {
  buffer!: DataView;
  static readonly Name = `CastleSiegeTaxInfoResponse`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `After the guild master opened the castle npc to manage the castle taxes.`;
  static readonly CausedReaction = `The client shows the current tax configuration and treasury amount.`;
  static readonly Length = 15;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xB2;
  static readonly SubCode = 0x08;

  static getRequiredSize(dataSize:number){
    return CastleSiegeTaxInfoResponsePacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, CastleSiegeTaxInfoResponsePacket.HeaderCode);
    b.setUint8(CastleSiegeTaxInfoResponsePacket.DataOffset, CastleSiegeTaxInfoResponsePacket.Code);
  b.setUint8(CastleSiegeTaxInfoResponsePacket.DataOffset + 1, CastleSiegeTaxInfoResponsePacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = CastleSiegeTaxInfoResponsePacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 15): CastleSiegeTaxInfoResponsePacket {
    const p = new CastleSiegeTaxInfoResponsePacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Result() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set Result(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }
  get TaxRateChaosMachine() {
    return GetByteValue(this.buffer.getUint8(5), 8, 0);
  }
  set TaxRateChaosMachine(value: number) {
    const oldByte = this.buffer.getUint8(5);
    this.buffer.setUint8(5, SetByteValue(oldByte, value, 8, 0));
  }
  get TaxRateNormal() {
    return GetByteValue(this.buffer.getUint8(6), 8, 0);
  }
  set TaxRateNormal(value: number) {
    const oldByte = this.buffer.getUint8(6);
    this.buffer.setUint8(6, SetByteValue(oldByte, value, 8, 0));
  }
  get Treasury(){
    return this.buffer.getBigUint64(7, false);
  }
  set Treasury(value: bigint){
    this.buffer.setBigUint64(7, value, false);
  }
}
export class CastleSiegeTaxChangeResponsePacket {
  buffer!: DataView;
  static readonly Name = `CastleSiegeTaxChangeResponse`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `After the guild master changed the tax rate.`;
  static readonly CausedReaction = `The client shows the result of the tax rate change.`;
  static readonly Length = 10;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xB2;
  static readonly SubCode = 0x09;

  static getRequiredSize(dataSize:number){
    return CastleSiegeTaxChangeResponsePacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, CastleSiegeTaxChangeResponsePacket.HeaderCode);
    b.setUint8(CastleSiegeTaxChangeResponsePacket.DataOffset, CastleSiegeTaxChangeResponsePacket.Code);
  b.setUint8(CastleSiegeTaxChangeResponsePacket.DataOffset + 1, CastleSiegeTaxChangeResponsePacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = CastleSiegeTaxChangeResponsePacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 10): CastleSiegeTaxChangeResponsePacket {
    const p = new CastleSiegeTaxChangeResponsePacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Result() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set Result(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }
  get TaxType():CastleSiegeTaxTypeEnum{
    return GetByteValue(this.buffer.getUint8(5), 8, 0);
  }
  set TaxType(value: CastleSiegeTaxTypeEnum){
    const oldValue = this.TaxType;
    this.buffer.setUint8(5, SetByteValue(oldValue, value, 8, 0));
  }
  get TaxValue(){
    return this.buffer.getUint32(6, false);
  }
  set TaxValue(value: number){
    this.buffer.setUint32(6, value, false);
  }
}
export class CastleSiegeTributeWithdrawResponsePacket {
  buffer!: DataView;
  static readonly Name = `CastleSiegeTributeWithdrawResponse`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `After the guild master requested to withdraw tax money from the castle treasury.`;
  static readonly CausedReaction = `The client shows the result of the withdrawal and the withdrawn amount.`;
  static readonly Length = 13;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xB2;
  static readonly SubCode = 0x10;

  static getRequiredSize(dataSize:number){
    return CastleSiegeTributeWithdrawResponsePacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, CastleSiegeTributeWithdrawResponsePacket.HeaderCode);
    b.setUint8(CastleSiegeTributeWithdrawResponsePacket.DataOffset, CastleSiegeTributeWithdrawResponsePacket.Code);
  b.setUint8(CastleSiegeTributeWithdrawResponsePacket.DataOffset + 1, CastleSiegeTributeWithdrawResponsePacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = CastleSiegeTributeWithdrawResponsePacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 13): CastleSiegeTributeWithdrawResponsePacket {
    const p = new CastleSiegeTributeWithdrawResponsePacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Result() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set Result(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }
  get Money(){
    return this.buffer.getBigUint64(5, false);
  }
  set Money(value: bigint){
    this.buffer.setBigUint64(5, value, false);
  }
}
export class CastleSiegeGateInterfaceResponsePacket {
  buffer!: DataView;
  static readonly Name = `CastleSiegeGateInterfaceResponse`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `After a player talks to the lever of a castle gate.`;
  static readonly CausedReaction = `The client opens the gate operation interface when access is allowed.`;
  static readonly Length = 7;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xB2;
  static readonly SubCode = 0x11;

  static getRequiredSize(dataSize:number){
    return CastleSiegeGateInterfaceResponsePacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, CastleSiegeGateInterfaceResponsePacket.HeaderCode);
    b.setUint8(CastleSiegeGateInterfaceResponsePacket.DataOffset, CastleSiegeGateInterfaceResponsePacket.Code);
  b.setUint8(CastleSiegeGateInterfaceResponsePacket.DataOffset + 1, CastleSiegeGateInterfaceResponsePacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = CastleSiegeGateInterfaceResponsePacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 7): CastleSiegeGateInterfaceResponsePacket {
    const p = new CastleSiegeGateInterfaceResponsePacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Result() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set Result(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }
  get GateIndex(){
    return this.buffer.getUint16(5, false);
  }
  set GateIndex(value: number){
    this.buffer.setUint16(5, value, false);
  }
}
export class CastleSiegeGateOperateResponsePacket {
  buffer!: DataView;
  static readonly Name = `CastleSiegeGateOperateResponse`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `After a guild member of the castle owner requested to toggle a castle gate.`;
  static readonly CausedReaction = `The client shows the result of the gate toggle operation.`;
  static readonly Length = 8;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xB2;
  static readonly SubCode = 0x12;

  static getRequiredSize(dataSize:number){
    return CastleSiegeGateOperateResponsePacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, CastleSiegeGateOperateResponsePacket.HeaderCode);
    b.setUint8(CastleSiegeGateOperateResponsePacket.DataOffset, CastleSiegeGateOperateResponsePacket.Code);
  b.setUint8(CastleSiegeGateOperateResponsePacket.DataOffset + 1, CastleSiegeGateOperateResponsePacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = CastleSiegeGateOperateResponsePacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 8): CastleSiegeGateOperateResponsePacket {
    const p = new CastleSiegeGateOperateResponsePacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Result() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set Result(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }
  get IsOpen(){
    return GetBoolean(this.buffer.getUint8(5), 0);
  }
  set IsOpen(value: boolean){
    const oldByte = this.buffer.getUint8(5);
    this.buffer.setUint8(5, SetBoolean(oldByte, value, 0));
  }
  get GateIndex(){
    return this.buffer.getUint16(6, false);
  }
  set GateIndex(value: number){
    this.buffer.setUint16(6, value, false);
  }
}
export class CastleSiegeGateStateNotificationPacket {
  buffer!: DataView;
  static readonly Name = `CastleSiegeGateStateNotification`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `A castle gate is opened or closed.`;
  static readonly CausedReaction = `The client updates the castle gate animation and collision state.`;
  static readonly Length = 7;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xB2;
  static readonly SubCode = 0x13;

  static getRequiredSize(dataSize:number){
    return CastleSiegeGateStateNotificationPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, CastleSiegeGateStateNotificationPacket.HeaderCode);
    b.setUint8(CastleSiegeGateStateNotificationPacket.DataOffset, CastleSiegeGateStateNotificationPacket.Code);
  b.setUint8(CastleSiegeGateStateNotificationPacket.DataOffset + 1, CastleSiegeGateStateNotificationPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = CastleSiegeGateStateNotificationPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 7): CastleSiegeGateStateNotificationPacket {
    const p = new CastleSiegeGateStateNotificationPacket();
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
  get GateIndex(){
    return this.buffer.getUint16(5, false);
  }
  set GateIndex(value: number){
    this.buffer.setUint16(5, value, false);
  }
}
export class CastleSiegeCrownSwitchStatePacket {
  buffer!: DataView;
  static readonly Name = `CastleSiegeCrownSwitchState`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `A player starts or stops occupying a castle crown switch.`;
  static readonly CausedReaction = `The client updates the crown switch interaction state.`;
  static readonly Length = 9;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xB2;
  static readonly SubCode = 0x14;

  static getRequiredSize(dataSize:number){
    return CastleSiegeCrownSwitchStatePacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, CastleSiegeCrownSwitchStatePacket.HeaderCode);
    b.setUint8(CastleSiegeCrownSwitchStatePacket.DataOffset, CastleSiegeCrownSwitchStatePacket.Code);
  b.setUint8(CastleSiegeCrownSwitchStatePacket.DataOffset + 1, CastleSiegeCrownSwitchStatePacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = CastleSiegeCrownSwitchStatePacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 9): CastleSiegeCrownSwitchStatePacket {
    const p = new CastleSiegeCrownSwitchStatePacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get SwitchIndex(){
    return this.buffer.getUint16(4, false);
  }
  set SwitchIndex(value: number){
    this.buffer.setUint16(4, value, false);
  }
  get PlayerIndex(){
    return this.buffer.getUint16(6, false);
  }
  set PlayerIndex(value: number){
    this.buffer.setUint16(6, value, false);
  }
  get State():CastleSiegeCrownSwitchStateTypeEnum{
    return GetByteValue(this.buffer.getUint8(8), 8, 0);
  }
  set State(value: CastleSiegeCrownSwitchStateTypeEnum){
    const oldValue = this.State;
    this.buffer.setUint8(8, SetByteValue(oldValue, value, 8, 0));
  }
}
export class CastleSiegeCrownAccessStatePacket {
  buffer!: DataView;
  static readonly Name = `CastleSiegeCrownAccessState`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `The server updates the access state of the castle crown during the siege.`;
  static readonly CausedReaction = `The client updates the crown access state and accumulated time display.`;
  static readonly Length = 9;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xB2;
  static readonly SubCode = 0x15;

  static getRequiredSize(dataSize:number){
    return CastleSiegeCrownAccessStatePacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, CastleSiegeCrownAccessStatePacket.HeaderCode);
    b.setUint8(CastleSiegeCrownAccessStatePacket.DataOffset, CastleSiegeCrownAccessStatePacket.Code);
  b.setUint8(CastleSiegeCrownAccessStatePacket.DataOffset + 1, CastleSiegeCrownAccessStatePacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = CastleSiegeCrownAccessStatePacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 9): CastleSiegeCrownAccessStatePacket {
    const p = new CastleSiegeCrownAccessStatePacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get State():CastleSiegeCrownAccessStateTypeEnum{
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set State(value: CastleSiegeCrownAccessStateTypeEnum){
    const oldValue = this.State;
    this.buffer.setUint8(4, SetByteValue(oldValue, value, 8, 0));
  }
  get AccumulatedTimeMs(){
    return this.buffer.getUint32(5, true);
  }
  set AccumulatedTimeMs(value: number){
    this.buffer.setUint32(5, value, true);
  }
}
export class CastleSiegeCrownStateUpdatePacket {
  buffer!: DataView;
  static readonly Name = `CastleSiegeCrownStateUpdate`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `The server updates the state of the castle crown during the siege.`;
  static readonly CausedReaction = `The client updates the crown state display.`;
  static readonly Length = 5;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xB2;
  static readonly SubCode = 0x16;

  static getRequiredSize(dataSize:number){
    return CastleSiegeCrownStateUpdatePacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, CastleSiegeCrownStateUpdatePacket.HeaderCode);
    b.setUint8(CastleSiegeCrownStateUpdatePacket.DataOffset, CastleSiegeCrownStateUpdatePacket.Code);
  b.setUint8(CastleSiegeCrownStateUpdatePacket.DataOffset + 1, CastleSiegeCrownStateUpdatePacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = CastleSiegeCrownStateUpdatePacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 5): CastleSiegeCrownStateUpdatePacket {
    const p = new CastleSiegeCrownStateUpdatePacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get State():CastleSiegeCrownStateEnum{
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set State(value: CastleSiegeCrownStateEnum){
    const oldValue = this.State;
    this.buffer.setUint8(4, SetByteValue(oldValue, value, 8, 0));
  }
}
export class CastleSiegeBattleStartEndPacket {
  buffer!: DataView;
  static readonly Name = `CastleSiegeBattleStartEnd`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `The server notifies all players that the castle siege battle has started or ended.`;
  static readonly CausedReaction = `The client updates the siege state accordingly.`;
  static readonly Length = 5;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xB2;
  static readonly SubCode = 0x17;

  static getRequiredSize(dataSize:number){
    return CastleSiegeBattleStartEndPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, CastleSiegeBattleStartEndPacket.HeaderCode);
    b.setUint8(CastleSiegeBattleStartEndPacket.DataOffset, CastleSiegeBattleStartEndPacket.Code);
  b.setUint8(CastleSiegeBattleStartEndPacket.DataOffset + 1, CastleSiegeBattleStartEndPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = CastleSiegeBattleStartEndPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 5): CastleSiegeBattleStartEndPacket {
    const p = new CastleSiegeBattleStartEndPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get IsStarted(){
    return GetBoolean(this.buffer.getUint8(4), 0);
  }
  set IsStarted(value: boolean){
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetBoolean(oldByte, value, 0));
  }
}
export class CastleSiegeBattleProcessPacket {
  buffer!: DataView;
  static readonly Name = `CastleSiegeBattleProcess`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `A guild starts accessing the crown or successfully takes ownership of the castle.`;
  static readonly CausedReaction = `The client announces the crown access or castle ownership change.`;
  static readonly Length = 13;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xB2;
  static readonly SubCode = 0x18;

  static getRequiredSize(dataSize:number){
    return CastleSiegeBattleProcessPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, CastleSiegeBattleProcessPacket.HeaderCode);
    b.setUint8(CastleSiegeBattleProcessPacket.DataOffset, CastleSiegeBattleProcessPacket.Code);
  b.setUint8(CastleSiegeBattleProcessPacket.DataOffset + 1, CastleSiegeBattleProcessPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = CastleSiegeBattleProcessPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  private _readString (from :number, to: number): string {
    return readWireString(this.buffer, from, to);
  }

  static createPacket(requiredSize: number = 13): CastleSiegeBattleProcessPacket {
    const p = new CastleSiegeBattleProcessPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get State():CastleSiegeBattleProcessStateEnum{
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set State(value: CastleSiegeBattleProcessStateEnum){
    const oldValue = this.State;
    this.buffer.setUint8(4, SetByteValue(oldValue, value, 8, 0));
  }
  get GuildName(){
    const to = 13;
              
    return this._readString(5, to);
  }
  setGuildName(str: string, count = 8){
    const from = 5;
    for(let i = 0; i < str.length; i++){
      const char = str.charCodeAt(i);
      this.buffer.setUint8(from + i, char);
    }
}
}
export class CastleSiegeJoinSideNotificationPacket {
  buffer!: DataView;
  static readonly Name = `CastleSiegeJoinSideNotification`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `The server notifies the player of which siege side (attacker/defender) they are on.`;
  static readonly CausedReaction = `The client updates the player regiment and Castle Siege mini-map accordingly.`;
  static readonly Length = 5;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xB2;
  static readonly SubCode = 0x19;

  static getRequiredSize(dataSize:number){
    return CastleSiegeJoinSideNotificationPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, CastleSiegeJoinSideNotificationPacket.HeaderCode);
    b.setUint8(CastleSiegeJoinSideNotificationPacket.DataOffset, CastleSiegeJoinSideNotificationPacket.Code);
  b.setUint8(CastleSiegeJoinSideNotificationPacket.DataOffset + 1, CastleSiegeJoinSideNotificationPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = CastleSiegeJoinSideNotificationPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 5): CastleSiegeJoinSideNotificationPacket {
    const p = new CastleSiegeJoinSideNotificationPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Side():CastleSiegeJoinSideEnum{
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set Side(value: CastleSiegeJoinSideEnum){
    const oldValue = this.Side;
    this.buffer.setUint8(4, SetByteValue(oldValue, value, 8, 0));
  }
}
export class CastleSiegeTaxRateNotificationPacket {
  buffer!: DataView;
  static readonly Name = `CastleSiegeTaxRateNotification`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `The castle owner changes a server-wide chaos machine or store tax rate.`;
  static readonly CausedReaction = `The client updates the applicable tax rate.`;
  static readonly Length = 6;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xB2;
  static readonly SubCode = 0x1A;

  static getRequiredSize(dataSize:number){
    return CastleSiegeTaxRateNotificationPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, CastleSiegeTaxRateNotificationPacket.HeaderCode);
    b.setUint8(CastleSiegeTaxRateNotificationPacket.DataOffset, CastleSiegeTaxRateNotificationPacket.Code);
  b.setUint8(CastleSiegeTaxRateNotificationPacket.DataOffset + 1, CastleSiegeTaxRateNotificationPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = CastleSiegeTaxRateNotificationPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 6): CastleSiegeTaxRateNotificationPacket {
    const p = new CastleSiegeTaxRateNotificationPacket();
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
  get TaxRate() {
    return GetByteValue(this.buffer.getUint8(5), 8, 0);
  }
  set TaxRate(value: number) {
    const oldByte = this.buffer.getUint8(5);
    this.buffer.setUint8(5, SetByteValue(oldByte, value, 8, 0));
  }
}
export class CastleSiegeMiniMapResponsePacket {
  buffer!: DataView;
  static readonly Name = `CastleSiegeMiniMapResponse`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `The server responds to a Castle Siege mini-map request.`;
  static readonly CausedReaction = `The client opens the mini map when the request was accepted.`;
  static readonly Length = 5;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xB2;
  static readonly SubCode = 0x1B;

  static getRequiredSize(dataSize:number){
    return CastleSiegeMiniMapResponsePacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, CastleSiegeMiniMapResponsePacket.HeaderCode);
    b.setUint8(CastleSiegeMiniMapResponsePacket.DataOffset, CastleSiegeMiniMapResponsePacket.Code);
  b.setUint8(CastleSiegeMiniMapResponsePacket.DataOffset + 1, CastleSiegeMiniMapResponsePacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = CastleSiegeMiniMapResponsePacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 5): CastleSiegeMiniMapResponsePacket {
    const p = new CastleSiegeMiniMapResponsePacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Result() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set Result(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }
}
export class CastleSiegeGuildCommandPacket {
  buffer!: DataView;
  static readonly Name = `CastleSiegeGuildCommand`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `An alliance master sends a command during the Castle Siege battle.`;
  static readonly CausedReaction = `The client shows the command on the mini map.`;
  static readonly Length = 8;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xB2;
  static readonly SubCode = 0x1D;

  static getRequiredSize(dataSize:number){
    return CastleSiegeGuildCommandPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, CastleSiegeGuildCommandPacket.HeaderCode);
    b.setUint8(CastleSiegeGuildCommandPacket.DataOffset, CastleSiegeGuildCommandPacket.Code);
  b.setUint8(CastleSiegeGuildCommandPacket.DataOffset + 1, CastleSiegeGuildCommandPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = CastleSiegeGuildCommandPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 8): CastleSiegeGuildCommandPacket {
    const p = new CastleSiegeGuildCommandPacket();
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
export class CastleSiegeRemainingTimePacket {
  buffer!: DataView;
  static readonly Name = `CastleSiegeRemainingTime`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `The server sends the remaining Castle Siege battle time.`;
  static readonly CausedReaction = `The client updates the Castle Siege battle timer.`;
  static readonly Length = 6;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xB2;
  static readonly SubCode = 0x1E;

  static getRequiredSize(dataSize:number){
    return CastleSiegeRemainingTimePacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, CastleSiegeRemainingTimePacket.HeaderCode);
    b.setUint8(CastleSiegeRemainingTimePacket.DataOffset, CastleSiegeRemainingTimePacket.Code);
  b.setUint8(CastleSiegeRemainingTimePacket.DataOffset + 1, CastleSiegeRemainingTimePacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = CastleSiegeRemainingTimePacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 6): CastleSiegeRemainingTimePacket {
    const p = new CastleSiegeRemainingTimePacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Hour() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set Hour(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }
  get Minute() {
    return GetByteValue(this.buffer.getUint8(5), 8, 0);
  }
  set Minute(value: number) {
    const oldByte = this.buffer.getUint8(5);
    this.buffer.setUint8(5, SetByteValue(oldByte, value, 8, 0));
  }
}
export class CastleSiegeHuntingZoneEntranceSettingResponsePacket {
  buffer!: DataView;
  static readonly Name = `CastleSiegeHuntingZoneEntranceSettingResponse`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `The castle owner requests to change public access to the Castle Siege hunting zone.`;
  static readonly CausedReaction = `The client updates the hunting-zone access setting or shows an error.`;
  static readonly Length = 6;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xB2;
  static readonly SubCode = 0x1F;

  static getRequiredSize(dataSize:number){
    return CastleSiegeHuntingZoneEntranceSettingResponsePacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, CastleSiegeHuntingZoneEntranceSettingResponsePacket.HeaderCode);
    b.setUint8(CastleSiegeHuntingZoneEntranceSettingResponsePacket.DataOffset, CastleSiegeHuntingZoneEntranceSettingResponsePacket.Code);
  b.setUint8(CastleSiegeHuntingZoneEntranceSettingResponsePacket.DataOffset + 1, CastleSiegeHuntingZoneEntranceSettingResponsePacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = CastleSiegeHuntingZoneEntranceSettingResponsePacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 6): CastleSiegeHuntingZoneEntranceSettingResponsePacket {
    const p = new CastleSiegeHuntingZoneEntranceSettingResponsePacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Result() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set Result(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }
  get IsPublic(){
    return GetBoolean(this.buffer.getUint8(5), 0);
  }
  set IsPublic(value: boolean){
    const oldByte = this.buffer.getUint8(5);
    this.buffer.setUint8(5, SetBoolean(oldByte, value, 0));
  }
}
export class CastleSiegeSwitchInfoPacket {
  buffer!: DataView;
  static readonly Name = `CastleSiegeSwitchInfo`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `The server sends information about a Castle Siege crown switch.`;
  static readonly CausedReaction = `The client updates the crown switch occupation display.`;
  static readonly Length = 27;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xB2;
  static readonly SubCode = 0x20;

  static getRequiredSize(dataSize:number){
    return CastleSiegeSwitchInfoPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, CastleSiegeSwitchInfoPacket.HeaderCode);
    b.setUint8(CastleSiegeSwitchInfoPacket.DataOffset, CastleSiegeSwitchInfoPacket.Code);
  b.setUint8(CastleSiegeSwitchInfoPacket.DataOffset + 1, CastleSiegeSwitchInfoPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = CastleSiegeSwitchInfoPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  private _readString (from :number, to: number): string {
    return readWireString(this.buffer, from, to);
  }

  static createPacket(requiredSize: number = 27): CastleSiegeSwitchInfoPacket {
    const p = new CastleSiegeSwitchInfoPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get SwitchIndex(){
    return this.buffer.getUint16(4, false);
  }
  set SwitchIndex(value: number){
    this.buffer.setUint16(4, value, false);
  }
  get IsOccupied(){
    return GetBoolean(this.buffer.getUint8(6), 0);
  }
  set IsOccupied(value: boolean){
    const oldByte = this.buffer.getUint8(6);
    this.buffer.setUint8(6, SetBoolean(oldByte, value, 0));
  }
  get JoinSide():CastleSiegeJoinSideEnum{
    return GetByteValue(this.buffer.getUint8(7), 8, 0);
  }
  set JoinSide(value: CastleSiegeJoinSideEnum){
    const oldValue = this.JoinSide;
    this.buffer.setUint8(7, SetByteValue(oldValue, value, 8, 0));
  }
  get GuildName(){
    const to = 16;
              
    return this._readString(8, to);
  }
  setGuildName(str: string, count = 8){
    const from = 8;
    for(let i = 0; i < str.length; i++){
      const char = str.charCodeAt(i);
      this.buffer.setUint8(from + i, char);
    }
}
  get UserName(){
    const to = 27;
              
    return this._readString(16, to);
  }
  setUserName(str: string, count = 11){
    const from = 16;
    for(let i = 0; i < str.length; i++){
      const char = str.charCodeAt(i);
      this.buffer.setUint8(from + i, char);
    }
}
}
export class CastleSiegeNpcListPacket {
  buffer!: DataView;
  static readonly Name = `CastleSiegeNpcList`;
  static readonly HeaderType = `C2Header`;
  static readonly HeaderCode = 0xC2;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `After the guild master requested the list of all castle siege statues and gates.`;
  static readonly CausedReaction = `The client shows the list of castle siege NPCs with their current status.`;
  static readonly Length = undefined;
  static readonly LengthSize = 2;
  static readonly DataOffset = 3;
  static readonly Code = 0xB3;

  static getRequiredSize(dataSize:number){
    return CastleSiegeNpcListPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, CastleSiegeNpcListPacket.HeaderCode);
    b.setUint8(CastleSiegeNpcListPacket.DataOffset, CastleSiegeNpcListPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = CastleSiegeNpcListPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint16(1, l);
    return this;
  }

  static createPacket(requiredSize: number): CastleSiegeNpcListPacket {
    const p = new CastleSiegeNpcListPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Result() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set Result(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }
  get NpcCount(){
    return this.buffer.getUint32(5, true);
  }
  set NpcCount(value: number){
    this.buffer.setUint32(5, value, true);
  }

  getNpcList(count: number = this.NpcCount): {
  NpcNumber: IntegerLittleEndian;
  NpcIndex: IntegerLittleEndian;
  DefenseUpgradeLevel: IntegerLittleEndian;
  RegenerationLevel: IntegerLittleEndian;
  MaxHp: IntegerLittleEndian;
  CurrentHp: IntegerLittleEndian;
  PositionX: Byte;
  PositionY: Byte;
  IsAlive: Boolean;

}[]{
    const b = this.buffer;
    let bi = 0;

    const NpcList_count = count;
    const NpcList: any[] = new Array(NpcList_count);
    
    let NpcList_StartOffset = bi + 9;
    for (let i = 0; i < NpcList_count; i++) {
      const NpcNumber = b.getUint32(NpcList_StartOffset + 0, true);
      const NpcIndex = b.getUint32(NpcList_StartOffset + 4, true);
      const DefenseUpgradeLevel = b.getUint32(NpcList_StartOffset + 8, true);
      const RegenerationLevel = b.getUint32(NpcList_StartOffset + 12, true);
      const MaxHp = b.getUint32(NpcList_StartOffset + 16, true);
      const CurrentHp = b.getUint32(NpcList_StartOffset + 20, true);
      const PositionX = b.getUint8(NpcList_StartOffset + 24);
      const PositionY = b.getUint8(NpcList_StartOffset + 25);
      const IsAlive = GetBoolean(b.getUint8(NpcList_StartOffset + 26), 0);
      NpcList[i] = {
        NpcNumber,
        NpcIndex,
        DefenseUpgradeLevel,
        RegenerationLevel,
        MaxHp,
        CurrentHp,
        PositionX,
        PositionY,
        IsAlive
      };
      NpcList_StartOffset += 27;
    }
    
    return NpcList;
  }}
export class CastleSiegeRegisteredGuildListPacket {
  buffer!: DataView;
  static readonly Name = `CastleSiegeRegisteredGuildList`;
  static readonly HeaderType = `C2Header`;
  static readonly HeaderCode = 0xC2;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `After the guild master requested the list of guilds registered for the next siege.`;
  static readonly CausedReaction = `The client shows the list of registered guilds and their mark counts.`;
  static readonly Length = undefined;
  static readonly LengthSize = 2;
  static readonly DataOffset = 3;
  static readonly Code = 0xB4;

  static getRequiredSize(dataSize:number){
    return CastleSiegeRegisteredGuildListPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, CastleSiegeRegisteredGuildListPacket.HeaderCode);
    b.setUint8(CastleSiegeRegisteredGuildListPacket.DataOffset, CastleSiegeRegisteredGuildListPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = CastleSiegeRegisteredGuildListPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint16(1, l);
    return this;
  }

  private _readString (from :number, to: number): string {
    return readWireString(this.buffer, from, to);
  }

  static createPacket(requiredSize: number): CastleSiegeRegisteredGuildListPacket {
    const p = new CastleSiegeRegisteredGuildListPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Result() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set Result(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }
  get GuildCount(){
    return this.buffer.getUint32(5, true);
  }
  set GuildCount(value: number){
    this.buffer.setUint32(5, value, true);
  }

  getGuilds(count: number = this.GuildCount): {
  GuildName: string;
  GuildMarkCount: IntegerBigEndian;
  IsGivingUp: Boolean;
  SequenceNumber: Byte;

}[]{
    const b = this.buffer;
    let bi = 0;

    const Guilds_count = count;
    const Guilds: any[] = new Array(Guilds_count);
    
    let Guilds_StartOffset = bi + 9;
    for (let i = 0; i < Guilds_count; i++) {
      const GuildName = this._readString(Guilds_StartOffset + 0, Guilds_StartOffset + 0 + 8);
      const GuildMarkCount = b.getUint32(Guilds_StartOffset + 8, false);
      const IsGivingUp = GetBoolean(b.getUint8(Guilds_StartOffset + 12), 0);
      const SequenceNumber = b.getUint8(Guilds_StartOffset + 13);
      Guilds[i] = {
        GuildName,
        GuildMarkCount,
        IsGivingUp,
        SequenceNumber
      };
      Guilds_StartOffset += 14;
    }
    
    return Guilds;
  }}
export class CastleSiegeGuildListPacket {
  buffer!: DataView;
  static readonly Name = `CastleSiegeGuildList`;
  static readonly HeaderType = `C2Header`;
  static readonly HeaderCode = 0xC2;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `After the guild master requested the list of all guilds in the current castle siege.`;
  static readonly CausedReaction = `The client shows the list of guilds participating in the castle siege.`;
  static readonly Length = undefined;
  static readonly LengthSize = 2;
  static readonly DataOffset = 3;
  static readonly Code = 0xB5;

  static getRequiredSize(dataSize:number){
    return CastleSiegeGuildListPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, CastleSiegeGuildListPacket.HeaderCode);
    b.setUint8(CastleSiegeGuildListPacket.DataOffset, CastleSiegeGuildListPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = CastleSiegeGuildListPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint16(1, l);
    return this;
  }

  private _readString (from :number, to: number): string {
    return readWireString(this.buffer, from, to);
  }

  static createPacket(requiredSize: number): CastleSiegeGuildListPacket {
    const p = new CastleSiegeGuildListPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Result() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set Result(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }
  get GuildCount(){
    return this.buffer.getUint32(5, true);
  }
  set GuildCount(value: number){
    this.buffer.setUint32(5, value, true);
  }

  getGuilds(count: number = this.GuildCount): {
  Side: CastleSiegeJoinSideEnum;
  IsInvolved: Boolean;
  GuildName: string;
  Score: IntegerLittleEndian;

}[]{
    const b = this.buffer;
    let bi = 0;

    const Guilds_count = count;
    const Guilds: any[] = new Array(Guilds_count);
    
    let Guilds_StartOffset = bi + 9;
    for (let i = 0; i < Guilds_count; i++) {
      const Side = GetByteValue(b.getUint8(Guilds_StartOffset + 0), 8, 0);
      const IsInvolved = GetBoolean(b.getUint8(Guilds_StartOffset + 1), 0);
      const GuildName = this._readString(Guilds_StartOffset + 2, Guilds_StartOffset + 2 + 8);
      const Score = b.getUint32(Guilds_StartOffset + 10, true);
      Guilds[i] = {
        Side,
        IsInvolved,
        GuildName,
        Score
      };
      Guilds_StartOffset += 14;
    }
    
    return Guilds;
  }}
export class CastleSiegeMiniMapPlayerPositionsPacket {
  buffer!: DataView;
  static readonly Name = `CastleSiegeMiniMapPlayerPositions`;
  static readonly HeaderType = `C2Header`;
  static readonly HeaderCode = 0xC2;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `The server sends same-side player positions to a Castle Siege mini-map requester.`;
  static readonly CausedReaction = `The client updates the mini map with the player positions.`;
  static readonly Length = undefined;
  static readonly LengthSize = 2;
  static readonly DataOffset = 3;
  static readonly Code = 0xB6;

  static getRequiredSize(dataSize:number){
    return CastleSiegeMiniMapPlayerPositionsPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, CastleSiegeMiniMapPlayerPositionsPacket.HeaderCode);
    b.setUint8(CastleSiegeMiniMapPlayerPositionsPacket.DataOffset, CastleSiegeMiniMapPlayerPositionsPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = CastleSiegeMiniMapPlayerPositionsPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint16(1, l);
    return this;
  }

  static createPacket(requiredSize: number): CastleSiegeMiniMapPlayerPositionsPacket {
    const p = new CastleSiegeMiniMapPlayerPositionsPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get PlayerCount(){
    return this.buffer.getUint32(4, true);
  }
  set PlayerCount(value: number){
    this.buffer.setUint32(4, value, true);
  }

  getPlayers(count: number = this.PlayerCount): {
  PositionX: Byte;
  PositionY: Byte;

}[]{
    const b = this.buffer;
    let bi = 0;

    const Players_count = count;
    const Players: any[] = new Array(Players_count);
    
    let Players_StartOffset = bi + 8;
    for (let i = 0; i < Players_count; i++) {
      const PositionX = b.getUint8(Players_StartOffset + 0);
      const PositionY = b.getUint8(Players_StartOffset + 1);
      Players[i] = {
        PositionX,
        PositionY
      };
      Players_StartOffset += 2;
    }
    
    return Players;
  }}
export class CastleSiegeMachineInterfacePacket {
  buffer!: DataView;
  static readonly Name = `CastleSiegeMachineInterface`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `The server sends the siege machine interface to a player who is operating the machine.`;
  static readonly CausedReaction = `The client shows the siege machine operation interface.`;
  static readonly Length = 8;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xB7;
  static readonly SubCode = 0x00;

  static getRequiredSize(dataSize:number){
    return CastleSiegeMachineInterfacePacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, CastleSiegeMachineInterfacePacket.HeaderCode);
    b.setUint8(CastleSiegeMachineInterfacePacket.DataOffset, CastleSiegeMachineInterfacePacket.Code);
  b.setUint8(CastleSiegeMachineInterfacePacket.DataOffset + 1, CastleSiegeMachineInterfacePacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = CastleSiegeMachineInterfacePacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 8): CastleSiegeMachineInterfacePacket {
    const p = new CastleSiegeMachineInterfacePacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Result() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set Result(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }
  get MachineType():CastleSiegeMachineTypeEnum{
    return GetByteValue(this.buffer.getUint8(5), 8, 0);
  }
  set MachineType(value: CastleSiegeMachineTypeEnum){
    const oldValue = this.MachineType;
    this.buffer.setUint8(5, SetByteValue(oldValue, value, 8, 0));
  }
  get NpcIndex(){
    return this.buffer.getUint16(6, false);
  }
  set NpcIndex(value: number){
    this.buffer.setUint16(6, value, false);
  }
}
export class CastleSiegeMachineUseResultPacket {
  buffer!: DataView;
  static readonly Name = `CastleSiegeMachineUseResult`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `After the player fired a siege machine (catapult).`;
  static readonly CausedReaction = `The client shows the catapult animation toward the target area.`;
  static readonly Length = 10;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xB7;
  static readonly SubCode = 0x01;

  static getRequiredSize(dataSize:number){
    return CastleSiegeMachineUseResultPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, CastleSiegeMachineUseResultPacket.HeaderCode);
    b.setUint8(CastleSiegeMachineUseResultPacket.DataOffset, CastleSiegeMachineUseResultPacket.Code);
  b.setUint8(CastleSiegeMachineUseResultPacket.DataOffset + 1, CastleSiegeMachineUseResultPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = CastleSiegeMachineUseResultPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 10): CastleSiegeMachineUseResultPacket {
    const p = new CastleSiegeMachineUseResultPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Result() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set Result(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }
  get NpcIndex(){
    return this.buffer.getUint16(5, false);
  }
  set NpcIndex(value: number){
    this.buffer.setUint16(5, value, false);
  }
  get MachineType():CastleSiegeMachineTypeEnum{
    return GetByteValue(this.buffer.getUint8(7), 8, 0);
  }
  set MachineType(value: CastleSiegeMachineTypeEnum){
    const oldValue = this.MachineType;
    this.buffer.setUint8(7, SetByteValue(oldValue, value, 8, 0));
  }
  get TargetX() {
    return GetByteValue(this.buffer.getUint8(8), 8, 0);
  }
  set TargetX(value: number) {
    const oldByte = this.buffer.getUint8(8);
    this.buffer.setUint8(8, SetByteValue(oldByte, value, 8, 0));
  }
  get TargetY() {
    return GetByteValue(this.buffer.getUint8(9), 8, 0);
  }
  set TargetY(value: number) {
    const oldByte = this.buffer.getUint8(9);
    this.buffer.setUint8(9, SetByteValue(oldByte, value, 8, 0));
  }
}
export class CastleSiegeMachineRegionNotifyPacket {
  buffer!: DataView;
  static readonly Name = `CastleSiegeMachineRegionNotify`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `The server notifies the player of the impact region of a siege machine.`;
  static readonly CausedReaction = `The client shows the impact area effect.`;
  static readonly Length = 7;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xB7;
  static readonly SubCode = 0x02;

  static getRequiredSize(dataSize:number){
    return CastleSiegeMachineRegionNotifyPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, CastleSiegeMachineRegionNotifyPacket.HeaderCode);
    b.setUint8(CastleSiegeMachineRegionNotifyPacket.DataOffset, CastleSiegeMachineRegionNotifyPacket.Code);
  b.setUint8(CastleSiegeMachineRegionNotifyPacket.DataOffset + 1, CastleSiegeMachineRegionNotifyPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = CastleSiegeMachineRegionNotifyPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 7): CastleSiegeMachineRegionNotifyPacket {
    const p = new CastleSiegeMachineRegionNotifyPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get MachineType():CastleSiegeMachineTypeEnum{
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set MachineType(value: CastleSiegeMachineTypeEnum){
    const oldValue = this.MachineType;
    this.buffer.setUint8(4, SetByteValue(oldValue, value, 8, 0));
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
}
export class CastleSiegeLifeStoneBuildTimePacket {
  buffer!: DataView;
  static readonly Name = `CastleSiegeLifeStoneBuildTime`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `The creation stage of a Castle Siege Life Stone advances.`;
  static readonly CausedReaction = `The client updates the Life Stone construction animation.`;
  static readonly Length = 7;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xB9;
  static readonly SubCode = 0x01;

  static getRequiredSize(dataSize:number){
    return CastleSiegeLifeStoneBuildTimePacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, CastleSiegeLifeStoneBuildTimePacket.HeaderCode);
    b.setUint8(CastleSiegeLifeStoneBuildTimePacket.DataOffset, CastleSiegeLifeStoneBuildTimePacket.Code);
  b.setUint8(CastleSiegeLifeStoneBuildTimePacket.DataOffset + 1, CastleSiegeLifeStoneBuildTimePacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = CastleSiegeLifeStoneBuildTimePacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 7): CastleSiegeLifeStoneBuildTimePacket {
    const p = new CastleSiegeLifeStoneBuildTimePacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get NpcIndex(){
    return this.buffer.getUint16(4, false);
  }
  set NpcIndex(value: number){
    this.buffer.setUint16(4, value, false);
  }
  get BuildTime() {
    return GetByteValue(this.buffer.getUint8(6), 8, 0);
  }
  set BuildTime(value: number) {
    const oldByte = this.buffer.getUint8(6);
    this.buffer.setUint8(6, SetByteValue(oldByte, value, 8, 0));
  }
}
export class CastleSiegeOwnerLogoPacket {
  buffer!: DataView;
  static readonly Name = `CastleSiegeOwnerLogo`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `After the client requested the guild logo of the current castle owner.`;
  static readonly CausedReaction = `The client shows the castle owner guild logo.`;
  static readonly Length = 36;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xB9;
  static readonly SubCode = 0x02;

  static getRequiredSize(dataSize:number){
    return CastleSiegeOwnerLogoPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, CastleSiegeOwnerLogoPacket.HeaderCode);
    b.setUint8(CastleSiegeOwnerLogoPacket.DataOffset, CastleSiegeOwnerLogoPacket.Code);
  b.setUint8(CastleSiegeOwnerLogoPacket.DataOffset + 1, CastleSiegeOwnerLogoPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = CastleSiegeOwnerLogoPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 36): CastleSiegeOwnerLogoPacket {
    const p = new CastleSiegeOwnerLogoPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Logo(){
    const to = 36;
    const i = 4;
              
    return new DataView(this.buffer.buffer.slice(i,to));
  }
  setLogo(data: ArrayLike<number>, count = 32){
    if (data.length !== count) throw new Error(`data.length must be ${count}`);
    const from = 4;

    for (let i = 0; i < data.length; i++) {
      this.buffer.setUint8(from + i, data[i]);
    }
}
}
export class CastleSiegeHuntingZoneGuardInfoPacket {
  buffer!: DataView;
  static readonly Name = `CastleSiegeHuntingZoneGuardInfo`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `The server sends information about the hunting zone guard configuration.`;
  static readonly CausedReaction = `The client shows the hunting zone entrance configuration.`;
  static readonly Length = 18;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xB9;
  static readonly SubCode = 0x03;

  static getRequiredSize(dataSize:number){
    return CastleSiegeHuntingZoneGuardInfoPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, CastleSiegeHuntingZoneGuardInfoPacket.HeaderCode);
    b.setUint8(CastleSiegeHuntingZoneGuardInfoPacket.DataOffset, CastleSiegeHuntingZoneGuardInfoPacket.Code);
  b.setUint8(CastleSiegeHuntingZoneGuardInfoPacket.DataOffset + 1, CastleSiegeHuntingZoneGuardInfoPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = CastleSiegeHuntingZoneGuardInfoPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 18): CastleSiegeHuntingZoneGuardInfoPacket {
    const p = new CastleSiegeHuntingZoneGuardInfoPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Result() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set Result(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }
  get IsEnabled(){
    return GetBoolean(this.buffer.getUint8(5), 0);
  }
  set IsEnabled(value: boolean){
    const oldByte = this.buffer.getUint8(5);
    this.buffer.setUint8(5, SetBoolean(oldByte, value, 0));
  }
  get CurrentPrice(){
    return this.buffer.getUint32(6, true);
  }
  set CurrentPrice(value: number){
    this.buffer.setUint32(6, value, true);
  }
  get MaxPrice(){
    return this.buffer.getUint32(10, true);
  }
  set MaxPrice(value: number){
    this.buffer.setUint32(10, value, true);
  }
  get UnitPrice(){
    return this.buffer.getUint32(14, true);
  }
  set UnitPrice(value: number){
    this.buffer.setUint32(14, value, true);
  }
}
export class CastleSiegeHuntingZoneEnterResponsePacket {
  buffer!: DataView;
  static readonly Name = `CastleSiegeHuntingZoneEnterResponse`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `A player requests to enter the Castle Siege hunting zone.`;
  static readonly CausedReaction = `The client closes the dialog on success or shows an error.`;
  static readonly Length = 5;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xB9;
  static readonly SubCode = 0x05;

  static getRequiredSize(dataSize:number){
    return CastleSiegeHuntingZoneEnterResponsePacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, CastleSiegeHuntingZoneEnterResponsePacket.HeaderCode);
    b.setUint8(CastleSiegeHuntingZoneEnterResponsePacket.DataOffset, CastleSiegeHuntingZoneEnterResponsePacket.Code);
  b.setUint8(CastleSiegeHuntingZoneEnterResponsePacket.DataOffset + 1, CastleSiegeHuntingZoneEnterResponsePacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = CastleSiegeHuntingZoneEnterResponsePacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 5): CastleSiegeHuntingZoneEnterResponsePacket {
    const p = new CastleSiegeHuntingZoneEnterResponsePacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Result() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set Result(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }
}
export class CastleSiegeMiniMapNpcPositionsPacket {
  buffer!: DataView;
  static readonly Name = `CastleSiegeMiniMapNpcPositions`;
  static readonly HeaderType = `C2Header`;
  static readonly HeaderCode = 0xC2;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `The server sends alive gate and Guardian Statue positions to a Castle Siege mini-map requester.`;
  static readonly CausedReaction = `The client updates the mini map with the siege-NPC positions.`;
  static readonly Length = undefined;
  static readonly LengthSize = 2;
  static readonly DataOffset = 3;
  static readonly Code = 0xBB;

  static getRequiredSize(dataSize:number){
    return CastleSiegeMiniMapNpcPositionsPacket.DataOffset + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, CastleSiegeMiniMapNpcPositionsPacket.HeaderCode);
    b.setUint8(CastleSiegeMiniMapNpcPositionsPacket.DataOffset, CastleSiegeMiniMapNpcPositionsPacket.Code);
  
    return this;
  }

  writeLength(l: number|undefined = CastleSiegeMiniMapNpcPositionsPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint16(1, l);
    return this;
  }

  static createPacket(requiredSize: number): CastleSiegeMiniMapNpcPositionsPacket {
    const p = new CastleSiegeMiniMapNpcPositionsPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get NpcCount() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set NpcCount(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }

  getNpcs(count: number = this.NpcCount): {
  NpcType: CastleSiegeMiniMapNpcTypeEnum;
  PositionX: Byte;
  PositionY: Byte;

}[]{
    const b = this.buffer;
    let bi = 0;

    const Npcs_count = count;
    const Npcs: any[] = new Array(Npcs_count);
    
    let Npcs_StartOffset = bi + 5;
    for (let i = 0; i < Npcs_count; i++) {
      const NpcType = GetByteValue(b.getUint8(Npcs_StartOffset + 0), 8, 0);
      const PositionX = b.getUint8(Npcs_StartOffset + 1);
      const PositionY = b.getUint8(Npcs_StartOffset + 2);
      Npcs[i] = {
        NpcType,
        PositionX,
        PositionY
      };
      Npcs_StartOffset += 3;
    }
    
    return Npcs;
  }}
export enum CrywolfStateInfoOccupationStateEnum {
    Peace = 0,
Occupied = 1,
War = 2
  }export enum CrywolfStateInfoEventStateEnum {
    None = 0,
Notify1 = 1,
Notify2 = 2,
Ready = 3,
Started = 4,
Ended = 5,
EndCycle = 6
  }export class CrywolfStateInfoPacket {
  buffer!: DataView;
  static readonly Name = `CrywolfStateInfo`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `The state of the crywolf event changed, or a player requested it with CrywolfInfoRequest.`;
  static readonly CausedReaction = `The client updates the crywolf map staging and interface.`;
  static readonly Length = 6;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xBD;
  static readonly SubCode = 0x00;

  static getRequiredSize(dataSize:number){
    return CrywolfStateInfoPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, CrywolfStateInfoPacket.HeaderCode);
    b.setUint8(CrywolfStateInfoPacket.DataOffset, CrywolfStateInfoPacket.Code);
  b.setUint8(CrywolfStateInfoPacket.DataOffset + 1, CrywolfStateInfoPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = CrywolfStateInfoPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 6): CrywolfStateInfoPacket {
    const p = new CrywolfStateInfoPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Occupation():CrywolfStateInfoOccupationStateEnum{
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set Occupation(value: CrywolfStateInfoOccupationStateEnum){
    const oldValue = this.Occupation;
    this.buffer.setUint8(4, SetByteValue(oldValue, value, 8, 0));
  }
  get State():CrywolfStateInfoEventStateEnum{
    return GetByteValue(this.buffer.getUint8(5), 8, 0);
  }
  set State(value: CrywolfStateInfoEventStateEnum){
    const oldValue = this.State;
    this.buffer.setUint8(5, SetByteValue(oldValue, value, 8, 0));
  }
}
export class CrywolfAltarInfoPacket {
  buffer!: DataView;
  static readonly Name = `CrywolfAltarInfo`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `The statue hitpoints or an altar state changed during the crywolf event.`;
  static readonly CausedReaction = `The client updates the statue shield and the five altar displays.`;
  static readonly Length = 13;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xBD;
  static readonly SubCode = 0x02;

  static getRequiredSize(dataSize:number){
    return CrywolfAltarInfoPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, CrywolfAltarInfoPacket.HeaderCode);
    b.setUint8(CrywolfAltarInfoPacket.DataOffset, CrywolfAltarInfoPacket.Code);
  b.setUint8(CrywolfAltarInfoPacket.DataOffset + 1, CrywolfAltarInfoPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = CrywolfAltarInfoPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 13): CrywolfAltarInfoPacket {
    const p = new CrywolfAltarInfoPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get StatueHp(){
    return this.buffer.getUint32(4, true);
  }
  set StatueHp(value: number){
    this.buffer.setUint32(4, value, true);
  }
  get AltarState1() {
    return GetByteValue(this.buffer.getUint8(8), 8, 0);
  }
  set AltarState1(value: number) {
    const oldByte = this.buffer.getUint8(8);
    this.buffer.setUint8(8, SetByteValue(oldByte, value, 8, 0));
  }
  get AltarState2() {
    return GetByteValue(this.buffer.getUint8(9), 8, 0);
  }
  set AltarState2(value: number) {
    const oldByte = this.buffer.getUint8(9);
    this.buffer.setUint8(9, SetByteValue(oldByte, value, 8, 0));
  }
  get AltarState3() {
    return GetByteValue(this.buffer.getUint8(10), 8, 0);
  }
  set AltarState3(value: number) {
    const oldByte = this.buffer.getUint8(10);
    this.buffer.setUint8(10, SetByteValue(oldByte, value, 8, 0));
  }
  get AltarState4() {
    return GetByteValue(this.buffer.getUint8(11), 8, 0);
  }
  set AltarState4(value: number) {
    const oldByte = this.buffer.getUint8(11);
    this.buffer.setUint8(11, SetByteValue(oldByte, value, 8, 0));
  }
  get AltarState5() {
    return GetByteValue(this.buffer.getUint8(12), 8, 0);
  }
  set AltarState5(value: number) {
    const oldByte = this.buffer.getUint8(12);
    this.buffer.setUint8(12, SetByteValue(oldByte, value, 8, 0));
  }
}
export class CrywolfContractResultPacket {
  buffer!: DataView;
  static readonly Name = `CrywolfContractResult`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `The server answers a CrywolfContractRequest.`;
  static readonly CausedReaction = `The client shows whether the contract with the altar was made.`;
  static readonly Length = 8;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xBD;
  static readonly SubCode = 0x03;

  static getRequiredSize(dataSize:number){
    return CrywolfContractResultPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, CrywolfContractResultPacket.HeaderCode);
    b.setUint8(CrywolfContractResultPacket.DataOffset, CrywolfContractResultPacket.Code);
  b.setUint8(CrywolfContractResultPacket.DataOffset + 1, CrywolfContractResultPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = CrywolfContractResultPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 8): CrywolfContractResultPacket {
    const p = new CrywolfContractResultPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Result() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set Result(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }
  get AltarState() {
    return GetByteValue(this.buffer.getUint8(5), 8, 0);
  }
  set AltarState(value: number) {
    const oldByte = this.buffer.getUint8(5);
    this.buffer.setUint8(5, SetByteValue(oldByte, value, 8, 0));
  }
  get AltarId(){
    return this.buffer.getUint16(6, false);
  }
  set AltarId(value: number){
    this.buffer.setUint16(6, value, false);
  }
}
export class CrywolfLeftTimePacket {
  buffer!: DataView;
  static readonly Name = `CrywolfLeftTime`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `Periodically during the crywolf battle.`;
  static readonly CausedReaction = `The client resyncs the remaining-time clock of the interface bar.`;
  static readonly Length = 6;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xBD;
  static readonly SubCode = 0x04;

  static getRequiredSize(dataSize:number){
    return CrywolfLeftTimePacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, CrywolfLeftTimePacket.HeaderCode);
    b.setUint8(CrywolfLeftTimePacket.DataOffset, CrywolfLeftTimePacket.Code);
  b.setUint8(CrywolfLeftTimePacket.DataOffset + 1, CrywolfLeftTimePacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = CrywolfLeftTimePacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 6): CrywolfLeftTimePacket {
    const p = new CrywolfLeftTimePacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Hour() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set Hour(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }
  get Minute() {
    return GetByteValue(this.buffer.getUint8(5), 8, 0);
  }
  set Minute(value: number) {
    const oldByte = this.buffer.getUint8(5);
    this.buffer.setUint8(5, SetByteValue(oldByte, value, 8, 0));
  }
}
export class CrywolfBossMonsterInfoPacket {
  buffer!: DataView;
  static readonly Name = `CrywolfBossMonsterInfo`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `Balgass or his dark elves appear or take damage during the crywolf battle.`;
  static readonly CausedReaction = `The client updates the Balgass hitpoint bar and the dark elf count.`;
  static readonly Length = 9;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xBD;
  static readonly SubCode = 0x05;

  static getRequiredSize(dataSize:number){
    return CrywolfBossMonsterInfoPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, CrywolfBossMonsterInfoPacket.HeaderCode);
    b.setUint8(CrywolfBossMonsterInfoPacket.DataOffset, CrywolfBossMonsterInfoPacket.Code);
  b.setUint8(CrywolfBossMonsterInfoPacket.DataOffset + 1, CrywolfBossMonsterInfoPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = CrywolfBossMonsterInfoPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 9): CrywolfBossMonsterInfoPacket {
    const p = new CrywolfBossMonsterInfoPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get BossHp(){
    return this.buffer.getUint32(4, true);
  }
  set BossHp(value: number){
    this.buffer.setUint32(4, value, true);
  }
  get DarkElfCount() {
    return GetByteValue(this.buffer.getUint8(8), 8, 0);
  }
  set DarkElfCount(value: number) {
    const oldByte = this.buffer.getUint8(8);
    this.buffer.setUint8(8, SetByteValue(oldByte, value, 8, 0));
  }
}
export class CrywolfBenefitPacket {
  buffer!: DataView;
  static readonly Name = `CrywolfBenefit`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `The server answers a CrywolfChaosRateBenefitRequest.`;
  static readonly CausedReaction = `The client adds the percentage to the displayed chaos machine success rates.`;
  static readonly Length = 5;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xBD;
  static readonly SubCode = 0x09;

  static getRequiredSize(dataSize:number){
    return CrywolfBenefitPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, CrywolfBenefitPacket.HeaderCode);
    b.setUint8(CrywolfBenefitPacket.DataOffset, CrywolfBenefitPacket.Code);
  b.setUint8(CrywolfBenefitPacket.DataOffset + 1, CrywolfBenefitPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = CrywolfBenefitPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 5): CrywolfBenefitPacket {
    const p = new CrywolfBenefitPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get ChaosRatePlus() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set ChaosRatePlus(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }
}
export class MarketplaceEscrowResultPacket {
  buffer!: DataView;
  static readonly Name = `MarketplaceEscrowResult`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `After a MarketplaceEscrowRequest was processed, whatever the outcome.`;
  static readonly CausedReaction = `The marketplace window reports the outcome to the marketplace service and shows it to the player. The bag and the wallet are updated by the usual ItemRemoved, ItemAddedToInventory and InventoryMoneyUpdate packets.`;
  static readonly Length = undefined;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xE7;
  static readonly SubCode = 0x02;

  static getRequiredSize(dataSize:number){
    return MarketplaceEscrowResultPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, MarketplaceEscrowResultPacket.HeaderCode);
    b.setUint8(MarketplaceEscrowResultPacket.DataOffset, MarketplaceEscrowResultPacket.Code);
  b.setUint8(MarketplaceEscrowResultPacket.DataOffset + 1, MarketplaceEscrowResultPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = MarketplaceEscrowResultPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number): MarketplaceEscrowResultPacket {
    const p = new MarketplaceEscrowResultPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Operation() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set Operation(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }
  get Status() {
    return GetByteValue(this.buffer.getUint8(5), 8, 0);
  }
  set Status(value: number) {
    const oldByte = this.buffer.getUint8(5);
    this.buffer.setUint8(5, SetByteValue(oldByte, value, 8, 0));
  }
  get ListingId(){
    const to = 22;
    const i = 6;
              
    return new DataView(this.buffer.buffer.slice(i,to));
  }
  setListingId(data: ArrayLike<number>, count = 16){
    if (data.length !== count) throw new Error(`data.length must be ${count}`);
    const from = 6;

    for (let i = 0; i < data.length; i++) {
      this.buffer.setUint8(from + i, data[i]);
    }
}
  get BoxId(){
    const to = 38;
    const i = 22;
              
    return new DataView(this.buffer.buffer.slice(i,to));
  }
  setBoxId(data: ArrayLike<number>, count = 16){
    if (data.length !== count) throw new Error(`data.length must be ${count}`);
    const from = 22;

    for (let i = 0; i < data.length; i++) {
      this.buffer.setUint8(from + i, data[i]);
    }
}
  get Amount(){
    const to = 46;
    const i = 38;
              
    return new DataView(this.buffer.buffer.slice(i,to));
  }
  setAmount(data: ArrayLike<number>, count = 8){
    if (data.length !== count) throw new Error(`data.length must be ${count}`);
    const from = 38;

    for (let i = 0; i < data.length; i++) {
      this.buffer.setUint8(from + i, data[i]);
    }
}
  get ItemLength() {
    return GetByteValue(this.buffer.getUint8(46), 8, 0);
  }
  set ItemLength(value: number) {
    const oldByte = this.buffer.getUint8(46);
    this.buffer.setUint8(46, SetByteValue(oldByte, value, 8, 0));
  }
  get ItemData(){
    const to = this.buffer.byteLength;
    const i = 47;
              
    return new DataView(this.buffer.buffer.slice(i,to));
  }
  setItemData(data: ArrayLike<number>, count = NaN){
    if (data.length !== count) throw new Error(`data.length must be ${count}`);
    const from = 47;

    for (let i = 0; i < data.length; i++) {
      this.buffer.setUint8(from + i, data[i]);
    }
}
}
export enum LoginTokenAnswerLoginTokenStatusEnum {
    Ok = 0,
Refused = 1,
Failed = 2
  }export class LoginTokenAnswerPacket {
  buffer!: DataView;
  static readonly Name = `LoginTokenAnswer`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `After a LoginTokenRequest, and after a TokenLogin that logged the account in (right behind its LoginResponse).`;
  static readonly CausedReaction = `The client keeps the token for the account on this world, in place of any it had, when the player ticked "remember".`;
  static readonly Length = 37;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xE7;
  static readonly SubCode = 0x04;

  static getRequiredSize(dataSize:number){
    return LoginTokenAnswerPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, LoginTokenAnswerPacket.HeaderCode);
    b.setUint8(LoginTokenAnswerPacket.DataOffset, LoginTokenAnswerPacket.Code);
  b.setUint8(LoginTokenAnswerPacket.DataOffset + 1, LoginTokenAnswerPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = LoginTokenAnswerPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 37): LoginTokenAnswerPacket {
    const p = new LoginTokenAnswerPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Status():LoginTokenAnswerLoginTokenStatusEnum{
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set Status(value: LoginTokenAnswerLoginTokenStatusEnum){
    const oldValue = this.Status;
    this.buffer.setUint8(4, SetByteValue(oldValue, value, 8, 0));
  }
  get Token(){
    const to = 37;
    const i = 5;
              
    return new DataView(this.buffer.buffer.slice(i,to));
  }
  setToken(data: ArrayLike<number>, count = 32){
    if (data.length !== count) throw new Error(`data.length must be ${count}`);
    const from = 5;

    for (let i = 0; i < data.length; i++) {
      this.buffer.setUint8(from + i, data[i]);
    }
}
}
export enum KanturuStateInfoStateTypeEnum {
    None = 0,
Standby = 1,
MayaBattle = 2,
NightmareBattle = 3,
Tower = 4,
End = 5
  }export class KanturuStateInfoPacket {
  buffer!: DataView;
  static readonly Name = `KanturuStateInfo`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `The player requests state information from the Kanturu gateway NPC.`;
  static readonly CausedReaction = `The client shows the Kanturu entry dialog (INTERFACE_KANTURU2ND_ENTERNPC) with event state, detail state, whether entry is possible, current player count and remaining time.`;
  static readonly Length = 12;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xD1;
  static readonly SubCode = 0x00;

  static getRequiredSize(dataSize:number){
    return KanturuStateInfoPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, KanturuStateInfoPacket.HeaderCode);
    b.setUint8(KanturuStateInfoPacket.DataOffset, KanturuStateInfoPacket.Code);
  b.setUint8(KanturuStateInfoPacket.DataOffset + 1, KanturuStateInfoPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = KanturuStateInfoPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 12): KanturuStateInfoPacket {
    const p = new KanturuStateInfoPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get State():KanturuStateInfoStateTypeEnum{
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set State(value: KanturuStateInfoStateTypeEnum){
    const oldValue = this.State;
    this.buffer.setUint8(4, SetByteValue(oldValue, value, 8, 0));
  }
  get DetailState() {
    return GetByteValue(this.buffer.getUint8(5), 8, 0);
  }
  set DetailState(value: number) {
    const oldByte = this.buffer.getUint8(5);
    this.buffer.setUint8(5, SetByteValue(oldByte, value, 8, 0));
  }
  get CanEnter(){
    return GetBoolean(this.buffer.getUint8(6), 0);
  }
  set CanEnter(value: boolean){
    const oldByte = this.buffer.getUint8(6);
    this.buffer.setUint8(6, SetBoolean(oldByte, value, 0));
  }
  get UserCount() {
    return GetByteValue(this.buffer.getUint8(7), 8, 0);
  }
  set UserCount(value: number) {
    const oldByte = this.buffer.getUint8(7);
    this.buffer.setUint8(7, SetByteValue(oldByte, value, 8, 0));
  }
  get RemainSeconds(){
    return this.buffer.getUint32(8, true);
  }
  set RemainSeconds(value: number){
    this.buffer.setUint32(8, value, true);
  }
}
export enum KanturuEnterResultEnterResultEnum {
    Failed = 0,
Success = 1
  }export class KanturuEnterResultPacket {
  buffer!: DataView;
  static readonly Name = `KanturuEnterResult`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `The player attempted to enter the Kanturu event through the gateway NPC.`;
  static readonly CausedReaction = `The client closes the NPC animation and shows an error popup on failure. On success the player has already been teleported to the event map.`;
  static readonly Length = 5;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xD1;
  static readonly SubCode = 0x01;

  static getRequiredSize(dataSize:number){
    return KanturuEnterResultPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, KanturuEnterResultPacket.HeaderCode);
    b.setUint8(KanturuEnterResultPacket.DataOffset, KanturuEnterResultPacket.Code);
  b.setUint8(KanturuEnterResultPacket.DataOffset + 1, KanturuEnterResultPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = KanturuEnterResultPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 5): KanturuEnterResultPacket {
    const p = new KanturuEnterResultPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Result():KanturuEnterResultEnterResultEnum{
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set Result(value: KanturuEnterResultEnterResultEnum){
    const oldValue = this.Result;
    this.buffer.setUint8(4, SetByteValue(oldValue, value, 8, 0));
  }
}
export enum KanturuStateChangeStateTypeEnum {
    None = 0,
Standby = 1,
MayaBattle = 2,
NightmareBattle = 3,
Tower = 4,
End = 5
  }export class KanturuStateChangePacket {
  buffer!: DataView;
  static readonly Name = `KanturuStateChange`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `The Kanturu event transitions to a new phase or sub-phase.`;
  static readonly CausedReaction = `The client shows or hides the in-map HUD, switches background music, and when entering the Tower state reloads the barrier-open terrain file (EncTerrain_n_01.att) to visually remove the Elphis barrier.`;
  static readonly Length = 6;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xD1;
  static readonly SubCode = 0x03;

  static getRequiredSize(dataSize:number){
    return KanturuStateChangePacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, KanturuStateChangePacket.HeaderCode);
    b.setUint8(KanturuStateChangePacket.DataOffset, KanturuStateChangePacket.Code);
  b.setUint8(KanturuStateChangePacket.DataOffset + 1, KanturuStateChangePacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = KanturuStateChangePacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 6): KanturuStateChangePacket {
    const p = new KanturuStateChangePacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get State():KanturuStateChangeStateTypeEnum{
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set State(value: KanturuStateChangeStateTypeEnum){
    const oldValue = this.State;
    this.buffer.setUint8(4, SetByteValue(oldValue, value, 8, 0));
  }
  get DetailState() {
    return GetByteValue(this.buffer.getUint8(5), 8, 0);
  }
  set DetailState(value: number) {
    const oldByte = this.buffer.getUint8(5);
    this.buffer.setUint8(5, SetByteValue(oldByte, value, 8, 0));
  }
}
export enum KanturuBattleResultBattleResultEnum {
    Failure = 0,
Victory = 1
  }export class KanturuBattleResultPacket {
  buffer!: DataView;
  static readonly Name = `KanturuBattleResult`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `The Kanturu event ends with a victory or defeat outcome.`;
  static readonly CausedReaction = `The client displays the Success_kantru.tga overlay on victory or the Failure_kantru.tga overlay on defeat.`;
  static readonly Length = 5;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xD1;
  static readonly SubCode = 0x04;

  static getRequiredSize(dataSize:number){
    return KanturuBattleResultPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, KanturuBattleResultPacket.HeaderCode);
    b.setUint8(KanturuBattleResultPacket.DataOffset, KanturuBattleResultPacket.Code);
  b.setUint8(KanturuBattleResultPacket.DataOffset + 1, KanturuBattleResultPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = KanturuBattleResultPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 5): KanturuBattleResultPacket {
    const p = new KanturuBattleResultPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get Result():KanturuBattleResultBattleResultEnum{
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set Result(value: KanturuBattleResultBattleResultEnum){
    const oldValue = this.Result;
    this.buffer.setUint8(4, SetByteValue(oldValue, value, 8, 0));
  }
}
export class KanturuTimeLimitPacket {
  buffer!: DataView;
  static readonly Name = `KanturuTimeLimit`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `A timed phase begins in the Kanturu event.`;
  static readonly CausedReaction = `The client starts a countdown timer shown in the Kanturu HUD. The value is divided by 1000 to obtain seconds.`;
  static readonly Length = 8;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xD1;
  static readonly SubCode = 0x05;

  static getRequiredSize(dataSize:number){
    return KanturuTimeLimitPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, KanturuTimeLimitPacket.HeaderCode);
    b.setUint8(KanturuTimeLimitPacket.DataOffset, KanturuTimeLimitPacket.Code);
  b.setUint8(KanturuTimeLimitPacket.DataOffset + 1, KanturuTimeLimitPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = KanturuTimeLimitPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 8): KanturuTimeLimitPacket {
    const p = new KanturuTimeLimitPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get TimeLimitMilliseconds(){
    return this.buffer.getUint32(4, true);
  }
  set TimeLimitMilliseconds(value: number){
    this.buffer.setUint32(4, value, true);
  }
}
export enum KanturuMayaWideAreaAttackAttackTypeEnum {
    Storm = 0,
Rain = 1
  }export class KanturuMayaWideAreaAttackPacket {
  buffer!: DataView;
  static readonly Name = `KanturuMayaWideAreaAttack`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `The Maya body executes a wide-area attack during the Maya battle phase.`;
  static readonly CausedReaction = `The client calls MayaSceneMayaAction(type) which plays one of two visual sequences on the Maya body model: storm (0) or stone-rain (1). This is a purely cosmetic packet — damage is handled server-side.`;
  static readonly Length = 7;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xD1;
  static readonly SubCode = 0x06;

  static getRequiredSize(dataSize:number){
    return KanturuMayaWideAreaAttackPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, KanturuMayaWideAreaAttackPacket.HeaderCode);
    b.setUint8(KanturuMayaWideAreaAttackPacket.DataOffset, KanturuMayaWideAreaAttackPacket.Code);
  b.setUint8(KanturuMayaWideAreaAttackPacket.DataOffset + 1, KanturuMayaWideAreaAttackPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = KanturuMayaWideAreaAttackPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 7): KanturuMayaWideAreaAttackPacket {
    const p = new KanturuMayaWideAreaAttackPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get ObjClassH() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set ObjClassH(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }
  get ObjClassL() {
    return GetByteValue(this.buffer.getUint8(5), 8, 0);
  }
  set ObjClassL(value: number) {
    const oldByte = this.buffer.getUint8(5);
    this.buffer.setUint8(5, SetByteValue(oldByte, value, 8, 0));
  }
  get Type():KanturuMayaWideAreaAttackAttackTypeEnum{
    return GetByteValue(this.buffer.getUint8(6), 8, 0);
  }
  set Type(value: KanturuMayaWideAreaAttackAttackTypeEnum){
    const oldValue = this.Type;
    this.buffer.setUint8(6, SetByteValue(oldValue, value, 8, 0));
  }
}
export class KanturuMonsterUserCountPacket {
  buffer!: DataView;
  static readonly Name = `KanturuMonsterUserCount`;
  static readonly HeaderType = `C1HeaderWithSubCode`;
  static readonly HeaderCode = 0xC1;
  static readonly Direction = 'ServerToClient';
  static readonly SentWhen = `A monster is killed or the player count changes during the Kanturu event.`;
  static readonly CausedReaction = `The client updates the monster count and user count numbers displayed in the Kanturu HUD.`;
  static readonly Length = 6;
  static readonly LengthSize = 1;
  static readonly DataOffset = 2;
  static readonly Code = 0xD1;
  static readonly SubCode = 0x07;

  static getRequiredSize(dataSize:number){
    return KanturuMonsterUserCountPacket.DataOffset + 1 + 1 + dataSize;
  }

  constructor(buffer?: DataView){
    buffer && (this.buffer = buffer);
  }

  writeHeader(){
    const b = this.buffer;
    b.setUint8(0, KanturuMonsterUserCountPacket.HeaderCode);
    b.setUint8(KanturuMonsterUserCountPacket.DataOffset, KanturuMonsterUserCountPacket.Code);
  b.setUint8(KanturuMonsterUserCountPacket.DataOffset + 1, KanturuMonsterUserCountPacket.SubCode);
    return this;
  }

  writeLength(l: number|undefined = KanturuMonsterUserCountPacket.Length){
    const b = this.buffer;
    l = l ?? b.byteLength;
    b.setUint8(1, l);
    return this;
  }

  static createPacket(requiredSize: number = 6): KanturuMonsterUserCountPacket {
    const p = new KanturuMonsterUserCountPacket();
    p.buffer = new DataView(new ArrayBuffer(requiredSize));
    p.writeHeader();
    p.writeLength();
    return p;
  }
  get MonsterCount() {
    return GetByteValue(this.buffer.getUint8(4), 8, 0);
  }
  set MonsterCount(value: number) {
    const oldByte = this.buffer.getUint8(4);
    this.buffer.setUint8(4, SetByteValue(oldByte, value, 8, 0));
  }
  get UserCount() {
    return GetByteValue(this.buffer.getUint8(5), 8, 0);
  }
  set UserCount(value: number) {
    const oldByte = this.buffer.getUint8(5);
    this.buffer.setUint8(5, SetByteValue(oldByte, value, 8, 0));
  }
}

export const ServerToClientPackets = [
  GameServerEnteredPacket,
  MagicEffectStatusPacket,
  WeatherStatusUpdatePacket,
  AddCharacterToScopeExtendedPacket,
  AddCharactersToScopePacket,
  AddCharactersToScope075Packet,
  AddCharactersToScope095Packet,
  AddNpcsToScopePacket,
  AddNpcsToScope075Packet,
  AddNpcsToScope095Packet,
  AddSummonedMonstersToScopePacket,
  AddSummonedMonstersToScope075Packet,
  AddSummonedMonstersToScope095Packet,
  MapObjectOutOfScopePacket,
  ObjectGotKilledPacket,
  ObjectAnimationPacket,
  AreaSkillAnimationPacket,
  SkillAnimationPacket,
  AreaSkillAnimation075Packet,
  AreaSkillAnimation095Packet,
  SkillAnimation075Packet,
  SkillAnimation095Packet,
  MagicEffectCancelledPacket,
  MagicEffectCancelled075Packet,
  RageAttackPacket,
  RageAttackRangeResponsePacket,
  AppearanceChangedPacket,
  AppearanceChangedExtendedPacket,
  ObjectMessagePacket,
  PartyRequestPacket,
  PartyListPacket,
  PartyList075Packet,
  RemovePartyMemberPacket,
  PartyHealthUpdatePacket,
  PlayerShopOpenSuccessfulPacket,
  TradeButtonStateChangedPacket,
  TradeMoneySetResponsePacket,
  TradeMoneyUpdatePacket,
  TradeRequestAnswerPacket,
  TradeRequestPacket,
  TradeFinishedPacket,
  TradeItemAddedPacket,
  TradeItemRemovedPacket,
  LoginResponsePacket,
  LogoutResponsePacket,
  ChatMessagePacket,
  ObjectHitPacket,
  ObjectHitExtendedPacket,
  ObjectMovedPacket,
  ObjectWalkedPacket,
  ObjectWalkedExtendedPacket,
  ObjectWalked075Packet,
  ExperienceGainedPacket,
  ExperienceGainedExtendedPacket,
  MapChangedPacket,
  MapChanged075Packet,
  ApplyKeyConfigurationPacket,
  ItemsDroppedPacket,
  MoneyDroppedPacket,
  MoneyDroppedExtendedPacket,
  MoneyDropped075Packet,
  ItemDropRemovedPacket,
  ItemAddedToInventoryPacket,
  ItemDropResponsePacket,
  ItemPickUpRequestFailedPacket,
  InventoryMoneyUpdatePacket,
  ItemMovedPacket,
  ItemMoveRequestFailedPacket,
  CurrentHealthAndShieldPacket,
  MaximumHealthAndShieldPacket,
  CurrentStatsExtendedPacket,
  MaximumStatsExtendedPacket,
  ItemConsumptionFailedPacket,
  ItemConsumptionFailedExtendedPacket,
  BaseStatsExtendedPacket,
  CurrentManaAndAbilityPacket,
  MaximumManaAndAbilityPacket,
  ItemRemovedPacket,
  ConsumeItemWithEffectPacket,
  ItemDurabilityChangedPacket,
  FruitConsumptionResponsePacket,
  EffectItemConsumptionPacket,
  NpcWindowResponsePacket,
  StoreItemListPacket,
  NpcItemBuyFailedPacket,
  ItemBoughtPacket,
  NpcItemSellResultPacket,
  PlayerShopSetItemPriceResponsePacket,
  PlayerShopClosedPacket,
  PlayerShopItemSoldToPlayerPacket,
  ClosePlayerShopDialogPacket,
  PlayerShopItemListPacket,
  PlayerShopBuyResultPacket,
  PlayerShopBuyResultExtendedPacket,
  PlayerShopItemListExtendedPacket,
  PlayerShopsPacket,
  AddTransformedCharactersToScope075Packet,
  AddTransformedCharactersToScopePacket,
  ChangeTerrainAttributesPacket,
  ShowEffectPacket,
  CharacterListPacket,
  CharacterListExtendedPacket,
  CharacterClassCreationUnlockPacket,
  CharacterList075Packet,
  CharacterList095Packet,
  CharacterCreationSuccessfulPacket,
  CharacterCreationFailedPacket,
  RespawnAfterDeath075Packet,
  RespawnAfterDeath095Packet,
  RespawnAfterDeathPacket,
  RespawnAfterDeathExtendedPacket,
  PoisonDamagePacket,
  HeroStateChangedPacket,
  SkillAddedPacket,
  SkillRemovedPacket,
  SkillListUpdatePacket,
  SkillAdded075Packet,
  SkillRemoved075Packet,
  SkillAdded095Packet,
  SkillRemoved095Packet,
  SkillListUpdate075Packet,
  CharacterFocusedPacket,
  CharacterStatIncreaseResponsePacket,
  CharacterStatIncreaseResponseExtendedPacket,
  CharacterDeleteResponsePacket,
  CharacterLevelUpdatePacket,
  CharacterInformationPacket,
  CharacterLevelUpdateExtendedPacket,
  CharacterInformationExtendedPacket,
  CharacterInformation075Packet,
  CharacterInformation097Packet,
  CharacterInventoryPacket,
  InventoryItemUpgradedPacket,
  SummonHealthUpdatePacket,
  GuildSoccerTimeUpdatePacket,
  GuildSoccerScoreUpdatePacket,
  ServerCommandPacket,
  ShowFireworksPacket,
  ShowChristmasFireworksPacket,
  PlayFanfareSoundPacket,
  ShowSwirlPacket,
  MasterStatsUpdatePacket,
  MasterStatsUpdateExtendedPacket,
  MasterCharacterLevelUpdatePacket,
  MasterCharacterLevelUpdateExtendedPacket,
  MasterSkillLevelUpdatePacket,
  MasterSkillListPacket,
  ServerMessagePacket,
  GuildJoinRequestPacket,
  GuildJoinResponsePacket,
  GuildListPacket,
  GuildList075Packet,
  GuildKickResponsePacket,
  ShowGuildMasterDialogPacket,
  ShowGuildCreationDialogPacket,
  GuildCreationResultPacket,
  GuildMemberLeftGuildPacket,
  GuildWarRequestResultPacket,
  GuildWarRequestPacket,
  GuildWarDeclaredPacket,
  GuildWarEndedPacket,
  GuildWarScoreUpdatePacket,
  GuildRelationshipRequestPacket,
  GuildRelationshipChangeResultPacket,
  AllianceListPacket,
  RemoveAllianceGuildResultPacket,
  AssignCharacterToGuildPacket,
  AssignCharacterToGuild075Packet,
  GuildInformationPacket,
  GuildInformations075Packet,
  SingleGuildInformation075Packet,
  VaultMoneyUpdatePacket,
  VaultClosedPacket,
  VaultProtectionInformationPacket,
  ItemCraftingResultPacket,
  CraftingDialogClosed075Packet,
  LegacyQuestStateListPacket,
  LegacyQuestStateDialogPacket,
  LegacySetQuestStateResponsePacket,
  LegacyQuestRewardPacket,
  LegacyQuestMonsterKillInfoPacket,
  PetModePacket,
  PetAttackPacket,
  PetInfoResponsePacket,
  DuelStartResultPacket,
  DuelStartRequestPacket,
  DuelEndPacket,
  DuelScorePacket,
  DuelHealthUpdatePacket,
  DuelStatusPacket,
  DuelInitPacket,
  DuelHealthBarInitPacket,
  DuelSpectatorAddedPacket,
  DuelSpectatorRemovedPacket,
  DuelSpectatorListPacket,
  DuelFinishedPacket,
  SkillStageUpdatePacket,
  IllusionTempleEnterResultPacket,
  IllusionTempleStatePacket,
  IllusionTempleSkillUsageResultPacket,
  IllusionTempleUserCountPacket,
  IllusionTempleResultPacket,
  IllusionTempleSkillPointUpdatePacket,
  IllusionTempleSkillEndedPacket,
  IllusionTempleHolyItemRelicsPacket,
  IllusionTempleSkillEndPacket,
  ChainLightningHitInfoPacket,
  MuHelperStatusUpdatePacket,
  MuHelperConfigurationDataPacket,
  MessengerInitializationPacket,
  FriendAddedPacket,
  FriendRequestPacket,
  FriendDeletedPacket,
  FriendOnlineStateUpdatePacket,
  LetterSendResponsePacket,
  AddLetterPacket,
  OpenLetterPacket,
  OpenLetterExtendedPacket,
  RemoveLetterPacket,
  ChatRoomConnectionInfoPacket,
  FriendInvitationResultPacket,
  QuestEventResponsePacket,
  AvailableQuestsPacket,
  QuestStepInfoPacket,
  QuestProgressPacket,
  QuestProgressExtendedPacket,
  QuestCompletionResponsePacket,
  QuestCancelledPacket,
  QuestStateListPacket,
  QuestStatePacket,
  QuestStateExtendedPacket,
  OpenNpcDialogPacket,
  DevilSquareEnterResultPacket,
  MiniGameOpeningStatePacket,
  UpdateMiniGameStatePacket,
  MiniGameScoreTablePacket,
  BloodCastleScorePacket,
  BloodCastleEnterResultPacket,
  BloodCastleStatePacket,
  ChaosCastleEnterResultPacket,
  MapEventStatePacket,
  AvailableChatCommandPacket,
  EventChipRegistrationResultPacket,
  CastleSiegeStatusResponsePacket,
  CastleSiegeRegistrationResponsePacket,
  CastleSiegeUnregisterResponsePacket,
  CastleSiegeRegistrationStateResponsePacket,
  CastleSiegeMarkRegistrationResponsePacket,
  CastleSiegeDefenseBuyResponsePacket,
  CastleSiegeDefenseRepairResponsePacket,
  CastleSiegeDefenseUpgradeResponsePacket,
  CastleSiegeTaxInfoResponsePacket,
  CastleSiegeTaxChangeResponsePacket,
  CastleSiegeTributeWithdrawResponsePacket,
  CastleSiegeGateInterfaceResponsePacket,
  CastleSiegeGateOperateResponsePacket,
  CastleSiegeGateStateNotificationPacket,
  CastleSiegeCrownSwitchStatePacket,
  CastleSiegeCrownAccessStatePacket,
  CastleSiegeCrownStateUpdatePacket,
  CastleSiegeBattleStartEndPacket,
  CastleSiegeBattleProcessPacket,
  CastleSiegeJoinSideNotificationPacket,
  CastleSiegeTaxRateNotificationPacket,
  CastleSiegeMiniMapResponsePacket,
  CastleSiegeGuildCommandPacket,
  CastleSiegeRemainingTimePacket,
  CastleSiegeHuntingZoneEntranceSettingResponsePacket,
  CastleSiegeSwitchInfoPacket,
  CastleSiegeNpcListPacket,
  CastleSiegeRegisteredGuildListPacket,
  CastleSiegeGuildListPacket,
  CastleSiegeMiniMapPlayerPositionsPacket,
  CastleSiegeMachineInterfacePacket,
  CastleSiegeMachineUseResultPacket,
  CastleSiegeMachineRegionNotifyPacket,
  CastleSiegeLifeStoneBuildTimePacket,
  CastleSiegeOwnerLogoPacket,
  CastleSiegeHuntingZoneGuardInfoPacket,
  CastleSiegeHuntingZoneEnterResponsePacket,
  CastleSiegeMiniMapNpcPositionsPacket,
  CrywolfStateInfoPacket,
  CrywolfAltarInfoPacket,
  CrywolfContractResultPacket,
  CrywolfLeftTimePacket,
  CrywolfBossMonsterInfoPacket,
  CrywolfBenefitPacket,
  MarketplaceEscrowResultPacket,
  LoginTokenAnswerPacket,
  KanturuStateInfoPacket,
  KanturuEnterResultPacket,
  KanturuStateChangePacket,
  KanturuBattleResultPacket,
  KanturuTimeLimitPacket,
  KanturuMayaWideAreaAttackPacket,
  KanturuMonsterUserCountPacket
] as const;