/* Magic Mirror
 * Module: MMM-NBA
 *
 * By jupadin
 * MIT Licensed.
 */

const NodeHelper = require('node_helper');
const request = require('request');
const Log = require('../../js/logger.js');

module.exports = NodeHelper.create({
    start: function() {
        this.config = null;
        this.updateInterval = null;
        this.live = false;
        this.seasonTypeMapping = {
            1: "P",
            2: "R",
        };
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
        const ongoing = !['pre', 'post'].includes(event.status.type);
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
            // Optional (adding logo link)
            hl: event.competitions[0].competitors[0].team.logo,
            vl: event.competitions[0].competitors[1].team.logo,
        };
        return formattedEvent;
    },

    getData: function() {
        const self = this;
        Log.info(this.name + ": Fetching data from NBA-Server...");
        const nbaURL = self.config.urls[self.config.mode];
        request(nbaURL, function(error, response, body) {
            if (error || response.statusCode != 200) {
                Log.debug(self.name + ": Error getting NBA scores (" + response.statusCode + ")");
                self.sendSocketNotification("ERROR", response.statusCode);
                return;
            }
            const json = JSON.parse(body);

            const details = {
                w: json.day.date,
                y: json.season.year - 1,
                t: self.seasonTypeMapping[json.season.type],
            };

            // Create events array
            const events = json.events || [];

            // Format each event based on callback function (mapEvent) and sort it afterwards, based on start date (starttime).
            const scores = events.map(self.mapEvent.bind(self)).sort((a, b) => {
                return (a.starttime < b.starttime) ? -1 : ((a.starttime > b.starttime) ? 1 : 0); 
            });

            // Check if there is currently a live match
            if (scores.every(timeLeft => timeLeft === false)) {
                self.live = false;
            };

            // Send data to front-end
            self.sendSocketNotification("DATA", {games: scores, details: details});
        });

        if (self.live) {
            // If there is a match currently live, set update interval to 1 minute.
            self.updateInterval = 1 * 60 * 1000;
        } else {
            // Otherwise set it to the specified update interval time.
            self.updateInterval = self.config.updateInterval;
        }

        // Set timeout to continuiusly fetch new data from NBA-Server
        setTimeout(self.getData.bind(self), self.updateInterval);
    }
})
