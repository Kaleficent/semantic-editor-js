var Dom = require('./dom');
var Model = require('./model');

exports.deleteBackwards = function(e, editor) {
    exports.stopKeyboardEvent(e);
    var model = editor.getModel();
    var range = editor.getSelectionRange();
    if(range.collapsed === true) {
        range.documentOffset--;
        range.start.offset--;
        var abs = range.start.offset + Model.modelToDocumentOffset(model.getRoot(),range.start.mod).offset;
        var nmod = Model.documentOffsetToModel(model.getRoot(),abs);
        if(nmod.offset < 0) nmod.offset = 0;
        range.start.offset = nmod.offset;
        range.start.mod = nmod.node;
        if(range.start.mod == range.end.mod && range.start.offset == range.end.offset) return;
    }

    var chg = makeDeleteTextRangeChange2(range,model);
    editor.applyChange(chg);
    editor.setCursorAtDocumentOffset(range.documentOffset);
};

exports.deleteForwards = function(e, editor) {
    exports.stopKeyboardEvent(e);
    var model = editor.getModel();
    var range = editor.getSelectionRange();
    if(range.collapsed) {
        if(range.end.mod.type !== Model.TEXT) {
            console.log('something weird happened. bailing');
            return;
        }
        range.end.offset++;
        var abs = range.end.offset + Model.modelToDocumentOffset(model.getRoot(),range.end.mod).offset;
        var nmod = Model.documentOffsetToModel(model.getRoot(),abs);
        range.end.offset = nmod.offset;
        range.end.mod = nmod.node;
    }

    var chg = makeDeleteTextRangeChange(range,model);
    editor.applyChange(chg);
    editor.setCursorAtDocumentOffset(range.documentOffset);
};

exports.splitLine = function(e, editor) {
    exports.stopKeyboardEvent(e);
    var model = editor.getModel();
    var range = editor.getSelectionRange();
    var chg = makeSplitBlockChange(range.start);
    editor.applyChange(chg);
    editor.setCursorAtDocumentOffset(range.documentOffset);
};

exports.styleBold = function(e,editor) {
    exports.styleSelection(e,editor,'strong');
};

exports.styleItalic = function(e,editor) {
    exports.styleSelection(e,editor,'emphasis');
};

exports.styleInlineCode = function(e,editor) {
    exports.styleSelection(e,editor,'inline-code');
};

exports.styleInlineLink = function(e,editor) {
    exports.stopKeyboardEvent(e);
    console.log("links not implemented");
};

exports.styleSelection = function(e,editor,style) {
    exports.stopKeyboardEvent(e);
    var range = editor.getSelectionRange();
    var chg = makeStyleSelectionChange(range,style);
    editor.applyChange(chg);
    editor.setCursorAtDocumentOffset(range.documentOffset);
};

exports.undo = function(e,editor) {
    exports.stopKeyboardEvent(e);
    editor.undoChange();
};

exports.redo = function(e,editor) {
    exports.stopKeyboardEvent(e);
    editor.redoChange();
};

exports.handleInput = function(e,editor) {
    var dom_root = editor.getDomRoot();
    var model  = editor.getModel();
    var range = editor.getSelectionRange();
    var changeRange = Dom.calculateChangeRange(model,dom_root,range.start);
    if(changeRange.start.mod == changeRange.end.mod && changeRange.start.mod.type == Model.TEXT) {
        var chg = makeBlockReplaceChange(changeRange.start);
        editor.applyChange(chg);
        editor.setCursorAtDocumentOffset(range.documentOffset);
        return;
    }

    console.log('more than typing. must be a paste');
    /*
    var doff = wrange.startOffset + Dom.domToDocumentOffset(dom_root,wrange.startContainer).offset;
    //rebuild the model root and swap it in
    var model2 = Dom.rebuildModelFromDom(dom_root, model, editor.getImportMapping());
    model.getRoot().content = model2.content;
    model.getRoot().content.forEach(function(blk){
        blk.parent = model.getRoot();
    });

    //clean up the model because pasting might have messed up some stuff
    cleanChildren(model.getRoot());
    editor.syncDom();

    //set the cursor back
    var offd = Dom.documentOffsetToDom(dom_root,doff);
    Dom.setCursorAtDom(offd.node, offd.offset);
    editor.markAsChanged();
    */
};

exports.changeBlockStyle = function(style, editor) {
    var model = editor.getModel();
    var range = editor.getSelectionRange();
    var mod_b = range.start.mod.findBlockParent();
    mod_b.style = style;
    var par = mod_b.getParent();
    var dom_root = editor.getDomRoot();
    var dom_b = Dom.findDomForModel(par,dom_root);
    Dom.rebuildDomFromModel(par,dom_b, dom_root, document, editor.getMapping());
    editor.markAsChanged();
    var nmod = Model.documentOffsetToModel(model.getRoot(),range.documentOffset);
    Dom.setCursorAtModel(nmod.node, nmod.offset, dom_root);
};

