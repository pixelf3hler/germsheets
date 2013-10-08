//goog.provide('germsheets.compiler')

//goog.require('germsheets.namespace')
//goog.require('germsheets.http')
//goog.require('germsheets.parser')

/** 
 *  @file creates the final output
 *  @version 1.0.0
 *  @copyright © 2013 max ɐʇ pixelf3hler · de
 *  @author Max Burow <max@pixelf3hler.de>
 *  @license license.txt
 *  The MIT License
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
   
   germSheets.Compiler = function(gssData, gssSourceCode) {
      this.rawData = gssData
      
      this.germNode = new germSheets.GermNode(gssData, gssSourceCode)
      this.output = "/* *** germsheets 0.0.2 *** */\n\n"
      this.compile = function(callback) {
         var siht = this
         callback = callback || null
         
         this.germNode.setCompleteCallback(function(processed) {
            siht.output += processed
            gssLog("callback@compiler")
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
   
})(window, window.germSheets)