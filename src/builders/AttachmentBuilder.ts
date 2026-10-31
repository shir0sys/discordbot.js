import type { RESTFile } from "../rest/REST";

export class AttachmentBuilder {
  private name: string;
  private description?: string;
  private spoiler = false;

  constructor(
    private readonly data: Buffer | Uint8Array | Blob,
    name: string,
  ) {
    this.name = name;
  }

  public setName(name: string): this {
    this.name = name;
    return this;
  }

  public setDescription(description: string): this {
    this.description = description;
    return this;
  }

  public setSpoiler(spoiler = true): this {
    this.spoiler = spoiler;
    return this;
  }

  public get filename(): string {
    return this.spoiler && !this.name.startsWith("SPOILER_") ? `SPOILER_${this.name}` : this.name;
  }

  public toFile(): RESTFile {
    return { name: this.filename, data: this.data };
  }

  public toJSON(): object {
    return { filename: this.filename, description: this.description };
  }
}
