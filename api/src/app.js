import { PORT, SWAGGER_PATH } from './constants/config.js';
import express from 'express';
const app = express();

import mongoose from 'mongoose';
import 'dotenv/config';

app.use(express.json())

import jsYaml from 'js-yaml';
import fs from 'fs';
import swaggerUi from 'swagger-ui-express';
const openApiDocument = jsYaml.load(fs.readFileSync(SWAGGER_PATH, 'utf-8'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));

import { auth as authRoute } from './routes/auth.js';
import { users as usersRoute } from './routes/users.js';
import { listings as listingsRoute } from './routes/listings.js';

app.use('/', authRoute);
app.use('/', usersRoute);
app.use('/', listingsRoute);

mongoose.connect(process.env.DB_CONNECTOR);

app.listen(PORT, () => console.log('App listening on port: ' + PORT));

export { app };