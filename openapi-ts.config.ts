import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
  client: '@hey-api/client-fetch',
  input: './openapi.json',
  output: {
    format: 'prettier',
    path: './lib/generated',
  },
  types: {
    enums: 'typescript',
  },
  services: {
    asClass: true,
  },
});
