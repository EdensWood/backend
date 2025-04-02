// src/config/database.ts
import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const sequelize = new Sequelize(process.env.DATABASE_URL!, { // Use Render's URL
  dialect: 'postgres',
  dialectOptions: {
    ssl: { // Required for Render PostgreSQL
      require: true,
      rejectUnauthorized: false,
    },
  },
  logging: false,
});

export default sequelize;
