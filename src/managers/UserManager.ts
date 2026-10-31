import { Collection } from "./Collection";
import { User, type APIUser } from "../structures/User";
import type { Client } from "../client/Client";

export class UserManager {
  public readonly cache = new Collection<string, User>(null, 10000);

  constructor(private readonly client: Client) {}

  public async fetch(id: string): Promise<User> {
    const cached = this.cache.get(id);
    if (cached) return cached;
    const data = await this.client.rest.get<APIUser>(`/users/${id}`);
    const user = new User(this.client, data);
    this.cache.set(user.id, user);
    return user;
  }
}
