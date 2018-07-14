import babel from 'rollup-plugin-babel';
import pkg from './package.json';

export default [
  {
    input: pkg.module,
    output: [
      { file: pkg.bin['esc-influxdb'], format: 'cjs', sourcemap: true },
    ],
    external: [
      'pmx',
      'debug',
      '@mark48evo/system-esc',
      'amqplib',
      'influx',
    ],
    plugins: [
      babel({
        exclude: 'node_modules/**',
        envName: 'rollup',
      }),
    ],
  },
];
