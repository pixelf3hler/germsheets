/** 
 *  @file adds required core methods if neccessary
 *  @version 1.0.2
 *  @copyright © 2013 max ɐʇ pixelf3hler · de
 *  @author <max@pixelf3hler.de>
 *  @license license.txt
 *  The MIT License
 */
(function(window, undefined) {
   
   if(!Array.isArray) {
      Array.isArray = function(obj) {
         return ("[object Array]" === Object.prototype.toString.call(obj))
      }
   }
   
   // partial implementation
   if(!Object.defineProperty || !(function(){ try{ Object.defineProperty({}, "x", {}); return true; }catch(err) { return false; } })()) { 
      var orig = Object.defineProperty
      Object.defineProperty = function(obj, key, descriptor) {
         if(orig) {
            try {
               return orig(obj, key, descriptor)
            }catch(err) {
               // ignore
            }
         }
         
         if(obj !== Object(obj)) throw new TypeError("Object.defineProperty called on a non-object")
         if(Object.prototype.__defineGetter__ && "get" in descriptor) {
            Object.prototype._defineGetter__.call(obj, key, descriptor.get)
         }
         if(Object.prototype.__defineSetter__ && "set" in descriptor) {
            Object.prototype.__defineSetter__.call(obj, key, descriptor.set)
         }
         if("value" in descriptor) {
            if("get" in descriptor || "set" in descriptor) {
               throw new TypeError("attempt to use an accessor property descriptor as data property descriptor")
            }
            obj[key] = descriptor.value
         }
         return obj
      }
   }
   
   if(!Array.prototype.forEach) {
      Object.defineProperty(Array.prototype, "forEach", {
         value: function(callback) {
            var i = 0, n = this.length
            for(; i < n; i++) {
               callback(this[i], i, this)
            }
         },
         configurable: false,
         enumerable: false,
         writable: true
      })
   }
   
   if(!Element.prototype.remove) {
      Object.defineProperty(Element.prototype, "remove", {
         value: function() {
            this.parentNode && this.parentNode.removeChild(this)
            return this
         },
         configurable: false,
         enumerable: false,
         writable: true
      })
   }
   
   if(!String.prototype.repeat) {
      Object.defineProperty(String.prototype, "repeat", {
         value: function (n) {
            var s = "", t = this + s
            while (--n >= 0) {
               s += t
            }
            return s
         },
         configurable: false,
         enumerable: false,
         writable: true
      })
   }
   
})(window)