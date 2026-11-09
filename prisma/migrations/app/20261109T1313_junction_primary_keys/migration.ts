#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/38b10d7396cb5f9ba280ec3e75e5bfbd8d0572ecb266cfb5a30a5255375988a6/contract';
import endContract from '../../snapshots/38b10d7396cb5f9ba280ec3e75e5bfbd8d0572ecb266cfb5a30a5255375988a6/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/4375f663291be8c25bbd35bb0091774daafbbdd11ec0a7119550399b85c5bfba/contract';
import startContract from '../../snapshots/4375f663291be8c25bbd35bb0091774daafbbdd11ec0a7119550399b85c5bfba/contract.json' with { type: 'json' };
import { Migration, MigrationCLI } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropIndex({
        schema: 'public',
        table: '_MovieToMovieTag',
        index: '_MovieToMovieTag_AB_unique',
      }),
      this.dropIndex({
        schema: 'public',
        table: '_ShowtimeToShowtimeTag',
        index: '_ShowtimeToShowtimeTag_AB_unique',
      }),
      this.addPrimaryKey({
        schema: 'public',
        table: '_MovieToMovieTag',
        constraint: '_MovieToMovieTag_AB_pkey',
        columns: ['A', 'B'],
      }),
      this.addPrimaryKey({
        schema: 'public',
        table: '_ShowtimeToShowtimeTag',
        constraint: '_ShowtimeToShowtimeTag_AB_pkey',
        columns: ['A', 'B'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
