import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    server: {
      deps: {
        inline: ['@homebridge/hap-client'],
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['lcov'],
      include: ['src/**'],
      exclude: [
        'src/accessories/**',
        'src/lib/definitions/generate-definitions.ts',
        'src/lib/definitions/generator-configuration.ts',
        'src/test-utils',
      ],
    },
  },
});
