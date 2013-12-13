/** 
 *  @file creates the final output
 *  @version 1.0.2
 *  @copyright © 2013 max ɐʇ pixelf3hler · de
 *  @author <max@pixelf3hler.de>
 *  @license license.txt
 *  The MIT License
 */
(function(window, undefined) {
   
   /*
      gssData structure:
      {
         thru: "",         => unmodified css
         tmp: "",          => the result of the last parser pass as string
         vars: [],         => variable definitions
         mixins: [],       => mixin definitions
         methods:[]        => method calls
         skeletons: [],    => skeleton calls
         cssRuleData: []   => css rule constructor objects
      }
   */
   var germSheets = window.germSheets || {}
   germSheets.Compiler = function(gssData, gssSourceCode) {
      this.rawData = gssData
      
      this.germNode = new germSheets.GermNode(gssData, gssSourceCode)
      
      this.output = "/* *** germsheets 1.0.1 *** */\n\n"
      this.compile = function(callback) {
         var siht = this
         callback = callback || null
         
         this.germNode.setCompleteCallback(function(processed) {
            siht.output += processed
            germSheets.config.enableLogging && console.log("callback@compiler")
            callback && callback(siht.output + "\n\n/* *** check out germsheets at http://gs.pixelf3hler.de/ *** */")
         })
         //this.germNode.executeMethods()
         //this.output += this.germNode.thru.slice()
         
         // start main processing routine
         this.germNode.process()
         
         //this.germNode.process("skeletons")
         //this.germNode.process("cssRule")
      }
   }
   
})(window)