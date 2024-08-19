import { SWAGGER_PATH } from '../constants/config.js';
import jsYaml from 'js-yaml';
import fs from 'fs';
import { OpenApiValidator } from 'express-openapi-validate';

// Load the OpenAPI document
const openApiDocument = jsYaml.load(fs.readFileSync(SWAGGER_PATH, 'utf-8'));

// Construct the validator with some basic options
const validator = new OpenApiValidator(openApiDocument,
    {
        ajvOptions: {
            allErrors: true,
            removeAdditional: "all",
        }
    }
);

export { validator };