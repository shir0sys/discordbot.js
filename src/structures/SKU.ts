export interface APISKU {
  id: string;
  type: number;
  application_id: string;
  name: string;
  slug: string;
}

export class SKU {
  public id: string;
  public type: number;
  public applicationId: string;
  public name: string;
  public slug: string;

  constructor(data: APISKU) {
    this.id = data.id;
    this.type = data.type;
    this.applicationId = data.application_id;
    this.name = data.name;
    this.slug = data.slug;
  }
}
