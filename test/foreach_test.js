(function(window, document, undefined) {

   function foreach(array, callback) {
      var i = 0, n = array.length
      for(; i<n; i++) {
         callback(array[i], i, array)
      }
      return array
   }
   var 
   start = 0,
   end = 0,
   elapsed = 0,
   testArr = []
   function setup() {
      for(var i=0; i<50000; i++) {
         testArr[i] = "index: " + i.toString()
      }
      return true
   }
   
   function run() {
      if(true === setup()) {
         
         start = +new Date
         console.info("starting benchmark foreach: " + start)
         foreach(testArr, function(itm) {
            itm = "_" + itm.substring(1)
         })
         end = +new Date
         elapsed = end - start
         console.info("foreach took: " + elapsed + "ms or " + (elapsed / 1000) + "s")
         
         start = +new Date
         console.info("starting benchmark Array.forEach: " + start)
         testArr.forEach(function(itm) {
            itm = "_" + itm.substring(1)
         })
         end = +new Date
         elapsed = end - start
         console.info("forEach took: " + elapsed + "ms or " + (elapsed / 1000) + "s")
         
         testArr = undefined
      }
   }
   
   console.info("about to run benchmark")
   window.setTimeout(function() {
      console.info("running...")
      run()
   }, 1200)
   
})(window, window.document)