import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'

import { TypeOrmModule } from '@nestjs/typeorm'
import { AppManifest, DatabaseConnection } from '@repo/types'
import { EntitySchema } from 'typeorm'
import { AuthModule } from './auth/auth.module'
import { CrudModule } from './crud/crud.module'
import { EntityModule } from './entity/entity.module'
import { EntityLoaderService } from './entity/services/entity-loader.service'
import { LoggerModule } from './logger/logger.module'
import { LoggerService } from './logger/logger.service'
import { ManifestModule } from './manifest/manifest.module'
import { SeedModule } from './seed/seed.module'
import { HealthModule } from './health/health.module'
import { OpenApiModule } from './open-api/open-api.module'
import { ValidationModule } from './validation/validation.module'
import { UploadModule } from './upload/upload.module'
import { StorageModule } from './storage/storage.module'
import { ManifestService } from './manifest/services/manifest.service'
import { HookModule } from './hook/hook.module'
import { EndpointModule } from './endpoint/endpoint.module'
import { PolicyModule } from './policy/policy.module'
import { HandlerModule } from './handler/handler.module'
import { SdkModule } from './sdk/sdk.module'
import { SqliteConnectionOptions } from 'typeorm/driver/sqlite/SqliteConnectionOptions'
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions'
import { MiddlewareModule } from './middleware/middleware.module'
import { EventModule } from './event/event.module'

import { MysqlConnectionOptions } from 'typeorm/driver/mysql/MysqlConnectionOptions'
import config from './config/config'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import { APP_GUARD } from '@nestjs/core'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.contribution'],
      load: [config]
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule, EntityModule, ManifestModule],
      useFactory: async (
        configService: ConfigService,
        entityLoaderService: EntityLoaderService,
        manifestService: ManifestService
      ) => {
        let dbConnection: DatabaseConnection
        let databaseConfig:
          | SqliteConnectionOptions
          | PostgresConnectionOptions
          | MysqlConnectionOptions

        switch (configService.get('DB_CONNECTION')) {
          case 'postgres':
            dbConnection = 'postgres'
            databaseConfig = configService.get('database').postgres
            break
          case 'mysql':
            dbConnection = 'mysql'
            databaseConfig = configService.get('database').mysql
            break
          default:
            dbConnection = 'sqlite'
            databaseConfig = configService.get('database').sqlite
            break
        }

        await manifestService.loadManifest(
          configService.get('paths').manifestFile
        )
        const entities: EntitySchema[] =
          entityLoaderService.loadEntities(dbConnection)

        return Object.assign(databaseConfig, { entities })
      },
      inject: [ConfigService, EntityLoaderService, ManifestService]
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule, EntityModule, ManifestModule],
      useFactory: async (
        configService: ConfigService,
        manifestService: ManifestService
      ) => {
        await manifestService.loadManifest(
          configService.get('paths').manifestFile
        )

        const appManifest: AppManifest = manifestService.getAppManifest()

        return appManifest.settings.rateLimits || []
      },
      inject: [ConfigService, ManifestService, EntityLoaderService]
    }),
    ManifestModule,
    EntityModule,
    SeedModule,
    CrudModule,
    AuthModule,
    LoggerModule,
    HealthModule,
    OpenApiModule,
    ValidationModule,
    UploadModule,
    StorageModule,
    HookModule,
    EndpointModule,
    PolicyModule,
    HandlerModule,
    SdkModule,
    MiddlewareModule,
    EventModule
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard
    }
  ]
})
export class AppModule {
  constructor(private loggerService: LoggerService) {}

  async onModuleInit() {
    await this.init()
  }

  private async init() {
    const isSeed: boolean = process.argv[1].includes('seed')
    const isTest: boolean = process.env.NODE_ENV === 'test'

    if (!isSeed && !isTest) {
      this.loggerService.initMessage()
    }
  }
}
