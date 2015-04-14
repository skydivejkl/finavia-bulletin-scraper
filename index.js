"use strict";
require("babel/polyfill");
var axios = require("axios");
var cheerio = require("cheerio");
var range = require("lodash.range");
var moment = require("moment");
require("moment-timezone");
var icalendar = require("icalendar");


function parseUTCTime({month, day, time}) {
    var s = month +"-"+ day +"-"+ time;
    return moment.utc(s, "MMM-D-HHmm").tz("Europe/Helsinki");
}

function isValidMonth(s) {
    if (!s) return false;
     return moment(s, "MMM").format("MMM").toUpperCase() == s;
}

function fetchOpeningHours(url, headerText) {
    return axios.get(url)
    .then(function(res) {
        var $ = cheerio.load(res.data);

        var data = $("table td span").filter((i, el) => $(el).text().includes(headerText)).text();
        data = data.replace(headerText, "");
        data = data.split(",");
        data = data.map(v => v.trim());


        return data.reduce((res, entry) => {
            var parts = entry.split(" ");

            if (!isValidMonth(parts[0])) {
                // Month is missing but it's probably the same as in the
                // previous entry.
                let prev = res[res.length-1];
                if (prev) {
                    parts.unshift(prev.start.format("MMM").toUpperCase());
                } else {
                    // If this is the first one use the current month
                    parts.unshift(moment().format("MMM").toUpperCase());
                }
            }

            var [month, days, ...hours] = parts;

            if (days.includes("-")) {
                let [start, end] = days.split("-").map(d => parseInt(d, 10));
                days = range(start, end+1);
            } else {
                days = [parseInt(days, 10)];
            }

            days = days.map(d => String(d));

            hours = hours.map(h => {
                var [start, end] = h.split("-");
                return {start, end};
            });


            days.forEach(day => {
                hours.forEach(h => {
                    var start = parseUTCTime({month, day, time: h.start});
                    var end = parseUTCTime({month, day, time: h.end});
                    res.push({start, end});
                });
            });

            return res;

        }, []);

    });

}

function generateICAL(openingHours) {
    var cal = new icalendar.iCalendar();

    openingHours.forEach(towerOpen => {
        var eventID = String(towerOpen.start.unix()) + String(towerOpen.end.unix());
        var e = new icalendar.VEvent(eventID);
        var description = "Torni auki";

        var diff = towerOpen.end.diff(towerOpen.start);
        var minutes = diff / 1000 / 60;
        var fullHours = Math.floor(minutes / 60);
        var remainingMinutes =  minutes % 60;

        if (fullHours) {
            description += " " + fullHours + "h";
        }

        if (remainingMinutes) {
            description += " " + remainingMinutes + "min";
        }

        description += `. Haettu ${moment().format("D.M.YYYY HH:mm")}.`;

        e.setSummary(`Torni (-${towerOpen.end.format("HH:mm")})`);
        e.setDescription(description);
        e.setDate(towerOpen.start.toDate(), towerOpen.end.toDate());
        cal.addComponent(e);
    });

    return cal.toString();
}

fetchOpeningHours("https://ais.fi/ais/bulletins/envfra.htm", "JYVASKYLA TWR OPR HR:")
.then(openingHours => {

    if (process.env.DEBUG) {
        for (let {start, end} of openingHours) {
            console.error(start.format("D.M HH:mm"), "->", end.format("D.M HH:mm"));
        }
    }

    process.stdout.write(generateICAL(openingHours));
})
.catch(function(err) {
    console.error(err.stack);
    process.exit(1);
});