exports.makeBlockStyleChange = function(range, style) {
    var target_node = range.start.mod;
    var target_block = target_node.findBlockParent();
    var newblock = duplicateBlock(target_block);
    newblock.style = style;
    return makeReplaceBlockChange(target_block.getParent(),target_block.getIndex(),newblock);
};

exports.stopKeyboardEvent = function(e) {
    if(e && e.preventDefault) {
        e.preventDefault();
        e.stopPropagation();
    }
};

exports.findActionByEvent = function(e, browser_keymap, key_to_actions, actions_map) {
    //console.log("keycode = ", e.keyCode);
    if(browser_keymap[e.keyCode]) {
        var keyname = browser_keymap[e.keyCode];
        //console.log("matched the keycode",e.keyCode, keyname)
        if(e.metaKey && e.shiftKey) {
            var name = "cmd-shift-"+keyname;
            //console.log("checking",name);
            //console.log("actions = ", key_to_actions);
            if(key_to_actions[name]) {
                var action = key_to_actions[name];
                if(actions_map[action]) {
                    return actions_map[action];
                }
            }
        }
        if(e.metaKey) {
            var name = "cmd-"+keyname;
            if(key_to_actions[name]) {
                var action = key_to_actions[name];
                if(actions_map[action]) {
                    return actions_map[action];
                }
            }
        }
        if(e.ctrlKey) {
            var name = "ctrl-"+keyname;
            if(key_to_actions[name]) {
                var action = key_to_actions[name];
                if(actions_map[action]) {
                    return actions_map[action];
                }
            }
        }
        var name = ""+keyname;
        if(key_to_actions[name]) {
            var action = key_to_actions[name];
            if(actions_map[action]) {
                return actions_map[action];
            }
        }
    }
    return null;
};

function makeStyleSelectionChange(range,style) {
    if(range.start.mod == range.end.mod) {
        var oldtext = range.start.mod;
        var txt = range.start.mod.text;
        var oldblock = range.start.mod.findBlockParent();
        var newblock = duplicateBlock(oldblock);
        var newtext  = newblock.child(oldtext.getIndex());
        newtext.text = txt.substring(0,range.start.offset);
        var newtext1 = newblock.model.makeText(txt.substring(range.start.offset,range.end.offset));
        var newspan  = newblock.model.makeSpan() ;
        newspan.style = style;
        newspan.append(newtext1);
        newblock.insertAfter(newtext,newspan);
        var newtext2 = newblock.model.makeText(txt.substring(range.end.offset));
        newblock.insertAfter(newspan,newtext2);
        return makeReplaceBlockChange(oldblock.getParent(),oldblock.getIndex(),newblock);
    }

    var changes = [];

    console.log("starting at",range.start.mod.text);
    var model = range.start.mod.model;
    Model.print(model);

    //split in half
    var txt = range.start.mod.text;
    var off = range.start.offset;
    var oldparent = range.start.mod.findBlockParent();
    var newparent = model.makeBlock();
    newparent.append(model.makeText(txt.substring(0,off)));
    var span = model.makeSpan();
    span.style = style;
    span.append(model.makeText(txt.substring(off)));
    newparent.append(span);
    changes.push(makeReplaceBlockChange(oldparent.getParent(),oldparent.getIndex(),newparent));

    //now continue on to new blocks


    var it = model.getIterator(range.start.mod);
    var seen = {};
    while(it.hasNext()) {
        var ch = it.next();
        console.log("looking at ",ch.id);
        if(ch == range.end.mod) {
            console.log("at the end");
            var oldparent = ch.findBlockParent();
            var ch1 = model.makeText(ch.text.substring(0,range.end.offset));
            var ch2 = model.makeText(ch.text.substring(range.end.offset));
            var blk = model.makeBlock();
            blk.append(ch1);
            var span = model.makeSpan();
            span.style = style;
            span.append(ch2);
            blk.append(span);
            Model.print(blk);
            changes.push(makeReplaceBlockChange(oldparent.getParent(),oldparent.getIndex(),blk));
            break;
        }
        if(ch.type == Model.BLOCK) {
            console.log("  block");
            if(seen[ch.id]) {
                console.log("  done with block",ch.id);
                //if we get here, then this block didn't contain the end point, so just style the whole thing
                var blk = duplicateBlock(ch);
                var span = model.makeSpan();
                span.style = style;
                span.appendAll(blk.content);
                blk.clear();
                blk.append(span);
                console.log("new block is");
                Model.print(blk);
                changes.push(makeReplaceBlockChange(ch.getParent(),ch.getIndex(),blk));
            } else {
                seen[ch.id] = ch;
            }
        }
    }
    console.log('change count is',changes.length);
    return makeComboChange(changes[0],makeComboChange(changes[1],changes[2],"style span"));
}
exports.makeStyleSelectionChange = makeStyleSelectionChange;


