import type { CodegenConfig } from '@graphql-codegen/cli'

const config: CodegenConfig = {
  schema: ['src/**/*schema.ts'],
  generates: {
    './generated/graphql.ts': {
      plugins: ['typescript', 'typescript-resolvers'],
      config: {
        contextType: '../src/core/context#Context',
        namingConvention: {
          enumValues: 'keep',
        },
        enumsAsConst: true,
        defaultMapper: 'Partial<{T}>',
      },
    },

    './generated/graphql.mock.ts': {
      plugins: ['typescript', 'typescript-resolvers', 'add'],
      config: {
        contextType: '../src/core/context#Context',
        namingConvention: {
          enumValues: 'keep',
        },
        enumsAsConst: true,
        defaultMapper: 'Partial<{T}>',
        content: 'export { Resolvers as MockResolvers }',
      },
    },

    './generated/graphql.test.ts': {
      schema: 'src/**/*.spec.ts',
      documents: 'src/**/*.spec.ts',
      plugins: [
        'typescript',
        'typescript-resolvers',
        'typescript-operations',
        '@cobbl/graphql-codegen-typescript-operations-tester',
      ],
    },
  },
}

export default config
