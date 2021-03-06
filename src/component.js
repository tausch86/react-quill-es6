import React, { PropTypes, Component, cloneElement } from 'react'
import ReactDOM from 'react-dom'

import Quill from 'quill'
import QuillToolbar from './toolbar'
import { find } from './utils'

class QuillComponent extends Component {

  static propTypes = {
    id: PropTypes.string,
    className: PropTypes.string,
    style: PropTypes.object,
    value: PropTypes.string,
    defaultValue: PropTypes.string,
    placeholder: PropTypes.string,
    readOnly: PropTypes.bool,
    modules: PropTypes.object,
    toolbar: PropTypes.oneOfType([
      PropTypes.array,
      PropTypes.oneOf([false])
    ]),
    formats: PropTypes.array,
    styles: PropTypes.oneOfType([
      PropTypes.object,
      PropTypes.oneOf([false])
    ]),
    theme: PropTypes.string,
    pollInterval: PropTypes.number,
    onKeyPress: PropTypes.func,
    onKeyDown: PropTypes.func,
    onKeyUp: PropTypes.func,
    onChange: PropTypes.func,
    onChangeSelection: PropTypes.func
  }

  static defaultProps = {
    className: '',
    theme: 'snow',
    modules: {}
  }

  static dirtyProps = [
    'id',
    'className',
    'modules',
    'toolbar',
    'formats',
    'styles',
    'theme',
    'pollInterval'
  ]

  static displayName = 'Quill'

  constructor (props){
    super(props)
    this.state = {
      value: this.isControlled() ? this.props.value : this.props.defaultValue,
      editor: null
    }
    console.log('props', this.props)
  }

  isControlled = () => {
    return 'value' in this.props
  }

  componentWillReceiveProps= (nextProps) => {
    const editor = this.state.editor
    // If the component is unmounted and mounted too quickly
    // an error is thrown in setEditorContents since editor is
    // still undefined. Must check if editor is undefined
    // before performing this call.
    if (editor) {
      // Update only if we've been passed a new `value`.
      // This leaves components using `defaultValue` alone.
      if ('value' in nextProps) {
        // NOTE: Seeing that Quill is missing a way to prevent
        //       edits, we have to settle for a hybrid between
        //       controlled and uncontrolled mode. We can't prevent
        //       the change, but we'll still override content
        //       whenever `value` differs from current state.
        if (nextProps.value !== this.getEditorContents()) {
          this.setEditorContents(editor, nextProps.value)
        }
      }
      // We can update readOnly state in-place.
      if ('readOnly' in nextProps) {
        if (nextProps.readOnly !== this.props.readOnly) {
          this.setEditorReadOnly(editor, nextProps.readOnly)
        }
      }
    }
  }

  componentDidMount = () => {
    const editorEl = this.getEditorElement()
    const editorConfig = this.getEditorConfig()
    const editor = new Quill(editorEl, editorConfig)

    const fontOptions = document.querySelectorAll('.quill-toolbar .ql-font.ql-picker .ql-picker-item')

    for (let i=0; i<fontOptions.length; ++i) {
      fontOptions[i].style.fontFamily = fontOptions[i].dataset.value
    }

    this.setState({ editor })
  }

  shouldComponentUpdate = (nextProps, nextState) => {
    // Check if one of the changes should trigger a re-render.
    for(const prop of this.dirtyProps) {
      if (nextProps[prop] !== this.props[prop]) {
        return true
      }
    }
    // Never re-render otherwise.
    return false
  }

  // If for whatever reason we are rendering again,
  // we should tear down the editor and bring it up
  // again.

  componentWillUpdate = () => {
    this.componentWillUnmount()
  }

  componentDidUpdate = () => {
    this.componentDidMount()
  }

  /**
  Creates an editor on the given element. The editor will
  be passed the configuration, have its events bound,
  */
  createEditor = ($el, config) => {
    const editor = new Quill($el, config)
    this.hookEditor(editor)
    return editor
  }

  setEditorReadOnly = (editor, value) => {
    value ? editor.disable() : editor.enable()
  }

  /*
  Replace the contents of the editor, but keep
  the previous selection hanging around so that
  the cursor won't move.
  */
  setEditorContents = (editor, value) => {
    const sel = editor.getSelection()
    editor.pasteHTML(value || '')
    if (sel) {
      this.setEditorSelection(editor, sel)
    }
  }


