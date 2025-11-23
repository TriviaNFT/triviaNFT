const { Pool } = require('pg');
const migration = require('./migrations/1763400000000_add-nft-naming-convention-fields.cjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_L9k7vKRiHxGJ@ep-broad-frog-ah63mlza-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

const operations = [];

const pgm = {
  addColumn: (tableName, columns) => {
    for (const [columnName, config] of Object.entries(columns)) {
      operations.push(async () => {
        let sql = `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS ${columnName} ${config.type}`;
        if (config.notNull) {
          sql += ' NOT NULL';
        }
        if (config.default !== undefined) {
          sql += ` DEFAULT ${config.default}`;
        }
        console.log(`Adding column ${columnName} to ${tableName}...`);
        await pool.query(sql);
        
        if (config.comment) {
          await pool.query(`COMMENT ON COLUMN ${tableName}.${columnName} IS '${config.comment}'`);
        }
      });
    }
  },

  alterColumn: (tableName, columnName, config) => {
    operations.push(async () => {
      if (config.type) {
        console.log(`Altering column ${columnName} in ${tableName}...`);
        await pool.query(`ALTER TABLE ${tableName} ALTER COLUMN ${columnName} TYPE ${config.type}`);
      }
      if (config.notNull !== undefined) {
        if (config.notNull) {
          await pool.query(`ALTER TABLE ${tableName} ALTER COLUMN ${columnName} SET NOT NULL`);
        } else {
          await pool.query(`ALTER TABLE ${tableName} ALTER COLUMN ${columnName} DROP NOT NULL`);
        }
      }
    });
  },

  createIndex: (tableName, columns, options = {}) => {
    operations.push(async () => {
      const columnList = Array.isArray(columns) ? columns.join(', ') : columns;
      const indexName = options.name || `idx_${tableName}_${columnList.replace(/,\s*/g, '_')}`;
      const unique = options.unique ? 'UNIQUE' : '';
      const where = options.where ? `WHERE ${options.where}` : '';
      
      console.log(`Creating index ${indexName} on ${tableName}...`);
      await pool.query(`CREATE ${unique} INDEX IF NOT EXISTS ${indexName} ON ${tableName}(${columnList}) ${where}`);
    });
  },

  sql: (sqlString) => {
    operations.push(async () => {
      console.log(`Executing SQL...`);
      await pool.query(sqlString);
    });
  },
};

async function runMigration() {
  try {
    console.log('Starting NFT naming convention migration...\n');
    
    // Call the migration's up function
    migration.up(pgm);
    
    // Execute all operations
    for (const operation of operations) {
      await operation();
    }
    
    // Record the migration
    const checkResult = await pool.query(`
      SELECT name FROM pgmigrations WHERE name = $1
    `, ['1763400000000_add-nft-naming-convention-fields']);
    
    if (checkResult.rows.length === 0) {
      await pool.query(`
        INSERT INTO pgmigrations (name, run_on)
        VALUES ($1, NOW())
      `, ['1763400000000_add-nft-naming-convention-fields']);
      console.log('Migration recorded in pgmigrations table.');
    } else {
      console.log('Migration already recorded in pgmigrations table.');
    }
    
    console.log('\n✅ Migration completed successfully!');
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

runMigration();
