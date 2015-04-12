
# Finavia Bulletin scraper

Scrapes tower opening hours for EFJY from the Finavia [bulletin][b] and formats
it as [iCalendar][ical] which can used for example with Google Calendar.

[b]: https://ais.fi/ais/bulletins/envfra.htm
[ical]: http://en.wikipedia.org/wiki/ICalendar

## Usage

Install node.js, npm and GNU Make.

Install deps

    make

Generate iCalendar file to stdout from the current bulletin

    make scrape

Generate to file

    make scrape > tower.ical

