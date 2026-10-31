import { ApplicationCommandType } from "../util/Constants";

export class ContextMenuCommandBuilder {
  private name = "";
  private type: ApplicationCommandType.User | ApplicationCommandType.Message = ApplicationCommandType.Message;

  public setName(name: string): this {
    this.name = name;
    return this;
  }

  public setType(type: ApplicationCommandType.User | ApplicationCommandType.Message): this {
    this.type = type;
    return this;
  }

  public toJSON(): object {
    return { name: this.name, type: this.type };
  }
}