  getEditorConfig = () => {
    const { readOnly, theme, formats, styles, modules, pollInterval, bounds, placeHolder } = this.props

    const config = {
      readOnly,
      theme,
      formats,
      styles,
      modules,
      pollInterval,
      bounds,
      placeholder
    }
    // Unless we're redefining the toolbar, or it has been explicitly
    // disabled, attach to the default one as a ref.
    // Note: Toolbar should be configured as a module for Quill v1.0.0 and above
    // Pass toolbar={false} for versions >1.0
    if (this.props.toolbar !== false && !config.modules.toolbar) {
      // Don't mutate the original modules
      // because it's shared between components.
      config.modules = JSON.parse(JSON.stringify(config.modules))
      config.modules.toolbar = {
        container: ReactDOM.findDOMNode(this.toolbar)
      }
    }
    return config
  }

  onEditorChange = (value, delta, source, editor) => {
    if (value !== this.getEditorContents()) {
      this.setState({ value })
      if (this.props.onChange) {
        this.props.onChange(value, delta, source, editor)
      }
    }
  }

  onEditorChangeSelection = (range, source, editor) => {
    const s = this.getEditorSelection() || {}
    const r = range || {}
    if (r.length !== s.length || r.index !== s.index) {
      this.setState({ selection: range })
      if (this.props.onChangeSelection) {
        this.props.onChangeSelection(range, source, editor)
      }
    }
  }

  hookEditor = (editor) => {
    // Expose the editor on change events via a weaker,
    // unprivileged proxy object that does not allow
    // accidentally modifying editor state.
    const unprivilegedEditor = this.makeUnprivilegedEditor(editor)

    editor
      .on('text-change', (delta, oldDelta, source) => {
        if (this.onEditorChange) {
          this.onEditorChange(
            editor.root.innerHTML,
            delta,
            source,
            unprivilegedEditor
          )
        }
      })

    editor
      .on('selection-change', (range, oldRange, source) => {
        if (this.onEditorChangeSelection) {
          this.onEditorChangeSelection(
            range,
            source,
            unprivilegedEditor
          )
        }
      })
  }

  /*
  Returns a weaker, unprivileged proxy object that only
  exposes read-only accessors found on the editor instance,
  without any state-modification methods.
  */
  makeUnprivilegedEditor = (editor) => {
    const e = editor
    return {
      getLength:    () => { e.getLength.apply(e, arguments) },
      getText:      () => { e.getText.apply(e, arguments) },
      getContents:  () => { e.getContents.apply(e, arguments) },
      getSelection: () => { e.getSelection.apply(e, arguments) },
      getBounds:    () => { e.getBounds.apply(e, arguments) },
    }
  }

  getEditor = () => {
    return this.state.editor
  }

  getEditorElement = () => {
    return ReactDOM.findDOMNode(this.editor)
  }

  getEditorContents = () => {
    return this.state.value
  }

  getEditorSelection = () => {
    return this.state.selection
  }

  setEditorSelection = (editor, range) => {
    if (range) {
      // Validate bounds before applying.
      var length = editor.getLength()
      range.index = Math.max(0, Math.min(range.index, range.length - 1))
      range.length = length
    }
    editor.setSelection(range)
  }


  focus = () => {
    this.state.editor.focus()
  }

  blur = () => {
    this.setEditorSelection(this.state.editor, null)
  }

  /*
  Stop change events from the toolbar from
  bubbling up outside.
  */
  preventDefault = (event) => {
    event.preventDefault()
    event.stopPropagation()
  }

  /*
  Renders either the specified contents, or a default
  configuration of toolbar and contents area.
  */
  renderContents = () => {
    const contents = []
    const children = React.Children.map(this.props.children, c => cloneElement(c, {ref: c.ref}) )

    if (this.props.toolbar !== false) {
      const toolbar = find(children, child => child.ref === 'toolbar')
      let el
      if(toolbar){
        el = toolbar
      } else {
        el = (
          <QuillToolbar
            key={ `toolbar-${Math.random()}` }
            ref={ toolbar => this.toolbar = toolbar }
            items={ this.props.toolbar }
          />
        )
      }
      contents.push(el)
    }

    const editor = find(children, child => child.ref === 'editor')

    contents.push(editor ? editor : (
        <div
          key={`editor${Math.random()}`}
          ref={ editor => this.editor = editor }
          className='quill-contents'
          dangerouslySetInnerHTML={ {__html: this.getEditorContents()} }
        >
        </div>
      )
    )

    return contents
  }

  render = () => {
    const { id, style, className, onKeyPress, onKeyDown, onKeyUp } = this.props
    return (
      <div
        id={ id }
        style={ style }
        className={ className }
        onKeyPress={ onKeyPress }
        onKeyDown={ onKeyDown }
        onKeyUp={ onKeyUp }
        onChange={ this.preventDefault }
      >
        { this.renderContents() }
      </div>

    )
  }
}


export default QuillComponent
