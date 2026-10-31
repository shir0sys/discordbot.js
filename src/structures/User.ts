import { Base } from "./Base";
import type { Client } from "../client/Client";

export interface APIUser {
  id: string;
  username: string;
  discriminator: string;
  global_name: string | null;
  avatar: string | null;
  bot?: boolean;
}

export class User extends Base {
  public id: string;
  public username: string;
  public discriminator: string;
  public globalName: string | null;
  public avatar: string | null;
  public bot: boolean;

  constructor(client: Client, data: APIUser) {
    super(client);
    this.id = data.id;
    this.username = data.username;
    this.discriminator = data.discriminator;
    this.globalName = data.global_name;
    this.avatar = data.avatar;
    this.bot = data.bot ?? false;
  }

  public _patch(data: Partial<APIUser>): this {
    if (data.username !== undefined) this.username = data.username;
    if (data.discriminator !== undefined) this.discriminator = data.discriminator;
    if (data.global_name !== undefined) this.globalName = data.global_name;
    if (data.avatar !== undefined) this.avatar = data.avatar;
    return this;
  }

  public get tag(): string {
    return this.discriminator === "0" ? this.username : `${this.username}#${this.discriminator}`;
  }

  public avatarURL(): string | null {
    if (!this.avatar) return null;
    const ext = this.avatar.startsWith("a_") ? "gif" : "png";
    return `https://cdn.discordapp.com/avatars/${this.id}/${this.avatar}.${ext}`;
  }

  public toString(): string {
    return `<@${this.id}>`;
  }
}
