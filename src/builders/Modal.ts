import { ComponentType, TextInputStyle } from "../util/Constants";
import { ActionRowBuilder, type JSONEncodable } from "./Components";

export class TextInputBuilder implements JSONEncodable {
  private customId?: string;
  private label?: string;
  private style: TextInputStyle = TextInputStyle.Short;
  private placeholder?: string;
  private value?: string;
  private required = true;
  private minLength?: number;
  private maxLength?: number;

  public setCustomId(customId: string): this {
    this.customId = customId;
    return this;
  }

  public setLabel(label: string): this {
    this.label = label;
    return this;
  }

  public setStyle(style: TextInputStyle): this {
    this.style = style;
    return this;
  }

  public setPlaceholder(placeholder: string): this {
    this.placeholder = placeholder;
    return this;
  }

  public setValue(value: string): this {
    this.value = value;
    return this;
  }

  public setRequired(required = true): this {
    this.required = required;
    return this;
  }

  public setMinLength(min: number): this {
    this.minLength = min;
    return this;
  }

  public setMaxLength(max: number): this {
    this.maxLength = max;
    return this;
  }

  public toJSON(): object {
    return {
      type: ComponentType.TextInput,
      custom_id: this.customId,
      label: this.label,
      style: this.style,
      placeholder: this.placeholder,
      value: this.value,
      required: this.required,
      min_length: this.minLength,
      max_length: this.maxLength,
    };
  }
}

export class ModalBuilder implements JSONEncodable {
  private customId?: string;
  private title?: string;
  private rows: ActionRowBuilder[] = [];

  public setCustomId(customId: string): this {
    this.customId = customId;
    return this;
  }

  public setTitle(title: string): this {
    this.title = title;
    return this;
  }

  public addComponents(...rows: ActionRowBuilder[]): this {
    this.rows.push(...rows);
    return this;
  }

  public toJSON(): object {
    return {
      custom_id: this.customId,
      title: this.title,
      components: this.rows.map((row) => row.toJSON()),
    };
  }
}
