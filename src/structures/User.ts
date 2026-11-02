import { Base } from "./Base";
import { UserFlagsBitField } from "../util/UserFlags";
import type { Client } from "../client/Client";

export interface APIUser {
  id: string;
  username: string;
  discriminator: string;
  global_name: string | null;
  avatar: string | null;
  bot?: boolean;
  public_flags?: number;
}

export class User extends Base {
  public id: string;
  public username: string;
  public discriminator: string;
  public globalName: string | null;
  public avatar: string | null;
  public bot: boolean;
  public flags: UserFlagsBitField;

  constructor(client: Client, data: APIUser) {
    super(client);
    this.id = data.id;
    this.username = data.username;
    this.discriminator = data.discriminator;
    this.globalName = data.global_name;
    this.avatar = data.avatar;
    this.bot = data.bot ?? false;
    this.flags = new UserFlagsBitField(BigInt(data.public_flags ?? 0));
  }

  public _patch(data: Partial<APIUser>): this {
    if (data.username !== undefined) this.username = data.username;
    if (data.discriminator !== undefined) this.discriminator = data.discriminator;
    if (data.global_name !== undefined) this.globalName = data.global_name;
    if (data.avatar !== undefined) this.avatar = data.avatar;
    if (data.public_flags !== undefined) this.flags = new UserFlagsBitField(BigInt(data.public_flags));
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

  /** Opens (or reuses, per Discord's own dedup) a DM channel with this user. */
  public async createDM(): Promise<import("./DMChannel").DMChannel> {
    const { DMChannel } = await import("./DMChannel");
    const data = await this.client.rest.post<import("./Channel").APIChannel>("/users/@me/channels", {
      recipient_id: this.id,
    });
    return new DMChannel(this.client, data);
  }

  public async send(payload: import("./Message").MessagePayload): Promise<import("./Message").Message> {
    const dm = await this.createDM();
    return dm.send(payload);
  }
}
