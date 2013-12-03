(function(window, undefined) {
   
   function _slice(obj) {
      if(!this instanceof Object) return this
      obj = obj || null
      var r, con = this.constructor
      switch(con) {
         case RegExp:
            r = new con(this.source, "g".substr(0, Number(this.global)) + "i".substr(0, Number(this.ignoreCase)) + "m".substr(0, Number(this.multiline)))
         break
         case Date:
            r = new con(this.getTime())
         break
         default:
            r = new con()
         break
      }
      
      for(var p in this) {
         r[p] = _slice.call(this[p])
      }
      
      if(null !== obj) {
         obj.constructor.call(r)
         for(p in obj) {
            r[p] = _slice.call(obj[p])
         }
      }
      
      return r
   }
   
   Object.defineProperty(Object.prototype, 'slice', {
      value: _slice,
      configurable: false,
      writable: false,
      enumerable: false
   })
   
})(window)