import { uri } from '../constants/config.js';
import { logger } from '../logger.js';
import agendaPkg from 'agenda';

// Instatiate Agenda & Connect to Mongo_URI.
const agenda = new agendaPkg.Agenda({
    db: {
        address: uri,
        collection: "agendaJobs",
        options: { useUnifiedTopology: true },
    },
    processEvery: "1 minute",
    maxConcurrency: 20,
});

// listen for the ready or error event.
agenda
  .on("ready", () => logger.info("Agenda started!"))
  .on("error", () => logger.info("Agenda connection error!"));

export { agenda };