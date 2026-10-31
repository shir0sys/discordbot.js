export interface APIEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

export interface APIEmbed {
  title?: string;
  description?: string;
  url?: string;
  timestamp?: string;
  color?: number;
  footer?: { text: string; icon_url?: string };
  image?: { url: string };
  thumbnail?: { url: string };
  author?: { name: string; url?: string; icon_url?: string };
  fields?: APIEmbedField[];
}

export class EmbedBuilder {
  private data: APIEmbed = {};

  constructor(data: APIEmbed = {}) {
    this.data = { ...data, fields: data.fields ? [...data.fields] : [] };
  }

  public setTitle(title: string): this {
    this.data.title = title;
    return this;
  }

  public setDescription(description: string): this {
    this.data.description = description;
    return this;
  }

  public setURL(url: string): this {
    this.data.url = url;
    return this;
  }

  public setColor(color: number): this {
    this.data.color = color;
    return this;
  }

  public setTimestamp(timestamp: Date | number = Date.now()): this {
    this.data.timestamp = new Date(timestamp).toISOString();
    return this;
  }

  public setFooter(text: string, iconURL?: string): this {
    this.data.footer = { text, icon_url: iconURL };
    return this;
  }

  public setImage(url: string): this {
    this.data.image = { url };
    return this;
  }

  public setThumbnail(url: string): this {
    this.data.thumbnail = { url };
    return this;
  }

  public setAuthor(name: string, iconURL?: string, url?: string): this {
    this.data.author = { name, icon_url: iconURL, url };
    return this;
  }

  public addFields(...fields: APIEmbedField[]): this {
    this.data.fields!.push(...fields);
    return this;
  }

  public toJSON(): APIEmbed {
    return this.data;
  }
}
