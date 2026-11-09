#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/817d123f6550d07673c318c6928b5524326151ba8e90daec46c74299ac7d301c/contract';
import endContract from '../../snapshots/817d123f6550d07673c318c6928b5524326151ba8e90daec46c74299ac7d301c/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit, primaryKey } from '@prisma/orm-postgres/migration';

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
        table: 'app_state',
        columns: [
          col('id', 'int4', { notNull: true, default: lit(1), codecRef: { codecId: 'pg/int4@1' } }),
          col('last_complete_scrape_at', 'timestamptz(3)', {
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
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
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('reg_exp', 'text', { codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'movies',
        columns: [
          col('allocine_id', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('created_at', 'timestamptz(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('director', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('duration', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('original_title', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('poster_allocine_url', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('poster_blur_hash', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('poster_url', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('release_date', 'date', { codecRef: { codecId: 'pg/date-string@1' } }),
          col('synopsis', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('title', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updated_at', 'timestamptz(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'movies_movie_tags',
        columns: [
          col('movie_id', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('tag_id', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['movie_id', 'tag_id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'prices',
        columns: [
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('label', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('price', 'float8', { notNull: true, codecRef: { codecId: 'pg/float8@1' } }),
          col('showtime_id', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'scraped_urls',
        columns: [
          col('content', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('created_at', 'timestamptz(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('expires_at', 'timestamptz(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
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
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('reg_exp', 'text', { codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'showtimes',
        columns: [
          col('allocine_id', 'int8', { notNull: true, codecRef: { codecId: 'pg/int8number@1' } }),
          col('created_at', 'timestamptz(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('date', 'timestamptz(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
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
          col('ticketing_url', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('updated_at', 'timestamptz(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'showtimes_showtime_tags',
        columns: [
          col('showtime_id', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('tag_id', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['showtime_id', 'tag_id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'theaters',
        columns: [
          col('address', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('allocine_id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('created_at', 'timestamptz(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updated_at', 'timestamptz(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('website', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'movie_tags',
        constraint: 'movie_tags_name_key',
        columns: ['name'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'movies',
        constraint: 'movies_allocine_id_key',
        columns: ['allocine_id'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'showtime_tags',
        constraint: 'showtime_tags_name_key',
        columns: ['name'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'showtimes',
        constraint: 'showtimes_allocine_id_key',
        columns: ['allocine_id'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'showtimes',
        constraint: 'showtimes_date_movie_id_theater_id_key',
        columns: ['date', 'movie_id', 'theater_id'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'theaters',
        constraint: 'theaters_allocine_id_key',
        columns: ['allocine_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'movies_movie_tags',
        index: 'movies_movie_tags_movie_id_idx_b2c3efa2',
        columns: ['movie_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'movies_movie_tags',
        index: 'movies_movie_tags_tag_id_idx_94b47830',
        columns: ['tag_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'prices',
        index: 'prices_showtime_id_idx_4d080e2f',
        columns: ['showtime_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'showtimes',
        index: 'showtimes_movie_id_idx_b2c3efa2',
        columns: ['movie_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'showtimes',
        index: 'showtimes_theater_id_idx_e7576363',
        columns: ['theater_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'showtimes_showtime_tags',
        index: 'showtimes_showtime_tags_showtime_id_idx_4d080e2f',
        columns: ['showtime_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'showtimes_showtime_tags',
        index: 'showtimes_showtime_tags_tag_id_idx_94b47830',
        columns: ['tag_id'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'movies_movie_tags',
        foreignKey: {
          name: 'movies_movie_tags_movie_id_fkey',
          columns: ['movie_id'],
          references: { schema: 'public', table: 'movies', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'movies_movie_tags',
        foreignKey: {
          name: 'movies_movie_tags_tag_id_fkey',
          columns: ['tag_id'],
          references: { schema: 'public', table: 'movie_tags', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'prices',
        foreignKey: {
          name: 'prices_showtime_id_fkey',
          columns: ['showtime_id'],
          references: { schema: 'public', table: 'showtimes', columns: ['id'] },
          onDelete: 'cascade',
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
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'showtimes_showtime_tags',
        foreignKey: {
          name: 'showtimes_showtime_tags_showtime_id_fkey',
          columns: ['showtime_id'],
          references: { schema: 'public', table: 'showtimes', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'showtimes_showtime_tags',
        foreignKey: {
          name: 'showtimes_showtime_tags_tag_id_fkey',
          columns: ['tag_id'],
          references: { schema: 'public', table: 'showtime_tags', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
