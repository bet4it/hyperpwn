# Hyperpwn

[![Build Status](https://travis-ci.org/bet4it/hyperpwn.svg?branch=master)](https://travis-ci.org/bet4it/hyperpwn) [![XO code style](https://img.shields.io/badge/code_style-XO-5ed9c7.svg)](https://github.com/sindresorhus/xo)

Hyperpwn is a [Hyper](https://hyper.is) plugin to improve the display when debugging with GDB.

Hyperpwn needs [GEF](https://github.com/hugsy/gef) or [pwndbg](https://github.com/pwndbg/pwndbg) to be loaded in GDB as a backend.
Hyperpwn handles with its context data, seperates them to different windows to get a clearer display and can easily replay previous states.

* Use hyperpwn on GEF. Theme: [hyper-chesterish](https://github.com/henrikdahl/hyper-chesterish):
<img src="https://user-images.githubusercontent.com/16643669/60032146-921d3200-96d8-11e9-84d7-905a9669acc4.gif">

* Use hyperpwn together with [hyper-pane](https://github.com/chabou/hyper-pane) on pwndbg. Theme: [hyper-material-theme](https://github.com/equinusocio/hyper-material-theme):
<img src="https://user-images.githubusercontent.com/16643669/60032184-9fd2b780-96d8-11e9-835e-3dd1c033f352.gif">

# Install
Firstly, you need to [install Hyper](https://hyper.is/#installation) on your computer.

Hyperpwn relies on [hyperinator](https://github.com/bet4it/hyperinator). You need to install both `hyperinator` and `hyperpwn` plugins to use hyperpwn.

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

If GEF or pwndbg is loaded, hyperpwn will automatically create a config file in `~/.hyperinator`, load it and handle with the context data.

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
      autoClean: false,
      autoLayout: true,
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
* If you want to use hyperpwn on pwndbg, make sure you have installed the git version of pwndbg, or you must backport [this patch](https://github.com/pwndbg/pwndbg/commit/97c5ccb4197e6cb0042740a7bf378d4104a79717.patch).
* Make sure you have enabled the display of `legend` in the backend (which is the default behavior).
* You can try to change configs like `context.nb_lines_code`, `context.nb_lines_code_prev` in GEF, or `context-code-lines` in pwndbg, to get a better display.
