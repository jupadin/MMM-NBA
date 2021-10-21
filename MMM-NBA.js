/* Magic Mirror
 * Module: MMM-NBA
 *
 * By jupadin
 * MIT Licensed.
 */

Module.register("MMM-NBA", {
    // Default module config
    defaults: {
        animationSpeed: 2 * 1000, // 2 seconds
        updateInterval: 60 * 60 * 1000, // 1 hour
        focus_on: false,
        colored: true,
        timeFormat: 'dd. HH:mm',
        showHeaderAsIcons: false,
        showFooter: true,
        urls: {
            regular: "http://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard",
        },
        mode: "regular",
    },

    // Define start sequence.
    start: function() {
        Log.info("Starting module: " + this.name);
        // To change day names to locale day names
        moment.updateLocale(config.language, this.config.timeFormat);
        this.loaded = false;
        this.error = false;
        this.fetchedData = false;

        this.modes = {
            P: "Pre-Season",
            R: "Regular-Season",
        };

        this.states = {
            1: "1ST_QUARTER",
            2: "2ND_QUARTER",
            3: "3RD_QUARTER",
            4: "4TH_QUARTER",
            H: "HALF_TIME",
            OT: "OVER_TIME",
            F: "FINAL",
            FO: "FINAL_OVERTIME",
            T: "TIE",
            P: "UPCOMING",
        };

        this.sendSocketNotification("SET_CONFIG", this.config);
    },

    // Define required styles.
    getStyles: function() {
        return ["MMM-NBA.css", "font-awesome.css"];
    },

    // Define required translations.
    getTranslations: function() {
        return {
            en: "translations/en.json",
            de: "translations/de.json",
        };
    },

    // Define required scripts.
    getScripts: function() {
        return ["moment.js"];
    },

    // Define header.
    getHeader: function() {
        if (!this.loaded) {
            return "MMM-NBA";
        }
        return "MMM-NBA - " + this.modes[this.fetchedData.details.t] + " " + this.fetchedData.details.y;
    },

    // Override dom generator.
    getDom: function() {
        const self = this;
        const wrapper = document.createElement("div");
        wrapper.className = "MMM-NBA table";
        wrapper.id = "wrapper";

        if (this.error) {
            wrapper.innerHTML = this.translate("ERROR") + " (" + this.fetchedData + ")";
            wrapper.className = "light small dimmed";
            return wrapper;
        }

        if (!this.loaded) {
            wrapper.innerHTML = this.translate("LOADING");
            wrapper.className = "light small dimmed";
            return wrapper;
        }

        const table = document.createElement("table");
        table.className = "table";

        // Create table header row
        table.appendChild(self.createTableHeaderRow());

        // Create table data rows
        for (let i = 0; i < self.fetchedData.games.length; i++) {
            table.appendChild(self.createTableDataRow(self.fetchedData.games[i]));
        }

        // Bye week
        if (Array.isArray(this.config.focus_on)) {
            let match = false;
            for (let i = 0; i < this.config.focus_on.length; i++) {
                match = false;
                for (let j = 0; j < this.fetchedData.games.length; j++) {
                    if (this.config.focus_on[i] == this.fetchedData.games[j].h || this.config.focus_on[i] == this.fetchedData.games[j].v) {
                        // Match found
                        match = true;
                        // Break out of the inner most for-loop
                        break;
                    }
                }

                if (!match) {
                    const byeWeek = this.createTableDataRowByeWeek(this.config.focus_on[i]);
                    table.appendChild(byeWeek);
                }
            }
        }

        // Footer
        if (this.config.showFooter) {
            const footerRow = document.createElement("tr");
            footerRow.className = "footerRow";

            const footer = document.createElement("td");
            footer.className = "footer";
            footer.setAttribute("colspan", 8);
            footer.innerHTML = this.translate("UPDATED") + ": " + moment().format("dd, DD.MM.YYYY, HH:mm[h]");
            footerRow.appendChild(footer);

            table.appendChild(footerRow);
        }

        wrapper.appendChild(table);

        // Return the wrapper to the dom.
        return wrapper;
    },

    createTableHeaderRow: function() {
        const tableHeaderRow = document.createElement("tr");
        tableHeaderRow.className = "tableHeader header";

        // Date
        const dateHeader = document.createElement("th");
        dateHeader.className = "dateHeader date header";
        if (this.config.showHeaderAsIcons) {
            const dateIcon = document.createElement("i");
            dateIcon.className = "fas fa-clock";
            dateHeader.appendChild(dateIcon);
        } else {
            dateHeader.innerHTML = this.translate("TIME");
        }

        // First Team
        const firstTeamHeader = document.createElement("th");
        firstTeamHeader.className = "firstTeamHeader header";
        if (this.config.showHeaderAsIcons) {
            const homeIcon = document.createElement("i");
            homeIcon.className = "firstTeam fas fa-home";
            firstTeamHeader.appendChild(homeIcon);
        } else {
            firstTeamHeader.innerHTML = this.translate("HOME");
        }
        firstTeamHeader.setAttribute("colspan", 3);

        // Divider
        const vsHeader = document.createElement("th");
        vsHeader.className = "vsHeader header";
        vsHeader.innerHTML = " ";

        // Second Team
        const secondTeamHeader = document.createElement("th");
        secondTeamHeader.className = "secondTeamHeader header";
        if (this.config.showHeaderAsIcons) {
            const awayIcon = document.createElement("i");
            awayIcon.className = "secondTeam fas fa-tag";
            secondTeamHeader.appendChild(awayIcon);
        } else {
            secondTeamHeader.innerHTML = this.translate("GUEST");
        }
        secondTeamHeader.setAttribute("colspan", 3);

        tableHeaderRow.appendChild(dateHeader);
        tableHeaderRow.appendChild(firstTeamHeader);
        tableHeaderRow.appendChild(vsHeader);
        tableHeaderRow.appendChild(secondTeamHeader);

        return tableHeaderRow;
    },

    createTableDataRow: function(data) {
        const tableDataRow = document.createElement("tr");

        // Date
        const date = document.createElement("td");
        if (data.q in ["1", "2", "3", "4", "H", "OT"]) {
            const quarter = document.createElement("div");
            quarter.innerHTML = this.translate(this.states[data.q]);

            if (Object.prototype.hasOwnProperty.call(data, "k")) {
                // If game is live
                quarter.className = "live";
                date.appendChild(quarter);
                // Time
                const time = document.createElement("div");
                time.innerHTML = data.k + " " + this.translate("TIME_LEFT");
                time.classList.add("live");
                date.appendChild(time);
            } else {
                // If game is not live / tie / ...
                date.appendChild(quarter);
            }
        } else if (data.q === "P") {
            // Game is upcoming
            date.innerHTML = moment(data.starttime).format(this.config.timeFormat);
            date.className = "date upcoming";
        } else {
            // Game ended
            date.innerHTML = this.translate(this.states[data.q]);
            date.className = "date finished dimmed";
        }

        // First Team
        const firstTeamName = document.createElement("td");
        firstTeamName.className = "firstTeam fistTeamName name";
        firstTeamName.innerHTML = data.h;

        // Logo
        const firstTeamLogo = document.createElement("td");
        firstTeamLogo.className = "firstTeam firstTeamLogo logo";
        firstTeamLogo.appendChild(this.getIcon(data.hl));

        // Score
        const firstTeamScore = document.createElement("td");
        firstTeamScore.className = "firstTeam firstTeamScore score";
        firstTeamScore.innerHTML = data.hs;

        // Divider
        const vs = document.createElement("td");
        vs.innerHTML = ":";

        // Second Team
        const secondTeamName = document.createElement("td");
        secondTeamName.className = "secondTeam secondTeamName name";
        secondTeamName.innerHTML = data.v;

        // Logo
        const secondTeamLogo = document.createElement("td");
        secondTeamLogo.className = "secondTeam secondTeamLogo logo";
        secondTeamLogo.appendChild(this.getIcon(data.vl));

        // Score
        const secondTeamScore = document.createElement("td");
        secondTeamScore.className = "secondTeam secondTeamScore score";
        secondTeamScore.innerHTML = data.vs;

        // If the favorite team is found (which is !== -1)
        if (this.config.focus_on && (this.config.focus_on.indexOf(data.h) !== -1 || this.config.focus_on.indexOf(data.v) !== -1)) {
            if (this.config.focus_on.indexOf(data.h) !== -1) { // === 1
                firstTeamName.classList.add("bright");
            }
            if (this.config.focus_on.indexOf(data.v) !== -1) { // === 2
                secondTeamName.classList.add("bright");
            }
            // or highlight the whole row
            // tableDataRow.classList.add("bright");
        }

        // Add all td's
        tableDataRow.appendChild(date);

        tableDataRow.appendChild(firstTeamName);
        tableDataRow.appendChild(firstTeamLogo);
        tableDataRow.appendChild(firstTeamScore);

        tableDataRow.appendChild(vs);

        tableDataRow.appendChild(secondTeamScore);
        tableDataRow.appendChild(secondTeamLogo);
        tableDataRow.appendChild(secondTeamName);

        return tableDataRow;
    },

    createTableDataRowByeWeek: function(teamName) {
        const tableDataRow = document.createElement("tr");
        tableDataRow.className = "tableRow";

        // Bye week
        const byeWeek = document.createElement("td");
        byeWeek.className = "byeweek date";
        byeWeek.innerHTML = this.translate("BYE_WEEK");
        tableDataRow.appendChild(byeWeek);

        // Team and Logo wrapper
        const wrapper = document.createElement("td");
        wrapper.className = "byeweek wrapper";
        wrapper.setAttribute("colspan", 2);

        // Team
        const team = document.createElement("td");
        team.className = "byeweek team";
        // Highlight team
        team.classList.add("bright");
        team.innerHTML = teamName;
        wrapper.appendChild(team);

        // Logo
        const logo = document.createElement("td");
        logo.className = "byeweek logo";
        logo.appendChild(thos.getIcon(teamName));
        wrapper.appendChild(logo);

        // Append wrapper to table data row
        tableDataRow.appendChild(wrapper);

        // Date
        const date = document.createElement("td");
        date.setAttribute("colspan", 5);
        date.innerHTML = moment(this.fetchedData.details.w).format("DD.MM.YYYY");

        tableDataRow.appendChild(date);

        return tableDataRow;
    },

    getIcon: function(link) {
        const teamIcon = document.createElement("img");
        teamIcon.src = link;
        teamIcon.style.height = "25px";
        teamIcon.style.width = "25px";
        if (!this.config.colored) {
            teamIcon.className = "uncolored";
        }
        return teamIcon;
    },

    // Override socket notification handler.
    socketNotificationReceived: function(notification, payload) {
        if (notification == "DATA") {
            var animationSpeed = this.config.animationSpeed;
            if (this.loaded) {
                animationSpeed = 0;
            }
            this.fetchedData = payload;
            this.loaded = true;
            this.error = false;
            // Update dom with given animation speed.
            this.updateDom(animationSpeed);
        } else if (notification == "ERROR") {
            this.fetchedData = payload;
            this.error = true;
            this.updateDom(this.config.animationSpeed);
        }
    }
});