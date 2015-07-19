/**
 * Created by josh on 7/18/15.
 */
var model;
var editor;


exports.populateKeyDocs = function(elem) {
    for(var stroke in key_to_actions) {
        var li = document.createElement("tr");
        li.innerHTML = "<tr><td>"+stroke+"</td><td>" + key_to_actions[stroke]+"</td>";
        elem.appendChild(li);
    }
};

function styleSelectionInline(style) {
    var sel = window.getSelection();
    var range = sel.getRangeAt(0);
    if(range.collapsed) {
        console.log("just change the state");
        return;
    }
    var info = dom.saveSelection(model);
    var parts = doc.splitThree(
        info.startpos.node,
        info.startpos.offset,
        info.endpos.offset,model)
    doc.wrapTextInInlineStyle(parts[1],style,model);
    dom.syncDom(editor,model);
    dom.setSelectionFromPosition(info.startpos);
}

exports.styleSelectionInline = styleSelectionInline;

function changeBlockStyle(style) {
    var sel = window.getSelection();
    var range = sel.getRangeAt(0);
    var block = dom.findParentBlockDom(range.commonAncestorContainer);
    var mod_b = doc.findModelForDom(model.getRoot(),block);
    mod_b.style = style;
    var info = dom.saveSelection(model);
    dom.syncDom(editor,model);
    dom.setSelectionFromPosition(info.startpos);
}

exports.changeBlockStyle = changeBlockStyle;

function splitBlock() {
    var pos = dom.saveSelection(model).startpos;
    return doc.splitBlockAt(pos.node,pos.offset,model);
}

function insertStringAt(node, index, str) {
    if(node.type != doc.TEXT) throw new Error("this isn't a text node");
    node.text = node.text.substring(0,index) + str + node.text.substring(index);
}

exports.insertStringAt = insertStringAt;

var browser_keymap = {
    8:"backspace",
    13:"enter",
    37:"arrow-left",
    39:"arrow-right",
    38:"arrow-up",
    40:"arrow-down",
    65:"a",
    66:"b",
    67:"c",
    68:"d",
    69:"e",
    73:"i"
};

var key_to_actions = {
    "arrow-left": "update-current-style",
    "arrow-right": "update-current-style",
    "arrow-up": "update-current-style",
    "arrow-down": "update-current-style",
    "ctrl-d":"delete-forward",
    "cmd-b":"style-bold",
    "backspace":"delete-backward",
    "cmd-i":"style-italic",
    "cmd-shift-c":"style-inline-code",
    "cmd-shift-a":"style-inline-link",
    "cmd-shift-e":"insert-emoji"
};

function stopKeyboardEvent(e) {
    if(e instanceof KeyboardEvent) {
        e.preventDefault();
        e.stopPropagation();
    }
}

exports.UPDATE_CURRENT_STYLE = 'update-current-style';

function updateCurrentStyle() {
    setTimeout(function() {
        var info = dom.saveSelection(model);
        var node = info.startpos.node;
        var styleInfo = {
            type:node.type,
            id:node.id,
            node:node,
            offset:info.startpos.offset,
            spanStyles:[],
            blockStyles:[]
        };
        while(true) {
            node = node.getParent();
            if(node.getParent() == null) break;
            if(node.type == 'span') {
                styleInfo.spanStyles.push(node.style);
            }
            if(node.type == 'block') {
                styleInfo.blockStyles.push(node.style);
            }
        }
        fireEvent(exports.UPDATE_CURRENT_STYLE,styleInfo);
    },10);
}

