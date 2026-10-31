import { CachedManager } from "./CachedManager";
import { User, type APIUser } from "../structures/User";
import type { Client } from "../client/Client";

export class UserManager extends CachedManager<string, User> {
  constructor(client: Client) {
    super(client, 10000);
  }

  public async fetch(id: string, options: { force?: boolean } = {}): Promise<User> {
    if (!options.force) {
      const cached = this.get(id);
      if (cached) return cached;
    }
    return this.fetchAndCache<APIUser>(id, `/users/${id}`, (data) => new User(this.client, data));
  }
}
