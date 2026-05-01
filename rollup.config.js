import typescript from '@rollup/plugin-typescript';
import nodeResolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import dts from 'rollup-plugin-dts';

const banner = `/*@preserve
 * Dragster - drag'n'drop library v3
 * https://github.com/sunpietro/dragster
 *
 * Copyright 2015-${new Date().getFullYear()} Piotr Nalepa
 * http://blog.piotrnalepa.pl
 *
 * Released under the MIT license
 * https://github.com/sunpietro/dragster/blob/master/LICENSE
 */`;

export default [
    {
        input: 'src/index.ts',
        output: {
            file: 'dist/dragster.js',
            format: 'esm',
            sourcemap: true,
            banner,
        },
        plugins: [
            nodeResolve(),
            typescript({
                tsconfig: './tsconfig.build.json',
                declaration: false,
                declarationMap: false,
            }),
            terser({
                format: { comments: /@preserve|@license|@cc_on/i },
            }),
        ],
    },
    {
        input: 'src/index.ts',
        output: { file: 'dist/dragster.d.ts', format: 'esm' },
        plugins: [dts()],
    },
];
