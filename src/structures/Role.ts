import { Base } from "./Base";
import type { Client } from "../client/Client";

export interface APIRole {
  id: string;
  name: string;
  color: number;
  position: number;
  permissions: string;
  managed: boolean;
}

export class Role extends Base {
  public id: string;
  public guildId: string;
  public name: string;
  public color: number;
  public position: number;
  public permissions: bigint;
  public managed: boolean;

  constructor(client: Client, guildId: string, data: APIRole) {
    super(client);
    this.guildId = guildId;
    this.id = data.id;
    this.name = data.name;
    this.color = data.color;
    this.position = data.position;
    this.permissions = BigInt(data.permissions);
    this.managed = data.managed;
  }

  public toString(): string {
    return `<@&${this.id}>`;
  }
}
