# MMM-NBA

<p style="text-align: center">
    <a href="https://choosealicense.com/licenses/mit"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License"></a>
</p>

This module is an extention for [MagicMirror²](https://github.com/MagicMirrorOrg/MagicMirror).

The module is based on the work of [bgibz](https://github.com/bgibz/MMM-NBA) and got extended by some ideas of the module of [jclarke0000](https://github.com/jclarke0000/MMM-MyScoreboard) and [fewieden](https://github.com/fewieden/MMM-NHL).

## Screenshot

![MMM-NBA](screenshot.png)

## Installation

To install the module, clone the repository into the `modules` directory and install the dependencies:

```bash
cd ~/MagicMirror/modules
git clone https://github.com/jupadin/MMM-NBA
cd MMM-NBA
npm install
```

## Update

To update the module, navigate to the module directory and pull the latest changes:

```bash
cd ~/MagicMirror/modules/MMM-NBA
git pull
npm install
```

## Configuration

Add the following code snippet to the `config.js` file of your MagicMirror in the `modules` array:

```javascript
        {
            module: "MMM-NBA",
            header: "MMM-NBA",
            position: "top_left",
            config: {
                animationSpeed: 2000,
                updateInterval: 3600000,
                updateIntervalLive: 6000,
                colored: true,
                focus_on: false,
                timeFormat: "dd. HH:mm",
                showHeaderAsIcons: false,
                showFooter: true,
            }
        },
```

### Configuration options

The following configuration options can be set and/or changed:

| Option | Type | Default | Description |
| ---- | ---- | ---- | ---- |
| `animationSpeed` | `int` | `2000` | Animation speed to fade in the module on startup [milliseconds] (2 seconds) |
| `updateInterval` | `int` | `3600000` | How often the table shall be updated while there is *no* live game [milliseconds] (1 hour) |
| `updateIntervalLive` | `int` | `6000` | How often the table shall be updated while there is at least one live game [milliseconds] (1 minute) |
| `colored` | `bool` | `true` | Remove black/white filter of logos |
| `focus_on` | `array` | `false`| Highlight matches with teams of this array and also show bye weeks for these teams (example: `['CHI']`) |
| `timeFormat` | `string` | `'dd. HH:mm'` | Displays the time of the upcoming events in the given format |
| `showHeaderAsIcons`| `bool` |`false` | Display header as icons |
| `showFooter` | `bool` | `true` | Display footer with information about last update |
