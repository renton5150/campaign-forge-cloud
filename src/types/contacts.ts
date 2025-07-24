
import { Contact } from './database';

export type ContactInsert = Omit<Contact, 'id' | 'created_at' | 'updated_at' | 'tenant_id' | 'created_by'> & {
  tenant_id?: string;
  created_by?: string;
};

export type ContactUpdate = Partial<Omit<Contact, 'id' | 'created_at' | 'updated_at' | 'tenant_id'>>;
