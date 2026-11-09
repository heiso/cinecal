#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/38b10d7396cb5f9ba280ec3e75e5bfbd8d0572ecb266cfb5a30a5255375988a6/contract';
import startContract from '../../snapshots/38b10d7396cb5f9ba280ec3e75e5bfbd8d0572ecb266cfb5a30a5255375988a6/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/939fa03b0cdc044cbcc0048a749044cf18963b1682faaa71b52c1f14cf88796f/contract';
import endContract from '../../snapshots/939fa03b0cdc044cbcc0048a749044cf18963b1682faaa71b52c1f14cf88796f/contract.json' with { type: 'json' };
import { Migration, MigrationCLI } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [this.dropColumn({ schema: 'public', table: 'movies', column: 'themoviedb_id' })];
  }
}

MigrationCLI.run(import.meta.url, M);