function makeBlockReplaceChange(req) {
    var oldblock = req.mod.findBlockParent();
    var newblock = duplicateBlock(oldblock);
    var newtext = newblock.child(req.mod.getIndex());
    newtext.text = req.dom.nodeValue;
    return makeReplaceBlockChange(oldblock.getParent(),oldblock.getIndex(),newblock);
}

function makeSplitBlockChange(start) {
    //make two new blocks to replace the old one
    var oldblock = start.mod.findBlockParent();
    var newtexts = start.mod.model.splitBlockAt(start.mod,start.offset);
    var newblock1 = newtexts[0].findBlockParent();
    var newblock2 = newtexts[1].findBlockParent();
    //do a replace and insert
    var replace = makeReplaceBlockChange(oldblock.getParent(),oldblock.getIndex(),newblock1);
    var insert  = makeInsertBlockChange(oldblock.getParent(),oldblock.getIndex()+1,newblock2);
    return makeComboChange(replace,insert,'split block');
}

//this won't work if there is middle text or spans
function makeDeleteTextRangeChange(range,model) {
    var it = model.getIterator(range.start.mod);
    var ch = range.start.mod;
    var changes = [];
    var todelete = {};
    while(it.hasNext()){
        //start and end text
        if(ch == range.start.mod && ch == range.end.mod) {
            var oldblock = range.start.mod.findBlockParent();
            var newblock = duplicateBlock(oldblock);
            var oldtext  = range.start.mod;
            var newtext = newblock.child(oldtext.getIndex());
            newtext.text  = oldtext.text.substring(0,range.start.offset)
                + oldtext.text.substring(range.end.offset);
            return makeReplaceBlockChange(oldblock.getParent(),oldblock.getIndex(),newblock);
        }
        //start text
        if(ch == range.start.mod) {
            var oldblock1 = range.start.mod.findBlockParent();
            var newblock1 = duplicateBlock(oldblock1);
            var oldtext  = range.start.mod;
            var newtext = newblock1.child(oldtext.getIndex());
            newtext.text  = oldtext.text.substring(0,range.start.offset);
            changes.push(makeReplaceBlockChange(oldblock1.getParent(),oldblock1.getIndex(),newblock1));
            ch = it.next();
            continue;
        }
        //end text
        if(ch == range.end.mod) {
            //add the todeletes
            var oldblock2 = ch.findBlockParent();
            for(var id in todelete) {
                if(id !== oldblock2.id && id !== oldblock1.id) {
                    var blk = todelete[id];
                    changes.push(makeDeleteBlockChange(blk.getParent(), blk.getIndex(), blk));
                }
            }


            if(oldblock2 == oldblock1) {
                var newblock2 = newblock1;
            } else {
                var newblock2 = duplicateBlock(oldblock2);
            }
            var oldtext2 = ch;
            var newtext2 = newblock2.child(oldtext2.getIndex());
            newtext2.text = oldtext2.text.substring(range.end.offset);
            if(oldblock2 !== oldblock1) {
                newblock1.append(newtext2);
                var delete2 = makeDeleteBlockChange(oldblock2.getParent(),oldblock2.getIndex(),oldblock2);
                changes.push(delete2);
            }
            var chg = changes.shift();
            while(changes.length > 0) {
                chg = makeComboChange(chg,changes.shift(),'combo');
            }
            return chg;
        }
        //middle text
        if(ch.type == Model.TEXT) {
            var par = ch.findBlockParent();
            todelete[par.id] = par;
            console.log("middle text");
        }
        ch = it.next();
    }

}

exports.makeDeleteTextRangeChange = makeDeleteTextRangeChange;

