import { Base } from "./Base";
import { normalizeMessagePayload, type MessagePayload } from "./Message";
import type { Client } from "../client/Client";

export interface APIWebhook {
  id: string;
  type: number;
  guild_id?: string;
  channel_id: string;
  name: string | null;
  avatar: string | null;
  token?: string;
}

export class Webhook extends Base {
  public id: string;
  public channelId: string;
  public guildId: string | null;
  public name: string | null;
  public token: string | null;

  constructor(client: Client, data: APIWebhook) {
    super(client);
    this.id = data.id;
    this.channelId = data.channel_id;
    this.guildId = data.guild_id ?? null;
    this.name = data.name;
    this.token = data.token ?? null;
  }

  public async edit(data: { name?: string; channel_id?: string }, reason?: string): Promise<void> {
    await this.client.rest.patch(`/webhooks/${this.id}`, data, reason);
  }

  public async delete(reason?: string): Promise<void> {
    await this.client.rest.delete(`/webhooks/${this.id}`, reason);
  }

  public async send(payload: MessagePayload): Promise<void> {
    if (!this.token) throw new Error("Cannot execute a webhook without its token");
    const { body, files } = normalizeMessagePayload(payload);
    await this.client.rest.post(`/webhooks/${this.id}/${this.token}`, body, undefined, files);
  }
}

/** Standalone webhook execution client, authenticated purely via the webhook id/token (no bot token required). */
export class WebhookClient {
  constructor(
    private readonly id: string,
    private readonly token: string,
  ) {}

  public async send(payload: MessagePayload): Promise<void> {
    const { body, files } = normalizeMessagePayload(payload);
    const form = files?.length ? buildFormData(body, files) : undefined;
    const response = await fetch(`https://discord.com/api/v10/webhooks/${this.id}/${this.token}`, {
      method: "POST",
      headers: form ? undefined : { "Content-Type": "application/json" },
      body: form ?? JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`Webhook execution failed with status ${response.status}`);
  }
}

function buildFormData(body: Record<string, unknown>, files: import("../rest/REST").RESTFile[]): FormData {
  const form = new FormData();
  form.append("payload_json", JSON.stringify(body));
  files.forEach((file, index) => {
    const blob = file.data instanceof Blob ? file.data : new Blob([file.data as BlobPart], { type: file.contentType });
    form.append(`files[${index}]`, blob, file.name);
  });
  return form;
}
