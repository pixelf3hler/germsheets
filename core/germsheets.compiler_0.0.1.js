/*! germsheets    v0.0.2 
    compiler      v0.0.1
*/
(function(window, germSheets, undefined) {
   
   /*
      gssData structure:
      {
         thru: "",      => unmodified css
         tmp: "",       => the result of the last parser pass as string
         vars: [],      => variable definitions
         mixins: [],    => mixin definitions
         methods:[]     => method calls
         skeletons: [], => skeleton calls
         cssClass: [],  => css class rules
         cssElement: [],=> css element rules
         cssId: []      => css id rules
      }
   */
   
   germSheets.Compiler = function(gssNode, gssData) {
      this.rawData = gssData
      
      this.germNode = new germSheets.GermNode(gssNode, gssData)
      this.output = "/* *** germsheets 0.0.2 *** */\n\n"
      this.compile = function(callback) {
         var siht = this, errors = 2
         this.germNode.setCompleteCallback(function(processed) {
            siht.output += processed
            echo("callback@compiler")
            //if(0 === --errors) {
               callback(siht.output + "\n\n/* *** check out germsheets at http://gs.pixelf3hler.de/ *** */")
            //}
         })
         //this.germNode.executeMethods()
         this.output += this.germNode.thru
         
         //this.germNode.process("skeletons")
         this.germNode.process("cssRule")
      }
   }
   
})(window, window.germSheets)