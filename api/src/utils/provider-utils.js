import fs from 'fs';

const importListingsFromAirbnb = (filePath) => {
    return new Promise((resolve, reject) => {
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                return reject('Error reading file:', err);
            }

            const jsonData = JSON.parse(data);
            
            // Extract necessary data from JSON
            const listings = jsonData.data.viewer.user.staySupplyListings.edges.map(edge => {
                const node = edge.node;
                const title = node.nameOrPlaceholderName;
                const description = node.descriptions.descriptions.find(desc => desc.descriptionType === 'SUMMARY').values[0].value;
                const location = node.location.defaultAddress.locality + ', ' + node.location.defaultAddress.administrativeZone;
                // const userId = jsonData.data.viewer.normalizedUser.id;

                return {
                    provider: "airbnb",
                    title,
                    description,
                    location
                };
            });

            resolve(listings);
        });
    });
};

export { importListingsFromAirbnb };