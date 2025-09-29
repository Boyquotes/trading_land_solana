import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';

export default [
  // ESM build
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.esm.js',
      format: 'esm',
      sourcemap: true,
    },
    plugins: [
      resolve({ preferBuiltins: false }),
      commonjs(),
      json(),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: true,
        declarationDir: './dist',
      }),
    ],
    external: [
      '@solana/web3.js',
      '@solana/spl-token',
      '@solana/spl-token-registry',
      '@metaplex-foundation/js',
      '@metaplex-foundation/mpl-token-metadata',
      'axios',
    ],
  },
  // CommonJS build
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.js',
      format: 'cjs',
      sourcemap: true,
    },
    plugins: [
      resolve({ preferBuiltins: false }),
      commonjs(),
      json(),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false,
      }),
    ],
    external: [
      '@solana/web3.js',
      '@solana/spl-token',
      '@solana/spl-token-registry',
      '@metaplex-foundation/js',
      '@metaplex-foundation/mpl-token-metadata',
      'axios',
    ],
  },
];