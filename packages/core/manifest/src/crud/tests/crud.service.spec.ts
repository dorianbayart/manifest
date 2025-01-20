import { CrudService } from '../services/crud.service'
import { Test, TestingModule } from '@nestjs/testing'
import { EntityManifestService } from '../../manifest/services/entity-manifest.service'
import { PaginationService } from '../services/pagination.service'
import { EntityService } from '../../entity/services/entity.service'
import { ValidationService } from '../../validation/services/validation.service'
import { RelationshipService } from '../../entity/services/relationship.service'
describe('CrudService', () => {
  let service: CrudService
  let entityService: EntityService
  let validationService: ValidationService

  const dummyItem = {
    name: 'Superman',
    age: 30,
    color: 'blue',
    mentor: {
      name: 'Batman',
      age: 40,
      color: 'black'
    }
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CrudService,
        {
          provide: EntityManifestService,
          useValue: {
            getEntityManifest: jest.fn(() => ({
              relationships: []
            }))
          }
        },
        {
          provide: PaginationService,
          useValue: {
            paginate: jest.fn()
          }
        },
        {
          provide: EntityService,
          useValue: {
            findOne: jest.fn(),
            getEntityRepository: jest.fn(() => ({
              findOne: jest.fn(() => Promise.resolve(dummyItem)),
              create: jest.fn((item) => item),
              save: jest.fn((item) => item)
            }))
          }
        },
        {
          provide: ValidationService,
          useValue: {
            validate: jest.fn(() => [])
          }
        },
        {
          provide: RelationshipService,
          useValue: {
            fetchRelationItemsFromDto: jest.fn((itemDto) => ({
              mentor: itemDto.mentor
            }))
          }
        }
      ]
    }).compile()

    service = module.get<CrudService>(CrudService)
    entityService = module.get<EntityService>(EntityService)
    validationService = module.get<ValidationService>(ValidationService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('update', () => {
    it('should update an entity', async () => {
      const entitySlug = 'test'
      const id = 1
      const itemDto = { name: 'test' }

      const result = await service.update({ entitySlug, id, itemDto })

      expect(result).toEqual(itemDto)
    })

    it('should throw an error if the entity is not found', async () => {
      const entitySlug = 'test'
      const id = 1
      const itemDto = { name: 'test' }

      jest.spyOn(entityService, 'getEntityRepository').mockReturnValue({
        findOne: jest.fn(() => Promise.resolve(null)),
        create: jest.fn((item) => item),
        save: jest.fn((item) => item)
      } as any)

      await expect(
        service.update({ entitySlug, id, itemDto })
      ).rejects.toThrow()
    })

    it('should update relationships', async () => {
      const entitySlug = 'test'
      const id = 1
      const itemDto = { mentor: { id: 2 } }

      const result = await service.update({ entitySlug, id, itemDto })

      expect(result.mentor).toEqual(itemDto.mentor)
    })

    it('should do a full replacement of properties', async () => {
      const entitySlug = 'test'
      const id = 1
      const itemDto = { name: 'test' }

      const result = await service.update({ entitySlug, id, itemDto })

      expect(result.name).toEqual(itemDto.name)
      expect(result.age).toBeUndefined()
    })

    it('should do a full replacement of relationships', async () => {
      const entitySlug = 'test'
      const id = 1
      const itemWithoutRelation = {}
      const itemWithNewRelation = { mentor: { id: 2 } }

      const resultWithoutRelation = await service.update({
        entitySlug,
        id,
        itemDto: itemWithoutRelation
      })
      const resultWithNewRelation = await service.update({
        entitySlug,
        id,
        itemDto: itemWithNewRelation
      })

      expect(resultWithoutRelation.mentor).toEqual(
        itemWithoutRelation['mentor']
      )
      expect(resultWithNewRelation.mentor).toEqual(itemWithNewRelation.mentor)
    })

    it('should throw an error if validation fails', async () => {
      jest.spyOn(validationService, 'validate').mockReturnValue([
        {
          property: 'name',
          constraints: {
            isNotEmpty: 'name should not be empty'
          }
        }
      ])

      const entitySlug = 'test'
      const id = 1
      const itemDto = { name: '' }

      expect(service.update({ entitySlug, id, itemDto })).rejects.toThrow()
    })

    describe('update (partial replacement)', () => {
      it('should do a partial replacement of properties', async () => {
        const entitySlug = 'test'
        const id = 1
        const itemDto = { name: 'test' }

        const result = await service.update({
          entitySlug,
          id,
          itemDto,
          partialReplacement: true
        })

        expect(result.name).toEqual(itemDto.name)
        expect(result.age).toEqual(dummyItem.age)
      })

      it('should replace relations only if specified', async () => {
        const entitySlug = 'test'
        const id = 1
        const itemDto = { mentor: { id: 2 } }
        const itemWithoutRelation = { name: 'test' }

        const result = await service.update({
          entitySlug,
          id,
          itemDto,
          partialReplacement: true
        })

        const resultWithoutRelation = await service.update({
          entitySlug,
          id,
          itemDto: itemWithoutRelation,
          partialReplacement: true
        })

        expect(result.mentor).toEqual(itemDto.mentor)
        expect(result.name).toEqual(dummyItem.name)

        expect(resultWithoutRelation.mentor).toEqual(dummyItem.mentor)
        expect(resultWithoutRelation.name).toEqual(itemWithoutRelation.name)
      })
    })
  })
})
