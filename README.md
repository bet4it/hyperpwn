# Hyperpwn

[![Build Status](https://travis-ci.org/bet4it/hyperpwn.svg?branch=master)](https://travis-ci.org/bet4it/hyperpwn) [![XO code style](https://img.shields.io/badge/code_style-XO-5ed9c7.svg)](https://github.com/sindresorhus/xo)

Hyperpwn is a [Hyper](https://hyper.is) plugin to improve the display when debugging with GDB.

Hyperpwn needs [GEF](https://github.com/hugsy/gef) to be loaded in GDB as a backend.
Hyperpwn handles with its context data, seperates them to different windows to get a clearer display and can easily replay previous states.

<img src="https://user-images.githubusercontent.com/16643669/59614153-bd40d800-9152-11e9-921c-ac1f0be83686.gif">

# Install
Firstly, you need to [install Hyper](https://hyper.is/#installation) on your computer.

Hyperpwn relies on [hyperinator](https://github.com/bet4it/hyperinator). You need to install both `hyperinator` and `hyperpwn` plugins to use Hyperpwn.

You can install them by command line:
```sh
$ hyper i hyperinator
$ hyper i hyperpwn
```
Or edit `~/.hyper.js` manually and add them to plugins:
```
plugins: [
  "hyperinator", "hyperpwn"
],
```

# Usage
Just run `gdb` in Hyper terminal.

If GEF is loaded, Hyperpwn will automatically create a config file in `~/.hyperinator`, load it and handle with the context data.

You can edit the config file to change the layout and parts to display.

## Shortcuts
* display previous state:	`ctrl+shift+pageup`
* display next state:		`ctrl+shift+pagedown`

# Configuration
## Default configuration:
``` js
module.exports = {
  config: {
    // other configs...
    hyperpwn: {
      hotkeys: {
        prev: 'ctrl+shift+pageup',
        next: 'ctrl+shift+pagedown'
      },
      showHeaders: true,
      headerStyle: {
        position: 'absolute',
        top: 0,
        right: 0,
        fontSize: '10px'
      }
    }
  }
  //...
};
```

# Notice
* Make sure you have enabled the display of `legend` in the backend (which is the default behavior).
* You can try to change `context.nb_lines_code`, `context.nb_lines_code_prev` or other configs in GEF to get a better display.
