let hyperpwn

class Hyperpwn {
  constructor(store) {
    this.store = store
    this.index = null
    this.records = {}
    this.cachedData = null
    this.replayPrev = this.replayPrev.bind(this)
    this.replayNext = this.replayNext.bind(this)
  }

  get splitSeq() {
    return '\u001b[3J\u001b[H\u001b[2J'
  }

  addData(data) {
    this.cachedData = data
  }

  ptyData(uid, data) {
    if (!(uid in this.records)) {
      this.records[uid] = []
    }
    if (data === this.cachedData) {
      this.records[uid].push(data)
      this.index = this.records[uid].length - 1
    }
    this.cachedData = null
  }

  checkRecordLength() {
    const lens = Object.keys(this.records).map(uid => this.records[uid].length)
    const first = lens[0]
    if (lens.every(len => len === first)) {
      return first
    }
  }

  replayPrev(e) {
    const len = this.checkRecordLength()
    if (len && this.index > 0 && this.index < len) {
      this.index -= 1
      Object.keys(this.records).forEach(uid => {
        store.dispatch({
          type: 'SESSION_PTY_DATA',
          uid,
          data: this.records[uid][this.index],
          now: Date.now()
        })
      })
    }
  }

  replayNext(e) {
    const len = this.checkRecordLength()
    if (len && this.index < len - 1) {
      this.index += 1
      Object.keys(this.records).forEach(uid => {
        store.dispatch({
          type: 'SESSION_PTY_DATA',
          uid,
          data: this.records[uid][this.index],
          now: Date.now()
        })
      })
    }
  }
}

exports.decorateKeymaps = keymaps => {
  const newKeymaps = {
    'pwn:replayprev': 'ctrl+shift+pageup',
    'pwn:replaynext': 'ctrl+shift+pagedown'
  }
  return Object.assign({}, keymaps, newKeymaps)
}

exports.middleware = store => next => action => {
  const {type, data, uid} = action

  if (type === 'SESSION_ADD_DATA') {
    if (data.startsWith(hyperpwn.splitSeq)) {
      hyperpwn.addData(data)
    }
  }
  if (type === 'SESSION_PTY_DATA') {
    if (data.startsWith(hyperpwn.splitSeq)) {
      hyperpwn.ptyData(uid, data)
    }
  }
  next(action)
}

exports.decorateTerms = (Terms, {React}) => {
  return class extends React.Component {
    constructor(props, context) {
      super(props, context)
      this.onDecorated = this.onDecorated.bind(this)
      this.terms = null

      hyperpwn = new Hyperpwn(store)
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
