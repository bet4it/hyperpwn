const {homedir} = require('os')
const {resolve} = require('path')
const {copySync} = require('fs-extra')
const merge = require('lodash.merge')
const stripAnsi = require('strip-ansi')
const expandTabs = require('expandtabs')
const cliTruncate = require('cli-truncate')
const ansiEscapes = require('ansi-escapes')

let hyperpwn
let contextStart
let contextData

const defaultConfig = {
  hotkeys: {
    prev: 'ctrl+shift+pageup',
    next: 'ctrl+shift+pagedown'
  },
  autoClean: false,
  showHeaders: true,
  headerStyle: {
    position: 'absolute',
    top: 0,
    right: 0,
    fontSize: '10px'
  }
}

let config = defaultConfig

class Hyperpwn {
  constructor() {
    this.index = null
    this.records = {}
    this.recordLen = 0
    this.replayPrev = this.replayPrev.bind(this)
    this.replayNext = this.replayNext.bind(this)
  }

  addUid(uid, name) {
    this.records[uid] = []
    this.records[uid].name = name
  }

  delUid(uid) {
    delete this.records[uid]
    if (Object.keys(this.records).length === 0) {
      this.index = null
      this.recordLen = 0
    }
  }

  addData(uid, title, data) {
    return Object.keys(this.records).some(uid => {
      if (title.includes(this.records[uid].name)) {
        this.records[uid].push(data)
        return true
      }
      return false
    })
  }

  alignData() {
    Object.keys(this.records).forEach(uid => {
      if (this.records[uid].length === this.recordLen) {
        this.records[uid].push('')
      }
    })
    this.recordLen += 1
  }

  cleanData() {
    Object.keys(this.records).forEach(uid => {
      let name = this.records[uid].name
      this.records[uid] = []
      this.records[uid].name = name
    })
    this.index = null
    this.recordLen = 0
  }

  uidHeader(uid) {
    if (uid in this.records) {
      return `[${this.records[uid].name}]`
    }
  }

  setStore(store) {
    this.store = store
  }

  loadLayout(name) {
    if (Object.keys(this.records).length === 0) {
      const cfgName = `hyperpwn-${name}.yml`
      const cfgPath = resolve(homedir(), '.hyperinator', cfgName)
      copySync(resolve(__dirname, 'cfgs', cfgName), cfgPath, {overwrite: false})
      this.store.dispatch({
        type: 'HYPERINATOR_LOAD',
        data: cfgPath
      })
    }
  }

  replayUid(uid, cols) {
    if (uid in this.records && Number.isInteger(this.index)) {
      let data = this.records[uid][this.index]
      data = data.replace(/^.*$/mg, line => cliTruncate(expandTabs(line), cols))
      data = ansiEscapes.clearTerminal + data
      this.store.dispatch({
        type: 'SESSION_PTY_DATA',
        uid,
        data
      })
    }
  }

  replay() {
    Object.keys(this.records).forEach(uid => {
      const {cols} = this.store.getState().sessions.sessions[uid]
      this.replayUid(uid, cols)
    })
  }

  replayPrev() {
    if (this.index > 0) {
      this.index -= 1
      this.replay()
    }
  }

  replayNext() {
    if (this.index < this.recordLen - 1) {
      this.index += 1
      this.replay()
    }
  }

  replayLast() {
    if (this.recordLen) {
      this.index = this.recordLen - 1
      this.replay()
    }
  }
}

