#semantic editor

Semantic Editor (SE) is an HTML editor built on `contentEditable` designed expressly
for reliable editing of semantic markup. It is highly customizable but not yet easy
 to use. SE differs from similar editors in that:

* SE is purely semantic. The user edits a document in terms of body, header, blockquotes, etc. Later the document
 can be rendered as whatever non-semantic markup is desired.
* SE keeps an internal semantic  model as the authoritative document. The browser's DOM is 
  used for rendering only (with a few exceptions), not storing the document data.
* SE does not replace or manipulate the browser input system. This ensures native context menus and input editors
  continue to work. For example, on Mac if you press and hold the E key the OS will render a popup menu
  with accented forms of E.  This will continue to work properly in SE, as will pasting content and
  other native input methods (Japanese, Chinese, etc.)
* SE is highly customizable. You can create your own keybindings, insert custom actions, add or remove supported
semantic styles. You can modify the rendering and import/export filters. (see examples) 
* SE does not provide a GUI. It does not have dropdowns or a toolbar, allowing you to implement your own
 with whatever GUI library you prefer (ReactJS, JQuery, Bootstrap, etc.) It modifies only the actual editor div.
 (see examples)


# Screenshot

![screenshot](docs/screenshot1.png?raw=true)


# Using Semantic Editor


Create a DIV in your document then make a new editor attached to it like this:

``` html
<div id="myeditor" class="semantic-view" contenteditable="true" spellcheck="false"></div>
<script>
var editor = Editor.makeEditor(document.getElementById('myeditor'));
</script>
```

Create a simple document

``` javascript
var model = editor.getModel();
var block1 = model.makeBlock();
var text1  = model.makeText("abc");
block1.append(text1);
model.getRoot().append(block1);
editor.syncDom();
```


Default styling is done with the `semantic.css` file.
 
 
# Add a New Action and Key Binding
 
Add a new action with `editor.addAction(name, function)`. ex:

``` javascript
editor.addAction('print-as-plain',function(nativeEvent, editor) {
   console.log(editor.getModel().toPlainText());
});
```
 
Add a key binding with `editor.addKeyBinding(name, keystroke)`. ex:

``` javascript
editor.addKeyBinding('print-as-plain', 'cmd-shift-p');
```


Set a new model with `editor.setModel()` then update the view with `editor.syncDom()`. 
Retrieve the model with `editor.getModel()`. ex:

``` javascript
var mod = editor.makeModel();
var blk1 = mod.makeBlock();
blk1.style = 'header';
blk1.append(mod.makeText('this is my header');
mod.append(blk1);
 
editor.setModel(mod);
editor.syncDom();
console.log('the model as JSON is ', editor.getModel().toJSON());
```

# Add a Custom Style

What is the point of a semantic editor if you can't define your own semantics?! :) Suppose you want
to write a document with inline glossary definitions.  You can define this new style by adding
an entry to the editor's semantic mapping. 

The following creates a new `glossary` style. 

``` javascript
var mapping = editor.getMapping();
mapping.glossary = {
    type:'span',
    element:'span',
    attributes: [
        { metaName:'definition', attrName:'data-def'}
    ]
};
```

The `type` determines what kind of style this is. The only valid values are `span` and `block`.
 
The `element` determines what HTML element will be used to render the glossary term on screen. This
will usually be `div` or `span` but you can chose another if you want.

The `attributes` is a list of attributes that should be mirrored between the `meta` object in the model
and the DOM.  In this case, we create a new glossary definition in the text with:

``` javascript
var span = editor.getModel().createSpan();
span.append(editor.getModel().createText("PDX"));
span.setStyle('glossary');
span.meta.definition = 'The Portland International Airport';
```

On screen this node's `definition` property will be will be rendered to the DOM in the `data-def` attribute: 

``` html
<span data-def="The Portland International Airport">PDX</span>
```

You can then add custom CSS to your page for a popup like this. The CSS creates
an extra hidden element which appears only when the mouse cursor is over the glossary
span.  The content comes from the `data-def` attribute of the span.

``` css
.semantic-view .glossary:after {
    background-color: #d6fad2;
    border-radius: 1em;
    content:attr(data-def);
    position: absolute;
    bottom: 2em;
    border: 1px solid green;
    min-width: 20em;
    text-align: left;
    left: -8em;
    display: none;
}

.semantic-view .glossary:hover:after {
    display: block;
}
```






# Import and Export

Semantic Editor does not have it's own document export other than
JSON (`editor.toJSON()` and `editor.fromJSON()`) or plain
text (`editor.toPlainText()`). 
The model is a tree structure made of block, span, and text nodes. You can easily
export whatever you want by traversing the tree. See the examples.



# Events

Listen for when the document is changed with the 'change' event.

```
editor.on('change', function() {
    console.log('the document was modified');
});
```


# Selection

The selection is stored on the browser side. You can set it with:
`editor.setSelectionAtDocumentOffset(off1,off2)` where `off1` and
`off2` are characters of text from the start of the document, irrespective of
blocks and spans.

You can get the current selection with `getSelectionRange()` which returns
a Range object. This object contains the start and ending dom and model nodes, as well
as the offsets within those model nodes. ex:

```
var range = editor.getSelectionRange();
console.log('selection starts at model node',
    range.start.mod,
    'with an character offset of',
    range.start.offset,
    'to',
    range.end.mod,
    'offset:',
    range.end.offset,
    );
console.log("the dom nodes are ", range.start.dom, range.end.dom);
```

You will mainly only use the selection when making new actions.



# Examples

*Insert the poop emoji when you press command shift P*
 
This looks more complicated than it is,
so let's walk through it together.

