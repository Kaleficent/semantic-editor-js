var Model = require('./model');
var Dom   = require('./dom');
var Keystrokes = require('./keystrokes');

/*
 * map style name to node type,
 * export HTML tag, inport HTML tag, rendering HTML tag rendering HTML class, special types
 *
 * If you want to support a new semantic type, you'll do it here.
 * This mapping can also be used to determine the list of block or span styles to, for example,
 * generate a drop-down list.
 */
var import_map = {
    'b': {
        type:'span',
        style:'strong'
    },
    a: {
        type:'span',
        style:'link',
        isLink:true
    },
    i: {
        type:'span',
        style:'emphasis'
    },
    br: {
        type:'span',
        style:'body'
    },
    object: {
        skip:true
    },
    'div.header': {
        type:'block',
        style:'header'
    },
    'div.subheader': {
        type:'block',
        style:'subheader'
    },
    'div': {
        type:'block',
        style:'body'
    },
    'pre': {
        type:'block',
        style:'block-code'
    },
    'span.link': {
        type:'span',
        style:'link',
        isLink:true
    },
    'span.strong': {
        type:'span',
        style:'strong'
    },
    'span.emphasis': {
        type:'span',
        style:'emphasis'
    },
    'span': {
        type:'span',
        style:'plain'
    }

};

var semantic_map = {
    //blocks
    'body': {
        type:'block',
        element:'div',
        import: {
            elements: ['div','p']
        }
    },
    'header': {
        type:'block',
        element:'div',
        import: {
            elements: ['h1','h2']
        }
    },
    'subheader': {
        type:'block',
        element:'div',
        import: {
            elements: ['h3','h4','h5','h6']
        }
    },
    'block-code': {
        type:'block',
        element:'div',
        import: {
            elements: ['pre']
        }
    },
    'block-quote': {
        type:'block',
        element:'div',
        import: {
            elements: ['block-quote'],
        }
    },

    'ordered-list': {
        type:'block',
        element:'div',
        import: {
            elements: ['ol']
        },
        export: {
            elements: ['ol']
        },
    },
    'unordered-list': {
        type:'block',
        element:'div',
        import: {
            elements: ['ul']
        },
        export: {
            elements: ['ul']
        }
    },
    'list-item': {
        type:'block',
        element:'div',
        import: {
            elements: ['li']
        },
        export: {
            elements: ['li']
        },
        isListItem:true,
    },

    //spans

    'default_span': {
        type:'span',
        element:'span'
    },
    'plain': {
        type:'span',
        element:'span',
        import: {
            elements:['span']
        },
        export: {
            elements:['span']
        }
    },
    'emphasis': {
        type:'span',
        element:'span',
        import: {
            elements: ['i','em']
        },
        export: {
            elements: ['em']
        }
    },
    'strong': {
        type:'span',
        element:'span',
        import: {
            elements: ['b','strong'],
        },
        export: {
            elements: ['strong']
        }
    },
    'link': {
        type:'span',
        element:'a',
        attributes: [
            { metaName:'href', attrName:'href'}
        ],
        import: {
            elements:['a']
        },
        export: {
            elements:['a']
        },
        isLink:true
    },
    'delete': {
        type:'span',
        element:'span',
        import: {
            elements: ['strike','delete']
        },
        export: {
            elements: ['delete']
        }
    },
    'inline-code': {
        type:'span',
        element:'span',
        import: {
            elements:['code']
        },
        export: {
            elements: ['code']
        }
    },

    //misc
    'image': {
        type:'span',
        element:'img',
        attributes: [
            { metaName:'src', attrName:'src'}
        ],
        import: {
            elements: ['img']
        },
        export: {
            elements: ['img']
        },
        isImage: true
    },
    '#comment': {
        skip: true
    },
    '#text': {
        type:'text'
    },
    'video': {
        type:'span'
    }
};

var mapping_cache = {};

/*
 * suppose you wanted to make control R style text with bold, you'd
 * add a keymap for
 *
 * "control-r":"style-strong",
 * If you wanted to make command shift E insert the text poop you'd
 * first add a keymap for
 *
 * "command-shift-e":"insert-poop",
 *
 * then add the action:
 *
 * "insert-poop": {
 *    consume: true,
 *    fun: function(event, selection, editor) {
 *        editor.insertTextAtSelection("poop",selection);
 *    }
 * }
 *
 * To make command shift E insert the poop emoji, you'd do:
 *
 * "insert-poop": {
 *    consume: true,
 *    fun: function(event, selection, editor) {
 *        editor.insertTextAtSelection("poop",selection);
 *    }
 * }
 *
 * By using these semantic actions like `insertTextAtSelection`
 * it will do all of the proper wordprocessory things like
 * replacing the selection with the text if something is selected,
 * or else inserting at the current cursor point and moving the
 * cursor forward the correct amount. it also inserts the change
 * into the undo stack so that undo and redo work correctly.
 *
 * You must manually attach the editor's main key listener to the document. this give you
 * the opportunity to filter events before the editor does anything with them,
 * or synthesize or proxy events.
*/

