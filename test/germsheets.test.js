(function(window, document, germSheets, undefined) {
   
   germSheets.expandArguments = function(keys, vals, fnName) {
      var
      i = 0,
      n = vals.length,
      fn = germSheets.fn[fnName] || function(){}
      
      for(; i<n; i++) {
         fn[keys[i]] = vals[i]
      }
      
      return fn
   }

})(window, window.document, window.germSheets)