```
editor.addAction('insert-poop', function(e,editor) {
    Keystrokes.stopKeyboardEvent(e);
    var range = editor.getSelectionRange();
    var oldBlock = range.start.mod.findBlockParent();
    var node = range.start.mod;
    var offset  = range.start.offset;
```
First, get the selection range to find the text node at the cursor (`range.start.mod`),
then get the parent block with `findBlockParent()`. This is required because SE performs
all document changes at the block level, not individual spans.


``` javascript   
    var punycode = require('punycode');
    //from http://www.fileformat.info/info/unicode/char/1F4A9/index.htm
    var char = punycode.ucs2.encode([0x0001F4A9]); // '\uD834\uDF06'
```

The poop emoji is part of the extended unicode character set which Javascript does not
support natively. Instead we have to use the `punycode` library to encode the raw
hex value into an array of bytes with the correct surrogate pairs. 
See [this](https://nodejs.org/api/punycode.html) for an explanation.
    
```
    var txt = node.text.substring(0,offset) + char + node.text.substring(offset);
    var newBlock = Keystrokes.copyWithEdit(oldBlock,node,txt);
```

Now create the new text string from the old one with the unicode character inserted in
the middle.  The function `Keystrokes.copyWithEdit(oldBlock,node,txt)` 
will copy the block into a new one, replacing the text of `node` with the new `txt`.

```
    var change = Keystrokes.makeReplaceBlockChange(oldBlock.getParent(),oldBlock.getIndex(),newBlock);
    editor.applyChange(change);
    editor.setCursorAtDocumentOffset(range.documentOffset+1);
});
```

Finally, create a new document change to swap the old block for the new one, and apply it.
Then move the cursor by one character to be right after the newly inserted character.

```
editor.addKeyBinding('insert-poop','cmd-shift-p');
```

Add a key binding for our new action. 


Also make sure you add the correct encoding to the top of your HTML file:

```
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
```

# Installation

Install as an NPM 

```
npm install semantic-editor-js
```

then include `'semantic-editor-js/src/editor` it in your webpage with your preferred packaging
mechanism that supports 'require'. I use Browserify.


# Roadmap

As with any open source project, it's tough predicting what will be popular, but here are a
few things I _know_ need to be done:

* turn image support into a general inline-block type to be customized
* improve support for large pastes of HTML content
* examples of inline auto-completion. ex: @twitter handles, amazon queries, expression syntax.
* reduce unnecessary DOM regeneration
* setting the same text to bold twice should un-bold it
* test more desktop browsers
* mobile browser support

--------------

# notes

Description of the data structure and operations

Since content-editable is so unreliable, we use a separate
data model which is then synced to the DOM.  Whenever the model changes
the DOM is fully regenerated from it (with a few exceptions).
Changing styles, splitting paragraphs, and deleting selections is all done this way.
For simple typing of characters we let
the DOM side handle it, then do a reverse sync. This reverse sync figures out
what has changed between the DOM and model, producing a series of changes. Then
these changes are applied to the model and the DOM is re-rendered from the model.
This list of changes is also used for the undo/redo stack.

This system means the model is authoritative. We may not be able to handle
every possible change that content editable supports in the DOM, but the model
will always be in a known valid state. This ensures reliability above all else.

# old notes. no longer accurate.

To modify the document you must use the following operations:

updateFormat(  startNode:Node, startOffset:Number, endNode:Node, endOffset:Number, style:String)

This will update the part of the selected node to the new style. If the length
of text to be changed is longer than the node, then it will continue into adjacent
nodes.  If the style is a block style then it will replace the existing style of
the current block instead of adding to it.  If updating the style requires splitting
parts of the node out into new nodes, then it will do it.

```
insertText(node:Node, offset:Number, string:String)
```

inserts the string at the offset in the node.  Generally this does not require creating
new nodes.  The new text will inherit the current style since it is part of the same node.

```
deleteText(startNode:Node, startOffset:Number, endNode:Node, endOffset:Number)
```
removes the requested number of characters at the offset in the node. If this spills to adjacent
nodes then other nodes will be adjusted or deleted as needed.
startOffset is the first character to be deleted. it is an inclusive index.
end offset is the first cahracter that won't be deleted. it is an exclusive index.
endOffset-startOffset (if in the same node) will be the number of characters deleted 


created nodes from scratch is generally done only when loading a document from disk. This is done
with the make() and append() functions. the following example will create a new document

```
var model = doc.makeModel();
var block = model.makeBlock();
model.getRoot().append(block);
block.append(model.makeText("This is some));
var span = model.makeSpan();
span.append(model.makeText("bold"));
span.addStyle('bold');
block.append(span);
block.append(model.makeText("text."));
```

note that the root element is special. it always exists and cannot be changed or deleted. You will always 
add blocks to the root, not change the root itself.

nodes are tracked using automatically generated unique IDs.

to find a node by id, call

```
model.findById(id:String)
```

To implement a command like bold the current selection, call:

var sel = dom.getSelection();
if(!sel.collapsed) {
    model.updateFormat(sel.startNode, sel.startOffset, sel.endNode, sel.endOffset, 'bold');
}

The model knows nothing about the DOM. To work with the dom use the Editor class to build your model.
This will attach the proper listeners to handle all of the syncing work. ex:

var editor = Editor.makeEditor(document.getElementById("myeditor"));
var model = editor.getModel();
var block = model.makeBlock();
... etc

### unit tests

to ensure model correctness we need tons of unit tests.

make block
make span
append span to block
append text, span, text to block
split block->text  in two and style the second half
split block->text  in three and style the middle part
delete across blocks
insert text in the middle of a span
insert text at the end of a span
change teh style of a block
change the style of a span
change the style of a span and the text next to it, to a different style
change the style of a span and the text next to it to the same style


