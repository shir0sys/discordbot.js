import { User } from "./User";
import { GatewayOpcodes } from "../util/Constants";

export class ClientUser extends User {
  public setPresence(presence: Record<string, unknown>): void {
    this.client.gateway.send(GatewayOpcodes.PresenceUpdate, presence);
  }
}
