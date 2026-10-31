import { EventEmitter } from "node:events";
import { REST } from "../rest/REST";
import { Gateway } from "../gateway/Gateway";
import { IntentsBitField, type IntentResolvable } from "../util/Intents";
import { GuildManager } from "../managers/GuildManager";
import { ChannelManager } from "../managers/ChannelManager";
import { UserManager } from "../managers/UserManager";
import { ApplicationCommandManager } from "../managers/ApplicationCommandManager";
import { ClientUser } from "../structures/ClientUser";
import { Guild, type APIGuild } from "../structures/Guild";
import { Message, type APIMessage } from "../structures/Message";
import { Interaction, type APIInteraction } from "../structures/Interaction";
import { CommandInteraction } from "../structures/CommandInteraction";
import { InteractionType } from "../util/Constants";
import type { APIUser } from "../structures/User";

export interface ClientOptions {
  intents: IntentResolvable;
  largeThreshold?: number;
}

type ClientEvents = {
  ready: [];
  messageCreate: [Message];
  guildCreate: [Guild];
  interactionCreate: [Interaction];
  debug: [string];
};

export class Client extends EventEmitter {
  public readonly guilds: GuildManager;
  public readonly channels: ChannelManager;
  public readonly users: UserManager;
  public readonly application: ApplicationCommandManager;
  public readonly intents: IntentsBitField;

  // Constructed lazily in login(): the REST/Gateway clients need the bot
  // token up front and ClientOptions alone doesn't carry one.
  private _rest: REST | null = null;
  private _gateway: Gateway | null = null;

  public user: ClientUser | null = null;
  public applicationId: string | null = null;

  constructor(private readonly options: ClientOptions) {
    super();
    this.intents = new IntentsBitField(options.intents);
    this.guilds = new GuildManager(this);
    this.channels = new ChannelManager(this);
    this.users = new UserManager(this);
    this.application = new ApplicationCommandManager(this);
  }

  public get rest(): REST {
    if (!this._rest) throw new Error("Client is not logged in yet");
    return this._rest;
  }

  public get gateway(): Gateway {
    if (!this._gateway) throw new Error("Client is not logged in yet");
    return this._gateway;
  }

  public async login(token: string): Promise<void> {
    this._rest = new REST({ token });
    this._gateway = new Gateway({
      token,
      intents: this.intents.bitfield,
      largeThreshold: this.options.largeThreshold,
    });
    this._gateway.on("dispatch", (event, data) => this.onDispatch(event, data));
    this._gateway.on("debug", (message) => this.emit("debug", message));
    this._gateway.connect();
  }

  private onDispatch(event: string, data: unknown): void {
    switch (event) {
      case "READY": {
        const payload = data as { user: APIUser; application: { id: string } };
        this.user = new ClientUser(this, payload.user);
        this.applicationId = payload.application.id;
        this.emit("ready");
        break;
      }
      case "MESSAGE_CREATE": {
        const message = new Message(this, data as APIMessage);
        this.emit("messageCreate", message);
        break;
      }
      case "GUILD_CREATE": {
        const guild = new Guild(this, data as APIGuild);
        this.guilds.cache.set(guild.id, guild);
        this.emit("guildCreate", guild);
        break;
      }
      case "INTERACTION_CREATE": {
        const raw = data as APIInteraction;
        const interaction =
          raw.type === InteractionType.ApplicationCommand
            ? new CommandInteraction(this, raw)
            : new Interaction(this, raw);
        this.emit("interactionCreate", interaction);
        break;
      }
    }
  }

  public destroy(): void {
    this.gateway.destroy();
  }
}

export interface Client {
  on<K extends keyof ClientEvents>(event: K, listener: (...args: ClientEvents[K]) => void): this;
  once<K extends keyof ClientEvents>(event: K, listener: (...args: ClientEvents[K]) => void): this;
  emit<K extends keyof ClientEvents>(event: K, ...args: ClientEvents[K]): boolean;
}
