/** 
 *  @file germSheets Object.prototype extensions
 *  @version 1.0.1
 *  @copyright © 2013 max ɐʇ pixelf3hler · de
 *  @author Max Burow <max ɐʇ pixelf3hler · de>
 *  @license license.txt
 *  The MIT License
 */
(function(window, undefined) {
   
   function trueType(obj) {
      var tmp = /\w+(?=\])/i.exec(Object.prototype.toString.call(obj))         
      return (tmp && tmp.length) ? tmp[0].toLowerCase() : "unknown"
   }
   
   /** returns a new object containing the properties of this, plus those of a given object obj
    *  @public
    *  @method
    *  @param {object} obj - optional object to be merged onto the clone
    */
   function _slice(obj) {
      var 
      p, ptype, 
      r = {},
      obj = obj || null
      
      for(p in this) {
         ptype = trueType(this[p])
         
         switch(ptype) {
            case "unknown":
            break
            
            case "array":
            case "string":
            case "object":
               r[p] = this[p].slice()
            break
            
            case "number":
            case "regexp":
            case "date":
            case "function":
            case "boolean":
               r[p] = this[p]
            break
            
            default:
               // could be a node
               if(/^html|(?:element|text)$/.test(ptype)) {
                  r[p] = this[p].cloneNode(true)
                  if("getAttribute" in r[p]) {
                     var rpid = r[p].getAttribute("id")
                     if(rpid === this[p].getAttribute("id")) {
                        r[p].setAttribute("id", rpid + "_copy")
                     }
                  }
               }
            break
         }
      }
      
      if(obj) {
         for(p in obj) {
            ptype = trueType(obj[p])
            
            switch(ptype) {
               case "unknown":
               break
               
               case "array":
               case "string":
               case "object":
                  r[p] = obj[p].slice()
               break
               
               case "number":
               case "regexp":
               case "date":
               case "function":
               case "boolean":
                  r[p] = obj[p]
               break
               
               default:
                  // could be a node
                  if(/^html|(?:element|text)$/.test(ptype)) {
                     r[p] = obj[p].cloneNode(true)
                     // TODO check for duplicate id's 
                     if("getAttribute" in r[p]) {
                        var rpid = r[p].getAttribute("id")
                        if(rpid === obj[p].getAttribute("id")) {
                           r[p].setAttribute("id", rpid + "_copy")
                        }
                     }
                  }
               break
            }
         }
      }
      return r
   }
   
   Object.defineProperty(Object.prototype, 'slice', { value: _slice, writable: false, configurable: false, enumerable: false })
   
})(window)