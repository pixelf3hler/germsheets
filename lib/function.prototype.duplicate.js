(function(window, undefined) {
   
   if(!Function.prototype.duplicate) {
     
      Function.prototype.duplicate = function() {
         var fnArr, 
         fnBody, fn = this.toString()
         
         // extract argument identifiers
         fn.replace(/\([^\)]*\)/i, function(m) {
            fnArr = "()" === m ? [] : m.substring(1, m.length-1).split(/\u0020*,\u0020*/)
            return m
         })
         
         // extract function body
         fnBody = fn.substring(fn.indexOf("{")+1, fn.lastIndexOf("}")).trim()
         
         fnArr.push(fnBody)
         
         return Function.apply(window, fnArr)
      }
      
   }
   
})(window)