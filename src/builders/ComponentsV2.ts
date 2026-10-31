import { ComponentType } from "../util/Constants";
import type { JSONEncodable } from "./Components";

/**
 * Components V2 (top-level layout components). Sending any of these requires
 * setting MessageFlags.IsComponentsV2 on the message, which also disables
 * `content`/`embeds` on that message in favor of TextDisplay/MediaGallery.
 */
export class TextDisplayBuilder implements JSONEncodable {
  constructor(private content: string = "") {}

  public setContent(content: string): this {
    this.content = content;
    return this;
  }

  public toJSON(): object {
    return { type: ComponentType.TextDisplay, content: this.content };
  }
}

export class ThumbnailBuilder implements JSONEncodable {
  private url?: string;
  private description?: string;
  private spoiler = false;

  public setURL(url: string): this {
    this.url = url;
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

  public toJSON(): object {
    return {
      type: ComponentType.Thumbnail,
      media: { url: this.url },
      description: this.description,
      spoiler: this.spoiler,
    };
  }
}

export interface MediaGalleryItem {
  url: string;
  description?: string;
  spoiler?: boolean;
}

export class MediaGalleryBuilder implements JSONEncodable {
  private items: MediaGalleryItem[] = [];

  public addItems(...items: MediaGalleryItem[]): this {
    this.items.push(...items);
    return this;
  }

  public toJSON(): object {
    return {
      type: ComponentType.MediaGallery,
      items: this.items.map((item) => ({
        media: { url: item.url },
        description: item.description,
        spoiler: item.spoiler,
      })),
    };
  }
}

export class FileBuilder implements JSONEncodable {
  private url?: string;
  private spoiler = false;

  public setURL(url: string): this {
    this.url = url;
    return this;
  }

  public setSpoiler(spoiler = true): this {
    this.spoiler = spoiler;
    return this;
  }

  public toJSON(): object {
    return { type: ComponentType.File, file: { url: this.url }, spoiler: this.spoiler };
  }
}

export class SeparatorBuilder implements JSONEncodable {
  private divider = true;
  private spacing: 1 | 2 = 1;

  public setDivider(divider = true): this {
    this.divider = divider;
    return this;
  }

  public setSpacing(spacing: 1 | 2): this {
    this.spacing = spacing;
    return this;
  }

  public toJSON(): object {
    return { type: ComponentType.Separator, divider: this.divider, spacing: this.spacing };
  }
}

export class SectionBuilder implements JSONEncodable {
  private components: JSONEncodable[] = [];
  private accessory?: JSONEncodable;

  public addComponents(...components: JSONEncodable[]): this {
    this.components.push(...components);
    return this;
  }

  public setAccessory(accessory: JSONEncodable): this {
    this.accessory = accessory;
    return this;
  }

  public toJSON(): object {
    return {
      type: ComponentType.Section,
      components: this.components.map((c) => c.toJSON()),
      accessory: this.accessory?.toJSON(),
    };
  }
}

export class ContainerBuilder implements JSONEncodable {
  private components: JSONEncodable[] = [];
  private accentColor?: number;
  private spoiler = false;

  public addComponents(...components: JSONEncodable[]): this {
    this.components.push(...components);
    return this;
  }

  public setAccentColor(color: number): this {
    this.accentColor = color;
    return this;
  }

  public setSpoiler(spoiler = true): this {
    this.spoiler = spoiler;
    return this;
  }

  public toJSON(): object {
    return {
      type: ComponentType.Container,
      accent_color: this.accentColor,
      spoiler: this.spoiler,
      components: this.components.map((c) => c.toJSON()),
    };
  }
}
