# WikiMap

An interactive map that surfaces nearby Wikipedia articles as explorable pins — powered by geolocation and the Wikipedia API.

## Problem

Wikipedia has articles about nearly every place on earth, but there's no good way to discover them spatially. WikiMap turns your surroundings into an explorable layer of knowledge — walk through a neighbourhood and see what stories are attached to it.

## Features

- **Live Article Pins**: Wikipedia articles near you rendered as map pins, updated as you pan and zoom.
- **Hover Tooltips**: See article titles at a glance without clicking.
- **Emoji Category Filters**: Filter pins by type — Education, Nature, Health, Transport, and more.
- **Global Search**: Search any Wikipedia topic and fly to it on the map.
- **Smart Pin Spread**: Geographic grid selection ensures pins cover the full visible area, not just the densest neighbourhood.
- **Importance Ranking**: At low zoom, longer (more significant) articles are prioritized over stubs.
- **Article Preview**: Tap any pin for a summary card with thumbnail and link to the full article.

## Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS 4
- **Map**: Leaflet + React-Leaflet, CartoDB Light tiles
- **Data**: Wikipedia REST API + Action API

---

- [Changelog](./CHANGELOG.md)

Created by [Ryan Hanna](https://github.com/ryanphanna) | [ryanisnota.pro](https://ryanisnota.pro)
