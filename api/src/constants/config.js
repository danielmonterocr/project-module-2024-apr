import dotenv from 'dotenv';
import dotenvExpand from 'dotenv-expand';

dotenvExpand.expand(dotenv.config());

export const SWAGGER_PATH = './open-api/swagger.yaml';
export const PORT = process.env.PORT || 3000;

export const {
    DB_PREFIX,
    DB_USER,
    DB_PASSWORD,
    DB_DOMAIN,
    DB_NAME,
} = process.env;

export const uri = `${DB_PREFIX}://${DB_USER}:${DB_PASSWORD}@${DB_DOMAIN}/${DB_NAME}?authSource=admin`;

export const THINGSBOARD_URL = process.env.THINGSBOARD_URL;
export const PROVISION_DEVICE_KEY = process.env.PROVISION_DEVICE_KEY;
export const PROVISION_DEVICE_SECRET = process.env.PROVISION_DEVICE_SECRET;