var actions_map = {
    "delete-backward":   Keystrokes.deleteBackwards,
    "delete-forward":    Keystrokes.deleteForwards,
    "split-block":       Keystrokes.splitLine,
    "style-bold":        function(e,ed) { Keystrokes.styleSelection(e,ed,'strong'); },
    "style-italic":      function(e,ed) { Keystrokes.styleSelection(e,ed,'emphasis'); },
    "style-inline-code": function(e,ed) { Keystrokes.styleSelection(e,ed,'inline-code'); },
    "undo":              Keystrokes.undo,
    "redo":              Keystrokes.redo
};

var code_key_map = {
    8:"backspace",
    13:"enter",
    37:"arrow-left",
    39:"arrow-right",
    38:"arrow-up",
    40:"arrow-down",
    46:"delete",
    65:"a",
    66:"b",
    67:"c",
    68:"d",
    69:"e",
    70:"f",
    71:"g",
    72:"h",
    73:"i",
    74:"j",
    75:"k",
    76:"l",
    77:"m",
    78:"n",
    79:"o",
    80:"p",
    81:'q',
    82:"r",
    83:"s",
    84:"t",
    85:"u",
    86:"v",
    87:"w",
    88:"x",
    89:"y",
    90:"z"
};

var key_action_map = {
    "cmd-b":        "style-bold",
    "cmd-i":        "style-italic",
    "ctrl-d":       "delete-forward",
    "delete":       "delete-forward",
    "backspace":    "delete-backward",
    "cmd-shift-c":  "style-inline-code",
    "cmd-shift-a":  "style-inline-link",
    "enter":        "split-block",
    "shift-enter":  "split-block",
    "cmd-z":        "undo",
    "cmd-shift-z":  "redo"
};

function Editor(domRoot) {
    this._model = Model.makeModel();
    if(domRoot) {
        this.setDomRoot(domRoot);
    }
    this._key_action_map = Object.create(key_action_map);
    this._listeners = {};
    this._undostack = [];
    this._redostack = [];
}

Editor.prototype.setDomRoot = function(dom_root) {
    this._dom_root = dom_root;
    var self = this;
    if(this._dom_root.addEventListener) {
        this._dom_root.addEventListener("input", function (e) {
            Keystrokes.handleInput(e, self);
        });
        this._dom_root.addEventListener("keydown", this._handleKeydown.bind(this));
    }
    this.syncDom();
};

Editor.prototype.getDomRoot = function() {  return this._dom_root;  };


Editor.prototype._handleKeydown = function(evt) {
    var act = Keystrokes.findActionByEvent(evt, code_key_map, this._key_action_map, actions_map);
    if(act) act(evt,this);
};

Editor.prototype.on = function(name, cb) {
    if(!this._listeners[name]) this._listeners[name] = [];
    this._listeners[name].push(cb);
};

Editor.prototype._fireEvent = function(name, payload) {
    if(this._listeners[name]) {
        this._listeners[name].forEach(function(l){
            l(payload);
        });
    }
};

Editor.prototype.markAsChanged = function() { this._fireEvent('change',{}); };

Editor.prototype.getModel = function()     {  return this._model; };

Editor.prototype.setModel = function(model) {
    this._model = model;
    this.syncDom(this.getMapping());
};

Editor.prototype.setCursorAtModel = function(mod,off) {  Dom.setCursorAtModel(mod,off,this.getDomRoot()); };

Editor.prototype.toJSON   = function()     {  return this._model.toJSON();  };

Editor.prototype.fromJSON = function(json) {  this._model = Model.fromJSON(json); };

Editor.prototype._simulateKeyboardEvent = function(evt) {
    var act = Keystrokes.findActionByEvent(evt, code_key_map,
        this._key_action_map, actions_map);
    if(act) act(evt,this);
}

Editor.prototype.toPlainText = function() {  return this._model.toPlainText();  }

/*
 * add a key binding. Should be something like
 * editor.addKeyBinding("insert-poop-emoji","shift-command-a")
 */
Editor.prototype.addKeyBinding = function(name, keydef) {   this._key_action_map[keydef] = name;  };

/*
 * add an action. something like
 * editor.addAction("insert-poop-emoji", function(event,editor) { } );
 */
Editor.prototype.addAction = function(name, action) {  actions_map[name] = action;  };

Editor.prototype.syncDom = function() {
    if(this._dom_root && this._model) Dom.syncDom(this._dom_root, this._model, this.getMapping());
};

Editor.prototype.getMapping = function() {         return semantic_map; };

Editor.prototype.getImportMapping = function() {   return import_map;   };


/* =========== change deltas and undo/redo support ============ */

Editor.prototype.applyChange = function(chg) {
    this._redostack.length = 0;
    chg.redoit();
    this._undostack.push(chg);
    this.syncDom();
    this.markAsChanged();
};

Editor.prototype.undoChange = function() {
    if(this._undostack.length < 1) {
        console.log("nothing on the undo stack.")
        return;
    }
    var chg = this._undostack.pop();
    chg.undoit();
    this._redostack.push(chg);
    this.syncDom();
    this.markAsChanged();
};

