/**
 * Created by josh on 8/1/15.
 */
var Dom   = require('../src/dom');

var VirtualDoc = {
    _ids:{},
    idChanged: function(old_id, new_id, node) {
        delete this._ids[old_id];
        this._ids[new_id] = node;
    },
    getElementById: function(id) {
        return this._ids[id];
    },
    createElement:function(name) {
        return {
            ownerDocument:this,
            nodeName: name,
            nodeType:Dom.Node.ELEMENT_NODE,
            childNodes:[],
            atts:{},
            child: function(i) {
                return this.childNodes[i];
            },
            appendChild: function(ch) {
                this.childNodes.push(ch);
                ch.parentNode = this;
            },
            insertBefore: function(newNode, referenceNode) {
                var n = this.childNodes.indexOf(referenceNode);
                this.childNodes.splice(n,0,newNode);
                newNode.parentNode = this;
            },
            insertAfter: function(newNode, referenceNode) {
                var n = this.childNodes.indexOf(referenceNode);
                this.childNodes.splice(n+1,0,newNode);
                newNode.parentNode = this;
            },
            classList:{
                _list:{},
                add:function(ch) {
                    this._list[ch] = ch;
                },
                contains: function(cn) {
                    return this._list[cn];
                },
                toString: function() {
                    var str = "";
                    for(var n in this._list) {
                        str += "."+this._list[n];
                    }
                    return str;
                }
            },
            get className() {
                var coll = [];
                for(var n in this.classList._list) {
                    coll.push(this.classList._list[n]);
                }
                return coll.join(" ");
            },
            _id:"",
            get id() {
                return this._id;
            },
            set id(txt) {
                var old = this._id;
                this._id = txt;
                this.ownerDocument.idChanged(old,this._id,this);
            },
            get firstChild() {
                if(this.childNodes.length >= 1) return this.childNodes[0];
                return null;
            },
            removeChild: function(ch) {
                var n = this.childNodes.indexOf(ch);
                this.childNodes.splice(n,1);
                return ch;
            },
            setAttribute: function(name,value) {
                this.atts[name] = value;
            },
            getAttribute: function(name) {
                return this.atts[name];
            }
        }
    },
    createTextNode: function(txt) {
        return {
            _nodeValue:txt,
            ownerDocument:this,
            get nodeValue() {
                return this._nodeValue;
            },
            set nodeValue(txt) {
                this._nodeValue = txt;
            },
            get id() {
                return this._id;
            },
            set id(txt) {
                var old = this._id;
                this._id = txt;
                this.ownerDocument.idChanged(old,this._id,this);
            },
            nodeType:Dom.Node.TEXT_NODE
        }
    },
    createRange: function() {
        return {
            setStart: function(dom,offset) {

            }
        }
    }
};

module.exports = VirtualDoc;