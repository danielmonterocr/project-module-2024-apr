import { uri } from '../constants/config.js';
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
  .on("ready", () => console.log("Agenda started!"))
  .on("error", () => console.log("Agenda connection error!"));

export { agenda };