Editor.prototype.redoChange = function() {
    if(this._redostack.length < 1) {
        console.log("nothing on the redo stack");
        return;
    }
    var chg = this._redostack.pop();
    chg.redoit();
    this._undostack.push(chg);
    this.syncDom();
    this.markAsChanged();
};


/* ========= selection stuff ========== */

Editor.prototype.getSelectionRange = function() {
    if(this._fake_range && this._fake_range != null) return this._fake_range;
    var model = this.getModel();
    var selection = window.getSelection().getRangeAt(0);
    var range = {
        start: {
            dom: selection.startContainer,
            mod: Dom.findModelForDom(model, selection.startContainer),
            offset: selection.startOffset
        },
        end: {
            dom: selection.endContainer,
            mod: Dom.findModelForDom(model, selection.endContainer),
            offset: selection.endOffset
        }
    };
    range.collapsed = selection.collapsed;
    range.documentOffset =
        range.start.offset +
        Model.modelToDocumentOffset(model.getRoot(), range.start.mod).offset;
    range.endDocumentOffset =
        range.end.offset +
        Model.modelToDocumentOffset(model.getRoot(), range.end.mod).offset;
    range.toString = function () {
        return "Range: " + this.start.mod.id + " " + this.start.offset
            + " -> " + this.end.mod.id + " " + this.end.offset
    };
    return range;
};

Editor.prototype.setSelectionAtDocumentOffset = function(off1, off2) {
    var range = makeRange(this,off1,off2);
    range.collapsed = (off1 === off2);
    range.documentOffset = range.start.offset +
        Model.modelToDocumentOffset(this.getModel().getRoot(),
            range.start.mod).offset;
    range.endDocumentOffset = range.end.offset +
        Model.modelToDocumentOffset(this.getModel().getRoot(),
            range.end.mod).offset;
    range.toString = function () {
        return "Range: " + this.start.mod.id + " " + this.start.offset
            + " -> " + this.end.mod.id + " " + this.end.offset
            + " doc: " + this.documentOffset + " -> " + this.endDocumentOffset
    };
    if(typeof window !== 'undefined') {
        var rng = document.createRange();
        rng.setStart(range.start.dom, range.start.offset);
        rng.setEnd(range.end.dom, range.end.offset);
        var selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(rng);
    } else {
        this._fake_range = range;
    }
};

Editor.prototype.setCursorAtDocumentOffset = function(off, bias) {
    if(off < 0) off = 0;
    var nmod = Model.documentOffsetToModel(this.getModel().getRoot(),off,bias);
    if(this._fake_range && this._fake_range != null) {
        this._fake_range.start.mod = nmod.node;
        this._fake_range.start.offset = nmod.offset;
        this._fake_range.end.mod = nmod.node;
        this._fake_range.end.offset = nmod.offset;
        return;
    }
    if(nmod.found === false) {
        if(bias == Model.RIGHT_BIAS && nmod.lastText != null) {
            Dom.setCursorAtModel(nmod.lastText, nmod.offset, this.getDomRoot());
            return;
        }
    }
    Dom.setCursorAtModel(nmod.node, nmod.offset, this.getDomRoot());
};


function makeRange(editor,off1,off2) {
    var s = findDomTextAtOffset(editor.getDomRoot(),off1);
    if(s[0] == false) {
        console.log('WARNING. COULDNT FIND text at offset',off2);
        var start = {
            dom: s[3],
            mod: Dom.findModelForDom(editor.getModel(), s[3]),
            offset: s[3].nodeValue.length
        };

    }else {
        var start = {
            dom: s[1],
            mod: Dom.findModelForDom(editor.getModel(), s[1]),
            offset: s[2]
        };
    }

    var e = findDomTextAtOffset(editor.getDomRoot(),off2);
    if(e[0] == false) {
        console.log('WARNING. COULDNT FIND text at offset',off2);
        var end = {
            dom: e[3],
            mod: Dom.findModelForDom(editor.getModel(),e[3]),
            offset:e[3].nodeValue.length
        }
    } else {
        var end = {
            dom: e[1],
            mod: Dom.findModelForDom(editor.getModel(),e[1]),
            offset:e[2]
        }
    }

    return { start: start, end: end }
}

function findDomTextAtOffset(node, off) {
    if(node.nodeType == Dom.Node.ELEMENT_NODE) {
        var lastText = null;
        for(var i=0; i<node.childNodes.length; i++) {
            var ret = findDomTextAtOffset(node.childNodes[i],off);
            if(ret[0] === true) return ret;
            lastText = ret[3];
            off = ret[2];
        }
        return [false, null, off, lastText];
    }
    if(node.nodeType == Dom.Node.TEXT_NODE) {
        if(node.nodeValue.length > off) {
            return [true,  node, off, node];
        } else {
            return [false, node, off-node.nodeValue.length, node];
        }
    }
}

exports.makeEditor = function(domRoot) {  return new Editor(domRoot);  };

exports.makeModel = function() { return Model.makeModel(); };
