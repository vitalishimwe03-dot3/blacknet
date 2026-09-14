const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

let pool;

if (process.env.LOAD_PGMEM === 'true') {
  const { newDb, DataType } = require('pg-mem');
  const mem = newDb();
  mem.public.registerFunction({
    name: 'uuid_generate_v4',
    returns: DataType.uuid,
    args: [],
    impure: true,
    implementation: () => uuidv4(),
  });
  mem.public.registerFunction({
    name: 'uuid_generate_v1',
    returns: DataType.uuid,
    args: [],
    impure: true,
    implementation: () => uuidv4(),
  });
  mem.public.registerFunction({
    name: 'to_regclass',
    returns: DataType.regclass,
    args: [DataType.text],
    impure: true,
    implementation: () => null,
  });
  try {
    mem.registerExtension('uuid-ossp', (schema) => {
      schema.registerFunction({
        name: 'uuid_generate_v4',
        returns: DataType.uuid,
        args: [],
        impure: true,
        implementation: () => uuidv4(),
      });
    });
  } catch (e) {
    // extension already covered by public function registration
  }
  pool = new (mem.adapters.createPg().Pool)();
  pool._pgMem = true;
} else {
  pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'blacknet',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });
}

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

module.exports = pool;