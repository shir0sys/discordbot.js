import type { Client } from "../client/Client";

export abstract class Base {
  public readonly client: Client;

  constructor(client: Client) {
    this.client = client;
  }
}
