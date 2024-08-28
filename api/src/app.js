import { PORT, uri } from './constants/config.js';
import express from 'express';
const app = express();

import mongoose from 'mongoose';

app.use(express.json())

import jsYaml from 'js-yaml';
import fs from 'fs';
import swaggerUi from 'swagger-ui-express';
const openApiDocument = jsYaml.load(fs.readFileSync('./open-api/swagger.yaml', 'utf-8'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));

import { auth as authRoute } from './routes/auth.js';
import { users as usersRoute } from './routes/users.js';
import { listings as listingsRoute } from './routes/listings.js';

app.use('/', authRoute);
app.use('/', usersRoute);
app.use('/', listingsRoute);

mongoose.connect(uri);

app.listen(PORT, () => console.log('App listening on port: ' + PORT));

export { app };
