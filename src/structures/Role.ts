import { Base } from "./Base";
import { RoleFlagsBitField } from "../util/RoleFlags";
import type { Client } from "../client/Client";

export interface APIRole {
  id: string;
  name: string;
  color: number;
  position: number;
  permissions: string;
  managed: boolean;
  hoist?: boolean;
  mentionable?: boolean;
  icon?: string | null;
  unicode_emoji?: string | null;
  flags?: number;
}

export class Role extends Base {
  public id: string;
  public guildId: string;
  public name: string;
  public color: number;
  public position: number;
  public permissions: bigint;
  public managed: boolean;
  public hoist: boolean;
  public mentionable: boolean;
  public icon: string | null;
  public unicodeEmoji: string | null;
  public flags: RoleFlagsBitField;

  constructor(client: Client, guildId: string, data: APIRole) {
    super(client);
    this.guildId = guildId;
    this.id = data.id;
    this.name = data.name;
    this.color = data.color;
    this.position = data.position;
    this.permissions = BigInt(data.permissions);
    this.managed = data.managed;
    this.hoist = data.hoist ?? false;
    this.mentionable = data.mentionable ?? false;
    this.icon = data.icon ?? null;
    this.unicodeEmoji = data.unicode_emoji ?? null;
    this.flags = new RoleFlagsBitField(BigInt(data.flags ?? 0));
  }

  public toString(): string {
    return `<@&${this.id}>`;
  }
}