var actions_map = {
    "style-bold": function(e) {
        stopKeyboardEvent(e);
        styleSelectionInline(model.getStyles().inline.bold);
    },
    "style-italic": function(e) {
        stopKeyboardEvent(e);
        styleSelectionInline(model.getStyles().inline.italic);
    },
    "delete-backward":function(e) {
        stopKeyboardEvent(e);
        var info = dom.saveSelection(model);
        //delete a selection
        if(info.collapsed === false) {
            model.deleteText(info.startpos.node,info.startpos.offset,
                info.endpos.node,info.endpos.offset);
            dom.syncDom(editor,model);
            dom.setSelectionFromPosition(info.startpos);
            return;
        }

        //delete a single char
        var mod = info.startpos.node;
        //handle browser bug when block is directly selected
        if(mod.type == doc.BLOCK) {
            if(!mod.isEmpty() && mod.child(0).type == doc.TEXT) {
                mod = mod.child(0);
            }
        }
        var pos = model.deleteTextBackwards(mod,info.startOffset);
        dom.syncDom(editor,model);
        dom.setSelectionFromPosition(dom.textNodeToSelectionPosition(pos.node,pos.offset));
    },
    "delete-forward":function(e) {
        stopKeyboardEvent(e);
        var info = dom.saveSelection(model);
        model.deleteTextForwards(info.startpos.node,info.startpos.offset);
        dom.syncDom(editor,model);
        dom.setSelectionFromPosition(info.startpos);
    },
    "style-inline-code":function(e){
        stopKeyboardEvent(e);
        styleSelectionInline(model.getStyles().inline['inline-code']);
    },
    "style-inline-link":function(e) {
        stopKeyboardEvent(e);
        var info = dom.saveSelection(model);
        var style = model.getStyles().inline.link;

        if(info.startpos.node != info.endpos.node) {
            console.log("can't link across blocks");
            return;
        }
        var parts = doc.splitThree(
            info.startpos.node,
            info.startpos.offset,
            info.endpos.offset,
            model);
        var span = doc.wrapTextInInlineStyle(parts[1],style,model);
        span.meta = {};
        span.meta.elementName = "A";

        $('#link-modal-text').val(parts[1].text);
        $('#link-modal').modal('show');
        $("#link-modal-submit").click(function(e) {
            $(this).unbind(e);
            $('#link-modal').modal('hide');
            var text = $('#link-modal-text').val();
            var url  = $('#link-modal-url').val();
            span.meta.href = url;
            dom.syncDom(editor,model);
        });
    },
    "insert-emoji": function(e) {
        stopKeyboardEvent(e);
        saved_info = dom.saveSelection(model);
        var xy = dom.getCaretClientPosition();
        $("#popup").removeClass("hidden");
        $("#popup").offset({left:xy.x,top:xy.y});
    }
};

actions_map[exports.UPDATE_CURRENT_STYLE] = updateCurrentStyle;

    exports.actions_map = actions_map;

exports.handleEvent = function(e) {
    if(e.keyCode == 13) { //enter key
        stopKeyboardEvent(e);
        var info = dom.saveSelection(model);
        var block = dom.findBlockParent(info.startpos.node);
        if(block.style == 'block-code') {
            insertStringAt(info.startpos.node,info.startpos.offset,"\n");
            dom.syncDom(editor,model);
            info.startpos.offset++;
            dom.setSelectionFromPosition(info.startpos);
        } else {
            var parts = splitBlock();
            dom.syncDom(editor,model);
            var block2 = dom.findBlockParent(parts[1]);
            dom.setSelectionFromPosition({
                id:block2.id,
                path:[0],
                offset:0,
            });
        }
        return true;
    }

    if(browser_keymap[e.keyCode]) {
        var keyname = browser_keymap[e.keyCode];
        if(e.metaKey && e.shiftKey) {
            var name = "cmd-shift-"+keyname;
            if(key_to_actions[name]) {
                var action = key_to_actions[name];
                if(actions_map[action]) {
                    actions_map[action](e);
                    return true;
                }
            }
        }
        if(e.metaKey) {
            var name = "cmd-"+keyname;
            if(key_to_actions[name]) {
                var action = key_to_actions[name];
                if(actions_map[action]) {
                    actions_map[action](e);
                    return true;
                }
            }
        }
        if(e.ctrlKey) {
            var name = "ctrl-"+keyname;
            if(key_to_actions[name]) {
                var action = key_to_actions[name];
                if(actions_map[action]) {
                    actions_map[action](e);
                    return true;
                }
            }
        }
        var name = ""+keyname;
        if(key_to_actions[name]) {
            var action = key_to_actions[name];
            if(actions_map[action]) {
                actions_map[action](e);
                return true;
            }
        }
    }
    return false;
};

exports.handleBrowserInputEvent = function(e) {
    console.log("INPUT EVENT");
    var sel = dom.saveSelection(model);
    var changes = dom.scanForChanges(editor,model.getRoot());
    dom.applyChanges(editor,model,changes);
    dom.syncDom(editor,model);
    dom.setSelectionFromPosition(sel.startpos);
};


exports.setModel = function(mod) {
    model = mod;
};

exports.setEditor = function(ed) {
    editor = ed;
};


var listeners = {};
exports.on = function(type, listener) {
    if(!listeners[type]) listeners[type] = [];
    listeners[type].push(listener);
};

function fireEvent(type, data) {
    listeners[type].forEach(function(l){
        l(data);
    });
}