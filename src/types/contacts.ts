
import { Contact } from './database';

export type ContactInsert = Omit<Contact, 'id' | 'created_at' | 'updated_at' | 'tenant_id'> & {
  tenant_id?: string;
};

export type ContactUpdate = Partial<Omit<Contact, 'id' | 'created_at' | 'updated_at' | 'tenant_id'>>;