function makeDeleteTextRangeChange2(range,model) {
    var root = model.getRoot();
    var old_start_block = range.start.mod.findBlockParent();
    var old_start_index = old_start_block.getIndex();
    var old_end_block   = range.end.mod.findBlockParent();
    var old_end_index   = old_end_block.getIndex();

    console.log("going from", old_start_index,'to',old_end_index);
    var insideDelete = false;
    var changes = [];
    var new_start_block;
    for(var i=old_start_index; i<=old_end_index; i++) {
        var blk = root.child(i);
        var res = deleteWithRange(range,blk,insideDelete);
        console.log("res = ", res[0]);
        Model.print(res[1]);
        if(res[0]==true) insideDelete = true;
        if(i == old_start_index) {
            console.log("replacing",blk.id);
            changes.push(makeReplaceBlockChange(root,i,res[1]));
            new_start_block = res[1];
            continue;
        }
        if(res[1] == null) {
            console.log("deleting",blk.id);
            changes.push(makeDeleteBlockChange(root,i,blk));
        }
        if(i == old_end_index) {
            console.log('final. append to start');
            var nblk = res[1];
            nblk.content.forEach(function(ch) {
                new_start_block.append(ch);
            });
            changes.push(makeDeleteBlockChange(root,i,blk));
        }
    }
    console.log("final changes = ", changes);
    var chg = changes.shift();
    while(changes.length > 0) {
        chg = makeComboChange(chg,changes.shift(),'combo');
    }
    return chg;
}

function deleteWithRange(range,node,insideDelete) {
    //console.log("node is",node.id, 'inside delete',insideDelete);
    if(node.id == range.start.mod.id) {
        //console.log("at the start node");
        //node.text = range.start.mod.text.substring(0,range.start.offset);
        var nn = node.model.makeText(range.start.mod.text.substring(0,range.start.offset));
        console.log("new start text is",nn.text);
        return [true,nn];
    }
    if(node.id == range.end.mod.id) {
        //console.log("at the end node");
        var nn = node.model.makeText(range.end.mod.text.substring(range.end.offset));
        console.log("new end text is",nn.text);
        return [false,nn];
    }
    if(node.type == Model.BLOCK) {
        var nnode = node.model.makeBlock();
        nnode.style = node.style;
    }
    if(node.type == Model.TEXT) {
        var nnode = node.model.makeText(node.text);
    }

    var startingDelete = insideDelete;

    if(node.childCount() > 0) {
        var i = 0;
        while(i<node.childCount()) {
            var ch = node.content[i];
            var res = deleteWithRange(range,ch,insideDelete);
            if(res[1] == null) {
                //console.log('no child. dont add it');
            } else {
                //console.log("yo child. add it");
                nnode.append(res[1]);
                if (res[0] === true) {
                    insideDelete = true;
                }
                if(res[0] === false) {
                    insideDelete = false;
                }
            }
            i++;
        }
    }

    //if this is a text node and we are already passed the delete point
    //then delete
    if(nnode.type == Model.BLOCK) {
        if(nnode.childCount() == 0) {
            console.log("this is an empty block");
            return [insideDelete,null];
        } else {
            console.log("this is a full block");
            return [insideDelete,nnode];
        }
    }
    /*
    if(startingDelete) {
        console.log("must delete this node",node.id);
        return [insideDelete,null];
    }
    */

    if(insideDelete) {
        return [insideDelete,null];
    }
    return [insideDelete,nnode];
}

function makeReplaceBlockChange(parent, index, newNode) {
    var oldNode = parent.content[index];
    var del = makeDeleteBlockChange(parent, index, oldNode);
    var ins = makeInsertBlockChange(parent, index, newNode);
    return makeComboChange(del,ins,'replace block ' + newNode.id);
}

function makeInsertBlockChange(parent, index, node) {
    return {
        redoit: function() {
            parent.content.splice(index,0,node);
            node.parent = parent;
        },
        undoit: function() {
            parent.content.splice(index,1);
        }
    }
}
function makeDeleteBlockChange(parent, index, node) {
    return {
        redoit: function() {
            parent.model.findNodeById(node.id).deleteFromParent();
        },
        undoit: function() {
            parent.content.splice(index,0,node);
            node.parent = parent;
        }
    }
}

function duplicateBlock(block) {
    if(block == null) throw new Error('null block. cant duplicate');
    if(block.type == Model.TEXT) {
        var blk = block.model.makeText(block.text);
        return blk;
    }
    if(block.type == Model.SPAN) {
        var blk = block.model.makeSpan();
        blk.style = block.style;
        block.content.forEach(function(ch){
            blk.append(duplicateBlock(ch));
        });
        return blk;
    }
    if(block.type == Model.BLOCK) {
        var blk = block.model.makeBlock();
        blk.style = block.style;
        block.content.forEach(function(ch){
            blk.append(duplicateBlock(ch));
        });
        return blk;
    }
    throw new Error('cant duplicate',block);
}
function makeComboChange(chg1, chg2, name) {
    return {
        redoit: function() {
            chg1.redoit();
            chg2.redoit();
        },
        undoit: function() {
            chg2.undoit();
            chg1.undoit();
        }
    }
}
