import { Collection } from "./Collection";
import { Role, type APIRole } from "../structures/Role";
import type { Client } from "../client/Client";

export class RoleManager extends Collection<string, Role> {
  constructor(
    private readonly client: Client,
    private readonly guildId: string,
  ) {
    super();
  }

  public async create(
    data: { name: string; permissions?: string; color?: number; hoist?: boolean },
    reason?: string,
  ): Promise<Role> {
    const payload = await this.client.rest.post<APIRole>(`/guilds/${this.guildId}/roles`, data, reason);
    const role = new Role(this.client, this.guildId, payload);
    this.set(role.id, role);
    return role;
  }

  public async edit(
    roleId: string,
    data: Partial<{
      name: string;
      permissions: string;
      color: number;
      hoist: boolean;
      icon: string | null;
      unicode_emoji: string | null;
      mentionable: boolean;
    }>,
    reason?: string,
  ): Promise<Role> {
    const payload = await this.client.rest.patch<APIRole>(`/guilds/${this.guildId}/roles/${roleId}`, data, reason);
    const role = new Role(this.client, this.guildId, payload);
    this.set(role.id, role);
    return role;
  }

  public async remove(roleId: string, reason?: string): Promise<void> {
    await this.client.rest.delete(`/guilds/${this.guildId}/roles/${roleId}`, reason);
    this.delete(roleId);
  }

  public async fetchAll(): Promise<Role[]> {
    const data = await this.client.rest.get<APIRole[]>(`/guilds/${this.guildId}/roles`);
    this.clear();
    return data.map((role) => {
      const instance = new Role(this.client, this.guildId, role);
      this.set(instance.id, instance);
      return instance;
    });
  }

  public async setPositions(positions: { id: string; position: number }[], reason?: string): Promise<Role[]> {
    const data = await this.client.rest.patch<APIRole[]>(`/guilds/${this.guildId}/roles`, positions, reason);
    return data.map((role) => {
      const instance = new Role(this.client, this.guildId, role);
      this.set(instance.id, instance);
      return instance;
    });
  }
}
