/* MagicMirror²
 * Module: MMM-NBA
 *
 * By jupadin
 * MIT Licensed.
 */

const NodeHelper = require('node_helper');
const Log = require('../../js/logger.js');
const moment = require('moment');

module.exports = NodeHelper.create({
    start: function() {
        this.config = null;
        this.updateInterval = 60 * 60 * 1000;
        // this.seasonTypeMapping = {
        //     1: "P",
        //     2: "R",
        //     3: "Playoffs",
        // };
    },

    socketNotificationReceived: function(notification, payload) {
        if (notification == "SET_CONFIG") {
            this.config = payload;
            this.updateInterval = this.config.updateInterval;
        }

        // Retrieve data from NBA-Server
        this.getData();
    },

    getGameStatus: function(eventStatus) {
        if (eventStatus.type.state === "pre") {
            // Upcoming
            return "P";
        } else if (eventStatus.type.name === "STATUS_HALFTIME") {
            // Halftime
            return "H";
        } else if (eventStatus.type.name === "STATUS_POSTPONED") {
            // Postponed
            return "PP"
        } else if (eventStatus.type.state === "post") {
            // Game has ended -> Overtime or regular end ?
            if (eventStatus.period > 4) {
                return "FO";
            }
            return "F";
        } else if (eventStatus.period > 4) {
            // Game is still running -> Overtime
            return "OT";
        }
        return eventStatus.period;
    },

    mapEvent: function(event) {
        const ongoing = !['pre', 'post'].includes(event.status.type?.state);
        const remainingTime = ongoing && event.status.displayClock;

        const formattedEvent = {
            // Name team home
            h: event.competitions[0].competitors[0].team.abbreviation,
            // Scores team home
            hs: event.competitions[0].competitors[0].score,
            // Game status (live, quarter, over, ...)
            q: this.getGameStatus(event.status),
            // Start date of match
            starttime: event.date,
            // Name team guest
            v: event.competitions[0].competitors[1].team.abbreviation,
            // Score team guest
            vs: event.competitions[0].competitors[1].score,
            // Remaining time
            k: remainingTime,
            // Link logo team home
            hl: event.competitions[0].competitors[0].team.logo,
            // Link logo team guest
            vl: event.competitions[0].competitors[1].team.logo,
        };
        return formattedEvent;
    },

    getData: function() {
        Log.info(`${this.name}: Fetching data from NBA-Server...`);
        
        const self = this;

        const nbaURL = self.config.urls[self.config.mode];
        const lastDayOfMonth = moment().endOf('month').format('YYYYMMDD');
        // const firstDayOfMonth = moment().startOf('month').format('YYYYMMDD');
        // const lastDayOfLastMonth = moment().subtract(1, 'month').endOf('month').format('YYYYMMDD');
        const beginOfWeek = moment().startOf('week').format('YYYYMMDD');
        // const endOfWeek = moment().endOf('week').format('YYYYMMDD');
        const url = nbaURL + `?dates=${beginOfWeek}-${lastDayOfMonth}`;
        const fetchOptions = {};

        Log.info(`${this.name}: Fetching data from URL: ${url}`);

        fetch(url, fetchOptions)
        .then(response => {
            if (response.status != 200) {
                self.sendSocketNotification("ERROR", response.status);
                throw `Error fetching NBA data with status code ${response.status}.`;
            }
            return response.json();
        })
        .then(data => {
            const details = {
                w: moment().endOf('week').format("DD.MM.YYYY"),//data.leagues[0]?.day?.date,
                y: data.leagues[0]?.season?.year,
                t: data.leagues[0]?.season?.type?.type,
            };

            // Log.debug(`${this.name}: Retrieved details: ${JSON.stringify(data.events)}`);

            // Create events array
            let events = data.events || [];

            // If no events found, exit here.
            if (!events.length) {
                Log.info(`${this.name}: No games found for the given time range...`);
                return;
            }

            const allGames = data.events || [];
            const pastGames = [];
            const futureGames = [];
            const today = Date.now();

            allGames.forEach(game => {
                game._ts = Date.parse(game.date);
                (game._ts < today ? pastGames : futureGames).push(game);
            });

            // Sort games
            pastGames.sort((a, b) => b._ts - a._ts);   // neu → alt
            futureGames.sort((a, b) => a._ts - b._ts); // alt → neu

            // Limit number of games
            const lastGames = pastGames.slice(0, self.config.numMaxPastGames);
            const upcomingGames = futureGames.slice(0, self.config.numMaxFutureGames);
            const scores = [...lastGames, ...upcomingGames].map(event => self.mapEvent(event));


            // Log.debug(`${this.name}: Retrieved ${scores.length} NBA games.`);

            // Check if there is currently a live match
            if (scores.some(e => e.q in ["1", "2", "3", "4", "H", "OT"])) {
                // console.log("Live");
                // If there is a match currently live, set update interval to 1 minute.
                self.updateInterval = self.config.updateIntervalLive;
            } else {
                // Otherwise set it to the specified update interval time.
                self.updateInterval = self.config.updateInterval;
            }

            // Send data to front-end
            self.sendSocketNotification("DATA", {games: scores, details: details});
        })
        .catch(error => {
            Log.debug(`${this.name}: ${error}.`);
            self.sendSocketNotification("ERROR", "Error fetching NBA data.");
        });

        // Set timeout to continuosly fetch new data from NBA-Server
        setTimeout(self.getData.bind(self), self.updateInterval);
    }
});
