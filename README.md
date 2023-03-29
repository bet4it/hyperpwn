# Hyperpwn

[![Build Status](https://travis-ci.org/bet4it/hyperpwn.svg?branch=master)](https://travis-ci.org/bet4it/hyperpwn) [![XO code style](https://img.shields.io/badge/code_style-XO-5ed9c7.svg)](https://github.com/sindresorhus/xo)

Hyperpwn is a [Hyper](https://hyper.is) plugin to improve the display when debugging with GDB.

Hyperpwn needs [GEF](https://github.com/hugsy/gef), [pwndbg](https://github.com/pwndbg/pwndbg) or [peda](https://github.com/bet4it/peda) to be loaded in GDB as a backend.
Hyperpwn handles with its context data, seperates them to different windows to get a clearer display and can easily replay previous states.

Hyperpwn can be used on Windows, Linux and macOS.

* Use hyperpwn on GEF. Theme: [hyper-chesterish](https://github.com/henrikdahl/hyper-chesterish):
![](https://user-images.githubusercontent.com/16643669/61991945-25f06e00-b08a-11e9-95b2-a9eb32e0bfad.gif)

* Use hyperpwn together with [hyper-pane](https://github.com/chabou/hyper-pane) on pwndbg. Theme: [hyper-material-theme](https://github.com/equinusocio/hyper-material-theme):
![](https://user-images.githubusercontent.com/16643669/61991962-5df7b100-b08a-11e9-9b9e-e811da4b8d11.gif)

* If you want to use hyperpwn together with other tools such as pwntools and VS Code, you can check for [this tutorial](https://github.com/bet4it/build-an-efficient-pwn-environment)

# Install
Firstly, you need to [install the latest release of Hyper](https://hyper.is/#installation) on your computer.

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

If the backend is loaded, hyperpwn will automatically create a config file in `~/.hyperinator`, load it and handle with the context data.

You can edit the config file to change the layout and parts to display.

## Shortcuts
* stepi:	`F7`
* nexti:	`F8`
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
        next: 'ctrl+shift+pagedown',
        cmd: {
          stepi: 'f7',
          nexti: 'f8'
        }
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
* If you want to use hyperpwn on peda, please use my fork of [peda](https://github.com/bet4it/peda) or [peda-arm](https://github.com/bet4it/peda-arm).
* Make sure you have enabled the display of `legend` in the backend (which is the default behavior).
* You can try to change configs like `context.nb_lines_code`, `context.nb_lines_code_prev` in GEF, or `context-code-lines` in pwndbg, to get a better display.
