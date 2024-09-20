import { THINGSBOARD_URL, THINGSBOARD_USERNAME, THINGSBOARD_PASSWORD } from '../constants/config.js'
import { logger } from "../logger.js";

const thingsboardUtils = {
    /**
     * 
     * Get user JWT token
     * 
     * @returns {Promise<string>}
     */
    getUserJwtToken: async () => {
        try {
            logger.info("Calling ThingsBoard API: /api/auth/login");
            const response = await fetch(THINGSBOARD_URL + '/api/auth/login', {
                method: 'post',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({username: THINGSBOARD_USERNAME, password: THINGSBOARD_PASSWORD})
            });

            const data = await response.json();
            logger.debug("Response from ThingsBoard API: " + JSON.stringify(data));

            if (response.status === 200) {
                return data.token;
            }

            return null;
        } catch (err) {
            logger.error(err.message);
            return null;
        }
    },

    /**
     * 
     * Get device key and secret
     * 
     * @returns {Promise<{key: string, secret: string}>}
     */
    getDeviceKeyAndSecret: async () => {
        let id;
        try {
            const token = await thingsboardUtils.getUserJwtToken();

            const url1 = THINGSBOARD_URL + '/api/deviceProfileInfo/default';
            logger.info("Calling ThingsBoard API: " + url1);
            const response1 = await fetch(url1, {
                method: 'get',
                headers: {'X-Authorization': 'Bearer ' + token}
            });

            const data1 = await response1.json();
            logger.info("Response from ThingsBoard API: " + JSON.stringify(data1));

            if (response1.status === 200) {
                id = data1.id.id;
            } else {
                logger.error("Failed to get default device profile Id");
                return null;
            }

            const url2 = THINGSBOARD_URL + '/api/deviceProfile/' + id;
            logger.info("Calling ThingsBoard API: " + url2);
            const response2 = await fetch(url2, {
                method: 'get',
                headers: {'X-Authorization': 'Bearer ' + token}
            });

            const data2 = await response2.json();
            logger.debug("Response from ThingsBoard API: " + JSON.stringify(data2));

            if (response2.status === 200) {
                return {
                    key: data2.provisionDeviceKey,
                    secret: data2.profileData.provisionConfiguration.provisionDeviceSecret
                };
            } else {
                logger.error("Failed to get device profile");
                return null;
            }
        } catch (err) {
            logger.error(err.message);
            return null;
        }
    }
};

export default thingsboardUtils;