exports.middleware = store => next => action => {
  const {type} = action

  if (type === 'CONFIG_LOAD' || type === 'CONFIG_RELOAD') {
    if (action.config.hyperpwn) {
      config = merge(JSON.parse(JSON.stringify(defaultConfig)), action.config.hyperpwn)
    }
  }

  if (type === 'SESSION_ADD_DATA') {
    const {data} = action
    const strippedData = stripAnsi(data)
    if (strippedData.includes('GEF for linux ready')) {
      hyperpwn.setStore(store)
      hyperpwn.loadLayout('gef')
      if (config.autoClean) {
        hyperpwn.cleanData()
      }
    }
    if (strippedData.includes('pwndbg: loaded ')) {
      hyperpwn.setStore(store)
      hyperpwn.loadLayout('pwndbg')
      if (config.autoClean) {
        hyperpwn.cleanData()
      }
    }
  }

  if (type === 'SESSION_PTY_DATA') {
    const {data, uid} = action
    const view = /^ hyperpwn (.*)\r\n\r\n$/.exec(data)
    if (view) {
      hyperpwn.addUid(uid, view[1])
      action.data = ansiEscapes.cursorHide
    }

    if (contextStart) {
      action.data = ''
      contextData += data
    }

    const legend = /^(\[ )?legend:/im.exec(data)
    if (legend) {
      contextStart = true
      action.data = data.substr(0, legend.index)
      contextData = data.substr(legend.index + legend[0].length)
    }

    if (contextStart) {
      const end = /\r\n(\u001B\[[^m]*m)*─+(\u001B\[[^m]*m)*\r\n/.exec(contextData)
      if (end) {
        let endDisp = false
        let dataAdded = false
        contextStart = false
        const tailData = contextData.substr(end.index + end[0].length)
        contextData = contextData.substr(0, end.index + 2)
        const parts = contextData.split(/(^.*─.*$)/mg).slice(1)
        for (let i = 0; i < parts.length; i += 2) {
          if (hyperpwn.addData(uid, parts[i], parts[i + 1].slice(2, -2))) {
            dataAdded = true
          } else {
            action.data += parts[i] + parts[i + 1]
            endDisp = true
          }
        }
        if (dataAdded) {
          hyperpwn.alignData()
        }
        hyperpwn.replayLast()

        if (endDisp) {
          action.data += end[0].substr(2)
        }
        action.data += tailData
      }
      if (!action.data) {
        return
      }
    }
  }

  if (type === 'SESSION_RESIZE') {
    hyperpwn.replayUid(action.uid, action.cols)
  }

  if (type === 'SESSION_PTY_EXIT') {
    hyperpwn.delUid(action.uid)
  }

  next(action)
}

exports.decorateConfig = mainConfig => {
  if (mainConfig.hyperpwn) {
    config = merge(JSON.parse(JSON.stringify(defaultConfig)), mainConfig.hyperpwn)
  }
  return mainConfig
}

exports.decorateKeymaps = keymaps => {
  const newKeymaps = {
    'pwn:replayprev': config.hotkeys.prev,
    'pwn:replaynext': config.hotkeys.next
  }
  return Object.assign({}, keymaps, newKeymaps)
}

exports.decorateTerms = (Terms, {React}) => {
  return class extends React.Component {
    constructor(props, context) {
      super(props, context)
      this.onDecorated = this.onDecorated.bind(this)
      this.terms = null

      hyperpwn = new Hyperpwn()
    }

    onDecorated(terms) {
      this.terms = terms
      if (this.props.onDecorated) {
        this.props.onDecorated(terms)
      }

      if (this.terms) {
        terms.registerCommands({
          'pwn:replayprev': hyperpwn.replayPrev,
          'pwn:replaynext': hyperpwn.replayNext
        })
      }
    }

    render() {
      return React.createElement(
        Terms,
        Object.assign({}, this.props, {
          onDecorated: this.onDecorated
        })
      )
    }
  }
}

exports.decorateTerm = (Term, {React}) => {
  return class extends React.Component {
    render() {
      const props = {}

      let header
      if (config.showHeaders) {
        header = hyperpwn.uidHeader(this.props.uid)
      }

      if (!header) {
        return React.createElement(Term, Object.assign({}, this.props, props))
      }

      const myCustomChildrenBefore = React.createElement(
        'div',
        {
          key: 'pwn',
          style: config.headerStyle
        },
        header
      )
      const customChildrenBefore = this.props.customChildrenBefore ?
        new Array(this.props.customChildrenBefore).concat(myCustomChildrenBefore) :
        myCustomChildrenBefore
      props.customChildrenBefore = customChildrenBefore
      return React.createElement(Term, Object.assign({}, this.props, props))
    }
  }
}
