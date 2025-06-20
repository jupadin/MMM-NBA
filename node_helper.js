/* Magic Mirror
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

        fetch(url, fetchOptions)
        .then(response => {
            if (response.status != 200) {
                self.sendSocketNotification("ERROR", response.status);
                throw `Error fetching NBA data with status code ${response.status}.`;
            }
            return response.json();
        })
        .then(data => {
            // const details = {
            //     w: data.day.date,
            //     y: data.season.year,
            //     t: data.season.type,
            // };
            const details = {
                w: moment().endOf('week').format("DD.MM.YYYY"),//data.leagues[0]?.day?.date,
                y: data.leagues[0]?.season?.year,
                t: data.leagues[0]?.season?.type?.type,
            };

            // Create events array
            const events = data.events || [];

            // Format each event based on callback function (mapEvent) and sort it afterwards, based on start date (starttime).
            const scores = events.map(self.mapEvent.bind(self)).sort((a, b) => {
                return (a.starttime < b.starttime) ? -1 : ((a.starttime > b.starttime) ? 1 : 0); 
            });

            // console.log(scores[0]);
            // scores.some(e => console.log(e.q));

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
            return;
        });

        // Set timeout to continuosly fetch new data from NBA-Server
        setTimeout(self.getData.bind(self), self.updateInterval);
    }
});
