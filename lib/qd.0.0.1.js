/*! qd.0.0.1.js
    provides shorthand aliases for frequently used document methods and some other stuff
    © 2013 max ɐʇ pixelf3hler ḍợṭ de
    The MIT License
    see license.txt
*/
(function(window, document, undefined) {
   function Qd(srcdoc) { 
      return this.__build(srcdoc)
   }
   Qd.prototype = {
      get oc() {
         return this._oc
      },
      _oc: null,
      // selection
      head: function _head() { 
         if(arguments && arguments.length) {
            if(/element|documentfragment/i.test(this.trueType(arguments[0]))) {
               this._oc.getElementsByTagName("head")[0].appendChild(arguments[0])
            }
         }
         return this._oc.getElementsByTagName("head")[0]
      },
      body: function _body() { 
         if(arguments && arguments.length) {
            if(/element|documentfragment/i.test(this.trueType(arguments[0]))) {
               this._oc.getElementsByTagName("body")[0].appendChild(arguments[0])
            }
         }
         return this._oc.getElementsByTagName("body")[0]
      },
      $id: function get_byid(id) { return !id ? this.body() : this._oc.getElementById(id); },
      $tn: function get_bytagname(tagName,index) { return isNaN(index) ? this._oc.getElementsByTagName(tagName) : this._oc.getElementsByTagName(tagName)[index]; },
      $cn: function get_byclassname(className,index) { return isNaN(index) ? this._oc.getElementsByClassName(className) : this._oc.getElementsByClassName(className)[index]; },
      qs_fake: function(selector) { 
         if(!selector) return this.body()
         var 
         token = selector.charAt(0),
         selectorName = /^[\w\.\#][^\[\:\s]*[\[\:\s]??/m.exec(selector.substring(1))
         
         switch(token) {
            case ".":
               return this.$cn(selectorName, 0)
            case "#":
               return this.$id(selectorName)
            default:
               return this.$tn(selector, 0)
         }
      },
      qs_real: function(selector) { return this._oc.querySelector(selector) },
      qsa_fake: function(selector) {
         if(!selector) return this.body()
         var 
         token = selector.charAt(0),
         selectorName = /^[\w\.\#][^\[\:\s]*[\[\:\s]??/m.exec(selector.substring(1))
         
         switch(token) {
            case ".":
               return this.$cn(selectorName) // /-?[_a-z]+[_a-z0-9-]*/
            case "#":
               return this.$id(selectorName)
            default:
               return this.$tn(selector)
         }
      },
      qsa_real: function(selector) { return this._oc.querySelectorAll(selector) },
      // create
      crel: function create_element(tagName) { 
         if(!arguments || !arguments.length) return this._oc.createElement("div")
         
         switch(arguments.length) {
            case 1:
               return this._oc.createElement(tagName)
            case 2:
               return isNaN(arguments[1]) ? this._oc.createElementNS(arguments[1], tagName) : this.nOf(parseInt(arguments[1]), tagName)
         }
         
      },
      nOf: function(quantity, tagName) {
         if(!tagName) tagName = "div"
         if(!quantity) return this._oc.createElement(tagName)
         var 
         el = this._oc.createElement(tagName),
         r = [el], i = 1
         for(; i<quantity; i++) {
            r[i] = el.cloneNode()
         }
         return r
      },
      crat: function create_attribute(attrName) { return (1 === arguments.length) ? this._oc.createAttribute(attrName) : this._oc.createAttributeNS(arguments[1], attrName) },
      // usage d.cr("Event", ["event", "change"]); d.cr("DocumentFragment")
      cr: function create(objType) {
         /*
            document, doctype, document fragment, comment, cdata, textnode, processinginstruction, event,
            node iterator, treewalker, range
         */
         var methName = "create" + this._capitalize(objType)
         if(methName in this._oc) {
            try {
               return (1 < arguments.length) ? this._oc[methName].apply(this._oc, Array.prototype.slice.call(arguments, 1)) : this._oc[methName]()
            }catch(ex) {
               this.log(ex)
            } /* check on document.implementation */
         }else if(methName in this._oc.implementation) {
            try {
               return (1 < arguments.length) ? this._oc.implementation[methName].apply(this._oc.implementation, Array.prototype.slice.call(arguments, 1)) : this._oc.implementation[methName]()
            }catch(ex) {
               this.log(ex)
            }
         }
      },
      text: function(str) {
         return this._oc.createTextNode(str)
      },
      srlze: function() {
         var 
         obj = (arguments && arguments.length) ? arguments[0] : this._oc,
         type = this.trueType(obj)
         
         return (true === /array|object/i.test(type)) ? JSON.stringify(obj) : new XMLSerializer().serializeToString(obj)
      },
      print: function(obj) {
         var r = ("string" === this.trueType(obj)) ? obj : this.srlze(obj)
         return String(r).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/[\n\r]/g, '<br>')//.replace(/ /g, '&nbsp;');
      },
      /* iterate / enumerate */
      iter: function _iter(list, callback) {
         var el, i = 0, 
         n = list.length
         for(; i<n; i++) {
            el = list[i]
            callback.call(el, i, list[i], list)
         }
      },
      enum: function _enum(obj, callback) {
         for(var p in obj) {
            callback.call(obj, p, obj[p])
         }
      },
      /* helper functions */
      log: function(obj) {
         return window.console && window.console.log && window.console.log(obj)
      },
      rand: function() {
         
         switch(arguments.length) {
            case 1:
               return !isNaN(arguments[0]) ? Math.random() * arguments[0] : Math.random()
            case 2:
               return (!isNaN(arguments[0]) && !isNaN(arguments[1])) ? Math.random() * arguments[0] + arguments[1] : Math.random()
            default:
               return Math.random()
         }
         
      },
      _ieVersion: Number.NaN,
      ieVersion: function() {
         if(isNaN(this._ieVersion)) {
            var v = 3, div = document.createElement('div')
            while (
               div.innerHTML = '<!--[if gt IE '+(++v)+']><i></i><![endif]-->',
               div.getElementsByTagName('i')[0]
               )

            this._ieVersion = v > 4 ? v : Number.NaN
         }
         return this._ieVersion
      },
      trueType: function(obj) {
         var tmp = /\w+(?=\])/i.exec(Object.prototype.toString.call(obj))
         return (tmp && tmp.length) ? tmp[0].toLowerCase() : ""
      },
      _capitalize: function(str) {
         return str.charAt(0).toUpperCase() + str.substring(1)
      },
      /* actual `constructor` */
      __build: function(srcdoc) {
         this._oc = srcdoc
         this.$q = !srcdoc.querySelector ? Qd.prototype.qs_fake : Qd.prototype.qs_real
         this.$qa = !srcdoc.querySelectorAll ? Qd.prototype.qsa_fake : Qd.prototype.qsa_real
         return this;
      }
   }
   
   window.qD = new Qd(document)
   
})(window, window.document)