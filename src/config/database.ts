// src/config/database.ts
import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is missing');
}

const sequelize = new Sequelize(process.env.DATABASE_URL, { // Use Render's URL
  dialect: 'postgres',
  dialectOptions: {
    ssl: { // Required for Render PostgreSQL
      require: true,
      rejectUnauthorized: false,
    },
  },
  logging: false,
});

sequelize.authenticate()
  .then(() => {
    console.log('Connection has been established successfully.');
  })
  .catch(err => {
    console.error('Unable to connect to the database:', err);
  });

export default sequelize;