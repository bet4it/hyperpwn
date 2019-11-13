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
let legendFix

const defaultConfig = {
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

let config = defaultConfig

class Hyperpwn {
  constructor() {
    this.index = null
    this.mainUid = null
    this.records = {}
    this.recordLen = 0
    this.legend = {uid: null, data: null, header: null}
    this.replayPrev = this.replayPrev.bind(this)
    this.replayNext = this.replayNext.bind(this)
    this.sendCmd = this.sendCmd.bind(this)
  }

  uids() {
    return Object.keys(this.records)
  }

  addUid(uid, name) {
    this.records[uid] = []
    this.records[uid].name = name
  }

  delUid(uid) {
    if (uid === this.legend.uid) {
      this.legend = {uid: null, data: null, header: null}
    } else {
      delete this.records[uid]
      if (this.uids().length === 0) {
        this.index = null
        this.recordLen = 0
      }
    }
  }

  addData(uid, title, data) {
    return this.uids().some(uid => {
      if (title.includes(this.records[uid].name)) {
        this.records[uid].push(data)
        return true
      }
      return false
    })
  }

  alignData() {
    this.uids().forEach(uid => {
      if (this.records[uid].length === this.recordLen) {
        this.records[uid].push('')
      }
    })
    this.recordLen += 1
  }

  cleanData() {
    this.uids().forEach(uid => {
      const {name} = this.records[uid]
      this.records[uid] = []
      this.records[uid].name = name
    })
    this.index = null
    this.recordLen = 0
  }

  addLegend(data) {
    if (this.legend.data !== data) {
      this.legend.data = data
      this.store.dispatch({
        type: 'SESSION_PTY_DATA',
        uid: this.legend.uid,
        data: ansiEscapes.clearTerminal + data
      })
    }
  }

  uidHeader(uid) {
    if (uid === this.legend.uid) {
      return this.legend.header
    }
    if (uid in this.records) {
      return `[${this.records[uid].name}]`
    }
  }

  initSession(store, uid, backend) {
    this.store = store
    this.mainUid = uid
    if (config.autoLayout) {
      this.loadLayout(backend)
    }
    if (config.autoClean) {
      this.cleanData()
    }
  }

  loadLayout(name) {
    if (this.uids().length === 0) {
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
    this.uids().forEach(uid => {
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

  sendCmd(cmd) {
    return () => {
      if (this.mainUid) {
        window.rpc.emit('data', {
          uid: hyperpwn.mainUid,
          data: '\b'.repeat(1000) + cmd + '\n'
        })
      }
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

  if (type === 'SESSION_USER_DATA') {
    const {activeUid} = store.getState().sessions
    if (hyperpwn.uids().includes(activeUid)) {
      window.rpc.emit('data', {
        uid: hyperpwn.mainUid,
        data: action.data
      })
      store.dispatch({
        type: 'SESSION_SET_ACTIVE',
        uid: hyperpwn.mainUid
      })
      return
    }
  }

  if (type === 'SESSION_PTY_DATA') {
    let {data, uid} = action
    const strippedData = stripAnsi(data)
    if (strippedData.includes('gdb-peda')) {
      config.autoClean = false
      hyperpwn.initSession(store, uid, 'peda')
    }
    if (strippedData.includes('GEF for linux ready')) {
      hyperpwn.initSession(store, uid, 'gef')
    }
    if (strippedData.includes('pwndbg: loaded ')) {
      hyperpwn.initSession(store, uid, 'pwndbg')
    }

    const view = /^ hyperpwn (.*)\r\n\r\n$/.exec(data)
    if (view) {
      if (view[1].toLowerCase() === 'legend') {
        hyperpwn.legend.uid = uid
        hyperpwn.legend.header = `[${view[1]}]`
      } else {
        hyperpwn.addUid(uid, view[1])
      }
      action.data = ansiEscapes.cursorHide
    }

    if (uid !== hyperpwn.mainUid) {
      next(action)
      return
    }

    if (legendFix) {
      data = data.substr(2)
      legendFix = false
    }

    if (contextStart) {
      action.data = ''
      contextData += data
    }

    const legend = /^(?:\u001B\[[^m]*m)*(?:\[ )?legend: (.*?)\]?$/im.exec(data)
    if (legend) {
      contextStart = true
      hyperpwn.addLegend(legend[0])
      action.data = data.substr(0, legend.index)
      contextData = data.substr(legend.index + legend[0].length)
      if (contextData.length > 0) {
        contextData = contextData.substr(2)
      } else {
        legendFix = true
      }
    }

    if (contextStart && contextData.length > 0) {
      const firstTitle = /^(?:\u001B\[[^m]*m)*\[?[-─]/.exec(contextData)
      if (!firstTitle) {
        contextStart = false
        action.data += contextData
        contextData = ''
      }

      const end = /\r\n(?:\u001B\[[^m]*m)*\[?[-─]+\]?(?:\u001B\[[^m]*m)*\r\n/.exec(contextData)
      if (end) {
        let endDisp = false
        let dataAdded = false
        contextStart = false
        const tailData = contextData.substr(end.index + end[0].length)
        contextData = contextData.substr(0, end.index + 2)
        const partRegex = /^((?:\u001B\[[^m]*m)*\[?[-─]+.*[-─]+\]?(?:\u001B\[[^m]*m)*)$/mg
        const parts = contextData.split(partRegex).slice(1)
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
  for (const [k, v] of Object.entries(config.hotkeys.cmd)) {
    newKeymaps['pwn:cmd:' + k] = v
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
        const commands = {
          'pwn:replayprev': hyperpwn.replayPrev,
          'pwn:replaynext': hyperpwn.replayNext
        }
        Object.keys(config.hotkeys.cmd).forEach(cmd => {
          commands['pwn:cmd:' + cmd] = hyperpwn.sendCmd(cmd)
        })
        terms.registerCommands(commands)
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
