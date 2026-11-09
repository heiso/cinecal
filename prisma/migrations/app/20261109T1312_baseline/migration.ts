#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/4375f663291be8c25bbd35bb0091774daafbbdd11ec0a7119550399b85c5bfba/contract';
import endContract from '../../snapshots/4375f663291be8c25bbd35bb0091774daafbbdd11ec0a7119550399b85c5bfba/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  col,
  fn,
  lit,
  primaryKey,
  sql,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<never, End> {
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createSchema({ schema: 'public' }),
      this.createNativeEnumType({ schema: 'public', typeName: 'Language', members: ['VO', 'VF'] }),
      this.createNativeEnumType({
        schema: 'public',
        typeName: 'ScrapedUrlType',
        members: ['SHOWTIMES', 'TICKETING'],
      }),
      this.createNativeEnumType({
        schema: 'public',
        typeName: 'TagCategory',
        members: ['GENRE', 'SUB_GENRE', 'CHARACTERISTIC', 'AWARD'],
      }),
      this.createTable({
        schema: 'public',
        table: '_MovieToMovieTag',
        columns: [
          col('A', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('B', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: '_ShowtimeToShowtimeTag',
        columns: [
          col('A', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('B', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'app_state',
        columns: [
          col('id', 'int4', { notNull: true, default: lit(1), codecRef: { codecId: 'pg/int4@1' } }),
          col('last_complete_scrape_at', 'timestamp(3)', {
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'movie_tags',
        columns: [
          col('category', '"TagCategory"', {
            notNull: true,
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'TagCategory' } },
          }),
          col('featured', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('is_filter_enabled', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('name', 'character varying(255)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 255 } },
          }),
          col('reg_exp', 'character varying(255)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 255 } },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'movies',
        columns: [
          col('allocine_id', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('created_at', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
          col('director', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('duration', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('original_title', 'character varying(255)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 255 } },
          }),
          col('poster_allocine_url', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('poster_blur_hash', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('poster_url', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('release_date', 'timestamp(3)', {
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
          col('synopsis', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('themoviedb_id', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('title', 'character varying(255)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 255 } },
          }),
          col('updated_at', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'prices',
        columns: [
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('label', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('price', 'float8', { notNull: true, codecRef: { codecId: 'pg/float8@1' } }),
          col('showtimeId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'scraped_urls',
        columns: [
          col('content', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('created_at', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
          col('expires_at', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
          col('type', '"ScrapedUrlType"', {
            notNull: true,
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'ScrapedUrlType' } },
          }),
          col('url', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['url'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'showtime_tags',
        columns: [
          col('featured', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('is_filter_enabled', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('name', 'character varying(255)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 255 } },
          }),
          col('reg_exp', 'character varying(255)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 255 } },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'showtimes',
        columns: [
          col('allocine_id', 'int8', { notNull: true, codecRef: { codecId: 'pg/int8number@1' } }),
          col('created_at', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
          col('date', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('is_preview', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('language', '"Language"', {
            notNull: true,
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'Language' } },
          }),
          col('movie_id', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('theater_id', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('ticketingUrl', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('updated_at', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'theaters',
        columns: [
          col('address', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('allocine_id', 'character varying(10)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 10 } },
          }),
          col('created_at', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('name', 'character varying(255)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 255 } },
          }),
          col('updated_at', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
          col('website', 'character varying(255)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 255 } },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createIndex({
        schema: 'public',
        table: '_MovieToMovieTag',
        index: '_MovieToMovieTag_AB_unique',
        columns: ['A', 'B'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: '_MovieToMovieTag',
        index: '_MovieToMovieTag_B_index',
        columns: ['B'],
      }),
      this.createIndex({
        schema: 'public',
        table: '_ShowtimeToShowtimeTag',
        index: '_ShowtimeToShowtimeTag_AB_unique',
        columns: ['A', 'B'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: '_ShowtimeToShowtimeTag',
        index: '_ShowtimeToShowtimeTag_B_index',
        columns: ['B'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'movie_tags',
        index: 'movie_tags_name_key',
        columns: ['name'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'movies',
        index: 'movies_allocine_id_key',
        columns: ['allocine_id'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'showtime_tags',
        index: 'showtime_tags_name_key',
        columns: ['name'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'showtimes',
        index: 'showtimes_allocine_id_key',
        columns: ['allocine_id'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'showtimes',
        index: 'showtimes_date_movie_id_theater_id_key',
        columns: ['date', 'movie_id', 'theater_id'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'theaters',
        index: 'theaters_allocine_id_key',
        columns: ['allocine_id'],
        extras: { unique: true },
      }),
      this.addForeignKey({
        schema: 'public',
        table: '_MovieToMovieTag',
        foreignKey: {
          name: '_MovieToMovieTag_A_fkey',
          columns: ['A'],
          references: { schema: 'public', table: 'movies', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: '_MovieToMovieTag',
        foreignKey: {
          name: '_MovieToMovieTag_B_fkey',
          columns: ['B'],
          references: { schema: 'public', table: 'movie_tags', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: '_ShowtimeToShowtimeTag',
        foreignKey: {
          name: '_ShowtimeToShowtimeTag_A_fkey',
          columns: ['A'],
          references: { schema: 'public', table: 'showtimes', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: '_ShowtimeToShowtimeTag',
        foreignKey: {
          name: '_ShowtimeToShowtimeTag_B_fkey',
          columns: ['B'],
          references: { schema: 'public', table: 'showtime_tags', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'prices',
        foreignKey: {
          name: 'prices_showtimeId_fkey',
          columns: ['showtimeId'],
          references: { schema: 'public', table: 'showtimes', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'showtimes',
        foreignKey: {
          name: 'showtimes_theater_id_fkey',
          columns: ['theater_id'],
          references: { schema: 'public', table: 'theaters', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'showtimes',
        foreignKey: {
          name: 'showtimes_movie_id_fkey',
          columns: ['movie_id'],
          references: { schema: 'public', table: 'movies', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
