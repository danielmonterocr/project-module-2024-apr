import { PORT, uri } from './constants/config.js';
import { logger } from './logger.js';
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
import { providers as providersRoute } from './routes/providers.js';
import { devices as devicesRoute } from './routes/devices.js';
import { consumptions as consumptionsRoute } from './routes/consumptions.js';

app.use('/', authRoute);
app.use('/', usersRoute);
app.use('/', listingsRoute);
app.use('/', providersRoute);
app.use('/', devicesRoute);
app.use('/', consumptionsRoute);

mongoose.connect(uri);

app.listen(PORT, () => logger.info('App listening on port: ' + PORT));

export { app };
