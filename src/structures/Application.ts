import { ApplicationFlagsBitField } from "../util/ApplicationFlags";
import type { Client } from "../client/Client";

export interface APIApplication {
  id: string;
  name: string;
  icon: string | null;
  description: string;
  bot_public: boolean;
  bot_require_code_grant: boolean;
  owner_id?: string;
  verify_key: string;
  flags?: number;
  tags?: string[];
  install_params?: { scopes: string[]; permissions: string };
  custom_install_url?: string;
  role_connections_verification_url?: string;
}

export interface APIApplicationRoleConnectionMetadata {
  type: number;
  key: string;
  name: string;
  description: string;
  name_localizations?: Record<string, string>;
  description_localizations?: Record<string, string>;
}

/** The bot's own application, fetched from /applications/@me. */
export class Application {
  public id: string;
  public name: string;
  public icon: string | null;
  public description: string;
  public botPublic: boolean;
  public botRequireCodeGrant: boolean;
  public ownerId: string | null;
  public flags: ApplicationFlagsBitField;
  public tags: string[];
  public installParams: { scopes: string[]; permissions: string } | null;
  public customInstallURL: string | null;
  public roleConnectionsVerificationURL: string | null;

  constructor(
    private readonly client: Client,
    data: APIApplication,
  ) {
    this.id = data.id;
    this.name = data.name;
    this.icon = data.icon;
    this.description = data.description;
    this.botPublic = data.bot_public;
    this.botRequireCodeGrant = data.bot_require_code_grant;
    this.ownerId = data.owner_id ?? null;
    this.flags = new ApplicationFlagsBitField(BigInt(data.flags ?? 0));
    this.tags = data.tags ?? [];
    this.installParams = data.install_params ?? null;
    this.customInstallURL = data.custom_install_url ?? null;
    this.roleConnectionsVerificationURL = data.role_connections_verification_url ?? null;
  }

  public iconURL(): string | null {
    if (!this.icon) return null;
    return `https://cdn.discordapp.com/app-icons/${this.id}/${this.icon}.png`;
  }

  public fetchRoleConnectionMetadata(): Promise<APIApplicationRoleConnectionMetadata[]> {
    return this.client.rest.get<APIApplicationRoleConnectionMetadata[]>(
      `/applications/${this.id}/role-connections/metadata`,
    );
  }

  public editRoleConnectionMetadata(
    records: APIApplicationRoleConnectionMetadata[],
  ): Promise<APIApplicationRoleConnectionMetadata[]> {
    return this.client.rest.put<APIApplicationRoleConnectionMetadata[]>(
      `/applications/${this.id}/role-connections/metadata`,
      records,
    );
  }
}
