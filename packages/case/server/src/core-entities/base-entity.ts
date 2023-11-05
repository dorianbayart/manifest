import { PrimaryGeneratedColumn } from 'typeorm'

// The base entity is used to extend all entities in the application.
export class BaseEntity {
  @PrimaryGeneratedColumn()
  id: number

  // The _relations property is used to make relations available in the beforeInsert and beforeUpdate hooks.
  _relations?: { [key: string]: any }
}
